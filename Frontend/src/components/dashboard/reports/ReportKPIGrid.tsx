import { useEffect, useRef, memo } from "react";
import { Users, Zap, MessageCircle, Calendar, Send } from "lucide-react";

// --- Animated Counter ---
function AnimatedCounter({ value }: { value: number }) {
    const ref = useRef<HTMLSpanElement>(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        let start = 0;
        const duration = 1200;
        const t0 = performance.now();
        const step = (now: number) => {
            const progress = Math.min((now - t0) / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 3);
            start = Math.round(ease * value);
            el.textContent = start.toLocaleString("pt-BR");
            if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }, [value]);
    return <span ref={ref}>0</span>;
}

// --- Mini Sparkline ---
function Sparkline({ data, color }: { data: number[]; color: string }) {
    if (data.length < 2) return null;
    const max = Math.max(...data, 1);
    const w = 80;
    const h = 28;
    const points = data.map(
        (v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * h}`
    );
    return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="opacity-60">
            <polyline
                points={points.join(" ")}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

// --- Trend Badge ---
function TrendBadge({ value }: { value: number | null }) {
    if (value === null) return <span className="text-xs text-slate-300">—</span>;
    const up = value >= 0;
    return (
        <span
            className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${up
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-red-50 text-red-500"
                }`}
        >
            {up ? "↑" : "↓"} {Math.abs(value).toFixed(1)}%
        </span>
    );
}

// --- KPI Card ---
interface KpiDef {
    label: string;
    value: number;
    trend: number | null;
    sparkline: number[];
    icon: React.ElementType;
    color: string;
    bgColor: string;
}

const KpiCard = memo(function KpiCard({ kpi }: { kpi: KpiDef }) {
    const Icon = kpi.icon;
    return (
        <div className="rounded-2xl bg-white border border-slate-100 p-5 hover:shadow-lg hover:shadow-slate-200/50 hover:-translate-y-0.5 transition-all duration-300 group">
            <div className="flex items-start justify-between mb-3">
                <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: kpi.bgColor }}
                >
                    <Icon className="w-5 h-5" style={{ color: kpi.color }} />
                </div>
                <Sparkline data={kpi.sparkline} color={kpi.color} />
            </div>
            <p className="text-sm font-medium text-slate-500 mb-1">{kpi.label}</p>
            <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                    <AnimatedCounter value={kpi.value} />
                </span>
                <TrendBadge value={kpi.trend} />
            </div>
        </div>
    );
});

// --- Grid ---
export interface ReportKPIData {
    totalLeads: number;
    newLeads: number;
    activeLeads: number;
    scheduledLeads: number;
    conversationsStarted: number;
    trends: {
        totalLeads: number | null;
        newLeads: number | null;
        activeLeads: number | null;
        scheduledLeads: number | null;
        conversationsStarted: number | null;
    };
    sparklines: {
        totalLeads: number[];
        newLeads: number[];
        activeLeads: number[];
        scheduledLeads: number[];
        conversationsStarted: number[];
    };
}

export function ReportKPIGrid({ data }: { data: ReportKPIData }) {
    const cards: KpiDef[] = [
        {
            label: "Total de Leads",
            value: data.totalLeads,
            trend: data.trends.totalLeads,
            sparkline: data.sparklines.totalLeads,
            icon: Users,
            color: "#4f46e5",
            bgColor: "#eef2ff",
        },
        {
            label: "Novos no Período",
            value: data.newLeads,
            trend: data.trends.newLeads,
            sparkline: data.sparklines.newLeads,
            icon: Zap,
            color: "#10b981",
            bgColor: "#ecfdf5",
        },
        {
            label: "Em Atendimento",
            value: data.activeLeads,
            trend: data.trends.activeLeads,
            sparkline: data.sparklines.activeLeads,
            icon: MessageCircle,
            color: "#f59e0b",
            bgColor: "#fffbeb",
        },
        {
            label: "Leads Agendados",
            value: data.scheduledLeads,
            trend: data.trends.scheduledLeads,
            sparkline: data.sparklines.scheduledLeads,
            icon: Calendar,
            color: "#7c3aed",
            bgColor: "#f5f3ff",
        },
        {
            label: "Conversas Iniciadas",
            value: data.conversationsStarted,
            trend: data.trends.conversationsStarted,
            sparkline: data.sparklines.conversationsStarted,
            icon: Send,
            color: "#3b82f6",
            bgColor: "#eff6ff",
        },
    ];

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {cards.map((kpi) => (
                <KpiCard key={kpi.label} kpi={kpi} />
            ))}
        </div>
    );
}

// --- Skeleton ---
export function ReportKPISkeleton() {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="rounded-2xl bg-white border border-slate-100 p-5 space-y-3">
                    <div className="flex justify-between">
                        <div className="w-11 h-11 rounded-xl bg-slate-100 animate-pulse" />
                        <div className="w-20 h-7 rounded bg-slate-100 animate-pulse" />
                    </div>
                    <div className="w-24 h-4 rounded bg-slate-100 animate-pulse" />
                    <div className="w-16 h-8 rounded bg-slate-100 animate-pulse" />
                </div>
            ))}
        </div>
    );
}
