import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "@/hooks/useCompany";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useActivePipelines, useDefaultPipeline, usePipelineStages } from "@/hooks/usePipelines";
import { useAllContacts, Contact } from "@/hooks/useContacts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, ExternalLink, Loader2, PlusCircle } from "lucide-react";
import { TagInput } from "@/components/ui/TagInput";

const leadSchema = z.object({
  nome: z.string().trim().min(1, "Nome completo é obrigatório").max(100),
  email: z.string().trim().email("E-mail inválido").max(255).optional().or(z.literal('')),
  telefone: z
    .string()
    .trim()
    .max(50, "Telefone muito longo")
    .optional()
    .refine((value) => {
      if (!value) return true;
      // Extract only digits (handles JID format like 553172064228@s.whatsapp.net)
      const digits = value.replace(/\D/g, "");
      // Accept 10-15 digits (covers national and international formats)
      return digits.length >= 10 && digits.length <= 15;
    }, "Informe um telefone válido (10-15 dígitos)"),
  telefone_2: z
    .string()
    .trim()
    .max(50, "Telefone muito longo")
    .optional()
    .refine((value) => {
      if (!value) return true;
      const digits = value.replace(/\D/g, "");
      return digits.length >= 10 && digits.length <= 15;
    }, "Informe um telefone válido (10-15 dígitos)"),
  empresa: z.string().trim().max(100).optional(),
  segmento: z.string().trim().max(100).optional(),
  funil: z.string().trim().max(100).optional(),
  pipeline_id: z.string().nullable().optional(),
  stage_id: z.string().nullable().optional(),
  prioridade: z.enum(['high', 'medium', 'low']).default('medium'),
  notas: z.string().trim().optional(), // Removed max limit
  description: z.string().trim().max(100000).optional(), // Increased limit
  tags: z.array(z.string()).optional(),
  status: z.string().optional(),
  responsavel_id: z.string().min(1, "Responsável é obrigatório"),
  contact_id: z.string().nullable().optional(),
  valor_oportunidade: z
    .string()
    .trim()
    .optional()
    .refine((value) => {
      if (!value) return true;
      const sanitized = value.replace(/\./g, "");
      return /^\d+(,\d{0,2})?$/.test(sanitized) || /^\d+(\.\d{0,2})?$/.test(sanitized);
    }, "Informe um valor numérico válido"),
});

type LeadFormData = z.infer<typeof leadSchema>;

interface LeadModalProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  mode: "create" | "edit";
  initialData?: {
    id: string;
    nome: string;
    email?: string;
    telefone?: string;
    telefone_2?: string;
    empresa?: string;
    segmento?: string;
    prioridade?: 'high' | 'medium' | 'low';
    status?: string;
    notas?: string;
    description?: string;
    tags?: string[];
    funil?: string;
    pipeline_id?: string | null;
    stage_id?: string | null;
    responsavel_id?: string;
    contact_id?: string | null;
    valor_oportunidade?: number | null;
  };
}

const PRIORITIES = [
  { value: 'high', label: 'Alta Prioridade', color: 'text-blue-600' },
  { value: 'medium', label: 'Média Prioridade', color: 'text-amber-600' },
  { value: 'low', label: 'Baixa Prioridade', color: 'text-emerald-600' }
];

type CompanyUser = {
  id: string;
  first_name: string | null;
  last_name: string | null;
};

export function LeadModal({ open, onClose, onSave, mode, initialData }: LeadModalProps) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [companyUsers, setCompanyUsers] = useState<CompanyUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isFunnelOpen, setIsFunnelOpen] = useState(false);
  const [funnelSearch, setFunnelSearch] = useState("");
  const [extraFunis, setExtraFunis] = useState<string[]>([]);
  const [funnelPopoverWidth, setFunnelPopoverWidth] = useState<number>();
  const [isContactPickerOpen, setIsContactPickerOpen] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const lastOpenRef = useRef(open);
  const funnelTriggerRef = useRef<HTMLButtonElement | null>(null);
  const { user, profile, companyId } = useAuth();
  const { toast } = useToast();
  const {
    statusType: companyStatusTypes = [],
    funis: companyFunis = [],
    updateCompanyFunis,
    isUpdatingFunis
  } = useCompany();

  const { data: allContactsData = [] } = useAllContacts();

  const isAdmin = profile?.role === "admin" || profile?.role === "superadmin";

  useEffect(() => {
    if (!open || !isAdmin || !companyId) return;

    let isMounted = true;

    const fetchCompanyUsers = async () => {
      try {
        setIsLoadingUsers(true);
        const { data, error } = await supabase
          .from("lyn_profiles")
          .select("id, first_name, last_name")
          .eq("company_id", companyId)
          .neq("role", "desativado");

        if (!isMounted) return;

        if (error) {
          throw error;
        }

        setCompanyUsers(data || []);
      } catch (error: any) {
        if (!isMounted) return;
        toast({
          title: "Erro",
          description: error.message || "Não foi possível carregar os responsáveis",
          variant: "destructive",
        });
        setCompanyUsers([]);
      } finally {
        if (isMounted) {
          setIsLoadingUsers(false);
        }
      }
    };

    fetchCompanyUsers();

    return () => {
      isMounted = false;
    };
    fetchCompanyUsers();

    return () => {
      isMounted = false;
    };
  }, [open, isAdmin, companyId, toast]);

  // Fetch recent notes for context in Edit mode
  const { data: recentNotes = [] } = useQuery({
    queryKey: ["lead_notes", initialData?.id],
    queryFn: async () => {
      if (!initialData?.id || mode !== "edit") return [];
      const { data, error } = await supabase
        .from("lyn_lead_notes")
        .select(`
          id,
          content,
          created_at,
          created_by,
          profiles:created_by (first_name, last_name)
        `)
        .eq("lead_id", initialData.id)
        .order("created_at", { ascending: false })
        .limit(3);

      if (error) {
        console.error("Error fetching notes for modal:", error);
        return [];
      }
      return data;
    },
    enabled: !!initialData?.id && mode === "edit" && open,
  });

  const form = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      nome: initialData?.nome || "",
      email: initialData?.email || "",
      telefone: initialData?.telefone || "",
      telefone_2: initialData?.telefone_2 || "",
      empresa: initialData?.empresa || "",
      segmento: initialData?.segmento || "",
      prioridade: initialData?.prioridade || 'medium',
      notas: "", // Start empty
      description: initialData?.description || "",
      tags: initialData?.tags || [],
      funil: initialData?.funil || "",
      pipeline_id: initialData?.pipeline_id || null,
      stage_id: initialData?.stage_id || null,
      status: initialData?.status || companyStatusTypes[0] || "",
      responsavel_id: initialData?.responsavel_id || user?.id || "",
      contact_id: initialData?.contact_id || null,
      valor_oportunidade: initialData?.valor_oportunidade ? String(initialData.valor_oportunidade) : "",
    },
  });

  const { data: pipelines = [] } = useActivePipelines();
  const currentFormPipelineId = form.watch('pipeline_id');
  const { data: stages = [] } = usePipelineStages(currentFormPipelineId ?? undefined);

  useEffect(() => {
    const justOpened = open && !lastOpenRef.current;
    lastOpenRef.current = open;

    if (!justOpened) return;

    form.reset({
      nome: initialData?.nome || "",
      email: initialData?.email || "",
      telefone: initialData?.telefone || "",
      telefone_2: initialData?.telefone_2 || "",
      empresa: initialData?.empresa || "",
      segmento: initialData?.segmento || "",
      prioridade: initialData?.prioridade || 'medium',
      notas: "", // Start empty
      description: initialData?.description || "",
      tags: initialData?.tags || [],
      funil: initialData?.funil || "",
      pipeline_id: initialData?.pipeline_id || null,
      stage_id: initialData?.stage_id || null,
      status: initialData?.status || companyStatusTypes[0] || "",
      responsavel_id: initialData?.responsavel_id || user?.id || "",
      contact_id: initialData?.contact_id || null,
      valor_oportunidade: initialData?.valor_oportunidade ? String(initialData.valor_oportunidade) : "",
    });
  }, [open, initialData, companyStatusTypes, user?.id, form]);

  useEffect(() => {
    if (!open) return;

    if (!form.getValues("status") && companyStatusTypes.length > 0) {
      form.setValue("status", companyStatusTypes[0]);
    }
  }, [companyStatusTypes, open, form]);

  useEffect(() => {
    if (!open || !user?.id) return;

    if (!form.getValues("responsavel_id")) {
      form.setValue("responsavel_id", user.id);
    }
  }, [open, user?.id, form]);

  useEffect(() => {
    if (!open) {
      setIsFunnelOpen(false);
      setFunnelSearch("");
      setExtraFunis((prev) => prev.length > 0 ? [] : prev);
      return;
    }

    const currentFunil = (initialData?.funil ?? form.getValues("funil"))?.trim();
    if (!currentFunil) return;

    setExtraFunis((prev) => {
      if (companyFunis.includes(currentFunil) || prev.includes(currentFunil)) {
        return prev;
      }
      return [...prev, currentFunil];
    });
  }, [open, companyFunis, initialData?.funil, form]);

  useEffect(() => {
    if (!isFunnelOpen) return;

    const updateWidth = () => {
      setFunnelPopoverWidth(funnelTriggerRef.current?.offsetWidth || undefined);
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);

    return () => {
      window.removeEventListener("resize", updateWidth);
    };
  }, [isFunnelOpen]);

  useEffect(() => {
    if (!open || !initialData?.contact_id) {
      setSelectedContact(null);
      return;
    }

    const contact = allContactsData.find(c => c.id === initialData.contact_id);
    if (contact) {
      setSelectedContact(contact);
    }
  }, [open, initialData?.contact_id, allContactsData]);

  const availableFunis = useMemo(() => {
    const merged = [...companyFunis, ...extraFunis]
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value));
    return Array.from(new Set(merged)).sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));
  }, [companyFunis, extraFunis]);

  const filteredFunis = useMemo(() => {
    const search = funnelSearch.trim().toLowerCase();
    if (!search) {
      return availableFunis;
    }
    return availableFunis.filter((funil) => funil.toLowerCase().includes(search));
  }, [availableFunis, funnelSearch]);

  const canCreateFunil = useMemo(() => {
    const value = funnelSearch.trim().toLowerCase();
    if (!value) return false;
    return !availableFunis.some((funil) => funil.toLowerCase() === value);
  }, [availableFunis, funnelSearch]);

  const handleSelectContact = (contact: Contact) => {
    setSelectedContact(contact);
    form.setValue("contact_id", contact.id);
    setIsContactPickerOpen(false);
    setContactSearch("");

    // Auto-populate name/email/telefone/empresa if empty
    if (!form.getValues("nome")) {
      form.setValue("nome", contact.nome);
    }
    if (!form.getValues("email") && contact.email) {
      form.setValue("email", contact.email);
    }
    if (!form.getValues("telefone") && contact.telefone) {
      form.setValue("telefone", contact.telefone);
    }
    if (!form.getValues("empresa") && contact.empresa) {
      form.setValue("empresa", contact.empresa);
    }
  };

  const handleCreateAndSelectContact = async () => {
    const searchValue = contactSearch.trim();
    if (!searchValue) {
      toast({
        title: "Aviso",
        description: "Digite um nome para criar um novo contato",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      const { data: newContact, error } = await supabase
        .from("lyn_contacts")
        .insert({
          nome: searchValue,
          company_id: companyId,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Contato "${searchValue}" criado com sucesso`,
      });

      // Select the newly created contact
      if (newContact) {
        handleSelectContact(newContact);
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Falha ao criar contato",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateFunil = async (value: string) => {
    if (!value.trim()) return;

    try {
      // Adiciona o funil à empresa
      await updateCompanyFunis.mutateAsync(value);

      // Atualiza o estado local
      form.setValue('funil', value);
      setExtraFunis((prev) =>
        prev.includes(value) ? prev : [...prev, value]
      );
      setIsFunnelOpen(false);
      setFunnelSearch("");

      toast({
        title: "Sucesso",
        description: `Funil "${value}" adicionado à empresa`,
      });
    } catch (error: any) {
      console.error("Erro ao adicionar funil:", error);
      toast({
        title: "Erro",
        description: error.message || "Falha ao adicionar o funil à empresa",
        variant: "destructive",
      });
    }
  };

  const sanitizeString = (value?: string | null) => {
    if (!value) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  };

  const parseOpportunityValue = (value?: string | null) => {
    if (!value) return null;
    const normalized = value.replace(/\./g, "").replace(",", ".").trim();
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const handleSubmit = async (data: LeadFormData) => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para realizar esta ação",
        variant: "destructive",
      });
      return;
    }

    // Verifica se o funil existe na empresa e adiciona se necessário
    const funilValue = data.funil?.trim();
    if (funilValue && !companyFunis.includes(funilValue)) {
      try {
        await updateCompanyFunis.mutateAsync(funilValue);
      } catch (error) {
        console.error("Erro ao adicionar funil à empresa:", error);
        // Não interrompe o fluxo principal se falhar
      }
    }

    if (!companyId) {
      toast({
        title: "Erro",
        description: "Não foi possível identificar a empresa do usuário",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const mappedPipeline = pipelines.find(p => p.id === data.pipeline_id);
      const mappedStage = stages.find(s => s.id === data.stage_id);

      const resolvedFunil = mappedPipeline ? mappedPipeline.name : sanitizeString(data.funil);
      const resolvedStatus = mappedStage ? mappedStage.name : (
        mode === "create"
          ? (companyStatusTypes[0] || data.status || "Novos")
          : (initialData?.status || data.status || companyStatusTypes[0] || "Novos")
      );

      const responsavelId = isAdmin ? data.responsavel_id : user.id;

      if (!responsavelId) {
        throw new Error("Responsável não definido");
      }

      let leadId = initialData?.id;

      if (mode === "create") {
        const { data: newLead, error } = await supabase.from("lyn_leads").insert({
          nome: data.nome,
          email: sanitizeString(data.email) || null,
          telefone: sanitizeString(data.telefone),
          telefone_2: sanitizeString(data.telefone_2),
          empresa: sanitizeString(data.empresa),
          segmento: sanitizeString(data.segmento),
          prioridade: data.prioridade,
          description: sanitizeString(data.description),
          tags: data.tags && data.tags.length > 0 ? data.tags : null,
          status: resolvedStatus,
          responsavel_id: responsavelId,
          funil: resolvedFunil,
          pipeline_id: data.pipeline_id || null,
          stage_id: data.stage_id || null,
          company_id: companyId,
          contact_id: data.contact_id || null,
          valor_oportunidade: parseOpportunityValue(data.valor_oportunidade),
          // We no longer populate 'notas' column directly, we use lead_notes table
        } as any).select().single();

        if (error) throw error;
        leadId = newLead.id;

        toast({
          title: "Sucesso",
          description: "Cliente criado com sucesso",
        });
      } else {
        if (!initialData?.id) throw new Error("ID do lead é obrigatório para atualização");

        const { data: updatedLead, error } = await supabase
          .from("lyn_leads")
          .update({
            nome: data.nome,
            email: sanitizeString(data.email),
            telefone: sanitizeString(data.telefone),
            telefone_2: sanitizeString(data.telefone_2),
            empresa: sanitizeString(data.empresa),
            segmento: sanitizeString(data.segmento),
            prioridade: data.prioridade,
            description: sanitizeString(data.description),
            tags: data.tags && data.tags.length > 0 ? data.tags : null,
            funil: resolvedFunil,
            pipeline_id: data.pipeline_id || null,
            stage_id: data.stage_id || null,
            responsavel_id: responsavelId,
            status: resolvedStatus,
            contact_id: data.contact_id || null,
            valor_oportunidade: parseOpportunityValue(data.valor_oportunidade),
            // We no longer update 'notas' column directly
          } as any)
          .eq("id", initialData.id)
          .select(); // IMPORTANT: Request return data to verify update

        if (error) throw error;

        // VERIFICATION: Check if any row was actually updated
        if (!updatedLead || updatedLead.length === 0) {
          console.error("Update returned no rows. Possible RLS or ID mismatch.", {
            id: initialData.id,
            responsavelId,
            companyId
          });
          throw new Error("Erro ao atualizar: Lead não encontrado ou permissão negada.");
        }

        toast({
          title: "Sucesso",
          description: "Cliente atualizado com sucesso",
        });
      }

      // Handle Note Insertion (Append Only)
      if (data.notas && data.notas.trim().length > 0 && leadId) {
        const { error: noteError } = await supabase.from("lyn_lead_notes").insert({
          lead_id: leadId,
          content: data.notas.trim(),
          created_by: user.id
        });

        if (noteError) {
          console.error("Error saving note:", noteError);
          toast({
            title: "Aviso",
            description: "Cliente salvo, mas houve um erro ao salvar a nota.",
            variant: "destructive"
          });
        }
      }

      form.reset();
      onClose();
      onSave();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Falha ao salvar cliente",
        variant: "destructive",
      });
      console.error("Error saving lead:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    form.reset();
    setSelectedContact(null);
    setContactSearch("");
    setIsContactPickerOpen(false);
    onClose();
  };

  const handleOpenLeadDetails = () => {
    if (!initialData?.id) return;
    handleClose();
    navigate(`/dashboard/${initialData.id}`);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] w-[95vw] max-w-3xl max-h-[90vh] flex flex-col overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Novo Cliente" : "Editar Cliente"}
          </DialogTitle>
          {mode === "edit" && initialData?.id ? (
            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Pacientes e PDFs ficam na tela completa do lead.
              </p>
              <Button type="button" variant="outline" size="sm" className="gap-2" onClick={handleOpenLeadDetails}>
                <ExternalLink className="h-4 w-4" />
                Abrir lead completo
              </Button>
            </div>
          ) : null}
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-1 min-h-0 flex-col gap-6">
            <div className="flex-1 min-h-0 space-y-6 overflow-y-visible md:overflow-y-auto md:pr-3">
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Contato vinculado
                </h3>
                <div className="mb-4">
                  {selectedContact ? (
                    <div className="p-3 border rounded-lg bg-muted/30 flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{selectedContact.nome}</p>
                        {selectedContact.email && (
                          <p className="text-xs text-muted-foreground">{selectedContact.email}</p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedContact(null);
                          form.setValue("contact_id", null);
                          setContactSearch("");
                        }}
                      >
                        ✕
                      </Button>
                    </div>
                  ) : (
                    <Popover open={isContactPickerOpen} onOpenChange={setIsContactPickerOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-between"
                          type="button"
                        >
                          <span className="text-muted-foreground">Selecione um contato...</span>
                          <ChevronsUpDown className="h-4 w-4 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <CommandInput
                            placeholder="Buscar contato..."
                            value={contactSearch}
                            onValueChange={setContactSearch}
                          />
                          <CommandList>
                            <CommandGroup>
                              {allContactsData
                                .filter((c) =>
                                  c.nome.toLowerCase().includes(contactSearch.toLowerCase()) ||
                                  c.email?.toLowerCase().includes(contactSearch.toLowerCase())
                                )
                                .map((contact) => (
                                  <CommandItem
                                    key={contact.id}
                                    value={contact.id}
                                    onSelect={() => handleSelectContact(contact)}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        selectedContact?.id === contact.id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <div className="flex-1">
                                      <p className="font-medium text-sm">{contact.nome}</p>
                                      {contact.email && (
                                        <p className="text-xs text-muted-foreground">{contact.email}</p>
                                      )}
                                    </div>
                                  </CommandItem>
                                ))}

                              {contactSearch &&
                                !allContactsData.some((c) =>
                                  c.nome.toLowerCase().includes(contactSearch.toLowerCase())
                                ) && (
                                  <CommandItem
                                    value="create"
                                    onSelect={handleCreateAndSelectContact}
                                  >
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    <span className="text-sm">
                                      Criar contato "{contactSearch}"
                                    </span>
                                  </CommandItem>
                                )}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>

                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Dados básicos
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="nome"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>
                          Nome Completo <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Digite o nome completo" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="telefone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone 1 - WhatsApp</FormLabel>
                        <FormControl>
                          <Input placeholder="Digite o telefone" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="telefone_2"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone 2 (Opcional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Digite o segundo telefone" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="empresa"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Empresa</FormLabel>
                        <FormControl>
                          <Input placeholder="Digite o nome da empresa" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="prioridade"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prioridade</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a prioridade" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {PRIORITIES.map((priority) => (
                              <SelectItem key={priority.value} value={priority.value}>
                                <span className={priority.color}>{priority.label}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="responsavel_id"
                    render={({ field }) => (
                      isAdmin ? (
                        <FormItem>
                          <FormLabel>Responsável</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o responsável" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {isLoadingUsers && (
                                <SelectItem value="loading_placeholder" disabled>
                                  Carregando usuários...
                                </SelectItem>
                              )}
                              {companyUsers.map((companyUser) => {
                                const fullName = [companyUser.first_name, companyUser.last_name]
                                  .filter(Boolean)
                                  .join(" ") || "Usuário sem nome";

                                return (
                                  <SelectItem key={companyUser.id} value={companyUser.id}>
                                    {fullName}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      ) : (
                        <FormItem className="hidden">
                          <FormControl>
                            <input type="hidden" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )
                    )}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Informações extras
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-mail</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="Digite o e-mail" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="segmento"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Segmento</FormLabel>
                        <FormControl>
                          <Input placeholder="Digite o segmento" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="valor_oportunidade"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor da oportunidade</FormLabel>
                        <FormControl>
                          <Input
                            inputMode="decimal"
                            placeholder="Digite o valor"
                            value={field.value ?? ""}
                            onChange={(event) => {
                              const rawValue = event.target.value.replace(/[^0-9.,]/g, "");
                              field.onChange(rawValue);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Pipeline & Stage Selector - New Multi-Funnel System */}
                  <div className="sm:col-span-2 space-y-4 pt-2 border-t">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Posição no Funil
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="pipeline_id"
                        render={({ field }) => {
                          return (
                            <FormItem>
                              <FormLabel>Funil</FormLabel>
                              <Select
                                value={field.value || ""}
                                onValueChange={(value) => {
                                  field.onChange(value || null);
                                  // Reset stage when pipeline changes
                                  form.setValue('stage_id', null);
                                }}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione um funil" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {pipelines.map((pipeline) => (
                                    <SelectItem key={pipeline.id} value={pipeline.id}>
                                      <div className="flex items-center gap-2">
                                        <div
                                          className="w-2.5 h-2.5 rounded-full"
                                          style={{ backgroundColor: pipeline.color || "#3B82F6" }}
                                        />
                                        {pipeline.name}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          );
                        }}
                      />

                      <FormField
                        control={form.control}
                        name="stage_id"
                        render={({ field }) => {
                          return (
                            <FormItem>
                              <FormLabel>Etapa</FormLabel>
                              <Select
                                value={field.value || ""}
                                onValueChange={(value) => field.onChange(value || null)}
                                disabled={!currentFormPipelineId}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder={currentFormPipelineId ? "Selecione uma etapa" : "Selecione um funil primeiro"} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {stages.map((stage) => (
                                    <SelectItem key={stage.id} value={stage.id}>
                                      <div className="flex items-center gap-2">
                                        <div
                                          className="w-2.5 h-2.5 rounded-full"
                                          style={{ backgroundColor: stage.color || "#6B7280" }}
                                        />
                                        {stage.name}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          );
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <FormField
                control={form.control}
                name="notas"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adicionar Nova Nota (Histórico)</FormLabel>
                    {recentNotes.length > 0 && (
                      <div className="mb-2 space-y-2 rounded-md border p-2 bg-muted/50">
                        <span className="text-xs font-semibold text-muted-foreground uppercase">Últimas notas:</span>
                        {recentNotes.map((note: any) => (
                          <div key={note.id} className="text-xs border-l-2 border-primary/20 pl-2">
                            <p className="line-clamp-2">{note.content}</p>
                            <span className="text-[10px] text-muted-foreground">
                              {format(new Date(note.created_at), "dd/MM HH:mm")} - {note.profiles?.first_name || "Usuário"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    <FormControl>
                      <Textarea
                        placeholder="Digite uma nova observação para adicionar ao histórico do cliente..."
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descreva o lead, oportunidade ou contexto..."
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags</FormLabel>
                    <FormControl>
                      <TagInput
                        value={field.value || []}
                        onChange={field.onChange}
                        placeholder="Digite e pressione Enter para adicionar..."
                        maxTags={10}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border bg-background">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
