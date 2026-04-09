import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";

export type Company = Tables<"company">;

const EMPTY_ARRAY: string[] = [];

export const useCompany = () => {
  const { companyId } = useAuth();
  const queryClient = useQueryClient();

  const queryResult = useQuery({
    queryKey: ["company", companyId],
    queryFn: async () => {
      if (!companyId) return null;

      const { data, error } = await supabase
        .from("lyn_company")
        .select("*")
        .eq("id", companyId)
        .single();

      if (error) throw error;
      return data as Company;
    },
    enabled: !!companyId,
  });

  const updateCompanyFunis = useMutation({
    mutationFn: async (newFunil: string) => {
      if (!companyId) {
        throw new Error("ID da empresa não encontrado");
      }

      console.log("Atualizando funis da empresa:", { companyId, newFunil });

      // Obtém os funis atuais ou um array vazio se for undefined
      const currentFunis = queryResult.data?.funis || [];

      // Se o funil já existe, retorna a lista atual sem modificar
      if (currentFunis.includes(newFunil)) {
        console.log("Funil já existe, retornando lista atual");
        return currentFunis;
      }

      // Cria um novo array com o novo funil
      const updatedFunis = [...currentFunis, newFunil];

      console.log("Novos funis a serem salvos:", updatedFunis);

      try {
        // Atualiza no Supabase
        const { error } = await supabase
          .from("lyn_company")
          .update({
            funis: updatedFunis
          })
          .eq("id", companyId);

        if (error) {
          console.error("Erro ao atualizar funis no Supabase:", error);
          throw error;
        }

        console.log("Funil atualizado com sucesso no Supabase");
        return updatedFunis; // Retorna os funis atualizados
      } catch (error) {
        console.error("Erro na mutação de atualização de funis:", error);
        throw error; // Re-lança o erro para ser tratado pelo chamador
      }
    },
    onSuccess: (updatedFunis, newFunil) => {
      console.log("Atualizando cache local com novos funis:", updatedFunis);

      // Atualiza o cache local de forma otimista
      queryClient.setQueryData<Company>(["company", companyId], (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          funis: updatedFunis
        };
      });

      // Invalida a query para garantir sincronização
      queryClient.invalidateQueries({ queryKey: ["company", companyId] });
    },
    onError: (error, newFunil, context) => {
      console.error(`Erro ao adicionar o funil "${newFunil}":`, error);
      // Reverter para o estado anterior em caso de erro
      queryClient.invalidateQueries({ queryKey: ["company", companyId] });
    }
  });

  return {
    company: queryResult.data,
    funis: queryResult.data?.funis ?? EMPTY_ARRAY,
    statusType: queryResult.data?.status_type ?? EMPTY_ARRAY,
    isLoading: queryResult.isLoading,
    refetch: queryResult.refetch,
    updateCompanyFunis, // Retornar o objeto de mutação completo
    isUpdatingFunis: updateCompanyFunis.isPending,
  };
};
