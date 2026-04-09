import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Check, AlertCircle, Loader2, FileText } from "lucide-react";

import type { Message } from "@/services/supabase";

interface MessageBubbleProps {
  message: Message;
  isFromUser: boolean;
}

export function MessageBubble({ message, isFromUser }: MessageBubbleProps) {
  const messageTime = message.timestamp
    ? format(new Date(message.timestamp), "HH:mm")
    : "";
  const hasFile = !!message.media_base64;
  const hasMessage = !!message.body;


  const mediaBase64 = message.media_base64 || "";
  const hasDataUrlPrefix = mediaBase64.startsWith("data:");

  const extractMimeType = () => {
    if (!hasDataUrlPrefix) return null;
    const match = mediaBase64.match(/^data:(.*?);/);
    return match ? match[1] : null;
  };

  const getDataUrl = (fallbackMime: string) => {
    if (!mediaBase64) return "";
    return hasDataUrlPrefix ? mediaBase64 : `data:${fallbackMime};base64,${mediaBase64}`;
  };

  const mimeType = extractMimeType();

  const renderContent = () => {
    if (!hasFile) return null;

    switch (message.media_type) {
      case "imageMessage":
        return (
          <img
            src={getDataUrl(mimeType || "image/png")}
            alt={message.body || "Imagem enviada"}
            className="max-w-xs rounded-lg shadow-sm"
          />
        );

      case "audioMessage":
        return (
          <audio
            controls
            src={getDataUrl(mimeType || "audio/mpeg")}
            className="mt-1"
          />
        );

      case "documentMessage":
        return (
          <a
            href={getDataUrl(mimeType || "application/octet-stream")}
            download={message.body ? `${message.body}` : `documento-${message.id}`}
            className="p-3 rounded-md border bg-white flex items-center gap-3 hover:bg-muted transition cursor-pointer"
            target="_blank"
            rel="noopener noreferrer"
          >
            <FileText className="h-6 w-6 text-primary" />
            <div className="flex flex-col text-left">
              <span className="text-sm font-medium truncate max-w-[180px]">
                {message.body || "Documento anexado"}
              </span>
              {mimeType && (
                <span className="text-xs text-muted-foreground">{mimeType}</span>
              )}
            </div>
          </a>
        );

      default:
        return null;
    }
  };

  return (
    <div className={cn("flex", isFromUser ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[70%] space-y-1")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5",
            isFromUser
              ? "bg-primary text-primary-foreground rounded-br-sm"
              : "bg-background text-foreground rounded-bl-sm border border-border"
          )}
        >
          {hasFile ? renderContent() : null}
          {hasMessage && (
            <p className="text-sm whitespace-pre-wrap break-words">
              {message.body}
            </p>
          )}
        </div>
        <div
          className={cn(
            "text-xs text-muted-foreground px-2",
            isFromUser ? "text-right" : "text-left"
          )}
        >
          {messageTime}
          {message.status === 'enviada' && (
            <Check className="inline-block w-3 h-3 ml-1 text-muted-foreground" />
          )}
          {message.status === 'enviando' && (
            <Loader2 className="inline-block w-3 h-3 ml-1 text-muted-foreground animate-spin" />
          )}
          {message.status === 'error' && (
            <AlertCircle className="inline-block w-3 h-3 ml-1 text-destructive" />
          )}
        </div>
      </div>
    </div>
  );
}