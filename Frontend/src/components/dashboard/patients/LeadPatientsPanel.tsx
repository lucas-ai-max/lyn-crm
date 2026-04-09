import { useState } from "react";
import { format } from "date-fns";
import { Edit, FileText, Plus, Trash2, UserRound } from "lucide-react";

import { useDeletePatient, usePatients } from "@/hooks/usePatients";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Lead } from "@/services/supabase";
import type { Patient } from "@/services/patients";

import { PatientSheet } from "./PatientSheet";

interface LeadPatientsPanelProps {
  lead: Lead;
}

type PatientSheetMode = "create" | "view" | "edit";

const patientStatusLabels: Record<string, string> = {
  active: "Ativo",
  inactive: "Inativo",
  prospect: "Prospect",
};

export function LeadPatientsPanel({ lead }: LeadPatientsPanelProps) {
  const { toast } = useToast();
  const { data: patients = [], isLoading } = usePatients(lead.id);
  const deletePatientMutation = useDeletePatient(lead.id);

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<PatientSheetMode>("view");
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  const openCreateSheet = () => {
    setSelectedPatientId(null);
    setSheetMode("create");
    setIsSheetOpen(true);
  };

  const openPatientSheet = (patientId: string, mode: PatientSheetMode) => {
    setSelectedPatientId(patientId);
    setSheetMode(mode);
    setIsSheetOpen(true);
  };

  const handleDeletePatient = async (patient: Pick<Patient, "id" | "full_name">) => {
    const confirmed = window.confirm(
      `Tem certeza que deseja excluir o paciente "${patient.full_name}"?`,
    );
    if (!confirmed) return;

    try {
      await deletePatientMutation.mutateAsync(patient.id);
      toast({
        title: "Paciente excluido",
        description: "O cadastro do paciente foi removido com sucesso.",
      });

      if (selectedPatientId === patient.id) {
        setIsSheetOpen(false);
        setSelectedPatientId(null);
      }
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

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Pacientes vinculados</h3>
            <p className="text-sm text-muted-foreground">
              {patients.length} paciente{patients.length === 1 ? "" : "s"} neste lead profissional.
            </p>
          </div>
          <Button type="button" size="sm" className="gap-2" onClick={openCreateSheet}>
            <Plus className="h-4 w-4" />
            Adicionar paciente
          </Button>
        </div>

        {isLoading ? (
          <div className="flex min-h-[180px] items-center justify-center rounded-lg border border-dashed">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
          </div>
        ) : patients.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-muted/20 p-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <UserRound className="h-5 w-5" />
            </div>
            <p className="font-medium">Nenhum paciente cadastrado</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Cadastre subleads de pacientes para centralizar documentos e acompanhamento.
            </p>
            <Button type="button" variant="outline" className="mt-4" onClick={openCreateSheet}>
              Cadastrar primeiro paciente
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {patients.map((patient) => (
              <button
                key={patient.id}
                type="button"
                onClick={() => openPatientSheet(patient.id, "view")}
                className="w-full rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-muted/20"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{patient.full_name}</p>
                      <Badge variant="secondary">
                        {patientStatusLabels[patient.status] || patient.status}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span>{patient.email || "Sem e-mail"}</span>
                      <span>{patient.phone || "Sem telefone"}</span>
                      <span>
                        Criado em {format(new Date(patient.created_at), "dd/MM/yyyy")}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(event) => {
                        event.stopPropagation();
                        openPatientSheet(patient.id, "edit");
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleDeletePatient(patient);
                      }}
                      disabled={deletePatientMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {patient.notes ? (
                  <div className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                    {patient.notes}
                  </div>
                ) : (
                  <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    Sem observacoes registradas
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <PatientSheet
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        lead={lead}
        patientId={selectedPatientId}
        initialMode={sheetMode}
        onPatientCreated={(patientId) => {
          setSelectedPatientId(patientId);
          setSheetMode("view");
        }}
        onPatientDeleted={() => {
          setIsSheetOpen(false);
          setSelectedPatientId(null);
        }}
      />
    </>
  );
}
