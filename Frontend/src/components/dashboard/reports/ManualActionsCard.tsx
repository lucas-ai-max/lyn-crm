import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, MessageSquare, Mail } from "lucide-react";

interface ManualActionsCardProps {
  dateRange: { from: Date; to: Date };
}

export function ManualActionsCard({ dateRange }: ManualActionsCardProps) {
  // Mock data - adaptar com dados reais do banco
  const actions = {
    phone: 0,
    sms: 0,
    total: 0,
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Ações manuais</CardTitle>
          <div className="flex gap-2">
            <select className="text-sm border rounded px-2 py-1">
              <option>Todos</option>
            </select>
            <select className="text-sm border rounded px-2 py-1">
              <option>Todos os...</option>
            </select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-6 text-center">
          <div>
            <Phone className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-1">Telefone</p>
            <p className="text-3xl font-bold">{actions.phone}</p>
          </div>
          <div>
            <MessageSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-1">SMS</p>
            <p className="text-3xl font-bold">{actions.sms}</p>
          </div>
          <div>
            <Mail className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-1">Total pendente</p>
            <p className="text-3xl font-bold">{actions.total}</p>
          </div>
        </div>
        <div className="mt-6 text-center">
          <button className="text-sm text-primary hover:underline">
            Ir para Ações manuais →
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
