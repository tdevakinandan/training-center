import "dotenv/config.js";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";

import leadRoutes from "./routes/leadRoutes.js";
import applicationRoutes from "./routes/applicationRoutes.js";

const app = express();

// Middleware
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());

// API test route
app.get("/api", (_, res) => res.send("API OK"));

// Routes
app.use("/api/leads", leadRoutes);
app.use("/api/application", applicationRoutes);

// --------------------
// Serve frontend build
// --------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "../frontend/dist")));

// Serve uploads folder
app.use("/uploads", express.static(path.join(path.resolve(), "uploads")));

app.get("*", (_, res) => {
  res.sendFile(path.join(__dirname, "../frontend/dist/index.html"));
});

// --------------------
// Connect Mongo + Start
// --------------------
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ Mongo connected");
    const port = process.env.PORT || 5000;
    app.listen(port, "0.0.0.0", () =>
      console.log(`🚀 Server running on ${port}`)
    );
  })
  .catch((e) => {
    console.error("❌ Mongo connect error:", e);
    process.exit(1);
  });
