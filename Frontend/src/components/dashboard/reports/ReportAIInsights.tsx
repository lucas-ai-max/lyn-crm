import { Sparkles, AlertTriangle, TrendingUp, Clock, Megaphone } from "lucide-react";

export interface Insight {
    type: "alert" | "success" | "warning" | "opportunity";
    priority: "high" | "medium" | "low";
    title: string;
    description: string;
}

interface Props {
    insights: Insight[];
    totalLeads: number;
}

const PRIORITY_DOT: Record<string, string> = {
    high: "bg-red-400",
    medium: "bg-amber-400",
    low: "bg-emerald-400",
};

const TYPE_ICON: Record<string, React.ElementType> = {
    alert: AlertTriangle,
    success: TrendingUp,
    warning: Clock,
    opportunity: Megaphone,
};

export function ReportAIInsights({ insights, totalLeads }: Props) {
    const hasEnoughData = totalLeads >= 5;

    return (
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 p-6 h-full text-white">
            {/* Dot texture overlay */}
            <div
                className="absolute inset-0 opacity-[0.07]"
                style={{
                    backgroundImage:
                        "radial-gradient(circle, white 1px, transparent 1px)",
                    backgroundSize: "14px 14px",
                }}
            />

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-amber-300" />
                        <h3 className="text-base font-semibold">Insights da IA</h3>
                    </div>
                    {hasEnoughData && insights.length > 0 && (
                        <span className="flex items-center gap-1.5 text-xs bg-white/15 backdrop-blur-sm px-2.5 py-1 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            {insights.length} insight{insights.length > 1 ? "s" : ""}
                        </span>
                    )}
                </div>

                {!hasEnoughData ? (
                    /* State B — Not enough data */
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <Sparkles className="w-10 h-10 mb-3 opacity-50 animate-pulse" />
                        <p className="text-sm font-medium text-white/90 mb-1">
                            Colete mais leads para ativar os insights
                        </p>
                        <p className="text-xs text-white/60 mb-4">
                            Precisamos de pelo menos 5 leads no período selecionado
                        </p>
                        <div className="w-48 bg-white/10 rounded-full h-2">
                            <div
                                className="h-full bg-white/40 rounded-full transition-all duration-500"
                                style={{ width: `${Math.min((totalLeads / 5) * 100, 100)}%` }}
                            />
                        </div>
                        <p className="text-xs text-white/40 mt-1.5">
                            {totalLeads}/5 leads
                        </p>
                    </div>
                ) : insights.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <TrendingUp className="w-10 h-10 mb-3 opacity-50" />
                        <p className="text-sm font-medium text-white/90">
                            Tudo parece estar bem!
                        </p>
                        <p className="text-xs text-white/60 mt-1">
                            Nenhum alerta ou insight relevante no momento.
                        </p>
                    </div>
                ) : (
                    /* State A — Insights available */
                    <div className="space-y-2.5">
                        {insights.map((insight, i) => {
                            const Icon = TYPE_ICON[insight.type] || Sparkles;
                            return (
                                <div
                                    key={i}
                                    className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 hover:bg-white/15 transition-colors"
                                >
                                    <div className="flex items-start gap-3">
                                        <Icon className="w-4 h-4 mt-0.5 flex-shrink-0 opacity-80" />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className="text-sm font-semibold truncate">
                                                    {insight.title}
                                                </span>
                                                <span
                                                    className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${PRIORITY_DOT[insight.priority]}`}
                                                />
                                            </div>
                                            <p className="text-xs text-white/70 leading-relaxed">
                                                {insight.description}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

export function ReportAIInsightsSkeleton() {
    return (
        <div className="rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 p-6">
            <div className="w-32 h-5 bg-white/20 rounded animate-pulse mb-4" />
            <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-16 bg-white/10 rounded-xl animate-pulse" />
                ))}
            </div>
        </div>
    );
}
