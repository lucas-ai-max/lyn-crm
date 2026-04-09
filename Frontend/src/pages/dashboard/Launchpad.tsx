import { Rocket, MessageSquare, Webhook, BarChart3, Zap, Settings, MapPin, Instagram, Facebook, Globe, CreditCard, Bot, Mail, Workflow, Target } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRole } from "@/hooks/useRole";

interface IntegrationCard {
  icon: React.ElementType;
  title: string;
  description: string;
  actionLabel: string;
  status: "connected" | "available" | "coming-soon";
  requiredRole?: "admin" | "superadmin";
}

interface IntegrationCategory {
  title: string;
  description: string;
  icon: React.ElementType;
  integrations: IntegrationCard[];
}

const integrationCategories: IntegrationCategory[] = [
  {
    title: "Mensageria & Comunicação",
    description: "Conecte seus canais de comunicação e centralize todas as conversas",
    icon: MessageSquare,
    integrations: [
      {
        icon: MessageSquare,
        title: "WhatsApp Business",
        description: "Conecte sua conta do WhatsApp Business para enviar e receber mensagens automaticamente.",
        actionLabel: "Conectar",
        status: "available",
      },
      {
        icon: Instagram,
        title: "Instagram Direct",
        description: "Receba mensagens do Instagram dentro do Lyn CRM, transforme conversas em leads e crie fluxos inteligentes.",
        actionLabel: "Conectar",
        status: "coming-soon",
      },
      {
        icon: Facebook,
        title: "Facebook Messenger",
        description: "Conecte sua Página do Facebook e sincronize conversas automaticamente.",
        actionLabel: "Conectar",
        status: "coming-soon",
      },
      {
        icon: Globe,
        title: "Website & Webchat",
        description: "Gere oportunidades pelo seu site usando o widget de chat inteligente Lyn CRM.",
        actionLabel: "Configurar",
        status: "available",
      },
      {
        icon: Mail,
        title: "Campanhas por E-mail",
        description: "Dispare campanhas, segmentações e fluxos automáticos de e-mails.",
        actionLabel: "Configurar",
        status: "coming-soon",
      },
    ],
  },
  {
    title: "Automação & Inteligência Artificial",
    description: "Automatize processos e potencialize com IA",
    icon: Bot,
    integrations: [
      {
        icon: Bot,
        title: "Agentes de IA",
        description: "Configure agentes inteligentes para atendimento, follow-up, prospecção e automação.",
        actionLabel: "Configurar",
        status: "available",
        requiredRole: "admin",
      },
      {
        icon: Workflow,
        title: "Automação de Mensagens",
        description: "Crie fluxos multicanal: WhatsApp, e-mail, SMS, Instagram.",
        actionLabel: "Configurar",
        status: "available",
        requiredRole: "admin",
      },
      {
        icon: Webhook,
        title: "Webhooks N8N",
        description: "Configure webhooks personalizados para integrar com N8N e automatizar fluxos de trabalho.",
        actionLabel: "Configurar",
        status: "available",
        requiredRole: "admin",
      },
      {
        icon: Zap,
        title: "Zapier",
        description: "Automatize tarefas conectando o Lyn CRM CRM com mais de 5.000 aplicativos.",
        actionLabel: "Conectar",
        status: "coming-soon",
      },
    ],
  },
  {
    title: "Analytics & Rastreamento",
    description: "Acompanhe métricas, conversões e otimize resultados",
    icon: BarChart3,
    integrations: [
      {
        icon: BarChart3,
        title: "Google Analytics",
        description: "Integre com Google Analytics para acompanhar métricas e conversões em tempo real.",
        actionLabel: "Conectar",
        status: "coming-soon",
      },
      {
        icon: MapPin,
        title: "Google Business Profile",
        description: "Gerencie avaliações, mensagens e estatísticas da sua empresa direto pelo CRM.",
        actionLabel: "Conectar",
        status: "coming-soon",
      },
      {
        icon: Target,
        title: "Pixels de Rastreamento",
        description: "Instale e gerencie pixels do Facebook, Google e TikTok.",
        actionLabel: "Configurar",
        status: "coming-soon",
      },
    ],
  },
  {
    title: "Pagamentos & Financeiro",
    description: "Gerencie cobranças, assinaturas e pagamentos",
    icon: CreditCard,
    integrations: [
      {
        icon: CreditCard,
        title: "Stripe",
        description: "Gerencie pagamentos, assinaturas e cobranças com integração segura Stripe Connect.",
        actionLabel: "Conectar",
        status: "available",
      },
    ],
  },
  {
    title: "Desenvolvimento",
    description: "Ferramentas avançadas para desenvolvedores",
    icon: Settings,
    integrations: [
      {
        icon: Settings,
        title: "API Personalizada",
        description: "Acesse a API do Lyn CRM CRM para criar integrações customizadas.",
        actionLabel: "Ver Documentação",
        status: "available",
        requiredRole: "superadmin",
      },
    ],
  },
];

export default function Launchpad() {
  const { role, isLoading } = useRole();

  const getStatusBadge = (status: IntegrationCard["status"]) => {
    switch (status) {
      case "connected":
        return <Badge className="bg-green-500 hover:bg-green-600">Conectado</Badge>;
      case "available":
        return <Badge variant="outline">Disponível</Badge>;
      case "coming-soon":
        return <Badge variant="secondary">Em breve</Badge>;
    }
  };

  const canAccessIntegration = (integration: IntegrationCard) => {
    if (!integration.requiredRole) return true;
    if (isLoading || !role) return false;
    
    const roleHierarchy = { user: 1, admin: 2, superadmin: 3 };
    return roleHierarchy[role] >= roleHierarchy[integration.requiredRole];
  };

  return (
    <div className="space-y-8 font-poppins">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-gradient-to-br from-lyn-primary to-lyn-primary-deep rounded-xl shadow-lyn">
          <Rocket className="h-8 w-8 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Launchpad</h1>
          <p className="text-muted-foreground mt-1">
            Central de integrações e ferramentas para potencializar seu CRM
          </p>
        </div>
      </div>

      {integrationCategories.map((category) => {
        const CategoryIcon = category.icon;
        
        return (
          <div key={category.title} className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-lyn-primary-light/20 rounded-lg">
                <CategoryIcon className="h-5 w-5 text-lyn-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">{category.title}</h2>
                <p className="text-sm text-muted-foreground">{category.description}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {category.integrations.map((integration) => {
                const Icon = integration.icon;
                const hasAccess = canAccessIntegration(integration);
                
                return (
                  <Card 
                    key={integration.title}
                    className={`shadow-lyn hover:shadow-lg transition-all duration-300 ${
                      !hasAccess ? "opacity-60" : ""
                    }`}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="p-3 bg-lyn-primary-light/20 rounded-xl">
                          <Icon className="h-8 w-8 text-lyn-primary" />
                        </div>
                        {getStatusBadge(integration.status)}
                      </div>
                      <CardTitle className="mt-4 text-xl font-semibold">
                        {integration.title}
                      </CardTitle>
                      <CardDescription className="text-sm leading-relaxed">
                        {integration.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button
                        className="w-full font-medium"
                        disabled={integration.status === "coming-soon" || !hasAccess}
                        variant={integration.status === "connected" ? "secondary" : "default"}
                      >
                        {!hasAccess ? "Sem Permissão" : integration.actionLabel}
                      </Button>
                      {integration.requiredRole && !hasAccess && (
                        <p className="text-xs text-muted-foreground mt-2 text-center">
                          Requer role: {integration.requiredRole}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}

      <Card className="bg-gradient-to-br from-lyn-primary/10 to-lyn-primary-deep/10 border-lyn-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-lyn-primary" />
            Quer mais integrações?
          </CardTitle>
          <CardDescription>
            Sugerimos novas integrações com base no seu feedback. Entre em contato com nosso time!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="font-medium">
            Solicitar Integração
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
