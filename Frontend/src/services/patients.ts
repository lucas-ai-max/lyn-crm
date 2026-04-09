import { supabase } from "@/integrations/supabase/client";
import type {
  Tables,
  TablesInsert,
  TablesUpdate,
} from "@/integrations/supabase/types";
import {
  PATIENT_DOCUMENT_BUCKET,
  PATIENT_DOCUMENT_MIME_TYPE,
  PatientDocumentType,
  buildPatientDocumentPath,
  validatePatientDocumentFile,
} from "@/lib/patients/files";
import { uploadPatientDocumentFile } from "@/lib/patients/upload";

export type Patient = Tables<"patients">;
export type PatientInsert = TablesInsert<"patients">;
export type PatientUpdate = TablesUpdate<"patients">;

export type PatientDocument = Tables<"patient_documents">;
export type PatientDocumentInsert = TablesInsert<"patient_documents">;
export type PatientDocumentUpdate = TablesUpdate<"patient_documents">;

export interface UploadPatientDocumentInput {
  patientId: string;
  companyId: string;
  file: File;
  documentType: PatientDocumentType;
  description?: string;
  onProgress?: (progress: number) => void;
}

function isStorageNotFoundError(error: { message?: string; statusCode?: string | number } | null) {
  if (!error) return false;
  const message = `${error.message || ""}`.toLowerCase();
  return message.includes("not found") || `${error.statusCode || ""}` === "404";
}

export const patientsService = {
  async listByLead(professionalLeadId: string) {
    const { data, error } = await supabase
      .from("lyn_patients")
      .select("*")
      .eq("professional_lead_id", professionalLeadId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []) as Patient[];
  },

  async getById(patientId: string) {
    const { data, error } = await supabase
      .from("lyn_patients")
      .select("*")
      .eq("id", patientId)
      .single();

    if (error) throw error;
    return data as Patient;
  },

  async create(payload: PatientInsert) {
    const { data, error } = await supabase
      .from("lyn_patients")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data as Patient;
  },

  async update(patientId: string, payload: PatientUpdate) {
    const { data, error } = await supabase
      .from("lyn_patients")
      .update(payload)
      .eq("id", patientId)
      .select()
      .single();

    if (error) throw error;
    return data as Patient;
  },

  async delete(patientId: string) {
    const { error } = await supabase
      .from("lyn_patients")
      .delete()
      .eq("id", patientId);

    if (error) throw error;
  },
};

export const patientDocumentsService = {
  async listByPatient(patientId: string) {
    const { data, error } = await supabase
      .from("lyn_patient_documents")
      .select("*")
      .eq("patient_id", patientId)
      .order("uploaded_at", { ascending: false });

    if (error) throw error;
    return (data || []) as PatientDocument[];
  },

  async create(payload: PatientDocumentInsert) {
    const { data, error } = await supabase
      .from("lyn_patient_documents")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data as PatientDocument;
  },

  async getSignedUrl(filePath: string, expiresInSeconds = 3600) {
    const { data, error } = await supabase.storage
      .from(PATIENT_DOCUMENT_BUCKET)
      .createSignedUrl(filePath, expiresInSeconds);

    if (error) throw error;
    return data.signedUrl;
  },

  async upload({
    patientId,
    companyId,
    file,
    documentType,
    description,
    onProgress,
  }: UploadPatientDocumentInput) {
    const validationError = validatePatientDocumentFile(file);
    if (validationError) {
      throw new Error(validationError);
    }

    const filePath = buildPatientDocumentPath(companyId, patientId, file.name);

    await uploadPatientDocumentFile({
      file,
      filePath,
      onProgress,
    });

    try {
      return await patientDocumentsService.create({
        company_id: companyId,
        patient_id: patientId,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        file_type: PATIENT_DOCUMENT_MIME_TYPE,
        document_type: documentType,
        description: description?.trim() || null,
      });
    } catch (error) {
      await supabase.storage.from(PATIENT_DOCUMENT_BUCKET).remove([filePath]).catch(() => undefined);
      throw error;
    }
  },

  async delete(document: Pick<PatientDocument, "id" | "file_path">) {
    const { error: storageError } = await supabase.storage
      .from(PATIENT_DOCUMENT_BUCKET)
      .remove([document.file_path]);

    if (storageError && !isStorageNotFoundError(storageError)) {
      throw storageError;
    }

    const { error } = await supabase
      .from("lyn_patient_documents")
      .delete()
      .eq("id", document.id);

    if (error) throw error;
  },
};
