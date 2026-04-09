import { useMemo } from "react";

interface DistData {
    id: string;
    name: string;
    count: number;
    color: string;
}

interface Props {
    data: DistData[];
    title?: string;
}

export function ReportDonutChart({ data, title = "Distribuição por Fases" }: Props) {
    const total = useMemo(() => data.reduce((s, d) => s + d.count, 0), [data]);
    const filtered = useMemo(() => data.filter((d) => d.count > 0), [data]);

    const segments = useMemo(() => {
        if (total === 0) return [];
        const R = 80;
        const C = 2 * Math.PI * R;
        let offset = 0;

        return filtered.map((d) => {
            const pct = d.count / total;
            const dash = pct * C;
            const gap = C - dash;
            const seg = {
                ...d,
                pct: (pct * 100).toFixed(1),
                dashArray: `${dash} ${gap}`,
                dashOffset: -offset,
            };
            offset += dash;
            return seg;
        });
    }, [filtered, total]);

    if (total === 0) {
        return (
            <div className="rounded-2xl bg-white border border-slate-100 p-6 h-full">
                <h3 className="text-base font-semibold text-slate-900 mb-4">{title}</h3>
                <div className="h-[240px] flex items-center justify-center text-sm text-slate-400">
                    Nenhum dado disponível
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-2xl bg-white border border-slate-100 p-6 h-full">
            <h3 className="text-base font-semibold text-slate-900 mb-4">{title}</h3>

            <div className="flex items-center gap-6">
                {/* Donut */}
                <div className="relative flex-shrink-0">
                    <svg width="180" height="180" viewBox="0 0 200 200">
                        {segments.map((seg) => (
                            <circle
                                key={seg.id}
                                cx="100"
                                cy="100"
                                r="80"
                                fill="none"
                                stroke={seg.color}
                                strokeWidth="24"
                                strokeDasharray={seg.dashArray}
                                strokeDashoffset={seg.dashOffset}
                                strokeLinecap="round"
                                transform="rotate(-90 100 100)"
                                className="transition-all duration-700"
                            />
                        ))}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-extrabold text-slate-900">{total}</span>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider">leads</span>
                    </div>
                </div>

                {/* Legend */}
                <div className="flex-1 space-y-2 min-w-0">
                    {filtered.map((d) => (
                        <div key={d.id} className="flex items-center gap-2 text-xs">
                            <span
                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: d.color }}
                            />
                            <span className="text-slate-600 truncate flex-1">{d.name}</span>
                            <span className="text-slate-900 font-semibold tabular-nums">{d.count}</span>
                            <span className="text-slate-400 tabular-nums w-10 text-right">
                                {((d.count / total) * 100).toFixed(0)}%
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export function ReportDonutSkeleton() {
    return (
        <div className="rounded-2xl bg-white border border-slate-100 p-6">
            <div className="w-40 h-5 bg-slate-100 rounded animate-pulse mb-4" />
            <div className="flex items-center gap-6">
                <div className="w-[180px] h-[180px] rounded-full bg-slate-50 animate-pulse" />
                <div className="flex-1 space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-4 bg-slate-100 rounded animate-pulse" />
                    ))}
                </div>
            </div>
        </div>
    );
}
