import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  ArrowLeft,
  Save,
  Sparkles,
  RefreshCw,
  CalendarIcon,
  Plus,
  X,
  ExternalLink,
  Mail,
  MessageSquare,
  Eye,
} from "lucide-react";
import ImmersionCard from "@/components/prospects/ImmersionCard";
import { STRUCTURE_TYPES, SOURCE_OPTIONS, type ResearchResult, sanitizeResearch, stripCiteTags } from "@/lib/research-types";
import { ALL_STATUSES } from "@/lib/kanban-constants";
import { cn } from "@/lib/utils";

const PRIORITY_OPTIONS = [
  { value: "haute", label: "🔴 Haute" },
  { value: "moyenne", label: "🟡 Moyenne" },
  { value: "basse", label: "🟢 Basse" },
];

const INTENTION_OPTIONS = [
  { value: "accompagnement", label: "🎯 Accompagnement com" },
  { value: "formation", label: "🎓 Partenariat formation" },
  { value: "contact", label: "👋 Prise de contact" },
];

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  email: <Mail className="h-3 w-3" />,
  linkedin: <MessageSquare className="h-3 w-3" />,
  instagram: <MessageSquare className="h-3 w-3" />,
};

const TYPE_BADGE_COLORS: Record<string, string> = {
  initial: "bg-primary/10 text-primary",
  relance: "bg-amber-100 text-amber-700",
  email: "bg-blue-100 text-blue-700",
};

interface Message {
  id: string;
  sujet: string | null;
  contenu: string | null;
  type: string | null;
  statut: string | null;
  created_at: string;
  genere_par_ia: boolean | null;
}

const ProspectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Prospect fields
  const [entreprise, setEntreprise] = useState("");
  const [siteWeb, setSiteWeb] = useState("");
  const [typeStructure, setTypeStructure] = useState("");
  const [source, setSource] = useState("");
  const [secteur, setSecteur] = useState("");
  const [statut, setStatut] = useState("");
  const [priorite, setPriorite] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");

  // Contact
  const [contactNom, setContactNom] = useState("");
  const [contactRole, setContactRole] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactLinkedin, setContactLinkedin] = useState("");

  // Intention
  const [intention, setIntention] = useState("");
  const [intentionDetail, setIntentionDetail] = useState("");
  const [personalContext, setPersonalContext] = useState("");

  // Next action
  const [nextActionDate, setNextActionDate] = useState<Date | undefined>();
  const [nextActionNote, setNextActionNote] = useState("");

  // Notes
  const [notes, setNotes] = useState("");

  // Research
  const [research, setResearch] = useState<ResearchResult | null>(null);

  // Messages
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (!id) return;
    loadAll();
  }, [id]);

  const loadAll = async () => {
    const [{ data: p }, { data: msgs }] = await Promise.all([
      supabase.from("prospects").select("*").eq("id", id!).single(),
      supabase.from("messages").select("*").eq("prospect_id", id!).order("created_at", { ascending: false }),
    ]);

    if (!p) {
      toast.error("Prospect introuvable");
      navigate("/");
      return;
    }

    setEntreprise(p.entreprise || "");
    setSecteur(p.secteur || "");
    setStatut(p.statut || "a_rechercher");
    setContactNom(p.nom || "");
    setContactRole(p.poste || "");
    setContactEmail(p.email || "");
    setContactLinkedin(p.linkedin || "");
    setNotes(p.notes || "");

    const ri = p.recherche_ia as any;
    if (ri) {
      setResearch(sanitizeResearch(ri) as ResearchResult);
      setSiteWeb(ri.site_web || "");
      setTypeStructure(ri.type_structure || "");
      setSource(ri.source || "");
      setPriorite(ri.priorite || "");
      setTags(ri.tags || []);
      setIntention(ri.intention || "");
      setIntentionDetail(ri.intention_detail || "");
      setPersonalContext(ri.personal_context || "");
      setNextActionNote(ri.next_action_note || "");
      if (ri.next_action_date) setNextActionDate(new Date(ri.next_action_date));
    }

    setMessages((msgs || []) as Message[]);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const updatedResearch = {
        ...(research || {}),
        site_web: siteWeb,
        type_structure: typeStructure,
        source,
        priorite,
        tags,
        intention,
        intention_detail: intentionDetail,
        personal_context: personalContext,
        next_action_date: nextActionDate?.toISOString() || null,
        next_action_note: nextActionNote,
      };

      const { error } = await supabase
        .from("prospects")
        .update({
          entreprise,
          secteur: research?.secteur || secteur,
          statut,
          nom: contactNom,
          poste: contactRole,
          email: contactEmail,
          linkedin: contactLinkedin,
          notes,
          recherche_ia: updatedResearch,
        })
        .eq("id", id);

      if (error) throw error;
      toast.success("Prospect sauvegardé");
    } catch (err: any) {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const addTag = () => {
    const t = newTag.trim();
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
      setNewTag("");
    }
  };

  // Show "Générer une relance" as soon as at least one message exists
  const showRelance = messages.length > 0;
  const lastMessageId = messages[0]?.id;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Chargement…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8 lg:px-8">
      <div className="mx-auto max-w-3xl animate-fade-in">
        {/* Back */}
        <button
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Pipeline
        </button>

        <div className="flex items-start justify-between gap-4 mb-8">
          <h1 className="text-2xl">{entreprise || "Prospect"}</h1>
          <Button onClick={handleSave} disabled={saving} className="gap-2 shrink-0">
            <Save className="h-4 w-4" />
            {saving ? "…" : "Sauvegarder"}
          </Button>
        </div>

        {/* ═══ Section haute ═══ */}
        <div className="space-y-6 mb-10">
          {/* Structure info */}
          <div className="bg-card rounded-2xl border border-border/60 p-5 shadow-sm space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Structure</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nom" value={entreprise} onChange={setEntreprise} />
              <Field label="URL site web" value={siteWeb} onChange={setSiteWeb} placeholder="https://" />
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Type</Label>
                <Select value={typeStructure} onValueChange={setTypeStructure}>
                  <SelectTrigger className="bg-background"><SelectValue placeholder="Choisir…" /></SelectTrigger>
                  <SelectContent>
                    {STRUCTURE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Field label="Secteur" value={research?.secteur || secteur} onChange={(v) => {
                setSecteur(v);
                if (research) setResearch({ ...research, secteur: v });
              }} />
              <Field label="Mission" value={research?.mission || ""} onChange={(v) => {
                if (research) setResearch({ ...research, mission: v });
              }} fullWidth />
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Source</Label>
                <Select value={source} onValueChange={setSource}>
                  <SelectTrigger className="bg-background"><SelectValue placeholder="Choisir…" /></SelectTrigger>
                  <SelectContent>
                    {SOURCE_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="bg-card rounded-2xl border border-border/60 p-5 shadow-sm space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contact</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nom" value={contactNom} onChange={setContactNom} />
              <Field label="Rôle" value={contactRole} onChange={setContactRole} />
              <Field label="Email" value={contactEmail} onChange={setContactEmail} type="email" />
              <Field label="LinkedIn" value={contactLinkedin} onChange={setContactLinkedin} />
            </div>
          </div>

          {/* Status + priority + tags row */}
          <div className="bg-card rounded-2xl border border-border/60 p-5 shadow-sm space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Statut</Label>
                <Select value={statut} onValueChange={setStatut}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ALL_STATUSES.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Priorité</Label>
                <Select value={priorite} onValueChange={setPriorite}>
                  <SelectTrigger className="bg-background"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Intention</Label>
                <Select value={intention} onValueChange={setIntention}>
                  <SelectTrigger className="bg-background"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {INTENTION_OPTIONS.map((i) => (
                      <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Tags</Label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 text-xs bg-secondary text-secondary-foreground px-2.5 py-1 rounded-full">
                    {tag}
                    <button type="button" onClick={() => setTags(tags.filter((t) => t !== tag))} className="text-muted-foreground hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                  placeholder="Ajouter un tag…"
                  className="bg-background h-8 text-xs"
                />
                <Button type="button" variant="ghost" size="sm" onClick={addTag} className="h-8 text-xs gap-1">
                  <Plus className="h-3 w-3" /> Ajouter
                </Button>
              </div>
            </div>
          </div>

          {/* Next action */}
          <div className="bg-card rounded-2xl border border-border/60 p-5 shadow-sm">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Prochaine action</h2>
            <div className="flex flex-col sm:flex-row gap-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full sm:w-[200px] justify-start text-left font-normal h-9 text-xs", !nextActionDate && "text-muted-foreground")}>
                    <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                    {nextActionDate ? format(nextActionDate, "d MMM yyyy", { locale: fr }) : "Choisir une date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={nextActionDate} onSelect={setNextActionDate} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
              <Input
                value={nextActionNote}
                onChange={(e) => setNextActionNote(e.target.value)}
                placeholder="Note sur l'action à faire…"
                className="bg-background h-9 text-xs flex-1"
              />
            </div>
          </div>

          {/* Intention detail + context */}
          {intention && (
            <div className="bg-card rounded-2xl border border-border/60 p-5 shadow-sm space-y-4">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Détail intention</h2>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Détail de la proposition</Label>
                <Textarea value={intentionDetail} onChange={(e) => setIntentionDetail(e.target.value)} rows={2} className="bg-background text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Contexte personnel</Label>
                <Textarea value={personalContext} onChange={(e) => setPersonalContext(e.target.value)} rows={2} className="bg-background text-sm" placeholder="Ex : croisés à tel événement…" />
              </div>
            </div>
          )}
        </div>

        {/* ═══ Section centrale ═══ */}
        {/* Immersion card */}
        {research && (
          <div className="mb-10">
            <h2 className="text-lg mb-4">Fiche d'immersion</h2>
            <ImmersionCard research={research} onChange={setResearch} />
          </div>
        )}

        {/* Messages history */}
        {messages.length > 0 && (
          <div className="mb-10">
            <h2 className="text-lg mb-4">Historique des messages</h2>
            <div className="space-y-3">
              {messages.map((msg) => {
                const ri = (research as any) || {};
                const channel = ri.channel || "email";
                return (
                  <div key={msg.id} className="bg-card rounded-xl border border-border/60 p-4 shadow-sm flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(msg.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                        {msg.type && (
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${TYPE_BADGE_COLORS[msg.type] || "bg-secondary text-secondary-foreground"}`}>
                            {msg.type}
                          </span>
                        )}
                        {CHANNEL_ICONS[channel] && (
                          <span className="text-muted-foreground">{CHANNEL_ICONS[channel]}</span>
                        )}
                        {msg.statut && (
                          <span className="text-[10px] text-muted-foreground">{msg.statut}</span>
                        )}
                      </div>
                      {msg.sujet && (
                        <p className="text-xs font-medium text-foreground truncate mb-0.5">{msg.sujet}</p>
                      )}
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {msg.contenu?.slice(0, 140) || "—"}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/prospects/${id}/message/${msg.id}`)}
                      className="shrink-0 gap-1 text-xs"
                    >
                      <Eye className="h-3.5 w-3.5" /> Voir
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/prospects/${id}/generate-relance/${msg.id}`)}
                      className="shrink-0 gap-1 text-xs"
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> Relancer
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══ Section bas ═══ */}
        {/* Notes */}
        <div className="mb-10">
          <h2 className="text-lg mb-3">Notes</h2>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={5}
            placeholder="Notes libres sur ce prospect…"
            className="bg-card border-border/60 shadow-sm rounded-xl"
          />
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-border">
          <Button onClick={() => navigate(`/prospects/${id}/generate`)} className="gap-2 flex-1">
            <Sparkles className="h-4 w-4" />
            Générer un nouveau message
          </Button>
          {showRelance && (
            <Button
              onClick={() => navigate(`/prospects/${id}/generate-relance/${lastMessageId}`)}
              variant="secondary"
              className="gap-2 flex-1"
            >
              <RefreshCw className="h-4 w-4" />
              Générer une relance
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving} variant="outline" className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? "…" : "Sauvegarder"}
          </Button>
        </div>
      </div>
    </div>
  );
};

/* ── Reusable field helper ── */
const Field = ({
  label, value, onChange, placeholder, type, fullWidth,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; fullWidth?: boolean;
}) => (
  <div className={cn("space-y-1.5", fullWidth && "sm:col-span-2")}>
    <Label className="text-xs text-muted-foreground">{label}</Label>
    <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} type={type} className="bg-background" />
  </div>
);

export default ProspectDetail;
