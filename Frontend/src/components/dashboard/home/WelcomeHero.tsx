import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Sparkles } from "lucide-react";
import { endOfMonth, format, isSameDay, startOfDay, startOfMonth, subDays, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { DateRange } from "react-day-picker";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarUI } from "@/components/ui/calendar";

export interface HomeDateRange {
  dateStart: Date;
  dateEnd: Date;
}

interface WelcomeHeroProps {
  greeting: string;
  userName: string;
  pendingTasks?: number;
  dateRange: HomeDateRange;
  periodLabel: string;
  onApplyDateRange: (dateRange: HomeDateRange) => void;
  onResetDateRange: () => void;
}

interface PresetOption {
  id: string;
  label: string;
  range: HomeDateRange;
}

function buildPresetOptions(referenceDate: Date): PresetOption[] {
  const today = startOfDay(referenceDate);
  const yesterday = startOfDay(subDays(today, 1));
  const previousMonth = subMonths(today, 1);

  return [
    {
      id: "today",
      label: "Hoje",
      range: { dateStart: today, dateEnd: today },
    },
    {
      id: "yesterday",
      label: "Ontem",
      range: { dateStart: yesterday, dateEnd: yesterday },
    },
    {
      id: "last-7-days",
      label: "7 dias",
      range: { dateStart: startOfDay(subDays(today, 6)), dateEnd: today },
    },
    {
      id: "last-30-days",
      label: "30 dias",
      range: { dateStart: startOfDay(subDays(today, 29)), dateEnd: today },
    },
    {
      id: "current-month",
      label: "Este mês",
      range: { dateStart: startOfMonth(today), dateEnd: today },
    },
    {
      id: "previous-month",
      label: "Mês passado",
      range: { dateStart: startOfMonth(previousMonth), dateEnd: endOfMonth(previousMonth) },
    },
  ];
}

function getResolvedDraftRange(draftRange: DateRange | undefined): HomeDateRange | null {
  if (!draftRange?.from) return null;

  return {
    dateStart: startOfDay(draftRange.from),
    dateEnd: startOfDay(draftRange.to ?? draftRange.from),
  };
}

function isSameRange(left: HomeDateRange | null, right: HomeDateRange) {
  return !!left && isSameDay(left.dateStart, right.dateStart) && isSameDay(left.dateEnd, right.dateEnd);
}

export function WelcomeHero({
  greeting,
  userName,
  pendingTasks = 12,
  dateRange,
  periodLabel,
  onApplyDateRange,
  onResetDateRange,
}: WelcomeHeroProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [draftRange, setDraftRange] = useState<DateRange | undefined>({
    from: dateRange.dateStart,
    to: dateRange.dateEnd,
  });
  const presetOptions = useMemo(() => buildPresetOptions(new Date()), []);

  useEffect(() => {
    setDraftRange({
      from: dateRange.dateStart,
      to: dateRange.dateEnd,
    });
  }, [dateRange.dateEnd, dateRange.dateStart]);

  const resolvedDraftRange = useMemo(() => getResolvedDraftRange(draftRange), [draftRange]);

  const selectedRangeLabel = useMemo(() => {
    if (!draftRange?.from) return "Selecione um dia ou intervalo";
    if (!draftRange?.to) return `${format(draftRange.from, "dd/MM/yyyy", { locale: ptBR })} • Dia único`;

    return `${format(draftRange.from, "dd/MM/yyyy", { locale: ptBR })} - ${format(draftRange.to, "dd/MM/yyyy", { locale: ptBR })}`;
  }, [draftRange]);

  const activePresetId = useMemo(
    () => presetOptions.find((preset) => isSameRange(resolvedDraftRange, preset.range))?.id ?? null,
    [presetOptions, resolvedDraftRange],
  );

  const handleApply = () => {
    if (!resolvedDraftRange) return;

    onApplyDateRange(resolvedDraftRange);
    setIsFilterOpen(false);
  };

  const handlePresetApply = (presetRange: HomeDateRange) => {
    setDraftRange({
      from: presetRange.dateStart,
      to: presetRange.dateEnd,
    });
    onApplyDateRange(presetRange);
    setIsFilterOpen(false);
  };

  const handleReset = () => {
    onResetDateRange();
    setIsFilterOpen(false);
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight font-poppins">
          {greeting},{" "}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
            {userName}
          </span>{" "}
          👋
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 font-poppins">
          Aqui está o resumo do seu dia. Você tem{" "}
          <span className="text-indigo-600 font-semibold">{pendingTasks} tarefas</span> pendentes.
        </p>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              title={periodLabel}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition-all duration-200 font-poppins"
            >
              <CalendarDays className="h-4 w-4" />
              <span>Filtrar Período</span>
              <span className="hidden xl:inline text-xs text-slate-400 dark:text-slate-500">
                {periodLabel}
              </span>
            </button>
          </PopoverTrigger>

          <PopoverContent
            align="end"
            className="w-[340px] sm:w-[380px] p-0 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700"
          >
            <div className="p-4 border-b border-slate-100 dark:border-slate-700">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 font-poppins">
                Filtrar Período
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-poppins">
                {selectedRangeLabel}
              </p>
            </div>

            <div className="px-4 pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 font-poppins mb-3">
                Períodos rápidos
              </p>
              <div className="flex flex-wrap gap-2">
                {presetOptions.map((preset) => {
                  const isActive = activePresetId === preset.id;

                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handlePresetApply(preset.range)}
                      className={`h-8 px-3 rounded-full text-xs font-semibold transition-colors font-poppins ${
                        isActive
                          ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/20"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-3">
              <CalendarUI
                mode="range"
                selected={draftRange}
                onSelect={setDraftRange}
                locale={ptBR}
                className="mx-auto"
              />
              <p className="px-1 pt-2 text-xs text-slate-400 dark:text-slate-500 font-poppins">
                Clique uma vez para um dia único ou duas vezes para definir um intervalo.
              </p>
            </div>

            <div className="px-4 pb-4 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleReset}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors font-poppins"
              >
                Limpar
              </button>

              <button
                type="button"
                onClick={handleApply}
                disabled={!resolvedDraftRange}
                className="inline-flex items-center justify-center h-10 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold shadow-md shadow-indigo-500/20 disabled:opacity-60 disabled:cursor-not-allowed font-poppins"
              >
                Aplicar
              </button>
            </div>
          </PopoverContent>
        </Popover>

        <button className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-sm font-semibold text-white shadow-md shadow-indigo-500/25 hover:shadow-lg hover:shadow-indigo-500/30 hover:-translate-y-0.5 transition-all duration-300 font-poppins">
          <Sparkles className="h-4 w-4" />
          Gerar Relatório AI
        </button>
      </div>
    </div>
  );
}
