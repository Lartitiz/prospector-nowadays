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
import { ArrowLeft, RefreshCw } from "lucide-react";
import type { Prospect } from "@/hooks/useProspects";
import { sanitizeResearch } from "@/lib/research-types";

const TONALITES = [
  {
    id: "doux",
    emoji: "🌿",
    title: "DOUX",
    description: "Rappel léger, pas de pression",
  },
  {
    id: "direct",
    emoji: "🎯",
    title: "DIRECT",
    description: "Demande une réponse claire",
  },
  {
    id: "derniere",
    emoji: "🚪",
    title: "DERNIÈRE TENTATIVE",
    description: "Clore proprement le fil",
  },
] as const;

const CHANNEL_OPTIONS = [
  { value: "email", label: "Email" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "instagram", label: "DM Instagram" },
];

interface OriginalMessage {
  id: string;
  sujet: string | null;
  contenu: string | null;
  type: string | null;
  created_at: string;
}

const GenerateRelance = () => {
  const { id, messageId } = useParams<{ id: string; messageId: string }>();
  const navigate = useNavigate();

  const [prospect, setProspect] = useState<Prospect | null>(null);
  const [originalMessage, setOriginalMessage] = useState<OriginalMessage | null>(null);
  const [loading, setLoading] = useState(true);

  const [tonalite, setTonalite] = useState<string>("doux");
  const [contextNote, setContextNote] = useState("");
  const [channel, setChannel] = useState("email");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!id || !messageId) return;
    loadData();
  }, [id, messageId]);

  const loadData = async () => {
    const [{ data: p }, { data: msg }] = await Promise.all([
      supabase.from("prospects").select("*").eq("id", id!).single(),
      supabase.from("messages").select("*").eq("id", messageId!).single(),
    ]);

    if (!p || !msg) {
      toast.error("Données introuvables");
      navigate(`/prospects/${id}`);
      return;
    }

    setProspect(p as Prospect);
    setOriginalMessage(msg as OriginalMessage);

    const ri = p.recherche_ia as any;
    if (ri?.channel) setChannel(ri.channel);

    setLoading(false);
  };

  const handleGenerate = async () => {
    if (!id || !messageId) return;
    setGenerating(true);

    try {
      const { data: profileData } = await supabase
        .from("my_profile")
        .select("*")
        .limit(1)
        .maybeSingle();

      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        "generate-relance",
        {
          body: {
            prospect_id: id,
            original_message_id: messageId,
            tonalite,
            context_note: contextNote,
            channel,
            my_profile: profileData,
          },
        }
      );

      if (fnError) throw fnError;

      if (fnData?.message_id) {
        toast.success("Relance générée !");
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
          Rédaction de la relance pour {prospect?.entreprise || "la structure"}…
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
        <button
          onClick={() => navigate(`/prospects/${id}`)}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Fiche prospect
        </button>

        <h1 className="text-2xl mb-6">
          Relancer — {prospect?.entreprise}
        </h1>

        {/* Original message preview */}
        {originalMessage && (
          <div className="bg-muted/40 rounded-2xl border border-border/60 p-5 mb-8">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Message précédent ·{" "}
              {new Date(originalMessage.created_at).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
            {originalMessage.sujet && (
              <p className="text-sm font-medium mb-2">{originalMessage.sujet}</p>
            )}
            <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-6">
              {originalMessage.contenu || "—"}
            </p>
          </div>
        )}

        {/* Tonalité */}
        <div className="space-y-2 mb-6">
          <Label className="text-base">Tonalité de la relance</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {TONALITES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTonalite(item.id)}
                className={`
                  rounded-2xl p-4 text-left transition-all duration-200 border-2
                  ${
                    tonalite === item.id
                      ? "border-primary bg-primary/5 shadow-md"
                      : "border-border/60 bg-card hover:border-border hover:shadow-sm"
                  }
                `}
                style={{ transform: tonalite === item.id ? "scale(0.98)" : undefined }}
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

        {/* Context note */}
        <div className="space-y-1.5 mb-5">
          <Label>Note contextuelle (optionnel)</Label>
          <Textarea
            value={contextNote}
            onChange={(e) => setContextNote(e.target.value)}
            placeholder="Ex : ils ont vu mais pas répondu, je les ai recroisés depuis…"
            rows={3}
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

        <Button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full gap-2 text-base py-6"
        >
          <RefreshCw className="h-4 w-4" />
          Générer la relance
        </Button>
      </div>
    </div>
  );
};

export default GenerateRelance;