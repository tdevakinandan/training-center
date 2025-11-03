import "dotenv/config.js";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";

// ✅ Routes
import leadRoutes from "./routes/leadRoutes.js";
import applicationRoutes from "./routes/applicationRoutes.js";
import SettingRoutes from "./routes/SettingRoute.js";

const app = express();

// -----------------------------
// 🌐 CORS Configuration
// -----------------------------
app.use(
  cors({
    origin: process.env.CLIENT_URL || "*", // You can restrict later to your frontend domain
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// -----------------------------
// ⚙️ Middleware
// -----------------------------
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// -----------------------------
// 🧩 API Routes
// -----------------------------
app.use("/api/settings", SettingRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/application", applicationRoutes);

// Test Route
app.get("/api", (_, res) => {
  res.status(200).json({ success: true, message: "✅ API Working Fine" });
});

// -----------------------------
// 🗂️ Static File Handling
// -----------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const frontendPath = path.join(__dirname, "../frontend/dist");
app.use(express.static(frontendPath));

// Serve uploaded files (like images, resumes, etc.)
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Handle React Router routes
app.get("*", (_, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// -----------------------------
// ⚡ MongoDB Connection & Server Start
// -----------------------------
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("❌ MONGO_URI not found in environment variables");
  process.exit(1);
}

mongoose
  .connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("✅ MongoDB connected successfully");
    app.listen(PORT, "0.0.0.0", () =>
      console.log(`🚀 Server running at http://localhost:${PORT}`)
    );
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });

// -----------------------------
// 🧠 Global Error Handler (optional)
// -----------------------------
app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err);
  res.status(500).json({ success: false, message: "Internal Server Error" });
});
