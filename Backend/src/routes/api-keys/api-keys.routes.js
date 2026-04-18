import { Router } from "express";
import * as apiKeysService from "../../services/api-keys.service.js";
import { authenticateApiKey, authenticateJwt } from "../../middleware/auth.middleware.js";

const router = Router();

/**
 * @swagger
 * /api/api-keys/bootstrap:
 *   post:
 *     summary: Bootstrap API key para nova empresa (criar primeira chave)
 *     tags: [API Keys]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       201:
 *         description: Primeira chave criada
 *       200:
 *         description: Empresa já possui chaves
 *       401:
 *         description: Token JWT inválido
 */
router.post("/bootstrap", authenticateJwt, async (req, res) => {
  try {
    const existing = await apiKeysService.listApiKeys(req.companyId);
    if (existing.length > 0) {
      return res.json({ data: null, hasKeys: true });
    }

    const key = await apiKeysService.createApiKey(req.companyId, "Chave Padrão");
    res.status(201).json({ data: key, hasKeys: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
router.get("/", authenticateApiKey, async (req, res) => {
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
router.post("/", authenticateApiKey, async (req, res) => {
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
router.get("/:id", authenticateApiKey, async (req, res) => {
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
router.post("/:id/regenerate", authenticateApiKey, async (req, res) => {
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
router.delete("/:id", authenticateApiKey, async (req, res) => {
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
