import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePipelines, usePipelineStages } from "@/hooks/usePipelines";
import { differenceInDays, endOfDay, format, startOfDay, startOfMonth, startOfWeek, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart3 } from "lucide-react";

import { ReportFilters, type FilterState } from "@/components/dashboard/reports/ReportFilters";
import { ReportKPIGrid, ReportKPISkeleton, type ReportKPIData } from "@/components/dashboard/reports/ReportKPIGrid";
import { ReportAreaChart, ReportAreaChartSkeleton, type ChartPoint } from "@/components/dashboard/reports/ReportAreaChart";
import { ReportFunnelCard, ReportFunnelSkeleton, type FunnelStage } from "@/components/dashboard/reports/ReportFunnelCard";
import { ReportDonutChart, ReportDonutSkeleton } from "@/components/dashboard/reports/ReportDonutChart";
import { ReportAIInsights, ReportAIInsightsSkeleton, type Insight } from "@/components/dashboard/reports/ReportAIInsights";
import { ReportLeadsTable, ReportLeadsTableSkeleton, type TableLead } from "@/components/dashboard/reports/ReportLeadsTable";
import {
  LIFECYCLE_BUCKETS,
  classifyLeadLifecycle,
  type LeadStageSnapshot,
} from "@/lib/leads/leadLifecycle";

const FUNNEL_COLORS = [
  "#6366f1", "#818cf8", "#a78bfa", "#c084fc",
  "#e879f9", "#f472b6", "#fb923c", "#10b981",
];
const ALL_PIPELINES_VALUE = "all";
const EMPTY_FUNIL_VALUE = "__empty_funil__";

interface ReportLeadStage extends LeadStageSnapshot {
  color?: string | null;
}

interface ReportLeadRecord {
  id: string;
  nome: string | null;
  status: string | null;
  segmento: string | null;
  prioridade: string | null;
  created_at: string | null;
  last_message_at: string | null;
  pipeline_id: string | null;
  stage_id: string | null;
  funil: string | null;
  responsavel_id: string | null;
  empresa: string | null;
  stage: ReportLeadStage | null;
}

interface LeadFilterOptions {
  pipelineId?: string | null;
  includeFunil?: boolean;
  includeStage?: boolean;
  columnPrefix?: string;
  referencedTable?: string;
}

interface ReportProfileOption {
  id: string;
  name: string;
}

interface FilterableQuery {
  eq(column: string, value: string): FilterableQuery;
  or(filters: string, options?: { referencedTable?: string }): FilterableQuery;
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0 && current === 0) return null;
  if (previous === 0) return 100;
  return ((current - previous) / previous) * 100;
}

function bucketKey(dateStr: string, daySpan: number): string {
  const d = new Date(dateStr);
  if (daySpan <= 14) return format(d, "dd/MM", { locale: ptBR });
  if (daySpan <= 60) {
    const w = startOfWeek(d, { weekStartsOn: 1 });
    return format(w, "dd/MM", { locale: ptBR });
  }
  return format(startOfMonth(d), "MMM yy", { locale: ptBR });
}

function applyReportLeadFilters(query: FilterableQuery, filters: FilterState, options: LeadFilterOptions = {}) {
  const {
    pipelineId,
    includeFunil = true,
    includeStage = true,
    columnPrefix = "",
    referencedTable,
  } = options;

  let scopedQuery = query;

  if (pipelineId) scopedQuery = scopedQuery.eq(`${columnPrefix}pipeline_id`, pipelineId);
  if (filters.responsavelId !== "all") scopedQuery = scopedQuery.eq(`${columnPrefix}responsavel_id`, filters.responsavelId);
  if (filters.segmento !== "all") scopedQuery = scopedQuery.eq(`${columnPrefix}segmento`, filters.segmento);
  if (includeStage && filters.stageId !== "all") scopedQuery = scopedQuery.eq(`${columnPrefix}stage_id`, filters.stageId);
  if (filters.prioridade !== "all") scopedQuery = scopedQuery.eq(`${columnPrefix}prioridade`, filters.prioridade);

  if (includeFunil && filters.funil !== "all") {
    if (filters.funil === EMPTY_FUNIL_VALUE) {
      scopedQuery = referencedTable
        ? scopedQuery.or("funil.is.null,funil.eq.", { referencedTable })
        : scopedQuery.or("funil.is.null,funil.eq.");
    } else {
      scopedQuery = scopedQuery.eq(`${columnPrefix}funil`, filters.funil);
    }
  }

  return scopedQuery;
}

function countLifeCycleBuckets(leads: Array<{ lifecycle: string }>) {
  const counts = new Map<string, number>();
  LIFECYCLE_BUCKETS.forEach((bucket) => counts.set(bucket.id, 0));
  leads.forEach((item) => {
    counts.set(item.lifecycle, (counts.get(item.lifecycle) ?? 0) + 1);
  });
  return counts;
}

export default function Reports() {
  const { companyId } = useAuth();

  const defaultFilters: FilterState = {
    dateStart: subDays(new Date(), 30),
    dateEnd: new Date(),
    responsavelId: "all",
    segmento: "all",
    stageId: "all",
    funil: "all",
    prioridade: "all",
  };

  const [applied, setApplied] = useState<FilterState>(defaultFilters);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>(ALL_PIPELINES_VALUE);

  const activePipelineId = selectedPipelineId === ALL_PIPELINES_VALUE ? null : selectedPipelineId;
  const showStageFilter = Boolean(activePipelineId);

  const { data: pipelines = [], isLoading: pipelinesLoading } = usePipelines();
  const { data: stages = [], isLoading: stagesLoading } = usePipelineStages(activePipelineId);

  useEffect(() => {
    setApplied((prev) => (prev.stageId === "all" ? prev : { ...prev, stageId: "all" }));
  }, [activePipelineId]);

  const startISO = startOfDay(applied.dateStart).toISOString();
  const endISO = endOfDay(applied.dateEnd).toISOString();
  const daySpan = differenceInDays(applied.dateEnd, applied.dateStart) + 1;
  const prevStart = startOfDay(subDays(applied.dateStart, daySpan)).toISOString();
  const prevEnd = endOfDay(subDays(applied.dateStart, 1)).toISOString();

  const { data: profiles = [] } = useQuery<ReportProfileOption[]>({
    queryKey: ["report-profiles", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("lyn_profiles")
        .select("id, first_name, last_name")
        .eq("company_id", companyId);
      if (error) throw error;
      return ((data || []) as Array<{ id: string; first_name: string | null; last_name: string | null }>).map((profile) => ({
        id: profile.id,
        name: [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Usuário",
      }));
    },
    enabled: !!companyId,
  });

  const {
    data: rawLeads = [],
    isLoading: leadsLoading,
  } = useQuery({
    queryKey: [
      "report-leads",
      companyId,
      startISO,
      endISO,
      activePipelineId ?? ALL_PIPELINES_VALUE,
      applied.responsavelId,
      applied.segmento,
      showStageFilter ? applied.stageId : "all",
      applied.funil,
      applied.prioridade,
    ],
    queryFn: async () => {
      if (!companyId) return [] as ReportLeadRecord[];

      let query = supabase
        .from("lyn_leads")
        .select(`
          id,
          nome,
          status,
          segmento,
          prioridade,
          created_at,
          last_message_at,
          pipeline_id,
          stage_id,
          funil,
          responsavel_id,
          empresa,
          stage:lyn_pipeline_stages(name, color, position, is_final)
        `)
        .eq("company_id", companyId)
        .gte("created_at", startISO)
        .lte("created_at", endISO)
        .order("created_at", { ascending: true });

      query = applyReportLeadFilters(query, applied, {
        pipelineId: activePipelineId,
        includeStage: showStageFilter,
      });

      const { data, error } = await query;
      if (error) throw error;
      return (data as ReportLeadRecord[]) || [];
    },
    enabled: !!companyId,
  });

  const {
    data: prevLeads = [],
    isLoading: prevLeadsLoading,
  } = useQuery({
    queryKey: [
      "report-leads-prev",
      companyId,
      prevStart,
      prevEnd,
      activePipelineId ?? ALL_PIPELINES_VALUE,
      applied.responsavelId,
      applied.segmento,
      showStageFilter ? applied.stageId : "all",
      applied.funil,
      applied.prioridade,
    ],
    queryFn: async () => {
      if (!companyId) return [] as ReportLeadRecord[];

      let query = supabase
        .from("lyn_leads")
        .select(`
          id,
          nome,
          status,
          segmento,
          prioridade,
          created_at,
          last_message_at,
          pipeline_id,
          stage_id,
          funil,
          responsavel_id,
          empresa,
          stage:lyn_pipeline_stages(name, color, position, is_final)
        `)
        .eq("company_id", companyId)
        .gte("created_at", prevStart)
        .lte("created_at", prevEnd)
        .order("created_at", { ascending: true });

      query = applyReportLeadFilters(query, applied, {
        pipelineId: activePipelineId,
        includeStage: showStageFilter,
      });

      const { data, error } = await query;
      if (error) throw error;
      return (data as ReportLeadRecord[]) || [];
    },
    enabled: !!companyId,
  });

  const {
    data: conversationsData,
    isLoading: conversationsLoading,
  } = useQuery({
    queryKey: [
      "report-conversations",
      companyId,
      startISO,
      endISO,
      prevStart,
      prevEnd,
      activePipelineId ?? ALL_PIPELINES_VALUE,
      applied.responsavelId,
      applied.segmento,
      showStageFilter ? applied.stageId : "all",
      applied.funil,
      applied.prioridade,
    ],
    queryFn: async () => {
      if (!companyId) return { current: 0, prev: 0 };

      let currentQuery = supabase
        .from("lyn_conversas")
        .select("id, leads:lyn_leads!inner(company_id, pipeline_id, responsavel_id, segmento, prioridade, funil, stage_id)", { count: "exact", head: true })
        .eq("leads.company_id", companyId)
        .gte("created_at", startISO)
        .lte("created_at", endISO);

      currentQuery = applyReportLeadFilters(currentQuery, applied, {
        pipelineId: activePipelineId,
        includeStage: showStageFilter,
        columnPrefix: "leads.",
        referencedTable: "leads",
      });

      let previousQuery = supabase
        .from("lyn_conversas")
        .select("id, leads:lyn_leads!inner(company_id, pipeline_id, responsavel_id, segmento, prioridade, funil, stage_id)", { count: "exact", head: true })
        .eq("leads.company_id", companyId)
        .gte("created_at", prevStart)
        .lte("created_at", prevEnd);

      previousQuery = applyReportLeadFilters(previousQuery, applied, {
        pipelineId: activePipelineId,
        includeStage: showStageFilter,
        columnPrefix: "leads.",
        referencedTable: "leads",
      });

      const [currentResult, previousResult] = await Promise.all([currentQuery, previousQuery]);
      if (currentResult.error) throw currentResult.error;
      if (previousResult.error) throw previousResult.error;
      return {
        current: currentResult.count ?? 0,
        prev: previousResult.count ?? 0,
      };
    },
    enabled: !!companyId,
  });

  const {
    data: funilOptions = [],
    isLoading: funilOptionsLoading,
  } = useQuery({
    queryKey: [
      "report-funil-options",
      companyId,
      startISO,
      endISO,
      activePipelineId ?? ALL_PIPELINES_VALUE,
      applied.responsavelId,
      applied.segmento,
      showStageFilter ? applied.stageId : "all",
      applied.prioridade,
    ],
    queryFn: async () => {
      if (!companyId) return [] as Array<{ value: string; label: string }>;

      let query = supabase
        .from("lyn_leads")
        .select("funil")
        .eq("company_id", companyId)
        .gte("created_at", startISO)
        .lte("created_at", endISO);

      query = applyReportLeadFilters(query, { ...applied, funil: "all" }, {
        pipelineId: activePipelineId,
        includeFunil: false,
        includeStage: showStageFilter,
      });

      const { data, error } = await query;
      if (error) throw error;

      const uniqueValues = new Set<string>();
      let hasEmpty = false;

      (data || []).forEach((item: { funil: string | null }) => {
        const value = item.funil?.trim() ?? "";
        if (value) uniqueValues.add(value);
        else hasEmpty = true;
      });

      const options = Array.from(uniqueValues)
        .sort((left, right) => left.localeCompare(right, "pt-BR", { sensitivity: "base" }))
        .map((value) => ({ value, label: value }));

      if (hasEmpty) options.unshift({ value: EMPTY_FUNIL_VALUE, label: "Sem funil" });
      return options;
    },
    enabled: !!companyId,
  });

  const segments = useMemo(() => {
    const values = new Set<string>();
    rawLeads.forEach((lead) => lead.segmento && values.add(lead.segmento));
    return Array.from(values).sort((left, right) => left.localeCompare(right, "pt-BR", { sensitivity: "base" }));
  }, [rawLeads]);

  const profileMap = useMemo(() => {
    const map: Record<string, string> = {};
    profiles.forEach((profile) => {
      map[profile.id] = profile.name;
    });
    return map;
  }, [profiles]);

  const classifiedLeads = useMemo(
    () => rawLeads.map((lead) => ({
      lead,
      lifecycle: classifyLeadLifecycle({ status: lead.status, stage: lead.stage }),
    })),
    [rawLeads],
  );

  const classifiedPrevLeads = useMemo(
    () => prevLeads.map((lead) => ({
      lead,
      lifecycle: classifyLeadLifecycle({ status: lead.status, stage: lead.stage }),
    })),
    [prevLeads],
  );

  const sparklineData = useMemo(() => {
    const buckets: Record<string, { total: number; active: number; scheduled: number }> = {};

    classifiedLeads.forEach(({ lead, lifecycle }) => {
      if (!lead.created_at) return;
      const key = bucketKey(lead.created_at, daySpan);
      if (!buckets[key]) buckets[key] = { total: 0, active: 0, scheduled: 0 };
      buckets[key].total += 1;
      if (lifecycle === "active") buckets[key].active += 1;
      if (lifecycle === "scheduled") buckets[key].scheduled += 1;
    });

    const points = Object.values(buckets);
    return {
      total: points.map((point) => point.total),
      active: points.map((point) => point.active),
      scheduled: points.map((point) => point.scheduled),
    };
  }, [classifiedLeads, daySpan]);

  const kpiData: ReportKPIData = useMemo(() => {
    const totalLeads = classifiedLeads.length;
    const prevTotal = classifiedPrevLeads.length;

    const activeLeads = classifiedLeads.filter((item) => item.lifecycle === "active").length;
    const prevActive = classifiedPrevLeads.filter((item) => item.lifecycle === "active").length;

    const scheduledLeads = classifiedLeads.filter((item) => item.lifecycle === "scheduled").length;
    const prevScheduled = classifiedPrevLeads.filter((item) => item.lifecycle === "scheduled").length;

    const conversationsStarted = conversationsData?.current ?? 0;
    const prevConversations = conversationsData?.prev ?? 0;

    const totalSparkline = sparklineData.total.length >= 2 ? sparklineData.total : [0, 0];
    const activeSparkline = sparklineData.active.length >= 2 ? sparklineData.active : [0, 0];
    const scheduledSparkline = sparklineData.scheduled.length >= 2 ? sparklineData.scheduled : [0, 0];

    return {
      totalLeads,
      newLeads: totalLeads,
      activeLeads,
      scheduledLeads,
      conversationsStarted,
      trends: {
        totalLeads: pctChange(totalLeads, prevTotal),
        newLeads: pctChange(totalLeads, prevTotal),
        activeLeads: pctChange(activeLeads, prevActive),
        scheduledLeads: pctChange(scheduledLeads, prevScheduled),
        conversationsStarted: pctChange(conversationsStarted, prevConversations),
      },
      sparklines: {
        totalLeads: totalSparkline,
        newLeads: totalSparkline,
        activeLeads: activeSparkline,
        scheduledLeads: scheduledSparkline,
        conversationsStarted: totalSparkline,
      },
    };
  }, [classifiedLeads, classifiedPrevLeads, conversationsData, sparklineData]);

  const chartData: ChartPoint[] = useMemo(() => {
    const map: Record<string, { leads: number; conversions: number }> = {};

    classifiedLeads.forEach(({ lead, lifecycle }) => {
      if (!lead.created_at) return;
      const key = bucketKey(lead.created_at, daySpan);
      if (!map[key]) map[key] = { leads: 0, conversions: 0 };
      map[key].leads += 1;
      if (lifecycle === "converted") map[key].conversions += 1;
    });

    return Object.entries(map).map(([label, values]) => ({ label, ...values }));
  }, [classifiedLeads, daySpan]);

  const globalLifecycleCounts = useMemo(() => countLifeCycleBuckets(classifiedLeads), [classifiedLeads]);

  const funnelStages: FunnelStage[] = useMemo(() => {
    if (!activePipelineId) {
      return LIFECYCLE_BUCKETS.map((bucket) => ({
        id: bucket.id,
        name: bucket.label,
        count: globalLifecycleCounts.get(bucket.id) ?? 0,
        color: bucket.color,
        highlight: bucket.id === "converted",
      }));
    }

    return stages.map((stage, index) => ({
      id: stage.id,
      name: stage.name,
      count: rawLeads.filter((lead) => lead.stage_id === stage.id).length,
      color: stage.color || FUNNEL_COLORS[index % FUNNEL_COLORS.length],
      highlight: Boolean(stage.is_final),
    }));
  }, [activePipelineId, globalLifecycleCounts, rawLeads, stages]);

  const conversionCount = useMemo(
    () => classifiedLeads.filter((item) => item.lifecycle === "converted").length,
    [classifiedLeads],
  );

  const donutData = useMemo(() => {
    if (!activePipelineId) {
      return LIFECYCLE_BUCKETS.map((bucket) => ({
        id: bucket.id,
        name: bucket.label,
        count: globalLifecycleCounts.get(bucket.id) ?? 0,
        color: bucket.color,
      }));
    }

    return stages.map((stage, index) => ({
      id: stage.id,
      name: stage.name,
      count: rawLeads.filter((lead) => lead.stage_id === stage.id).length,
      color: stage.color || FUNNEL_COLORS[index % FUNNEL_COLORS.length],
    }));
  }, [activePipelineId, globalLifecycleCounts, rawLeads, stages]);

  const insights: Insight[] = useMemo(() => {
    if (classifiedLeads.length < 5) return [];

    const result: Insight[] = [];

    if (funnelStages.length >= 3) {
      let maxDrop = 0;
      let bottleneckFrom = "";
      let bottleneckTo = "";

      for (let index = 1; index < funnelStages.length; index += 1) {
        const previous = funnelStages[index - 1];
        const current = funnelStages[index];
        const diff = previous.count > 0 ? previous.count - current.count : 0;

        if (diff > maxDrop) {
          maxDrop = diff;
          bottleneckFrom = previous.name;
          bottleneckTo = current.name;
        }
      }

      if (maxDrop > 0) {
        result.push({
          type: "alert",
          priority: "high",
          title: `Gargalo: ${bottleneckFrom} → ${bottleneckTo}`,
          description: `${maxDrop} leads são perdidos nessa transição. Revise esse ponto do processo.`,
        });
      }
    }

    const funilMap: Record<string, number> = {};
    rawLeads.forEach((lead) => {
      const label = lead.funil?.trim() || "Sem funil";
      funilMap[label] = (funilMap[label] || 0) + 1;
    });

    const rankedFunis = Object.entries(funilMap).sort((left, right) => right[1] - left[1]);
    if (rankedFunis.length > 0 && rankedFunis[0][1] > 0) {
      const pct = ((rankedFunis[0][1] / rawLeads.length) * 100).toFixed(0);
      result.push({
        type: "opportunity",
        priority: "medium",
        title: `Funil destaque: ${rankedFunis[0][0]}`,
        description: `${pct}% dos leads vêm deste grupo (${rankedFunis[0][1]} leads).`,
      });
    }

    const conversionRate = rawLeads.length > 0 ? (conversionCount / rawLeads.length) * 100 : 0;
    if (conversionRate < 10 && rawLeads.length >= 10) {
      result.push({
        type: "warning",
        priority: "high",
        title: "Taxa de conversão baixa",
        description: `Apenas ${conversionRate.toFixed(1)}% dos leads convertem no período filtrado.`,
      });
    } else if (conversionRate > 25) {
      result.push({
        type: "success",
        priority: "low",
        title: "Boa taxa de conversão",
        description: `${conversionRate.toFixed(1)}% dos leads convertem no período filtrado.`,
      });
    }

    const now = new Date();
    const staleCount = rawLeads.filter((lead) => {
      const lastActivity = lead.last_message_at || lead.created_at;
      if (!lastActivity) return false;
      const diffDays = (now.getTime() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24);
      return diffDays > 7;
    }).length;

    if (staleCount > 0) {
      result.push({
        type: "warning",
        priority: "medium",
        title: `${staleCount} leads inativos`,
        description: "Esses leads não têm interação há mais de 7 dias. Considere reengajamento.",
      });
    }

    return result;
  }, [classifiedLeads.length, conversionCount, funnelStages, rawLeads]);

  const tableLeads: TableLead[] = useMemo(
    () => rawLeads.map((lead) => ({
      id: lead.id,
      nome: lead.nome,
      responsavel_name: profileMap[lead.responsavel_id ?? ""] || null,
      stage_name: lead.stage?.name || lead.status || null,
      stage_color: lead.stage?.color || null,
      funil: lead.funil?.trim() || null,
      prioridade: lead.prioridade || null,
      created_at: lead.created_at,
      last_activity: lead.last_message_at || lead.created_at,
    })),
    [profileMap, rawLeads],
  );

  const handleApplyFilters = useCallback((filters: FilterState) => {
    setApplied(filters);
  }, []);

  const isLoading =
    leadsLoading ||
    prevLeadsLoading ||
    conversationsLoading ||
    pipelinesLoading ||
    (showStageFilter && stagesLoading);

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
          <BarChart3 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Relatórios</h1>
          <p className="text-sm text-slate-500">Análise completa de vendas e performance</p>
        </div>
      </div>

      <ReportFilters
        initialFilters={applied}
        onApply={handleApplyFilters}
        profiles={profiles}
        segments={segments}
        stages={stages}
        funilOptions={funilOptions}
        showStageFilter={showStageFilter}
        isLoading={isLoading || funilOptionsLoading}
      />

      {pipelines.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pipeline:</span>
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setSelectedPipelineId(ALL_PIPELINES_VALUE)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                !activePipelineId
                  ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200"
                  : "bg-slate-50 text-slate-500 hover:bg-slate-100"
              }`}
            >
              Todos os pipelines
            </button>
            {pipelines.map((pipeline) => (
              <button
                key={pipeline.id}
                onClick={() => setSelectedPipelineId(pipeline.id)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                  activePipelineId === pipeline.id
                    ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200"
                    : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                }`}
              >
                {pipeline.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {isLoading ? <ReportKPISkeleton /> : <ReportKPIGrid data={kpiData} />}

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          {isLoading ? <ReportAreaChartSkeleton /> : <ReportAreaChart data={chartData} />}
        </div>
        <div className="lg:col-span-2">
          {isLoading ? (
            <ReportFunnelSkeleton />
          ) : (
            <ReportFunnelCard
              stages={funnelStages}
              totalLeads={kpiData.totalLeads}
              conversionCount={conversionCount}
              mode={activePipelineId ? "pipeline" : "global"}
            />
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          {isLoading ? (
            <ReportDonutSkeleton />
          ) : (
            <ReportDonutChart
              data={donutData}
              title={activePipelineId ? "Distribuição por Fases" : "Distribuição por Ciclo de Vida"}
            />
          )}
        </div>
        <div className="lg:col-span-3">
          {isLoading ? <ReportAIInsightsSkeleton /> : (
            <ReportAIInsights insights={insights} totalLeads={kpiData.totalLeads} />
          )}
        </div>
      </div>

      {isLoading ? <ReportLeadsTableSkeleton /> : <ReportLeadsTable leads={tableLeads} />}
    </div>
  );
}
