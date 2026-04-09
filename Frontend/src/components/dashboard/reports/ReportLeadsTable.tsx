import { useEffect, useMemo, useState } from "react";
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { clampReportTablePage, compareReportTableValues, type ReportTableSortType } from "@/lib/reports/reportTable";

export interface TableLead {
    id: string;
    nome: string | null;
    responsavel_name: string | null;
    stage_name: string | null;
    stage_color: string | null;
    funil: string | null;
    prioridade: string | null;
    created_at: string | null;
    last_activity: string | null;
}

type SortKey = keyof Pick<TableLead, "nome" | "responsavel_name" | "stage_name" | "funil" | "prioridade" | "created_at" | "last_activity">;

interface Props {
    leads: TableLead[];
}

const PAGE_SIZE = 10;

const PRIORITY_BADGE: Record<string, { bg: string; text: string; label: string }> = {
    urgente: { bg: "bg-red-50", text: "text-red-600", label: "Urgente" },
    alta: { bg: "bg-orange-50", text: "text-orange-600", label: "Alta" },
    high: { bg: "bg-orange-50", text: "text-orange-600", label: "Alta" },
    media: { bg: "bg-amber-50", text: "text-amber-600", label: "Média" },
    medium: { bg: "bg-amber-50", text: "text-amber-600", label: "Média" },
    baixa: { bg: "bg-slate-50", text: "text-slate-500", label: "Baixa" },
    low: { bg: "bg-slate-50", text: "text-slate-500", label: "Baixa" },
};

function formatDate(d: string | null) {
    if (!d) return "—";
    try {
        return new Date(d).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "2-digit",
        });
    } catch {
        return "—";
    }
}

const COLUMNS: { key: SortKey; label: string; className?: string }[] = [
    { key: "nome", label: "Nome" },
    { key: "responsavel_name", label: "Responsável" },
    { key: "stage_name", label: "Fase" },
    { key: "funil", label: "Funil" },
    { key: "prioridade", label: "Prioridade" },
    { key: "created_at", label: "Entrada" },
    { key: "last_activity", label: "Última Ativ." },
];

const SORT_TYPES: Record<SortKey, ReportTableSortType> = {
    nome: "text",
    responsavel_name: "text",
    stage_name: "text",
    funil: "text",
    prioridade: "text",
    created_at: "date",
    last_activity: "date",
};

export function ReportLeadsTable({ leads }: Props) {
    const [sortKey, setSortKey] = useState<SortKey>("created_at");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
    const [page, setPage] = useState(0);

    const sorted = useMemo(() => {
        return [...leads].sort((a, b) => {
            const av = a[sortKey] ?? "";
            const bv = b[sortKey] ?? "";
            return compareReportTableValues(String(av), String(bv), SORT_TYPES[sortKey], sortDir);
        });
    }, [leads, sortKey, sortDir]);

    useEffect(() => {
        setPage((currentPage) => clampReportTablePage(currentPage, sorted.length, PAGE_SIZE));
    }, [sorted.length]);

    const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
    const paged = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    const handleSort = (key: SortKey) => {
        if (key === sortKey) {
            setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        } else {
            setSortKey(key);
            setSortDir("asc");
        }
        setPage(0);
    };

    if (leads.length === 0) {
        return (
            <div className="rounded-2xl bg-white border border-slate-100 p-6">
                <h3 className="text-base font-semibold text-slate-900 mb-4">Leads Detalhados</h3>
                <div className="flex flex-col items-center justify-center py-12 text-sm text-slate-400">
                    <p>Nenhum lead encontrado com os filtros aplicados</p>
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-2xl bg-white border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-slate-900">Leads Detalhados</h3>
                <span className="text-xs text-slate-400">{leads.length} resultado{leads.length !== 1 ? "s" : ""}</span>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-100">
                            {COLUMNS.map((col) => (
                                <th
                                    key={col.key}
                                    onClick={() => handleSort(col.key)}
                                    className="text-left py-2.5 px-2 text-xs font-semibold uppercase tracking-wider text-slate-400 cursor-pointer hover:text-slate-600 select-none"
                                >
                                    <span className="inline-flex items-center gap-1">
                                        {col.label}
                                        {sortKey === col.key && (
                                            sortDir === "asc" ? (
                                                <ChevronUp className="w-3 h-3" />
                                            ) : (
                                                <ChevronDown className="w-3 h-3" />
                                            )
                                        )}
                                    </span>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {paged.map((lead) => {
                            const p = PRIORITY_BADGE[lead.prioridade ?? ""] ?? PRIORITY_BADGE.media;
                            return (
                                <tr
                                    key={lead.id}
                                    className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                                >
                                    <td className="py-2.5 px-2 font-medium text-slate-900 truncate max-w-[160px]">
                                        {lead.nome || "Sem nome"}
                                    </td>
                                    <td className="py-2.5 px-2 text-slate-600 truncate max-w-[120px]">
                                        {lead.responsavel_name || "—"}
                                    </td>
                                    <td className="py-2.5 px-2">
                                        {lead.stage_name ? (
                                            <span
                                                className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full"
                                                style={{
                                                    backgroundColor: (lead.stage_color || "#6366f1") + "18",
                                                    color: lead.stage_color || "#6366f1",
                                                }}
                                            >
                                                <span
                                                    className="w-1.5 h-1.5 rounded-full"
                                                    style={{ backgroundColor: lead.stage_color || "#6366f1" }}
                                                />
                                                {lead.stage_name}
                                            </span>
                                        ) : (
                                            <span className="text-slate-400">—</span>
                                        )}
                                    </td>
                                    <td className="py-2.5 px-2 text-slate-600 capitalize">
                                        {lead.funil || "—"}
                                    </td>
                                    <td className="py-2.5 px-2">
                                        <span
                                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${p.bg} ${p.text}`}
                                        >
                                            {p.label}
                                        </span>
                                    </td>
                                    <td className="py-2.5 px-2 text-slate-500 tabular-nums">
                                        {formatDate(lead.created_at)}
                                    </td>
                                    <td className="py-2.5 px-2 text-slate-500 tabular-nums">
                                        {formatDate(lead.last_activity)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                    <p className="text-xs text-slate-400">
                        Página {page + 1} de {totalPages}
                    </p>
                    <div className="flex gap-1">
                        <button
                            onClick={() => setPage((p) => Math.max(0, p - 1))}
                            disabled={page === 0}
                            className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4 text-slate-600" />
                        </button>
                        <button
                            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                            disabled={page >= totalPages - 1}
                            className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight className="w-4 h-4 text-slate-600" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export function ReportLeadsTableSkeleton() {
    return (
        <div className="rounded-2xl bg-white border border-slate-100 p-6">
            <div className="w-32 h-5 bg-slate-100 rounded animate-pulse mb-4" />
            <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-10 bg-slate-50 rounded animate-pulse" />
                ))}
            </div>
        </div>
    );
}
