import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const createCompanyUserSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  sobrenome: z.string().optional(),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  company_name: z.string().min(2, 'Nome da empresa deve ter pelo menos 2 caracteres'),
});

export type CreateCompanyUserFormData = z.infer<typeof createCompanyUserSchema>;

interface CreateCompanyUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

export function CreateCompanyUserModal({ open, onOpenChange, onCreated }: CreateCompanyUserModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreateCompanyUserFormData>({
    resolver: zodResolver(createCompanyUserSchema),
    defaultValues: {
      nome: '',
      sobrenome: '',
      email: '',
      password: '',
      company_name: '',
    },
  });

  const handleSubmit = async (values: CreateCompanyUserFormData) => {
    setIsSubmitting(true);
    const payload = {
      ...values,
      sobrenome: values.sobrenome?.trim() ?? '',
    };

    try {
      const response = await fetch('https://n8neditor.iacompany.co/webhook/create-user-company', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorMessage = 'Erro ao criar empresa e usuário';
        try {
          const errorData = await response.json();
          errorMessage = errorData?.message || errorMessage;
        } catch (error) {
          console.error('Erro ao ler resposta de erro', error);
        }
        throw new Error(errorMessage);
      }

      toast({
        title: 'Empresa e usuário criados',
        description: 'Os registros foram criados com sucesso.',
      });

      onCreated?.();
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao criar empresa e usuário', error);
      toast({
        title: 'Erro ao criar empresa e usuário',
        description: error instanceof Error ? error.message : 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (!nextOpen) {
        form.reset();
      }
      onOpenChange(nextOpen);
    }}>
      <DialogContent className="sm:max-w-[600px] w-[95vw] max-h-[90vh] flex flex-col overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova empresa e usuário</DialogTitle>
          <DialogDescription>
            Cadastre uma nova empresa e um usuário administrador associado a ela.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-1 min-h-0 flex-col gap-4">
            <div className="flex-1 min-h-0 space-y-4 overflow-y-auto pr-1">
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome *</FormLabel>
                    <FormControl>
                      <Input placeholder="Pedro" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sobrenome"
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

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail *</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="pedro@empresa.com" {...field} />
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
                    <FormLabel>Senha *</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="company_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da empresa *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome da empresa" {...field} />
                    </FormControl>
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
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar empresa e usuário
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
