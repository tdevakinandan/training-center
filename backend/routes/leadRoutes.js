import express from "express";
import crypto from "crypto";
import Lead from "../models/Lead.js";

const router = express.Router();

// POST: Create Lead + return link
router.post("/", async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    if (!name || !email || !phone) {
      return res.status(400).json({ success: false, message: "Missing fields" });
    }

    const token = crypto.randomBytes(24).toString("hex");
    const lead = await Lead.create({ name, email, phone, applicationToken: token });

    const link = `${process.env.PUBLIC_APP_URL}/application?token=${token}`;

    return res.json({ success: true, leadId: lead._id, link });
  } catch (err) {
    console.error("Create lead error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// GET all leads
router.get("/", async (_, res) => {
  try {
    const leads = await Lead.find().sort({ createdAt: -1 });
    res.json({ success: true, leads });
  } catch (err) {
    console.error("Get leads error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// GET lead by token
router.get("/by-token/:token", async (req, res) => {
  try {
    const lead = await Lead.findOne({ applicationToken: req.params.token });
    if (!lead) return res.status(404).json({ success: false, message: "Invalid token" });

    res.json({
      success: true,
      lead: { id: lead._id, name: lead.name, email: lead.email, phone: lead.phone },
    });
  } catch (err) {
    console.error("Get lead error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// POST store copied link
router.post("/store-link", async (req, res) => {
  const { leadId, applicationLink } = req.body;
  if (!leadId || !applicationLink) return res.status(400).json({ success: false });

  try {
    await Lead.findByIdAndUpdate(leadId, { lastCopiedLink: applicationLink });
    res.json({ success: true });
  } catch (err) {
    console.error("Store link error:", err);
    res.status(500).json({ success: false });
  }
});

export default router;
