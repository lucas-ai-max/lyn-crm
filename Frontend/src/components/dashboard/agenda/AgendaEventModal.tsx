import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const eventSchema = z.object({
  descricao: z.string().trim().min(1, "Descrição é obrigatória").max(500, "Descrição muito longa"),
  data_inicio: z.date({ required_error: "Data de início é obrigatória" }),
  hora_inicio: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato de hora inválido (HH:MM)"),
  data_fim: z.date({ required_error: "Data de fim é obrigatória" }),
  hora_fim: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato de hora inválido (HH:MM)"),
  lead_id: z.string().optional().nullable(),
}).refine((data) => {
  const startDateTime = new Date(data.data_inicio);
  const [startHours, startMinutes] = data.hora_inicio.split(":").map(Number);
  startDateTime.setHours(startHours, startMinutes, 0, 0);

  const endDateTime = new Date(data.data_fim);
  const [endHours, endMinutes] = data.hora_fim.split(":").map(Number);
  endDateTime.setHours(endHours, endMinutes, 0, 0);

  return endDateTime > startDateTime;
}, {
  message: "Data/hora de fim deve ser posterior à data/hora de início",
  path: ["data_fim"],
});

type EventFormData = z.infer<typeof eventSchema>;

interface AgendaEventModalProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  event?: any;
  initialSlot?: { start: Date; end: Date } | null;
  preselectedLeadId?: string | null;
}

export function AgendaEventModal({ open, onClose, onSave, event, initialSlot, preselectedLeadId }: AgendaEventModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      descricao: "",
      data_inicio: new Date(),
      hora_inicio: "09:00",
      data_fim: new Date(),
      hora_fim: "10:00",
      lead_id: null,
    },
  });

  // Fetch leads for selection
  const { data: leads = [] } = useQuery({
    queryKey: ["leads-for-agenda", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("lyn_leads")
        .select("id, nome")
        .eq("responsavel_id", user.id)
        .order("nome", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && open,
  });

  useEffect(() => {
    if (event) {
      const startDate = new Date(event.start);
      const endDate = new Date(event.end);
      
      form.reset({
        descricao: event.description || "",
        data_inicio: startDate,
        hora_inicio: format(startDate, "HH:mm"),
        data_fim: endDate,
        hora_fim: format(endDate, "HH:mm"),
        lead_id: event.lead_id || null,
      });
    } else if (initialSlot) {
      form.reset({
        descricao: "",
        data_inicio: initialSlot.start,
        hora_inicio: format(initialSlot.start, "HH:mm"),
        data_fim: initialSlot.end,
        hora_fim: format(initialSlot.end, "HH:mm"),
        lead_id: preselectedLeadId || null,
      });
    } else if (preselectedLeadId) {
      const now = new Date();
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
      
      form.reset({
        descricao: "",
        data_inicio: now,
        hora_inicio: format(now, "HH:mm"),
        data_fim: oneHourLater,
        hora_fim: format(oneHourLater, "HH:mm"),
        lead_id: preselectedLeadId,
      });
    }
  }, [event, initialSlot, preselectedLeadId, form]);

  const handleSubmit = async (data: EventFormData) => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      // Combine date and time for start
      const [startHours, startMinutes] = data.hora_inicio.split(":").map(Number);
      const startDateTime = new Date(data.data_inicio);
      startDateTime.setHours(startHours, startMinutes, 0, 0);

      // Combine date and time for end
      const [endHours, endMinutes] = data.hora_fim.split(":").map(Number);
      const endDateTime = new Date(data.data_fim);
      endDateTime.setHours(endHours, endMinutes, 0, 0);

      const eventData = {
        user_id: user.id,
        descricao: data.descricao.trim(),
        data_inicio: startDateTime.toISOString(),
        data_fim: endDateTime.toISOString(),
        lead_id: data.lead_id || null,
      };

      if (event) {
        const { error } = await supabase
          .from("lyn_agenda")
          .update(eventData)
          .eq("id", event.id);

        if (error) throw error;

        toast({
          title: "Evento atualizado",
          description: "Seu compromisso foi atualizado com sucesso",
        });
      } else {
        const { error } = await supabase
          .from("lyn_agenda")
          .insert(eventData);

        if (error) throw error;

        toast({
          title: "Evento criado",
          description: "Seu compromisso foi adicionado à agenda",
        });
      }

      onSave();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar evento",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!event) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("lyn_agenda")
        .delete()
        .eq("id", event.id);

      if (error) throw error;

      toast({
        title: "Evento excluído",
        description: "O compromisso foi removido da agenda",
      });

      onSave();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir evento",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[560px] w-[95vw] max-w-3xl max-h-[90vh] flex flex-col overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{event ? "Editar Evento" : "Novo Evento"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-1 min-h-0 flex-col gap-4">
            <div className="flex-1 min-h-0 space-y-4 overflow-y-auto pr-1">
              <FormField
                control={form.control}
                name="descricao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Digite a descrição do compromisso"
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="data_inicio"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data de Início *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "dd/MM/yyyy")
                              ) : (
                                <span>Selecione</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hora_inicio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hora de Início *</FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="data_fim"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data de Fim *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "dd/MM/yyyy")
                              ) : (
                                <span>Selecione</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hora_fim"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hora de Fim *</FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="lead_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente (opcional)</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value === "none" ? null : value)}
                      value={field.value || "none"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um cliente" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {leads.map((lead) => (
                          <SelectItem key={lead.id} value={lead.id}>
                            {lead.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="gap-2 flex-shrink-0 border-t border-border pt-4">
              {event && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="destructive" disabled={isDeleting}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir evento?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação não pode ser desfeita. O evento será removido permanentemente da sua agenda.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}