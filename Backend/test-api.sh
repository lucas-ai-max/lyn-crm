#!/bin/sh

echo "=== TESTANDO API LYN CRM ==="
echo ""

# URL do backend
API_URL="http://localhost:3001/api"

# 1. Testar Health Check
echo "1. Health Check:"
curl -s "$API_URL/health" | head -c 100
echo ""
echo ""

# 2. Testar Swagger Docs
echo "2. Swagger Docs (primeiras 200 caracteres):"
curl -s "$API_URL/docs.json" | head -c 200
echo ""
echo ""

# 3. Criar um Lead (teste)
echo "3. Criando um lead de teste:"
COMPANY_ID="550e8400-e29b-41d4-a716-446655440000"  # UUID genérico
curl -s -X POST "$API_URL/leads" \
  -H "Content-Type: application/json" \
  -d "{
    \"nome\": \"Teste Lead\",
    \"email\": \"teste@example.com\",
    \"telefone\": \"11999999999\",
    \"company_id\": \"$COMPANY_ID\",
    \"status\": \"novo\",
    \"source\": \"manual\"
  }"
echo ""
echo ""

echo "=== FIM DO TESTE ==="
