import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// Types for Facebook Lead Ads webhook payload
interface FacebookLeadValue {
  leadgen_id: string;
  page_id: string;
  form_id: string;
  ad_id?: string;
  adgroup_id?: string;
  created_time: number;
}

interface FacebookLeadChange {
  value: FacebookLeadValue;
  field: string;
}

interface FacebookLeadEntry {
  id: string;
  time: number;
  changes: FacebookLeadChange[];
}

interface FacebookWebhookPayload {
  object: string;
  entry: FacebookLeadEntry[];
}

interface FacebookFieldData {
  name: string;
  values: string[];
}

interface FacebookLeadData {
  id: string;
  created_time: string;
  field_data: FacebookFieldData[];
  ad_id?: string;
  form_id?: string;
  page_id?: string;
}

interface Company {
  id: string;
  facebook_verify_token: string | null;
  facebook_page_access_token: string | null;
  facebook_app_secret: string | null;
  status_type: string[] | null;
}

// Helper: Verify HMAC SHA256 signature from Facebook
async function verifySignature(
  body: string,
  signature: string | null,
  appSecret: string
): Promise<boolean> {
  if (!signature || !signature.startsWith("sha256=")) {
    return false;
  }

  const expectedSignature = signature.slice(7); // Remove "sha256=" prefix
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(body)
  );

  const computedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return computedSignature === expectedSignature;
}

// Helper: Extract token from URL path
function extractTokenFromPath(url: string): string | null {
  const urlObj = new URL(url);
  const pathParts = urlObj.pathname.split("/");
  // Expected: /functions/v1/facebook-leads-webhook/{token}
  const token = pathParts[pathParts.length - 1];
  return token && token.length >= 32 ? token : null;
}

// Helper: Normalize phone number to international format
function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return "";

  // Remove all non-digit characters except +
  let digits = phone.replace(/[^\d+]/g, "");

  // If starts with +, preserve it
  if (phone.startsWith("+")) {
    return "+" + digits.replace(/\+/g, "");
  }

  // Remove any remaining + signs
  digits = digits.replace(/\+/g, "");

  // Brazilian phone normalization (add +55 if looks like Brazilian number)
  if (digits.length === 10 || digits.length === 11) {
    // Looks like Brazilian (DDD + 8-9 digits)
    return "+55" + digits;
  }

  // If already has country code (13+ digits), just add +
  if (digits.length >= 12) {
    return "+" + digits;
  }

  return digits;
}

// Helper: Validate email format
function isValidEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Helper: Extract lead data from Facebook field_data
function extractLeadInfo(fieldData: FacebookFieldData[]): {
  nome: string;
  email: string;
  telefone: string;
  empresa: string;
  customFields: Record<string, string>;
} {
  const result = {
    nome: "",
    email: "",
    telefone: "",
    empresa: "",
    customFields: {} as Record<string, string>,
  };

  // Mapping of known field names to our fields
  const knownFields: Record<string, "nome" | "email" | "telefone" | "empresa"> = {
    full_name: "nome",
    email: "email",
    phone_number: "telefone",
    company_name: "empresa",
    // Common variations
    nome: "nome",
    name: "nome",
    telefone: "telefone",
    phone: "telefone",
    empresa: "empresa",
    company: "empresa",
    nome_completo: "nome",
    celular: "telefone",
    whatsapp: "telefone",
  };

  for (const field of fieldData) {
    const normalizedName = field.name.toLowerCase().replace(/[^a-z_]/g, "_");
    const value = field.values?.[0] || "";

    if (knownFields[normalizedName]) {
      const targetField = knownFields[normalizedName];
      // Only set if not already set (first match wins)
      if (!result[targetField]) {
        result[targetField] = value;
      }
    } else {
      // Store as custom field
      result.customFields[field.name] = value;
    }
  }

  return result;
}

// Helper: Fetch lead details from Facebook Graph API
async function fetchLeadFromGraphAPI(
  leadgenId: string,
  accessToken: string
): Promise<FacebookLeadData | null> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${leadgenId}?access_token=${accessToken}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[GraphAPI] Error fetching lead ${leadgenId}:`, errorText);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`[GraphAPI] Exception fetching lead ${leadgenId}:`, error);
    return null;
  }
}

// Helper: Debug logging to database
async function logDebug(supabase: ReturnType<typeof createClient>, content: string) {
  try {
    await supabase
      .from("antigravity_debug_logs")
      .insert({ content: `[FB-WEBHOOK] ${content}`.substring(0, 500) });
  } catch (e) {
    console.error("Failed to log debug:", e);
  }
}

serve(async (req) => {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const url = req.url;
    const token = extractTokenFromPath(url);

    if (!token) {
      console.error("[Webhook] No token in URL path");
      return new Response("Missing token", { status: 400 });
    }

    // Find company by webhook token
    const { data: company, error: companyError } = await supabase
      .from("company")
      .select(
        "id, facebook_verify_token, facebook_page_access_token, facebook_app_secret, status_type"
      )
      .eq("facebook_webhook_token", token)
      .single();

    if (companyError || !company) {
      console.error("[Webhook] Company not found for token:", token.substring(0, 8) + "...");
      return new Response("Not found", { status: 404 });
    }

    const typedCompany = company as Company;

    // ============================================
    // GET - Verification handshake from Facebook
    // ============================================
    if (req.method === "GET") {
      const urlParams = new URL(url).searchParams;
      const mode = urlParams.get("hub.mode");
      const verifyToken = urlParams.get("hub.verify_token");
      const challenge = urlParams.get("hub.challenge");

      console.log("[Webhook] Verification request:", { mode, hasVerifyToken: !!verifyToken });

      if (mode !== "subscribe") {
        console.error("[Webhook] Invalid mode:", mode);
        await logDebug(supabase, `Verification failed: invalid mode ${mode}`);
        return new Response("Invalid mode", { status: 403 });
      }

      if (verifyToken !== typedCompany.facebook_verify_token) {
        console.error("[Webhook] Token mismatch");
        await logDebug(supabase, `Verification failed: token mismatch for company ${typedCompany.id}`);
        return new Response("Forbidden", { status: 403 });
      }

      console.log("[Webhook] Verification successful for company:", typedCompany.id);
      await logDebug(supabase, `Verification successful for company ${typedCompany.id}`);

      return new Response(challenge || "", {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    }

    // ============================================
    // POST - Lead notification from Facebook
    // ============================================
    if (req.method === "POST") {
      const bodyText = await req.text();
      const signature = req.headers.get("x-hub-signature-256");

      await logDebug(supabase, `Received POST for company ${typedCompany.id}`);

      // Validate signature if app_secret is configured
      if (typedCompany.facebook_app_secret) {
        const isValid = await verifySignature(
          bodyText,
          signature,
          typedCompany.facebook_app_secret
        );

        if (!isValid) {
          console.error("[Webhook] Invalid signature");
          await logDebug(supabase, `Invalid signature for company ${typedCompany.id}`);
          return new Response("Invalid signature", { status: 403 });
        }
      } else {
        console.warn("[Webhook] No app_secret configured, skipping signature validation");
      }

      let payload: FacebookWebhookPayload;
      try {
        payload = JSON.parse(bodyText);
      } catch (e) {
        console.error("[Webhook] Invalid JSON payload");
        return new Response("Invalid JSON", { status: 400 });
      }

      // Facebook sends test pings and other events - handle gracefully
      if (payload.object !== "page") {
        console.log("[Webhook] Ignoring non-page event:", payload.object);
        return new Response("OK", { status: 200 });
      }

      let leadsProcessed = 0;
      let leadsSkipped = 0;

      // Process each entry
      for (const entry of payload.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field !== "leadgen") {
            continue;
          }

          const { leadgen_id, page_id, form_id, ad_id } = change.value;

          if (!leadgen_id) {
            console.warn("[Webhook] Missing leadgen_id in payload");
            continue;
          }

          // Check for duplicate
          const { data: existingLead } = await supabase
            .from("leads")
            .select("id")
            .eq("company_id", typedCompany.id)
            .eq("leadgen_id", leadgen_id)
            .single();

          if (existingLead) {
            console.log(`[Webhook] Duplicate lead ${leadgen_id}, skipping`);
            leadsSkipped++;
            continue;
          }

          // Fetch full lead data from Graph API if access token is configured
          let leadInfo = {
            nome: "Novo Lead Facebook",
            email: "",
            telefone: "",
            empresa: "",
            customFields: {} as Record<string, string>,
          };
          let rawFacebookData: FacebookLeadData | null = null;
          let facebookDataComplete = false;

          if (typedCompany.facebook_page_access_token) {
            rawFacebookData = await fetchLeadFromGraphAPI(
              leadgen_id,
              typedCompany.facebook_page_access_token
            );

            if (rawFacebookData?.field_data) {
              leadInfo = extractLeadInfo(rawFacebookData.field_data);
              facebookDataComplete = true;
              console.log("[Webhook] Fetched complete lead data from Graph API");
            } else {
              console.warn("[Webhook] Could not fetch complete lead data from Graph API");
            }
          }

          // Normalize data
          const normalizedPhone = normalizePhone(leadInfo.telefone);
          const emailValid = isValidEmail(leadInfo.email);

          // Determine default status (first in company's status_type array)
          const defaultStatus = typedCompany.status_type?.[0] || "Novos";

          // Build tags
          const tags = ["facebook", "paid_ad"];
          if (form_id) tags.push(`form_${form_id}`);

          // Insert lead
          const { error: insertError } = await supabase.from("leads").insert({
            company_id: typedCompany.id,
            nome: leadInfo.nome || "Novo Lead Facebook",
            email: leadInfo.email || null,
            telefone: normalizedPhone || null,
            empresa: leadInfo.empresa || null,
            status: defaultStatus,
            source: "facebook_lead_ads",
            leadgen_id,
            form_id: form_id || null,
            ad_id: ad_id || null,
            page_id: page_id || null,
            custom_fields:
              Object.keys(leadInfo.customFields).length > 0
                ? leadInfo.customFields
                : null,
            raw_facebook_data: rawFacebookData,
            email_valid: emailValid,
            facebook_data_complete: facebookDataComplete,
            tags,
            created_at: new Date().toISOString(),
          });

          if (insertError) {
            console.error("[Webhook] Insert error:", insertError);
            await logDebug(supabase, `Insert error for lead ${leadgen_id}: ${insertError.message}`);
          } else {
            leadsProcessed++;
            console.log(`[Webhook] Lead ${leadgen_id} created successfully`);

            // Increment counter using RPC
            const { error: rpcError } = await supabase.rpc(
              "increment_facebook_leads_count",
              { company_uuid: typedCompany.id }
            );

            if (rpcError) {
              console.error("[Webhook] Counter increment error:", rpcError);
            }
          }
        }
      }

      await logDebug(
        supabase,
        `Processed ${leadsProcessed} leads, skipped ${leadsSkipped} duplicates for company ${typedCompany.id}`
      );

      return new Response("OK", { status: 200 });
    }

    // Method not allowed
    return new Response("Method not allowed", { status: 405 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[Webhook] Unhandled error:", errorMessage);

    // Always return 200 to prevent Facebook from retrying
    // Log the error for debugging
    try {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      await logDebug(supabase, `Unhandled error: ${errorMessage}`);
    } catch (e) {
      // Ignore logging errors
    }

    return new Response("OK", { status: 200 });
  }
});
