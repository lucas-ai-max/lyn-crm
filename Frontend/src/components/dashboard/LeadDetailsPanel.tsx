import { useState } from "react";
import { format } from "date-fns";
import { Check, ChevronRight, Pencil, Trash2, Users, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { LeadPatientsPanel } from "@/components/dashboard/patients/LeadPatientsPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Lead, LeadNote, Profile } from "@/services/supabase";

interface LeadDetailsPanelProps {
  lead: Lead;
  responsible: Profile | null;
  onUpdate: () => void;
  activeTab?: "details" | "patients";
  onActiveTabChange?: (tab: "details" | "patients") => void;
}

const segmentColors: Record<string, string> = {
  Startup: "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20",
  SMB: "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20",
  Enterprise: "bg-blue-500/10 text-blue-600 hover:bg-blue-500/20",
  Other: "bg-gray-500/10 text-gray-600 hover:bg-gray-500/20",
};

export function LeadDetailsPanel({
  lead,
  responsible,
  onUpdate,
  activeTab = "details",
  onActiveTabChange,
}: LeadDetailsPanelProps) {
  const { toast } = useToast();
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);

  const profileData = profile as { status_type?: string[] } | null;
  const statusTypes =
    profileData?.status_type || ["Novos", "Qualificacao", "Objecao", "Negociacao", "Agendamento"];

  const { data: leadNotes = [] } = useQuery({
    queryKey: ["lead_notes", lead.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lyn_lead_notes")
        .select(`
          id,
          content,
          created_at,
          created_by,
          profiles:created_by (first_name, last_name)
        `)
        .eq("lead_id", lead.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching notes:", error);
        return [];
      }
      return data;
    },
    enabled: !!lead.id,
  });

  const handleEditNoteStart = (note: LeadNote) => {
    setEditingNoteId(note.id);
    setEditingContent(note.content ?? "");
  };

  const handleEditNoteCancel = () => {
    setEditingNoteId(null);
    setEditingContent("");
  };

  const handleEditNoteSave = async (note: LeadNote) => {
    const nextContent = editingContent.trim();
    if (!nextContent) {
      toast({
        title: "Nota vazia",
        description: "Digite um texto para salvar a nota.",
        variant: "destructive",
      });
      return;
    }

    if (nextContent === (note.content ?? "")) {
      handleEditNoteCancel();
      return;
    }

    setIsSavingNote(true);
    try {
      const { error } = await supabase
        .from("lyn_lead_notes")
        .update({ content: nextContent })
        .eq("id", note.id);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ["lead_notes", lead.id] });
      toast({
        title: "Nota atualizada",
        description: "A nota foi atualizada com sucesso.",
      });
      handleEditNoteCancel();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Falha ao salvar a nota.";
      toast({
        title: "Erro ao atualizar nota",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleDeleteNote = async (note: LeadNote) => {
    const confirmed = window.confirm("Tem certeza que deseja excluir esta nota?");
    if (!confirmed) return;

    setDeletingNoteId(note.id);
    try {
      const { error } = await supabase
        .from("lyn_lead_notes")
        .delete()
        .eq("id", note.id);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ["lead_notes", lead.id] });
      toast({
        title: "Nota excluida",
        description: "A nota foi removida do historico.",
      });

      if (editingNoteId === note.id) {
        handleEditNoteCancel();
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Falha ao excluir a nota.";
      toast({
        title: "Erro ao excluir nota",
        description: message,
        variant: "destructive",
      });
    } finally {
      setDeletingNoteId(null);
    }
  };

  const handleMoveStage = async (newStatus: string) => {
    try {
      const { error } = await supabase
        .from("lyn_leads")
        .update({ status: newStatus as never })
        .eq("id", lead.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Etapa do lead atualizada com sucesso.",
      });

      onUpdate();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Falha ao atualizar etapa.";
      toast({
        title: "Erro",
        description: message,
        variant: "destructive",
      });
    }
  };

  const renderLegacyNotes = () => {
    if (!lead.notas || (Array.isArray(lead.notas) && lead.notas.length === 0)) return null;

    const notesToRender = Array.isArray(lead.notas) ? lead.notas : [lead.notas];

    return (
      <div className="mb-4 space-y-2 opacity-80">
        <p className="text-xs font-semibold uppercase text-muted-foreground">Notas antigas</p>
        {notesToRender.map((note: string, idx: number) => (
          <div
            key={`legacy-${idx}`}
            className="rounded-md bg-muted p-3 text-sm whitespace-pre-wrap"
          >
            {note}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex h-full w-full max-w-[420px] flex-col border-r">
      <Tabs
        value={activeTab}
        onValueChange={(value) => onActiveTabChange?.(value as "details" | "patients")}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="border-b px-6 py-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Navegacao do lead
          </p>
          <TabsList className="grid h-auto w-full grid-cols-2 rounded-lg bg-muted p-1">
            <TabsTrigger
              value="details"
              className="gap-2 rounded-md py-2 data-[state=active]:bg-background"
            >
              Detalhes
            </TabsTrigger>
            <TabsTrigger
              value="patients"
              className="gap-2 rounded-md py-2 data-[state=active]:bg-background"
            >
              <Users className="h-4 w-4" />
              Pacientes
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="details" className="mt-0 min-h-0 flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-foreground">Onde ficam os PDFs?</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Os documentos ficam em <strong>Pacientes</strong>. Abra um paciente e depois a aba{" "}
                    <strong>Documentos</strong>.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="shrink-0 gap-2"
                  onClick={() => onActiveTabChange?.("patients")}
                >
                  Abrir Pacientes
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <h3 className="mb-4 text-sm font-semibold text-muted-foreground">
                INFORMACOES DO CLIENTE
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Nome</p>
                  <p className="font-medium">{lead.nome}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">E-mail</p>
                  <p className="font-medium">{lead.email || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Telefone 1 - WhatsApp</p>
                  <p className="font-medium">{lead.telefone || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Telefone 2</p>
                  <p className="font-medium">{lead.telefone_2 || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Empresa</p>
                  <p className="font-medium">{lead.empresa || "-"}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Segmento</p>
                    {lead.segmento ? (
                      <Badge
                        variant="secondary"
                        className={segmentColors[lead.segmento] || segmentColors.Other}
                      >
                        {lead.segmento}
                      </Badge>
                    ) : (
                      <span className="text-sm">-</span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Funil</p>
                    <p className="font-medium">{lead.funil || "-"}</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="mb-4 text-sm font-semibold text-muted-foreground">DETALHES</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Responsavel</p>
                  <p className="font-medium">
                    {responsible
                      ? `${responsible.first_name || ""} ${responsible.last_name || ""}`.trim() ||
                        "Nao atribuido"
                      : "Nao atribuido"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Adicionado em</p>
                  <p className="font-medium">
                    {format(new Date(lead.created_at), "dd 'de' MMMM 'de' yyyy")}
                  </p>
                </div>
                {lead.description ? (
                  <div>
                    <p className="mb-2 text-sm text-muted-foreground">Descricao</p>
                    <div className="rounded-md bg-muted p-3 text-sm whitespace-pre-wrap">
                      {lead.description}
                    </div>
                  </div>
                ) : null}
                {lead.tags && lead.tags.length > 0 ? (
                  <div>
                    <p className="mb-2 text-sm text-muted-foreground">Tags</p>
                    <div className="flex flex-wrap gap-1">
                      {lead.tags.map((tag: string, index: number) => (
                        <Badge key={`${tag}-${index}`} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div>
                  <p className="mb-2 text-sm text-muted-foreground">Notas</p>

                  {renderLegacyNotes()}

                  <div className="space-y-3">
                    {leadNotes.length === 0 && !lead.notas?.length ? (
                      <div className="text-sm italic text-muted-foreground">
                        Nenhuma nota cadastrada
                      </div>
                    ) : null}

                    {leadNotes.map((note: LeadNote & {
                      profiles?: { first_name?: string | null; last_name?: string | null } | null;
                    }) => {
                      const isEditing = editingNoteId === note.id;
                      const isBusy = isSavingNote || deletingNoteId === note.id;

                      return (
                        <div key={note.id} className="rounded-md bg-muted p-3 text-sm">
                          <div className="mb-1 flex items-start justify-between gap-3">
                            <div className="flex flex-col">
                              <span className="text-xs font-semibold text-primary">
                                {note.profiles?.first_name
                                  ? `${note.profiles.first_name} ${note.profiles.last_name || ""}`.trim()
                                  : "Usuario"}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(note.created_at), "dd/MM/yyyy HH:mm")}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {isEditing ? (
                                <>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => void handleEditNoteSave(note)}
                                    disabled={isSavingNote}
                                    aria-label="Salvar nota"
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={handleEditNoteCancel}
                                    disabled={isSavingNote}
                                    aria-label="Cancelar edicao"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => handleEditNoteStart(note)}
                                    disabled={isBusy}
                                    aria-label="Editar nota"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => void handleDeleteNote(note)}
                                    disabled={isBusy}
                                    aria-label="Excluir nota"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                          {isEditing ? (
                            <Textarea
                              value={editingContent}
                              onChange={(event) => setEditingContent(event.target.value)}
                              className="resize-none"
                              rows={3}
                            />
                          ) : (
                            <div className="whitespace-pre-wrap">{note.content}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="mb-4 text-sm font-semibold text-muted-foreground">ACOES</h3>
              <div className="space-y-3">
                <div>
                  <Label className="mb-2 text-sm text-muted-foreground">Etapa</Label>
                  <Select value={lead.status} onValueChange={handleMoveStage}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusTypes.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="patients" className="mt-0 min-h-0 flex-1 overflow-y-auto p-6">
          <LeadPatientsPanel lead={lead} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
