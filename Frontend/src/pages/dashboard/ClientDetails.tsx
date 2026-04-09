import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { LeadDetailsPanel } from "@/components/dashboard/LeadDetailsPanel";
import { LeadMessagesPanel } from "@/components/dashboard/LeadMessagesPanel";
import { LeadModal } from "@/components/dashboard/LeadModal";
import { AgendaEventModal } from "@/components/dashboard/agenda/AgendaEventModal";
import { X, Pencil, Calendar, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useMemo, useState } from "react";
import { integrationInstancesService } from "@/services/supabase";
import type { Database } from "@/integrations/supabase/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ConversationRowWithIntegration = Database["public"]["Tables"]["lyn_conversas"]["Row"] & {
  integration_instances?: { name?: string | null } | null;
};

export default function ClientDetails() {
  const { leadId } = useParams();
  const navigate = useNavigate();
  const { user, companyId, profile } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [leadPanelTab, setLeadPanelTab] = useState<"details" | "patients">("details");

  const {
    data: integrationInstances = [],
    isLoading: loadingInstances,
  } = useQuery({
    queryKey: ["integration_instances", companyId],
    queryFn: () => integrationInstancesService.listByCompany(companyId ?? null),
    enabled: !!companyId,
  });

  const normalizedUserFirstName = useMemo(() => {
    const profileName = (profile?.first_name || "").trim().toLowerCase();
    const metadataName =
      typeof user?.user_metadata?.first_name === "string"
        ? user.user_metadata.first_name.trim().toLowerCase()
        : "";
    return profileName || metadataName;
  }, [profile?.first_name, user?.user_metadata]);

  const getInstanceOwnerId = (
    instance: Database["public"]["Tables"]["lyn_integration_instances"]["Row"]
  ) => {
    const config = instance.config as Record<string, unknown> | null;
    if (!config) return null;
    if (typeof config.created_by === "string") return config.created_by;
    if (typeof config.createdBy === "string") return config.createdBy;
    if (typeof config.owner_id === "string") return config.owner_id;
    if (typeof config.ownerId === "string") return config.ownerId;
    return null;
  };

  const getInstanceLabel = (
    instance: Database["public"]["Tables"]["lyn_integration_instances"]["Row"]
  ) => {
    return (
      instance.name ||
      instance.external_instance_id ||
      `Instancia ${instance.id.slice(0, 6)}`
    );
  };

  const preferredIntegrationInstance = useMemo(() => {
    if (integrationInstances.length === 0) return null;

    const byOwner = user?.id
      ? integrationInstances.find(
          (instance) => getInstanceOwnerId(instance) === user.id
        )
      : null;
    if (byOwner) return byOwner;

    if (normalizedUserFirstName) {
      const byName = integrationInstances.find((instance) =>
        (instance.name || "").toLowerCase().includes(normalizedUserFirstName)
      );
      if (byName) return byName;
    }

    return (
      integrationInstances.find((instance) => instance.status === "active") ??
      integrationInstances[0] ??
      null
    );
  }, [integrationInstances, normalizedUserFirstName, user?.id]);

  const [selectedIntegrationInstanceId, setSelectedIntegrationInstanceId] =
    useState<string | null>(null);

  useEffect(() => {
    if (
      selectedIntegrationInstanceId &&
      integrationInstances.some((instance) => instance.id === selectedIntegrationInstanceId)
    ) {
      return;
    }
    setSelectedIntegrationInstanceId(preferredIntegrationInstance?.id ?? null);
  }, [integrationInstances, preferredIntegrationInstance?.id, selectedIntegrationInstanceId]);

  const selectedIntegrationInstance = useMemo(() => {
    return (
      integrationInstances.find(
        (instance) => instance.id === selectedIntegrationInstanceId
      ) ??
      preferredIntegrationInstance ??
      null
    );
  }, [integrationInstances, preferredIntegrationInstance, selectedIntegrationInstanceId]);

  const showInstanceSelector = integrationInstances.length > 1;

  // Fetch lead data
  const { data: lead, isLoading: loadingLead } = useQuery({
    queryKey: ["lead", leadId],
    queryFn: async () => {
      // Validate UUID to prevent 400 errors if route is incorrect
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!leadId || !uuidRegex.test(leadId)) {
        return null;
      }

      const { data, error } = await supabase
        .from("lyn_leads")
        .select("*")
        .eq("id", leadId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!leadId,
  });

  const { data: conversation, isLoading: loadingConversation } = useQuery<ConversationRowWithIntegration | null>({
    queryKey: ["conversation", leadId, selectedIntegrationInstance?.id ?? "no-instance"],
    queryFn: async () => {
      const { data: existingConv } = await supabase
        .from("lyn_conversas")
        .select("*, integration_instances:lyn_integration_instances(name)")
        .eq("lead_id", leadId)
        .maybeSingle<ConversationRowWithIntegration>();

      if (existingConv) {
        if (
          selectedIntegrationInstance?.id &&
          existingConv.integration_instance_id !== selectedIntegrationInstance.id
        ) {
          const { data: updatedConv, error } = await supabase
            .from("lyn_conversas")
            .update({ integration_instance_id: selectedIntegrationInstance.id })
            .eq("id", existingConv.id)
            .select("*, integration_instances:lyn_integration_instances(name)")
            .single<ConversationRowWithIntegration>();

          if (error) throw error;
          return updatedConv;
        }

        return existingConv;
      }

      if (!selectedIntegrationInstance) return null;

      const { data: newConv, error } = await supabase
        .from("lyn_conversas")
        .insert({
          lead_id: leadId,
          integration_instance_id: selectedIntegrationInstance.id,
        })
        .select("*, integration_instances:lyn_integration_instances(name)")
        .single<ConversationRowWithIntegration>();

      if (error) throw error;
      return newConv;
    },
    enabled: !!leadId && (!companyId || !loadingInstances),
  });

  const { data: responsible } = useQuery({
    queryKey: ["profile", lead?.responsavel_id],
    queryFn: async () => {
      if (!lead?.responsavel_id) return null;

      const { data, error } = await supabase
        .from("lyn_profiles")
        .select("*")
        .eq("id", lead.responsavel_id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!lead?.responsavel_id,
  });

  const handleClose = () => {
    navigate(-1);
  };

  const handleEditClick = () => {
    setIsEditModalOpen(true);
  };

  const handleEditClose = () => {
    setIsEditModalOpen(false);
  };

  const handleEditSave = () => {
    queryClient.invalidateQueries({ queryKey: ["lead", leadId] });
    queryClient.invalidateQueries({ queryKey: ["lead_notes", leadId] });
    setIsEditModalOpen(false);
  };

  const handleScheduleClick = () => {
    setIsScheduleModalOpen(true);
  };

  const handleScheduleClose = () => {
    setIsScheduleModalOpen(false);
  };

  const handleScheduleSave = () => {
    queryClient.invalidateQueries({ queryKey: ["agenda-events"] });
    setIsScheduleModalOpen(false);
    toast({
      title: "Agendamento criado",
      description: "O compromisso foi adicionado à sua agenda",
    });
  };

  if (loadingLead || loadingConversation || loadingInstances) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-destructive mb-2">Lead not found</p>
          <Button onClick={handleClose}>Go back</Button>
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-3">
          <p className="text-destructive font-semibold">Nenhuma instância de integração encontrada</p>
          <p className="text-muted-foreground max-w-sm mx-auto">
            Para iniciar um atendimento, associe uma instância de integração (ex.: WhatsApp) nas configurações da empresa.
          </p>
          <Button onClick={handleClose}>Voltar</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-background border rounded-lg shadow-lg w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-[#2563eb] flex items-center justify-center text-white font-semibold text-lg">
              {lead.nome.charAt(0).toUpperCase()}
            </div>
            <h2 className="text-xl font-semibold">{lead.nome}</h2>
          </div>
          <div className="flex items-center gap-2">
            {showInstanceSelector && (
              <div className="flex items-center gap-2 pr-2">
                <span className="text-sm text-muted-foreground">Instancia</span>
                <Select
                  value={selectedIntegrationInstance?.id ?? undefined}
                  onValueChange={setSelectedIntegrationInstanceId}
                >
                  <SelectTrigger className="h-8 w-[220px]">
                    <SelectValue placeholder="Selecionar instancia" />
                  </SelectTrigger>
                  <SelectContent>
                    {integrationInstances.map((instance) => (
                      <SelectItem key={instance.id} value={instance.id}>
                        {getInstanceLabel(instance)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button variant="ghost" size="sm" className="gap-2" onClick={handleEditClick}>
              <Pencil className="h-4 w-4" />
              Editar
            </Button>
            <Button variant="ghost" size="sm" className="gap-2" onClick={handleScheduleClick}>
              <Calendar className="h-4 w-4" />
              Agendar
            </Button>
            <Button
              variant={leadPanelTab === "patients" ? "default" : "outline"}
              size="sm"
              className="gap-2"
              onClick={() => setLeadPanelTab("patients")}
            >
              <Users className="h-4 w-4" />
              Pacientes / PDFs
            </Button>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          <LeadDetailsPanel
            lead={lead}
            responsible={responsible}
            onUpdate={() => queryClient.invalidateQueries({ queryKey: ["lead", leadId] })}
            activeTab={leadPanelTab}
            onActiveTabChange={setLeadPanelTab}
          />
          <LeadMessagesPanel
            conversationId={conversation.id}
            userId={user?.id || ""}
            leadId={leadId}
          />
        </div>
      </div>

      {/* Edit Modal */}
      <LeadModal
        open={isEditModalOpen}
        onClose={handleEditClose}
        onSave={handleEditSave}
        mode="edit"
        initialData={{
          id: lead.id,
          nome: lead.nome,
          email: lead.email || "",
          telefone: lead.telefone || "",
          empresa: lead.empresa || "",
          segmento: lead.segmento || "",
          prioridade: (lead.prioridade as 'high' | 'medium' | 'low') || "medium",
          notas: Array.isArray(lead.notas) ? lead.notas.join("\n") : (lead.notas || ""),
          description: lead.description || "",
          tags: lead.tags || [],
          funil: lead.funil || "",
          status: lead.status || "",
          responsavel_id: lead.responsavel_id || "",
          valor_oportunidade: lead.valor_oportunidade ?? null,
        }}
      />

      {/* Schedule Modal */}
      <AgendaEventModal
        open={isScheduleModalOpen}
        onClose={handleScheduleClose}
        onSave={handleScheduleSave}
        event={undefined}
        initialSlot={{ start: new Date(), end: new Date(Date.now() + 60 * 60 * 1000) }}
        preselectedLeadId={leadId}
      />
    </div>
  );
}
