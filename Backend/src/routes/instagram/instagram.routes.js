// Rotas de Instagram — API direta (sem Composio)
import { Router } from "express";
import * as ig from "../../services/instagram.service.js";
import { config } from "../../config/env.js";

const router = Router();

// POST /api/instagram/connect — Gera URL de OAuth do Instagram
router.post("/connect", async (req, res) => {
  try {
    const { companyId } = req.body;
    if (!companyId) return res.status(400).json({ error: "companyId required" });
    const redirect_url = ig.getOAuthUrl(companyId);
    res.json({ redirect_url });
  } catch (err) {
    console.error("[instagram/connect] ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/instagram/callback — OAuth callback (Instagram redireciona aqui)
router.get("/callback", async (req, res) => {
  try {
    let { code, state, error: igError } = req.query;

    console.log("[instagram/callback] Received - code:", code?.substring(0, 30), "state:", state);

    if (igError) {
      console.error("[instagram/callback] User denied:", igError);
      return res.redirect(`${config.frontendUrl}/dashboard/instagram/admin?status=failed&error=${encodeURIComponent(igError)}`);
    }

    if (!code || !state) {
      return res.redirect(`${config.frontendUrl}/dashboard/instagram/admin?status=failed&error=missing_code`);
    }

    // Instagram appends #_ to the code sometimes — clean it
    code = code.replace(/#_$/, "").trim();

    const result = await ig.handleCallback(code, state);
    console.log("[instagram/callback] Success:", result.igUsername);
    res.redirect(`${config.frontendUrl}/dashboard/instagram/admin?status=success`);
  } catch (err) {
    console.error("[instagram/callback] ERROR:", err.message);
    res.redirect(`${config.frontendUrl}/dashboard/instagram/admin?status=failed&error=${encodeURIComponent(err.message)}`);
  }
});

// GET /api/instagram/accounts — Retorna conta conectada
router.get("/accounts", async (req, res) => {
  try {
    const companyId = req.query.companyId || req.query.userId;
    if (!companyId) return res.json({ items: [] });
    const account = await ig.getConnectedAccount(companyId);
    res.json({ items: account ? [account] : [] });
  } catch (err) {
    res.json({ items: [] });
  }
});

// DELETE /api/instagram/accounts/:id — Desconecta conta
router.delete("/accounts/:id", async (req, res) => {
  try {
    const companyId = req.query.companyId || req.body?.companyId;
    if (companyId) {
      await ig.disconnectAccount(companyId);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/instagram/page-info — Retorna ID e username da pagina
router.get("/page-info", async (req, res) => {
  try {
    const companyId = req.query.companyId || req.query.userId;
    if (!companyId) return res.json({ pageId: null, pageUsername: null });
    const account = await ig.getConnectedAccount(companyId);
    if (!account) return res.json({ pageId: null, pageUsername: null });
    res.json({ pageId: account.instagram_id, pageUsername: account.instagram_username });
  } catch (err) {
    res.json({ pageId: null, pageUsername: null });
  }
});

// POST /api/instagram/send — Envia DM
router.post("/send", async (req, res) => {
  try {
    const { companyId, recipientId, message } = req.body;
    if (!companyId || !recipientId || !message) {
      return res.status(400).json({ error: "companyId, recipientId and message required" });
    }
    const data = await ig.sendTextMessage(companyId, recipientId, message);
    res.json(data);
  } catch (err) {
    console.error("[instagram/send] ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/instagram/action — Backward compat: dispatch por action name
router.post("/action", async (req, res) => {
  try {
    const { action, companyId, userId, params } = req.body;
    const cid = companyId || userId;
    if (!cid) return res.status(400).json({ error: "companyId required" });

    if (action === "INSTAGRAM_LIST_ALL_CONVERSATIONS") {
      const data = await ig.listConversations(cid);
      res.json({ data, successful: true });
    } else if (action === "INSTAGRAM_LIST_ALL_MESSAGES") {
      const data = await ig.getConversationMessages(cid, params?.conversation_id);
      res.json({ data, successful: true });
    } else if (action === "INSTAGRAM_SEND_TEXT_MESSAGE") {
      const data = await ig.sendTextMessage(cid, params?.recipient_id, params?.text);
      res.json({ data, successful: true });
    } else {
      res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
