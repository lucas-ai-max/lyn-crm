import { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ReportCardProps {
  title: string;
  value: number | string;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export function ReportCard({ title, value, description, icon: Icon, trend }: ReportCardProps) {
  return (
    <Card className="shadow-lyn">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium font-poppins">{title}</CardTitle>
        <Icon className="h-4 w-4 text-lyn-primary" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold font-poppins">{value}</div>
        {description && (
          <p className="text-xs text-texto-secundario mt-1 font-poppins">{description}</p>
        )}
        {trend && trend.value !== 0 && (
          <p className={`text-xs mt-1 font-poppins ${trend.isPositive ? "text-status-agendamento" : "text-status-objecao"}`}>
            {trend.isPositive ? "+" : "-"}{Math.abs(trend.value)}% vs período anterior
          </p>
        )}
      </CardContent>
    </Card>
  );
}
