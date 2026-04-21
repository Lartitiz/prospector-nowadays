import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TIMEOUT_MS = 120_000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autorisé." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!anthropicKey) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY non configurée." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const {
      prospect_id,
      original_message_id,
      tonalite,
      context_note,
      channel,
      my_profile,
    } = await req.json();

    if (!prospect_id || !original_message_id) {
      return new Response(
        JSON.stringify({ error: "prospect_id et original_message_id sont requis." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch prospect + original message in parallel
    const [{ data: prospect, error: pErr }, { data: original, error: mErr }] =
      await Promise.all([
        supabase.from("prospects").select("*").eq("id", prospect_id).single(),
        supabase.from("messages").select("*").eq("id", original_message_id).single(),
      ]);

    if (pErr || !prospect) {
      return new Response(JSON.stringify({ error: "Prospect introuvable." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (mErr || !original) {
      return new Response(JSON.stringify({ error: "Message original introuvable." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let profile = my_profile;
    if (!profile) {
      const { data: dbProfile } = await supabase
        .from("my_profile")
        .select("*")
        .limit(1)
        .maybeSingle();
      profile = dbProfile;
    }

    const research = (prospect.recherche_ia as any) || {};
    const structureName = prospect.entreprise || "la structure";
    const contactName = prospect.nom || research.contact_suggere?.nom || "";

    const tonaliteInstructions: Record<string, string> = {
      doux:
        "Rappel très léger, bienveillant, sans aucune pression. Tu reviens simplement aux nouvelles. Aucune urgence.",
      direct:
        "Tu demandes clairement si le message précédent a un écho, sans agressivité. Tu proposes éventuellement un créneau ou une suite concrète.",
      derniere:
        "Tu signifies poliment que c'est ta dernière prise de contact, pour ne pas insister davantage. Tu laisses la porte ouverte mais tu fermes le fil.",
    };

    const channelLength: Record<string, string> = {
      email: "50 à 100 mots maximum. Objet court et personnel.",
      linkedin: "50 mots maximum. Pas d'objet.",
      instagram: "40 mots maximum. Très direct, conversationnel. Pas d'objet.",
    };

    const ch = channel || "email";

    const prompt = `Tu es une experte en prospection consentie. Tu rédiges une RELANCE après un premier message resté sans réponse. Le destinataire a déjà reçu le message ci-dessous, il faut éviter de le paraphraser.

═══════════════════════════════════════
EXPÉDITRICE
═══════════════════════════════════════
${profile ? `Nom : ${profile.nom || ""}
Rôle : ${profile.role || ""}
Signature email : ${profile.signature_email || ""}` : "Profil non disponible."}

═══════════════════════════════════════
DESTINATAIRE
═══════════════════════════════════════
Structure : ${structureName}
Contact : ${contactName}
Mission : ${research.mission || "—"}

═══════════════════════════════════════
MESSAGE PRÉCÉDENT (déjà envoyé, NE PAS RÉPÉTER)
═══════════════════════════════════════
${original.sujet ? `Objet : ${original.sujet}\n` : ""}${original.contenu || ""}

═══════════════════════════════════════
TONALITÉ DEMANDÉE : ${(tonalite || "doux").toUpperCase()}
═══════════════════════════════════════
${tonaliteInstructions[tonalite || "doux"] || tonaliteInstructions.doux}
${context_note ? `\nContexte additionnel à intégrer naturellement :\n${context_note}` : ""}

═══════════════════════════════════════
CANAL : ${ch.toUpperCase()}
═══════════════════════════════════════
${channelLength[ch] || channelLength.email}

═══════════════════════════════════════
RÈGLES DE RÉDACTION
═══════════════════════════════════════
1. COURT. Une relance n'est pas un nouveau message complet : pas de pitch, pas de présentation longue.
2. RÉFÉRENCE IMPLICITE au premier message ("comme évoqué", "pour reprendre notre échange", "je reviens vers vous suite à mon mot").
3. AUCUNE PARAPHRASE du premier message — apporte UN angle neuf : une question, une actualité de la structure, une précision concrète.
4. PAS DE FORMULES CREUSES ("je me permets", "n'hésitez pas", "au plaisir").
5. PAS DE PRESSION sauf si tonalité = "derniere", auquel cas la fermeture doit rester respectueuse.
6. SIGNATURE : ${profile?.signature_email && ch === "email" ? `utilise exactement : ${profile.signature_email}` : "signe simplement avec le prénom de l'expéditrice."}
7. Reprends le tutoiement/vouvoiement utilisé dans le message précédent.

═══════════════════════════════════════
FORMAT DE RÉPONSE (JSON strict)
═══════════════════════════════════════
Réponds UNIQUEMENT avec ce JSON, sans texte avant ni après :
{
  "subject": "objet de la relance (vide si LinkedIn ou Instagram)",
  "message": "corps complet de la relance, prêt à envoyer, avec signature",
  "strategy_notes": "1-2 phrases expliquant l'angle choisi pour cette relance"
}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let claudeResponse: Response;
    try {
      claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-opus-4-20250514",
          max_tokens: 1024,
          messages: [{ role: "user", content: prompt }],
        }),
      });
    } catch (err) {
      clearTimeout(timeoutId);
      const isTimeout = err instanceof DOMException && err.name === "AbortError";
      console.error("Claude fetch error:", isTimeout ? "TIMEOUT" : err);
      return new Response(
        JSON.stringify({
          error: isTimeout
            ? "La génération a dépassé le délai de 120 secondes."
            : `Erreur de connexion à Claude : ${err instanceof Error ? err.message : "Erreur inconnue"}`,
        }),
        { status: isTimeout ? 504 : 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    clearTimeout(timeoutId);

    if (!claudeResponse.ok) {
      const errBody = await claudeResponse.text();
      console.error("Claude API error:", claudeResponse.status, errBody);
      let userMessage = `Erreur Claude (${claudeResponse.status}).`;
      if (claudeResponse.status === 401) userMessage = "Clé API Anthropic invalide.";
      else if (claudeResponse.status === 429) userMessage = "Limite de requêtes Claude atteinte.";
      else if (claudeResponse.status === 529) userMessage = "Claude est surchargé. Réessayez.";
      return new Response(
        JSON.stringify({ error: userMessage }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const claudeData = await claudeResponse.json();
    let textContent = "";
    for (const block of claudeData.content || []) {
      if (block.type === "text") textContent += block.text;
    }

    let messageResult: { subject?: string; message: string; strategy_notes?: string };
    try {
      const cleaned = textContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      messageResult = JSON.parse(cleaned);
    } catch {
      console.error("JSON parse error. Raw response:", textContent.slice(0, 1000));
      messageResult = {
        subject: "",
        message: textContent,
        strategy_notes: "⚠️ Format de réponse inattendu — message brut conservé.",
      };
    }

    // Save relance message
    const { data: msgData, error: msgErr } = await supabase
      .from("messages")
      .insert({
        user_id: prospect.user_id,
        prospect_id,
        sujet: messageResult.subject || null,
        contenu: messageResult.message,
        type: "relance",
        statut: "brouillon",
        genere_par_ia: true,
      })
      .select("id")
      .single();

    if (msgErr) {
      console.error("Message save error:", msgErr);
      return new Response(
        JSON.stringify({
          error: "Relance générée mais erreur lors de la sauvegarde.",
          message: messageResult,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update prospect: status -> relance
    await supabase
      .from("prospects")
      .update({
        statut: "relance",
        recherche_ia: {
          ...research,
          channel: ch,
          last_relance_id: msgData.id,
          last_relance_at: new Date().toISOString(),
          last_relance_tonalite: tonalite || "doux",
        },
      })
      .eq("id", prospect_id);

    return new Response(
      JSON.stringify({
        success: true,
        message_id: msgData.id,
        subject: messageResult.subject || "",
        message: messageResult.message,
        strategy_notes: messageResult.strategy_notes || "",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({
        error: `Erreur interne : ${err instanceof Error ? err.message : "Erreur inconnue"}.`,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});