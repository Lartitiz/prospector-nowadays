import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Search, Save, RefreshCw, ArrowRight } from "lucide-react";
import ImmersionCard from "@/components/prospects/ImmersionCard";
import ResearchLoading from "@/components/prospects/ResearchLoading";
import { STRUCTURE_TYPES, SOURCE_OPTIONS, type ResearchResult } from "@/lib/research-types";

const NewProspect = () => {
  const navigate = useNavigate();

  // Form state
  const [nom, setNom] = useState("");
  const [siteWeb, setSiteWeb] = useState("");
  const [typeStructure, setTypeStructure] = useState("");
  const [source, setSource] = useState("");

  // Flow state
  const [prospectId, setProspectId] = useState<string | null>(null);
  const [researching, setResearching] = useState(false);
  const [research, setResearch] = useState<ResearchResult | null>(null);
  const [saving, setSaving] = useState(false);

  const launchResearch = async (existingProspectId?: string) => {
    try {
      setResearching(true);
      let pid = existingProspectId || prospectId;

      // Step 1: Create prospect if not yet created
      if (!pid) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        const { data, error } = await supabase
          .from("prospects")
          .insert({
            entreprise: nom,
            user_id: user.id,
            statut: "a_rechercher",
            recherche_ia: {
              site_web: siteWeb,
              type_structure: typeStructure,
              source,
              research_status: "researching",
            },
          })
          .select("id")
          .single();

        if (error) throw error;
        pid = data.id;
        setProspectId(pid);
      } else {
        // Update research_status to researching
        await supabase
          .from("prospects")
          .update({
            recherche_ia: {
              ...(research || {}),
              site_web: siteWeb,
              type_structure: typeStructure,
              source,
              research_status: "researching",
            },
          })
          .eq("id", pid);
      }

      // Step 2: Call edge function
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        "research-prospect",
        { body: { prospect_id: pid } }
      );

      if (fnError) throw fnError;

      if (fnData?.research) {
        setResearch(fnData.research as ResearchResult);
        toast.success("Recherche terminée");
      } else {
        throw new Error("No research data returned");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erreur lors de la recherche");
    } finally {
      setResearching(false);
    }
  };

  const handleSaveAndGenerate = async () => {
    if (!prospectId || !research) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("prospects")
        .update({
          nom: research.contact_suggere?.nom || null,
          poste: research.contact_suggere?.role || null,
          email: research.contact_suggere?.email || null,
          linkedin: research.contact_suggere?.linkedin || null,
          secteur: research.secteur || null,
          statut: "recherche_faite",
          recherche_ia: { ...research, research_status: "done" },
        })
        .eq("id", prospectId);
      if (error) throw error;
      navigate(`/prospects/${prospectId}/generate`);
    } catch (err: any) {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveWithoutMessage = async () => {
    if (!prospectId || !research) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("prospects")
        .update({
          nom: research.contact_suggere?.nom || null,
          poste: research.contact_suggere?.role || null,
          email: research.contact_suggere?.email || null,
          linkedin: research.contact_suggere?.linkedin || null,
          secteur: research.secteur || null,
          statut: "recherche_faite",
          recherche_ia: { ...research, research_status: "done" },
        })
        .eq("id", prospectId);
      if (error) throw error;
      toast.success("Prospect sauvegardé");
      navigate("/");
    } catch (err: any) {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-8 lg:px-8">
      <div className="mx-auto max-w-2xl">
        {/* Back */}
        <button
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Pipeline
        </button>

        <h1 className="text-2xl mb-8">Nouveau prospect</h1>

        {/* Form */}
        <div className="space-y-4 mb-8">
          <div className="space-y-1.5">
            <Label htmlFor="np-nom">Nom de la structure *</Label>
            <Input
              id="np-nom"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Ex : La Coop des Communs"
              required
              disabled={!!prospectId}
              className="bg-card"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="np-site">URL site web</Label>
            <Input
              id="np-site"
              value={siteWeb}
              onChange={(e) => setSiteWeb(e.target.value)}
              placeholder="https://"
              disabled={!!prospectId}
              className="bg-card"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Type de structure</Label>
              <Select value={typeStructure} onValueChange={setTypeStructure} disabled={!!prospectId}>
                <SelectTrigger className="bg-card">
                  <SelectValue placeholder="Choisir…" />
                </SelectTrigger>
                <SelectContent>
                  {STRUCTURE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Source</Label>
              <Select value={source} onValueChange={setSource} disabled={!!prospectId}>
                <SelectTrigger className="bg-card">
                  <SelectValue placeholder="Choisir…" />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {!research && !researching && (
            <Button
              onClick={() => launchResearch()}
              disabled={!nom.trim()}
              className="w-full gap-2 mt-2"
            >
              <Search className="h-4 w-4" />
              Lancer la recherche
            </Button>
          )}
        </div>

        {/* Loading */}
        {researching && <ResearchLoading structureName={nom} />}

        {/* Immersion Card */}
        {research && !researching && (
          <>
            <ImmersionCard research={research} onChange={setResearch} />

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 mt-10 pt-6 border-t border-border">
              <Button onClick={handleSaveAndGenerate} disabled={saving} className="flex-1 gap-2">
                <ArrowRight className="h-4 w-4" />
                Sauvegarder et générer le message
              </Button>
              <Button onClick={handleSaveWithoutMessage} disabled={saving} variant="secondary" className="flex-1 gap-2">
                <Save className="h-4 w-4" />
                Sauvegarder sans message
              </Button>
              <Button
                onClick={() => launchResearch(prospectId!)}
                disabled={saving}
                variant="ghost"
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Relancer
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default NewProspect;
