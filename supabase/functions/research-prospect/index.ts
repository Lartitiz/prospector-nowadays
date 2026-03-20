import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { prospect_id } = await req.json();
    if (!prospect_id) {
      return new Response(JSON.stringify({ error: "prospect_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the prospect
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

    const structureName = prospect.entreprise || "Structure inconnue";
    const siteWeb = prospect.recherche_ia?.site_web || "";
    const typeStructure = prospect.recherche_ia?.type_structure || "";
    const source = prospect.recherche_ia?.source || "";

    // Call Lovable AI for research
    const aiPrompt = `Tu es un assistant de prospection commerciale spécialisé dans la communication et la formation pour les structures de l'ESS et de l'impact.

Recherche approfondie sur : "${structureName}"
${siteWeb ? `Site web : ${siteWeb}` : ""}
${typeStructure ? `Type de structure : ${typeStructure}` : ""}
${source ? `Source : ${source}` : ""}

Fournis un JSON structuré avec ces champs :
{
  "mission": "description de la mission/raison d'être de la structure (2-3 phrases)",
  "secteur": "secteur d'activité principal",
  "projets_recents": [{"titre": "...", "description": "...", "date": "..."}],
  "besoins_com": [{"titre": "...", "description": "...", "priorite": "haute|moyenne|basse"}],
  "details_immersion": ["point clé 1", "point clé 2", ...],
  "contact_suggere": {"nom": "...", "role": "...", "email": "...", "linkedin": "..."},
  "sources": [{"titre": "...", "url": "..."}],
  "qualite_recherche": "high|medium|low"
}

Sois précis et factuel. Si tu n'as pas d'information fiable, indique "À vérifier" et mets la qualité à "low".
Réponds UNIQUEMENT avec le JSON, sans texte autour.`;

    const aiResponse = await fetch("https://api.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: aiPrompt }],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI API error:", errText);
      return new Response(
        JSON.stringify({ error: "AI research failed", details: errText }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Parse the JSON from AI response
    let researchResult;
    try {
      // Strip markdown code fences if present
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      researchResult = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response:", content);
      researchResult = {
        mission: "Recherche incomplète — veuillez relancer",
        secteur: "",
        projets_recents: [],
        besoins_com: [],
        details_immersion: [],
        contact_suggere: { nom: "", role: "", email: "", linkedin: "" },
        sources: [],
        qualite_recherche: "low",
      };
    }

    // Merge research into existing recherche_ia
    const updatedRechercheIa = {
      ...(prospect.recherche_ia || {}),
      ...researchResult,
      research_status: "done",
      researched_at: new Date().toISOString(),
    };

    // Update prospect in DB
    const { error: updateErr } = await supabase
      .from("prospects")
      .update({ recherche_ia: updatedRechercheIa })
      .eq("id", prospect_id);

    if (updateErr) {
      console.error("DB update error:", updateErr);
      return new Response(JSON.stringify({ error: "Failed to save research" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, research: updatedRechercheIa }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
