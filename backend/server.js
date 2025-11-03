import "dotenv/config.js";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";

import leadRoutes from "./routes/leadRoutes.js";
import applicationRoutes from "./routes/applicationRoutes.js";
import SettingRoutes from "./routes/SettingRoute.js";

const app = express();

// Middleware
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api/settings", SettingRoutes); // ✅ very important

// API test
app.get("/api", (_, res) => res.send({ success: true, message: "API OK" }));

// Routes
app.use("/api/leads", leadRoutes);
app.use("/api/application", applicationRoutes);

// Serve frontend
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendPath = path.join(__dirname, "../frontend/dist");
app.use(express.static(frontendPath));

// Serve uploads
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// SPA fallback
app.get("*", (_, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// Mongo + server
const PORT = process.env.PORT || 5000;
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ Mongo connected");
    app.listen(PORT, "0.0.0.0", () =>
      console.log(`🚀 Server running on port ${PORT}`)
    );
  })
  .catch((err) => {
    console.error("❌ Mongo connection error:", err);
    process.exit(1);
  });
