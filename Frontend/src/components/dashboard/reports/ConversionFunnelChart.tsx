import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FunnelStage {
  stage: string;
  count: number;
}

interface ConversionFunnelChartProps {
  data: FunnelStage[];
}

export function ConversionFunnelChart({ data }: ConversionFunnelChartProps) {
  const maxCount = Math.max(...data.map(d => d.count), 1);

  const getStageColor = (index: number) => {
    const colors = [
      'hsl(263 100% 68%)',  // status-novos
      'hsl(34 100% 60%)',   // status-qualificacao
      'hsl(0 84% 60%)',     // status-objecao
      'hsl(47 96% 53%)',    // status-negociacao
      'hsl(142 76% 36%)',   // status-agendamento
      'hsl(263 85% 55%)'    // lyn-primary-deep
    ];
    return colors[index % colors.length];
  };

  return (
    <Card className="shadow-lyn">
      <CardHeader>
        <CardTitle className="font-poppins text-lyn-primary">Funil de Conversão</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4 overflow-x-auto pb-4">
          {data.map((stage, index) => {
            const isLast = index === data.length - 1;
            
            return (
              <div key={stage.stage} className="flex items-center flex-shrink-0">
                <div 
                  className="relative px-8 py-6 text-white text-center min-w-[160px] shadow-lg"
                  style={{ 
                    backgroundColor: getStageColor(index),
                    clipPath: isLast 
                      ? 'polygon(15% 0%, 100% 0%, 100% 100%, 15% 100%, 0% 50%)'
                      : 'polygon(15% 0%, 85% 0%, 100% 50%, 85% 100%, 15% 100%, 0% 50%)',
                  }}
                >
                  <div className="text-xs font-medium mb-1 uppercase font-poppins">{stage.stage}</div>
                  <div className="text-3xl font-bold font-poppins">{stage.count}</div>
                  <div className="text-xs mt-1 font-poppins">leads</div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
