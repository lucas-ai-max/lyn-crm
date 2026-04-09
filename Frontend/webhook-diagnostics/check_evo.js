/**
 * Evolution API Checker (Node.js version)
 * Verifica configurações de instâncias e webhooks
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for console
const colors = {
    reset: "\x1b[0m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    cyan: "\x1b[36m",
    magenta: "\x1b[35m"
};

// Logger helpers
const log = {
    header: (text) => console.log(`\n${colors.cyan}${'='.repeat(60)}\n${text}\n${'='.repeat(60)}${colors.reset}\n`),
    success: (text) => console.log(`${colors.green}✓ ${text}${colors.reset}`),
    error: (text) => console.log(`${colors.red}✗ ${text}${colors.reset}`),
    warning: (text) => console.log(`${colors.yellow}⚠ ${text}${colors.reset}`),
    info: (text) => console.log(`${colors.blue}ℹ ${text}${colors.reset}`),
    section: (text) => console.log(`\n${colors.yellow}${text}${colors.reset}`)
};

// Load .env manually
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
    } catch (e) {
        // ignore
    }
    return {};
}

const env = loadEnv();
const EVO_URL = process.env.EVOLUTION_API_URL || env.EVOLUTION_API_URL;
const EVO_KEY = process.env.EVOLUTION_API_KEY || env.EVOLUTION_API_KEY;

if (!EVO_URL || !EVO_KEY) {
    log.error("Configuração ausente!");
    console.log("Crie um arquivo .env com EVOLUTION_API_URL e EVOLUTION_API_KEY");
    process.exit(1);
}

const BASE_URL = EVO_URL.replace(/\/$/, '');

async function request(endpoint, method = 'GET', data = null) {
    try {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'apikey': EVO_KEY
            }
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(`${BASE_URL}/${endpoint}`, options);
        const text = await response.text();

        try {
            return {
                status: response.status,
                data: text ? JSON.parse(text) : {}
            };
        } catch (e) {
            return {
                status: response.status,
                error: text
            };
        }
    } catch (error) {
        return { error: error.message };
    }
}

async function main() {
    log.header("EVOLUTION API CHECKER (Node.js)");
    log.info(`URL: ${BASE_URL}`);

    // 1. Check Connection
    log.section("Testando Conexão...");
    const conn = await request('instance/fetchInstances');

    if (conn.error || (conn.status && conn.status !== 200)) {
        log.error(`Falha na conexão: ${conn.error || conn.status}`);
        return;
    }
    log.success("Conexão OK");

    const instances = Array.isArray(conn.data) ? conn.data : (conn.data.instances || []);
    log.info(`Encontradas ${instances.length} instâncias`);

    // 2. Analyze Instances
    for (const inst of instances) {
        const name = inst.name || inst.instanceName || inst.instance?.instanceName || 'unknown';
        log.section(`📱 Analisando: ${name}`);

        // Status
        const statusRes = await request(`instance/connectionState/${name}`);
        const state = statusRes.data?.state || statusRes.data?.instance?.state || 'unknown';

        if (state === 'open') log.success(`Status: Conectado (${state})`);
        else log.warning(`Status: ${state}`);

        // Webhook
        const webhookRes = await request(`webhook/find/${name}`);
        const webhook = webhookRes.data?.webhook || webhookRes.data || {};

        if (webhook.url) {
            log.success("Webhook configurado");
            console.log(`    URL: ${webhook.url}`);

            if (webhook.enabled) {
                log.success("Webhook Habilitado");
            } else {
                log.warning("Webhook DESABILITADO");
            }

            const events = webhook.events || [];
            console.log(`    Eventos: ${events.join(', ')}`);

            // Case-insensitive check (Evolution API pode retornar UPPERCASE)
            const eventsLower = events.map(e => e.toLowerCase());
            if (!eventsLower.includes('messages_upsert') && !eventsLower.includes('messages.upsert')) {
                log.warning("⚠ MISSING: messages.upsert (Necessário para receber mensagens)");
            } else {
                log.success("Evento messages.upsert HABILITADO");
            }
        } else {
            log.error("Webhook NÃO CONFIGURADO");
        }
    }
}

main().catch(console.error);
