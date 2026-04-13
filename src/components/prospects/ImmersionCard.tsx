import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, X, ExternalLink } from "lucide-react";
import type { ResearchResult } from "@/lib/research-types";

const stripCiteTags = (text: string) => text.replace(/<\/?cite[^>]*>/gi, "");

interface Props {
  research: ResearchResult;
  onChange: (research: ResearchResult) => void;
}

const QualityBadge = ({ level }: { level: string }) => {
  const colors: Record<string, string> = {
    high: "bg-emerald-100 text-emerald-700",
    medium: "bg-amber-100 text-amber-700",
    low: "bg-red-100 text-red-700",
  };
  const labels: Record<string, string> = {
    high: "Haute qualité",
    medium: "Qualité moyenne",
    low: "Qualité faible",
  };
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${colors[level] || colors.low}`}>
      {labels[level] || level}
    </span>
  );
};

const ImmersionCard = ({ research: raw, onChange }: Props) => {
  const research: ResearchResult = {
    ...raw,
    mission: raw.mission || "",
    secteur: raw.secteur || "",
    projets_recents: Array.isArray(raw.projets_recents) ? raw.projets_recents : [],
    besoins_com: Array.isArray(raw.besoins_com) ? raw.besoins_com : [],
    details_immersion: Array.isArray(raw.details_immersion) ? raw.details_immersion : [],
    contact_suggere: raw.contact_suggere || { nom: "", role: "", email: "", linkedin: "" },
    sources: Array.isArray(raw.sources) ? raw.sources : [],
    qualite_recherche: raw.qualite_recherche || "low",
  };

  const update = <K extends keyof ResearchResult>(key: K, value: ResearchResult[K]) => {
    onChange({ ...research, [key]: value });
  };

  const updateProject = (index: number, field: string, value: string) => {
    const updated = [...research.projets_recents];
    updated[index] = { ...updated[index], [field]: value };
    update("projets_recents", updated);
  };

  const addProject = () => {
    update("projets_recents", [...research.projets_recents, { titre: "", description: "", date: "" }]);
  };

  const removeProject = (index: number) => {
    update("projets_recents", research.projets_recents.filter((_, i) => i !== index));
  };

  const updateBesoin = (index: number, field: string, value: string) => {
    const updated = [...research.besoins_com];
    updated[index] = { ...updated[index], [field]: value };
    update("besoins_com", updated);
  };

  const addBesoin = () => {
    update("besoins_com", [...research.besoins_com, { titre: "", description: "", priorite: "moyenne" }]);
  };

  const removeBesoin = (index: number) => {
    update("besoins_com", research.besoins_com.filter((_, i) => i !== index));
  };

  const updateDetail = (index: number, value: string) => {
    const updated = [...research.details_immersion];
    updated[index] = value;
    update("details_immersion", updated);
  };

  const addDetail = () => {
    update("details_immersion", [...research.details_immersion, ""]);
  };

  const removeDetail = (index: number) => {
    update("details_immersion", research.details_immersion.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Quality badge */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-heading">Fiche d'immersion</h2>
        <QualityBadge level={research.qualite_recherche} />
      </div>

      {/* Mission */}
      <div className="space-y-1.5">
        <Label>Mission</Label>
        <Textarea
          value={research.mission}
          onChange={(e) => update("mission", e.target.value)}
          rows={3}
          className="bg-card"
        />
      </div>

      {/* Secteur */}
      <div className="space-y-1.5">
        <Label>Secteur</Label>
        <Input
          value={research.secteur}
          onChange={(e) => update("secteur", e.target.value)}
          className="bg-card"
        />
      </div>

      {/* Projets récents */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base">Projets récents</Label>
          <Button type="button" variant="ghost" size="sm" onClick={addProject} className="gap-1 text-xs">
            <Plus className="h-3.5 w-3.5" /> Ajouter
          </Button>
        </div>
        {research.projets_recents.map((p, i) => (
          <div key={i} className="bg-card rounded-xl p-4 border border-border/60 space-y-2 relative group">
            <button
              type="button"
              onClick={() => removeProject(i)}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <Input
              placeholder="Titre du projet"
              value={p.titre}
              onChange={(e) => updateProject(i, "titre", e.target.value)}
              className="font-medium"
            />
            <Textarea
              placeholder="Description"
              value={p.description}
              onChange={(e) => updateProject(i, "description", e.target.value)}
              rows={2}
            />
          </div>
        ))}
      </div>

      {/* Besoins com */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base">Besoins com identifiés</Label>
          <Button type="button" variant="ghost" size="sm" onClick={addBesoin} className="gap-1 text-xs">
            <Plus className="h-3.5 w-3.5" /> Ajouter
          </Button>
        </div>
        {research.besoins_com.map((b, i) => (
          <div key={i} className="bg-card rounded-xl p-4 border border-border/60 space-y-2 relative group">
            <button
              type="button"
              onClick={() => removeBesoin(i)}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <Input
              placeholder="Titre du besoin"
              value={b.titre}
              onChange={(e) => updateBesoin(i, "titre", e.target.value)}
              className="font-medium"
            />
            <Textarea
              placeholder="Description"
              value={b.description}
              onChange={(e) => updateBesoin(i, "description", e.target.value)}
              rows={2}
            />
          </div>
        ))}
      </div>

      {/* Détails clés */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base">Détails clés d'immersion</Label>
          <Button type="button" variant="ghost" size="sm" onClick={addDetail} className="gap-1 text-xs">
            <Plus className="h-3.5 w-3.5" /> Ajouter
          </Button>
        </div>
        <ul className="space-y-2">
          {research.details_immersion.map((d, i) => (
            <li key={i} className="flex items-start gap-2 group">
              <span className="text-primary mt-2.5 text-xs">●</span>
              <Input
                value={d}
                onChange={(e) => updateDetail(i, e.target.value)}
                className="flex-1 bg-card"
              />
              <button
                type="button"
                onClick={() => removeDetail(i)}
                className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Contact suggéré */}
      <div className="space-y-3">
        <Label className="text-base">Contact suggéré</Label>
        <div className="bg-card rounded-xl p-4 border border-border/60 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Nom</Label>
            <Input
              value={research.contact_suggere.nom}
              onChange={(e) => update("contact_suggere", { ...research.contact_suggere, nom: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Rôle</Label>
            <Input
              value={research.contact_suggere.role}
              onChange={(e) => update("contact_suggere", { ...research.contact_suggere, role: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Email</Label>
            <Input
              type="email"
              value={research.contact_suggere.email}
              onChange={(e) => update("contact_suggere", { ...research.contact_suggere, email: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">LinkedIn</Label>
            <Input
              value={research.contact_suggere.linkedin}
              onChange={(e) => update("contact_suggere", { ...research.contact_suggere, linkedin: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Sources */}
      {research.sources.length > 0 && (
        <div className="space-y-2">
          <Label className="text-base">Sources</Label>
          <div className="flex flex-wrap gap-2">
            {research.sources.map((s, i) => (
              <a
                key={i}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline bg-card border border-border/60 rounded-lg px-3 py-1.5 transition-colors hover:bg-secondary"
              >
                <ExternalLink className="h-3 w-3" />
                {s.titre || s.url}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImmersionCard;
