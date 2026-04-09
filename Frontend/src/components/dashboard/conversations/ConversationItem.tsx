import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ConversationItemProps {
  conversation: any;
  isSelected: boolean;
  onSelect: () => void;
}

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

// Mapeamento dos status disponíveis no filtro
const statusLabels: Record<string, string> = {
  'novo': 'Novo',
  'em_andamento': 'Em andamento',
  'nao_respondida': 'Não respondida',
  'finalizados': 'Finalizados',
  'finalizado': 'Finalizados',
  'concluido': 'Finalizados',
  'ganho': 'Finalizados',
  'perdido': 'Finalizados',
  'qualificado': 'Em andamento',
  'followup': 'Em andamento'
};

// Cores para cada status
const statusColors: Record<string, string> = {
  'novo': 'bg-emerald-500',
  'em_andamento': 'bg-blue-500',
  'nao_respondida': 'bg-rose-500',
  'finalizados': 'bg-slate-400',
  'finalizado': 'bg-slate-400',
  'concluido': 'bg-green-500',
  'ganho': 'bg-green-500',
  'perdido': 'bg-rose-500',
  'qualificado': 'bg-blue-400',
  'followup': 'bg-blue-400'
};

export function ConversationItem({ conversation, isSelected, onSelect }: ConversationItemProps) {
  // Obtém o status da conversa ou usa 'novo' como padrão
  const status = conversation.status || 'novo';
  // Obtém o label formatado ou usa o próprio status
  const statusLabel = statusLabels[status] || status;
  const hasUnread = conversation.unreadCount > 0;

  return (
    <div
      onClick={onSelect}
      className={cn(
        "p-4 border-b border-border cursor-pointer transition-colors",
        isSelected ? "bg-primary/10" : "hover:bg-muted/50",
        hasUnread && "bg-primary/5"
      )}
    >
      <div className="flex gap-3">
        <Avatar className="h-10 w-10 flex-shrink-0">
          <AvatarFallback className="bg-primary/10 text-primary">
            {getInitials(conversation.lead.nome)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className={cn("font-semibold text-sm truncate", hasUnread && "font-bold")}>
              {conversation.lead.nome}
            </h4>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {conversation.lastMessage?.timestamp
                ? formatDistanceToNow(new Date(conversation.lastMessage.timestamp), {
                    addSuffix: true,
                    locale: ptBR,
                  })
                : ""}
            </span>
          </div>

          <p className={cn("text-sm text-muted-foreground truncate mb-2", hasUnread && "font-medium text-foreground")}>
            {conversation.lastMessage?.body || "Sem mensagens"}
          </p>

          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className={cn(
                "text-xs px-2 py-0.5 whitespace-nowrap",
                statusColors[status] || statusColors[statusLabel] || 'bg-gray-500',
                "text-white"
              )}
            >
              {statusLabel}
            </Badge>
            {hasUnread && (
              <Badge variant="default" className="text-xs px-2 py-0.5 bg-primary">
                {conversation.unreadCount}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
