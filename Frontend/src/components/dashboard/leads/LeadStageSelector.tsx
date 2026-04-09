import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCompany } from "@/hooks/useCompany";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface LeadStageSelectorProps {
  leadId: string;
  currentStatus?: string | null;
  onStatusChange?: (newStatus: string) => void;
}

export function LeadStageSelector({
  leadId,
  currentStatus,
  onStatusChange,
}: LeadStageSelectorProps) {
  const { statusType: statusTypes = [], isLoading: isLoadingCompany } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [optimisticStatus, setOptimisticStatus] = useState<string | undefined>(currentStatus ?? undefined);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    setOptimisticStatus(currentStatus ?? undefined);
  }, [currentStatus]);

  const availableStatuses = useMemo(() => {
    const uniqueStatuses = new Set(statusTypes);
    if (currentStatus && !uniqueStatuses.has(currentStatus)) {
      uniqueStatuses.add(currentStatus);
    }
    return Array.from(uniqueStatuses);
  }, [currentStatus, statusTypes]);

  const canSelectStatus = availableStatuses.length > 0 && !isLoadingCompany;

  const handleStatusChange = async (newStatus: string) => {
    setOptimisticStatus(newStatus);

    const previousStatus = optimisticStatus;

    if (newStatus === previousStatus) return;

    if (statusTypes.length > 0 && !statusTypes.includes(newStatus)) {
      setOptimisticStatus(previousStatus);
      toast({
        title: "Etapa invÃ¡lida",
        description: "A etapa selecionada nÃ£o existe na configuraÃ§Ã£o da empresa.",
        variant: "destructive",
      });
      return;
    }

    setIsUpdating(true);

    try {
      const { error } = await supabase
        .from("lyn_leads")
        .update({ status: newStatus })
        .eq("id", leadId);

      if (error) {
        throw error;
      }
    } catch (error: any) {
      setOptimisticStatus(previousStatus);
      toast({
        title: "Erro",
        description: error?.message || "Falha ao atualizar etapa do funil.",
        variant: "destructive",
      });
      setIsUpdating(false);
      return;
    }

    setIsUpdating(false);

    toast({
      title: "Status atualizado",
      description: "Etapa do funil alterada com sucesso.",
    });

    await queryClient.invalidateQueries({
      queryKey: ["leads"],
      exact: false,
    });
    await queryClient.invalidateQueries({
      queryKey: ["lead-counts"],
      exact: false,
    });

    onStatusChange?.(newStatus);
  };

  return (
    <div onClick={(event) => event.stopPropagation()}>
      <Select
        value={optimisticStatus}
        onValueChange={handleStatusChange}
        disabled={!canSelectStatus || isUpdating}
      >
        <SelectTrigger className="h-8 w-full">
          <SelectValue placeholder="Sem etapa" />
        </SelectTrigger>
        <SelectContent>
          {availableStatuses.map((status) => (
            <SelectItem key={status} value={status}>
              {status}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
