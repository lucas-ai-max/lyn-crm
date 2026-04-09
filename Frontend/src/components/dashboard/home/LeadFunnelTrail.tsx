import { useMemo, memo } from "react";
import { useNavigate } from "react-router-dom";
import type { LeadWithLastMessage } from "@/hooks/useLeads";

// --- Types ---
interface FunnelStep {
  stage: string;
  count: number;
  percentage: number;
  color: string;
  barColor: string;
}

interface LeadFunnelTrailProps {
  leads: LeadWithLastMessage[];
  stages: string[];
}

const DEFAULT_STAGES = [
  "Novos",
  "Qualificação",
  "Proposta",
  "Negociação",
  "Fechamento",
];

const STAGE_COLORS: Record<string, { color: string; barColor: string }> = {
  novos: { color: "text-indigo-600", barColor: "from-indigo-500 to-indigo-500" },
  novo: { color: "text-indigo-600", barColor: "from-indigo-500 to-indigo-500" },
  qualificacao: { color: "text-indigo-400", barColor: "from-indigo-400 to-indigo-400" },
  qualificacao_inicial: { color: "text-indigo-400", barColor: "from-indigo-400 to-indigo-400" },
  proposta: { color: "text-violet-500", barColor: "from-violet-400 to-violet-500" },
  objecao: { color: "text-violet-500", barColor: "from-violet-400 to-violet-500" },
  negociacao: { color: "text-violet-400", barColor: "from-violet-300 to-violet-400" },
  em_andamento: { color: "text-violet-400", barColor: "from-violet-300 to-violet-400" },
  agendamento: { color: "text-emerald-500", barColor: "from-emerald-400 to-emerald-500" },
  fechamento: { color: "text-emerald-500", barColor: "from-emerald-400 to-emerald-500" },
};

const FALLBACK_COLORS = [
  { color: "text-indigo-500", barColor: "from-indigo-500 to-indigo-500" },
  { color: "text-indigo-400", barColor: "from-indigo-400 to-indigo-400" },
  { color: "text-violet-500", barColor: "from-violet-400 to-violet-500" },
  { color: "text-violet-400", barColor: "from-violet-300 to-violet-400" },
  { color: "text-emerald-500", barColor: "from-emerald-400 to-emerald-500" },
];

const normalizeStatusKey = (value?: string | null) =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[^\p{Letter}\p{Number}\s_/-]/gu, "")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s/-]+/g, "_");

export const LeadFunnelTrail = memo(function LeadFunnelTrail({ leads, stages }: LeadFunnelTrailProps) {
  const navigate = useNavigate();

  const { funnelData, totalLeads, conversionRate } = useMemo(() => {
    const orderedStages = (stages.length > 0 ? stages : DEFAULT_STAGES)
      .map((s) => s.trim())
      .filter(Boolean);

    const countsByStage: FunnelStep[] = orderedStages.map((stage, index) => {
      const key = normalizeStatusKey(stage);
      const count = leads.reduce(
        (acc, lead) => (normalizeStatusKey(lead.stage?.name || lead.status) === key ? acc + 1 : acc),
        0
      );
      const colors = STAGE_COLORS[key] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length];
      return {
        stage,
        count,
        percentage: 0,
        ...colors,
      };
    });

    // Gather unmapped leads
    const knownKeys = new Set(orderedStages.map(normalizeStatusKey));
    const extras = new Map<string, { label: string; count: number }>();
    leads.forEach((lead) => {
      const label = lead.stage?.name || lead.status || "Sem status";
      const key = normalizeStatusKey(label);
      if (!key || knownKeys.has(key)) return;
      const existing = extras.get(key) ?? { label: label.trim() || "Sem status", count: 0 };
      extras.set(key, { label: existing.label, count: existing.count + 1 });
    });
    const extraSteps: FunnelStep[] = Array.from(extras.entries()).map(([, val], i) => ({
      stage: val.label,
      count: val.count,
      percentage: 0,
      ...FALLBACK_COLORS[(countsByStage.length + i) % FALLBACK_COLORS.length],
    }));

    const all = [...countsByStage, ...extraSteps];
    const total = leads.length || 1;
    all.forEach((s) => {
      s.percentage = Math.round((s.count / total) * 100);
    });

    const lastCount = all.length > 0 ? all[all.length - 1].count : 0;
    const firstCount = all.length > 0 ? all[0].count : 1;
    const rate = firstCount > 0 ? Math.round((lastCount / firstCount) * 100) : 0;

    return { funnelData: all, totalLeads: total, conversionRate: rate };
  }, [leads, stages]);

  const maxCount = Math.max(...funnelData.map((s) => s.count), 1);

  if (leads.length === 0) {
    return (
      <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-poppins">
              Pipeline de Vendas
            </h3>
            <p className="text-sm text-slate-400 font-poppins">Distribuição por estágio</p>
          </div>
        </div>

        <div className="h-[220px] flex items-center justify-center text-sm text-slate-400 font-poppins">
          Nenhum lead encontrado no período selecionado
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-6 cursor-pointer hover:shadow-lg hover:shadow-slate-200/50 transition-all duration-300"
      onClick={() => navigate("/dashboard/clients")}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-poppins">
            Pipeline de Vendas
          </h3>
          <p className="text-sm text-slate-400 font-poppins">Distribuição por estágio</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 font-poppins">
            {conversionRate}%
          </p>
          <p className="text-xs text-slate-400 font-poppins">Taxa de conversão</p>
        </div>
      </div>

      {/* Horizontal Bars */}
      <div className="space-y-3">
        {funnelData.map((step, index) => (
          <div key={step.stage} className="flex items-center gap-3">
            {/* Stage Name */}
            <span className="w-24 text-sm font-medium text-slate-600 dark:text-slate-300 font-poppins truncate flex-shrink-0">
              {step.stage}
            </span>

            {/* Bar Container */}
            <div className="flex-1 h-7 bg-slate-50 dark:bg-slate-700/50 rounded-lg overflow-hidden relative">
              <div
                className={`h-full bg-gradient-to-r ${step.barColor} rounded-lg animate-bar-fill origin-left`}
                style={{
                  width: `${maxCount > 0 ? (step.count / maxCount) * 100 : 0}%`,
                  animationDelay: `${index * 100}ms`,
                }}
              >
                {/* Percentage inside bar */}
                {step.percentage >= 20 && (
                  <span className="absolute inset-y-0 left-3 flex items-center text-[11px] font-semibold text-white font-poppins">
                    {step.percentage}%
                  </span>
                )}
              </div>
            </div>

            {/* Count */}
            <span className="w-10 text-right text-sm font-bold text-slate-900 dark:text-slate-100 font-poppins flex-shrink-0">
              {step.count}
            </span>
          </div>
        ))}
      </div>

      {/* Drop-off indicators */}
      {funnelData.length >= 2 && (
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex flex-wrap gap-2">
          {funnelData.slice(0, -1).map((step, i) => {
            const nextCount = funnelData[i + 1]?.count ?? 0;
            const dropoff = step.count > 0 ? Math.round(((step.count - nextCount) / step.count) * 100) : 0;
            if (dropoff <= 0) return null;
            return (
              <span
                key={`drop-${i}`}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-red-50 dark:bg-red-900/20 text-[10px] font-semibold text-red-500 dark:text-red-400 font-poppins"
              >
                {step.stage} → {funnelData[i + 1].stage}: -{dropoff}%
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
});
