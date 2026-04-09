/**
 * Force refresh webhook on specific instance
 * This script will DELETE and RE-CREATE the webhook configuration
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
const EVO_URL = env.EVOLUTION_API_URL || 'https://evo.iacompany.co';
const EVO_KEY = env.EVOLUTION_API_KEY;
const WEBHOOK_URL = env.CRM_WEBHOOK_URL || 'https://knnasxtrnaymjdaesdcz.supabase.co/functions/v1/whatsapp-webhook';
const INSTANCE = process.argv[2] || 'atendimento';

const colors = {
    reset: "\x1b[0m",
    green: "\x1b[32m",
    red: "\x1b[31m",
    yellow: "\x1b[33m",
    cyan: "\x1b[36m"
};

async function main() {
    console.log(`\n${colors.cyan}=== FORCE REFRESH WEBHOOK ===${colors.reset}`);
    console.log(`Instance: ${INSTANCE}`);
    console.log(`Webhook URL: ${WEBHOOK_URL}\n`);

    // Step 1: Get current webhook
    console.log(`${colors.yellow}[1/3] Getting current webhook config...${colors.reset}`);
    const currentRes = await fetch(`${EVO_URL}/webhook/find/${INSTANCE}`, {
        headers: { 'apikey': EVO_KEY }
    });
    const current = await currentRes.json();
    console.log('Current:', JSON.stringify(current, null, 2));

    // Step 2: Set webhook (this will update/refresh it)
    console.log(`\n${colors.yellow}[2/3] Setting webhook...${colors.reset}`);
    const setPayload = {
        url: WEBHOOK_URL,
        webhookByEvents: false,
        webhookBase64: true,
        events: [
            "MESSAGES_UPSERT",
            "MESSAGES_UPDATE",
            "CONNECTION_UPDATE",
            "QRCODE_UPDATED"
        ],
        enabled: true
    };

    const setRes = await fetch(`${EVO_URL}/webhook/set/${INSTANCE}`, {
        method: 'POST',
        headers: {
            'apikey': EVO_KEY,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(setPayload)
    });
    const setResult = await setRes.json();
    console.log('Set result:', JSON.stringify(setResult, null, 2));

    // Step 3: Verify
    console.log(`\n${colors.yellow}[3/3] Verifying...${colors.reset}`);
    const verifyRes = await fetch(`${EVO_URL}/webhook/find/${INSTANCE}`, {
        headers: { 'apikey': EVO_KEY }
    });
    const verify = await verifyRes.json();
    console.log('Verified:', JSON.stringify(verify, null, 2));

    if (verify.enabled && verify.url === WEBHOOK_URL) {
        console.log(`\n${colors.green}✓ Webhook refreshed successfully!${colors.reset}`);
    } else {
        console.log(`\n${colors.red}✗ Something may have gone wrong${colors.reset}`);
    }
}

main().catch(console.error);
