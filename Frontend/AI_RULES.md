# Lyn CRM - Regras para Desenvolvimento com IA

Este documento estabelece as diretrizes técnicas e o uso de bibliotecas para o desenvolvimento do Lyn CRM, garantindo consistência, performance e manutenibilidade do código.

## 🛠 Tech Stack Principal

1.  **Frontend Framework:** React 18+ com TypeScript.
2.  **Bundler:** Vite.
3.  **UI Library:** shadcn/ui (com Radix UI por baixo) e Tailwind CSS para estilização.
4.  **State Management:** React Query para gerenciamento de estado de servidor e Context API para estado global de cliente.
5.  **Roteamento:** React Router v6.
6.  **Formulários:** React Hook Form para gerenciamento de formulários e Zod para validação de esquemas.
7.  **Backend as a Service (BaaS):** Supabase (PostgreSQL, Auth, Storage, Edge Functions).
8.  **Ícones:** Lucide React.
9.  **Manipulação de Datas:** date-fns.
10. **Gráficos:** Recharts.
11. **Drag and Drop:** @dnd-kit.

## 📚 Regras de Uso de Bibliotecas

Para manter a consistência e evitar redundância, siga estas regras para o uso de bibliotecas:

*   **Componentes de UI:**
    *   **Prioridade:** Utilize os componentes do `shadcn/ui` para todos os elementos de interface (botões, inputs, cards, diálogos, etc.).
    *   **Estilização:** Sempre use classes do `Tailwind CSS` para estilizar componentes.
    *   **Material UI:** Embora o Material UI esteja presente no `package.json`, a preferência é por `shadcn/ui`. Use Material UI apenas se um componente específico não estiver disponível no `shadcn/ui` e não puder ser facilmente construído com Tailwind.
*   **Ícones:** Use exclusivamente ícones da biblioteca `lucide-react`.
*   **Gerenciamento de Estado:**
    *   `@tanstack/react-query` para todas as operações de dados assíncronas (fetching, caching, atualização de dados do servidor).
    *   `React Context API` para compartilhar estado global entre componentes que não dependem de dados de servidor.
*   **Roteamento:** `react-router-dom` (v6) para todas as rotas da aplicação. As definições de rota devem permanecer em `src/App.tsx`.
*   **Formulários e Validação:**
    *   `react-hook-form` para gerenciar o estado e a lógica dos formulários.
    *   `zod` para definir e validar os esquemas de dados dos formulários.
*   **Interação com Backend:** Utilize o `Supabase JS SDK` (`@supabase/supabase-js`) para todas as comunicações com o Supabase (autenticação, banco de dados, storage).
*   **Datas e Horas:** `date-fns` para formatação, manipulação e cálculo de datas e horas.
*   **Notificações (Toasts):** Use `sonner` para notificações globais e `useToast` (do `shadcn/ui`) para feedback de UI específico, se necessário.
*   **Gráficos e Visualizações:** `recharts` para todas as necessidades de gráficos e visualizações de dados.
*   **Drag and Drop:** `@dnd-kit` para implementar funcionalidades de arrastar e soltar, como no Kanban Board.

## 📂 Estrutura de Pastas

*   `src/pages/`: Componentes que representam páginas ou rotas principais da aplicação.
*   `src/components/`: Componentes reutilizáveis que podem ser usados em várias páginas.
*   `src/services/`: Módulos que encapsulam a lógica de interação com APIs ou serviços externos (ex: `supabase.ts`).
*   `src/hooks/`: Custom React Hooks para encapsular lógica reutilizável.
*   `src/utils/`: Funções utilitárias diversas.
*   `src/integrations/supabase/`: Arquivos relacionados à configuração e tipagem do Supabase.