import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp } from "lucide-react";

interface FunnelCardProps {
  data: Array<{ stage: string; count: number }>;
  statusOptions: string[];
}

const stageLabels: Record<string, string> = {
  novo: "Novo",
  contato: "Entrou em contato",
  qualificado: "Qualificação",
  em_andamento: "Em Andamento",
  ganho: "Ganho",
  perdido: "Perdido",
};

export function FunnelCard({ data, statusOptions }: FunnelCardProps) {
  const formattedData = data.map((item, index) => {
    const previousCount = index > 0 ? data[index - 1].count : item.count;
    const conversionRate = previousCount > 0 ? ((item.count / previousCount) * 100).toFixed(2) : "100.00";
    
    return {
      stage: stageLabels[item.stage] || item.stage,
      value: item.count,
      cumulative: "100.00%",
      conversion: `${conversionRate}%`,
      width: index === 0 ? 100 : (item.count / data[0].count) * 100,
    };
  });

  return (
    <Card className="shadow-lyn">
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium font-poppins">Funil</CardTitle>
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
          <div className="text-4xl font-bold font-poppins text-lyn-primary">R$0</div>
          <div className="flex items-center gap-1 text-sm text-status-agendamento mt-1 font-poppins">
            <TrendingUp className="h-3 w-3" />
            <span>0%</span>
            <span className="text-texto-secundario">vs últimos 49 dias</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_auto_auto] gap-4 text-xs font-medium text-texto-secundario mb-4 font-poppins">
            <div></div>
            <div className="text-right w-24">Cumulativo</div>
            <div className="text-right w-24">Conversão do próximo passo</div>
          </div>
          {formattedData.map((item, index) => (
            <div key={index} className="space-y-1">
              <div className="grid grid-cols-[1fr_auto_auto] gap-4 items-center">
                <div className="flex items-center gap-2">
                  <div
                    className="h-8 bg-lyn-primary rounded flex items-center justify-center text-xs text-white px-2 font-poppins"
                    style={{ width: `${item.width}%` }}
                  >
                    {item.stage} R${item.value * 272}
                  </div>
                </div>
                <div className="text-sm font-medium text-right w-24 font-poppins">{item.cumulative}</div>
                <div className="text-sm font-medium text-right w-24 font-poppins">{item.conversion}</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
