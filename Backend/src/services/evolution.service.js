// Servico que faz proxy para a Evolution API (WhatsApp)
import { config } from "../config/env.js";

const { url, apiKey } = config.evolution;

// Proxy generico para qualquer endpoint da Evolution API
export async function proxy(method, path, body, query) {
  const fullUrl = `${url}/${path}${query || ""}`;

  const res = await fetch(fullUrl, {
    method,
    headers: {
      "Content-Type": "application/json",
      apikey: apiKey,
    },
    ...(method !== "GET" && method !== "HEAD" && body
      ? { body: JSON.stringify(body) }
      : {}),
  });

  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}
