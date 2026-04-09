import { useState, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAllLeads } from "@/hooks/useLeads";
import { KanbanBoard } from "./KanbanBoard";
import { LeadModal } from "./LeadModal";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useActivePipelines, useDefaultPipeline, usePipelineStages, useMoveLeadToStage } from "@/hooks/usePipelines";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Users, Filter } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const UNASSIGNED_FILTER = "__unassigned__";

interface KanbanWrapperProps {
  searchQuery?: string;
  segmentFilter?: string;
  sourceFilter?: string;
}

export function KanbanWrapper({
  searchQuery = "",
  segmentFilter = "All",
  sourceFilter = "All"
}: KanbanWrapperProps) {
  const navigate = useNavigate();
  const { data: leads = [], isLoading: isLoadingLeads } = useAllLeads();
  const { data: pipelines = [], isLoading: isLoadingPipelines } = useActivePipelines();
  const { data: defaultPipeline } = useDefaultPipeline();
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);
  const [showUnassignedFilter, setShowUnassignedFilter] = useState<string>("pipeline");
  const { data: stages = [] } = usePipelineStages(
    showUnassignedFilter === "unassigned" ? null : selectedPipelineId
  );
  const moveLeadToStage = useMoveLeadToStage();
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Set default pipeline when loaded
  useEffect(() => {
    if (!selectedPipelineId && defaultPipeline) {
      setSelectedPipelineId(defaultPipeline.id);
    } else if (!selectedPipelineId && pipelines.length > 0) {
      setSelectedPipelineId(pipelines[0].id);
    }
  }, [defaultPipeline, pipelines, selectedPipelineId]);

  // Filter leads based on selection
  const filteredLeads = leads.filter((lead) => {
    // 1. Pipeline Filter
    let matchesPipeline = false;
    if (showUnassignedFilter === "unassigned") {
      matchesPipeline = !lead.pipeline_id;
    } else {
      matchesPipeline = lead.pipeline_id === selectedPipelineId;
    }

    if (!matchesPipeline) return false;

    // 2. Search Query
    if (searchQuery.trim()) {
      const search = searchQuery.toLowerCase().trim();
      const matchesSearch =
        (lead.nome?.toLowerCase() || "").includes(search) ||
        (lead.email?.toLowerCase() || "").includes(search) ||
        (lead.telefone?.toLowerCase() || "").includes(search) ||
        (lead.empresa?.toLowerCase() || "").includes(search);

      if (!matchesSearch) return false;
    }

    // 3. Segment Filter
    if (segmentFilter !== "All" && lead.segmento !== segmentFilter) {
      return false;
    }

    // 4. Source Filter
    // Note: 'source' field added to useAllLeads
    if (sourceFilter !== "All" && (lead as any).source !== sourceFilter) {
      return false;
    }

    return true;
  });

  // Count unassigned leads
  const unassignedCount = leads.filter((lead) => !lead.pipeline_id).length;

  // Find the lead being edited
  const editingLead = useMemo(() => {
    if (!editingLeadId) return undefined;
    return leads.find((l) => l.id === editingLeadId);
  }, [editingLeadId, leads]);

  const handleMoveCard = async (leadId: string, newStageId: string) => {
    try {
      await moveLeadToStage.mutateAsync({ leadId, stageId: newStageId });
      toast({
        title: "Sucesso",
        description: "Lead movido para nova etapa",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Falha ao mover lead",
        variant: "destructive",
      });
    }
  };

  const handleClickLead = (leadId: string) => {
    navigate(`/dashboard/whatsapp/chat?leadId=${leadId}`);
  };

  const handleCloseModal = () => {
    setEditingLeadId(null);
    queryClient.invalidateQueries({ queryKey: ["all-leads"] });
  };

  const isLoading = isLoadingLeads || isLoadingPipelines;

  return (
    <div className="flex flex-col gap-4">
      {/* Pipeline Selector Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Tabs
            value={showUnassignedFilter}
            onValueChange={setShowUnassignedFilter}
            className="w-auto"
          >
            <TabsList>
              <TabsTrigger value="pipeline" className="gap-2">
                <Filter className="h-4 w-4" />
                Funil
              </TabsTrigger>
              <TabsTrigger value="unassigned" className="gap-2">
                <Users className="h-4 w-4" />
                Sem Atribuição
                {unassignedCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {unassignedCount}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {showUnassignedFilter === "pipeline" && (
            <Select
              value={selectedPipelineId || ""}
              onValueChange={setSelectedPipelineId}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Selecione um funil" />
              </SelectTrigger>
              <SelectContent>
                {pipelines.map((pipeline) => (
                  <SelectItem key={pipeline.id} value={pipeline.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: pipeline.color || "#3B82F6" }}
                      />
                      {pipeline.name}
                      {pipeline.is_default && (
                        <Badge variant="outline" className="text-xs ml-1">
                          Padrão
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="text-sm text-muted-foreground">
          {filteredLeads.length} lead{filteredLeads.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Kanban Board */}
      <KanbanBoard
        leads={filteredLeads}
        stages={stages}
        isLoading={isLoading}
        onEditLead={setEditingLeadId}
        onClickLead={handleClickLead}
        onMoveCard={handleMoveCard}
        showUnassigned={showUnassignedFilter === "unassigned"}
        pipelineId={selectedPipelineId}
      />

      {/* Edit Lead Modal */}
      <LeadModal
        open={!!editingLeadId}
        onClose={handleCloseModal}
        onSave={handleCloseModal}
        mode="edit"
        initialData={editingLead ? {
          id: editingLead.id,
          nome: editingLead.nome,
          email: editingLead.email || undefined,
          telefone: editingLead.telefone || undefined,
          empresa: editingLead.empresa || undefined,
          segmento: editingLead.segmento || undefined,
          prioridade: (editingLead.prioridade as 'high' | 'medium' | 'low') || 'medium',
          status: editingLead.status,
          pipeline_id: editingLead.pipeline_id,
          stage_id: editingLead.stage_id,
        } : undefined}
      />
    </div>
  );
}
