import { memo, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

interface StatCardData {
  label: string;
  value: number;
  trend: number | null;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  ringColor: string;
  sparklineColor: string;
  sparkline: number[];
  action: () => void;
}

export interface QuickStatsTrendData {
  totalLeads: number | null;
  newLeads: number | null;
  activeLeads: number | null;
  scheduleCount: number | null;
}

export interface QuickStatsSparklineData {
  totalLeads: number[];
  newLeads: number[];
  activeLeads: number[];
  scheduleCount: number[];
}

function MiniSparkline({ color, data }: { color: string; data: number[] }) {
  if (data.length === 0) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 64;
  const height = 28;
  const padding = 2;
  const denominator = Math.max(data.length - 1, 1);

  const points = data.map((value, index) => {
    const x = padding + (index / denominator) * (width - padding * 2);
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points.join(" ")}
        className="animate-draw-line"
        style={{ strokeDasharray: 1000, strokeDashoffset: 0 }}
      />
    </svg>
  );
}

function AnimatedCounter({ target, duration = 1200 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const previousTargetRef = useRef(0);

  useEffect(() => {
    const startValue = previousTargetRef.current;
    const startTime = performance.now();
    let animationFrame = 0;

    previousTargetRef.current = target;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(startValue + (target - startValue) * eased));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [duration, target]);

  return <span className="tabular-nums">{count.toLocaleString("pt-BR")}</span>;
}

function TrendBadge({ trend }: { trend: number | null }) {
  if (trend === null) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300">
        Sem comparativo
      </span>
    );
  }

  const isPositive = trend >= 0;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
        isPositive
          ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
          : "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400"
      }`}
    >
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        {isPositive ? (
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 17l5-5 3 3 4-4" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 7l5 5 3-3 4 4" />
        )}
      </svg>
      {isPositive ? "+" : "-"}
      {Math.abs(trend).toFixed(1)}%
    </span>
  );
}

const UsersIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
  </svg>
);

const ZapIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
  </svg>
);

const ClockIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <circle cx="12" cy="12" r="10" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
  </svg>
);

const TargetIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

interface QuickStatsGridProps {
  totalLeads: number;
  newLeads: number;
  activeLeads: number;
  scheduleCount: number;
  trends: QuickStatsTrendData;
  sparklines: QuickStatsSparklineData;
}

export const QuickStatsGrid = memo(function QuickStatsGrid({
  totalLeads,
  newLeads,
  activeLeads,
  scheduleCount,
  trends,
  sparklines,
}: QuickStatsGridProps) {
  const navigate = useNavigate();

  const stats: StatCardData[] = [
    {
      label: "Total de Leads",
      value: totalLeads,
      trend: trends.totalLeads,
      icon: <UsersIcon />,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50 dark:bg-indigo-900/30",
      ringColor: "ring-indigo-100 dark:ring-indigo-800/50",
      sparklineColor: "#4F46E5",
      sparkline: sparklines.totalLeads,
      action: () => navigate("/dashboard/clients"),
    },
    {
      label: "Novos Leads",
      value: newLeads,
      trend: trends.newLeads,
      icon: <ZapIcon />,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50 dark:bg-emerald-900/30",
      ringColor: "ring-emerald-100 dark:ring-emerald-800/50",
      sparklineColor: "#10B981",
      sparkline: sparklines.newLeads,
      action: () => navigate("/dashboard/clients"),
    },
    {
      label: "Em Atendimento",
      value: activeLeads,
      trend: trends.activeLeads,
      icon: <ClockIcon />,
      color: "text-amber-600",
      bgColor: "bg-amber-50 dark:bg-amber-900/30",
      ringColor: "ring-amber-100 dark:ring-amber-800/50",
      sparklineColor: "#F59E0B",
      sparkline: sparklines.activeLeads,
      action: () => navigate("/dashboard/clients"),
    },
    {
      label: "Agendamentos",
      value: scheduleCount,
      trend: trends.scheduleCount,
      icon: <TargetIcon />,
      color: "text-violet-600",
      bgColor: "bg-violet-50 dark:bg-violet-900/30",
      ringColor: "ring-violet-100 dark:ring-violet-800/50",
      sparklineColor: "#7C3AED",
      sparkline: sparklines.scheduleCount,
      action: () => navigate("/dashboard/agenda"),
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {stats.map((stat) => (
        <div
          key={stat.label}
          onClick={stat.action}
          className="group relative rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-none hover:shadow-lg hover:shadow-slate-200/50 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer p-6"
        >
          <div className="flex items-start justify-between mb-4">
            <div className={`p-2.5 rounded-xl ${stat.bgColor} ring-1 ${stat.ringColor}`}>
              <span className={stat.color}>{stat.icon}</span>
            </div>
            <MiniSparkline color={stat.sparklineColor} data={stat.sparkline} />
          </div>

          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 font-poppins mb-1">
            {stat.label}
          </p>

          <div className="flex items-end justify-between gap-2">
            <p className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight font-poppins">
              <AnimatedCounter target={stat.value} />
            </p>
            <TrendBadge trend={stat.trend} />
          </div>
        </div>
      ))}
    </div>
  );
});
