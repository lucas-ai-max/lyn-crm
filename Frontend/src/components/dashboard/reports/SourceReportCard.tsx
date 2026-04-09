import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TrendingDown } from "lucide-react";

interface SourceReportCardProps {
  data: Array<{
    source: string;
    total: number;
    value: number;
    open: number;
    won: number;
    lost: number;
    abandoned: number;
    winRate: number;
  }>;
}

export function SourceReportCard({ data }: SourceReportCardProps) {
  const total = data.reduce((sum, item) => sum + item.total, 0);
  const totalValue = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card className="shadow-lyn">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold font-poppins text-lyn-primary">
              Relatório de fonte da oportunidade potencial
            </CardTitle>
            <div className="mt-4">
              <div className="text-4xl font-bold font-poppins text-lyn-primary">{total}</div>
              <div className="flex items-center gap-1 text-sm text-status-objecao mt-1 font-poppins">
                <TrendingDown className="h-3 w-3" />
                <span>88.68%</span>
                <span className="text-texto-secundario">vs últimos 49 dias</span>
              </div>
            </div>
          </div>
          <select className="border border-borda rounded px-3 py-2 font-poppins text-sm">
            <option>Todos os pipelines</option>
          </select>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-poppins">Fonte</TableHead>
              <TableHead className="text-right font-poppins">
                Total de oportunidades potenciais
              </TableHead>
              <TableHead className="text-right font-poppins">Valores totais</TableHead>
              <TableHead className="text-right font-poppins">Abertas</TableHead>
              <TableHead className="text-right font-poppins">Ganhas</TableHead>
              <TableHead className="text-right font-poppins">Perdidas</TableHead>
              <TableHead className="text-right font-poppins">Abandonado(a)</TableHead>
              <TableHead className="text-right font-poppins">% de ganho</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-texto-secundario font-poppins">
                  Nenhum dado disponível para o período selecionado
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, index) => (
                <TableRow key={index}>
                  <TableCell className="font-poppins">{row.source || "-"}</TableCell>
                  <TableCell className="text-right font-poppins">{row.total}</TableCell>
                  <TableCell className="text-right font-poppins">
                    R${(row.value || 0).toLocaleString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-right font-poppins">{row.open}</TableCell>
                  <TableCell className="text-right font-poppins">{row.won}</TableCell>
                  <TableCell className="text-right font-poppins">{row.lost}</TableCell>
                  <TableCell className="text-right font-poppins">{row.abandoned}</TableCell>
                  <TableCell className="text-right font-poppins">{row.winRate}%</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
