import * as apiKeysService from "../services/api-keys.service.js";
import { createClient } from "@supabase/supabase-js";

const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "";
const supabaseUrl = process.env.SUPABASE_URL || "";

// Single Supabase client reused across all JWT validations
const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

// Middleware to authenticate using API key or Bearer token
export async function authenticateApiKey(req, res, next) {
  try {
    // Get token from header (Authorization: Bearer <token> or X-API-Key: <token>)
    const authHeader = req.headers.authorization;
    const apiKeyHeader = req.headers["x-api-key"];

    let token;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7);
    } else if (apiKeyHeader) {
      token = apiKeyHeader;
    }

    if (!token) {
      return res.status(401).json({ error: "API key required" });
    }

    // Verify API key
    const keyInfo = await apiKeysService.verifyApiKey(token);
    if (!keyInfo) {
      return res.status(401).json({ error: "Invalid or revoked API key" });
    }

    // Attach company info to request
    req.companyId = keyInfo.company_id;
    req.apiKeyId = keyInfo.id;
    req.apiKeyName = keyInfo.name;

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({ error: "Authentication error" });
  }
}

// Optional middleware: Allow both auth and unauthenticated requests
export async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const apiKeyHeader = req.headers["x-api-key"];

    let token;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7);
    } else if (apiKeyHeader) {
      token = apiKeyHeader;
    }

    if (token) {
      const keyInfo = await apiKeysService.verifyApiKey(token);
      if (keyInfo) {
        req.companyId = keyInfo.company_id;
        req.apiKeyId = keyInfo.id;
        req.apiKeyName = keyInfo.name;
      }
    }

    next();
  } catch (error) {
    console.error("Optional auth middleware error:", error);
    next();
  }
}

// Accept either X-API-Key or Supabase JWT (Bearer token)
// Tries API key first, falls back to JWT — allows authenticated users
// to manage their own keys without needing an API key first.
export async function authenticateJwtOrApiKey(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const apiKeyHeader = req.headers["x-api-key"];

    // 1. Try X-API-Key first
    if (apiKeyHeader) {
      const keyInfo = await apiKeysService.verifyApiKey(apiKeyHeader);
      if (keyInfo) {
        req.companyId = keyInfo.company_id;
        req.apiKeyId = keyInfo.id;
        req.apiKeyName = keyInfo.name;
        return next();
      }
    }

    // 2. Fall back to JWT via Authorization: Bearer
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7);

      // Try it as an API key first (backward compat — some clients send key as Bearer)
      const keyInfo = await apiKeysService.verifyApiKey(token);
      if (keyInfo) {
        req.companyId = keyInfo.company_id;
        req.apiKeyId = keyInfo.id;
        req.apiKeyName = keyInfo.name;
        return next();
      }

      // Otherwise treat as Supabase JWT
      if (!supabaseAdmin) {
        return res.status(500).json({ error: "Server configuration error" });
      }

      const { data: user, error: userError } = await supabaseAdmin.auth.getUser(token);
      if (!userError && user?.user?.id) {
        const { data: profile } = await supabaseAdmin
          .from("lyn_profiles")
          .select("company_id")
          .eq("id", user.user.id)
          .single();

        if (profile?.company_id) {
          req.userId = user.user.id;
          req.companyId = profile.company_id;
          return next();
        }
      }
    }

    return res.status(401).json({ error: "Authentication required" });
  } catch (error) {
    console.error("[auth] middleware error:", error.message);
    res.status(500).json({ error: "Authentication error" });
  }
}

// JWT authentication middleware (uses Supabase JWT)
export async function authenticateJwt(req, res, next) {
  try {
    if (!supabaseAdmin) {
      console.error("[JWT] Supabase admin client not configured (missing env vars)");
      return res.status(500).json({ error: "Server configuration error" });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "JWT token required" });
    }

    const token = authHeader.slice(7);

    // Verify the JWT token
    const { data: user, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user?.user?.id) {
      return res.status(401).json({ error: "Invalid JWT token" });
    }

    // Fetch company_id from lyn_profiles
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("lyn_profiles")
      .select("company_id")
      .eq("id", user.user.id)
      .single();

    if (profileError || !profile?.company_id) {
      console.error("[JWT] Profile lookup failed:", profileError?.code || "no_company");
      return res.status(401).json({ error: "Company not found for user" });
    }

    req.userId = user.user.id;
    req.companyId = profile.company_id;

    next();
  } catch (error) {
    console.error("[JWT] Auth middleware error:", error.message);
    res.status(500).json({ error: "Authentication error" });
  }
}
