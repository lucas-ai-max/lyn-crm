import { memo } from "react";
import { Lead } from "@/services/supabase";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

// --- Types ---
interface RecentLeadsCardProps {
  leads: Lead[];
}

// --- Stage badge colors ---
const stageBadgeStyles: Record<string, string> = {
  novo: "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  novos: "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  qualificacao: "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
  qualificacao_inicial: "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
  proposta: "bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400",
  objecao: "bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400",
  negociacao: "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
  em_andamento: "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
  agendamento: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
  fechamento: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
};

const normalizeStatusKey = (value?: string | null) =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[^\p{Letter}\p{Number}\s_/-]/gu, "")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s/-]+/g, "_");

function getInitials(name: string) {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return parts[0]?.[0]?.toUpperCase() || "?";
}

function formatTimeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "agora mesmo";
  if (diffMins < 60) return `${diffMins}m atrás`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h atrás`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d atrás`;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

// --- Avatar color rotation ---
const avatarGradients = [
  "from-indigo-500 to-violet-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-rose-500 to-pink-500",
  "from-slate-500 to-slate-600",
];

export const RecentLeadsCard = memo(function RecentLeadsCard({ leads }: RecentLeadsCardProps) {
  const navigate = useNavigate();
  const recentLeads = leads.slice(0, 6);

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-poppins">
          Leads Recentes
        </h3>
        <button
          onClick={() => navigate("/dashboard/clients")}
          className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors font-poppins"
        >
          Ver todos
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Lead List */}
      <div className="space-y-1">
        {recentLeads.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-sm text-slate-400 font-poppins">
            Nenhum lead encontrado
          </div>
        ) : (
          recentLeads.map((lead, index) => {
            const statusKey = normalizeStatusKey(lead.status);
            const badgeStyle =
              stageBadgeStyles[statusKey] ??
              "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400";

            return (
              <div
                key={lead.id || index}
                className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl transition-colors cursor-pointer"
                onClick={() => navigate("/dashboard/clients")}
              >
                {/* Avatar */}
                <div
                  className={`h-10 w-10 rounded-full bg-gradient-to-br ${avatarGradients[index % avatarGradients.length]} flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm`}
                >
                  {getInitials(lead.nome || "?")}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 font-poppins truncate">
                    {lead.nome}
                  </p>
                  <p className="text-xs text-slate-400 font-poppins truncate">
                    {lead.empresa || "Sem empresa"} · {lead.created_at ? formatTimeAgo(lead.created_at) : "Recente"}
                  </p>
                </div>

                {/* Stage Badge */}
                <span
                  className={`inline-flex px-2.5 py-1 rounded-lg text-[11px] font-semibold font-poppins flex-shrink-0 ${badgeStyle}`}
                >
                  {lead.status || "Novo"}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
});
