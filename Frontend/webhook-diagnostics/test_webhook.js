/**
 * Webhook Tester (Node.js version)
 * Testa conectividade e simula payloads
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors
const colors = {
    reset: "\x1b[0m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    cyan: "\x1b[36m"
};

const log = {
    header: (text) => console.log(`\n${colors.cyan}${'='.repeat(60)}\n${text}\n${'='.repeat(60)}${colors.reset}\n`),
    success: (text) => console.log(`${colors.green}✓ ${text}${colors.reset}`),
    error: (text) => console.log(`${colors.red}✗ ${text}${colors.reset}`),
    warning: (text) => console.log(`${colors.yellow}⚠ ${text}${colors.reset}`),
    info: (text) => console.log(`${colors.blue}ℹ ${text}${colors.reset}`),
    section: (text) => console.log(`\n${colors.yellow}${text}${colors.reset}`)
};

// Load .env
function loadEnv() {
    try {
        const envPath = path.join(__dirname, '.env');
        if (fs.existsSync(envPath)) {
            const content = fs.readFileSync(envPath, 'utf8');
            const env = {};
            content.split('\n').forEach(line => {
                const parts = line.split('=');
                if (parts.length >= 2 && !line.trim().startsWith('#')) {
                    const key = parts[0].trim();
                    const value = parts.slice(1).join('=').trim();
                    env[key] = value;
                }
            });
            return env;
        }
    } catch (e) { }
    return {};
}

const env = loadEnv();
// Prefer args, then env
const args = process.argv.slice(2);
const urlArg = args.find(a => a.startsWith('--url='));
const URL = urlArg ? urlArg.split('=')[1] : (process.env.CRM_WEBHOOK_URL || env.CRM_WEBHOOK_URL);

if (!URL) {
    log.error("URL não especificada!");
    console.log("Uso: node test_webhook.js --url=HTTPS://... ou configure .env");
    process.exit(1);
}

async function testConnection() {
    log.section("1. Teste de Conectividade (GET/HEAD)");
    try {
        // Some webhooks don't support HEAD, let's try a simple POST blank
        const res = await fetch(URL, {
            method: 'POST',
            body: JSON.stringify({}),
            headers: { 'Content-Type': 'application/json' }
        });

        console.log(`Status: ${res.status} ${res.statusText}`);

        if (res.status === 401) {
            log.error("401 Unauthorized - Autenticação necessária (verifique verify_jwt)");
            return false;
        } else if (res.status >= 200 && res.status < 500) {
            log.success("Servidor acessível");
            return true;
        } else {
            log.warning(`Status inesperado: ${res.status}`);
            return true;
        }
    } catch (error) {
        log.error(`Erro de conexão: ${error.message}`);
        return false;
    }
}

async function testPayload() {
    log.section("2. Teste de Payload Simulado");

    const payload = {
        event: "messages.upsert",
        instance: "TEST_NODEJS",
        data: {
            key: {
                remoteJid: "5511999999999@s.whatsapp.net",
                fromMe: false,
                id: `TEST_${Date.now()}`
            },
            message: {
                conversation: "Teste de diagnóstico via Node.js"
            },
            pushName: "Tester Node"
        }
    };

    console.log("Enviando payload...");

    try {
        const start = Date.now();
        const res = await fetch(URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Evolution-API/2.0'
            },
            body: JSON.stringify(payload)
        });
        const duration = Date.now() - start;
        const text = await res.text();

        console.log(`Tempo: ${duration}ms`);
        console.log(`Status: ${res.status}`);
        console.log(`Resposta: ${text.substring(0, 200)}`);

        if (res.status === 200 || res.status === 201) {
            log.success("Payload ACEITO com sucesso!");
        } else if (res.status === 401) {
            log.error("Payload REJEITADO (401 Unauthorized)");
        } else {
            log.warning(`Payload recebido com status: ${res.status}`);
        }

    } catch (error) {
        log.error(`Erro ao enviar payload: ${error.message}`);
    }
}

async function main() {
    log.header(`WEBHOOK DIAGNOSTICS (Node.js)\nTarget: ${URL}`);

    const connOk = await testConnection();
    if (connOk) {
        await testPayload();
    }
}

main().catch(console.error);
