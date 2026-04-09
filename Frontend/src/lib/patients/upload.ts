import * as tus from "tus-js-client";

import { supabase } from "@/integrations/supabase/client";
import {
  PATIENT_DOCUMENT_BUCKET,
  PATIENT_DOCUMENT_MIME_TYPE,
} from "@/lib/patients/files";

interface UploadPatientDocumentFileOptions {
  file: File;
  filePath: string;
  onProgress?: (progress: number) => void;
}

export async function uploadPatientDocumentFile({
  file,
  filePath,
  onProgress,
}: UploadPatientDocumentFileOptions): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;

  const accessToken = data.session?.access_token;
  if (!accessToken) {
    throw new Error("Sessao expirada. Faca login novamente para enviar o PDF.");
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !publishableKey) {
    throw new Error("Variaveis de ambiente do Supabase nao encontradas.");
  }

  return await new Promise<string>((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint: `${supabaseUrl}/storage/v1/upload/resumable`,
      retryDelays: [0, 1000, 3000, 5000],
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      chunkSize: 6 * 1024 * 1024,
      headers: {
        authorization: `Bearer ${accessToken}`,
        apikey: publishableKey,
        "x-upsert": "false",
      },
      metadata: {
        bucketName: PATIENT_DOCUMENT_BUCKET,
        objectName: filePath,
        contentType: PATIENT_DOCUMENT_MIME_TYPE,
        cacheControl: "3600",
      },
      onError: (uploadError) => {
        reject(uploadError);
      },
      onProgress: (bytesUploaded, bytesTotal) => {
        if (!bytesTotal) return;
        const progress = Math.min(
          100,
          Math.max(0, Math.round((bytesUploaded / bytesTotal) * 100)),
        );
        onProgress?.(progress);
      },
      onSuccess: () => {
        onProgress?.(100);
        resolve(filePath);
      },
    });

    upload
      .findPreviousUploads()
      .then((previousUploads) => {
        if (previousUploads.length > 0) {
          upload.resumeFromPreviousUpload(previousUploads[0]);
        }
        upload.start();
      })
      .catch(() => {
        upload.start();
      });
  });
}
