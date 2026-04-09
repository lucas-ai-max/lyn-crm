/**
 * Check specific instance webhook config
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
const INSTANCE = process.argv[2] || 'atendimento';

async function main() {
    console.log(`\n=== Checking webhook for instance: ${INSTANCE} ===\n`);

    const res = await fetch(`${EVO_URL}/webhook/find/${INSTANCE}`, {
        headers: { 'apikey': EVO_KEY }
    });

    const data = await res.json();
    console.log('Webhook config:', JSON.stringify(data, null, 2));

    console.log('\n=== Connection State ===\n');
    const connRes = await fetch(`${EVO_URL}/instance/connectionState/${INSTANCE}`, {
        headers: { 'apikey': EVO_KEY }
    });
    const connData = await connRes.json();
    console.log('Connection:', JSON.stringify(connData, null, 2));
}

main().catch(console.error);
