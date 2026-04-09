import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, MoreVertical, Phone, MessageSquare, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Task {
  id: string;
  title: string;
  status: string;
  date: string;
  assignee: string;
  type: "phone" | "message" | "email";
}

const mockTasks: Task[] = [
  {
    id: "1",
    title: "TELEFONE ERRADO",
    status: "Vencido - 9/13/2025",
    date: "9/13/2025",
    assignee: "Thiago",
    type: "phone",
  },
];

const taskIcons = {
  phone: Phone,
  message: MessageSquare,
  email: Mail,
};

export function TasksCard() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Tarefas</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              Pendente
            </Button>
            <Button variant="outline" size="sm">
              Data de vencimento (Asc)
            </Button>
            <Button variant="outline" size="sm">
              Todos os utilizadores
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {mockTasks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Nenhuma tarefa pendente</p>
          </div>
        ) : (
          <div className="space-y-3">
            {mockTasks.map((task) => {
              const Icon = taskIcons[task.type];
              return (
                <div
                  key={task.id}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border/50 hover:border-border transition-all"
                >
                  <Checkbox />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-sm">{task.title}</p>
                        <Badge
                          variant="destructive"
                          className="mt-1 text-xs"
                        >
                          {task.status}
                        </Badge>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      verificar telefone correto
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <span>: altair rosa</span>
                      <span>Atribuído(a) a: {task.assignee}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
