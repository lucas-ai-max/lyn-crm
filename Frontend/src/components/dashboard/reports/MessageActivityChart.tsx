import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface MessageActivityChartProps {
  data: Array<{
    day: string;
    count: number;
  }>;
}

export function MessageActivityChart({ data }: MessageActivityChartProps) {
  return (
    <Card className="shadow-lyn">
      <CardHeader>
        <CardTitle className="font-poppins text-lyn-primary">Atividade de Mensagens</CardTitle>
        <CardDescription className="font-poppins">Mensagens enviadas nos últimos 7 dias</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="day" stroke="hsl(var(--foreground))" />
            <YAxis stroke="hsl(var(--foreground))" />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px",
              }}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke="hsl(263 85% 55%)"
              strokeWidth={2}
              dot={{ fill: "hsl(263 85% 55%)", r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
