import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface QuickReplyTemplate {
    id: string;
    company_id: string;
    title: string;
    content: string;
    shortcut: string | null;
    category: string | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}

export interface CreateTemplateInput {
    title: string;
    content: string;
    shortcut?: string;
    category?: string;
}

export interface UpdateTemplateInput extends CreateTemplateInput {
    id: string;
}

export const useQuickReplies = () => {
    const { companyId, user } = useAuth();
    const queryClient = useQueryClient();
    const { toast } = useToast();

    // Fetch all templates for the company
    const query = useQuery({
        queryKey: ["quick-replies", companyId],
        enabled: !!companyId,
        queryFn: async () => {
            const { data, error } = await supabase
                .from("lyn_quick_reply_templates")
                .select("*")
                .eq("company_id", companyId)
                .order("title", { ascending: true });

            if (error) throw error;
            return data as QuickReplyTemplate[];
        },
    });

    // Create template
    const createMutation = useMutation({
        mutationFn: async (input: CreateTemplateInput) => {
            const { data, error } = await supabase
                .from("lyn_quick_reply_templates")
                .insert({
                    company_id: companyId,
                    title: input.title,
                    content: input.content,
                    shortcut: input.shortcut || null,
                    category: input.category || null,
                    created_by: user?.id,
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["quick-replies"] });
            toast({ title: "Sucesso", description: "Resposta rápida criada!" });
        },
        onError: (error: any) => {
            toast({
                title: "Erro",
                description: error.message || "Falha ao criar resposta rápida",
                variant: "destructive",
            });
        },
    });

    // Update template
    const updateMutation = useMutation({
        mutationFn: async (input: UpdateTemplateInput) => {
            const { data, error } = await supabase
                .from("lyn_quick_reply_templates")
                .update({
                    title: input.title,
                    content: input.content,
                    shortcut: input.shortcut || null,
                    category: input.category || null,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", input.id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["quick-replies"] });
            toast({ title: "Sucesso", description: "Resposta rápida atualizada!" });
        },
        onError: (error: any) => {
            toast({
                title: "Erro",
                description: error.message || "Falha ao atualizar resposta rápida",
                variant: "destructive",
            });
        },
    });

    // Delete template
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from("lyn_quick_reply_templates")
                .delete()
                .eq("id", id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["quick-replies"] });
            toast({ title: "Sucesso", description: "Resposta rápida excluída!" });
        },
        onError: (error: any) => {
            toast({
                title: "Erro",
                description: error.message || "Falha ao excluir resposta rápida",
                variant: "destructive",
            });
        },
    });

    return {
        templates: query.data || [],
        isLoading: query.isLoading,
        error: query.error,
        createTemplate: createMutation.mutateAsync,
        updateTemplate: updateMutation.mutateAsync,
        deleteTemplate: deleteMutation.mutateAsync,
        isCreating: createMutation.isPending,
        isUpdating: updateMutation.isPending,
        isDeleting: deleteMutation.isPending,
    };
};

// Helper function to replace variables in template content
export const replaceTemplateVariables = (
    content: string,
    lead: { nome?: string; empresa?: string; telefone?: string } | null,
    userName: string
): string => {
    return content
        .replace(/{nome}/g, lead?.nome || "Cliente")
        .replace(/{empresa}/g, lead?.empresa || "")
        .replace(/{telefone}/g, lead?.telefone || "")
        .replace(/{meu_nome}/g, userName || "");
};
