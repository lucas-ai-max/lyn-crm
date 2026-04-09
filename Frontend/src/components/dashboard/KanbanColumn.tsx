import { LeadCard } from "./LeadCard";
import { Lead } from "@/services/supabase";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";

interface LeadWithLastMessage extends Lead {
  lastMessageDate?: Date;
  priority?: 'high' | 'medium' | 'low';
}

interface KanbanColumnProps {
  id: string;
  title: string;
  count: number;
  leads: LeadWithLastMessage[];
  onEditLead: (id: string) => void;
  onClickLead: (id: string) => void;
  color?: string;
  isFinal?: boolean;
}

const getStatusColor = (status: string, customColor?: string) => {
  // If custom color is provided, generate styles from it
  if (customColor) {
    return {
      bg: 'bg-gray-50 dark:bg-gray-900/20',
      border: 'border-gray-200 dark:border-gray-700',
      badge: '',
      text: '',
      customBadgeStyle: { backgroundColor: customColor, color: '#fff' },
      customTextStyle: { color: customColor },
    };
  }

  const statusLower = status.toLowerCase();
  const colors: { [key: string]: { bg: string; border: string; badge: string; text: string } } = {
    'novos': {
      bg: 'bg-status-novos/5',
      border: 'border-status-novos/20',
      badge: 'bg-status-novos text-white',
      text: 'text-status-novos'
    },
    'qualificação': {
      bg: 'bg-status-qualificacao/5',
      border: 'border-status-qualificacao/20',
      badge: 'bg-status-qualificacao text-white',
      text: 'text-status-qualificacao'
    },
    'objeção': {
      bg: 'bg-status-objecao/5',
      border: 'border-status-objecao/20',
      badge: 'bg-status-objecao text-texto',
      text: 'text-status-objecao'
    },
    'negociação': {
      bg: 'bg-status-negociacao/5',
      border: 'border-status-negociacao/20',
      badge: 'bg-status-negociacao text-white',
      text: 'text-status-negociacao'
    },
    'agendamento': {
      bg: 'bg-status-agendamento/5',
      border: 'border-status-agendamento/20',
      badge: 'bg-status-agendamento text-white',
      text: 'text-status-agendamento'
    },
  };
  return colors[statusLower] || {
    bg: 'bg-lyn-primary/5',
    border: 'border-lyn-primary/20',
    badge: 'bg-lyn-primary text-white',
    text: 'text-lyn-primary'
  };
};

export function KanbanColumn({ id, title, count, leads, onEditLead, onClickLead, color, isFinal }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const colors = getStatusColor(title, color);
  const hasCustomColor = 'customBadgeStyle' in colors;

  return (
    <div className="flex-shrink-0 w-[320px]">
      <div className="mb-4">
        <div className="flex items-center gap-3">
          <h2
            className={cn("font-poppins font-semibold", !hasCustomColor && colors.text)}
            style={hasCustomColor ? colors.customTextStyle : undefined}
          >
            {title}
            {isFinal && <span className="ml-2 text-xs text-muted-foreground">(Final)</span>}
          </h2>
          <span
            className={cn("px-2.5 py-1 text-xs font-poppins font-medium rounded-md shadow-sm", !hasCustomColor && colors.badge)}
            style={hasCustomColor ? colors.customBadgeStyle : undefined}
          >
            {count}
          </span>
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "space-y-3 min-h-[200px] rounded-lg p-3 transition-all border-2 border-dashed",
          colors.bg,
          colors.border,
          isOver && "ring-2 scale-[1.02]",
          isOver && !hasCustomColor && `ring-${colors.text.replace('text-', '')}/40`
        )}
        style={isOver && hasCustomColor ? { boxShadow: `0 0 0 3px ${color}40` } : undefined}
      >
        <SortableContext items={leads.map(l => l.id)} strategy={verticalListSortingStrategy}>
          {leads.length === 0 ? (
            <p className="text-sm font-poppins text-texto-secundario dark:text-muted-foreground text-center py-8">
              Nenhum lead neste estágio ainda
            </p>
          ) : (
            leads.map((lead) => (
              <LeadCard
                key={lead.id}
                id={lead.id}
                name={lead.nome}
                email={lead.email || "No email"}
                priority={lead.priority || 'medium'}
                lastMessageDate={lead.lastMessageDate}
                onEdit={onEditLead}
                onClick={onClickLead}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
}

