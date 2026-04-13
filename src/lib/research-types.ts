export interface ResearchResult {
  mission: string;
  secteur: string;
  projets_recents: { titre: string; description: string; date?: string }[];
  besoins_com: { titre: string; description: string; priorite?: string }[];
  details_immersion: string[];
  contact_suggere: { nom: string; role: string; email: string; linkedin: string };
  sources: { titre: string; url: string }[];
  qualite_recherche: "high" | "medium" | "low";
  research_status?: string;
  researched_at?: string;
  site_web?: string;
  type_structure?: string;
  source?: string;
}

export const STRUCTURE_TYPES = [
  "coopérative",
  "association",
  "PME engagée",
  "tiers-lieu",
  "solopreneuse",
  "école",
  "institution",
  "projet local",
  "autre",
] as const;

export const SOURCE_OPTIONS = [
  "réseau",
  "LinkedIn",
  "événement",
  "recommandation",
  "recherche",
  "autre",
] as const;

export const LOADING_MESSAGES = [
  "Exploration du site de {nom}…",
  "Recherche des actualités récentes…",
  "Identification des besoins et contacts…",
  "Analyse de la mission et des projets…",
  "Synthèse des informations trouvées…",
];

export const stripCiteTags = (text: string) => text.replace(/<\/?cite[^>]*>/gi, "");

export const sanitizeResearch = (ri: any): ResearchResult | null => {
  if (!ri) return null;
  const clean = { ...ri };
  if (typeof clean.mission === "string") clean.mission = stripCiteTags(clean.mission);
  if (typeof clean.secteur === "string") clean.secteur = stripCiteTags(clean.secteur);
  if (Array.isArray(clean.projets_recents)) clean.projets_recents = clean.projets_recents.map((p: any) => ({ ...p, titre: stripCiteTags(p.titre || ""), description: stripCiteTags(p.description || "") }));
  if (Array.isArray(clean.besoins_com)) clean.besoins_com = clean.besoins_com.map((b: any) => ({ ...b, titre: stripCiteTags(b.titre || ""), description: stripCiteTags(b.description || "") }));
  if (Array.isArray(clean.details_immersion)) clean.details_immersion = clean.details_immersion.map((d: string) => stripCiteTags(d));
  if (clean.contact_suggere) clean.contact_suggere = { ...clean.contact_suggere, nom: stripCiteTags(clean.contact_suggere.nom || ""), role: stripCiteTags(clean.contact_suggere.role || "") };
  return clean as ResearchResult;
};
