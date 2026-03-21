export const KANBAN_STATUSES = [
  { id: "a_rechercher", label: "À rechercher", color: "hsl(210, 40%, 94%)" },
  { id: "recherche_faite", label: "Recherche faite", color: "hsl(200, 40%, 92%)" },
  { id: "message_genere", label: "Message généré", color: "hsl(280, 30%, 93%)" },
  { id: "contacte", label: "Contacté·e", color: "hsl(45, 80%, 92%)" },
  { id: "relance", label: "Relancé·e", color: "hsl(30, 70%, 92%)" },
  { id: "reponse_recue", label: "Réponse reçue", color: "hsl(150, 40%, 91%)" },
  { id: "rdv_planifie", label: "RDV planifié", color: "hsl(170, 40%, 90%)" },
  { id: "proposition_envoyee", label: "Proposition envoyée", color: "hsl(200, 50%, 90%)" },
  { id: "gagne", label: "Gagné", color: "hsl(140, 50%, 88%)" },
] as const;

export const COLLAPSED_STATUSES = [
  { id: "pas_interesse", label: "Pas intéressé·e / En pause", color: "hsl(0, 0%, 92%)" },
] as const;

export const ALL_STATUSES = [...KANBAN_STATUSES, ...COLLAPSED_STATUSES];

export type StatusId = (typeof ALL_STATUSES)[number]["id"];

export const INTENTION_BADGES: Record<string, string> = {
  cible: "🎯",
  formation: "🎓",
  contact: "👋",
};

export const STRUCTURE_TYPE_COLORS: Record<string, string> = {
  "coopérative": "#FB3D80",
  "association": "#91014b",
  "PME engagée": "#1A1A1A",
  "tiers-lieu": "#FFE561",
  "solopreneuse": "#FFA7C6",
  "école": "#5C6BC0",
  "institution": "#5C6BC0",
  "projet local": "#4CAF50",
  "autre": "#9E9E9E",
};
