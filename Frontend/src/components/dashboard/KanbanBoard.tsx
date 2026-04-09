import { KanbanColumn } from "./KanbanColumn";
import { Lead } from "@/services/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { useState } from "react";
import { LeadCard } from "./LeadCard";
import { PipelineStage } from "@/hooks/usePipelines";
import { useCompany } from "@/hooks/useCompany";

interface LeadWithLastMessage extends Lead {
  lastMessageDate?: Date;
  priority?: 'high' | 'medium' | 'low';
}

interface KanbanBoardProps {
  leads: LeadWithLastMessage[];
  stages: PipelineStage[];
  isLoading: boolean;
  onEditLead: (id: string) => void;
  onClickLead: (id: string) => void;
  onMoveCard: (leadId: string, newStageId: string) => void;
  showUnassigned?: boolean;
  pipelineId?: string | null;
}

export function KanbanBoard({
  leads,
  stages,
  isLoading,
  onEditLead,
  onClickLead,
  onMoveCard,
  showUnassigned = false,
  pipelineId
}: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  // Fallback to legacy status types if no stages (for unassigned view)
  const { statusType: legacyStatusTypes = ['Novos', 'Qualificação', 'Objeção', 'Negociação', 'Agendamento'] } = useCompany();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  if (isLoading) {
    return (
      <div className="flex gap-6 overflow-x-auto pb-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex-shrink-0 w-[320px] space-y-3">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ))}
      </div>
    );
  }

  // For unassigned view, show a simple list (no stages to move to)
  if (showUnassigned) {
    // Group by legacy status for display
    const groupedLeads = leads.reduce((acc, lead) => {
      const status = lead.status || 'Sem Status';
      if (!acc[status]) {
        acc[status] = [];
      }
      acc[status].push(lead);
      return acc;
    }, {} as Record<string, LeadWithLastMessage[]>);

    // Show all found statuses
    const displayStatuses = Object.keys(groupedLeads);

    if (displayStatuses.length === 0) {
      return (
        <div className="flex items-center justify-center h-48 text-muted-foreground">
          <p>Nenhum lead sem atribuição de funil</p>
        </div>
      );
    }

    return (
      <div className="flex gap-6 overflow-x-auto pb-4">
        {displayStatuses.map((status) => (
          <KanbanColumn
            key={status}
            id={status}
            title={status}
            count={groupedLeads[status]?.length || 0}
            leads={groupedLeads[status] || []}
            onEditLead={onEditLead}
            onClickLead={onClickLead}
            color="#6B7280"
          />
        ))}
      </div>
    );
  }

  // Normal pipeline view with stages
  if (!stages || stages.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        <p>Este funil não possui etapas configuradas</p>
      </div>
    );
  }

  // Group leads by stage_id
  const groupedLeads = leads.reduce((acc, lead) => {
    const stageId = lead.stage_id || stages[0]?.id || 'unassigned';
    if (!acc[stageId]) {
      acc[stageId] = [];
    }
    acc[stageId].push(lead);
    return acc;
  }, {} as Record<string, LeadWithLastMessage[]>);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      return;
    }

    const leadId = active.id as string;
    const newStageId = over.id as string;

    // Check if the drop target is a valid stage
    const isValidStage = stages.some(s => s.id === newStageId);
    if (isValidStage) {
      onMoveCard(leadId, newStageId);
    }

    setActiveId(null);
  };

  const activeLead = activeId ? leads.find(l => l.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-6 overflow-x-auto pb-4">
        {stages.map((stage) => (
          <KanbanColumn
            key={stage.id}
            id={stage.id}
            title={stage.name}
            count={groupedLeads[stage.id]?.length || 0}
            leads={groupedLeads[stage.id] || []}
            onEditLead={onEditLead}
            onClickLead={onClickLead}
            color={stage.color || undefined}
            isFinal={stage.is_final || false}
          />
        ))}
      </div>

      <DragOverlay>
        {activeLead ? (
          <div className="rotate-3">
            <LeadCard
              id={activeLead.id}
              name={activeLead.nome}
              email={activeLead.email || "No email"}
              priority={activeLead.priority || 'medium'}
              lastMessageDate={activeLead.lastMessageDate}
              onEdit={() => { }}
              onClick={() => { }}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
