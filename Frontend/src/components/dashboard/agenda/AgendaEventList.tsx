import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, User, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AgendaEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  description?: string;
  lead_id?: string;
  leadName?: string;
}

interface AgendaEventListProps {
  events: AgendaEvent[];
  onSelectEvent: (event: AgendaEvent) => void;
}

export function AgendaEventList({ events, onSelectEvent }: AgendaEventListProps) {
  const upcomingEvents = events
    .filter((event) => event.start >= new Date())
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .slice(0, 5);

  if (upcomingEvents.length === 0) {
    return null;
  }

  const formatEventTime = (start: Date, end: Date) => {
    const startTime = format(start, "HH:mm", { locale: ptBR });
    const endTime = format(end, "HH:mm", { locale: ptBR });
    
    // Se for no mesmo dia, mostrar apenas as horas
    if (format(start, "yyyy-MM-dd") === format(end, "yyyy-MM-dd")) {
      return `${startTime} - ${endTime}`;
    }
    
    // Se for em dias diferentes, mostrar data e hora
    return `${format(start, "dd/MM HH:mm", { locale: ptBR })} - ${format(end, "dd/MM HH:mm", { locale: ptBR })}`;
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Próximos Compromissos</h2>
        <p className="text-sm text-muted-foreground">
          Seus próximos eventos agendados
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {upcomingEvents.map((event) => (
          <Card
            key={event.id}
            className="p-4 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => onSelectEvent(event)}
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold line-clamp-2">{event.title}</h3>
                <Badge variant="secondary" className="shrink-0">
                  <Calendar className="h-3 w-3 mr-1" />
                  {format(event.start, "dd/MM", { locale: ptBR })}
                </Badge>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{formatEventTime(event.start, event.end)}</span>
              </div>

              {event.leadName && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-3 w-3" />
                  <span className="truncate">{event.leadName}</span>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}