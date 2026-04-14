// API de Leads — CRUD para agents e integrações
import { Router } from "express";
import * as leads from "../../services/leads.service.js";

const router = Router();

// GET /api/leads — Lista leads
router.get("/", async (req, res) => {
  try {
    const { companyId, status, source, pipeline_id, stage_id, responsavel_id, search, limit, offset } = req.query;
    if (!companyId) return res.status(400).json({ error: "companyId required" });

    const data = await leads.list(companyId, {
      status, source, pipeline_id, stage_id, responsavel_id, search,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });
    res.json({ data, count: data.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/leads/:id — Buscar lead por ID
router.get("/:id", async (req, res) => {
  try {
    const data = await leads.getById(req.params.id);
    res.json({ data });
  } catch (err) {
    res.status(404).json({ error: "Lead not found" });
  }
});

// POST /api/leads — Criar lead
router.post("/", async (req, res) => {
  try {
    const { nome, status, company_id, ...rest } = req.body;
    if (!nome || !company_id) {
      return res.status(400).json({ error: "nome and company_id required" });
    }
    const data = await leads.create({ nome, status: status || "novo", company_id, ...rest });
    res.status(201).json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/leads/:id — Atualizar lead
router.put("/:id", async (req, res) => {
  try {
    const data = await leads.update(req.params.id, req.body);
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/leads/:id — Deletar lead
router.delete("/:id", async (req, res) => {
  try {
    await leads.remove(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
