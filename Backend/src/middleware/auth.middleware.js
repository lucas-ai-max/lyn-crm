import * as apiKeysService from "../services/api-keys.service.js";
import { createClient } from "@supabase/supabase-js";

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

// JWT authentication middleware (uses Supabase JWT)
export async function authenticateJwt(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "JWT token required" });
    }

    const token = authHeader.slice(7);
    const supabase = createClient(
      process.env.SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || ""
    );

    // Verify the JWT token
    const { data: user, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user?.user?.id) {
      return res.status(401).json({ error: "Invalid JWT token" });
    }

    // Fetch company_id from lyn_profiles
    const { data: profile, error: profileError } = await supabase
      .from("lyn_profiles")
      .select("company_id")
      .eq("id", user.user.id)
      .single();

    if (profileError || !profile?.company_id) {
      return res.status(401).json({ error: "Company not found for user" });
    }

    // Attach user info to request
    req.userId = user.user.id;
    req.companyId = profile.company_id;

    next();
  } catch (error) {
    console.error("JWT auth middleware error:", error);
    res.status(500).json({ error: "Authentication error" });
  }
}
