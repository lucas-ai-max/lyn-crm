import { Clock, GripVertical, Pencil } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

interface LeadCardProps {
  id: string;
  name: string;
  email: string;
  priority: 'high' | 'medium' | 'low';
  lastMessageDate?: Date;
  onEdit: (id: string) => void;
  onClick: (id: string) => void;
}

const priorityConfig = {
  high: { label: "Alta", className: "bg-status-negociacao/10 text-status-negociacao hover:bg-status-negociacao/20 font-poppins text-xs font-medium" },
  medium: { label: "Média", className: "bg-status-objecao/10 text-status-objecao hover:bg-status-objecao/20 font-poppins text-xs font-medium" },
  low: { label: "Baixa", className: "bg-status-agendamento/10 text-status-agendamento hover:bg-status-agendamento/20 font-poppins text-xs font-medium" }
};

export function LeadCard({ id, name, email, priority = 'medium', lastMessageDate, onEdit, onClick }: LeadCardProps) {
  const priorityStyle = priorityConfig[priority] || priorityConfig.medium;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "p-4 shadow-lyn hover:shadow-lg transition-all cursor-pointer border border-borda dark:border-dark-border rounded-lg bg-white dark:bg-dark-card",
        isDragging && "opacity-50 shadow-xl scale-105 rotate-2"
      )}
      onClick={() => onClick(id)}
    >
      <div className="space-y-3">
        <div className="flex items-start gap-2">
          <button
            className="cursor-grab active:cursor-grabbing mt-1 text-lyn-primary/40 hover:text-lyn-primary transition-colors"
            onClick={(e) => e.stopPropagation()}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h3 className="font-poppins font-semibold text-texto dark:text-foreground truncate">{name}</h3>
            <p className="text-sm font-poppins text-texto-secundario dark:text-muted-foreground truncate">{email}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(id);
            }}
            title="Editar lead"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>

        <Badge variant="secondary" className={priorityStyle.className}>
          {priorityStyle.label}
        </Badge>

        <div className="flex items-center gap-1.5 text-xs font-poppins text-texto-secundario dark:text-muted-foreground pt-2 border-t border-borda dark:border-dark-border">
          <Clock className="h-3.5 w-3.5" />
          <span>
            {lastMessageDate
              ? formatDistanceToNow(lastMessageDate, { addSuffix: true, locale: ptBR })
              : "Sem mensagens"}
          </span>
        </div>
      </div>
    </Card>
  );
}
