import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import KanbanColumn from "./KanbanColumn";
import { KANBAN_STATUSES, COLLAPSED_STATUSES, ALL_STATUSES } from "@/lib/kanban-constants";
import type { Prospect } from "@/hooks/useProspects";
import { useUpdateProspectStatus } from "@/hooks/useProspects";
import { toast } from "sonner";

interface Props {
  prospects: Prospect[];
}

const KanbanBoard = ({ prospects }: Props) => {
  const updateStatus = useUpdateProspectStatus();

  const grouped = ALL_STATUSES.reduce<Record<string, Prospect[]>>((acc, s) => {
    acc[s.id] = prospects.filter((p) => p.statut === s.id);
    return acc;
  }, {});

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const newStatus = destination.droppableId;

    updateStatus.mutate(
      { id: draggableId, statut: newStatus },
      {
        onError: () => toast.error("Erreur lors de la mise à jour"),
      }
    );
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4 pt-1" style={{ minHeight: "calc(100vh - 220px)" }}>
        {KANBAN_STATUSES.map((status) => (
          <KanbanColumn
            key={status.id}
            id={status.id}
            label={status.label}
            color={status.color}
            prospects={grouped[status.id] || []}
          />
        ))}
        {COLLAPSED_STATUSES.map((status) => (
          <KanbanColumn
            key={status.id}
            id={status.id}
            label={status.label}
            color={status.color}
            prospects={grouped[status.id] || []}
            collapsed
          />
        ))}
      </div>
    </DragDropContext>
  );
};

export default KanbanBoard;
