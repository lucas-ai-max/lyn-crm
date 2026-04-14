import "dotenv/config";
import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { config } from "./config/env.js";
import { swaggerSpec } from "./config/swagger.js";
import instagramRoutes from "./routes/instagram/instagram.routes.js";
import whatsappRoutes from "./routes/whatsapp/whatsapp.routes.js";
import leadsRoutes from "./routes/leads/leads.routes.js";

// --- Error handlers ---
process.on("uncaughtException", (err) => {
  console.error("[FATAL] Uncaught exception:", err.message);
  console.error(err.stack);
});
process.on("unhandledRejection", (err) => {
  console.error("[FATAL] Unhandled rejection:", err);
});

const app = express();
const PORT = process.env.PORT || 3001;

// --- Middleware ---
app.use(cors({ origin: config.cors.origins, credentials: true }));
app.use(express.json());

// --- Swagger Docs ---
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: "Lyn CRM API Docs",
}));
app.get("/api/docs.json", (req, res) => res.json(swaggerSpec));

// --- Health Check ---
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "lyn-crm-backend" });
});

// --- Routes ---
app.use("/api/instagram", instagramRoutes);
app.use("/api/whatsapp", whatsappRoutes);
app.use("/api/leads", leadsRoutes);

// --- Start ---
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Lyn CRM Backend running on port ${PORT}`);
});
