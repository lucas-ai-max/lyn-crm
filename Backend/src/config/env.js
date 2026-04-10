// Centraliza todas as variaveis de ambiente
export const config = {
  port: process.env.PORT || 3001,

  // Supabase
  supabase: {
    url: process.env.SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_KEY,
  },

  // Composio (Instagram)
  composio: {
    apiKey: process.env.COMPOSIO_API_KEY,
    instagramAuthConfigId: process.env.COMPOSIO_INSTAGRAM_AUTH_CONFIG_ID,
    baseUrlV2: "https://backend.composio.dev/api/v2",
    baseUrlV3: "https://backend.composio.dev/api/v3",
  },

  // Evolution API (WhatsApp)
  evolution: {
    url: process.env.EVOLUTION_API_URL,
    apiKey: process.env.EVOLUTION_API_KEY,
  },

  // CORS
  cors: {
    origins: [
      "http://localhost:8080",
      "http://localhost:5173",
      "http://localhost:3000",
      process.env.FRONTEND_URL,
    ].filter(Boolean),
  },
};
