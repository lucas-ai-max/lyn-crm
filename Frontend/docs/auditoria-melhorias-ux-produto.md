# Auditoria de Melhorias de UX e Produto do Lyn CRM

Data da auditoria: 2026-03-11

## Resumo Executivo

Esta auditoria olha o Lyn CRM pelo ponto de vista do usuario final e do operador comercial, usando como base o codigo atual em `src/`, o inventario de rotas em `src/App.tsx`, a investigacao operacional registrada em `docs/localhost-8080-playwright-investigation.md`, alem de evidencias objetivas de qualidade observadas em `npm run build` e `npm run lint`.

O produto ja tem uma base funcional relevante: autenticacao, onboarding, dashboard, leads, detalhe do cliente, agenda, relatorios, suporte, WhatsApp, automacao e gestao de usuarios. O problema principal hoje nao e falta de superficie; e a distancia entre a promessa do produto e a consistencia da experiencia entregue.

Os maiores pontos de atencao para produto e UX sao:

- O fluxo de entrada esta incompleto: existe link para recuperacao de senha, mas as rotas de `forgot-password` e `reset-password` nao existem.
- A promessa de IA, multicanal e automacao aparece forte na landing e no dashboard, mas parte relevante disso ainda esta em estado estatico, "em breve" ou com falha funcional.
- A navegacao sugere recursos globais que ainda nao existem de verdade, como busca global com atalho `Cmd+K` e badge de WhatsApp confiavel.
- Abrir algumas telas ainda produz efeito colateral de dados, especialmente em conversas e detalhe do cliente, o que fere previsibilidade para o usuario.
- O sistema tem sinais claros de maturidade desigual: relatorios ricos e configuracoes robustas convivem com tabs desabilitadas, componentes mockados e modulos estaticos.
- Performance e confiabilidade ja impactam a percepcao de qualidade: o build gera um bundle principal de `1,784.98 kB`, ha asset nao resolvido em `/chat-bg-doodle.png`, e o lint hoje falha com `215 problems (194 errors, 21 warnings)`.

Leitura estrategica: o Lyn CRM parece estar mais perto de um produto "plataforma operacional" do que de um simples CRM. O proximo salto nao depende apenas de adicionar telas; depende de consolidar confianca, orientar o usuario para a primeira vitoria e alinhar comunicacao, permissao e automacao com o que realmente funciona.

## Mapa do Produto Atual

| Jornada | Rotas consolidadas | Estado atual | Leitura de produto |
| --- | --- | --- | --- |
| Aquisicao publica | `/`, `/home`, `/login`, `/signup`, `/verify-email` | Funcional com lacunas | Landing forte em promessa, auth basico funcional, recuperacao de senha incompleta |
| Onboarding e ativacao | `/onboarding` | Funcional, mas enxuto | Cria empresa, redireciona para dashboard, sem checklist de setup |
| Home operacional | `/dashboard` | Funcional com inconsistencias | Boa base de metricas e contexto, mas promessa de IA esta fragil |
| Gestao de leads | `/dashboard/clients`, `/dashboard/:leadId` | Forte, mas com atritos | Lista, kanban, modal, detalhe e pacientes; faltam estados mais guiados |
| Conversas e inbox | `/dashboard/conversations` | Funcional com risco estrutural | Lista conversa real, mas a tela cria dados ao abrir e depende de instancia configurada |
| Operacao WhatsApp | `/dashboard/whatsapp/chat`, `/dashboard/whatsapp/instances` | Operacional com friccao | Ha instancia, chat e contato, mas faltam estados guiados de conexao e envio |
| Relatorios | `/dashboard/reports` | Forte em filtros, media em narrativa | KPIs e funil existem, mas falta transformacao em plano de acao |
| Agenda e acompanhamento | `/dashboard/agenda` | Funcional, mas isolada | Calendario e lista existem, mas nao operam como fila de follow-up |
| Automacao | `/dashboard/automation`, `/dashboard/automation/:flowId` | Potente, mas tecnica | Bom potencial para time avancado; baixa orientacao para primeiro fluxo |
| Agentes e integrações | `/dashboard/agents`, `/dashboard/launchpad` | Maturidade desigual | `Agents` e estatico; `Launchpad` mistura disponivel, admin-only e coming soon |
| Configuracoes e usuarios | `/dashboard/settings`, `/dashboard/users` | Robusto, mas denso | Bastante capacidade administrativa, com curva de entendimento maior |
| Suporte e administracao | `/dashboard/support`, `/dashboard/support/:ticketId`, `/dashboard/support/admin` | Funcional com gap de permissao | Boa base de atendimento, mas governanca admin esta inconsistente |
| Excecoes | `*` | Basico | Existe fallback 404, inclusive para rotas que deveriam existir no auth |

## Oportunidades de Melhoria por Jornada

### 1. Aquisicao e acesso

#### 1.1 Fechar o fluxo de recuperacao de senha de ponta a ponta

- Tipo: Enabler tecnico com impacto no usuario
- Problema percebido: o produto convida o usuario a recuperar a senha, mas nao entrega a jornada completa.
- Impacto no usuario: usuarios bloqueados ficam sem saida funcional, gerando abandono, tickets de suporte e perda de confianca logo na entrada.
- Evidencia: [Confirmado no codigo/uso] `src/pages/Login.tsx` aponta para `/forgot-password`; `src/services/auth.ts` monta redirect para `/reset-password`; `src/App.tsx` nao declara nenhuma dessas rotas; a investigacao em `docs/localhost-8080-playwright-investigation.md` confirmou `404` em `/forgot-password`. [Inferencia de produto] isso aumenta friccao de acesso e reduz conversao de usuarios que tentam retornar ao sistema.
- Melhoria proposta: implementar as telas de `forgot-password` e `reset-password`, com mensagens claras de sucesso/erro, retorno ao login e estados de expiracao de link.
- Impacto: Alto
- Esforco: Medio
- Prioridade: P0 / Quick Win

#### 1.2 Alinhar a promessa comercial com o que ja esta maduro no produto

- Tipo: Melhoria de UX
- Problema percebido: a landing vende um CRM com IA qualificando, visao omnichannel e automacao ampla, mas a superficie interna ainda mistura recursos maduros com recursos estaticos, mockados ou "em breve".
- Impacto no usuario: o usuario chega com expectativa de plataforma pronta e pode interpretar lacunas internas como quebra de promessa, nao como roadmap.
- Evidencia: [Confirmado no codigo/uso] `src/pages/Landing.tsx` promete IA qualifica automaticamente, historico 360, automacoes e operacao multicanal; `src/pages/dashboard/Launchpad.tsx` exibe varias integracoes como `coming-soon`; `src/pages/dashboard/Agents.tsx` usa um array local estatico; `src/components/dashboard/home/DashboardAIInsights.tsx` depende de `insights_ia`, enquanto a investigacao previa registrou falha funcional nessa consulta. [Inferencia de produto] a expectativa de valor no topo do funil esta acima da experiencia atual do primeiro uso.
- Melhoria proposta: revisar copy da landing e das telas internas para distinguir com clareza "ja operacional", "beta" e "em breve", destacando primeiro o que realmente diferencia o Lyn CRM hoje.
- Impacto: Alto
- Esforco: Medio
- Prioridade: P1 / Proximo ciclo

### 2. Onboarding e ativacao inicial

#### 2.1 Transformar o onboarding em setup guiado de primeira vitoria

- Tipo: Melhoria de funcionalidade
- Problema percebido: o onboarding atual cria a empresa e encerra a jornada cedo demais.
- Impacto no usuario: depois de criar a empresa, o usuario ainda precisa descobrir sozinho como conectar WhatsApp, configurar pipeline, cadastrar time e criar o primeiro lead.
- Evidencia: [Confirmado no codigo/uso] `src/pages/onboarding/OnboardingPage.tsx` coleta apenas o nome da empresa, chama a Edge Function `create-company`, faz `refreshSession` e redireciona com `window.location.href = '/dashboard'`; nao existe checklist progressivo de ativacao. [Inferencia de produto] isso alonga o tempo ate perceber valor e aumenta risco de conta criada sem ativacao real.
- Melhoria proposta: adicionar uma jornada guiada em passos apos criacao da empresa, cobrindo pelo menos: conectar WhatsApp, definir pipeline/etapas, criar primeiro lead e convidar primeiro usuario.
- Impacto: Alto
- Esforco: Medio
- Prioridade: P0 / Quick Win

### 3. Navegacao global e busca

#### 3.1 Entregar uma busca global funcional e coerente com o atalho prometido

- Tipo: Melhoria de UX
- Problema percebido: a interface sugere busca global e comando rapido, mas o comportamento ainda nao existe.
- Impacto no usuario: a navegacao transmite poder que o produto ainda nao entrega, o que gera frustracao justamente para usuarios avancados.
- Evidencia: [Confirmado no codigo/uso] `src/components/layout/AppShell.tsx` renderiza o campo "Buscar leads, automacoes..." com hint `⌘K`, mas o input nao possui `value`, `onChange`, `onKeyDown`, submit ou integracao com rotas; `src/components/layout/AppSidebar.tsx` tambem exibe badge fixa `12` em WhatsApp, sem ligacao com dados reais. [Inferencia de produto] a cabecalho parece mais demonstrativo do que operacional.
- Melhoria proposta: implementar command palette global com busca por lead, conversa, fluxo, usuario e pagina; substituir badges e sinais visuais por dados reais ou remover ate existir backend confiavel.
- Impacto: Alto
- Esforco: Medio
- Prioridade: P1 / Proximo ciclo

### 4. Dashboard e leitura de valor

#### 4.1 Fazer o dashboard responder "o que eu faco agora?" e nao apenas "o que aconteceu?"

- Tipo: Melhoria de UX
- Problema percebido: o dashboard tem boa base de metricas, mas ainda nao fecha o ciclo entre leitura e acao.
- Impacto no usuario: o operador enxerga numeros e cards, mas nao recebe orientacao suficientemente clara sobre proximas acoes de alto impacto.
- Evidencia: [Confirmado no codigo/uso] `src/pages/dashboard/DashboardHome.tsx` agrega leads, series e cards; `src/components/dashboard/home/DashboardAIInsights.tsx` tenta trazer insights clicaveis; a investigacao previa registrou erro de consulta por coluna ausente em `insights_ia`. [Inferencia de produto] o valor prometido pelo dashboard e mais "painel bonito" do que "motor de priorizacao".
- Melhoria proposta: reorganizar a home em tres blocos: saude do funil, fila de prioridade do dia e recomendacoes acionaveis; restaurar ou redesenhar os insights de IA com fonte de dados valida e CTA claro.
- Impacto: Alto
- Esforco: Medio
- Prioridade: P0 / Quick Win

### 5. Gestao de leads e detalhe do cliente

#### 5.1 Simplificar a jornada de lead de "cadastro" para "proxima melhor acao"

- Tipo: Melhoria de funcionalidade
- Problema percebido: a area de leads ja e rica, mas ainda concentra energia demais em cadastro e menos em orquestrar o proximo passo comercial.
- Impacto no usuario: o operador tem lista, kanban, modal robusto e detalhe do cliente, mas falta uma camada clara de prioridade, bloqueios e proxima acao sugerida.
- Evidencia: [Confirmado no codigo/uso] `src/pages/dashboard/Clients.tsx` entrega lista, kanban e modal, mas a tab `Estatisticas` esta desabilitada; `src/pages/dashboard/ClientDetails.tsx` abre painel de detalhes, mensagens, agendamento e pacientes; a mesma tela faz `insert` de conversa quando nao existe, convertendo visualizacao em escrita. [Inferencia de produto] o fluxo ainda esta mais centrado em CRUD do que em operacao comercial guiada.
- Melhoria proposta: transformar detalhe do cliente em cockpit de decisao, com proxima acao recomendada, SLA de resposta, historico consolidado, resumo do paciente quando existir e tarefas vinculadas; retirar side effects automaticos da simples visualizacao do lead.
- Impacto: Alto
- Esforco: Medio
- Prioridade: P1 / Proximo ciclo

### 6. Conversas e operacao WhatsApp

#### 6.1 Eliminar escrita automatica ao abrir inbox e detalhe do cliente

- Tipo: Enabler tecnico com impacto no usuario
- Problema percebido: abrir uma pagina de leitura nao deveria criar registros automaticamente.
- Impacto no usuario: isso fere previsibilidade, complica auditoria e pode gerar "conversas fantasmas" que o time nao entende de onde vieram.
- Evidencia: [Confirmado no codigo/uso] `src/pages/dashboard/Conversations.tsx` percorre leads e cria `conversas` quando nao encontra registro; `src/pages/dashboard/ClientDetails.tsx` tambem cria conversa se ela nao existir. A investigacao em `docs/localhost-8080-playwright-investigation.md` classificou isso como side effect relevante. [Inferencia de produto] usuarios podem desconfiar da qualidade do historico quando registros aparecem sem acao explicita.
- Melhoria proposta: separar "preparar conversa" de "visualizar conversa", criando registros apenas quando houver primeiro envio, primeiro recebimento ou acao explicita do usuario.
- Impacto: Alto
- Esforco: Medio
- Prioridade: P0 / Quick Win

#### 6.2 Reorganizar o fluxo de WhatsApp para ser orientado por conectividade e triagem

- Tipo: Melhoria de UX
- Problema percebido: a experiencia de conversa depende de instancia e contexto tecnicos que hoje aparecem tarde demais.
- Impacto no usuario: o operador consegue entrar na tela, selecionar conversa e so entao descobrir por toast que precisa de instancia, o que interrompe o fluxo.
- Evidencia: [Confirmado no codigo/uso] `src/pages/dashboard/Conversations.tsx` exibe toast "Instancia necessaria" ao selecionar conversa sem capacidade de envio; `src/pages/dashboard/Whatsapp/ChatInterface.tsx` trabalha com selecao de instancia e estados vazios; `src/pages/dashboard/Whatsapp/InstanceList.tsx` existe como area separada de administracao. [Inferencia de produto] a operacao de atendimento esta pedindo conhecimento de arquitetura, nao apenas conhecimento de cliente.
- Melhoria proposta: introduzir um fluxo integration-first: mostrar estado da conectividade logo no topo, bloquear acoes impossiveis antes da selecao, oferecer CTA direto para configurar instancia e criar uma fila de triagem clara entre "sem resposta", "aguardando", "bloqueado por configuracao" e "pronto para enviar".
- Impacto: Alto
- Esforco: Medio
- Prioridade: P1 / Proximo ciclo

### 7. Agenda e acompanhamento

#### 7.1 Evoluir a agenda de calendario para fila de follow-up comercial

- Tipo: Melhoria de funcionalidade
- Problema percebido: a agenda existe, mas ainda se comporta mais como calendario generico do que como sistema de acompanhamento.
- Impacto no usuario: compromissos ficam visiveis, porem o usuario nao tem uma fila clara de pendencias, atrasos, proximas ligacoes ou follow-ups automaticos.
- Evidencia: [Confirmado no codigo/uso] `src/pages/dashboard/Agenda.tsx` busca eventos em `agenda` e os apresenta em calendario e lista; o sistema nao expoe uma fila consolidada de tarefas comerciais; `src/components/dashboard/reports/TasksCard.tsx` ainda usa `mockTasks`, sinalizando que a camada de tarefas operacionais nao esta fechada. [Inferencia de produto] o time perde ritmo por alternar entre calendario, lead e conversa sem uma fila unica de execucao.
- Melhoria proposta: unificar agenda, tarefas e follow-up em uma fila operacional com filtros por atraso, prioridade, responsavel e contexto do lead.
- Impacto: Medio
- Esforco: Medio
- Prioridade: P1 / Proximo ciclo

### 8. Relatorios e insights

#### 8.1 Transformar relatorios em centro de decisao e nao apenas em painel analitico

- Tipo: Melhoria de UX
- Problema percebido: a tela de relatorios ja tem boa densidade de dados, mas ainda entrega pouco guidance pratico.
- Impacto no usuario: o gestor consegue ler KPIs e funil, mas ainda precisa interpretar manualmente o que precisa ser corrigido agora.
- Evidencia: [Confirmado no codigo/uso] `src/pages/dashboard/Reports.tsx` monta filtros avancados, KPIs, funnel, tabela e `ReportAIInsights`; o componente legado `src/components/dashboard/reports/AIInsightsCard.tsx` ainda esta "Em breve"; existe `TasksCard` com dado mock. [Inferencia de produto] o modulo ainda esta entre a camada de BI e a camada de decisao operacional.
- Melhoria proposta: adicionar narrativas orientadas por anomalia, variacao por responsavel/pipeline, alertas com CTA e blocos de "o que fazer hoje" para gestao e operacao.
- Impacto: Medio
- Esforco: Medio
- Prioridade: P1 / Proximo ciclo

### 9. Automacao e Flow Editor

#### 9.1 Reduzir a barreira de entrada da automacao com templates e guardrails

- Tipo: Melhoria de funcionalidade
- Problema percebido: a automacao parece poderosa, mas muito tecnica para o primeiro uso.
- Impacto no usuario: times menos experientes podem abandonar o recurso antes de perceber valor, mesmo com editor flexivel.
- Evidencia: [Confirmado no codigo/uso] `src/pages/dashboard/Automation.tsx` lista fluxos, execucoes e painel de pausas; `src/pages/dashboard/FlowEditor.tsx` abre um editor com nodes, edges, configuracoes e validacao tecnica; a rota `/dashboard/automation/new` existe, mas o usuario cai direto em um canvas vazio. [Inferencia de produto] a automacao hoje conversa melhor com quem ja entende como desenhar fluxo do que com quem quer resolver um caso de uso de negocio.
- Melhoria proposta: oferecer templates prontos para follow-up, reengajamento, qualificacao, reabertura e pausa operacional, com preview de comportamento, validacoes mais humanas e simulacao antes de ativar.
- Impacto: Medio
- Esforco: Medio
- Prioridade: P1 / Proximo ciclo

### 10. Integracoes e Launchpad

#### 10.1 Reposicionar o Launchpad como mercado de conexoes reais, nao vitrine de possibilidades

- Tipo: Melhoria de UX
- Problema percebido: o Launchpad mistura itens conectaveis, itens sem fluxo implementado e itens apenas conceituais.
- Impacto no usuario: a tela comunica amplitude, mas dilui clareza sobre o que pode ser configurado agora e o que ainda depende de roadmap.
- Evidencia: [Confirmado no codigo/uso] `src/pages/dashboard/Launchpad.tsx` lista categorias amplas com status `connected`, `available` e `coming-soon`, mas muitos itens estao marcados como `coming-soon` ou exigem papel especifico; o botao de varias integracoes fica desabilitado. [Inferencia de produto] isso reduz a taxa de ativacao porque o usuario nao entende rapidamente onde comecar.
- Melhoria proposta: reorganizar o Launchpad em "Conecte hoje", "Em beta" e "Planejado", com assistente de setup, requisitos por role e valor esperado por integracao.
- Impacto: Medio
- Esforco: Baixo
- Prioridade: P1 / Quick Win

### 11. Suporte, configuracoes e usuarios

#### 11.1 Reorganizar as areas administrativas em torno de quem decide e de quem opera

- Tipo: Melhoria de UX
- Problema percebido: configuracoes, usuarios e suporte tem bastante capacidade, mas a arquitetura de informacao ainda e densa.
- Impacto no usuario: administradores conseguem fazer muita coisa, mas com carga cognitiva alta; usuarios comuns enxergam menos clareza sobre "onde configuro meu perfil", "onde configuro minha empresa" e "onde peco ajuda".
- Evidencia: [Confirmado no codigo/uso] `src/pages/dashboard/SettingsPage.tsx` concentra perfil, empresa, respostas rapidas e integracoes; `src/pages/dashboard/UsersManagement.tsx` mistura empresa, usuarios e modais com diferentes fluxos; `src/pages/dashboard/SupportPage.tsx` funciona bem como hub de tickets, mas sua variante admin e separada. [Inferencia de produto] ha oportunidade de separar claramente area pessoal, area de empresa e area de operacao/atendimento.
- Melhoria proposta: dividir configuracoes por escopo (Minha conta, Minha equipe, Empresa, Integracoes), simplificar gestao de usuarios por perfil e manter o suporte como area autocontida com FAQ, status do ambiente e abertura de chamado.
- Impacto: Medio
- Esforco: Medio
- Prioridade: P1 / Proximo ciclo

### 12. Areas admin e permissoes

#### 12.1 Unificar autorizacao por role e abandonar regras escondidas por UUID fixo

- Tipo: Enabler tecnico com impacto no usuario
- Problema percebido: a governanca de acesso nao segue uma unica fonte de verdade.
- Impacto no usuario: a experiencia administrativa pode variar por conta especifica, e nao pelo papel esperado, o que mina confianca no produto em cenarios multiempresa.
- Evidencia: [Confirmado no codigo/uso] `src/hooks/useTickets.ts` define `SUPER_ADMIN_ID` fixo; `src/components/auth/SuperAdminGuard.tsx` usa esse hook; `src/components/layout/AppSidebar.tsx` ja toma decisoes por `role` obtido em `profiles`. A investigacao em `docs/localhost-8080-playwright-investigation.md` destacou essa inconsistencia. [Inferencia de produto] administracao e auditoria ficam menos confiaveis quando permissao depende de excecao hardcoded.
- Melhoria proposta: consolidar RBAC por role/policy em todos os modulos, com gates visiveis na UI, mensagens de permissao claras e comportamento consistente entre sidebar, rotas e consultas.
- Impacto: Alto
- Esforco: Medio
- Prioridade: P0 / Quick Win

### 13. Camada transversal: performance, acessibilidade e confiabilidade

#### 13.1 Tratar performance e acessibilidade como parte da experiencia, nao como pos-trabalho

- Tipo: Enabler tecnico com impacto no usuario
- Problema percebido: o produto ja esta grande o suficiente para que debt tecnica apareca como lentidao, estados confusos e perda de confianca.
- Impacto no usuario: telas pesadas, warnings de acessibilidade e estados incompletos degradam percepcao de qualidade, especialmente em operacao diaria.
- Evidencia: [Confirmado no codigo/uso] `npm run build` concluiu com asset nao resolvido em `/chat-bg-doodle.png` e bundle principal de `1,784.98 kB`; `npm run lint` falhou com `215 problems`; a investigacao anterior registrou warnings de dialog/formulario, estados vazios pouco guiados e fan-out de consultas em conversas. [Inferencia de produto] isso se traduz em demora de carregamento, menor confianca em modais e mais friccao no uso intenso.
- Melhoria proposta: abrir uma frente transversal de performance e a11y com foco em code splitting, estados de carregamento/erro padronizados, limpeza de dialogs/forms e revisao dos fluxos com maior frequencia de uso.
- Impacto: Alto
- Esforco: Alto
- Prioridade: P1 / Aposta estrutural

## Roadmap Prioritario

### Quick Wins

| Prioridade | Frente | Objetivo de usuario | Resultado esperado |
| --- | --- | --- | --- |
| P0 | Recuperacao de senha | Conseguir voltar ao sistema sem depender de suporte | Entrada confiavel e menor abandono |
| P0 | Onboarding guiado | Chegar a primeira vitoria nas primeiras sessoes | Mais contas ativadas de verdade |
| P0 | Dashboard acional | Entender o que fazer hoje em segundos | Mais foco e uso diario da home |
| P0 | Conversas sem side effects | Confiar no historico e no inbox | Menos surpresa e maior previsibilidade |
| P0 | RBAC unificado | Entender por que pode ou nao pode acessar algo | Mais confianca administrativa |
| P1 | Launchpad reestruturado | Saber o que conectar agora | Maior ativacao de integracoes |
| P1 | Busca global funcional | Chegar rapido em leads, conversas e fluxos | Navegacao mais eficiente |

### Proximo ciclo

| Prioridade | Frente | Objetivo de usuario | Resultado esperado |
| --- | --- | --- | --- |
| P1 | Alinhamento de promessa | Entrar no produto com expectativa correta | Menor frustracao no primeiro uso |
| P1 | Lead cockpit | Operar o lead pela proxima melhor acao | Mais conversao e menos troca de contexto |
| P1 | WhatsApp integration-first | Atender sem tropeçar em configuracao tecnica | Melhor operacao de atendimento |
| P1 | Agenda como fila | Saber o que esta atrasado e o que vence hoje | Mais disciplina comercial |
| P1 | Relatorios orientados por acao | Tomar decisao mais rapido | Mais uso gerencial do modulo |
| P1 | Automacao com templates | Ativar fluxos sem depender de usuario avancado | Maior adocao de automacao |
| P1 | Configuracoes por escopo | Encontrar configuracoes sem confusao | Menor carga cognitiva admin |

### Apostas estruturais

| Prioridade | Frente | Objetivo de usuario | Resultado esperado |
| --- | --- | --- | --- |
| P1 | Performance e a11y | Usar o sistema com mais fluidez e menos atrito | Experiencia premium e confiavel |
| P2 | Plataforma operacional unificada | Trabalhar de ponta a ponta sem alternar de modulo mentalmente | Lyn CRM como "sistema de execucao comercial" |
| P2 | Narrativa de IA confiavel | Receber orientacao inteligente baseada em dados validos | Diferenciacao real frente a CRMs genericos |

## Quick Wins

Estas sao as iniciativas com melhor relacao entre impacto percebido e velocidade de entrega:

1. Implementar `forgot-password` e `reset-password`, removendo o `404` do fluxo de acesso.
2. Criar checklist de ativacao pos-onboarding: conectar WhatsApp, criar pipeline, convidar equipe e cadastrar primeiro lead.
3. Restaurar o card de insights da home com uma fonte valida de dados ou substitui-lo por recomendacoes de negocio confiaveis.
4. Remover `insert` automatico de conversas ao abrir `/dashboard/conversations` e `/dashboard/:leadId`.
5. Unificar autorizacao admin por `role`, eliminando dependencia de `SUPER_ADMIN_ID`.
6. Reposicionar o `Launchpad` com estados honestos: operacional, beta, planejado.
7. Implementar uma busca global real ou retirar temporariamente o atalho `⌘K` e o placeholder aspiracional.
8. Substituir indicadores hardcoded, como o badge `12` de WhatsApp, por dados reais ou por ausencia de badge.

## Apostas Estruturais

### 1. Lyn CRM como cockpit de operacao comercial

O produto ja tem leads, conversas, agenda, suporte, relatorios e automacao. A aposta mais forte nao e adicionar mais um modulo; e costurar esses modulos em uma unica experiencia de execucao diaria. Isso pede:

- home orientada por prioridade do dia
- detalhe do cliente como centro da proxima acao
- agenda/tarefas integradas ao lead e a conversa
- relatorios que terminam em recomendacao acionavel

### 2. IA como camada de decisao confiavel

A marca do produto empurra IA para o centro da proposta. Para isso gerar diferenciacao real, a camada de IA precisa aparecer onde ela reduz trabalho e aumenta acerto, nao apenas como card aspiracional. Isso pede:

- insights com fonte de dados valida e auditavel
- recomendacoes conectadas ao contexto do lead e da conversa
- automacoes baseadas em templates e objetivos de negocio
- copy do produto alinhada ao nivel real de maturidade dos recursos

### 3. Confianca operacional como diferencial

Em CRM, confianca vale tanto quanto feature. Side effects silenciosos, permissoes inconsistentes, badges hardcoded, telas vazias sem contexto e performance irregular corroem essa confianca. A aposta estrutural aqui e transformar previsibilidade em vantagem de produto:

- nenhuma tela de leitura deve alterar dados sem intencao explicita
- toda permissao deve ser explicavel por role/policy
- todo estado vazio, erro ou carregamento deve orientar proximo passo
- performance e acessibilidade devem entrar no backlog principal, nao ficar como limpeza eventual

## Observacoes e Premissas

- Fontes principais desta auditoria:
  - `src/App.tsx`
  - `src/pages/**`
  - `src/components/layout/AppShell.tsx`
  - `src/components/layout/AppSidebar.tsx`
  - `docs/localhost-8080-playwright-investigation.md`
  - execucoes locais de `npm run build` e `npm run lint`
- O documento diferencia evidencias em dois niveis:
  - `[Confirmado no codigo/uso]`: visto diretamente no codigo ou em investigacao operacional anterior
  - `[Inferencia de produto]`: leitura de impacto, risco ou oportunidade a partir do comportamento observado
- O escopo considerado foi o sistema inteiro, incluindo:
  - areas publicas
  - onboarding
  - dashboard e modulos internos
  - administracao e suporte
  - superficies "coming soon" quando elas afetam expectativa do usuario
- Principais fatos objetivos usados como lastro:
  - o build atual conclui, mas com asset nao resolvido em `/chat-bg-doodle.png`
  - o bundle principal atual e de `1,784.98 kB`
  - o lint atual falha com `215 problems (194 errors, 21 warnings)`
  - ha modulos com maturidade desigual, incluindo tabs desabilitadas, cards "em breve", arrays mockados e integracoes ainda conceituais
- Este material evita listar divida tecnica generica sem relacao com UX. Os pontos tecnicos so entram quando alteram:
  - clareza
  - confianca
  - velocidade
  - previsibilidade
  - ativacao
  - resultado operacional
- Recomendacao de uso deste documento:
  - produto: ordenar backlog e alinhar promessas
  - design: reorganizar jornadas e estados
  - engenharia: separar quick wins de enablers estruturais
