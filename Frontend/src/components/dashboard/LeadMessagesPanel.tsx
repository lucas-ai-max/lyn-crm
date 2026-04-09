import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Send, Paperclip, X, FileText, Mic, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Message, Conversa, messagesService, profilesService, leadsService } from "@/services/supabase";
import { supabase } from "@/integrations/supabase/client";
import { MessageBubble } from "@/components/dashboard/conversations/MessageBubble";
import { Input } from "@/components/ui/input";
import { AttachmentData, inferMediaType, extractBase64FromDataUrl } from "@/utils/messageAttachments";
import { AudioRecorder } from "@/components/audio/AudioRecorder";

interface LeadMessagesPanelProps {
  conversationId: string;
  userId: string;
  leadId: string;
}

type ConversationWithIntegration = Conversa & {
  integration_instances?: {
    name?: string | null;
  } | null;
};

export function LeadMessagesPanel({ conversationId, userId, leadId }: LeadMessagesPanelProps) {
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [attachment, setAttachment] = useState<AttachmentData | null>(null);
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: profile } = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => profilesService.getProfile(userId),
    enabled: !!userId,
  });
  const { data: lead } = useQuery({
      queryKey: ["lead", leadId],
      queryFn: () => leadsService.getById(leadId),
      enabled: !!leadId,
    });
  const { data: conversationDetails } = useQuery<ConversationWithIntegration>({
    queryKey: ["conversation", conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lyn_conversas")
        .select("*, integration_instances(name)")
        .eq("id", conversationId)
        .single();

      if (error) throw error;
      return data as ConversationWithIntegration;
    },
    enabled: !!conversationId,
  });
  // Fetch messages
  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      return messagesService.listByConversation(conversationId);
    },
    enabled: !!conversationId,
    refetchInterval: 5000, 
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleAttachmentChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result as string;
      const { base64, mimeType } = extractBase64FromDataUrl(result);
      const resolvedMime = mimeType || file.type || "application/octet-stream";

      setAttachment({
        dataUrl: result,
        base64,
        mediaType: inferMediaType(resolvedMime),
        mimeType: resolvedMime,
        name: file.name,
      });
    };

    reader.onerror = () => {
      toast({
        title: "Erro ao carregar arquivo",
        description: "Não foi possível ler o arquivo selecionado.",
        variant: "destructive",
      });
    };

    reader.readAsDataURL(file);
  };

  const removeAttachment = () => {
    setAttachment(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (audioInputRef.current) {
      audioInputRef.current.value = "";
    }
  };

  const handleAudioRecorded = async (audioBlob: Blob) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      const result = reader.result as string;
      const { base64 } = extractBase64FromDataUrl(result);
      
      setAttachment({
        dataUrl: result,
        base64,
        mediaType: "audioMessage",
        mimeType: "audio/wav",
        name: `audio-${new Date().getTime()}.wav`,
      });
      setShowAudioRecorder(false);
    };

    reader.onerror = () => {
      toast({
        title: "Erro ao processar áudio",
        description: "Não foi possível processar a gravação de áudio.",
        variant: "destructive",
      });
      setShowAudioRecorder(false);
    };

    reader.readAsDataURL(audioBlob);
  };

const handleSendMessage = async (e: React.FormEvent) => {
  e.preventDefault();
  const webhook_url = "https://n8neditor.iacompany.co/webhook/submitMessage";
  const messageContent = newMessage.trim();
  if ((!messageContent && !attachment) || !conversationId || !lead) return;

  setIsSending(true);
  let messageId: string | null = null;

  try {
    const { data: newMessageData, error: messageError } = await supabase
      .from('lyn_messages')
      .insert({
        conversa_id: conversationId,
        incoming: false,
        body: messageContent || (attachment ? attachment.name : null),
        media_type: attachment ? attachment.mediaType : "conversation",
        media_base64: attachment ? attachment.base64 : null,
        status: 'enviando',
        timestamp: new Date().toISOString()
      })
      .select()
      .single();

    if (messageError) throw messageError;
    
    messageId = newMessageData.id;
    
    queryClient.setQueryData<Message[]>(["messages", conversationId], (old = []) => [
      ...old,
      {
        ...newMessageData,
        message_id: newMessageData.message_id || null,
        media_base64: newMessageData.media_base64 || null
      }
    ]);

    let telefone = lead?.telefone || '';
    telefone = telefone.replace('@s.whatsapp.net', '');
    if (telefone && telefone.length <= 11) {
      telefone = `55${telefone}`;
    }

    const payload: any = {
      conversa_id: conversationId,
      incoming: false,
      body: messageContent || null,
      media_type: attachment ? attachment.mediaType : "conversation",
      media_base64: attachment ? attachment.base64 : null,
      media_mime_type: attachment ? attachment.mimeType : null,
      media_name: attachment ? attachment.name : null,
      profile: profile,
      lead: {
        ...lead,
        telefone: telefone
      },
      integration_instance_name: conversationDetails?.integration_instances?.name || null,
    };

    // Envia o webhook
    await fetch(webhook_url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    // Atualiza o status da mensagem para 'enviada' no Supabase
    const { error: updateError } = await supabase
      .from('lyn_messages')
      .update({
        status: 'enviada',
        timestamp: new Date().toISOString()
      })
      .eq('id', messageId);

    if (updateError) throw updateError;

    // Atualiza o cache local
    queryClient.setQueryData<Message[]>(["messages", conversationId], (old = []) =>
      old.map(msg => 
        msg.id === messageId 
          ? { ...msg, status: 'enviada', timestamp: new Date().toISOString() } 
          : msg
      )
    );

    removeAttachment();

  } catch (error: any) {
    console.error("Error sending message:", error);
    
    // Atualiza o status da mensagem para 'error' no Supabase
    if (messageId) {
      try {
        await supabase
          .from('lyn_messages')
          .update({ status: 'error' })
          .eq('id', messageId);
        
        // Atualiza o cache local para mostrar o erro
        queryClient.setQueryData<Message[]>(["messages", conversationId], (old = []) =>
          old.map(msg =>
            msg.id === messageId
              ? { ...msg, status: 'error' }
              : msg
          )
        );
      } catch (updateError) {
        console.error("Error updating message status to error:", updateError);
      }
    }
    
    toast({
      title: "Erro",
      description: error.message || "Falha ao enviar a mensagem",
      variant: "destructive",
    });
    
    throw error;
  } finally {
    setNewMessage("");
    // Força uma nova busca para garantir que tudo está sincronizado
    try {
      await queryClient.invalidateQueries({ 
        queryKey: ["messages", conversationId],
        refetchType: 'active'
      });
    } catch (invalidateError) {
      console.error("Error invalidating queries:", invalidateError);
    }
    setIsSending(false);
  }
};


  return (
    <div className="flex-1 flex flex-col">
      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble 
              key={message.id} 
              message={message} 
              isFromUser={message.incoming === false} 
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t">
        {attachment && (
          <div className="mb-3 flex items-center justify-between rounded-lg border bg-muted/40 p-3">
            <div className="flex items-center gap-3">
              {attachment.mediaType === "imageMessage" ? (
                <img
                  src={attachment.dataUrl}
                  alt={attachment.name}
                  className="h-12 w-12 rounded-md object-cover"
                />
              ) : attachment.mediaType === "audioMessage" ? (
                <audio
                  src={attachment.dataUrl}
                  controls
                  className="h-12 w-full max-w-xs"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-muted">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-sm font-medium line-clamp-1">{attachment.name}</span>
                <span className="text-xs text-muted-foreground">{attachment.mimeType}</span>
              </div>
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={removeAttachment}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        
        {showAudioRecorder ? (
          <div className="mb-3">
            <AudioRecorder
              onRecordingComplete={handleAudioRecorded}
              onCancel={() => setShowAudioRecorder(false)}
            />
          </div>
        ) : (
          <form onSubmit={handleSendMessage} className="w-full">
            <div className="flex items-center gap-2 relative">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={handleAttachmentChange}
                disabled={isSending}
              />
              <input
                ref={audioInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={handleAttachmentChange}
                disabled={isSending}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSending}
                className="shrink-0"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              
              <div className="relative flex-1">
                <Input
                  placeholder="Escreva uma mensagem..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  disabled={isSending}
                  className={`w-full ${!newMessage.trim() && !attachment ? 'pr-10' : ''}`}
                />
                {!newMessage.trim() && !attachment && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowAudioRecorder(true)}
                    disabled={isSending}
                    className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground"
                  >
                    <Mic className="h-5 w-5" />
                  </Button>
                )}
              </div>
              
              {(newMessage.trim() || attachment) && (
                <Button
                  type="submit"
                  size="icon"
                  disabled={isSending}
                  className="bg-[#2563eb] hover:bg-[#1d4ed8] rounded-full"
                >
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
