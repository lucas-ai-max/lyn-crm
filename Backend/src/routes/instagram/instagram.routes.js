// Rotas de Instagram — Composio para OAuth e leitura de DMs
import { Router } from "express";
import * as composio from "../../services/composio.service.js";

const router = Router();

// POST /api/instagram/connect — Inicia OAuth via Composio
router.post("/connect", async (req, res) => {
  try {
    const { userId, callbackUrl } = req.body;
    if (!userId) return res.status(400).json({ error: "userId required" });
    const data = await composio.initiateConnection(userId, callbackUrl);
    res.json(data);
  } catch (err) {
    console.error("[instagram/connect] ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/instagram/accounts — Lista contas conectadas
router.get("/accounts", async (req, res) => {
  try {
    const userId = req.query.userId || req.query.companyId;
    if (!userId) return res.json({ items: [] });
    const items = await composio.getConnectedAccounts(userId);
    res.json({ items });
  } catch (err) {
    res.json({ items: [] });
  }
});

// DELETE /api/instagram/accounts/:id — Desconecta conta
router.delete("/accounts/:id", async (req, res) => {
  try {
    await composio.deleteConnection(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/instagram/page-info — Retorna ID e username da pagina
router.get("/page-info", async (req, res) => {
  try {
    const userId = req.query.userId || req.query.companyId;
    if (!userId) return res.json({ pageId: null, pageUsername: null });
    const info = await composio.getPageInfo(userId);
    res.json(info || { pageId: null, pageUsername: null });
  } catch (err) {
    res.json({ pageId: null, pageUsername: null });
  }
});

// POST /api/instagram/send — Envio desabilitado
router.post("/send", async (req, res) => {
  res.status(503).json({
    error: "Envio de mensagens requer aprovacao do App Review da Meta. Em breve estara disponivel.",
  });
});

// POST /api/instagram/action — Executa actions do Composio (leitura)
router.post("/action", async (req, res) => {
  try {
    const { action, userId, companyId, params } = req.body;
    const uid = userId || companyId;
    if (!action || !uid) return res.status(400).json({ error: "action and userId required" });
    const data = await composio.executeAction(action, uid, params);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
