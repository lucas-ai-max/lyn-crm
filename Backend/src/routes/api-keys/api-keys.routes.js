import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as apiKeysService from "../../services/api-keys.service.js";
import { authenticateJwt, authenticateJwtOrApiKey } from "../../middleware/auth.middleware.js";

const router = Router();

const bootstrapLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: "Too many bootstrap requests, try again in a minute" },
});

/**
 * @swagger
 * /api/api-keys/bootstrap:
 *   post:
 *     summary: Bootstrap/regenerate API key via Supabase JWT
 *     description: |
 *       - If `force=true` in body: always generates a new key (useful when session lost access).
 *       - Otherwise: returns existing keys status or creates first key.
 *     tags: [API Keys]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       201:
 *         description: New key created
 *       200:
 *         description: Company already has keys (and force !== true)
 *       401:
 *         description: Invalid JWT
 *       429:
 *         description: Rate limit exceeded
 */
router.post("/bootstrap", bootstrapLimiter, authenticateJwt, async (req, res) => {
  try {
    const force = req.body?.force === true;
    const existing = await apiKeysService.listApiKeys(req.companyId);

    if (existing.length > 0 && !force) {
      return res.json({ data: null, hasKeys: true });
    }

    const name = existing.length > 0 ? "Chave Regenerada" : "Chave Padrão";
    const key = await apiKeysService.createApiKey(req.companyId, name);
    res.status(201).json({ data: key, hasKeys: false });
  } catch (err) {
    console.error("[bootstrap] error:", err.message);
    res.status(500).json({ error: "Failed to bootstrap API key" });
  }
});

/**
 * @swagger
 * /api/api-keys:
 *   get:
 *     summary: Listar chaves API da empresa
 *     tags: [API Keys]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Lista de chaves API
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string, format: uuid }
 *                       name: { type: string }
 *                       created_at: { type: string, format: date-time }
 *                       last_used_at: { type: string, format: date-time }
 *       401:
 *         description: Não autenticado
 */
router.get("/", authenticateJwtOrApiKey, async (req, res) => {
  try {
    const keys = await apiKeysService.listApiKeys(req.companyId);
    res.json({ data: keys });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/api-keys:
 *   post:
 *     summary: Criar nova chave API
 *     tags: [API Keys]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string, description: "Nome descritivo da chave" }
 *     responses:
 *       201:
 *         description: Chave API criada (mostrada apenas uma vez)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     id: { type: string, format: uuid }
 *                     key: { type: string, description: "Chave de API (mostrada apenas uma vez)" }
 *                     name: { type: string }
 *                     created_at: { type: string, format: date-time }
 *       401:
 *         description: Não autenticado
 */
router.post("/", authenticateJwtOrApiKey, async (req, res) => {
  try {
    const { name } = req.body;
    const key = await apiKeysService.createApiKey(req.companyId, name || "API Key");
    res.status(201).json({ data: key });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/api-keys/{id}:
 *   get:
 *     summary: Obter informações da chave API
 *     tags: [API Keys]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Informações da chave
 *       404:
 *         description: Chave não encontrada
 */
router.get("/:id", authenticateJwtOrApiKey, async (req, res) => {
  try {
    const keyInfo = await apiKeysService.getApiKeyInfo(req.params.id);
    if (keyInfo.company_id !== req.companyId) {
      return res.status(403).json({ error: "Access denied" });
    }
    res.json({ data: keyInfo });
  } catch (err) {
    res.status(404).json({ error: "API key not found" });
  }
});

/**
 * @swagger
 * /api/api-keys/{id}/regenerate:
 *   post:
 *     summary: Regenerar chave API (revoga a antiga e cria uma nova)
 *     tags: [API Keys]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string, description: "Novo nome para a chave" }
 *     responses:
 *       200:
 *         description: Nova chave criada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     id: { type: string, format: uuid }
 *                     key: { type: string, description: "Nova chave (mostrada apenas uma vez)" }
 *                     name: { type: string }
 *                     created_at: { type: string, format: date-time }
 *       401:
 *         description: Não autenticado
 *       404:
 *         description: Chave não encontrada
 */
router.post("/:id/regenerate", authenticateJwtOrApiKey, async (req, res) => {
  try {
    const oldKeyInfo = await apiKeysService.getApiKeyInfo(req.params.id);
    if (oldKeyInfo.company_id !== req.companyId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const { name } = req.body;
    const newKey = await apiKeysService.regenerateApiKey(
      req.params.id,
      name || oldKeyInfo.name
    );

    res.json({ data: newKey });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/api-keys/{id}:
 *   delete:
 *     summary: Revogar chave API
 *     tags: [API Keys]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Chave revogada com sucesso
 *       401:
 *         description: Não autenticado
 *       404:
 *         description: Chave não encontrada
 */
router.delete("/:id", authenticateJwtOrApiKey, async (req, res) => {
  try {
    const keyInfo = await apiKeysService.getApiKeyInfo(req.params.id);
    if (keyInfo.company_id !== req.companyId) {
      return res.status(403).json({ error: "Access denied" });
    }

    await apiKeysService.revokeApiKey(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
