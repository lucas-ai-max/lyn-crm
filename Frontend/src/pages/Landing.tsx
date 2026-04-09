import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  ArrowRight, 
  BarChart3, 
  CheckCircle2, 
  MessageSquare, 
  Target, 
  Users, 
  Zap,
  Brain,
  TrendingUp,
  Shield,
  Clock,
  Sparkles,
  LayoutDashboard,
  Mail,
  Phone,
  Globe,
  AlertTriangle,
  Eye,
  Layers,
  Activity,
  Briefcase,
  ShoppingCart,
  Laptop,
  LogIn
} from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { useCountAnimation } from "@/hooks/useCountAnimation";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { LeadCaptureModal } from "@/components/landing/LeadCaptureModal";
import { LynLogo } from "@/components/LynLogo";

const Landing = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Animation refs
  const hero = useScrollAnimation(0.1);
  const problems = useScrollAnimation(0.1);
  const solution = useScrollAnimation(0.1);
  const diferencial = useScrollAnimation(0.1);
  const howItWorks = useScrollAnimation(0.1);
  const testimonials = useScrollAnimation(0.1);
  const comparison = useScrollAnimation(0.1);
  const useCases = useScrollAnimation(0.1);
  const security = useScrollAnimation(0.1);
  const whyNow = useScrollAnimation(0.1);

  // Counter animations
  const counter500 = useCountAnimation(500, 2000);
  const counter150k = useCountAnimation(150, 2000);
  const counter2m = useCountAnimation(2, 2000);
  const counter3x = useCountAnimation(3, 2000);
  const counter35 = useCountAnimation(35, 2000);

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <LynLogo variant="symbol" className="h-12 w-12" showText text="Lyn CRM" textClassName="text-xl font-bold" />
          <div className="flex items-center gap-4 md:gap-8">
            {/* Mobile Login Button */}
            <Link 
              to="/login" 
              className="md:hidden p-2 text-foreground hover:text-primary transition-colors"
              aria-label="Login"
            >
              <LogIn className="h-5 w-5" />
            </Link>
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
            <a href="#recursos" className="text-sm font-medium hover:text-primary transition-colors">Recursos</a>
            <a href="#depoimentos" className="text-sm font-medium hover:text-primary transition-colors">Depoimentos</a>
            <a href="#comparacao" className="text-sm font-medium hover:text-primary transition-colors">Comparação</a>
            <Button 
              variant="outline" 
              className="border-primary text-primary hover:bg-primary/10 hover:border-primary/90 hover:text-primary/90 transition-all"
              asChild
            >
              <Link to="/login">Login</Link>
            </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section 
        ref={hero.elementRef}
        className={`relative pt-32 pb-20 px-6 overflow-hidden transition-all duration-1000 ${
          hero.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
        
        <div className="max-w-7xl mx-auto relative">
          <div className="text-center max-w-4xl mx-auto mb-16 space-y-6">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              CRM inteligente que otimiza sua venda
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground">
              Capte leads de campanhas, WhatsApp, email e qualquer fonte. IA qualifica automaticamente. 
              Pipeline organizado. Seu time vende mais. Tudo em um único dashboard inteligente.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button 
                size="lg" 
                className="text-lg px-8 hover-scale"
                onClick={() => setModalOpen(true)}
              >
                Comece a Usar Agora
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Dashboard Mockup */}
          <div className="relative max-w-5xl mx-auto">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 blur-3xl" />
            <Card className="relative p-8 bg-card/50 backdrop-blur-sm border-2">
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-primary/10 rounded-lg p-4 hover-scale cursor-pointer">
                  <Target className="h-8 w-8 text-primary mb-2" />
                  <div className="text-sm font-medium">Funil de Vendas</div>
                </div>
                <div className="bg-accent/10 rounded-lg p-4 hover-scale cursor-pointer">
                  <MessageSquare className="h-8 w-8 text-accent mb-2" />
                  <div className="text-sm font-medium">Conversas</div>
                </div>
                <div className="bg-primary/10 rounded-lg p-4 hover-scale cursor-pointer">
                  <BarChart3 className="h-8 w-8 text-primary mb-2" />
                  <div className="text-sm font-medium">KPIs</div>
                </div>
              </div>
              <div className="bg-gradient-to-r from-primary/5 to-accent/5 rounded-lg p-6 border border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="h-5 w-5 text-primary" />
                  <span className="text-sm font-semibold">Insights de IA</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  IA identificou 12 leads quentes que precisam de follow-up hoje
                </p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section 
        id="problemas"
        ref={problems.elementRef}
        className={`py-20 px-6 bg-muted/30 transition-all duration-1000 delay-100 ${
          problems.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Você tem leads, mas está perdendo oportunidades
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-8 hover-scale cursor-pointer border-destructive/20">
              <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
              <h3 className="text-xl font-bold mb-3">Leads espalhados em múltiplos lugares</h3>
              <p className="text-muted-foreground">
                Seus leads vêm do WhatsApp, email, landing page, campanhas pagas, redes sociais. Cada um em um lugar. 
                Seu time não sabe quem foi qualificado, quem está quente, quem precisa de follow-up. Oportunidades morrem no caos.
              </p>
            </Card>

            <Card className="p-8 hover-scale cursor-pointer border-destructive/20">
              <Clock className="h-12 w-12 text-destructive mb-4" />
              <h3 className="text-xl font-bold mb-3">Qualificação manual = lento e inconsistente</h3>
              <p className="text-muted-foreground">
                Seu vendedor gasta horas lendo mensagens, emails, conversas. Qual lead merece atenção agora? 
                Qual está frio? Qual já pode receber uma proposta? Sem critério claro, tudo vira sorte. E sorte não escala.
              </p>
            </Card>

            <Card className="p-8 hover-scale cursor-pointer border-destructive/20">
              <Eye className="h-12 w-12 text-destructive mb-4" />
              <h3 className="text-xl font-bold mb-3">Sem visibilidade = sem previsão</h3>
              <p className="text-muted-foreground">
                Você não sabe quantas vendas vão fechar essa semana. Quantas pessoas estão no seu pipeline. 
                Qual é seu melhor vendedor. Qual estratégia funciona. Você cresce cego. E crescimento cego é lento.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section 
        id="recursos"
        ref={solution.elementRef}
        className={`py-20 px-6 transition-all duration-1000 delay-200 ${
          solution.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Um CRM inteligente que trabalha para você
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="p-8 hover-scale cursor-pointer border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <Layers className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-bold mb-3">Capte Leads de Qualquer Fonte</h3>
              <p className="text-muted-foreground">
                WhatsApp, email, landing page, campanhas, formulários, redes sociais. Tudo vira lead no Lyn CRM. 
                Você não gerencia 5 ferramentas. Gerencia um único lugar.
              </p>
            </Card>

            <Card className="p-8 hover-scale cursor-pointer border-primary/20 bg-gradient-to-br from-accent/5 to-transparent">
              <Brain className="h-12 w-12 text-accent mb-4" />
              <h3 className="text-xl font-bold mb-3">IA Qualifica Automaticamente</h3>
              <p className="text-muted-foreground">
                Novo lead chega? IA lê. Analisa sentimento. Vê padrões. Qualifica em segundos. 
                "Esse cliente está pronto pra comprar", "Esse precisa de nurturing", "Esse é frio". 
                Seu time já sabe antes de ligar.
              </p>
            </Card>

            <Card className="p-8 hover-scale cursor-pointer border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <Target className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-bold mb-3">Pipeline Visual em Tempo Real</h3>
              <p className="text-muted-foreground">
                Veja todos os seus leads em um Kanban. Novo → Contato → Qualificado → Proposta → Fechado. 
                Arraste para organizar. Saiba exatamente o que vai fechar essa semana.
              </p>
            </Card>

            <Card className="p-8 hover-scale cursor-pointer border-primary/20 bg-gradient-to-br from-accent/5 to-transparent">
              <Zap className="h-12 w-12 text-accent mb-4" />
              <h3 className="text-xl font-bold mb-3">Automações Inteligentes</h3>
              <p className="text-muted-foreground">
                Lead não responde em 3 dias? Follow-up automático. Cliente fez pergunta similar antes? 
                Sugira a resposta que funcionou. Próxima ação deveria ser uma ligação? Notifique seu time. 
                IA trabalha enquanto você dorme.
              </p>
            </Card>

            <Card className="p-8 hover-scale cursor-pointer border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <LayoutDashboard className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-bold mb-3">Histórico Completo de Cada Lead</h3>
              <p className="text-muted-foreground">
                Todas as interações em um lugar. Qual canal ele chegou? O que conversou? Quanto tempo na empresa? 
                Qual é o melhor momento pra ligar? Seu vendedor tem 360° de cada oportunidade.
              </p>
            </Card>

            <Card className="p-8 hover-scale cursor-pointer border-primary/20 bg-gradient-to-br from-accent/5 to-transparent">
              <Users className="h-12 w-12 text-accent mb-4" />
              <h3 className="text-xl font-bold mb-3">Colaboração Sincronizada</h3>
              <p className="text-muted-foreground">
                Seu time trabalha junto, não isolado. Comentários no lead. Atribuição automática de tarefas. 
                Histórico de quem fez o quê. Ninguém duplica esforço. Ninguém deixa nada cair.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Diferencial Section */}
      <section 
        ref={diferencial.elementRef}
        className={`py-20 px-6 bg-gradient-to-br from-primary/10 via-accent/5 to-primary/10 transition-all duration-1000 delay-300 ${
          diferencial.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <Sparkles className="h-16 w-16 text-primary mx-auto mb-4" />
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Venda com inteligência, não com intuição.
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <Card className="p-8 bg-card/80 backdrop-blur-sm hover-scale cursor-pointer">
              <Brain className="h-10 w-10 text-primary mb-4" />
              <h3 className="text-xl font-bold mb-3">Qualificação Automática de Leads</h3>
              <p className="text-muted-foreground">
                Em vez de seu vendedor ler 100 mensagens por dia, a IA lê todas. Identifica padrões. 
                Classifica por prioridade. Seu time só trabalha o que merece atenção.
              </p>
            </Card>

            <Card className="p-8 bg-card/80 backdrop-blur-sm hover-scale cursor-pointer">
              <Activity className="h-10 w-10 text-accent mb-4" />
              <h3 className="text-xl font-bold mb-3">Análise de Sentimento em Conversas</h3>
              <p className="text-muted-foreground">
                "Esse cliente está frustrado". "Esse está feliz". "Esse está em dúvida". 
                A IA sente o tom. Seu time responde com empatia, não robô.
              </p>
            </Card>

            <Card className="p-8 bg-card/80 backdrop-blur-sm hover-scale cursor-pointer">
              <TrendingUp className="h-10 w-10 text-primary mb-4" />
              <h3 className="text-xl font-bold mb-3">Sugestões de Próximas Ações</h3>
              <p className="text-muted-foreground">
                Conversou com cliente? IA sugere: "Ligação agora seria ideal" ou "Envia orçamento" ou "Espera 3 dias e segue". 
                Seu vendedor trabalha com inteligência, não intuição.
              </p>
            </Card>

            <Card className="p-8 bg-card/80 backdrop-blur-sm hover-scale cursor-pointer">
              <BarChart3 className="h-10 w-10 text-accent mb-4" />
              <h3 className="text-xl font-bold mb-3">Relatórios Automáticos</h3>
              <p className="text-muted-foreground">
                Você quer saber qual fonte traz mais vendas? IA mostra. Qual email converte melhor? IA analisa. 
                Qual horário mais pessoas respondem? IA relata. Dados em tempo real.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section 
        ref={howItWorks.elementRef}
        className={`py-20 px-6 transition-all duration-1000 delay-100 ${
          howItWorks.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              De leads espalhados para vendas otimizadas em 3 passos
            </h2>
          </div>

          <div className="space-y-8">
            <div className="flex gap-8 items-start hover-scale cursor-pointer">
              <div className="flex-shrink-0 w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xl font-bold">
                1
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-2">Integre Suas Fontes de Leads</h3>
                <p className="text-lg text-muted-foreground">
                  Conecte WhatsApp, email, landing page, campanhas. Tudo que é lead vira contato no Lyn CRM. 
                  Histórico anterior já vem junto.
                </p>
              </div>
            </div>

            <div className="flex gap-8 items-start hover-scale cursor-pointer">
              <div className="flex-shrink-0 w-12 h-12 bg-accent text-accent-foreground rounded-full flex items-center justify-center text-xl font-bold">
                2
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-2">IA Qualifica e Organiza</h3>
                <p className="text-lg text-muted-foreground">
                  Novo lead chega, IA qualifica. Prioridade alta? Dashboard mostra em primeiro. 
                  Lead frio? Entra em automação de nurturing. Nada é ignorado.
                </p>
              </div>
            </div>

            <div className="flex gap-8 items-start hover-scale cursor-pointer">
              <div className="flex-shrink-0 w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xl font-bold">
                3
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-2">Seu Time Vende com Inteligência</h3>
                <p className="text-lg text-muted-foreground">
                  Pipeline está lá, atualizado em tempo real. Próxima ação é sugerida. 
                  Você fecha mais porque trabalha com dados, não com chute.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section 
        id="depoimentos"
        ref={testimonials.elementRef}
        className={`py-20 px-6 bg-muted/30 transition-all duration-1000 delay-200 ${
          testimonials.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Equipes que já usam IA para vender mais
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-8 hover-scale cursor-pointer">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <CheckCircle2 key={i} className="h-5 w-5 text-primary fill-primary" />
                ))}
              </div>
              <h3 className="text-xl font-bold mb-3">"Saímos de 5 vendas/mês para 18 em 2 meses"</h3>
              <p className="text-muted-foreground mb-4">
                Antes a gente perdia lead entre WhatsApp, email, planilha. Ninguém sabia quem era prioridade. 
                Com a IA do Lyn CRM, leads chegam, são qualificados automaticamente, e nosso time só trabalha os que importam. 
                Conversão explodiu.
              </p>
              <div className="pt-4 border-t">
                <p className="font-semibold">Juliana Silva</p>
                <p className="text-sm text-muted-foreground">CEO, Consultoria Silva | São Paulo</p>
              </div>
            </Card>

            <Card className="p-8 hover-scale cursor-pointer">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <CheckCircle2 key={i} className="h-5 w-5 text-primary fill-primary" />
                ))}
              </div>
              <h3 className="text-xl font-bold mb-3">"IA sugeriu que era momento de ligar. Fechou R$ 50k"</h3>
              <p className="text-muted-foreground mb-4">
                Tem uma conversa que foi dormindo por 2 semanas. A IA do Lyn CRM analisou o sentimento, viu que o cliente estava pronto, 
                sugeriu que a gente ligasse. Ligou, fechou no mesmo dia. Só a IA vendo o que a gente não viu.
              </p>
              <div className="pt-4 border-t">
                <p className="font-semibold">Marcus Costa</p>
                <p className="text-sm text-muted-foreground">Diretor de Vendas | Curitiba</p>
              </div>
            </Card>

            <Card className="p-8 hover-scale cursor-pointer">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <CheckCircle2 key={i} className="h-5 w-5 text-primary fill-primary" />
                ))}
              </div>
              <h3 className="text-xl font-bold mb-3">"Finalmente sabemos qual estratégia funciona"</h3>
              <p className="text-muted-foreground mb-4">
                Com Lyn CRM + IA, a gente vê qual fonte de lead converte melhor. Qual email gera resposta. 
                Qual horário mais gente liga de volta. Agora investimos em que funciona, não no que achamos que funciona.
              </p>
              <div className="pt-4 border-t">
                <p className="font-semibold">Amanda Torres</p>
                <p className="text-sm text-muted-foreground">Gerente de Atendimento | Rio de Janeiro</p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section 
        id="comparacao"
        ref={comparison.elementRef}
        className={`py-20 px-6 transition-all duration-1000 delay-300 ${
          comparison.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Lyn CRM com IA vs. CRM Tradicional vs. Nada
            </h2>
          </div>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-semibold">Funcionalidade</th>
                    <th className="text-center p-4 font-semibold">Sem CRM</th>
                    <th className="text-center p-4 font-semibold">CRM Tradicional</th>
                    <th className="text-center p-4 font-semibold bg-primary/10">Lyn CRM com IA</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b hover:bg-muted/50">
                    <td className="p-4">Centraliza Leads</td>
                    <td className="text-center p-4">❌</td>
                    <td className="text-center p-4">✅</td>
                    <td className="text-center p-4 bg-primary/5 font-semibold">✅</td>
                  </tr>
                  <tr className="border-b hover:bg-muted/50">
                    <td className="p-4">IA Integrada</td>
                    <td className="text-center p-4">❌</td>
                    <td className="text-center p-4">❌</td>
                    <td className="text-center p-4 bg-primary/5 font-semibold text-primary">✅ Nativa</td>
                  </tr>
                  <tr className="border-b hover:bg-muted/50">
                    <td className="p-4">Qualificação Automática</td>
                    <td className="text-center p-4">❌</td>
                    <td className="text-center p-4">❌</td>
                    <td className="text-center p-4 bg-primary/5 font-semibold">✅</td>
                  </tr>
                  <tr className="border-b hover:bg-muted/50">
                    <td className="p-4">Múltiplas Fontes de Leads</td>
                    <td className="text-center p-4">Manual</td>
                    <td className="text-center p-4">Limitado</td>
                    <td className="text-center p-4 bg-primary/5 font-semibold text-primary">✅ Ilimitado</td>
                  </tr>
                  <tr className="border-b hover:bg-muted/50">
                    <td className="p-4">Sugestões de Próximas Ações</td>
                    <td className="text-center p-4">❌</td>
                    <td className="text-center p-4">❌</td>
                    <td className="text-center p-4 bg-primary/5 font-semibold">✅</td>
                  </tr>
                  <tr className="border-b hover:bg-muted/50">
                    <td className="p-4">Análise de Sentimento</td>
                    <td className="text-center p-4">❌</td>
                    <td className="text-center p-4">❌</td>
                    <td className="text-center p-4 bg-primary/5 font-semibold">✅</td>
                  </tr>
                  <tr className="border-b hover:bg-muted/50">
                    <td className="p-4">Relatórios Automáticos</td>
                    <td className="text-center p-4">❌</td>
                    <td className="text-center p-4">Manual</td>
                    <td className="text-center p-4 bg-primary/5 font-semibold text-primary">✅ Tempo Real</td>
                  </tr>
                  <tr className="border-b hover:bg-muted/50">
                    <td className="p-4">Curva de Aprendizado</td>
                    <td className="text-center p-4">-</td>
                    <td className="text-center p-4">Longa</td>
                    <td className="text-center p-4 bg-primary/5 font-semibold text-primary">Rápida</td>
                  </tr>
                  <tr className="hover:bg-muted/50">
                    <td className="p-4">Custo</td>
                    <td className="text-center p-4">Varia</td>
                    <td className="text-center p-4">Alto</td>
                    <td className="text-center p-4 bg-primary/5 font-semibold text-primary">Otimizado</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </section>

      {/* Numbers Section */}
      <section className="py-20 px-6 bg-gradient-to-br from-primary/10 via-accent/5 to-primary/10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Qualifique 3x mais rápido, venda 35% mais.
            </h2>
          </div>

          <div className="grid md:grid-cols-5 gap-8">
            <div ref={counter500.elementRef} className="text-center hover-scale cursor-pointer">
              <div className="text-5xl font-bold text-primary mb-2">
                {counter500.count}+
              </div>
              <p className="text-muted-foreground">equipes otimizam venda com Lyn CRM</p>
            </div>

            <div ref={counter150k.elementRef} className="text-center hover-scale cursor-pointer">
              <div className="text-5xl font-bold text-accent mb-2">
                {counter150k.count}k
              </div>
              <p className="text-muted-foreground">leads capturados e qualificados todo mês</p>
            </div>

            <div ref={counter2m.elementRef} className="text-center hover-scale cursor-pointer">
              <div className="text-5xl font-bold text-primary mb-2">
                {counter2m.count}M+
              </div>
              <p className="text-muted-foreground">interações analisadas pela IA</p>
            </div>

            <div ref={counter3x.elementRef} className="text-center hover-scale cursor-pointer">
              <div className="text-5xl font-bold text-accent mb-2">
                {counter3x.count}x
              </div>
              <p className="text-muted-foreground">mais rápido qualificar com IA</p>
            </div>

            <div ref={counter35.elementRef} className="text-center hover-scale cursor-pointer">
              <div className="text-5xl font-bold text-primary mb-2">
                +{counter35.count}%
              </div>
              <p className="text-muted-foreground">mais taxa de conversão com automações</p>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section 
        ref={useCases.elementRef}
        className={`py-20 px-6 transition-all duration-1000 delay-100 ${
          useCases.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Funciona para qualquer negócio que vende
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <Card className="p-8 hover-scale cursor-pointer border-primary/20">
              <Briefcase className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-2xl font-bold mb-3">Agências e Consultorias</h3>
              <p className="text-muted-foreground">
                Múltiplos clientes enviando leads? IA qualifica cada um. Seu time não perde oportunidade. 
                Crescimento previsível.
              </p>
            </Card>

            <Card className="p-8 hover-scale cursor-pointer border-primary/20">
              <ShoppingCart className="h-12 w-12 text-accent mb-4" />
              <h3 className="text-2xl font-bold mb-3">E-commerce e Varejo</h3>
              <p className="text-muted-foreground">
                Campanhas no Google, Facebook, TikTok gerando leads? Lyn CRM centraliza. IA qualifica. 
                Você sabe qual fonte converte melhor.
              </p>
            </Card>

            <Card className="p-8 hover-scale cursor-pointer border-primary/20">
              <Phone className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-2xl font-bold mb-3">Negócios com Vendedor em Campo</h3>
              <p className="text-muted-foreground">
                Seu time no WhatsApp, email, leads de campanhas? Histórico sincronizado. 
                IA avisa quando é momento de ligar. Vendedor fecha focado.
              </p>
            </Card>

            <Card className="p-8 hover-scale cursor-pointer border-primary/20">
              <Laptop className="h-12 w-12 text-accent mb-4" />
              <h3 className="text-2xl font-bold mb-3">SaaS e Software</h3>
              <p className="text-muted-foreground">
                Trial users chegando de múltiplos canais? IA identifica padrão de usuários que compram. 
                Seu sales team prioriza os certos.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Security & Integration */}
      <section 
        ref={security.elementRef}
        className={`py-20 px-6 bg-muted/30 transition-all duration-1000 delay-200 ${
          security.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <Shield className="h-16 w-16 text-primary mx-auto mb-4" />
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Integra com tudo. Seguro. Pronto pra escalar.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-8 text-center hover-scale cursor-pointer">
              <Globe className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-3">Conecta com suas fontes</h3>
              <p className="text-muted-foreground">
                WhatsApp, email, Zapier, landing pages, formulários. Qualquer lugar que lead nasça, Lyn CRM captura.
              </p>
            </Card>

            <Card className="p-8 text-center hover-scale cursor-pointer">
              <Shield className="h-12 w-12 text-accent mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-3">Criptografia e LGPD</h3>
              <p className="text-muted-foreground">
                Seus dados e dos seus clientes protegidos. Conformidade automática com leis de privacidade.
              </p>
            </Card>

            <Card className="p-8 text-center hover-scale cursor-pointer">
              <MessageSquare className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-3">Suporte 24/7 em Português</h3>
              <p className="text-muted-foreground">
                Chat, email, telefone. Pessoa real respondendo. Não é chatbot.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Why Now */}
      <section 
        ref={whyNow.elementRef}
        className={`py-20 px-6 transition-all duration-1000 delay-300 ${
          whyNow.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Seu concorrente já está usando IA. Você?
          </h2>
          <div className="space-y-4 text-lg text-muted-foreground mb-8">
            <p>
              Inteligência artificial virou commodity. Todo CRM diz que tem IA. 
              Mas poucos têm <span className="font-bold text-foreground">nativa, integrada, trabalhando de verdade</span> no seu dia a dia.
            </p>
            <p>
              Lyn CRM é diferente. IA qualifica. IA sugere. IA analisa. IA trabalha enquanto você dorme.
            </p>
            <p className="font-semibold text-foreground">
              Enquanto você fica debatendo, seu concorrente já está fechando mais vendas.
            </p>
          </div>
        </div>
      </section>

      {/* Secondary CTA */}
      <section className="py-20 px-6 bg-gradient-to-br from-primary/20 via-accent/10 to-primary/20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Otimize sua venda com inteligência
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Parou de desperdiçar leads. Parou de qualificar manualmente. Parou de adivinhar.
          </p>
          <Button 
            size="lg" 
            className="text-lg px-12 hover-scale"
            onClick={() => setModalOpen(true)}
          >
            Comece a Usar Agora
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-muted py-12 px-6 border-t">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <LynLogo variant="symbol" className="h-14 w-14 mb-4" />
              <p className="text-sm text-muted-foreground">
                CRM inteligente que otimiza sua venda com IA integrada.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Produto</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#recursos" className="text-muted-foreground hover:text-primary">Recursos</a></li>
                <li><a href="#comparacao" className="text-muted-foreground hover:text-primary">Comparação</a></li>
                <li><a href="#depoimentos" className="text-muted-foreground hover:text-primary">Depoimentos</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Empresa</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-muted-foreground hover:text-primary">Sobre</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary">Blog</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary">Carreiras</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Suporte</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-muted-foreground hover:text-primary">Central de Ajuda</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary">Contato</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary">Política de Privacidade</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} Lyn CRM. Todos os direitos reservados.
          </div>
        </div>
      </footer>

      <LeadCaptureModal open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  );
};

export default Landing;
