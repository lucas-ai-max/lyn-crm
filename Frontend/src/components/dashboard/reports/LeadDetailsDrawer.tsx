import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Edit, Calendar, MessageSquare, Phone, Mail, Building2, Tag, User, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface LeadDetailsDrawerProps {
  leadId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function LeadDetailsDrawer({ leadId, isOpen, onClose }: LeadDetailsDrawerProps) {
  const { data: lead, isLoading } = useQuery({
    queryKey: ["lead-details", leadId],
    queryFn: async () => {
      if (!leadId) return null;
      
      const { data, error } = await supabase
        .from("lyn_leads")
        .select(`
          *,
          profiles:responsavel_id (first_name, last_name)
        `)
        .eq("id", leadId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!leadId && isOpen,
  });

  const { data: historico } = useQuery({
    queryKey: ["lead-historico", leadId],
    queryFn: async () => {
      if (!leadId) return [];
      
      const { data, error } = await supabase
        .from("lyn_historico_atendimentos")
        .select("*")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    },
    enabled: !!leadId && isOpen,
  });

  const { data: agenda } = useQuery({
    queryKey: ["lead-agenda", leadId],
    queryFn: async () => {
      if (!leadId) return [];
      
      const { data, error } = await supabase
        .from("lyn_agenda")
        .select("*")
        .eq("lead_id", leadId)
        .gte("data_inicio", new Date().toISOString())
        .order("data_inicio", { ascending: true })
        .limit(3);

      if (error) throw error;
      return data;
    },
    enabled: !!leadId && isOpen,
  });

  const funnelStages = ["novo", "qualificacao", "objecao", "negociacao", "agendamento"];
  const currentStageIndex = lead ? funnelStages.indexOf(lead.status) : -1;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-[600px] overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : lead ? (
          <div className="space-y-6">
            <SheetHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {lead.nome.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h2 className="text-2xl font-bold">{lead.nome}</h2>
                      <p className="text-sm text-muted-foreground">{lead.empresa}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{lead.status}</Badge>
                    <Badge 
                      variant={
                        lead.prioridade === "high" ? "destructive" : 
                        lead.prioridade === "medium" ? "default" : 
                        "outline"
                      }
                    >
                      {lead.prioridade === "high" ? "Alta" : 
                       lead.prioridade === "medium" ? "Média" : "Baixa"}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    <Edit className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                  <Button size="sm" variant="outline">
                    <Calendar className="h-4 w-4 mr-1" />
                    Agendar
                  </Button>
                  <Button size="sm">
                    <MessageSquare className="h-4 w-4 mr-1" />
                    Conversa
                  </Button>
                </div>
              </div>
            </SheetHeader>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold mb-3">Funil Individual</h3>
                <div className="relative py-6">
                  <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-border -translate-y-1/2" />
                  <div className="flex items-center justify-between relative">
                    {funnelStages.map((stage, index) => {
                      const isActive = index === currentStageIndex;
                      const isCompleted = index < currentStageIndex;
                      
                      return (
                        <div key={stage} className="flex flex-col items-center">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold z-10 transition-colors ${
                              isActive
                                ? "bg-primary text-primary-foreground shadow-lg"
                                : isCompleted
                                ? "bg-primary/20 text-primary"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {index + 1}
                          </div>
                          <span className="text-xs mt-2 text-center capitalize">
                            {stage}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-semibold mb-3">Informações do Lead</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{lead.telefone || "Não informado"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{lead.email || "Não informado"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>{lead.empresa || "Não informado"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <span>{lead.segmento || "Não informado"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {lead.profiles 
                        ? `${lead.profiles.first_name} ${lead.profiles.last_name}` 
                        : "Não atribuído"}
                    </span>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-semibold mb-3">Timeline de Atividades</h3>
                <div className="space-y-3">
                  {historico && historico.length > 0 ? (
                    historico.map((item) => (
                      <div key={item.id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className="w-2 h-2 rounded-full bg-primary" />
                          <div className="w-px h-full bg-border" />
                        </div>
                        <div className="flex-1 pb-4">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              {item.tipo}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(item.created_at!).toLocaleDateString("pt-BR")}
                            </span>
                          </div>
                          <p className="text-sm">{item.descricao}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Nenhuma atividade registrada
                    </p>
                  )}
                </div>
              </div>

              {agenda && agenda.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-sm font-semibold mb-3">Próximos Compromissos</h3>
                    <div className="space-y-2">
                      {agenda.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                        >
                          <Clock className="h-4 w-4 text-primary" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{item.descricao}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(item.data_inicio).toLocaleString("pt-BR")} - {new Date(item.data_fim).toLocaleString("pt-BR")}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <p className="text-center text-muted-foreground">Lead não encontrado</p>
        )}
      </SheetContent>
    </Sheet>
  );
}