# Investigacao do sistema em `localhost:8080` com MCP Playwright

Data: 2026-03-11

## Escopo e metodo

- Base tecnica validada diretamente no codigo: app React + Vite em `src/`, auth/dados via Supabase e funcoes em `supabase/functions`.
- Porta local confirmada em `vite.config.ts`: `8080`.
- Passadas executadas:
  - baseline estatica por rotas, guards, hooks e queries
  - passada publica em contexto limpo
  - passada autenticada com sessao admin persistida no MCP
  - deep dives nao destrutivos em Leads, Settings, Reports, WhatsApp, Support, Automation e Conversations
- Evidencias capturadas por rota:
  - URL final e redirects
  - headings, controles visiveis e estados de UI
  - console warnings/errors
  - requests relevantes de rede
- Limitacao operacional:
  - tentativas repetidas de screenshot via MCP Playwright falharam por timeout interno do `page.screenshot`, mesmo com captura de viewport e `body`. A investigacao ficou ancorada em DOM snapshot, console e rede.

## Baseline estatico

### Ambiente

- `npm run build`: passa, mas com asset nao resolvido (`/chat-bg-doodle.png`) e chunk principal de `1,690.68 kB`.
- `npm run lint`: falha com `239 problems (218 errors, 21 warnings)`.
- `npm run server`: quebra porque `server/index.js` nao existe.
- Drift documental confirmado:
  - `README.md` documenta `api/` e `server/`
  - os diretorios `api/` e `server/` nao existem no checkout atual

### Matriz de rotas e dados

| Rota | Guarda | Componente principal | Dados principais | Observacoes |
| --- | --- | --- | --- | --- |
| `/` | publica | `Landing` | nenhum | landing estatica |
| `/home` | publica | `Index` | `AuthContext` | redireciona para `/dashboard` ou `/login` |
| `/login` | `PublicRoute` | `Login` | `useAuth.signIn` | linka para rota inexistente `/forgot-password` |
| `/signup` | `PublicRoute` | `Signup` | `useAuth.signUp` | usa metadata no signup |
| `/verify-email` | publica | `VerifyEmail` | nenhum | tela estatica |
| `/onboarding` | `PrivateRoute(requiresCompany=false)` | `OnboardingPage` | `supabase.auth.getSession`, `fetch(create-company)` | cria empresa via Edge Function |
| `/dashboard` | `PrivateRoute` | `DashboardHome` | `useProfile`, `useAllLeads`, `useCompany`, `DashboardAIInsights` | consulta de insights quebra |
| `/dashboard/clients` | `PrivateRoute` | `Clients` | `useLeads`, `useAllLeads`, `LeadModal` | lista + kanban + modal |
| `/dashboard/:leadId` | `PrivateRoute` | `ClientDetails` | `leads`, `conversas`, `profiles` | pode criar conversa se nao existir |
| `/dashboard/conversations` | `PrivateRoute` | `Conversations` | `leads`, `conversas`, `messages`, `integration_instances` | pagina le dados e tambem insere conversas faltantes |
| `/dashboard/reports` | `PrivateRoute` | `Reports` | `profiles`, `leads`, `conversas`, `pipelines`, `pipeline_stages` | filtros e KPIs |
| `/dashboard/agenda` | `PrivateRoute` | `Agenda` | `agenda`, `leads` | calendario + modal de evento |
| `/dashboard/launchpad` | `PrivateRoute` | `Launchpad` | `useRole` | catalogo de integracoes, majoritariamente estatico |
| `/dashboard/agents` | `PrivateRoute` | `Agents` | array local | sem backend real |
| `/dashboard/settings` | `PrivateRoute` | `SettingsPage` | `profiles`, `company`, `quick_reply_templates`, config Facebook Leads | tabs de Perfil, Empresa, Respostas, Integracoes |
| `/dashboard/users` | `PrivateRoute` | `UsersManagement` | `profiles`, `company`, `auth.signUp` | CRUD de usuarios por role |
| `/dashboard/whatsapp/instances` | `PrivateRoute` | `InstanceList` | `whatsapp_instances`, `whatsapp-proxy` | cria/conecta/remove instancias |
| `/dashboard/whatsapp/chat` | `PrivateRoute` | `ChatInterface` | `whatsapp_chats`, `whatsapp_contacts`, `whatsapp_instances`, `whatsapp_messages`, `leads` | chat por instancia |
| `/dashboard/automation` | `PrivateRoute` | `Automation` | `automation_flows`, `automation_flow_executions`, `automation_flow_triggers` | tabs Fluxos, Execucoes e Controles |
| `/dashboard/automation/:flowId` | `PrivateRoute` | `FlowEditor` | `automation_flows`, `automation_flow_triggers`, `profiles` | `/dashboard/automation/new` abre editor em rascunho |
| `/dashboard/support` | `PrivateRoute` | `SupportPage` | `support_tickets`, `support_ticket_attachments` | lista do usuario + modal novo chamado |
| `/dashboard/support/admin` | `PrivateRoute + SuperAdminGuard` | `AdminSupportPage` | `support_tickets`, `profiles`, `company`, `attachments`, `messages` | acesso amarrado a ID fixo, nao ao role |
| `/dashboard/support/:ticketId` | `PrivateRoute` | `TicketDetail` | `support_tickets`, `support_ticket_messages`, `support_ticket_attachments` | detalhe do ticket |

## Passada publica

| Rota | Resultado observado | Notas |
| --- | --- | --- |
| `/` | permanece em `/` | landing carregou corretamente |
| `/home` | redireciona para `/login` | consistente com `Index.tsx` |
| `/login` | carrega form | botao `Entrar`, link para `/forgot-password` |
| `/signup` | carrega form | fluxo publico funcional |
| `/verify-email` | carrega tela estatica | sem dependencias externas |
| `/onboarding` | redireciona para `/login` | consistente com `PrivateRoute` |
| `/forgot-password` | cai em `404` | bug confirmado |
| `/dashboard` | redireciona para `/login` | guarda privada funcionando |

Observacoes da passada publica:

- O fluxo anonimo esta coerente para login/signup/onboarding/dashboard.
- O unico bug funcional confirmado nessa passada foi a rota de recuperacao de senha ausente.

## Passada autenticada

### Cobertura por modulo

| Rota | Estado observado | Achados principais |
| --- | --- | --- |
| `/home` | redireciona para `/dashboard` | coerente com sessao autenticada |
| `/dashboard` | dados e KPIs carregam | query de insights IA retorna `400` |
| `/dashboard/clients` | lista com `50` leads e kanban com dados | modal `Novo Cliente` abre; warning de acessibilidade em dialog |
| `/dashboard/conversations` | lista de conversas carregou apos espera maior | clique em item mostra toast `Instancia necessaria`; input de mensagem existe |
| `/dashboard/reports` | filtros e KPIs carregam | query direta de contagem em `conversas` funciona; aborts vistos na varredura eram de navegacao |
| `/dashboard/agenda` | calendario funcional | sem erros relevantes |
| `/dashboard/launchpad` | catalogo carregado | majoritariamente estatico |
| `/dashboard/agents` | cards locais carregam | modulo sem backend |
| `/dashboard/settings` | tabs Perfil, Empresa, Respostas e Integracoes carregam | Empresa mostra funis/etapas; Integracoes mostra configuracao Facebook Leads |
| `/dashboard/users` | listagem de usuarios carregou | role admin ve pagina de usuarios |
| `/dashboard/whatsapp/instances` | lista de instancias carregou | dialog `Criar Nova Instancia` abre |
| `/dashboard/whatsapp/chat` | estado vazio | seletor `Todas as Instancias`; sem conversa selecionada |
| `/dashboard/automation` | estado vazio de fluxos | tab `Controles` carrega `Controle de Pausas`; `/dashboard/automation/new` abre editor |
| `/dashboard/support` | estado vazio do usuario | modal `Novo Chamado` abre; usuario ve botao `Central Admin` |
| `/dashboard/support/admin` | lista admin carregou | acessivel com usuario de role `admin` por causa de guard baseado em ID fixo |

### Deep dives executados

- Leads:
  - tab `Kanban` abriu e exibiu pipeline `WhatsApp > Padrao`
  - dialog `Novo Cliente` abriu com campos de nome, telefones, funil, etapa, notas, descricao e tags
- Settings:
  - `Empresa` mostrou gestao de nome, funis e etapas do pipeline
  - `Respostas` mostrou templates reais
  - `Integracoes` mostrou fluxo completo de Facebook Lead Ads
- Reports:
  - filtros de periodo, responsavel, segmento, fase, canal e prioridade ficaram visiveis
  - KPIs renderizaram com dados
- WhatsApp:
  - dialog `Criar Nova Instancia` abriu
  - pagina de chat exibiu estado vazio e busca por contato
- Support:
  - modal `Novo Chamado` abriu com categoria, prioridade, titulo, descricao e anexos
- Automation:
  - tab `Controles` abriu com `Controle de Pausas`
  - `/dashboard/automation/new` abriu editor com blocos, estado `Rascunho`, botoes `Ativar` e `Salvar`
- Conversations:
  - lista real de conversas carregou apos espera maior
  - ao selecionar a primeira conversa, a UI exibiu `Instancia necessaria` e bloqueio de envio

## Findings confirmados

### 1. Recuperacao de senha quebrada por rotas ausentes

Severidade: alta

- `Login.tsx` aponta para `/forgot-password`, mas `App.tsx` nao declara essa rota.
- `auth.ts` tambem prepara redirect para `/reset-password`, e essa rota tambem nao existe.
- Evidencia:
  - `src/pages/Login.tsx:73`
  - `src/services/auth.ts:131`
  - `src/App.tsx:47`
- Efeito observado:
  - `/forgot-password` cai em `404`

### 2. Dashboard Home sempre quebra a consulta de insights da IA

Severidade: alta

- A query usa `conversas.insights_ia`, mas a resposta real do PostgREST foi `column conversas.insights_ia does not exist`.
- Evidencia:
  - `src/components/dashboard/home/DashboardAIInsights.tsx:52`
  - replay direto da query no browser retornou `400` com `code 42703`
- Efeito observado:
  - card `Insights da IA` renderiza sem dados reais
  - console registra erro `400`

### 3. Abrir `/dashboard/conversations` nao e leitura passiva: a pagina cria conversas no banco

Severidade: alta

- O queryFn da pagina percorre todos os leads do usuario e faz `insert` em `conversas` quando nao encontra registro.
- Evidencia:
  - `src/pages/dashboard/Conversations.tsx:75`
  - `src/pages/dashboard/Conversations.tsx:93`
- Impacto:
  - simplesmente navegar para a tela gera efeito colateral em dados
  - a pagina ainda faz fan-out de queries por lead para ultima mensagem e unread count
  - esta propria investigacao pode ter disparado inserts em `conversas` ao abrir a rota, porque o side effect faz parte do fluxo atual da pagina

### 4. Permissao de super admin baseada em ID fixo, nao em role

Severidade: alta

- `SuperAdminGuard` usa `useIsSuperAdmin`, e `useIsSuperAdmin` compara apenas com um UUID hardcoded.
- O usuario observado tem role `admin`, mas acessa `/dashboard/support/admin` porque seu ID coincide com o constante.
- Evidencia:
  - `src/hooks/useTickets.ts:9`
  - `src/components/auth/SuperAdminGuard.tsx:5`
  - contraste com sidebar role-based em `src/components/layout/AppSidebar.tsx:106`
- Impacto:
  - duas fontes de verdade para permissao
  - comportamento administrativo depende de conta especifica, nao de role

### 5. Script de backend local quebrado e documentacao fora de sincronia

Severidade: alta

- `package.json` ainda expoe `npm run server -> node server/index.js`, mas `server/` nao existe.
- `README.md` documenta `api/` e `server/` como arquitetura principal, e ambos nao existem no repo.
- Evidencia:
  - `package.json:12`
  - `README.md:65`
  - `npm run server` retorna `MODULE_NOT_FOUND`

### 6. Build passa com asset ausente e bundle principal muito grande

Severidade: media

- `Chat.css` referencia `/chat-bg-doodle.png`, mas o arquivo nao existe no `public/`.
- `vite build` deixa o path sem resolver e gera chunk JS unico de `1,690.68 kB`.
- Evidencia:
  - `src/components/chat/Chat.css:11`
- Impacto:
  - risco visual no chat
  - impacto de performance e carregamento inicial

### 7. Base tecnica com qualidade estourada no lint

Severidade: media

- `npm run lint` falha com `239` problemas.
- Principais classes observadas:
  - uso extensivo de `any`
  - hooks com dependencias faltando
  - arquivos `src/types/supabase.ts` e `src/types/supabase-v2.ts` tratados como binarios pelo parser
  - imports `require()` proibidos
- Impacto:
  - custo alto para manutencao
  - baixo sinal de regressao em CI local

### 8. Warnings de acessibilidade e formularios em fluxos reais

Severidade: baixa

- Warnings observados ao abrir modais e formularios:
  - dialogs sem `Description` ou `aria-describedby`
  - inputs de auth sem `autocomplete`
  - password fields fora de `form` em settings/integracoes
- Impacto:
  - degradacao de a11y e DX

## Riscos e observacoes tecnicas

- Os `HEAD/FAILED net::ERR_ABORTED` vistos em algumas varreduras de Reports e Conversations foram majoritariamente efeito de navegacao entre paginas com queries concorrentes; quando reexecutada isoladamente, a query principal de Reports em `conversas` retornou `200`.
- Mesmo assim, Conversations continua com risco estrutural de fan-out e de mutacao em leitura por causa do `Promise.all` por lead.
- A sessao admin do MCP permaneceu utilizavel durante a investigacao.

## Backlog priorizado

### P0

1. Implementar rotas e telas de `forgot-password` e `reset-password`, ou remover links/redirects ate o fluxo existir.
2. Corrigir `DashboardAIInsights` para usar a coluna/tabela real ou remover o card ate a modelagem existir.
3. Remover side effects de escrita do carregamento de `/dashboard/conversations`.
4. Unificar autorizacao de super admin por role/policy, eliminando o UUID hardcoded.
5. Corrigir `npm run server` e alinhar `README.md` com a arquitetura atual.

### P1

1. Resolver asset faltante `/chat-bg-doodle.png`.
2. Quebrar o bundle principal com code splitting nos modulos grandes.
3. Reduzir N+1 de Conversations e unread counts.
4. Limpar warnings de dialog/formulario nos fluxos principais.

### P2

1. Zerar erros criticos de lint por dominio, comecando por `automation`, `whatsapp`, `support` e `dashboard`.
2. Consolidar documentacao tecnica a partir do codigo real.
3. Adicionar smoke tests automatizados para rotas publicas, auth guards e dashboard principal.

## Conclusao

- O sistema local em `localhost:8080` esta funcional na maior parte das rotas principais.
- Os problemas mais relevantes nao estao na navegacao basica, e sim em consistencia arquitetural:
  - auth incompleto para recuperacao de senha
  - dados/modelagem desalinhados no dashboard
  - leitura com efeito colateral em Conversations
  - autorizacao fragmentada
  - documentacao e script de backend obsoletos
