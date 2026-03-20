import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import type { Prospect } from "@/hooks/useProspects";
import type { ResearchResult } from "@/lib/research-types";

const INTENTIONS = [
  {
    id: "accompagnement",
    emoji: "🎯",
    title: "ACCOMPAGNEMENT COM",
    description: "Proposer un accompagnement communication sur mesure",
  },
  {
    id: "formation",
    emoji: "🎓",
    title: "PARTENARIAT FORMATION",
    description: "Proposer d'intervenir chez eux en formation",
  },
  {
    id: "contact",
    emoji: "👋",
    title: "PRISE DE CONTACT",
    description: "Juste échanger, explorer les possibilités",
  },
] as const;

const CHANNEL_OPTIONS = [
  { value: "email", label: "Email" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "instagram", label: "DM Instagram" },
];

const DETAIL_PLACEHOLDERS: Record<string, string> = {
  accompagnement:
    "Ex : j'ai remarqué que leur com LinkedIn manque de régularité, je pourrais proposer un accompagnement sur 3 mois…",
  formation:
    "Ex : formation réseaux sociaux pour leur équipe, atelier storytelling pour valoriser leur impact…",
  contact:
    "Ex : je voudrais échanger sur leur approche de la communication d'impact…",
};

const GenerateMessage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [prospect, setProspect] = useState<Prospect | null>(null);
  const [research, setResearch] = useState<ResearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFullCard, setShowFullCard] = useState(false);

  // Form state
  const [intention, setIntention] = useState("");
  const [intentionDetail, setIntentionDetail] = useState("");
  const [personalContext, setPersonalContext] = useState("");
  const [channel, setChannel] = useState("email");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!id) return;
    loadProspect();
  }, [id]);

  const loadProspect = async () => {
    const { data, error } = await supabase
      .from("prospects")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      toast.error("Prospect introuvable");
      navigate("/");
      return;
    }

    setProspect(data as Prospect);
    setResearch((data.recherche_ia as unknown as ResearchResult) || null);

    // Restore previous intention if set
    const ri = data.recherche_ia as any;
    if (ri?.intention) setIntention(ri.intention);
    if (ri?.intention_detail) setIntentionDetail(ri.intention_detail);
    if (ri?.personal_context) setPersonalContext(ri.personal_context);
    if (ri?.channel) setChannel(ri.channel);

    setLoading(false);
  };

  const handleGenerate = async () => {
    if (!id || !intention) {
      toast.error("Sélectionnez une intention");
      return;
    }

    setGenerating(true);

    try {
      // 1. Save intention data to prospect
      await supabase
        .from("prospects")
        .update({
          recherche_ia: {
            ...research,
            intention,
            intention_detail: intentionDetail,
            personal_context: personalContext,
            channel,
          },
        })
        .eq("id", id);

      // 2. Fetch profile for the edge function
      const { data: profileData } = await supabase
        .from("my_profile")
        .select("*")
        .limit(1)
        .maybeSingle();

      // 3. Call edge function with all data
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        "generate-prospection-message",
        {
          body: {
            prospect_id: id,
            research_data: research,
            intention,
            intention_detail: intentionDetail,
            personal_context: personalContext,
            channel,
            my_profile: profileData,
          },
        }
      );

      if (fnError) throw fnError;

      if (fnData?.message_id) {
        toast.success("Message généré !");
        navigate(`/prospects/${id}/message/${fnData.message_id}`);
      } else {
        throw new Error(fnData?.error || "Erreur lors de la génération");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erreur lors de la génération");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Chargement…</p>
      </div>
    );
  }

  if (generating) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center gap-4 animate-fade-in">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-2.5 h-2.5 rounded-full bg-primary"
              style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }}
            />
          ))}
        </div>
        <p className="text-sm text-foreground font-medium">
          Rédaction du message pour {prospect?.entreprise || "la structure"}…
        </p>
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 0.25; transform: scale(0.85); }
            50% { opacity: 1; transform: scale(1); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8 lg:px-8">
      <div className="mx-auto max-w-2xl animate-fade-in">
        {/* Back */}
        <button
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Pipeline
        </button>

        <h1 className="text-2xl mb-6">
          Générer un message — {prospect?.entreprise}
        </h1>

        {/* Research summary */}
        {research && (
          <div className="bg-card rounded-2xl border border-border/60 p-5 mb-8 shadow-sm">
            <div className="space-y-2 mb-3">
              <p className="text-sm text-foreground">
                <span className="font-medium">Mission :</span>{" "}
                {research.mission || "Non renseignée"}
              </p>
              {research.details_immersion?.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Détails clés :</span>{" "}
                  {research.details_immersion.slice(0, 3).join(" · ")}
                </p>
              )}
              {research.contact_suggere?.nom && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Contact :</span>{" "}
                  {research.contact_suggere.nom}
                  {research.contact_suggere.role && ` — ${research.contact_suggere.role}`}
                </p>
              )}
            </div>

            <button
              onClick={() => setShowFullCard(!showFullCard)}
              className="text-xs text-primary hover:underline inline-flex items-center gap-1"
            >
              {showFullCard ? (
                <>
                  <ChevronUp className="h-3 w-3" /> Masquer la fiche
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3" /> Voir la fiche complète
                </>
              )}
            </button>

            {showFullCard && (
              <div className="mt-4 pt-4 border-t border-border/60 space-y-3 text-sm animate-fade-in">
                <p>
                  <span className="font-medium">Secteur :</span>{" "}
                  {research.secteur || "—"}
                </p>
                {research.projets_recents?.length > 0 && (
                  <div>
                    <span className="font-medium">Projets récents :</span>
                    <ul className="mt-1 space-y-1 text-muted-foreground">
                      {research.projets_recents.map((p, i) => (
                        <li key={i}>
                          • {p.titre}
                          {p.date && <span className="text-xs opacity-70"> ({p.date})</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {research.besoins_com?.length > 0 && (
                  <div>
                    <span className="font-medium">Besoins com :</span>
                    <ul className="mt-1 space-y-1 text-muted-foreground">
                      {research.besoins_com.map((b, i) => (
                        <li key={i}>• {b.titre}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {research.details_immersion?.length > 0 && (
                  <div>
                    <span className="font-medium">Tous les détails :</span>
                    <ul className="mt-1 space-y-1 text-muted-foreground">
                      {research.details_immersion.map((d, i) => (
                        <li key={i}>• {d}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Intention cards */}
        <div className="space-y-2 mb-6">
          <Label className="text-base">Intention du message</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {INTENTIONS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setIntention(item.id)}
                className={`
                  rounded-2xl p-4 text-left transition-all duration-200 border-2
                  ${
                    intention === item.id
                      ? "border-primary bg-primary/5 shadow-md"
                      : "border-border/60 bg-card hover:border-border hover:shadow-sm"
                  }
                `}
                style={{ transform: intention === item.id ? "scale(0.98)" : undefined }}
              >
                <span className="text-2xl block mb-2">{item.emoji}</span>
                <p className="text-xs font-bold tracking-wide uppercase text-foreground mb-1">
                  {item.title}
                </p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Detail textarea */}
        <div className="space-y-1.5 mb-5">
          <Label>Détail de la proposition (optionnel)</Label>
          <Textarea
            value={intentionDetail}
            onChange={(e) => setIntentionDetail(e.target.value)}
            placeholder={DETAIL_PLACEHOLDERS[intention] || "Précisez votre proposition…"}
            rows={3}
            className="bg-card"
          />
        </div>

        {/* Personal context */}
        <div className="space-y-1.5 mb-5">
          <Label>Contexte personnel (optionnel)</Label>
          <Textarea
            value={personalContext}
            onChange={(e) => setPersonalContext(e.target.value)}
            placeholder="Ex : je les ai croisés à tel événement, untel m'a parlé d'eux..."
            rows={2}
            className="bg-card"
          />
        </div>

        {/* Channel */}
        <div className="space-y-1.5 mb-8">
          <Label>Canal</Label>
          <Select value={channel} onValueChange={setChannel}>
            <SelectTrigger className="bg-card w-full sm:w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CHANNEL_OPTIONS.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Generate button */}
        <Button
          onClick={handleGenerate}
          disabled={!intention || generating}
          className="w-full gap-2 text-base py-6"
        >
          <Sparkles className="h-4 w-4" />
          Générer le message
        </Button>
      </div>
    </div>
  );
};

export default GenerateMessage;
