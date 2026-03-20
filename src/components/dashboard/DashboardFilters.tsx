import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";

export interface Filters {
  search: string;
  type: string;
  priorite: string;
  intention: string;
}

interface Props {
  filters: Filters;
  onChange: (filters: Filters) => void;
}

const DashboardFilters = ({ filters, onChange }: Props) => {
  const update = (key: keyof Filters, value: string) =>
    onChange({ ...filters, [key]: value });

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px] max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher…"
          className="pl-9 bg-card"
          value={filters.search}
          onChange={(e) => update("search", e.target.value)}
        />
      </div>

      <Select value={filters.type} onValueChange={(v) => update("type", v)}>
        <SelectTrigger className="w-[160px] bg-card">
          <SelectValue placeholder="Type structure" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous types</SelectItem>
          <SelectItem value="entreprise">Entreprise</SelectItem>
          <SelectItem value="association">Association</SelectItem>
          <SelectItem value="collectivite">Collectivité</SelectItem>
          <SelectItem value="startup">Startup</SelectItem>
          <SelectItem value="institution">Institution</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.priorite} onValueChange={(v) => update("priorite", v)}>
        <SelectTrigger className="w-[140px] bg-card">
          <SelectValue placeholder="Priorité" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toutes</SelectItem>
          <SelectItem value="haute">Haute</SelectItem>
          <SelectItem value="normale">Normale</SelectItem>
          <SelectItem value="basse">Basse</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.intention} onValueChange={(v) => update("intention", v)}>
        <SelectTrigger className="w-[140px] bg-card">
          <SelectValue placeholder="Intention" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toutes</SelectItem>
          <SelectItem value="cible">🎯 Cible</SelectItem>
          <SelectItem value="formation">🎓 Formation</SelectItem>
          <SelectItem value="contact">👋 Contact</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export default DashboardFilters;
