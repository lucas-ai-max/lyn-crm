import { useMemo } from "react";

export interface ChartPoint {
  label: string;
  leads: number;
  conversions: number;
}

interface LeadsAreaChartProps {
  data: ChartPoint[];
  periodLabel: string;
}

export function LeadsAreaChart({ data, periodLabel }: LeadsAreaChartProps) {
  const chart = useMemo(() => {
    if (data.length === 0) {
      return {
        areaLeads: "",
        areaConversions: "",
        leadPath: "",
        conversionPath: "",
        leadPoints: [] as { x: number; y: number }[],
        conversionPoints: [] as { x: number; y: number }[],
        yLabels: [] as { value: number; y: number }[],
      };
    }

    const width = 600;
    const height = 220;
    const paddingLeft = 40;
    const paddingRight = 12;
    const paddingTop = 12;
    const paddingBottom = 30;
    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    const values = data.flatMap((point) => [point.leads, point.conversions]);
    const maxValue = Math.max(...values, 1);
    const magnitude = Math.pow(10, Math.floor(Math.log10(maxValue)));
    const normalizedMax = Math.ceil(maxValue / magnitude) * magnitude || 10;

    const toX = (index: number) =>
      paddingLeft + (data.length === 1 ? chartWidth / 2 : (index / (data.length - 1)) * chartWidth);
    const toY = (value: number) => paddingTop + chartHeight - (value / normalizedMax) * chartHeight;

    const leadPoints = data.map((point, index) => ({ x: toX(index), y: toY(point.leads) }));
    const conversionPoints = data.map((point, index) => ({ x: toX(index), y: toY(point.conversions) }));

    const toBezierPath = (points: { x: number; y: number }[]) => {
      if (points.length === 0) return "";
      if (points.length === 1) return `M${points[0].x},${points[0].y}`;

      let path = `M${points[0].x},${points[0].y}`;
      for (let index = 1; index < points.length; index += 1) {
        const controlX = (points[index - 1].x + points[index].x) / 2;
        path += ` C${controlX},${points[index - 1].y} ${controlX},${points[index].y} ${points[index].x},${points[index].y}`;
      }
      return path;
    };

    const baseline = paddingTop + chartHeight;
    const leadPath = toBezierPath(leadPoints);
    const conversionPath = toBezierPath(conversionPoints);

    const areaLeads =
      leadPoints.length > 0
        ? `${leadPath} L${leadPoints[leadPoints.length - 1].x},${baseline} L${leadPoints[0].x},${baseline} Z`
        : "";
    const areaConversions =
      conversionPoints.length > 0
        ? `${conversionPath} L${conversionPoints[conversionPoints.length - 1].x},${baseline} L${conversionPoints[0].x},${baseline} Z`
        : "";

    const yLabels = Array.from({ length: 5 }, (_, index) => {
      const value = Math.round((normalizedMax / 4) * index);
      return {
        value,
        y: toY(value),
      };
    });

    return {
      width,
      height,
      paddingLeft,
      paddingRight,
      toX,
      areaLeads,
      areaConversions,
      leadPath,
      conversionPath,
      leadPoints,
      conversionPoints,
      yLabels,
    };
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-poppins">
              Volume de Leads
            </h3>
            <p className="text-sm text-slate-400 font-poppins">{periodLabel}</p>
          </div>
        </div>

        <div className="h-[240px] flex items-center justify-center text-sm text-slate-400 font-poppins">
          Sem dados para o período selecionado
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-6">
      <div className="flex items-center justify-between mb-6 gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-poppins">
            Volume de Leads
          </h3>
          <p className="text-sm text-slate-400 font-poppins">{periodLabel}</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
            <span className="text-xs text-slate-400 font-poppins">Leads</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span className="text-xs text-slate-400 font-poppins">Conversões</span>
          </div>
        </div>
      </div>

      <div className="w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${chart.width} ${chart.height}`}
          className="w-full h-auto"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id="home-leads-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#4F46E5" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="home-conv-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {chart.yLabels.map((label, index) => (
            <g key={`y-${index}`}>
              <line
                x1={chart.paddingLeft}
                y1={label.y}
                x2={chart.width - chart.paddingRight}
                y2={label.y}
                stroke="#E2E8F0"
                strokeWidth="0.5"
                strokeDasharray="4 4"
              />
              <text
                x={chart.paddingLeft - 8}
                y={label.y + 4}
                textAnchor="end"
                className="text-[10px] fill-slate-400"
                fontFamily="Plus Jakarta Sans, sans-serif"
              >
                {label.value}
              </text>
            </g>
          ))}

          {data.map((point, index) => {
            const step = Math.max(1, Math.floor(data.length / 8));
            if (index % step !== 0 && index !== data.length - 1) return null;

            return (
              <text
                key={`${point.label}-${index}`}
                x={chart.toX(index)}
                y={chart.height - 6}
                textAnchor="middle"
                className="text-[11px] fill-slate-400"
                fontFamily="Plus Jakarta Sans, sans-serif"
              >
                {point.label}
              </text>
            );
          })}

          <path d={chart.areaLeads} fill="url(#home-leads-gradient)" />
          <path d={chart.areaConversions} fill="url(#home-conv-gradient)" />

          <path
            d={chart.leadPath}
            fill="none"
            stroke="#4F46E5"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d={chart.conversionPath}
            fill="none"
            stroke="#10B981"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {chart.leadPoints.map((point, index) => (
            <circle key={`lead-${index}`} cx={point.x} cy={point.y} r="3.5" fill="#4F46E5" />
          ))}
          {chart.conversionPoints.map((point, index) => (
            <circle key={`conversion-${index}`} cx={point.x} cy={point.y} r="3.5" fill="#10B981" />
          ))}
        </svg>
      </div>
    </div>
  );
}
