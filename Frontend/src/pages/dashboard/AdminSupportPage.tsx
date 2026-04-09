import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
    Search, ChevronDown, ChevronRight, Shield, Building2,
    User, Paperclip, Inbox, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
    useAdminTickets,
    TICKET_STATUSES,
    TICKET_PRIORITIES,
    TICKET_CATEGORIES,
} from "@/hooks/useTickets";
import type { AdminTicketFilters, TicketStatus, TicketPriority, TicketCategory } from "@/hooks/useTickets";
import { StatusBadge, PriorityBadge, CategoryBadge } from "@/components/dashboard/support/SupportBadges";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AdminSupportPage() {
    const navigate = useNavigate();
    const [filters, setFilters] = useState<AdminTicketFilters>({
        status: "all",
        priority: "all",
        category: "all",
        search: "",
    });
    const [expandedOrgs, setExpandedOrgs] = useState<Set<string>>(new Set());
    const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

    const { data: tickets, isLoading } = useAdminTickets(filters);

    // Group tickets by Company → User → Date
    const grouped = useMemo(() => {
        if (!tickets) return {};

        const map: Record<string, {
            org: { id: string; name: string };
            users: Record<string, {
                user: { id: string; first_name: string; last_name: string; email: string };
                dates: Record<string, typeof tickets>;
                totalTickets: number;
            }>;
            totalTickets: number;
        }> = {};

        tickets.forEach((ticket: any) => {
            const orgId = ticket.company?.id ?? "unknown";
            const orgName = ticket.company?.name ?? "Sem empresa";
            const userId = ticket.user?.id ?? "unknown";
            const userName = ticket.user?.first_name ?? "Sem";
            const userLast = ticket.user?.last_name ?? "nome";
            const userEmail = ticket.user?.email ?? "";
            const dateKey = format(new Date(ticket.created_at), "dd/MM/yyyy");

            if (!map[orgId]) {
                map[orgId] = {
                    org: { id: orgId, name: orgName },
                    users: {},
                    totalTickets: 0,
                };
            }
            map[orgId].totalTickets++;

            if (!map[orgId].users[userId]) {
                map[orgId].users[userId] = {
                    user: { id: userId, first_name: userName, last_name: userLast, email: userEmail },
                    dates: {},
                    totalTickets: 0,
                };
            }
            map[orgId].users[userId].totalTickets++;

            if (!map[orgId].users[userId].dates[dateKey]) {
                map[orgId].users[userId].dates[dateKey] = [];
            }
            map[orgId].users[userId].dates[dateKey].push(ticket);
        });

        return map;
    }, [tickets]);

    // Status summary
    const summary = useMemo(() => {
        if (!tickets) return {};
        const counts: Record<string, number> = {};
        tickets.forEach((t: any) => {
            counts[t.status] = (counts[t.status] || 0) + 1;
        });
        return counts;
    }, [tickets]);

    const toggleOrg = (id: string) => {
        setExpandedOrgs((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleUser = (id: string) => {
        setExpandedUsers((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const ticketShortId = (id: string) => `#T-${id.slice(-4).toUpperCase()}`;
    const orgKeys = Object.keys(grouped).sort((a, b) => grouped[b].totalTickets - grouped[a].totalTickets);

    const isStale = (createdAt: string, status: string) => {
        if (status !== "open") return false;
        return Date.now() - new Date(createdAt).getTime() > 24 * 60 * 60 * 1000;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/20 p-6 lg:p-8">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Central de Suporte — Admin</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Todos os chamados de todas as empresas</p>
                </div>
            </div>

            {/* Search & Filters */}
            <div className="flex flex-wrap gap-3 mb-6">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        value={filters.search}
                        onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                        placeholder="Buscar por título..."
                        className="pl-10 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                    />
                </div>
                <Select value={filters.status} onValueChange={(v) => setFilters((f) => ({ ...f, status: v as any }))}>
                    <SelectTrigger className="w-[160px] rounded-xl"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos Status</SelectItem>
                        {TICKET_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select value={filters.priority} onValueChange={(v) => setFilters((f) => ({ ...f, priority: v as any }))}>
                    <SelectTrigger className="w-[160px] rounded-xl"><SelectValue placeholder="Prioridade" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todas Prioridades</SelectItem>
                        {TICKET_PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select value={filters.category} onValueChange={(v) => setFilters((f) => ({ ...f, category: v as any }))}>
                    <SelectTrigger className="w-[160px] rounded-xl"><SelectValue placeholder="Categoria" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todas Categorias</SelectItem>
                        {TICKET_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            {/* Summary badges */}
            {!isLoading && tickets && (
                <div className="flex flex-wrap gap-3 mb-6">
                    {TICKET_STATUSES.map((s) => (
                        <div key={s.value} className="flex items-center gap-1.5">
                            <StatusBadge status={s.value} size="xs" />
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{summary[s.value] || 0}</span>
                        </div>
                    ))}
                    <span className="ml-4 text-sm text-slate-400">
                        Total: <span className="font-bold text-slate-700 dark:text-slate-300">{tickets.length}</span>
                    </span>
                </div>
            )}

            {/* Loading */}
            {isLoading && (
                <div className="space-y-4 animate-pulse">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-32 rounded-2xl bg-slate-100 dark:bg-slate-800" />
                    ))}
                </div>
            )}

            {/* Empty */}
            {!isLoading && orgKeys.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Inbox className="h-12 w-12 text-slate-300 mb-4" />
                    <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-400">Nenhum chamado encontrado</h3>
                    <p className="text-sm text-slate-400">Ajuste os filtros ou aguarde novos chamados.</p>
                </div>
            )}

            {/* Grouped list */}
            {!isLoading && orgKeys.length > 0 && (
                <div className="space-y-4">
                    {orgKeys.map((orgId) => {
                        const org = grouped[orgId];
                        const isOrgOpen = expandedOrgs.has(orgId);
                        const userKeys = Object.keys(org.users).sort(
                            (a, b) => org.users[b].totalTickets - org.users[a].totalTickets
                        );

                        return (
                            <div key={orgId} className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                                {/* Org header */}
                                <button
                                    onClick={() => toggleOrg(orgId)}
                                    className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <Building2 className="h-5 w-5 text-indigo-500" />
                                        <span className="font-bold text-slate-900 dark:text-white">{org.org.name}</span>
                                        <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                                            {org.totalTickets} ticket{org.totalTickets > 1 ? "s" : ""}
                                        </span>
                                    </div>
                                    {isOrgOpen ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                                </button>

                                {isOrgOpen && (
                                    <div className="border-t border-slate-100 dark:border-slate-800">
                                        {userKeys.map((userId) => {
                                            const userData = org.users[userId];
                                            const isUserOpen = expandedUsers.has(`${orgId}-${userId}`);
                                            const dateKeys = Object.keys(userData.dates).sort((a, b) => {
                                                const da = a.split("/").reverse().join("-");
                                                const db = b.split("/").reverse().join("-");
                                                return db.localeCompare(da);
                                            });

                                            return (
                                                <div key={userId} className="ml-4 border-l-2 border-slate-100 dark:border-slate-800">
                                                    {/* User header */}
                                                    <button
                                                        onClick={() => toggleUser(`${orgId}-${userId}`)}
                                                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <User className="h-4 w-4 text-violet-500" />
                                                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                                                {userData.user.first_name} {userData.user.last_name}
                                                            </span>
                                                            <span className="text-xs text-slate-400">({userData.user.email})</span>
                                                            <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full">
                                                                {userData.totalTickets}
                                                            </span>
                                                        </div>
                                                        {isUserOpen ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
                                                    </button>

                                                    {isUserOpen && (
                                                        <div className="ml-4 pb-2">
                                                            {dateKeys.map((dateKey) => (
                                                                <div key={dateKey} className="mb-3">
                                                                    <p className="text-xs font-semibold text-slate-400 px-4 py-1">{dateKey}</p>
                                                                    <div className="space-y-1 px-4">
                                                                        {userData.dates[dateKey].map((ticket: any) => (
                                                                            <div
                                                                                key={ticket.id}
                                                                                onClick={() => navigate(`/dashboard/support/${ticket.id}`)}
                                                                                className={cn(
                                                                                    "flex items-center justify-between gap-4 px-3 py-2.5 rounded-xl cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50 group",
                                                                                    isStale(ticket.created_at, ticket.status) && "ring-1 ring-red-200 dark:ring-red-900"
                                                                                )}
                                                                            >
                                                                                <div className="flex items-center gap-2.5 min-w-0">
                                                                                    {isStale(ticket.created_at, ticket.status) && (
                                                                                        <AlertCircle className="h-3.5 w-3.5 text-red-500 animate-pulse flex-shrink-0" />
                                                                                    )}
                                                                                    <CategoryBadge category={ticket.category} showLabel={false} />
                                                                                    <span className="text-xs text-slate-400 font-mono flex-shrink-0">{ticketShortId(ticket.id)}</span>
                                                                                    <span className="text-sm text-slate-700 dark:text-slate-300 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                                                        {ticket.title}
                                                                                    </span>
                                                                                    {ticket.attachments && ticket.attachments.length > 0 && (
                                                                                        <Paperclip className="h-3 w-3 text-slate-300 flex-shrink-0" />
                                                                                    )}
                                                                                </div>
                                                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                                                    <PriorityBadge priority={ticket.priority} size="xs" />
                                                                                    <StatusBadge status={ticket.status} size="xs" />
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
