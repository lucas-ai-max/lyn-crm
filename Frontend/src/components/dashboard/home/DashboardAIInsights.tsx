import { memo } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Insight {
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
}

interface ConversationInsightRow {
  id: string;
  insights_ia: string | null;
  created_at: string;
  lead_id: string | null;
  leads: {
    nome: string | null;
    empresa: string | null;
    company_id: string | null;
  } | null;
}

interface DashboardAIInsightsProps {
  dateStart: Date;
  dateEnd: Date;
  periodLabel: string;
}

const priorityDotColor = {
  high: "bg-red-400",
  medium: "bg-amber-400",
  low: "bg-emerald-400",
};

export const DashboardAIInsights = memo(function DashboardAIInsights({
  dateStart,
  dateEnd,
  periodLabel,
}: DashboardAIInsightsProps) {
  const { companyId } = useAuth();
  const navigate = useNavigate();

  const { data: recentInsights = [], isLoading } = useQuery<ConversationInsightRow[]>({
    queryKey: ["recent-insights", companyId, dateStart.toISOString(), dateEnd.toISOString()],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from("lyn_conversas")
        .select(`
          id,
          insights_ia,
          created_at,
          lead_id,
          leads:lyn_leads!inner (
            nome,
            empresa,
            company_id
          )
        `)
        .eq("leads.company_id", companyId)
        .not("insights_ia", "is", null)
        .gte("created_at", dateStart.toISOString())
        .lte("created_at", dateEnd.toISOString())
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      return (data || []) as ConversationInsightRow[];
    },
    enabled: !!companyId,
  });

  const insights: Insight[] = recentInsights.map((conversation) => ({
    title: (conversation.leads?.nome || "Lead") + (conversation.leads?.empresa ? ` - ${conversation.leads.empresa}` : ""),
    description:
      (conversation.insights_ia || "").slice(0, 120) +
      ((conversation.insights_ia || "").length > 120 ? "..." : ""),
    priority: "medium",
  }));

  const activeCount = insights.length;

  return (
    <div className="rounded-2xl overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700" />

      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      />

      <div className="relative p-6">
        <div className="flex items-center justify-between mb-5 gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 backdrop-blur-sm rounded-xl">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-poppins">
                Insights da IA
              </h3>
              <p className="text-sm text-indigo-200 font-poppins">
                {periodLabel}
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse-dot" />
            <span className="text-xs font-semibold text-white font-poppins">
              {activeCount} insights ativos
            </span>
          </span>
        </div>

        <div className="space-y-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 p-4 animate-pulse"
              >
                <div className="h-4 w-2/3 bg-white/20 rounded mb-2" />
                <div className="h-3 w-full bg-white/10 rounded" />
              </div>
            ))
          ) : insights.length === 0 ? (
            <div className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 p-5 text-sm text-indigo-100 font-poppins">
              Sem insights encontrados para o período selecionado.
            </div>
          ) : (
            insights.map((insight, index) => (
              <div
                key={`${insight.title}-${index}`}
                className="group rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 p-4 hover:bg-white/15 transition-colors cursor-pointer"
                onClick={() => navigate("/dashboard/conversations")}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-1.5 h-2.5 w-2.5 rounded-full flex-shrink-0 ${priorityDotColor[insight.priority]}`}
                  />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white font-poppins mb-1">
                      {insight.title}
                    </p>
                    <p className="text-sm text-indigo-200 font-poppins leading-relaxed">
                      {insight.description}
                    </p>
                  </div>

                  <ArrowRight className="h-4 w-4 text-indigo-300 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
});
