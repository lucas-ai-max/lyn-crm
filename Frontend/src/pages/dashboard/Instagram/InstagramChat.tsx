import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Instagram, Loader2, Send, ArrowLeft, MessageSquare, Settings } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import {
  listConversations,
  getConversationMessages,
  sendTextMessage,
  getPageInfo,
} from "@/services/composio";

interface Conversation {
  id: string;
  participants?: { id: string; username?: string; name?: string }[];
  updated_time?: string;
  snippet?: string;
  participantName?: string;
}

interface Message {
  id: string;
  message?: string;
  from?: { id: string; username?: string; name?: string };
  from_?: { id: string; username?: string; name?: string };
  to?: { data?: { id: string; username?: string; name?: string }[] };
  created_time?: string;
}

// Cache de URLs de avatar para evitar rate limit do unavatar.io
const avatarCache = new Map<string, string | null>();

function IgAvatar({ username, size = "h-10 w-10" }: { username: string; size?: string }) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const initial = (username || "?").charAt(0).toUpperCase();

  useState(() => {
    if (!username || username === "Conversa") return;
    if (avatarCache.has(username)) {
      const cached = avatarCache.get(username);
      if (cached) setImgUrl(cached);
      else setError(true);
      return;
    }
    const url = `https://unavatar.io/instagram/${username}`;
    avatarCache.set(username, url);
    setImgUrl(url);
  });

  if (error || !imgUrl || !username || username === "Conversa") {
    return (
      <div className={`${size} rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center text-white font-bold text-sm shrink-0`}>
        {initial}
      </div>
    );
  }

  return (
    <img
      src={imgUrl}
      alt={username}
      loading="lazy"
      onError={() => { setError(true); avatarCache.set(username, null); }}
      className={`${size} rounded-full object-cover shrink-0`}
    />
  );
}

export default function InstagramChat() {
  const { user, companyId } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [allConvos, setAllConvos] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedConvo, setSelectedConvo] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [pageId, setPageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const convoListRef = useRef<HTMLDivElement>(null);
  const configured = true;
  const BATCH_SIZE = 10;

  const cid = companyId || user?.id || "default";

  useEffect(() => {
    if (!configured) { setLoadingConvos(false); return; }

    (async () => {
      const info = await getPageInfo(cid).catch(() => null);
      const myPageId = info?.pageId || null;
      if (myPageId) setPageId(myPageId);
      await fetchConversations(myPageId);
    })();

    // Poll every 15 seconds for new conversations (silent)
    const interval = setInterval(() => {
      refreshConversations();
    }, 15000);

    return () => clearInterval(interval);
  }, [cid]);

  // Refresh messages of selected conversation every 5s
  useEffect(() => {
    if (!selectedConvo) return;
    const interval = setInterval(() => {
      getConversationMessages(cid, selectedConvo.id)
        .then((result) => {
          const msgs = result?.data?.data || result?.data || [];
          setMessages(msgs);
        })
        .catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedConvo?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Scroll handler for infinite loading
  const handleConvoScroll = () => {
    const el = convoListRef.current;
    if (!el || loadingMore) return;
    // Load more when scrolled near bottom
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 100) {
      loadMoreConversations();
    }
  };

  const enrichConvos = async (convos: Conversation[], knownPageId: string | null) => {
    return Promise.all(
      convos.map(async (convo) => {
        if (convo.participantName) return convo;
        try {
          const msgResult = await getConversationMessages(cid, convo.id);
          const msgs = msgResult?.data?.data || msgResult?.data || [];
          if (msgs.length > 0) {
            const firstMsg = msgs[0];
            const sender = firstMsg.from_ || firstMsg.from;
            const recipient = firstMsg.to?.data?.[0];
            const otherUser = sender?.id === knownPageId ? recipient : sender;
            return {
              ...convo,
              participantName: otherUser?.username || "Conversa",
              snippet: firstMsg.message || convo.snippet,
            };
          }
        } catch {}
        return convo;
      })
    );
  };

  const fetchConversations = async (myPageId?: string | null) => {
    try {
      setLoadingConvos(true);
      const result = await listConversations(cid);
      const convos: Conversation[] = result?.data?.data || result?.data || [];
      setAllConvos(convos);

      // Enrich only first batch
      const firstBatch = convos.slice(0, BATCH_SIZE);
      const enriched = await enrichConvos(firstBatch, myPageId || pageId);
      setConversations(enriched);
    } catch (err: any) {
      console.error("Error fetching conversations:", err);
    } finally {
      setLoadingConvos(false);
    }
  };

  const loadMoreConversations = async () => {
    const loaded = conversations.length;
    if (loaded >= allConvos.length) return;

    setLoadingMore(true);
    const nextBatch = allConvos.slice(loaded, loaded + BATCH_SIZE);
    const enriched = await enrichConvos(nextBatch, pageId);
    setConversations((prev) => [...prev, ...enriched]);
    setLoadingMore(false);
  };

  const refreshConversations = async () => {
    try {
      const result = await listConversations(cid);
      const convos: Conversation[] = result?.data?.data || result?.data || [];
      setAllConvos(convos);
      // Only update existing enriched ones, don't re-enrich
      setConversations((prev) => {
        const prevMap = new Map(prev.map((c) => [c.id, c]));
        return prev.map((c) => {
          const updated = convos.find((nc) => nc.id === c.id);
          return updated ? { ...c, updated_time: updated.updated_time } : c;
        });
      });
    } catch {}
  };

  const fetchMessages = async (convo: Conversation) => {
    try {
      setLoadingMessages(true);
      setSelectedConvo(convo);
      const result = await getConversationMessages(cid, convo.id);
      const msgs = result?.data?.data || result?.data || [];
      setMessages(msgs);

      // Enrich conversation with participant name from first message
      if (msgs.length > 0 && !convo.participantName) {
        const firstMsg = msgs[0];
        const sender = firstMsg.from_ || firstMsg.from;
        const recipient = firstMsg.to?.data?.[0];
        const knownPageId = pageId;
        const otherUser = sender?.id === knownPageId ? recipient : sender;
        const name = otherUser?.username || "Conversa";

        setConversations((prev) =>
          prev.map((c) => c.id === convo.id ? { ...c, participantName: name, snippet: firstMsg.message } : c)
        );
        setSelectedConvo({ ...convo, participantName: name });
      }
    } catch (err: any) {
      toast.error("Erro ao carregar mensagens");
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedConvo) return;

    // Find the other user (not our page) to send to
    const otherUser = messages.find((m) => {
      const sender = m.from_ || m.from;
      return sender?.id && sender.id !== pageId;
    });
    const otherSender = otherUser?.from_ || otherUser?.from;
    const recipientId = otherSender?.id || selectedConvo.id;

    try {
      setSending(true);
      await sendTextMessage(cid, recipientId, newMessage.trim());
      setNewMessage("");
      // Refresh messages
      fetchMessages(selectedConvo);
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.includes("outside of allowed window") || msg.includes("allowed window")) {
        toast.error("Janela de 24h expirada. O Instagram so permite responder ate 24h apos a ultima mensagem do lead.");
      } else {
        toast.error(msg || "Erro ao enviar mensagem");
      }
    } finally {
      setSending(false);
    }
  };

  const getParticipantName = (convo: Conversation) => {
    if (convo.participantName) return convo.participantName;
    const other = convo.participants?.find((p) => p.id !== cid);
    return other?.username || other?.name || "Conversa";
  };

  if (!configured) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <Card className="max-w-md p-8 text-center space-y-4">
          <Instagram className="h-12 w-12 mx-auto text-muted-foreground" />
          <h2 className="text-xl font-bold">Instagram nao configurado</h2>
          <p className="text-muted-foreground text-sm">
            Configure a API key do Composio e conecte sua conta em Instagram Admin.
          </p>
          <Link to="/dashboard/instagram/admin">
            <Button variant="outline" className="gap-2">
              <Settings className="h-4 w-4" />
              Ir para Instagram Admin
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background">
      {/* Sidebar - Conversations list */}
      <div className="w-80 border-r flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="font-bold font-poppins flex items-center gap-2">
              <Instagram className="h-5 w-5" />
              Instagram DMs
            </h2>
            <Link to="/dashboard/instagram/admin">
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto" ref={convoListRef} onScroll={handleConvoScroll}>
          {loadingConvos ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-3">
              <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Nenhuma conversa encontrada. Verifique se sua conta esta conectada em{" "}
                <Link to="/dashboard/instagram/admin" className="text-lyn-primary underline">
                  Instagram Admin
                </Link>.
              </p>
            </div>
          ) : (
            conversations.map((convo) => (
              <div
                key={convo.id}
                onClick={() => fetchMessages(convo)}
                className={`flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/50 transition-colors border-b ${
                  selectedConvo?.id === convo.id ? "bg-lyn-primary/10" : ""
                }`}
              >
                <IgAvatar username={getParticipantName(convo)} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{getParticipantName(convo)}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {convo.snippet || (convo.updated_time
                      ? new Date(convo.updated_time).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
                      : "")}
                  </p>
                </div>
              </div>
            ))
          )}
          {loadingMore && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      </div>

      {/* Main - Messages */}
      <div className="flex-1 flex flex-col">
        {selectedConvo ? (
          <>
            {/* Header */}
            <div className="p-4 border-b flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => setSelectedConvo(null)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <IgAvatar username={getParticipantName(selectedConvo)} size="h-8 w-8" />
              <span className="font-semibold">@{getParticipantName(selectedConvo)}</span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingMessages ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-12">Nenhuma mensagem</p>
              ) : (
                messages.map((msg) => {
                  const sender = msg.from_ || msg.from;
                  // Message is "mine" if sent by our page
                  const isMe = pageId ? sender?.id === pageId : false;
                  return (
                    <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm ${
                          isMe
                            ? "bg-lyn-primary text-white rounded-br-md"
                            : "bg-muted rounded-bl-md"
                        }`}
                      >
                        <p>{msg.message}</p>
                        {msg.created_time && (
                          <p className={`text-[10px] mt-1 ${isMe ? "text-white/70" : "text-muted-foreground"}`}>
                            {new Date(msg.created_time).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t">
              {(() => {
                const lastMsg = messages[0];
                const lastTime = lastMsg?.created_time ? new Date(lastMsg.created_time).getTime() : 0;
                const expired = lastTime > 0 && Date.now() - lastTime > 24 * 60 * 60 * 1000;
                return expired ? (
                  <div className="mb-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs text-center">
                    Janela de 24h expirada. O Instagram so permite responder ate 24h apos a ultima mensagem do lead.
                  </div>
                ) : null;
              })()}
              <div className="flex gap-2">
                <Input
                  placeholder="Digite uma mensagem..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  disabled={sending}
                />
                <Button onClick={handleSend} disabled={sending || !newMessage.trim()}>
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-3">
              <Instagram className="h-16 w-16 mx-auto text-muted-foreground/30" />
              <p className="text-muted-foreground">Selecione uma conversa para comecar</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
