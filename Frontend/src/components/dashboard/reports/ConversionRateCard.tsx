import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";

interface ConversionRateCardProps {
  data: {
    totalLeads: number;
    convertedLeads: number;
    conversionRate: string;
    schedulesCount: number;
    messagesSent: number;
  } | null;
}

export function ConversionRateCard({ data }: ConversionRateCardProps) {
  const rate = data ? parseFloat(data.conversionRate) : 0;
  
  const chartData = [
    { name: "Converted", value: rate },
    { name: "Not Converted", value: 100 - rate },
  ];

  const COLORS = ["hsl(var(--primary))", "hsl(var(--muted))"];

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
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
          <div className="text-4xl font-bold">R$0</div>
          <div className="flex items-center gap-1 text-sm text-success mt-1">
            <TrendingUp className="h-3 w-3" />
            <span>0%</span>
            <span className="text-muted-foreground">vs últimos 49 dias</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              startAngle={90}
              endAngle={-270}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="text-center mt-4">
          <div className="text-xs text-muted-foreground">Receitas ganhas</div>
          <div className="text-lg font-semibold">R$0</div>
        </div>
      </CardContent>
    </Card>
  );
}
