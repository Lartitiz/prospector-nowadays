import { useState, useMemo } from "react";
import { useProspects } from "@/hooks/useProspects";
import DashboardCounters from "@/components/dashboard/DashboardCounters";
import DashboardFilters, { type Filters } from "@/components/dashboard/DashboardFilters";
import KanbanBoard from "@/components/dashboard/KanbanBoard";
import { Settings, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const defaultFilters: Filters = {
  search: "",
  type: "all",
  priorite: "all",
  intention: "all",
};

const Dashboard = () => {
  const { data: prospects = [], isLoading } = useProspects();
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    return prospects.filter((p) => {
      const recherche = p.recherche_ia as Record<string, any> | null;

      // Text search
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const searchable = [p.nom, p.entreprise, p.poste, p.email, p.secteur]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!searchable.includes(q)) return false;
      }

      // Type structure
      if (filters.type !== "all") {
        if (recherche?.type_structure !== filters.type) return false;
      }

      // Priorite
      if (filters.priorite !== "all") {
        if (recherche?.priorite !== filters.priorite) return false;
      }

      // Intention
      if (filters.intention !== "all") {
        if (recherche?.intention !== filters.intention) return false;
      }

      return true;
    });
  }, [prospects, filters]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Chargement…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-6 lg:px-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl">Pipeline</h1>
        <div className="flex items-center gap-2">
          <Button size="sm" className="gap-1.5" onClick={() => navigate("/prospects/new")}>
            <Plus className="h-4 w-4" />
            Nouveau prospect
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/settings")}
            className="text-muted-foreground"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Counters */}
      <div className="mb-5">
        <DashboardCounters prospects={prospects} />
      </div>

      {/* Filters */}
      <div className="mb-4">
        <DashboardFilters filters={filters} onChange={setFilters} />
      </div>

      {/* Kanban */}
      <KanbanBoard prospects={filtered} />
    </div>
  );
};

export default Dashboard;
