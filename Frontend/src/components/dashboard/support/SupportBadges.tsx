import {
    Bug, Sparkles, CreditCard, Plug, HelpCircle,
    AlertCircle, Clock, MessageSquare, CheckCircle, XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TicketCategory, TicketPriority, TicketStatus } from "@/hooks/useTickets";

// ═══════════════════════════════════════════
// STATUS BADGE
// ═══════════════════════════════════════════
const statusConfig: Record<TicketStatus, { label: string; className: string; icon: React.ElementType }> = {
    open: { label: "Aberto", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300", icon: AlertCircle },
    in_progress: { label: "Em Atendimento", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300", icon: Clock },
    waiting_user: { label: "Aguardando", className: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300", icon: MessageSquare },
    resolved: { label: "Resolvido", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", icon: CheckCircle },
    closed: { label: "Fechado", className: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400", icon: XCircle },
};

export function StatusBadge({ status, size = "sm" }: { status: TicketStatus; size?: "xs" | "sm" }) {
    const config = statusConfig[status];
    const Icon = config.icon;
    return (
        <span className={cn(
            "inline-flex items-center gap-1 rounded-full font-medium",
            size === "xs" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
            config.className
        )}>
            <Icon className={size === "xs" ? "h-3 w-3" : "h-3.5 w-3.5"} />
            {config.label}
        </span>
    );
}

// ═══════════════════════════════════════════
// PRIORITY BADGE
// ═══════════════════════════════════════════
const priorityConfig: Record<TicketPriority, { label: string; className: string; dot: string }> = {
    low: { label: "Baixa", className: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400", dot: "bg-slate-400" },
    medium: { label: "Média", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300", dot: "bg-amber-500" },
    high: { label: "Alta", className: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300", dot: "bg-orange-500" },
    urgent: { label: "Urgente", className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300", dot: "bg-red-500" },
};

export function PriorityBadge({ priority, size = "sm" }: { priority: TicketPriority; size?: "xs" | "sm" }) {
    const config = priorityConfig[priority];
    return (
        <span className={cn(
            "inline-flex items-center gap-1.5 rounded-full font-medium",
            size === "xs" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
            config.className
        )}>
            <span className={cn(
                "rounded-full",
                size === "xs" ? "h-1.5 w-1.5" : "h-2 w-2",
                config.dot,
                priority === "urgent" && "animate-pulse"
            )} />
            {config.label}
        </span>
    );
}

// ═══════════════════════════════════════════
// CATEGORY BADGE
// ═══════════════════════════════════════════
const categoryConfig: Record<TicketCategory, { label: string; color: string; icon: React.ElementType }> = {
    bug: { label: "Bug", color: "text-red-600 dark:text-red-400", icon: Bug },
    feature: { label: "Feature", color: "text-violet-600 dark:text-violet-400", icon: Sparkles },
    billing: { label: "Financeiro", color: "text-emerald-600 dark:text-emerald-400", icon: CreditCard },
    integration: { label: "Integração", color: "text-blue-600 dark:text-blue-400", icon: Plug },
    general: { label: "Geral", color: "text-slate-500 dark:text-slate-400", icon: HelpCircle },
};

export function CategoryBadge({ category, showLabel = true }: { category: TicketCategory; showLabel?: boolean }) {
    const config = categoryConfig[category];
    const Icon = config.icon;
    return (
        <span className={cn("inline-flex items-center gap-1 text-xs font-medium", config.color)}>
            <Icon className="h-3.5 w-3.5" />
            {showLabel && config.label}
        </span>
    );
}

export function getCategoryIcon(category: TicketCategory) {
    return categoryConfig[category].icon;
}
