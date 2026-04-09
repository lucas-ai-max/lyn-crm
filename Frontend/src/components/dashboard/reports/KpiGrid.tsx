import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface KpiCardProps {
  title: string;
  value: number;
  variation?: number;
  sparklineData?: number[];
  navigateTo?: string;
}

function KpiCard({ title, value, variation, sparklineData, navigateTo }: KpiCardProps) {
  const navigate = useNavigate();
  const isPositive = variation && variation > 0;

  return (
    <Card 
      className="shadow-lyn cursor-pointer hover:shadow-xl transition-all duration-200"
      onClick={() => navigateTo && navigate(navigateTo)}
    >
      <CardContent className="pt-6">
        <div className="space-y-3">
          <p className="text-sm text-texto-secundario font-poppins">{title}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-bold text-lyn-primary font-poppins">{value}</h3>
            {variation !== undefined && (
              <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full font-poppins ${
                isPositive 
                  ? 'bg-status-agendamento/10 text-status-agendamento' 
                  : 'bg-status-objecao/10 text-status-objecao'
              }`}>
                {isPositive ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                <span>{Math.abs(variation)}%</span>
              </div>
            )}
          </div>
          <div className="h-12 flex items-end gap-0.5">
            {(sparklineData || [40, 60, 45, 80, 55, 70, 65, 90]).map((height, index) => (
              <div
                key={index}
                className="flex-1 bg-lyn-primary/20 rounded-t transition-all hover:bg-lyn-primary/30"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface KpiGridProps {
  totalLeads: number;
  activeLeads: number;
  scheduledLeads: number;
  conversationsStarted: number;
  variations?: {
    totalLeads?: number;
    activeLeads?: number;
    scheduledLeads?: number;
    conversationsStarted?: number;
  };
}

export function KpiGrid({ 
  totalLeads, 
  activeLeads, 
  scheduledLeads, 
  conversationsStarted,
  variations 
}: KpiGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        title="Total de Leads"
        value={totalLeads}
        variation={variations?.totalLeads}
        navigateTo="/dashboard/clients"
      />
      <KpiCard
        title="Leads em andamento"
        value={activeLeads}
        variation={variations?.activeLeads}
        navigateTo="/dashboard/clients"
      />
      <KpiCard
        title="Leads agendados"
        value={scheduledLeads}
        variation={variations?.scheduledLeads}
        navigateTo="/dashboard/agenda"
      />
      <KpiCard
        title="Conversas iniciadas"
        value={conversationsStarted}
        variation={variations?.conversationsStarted}
        navigateTo="/dashboard/conversations"
      />
    </div>
  );
}
