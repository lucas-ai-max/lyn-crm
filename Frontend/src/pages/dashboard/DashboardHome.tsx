import { useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  endOfDay,
  format,
  isSameDay,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
} from "date-fns";
import { ptBR } from "date-fns/locale";

import { WelcomeHero, type HomeDateRange } from "@/components/dashboard/home/WelcomeHero";
import { QuickStatsGrid, type QuickStatsSparklineData, type QuickStatsTrendData } from "@/components/dashboard/home/QuickStatsGrid";
import { LeadsAreaChart, type ChartPoint } from "@/components/dashboard/home/LeadsAreaChart";
import { LeadFunnelTrail } from "@/components/dashboard/home/LeadFunnelTrail";
import { DashboardAIInsights } from "@/components/dashboard/home/DashboardAIInsights";
import { RecentLeadsCard } from "@/components/dashboard/home/RecentLeadsCard";
import { useProfile } from "@/hooks/useProfile";
import { useAllLeads, type LeadWithLastMessage } from "@/hooks/useLeads";
import { useCompany } from "@/hooks/useCompany";
import { classifyLeadLifecycle, isLeadConverted } from "@/lib/leads/leadLifecycle";

type BucketGranularity = "day" | "week" | "month";

interface LeadMetrics {
  totalLeads: number;
  newLeads: number;
  activeLeads: number;
  scheduleCount: number;
}

interface TimeBucket {
  key: string;
  label: string;
}

interface HomeSeriesPoint extends ChartPoint {
  totalLeads: number;
  newLeads: number;
  activeLeads: number;
  scheduleCount: number;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function getDefaultDateRange(): HomeDateRange {
  return {
    dateStart: startOfDay(subDays(new Date(), 29)),
    dateEnd: startOfDay(new Date()),
  };
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0 && current === 0) return null;
  if (previous === 0) return 100;
  return ((current - previous) / previous) * 100;
}

function getBucketGranularity(daySpan: number): BucketGranularity {
  if (daySpan <= 14) return "day";
  if (daySpan <= 60) return "week";
  return "month";
}

function getBucketKey(date: Date, granularity: BucketGranularity) {
  if (granularity === "day") return format(startOfDay(date), "yyyy-MM-dd");
  if (granularity === "week") return format(startOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd");
  return format(startOfMonth(date), "yyyy-MM-dd");
}

function buildTimeBuckets(startDate: Date, endDate: Date) {
  const daySpan = differenceInCalendarDays(endDate, startDate) + 1;
  const granularity = getBucketGranularity(daySpan);
  const buckets: TimeBucket[] = [];

  if (granularity === "day") {
    let cursor = startOfDay(startDate);
    while (cursor.getTime() <= endDate.getTime()) {
      buckets.push({
        key: getBucketKey(cursor, granularity),
        label: format(cursor, "dd/MM", { locale: ptBR }),
      });
      cursor = addDays(cursor, 1);
    }
    return { granularity, buckets };
  }

  if (granularity === "week") {
    let cursor = startOfWeek(startDate, { weekStartsOn: 1 });
    while (cursor.getTime() <= endDate.getTime()) {
      buckets.push({
        key: getBucketKey(cursor, granularity),
        label: format(cursor, "dd/MM", { locale: ptBR }),
      });
      cursor = addWeeks(cursor, 1);
    }
    return { granularity, buckets };
  }

  let cursor = startOfMonth(startDate);
  while (cursor.getTime() <= endDate.getTime()) {
    buckets.push({
      key: getBucketKey(cursor, granularity),
      label: format(cursor, "MMM yy", { locale: ptBR }),
    });
    cursor = addMonths(cursor, 1);
  }
  return { granularity, buckets };
}

function buildLeadMetrics(leads: LeadWithLastMessage[]): LeadMetrics {
  return leads.reduce(
    (acc, lead) => {
      const lifecycle = classifyLeadLifecycle({
        status: lead.status,
        stage: lead.stage,
      });

      acc.totalLeads += 1;
      if (lifecycle === "new") acc.newLeads += 1;
      if (lifecycle === "active") acc.activeLeads += 1;
      if (lifecycle === "scheduled") acc.scheduleCount += 1;
      return acc;
    },
    { totalLeads: 0, newLeads: 0, activeLeads: 0, scheduleCount: 0 },
  );
}

function buildLeadSeries(leads: LeadWithLastMessage[], buckets: TimeBucket[], granularity: BucketGranularity): HomeSeriesPoint[] {
  const bucketIndex = new Map(buckets.map((bucket, index) => [bucket.key, index]));
  const series: HomeSeriesPoint[] = buckets.map((bucket) => ({
    label: bucket.label,
    leads: 0,
    conversions: 0,
    totalLeads: 0,
    newLeads: 0,
    activeLeads: 0,
    scheduleCount: 0,
  }));

  leads.forEach((lead) => {
    if (!lead.created_at) return;

    const createdAt = new Date(lead.created_at);
    if (Number.isNaN(createdAt.getTime())) return;

    const index = bucketIndex.get(getBucketKey(createdAt, granularity));
    if (index === undefined) return;

    const bucket = series[index];
    const lifecycle = classifyLeadLifecycle({
      status: lead.status,
      stage: lead.stage,
    });
    bucket.leads += 1;
    bucket.totalLeads += 1;
    if (lifecycle === "new") bucket.newLeads += 1;
    if (lifecycle === "active") bucket.activeLeads += 1;
    if (lifecycle === "scheduled") bucket.scheduleCount += 1;
    if (isLeadConverted({ status: lead.status, stage: lead.stage })) bucket.conversions += 1;
  });

  return series;
}

function isDateWithinRange(dateValue: string | null | undefined, startDate: Date, endDate: Date) {
  if (!dateValue) return false;
  const parsedDate = new Date(dateValue);
  if (Number.isNaN(parsedDate.getTime())) return false;
  return parsedDate.getTime() >= startDate.getTime() && parsedDate.getTime() <= endDate.getTime();
}

function buildPeriodLabel(dateRange: HomeDateRange, defaultDateRange: HomeDateRange) {
  const isDefaultRange =
    isSameDay(dateRange.dateStart, defaultDateRange.dateStart) &&
    isSameDay(dateRange.dateEnd, defaultDateRange.dateEnd);

  if (isDefaultRange) return "Últimos 30 dias";

  if (isSameDay(dateRange.dateStart, dateRange.dateEnd)) {
    return format(dateRange.dateStart, "dd MMM yyyy", { locale: ptBR });
  }

  return `${format(dateRange.dateStart, "dd MMM", { locale: ptBR })} - ${format(dateRange.dateEnd, "dd MMM", { locale: ptBR })}`;
}

function fallbackSparkline(values: number[]) {
  return values.length > 0 ? values : [0];
}

export default function DashboardHome() {
  const defaultDateRange = useMemo(() => getDefaultDateRange(), []);
  const [dateRange, setDateRange] = useState<HomeDateRange>(defaultDateRange);

  const { data: profile } = useProfile();
  const { data: leads = [] } = useAllLeads();
  const { statusType: companyStatus } = useCompany();

  const userName = profile?.first_name || "Usuário";

  const stages = useMemo(() => companyStatus?.filter(Boolean) || [], [companyStatus]);

  const currentRangeStart = useMemo(() => startOfDay(dateRange.dateStart), [dateRange.dateStart]);
  const currentRangeEnd = useMemo(() => endOfDay(dateRange.dateEnd), [dateRange.dateEnd]);
  const daySpan = useMemo(
    () => differenceInCalendarDays(dateRange.dateEnd, dateRange.dateStart) + 1,
    [dateRange.dateEnd, dateRange.dateStart],
  );

    const previousRangeStart = useMemo(() => startOfDay(subDays(dateRange.dateStart, daySpan)), [dateRange.dateStart, daySpan]);
  const previousRangeEnd = useMemo(() => endOfDay(subDays(dateRange.dateStart, 1)), [dateRange.dateStart]);

  const filteredLeads = useMemo(
    () => leads.filter((lead) => isDateWithinRange(lead.created_at, currentRangeStart, currentRangeEnd)),
    [leads, currentRangeEnd, currentRangeStart],
  );

  const previousLeads = useMemo(
    () => leads.filter((lead) => isDateWithinRange(lead.created_at, previousRangeStart, previousRangeEnd)),
    [leads, previousRangeEnd, previousRangeStart],
  );

  const leadCounts = useMemo(() => buildLeadMetrics(filteredLeads), [filteredLeads]);
  const previousLeadCounts = useMemo(() => buildLeadMetrics(previousLeads), [previousLeads]);

  const { buckets, granularity } = useMemo(
    () => buildTimeBuckets(currentRangeStart, currentRangeEnd),
    [currentRangeEnd, currentRangeStart],
  );

  const series = useMemo(
    () => buildLeadSeries(filteredLeads, buckets, granularity),
    [buckets, filteredLeads, granularity],
  );

  const chartData = useMemo<ChartPoint[]>(
    () =>
      filteredLeads.length === 0
        ? []
        : series.map(({ label, leads: bucketLeads, conversions }) => ({
            label,
            leads: bucketLeads,
            conversions,
          })),
    [filteredLeads.length, series],
  );

  const trends = useMemo<QuickStatsTrendData>(
    () => ({
      totalLeads: pctChange(leadCounts.totalLeads, previousLeadCounts.totalLeads),
      newLeads: pctChange(leadCounts.newLeads, previousLeadCounts.newLeads),
      activeLeads: pctChange(leadCounts.activeLeads, previousLeadCounts.activeLeads),
      scheduleCount: pctChange(leadCounts.scheduleCount, previousLeadCounts.scheduleCount),
    }),
    [leadCounts, previousLeadCounts],
  );

  const sparklines = useMemo<QuickStatsSparklineData>(
    () => ({
      totalLeads: fallbackSparkline(series.map((point) => point.totalLeads)),
      newLeads: fallbackSparkline(series.map((point) => point.newLeads)),
      activeLeads: fallbackSparkline(series.map((point) => point.activeLeads)),
      scheduleCount: fallbackSparkline(series.map((point) => point.scheduleCount)),
    }),
    [series],
  );

  const periodLabel = useMemo(
    () => buildPeriodLabel(dateRange, defaultDateRange),
    [dateRange, defaultDateRange],
  );

  const handleApplyDateRange = (nextDateRange: HomeDateRange) => {
    setDateRange({
      dateStart: startOfDay(nextDateRange.dateStart),
      dateEnd: startOfDay(nextDateRange.dateEnd),
    });
  };

  const handleResetDateRange = () => {
    setDateRange(defaultDateRange);
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <section className="animate-stagger stagger-1">
        <WelcomeHero
          greeting={getGreeting()}
          userName={userName}
          pendingTasks={leadCounts.activeLeads}
          dateRange={dateRange}
          periodLabel={periodLabel}
          onApplyDateRange={handleApplyDateRange}
          onResetDateRange={handleResetDateRange}
        />
      </section>

      <section className="animate-stagger stagger-2">
        <QuickStatsGrid
          totalLeads={leadCounts.totalLeads}
          newLeads={leadCounts.newLeads}
          activeLeads={leadCounts.activeLeads}
          scheduleCount={leadCounts.scheduleCount}
          trends={trends}
          sparklines={sparklines}
        />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-5 gap-5 animate-stagger stagger-3">
        <div className="lg:col-span-3">
          <LeadsAreaChart data={chartData} periodLabel={periodLabel} />
        </div>
        <div className="lg:col-span-2">
          <LeadFunnelTrail leads={filteredLeads} stages={stages} />
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-5 gap-5 animate-stagger stagger-4">
        <div className="lg:col-span-3">
          <DashboardAIInsights
            dateStart={currentRangeStart}
            dateEnd={currentRangeEnd}
            periodLabel={periodLabel}
          />
        </div>
        <div className="lg:col-span-2">
          <RecentLeadsCard leads={filteredLeads} />
        </div>
      </section>
    </div>
  );
}
