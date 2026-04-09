# Lyn CRM

**Versão:** 5.0.0 (Vercel Serverless Edition)  
**Responsável:** IA Company  
**Status:** 🚀 Em Produção (Vercel)

---

## 📋 Visão Geral

O **Lyn CRM** é um sistema de gestão de relacionamento com clientes proprietário da IA Company, projetado para otimizar processos comerciais com recursos de automação e inteligência artificial. O sistema oferece gestão completa de leads, agenda, histórico de atendimentos e comunicação intefrada com WhatsApp.

Esta versão foi otimizada para arquitetura **Serverless**, permitindo escalabilidade infinita e hospedagem simplificada na Vercel.

---

## 🚀 Deploy na Vercel

Este projeto está configurado para rodar 100% na Vercel (Frontend + Backend Serverless).

### 1. Configuração Inicial
1.  Faça um **Fork** ou **Clone** deste repositório.
2.  Importe o projeto no painel da Vercel.
3.  Defina as variáveis de ambiente (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, etc.).

### 2. Sincronização de Status (Cron Job)
Devido às limitações do plano Hobby da Vercel (Cron jobs limitados a 1x/dia), utilizamos um gatilho externo para manter o status das instâncias atualizado a cada minuto.

1.  Acesse [cron-job.org](https://cron-job.org) (ou serviço similar).
2.  Crie um novo Monitor/Cron.
3.  **URL:** `https://seu-dominio.vercel.app/api/cron/sync` (Ex: `https://www.lyncrm.com/api/cron/sync`)
4.  **Agendamento:** A cada 1 minuto.
5.  **Método:** GET.

Isso garantirá que o sistema detecte conexões e desconexões do WhatsApp em tempo real.

---

## ✨ Funcionalidades Principais

### 📱 Gestão de Instâncias WhatsApp
-   **Tutorial Guiado**: Interface passo-a-passo para conectar novas instâncias.
-   **QR Code Real-time**: Geração e exibição de QR Codes para pareamento.
-   **Status ao Vivo**: Monitoramento de conexão (Conectado/Desconectado).

### 💬 Interface de Chat Avançada
-   **Painel Lateral de Contato**: Edição rápida de informações do Lead sem sair da conversa.
-   **Etiquetagem (Tags)**: Sistema de tags coloridas (ex: Importante, VIP).
-   **Funil de Vendas**: Atualização de estágio do funil (Novo -> Qualificado -> Fechado) direto no chat.
-   **Notas**: Campo de descrição com salvamento automático.

### 👥 Gestão de Leads
-   Kanban ou Lista de Leads.
-   Sincronização automática com mensagens recebidas.

---

## 🛠 Arquitetura Técnica

### Frontend
-   **Framework:** React 18 + Vite
-   **UI:** Shadcn/ui + Tailwind CSS
-   **Ícones:** Lucide React

### Backend (Serverless)
-   **Runtime:** Node.js (Express adaptado para Vercel Functions).
-   **Entry Point:** `api/index.js` (Ponte para Serverless).
-   **Sync:** `server/src/routes/cronRoutes.js` (Endpoint de sincronização).

### Banco de Dados
-   **Supabase:** PostgreSQL com Row Level Security (RLS).
-   **Auth:** Supabase Auth Integration.

---

## 📦 Estrutura do Projeto

```
lyn-crm/
├── api/                 # Entry point Serverless (Vercel)
├── server/              # Código do Backend (Express)
│   ├── src/
│   │   ├── routes/      # Rotas da API (incluindo Cron)
│   │   ├── services/    # Lógica de negócios (Evolution API, Sync)
│   │   └── app.js       # Configuração do Express
├── src/                 # Código do Frontend (React)
│   ├── components/      # Componentes UI (Shadcn)
│   ├── pages/           # Páginas (Dashboard, Chat, Instâncias)
│   ├── services/        # Clientes HTTP e Supabase
│   └── hooks/           # Hooks customizados (useToast, etc.)
├── supabase/            # Migrations e Configurações
└── vercel.json          # Configuração de Deploy e Rewrites
```

---

## 🔐 Fluxo de Autenticação e Dados

O sistema utiliza **Supabase Auth** com RLS rigoroso:
-   **Leads:** Usuários só veem leads de sua empresa/responsabilidade.
-   **Tags:** Tags são isoladas por `company_id`.
-   **Instâncias:** Instâncias do WhatsApp são vinculadas à empresa do usuário.

---

## 🤝 Contribuindo

1.  Clone o repositório.
2.  Instale dependências:
    ```bash
    pnpm install
    ```
    *(Nota: Se houver erro de lockfile, rode `pnpm install` e commite o `pnpm-lock.yaml`)*.
3.  Rode localmente:
    *   Frontend: `npm run dev`
    *   Backend: `npm run server` (Local)
4.  Submeta Pull Request.

---

**© 2026 IA Company. Todos os direitos reservados.**
