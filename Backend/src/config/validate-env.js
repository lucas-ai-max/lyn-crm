// Valida variáveis de ambiente obrigatórias na startup
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_KEY',
];

const optionalEnvVars = [
  'COMPOSIO_API_KEY',
  'COMPOSIO_INSTAGRAM_AUTH_CONFIG_ID',
  'EVOLUTION_API_URL',
  'EVOLUTION_API_KEY',
  'FRONTEND_URL',
];

export function validateEnv() {
  const missing = requiredEnvVars.filter(varName => !process.env[varName]);
  const warning = optionalEnvVars.filter(varName => !process.env[varName]);

  if (missing.length > 0) {
    console.error('\n❌ ERRO: Variáveis de ambiente obrigatórias faltando:');
    missing.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.error('\nConfigure essas variáveis no EasyPanel → Variáveis de Ambiente\n');
    process.exit(1);
  }

  if (warning.length > 0) {
    console.warn('\n⚠️  AVISO: Variáveis opcionais não configuradas:');
    warning.forEach(varName => {
      console.warn(`   - ${varName}`);
    });
    console.warn('');
  }

  console.log('✅ Variáveis de ambiente validadas com sucesso\n');
}
