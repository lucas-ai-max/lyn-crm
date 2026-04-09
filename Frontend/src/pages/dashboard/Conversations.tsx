import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { integrationInstancesService } from "@/services/supabase";
import type { Message, Lead } from "@/services/supabase";
import type { Database } from "@/integrations/supabase/types";
import { ConversationList } from "@/components/dashboard/conversations/ConversationList";
import { ConversationPanel } from "@/components/dashboard/conversations/ConversationPanel";
import { LeadSummaryPanel } from "@/components/dashboard/conversations/LeadSummaryPanel";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type ConversationRowWithIntegration = Database["public"]["Tables"]["lyn_conversas"]["Row"] & {
  integration_instances?: { name?: string | null } | null;
};

type ConversationListEntry = ConversationRowWithIntegration & {
  lead: Lead;
  lastMessage: Message | null;
  unreadCount: number;
  canSendMessages: boolean;
  isPlaceholder?: boolean;
};

export default function Conversations() {
  const { user, companyId } = useAuth();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const {
    data: integrationInstances = [],
    isLoading: loadingInstances,
  } = useQuery({
    queryKey: ["integration_instances", companyId],
    queryFn: () => integrationInstancesService.listByCompany(companyId ?? null),
    enabled: !!companyId,
  });

  const defaultIntegrationInstance = useMemo(
    () =>
      integrationInstances.find((instance) => instance.status === "active") ??
      integrationInstances[0] ??
      null,
    [integrationInstances]
  );

  // Fetch conversations with lead data and last message
  const {
    data: conversations = [],
    isLoading,
    refetch,
  } = useQuery<ConversationListEntry[]>({
    queryKey: [
      "conversations",
      user?.id,
      defaultIntegrationInstance?.id ?? "no-instance",
    ],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get all leads for this user
      const { data: leads, error: leadsError } = await supabase
        .from("lyn_leads")
        .select("*")
        .eq("responsavel_id", user.id);

      if (leadsError) throw leadsError;

      // For each lead, get or create conversation and last message
      const conversationsData = await Promise.all(
        (leads || []).map(async (lead) => {
          // Get or create conversation
          let { data: conversation, error: convError } = await supabase
            .from("lyn_conversas")
            .select("*, integration_instances:lyn_integration_instances(name)")
            .eq("lead_id", lead.id)
            .maybeSingle<ConversationRowWithIntegration>();

          if (convError && convError.code !== "PGRST116") throw convError;

          if (!conversation) {
            const payload: Database["public"]["Tables"]["lyn_conversas"]["Insert"] = {
              lead_id: lead.id,
              integration_instance_id: defaultIntegrationInstance?.id ?? null,
            };

            const { data: newConv, error: createError } = await supabase
              .from("lyn_conversas")
              .insert(payload)
              .select("*, integration_instances:lyn_integration_instances(name)")
              .single<ConversationRowWithIntegration>();

            if (createError) throw createError;
            conversation = newConv;
          }

          // Get last message
          const { data: lastMessage } = await supabase
            .from("lyn_messages")
            .select("*")
            .eq("conversa_id", conversation.id)
            .order("timestamp", { ascending: false })
            .limit(1)
            .maybeSingle<Message>();

          // Count unread messages (incoming = true)
          const { count: unreadCount } = await supabase
            .from("lyn_messages")
            .select("*", { count: "exact", head: true })
            .eq("conversa_id", conversation.id)
            .eq("incoming", true);

          const formattedConversation: ConversationListEntry = {
            ...conversation,
            lead,
            lastMessage,
            unreadCount: unreadCount || 0,
            canSendMessages: Boolean(conversation.integration_instance_id),
            integration_instances: conversation.integration_instances ?? null,
          };
          return formattedConversation;
        })
      );

      // Sort by last message date
      return conversationsData
        .filter((value): value is ConversationListEntry => Boolean(value))
        .sort((a, b) => {
          const dateA = a?.lastMessage?.timestamp || a?.created_at || new Date().toISOString();
          const dateB = b?.lastMessage?.timestamp || b?.created_at || new Date().toISOString();
          return new Date(dateB).getTime() - new Date(dateA).getTime();
        });
    },
    enabled: !!user?.id && (!companyId || !loadingInstances),
  });

  const conversationById = useMemo(() => {
    return new Map(conversations.map((conversation) => [conversation.id, conversation]));
  }, [conversations]);

  const selectedConversation = conversations.find(
    (conv) => conv.id === selectedConversationId
  );

  // Automatically select conversation from URL query param
  useEffect(() => {
    const leadIdParam = searchParams.get("leadId");
    if (leadIdParam && !selectedConversationId && conversations.length > 0) {
      const match = conversations.find((c) => c.lead_id === leadIdParam);
      if (match) {
        setSelectedConversationId(match.id);
      }
    }
  }, [searchParams, conversations, selectedConversationId]);

  // Filter conversations
  const filteredConversations = conversations.filter((conv) => {
    // Search filter
    const matchesSearch =
      searchQuery === "" ||
      conv.lead.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (conv.lastMessage?.body || "").toLowerCase().includes(searchQuery.toLowerCase());

    // Status filter
    const matchesStatus = statusFilter === "all" || conv.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (isLoading || loadingInstances) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Left: Conversation List */}
      <div className="w-96 border-r border-border flex flex-col">
        <ConversationList
          conversations={filteredConversations}
          selectedId={selectedConversationId}
          onSelect={(conversationId, conversation) => {
            if (!conversation) {
              const fallback = conversationById.get(conversationId);
              if (!fallback) return;
              conversation = fallback;
            }

            if (!conversation.canSendMessages) {
              toast({
                title: "Instância necessária",
                description: "Configure uma instância de integração para liberar o envio de mensagens.",
                variant: "destructive",
              });
            }

            setSelectedConversationId(conversationId);
            setShowDetails(false);
          }}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
        />
      </div>

      {/* Center: Chat Panel */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <ConversationPanel
            conversation={selectedConversation}
            onMessageSent={() => refetch()}
            onShowDetails={() => setShowDetails(true)}
            onClose={() => setSelectedConversationId(null)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <p>Selecione uma conversa para começar</p>
          </div>
        )}
      </div>

      {/* Right: Lead Summary */}
      {selectedConversation && showDetails && (
        <div className="w-80 border-l border-border">
          <LeadSummaryPanel
            lead={selectedConversation.lead}
            onClose={() => setShowDetails(false)}
          />
        </div>
      )}
    </div>
  );
}
