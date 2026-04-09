import { useMemo } from "react";

const FUNNEL_COLORS = [
    "#6366f1", "#818cf8", "#a78bfa", "#c084fc",
    "#e879f9", "#f472b6", "#fb923c", "#10b981",
];

export interface FunnelStage {
    id: string;
    name: string;
    count: number;
    color: string | null;
    highlight?: boolean;
}

interface Props {
    stages: FunnelStage[];
    totalLeads: number;
    conversionCount: number;
    mode?: "global" | "pipeline";
}

export function ReportFunnelCard({ stages, totalLeads, conversionCount, mode = "pipeline" }: Props) {
    const { funnelBars, conversionRate, dropoffs } = useMemo(() => {
        if (stages.length === 0) return { funnelBars: [], conversionRate: "0", dropoffs: [] };

        const maxCount = Math.max(...stages.map((s) => s.count), 1);

        const funnelBars = stages.map((stage, i) => ({
            ...stage,
            percentage: totalLeads > 0 ? ((stage.count / totalLeads) * 100).toFixed(1) : "0",
            barWidth: maxCount > 0 ? Math.max((stage.count / maxCount) * 100, 2) : 2,
            displayColor: stage.highlight
                ? "#10b981"
                : stage.color || FUNNEL_COLORS[Math.min(i, FUNNEL_COLORS.length - 2)],
        }));

        const conversionRate =
            totalLeads > 0 ? ((conversionCount / totalLeads) * 100).toFixed(1) : "0";

        const dropoffs = stages.slice(1).map((stage, i) => {
            const prev = stages[i];
            const diff = prev.count - stage.count;
            return {
                from: prev.name,
                to: stage.name,
                dropped: diff,
                dropPct: prev.count > 0 ? ((diff / prev.count) * 100).toFixed(0) : "0",
            };
        });

        return { funnelBars, conversionRate, dropoffs };
    }, [conversionCount, stages, totalLeads]);

    if (stages.length === 0) {
        return (
            <div className="rounded-2xl bg-white border border-slate-100 p-6 h-full">
                <h3 className="text-base font-semibold text-slate-900 mb-4">
                    {mode === "global" ? "Ciclo de Vida Global" : "Pipeline de Conversão"}
                </h3>
                <div className="flex items-center justify-center h-[200px] text-sm text-slate-400">
                    {mode === "global" ? "Nenhum dado disponível" : "Nenhum pipeline configurado"}
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-2xl bg-white border border-slate-100 p-6 h-full">
            <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-semibold text-slate-900">
                    {mode === "global" ? "Ciclo de Vida Global" : "Pipeline de Conversão"}
                </h3>
                <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400">Taxa de conversão</span>
                    <span className="text-sm font-bold text-emerald-600">{conversionRate}%</span>
                </div>
            </div>

            <div className="space-y-3">
                {funnelBars.map((bar) => (
                    <div key={bar.id} className="group">
                        <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-medium text-slate-700 truncate max-w-[140px]">{bar.name}</span>
                            <span className="text-slate-400 tabular-nums">
                                {bar.count} <span className="text-slate-300">({bar.percentage}%)</span>
                            </span>
                        </div>
                        <div className="h-6 w-full bg-slate-50 rounded-lg overflow-hidden">
                            <div
                                className="h-full rounded-lg transition-all duration-700 ease-out"
                                style={{
                                    width: `${bar.barWidth}%`,
                                    backgroundColor: bar.displayColor,
                                    animation: "bar-fill 0.8s ease-out",
                                }}
                            />
                        </div>
                    </div>
                ))}
            </div>

            {/* Drop-off indicators */}
            {dropoffs.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-100">
                    <p className="text-xs font-medium text-slate-400 mb-2">Drop-off entre estágios</p>
                    <div className="flex flex-wrap gap-2">
                        {dropoffs
                            .filter((d) => d.dropped > 0)
                            .slice(0, 4)
                            .map((d) => (
                                <span
                                    key={d.from + d.to}
                                    className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-500"
                                >
                                    {d.from} → {d.to}: -{d.dropPct}%
                                </span>
                            ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export function ReportFunnelSkeleton() {
    return (
        <div className="rounded-2xl bg-white border border-slate-100 p-6">
            <div className="w-40 h-5 bg-slate-100 rounded animate-pulse mb-5" />
            <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i}>
                        <div className="w-20 h-3 bg-slate-100 rounded animate-pulse mb-1" />
                        <div className="h-6 bg-slate-50 rounded-lg">
                            <div
                                className="h-full bg-slate-100 rounded-lg animate-pulse"
                                style={{ width: `${100 - i * 15}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
