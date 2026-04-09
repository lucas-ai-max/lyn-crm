import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    ArrowLeft, Paperclip, Send, Loader2, Download,
    Image as ImageIcon, Film, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
    useTicketDetail, useReplyTicket, useIsSuperAdmin, useUpdateTicketStatus,
    getAttachmentUrl, SUPER_ADMIN_ID, TICKET_STATUSES,
} from "@/hooks/useTickets";
import type { TicketStatus, TicketMessage, TicketAttachment } from "@/hooks/useTickets";
import { StatusBadge, PriorityBadge, CategoryBadge } from "@/components/dashboard/support/SupportBadges";
import { FileUploader } from "@/components/dashboard/support/FileUploader";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export default function TicketDetail() {
    const { ticketId } = useParams<{ ticketId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const isSuperAdmin = useIsSuperAdmin();
    const { ticketQuery, messagesQuery, attachmentsQuery } = useTicketDetail(ticketId);
    const replyMutation = useReplyTicket();
    const updateStatus = useUpdateTicketStatus();

    const [replyText, setReplyText] = useState("");
    const [replyFiles, setReplyFiles] = useState<File[]>([]);
    const [attachmentUrls, setAttachmentUrls] = useState<Record<string, string>>({});

    const ticket = ticketQuery.data;
    const messages = messagesQuery.data ?? [];
    const attachments = attachmentsQuery.data ?? [];

    // Load signed URLs for attachments
    useEffect(() => {
        attachments.forEach(async (att) => {
            if (!attachmentUrls[att.id]) {
                try {
                    const url = await getAttachmentUrl(att.file_path);
                    setAttachmentUrls((prev) => ({ ...prev, [att.id]: url }));
                } catch { /* ignore */ }
            }
        });
    }, [attachments]);

    const handleReply = async () => {
        if (!replyText.trim() || !ticketId) return;
        await replyMutation.mutateAsync({
            ticketId,
            message: replyText,
            attachments: replyFiles,
        });
        setReplyText("");
        setReplyFiles([]);
    };

    const handleStatusChange = (status: string) => {
        if (ticketId) updateStatus.mutate({ ticketId, status: status as TicketStatus });
    };

    const getFileIcon = (type: string) => {
        if (type.startsWith("image/")) return ImageIcon;
        if (type.startsWith("video/")) return Film;
        return FileText;
    };

    if (ticketQuery.isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/20 p-6 lg:p-8">
                <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
                    <div className="h-6 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
                    <div className="h-8 w-2/3 bg-slate-200 dark:bg-slate-700 rounded" />
                    <div className="space-y-4">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (!ticket) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/20 p-6 lg:p-8 flex items-center justify-center">
                <p className="text-slate-500">Chamado não encontrado.</p>
            </div>
        );
    }

    const ticketShortId = `#T-${ticket.id.slice(-4).toUpperCase()}`;

    // Group attachments by message or ticket (initial)
    const initialAttachments = attachments.filter((a) =>
        !messages.some((m) => new Date(m.created_at) <= new Date(a.created_at) && m.user_id === a.user_id)
        || new Date(a.created_at).getTime() - new Date(ticket.created_at).getTime() < 60000
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/20 p-6 lg:p-8">
            <div className="max-w-4xl mx-auto">
                {/* Back button */}
                <button
                    onClick={() => navigate("/dashboard/support")}
                    className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 mb-6 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" /> Voltar à lista
                </button>

                {/* Header */}
                <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 mb-6">
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                            <CategoryBadge category={ticket.category as any} />
                            <span className="text-sm text-slate-400 font-mono">{ticketShortId}</span>
                        </div>
                        <PriorityBadge priority={ticket.priority as any} />
                    </div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                        {ticket.title}
                    </h1>
                    <div className="flex items-center gap-3 flex-wrap">
                        {isSuperAdmin ? (
                            <Select value={ticket.status} onValueChange={handleStatusChange}>
                                <SelectTrigger className="w-auto h-auto p-0 border-0 bg-transparent shadow-none">
                                    <SelectValue>
                                        <StatusBadge status={ticket.status as TicketStatus} />
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    {TICKET_STATUSES.map((s) => (
                                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <StatusBadge status={ticket.status as TicketStatus} />
                        )}
                        <span className="text-xs text-slate-400">
                            Aberto em {format(new Date(ticket.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                        {isSuperAdmin && (ticket as any).user && (
                            <span className="text-xs text-slate-400">
                                por {(ticket as any).user.first_name} {(ticket as any).user.last_name}
                                {(ticket as any).company && ` · ${(ticket as any).company.name}`}
                            </span>
                        )}
                    </div>

                    {/* Admin notes (only super admin) */}
                    {isSuperAdmin && (
                        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">
                                Notas internas (apenas admin)
                            </label>
                            <Textarea
                                value={ticket.admin_notes ?? ""}
                                onChange={(e) => {
                                    if (ticketId) updateStatus.mutate({ ticketId, admin_notes: e.target.value });
                                }}
                                placeholder="Notas internas sobre este ticket..."
                                rows={2}
                                className="rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 text-sm resize-none"
                            />
                        </div>
                    )}
                </div>

                {/* Original description as first message */}
                <div className="space-y-4 mb-6">
                    {/* Original ticket message */}
                    <div className="flex justify-end">
                        <div className="max-w-[80%] rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">Você</span>
                                <span className="text-xs text-indigo-400">
                                    · {format(new Date(ticket.created_at), "dd/MM HH:mm")}
                                </span>
                            </div>
                            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                                {ticket.description}
                            </p>
                            {/* Initial attachments */}
                            {initialAttachments.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {initialAttachments.map((att) => {
                                        const Icon = getFileIcon(att.file_type);
                                        const url = attachmentUrls[att.id];
                                        return (
                                            <a
                                                key={att.id}
                                                href={url || "#"}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/60 dark:bg-slate-800/60 border border-indigo-100 dark:border-indigo-800 text-xs hover:shadow-sm transition-all"
                                                onClick={(e) => !url && e.preventDefault()}
                                            >
                                                {att.file_type.startsWith("image/") && url ? (
                                                    <img src={url} alt={att.file_name} className="h-10 w-10 object-cover rounded" />
                                                ) : (
                                                    <Icon className="h-4 w-4 text-slate-500" />
                                                )}
                                                <span className="text-slate-600 dark:text-slate-300 max-w-[120px] truncate">{att.file_name}</span>
                                                <Download className="h-3 w-3 text-slate-400" />
                                            </a>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Thread messages */}
                    {messages.map((msg) => {
                        const isMe = msg.user_id === user?.id;
                        const isAdmin = msg.is_admin_reply;
                        return (
                            <div key={msg.id} className={cn("flex", isMe && !isAdmin ? "justify-end" : "justify-start")}>
                                <div className={cn(
                                    "max-w-[80%] rounded-2xl p-4 border",
                                    isAdmin
                                        ? "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800"
                                        : "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-100 dark:border-indigo-900"
                                )}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={cn(
                                            "text-xs font-semibold",
                                            isAdmin ? "text-violet-600 dark:text-violet-400" : "text-indigo-700 dark:text-indigo-300"
                                        )}>
                                            {isAdmin ? "Suporte Lyn CRM" : "Você"}
                                        </span>
                                        <span className="text-xs text-slate-400">
                                            · {format(new Date(msg.created_at), "dd/MM HH:mm")}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                                        {msg.message}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Reply input */}
                {ticket.status !== "closed" && (
                    <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                        <Textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Escreva uma resposta..."
                            rows={3}
                            className="rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 resize-none mb-3"
                        />
                        {replyFiles.length > 0 && (
                            <div className="mb-3">
                                <FileUploader files={replyFiles} onChange={setReplyFiles} maxFiles={5} disabled={replyMutation.isPending} />
                            </div>
                        )}
                        <div className="flex items-center justify-between">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => document.getElementById("reply-file-input")?.click()}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <Paperclip className="h-4 w-4 mr-1" /> Anexar
                            </Button>
                            <input
                                id="reply-file-input"
                                type="file"
                                multiple
                                accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/webm,application/pdf"
                                onChange={(e) => {
                                    if (e.target.files) setReplyFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
                                }}
                                className="hidden"
                            />
                            <Button
                                onClick={handleReply}
                                disabled={!replyText.trim() || replyMutation.isPending}
                                className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white gap-2"
                            >
                                {replyMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Send className="h-4 w-4" />
                                )}
                                Enviar
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
