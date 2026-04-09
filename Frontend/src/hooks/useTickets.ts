import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

// ═══════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════
export const SUPER_ADMIN_ID = "059c00d8-c1d0-438a-a260-7aa73808f065";

export const TICKET_CATEGORIES = [
    { value: "bug", label: "Bug", icon: "Bug", color: "text-red-600" },
    { value: "feature", label: "Feature", icon: "Sparkles", color: "text-violet-600" },
    { value: "billing", label: "Financeiro", icon: "CreditCard", color: "text-emerald-600" },
    { value: "integration", label: "Integração", icon: "Plug", color: "text-blue-600" },
    { value: "general", label: "Geral", icon: "HelpCircle", color: "text-slate-500" },
] as const;

export const TICKET_PRIORITIES = [
    { value: "low", label: "Baixa" },
    { value: "medium", label: "Média" },
    { value: "high", label: "Alta" },
    { value: "urgent", label: "Urgente" },
] as const;

export const TICKET_STATUSES = [
    { value: "open", label: "Aberto" },
    { value: "in_progress", label: "Em Atendimento" },
    { value: "waiting_user", label: "Aguardando Usuário" },
    { value: "resolved", label: "Resolvido" },
    { value: "closed", label: "Fechado" },
] as const;

export type TicketCategory = (typeof TICKET_CATEGORIES)[number]["value"];
export type TicketPriority = (typeof TICKET_PRIORITIES)[number]["value"];
export type TicketStatus = (typeof TICKET_STATUSES)[number]["value"];

export interface SupportTicket {
    id: string;
    user_id: string;
    company_id: string;
    title: string;
    description: string;
    category: TicketCategory;
    priority: TicketPriority;
    status: TicketStatus;
    created_at: string;
    updated_at: string;
    resolved_at: string | null;
    admin_notes: string | null;
}

export interface TicketAttachment {
    id: string;
    ticket_id: string;
    user_id: string;
    file_name: string;
    file_path: string;
    file_type: string;
    file_size: number;
    created_at: string;
}

export interface TicketMessage {
    id: string;
    ticket_id: string;
    user_id: string;
    message: string;
    is_admin_reply: boolean;
    created_at: string;
}

// ═══════════════════════════════════════════
// UPLOAD HELPERS
// ═══════════════════════════════════════════
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPES = [
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "video/mp4", "video/quicktime", "video/webm",
    "application/pdf",
];

export const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) return "Arquivo muito grande. Máximo: 50MB.";
    if (!ALLOWED_TYPES.includes(file.type)) return "Tipo de arquivo não permitido.";
    return null;
};

export const uploadAttachment = async (
    file: File,
    ticketId: string,
    userId: string
): Promise<{ filePath: string; fileName: string }> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`;
    const filePath = `${userId}/${ticketId}/${fileName}`;

    const { error } = await supabase.storage
        .from("support-attachments")
        .upload(filePath, file, {
            cacheControl: "3600",
            contentType: file.type,
            upsert: false,
        });

    if (error) throw error;

    const { error: dbError } = await supabase
        .from("support_ticket_attachments")
        .insert({
            ticket_id: ticketId,
            user_id: userId,
            file_name: file.name,
            file_path: filePath,
            file_type: file.type,
            file_size: file.size,
        });

    if (dbError) throw dbError;

    return { filePath, fileName: file.name };
};

export const getAttachmentUrl = async (filePath: string): Promise<string> => {
    const { data, error } = await supabase.storage
        .from("support-attachments")
        .createSignedUrl(filePath, 3600);
    if (error) throw error;
    return data.signedUrl;
};

// ═══════════════════════════════════════════
// HOOKS
// ═══════════════════════════════════════════

export const useIsSuperAdmin = () => {
    const { user } = useAuth();
    return user?.id === SUPER_ADMIN_ID;
};

// --- User tickets ---
export interface TicketFilters {
    status?: TicketStatus | "all";
}

export const useTickets = (filters: TicketFilters = {}) => {
    const { user } = useAuth();

    return useQuery({
        queryKey: ["support-tickets", user?.id, filters],
        queryFn: async () => {
            let query = supabase
                .from("support_tickets")
                .select(`
          *,
          attachments:support_ticket_attachments(id, file_name, file_type)
        `)
                .eq("user_id", user!.id)
                .order("created_at", { ascending: false });

            if (filters.status && filters.status !== "all") {
                query = query.eq("status", filters.status);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data as (SupportTicket & { attachments: Pick<TicketAttachment, "id" | "file_name" | "file_type">[] })[];
        },
        enabled: !!user?.id,
    });
};

// --- Admin tickets (super admin only) ---
export interface AdminTicketFilters {
    status?: TicketStatus | "all";
    priority?: TicketPriority | "all";
    category?: TicketCategory | "all";
    search?: string;
}

export const useAdminTickets = (filters: AdminTicketFilters = {}) => {
    const { user } = useAuth();
    const isSuperAdmin = user?.id === SUPER_ADMIN_ID;

    return useQuery({
        queryKey: ["admin-support-tickets", filters],
        queryFn: async () => {
            let query = supabase
                .from("support_tickets")
                .select(`
          *,
          user:profiles!support_tickets_user_profile_fkey(id, first_name, last_name, email, avatar_url),
          company:company!support_tickets_company_id_fkey(id, name),
          attachments:support_ticket_attachments(id, file_name, file_type),
          messages:support_ticket_messages(id)
        `)
                .order("created_at", { ascending: false });

            if (filters.status && filters.status !== "all") {
                query = query.eq("status", filters.status);
            }
            if (filters.priority && filters.priority !== "all") {
                query = query.eq("priority", filters.priority);
            }
            if (filters.category && filters.category !== "all") {
                query = query.eq("category", filters.category);
            }
            if (filters.search) {
                query = query.ilike("title", `%${filters.search}%`);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data;
        },
        enabled: isSuperAdmin,
    });
};

// --- Ticket detail ---
export const useTicketDetail = (ticketId: string | undefined) => {
    const { user } = useAuth();

    const ticketQuery = useQuery({
        queryKey: ["support-ticket", ticketId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("support_tickets")
                .select(`
          *,
          user:profiles!support_tickets_user_profile_fkey(id, first_name, last_name, email, avatar_url),
          company:company!support_tickets_company_id_fkey(id, name)
        `)
                .eq("id", ticketId!)
                .single();
            if (error) throw error;
            return data;
        },
        enabled: !!ticketId && !!user?.id,
    });

    const messagesQuery = useQuery({
        queryKey: ["support-ticket-messages", ticketId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("support_ticket_messages")
                .select("*")
                .eq("ticket_id", ticketId!)
                .order("created_at", { ascending: true });
            if (error) throw error;
            return data as TicketMessage[];
        },
        enabled: !!ticketId && !!user?.id,
    });

    const attachmentsQuery = useQuery({
        queryKey: ["support-ticket-attachments", ticketId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("support_ticket_attachments")
                .select("*")
                .eq("ticket_id", ticketId!)
                .order("created_at", { ascending: true });
            if (error) throw error;
            return data as TicketAttachment[];
        },
        enabled: !!ticketId && !!user?.id,
    });

    return { ticketQuery, messagesQuery, attachmentsQuery };
};

// --- Mutations ---
export const useCreateTicket = () => {
    const { user, companyId } = useAuth();
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (data: {
            title: string;
            description: string;
            category: TicketCategory;
            priority: TicketPriority;
            attachments: File[];
        }) => {
            if (!user?.id || !companyId) throw new Error("Não autenticado");

            // 1. Create ticket
            const { data: ticket, error } = await supabase
                .from("support_tickets")
                .insert({
                    user_id: user.id,
                    company_id: companyId,
                    title: data.title.trim(),
                    description: data.description.trim(),
                    category: data.category,
                    priority: data.priority,
                    status: "open",
                })
                .select()
                .single();

            if (error) throw error;

            // 2. Upload attachments
            if (data.attachments.length > 0) {
                const uploads = data.attachments.map((file) =>
                    uploadAttachment(file, ticket.id, user.id)
                );
                await Promise.all(uploads);
            }

            return ticket;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
            toast({ title: "Chamado criado com sucesso!" });
        },
        onError: (err: Error) => {
            toast({
                title: "Erro ao criar chamado",
                description: err.message,
                variant: "destructive",
            });
        },
    });
};

export const useReplyTicket = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const isSuperAdmin = user?.id === SUPER_ADMIN_ID;
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (data: {
            ticketId: string;
            message: string;
            attachments?: File[];
        }) => {
            if (!user?.id) throw new Error("Não autenticado");

            const { error } = await supabase
                .from("support_ticket_messages")
                .insert({
                    ticket_id: data.ticketId,
                    user_id: user.id,
                    message: data.message.trim(),
                    is_admin_reply: isSuperAdmin,
                });

            if (error) throw error;

            // Upload reply attachments
            if (data.attachments && data.attachments.length > 0) {
                const uploads = data.attachments.map((file) =>
                    uploadAttachment(file, data.ticketId, user.id)
                );
                await Promise.all(uploads);
            }

            // If admin replies, update ticket status to in_progress
            if (isSuperAdmin) {
                await supabase
                    .from("support_tickets")
                    .update({ status: "in_progress" })
                    .eq("id", data.ticketId)
                    .eq("status", "open");
            }
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["support-ticket-messages", variables.ticketId] });
            queryClient.invalidateQueries({ queryKey: ["support-ticket-attachments", variables.ticketId] });
            queryClient.invalidateQueries({ queryKey: ["support-ticket", variables.ticketId] });
            queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
            queryClient.invalidateQueries({ queryKey: ["admin-support-tickets"] });
        },
        onError: (err: Error) => {
            toast({
                title: "Erro ao enviar mensagem",
                description: err.message,
                variant: "destructive",
            });
        },
    });
};

export const useUpdateTicketStatus = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (data: {
            ticketId: string;
            status?: TicketStatus;
            priority?: TicketPriority;
            admin_notes?: string;
        }) => {
            const updates: Record<string, unknown> = {};
            if (data.status) {
                updates.status = data.status;
                if (data.status === "resolved") updates.resolved_at = new Date().toISOString();
            }
            if (data.priority) updates.priority = data.priority;
            if (data.admin_notes !== undefined) updates.admin_notes = data.admin_notes;

            const { error } = await supabase
                .from("support_tickets")
                .update(updates)
                .eq("id", data.ticketId);

            if (error) throw error;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["support-ticket", variables.ticketId] });
            queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
            queryClient.invalidateQueries({ queryKey: ["admin-support-tickets"] });
            toast({ title: "Ticket atualizado!" });
        },
        onError: (err: Error) => {
            toast({
                title: "Erro ao atualizar ticket",
                description: err.message,
                variant: "destructive",
            });
        },
    });
};
