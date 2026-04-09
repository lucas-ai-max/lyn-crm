import type { Message } from "@/services/supabase";

export type AttachmentData = {
  dataUrl: string;
  base64: string;
  mediaType: Message["media_type"];
  mimeType: string;
  name: string;
};

export const inferMediaType = (mime: string): Message["media_type"] => {
  if (mime.startsWith("image")) return "imageMessage";
  if (mime.startsWith("audio")) return "audioMessage";
  if (mime === "application/pdf" || mime.startsWith("application")) return "documentMessage";
  return "documentMessage";
};

export const extractBase64FromDataUrl = (dataUrl: string) => {
  const commaIndex = dataUrl.indexOf(",");
  if (commaIndex === -1) {
    return {
      base64: dataUrl,
      mimeType: "",
    };
  }

  const metadata = dataUrl.substring(5, commaIndex);
  const mimeMatch = metadata.match(/^(.*?);/);

  return {
    base64: dataUrl.substring(commaIndex + 1),
    mimeType: mimeMatch ? mimeMatch[1] : "",
  };
};
