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

// ✅ Middleware
app.use(
  cors({
    origin: "*", // Allow all origins (you can restrict later)
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ API routes
app.use("/api/settings", SettingRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/application", applicationRoutes);

// ✅ API test route
app.get("/api", (_, res) => res.send({ success: true, message: "API OK" }));

// ✅ Serve frontend build
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendPath = path.join(__dirname, "../frontend/dist");
app.use(express.static(frontendPath));

// ✅ Serve uploaded files
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// ✅ Handle SPA routing (for React Router)
app.get("*", (_, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// ✅ MongoDB + Server Start
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
