#!/bin/bash

echo "=== DEBUG LYN CRM BACKEND ==="
echo ""

echo "1. Verificando Node.js..."
node --version
echo ""

echo "2. Verificando variáveis de ambiente..."
echo "SUPABASE_URL: ${SUPABASE_URL:-(não definida)}"
echo "SUPABASE_SERVICE_KEY: ${SUPABASE_SERVICE_KEY:-(não definida)}"
echo "PORT: ${PORT:-(não definida)}"
echo ""

echo "3. Verificando diretório..."
pwd
ls -la
echo ""

echo "4. Verificando node_modules..."
if [ -d "node_modules" ]; then
  echo "✓ node_modules existe"
  echo "Contém: $(ls node_modules | wc -l) pacotes"
else
  echo "✗ node_modules NÃO existe!"
  echo "Instalando dependências..."
  npm install
fi
echo ""

echo "5. Verificando src/index.js..."
if [ -f "src/index.js" ]; then
  echo "✓ Arquivo existe"
  head -20 src/index.js
else
  echo "✗ src/index.js NÃO encontrado!"
fi
echo ""

echo "6. Tentando iniciar o backend..."
timeout 10 node src/index.js
echo ""

echo "=== FIM DO DEBUG ==="
