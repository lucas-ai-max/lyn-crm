// Rotas de WhatsApp (proxy para Evolution API)
import { Router } from "express";
import * as evolution from "../../services/evolution.service.js";

const router = Router();

// Proxy todas as requisicoes para a Evolution API
// Ex: GET /api/whatsapp/instance/list -> Evolution API /instance/list
router.all("/*", async (req, res) => {
  try {
    const path = req.params[0] || "";
    const { status, data } = await evolution.proxy(
      req.method,
      path,
      req.body,
      req._parsedUrl?.search
    );
    res.status(status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
