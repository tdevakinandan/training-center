import express from "express";
import crypto from "crypto";
import Lead from "../models/Lead.js";
import path from "path";
import fs from "fs";
import mime from "mime"; // 📦 npm install mime
import multer from "../middleware/upload.js"; // your multer middleware setup

const router = express.Router();

/* ============================================================
   📌 POST: Create a new lead or return existing one
============================================================ */
router.post("/", async (req, res) => {
  try {
    const { name, email, phone } = req.body;

    // 🧩 Validate required fields
    if (!name || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // 🧩 Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    // 🧩 Check if lead already exists
    let lead = await Lead.findOne({ $or: [{ email }, { phone }] });

    if (lead) {
      // ✅ Use existing token if lead already exists
      const existingLink = `${process.env.PUBLIC_APP_URL}/application?token=${lead.applicationToken}`;
      return res.json({
        success: true,
        message: "Lead already exists",
        leadId: lead._id,
        link: existingLink,
      });
    }

    // 🧩 Generate new token
    const token = crypto.randomBytes(24).toString("hex");

    // 🧩 Create new lead entry
    lead = await Lead.create({
      name,
      email,
      phone,
      applicationToken: token,
    });

    const link = `${process.env.PUBLIC_APP_URL}/application?token=${token}`;

    return res.status(201).json({
      success: true,
      message: "Lead created successfully",
      leadId: lead._id,
      link,
    });
  } catch (err) {
    console.error("❌ Create lead error:", err);

    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Duplicate lead detected — email or token already exists.",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

/* ============================================================
   📌 GET: Fetch all leads
============================================================ */
router.get("/", async (_, res) => {
  try {
    const leads = await Lead.find().sort({ createdAt: -1 });
    res.json({ success: true, leads });
  } catch (err) {
    console.error("❌ Get leads error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* ============================================================
   📌 GET: Fetch lead by token (used in /application?token=)
============================================================ */
router.get("/by-token/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const lead = await Lead.findOne({ applicationToken: token });

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    res.json({
      success: true,
      lead: {
        id: lead._id,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
      },
    });
  } catch (err) {
    console.error("❌ Get lead by token error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* ============================================================
   📌 POST: Store copied link (tracking)
============================================================ */
router.post("/store-link", async (req, res) => {
  try {
    const { leadId, applicationLink } = req.body;

    if (!leadId || !applicationLink) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    await Lead.findByIdAndUpdate(leadId, {
      lastCopiedLink: applicationLink,
      lastCopiedAt: new Date(),
    });

    res.json({
      success: true,
      message: "Link stored successfully",
    });
  } catch (err) {
    console.error("❌ Store link error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* ============================================================
   📌 GET: Download uploaded file (PDFs, resumes, etc.)
============================================================ */
router.get("/download/:filename", (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(process.cwd(), "uploads", filename);

    // 🧩 Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: "File not found",
      });
    }

    // 🧩 Send file with correct MIME type
    const mimeType = mime.getType(filePath) || "application/octet-stream";
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (err) {
    console.error("❌ Download error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
