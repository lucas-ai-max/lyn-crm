import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cell, Pie, PieChart, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface StatusData {
  status: string;
  count: number;
}

interface LeadsByStatusChartProps {
  data: StatusData[];
}

const COLORS = [
  'hsl(263 100% 68%)',  // status-novos
  'hsl(34 100% 60%)',   // status-qualificacao
  'hsl(0 84% 60%)',     // status-objecao
  'hsl(47 96% 53%)',    // status-negociacao
  'hsl(142 76% 36%)',   // status-agendamento
];

export function LeadsByStatusChart({ data }: LeadsByStatusChartProps) {
  const total = data.reduce((sum, item) => sum + item.count, 0);
  
  const chartData = data.map(item => ({
    name: item.status,
    value: item.count,
    percentage: total > 0 ? ((item.count / total) * 100).toFixed(1) : '0.0'
  }));

  return (
    <Card className="shadow-lyn">
      <CardHeader>
        <CardTitle className="font-poppins text-lyn-primary">Distribuição por Fases</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number, name: string, props: any) => [
                `${value} leads (${props.payload.percentage}%)`,
                name
              ]}
            />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              formatter={(value, entry: any) => `${value}: ${entry.payload.value} (${entry.payload.percentage}%)`}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
