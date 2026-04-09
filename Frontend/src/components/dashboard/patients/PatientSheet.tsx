import { useEffect, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import {
  Download,
  Eye,
  FileText,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { z } from "zod";

import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  useCreatePatient,
  useDeletePatient,
  useDeletePatientDocument,
  usePatient,
  usePatientDocuments,
  useUpdatePatient,
  useUploadPatientDocument,
} from "@/hooks/usePatients";
import { useToast } from "@/hooks/use-toast";
import {
  MAX_PATIENT_DOCUMENT_SIZE_BYTES,
  PATIENT_DOCUMENT_TYPE_OPTIONS,
  PATIENT_GENDER_OPTIONS,
  PATIENT_STATUS_OPTIONS,
  formatPatientDocumentSize,
  getPatientDocumentTypeLabel,
  type PatientDocumentType,
  validatePatientDocumentFile,
} from "@/lib/patients/files";
import { cn } from "@/lib/utils";
import { patientDocumentsService, type PatientDocument } from "@/services/patients";
import type { Lead } from "@/services/supabase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const patientSchema = z.object({
  full_name: z.string().trim().min(1, "Nome completo e obrigatorio").max(120),
  email: z.string().trim().email("E-mail invalido").max(255).or(z.literal("")),
  phone: z.string().trim().max(50, "Telefone muito longo").optional().or(z.literal("")),
  date_of_birth: z.string().optional().or(z.literal("")),
  cpf: z.string().trim().max(20, "CPF muito longo").optional().or(z.literal("")),
  gender: z.union([z.literal(""), z.enum(["male", "female", "other"])]).default(""),
  status: z.enum(["active", "inactive", "prospect"]).default("active"),
  notes: z.string().trim().max(5000, "Observacoes muito longas").optional().or(z.literal("")),
});

type PatientFormData = z.infer<typeof patientSchema>;
type PatientSheetMode = "create" | "view" | "edit";
type PatientTab = "registration" | "documents";

interface PatientSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead;
  patientId: string | null;
  initialMode: PatientSheetMode;
  onPatientCreated: (patientId: string) => void;
  onPatientDeleted: () => void;
}

function getPatientFormValues(patient?: {
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  date_of_birth?: string | null;
  cpf?: string | null;
  gender?: string | null;
  status?: string | null;
  notes?: string | null;
} | null): PatientFormData {
  return {
    full_name: patient?.full_name || "",
    email: patient?.email || "",
    phone: patient?.phone || "",
    date_of_birth: patient?.date_of_birth || "",
    cpf: patient?.cpf || "",
    gender:
      patient?.gender === "male" || patient?.gender === "female" || patient?.gender === "other"
        ? patient.gender
        : "",
    status:
      patient?.status === "inactive" || patient?.status === "prospect"
        ? patient.status
        : "active",
    notes: patient?.notes || "",
  };
}

interface PatientDocumentUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  leadId: string;
  patientId: string;
}

function PatientDocumentUploadDialog({
  open,
  onOpenChange,
  companyId,
  leadId,
  patientId,
}: PatientDocumentUploadDialogProps) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = useUploadPatientDocument(leadId, patientId);

  const [documentType, setDocumentType] = useState<PatientDocumentType>("other");
  const [description, setDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    if (!open) {
      setDocumentType("other");
      setDescription("");
      setSelectedFile(null);
      setDragOver(false);
      setUploadProgress(0);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }, [open]);

  const handleFileSelection = (file: File | null) => {
    if (!file) return;

    const validationError = validatePatientDocumentFile(file);
    if (validationError) {
      toast({
        title: "Arquivo invalido",
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "Selecione um PDF",
        description: "Escolha um arquivo para enviar ao cadastro do paciente.",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploadProgress(0);
      await uploadMutation.mutateAsync({
        patientId,
        companyId,
        file: selectedFile,
        documentType,
        description,
        onProgress: setUploadProgress,
      });

      toast({
        title: "Documento enviado",
        description: "O PDF foi salvo no cadastro do paciente.",
      });
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Nao foi possivel concluir o upload.";
      toast({
        title: "Erro no upload",
        description: message,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !uploadMutation.isPending && onOpenChange(nextOpen)}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Enviar documento PDF</DialogTitle>
          <DialogDescription>
            Envie um PDF de ate 10 MB. O arquivo ficara armazenado em bucket privado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                inputRef.current?.click();
              }
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragOver(false);
              handleFileSelection(event.dataTransfer.files?.[0] || null);
            }}
            className={cn(
              "rounded-xl border-2 border-dashed p-6 text-center transition-colors",
              dragOver
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50",
            )}
          >
            <Upload className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="font-medium">Arraste o PDF aqui ou clique para selecionar</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Apenas arquivos PDF, limite de{" "}
              {Math.round(MAX_PATIENT_DOCUMENT_SIZE_BYTES / (1024 * 1024))} MB.
            </p>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(event) => handleFileSelection(event.target.files?.[0] || null)}
            />
          </div>

          {selectedFile ? (
            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatPatientDocumentSize(selectedFile.size)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedFile(null)}
                  disabled={uploadMutation.isPending}
                >
                  Remover
                </Button>
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <FormLabel>Tipo do documento</FormLabel>
              <Select
                value={documentType}
                onValueChange={(value) => setDocumentType(value as PatientDocumentType)}
                disabled={uploadMutation.isPending}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PATIENT_DOCUMENT_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <FormLabel>Descricao</FormLabel>
              <Input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Ex.: ficha assinada"
                disabled={uploadMutation.isPending}
              />
            </div>
          </div>

          {(uploadMutation.isPending || uploadProgress > 0) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Progresso do upload</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={uploadMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => void handleUpload()}
            disabled={!selectedFile || uploadMutation.isPending}
          >
            {uploadMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              "Enviar documento"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PatientSheet({
  open,
  onOpenChange,
  lead,
  patientId,
  initialMode,
  onPatientCreated,
  onPatientDeleted,
}: PatientSheetProps) {
  const { toast } = useToast();
  const { companyId: authCompanyId } = useAuth();
  const isMobile = useIsMobile();

  const resolvedCompanyId = lead.company_id ?? authCompanyId ?? null;

  const { data: patient, isLoading: isPatientLoading } = usePatient(patientId);
  const { data: documents = [], isLoading: isDocumentsLoading } = usePatientDocuments(patientId);

  const createPatientMutation = useCreatePatient(lead.id);
  const updatePatientMutation = useUpdatePatient(lead.id, patientId);
  const deletePatientMutation = useDeletePatient(lead.id);
  const deleteDocumentMutation = useDeletePatientDocument(lead.id, patientId);

  const [mode, setMode] = useState<PatientSheetMode>(initialMode);
  const [activeTab, setActiveTab] = useState<PatientTab>("registration");
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [busyDocumentId, setBusyDocumentId] = useState<string | null>(null);

  const form = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: getPatientFormValues(),
  });

  useEffect(() => {
    if (!open) return;
    setMode(initialMode);
    setActiveTab("registration");
  }, [initialMode, open, patientId]);

  useEffect(() => {
    if (!open) return;
    form.reset(getPatientFormValues(patient));
  }, [form, open, patient]);

  const isViewMode = mode === "view";
  const isSaving = createPatientMutation.isPending || updatePatientMutation.isPending;

  const handleSavePatient = form.handleSubmit(async (values) => {
    if (!resolvedCompanyId) {
      toast({
        title: "Empresa nao encontrada",
        description: "Nao foi possivel identificar a empresa deste lead.",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      company_id: resolvedCompanyId,
      professional_lead_id: lead.id,
      full_name: values.full_name.trim(),
      email: values.email.trim() || null,
      phone: values.phone?.trim() || null,
      date_of_birth: values.date_of_birth || null,
      cpf: values.cpf?.trim() || null,
      gender: values.gender || null,
      status: values.status,
      notes: values.notes?.trim() || null,
    };

    try {
      if (mode === "create") {
        const createdPatient = await createPatientMutation.mutateAsync(payload);
        toast({
          title: "Paciente criado",
          description: "O novo paciente foi vinculado ao lead profissional.",
        });
        onPatientCreated(createdPatient.id);
      } else if (patientId) {
        await updatePatientMutation.mutateAsync(payload);
        toast({
          title: "Paciente atualizado",
          description: "As informacoes do paciente foram salvas.",
        });
      }

      setMode("view");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Nao foi possivel salvar o paciente.";
      toast({
        title: "Erro ao salvar paciente",
        description: message,
        variant: "destructive",
      });
    }
  });

  const handleDeletePatient = async () => {
    if (!patientId || !patient) return;

    const confirmed = window.confirm(
      `Tem certeza que deseja excluir o paciente "${patient.full_name}"?`,
    );
    if (!confirmed) return;

    try {
      await deletePatientMutation.mutateAsync(patientId);
      toast({
        title: "Paciente excluido",
        description: "O cadastro do paciente e seus documentos foram removidos.",
      });
      onPatientDeleted();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Nao foi possivel excluir o paciente.";
      toast({
        title: "Erro ao excluir paciente",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleOpenDocument = async (
    document: PatientDocument,
    action: "view" | "download",
  ) => {
    try {
      setBusyDocumentId(document.id);
      const signedUrl = await patientDocumentsService.getSignedUrl(document.file_path);

      if (action === "download") {
        const link = window.document.createElement("a");
        link.href = signedUrl;
        link.download = document.file_name;
        window.document.body.appendChild(link);
        link.click();
        link.remove();
        return;
      }

      window.open(signedUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Nao foi possivel abrir o documento.";
      toast({
        title: "Erro ao acessar documento",
        description: message,
        variant: "destructive",
      });
    } finally {
      setBusyDocumentId(null);
    }
  };

  const handleDeleteDocument = async (document: PatientDocument) => {
    const confirmed = window.confirm(
      `Excluir o documento "${document.file_name}" do cadastro do paciente?`,
    );
    if (!confirmed) return;

    try {
      setBusyDocumentId(document.id);
      await deleteDocumentMutation.mutateAsync({
        id: document.id,
        file_path: document.file_path,
      });
      toast({
        title: "Documento excluido",
        description: "O PDF foi removido do Storage e do cadastro do paciente.",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Nao foi possivel excluir o documento.";
      toast({
        title: "Erro ao excluir documento",
        description: message,
        variant: "destructive",
      });
    } finally {
      setBusyDocumentId(null);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className={cn(
            "flex h-full w-full flex-col p-0",
            isMobile ? "max-w-none" : "sm:max-w-2xl",
          )}
        >
          <div className="border-b px-6 py-4 pr-12">
            <SheetHeader className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <SheetTitle>
                    {patient?.full_name || (mode === "create" ? "Novo paciente" : "Paciente")}
                  </SheetTitle>
                  <SheetDescription>
                    {mode === "create"
                      ? "Cadastre os dados do paciente vinculado ao lead profissional."
                      : "Gerencie cadastro e documentos PDF do paciente."}
                  </SheetDescription>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">
                  {patient ? (
                    <Badge variant="secondary">
                      {PATIENT_STATUS_OPTIONS.find((option) => option.value === patient.status)?.label ||
                        patient.status}
                    </Badge>
                  ) : null}

                  {mode === "view" && patient ? (
                    <Button type="button" variant="outline" size="sm" onClick={() => setMode("edit")}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar
                    </Button>
                  ) : null}

                  {patient ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => void handleDeletePatient()}
                      disabled={deletePatientMutation.isPending}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir
                    </Button>
                  ) : null}
                </div>
              </div>
            </SheetHeader>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as PatientTab)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="border-b px-6">
              <TabsList className="h-12 rounded-none bg-transparent p-0">
                <TabsTrigger
                  value="registration"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  Cadastro
                </TabsTrigger>
                <TabsTrigger
                  value="documents"
                  disabled={!patientId}
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  Documentos
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="registration" className="mt-0 min-h-0 flex-1 overflow-y-auto p-6">
              {isPatientLoading && patientId ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={handleSavePatient} className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="full_name"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Nome completo</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                readOnly={isViewMode}
                                placeholder="Nome do paciente"
                              />
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
                            <FormLabel>E-mail</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="email"
                                readOnly={isViewMode}
                                placeholder="paciente@exemplo.com"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Telefone</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                readOnly={isViewMode}
                                placeholder="(00) 00000-0000"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="cpf"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CPF</FormLabel>
                            <FormControl>
                              <Input {...field} readOnly={isViewMode} placeholder="000.000.000-00" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="date_of_birth"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Data de nascimento</FormLabel>
                            <FormControl>
                              <Input {...field} type="date" readOnly={isViewMode} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="gender"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Genero</FormLabel>
                            <Select
                              value={field.value || "__empty__"}
                              onValueChange={(value) =>
                                field.onChange(value === "__empty__" ? "" : value)
                              }
                              disabled={isViewMode}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecionar" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="__empty__">Nao informar</SelectItem>
                                {PATIENT_GENDER_OPTIONS.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
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
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Status</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                              disabled={isViewMode}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {PATIENT_STATUS_OPTIONS.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
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
                        name="notes"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Observacoes</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                readOnly={isViewMode}
                                rows={5}
                                placeholder="Anotacoes clinicas ou administrativas"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {patient?.created_at ? (
                      <div className="rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">
                        Cadastro criado em {format(new Date(patient.created_at), "dd/MM/yyyy HH:mm")}
                        {patient.updated_at
                          ? ` • ultima atualizacao em ${format(new Date(patient.updated_at), "dd/MM/yyyy HH:mm")}`
                          : ""}
                      </div>
                    ) : null}

                    {!isViewMode ? (
                      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            if (patient) {
                              form.reset(getPatientFormValues(patient));
                              setMode("view");
                              return;
                            }
                            onOpenChange(false);
                          }}
                          disabled={isSaving}
                        >
                          Cancelar
                        </Button>
                        <Button type="submit" disabled={isSaving}>
                          {isSaving ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Salvando...
                            </>
                          ) : mode === "create" ? (
                            "Criar paciente"
                          ) : (
                            "Salvar alteracoes"
                          )}
                        </Button>
                      </div>
                    ) : null}
                  </form>
                </Form>
              )}
            </TabsContent>

            <TabsContent value="documents" className="mt-0 min-h-0 flex-1 overflow-y-auto p-6">
              {!patientId ? (
                <div className="rounded-xl border border-dashed bg-muted/20 p-6 text-center">
                  <p className="font-medium">Salve o paciente antes de anexar documentos</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    O bucket privado depende do identificador final do paciente.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold">Documentos do paciente</h3>
                      <p className="text-sm text-muted-foreground">
                        PDFs privados com acesso via signed URL temporaria.
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      className="gap-2"
                      onClick={() => setIsUploadDialogOpen(true)}
                      disabled={!resolvedCompanyId}
                    >
                      <Plus className="h-4 w-4" />
                      Fazer upload
                    </Button>
                  </div>

                  {isDocumentsLoading ? (
                    <div className="flex min-h-[180px] items-center justify-center rounded-lg border border-dashed">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : documents.length === 0 ? (
                    <div className="rounded-xl border border-dashed bg-muted/20 p-6 text-center">
                      <FileText className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                      <p className="font-medium">Nenhum PDF enviado</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Adicione fichas, termos, exames e outros documentos deste paciente.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {documents.map((document) => (
                        <div
                          key={document.id}
                          className="rounded-xl border bg-card p-4"
                        >
                          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-medium">{document.file_name}</p>
                                <Badge variant="secondary">
                                  {getPatientDocumentTypeLabel(document.document_type)}
                                </Badge>
                              </div>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                <span>{formatPatientDocumentSize(document.file_size)}</span>
                                <span>
                                  Enviado em{" "}
                                  {format(new Date(document.uploaded_at), "dd/MM/yyyy HH:mm")}
                                </span>
                              </div>
                              {document.description ? (
                                <p className="text-sm text-muted-foreground">
                                  {document.description}
                                </p>
                              ) : null}
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => void handleOpenDocument(document, "view")}
                                disabled={busyDocumentId === document.id}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                Visualizar
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => void handleOpenDocument(document, "download")}
                                disabled={busyDocumentId === document.id}
                              >
                                <Download className="mr-2 h-4 w-4" />
                                Baixar
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => void handleDeleteDocument(document)}
                                disabled={busyDocumentId === document.id || deleteDocumentMutation.isPending}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      {resolvedCompanyId && patientId ? (
        <PatientDocumentUploadDialog
          open={isUploadDialogOpen}
          onOpenChange={setIsUploadDialogOpen}
          companyId={resolvedCompanyId}
          leadId={lead.id}
          patientId={patientId}
        />
      ) : null}
    </>
  );
}
