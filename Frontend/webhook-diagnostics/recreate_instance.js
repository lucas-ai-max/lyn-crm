/**
 * Delete and recreate instance on Evolution API
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
                    env[parts[0].trim()] = parts.slice(1).join('=').trim();
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
const INSTANCE = process.argv[2] || 'atendimento';
const WEBHOOK_URL = 'https://knnasxtrnaymjdaesdcz.supabase.co/functions/v1/whatsapp-webhook';

const colors = {
    reset: "\x1b[0m",
    green: "\x1b[32m",
    red: "\x1b[31m",
    yellow: "\x1b[33m",
    cyan: "\x1b[36m"
};

async function main() {
    console.log(`\n${colors.cyan}=== RECREATE INSTANCE: ${INSTANCE} ===${colors.reset}\n`);

    // Step 1: Logout/Disconnect
    console.log(`${colors.yellow}[1/4] Disconnecting instance...${colors.reset}`);
    try {
        const logoutRes = await fetch(`${EVO_URL}/instance/logout/${INSTANCE}`, {
            method: 'DELETE',
            headers: { 'apikey': EVO_KEY }
        });
        console.log(`Logout status: ${logoutRes.status}`);
    } catch (e) {
        console.log('Logout skipped (may not be connected)');
    }

    // Step 2: Delete instance
    console.log(`\n${colors.yellow}[2/4] Deleting instance...${colors.reset}`);
    try {
        const deleteRes = await fetch(`${EVO_URL}/instance/delete/${INSTANCE}`, {
            method: 'DELETE',
            headers: { 'apikey': EVO_KEY }
        });
        const deleteData = await deleteRes.text();
        console.log(`Delete status: ${deleteRes.status}`);
        console.log(`Response: ${deleteData}`);
    } catch (e) {
        console.log('Delete error:', e.message);
    }

    // Wait a bit
    await new Promise(r => setTimeout(r, 2000));

    // Step 3: Create new instance
    console.log(`\n${colors.yellow}[3/4] Creating new instance...${colors.reset}`);
    const createRes = await fetch(`${EVO_URL}/instance/create`, {
        method: 'POST',
        headers: {
            'apikey': EVO_KEY,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            instanceName: INSTANCE,
            qrcode: true,
            integration: "WHATSAPP-BAILEYS",
            webhook: {
                url: WEBHOOK_URL,
                byEvents: false,
                base64: true,
                events: ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "CONNECTION_UPDATE", "QRCODE_UPDATED"],
                enabled: true
            }
        })
    });
    const createData = await createRes.json();
    console.log(`Create status: ${createRes.status}`);
    console.log('Response:', JSON.stringify(createData, null, 2));

    if (createRes.ok) {
        console.log(`\n${colors.green}✓ Instance recreated successfully!${colors.reset}`);
        console.log(`\n${colors.cyan}Next steps:${colors.reset}`);
        console.log('1. Go to the CRM and scan the QR code for instance "' + INSTANCE + '"');
        console.log('2. The webhook should now send normal phone numbers instead of LID');
    } else {
        console.log(`\n${colors.red}✗ Failed to create instance${colors.reset}`);
    }
}

main().catch(console.error);
