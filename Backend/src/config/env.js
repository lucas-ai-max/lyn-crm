// Centraliza todas as variaveis de ambiente
export const config = {
  port: process.env.PORT || 3001,

  // Supabase
  supabase: {
    url: process.env.SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_KEY,
  },

  // Instagram Direct API
  instagram: {
    appId: process.env.INSTAGRAM_APP_ID,
    appSecret: process.env.INSTAGRAM_APP_SECRET,
    redirectUri: process.env.INSTAGRAM_REDIRECT_URI,
  },

  // Frontend URL (para redirect apos OAuth)
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:8080",

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
