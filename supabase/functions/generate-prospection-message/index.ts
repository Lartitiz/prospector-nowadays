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
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY non configurée. Ajoutez-la dans les secrets." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      prospect_id,
      research_data,
      intention,
      intention_detail,
      personal_context,
      channel,
      my_profile,
    } = await req.json();

    if (!prospect_id || !intention) {
      return new Response(JSON.stringify({ error: "prospect_id et intention sont requis." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch prospect for metadata
    const { data: prospect, error: fetchErr } = await supabase
      .from("prospects")
      .select("*")
      .eq("id", prospect_id)
      .single();

    if (fetchErr || !prospect) {
      return new Response(JSON.stringify({ error: "Prospect introuvable." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use provided research_data or fall back to prospect.recherche_ia
    const research = research_data || prospect.recherche_ia || {};

    // Use provided my_profile or fetch from DB
    let profile = my_profile;
    if (!profile) {
      const { data: dbProfile } = await supabase
        .from("my_profile")
        .select("*")
        .limit(1)
        .maybeSingle();
      profile = dbProfile;
    }

    const structureName = prospect.entreprise || "la structure";
    const contactName = prospect.nom || research.contact_suggere?.nom || "";
    const contactRole = prospect.poste || research.contact_suggere?.role || "";

    const intentionLabels: Record<string, string> = {
      accompagnement: "Proposer un accompagnement communication sur mesure",
      formation: "Proposer d'intervenir chez eux en formation",
      contact: "Juste échanger, explorer les possibilités",
    };

    const channelInstructions: Record<string, string> = {
      email: `Rédige un email professionnel.
FORMAT ATTENDU :
- Objet : accrocheur, spécifique à la structure (pas générique)
- Corps : 150-250 mots, ton chaleureux mais professionnel
- Signature complète de l'expéditrice`,
      linkedin: `Rédige un message LinkedIn.
FORMAT ATTENDU :
- Note de connexion : maximum 300 caractères, percutante
- Message de suivi : 100-150 mots, professionnel mais humain`,
      instagram: `Rédige un DM Instagram.
FORMAT ATTENDU :
- Message court et engageant, maximum 100 mots
- Ton décontracté mais professionnel`,
    };

    const prompt = `Tu es une experte en prospection consentie. Tu rédiges des messages de premier contact pour une consultante en communication et formation, spécialisée dans l'ESS, l'impact et l'économie sociale.

═══════════════════════════════════════
PROFIL DE L'EXPÉDITRICE
═══════════════════════════════════════
${profile ? `Nom : ${profile.nom || "Non renseigné"}
Rôle : ${profile.role || "Non renseigné"}
Spécialité : ${profile.specialite || "Non renseignée"}
Pitch : ${profile.pitch || "Non renseigné"}
Site web : ${profile.site_web || ""}
LinkedIn : ${profile.linkedin || ""}
Preuves sociales : ${profile.preuves_sociales || ""}
Références formation : ${profile.references_formation || ""}
Signature email : ${profile.signature_email || ""}` : "Profil non disponible — signe simplement avec un prénom générique."}

═══════════════════════════════════════
STRUCTURE CIBLE : ${structureName}
═══════════════════════════════════════
Mission : ${research.mission || "Non renseignée"}
Secteur : ${research.secteur || prospect.secteur || "Non renseigné"}
Contact : ${contactName}${contactRole ? ` — ${contactRole}` : ""}${research.contact_suggere?.email ? ` — ${research.contact_suggere.email}` : ""}

Projets récents :
${(research.projets_recents || []).map((p: any) => `• ${p.titre}${p.description ? ` : ${p.description}` : ""}${p.date ? ` (${p.date})` : ""}`).join("\n") || "Aucun projet identifié."}

Besoins en communication identifiés :
${(research.besoins_com || []).map((b: any) => `• ${b.titre}${b.description ? ` : ${b.description}` : ""}${b.priorite ? ` [${b.priorite}]` : ""}`).join("\n") || "Aucun besoin identifié."}

Détails clés d'immersion :
${(research.details_immersion || []).map((d: string) => `• ${d}`).join("\n") || "Aucun détail disponible."}

═══════════════════════════════════════
INTENTION DU MESSAGE
═══════════════════════════════════════
${intentionLabels[intention] || intention}
${intention_detail ? `\nDétail de la proposition :\n${intention_detail}` : ""}
${personal_context ? `\nContexte personnel (à intégrer naturellement) :\n${personal_context}` : ""}

═══════════════════════════════════════
CANAL : ${(channel || "email").toUpperCase()}
═══════════════════════════════════════
${channelInstructions[channel || "email"] || channelInstructions.email}

═══════════════════════════════════════
PRINCIPES DE PROSPECTION CONSENTIE
═══════════════════════════════════════
1. IMMERSION VISIBLE : Le premier élément du message doit prouver que tu connais vraiment la structure. Cite un projet, une action, un chiffre, une actualité SPÉCIFIQUE. Pas de "j'ai découvert votre structure".
2. VALEUR D'ABORD : Propose quelque chose de concret et utile dès le premier message. Pas "on pourrait échanger". Montre ce que tu apportes.
3. AUTHENTICITÉ : Pas de formules creuses ("je me permets", "n'hésitez pas", "au plaisir"). Écris comme une vraie personne qui parle à une autre.
4. RESPECT : Pas de pression, pas d'urgence artificielle, pas de manipulation. Le message doit donner envie de répondre, pas obliger.
5. CONNEXION HUMAINE : Si un contexte personnel existe, il doit apparaître naturellement, pas plaqué.
6. TON : Adapte le tutoiement/vouvoiement au ton de la structure. Si informel → tutoiement. Si institutionnel → vouvoiement.
7. SIGNATURE : ${profile?.signature_email ? `Utilise exactement cette signature :\n${profile.signature_email}` : "Signe avec le prénom de l'expéditrice."}

═══════════════════════════════════════
FORMAT DE RÉPONSE (JSON strict)
═══════════════════════════════════════
Réponds UNIQUEMENT avec ce JSON, sans texte avant ni après :
{
  "subject": "objet du message (si email) ou accroche (si LinkedIn/Instagram)",
  "message": "corps complet du message, prêt à envoyer, avec signature",
  "strategy_notes": "2-4 phrases expliquant ta stratégie rédactionnelle : pourquoi cet angle d'attaque, quel élément d'immersion tu as choisi et pourquoi, quel ton tu as adopté"
}`;

    // Call Claude Opus with 120s timeout
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
          max_tokens: 2048,
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
            ? "La génération a dépassé le délai de 120 secondes. Réessayez."
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
      if (claudeResponse.status === 401) userMessage = "Clé API Anthropic invalide. Vérifiez ANTHROPIC_API_KEY.";
      else if (claudeResponse.status === 429) userMessage = "Limite de requêtes Claude atteinte. Attendez quelques minutes.";
      else if (claudeResponse.status === 529) userMessage = "Claude est surchargé. Réessayez dans quelques instants.";

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

    // Parse structured response
    let messageResult: { subject?: string; message: string; strategy_notes?: string };
    try {
      const cleaned = textContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      messageResult = JSON.parse(cleaned);
    } catch {
      console.error("JSON parse error. Raw response:", textContent.slice(0, 1000));
      // Fall back: use raw text as message
      messageResult = {
        subject: "",
        message: textContent,
        strategy_notes: "⚠️ Le format de réponse était inattendu. Le message brut a été conservé.",
      };
    }

    // Save message to messages table
    const { data: msgData, error: msgErr } = await supabase
      .from("messages")
      .insert({
        user_id: prospect.user_id,
        prospect_id,
        sujet: messageResult.subject || null,
        contenu: messageResult.message,
        type: "initial",
        statut: "brouillon",
        genere_par_ia: true,
      })
      .select("id")
      .single();

    if (msgErr) {
      console.error("Message save error:", msgErr);
      // Still return the message even if save fails
      return new Response(
        JSON.stringify({
          error: "Message généré avec succès mais erreur lors de la sauvegarde en base. Copiez le message ci-dessous.",
          message: messageResult,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update prospect status and save generation metadata
    const { error: updateErr } = await supabase
      .from("prospects")
      .update({
        statut: "message_genere",
        recherche_ia: {
          ...research,
          intention,
          intention_detail: intention_detail || "",
          personal_context: personal_context || "",
          channel: channel || "email",
          strategy_notes: messageResult.strategy_notes || "",
          last_message_id: msgData.id,
          last_generated_at: new Date().toISOString(),
        },
      })
      .eq("id", prospect_id);

    if (updateErr) {
      console.error("Prospect update error:", updateErr);
    }

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
        error: `Erreur interne : ${err instanceof Error ? err.message : "Erreur inconnue"}. Réessayez.`,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
