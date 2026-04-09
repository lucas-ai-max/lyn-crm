# WhatsApp CRM Integration - Documentation

This document explains how to run and configure the new WhatsApp CRM features.

## 1. Prerequisites

- **Node.js**: Ensure Node.js is installed.
- **Supabase**: The database migrations have been applied.
- **Evolution API**: You need an active Evolution API instance.
- **Redis (Optional)**: If you implement queues, Redis is required. Currently, direct API calls are used, but the dependencies are installed.

## 2. Project Structure

- `server/`: Contains the Node.js backend.
    - `src/services/evolutionService.js`: Integration with Evolution API.
    - `src/controllers/`: Logic for Instances, Messages, and Webhooks.
    - `src/routes/`: API Endpoints.
- `src/pages/dashboard/Whatsapp/`: Frontend pages.
    - `InstanceList.tsx`: Manage instances and scan QR Codes.
    - `ChatInterface.tsx`: Realtime chat with contacts.

## 3. How to Run

### Start the Backend Server
The backend handles the communication with Evolution API.

1.  Open a new terminal.
2.  Run the server:
    ```bash
    npm run server
    ```
    (Or `cd server && npm install && node index.js` if you haven't run install nicely).
    *Note: `npm run server` works from the root folder.*

    The server runs on **http://localhost:3001**.

### Start the Frontend
1.  Ensure your main app is running:
    ```bash
    npm run dev
    ```
2.  Open **http://localhost:8080** (or your Vite port).

## 4. Configuration

### Webhooks
To receive messages, you must configure the Evolution API to send webhooks to your backend.
Since your backend is running locally, use **Ngrok** or a similar tunnel if you are testing with a real Evolution server in the cloud.

**Webhook URL**: `https://YOUR-URL/api/webhook`

If you deploy this, update the `webhookUrl` in `server/src/services/evolutionService.js` or let the `createInstance` method handle it automatically (it's configured to accept a webhook url).

### Environment Variables
Check `server/.env` to ensure your Evolution API Key and URL are correct.
```env
EVOLUTION_API_URL=https://evo.iacompany.co
EVOLUTION_API_KEY=...
```

## 5. Usage

1.  Go to **Dashboard > Whatsapp (Admin)**.
2.  Click **"Criar"** to add a new instance.
3.  Click **"Conectar"** to view the QR Code. Scan it with your WhatsApp.
4.  Go to **Dashboard > Whatsapp (Chat)**.
5.  Select a conversation to start chatting!

## 6. Deployment (Produção)

## 6. Deployment & Webhooks

We use a **Supabase Edge Function** to handle webhooks. This is better because it runs 24/7 on the cloud without you needing to manage a server for it.

### Configuration
Your `WEBHOOK_URL` is already configured to pointing to your Supabase project:

```env
WEBHOOK_URL=https://knnasxtrnaymjdaesdcz.supabase.co/functions/v1/whatsapp-webhook
```

**Note:** You do NOT need to change this when moving to production. Using the Supabase URL works for both local development and production!
