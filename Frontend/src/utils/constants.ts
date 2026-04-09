/**
 * Constantes do projeto Lyn CRM
 */

// Status dos Leads
export const LEAD_STATUS = {
  NOVO: 'novo',
  CONTATO: 'contato',
  QUALIFICADO: 'qualificado',
  PERDIDO: 'perdido',
  GANHO: 'ganho',
} as const;

export const LEAD_STATUS_LABELS = {
  [LEAD_STATUS.NOVO]: 'Novo',
  [LEAD_STATUS.CONTATO]: 'Em Contato',
  [LEAD_STATUS.QUALIFICADO]: 'Qualificado',
  [LEAD_STATUS.PERDIDO]: 'Perdido',
  [LEAD_STATUS.GANHO]: 'Ganho',
};

// Canais de Conversação
export const CANAL_CONVERSA = {
  WHATSAPP: 'whatsapp',
  EMAIL: 'email',
  CHAT: 'chat',
} as const;

export const CANAL_CONVERSA_LABELS = {
  [CANAL_CONVERSA.WHATSAPP]: 'WhatsApp',
  [CANAL_CONVERSA.EMAIL]: 'E-mail',
  [CANAL_CONVERSA.CHAT]: 'Chat',
};

// Status de Mensagens
export const STATUS_MENSAGEM = {
  ENVIADA: 'enviada',
  RECEBIDA: 'recebida',
  LIDA: 'lida',
  ERRO: 'erro',
} as const;

// Tipos de Atendimento
export const TIPO_ATENDIMENTO = {
  LIGACAO: 'ligacao',
  EMAIL: 'email',
  REUNIAO: 'reuniao',
  NOTA: 'nota',
} as const;

export const TIPO_ATENDIMENTO_LABELS = {
  [TIPO_ATENDIMENTO.LIGACAO]: 'Ligação',
  [TIPO_ATENDIMENTO.EMAIL]: 'E-mail',
  [TIPO_ATENDIMENTO.REUNIAO]: 'Reunião',
  [TIPO_ATENDIMENTO.NOTA]: 'Nota',
};

// Tipos de Usuário (a serem implementados com tabela de roles)
export const USER_ROLES = {
  ADMIN: 'admin',
  VENDEDOR: 'vendedor',
  AUTOMACAO: 'automacao',
} as const;
