import "dotenv/config";
import express from "express";
import cors from "cors";
import { config } from "./config/env.js";
import instagramRoutes from "./routes/instagram/instagram.routes.js";
import whatsappRoutes from "./routes/whatsapp/whatsapp.routes.js";

const app = express();

// --- Middleware ---
app.use(cors({ origin: config.cors.origins, credentials: true }));
app.use(express.json());

// --- Health Check ---
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "lyn-crm-backend" });
});

// --- Routes ---
app.use("/api/instagram", instagramRoutes);
app.use("/api/whatsapp", whatsappRoutes);

// --- Start ---
app.listen(config.port, "0.0.0.0", () => {
  console.log(`Lyn CRM Backend running on port ${config.port}`);
});
