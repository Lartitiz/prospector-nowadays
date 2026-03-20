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

    const { prospect_id, company_name, company_url, company_type } = await req.json();

    if (!prospect_id || !company_name) {
      return new Response(JSON.stringify({ error: "prospect_id and company_name are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark as researching
    await supabase
      .from("prospects")
      .update({ recherche_ia: { research_status: "researching" } })
      .eq("id", prospect_id);

    const prompt = `Tu es un assistant expert en prospection commerciale pour une consultante spécialisée en communication et formation auprès de structures de l'ESS, de l'impact et de l'économie sociale.

Effectue une recherche approfondie sur la structure suivante :
- Nom : ${company_name}
${company_url ? `- Site web : ${company_url}` : ""}
${company_type ? `- Type de structure : ${company_type}` : ""}

Utilise l'outil web_search pour trouver des informations fiables et récentes.

Recherche :
1. La mission et raison d'être de la structure (2-3 phrases)
2. Le secteur d'activité principal
3. Les projets récents, actualités, événements (2-5 éléments avec dates si possible)
4. Les besoins potentiels en communication identifiés (stratégie de com, création de contenu, formation com/réseaux sociaux, branding, événementiel…)
5. Des détails clés d'immersion : culture, valeurs, ton employé, audiences, partenaires clés
6. Un contact pertinent (responsable com, direction, fondateur·rice) avec nom, rôle, email et LinkedIn si trouvés
7. Les sources utilisées (URLs)

Fournis ta réponse au format JSON strict avec cette structure exacte :
{
  "mission": "description de la mission (2-3 phrases)",
  "secteur": "secteur d'activité",
  "projets_recents": [{"titre": "...", "description": "...", "date": "..."}],
  "besoins_com": [{"titre": "...", "description": "...", "priorite": "haute|moyenne|basse"}],
  "details_immersion": ["point clé 1", "point clé 2"],
  "contact_suggere": {"nom": "...", "role": "...", "email": "...", "linkedin": "..."},
  "sources": [{"titre": "...", "url": "..."}],
  "qualite_recherche": "high|medium|low"
}

Sois factuel. Si une information n'est pas trouvée, laisse le champ vide ou marque "À vérifier". Réponds UNIQUEMENT avec le JSON.`;

    // Call Claude with web_search tool and timeout
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
          max_tokens: 4096,
          tools: [
            {
              type: "web_search_20250305",
              name: "web_search",
              max_uses: 5,
            },
          ],
          messages: [{ role: "user", content: prompt }],
        }),
      });
    } catch (err) {
      clearTimeout(timeout);
      const isTimeout = err instanceof DOMException && err.name === "AbortError";

      await supabase
        .from("prospects")
        .update({
          recherche_ia: { research_status: "failed", error: isTimeout ? "Timeout après 45s" : String(err) },
        })
        .eq("id", prospect_id);

      return new Response(
        JSON.stringify({ error: isTimeout ? "La recherche a dépassé le délai de 45 secondes. Réessayez." : "Erreur lors de l'appel à Claude." }),
        { status: isTimeout ? 504 : 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    clearTimeout(timeout);

    if (!claudeResponse.ok) {
      const errBody = await claudeResponse.text();
      console.error("Claude API error:", claudeResponse.status, errBody);

      await supabase
        .from("prospects")
        .update({
          recherche_ia: { research_status: "failed", error: `Claude ${claudeResponse.status}: ${errBody.slice(0, 200)}` },
        })
        .eq("id", prospect_id);

      return new Response(
        JSON.stringify({ error: `Erreur Claude (${claudeResponse.status}). Vérifiez votre clé API ou réessayez.` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const claudeData = await claudeResponse.json();

    // Extract text content from Claude response (may have multiple content blocks with web_search results)
    let textContent = "";
    for (const block of claudeData.content || []) {
      if (block.type === "text") {
        textContent += block.text;
      }
    }

    // Parse JSON from response
    let researchResult: Record<string, any>;
    try {
      const cleaned = textContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      researchResult = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse Claude response:", textContent.slice(0, 500));
      researchResult = {
        mission: "Recherche incomplète — le format de réponse était inattendu. Relancez la recherche.",
        secteur: "",
        projets_recents: [],
        besoins_com: [],
        details_immersion: [],
        contact_suggere: { nom: "", role: "", email: "", linkedin: "" },
        sources: [],
        qualite_recherche: "low",
      };
    }

    // Build full research_data
    const researchData = {
      ...researchResult,
      site_web: company_url || "",
      type_structure: company_type || "",
      research_status: "done",
      researched_at: new Date().toISOString(),
    };

    // Extract contact fields
    const contact = researchResult.contact_suggere || {};

    // Update prospect
    const { error: updateErr } = await supabase
      .from("prospects")
      .update({
        statut: "recherche_faite",
        secteur: researchResult.secteur || null,
        nom: contact.nom || null,
        poste: contact.role || null,
        email: contact.email || null,
        linkedin: contact.linkedin || null,
        recherche_ia: researchData,
      })
      .eq("id", prospect_id);

    if (updateErr) {
      console.error("DB update error:", updateErr);
      return new Response(JSON.stringify({ error: "Recherche réussie mais erreur de sauvegarde." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, research: researchData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unexpected error:", err);

    // Try to mark as failed if we have prospect_id
    try {
      const body = await req.clone().json().catch(() => null);
      if (body?.prospect_id) {
        await supabase
          .from("prospects")
          .update({ recherche_ia: { research_status: "failed", error: String(err) } })
          .eq("id", body.prospect_id);
      }
    } catch { /* ignore */ }

    return new Response(JSON.stringify({ error: "Erreur interne du serveur." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
