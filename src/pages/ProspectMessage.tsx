import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  ArrowLeft,
  Copy,
  Check,
  RefreshCw,
  Send,
  Save,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ClipboardList,
} from "lucide-react";
import type { Prospect } from "@/hooks/useProspects";
import type { ResearchResult } from "@/lib/research-types";

const INTENTION_LABELS: Record<string, string> = {
  accompagnement: "🎯 Accompagnement com",
  formation: "🎓 Partenariat formation",
  contact: "👋 Prise de contact",
};

const ProspectMessage = () => {
  const { id, msgId } = useParams<{ id: string; msgId: string }>();
  const navigate = useNavigate();

  const [prospect, setProspect] = useState<Prospect | null>(null);
  const [research, setResearch] = useState<ResearchResult | null>(null);
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [messageType, setMessageType] = useState<string | null>(null);
  const [strategyNotes, setStrategyNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);

  useEffect(() => {
    if (!msgId || !id) return;
    loadData();
  }, [msgId, id]);

  const loadData = async () => {
    const [{ data: msg }, { data: prospectData }] = await Promise.all([
      supabase.from("messages").select("*").eq("id", msgId!).single(),
      supabase.from("prospects").select("*").eq("id", id!).single(),
    ]);

    if (!msg) {
      toast.error("Message introuvable");
      navigate("/");
      return;
    }

    setSubject(msg.sujet || "");
    setContent(msg.contenu || "");
    setMessageType(msg.type);

    if (prospectData) {
      setProspect(prospectData as Prospect);
      const ri = prospectData.recherche_ia as unknown as ResearchResult & { strategy_notes?: string };
      setResearch(ri || null);
      setStrategyNotes(ri?.strategy_notes || "");
    }

    setLoading(false);
  };

  const wordCount = useMemo(() => {
    return content.trim() ? content.trim().split(/\s+/).length : 0;
  }, [content]);

  const handleCopyMessage = async () => {
    await navigator.clipboard.writeText(content);
    setCopiedMsg(true);
    toast.success("Message copié");
    setTimeout(() => setCopiedMsg(false), 2000);
  };

  const handleCopyAll = async () => {
    const text = subject ? `Objet : ${subject}\n\n${content}` : content;
    await navigator.clipboard.writeText(text);
    setCopiedAll(true);
    toast.success("Objet + message copiés");
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleSaveDraft = async () => {
    if (!msgId) return;
    setSaving(true);
    const { error } = await supabase
      .from("messages")
      .update({ sujet: subject, contenu: content })
      .eq("id", msgId);

    if (error) toast.error("Erreur de sauvegarde");
    else toast.success("Brouillon sauvegardé");
    setSaving(false);
  };

  const handleMarkSent = async () => {
    if (!msgId || !id) return;
    setSaving(true);

    // Save current edits first
    await supabase
      .from("messages")
      .update({ sujet: subject, contenu: content, statut: "envoyé" })
      .eq("id", msgId);

    // Update prospect
    await supabase
      .from("prospects")
      .update({
        statut: "contacte",
        recherche_ia: {
          ...(research || {}),
          contacted_at: new Date().toISOString(),
          is_sent: true,
        },
      })
      .eq("id", id);

    toast.success("Message marqué comme envoyé !");
    navigate("/");
  };

  const handleRegenerate = async () => {
    if (!id || !research) return;
    setRegenerating(true);

    try {
      const { data: profileData } = await supabase
        .from("my_profile")
        .select("*")
        .limit(1)
        .maybeSingle();

      const ri = research as any;

      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        "generate-prospection-message",
        {
          body: {
            prospect_id: id,
            research_data: research,
            intention: ri?.intention || "contact",
            intention_detail: ri?.intention_detail || "",
            personal_context: ri?.personal_context || "",
            channel: ri?.channel || "email",
            my_profile: profileData,
          },
        }
      );

      if (fnError) throw fnError;

      if (fnData?.message_id) {
        toast.success("Nouveau message généré");
        if (fnData.message_id !== msgId) {
          navigate(`/prospects/${id}/message/${fnData.message_id}`, { replace: true });
        }
        setSubject(fnData.subject || "");
        setContent(fnData.message || "");
        setStrategyNotes(fnData.strategy_notes || "");
      } else {
        throw new Error(fnData?.error || "Erreur lors de la régénération");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erreur lors de la régénération");
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Chargement…</p>
      </div>
    );
  }

  if (regenerating) {
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

  const ri = research as any;

  return (
    <div className="min-h-screen px-4 py-8 lg:px-8">
      <div className="mx-auto max-w-6xl animate-fade-in">
        {/* Back */}
        <button
          onClick={() => navigate(`/prospects/${id}/generate`)}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à la génération
        </button>

        <h1 className="text-2xl mb-6">Message — {prospect?.entreprise}</h1>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* ═══ Main zone (70%) ═══ */}
          <div className="flex-1 lg:max-w-[70%] space-y-4">
            {/* Subject (email channel) */}
            {((research as any)?.channel || "email") === "email" && (
              <div className="space-y-1.5">
                <Label htmlFor="msg-subject" className="text-xs text-muted-foreground uppercase tracking-wide">
                  Objet
                </Label>
                <Input
                  id="msg-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="bg-card font-medium"
                />
              </div>
            )}

            {/* Message textarea */}
            <div className="space-y-1.5">
              <Label htmlFor="msg-content" className="text-xs text-muted-foreground uppercase tracking-wide">
                Message
              </Label>
              <Textarea
                id="msg-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={16}
                className="bg-card border-border/60 shadow-sm rounded-xl text-sm leading-relaxed resize-y"
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              />
              <p className="text-[11px] text-muted-foreground tabular-nums text-right">
                {wordCount} mot{wordCount !== 1 ? "s" : ""}
              </p>
            </div>

            {/* Strategy notes */}
            {strategyNotes && (
              <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "hsl(340, 100%, 98%)" }}>
                <button
                  onClick={() => setShowNotes(!showNotes)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left"
                >
                  <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
                    📝 Note stratégique IA
                  </span>
                  {showNotes ? (
                    <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </button>
                {showNotes && (
                  <div className="px-4 pb-4 text-sm text-foreground/80 leading-relaxed animate-fade-in">
                    {strategyNotes}
                  </div>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRegenerate}
                disabled={regenerating}
                className="gap-1.5 text-xs"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Regénérer
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyMessage}
                className="gap-1.5 text-xs"
              >
                {copiedMsg ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedMsg ? "Copié" : "Copier le message"}
              </Button>

              {((research as any)?.channel || "email") === "email" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyAll}
                  className="gap-1.5 text-xs"
                >
                  {copiedAll ? <Check className="h-3.5 w-3.5" /> : <ClipboardList className="h-3.5 w-3.5" />}
                  {copiedAll ? "Copié" : "Copier objet + message"}
                </Button>
              )}

              <Button
                size="sm"
                onClick={handleMarkSent}
                disabled={saving}
                className="gap-1.5 text-xs bg-success hover:bg-success/90 text-success-foreground ml-auto"
              >
                <Send className="h-3.5 w-3.5" />
                Marquer comme envoyé
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={handleSaveDraft}
                disabled={saving}
                className="gap-1.5 text-xs"
              >
                <Save className="h-3.5 w-3.5" />
                {saving ? "…" : "Sauvegarder brouillon"}
              </Button>
            </div>
          </div>

          {/* ═══ Sidebar (30%) ═══ */}
          <aside className="lg:w-[30%] space-y-4">
            {/* Prospect info */}
            <div className="bg-card rounded-xl border border-border/60 p-4 shadow-sm">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                Prospect
              </h3>
              <div className="space-y-2 text-sm">
                <p className="font-medium text-foreground">{prospect?.entreprise || "—"}</p>
                {ri?.type_structure && (
                  <p className="text-muted-foreground text-xs">
                    Type : {ri.type_structure}
                  </p>
                )}
                {prospect?.nom && (
                  <p className="text-muted-foreground">
                    {prospect.nom}
                    {prospect.poste && <span className="opacity-70"> · {prospect.poste}</span>}
                  </p>
                )}
                {prospect?.email && (
                  <p className="text-muted-foreground text-xs break-all">{prospect.email}</p>
                )}
                {ri?.intention && (
                  <p className="text-xs mt-2">
                    {INTENTION_LABELS[ri.intention] || ri.intention}
                  </p>
                )}
                {ri?.channel && (
                  <p className="text-xs text-muted-foreground">
                    Canal : {ri.channel}
                  </p>
                )}
              </div>
            </div>

            {/* Immersion card */}
            {research && (
              <div className="bg-card rounded-xl border border-border/60 p-4 shadow-sm">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                  Fiche d'immersion
                </h3>
                <div className="space-y-3 text-sm">
                  {research.mission && (
                    <div>
                      <p className="text-xs font-medium text-foreground mb-0.5">Mission</p>
                      <p className="text-muted-foreground text-xs leading-relaxed">
                        {research.mission}
                      </p>
                    </div>
                  )}

                  {research.details_immersion?.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-foreground mb-0.5">Détails clés</p>
                      <ul className="space-y-0.5">
                        {research.details_immersion.slice(0, 5).map((d, i) => (
                          <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                            <span className="text-primary mt-0.5 shrink-0">●</span>
                            <span>{d}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {research.besoins_com?.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-foreground mb-0.5">Besoins com</p>
                      <ul className="space-y-0.5">
                        {research.besoins_com.slice(0, 3).map((b, i) => (
                          <li key={i} className="text-xs text-muted-foreground">
                            • {b.titre}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Sources */}
            {research?.sources?.length > 0 && (
              <div className="bg-card rounded-xl border border-border/60 p-4 shadow-sm">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                  Sources
                </h3>
                <div className="space-y-1.5">
                  {research.sources.map((s, i) => (
                    <a
                      key={i}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-primary hover:underline truncate"
                    >
                      <ExternalLink className="h-3 w-3 shrink-0" />
                      <span className="truncate">{s.titre || s.url}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
};

export default ProspectMessage;
