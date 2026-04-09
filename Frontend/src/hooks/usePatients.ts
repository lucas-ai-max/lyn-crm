import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  patientDocumentsService,
  patientsService,
  type PatientDocument,
  type PatientInsert,
  type PatientUpdate,
  type UploadPatientDocumentInput,
} from "@/services/patients";

export const patientKeys = {
  all: ["patients"] as const,
  list: (leadId: string) => ["patients", leadId] as const,
  detail: (patientId: string) => ["patient", patientId] as const,
  documents: (patientId: string) => ["patient_documents", patientId] as const,
};

export function usePatients(leadId: string | undefined) {
  return useQuery({
    queryKey: leadId ? patientKeys.list(leadId) : patientKeys.all,
    queryFn: () => patientsService.listByLead(leadId!),
    enabled: !!leadId,
  });
}

export function usePatient(patientId: string | null) {
  return useQuery({
    queryKey: patientId ? patientKeys.detail(patientId) : ["patient"],
    queryFn: () => patientsService.getById(patientId!),
    enabled: !!patientId,
  });
}

export function usePatientDocuments(patientId: string | null) {
  return useQuery({
    queryKey: patientId ? patientKeys.documents(patientId) : ["patient_documents"],
    queryFn: () => patientDocumentsService.listByPatient(patientId!),
    enabled: !!patientId,
  });
}

export function useCreatePatient(leadId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: PatientInsert) => patientsService.create(payload),
    onSuccess: async (patient) => {
      if (leadId) {
        await queryClient.invalidateQueries({ queryKey: patientKeys.list(leadId) });
      }
      await queryClient.invalidateQueries({ queryKey: patientKeys.detail(patient.id) });
    },
  });
}

export function useUpdatePatient(leadId: string | undefined, patientId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: PatientUpdate) => patientsService.update(patientId!, payload),
    onSuccess: async (patient) => {
      if (leadId) {
        await queryClient.invalidateQueries({ queryKey: patientKeys.list(leadId) });
      }
      await queryClient.invalidateQueries({ queryKey: patientKeys.detail(patient.id) });
    },
  });
}

export function useDeletePatient(leadId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (patientId: string) => patientsService.delete(patientId),
    onSuccess: async (_, patientId) => {
      if (leadId) {
        await queryClient.invalidateQueries({ queryKey: patientKeys.list(leadId) });
      }
      await queryClient.removeQueries({ queryKey: patientKeys.detail(patientId) });
      await queryClient.removeQueries({ queryKey: patientKeys.documents(patientId) });
    },
  });
}

export function useUploadPatientDocument(leadId: string | undefined, patientId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UploadPatientDocumentInput) => patientDocumentsService.upload(payload),
    onSuccess: async () => {
      if (leadId) {
        await queryClient.invalidateQueries({ queryKey: patientKeys.list(leadId) });
      }
      if (patientId) {
        await queryClient.invalidateQueries({ queryKey: patientKeys.documents(patientId) });
      }
    },
  });
}

export function useDeletePatientDocument(leadId: string | undefined, patientId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (document: Pick<PatientDocument, "id" | "file_path">) =>
      patientDocumentsService.delete(document),
    onSuccess: async () => {
      if (leadId) {
        await queryClient.invalidateQueries({ queryKey: patientKeys.list(leadId) });
      }
      if (patientId) {
        await queryClient.invalidateQueries({ queryKey: patientKeys.documents(patientId) });
      }
    },
  });
}
