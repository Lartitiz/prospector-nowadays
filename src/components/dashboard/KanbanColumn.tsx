import { Droppable } from "@hello-pangea/dnd";
import ProspectCard from "./ProspectCard";
import type { Prospect } from "@/hooks/useProspects";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

interface Props {
  id: string;
  label: string;
  color: string;
  prospects: Prospect[];
  collapsed?: boolean;
}

const KanbanColumn = ({ id, label, color, prospects, collapsed: initialCollapsed = false }: Props) => {
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  if (initialCollapsed) {
    return (
      <div className="flex-shrink-0 w-[220px]">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-1.5 w-full text-left px-3 py-2 rounded-xl mb-2"
          style={{ backgroundColor: color }}
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          <span className="text-xs font-semibold text-foreground tracking-wide">
            {label}
          </span>
          <span className="ml-auto text-[10px] font-medium text-muted-foreground tabular-nums">
            {prospects.length}
          </span>
        </button>

        {!collapsed && (
          <Droppable droppableId={id}>
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="space-y-2 min-h-[40px]"
              >
                {prospects.map((p, i) => (
                  <ProspectCard key={p.id} prospect={p} index={i} />
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        )}
      </div>
    );
  }

  return (
    <div className="flex-shrink-0 w-[240px]">
      <div
        className="flex items-center justify-between px-3 py-2 rounded-xl mb-2"
        style={{ backgroundColor: color }}
      >
        <span className="text-xs font-semibold text-foreground tracking-wide">
          {label}
        </span>
        <span className="text-[10px] font-medium text-muted-foreground tabular-nums">
          {prospects.length}
        </span>
      </div>

      <Droppable droppableId={id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`space-y-2 min-h-[100px] rounded-xl p-1.5 transition-colors ${
              snapshot.isDraggingOver ? "bg-primary/5" : ""
            }`}
          >
            {prospects.map((p, i) => (
              <ProspectCard key={p.id} prospect={p} index={i} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
};

export default KanbanColumn;
