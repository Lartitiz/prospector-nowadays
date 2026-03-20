import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Copy, Check, Pencil, Save } from "lucide-react";
import { Input } from "@/components/ui/input";

interface MessageData {
  id: string;
  sujet: string | null;
  contenu: string | null;
  type: string | null;
  statut: string | null;
  prospect_id: string | null;
}

const ProspectMessage = () => {
  const { id, msgId } = useParams<{ id: string; msgId: string }>();
  const navigate = useNavigate();

  const [message, setMessage] = useState<MessageData | null>(null);
  const [prospectName, setProspectName] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editSubject, setEditSubject] = useState("");
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!msgId || !id) return;
    loadData();
  }, [msgId, id]);

  const loadData = async () => {
    const [{ data: msg }, { data: prospect }] = await Promise.all([
      supabase.from("messages").select("*").eq("id", msgId!).single(),
      supabase.from("prospects").select("entreprise").eq("id", id!).single(),
    ]);

    if (!msg) {
      toast.error("Message introuvable");
      navigate("/");
      return;
    }

    setMessage(msg as MessageData);
    setEditSubject(msg.sujet || "");
    setEditContent(msg.contenu || "");
    setProspectName(prospect?.entreprise || "");
    setLoading(false);
  };

  const handleCopy = async () => {
    const text = message?.type === "email"
      ? `Objet : ${message?.sujet || ""}\n\n${message?.contenu || ""}`
      : message?.contenu || "";

    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copié dans le presse-papier");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    if (!msgId) return;
    setSaving(true);
    const { error } = await supabase
      .from("messages")
      .update({ sujet: editSubject, contenu: editContent })
      .eq("id", msgId);

    if (error) {
      toast.error("Erreur de sauvegarde");
    } else {
      setMessage((prev) => prev ? { ...prev, sujet: editSubject, contenu: editContent } : prev);
      setEditing(false);
      toast.success("Message sauvegardé");
    }
    setSaving(false);
  };

  const handleMarkSent = async () => {
    if (!msgId || !id) return;
    await supabase.from("messages").update({ statut: "envoyé" }).eq("id", msgId);
    await supabase.from("prospects").update({ statut: "contacte" }).eq("id", id);
    toast.success("Marqué comme envoyé");
    navigate("/");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Chargement…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8 lg:px-8">
      <div className="mx-auto max-w-2xl animate-fade-in">
        <button
          onClick={() => navigate(`/prospects/${id}/generate`)}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </button>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl">Message — {prospectName}</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditing(!editing)}
              className="gap-1.5"
            >
              <Pencil className="h-3.5 w-3.5" />
              {editing ? "Annuler" : "Modifier"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="gap-1.5"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copié" : "Copier"}
            </Button>
          </div>
        </div>

        {/* Message display / edit */}
        <div className="bg-card rounded-2xl border border-border/60 shadow-sm overflow-hidden">
          {/* Subject (email only) */}
          {message?.type === "email" && (
            <div className="px-5 py-3 border-b border-border/60">
              {editing ? (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Objet</Label>
                  <Input
                    value={editSubject}
                    onChange={(e) => setEditSubject(e.target.value)}
                    className="font-medium"
                  />
                </div>
              ) : (
                <p className="text-sm">
                  <span className="text-muted-foreground">Objet : </span>
                  <span className="font-medium">{message?.sujet || "—"}</span>
                </p>
              )}
            </div>
          )}

          {/* Body */}
          <div className="p-5">
            {editing ? (
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={12}
                className="text-sm leading-relaxed"
              />
            ) : (
              <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                {message?.contenu || "—"}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          {editing ? (
            <Button onClick={handleSave} disabled={saving} className="flex-1 gap-2">
              <Save className="h-4 w-4" />
              {saving ? "Sauvegarde…" : "Sauvegarder"}
            </Button>
          ) : (
            <>
              <Button onClick={handleMarkSent} className="flex-1">
                Marquer comme envoyé
              </Button>
              <Button
                variant="secondary"
                onClick={() => navigate(`/prospects/${id}/generate`)}
                className="flex-1"
              >
                Régénérer
              </Button>
              <Button variant="ghost" onClick={() => navigate("/")}>
                Retour au pipeline
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProspectMessage;
