import { useState, useCallback } from "react";
import { Calendar, dateFnsLocalizer, View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AgendaEventModal } from "@/components/dashboard/agenda/AgendaEventModal";
import { AgendaEventList } from "@/components/dashboard/agenda/AgendaEventList";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "@/styles/calendar.css";

const locales = {
  "pt-BR": ptBR,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface AgendaEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  description?: string;
  lead_id?: string;
  leadName?: string;
}

export default function Agenda() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [view, setView] = useState<View>("month");
  const [date, setDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<AgendaEvent | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null);

  // Fetch agenda events
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["agenda-events", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data: agendaData, error } = await supabase
        .from("lyn_agenda")
        .select(`
          *,
          leads (
            nome
          )
        `)
        .eq("user_id", user.id)
        .order("data_inicio", { ascending: true });

      if (error) throw error;

      return (agendaData || []).map((item: any) => ({
        id: item.id,
        title: item.descricao || "Sem título",
        start: new Date(item.data_inicio),
        end: new Date(item.data_fim),
        description: item.descricao,
        lead_id: item.lead_id,
        leadName: item.leads?.nome,
      }));
    },
    enabled: !!user?.id,
  });

  const handleSelectSlot = useCallback((slotInfo: { start: Date; end: Date }) => {
    setSelectedSlot(slotInfo);
    setSelectedEvent(null);
    setIsModalOpen(true);
  }, []);

  const handleSelectEvent = useCallback((event: AgendaEvent) => {
    setSelectedEvent(event);
    setSelectedSlot(null);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedEvent(null);
    setSelectedSlot(null);
  }, []);

  const handleSaveEvent = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["agenda-events"] });
    handleCloseModal();
  }, [queryClient, handleCloseModal]);

  const eventStyleGetter = useCallback(() => {
    return {
      style: {
        backgroundColor: "#2563eb",
        borderRadius: "4px",
        opacity: 0.9,
        color: "white",
        border: "0px",
        display: "block",
      },
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Agenda</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie seus compromissos e reuniões
          </p>
        </div>
        <Button onClick={() => handleSelectSlot({ start: new Date(), end: new Date() })}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Evento
        </Button>
      </div>

      <div className="bg-card border rounded-lg p-6">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 600 }}
          onSelectEvent={handleSelectEvent}
          onSelectSlot={handleSelectSlot}
          selectable
          view={view}
          onView={setView}
          date={date}
          onNavigate={setDate}
          eventPropGetter={eventStyleGetter}
          messages={{
            next: "Próximo",
            previous: "Anterior",
            today: "Hoje",
            month: "Mês",
            week: "Semana",
            day: "Dia",
            agenda: "Agenda",
            date: "Data",
            time: "Hora",
            event: "Evento",
            noEventsInRange: "Não há eventos neste período",
            showMore: (total) => `+ Ver mais (${total})`,
          }}
        />
      </div>

      <AgendaEventList events={events} onSelectEvent={handleSelectEvent} />

      <AgendaEventModal
        open={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveEvent}
        event={selectedEvent}
        initialSlot={selectedSlot}
      />
    </div>
  );
}