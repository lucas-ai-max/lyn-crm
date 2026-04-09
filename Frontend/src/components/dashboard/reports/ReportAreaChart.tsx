import { useMemo } from "react";

export interface ChartPoint {
    label: string;
    leads: number;
    conversions: number;
}

interface Props {
    data: ChartPoint[];
}

export function ReportAreaChart({ data }: Props) {
    const { paths, areaLeads, areaConversions, yLabels, maxY } = useMemo(() => {
        if (data.length === 0)
            return { paths: null, areaLeads: "", areaConversions: "", yLabels: [], maxY: 0 };

        const values = data.flatMap((d) => [d.leads, d.conversions]);
        const rawMax = Math.max(...values, 1);
        // Round up to a nice number
        const magnitude = Math.pow(10, Math.floor(Math.log10(rawMax)));
        const maxY = Math.ceil(rawMax / magnitude) * magnitude || 10;

        const W = 600;
        const H = 220;
        const padL = 40;
        const padR = 10;
        const padT = 10;
        const padB = 30;
        const chartW = W - padL - padR;
        const chartH = H - padT - padB;

        const toX = (i: number) =>
            padL + (data.length === 1 ? chartW / 2 : (i / (data.length - 1)) * chartW);
        const toY = (v: number) => padT + chartH - (v / maxY) * chartH;

        // Bezier helper
        const bezier = (pts: { x: number; y: number }[]) => {
            if (pts.length < 2) return "";
            let d = `M${pts[0].x},${pts[0].y}`;
            for (let i = 1; i < pts.length; i++) {
                const cx = (pts[i - 1].x + pts[i].x) / 2;
                d += ` C${cx},${pts[i - 1].y} ${cx},${pts[i].y} ${pts[i].x},${pts[i].y}`;
            }
            return d;
        };

        const leadPts = data.map((d, i) => ({ x: toX(i), y: toY(d.leads) }));
        const convPts = data.map((d, i) => ({ x: toX(i), y: toY(d.conversions) }));

        const leadPath = bezier(leadPts);
        const convPath = bezier(convPts);

        const baseline = padT + chartH;
        const areaLeads = `${leadPath} L${leadPts[leadPts.length - 1].x},${baseline} L${leadPts[0].x},${baseline} Z`;
        const areaConversions = `${convPath} L${convPts[convPts.length - 1].x},${baseline} L${convPts[0].x},${baseline} Z`;

        const steps = 4;
        const yLabels = Array.from({ length: steps + 1 }, (_, i) => {
            const val = Math.round((maxY / steps) * i);
            return { val, y: toY(val) };
        });

        return {
            paths: { leadPath, convPath, leadPts, convPts, padL, padR, padT, padB, W, H, chartW, chartH, baseline, toX },
            areaLeads,
            areaConversions,
            yLabels,
            maxY,
        };
    }, [data]);

    if (!paths || data.length === 0) {
        return (
            <div className="rounded-2xl bg-white border border-slate-100 p-6">
                <h3 className="text-base font-semibold text-slate-900 mb-4">Volume de Leads</h3>
                <div className="h-[240px] flex items-center justify-center text-sm text-slate-400">
                    Sem dados para o período selecionado
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-2xl bg-white border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-slate-900">Volume de Leads</h3>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> Leads
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Conversões
                    </span>
                </div>
            </div>

            <svg
                viewBox={`0 0 ${paths.W} ${paths.H}`}
                className="w-full"
                preserveAspectRatio="xMidYMid meet"
            >
                <defs>
                    <linearGradient id="rpt-grad-leads" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity="0.02" />
                    </linearGradient>
                    <linearGradient id="rpt-grad-conv" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
                    </linearGradient>
                </defs>

                {/* Grid lines */}
                {yLabels.map((yl) => (
                    <g key={yl.val}>
                        <line
                            x1={paths.padL}
                            y1={yl.y}
                            x2={paths.W - paths.padR}
                            y2={yl.y}
                            stroke="#e2e8f0"
                            strokeWidth="0.5"
                        />
                        <text x={paths.padL - 6} y={yl.y + 3} textAnchor="end" className="fill-slate-400" fontSize="9">
                            {yl.val}
                        </text>
                    </g>
                ))}

                {/* X axis labels */}
                {data.map((d, i) => {
                    // Show at most ~8 labels to avoid crowding
                    const step = Math.max(1, Math.floor(data.length / 8));
                    if (i % step !== 0 && i !== data.length - 1) return null;
                    return (
                        <text
                            key={i}
                            x={paths.toX(i)}
                            y={paths.H - 5}
                            textAnchor="middle"
                            className="fill-slate-400"
                            fontSize="9"
                        >
                            {d.label}
                        </text>
                    );
                })}

                {/* Areas */}
                <path d={areaLeads} fill="url(#rpt-grad-leads)" />
                <path d={areaConversions} fill="url(#rpt-grad-conv)" />

                {/* Lines */}
                <path d={paths.leadPath} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" />
                <path d={paths.convPath} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />

                {/* Dots */}
                {paths.leadPts.map((pt, i) => (
                    <circle key={`l${i}`} cx={pt.x} cy={pt.y} r="3" fill="#6366f1" />
                ))}
                {paths.convPts.map((pt, i) => (
                    <circle key={`c${i}`} cx={pt.x} cy={pt.y} r="3" fill="#10b981" />
                ))}
            </svg>
        </div>
    );
}

export function ReportAreaChartSkeleton() {
    return (
        <div className="rounded-2xl bg-white border border-slate-100 p-6">
            <div className="w-32 h-5 rounded bg-slate-100 animate-pulse mb-4" />
            <div className="w-full h-[200px] rounded-xl bg-slate-50 animate-pulse" />
        </div>
    );
}
