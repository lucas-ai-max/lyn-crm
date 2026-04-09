import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { User } from '@/hooks/useUsers';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Schema for creating users (email required)
const createUserSchema = z.object({
  first_name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  last_name: z.string().min(2, 'Sobrenome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  role: z.enum(['user', 'admin', 'superadmin', 'desativado']),
  company_id: z.string().uuid('ID da empresa inválido').optional(),
});

// Schema for editing users (email/password optional)
const editUserSchema = z.object({
  first_name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  last_name: z.string().min(2, 'Sobrenome deve ter pelo menos 2 caracteres'),
  email: z.string().optional().or(z.literal('')),
  password: z.string().optional().or(z.literal('')),
  role: z.enum(['user', 'admin', 'superadmin', 'desativado']),
  company_id: z.string().uuid('ID da empresa inválido').optional(),
});

type UserFormData = z.infer<typeof createUserSchema>;

interface UserManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  currentUserRole: string | null;
  currentUserCompanyId?: string | null;
  currentUserCompanyName?: string | null;
  isCreating: boolean;
  onSave?: (data: UserFormData) => Promise<void> | void;
}

export function UserManagementModal({
  open,
  onOpenChange,
  user,
  currentUserRole,
  currentUserCompanyId,
  currentUserCompanyName,
  isCreating,
  onSave,
}: UserManagementModalProps) {
  const { toast } = useToast();

  const form = useForm<UserFormData>({
    resolver: zodResolver(user ? editUserSchema : createUserSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      role: 'user',
      company_id: '',
    },
  });


  const { data: companies = [], isLoading: companiesLoading } = useQuery<{ id: string; name: string | null }[]>({
    queryKey: ['companies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lyn_company')
        .select('id, name')
        .order('name');

      if (error) {
        console.error('Erro ao carregar empresas', error);
        throw error;
      }

      return data as { id: string; name: string | null }[];
    },
    enabled: currentUserRole === 'superadmin',
  });

  useEffect(() => {
    if (user) {
      form.reset({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: '', // Email não vem da tabela profiles
        role: (user.role as any) || 'user',
        company_id: user.company_id || '',
      });
    } else {
      form.reset({
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        role: 'user',
        company_id: currentUserRole === 'admin' ? currentUserCompanyId || '' : '',
      });
    }
  }, [user, form, currentUserRole, currentUserCompanyId]);

  const createUser = async (data: UserFormData) => {
    // We pass explicit firstName/lastName to matching edge function expectations
    const payload = {
      firstName: data.first_name,
      lastName: data.last_name,
      email: data.email,
      password: data.password,
      role: data.role,
      // company_id is inferred from the caller's admin token in the edge function
      // but we can pass it if needed. The function implementation above uses `membership.company_id`.
    };

    try {
      console.log('Invoking create-employee function with payload:', payload);
      const { data: responseData, error } = await supabase.functions.invoke('create-employee', {
        body: payload,
      });

      console.log('Function response:', { responseData, error });

      if (error) {
        console.error('Supabase invoke error:', error);
        throw new Error(error.message || 'Erro ao invocar função de criação');
      }

      if (responseData?.error) {
        console.error('Function returned error:', responseData.error);
        throw new Error(responseData.error);
      }

      return responseData;
    } catch (error: any) {
      console.error('Erro ao criar usuário', error);
      throw error;
    }
  };

  const updateUser = async (data: UserFormData) => {
    if (!user) return;

    const { error } = await supabase
      .from('lyn_profiles')
      .update({
        first_name: data.first_name,
        last_name: data.last_name,
        role: data.role,
        ...(currentUserRole === 'superadmin' && data.company_id ? { company_id: data.company_id } : {}),
      })
      .eq('id', user.id);

    if (error) throw error;
  };

  const handleSubmit = async (data: UserFormData) => {
    // Para admins, sempre usar a empresa do usuário atual
    if (currentUserRole === 'admin') {
      data.company_id = currentUserCompanyId || '';
    }
    try {
      if (onSave) {
        await onSave(data);
        onOpenChange(false);
        return;
      }

      if (user) {
        await updateUser(data);
      } else {
        await createUser(data);
      }

      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao salvar usuário', error);
      toast({
        title: "Erro",
        description: error.message || "Falha ao salvar usuário",
        variant: "destructive",
      });
    }
  };

  const canEditRole = (role: string) => {
    if (currentUserRole === 'superadmin') return true;
    // Admins can edit roles for their company users (create or update)
    // but maybe restrict demoting themselves? For now allow simpler logic:
    if (currentUserRole === 'admin') return true;
    return false;
  };

  const availableRoles = () => {
    if (currentUserRole === 'superadmin') {
      return [
        { value: 'user', label: 'Usuário' },
        { value: 'admin', label: 'Administrador' },
        { value: 'superadmin', label: 'Super Administrador' },
        { value: 'desativado', label: 'Desativado' },
      ];
    }
    // Admins can create other Admins or Users
    return [
      { value: 'user', label: 'Usuário' },
      { value: 'admin', label: 'Administrador' },
      { value: 'desativado', label: 'Desativado' },
    ];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] w-[95vw] max-w-3xl max-h-[90vh] flex flex-col overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {user ? 'Editar Usuário' : 'Novo Usuário'}
          </DialogTitle>
          <DialogDescription>
            {user
              ? 'Atualize as informações do usuário abaixo.'
              : 'Preencha os dados para criar um novo usuário.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-1 min-h-0 flex-col gap-4">
            <div className="flex-1 min-h-0 space-y-4 overflow-y-auto pr-1">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder="João" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sobrenome</FormLabel>
                    <FormControl>
                      <Input placeholder="Silva" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {!user && (
                <>
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-mail</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="joao@empresa.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Senha</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {currentUserRole === 'superadmin' && (
                <FormField
                  control={form.control}
                  name="company_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Empresa</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || undefined}
                        disabled={companiesLoading}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={companiesLoading ? 'Carregando...' : 'Selecione a empresa'} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {companies.map((company) => (
                            <SelectItem key={company.id} value={company.id}>
                              {company.name ?? 'Sem nome'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {currentUserRole === 'admin' && (
                <div className="space-y-2">
                  <FormLabel>Empresa</FormLabel>
                  <Input
                    value={currentUserCompanyName || 'Não definida'}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Novos usuários serão criados na sua empresa
                  </p>
                </div>
              )}

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Papel</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={!canEditRole(field.value)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o papel" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableRoles().map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="mt-2 flex-shrink-0 border-t border-border bg-background pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {user ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}