export const PATIENT_DOCUMENT_BUCKET = "lyn-patient-documents";
export const MAX_PATIENT_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024;
export const PATIENT_DOCUMENT_MIME_TYPE = "application/pdf";

export const PATIENT_STATUS_OPTIONS = [
  { value: "active", label: "Ativo" },
  { value: "inactive", label: "Inativo" },
  { value: "prospect", label: "Prospect" },
] as const;

export const PATIENT_GENDER_OPTIONS = [
  { value: "male", label: "Masculino" },
  { value: "female", label: "Feminino" },
  { value: "other", label: "Outro" },
] as const;

export const PATIENT_DOCUMENT_TYPE_OPTIONS = [
  { value: "acceptance_form", label: "Ficha de aceitação" },
  { value: "consent_form", label: "Termo de consentimento" },
  { value: "medical_record", label: "Prontuário" },
  { value: "exam", label: "Exame" },
  { value: "contract", label: "Contrato" },
  { value: "other", label: "Outro" },
] as const;

export type PatientStatus = (typeof PATIENT_STATUS_OPTIONS)[number]["value"];
export type PatientGender = (typeof PATIENT_GENDER_OPTIONS)[number]["value"];
export type PatientDocumentType = (typeof PATIENT_DOCUMENT_TYPE_OPTIONS)[number]["value"];

export function sanitizePatientDocumentName(fileName: string): string {
  const withoutExtension = fileName.replace(/\.pdf$/i, "");
  const normalized = withoutExtension
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  return `${normalized || "documento"}.pdf`;
}

export function buildPatientDocumentPath(
  companyId: string,
  patientId: string,
  fileName: string,
  timestamp = Date.now(),
): string {
  return `${companyId}/${patientId}/${timestamp}-${sanitizePatientDocumentName(fileName)}`;
}

export function validatePatientDocumentFile(file: File): string | null {
  const isPdf = file.type === PATIENT_DOCUMENT_MIME_TYPE || /\.pdf$/i.test(file.name);

  if (!isPdf) {
    return "Envie apenas arquivos PDF.";
  }

  if (file.size > MAX_PATIENT_DOCUMENT_SIZE_BYTES) {
    return "Arquivo muito grande. O limite e 10 MB.";
  }

  return null;
}

export function formatPatientDocumentSize(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getPatientDocumentTypeLabel(type: string | null | undefined): string {
  return (
    PATIENT_DOCUMENT_TYPE_OPTIONS.find((option) => option.value === type)?.label ||
    "Outro"
  );
}
