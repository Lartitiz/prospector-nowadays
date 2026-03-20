import { useNavigate } from "react-router-dom";
import { Draggable } from "@hello-pangea/dnd";
import type { Prospect } from "@/hooks/useProspects";
import { INTENTION_BADGES, STRUCTURE_TYPE_COLORS } from "@/lib/kanban-constants";

interface Props {
  prospect: Prospect;
  index: number;
}

const ProspectCard = ({ prospect, index }: Props) => {
  const navigate = useNavigate();
  const recherche = prospect.recherche_ia as Record<string, any> | null;
  const intention = recherche?.intention as string | undefined;
  const priorite = recherche?.priorite as string | undefined;
  const tags = (recherche?.tags as string[] | undefined) || [];
  const typeStructure = recherche?.type_structure as string | undefined;
  const prochaineAction = recherche?.prochaine_action as string | undefined;

  const isHighPriority = priorite === "haute";

  return (
    <Draggable draggableId={prospect.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => navigate(`/prospects/${prospect.id}`)}
          className={`
            bg-card rounded-2xl p-3.5 shadow-sm cursor-pointer
            transition-shadow duration-200
            ${snapshot.isDragging ? "shadow-lg ring-2 ring-primary/20" : "hover:shadow-md"}
          `}
          style={{
            ...provided.draggableProps.style,
            borderLeft: isHighPriority ? "3px solid #FFE561" : "3px solid transparent",
          }}
        >
          {/* Enterprise + type badge */}
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <p className="text-sm font-semibold text-foreground leading-tight truncate">
              {prospect.entreprise || "Sans nom"}
            </p>
            {typeStructure && (
              <span
                className="text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0"
                style={{
                  backgroundColor: STRUCTURE_TYPE_COLORS[typeStructure] || "hsl(0,0%,80%)",
                  color: "white",
                }}
              >
                {typeStructure}
              </span>
            )}
          </div>

          {/* Contact name + role */}
          {(prospect.nom || prospect.poste) && (
            <p className="text-xs text-muted-foreground truncate mb-1.5">
              {prospect.nom}
              {prospect.poste && (
                <span className="opacity-70"> · {prospect.poste}</span>
              )}
            </p>
          )}

          {/* Intention badge */}
          {intention && INTENTION_BADGES[intention] && (
            <span className="text-xs mr-1">{INTENTION_BADGES[intention]}</span>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Date */}
          {prochaineAction && (
            <p className="text-[10px] text-muted-foreground mt-2">
              ⏭ {prochaineAction}
            </p>
          )}
          {!prochaineAction && (
            <p className="text-[10px] text-muted-foreground mt-2">
              Màj {new Date(prospect.updated_at).toLocaleDateString("fr-FR")}
            </p>
          )}
        </div>
      )}
    </Draggable>
  );
};

export default ProspectCard;
