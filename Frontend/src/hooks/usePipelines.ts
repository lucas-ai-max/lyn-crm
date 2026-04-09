import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// Types for pipelines
export interface Pipeline {
    id: string;
    company_id: string;
    name: string;
    description: string | null;
    color: string | null;
    is_default: boolean | null;
    is_active: boolean | null;
    position: number | null;
    created_by: string | null;
    created_at: string | null;
    updated_at: string | null;
}

export interface PipelineStage {
    id: string;
    pipeline_id: string;
    company_id: string;
    name: string;
    color: string | null;
    position: number;
    is_active: boolean | null;
    is_final: boolean | null;
    created_at: string | null;
    updated_at: string | null;
}

export interface PipelineWithStages extends Pipeline {
    stages: PipelineStage[];
}

// Hook to fetch ALL pipelines (including hidden) - for settings
export function usePipelines() {
    const { companyId } = useAuth();

    return useQuery({
        queryKey: ["pipelines", companyId],
        queryFn: async () => {
            if (!companyId) return [];

            const { data, error } = await supabase
                .from("lyn_pipelines")
                .select("*")
                .eq("company_id", companyId)
                .order("position", { ascending: true });

            if (error) throw error;
            return data as Pipeline[];
        },
        enabled: !!companyId,
    });
}

// Hook to fetch only ACTIVE pipelines - for leads/kanban
export function useActivePipelines() {
    const { companyId } = useAuth();

    return useQuery({
        queryKey: ["pipelines-active", companyId],
        queryFn: async () => {
            if (!companyId) return [];

            const { data, error } = await supabase
                .from("lyn_pipelines")
                .select("*")
                .eq("company_id", companyId)
                .eq("is_active", true)
                .order("position", { ascending: true });

            if (error) throw error;
            return data as Pipeline[];
        },
        enabled: !!companyId,
    });
}

// Hook to fetch a single pipeline with its stages
export function usePipelineWithStages(pipelineId: string | null) {
    const { companyId } = useAuth();

    return useQuery({
        queryKey: ["pipeline", pipelineId],
        queryFn: async () => {
            if (!pipelineId || !companyId) return null;

            const { data: pipeline, error: pipelineError } = await supabase
                .from("lyn_pipelines")
                .select("*")
                .eq("id", pipelineId)
                .single();

            if (pipelineError) throw pipelineError;

            const { data: stages, error: stagesError } = await supabase
                .from("lyn_pipeline_stages")
                .select("*")
                .eq("pipeline_id", pipelineId)
                .eq("is_active", true)
                .order("position", { ascending: true });

            if (stagesError) throw stagesError;

            return {
                ...pipeline,
                stages: stages || [],
            } as PipelineWithStages;
        },
        enabled: !!pipelineId && !!companyId,
    });
}

// Hook to fetch stages for a pipeline
export function usePipelineStages(pipelineId: string | null) {
    return useQuery({
        queryKey: ["pipeline_stages", pipelineId],
        queryFn: async () => {
            if (!pipelineId) return [];

            const { data, error } = await supabase
                .from("lyn_pipeline_stages")
                .select("*")
                .eq("pipeline_id", pipelineId)
                .eq("is_active", true)
                .order("position", { ascending: true });

            if (error) throw error;
            return data as PipelineStage[];
        },
        enabled: !!pipelineId,
    });
}

// Hook to get the default pipeline
export function useDefaultPipeline() {
    const { companyId } = useAuth();

    return useQuery({
        queryKey: ["default_pipeline", companyId],
        queryFn: async () => {
            if (!companyId) return null;

            const { data, error } = await supabase
                .from("lyn_pipelines")
                .select("*")
                .eq("company_id", companyId)
                .eq("is_default", true)
                .single();

            if (error && error.code !== "PGRST116") throw error;
            return data as Pipeline | null;
        },
        enabled: !!companyId,
    });
}

// Mutations

export function useCreatePipeline() {
    const queryClient = useQueryClient();
    const { companyId, user } = useAuth();

    return useMutation({
        mutationFn: async ({
            name,
            description,
            color,
            defaultStages,
        }: {
            name: string;
            description?: string;
            color?: string;
            defaultStages?: string[];
        }) => {
            if (!companyId) throw new Error("Company ID required");

            // Get current max position
            const { data: existing } = await supabase
                .from("lyn_pipelines")
                .select("position")
                .eq("company_id", companyId)
                .order("position", { ascending: false })
                .limit(1);

            const nextPosition = (existing?.[0]?.position ?? -1) + 1;

            // Create pipeline
            const { data: pipeline, error: pipelineError } = await supabase
                .from("lyn_pipelines")
                .insert({
                    company_id: companyId,
                    name,
                    description: description || null,
                    color: color || "#3B82F6",
                    position: nextPosition,
                    created_by: user?.id,
                })
                .select()
                .single();

            if (pipelineError) throw pipelineError;

            // Create default stages if provided
            const stages = defaultStages || ["Novos", "Qualificação", "Negociação", "Fechado"];
            const stagesData = stages.map((stageName, index) => ({
                pipeline_id: pipeline.id,
                company_id: companyId,
                name: stageName,
                position: index,
                is_final: index === stages.length - 1,
            }));

            const { error: stagesError } = await supabase
                .from("lyn_pipeline_stages")
                .insert(stagesData);

            if (stagesError) throw stagesError;

            return pipeline as Pipeline;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["pipelines"] });
            toast.success("Funil criado com sucesso!");
        },
        onError: (error: any) => {
            toast.error(error.message || "Erro ao criar funil");
        },
    });
}

export function useUpdatePipeline() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            id,
            name,
            description,
            color,
        }: {
            id: string;
            name?: string;
            description?: string;
            color?: string;
        }) => {
            const { data, error } = await supabase
                .from("lyn_pipelines")
                .update({
                    name,
                    description,
                    color,
                })
                .eq("id", id)
                .select()
                .single();

            if (error) throw error;
            return data as Pipeline;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["pipelines"] });
            queryClient.invalidateQueries({ queryKey: ["pipeline", variables.id] });
            toast.success("Funil atualizado!");
        },
        onError: (error: any) => {
            toast.error(error.message || "Erro ao atualizar funil");
        },
    });
}

export function useDeletePipeline() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            // Unlink leads from this pipeline first (set to null)
            await supabase
                .from("lyn_leads")
                .update({ pipeline_id: null, stage_id: null })
                .eq("pipeline_id", id);

            // Delete pipeline (stages cascade automatically)
            const { error } = await supabase
                .from("lyn_pipelines")
                .delete()
                .eq("id", id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["pipelines"] });
            queryClient.invalidateQueries({ queryKey: ["leads"] });
            toast.success("Funil excluído!");
        },
        onError: (error: any) => {
            toast.error(error.message || "Erro ao excluir funil");
        },
    });
}

export function useTogglePipelineVisibility() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
            const { error } = await supabase
                .from("lyn_pipelines")
                .update({ is_active })
                .eq("id", id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["pipelines"] });
            queryClient.invalidateQueries({ queryKey: ["pipelines-active"] });
            toast.success("Visibilidade atualizada!");
        },
        onError: (error: any) => {
            toast.error(error.message || "Erro ao atualizar visibilidade");
        },
    });
}

// Stage mutations

export function useCreateStage() {
    const queryClient = useQueryClient();
    const { companyId } = useAuth();

    return useMutation({
        mutationFn: async ({
            pipelineId,
            name,
            color,
        }: {
            pipelineId: string;
            name: string;
            color?: string;
        }) => {
            if (!companyId) throw new Error("Company ID required");

            // Get max position
            const { data: existing } = await supabase
                .from("lyn_pipeline_stages")
                .select("position")
                .eq("pipeline_id", pipelineId)
                .order("position", { ascending: false })
                .limit(1);

            const nextPosition = (existing?.[0]?.position ?? -1) + 1;

            const { data, error } = await supabase
                .from("lyn_pipeline_stages")
                .insert({
                    pipeline_id: pipelineId,
                    company_id: companyId,
                    name,
                    color: color || "#6B7280",
                    position: nextPosition,
                })
                .select()
                .single();

            if (error) throw error;
            return data as PipelineStage;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["pipeline_stages", variables.pipelineId] });
            queryClient.invalidateQueries({ queryKey: ["pipeline", variables.pipelineId] });
            toast.success("Etapa criada!");
        },
        onError: (error: any) => {
            toast.error(error.message || "Erro ao criar etapa");
        },
    });
}

export function useUpdateStage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            id,
            pipelineId,
            name,
            color,
            is_final,
        }: {
            id: string;
            pipelineId: string;
            name?: string;
            color?: string;
            is_final?: boolean;
        }) => {
            const { data, error } = await supabase
                .from("lyn_pipeline_stages")
                .update({ name, color, is_final })
                .eq("id", id)
                .select()
                .single();

            if (error) throw error;
            return { ...data, pipelineId } as PipelineStage & { pipelineId: string };
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["pipeline_stages", data.pipelineId] });
            queryClient.invalidateQueries({ queryKey: ["pipeline", data.pipelineId] });
            toast.success("Etapa atualizada!");
        },
        onError: (error: any) => {
            toast.error(error.message || "Erro ao atualizar etapa");
        },
    });
}

export function useDeleteStage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, pipelineId }: { id: string; pipelineId: string }) => {
            // Check if stage has leads
            const { count } = await supabase
                .from("lyn_leads")
                .select("*", { count: "exact", head: true })
                .eq("stage_id", id);

            if (count && count > 0) {
                throw new Error(`Esta etapa possui ${count} lead(s). Mova-os antes de excluir.`);
            }

            // Check if it's the only stage
            const { count: stageCount } = await supabase
                .from("lyn_pipeline_stages")
                .select("*", { count: "exact", head: true })
                .eq("pipeline_id", pipelineId)
                .eq("is_active", true);

            if (stageCount && stageCount <= 1) {
                throw new Error("O funil precisa ter pelo menos uma etapa.");
            }

            const { error } = await supabase
                .from("lyn_pipeline_stages")
                .delete()
                .eq("id", id);

            if (error) throw error;
            return { pipelineId };
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["pipeline_stages", data.pipelineId] });
            queryClient.invalidateQueries({ queryKey: ["pipeline", data.pipelineId] });
            toast.success("Etapa excluída!");
        },
        onError: (error: any) => {
            toast.error(error.message || "Erro ao excluir etapa");
        },
    });
}

export function useReorderStages() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            pipelineId,
            stageIds,
        }: {
            pipelineId: string;
            stageIds: string[];
        }) => {
            // Update positions for each stage
            const updates = stageIds.map((id, index) =>
                supabase
                    .from("lyn_pipeline_stages")
                    .update({ position: index })
                    .eq("id", id)
            );

            await Promise.all(updates);
            return { pipelineId };
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["pipeline_stages", data.pipelineId] });
            queryClient.invalidateQueries({ queryKey: ["pipeline", data.pipelineId] });
        },
        onError: (error: any) => {
            toast.error(error.message || "Erro ao reordenar etapas");
        },
    });
}

// Hook to update lead's pipeline and stage
export function useUpdateLeadPipeline() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            leadId,
            pipelineId,
            stageId,
        }: {
            leadId: string;
            pipelineId: string | null;
            stageId: string | null;
        }) => {
            const { data, error } = await supabase
                .from("lyn_leads")
                .update({
                    pipeline_id: pipelineId,
                    stage_id: stageId,
                })
                .eq("id", leadId)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["leads"] });
            queryClient.invalidateQueries({ queryKey: ["allLeads"] });
        },
        onError: (error: any) => {
            toast.error(error.message || "Erro ao atualizar funil do lead");
        },
    });
}

// Hook to move lead to a different stage (for Kanban drag-and-drop)
export function useMoveLeadToStage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            leadId,
            stageId,
        }: {
            leadId: string;
            stageId: string;
        }) => {
            const { data, error } = await supabase
                .from("lyn_leads")
                .update({ stage_id: stageId })
                .eq("id", leadId)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["leads"] });
            queryClient.invalidateQueries({ queryKey: ["allLeads"] });
        },
        onError: (error: any) => {
            toast.error(error.message || "Erro ao mover lead");
        },
    });
}
