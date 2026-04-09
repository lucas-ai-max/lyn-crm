import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Send, Info, XCircle, Paperclip, X, FileText, Mic, Square, ChevronRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { MessageBubble } from "./MessageBubble";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { messagesService, Message, MessageInsert, profilesService, leadsService, Conversa } from "@/services/supabase";
import { AttachmentData, extractBase64FromDataUrl, inferMediaType } from "@/utils/messageAttachments";
import { AudioRecorder } from "@/components/audio/AudioRecorder";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ConversationPanelProps {
  conversation: any;
  onMessageSent: () => void;
  onShowDetails: () => void;
  onClose: () => void;
}

type ConversationWithIntegration = Conversa & {
  integration_instances?: {
    name?: string | null;
  } | null;
};

const conversationStatusLabels: Record<string, string> = {
  novo: "Novo",
  em_andamento: "Em Processo",
  nao_respondida: "Não Respondida",
  finalizados: "Finalizados",
};

const conversationStatusColors: Record<string, string> = {
  novo: "bg-blue-500 hover:bg-blue-600",
  em_andamento: "bg-amber-500 hover:bg-amber-600",
  nao_respondida: "bg-red-500 hover:bg-red-600",
  finalizados: "bg-emerald-500 hover:bg-emerald-600",
};

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

export function ConversationPanel({ conversation, onMessageSent, onShowDetails, onClose }: ConversationPanelProps) {
  const { user } = useAuth();
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [attachment, setAttachment] = useState<AttachmentData | null>(null);
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  const [conversationStatus, setConversationStatus] = useState(conversation.status || "novo");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: () => profilesService.getProfile(user?.id),
    enabled: !!user?.id,
  });
  const { data: lead } = useQuery({
      queryKey: ["lead", conversation.lead.id],
      queryFn: () => leadsService.getById(conversation.lead.id),
      enabled: !!conversation.lead.id,
    });
  const { data: conversationDetails } = useQuery<ConversationWithIntegration>({
    queryKey: ["conversation", conversation.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lyn_conversas")
        .select("*, integration_instances(name)")
        .eq("id", conversation.id)
        .single();

      if (error) throw error;
      return data as ConversationWithIntegration;
    },
    enabled: !!conversation.id,
  });

  // Fetch messages
  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["conversation-messages", conversation.id],
    queryFn: async () => {
      return messagesService.listByConversation(conversation.id);
    },
    refetchInterval: 5000, // Poll every 5 segundos
  });

  const canSendMessages = conversation?.canSendMessages ?? Boolean(
    conversation.integration_instance_id || conversationDetails?.integration_instance_id
  );

  // Auto scroll to bottom
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

  const handleStatusChange = async (newStatus: string) => {
    try {
      const { error } = await supabase
        .from("lyn_conversas")
        .update({ status: newStatus })
        .eq("id", conversation.id);

      if (error) throw error;

      setConversationStatus(newStatus);
      toast({
        title: "Status atualizado",
        description: `Status alterado para: ${conversationStatusLabels[newStatus]}`,
      });

      // Atualiza a lista de conversas
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Falha ao atualizar o status",
        variant: "destructive",
      });
    }
  };

const handleSendMessage = async (e: React.FormEvent) => {
  e.preventDefault();
  const webhook_url = "https://n8neditor.iacompany.co/webhook/submitMessage";
  const messageContent = newMessage.trim();
  if (!canSendMessages) {
    toast({
      title: "Instância não configurada",
      description: "Associe uma instância de integração para enviar mensagens neste atendimento.",
      variant: "destructive",
    });
    return;
  }

  if ((!messageContent && !attachment) || !user?.id || isSending || !lead) return;

  setIsSending(true);
  let messageId: string | null = null;

  try {
    // Adiciona a mensagem ao Supabase com status 'sending'
    const { data: newMessageData, error: messageError } = await supabase
      .from('lyn_messages')
      .insert({
        conversa_id: conversation.id,
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
    
    // Atualiza o cache local imediatamente
    queryClient.setQueryData<Message[]>(["conversation-messages", conversation.id], (old = []) => [
      ...old,
      {
        ...newMessageData,
        // Garante que os campos obrigatórios estejam presentes
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
      conversa_id: conversation.id,
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
      integration_instance_name:
        conversationDetails?.integration_instances?.name ??
        conversation?.integration_instances?.name ??
        null,
    };

    try {
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
      queryClient.setQueryData<Message[]>(["conversation-messages", conversation.id], (old = []) =>
        old.map(msg => 
          msg.id === messageId 
            ? { ...msg, status: 'enviada', timestamp: new Date().toISOString() } 
            : msg
        )
      );

    } catch (webhookError) {
      console.error("Failed to send webhook:", webhookError);
      
      // Atualiza o status da mensagem para 'error' no Supabase
      await supabase
        .from('lyn_messages')
        .update({ status: 'error' })
        .eq('id', messageId);
      
      // Atualiza o cache local para mostrar o erro
      queryClient.setQueryData<Message[]>(["conversation-messages", conversation.id], (old = []) =>
        old.map(msg =>
          msg.id === messageId
            ? { ...msg, status: 'error' }
            : msg
        )
      );
      
      throw webhookError;
    } finally {
      setNewMessage("");
      removeAttachment();
      // Força uma nova busca para garantir que tudo está sincronizado
      await queryClient.invalidateQueries({ 
        queryKey: ["conversation-messages", conversation.id],
        refetchType: 'active'
      });
    }

  } catch (error: any) {
    toast({
      title: "Erro",
      description: error.message || "Falha ao enviar a mensagem",
      variant: "destructive",
    });
  } finally {
    setIsSending(false);
  }
};


  return (
    <>
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary">
                {getInitials(conversation.lead.nome)}
              </AvatarFallback>
            </Avatar>
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-background"></span>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">{conversation.lead.nome}</h3>
            <p className="text-sm text-muted-foreground">{conversation.lead.telefone}</p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={`gap-2 text-white border-0 ${conversationStatusColors[conversationStatus] || "bg-muted"}`}
              >
                {conversationStatusLabels[conversationStatus] || conversationStatus}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleStatusChange("novo")}>
                <Check className={`h-4 w-4 mr-2 ${conversationStatus === "novo" ? "opacity-100" : "opacity-0"}`} />
                Novo
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange("em_andamento")}>
                <Check className={`h-4 w-4 mr-2 ${conversationStatus === "em_andamento" ? "opacity-100" : "opacity-0"}`} />
                Em Processo
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange("nao_respondida")}>
                <Check className={`h-4 w-4 mr-2 ${conversationStatus === "nao_respondida" ? "opacity-100" : "opacity-0"}`} />
                Não Respondida
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange("finalizados")}>
                <Check className={`h-4 w-4 mr-2 ${conversationStatus === "finalizados" ? "opacity-100" : "opacity-0"}`} />
                Finalizados
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={onShowDetails}
            title="Ver Detalhes"
          >
            <Info className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={onClose}
            title="Fechar conversa"
          >
            <XCircle className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/20">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p>Nenhuma mensagem ainda. Inicie a conversa!</p>
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

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-border space-y-3">
        {!canSendMessages && (
          <Alert variant="destructive">
            <AlertTitle>Instância de integração ausente</AlertTitle>
            <AlertDescription>
              Para continuar o atendimento, selecione uma instância de integração disponível na lista de conversas ou nas configurações da empresa.
            </AlertDescription>
          </Alert>
        )}
        {showAudioRecorder && (
          <div className="mb-3">
            <AudioRecorder
              onRecordingComplete={handleAudioRecorded}
              onCancel={() => setShowAudioRecorder(false)}
            />
          </div>
        )}
        {attachment && (
          <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-3">
            <div className="flex items-center gap-3">
              {attachment.mediaType === "imageMessage" ? (
                <img
                  src={attachment.dataUrl}
                  alt={attachment.name}
                  className="h-12 w-12 rounded-md object-cover"
                />
              ) : attachment.mediaType === "audioMessage" ? (
                <audio
                  controls
                  src={attachment.dataUrl}
                  className="max-w-[220px]"
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
        <div className="flex gap-2 items-end">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={handleAttachmentChange}
            disabled={isSending || !canSendMessages}
          />
          <input
            ref={audioInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={handleAttachmentChange}
            disabled={isSending || !canSendMessages}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending || !canSendMessages}
            className="flex-shrink-0"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={showAudioRecorder ? "default" : "outline"}
            size="icon"
            onClick={() => setShowAudioRecorder(!showAudioRecorder)}
            disabled={isSending || !canSendMessages}
            className="flex-shrink-0"
          >
            {showAudioRecorder ? (
              <Square className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </Button>
          <Textarea
            placeholder="Digite sua mensagem..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
            className="flex-1 min-h-[44px] max-h-32 resize-none"
            rows={1}
            disabled={isSending || !canSendMessages}
          />
          <Button
            type="submit"
            size="icon"
            disabled={(!newMessage.trim() && !attachment) || isSending || !canSendMessages}
            className="flex-shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </>
  );
}
