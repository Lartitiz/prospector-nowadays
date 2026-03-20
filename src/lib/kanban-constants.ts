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
  entreprise: "hsl(210, 60%, 55%)",
  association: "hsl(280, 50%, 55%)",
  collectivite: "hsl(150, 50%, 45%)",
  startup: "hsl(340, 70%, 55%)",
  institution: "hsl(30, 60%, 50%)",
};
