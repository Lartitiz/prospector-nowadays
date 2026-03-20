import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TIMEOUT_MS = 45_000;

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
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!anthropicKey) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { prospect_id, intention, intention_detail, personal_context, channel } = await req.json();

    if (!prospect_id || !intention) {
      return new Response(JSON.stringify({ error: "prospect_id and intention are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch prospect with research data
    const { data: prospect, error: fetchErr } = await supabase
      .from("prospects")
      .select("*")
      .eq("id", prospect_id)
      .single();

    if (fetchErr || !prospect) {
      return new Response(JSON.stringify({ error: "Prospect not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch sender profile
    const { data: profile } = await supabase
      .from("my_profile")
      .select("*")
      .limit(1)
      .maybeSingle();

    const research = prospect.recherche_ia || {};
    const structureName = prospect.entreprise || "la structure";
    const contactName = prospect.nom || research.contact_suggere?.nom || "";
    const contactRole = prospect.poste || research.contact_suggere?.role || "";

    const intentionLabels: Record<string, string> = {
      accompagnement: "Proposer un accompagnement communication sur mesure",
      formation: "Proposer d'intervenir chez eux en formation",
      contact: "Juste échanger, explorer les possibilités",
    };

    const channelInstructions: Record<string, string> = {
      email: "Rédige un email professionnel avec objet, corps et signature. Ton chaleureux mais professionnel. Longueur : 150-250 mots pour le corps.",
      linkedin: "Rédige un message LinkedIn (demande de connexion + message). Maximum 300 caractères pour la note de connexion, puis un message de suivi de 100-150 mots.",
      instagram: "Rédige un DM Instagram court et engageant. Maximum 100 mots. Ton décontracté mais pro.",
    };

    const prompt = `Tu es la rédactrice de messages de prospection pour une consultante en communication et formation spécialisée dans l'ESS et l'impact.

PROFIL DE L'EXPÉDITRICE :
${profile ? `- Nom : ${profile.nom || ""}
- Rôle : ${profile.role || ""}
- Spécialité : ${profile.specialite || ""}
- Pitch : ${profile.pitch || ""}
- Site web : ${profile.site_web || ""}
- LinkedIn : ${profile.linkedin || ""}
- Preuves sociales : ${profile.preuves_sociales || ""}
- Références formation : ${profile.references_formation || ""}` : "Pas de profil disponible"}

STRUCTURE CIBLE : ${structureName}
- Mission : ${research.mission || "Non renseignée"}
- Secteur : ${research.secteur || prospect.secteur || "Non renseigné"}
- Contact : ${contactName}${contactRole ? ` (${contactRole})` : ""}
- Détails clés : ${(research.details_immersion || []).join("; ")}
- Projets récents : ${(research.projets_recents || []).map((p: any) => p.titre).join(", ") || "Aucun"}
- Besoins com identifiés : ${(research.besoins_com || []).map((b: any) => b.titre).join(", ") || "Aucun"}

INTENTION : ${intentionLabels[intention] || intention}
${intention_detail ? `DÉTAIL DE LA PROPOSITION : ${intention_detail}` : ""}
${personal_context ? `CONTEXTE PERSONNEL : ${personal_context}` : ""}

CANAL : ${channel || "email"}
${channelInstructions[channel || "email"] || channelInstructions.email}

RÈGLES :
- Le message doit montrer que tu connais VRAIMENT la structure (cite des éléments précis de leur mission/projets)
- Pas de formules génériques type "je me permets de vous contacter" ou "j'ai découvert votre structure avec intérêt"
- Commence par un élément concret et spécifique qui montre l'immersion
- Propose de la valeur dès le premier message
- Si contexte personnel fourni, l'intégrer naturellement
- Utilise le tutoiement si le ton de la structure est informel, sinon vouvoiement
- ${profile?.signature_email ? `Utilise cette signature : ${profile.signature_email}` : "Signe avec le prénom de l'expéditrice"}

Réponds UNIQUEMENT avec un JSON strict :
{
  "sujet": "objet du message (si email)",
  "contenu": "corps du message complet",
  "notes_redaction": "2-3 phrases expliquant tes choix rédactionnels"
}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

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
          model: "claude-sonnet-4-20250514",
          max_tokens: 2048,
          messages: [{ role: "user", content: prompt }],
        }),
      });
    } catch (err) {
      clearTimeout(timeout);
      const isTimeout = err instanceof DOMException && err.name === "AbortError";
      return new Response(
        JSON.stringify({ error: isTimeout ? "Génération dépassée (45s). Réessayez." : "Erreur Claude." }),
        { status: isTimeout ? 504 : 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    clearTimeout(timeout);

    if (!claudeResponse.ok) {
      const errBody = await claudeResponse.text();
      console.error("Claude API error:", claudeResponse.status, errBody);
      return new Response(
        JSON.stringify({ error: `Erreur Claude (${claudeResponse.status})` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const claudeData = await claudeResponse.json();
    let textContent = "";
    for (const block of claudeData.content || []) {
      if (block.type === "text") textContent += block.text;
    }

    let messageResult: { sujet?: string; contenu: string; notes_redaction?: string };
    try {
      const cleaned = textContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      messageResult = JSON.parse(cleaned);
    } catch {
      console.error("Parse error:", textContent.slice(0, 500));
      messageResult = { sujet: "", contenu: textContent, notes_redaction: "Format inattendu" };
    }

    // Save message to messages table
    const { data: msgData, error: msgErr } = await supabase
      .from("messages")
      .insert({
        user_id: prospect.user_id,
        prospect_id: prospect_id,
        sujet: messageResult.sujet || null,
        contenu: messageResult.contenu,
        type: channel || "email",
        statut: "brouillon",
        genere_par_ia: true,
      })
      .select("id")
      .single();

    if (msgErr) {
      console.error("Message save error:", msgErr);
      return new Response(JSON.stringify({ error: "Message généré mais erreur de sauvegarde." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update prospect with intention data and status
    await supabase
      .from("prospects")
      .update({
        statut: "message_genere",
        recherche_ia: {
          ...research,
          intention,
          intention_detail: intention_detail || "",
          personal_context: personal_context || "",
          channel: channel || "email",
          notes_redaction: messageResult.notes_redaction || "",
        },
      })
      .eq("id", prospect_id);

    return new Response(
      JSON.stringify({
        success: true,
        message_id: msgData.id,
        message: messageResult,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Erreur interne du serveur." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
