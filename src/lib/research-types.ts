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
