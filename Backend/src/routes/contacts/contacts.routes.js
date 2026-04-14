// API de Contatos — CRUD para agents e integrações
import { Router } from "express";
import * as contacts from "../../services/contacts.service.js";

const router = Router();

/**
 * @swagger
 * /api/contacts:
 *   get:
 *     summary: Listar contatos
 *     tags: [Contacts]
 *     parameters:
 *       - in: query
 *         name: companyId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Buscar por nome, email ou telefone
 *       - in: query
 *         name: source
 *         schema: { type: string }
 *       - in: query
 *         name: segmento
 *         schema: { type: string }
 *       - in: query
 *         name: tags
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, default: 0 }
 *     responses:
 *       200:
 *         description: Lista de contatos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Contact'
 *                 count:
 *                   type: integer
 */
router.get("/", async (req, res) => {
  try {
    const { companyId, search, source, segmento, tags, limit, offset } = req.query;
    if (!companyId) return res.status(400).json({ error: "companyId required" });
    const data = await contacts.list(companyId, {
      search, source, segmento, tags,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });
    res.json({ data, count: data.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/contacts/{id}:
 *   get:
 *     summary: Buscar contato por ID
 *     tags: [Contacts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Contato encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Contact'
 */
router.get("/:id", async (req, res) => {
  try {
    const data = await contacts.getById(req.params.id);
    res.json({ data });
  } catch (err) {
    res.status(404).json({ error: "Contact not found" });
  }
});

/**
 * @swagger
 * /api/contacts:
 *   post:
 *     summary: Criar contato
 *     tags: [Contacts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nome, company_id]
 *             properties:
 *               nome: { type: string }
 *               company_id: { type: string }
 *               email: { type: string }
 *               telefone: { type: string }
 *               telefone_2: { type: string }
 *               empresa: { type: string }
 *               segmento: { type: string }
 *               source: { type: string }
 *               tags: { type: array, items: { type: string } }
 *               custom_fields: { type: object }
 *     responses:
 *       201:
 *         description: Contato criado
 */
router.post("/", async (req, res) => {
  try {
    const { nome, company_id } = req.body;
    if (!nome || !company_id) return res.status(400).json({ error: "nome and company_id required" });
    const data = await contacts.create(req.body);
    res.status(201).json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/contacts/find-or-create:
 *   post:
 *     summary: Buscar contato existente ou criar novo
 *     description: Busca por email ou telefone dentro da empresa. Cria se não encontrar.
 *     tags: [Contacts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nome, company_id]
 *             properties:
 *               nome: { type: string }
 *               company_id: { type: string }
 *               email: { type: string }
 *               telefone: { type: string }
 *               telefone_2: { type: string }
 *               empresa: { type: string }
 *               segmento: { type: string }
 *               source: { type: string }
 *     responses:
 *       200:
 *         description: Contato encontrado ou criado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Contact'
 *                 created:
 *                   type: boolean
 *                   description: true se foi criado, false se já existia
 */
router.post("/find-or-create", async (req, res) => {
  try {
    const { nome, company_id } = req.body;
    if (!nome || !company_id) return res.status(400).json({ error: "nome and company_id required" });
    const result = await contacts.findOrCreate(req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/contacts/{id}:
 *   put:
 *     summary: Atualizar contato
 *     tags: [Contacts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nome: { type: string }
 *               email: { type: string }
 *               telefone: { type: string }
 *               telefone_2: { type: string }
 *               empresa: { type: string }
 *               segmento: { type: string }
 *               source: { type: string }
 *               tags: { type: array, items: { type: string } }
 *               custom_fields: { type: object }
 *     responses:
 *       200:
 *         description: Contato atualizado (leads vinculados são sincronizados automaticamente)
 */
router.put("/:id", async (req, res) => {
  try {
    const data = await contacts.update(req.params.id, req.body);
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/contacts/{id}:
 *   delete:
 *     summary: Deletar contato
 *     tags: [Contacts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Contato deletado
 */
router.delete("/:id", async (req, res) => {
  try {
    await contacts.remove(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/contacts/{id}/leads:
 *   get:
 *     summary: Listar leads/oportunidades de um contato
 *     tags: [Contacts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Lista de leads vinculados ao contato
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Lead'
 */
router.get("/:id/leads", async (req, res) => {
  try {
    const data = await contacts.getLeads(req.params.id);
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
