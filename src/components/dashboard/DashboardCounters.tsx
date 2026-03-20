import { KANBAN_STATUSES } from "@/lib/kanban-constants";
import type { Prospect } from "@/hooks/useProspects";

interface Props {
  prospects: Prospect[];
}

const DashboardCounters = ({ prospects }: Props) => {
  const total = prospects.length;
  const aRechercher = prospects.filter((p) => p.statut === "a_rechercher").length;
  const enAttente = prospects.filter((p) =>
    ["contacte", "relance"].includes(p.statut || "")
  ).length;
  const rdv = prospects.filter((p) => p.statut === "rdv_planifie").length;
  const gagnes = prospects.filter((p) => p.statut === "gagne").length;

  const counters = [
    { label: "Total", value: total, accent: false },
    { label: "À rechercher", value: aRechercher, accent: false },
    { label: "En attente", value: enAttente, accent: false },
    { label: "RDV planifiés", value: rdv, accent: false },
    { label: "Gagnés", value: gagnes, accent: true },
  ];

  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      {counters.map((c) => (
        <div
          key={c.label}
          className="flex-shrink-0 rounded-xl bg-card px-4 py-3 shadow-sm border border-border/60 min-w-[120px]"
        >
          <p className="text-xs text-muted-foreground font-medium tracking-wide uppercase">
            {c.label}
          </p>
          <p
            className={`text-2xl font-semibold tabular-nums mt-0.5 ${
              c.accent ? "text-primary" : "text-foreground"
            }`}
          >
            {c.value}
          </p>
        </div>
      ))}
    </div>
  );
};

export default DashboardCounters;
