import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface User {
  id: string;
  first_name: string | null;
  last_name: string | null;
  company_id: string | null;
  company?: { name: string | null } | null;
  role: string | null;
  avatar_url: string | null;
  created_at: string | null;
}

export const useUsers = (showInactive: boolean = false, currentUserRole: string | null = null, companyId: string | null = null) => {
  return useQuery({
    queryKey: ['users', showInactive, currentUserRole, companyId],
    queryFn: async () => {
      let query = supabase
        .from('lyn_profiles')
        .select('id, first_name, last_name, company_id, role, avatar_url, created_at, company:company_id(name)')
        .order('created_at', { ascending: false });

      // Filter by active/inactive status
      if (!showInactive) {
        query = query.neq('role', 'desativado');
      }

      // Para admins, restringir aos usuários da mesma empresa
      if (currentUserRole === 'admin' && companyId) {
        query = query.eq('company_id', companyId);
      }
      // Para super admin, não aplicamos nenhum filtro adicional

      const { data, error } = await query;

      if (error) throw error;
      return data as User[];
    },
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: Partial<User> }) => {
      const { data, error } = await supabase
        .from('lyn_profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: 'Usuário atualizado',
        description: 'As alterações foram salvas com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar usuário',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, password, userData }: { 
      email: string; 
      password: string; 
      userData: { first_name: string; last_name: string; role: string; company_id?: string } 
    }) => {
      // Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: userData.first_name,
            last_name: userData.last_name,
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Erro ao criar usuário');

      // Atualizar o perfil com o role e company_id
      const { error: profileError } = await supabase
        .from('lyn_profiles')
        .update({ 
          role: userData.role,
          company_id: userData.company_id || null
        })
        .eq('id', authData.user.id);

      if (profileError) throw profileError;

      return authData.user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: 'Usuário criado',
        description: 'O novo usuário foi cadastrado com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao criar usuário',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      // Apenas desativa o usuário, não remove do auth.users
      const { error } = await supabase
        .from('lyn_profiles')
        .update({ role: 'desativado' })
        .eq('id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: 'Usuário desativado',
        description: 'O usuário foi desativado com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao desativar usuário',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};