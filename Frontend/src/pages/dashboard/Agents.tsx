import { useState } from "react";
import { Bot, Target, ShoppingCart, Headphones, Megaphone, Plus, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Agent {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  status: "active" | "inactive" | "testing";
  idealFor: string[];
  examples: string[];
}

const agents: Agent[] = [
  {
    id: "qualification",
    name: "IA de Qualificação",
    description: "Qualifica leads automaticamente e identifica oportunidades",
    icon: Target,
    iconBg: "bg-lyn-primary/10 text-lyn-primary",
    status: "active",
    idealFor: ["Times de Vendas", "SDRs", "Empresas B2B"],
    examples: ["Qualificação de leads frios", "Agendamento de reuniões", "Priorização de contatos"],
  },
  {
    id: "sales",
    name: "IA de Vendas",
    description: "Automatiza processos de venda e sugere abordagens",
    icon: ShoppingCart,
    iconBg: "bg-lyn-primary/10 text-lyn-primary",
    status: "active",
    idealFor: ["Equipes de Vendas", "Gerentes de Contas", "E-commerce"],
    examples: ["Envio de propostas", "Follow-up automatizado", "Recomendação de produtos"],
  },
  {
    id: "support",
    name: "IA de Suporte",
    description: "Atende clientes automaticamente e resolve problemas",
    icon: Headphones,
    iconBg: "bg-lyn-primary/10 text-lyn-primary",
    status: "testing",
    idealFor: ["Times de Atendimento", "SAC", "Empresas de Serviço"],
    examples: ["Respostas a FAQs", "Abertura de chamados", "Rastreamento de pedidos"],
  },
  {
    id: "marketing",
    name: "IA de Marketing",
    description: "Cria campanhas automatizadas e analisa performance",
    icon: Megaphone,
    iconBg: "bg-lyn-primary/10 text-lyn-primary",
    status: "inactive",
    idealFor: ["Equipes de Marketing", "Gestores de Campanha", "Startups"],
    examples: ["Nutrição de leads", "Segmentação de público", "Relatórios de ROI"],
  },
];

export default function Agents() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "testing">("all");

  const filteredAgents = agents.filter((agent) => {
    const matchesSearch =
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || agent.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex-1 overflow-auto p-6 bg-background">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground font-poppins">Agentes</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie os agentes de IA da sua equipe
            </p>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar agentes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button className="bg-lyn-primary hover:bg-lyn-primary-deep text-white gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Criar novo agente</span>
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <TabsList className="bg-muted/50">
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="active">Ativos</TabsTrigger>
            <TabsTrigger value="inactive">Inativos</TabsTrigger>
            <TabsTrigger value="testing">Em teste</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Agents Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {filteredAgents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>

        {filteredAgents.length === 0 && (
          <div className="text-center py-12">
            <Bot className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Nenhum agente encontrado</p>
          </div>
        )}
      </div>
    </div>
  );
}

function AgentCard({ agent }: { agent: Agent }) {
  const Icon = agent.icon;

  return (
    <Card className="border-border hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className={`p-3 rounded-xl ${agent.iconBg}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-foreground">{agent.name}</h3>
            <p className="text-muted-foreground text-sm">{agent.description}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <p className="font-medium text-sm text-foreground mb-2">Ideal para quem:</p>
            <ul className="space-y-1">
              {agent.idealFor.map((item, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-lyn-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-medium text-sm text-foreground mb-2">Exemplos:</p>
            <ul className="space-y-1">
              {agent.examples.map((item, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-lyn-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Button className="w-full bg-lyn-primary hover:bg-lyn-primary-deep text-white">
          Ver mais
        </Button>
      </CardContent>
    </Card>
  );
}
