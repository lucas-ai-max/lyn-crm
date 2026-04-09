# 🔧 Webhook Diagnostics - LYN CRM

Conjunto de ferramentas para diagnosticar e corrigir problemas de recebimento de mensagens entre a Evolution API e o CRM LYN CRM.

## ⚠️ Problema Comum Identificado

O CRM recebe mensagens enviadas, mas **não recebe mensagens dos usuários**. Causa típica:
- Webhook não configurado na Evolution API
- Edge Function com `verify_jwt: true` (rejeita webhooks externos)
- Eventos necessários não habilitados

## 📁 Estrutura

```
webhook-diagnostics/
├── webhook_diagnostics.py   # Testa conectividade de webhooks
├── webhook_interceptor.py   # Servidor local para debug
├── evolution_api_checker.py # Verifica configurações Evolution API
├── fix_webhook.py           # Correção automatizada
├── requirements.txt         # Dependências Python
├── .env.example             # Exemplo de configuração
└── logs/                    # Logs gerados
```

## 🚀 Instalação

```bash
cd webhook-diagnostics
pip install -r requirements.txt
cp .env.example .env
# Edite o .env com suas credenciais
```

## 🛠️ Ferramentas

### 1. webhook_diagnostics.py
Testa conectividade e simula payloads da Evolution API.

```bash
# Teste completo
python webhook_diagnostics.py --url https://seu-webhook.com/webhook

# Apenas conexão
python webhook_diagnostics.py --url https://seu-webhook.com/webhook --test connection

# Apenas payload
python webhook_diagnostics.py --url https://seu-webhook.com/webhook --test payload
```

### 2. webhook_interceptor.py
Servidor local para interceptar e visualizar webhooks em tempo real.

```bash
# Iniciar servidor (porta 5000)
python webhook_interceptor.py

# Para expor publicamente (requer ngrok instalado):
ngrok http 5000
```

### 3. evolution_api_checker.py
Verifica todas as instâncias e suas configurações de webhook.

```bash
python evolution_api_checker.py --url https://evo.iacompany.co --api-key SUA_API_KEY
```

Gera relatório em `logs/evolution_report_*.md`.

### 4. fix_webhook.py
Configura automaticamente o webhook na Evolution API.

```bash
# Correção real
python fix_webhook.py \
  --evo-url https://evo.iacompany.co \
  --evo-key SUA_API_KEY \
  --instance nome_da_instancia \
  --webhook-url https://seu-webhook.com/webhook

# Simulação (dry run)
python fix_webhook.py --instance minha_instancia --dry-run
```

## 📋 Checklist de Diagnóstico

1. **Testar conectividade do webhook:**
   ```bash
   python webhook_diagnostics.py --test connection
   ```
   - ✅ Status 200: Webhook acessível
   - ❌ Status 401: Problema de autenticação (verify_jwt)
   - ❌ Timeout: Firewall ou URL incorreta

2. **Verificar configuração na Evolution API:**
   ```bash
   python evolution_api_checker.py
   ```
   - Verificar se webhook URL está configurada
   - Verificar se eventos incluem `messages.upsert`
   - Verificar se webhook está habilitado

3. **Testar com interceptor local:**
   ```bash
   python webhook_interceptor.py
   # Em outro terminal:
   ngrok http 5000
   # Use a URL do ngrok como webhook temporário
   ```

4. **Corrigir automaticamente:**
   ```bash
   python fix_webhook.py --instance SUA_INSTANCIA --webhook-url SUA_URL
   ```

## 🔍 Troubleshooting

| Problema | Causa Provável | Solução |
|----------|----------------|---------|
| HTTP 401 | `verify_jwt: true` na Edge Function | Redeployar com `verify_jwt: false` |
| Timeout | Firewall/URL incorreta | Verificar URL e regras de firewall |
| HTTP 400 | Payload inválido | Verificar formato do payload |
| Sem eventos | Eventos não habilitados | Usar `fix_webhook.py` |
| Webhook vazio | Não configurado | Usar `fix_webhook.py` |

## 📝 Variáveis de Ambiente

```env
EVOLUTION_API_URL=https://evo.iacompany.co
EVOLUTION_API_KEY=sua_api_key
CRM_WEBHOOK_URL=https://seu-supabase.co/functions/v1/whatsapp-webhook
WHATSAPP_INSTANCE_NAME=nome_instancia
LOCAL_SERVER_PORT=5000
```

## 📚 Referências

- [Evolution API Docs](https://doc.evolution-api.com/)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
