import { useEffect, useMemo, useState } from "react";
import { Calendar, Filter, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { PipelineStage } from "@/hooks/usePipelines";

export interface FilterState {
  dateStart: Date;
  dateEnd: Date;
  responsavelId: string;
  segmento: string;
  stageId: string;
  funil: string;
  prioridade: string;
}

interface Props {
  initialFilters: FilterState;
  onApply: (f: FilterState) => void;
  profiles: { id: string; name: string }[];
  segments: string[];
  stages: PipelineStage[];
  funilOptions: Array<{ value: string; label: string }>;
  showStageFilter: boolean;
  isLoading: boolean;
}

export function ReportFilters({
  initialFilters,
  onApply,
  profiles,
  segments,
  stages,
  funilOptions,
  showStageFilter,
  isLoading,
}: Props) {
  const [f, setF] = useState<FilterState>(initialFilters);

  useEffect(() => {
    setF(initialFilters);
  }, [initialFilters]);

  const activeCount = useMemo(() => {
    let c = 0;
    if (f.responsavelId !== "all") c++;
    if (f.segmento !== "all") c++;
    if (showStageFilter && f.stageId !== "all") c++;
    if (f.funil !== "all") c++;
    if (f.prioridade !== "all") c++;
    return c;
  }, [f, showStageFilter]);

  const handleApply = () => onApply(f);

  const handleClear = () => {
    const cleared: FilterState = {
      ...f,
      responsavelId: "all",
      segmento: "all",
      stageId: "all",
      funil: "all",
      prioridade: "all",
    };
    setF(cleared);
    onApply(cleared);
  };

  return (
    <div className="sticky top-16 z-30 rounded-2xl bg-white border border-slate-100 p-5 shadow-sm">
      <div className="flex flex-wrap items-end gap-4">
        {/* Date range */}
        <div className="flex items-end gap-2">
          <FilterField label="Período">
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200 px-3 h-10 text-sm text-slate-700 hover:border-slate-300 transition-colors min-w-[130px]">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {format(f.dateStart, "dd/MM/yyyy", { locale: ptBR })}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarUI
                  mode="single"
                  selected={f.dateStart}
                  onSelect={(d) => d && setF((prev) => ({ ...prev, dateStart: d }))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </FilterField>

          <span className="text-slate-300 pb-2.5">→</span>

          <FilterField label="">
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200 px-3 h-10 text-sm text-slate-700 hover:border-slate-300 transition-colors min-w-[130px]">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {format(f.dateEnd, "dd/MM/yyyy", { locale: ptBR })}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarUI
                  mode="single"
                  selected={f.dateEnd}
                  onSelect={(d) => d && setF((prev) => ({ ...prev, dateEnd: d }))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </FilterField>
        </div>

        {/* Responsável */}
        <FilterField label="Responsável">
          <Select value={f.responsavelId} onValueChange={(v) => setF((prev) => ({ ...prev, responsavelId: v }))}>
            <SelectTrigger className="rounded-xl bg-slate-50 border-slate-200 h-10 min-w-[140px] text-sm">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {profiles.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>

        {/* Segmento */}
        <FilterField label="Segmento">
          <Select value={f.segmento} onValueChange={(v) => setF((prev) => ({ ...prev, segmento: v }))}>
            <SelectTrigger className="rounded-xl bg-slate-50 border-slate-200 h-10 min-w-[140px] text-sm">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {segments.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>

        {showStageFilter && (
          <FilterField label="Fase do Funil">
            <Select value={f.stageId} onValueChange={(v) => setF((prev) => ({ ...prev, stageId: v }))}>
              <SelectTrigger className="rounded-xl bg-slate-50 border-slate-200 h-10 min-w-[140px] text-sm">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {stages.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
        )}

        {/* Funil */}
        <FilterField label="Funil">
          <Select value={f.funil} onValueChange={(v) => setF((prev) => ({ ...prev, funil: v }))}>
            <SelectTrigger className="rounded-xl bg-slate-50 border-slate-200 h-10 min-w-[140px] text-sm">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {funilOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>

        {/* Prioridade */}
        <FilterField label="Prioridade">
          <Select value={f.prioridade} onValueChange={(v) => setF((prev) => ({ ...prev, prioridade: v }))}>
            <SelectTrigger className="rounded-xl bg-slate-50 border-slate-200 h-10 min-w-[140px] text-sm">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="baixa">Baixa</SelectItem>
              <SelectItem value="media">Média</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="urgente">Urgente</SelectItem>
            </SelectContent>
          </Select>
        </FilterField>

        {/* Actions */}
        <div className="flex items-center gap-2 pb-0.5">
          <button
            onClick={handleApply}
            disabled={isLoading}
            className="flex items-center gap-2 h-10 px-5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-medium shadow-md shadow-indigo-500/25 hover:shadow-lg hover:shadow-indigo-500/30 disabled:opacity-60 transition-all"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Filter className="w-3.5 h-3.5" />
            )}
            Aplicar
          </button>

          {activeCount > 0 && (
            <>
              <span className="bg-indigo-50 text-indigo-600 rounded-full px-2.5 py-0.5 text-xs font-semibold">
                {activeCount} filtro{activeCount > 1 ? "s" : ""}
              </span>
              <button
                onClick={handleClear}
                className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors"
              >
                <X className="w-3 h-3" />
                Limpar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </label>
      )}
      {children}
    </div>
  );
}
