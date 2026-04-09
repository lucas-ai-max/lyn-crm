import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { TrendingDown } from "lucide-react";

interface OpportunityValueCardProps {
  dateRange: { from: Date; to: Date };
}

export function OpportunityValueCard({ dateRange }: OpportunityValueCardProps) {
  // Mock data - sem campo de valor no banco
  const data = [
    { stage: "Abandoned", value: 0 },
    { stage: "Lost", value: 10000 },
    { stage: "Open", value: 60270 },
  ];

  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Valor de Opp</CardTitle>
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
          <div className="text-4xl font-bold">
            R${(total / 1000).toFixed(2)}K
          </div>
          <div className="flex items-center gap-1 text-sm text-destructive mt-1">
            <TrendingDown className="h-3 w-3" />
            <span>99%</span>
            <span className="text-muted-foreground">vs últimos 49 dias</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} layout="horizontal">
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="stage" hide />
            <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="text-center mt-4">
          <div className="text-xs text-muted-foreground">Receita total</div>
          <div className="text-lg font-semibold">R${(total / 1000).toFixed(2)}K</div>
        </div>
      </CardContent>
    </Card>
  );
}
