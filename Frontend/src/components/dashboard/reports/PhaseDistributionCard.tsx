import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { TrendingDown } from "lucide-react";

interface PhaseDistributionCardProps {
  data: Array<{ status: string; count: number }>;
  dateRange: { from: Date; to: Date };
}

const statusLabels: Record<string, string> = {
  novo: "Novo",
  contato: "Contato",
  qualificado: "Qualificado",
  em_andamento: "Em Andamento",
  ganho: "Ganho",
  perdido: "Perdido",
};

export function PhaseDistributionCard({ data, dateRange }: PhaseDistributionCardProps) {
  const total = data.reduce((sum, item) => sum + item.count, 0);
  
  const formattedData = data.map((item) => ({
    name: statusLabels[item.status] || item.status,
    value: item.count,
  }));

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Distribuição por fases</CardTitle>
          <Select defaultValue="roma">
            <SelectTrigger className="w-[120px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="roma">Roma</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <div className="text-4xl font-bold">{total}</div>
          <div className="flex items-center gap-1 text-sm text-destructive mt-1">
            <TrendingDown className="h-3 w-3" />
            <span>89.62%</span>
            <span className="text-muted-foreground">vs últimos 49 dias</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={formattedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis 
              dataKey="name" 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={12}
              tick={{ fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={12}
              tick={{ fill: "hsl(var(--muted-foreground))" }}
            />
            <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
