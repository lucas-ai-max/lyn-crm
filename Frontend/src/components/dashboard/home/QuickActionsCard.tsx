import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, BarChart3, MessageCircle, Calendar } from "lucide-react";
import { Link } from "react-router-dom";

export function QuickActionsCard() {
  const actions = [
    {
      title: "Adicionar Lead",
      description: "Cadastrar novo lead",
      icon: Plus,
      href: "/dashboard/clients",
      variant: "default" as const,
    },
    {
      title: "Relatórios",
      description: "Ver estatísticas",
      icon: BarChart3,
      href: "/dashboard/reports",
      variant: "outline" as const,
    },
    {
      title: "Conversas",
      description: "Mensagens recentes",
      icon: MessageCircle,
      href: "/dashboard/conversations",
      variant: "outline" as const,
    },
    {
      title: "Agenda",
      description: "Ver compromissos",
      icon: Calendar,
      href: "/dashboard/agenda",
      variant: "outline" as const,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ações Rápidas</CardTitle>
        <CardDescription>Acesse as principais funcionalidades</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.title} to={action.href} className="block">
                <Button
                  variant={action.variant}
                  className="w-full justify-start gap-3 h-auto py-4"
                >
                  <div className="p-2 rounded-md bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-semibold text-sm">{action.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {action.description}
                    </p>
                  </div>
                </Button>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
