import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Lyn CRM API",
      version: "1.0.0",
      description: "API do Lyn CRM para gestão de leads, conversas e integrações",
    },
    servers: [
      { url: "/", description: "Servidor atual" },
    ],
    components: {
      schemas: {
        Lead: {
          type: "object",
          required: ["nome", "status", "company_id"],
          properties: {
            id: { type: "string", format: "uuid", description: "ID do lead" },
            nome: { type: "string", description: "Nome do lead/contato" },
            email: { type: "string", nullable: true, description: "Email" },
            telefone: { type: "string", nullable: true, description: "Telefone principal" },
            telefone_2: { type: "string", nullable: true, description: "Telefone secundário" },
            empresa: { type: "string", nullable: true, description: "Nome da empresa" },
            segmento: { type: "string", nullable: true, description: "Segmento/indústria" },
            status: { type: "string", description: "Status do lead (novo, contato, qualificado, perdido, ganho)", example: "novo" },
            prioridade: { type: "string", nullable: true, enum: ["high", "medium", "low"], description: "Prioridade" },
            source: { type: "string", nullable: true, description: "Origem do lead (instagram, whatsapp, facebook, manual)" },
            tags: { type: "array", items: { type: "string" }, nullable: true, description: "Tags/etiquetas" },
            description: { type: "string", nullable: true, description: "Descrição/observações" },
            valor_oportunidade: { type: "number", nullable: true, description: "Valor da oportunidade em R$" },
            pipeline_id: { type: "string", format: "uuid", nullable: true, description: "ID do pipeline/funil" },
            stage_id: { type: "string", format: "uuid", nullable: true, description: "ID do estágio no pipeline" },
            responsavel_id: { type: "string", format: "uuid", nullable: true, description: "ID do responsável" },
            company_id: { type: "string", format: "uuid", description: "ID da empresa" },
            notas: { type: "array", items: { type: "string" }, nullable: true, description: "Notas (legado)" },
            custom_fields: { type: "object", nullable: true, description: "Campos customizados (JSON)" },
            last_message: { type: "string", nullable: true, description: "Última mensagem recebida" },
            last_message_at: { type: "string", format: "date-time", nullable: true, description: "Data da última mensagem" },
            created_at: { type: "string", format: "date-time", description: "Data de criação" },
          },
        },
        LeadNote: {
          type: "object",
          required: ["content", "lead_id"],
          properties: {
            id: { type: "string", format: "uuid" },
            lead_id: { type: "string", format: "uuid" },
            content: { type: "string", description: "Conteúdo da nota" },
            created_by: { type: "string", format: "uuid", nullable: true, description: "ID do usuário que criou" },
            created_at: { type: "string", format: "date-time" },
          },
        },
      },
    },
  },
  apis: ["./src/routes/**/*.js"],
};

export const swaggerSpec = swaggerJsdoc(options);
