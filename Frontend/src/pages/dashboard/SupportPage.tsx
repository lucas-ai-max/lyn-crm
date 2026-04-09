import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Headset, Inbox, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTickets, useIsSuperAdmin } from "@/hooks/useTickets";
import type { TicketStatus } from "@/hooks/useTickets";
import { StatusBadge, PriorityBadge, CategoryBadge } from "@/components/dashboard/support/SupportBadges";
import { NewTicketModal } from "@/components/dashboard/support/NewTicketModal";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_TABS: { value: TicketStatus | "all"; label: string }[] = [
    { value: "all", label: "Todos" },
    { value: "open", label: "Abertos" },
    { value: "in_progress", label: "Em andamento" },
    { value: "resolved", label: "Resolvidos" },
];

export default function SupportPage() {
    const [activeTab, setActiveTab] = useState<TicketStatus | "all">("all");
    const [isNewOpen, setIsNewOpen] = useState(false);
    const { data: tickets, isLoading } = useTickets({ status: activeTab });
    const navigate = useNavigate();
    const isSuperAdmin = useIsSuperAdmin();

    const ticketId = (id: string) => `#T-${id.slice(-4).toUpperCase()}`;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/20 p-6 lg:p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                        <Headset className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Suporte</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Suas solicitações de suporte</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    {isSuperAdmin && (
                        <Button
                            variant="outline"
                            onClick={() => navigate("/dashboard/support/admin")}
                            className="rounded-xl"
                        >
                            Central Admin
                        </Button>
                    )}
                    <Button
                        onClick={() => setIsNewOpen(true)}
                        className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white gap-2"
                    >
                        <Plus className="h-4 w-4" /> Novo Chamado
                    </Button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
                {STATUS_TABS.map((tab) => {
                    const count = tab.value === "all"
                        ? tickets?.length ?? 0
                        : tickets?.filter((t) => t.status === tab.value).length ?? 0;
                    return (
                        <button
                            key={tab.value}
                            onClick={() => setActiveTab(tab.value)}
                            className={cn(
                                "px-4 py-2 rounded-xl text-sm font-medium transition-all",
                                activeTab === tab.value
                                    ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
                                    : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                            )}
                        >
                            {tab.label}
                            {!isLoading && (
                                <span className="ml-1.5 text-xs opacity-70">({tab.value === "all" ? (tickets?.length ?? 0) : count})</span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Loading skeleton */}
            {isLoading && (
                <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 animate-pulse">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded" />
                                <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
                            </div>
                            <div className="h-5 w-3/4 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
                            <div className="h-4 w-1/2 bg-slate-100 dark:bg-slate-800 rounded" />
                        </div>
                    ))}
                </div>
            )}

            {/* Empty state */}
            {!isLoading && tickets?.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="h-16 w-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                        <Inbox className="h-8 w-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Nenhum chamado encontrado
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-sm">
                        Você ainda não abriu nenhum chamado de suporte. Clique no botão abaixo para criar um.
                    </p>
                    <Button
                        onClick={() => setIsNewOpen(true)}
                        className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white gap-2"
                    >
                        <Plus className="h-4 w-4" /> Abrir Chamado
                    </Button>
                </div>
            )}

            {/* Ticket list */}
            {!isLoading && tickets && tickets.length > 0 && (
                <div className="space-y-3">
                    {tickets.map((ticket) => (
                        <div
                            key={ticket.id}
                            onClick={() => navigate(`/dashboard/support/${ticket.id}`)}
                            className="group rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 hover:border-slate-200 dark:hover:border-slate-700"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2.5">
                                    <CategoryBadge category={ticket.category} />
                                    <span className="text-xs text-slate-400 font-mono">{ticketId(ticket.id)}</span>
                                    <span className="text-xs text-slate-400">
                                        · {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true, locale: ptBR })}
                                    </span>
                                </div>
                                <PriorityBadge priority={ticket.priority} size="xs" />
                            </div>
                            <h3 className="font-semibold text-slate-900 dark:text-white mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                {ticket.title}
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-1 mb-3">
                                {ticket.description}
                            </p>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {ticket.attachments && ticket.attachments.length > 0 && (
                                        <span className="flex items-center gap-1 text-xs text-slate-400">
                                            <Paperclip className="h-3 w-3" /> {ticket.attachments.length} anexo{ticket.attachments.length > 1 ? "s" : ""}
                                        </span>
                                    )}
                                </div>
                                <StatusBadge status={ticket.status} size="xs" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <NewTicketModal open={isNewOpen} onOpenChange={setIsNewOpen} />
        </div>
    );
}
