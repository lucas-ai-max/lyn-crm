import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { X } from "lucide-react";

interface LeadSummaryPanelProps {
  lead: any;
  onClose: () => void;
}

const statusLabels: Record<string, string> = {
  novo: "Novo",
  contato: "Contato Realizado",
  qualificado: "Qualificado",
  em_andamento: "Em Andamento",
  followup: "Follow-up",
  ganho: "Ganho",
  perdido: "Perdido",
  concluido: "Concluído",
};

const statusColors: Record<string, string> = {
  novo: "bg-blue-500/10 text-blue-600 hover:bg-blue-500/20",
  contato: "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20",
  qualificado: "bg-purple-500/10 text-purple-600 hover:bg-purple-500/20",
  em_andamento: "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20",
  followup: "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20",
  ganho: "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20",
  perdido: "bg-red-500/10 text-red-600 hover:bg-red-500/20",
  concluido: "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20",
};

const priorityLabels: Record<string, string> = {
  high: "Alta prioridade",
  medium: "Média prioridade",
  low: "Baixa prioridade",
};

export function LeadSummaryPanel({ lead, onClose }: LeadSummaryPanelProps) {
  const navigate = useNavigate();

  // Fetch responsible user
  const { data: responsible } = useQuery({
    queryKey: ["responsible-user", lead.responsavel_id],
    queryFn: async () => {
      if (!lead.responsavel_id) return null;

      const { data, error } = await supabase
        .from("lyn_profiles")
        .select("*")
        .eq("id", lead.responsavel_id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!lead.responsavel_id,
  });

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-sm font-semibold">Informações do Lead</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <Tabs defaultValue="details" className="flex-1 flex flex-col">
        <div className="border-b border-border">
          <TabsList className="w-full justify-start rounded-none h-12 bg-transparent p-0">
            <TabsTrigger
              value="details"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              Detalhes
            </TabsTrigger>
            <TabsTrigger
              value="notes"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              Notas
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="details" className="flex-1 overflow-y-auto p-4 space-y-6 mt-0">
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3">Nome</h3>
            <p className="text-sm font-medium">{lead.nome}</p>
          </div>

          <Separator />

          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3">Empresa</h3>
            <p className="text-sm">{lead.empresa || "—"}</p>
          </div>

          <Separator />

          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3">Funil</h3>
            <p className="text-sm">{lead.funil || "—"}</p>
          </div>

          <Separator />

          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3">Telefone</h3>
            <p className="text-sm">{lead.telefone || "—"}</p>
          </div>

          <Separator />

          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3">Status Atual</h3>
            <Badge variant="secondary" className={statusColors[lead.status] || "bg-muted text-foreground"}>
              {statusLabels[lead.status] || lead.status || "—"}
            </Badge>
          </div>

          <Separator />

          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3">Responsável</h3>
            <p className="text-sm">
              {responsible
                ? `${responsible.first_name || ""} ${responsible.last_name || ""}`.trim() || "—"
                : "—"}
            </p>
          </div>

          {lead.segmento && (
            <>
              <Separator />
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{lead.segmento}</Badge>
                  {lead.prioridade && (
                    <Badge variant="outline" className="capitalize">
                      {priorityLabels[lead.prioridade] || lead.prioridade}
                    </Badge>
                  )}
                </div>
              </div>
            </>
          )}

          <Separator />

          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3">Notas</h3>
            <p className="text-sm text-muted-foreground">
              {Array.isArray(lead.notas) && lead.notas.length > 0
                ? lead.notas.join('\n')
                : (typeof lead.notas === 'string' && lead.notas.trim() ? lead.notas : "Nenhuma nota cadastrada")}
            </p>
          </div>

          <Separator />

          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate(`/dashboard/${lead.id}`)}
          >
            Ver Lead completo
          </Button>
        </TabsContent>

        <TabsContent value="notes" className="flex-1 overflow-y-auto p-4 mt-0">
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3">Notas</h3>
              <p className="text-sm text-muted-foreground">
                {Array.isArray(lead.notas) && lead.notas.length > 0
                  ? lead.notas.join('\n')
                  : (typeof lead.notas === 'string' && lead.notas.trim() ? lead.notas : "Nenhuma nota cadastrada")}
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
