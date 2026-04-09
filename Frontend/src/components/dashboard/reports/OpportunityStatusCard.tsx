import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";
import { TrendingDown } from "lucide-react";

interface OpportunityStatusCardProps {
  data: Array<{ status: string; count: number }>;
  dateRange: { from: Date; to: Date };
}

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))"];

const statusLabels: Record<string, string> = {
  novo: "Novo",
  contato: "Contato",
  qualificado: "Qualificado",
  em_andamento: "Em Andamento",
  ganho: "Ganho",
  perdido: "Perdido",
};

export function OpportunityStatusCard({ data, dateRange }: OpportunityStatusCardProps) {
  const total = data.reduce((sum, item) => sum + item.count, 0);
  
  const formattedData = data.map((item) => ({
    name: statusLabels[item.status] || item.status,
    value: item.count,
  }));

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Estado de Opportunity</CardTitle>
          <Select defaultValue="all">
            <SelectTrigger className="w-[180px] h-8">
              <SelectValue placeholder="Todos os pipelines" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os pipelines</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <div className="text-4xl font-bold">{total}</div>
          <div className="flex items-center gap-1 text-sm text-destructive mt-1">
            <TrendingDown className="h-3 w-3" />
            <span>88.68%</span>
            <span className="text-muted-foreground">vs últimos 49 dias</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={formattedData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
            >
              {formattedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Legend
              layout="vertical"
              align="right"
              verticalAlign="middle"
              formatter={(value, entry: any) => `${value} - ${entry.payload.value}`}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
