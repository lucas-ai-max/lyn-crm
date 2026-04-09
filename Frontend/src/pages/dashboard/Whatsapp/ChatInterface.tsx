import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { whatsappService } from "@/services/whatsappService";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Phone, Video, Search, Filter, Paperclip, X, FileText, Image as ImageIcon, Music, Film, Loader2, ArrowLeft } from "lucide-react";
import { getInstanceColor } from "@/utils/instanceColors";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import { ChatSidebar } from "./ChatSidebar";
import { MessageContent } from "@/components/chat/MessageContent";
import { MessageBubble } from "@/components/chat/MessageBubble";
import "@/components/chat/Chat.css";

import { Lead } from "@/services/supabase";
import { useNotifications } from "@/hooks/useNotifications";
import { QuickReplyPicker } from "@/components/chat/QuickReplyPicker";
import { replaceTemplateVariables } from "@/hooks/useQuickReplies";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";

const normalizePhone = (value?: string | null) => {
    if (!value) return "";
    return value.replace(/@s\.whatsapp\.net$/i, "").replace(/\D/g, "");
};

const buildPhoneCandidates = (value?: string | null) => {
    if (!value) return [];
    const raw = String(value).trim();
    const digits = normalizePhone(raw);
    const withJid = digits ? `${digits}@s.whatsapp.net` : "";
    return Array.from(new Set([raw, digits, withJid].filter(Boolean)));
};

const getChatPhone = (chat: any) => {
    const jid = chat?.whatsapp_contacts?.remote_jid || chat?.remote_jid || "";
    if (jid.includes("@g.us")) return "";
    return normalizePhone(jid);
};

const getDisplayName = (chat: any, leadOverride?: Lead | null) => {
    const leadName = leadOverride?.nome || chat?.lead?.nome;
    const contactName = chat?.whatsapp_contacts?.saved_name || chat?.whatsapp_contacts?.contact_name;
    const pushName = chat?.whatsapp_contacts?.push_name || chat?.whatsapp_contacts?.name;
    const fallback = getChatPhone(chat) || chat?.remote_jid || chat?.whatsapp_contacts?.remote_jid;
    return leadName || contactName || pushName || fallback || "Desconhecido";
};

const getDisplayPhone = (chat: any) => {
    return getChatPhone(chat) || chat?.remote_jid || chat?.whatsapp_contacts?.remote_jid || "";
};

const getInitials = (name: string) => {
    const trimmed = name?.trim();
    if (!trimmed) return "?";
    const letters = trimmed
        .split(/\s+/)
        .map((part) => part[0])
        .join("")
        .slice(0, 2);
    return letters.toUpperCase();
};

export default function ChatInterface() {
    const [chats, setChats] = useState<any[]>([]);
    const [filteredChats, setFilteredChats] = useState<any[]>([]);
    const [instances, setInstances] = useState<any[]>([]);
    const [selectedInstanceId, setSelectedInstanceId] = useState<string>("all");
    const [selectedChat, setSelectedChat] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [currentLead, setCurrentLead] = useState<Lead | null>(null);
    // Media attachment state
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [mediaPreview, setMediaPreview] = useState<{ url: string; type: string } | null>(null);
    const [isSending, setIsSending] = useState(false);
    const [isEnsuringChat, setIsEnsuringChat] = useState(false); // Loading state for get-or-create

    // Quick Reply state
    const [showQuickReplyPicker, setShowQuickReplyPicker] = useState(false);
    const { user } = useAuth();
    const { data: profile } = useProfile();

    // Ref to track selected chat for realtime subscription without re-subscribing
    const selectedChatRef = useRef<any>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();
    const { notify } = useNotifications();
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const leadId = searchParams.get('leadId');

    const attachLeadsToChats = async (chatData: any[]) => {
        if (!chatData || chatData.length === 0) return [];

        const companyPhones = new Map<string, Set<string>>();

        chatData.forEach((chat) => {
            const companyId = chat.whatsapp_instances?.company_id;
            if (!companyId) return;

            const remoteJid = chat.whatsapp_contacts?.remote_jid || chat.remote_jid;
            const candidates = buildPhoneCandidates(remoteJid);

            if (!companyPhones.has(companyId)) {
                companyPhones.set(companyId, new Set());
            }

            const phoneSet = companyPhones.get(companyId)!;
            candidates.forEach((candidate) => phoneSet.add(candidate));
        });

        const leadsByKey = new Map<string, Lead>();

        for (const [companyId, phonesSet] of companyPhones.entries()) {
            const phones = Array.from(phonesSet);
            if (phones.length === 0) continue;

            const { data: leadsData, error } = await supabase
                .from('lyn_leads')
                .select('id, nome, telefone, tags, company_id')
                .eq('company_id', companyId)
                .in('telefone', phones);

            if (error) {
                console.error("[ChatInterface] Error fetching leads for chats:", error);
                continue;
            }

            (leadsData || []).forEach((lead: any) => {
                const normalized = normalizePhone(lead.telefone || "") || lead.telefone || "";
                if (!normalized) return;
                leadsByKey.set(`${companyId}:${normalized}`, lead as Lead);
            });
        }

        return chatData.map((chat) => {
            const companyId = chat.whatsapp_instances?.company_id;
            const phoneKey = getChatPhone(chat);
            const lead = companyId && phoneKey ? leadsByKey.get(`${companyId}:${phoneKey}`) : null;
            return { ...chat, lead: lead || null };
        });
    };

    // Keep ref in sync
    useEffect(() => {
        selectedChatRef.current = selectedChat;
    }, [selectedChat]);

    // Handle leadId param to Get or Create Conversation
    useEffect(() => {
        if (!leadId || isEnsuringChat || selectedChat?.id) return;

        const ensureConversation = async () => {
            setIsEnsuringChat(true);
            try {
                // 1. Fetch Lead
                const { data: lead, error: leadError } = await supabase
                    .from('lyn_leads')
                    .select('*')
                    .eq('id', leadId)
                    .single();

                if (leadError || !lead) {
                    throw new Error("Lead não encontrado");
                }

                if (!lead.telefone) {
                    throw new Error("Lead sem telefone cadastrado");
                }

                // 2. Format remote_jid
                const cleanPhone = normalizePhone(lead.telefone);
                if (!cleanPhone) {
                    throw new Error("Lead sem telefone cadastrado");
                }
                const remoteJid = `${cleanPhone}@s.whatsapp.net`;

                // 3. Check if chat already exists in loaded chats
                const existingChatInState = chats.find(c =>
                    c.remote_jid === remoteJid &&
                    c.whatsapp_instances?.company_id === lead.company_id
                );

                if (existingChatInState) {
                    const chatWithLead = existingChatInState.lead
                        ? existingChatInState
                        : { ...existingChatInState, lead };
                    setSelectedChat(chatWithLead);
                    setChats((prev) =>
                        prev.map((c) => (c.id === chatWithLead.id ? chatWithLead : c))
                    );
                    return;
                }

                // 4. Check if chat exists in DB (maybe not loaded yet)
                // We need to find a chat for this lead's company and phone
                // Chats are linked to instances, instances are linked to companies.
                // We can query whatsapp_chats by remote_jid and join instance to check company_id
                const { data: existingChats, error: chatSearchError } = await supabase
                    .from('lyn_whatsapp_chats')
                    .select('*, whatsapp_contacts:lyn_whatsapp_contacts(*), whatsapp_instances:lyn_whatsapp_instances!inner(*)')
                    .eq('remote_jid', remoteJid)
                    .eq('whatsapp_instances.company_id', lead.company_id)
                    .limit(1);

                if (existingChats && existingChats.length > 0) {
                    const chat = existingChats[0];
                    const chatWithLead = { ...chat, lead };
                    // Add to local state if not present (although fetched chats should have it)
                    setChats(prev => {
                        if (!prev.find(c => c.id === chatWithLead.id)) return [chatWithLead, ...prev];
                        return prev.map((c) => (c.id === chatWithLead.id ? chatWithLead : c));
                    });
                    setSelectedChat(chatWithLead);
                    return;
                }

                // 5. Create new chat if not exists
                // We need a connected instance for this company
                const { data: allInstances, error: instancesError } = await supabase
                    .from('lyn_whatsapp_instances')
                    .select('*')
                    .eq('company_id', lead.company_id);

                if (instancesError) {
                    throw instancesError;
                }

                const connectedStatuses = new Set(['connected', '200', 'open']);
                const connectedInstances = (allInstances || []).filter((inst) => {
                    const status = String(inst.status || '').toLowerCase().trim();
                    return connectedStatuses.has(status);
                });

                if (!connectedInstances || connectedInstances.length === 0) {
                    const foundStatuses = (allInstances || [])
                        .map((inst) => inst.status || 'null')
                        .join(', ');
                    throw new Error(`Nenhuma instância de WhatsApp conectada para esta empresa. Status encontrados: ${foundStatuses || 'nenhum'}`);
                }

                const instance = connectedInstances[0];

                // 5a. Ensure Contact Exists
                let contactId = null;
                const { data: existingContact } = await supabase
                    .from('lyn_whatsapp_contacts')
                    .select('id')
                    .eq('remote_jid', remoteJid)
                    .eq('company_id', lead.company_id) // contacts are scoped by company usually? Schema says company_id: uuid NOT NULL
                    .maybeSingle();

                if (existingContact) {
                    contactId = existingContact.id;
                } else {
                    // Create contact
                    const { data: newContact, error: createContactError } = await supabase
                        .from('lyn_whatsapp_contacts')
                        .insert({
                            company_id: lead.company_id,
                            remote_jid: remoteJid,
                            name: lead.nome,
                            is_group: false // Assuming leads are individuals
                        })
                        .select()
                        .single();

                    if (createContactError) throw createContactError;
                    contactId = newContact.id;
                }

                // 5b. Create Chat
                const { data: newChat, error: createChatError } = await supabase
                    .from('lyn_whatsapp_chats')
                    .insert({
                        instance_id: instance.id,
                        contact_id: contactId,
                        remote_jid: remoteJid,
                        status: 'active',
                        unread_count: 0,
                        last_message_at: new Date().toISOString()
                    })
                    .select('*, whatsapp_contacts:lyn_whatsapp_contacts(*), whatsapp_instances:lyn_whatsapp_instances!inner(*)')
                    .single();

                if (createChatError) throw createChatError;

                // Add to list and select
                const chatWithLead = { ...newChat, lead };
                setChats(prev => [chatWithLead, ...prev]);
                setSelectedChat(chatWithLead);

                toast({
                    title: "Conversa iniciada",
                    description: `Chat iniciado com ${lead.nome}`,
                });

            } catch (error: any) {
                console.error("Erro ao abrir conversa:", error);
                toast({
                    title: "Erro ao abrir conversa",
                    description: error.message,
                    variant: "destructive"
                });
            } finally {
                setIsEnsuringChat(false);
                // Clear the param so we don't re-run logic if user navigates away and back without param?
                // Actually good to keep it for deep linking, but handled "if (!leadId || isEnsuringChat || selectedChat?.id)" prevents loops.
                // But if they select another chat, we don't want to re-select this one immediately.
                // Valid strategy: remove param after handling.
                setSearchParams({}, { replace: true });
            }
        };

        if (chats.length > 0 || instances.length > 0) { // Wait for initial load?
            // Actually we can run this efficiently in parallel or just verify based on DB.
            // The logic above queries DB directly for existence -> robust.
            ensureConversation();
        } else {
            // Maybe wait a bit? Or just run it. DB check is safe.
            // If we rely on 'chats' state for 'existingChatInState', we should wait.
            // But we added a DB fallback (step 4), so it's fine to run immediately.
            ensureConversation();
        }

    }, [leadId, searchParams, setSearchParams, chats]); // Dependencies

    // Fetch current user and initial chats
    useEffect(() => {
        const fetchUserAndChats = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setCurrentUser(user);

            // Fetch Instances for filter
            const { data: instanceData } = await supabase
                .from('lyn_whatsapp_instances')
                .select('id, name')
                .in('status', ['connected', '200']);

            if (instanceData) setInstances(instanceData);

            // Fetch Chats
            const { data: chatData } = await supabase
                .from('lyn_whatsapp_chats')
                .select('*, whatsapp_contacts:lyn_whatsapp_contacts(*), whatsapp_instances:lyn_whatsapp_instances!inner(*)')
                .order('last_message_at', { ascending: false });

            if (chatData) {
                const hydratedChats = await attachLeadsToChats(chatData);
                setChats(hydratedChats);
                setFilteredChats(hydratedChats);
            }
        };

        fetchUserAndChats();

        // Realtime Subscription
        const channel = supabase
            .channel('whatsapp-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'lyn_whatsapp_chats' }, (payload) => {
                // Refresh chats on update
                const fetchChats = async () => {
                    const { data: chatData } = await supabase
                        .from('lyn_whatsapp_chats')
                        .select('*, whatsapp_contacts:lyn_whatsapp_contacts(*), whatsapp_instances:lyn_whatsapp_instances!inner(*)')
                        .order('last_message_at', { ascending: false });
                    if (chatData) {
                        const hydratedChats = await attachLeadsToChats(chatData);
                        setChats(hydratedChats);
                        // Filter updates will happen via the other effect
                    }
                };
                fetchChats();
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'lyn_whatsapp_messages' }, async (payload) => {
                const newMessage = payload.new;
                const currentChat = selectedChatRef.current;

                // Check if message belongs to currently open chat
                if (currentChat && newMessage.chat_id === currentChat.id) {

                    // If it's a group message (inbound), we need to fetch the sender name
                    // because the realtime payload only has sender_id
                    let senderData = null;
                    if (newMessage.sender_id) {
                        const { data: sender } = await supabase
                            .from('lyn_whatsapp_contacts')
                            .select('name')
                            .eq('id', newMessage.sender_id)
                            .single();
                        if (sender) senderData = sender;
                    }

                    const messageWithSender = {
                        ...newMessage,
                        sender: senderData
                    };

                    setMessages((prev) => [...prev, messageWithSender]);

                    // Notify user of new inbound message
                    if (newMessage.direction === 'inbound') {
                        notify('Nova mensagem', newMessage.content?.substring(0, 50) || 'Nova mensagem recebida');
                    }

                    // Scroll to bottom
                    setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // Effect to filter chats when selectedInstanceId, searchQuery, or chats change
    useEffect(() => {
        let result = chats;

        // Filter by instance
        if (selectedInstanceId !== "all") {
            result = result.filter(c => c.instance_id === selectedInstanceId);
        }

        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            result = result.filter(chat => {
                const displayName = getDisplayName(chat).toLowerCase();
                const remoteJid = getDisplayPhone(chat).toLowerCase();
                const instanceName = chat.whatsapp_instances?.name?.toLowerCase() || '';
                return (
                    displayName.includes(query) ||
                    remoteJid.includes(query) ||
                    instanceName.includes(query)
                );
            });
        }

        setFilteredChats(result);
    }, [selectedInstanceId, searchQuery, chats]);

    // Fetch messages and LEAD when chat is selected
    useEffect(() => {
        if (!selectedChat) return;
        const fetchMessagesAndLead = async () => {
            // 1. Fetch Messages
            const { data, error } = await supabase
                .from('lyn_whatsapp_messages')
                .select('*, sender:sender_id(name)')
                .eq('chat_id', selectedChat.id)
                .order('created_at', { ascending: true });

            if (data) setMessages(data);
            setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), 100);

            // 2. Mark as Read (reset unread_count)
            if (selectedChat.unread_count > 0) {
                await supabase
                    .from('lyn_whatsapp_chats')
                    .update({ unread_count: 0 })
                    .eq('id', selectedChat.id);
            }

            // 3. Fetch Lead
            // We match by remote_jid (telefone) and company_id
            const remoteJid = selectedChat.whatsapp_contacts?.remote_jid || selectedChat.remote_jid;
            if (remoteJid && !remoteJid.includes('@g.us') && selectedChat.whatsapp_instances?.company_id) {
                const phoneCandidates = buildPhoneCandidates(remoteJid);

                if (phoneCandidates.length === 0) {
                    setCurrentLead(null);
                    return;
                }

                const { data: leadData } = await supabase
                    .from('lyn_leads')
                    .select('*')
                    .eq('company_id', selectedChat.whatsapp_instances.company_id)
                    .in('telefone', phoneCandidates)
                    .limit(1);

                setCurrentLead(leadData?.[0] || null);
            } else {
                setCurrentLead(null);
            }
        };
        fetchMessagesAndLead();
    }, [selectedChat]);

    // File selection handler
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file size (16MB limit for WhatsApp)
        const maxSize = 16 * 1024 * 1024; // 16MB
        if (file.size > maxSize) {
            toast({
                title: "Arquivo muito grande",
                description: "O tamanho máximo é 16MB",
                variant: "destructive"
            });
            return;
        }

        setSelectedFile(file);

        // Create preview URL
        const previewUrl = URL.createObjectURL(file);
        const mediaType = file.type.startsWith('image/') ? 'image'
            : file.type.startsWith('video/') ? 'video'
                : file.type.startsWith('audio/') ? 'audio'
                    : 'document';

        setMediaPreview({ url: previewUrl, type: mediaType });

        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Remove selected file
    const handleRemoveFile = () => {
        if (mediaPreview?.url) {
            URL.revokeObjectURL(mediaPreview.url);
        }
        setSelectedFile(null);
        setMediaPreview(null);
    };

    // Unified send handler for text and media
    const handleSend = async () => {
        if ((!newMessage.trim() && !selectedFile) || !selectedChat || isSending) return;

        setIsSending(true);

        try {
            const instanceId = selectedChat.whatsapp_instances?.evolution_instance_id;
            const remoteJid = selectedChat.whatsapp_contacts?.remote_jid;

            if (!instanceId || !remoteJid) {
                throw new Error('Chat não configurado corretamente');
            }

            if (selectedFile) {
                // Send media message
                console.log('[ChatInterface] Sending media:', {
                    instanceName: instanceId,
                    remoteJid,
                    fileName: selectedFile.name,
                    caption: newMessage
                });

                await whatsappService.sendMediaMessage(
                    instanceId,
                    remoteJid,
                    selectedFile,
                    newMessage.trim() || undefined
                );

                // Clear file
                handleRemoveFile();
            } else {
                // Send text message
                console.log('[ChatInterface] Sending text:', {
                    instanceName: instanceId,
                    remoteJid,
                    text: newMessage
                });

                await whatsappService.sendMessage(
                    instanceId,
                    remoteJid,
                    newMessage
                );
            }

            setNewMessage("");
        } catch (error: any) {
            console.error('[ChatInterface] Send Error:', error);
            toast({
                title: "Erro",
                description: error.message || "Falha ao enviar mensagem",
                variant: "destructive"
            });
        } finally {
            setIsSending(false);
        }
    };

    // Legacy handler for backward compatibility
    const handleSendMessage = handleSend;

    // Quick Reply Handler
    const handleQuickReplySelect = (template: any) => {
        if (!currentLead || !profile) return;

        const leadData = {
            nome: currentLead.nome,
            empresa: currentLead.empresa || undefined,
            telefone: currentLead.telefone || undefined
        };

        const userName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();

        const content = replaceTemplateVariables(template.content, leadData, userName);

        // If triggered by slash command, remove the slash
        if (newMessage === '/') {
            setNewMessage(content);
        } else {
            setNewMessage(prev => prev + content);
        }
    };

    // Detect slash command
    const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setNewMessage(val);

        if (val === '/') {
            setShowQuickReplyPicker(true);
        }
    };

    return (
        <div className="flex flex-col md:flex-row h-[calc(100vh-2rem)] gap-4 p-0 md:p-4">
            {/* Sidebar List */}
            <Card className={cn("flex flex-col border-r border-borda dark:border-dark-border bg-white dark:bg-dark-card shadow-sm h-full", selectedChat ? "hidden md:flex w-full md:w-1/3" : "w-full md:w-1/3")}>
                <div className="p-4 border-b space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="font-semibold text-lg">Conversas</h2>
                        <Filter className="h-4 w-4 text-muted-foreground" />
                    </div>

                    {/* Instance Selector */}
                    <Select value={selectedInstanceId} onValueChange={setSelectedInstanceId}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecione a instância" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas as Instâncias</SelectItem>
                            {instances.map(inst => (
                                <SelectItem key={inst.id} value={inst.id}>{inst.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nome ou número..."
                            className="pl-8"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
                <ScrollArea className="flex-1">
                    {filteredChats.map((chat) => {
                        const displayName = getDisplayName(chat);
                        return (
                            <div
                                key={chat.id}
                                className={`p-4 border-b cursor-pointer hover:bg-accent ${selectedChat?.id === chat.id ? 'bg-accent' : ''}`}
                                onClick={() => setSelectedChat(chat)}
                            >
                                <div className="flex justify-between mb-1">
                                    <span className="font-semibold truncate max-w-[60%]">{displayName}</span>
                                    <div className="flex items-center gap-2">
                                        {chat.unread_count > 0 && (
                                            <Badge className="bg-primary text-xs px-1.5 py-0.5 min-w-[1.25rem] text-center">
                                                {chat.unread_count}
                                            </Badge>
                                        )}
                                        <span className="text-xs text-muted-foreground">
                                            {new Date(chat.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                                {selectedInstanceId === "all" && chat.whatsapp_instances && (
                                    <Badge
                                        className="text-[10px] px-2 py-0.5 border-0"
                                        style={{
                                            backgroundColor: getInstanceColor(chat.instance_id).bg,
                                            color: getInstanceColor(chat.instance_id).text,
                                        }}
                                    >
                                        {chat.whatsapp_instances.name}
                                    </Badge>
                                )}
                            </div>
                        )
                    })}
                    {isEnsuringChat && (
                        <div className="p-4 flex justify-center items-center text-muted-foreground">
                            <Loader2 className="h-5 w-5 animate-spin mr-2" />
                            <span>Abrindo conversa...</span>
                        </div>
                    )}
                </ScrollArea>
            </Card>

            {/* Main Chat Area */}
            <Card className={cn("flex flex-col bg-white dark:bg-dark-card shadow-sm overflow-hidden h-full chat-wrapper border-0 rounded-none md:rounded-xl", !selectedChat ? "hidden md:flex flex-1" : "w-full md:flex-1")}>
                {selectedChat ? (
                    <>
                        {/* Header */}
                        <div className="p-3 md:p-4 border-b flex justify-between items-center bg-muted/30 shrink-0 h-[var(--chat-header-height)]">
                            <div className="flex items-center gap-3">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="md:hidden -ml-2"
                                    onClick={() => setSelectedChat(null)}
                                >
                                    <ArrowLeft className="h-5 w-5" />
                                </Button>
                                <Avatar>
                                    <AvatarImage src={selectedChat.whatsapp_contacts?.profile_pic_url} />
                                    <AvatarFallback>{getInitials(getDisplayName(selectedChat, currentLead))}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <h3 className="font-semibold">{getDisplayName(selectedChat, currentLead)}</h3>
                                    <p className="text-xs text-muted-foreground">{getDisplayPhone(selectedChat)}</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="ghost" size="icon"><Phone className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon"><Video className="h-4 w-4" /></Button>
                            </div>
                        </div>

                        {/* Messages Area - Using new CSS classes */}
                        <div className="chat-scroll-area">
                            <div className="chat-scroll-content">
                                {messages.map((msg, index) => {
                                    // Calculate Date Separator
                                    const prevMsg = messages[index - 1];
                                    const isFirst = index === 0;
                                    const currentDate = new Date(msg.created_at).toDateString();
                                    const prevDate = prevMsg ? new Date(prevMsg.created_at).toDateString() : null;
                                    const showDateSeparator = isFirst || currentDate !== prevDate;

                                    let dateLabel = currentDate;
                                    const today = new Date().toDateString();
                                    const yesterday = new Date(Date.now() - 86400000).toDateString();

                                    if (currentDate === today) dateLabel = "Hoje";
                                    else if (currentDate === yesterday) dateLabel = "Ontem";
                                    else dateLabel = new Date(msg.created_at).toLocaleDateString('pt-BR');

                                    return (
                                        <MessageBubble
                                            key={msg.id}
                                            message={msg}
                                            isGroup={selectedChat.whatsapp_contacts?.is_group}
                                            showDateSeparator={showDateSeparator}
                                            dateLabel={dateLabel}
                                        />
                                    );
                                })}
                                <div ref={scrollRef} />
                            </div>
                        </div>

                        {/* Media Preview */}
                        {mediaPreview && (

                            <div className="px-4 pt-3 pb-0">
                                <div className="relative inline-block bg-muted p-2 rounded-lg">
                                    {mediaPreview.type === 'image' ? (
                                        <img
                                            src={mediaPreview.url}
                                            alt="Preview"
                                            className="max-h-24 max-w-48 rounded object-contain"
                                        />
                                    ) : mediaPreview.type === 'video' ? (
                                        <div className="flex items-center gap-2 px-3 py-2">
                                            <Film className="h-5 w-5 text-blue-500" />
                                            <span className="text-sm truncate max-w-40">{selectedFile?.name}</span>
                                        </div>
                                    ) : mediaPreview.type === 'audio' ? (
                                        <div className="flex items-center gap-2 px-3 py-2">
                                            <Music className="h-5 w-5 text-purple-500" />
                                            <span className="text-sm truncate max-w-40">{selectedFile?.name}</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 px-3 py-2">
                                            <FileText className="h-5 w-5 text-orange-500" />
                                            <span className="text-sm truncate max-w-40">{selectedFile?.name}</span>
                                        </div>
                                    )}
                                    <Button
                                        size="icon"
                                        variant="destructive"
                                        className="absolute -top-2 -right-2 h-5 w-5 rounded-full"
                                        onClick={handleRemoveFile}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Message Input */}
                        {/* Message Input */}
                        <div className="p-3 bg-background border-t flex gap-2 items-center">
                            {/* Hidden file input */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                className="hidden"
                                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                                onChange={handleFileSelect}
                            />

                            {/* Attachment button */}
                            <Button
                                size="icon"
                                variant="ghost"
                                className="text-muted-foreground hover:bg-muted/50 rounded-full h-10 w-10 shrink-0"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isSending}
                                title="Anexar arquivo"
                            >
                                <Paperclip className="h-5 w-5" />
                            </Button>

                            {/* Quick Reply Picker */}
                            <div className="shrink-0">
                                <QuickReplyPicker
                                    onSelect={handleQuickReplySelect}
                                    isOpen={showQuickReplyPicker}
                                    onOpenChange={setShowQuickReplyPicker}
                                />
                            </div>

                            <div className="flex-1 relative">
                                <Input
                                    placeholder={selectedFile ? "Adicione uma legenda..." : "Digite uma mensagem..."}
                                    value={newMessage}
                                    onChange={handleMessageChange}
                                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                                    disabled={isSending}
                                    className="w-full bg-muted/30 border-none focus-visible:ring-0 focus-visible:ring-offset-0 rounded-xl px-4 py-6 text-base"
                                />
                            </div>

                            <Button
                                size="icon"
                                onClick={handleSend}
                                disabled={isSending || (!newMessage.trim() && !selectedFile)}
                                className={cn(
                                    "rounded-xl h-12 w-12 shrink-0 transition-all duration-200",
                                    (newMessage.trim() || selectedFile)
                                        ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
                                        : "bg-transparent text-muted-foreground hover:bg-muted/50 shadow-none"
                                )}
                            >
                                {isSending ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    <Send className="h-5 w-5" />
                                )}
                            </Button>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground">
                        {isEnsuringChat ? (
                            <div className="flex flex-col items-center gap-2">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                <p>Localizando conversa...</p>
                            </div>
                        ) : (
                            "Selecione uma conversa para iniciar"
                        )}
                    </div>
                )}
            </Card>

            {/* Right Sidebar - Contact Info */}
            {selectedChat && (
                <ChatSidebar
                    contactId={selectedChat.whatsapp_contacts?.id}
                    contactName={getDisplayName(selectedChat, currentLead)}
                    contactPhone={getDisplayPhone(selectedChat)}
                    lead={currentLead}
                    companyId={selectedChat.whatsapp_instances?.company_id}
                    onUpdate={async () => {
                        const remoteJid = selectedChat.whatsapp_contacts?.remote_jid || selectedChat.remote_jid;
                        if (remoteJid && !remoteJid.includes('@g.us') && selectedChat.whatsapp_instances?.company_id) {
                            const phoneCandidates = buildPhoneCandidates(remoteJid);
                            if (phoneCandidates.length === 0) return;
                            const { data: leadData } = await supabase
                                .from('lyn_leads')
                                .select('*')
                                .eq('company_id', selectedChat.whatsapp_instances.company_id)
                                .in('telefone', phoneCandidates)
                                .limit(1);
                            setCurrentLead(leadData?.[0] || null);
                        }
                    }}
                />
            )}
        </div>
    );
}
