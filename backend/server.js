import "dotenv/config.js";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";

import leadRoutes from "./routes/leadRoutes.js";
import applicationRoutes from "./routes/applicationRoutes.js";

const app = express();

// --------------------
// Middleware
// --------------------
app.use(cors({ origin: "*" })); // Allow all origins (can restrict to your frontend URL later)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --------------------
// API test route
// --------------------
app.get("/api", (_, res) => res.send({ success: true, message: "API OK" }));

// --------------------
// Routes
// --------------------
app.use("/api/leads", leadRoutes);          // GET / POST leads
app.use("/api/application", applicationRoutes); // GET / POST applications

// --------------------
// Serve frontend build (React/Vite)
// --------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const frontendPath = path.join(__dirname, "../frontend/dist");

app.use(express.static(frontendPath));

// Serve uploads folder
app.use("/uploads", express.static(path.join(path.resolve(), "uploads")));

// Serve index.html for all other routes (SPA fallback)
app.get("*", (_, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// --------------------
// MongoDB Connection + Server Start
// --------------------
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
