// API de Leads — CRUD para agents e integrações
import { Router } from "express";
import * as leads from "../../services/leads.service.js";

const router = Router();

/**
 * @swagger
 * /api/leads:
 *   get:
 *     summary: Listar leads
 *     tags: [Leads]
 *     parameters:
 *       - in: query
 *         name: companyId
 *         required: true
 *         schema: { type: string }
 *         description: ID da empresa
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *         description: Filtrar por status (novo, contato, qualificado, perdido, ganho)
 *       - in: query
 *         name: source
 *         schema: { type: string }
 *         description: Filtrar por origem (instagram, whatsapp, facebook, manual)
 *       - in: query
 *         name: pipeline_id
 *         schema: { type: string }
 *         description: Filtrar por pipeline
 *       - in: query
 *         name: stage_id
 *         schema: { type: string }
 *         description: Filtrar por estágio
 *       - in: query
 *         name: responsavel_id
 *         schema: { type: string }
 *         description: Filtrar por responsável
 *       - in: query
 *         name: prioridade
 *         schema: { type: string, enum: [high, medium, low] }
 *         description: Filtrar por prioridade
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Buscar por nome, email ou telefone
 *       - in: query
 *         name: tags
 *         schema: { type: string }
 *         description: Filtrar por tag
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *         description: Limite de resultados
 *       - in: query
 *         name: offset
 *         schema: { type: integer, default: 0 }
 *         description: Offset para paginação
 *     responses:
 *       200:
 *         description: Lista de leads
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Lead'
 *                 count:
 *                   type: integer
 */
router.get("/", async (req, res) => {
  try {
    const { companyId, status, source, pipeline_id, stage_id, responsavel_id, prioridade, search, tags, limit, offset } = req.query;
    if (!companyId) return res.status(400).json({ error: "companyId required" });

    const data = await leads.list(companyId, {
      status, source, pipeline_id, stage_id, responsavel_id, prioridade, search, tags,
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
 * /api/leads/{id}:
 *   get:
 *     summary: Buscar lead por ID
 *     tags: [Leads]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Lead encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Lead'
 *       404:
 *         description: Lead não encontrado
 */
router.get("/:id", async (req, res) => {
  try {
    const data = await leads.getById(req.params.id);
    res.json({ data });
  } catch (err) {
    res.status(404).json({ error: "Lead not found" });
  }
});

/**
 * @swagger
 * /api/leads:
 *   post:
 *     summary: Criar lead
 *     tags: [Leads]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nome, company_id]
 *             properties:
 *               nome: { type: string, description: "Nome do lead" }
 *               company_id: { type: string, description: "ID da empresa" }
 *               email: { type: string }
 *               telefone: { type: string }
 *               telefone_2: { type: string }
 *               empresa: { type: string }
 *               segmento: { type: string }
 *               status: { type: string, default: "novo" }
 *               prioridade: { type: string, enum: [high, medium, low] }
 *               source: { type: string }
 *               tags: { type: array, items: { type: string } }
 *               description: { type: string }
 *               valor_oportunidade: { type: number }
 *               pipeline_id: { type: string }
 *               stage_id: { type: string }
 *               responsavel_id: { type: string }
 *               custom_fields: { type: object }
 *     responses:
 *       201:
 *         description: Lead criado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Lead'
 */
router.post("/", async (req, res) => {
  try {
    const { nome, company_id } = req.body;
    if (!nome || !company_id) {
      return res.status(400).json({ error: "nome and company_id are required" });
    }
    const data = await leads.create({ status: "novo", ...req.body });
    res.status(201).json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/leads/{id}:
 *   put:
 *     summary: Atualizar lead
 *     tags: [Leads]
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
 *               status: { type: string }
 *               prioridade: { type: string, enum: [high, medium, low] }
 *               source: { type: string }
 *               tags: { type: array, items: { type: string } }
 *               description: { type: string }
 *               valor_oportunidade: { type: number }
 *               pipeline_id: { type: string }
 *               stage_id: { type: string }
 *               responsavel_id: { type: string }
 *               custom_fields: { type: object }
 *               last_message: { type: string }
 *               last_message_at: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: Lead atualizado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Lead'
 */
router.put("/:id", async (req, res) => {
  try {
    const data = await leads.update(req.params.id, req.body);
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/leads/{id}:
 *   delete:
 *     summary: Deletar lead
 *     tags: [Leads]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Lead deletado
 */
router.delete("/:id", async (req, res) => {
  try {
    await leads.remove(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/leads/{id}/notes:
 *   get:
 *     summary: Listar notas do lead
 *     tags: [Leads]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Lista de notas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/LeadNote'
 */
router.get("/:id/notes", async (req, res) => {
  try {
    const data = await leads.listNotes(req.params.id);
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/leads/{id}/notes:
 *   post:
 *     summary: Adicionar nota ao lead
 *     tags: [Leads]
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
 *             required: [content]
 *             properties:
 *               content: { type: string, description: "Conteúdo da nota" }
 *               created_by: { type: string, description: "ID do usuário que criou" }
 *     responses:
 *       201:
 *         description: Nota criada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/LeadNote'
 */
router.post("/:id/notes", async (req, res) => {
  try {
    const { content, created_by } = req.body;
    if (!content) return res.status(400).json({ error: "content required" });
    const data = await leads.addNote(req.params.id, content, created_by);
    res.status(201).json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
