import express from "express";
import multer from "multer";
import path from "path";
import Setting from "../models/SettingModel.js";

const router = express.Router();

// 🗂️ Multer Storage Config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

// 📥 Create or Update Company Settings
router.post(
  "/save",
  upload.fields([
    { name: "companyLogo", maxCount: 1 },
    { name: "stamp", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const {
        companyName,
        logoAlignment,
        address,
        authorizedPerson,
        authorizedDesignation, // ✅ new
        purpose, // ✅ new
        place,
        phone,
        email,
      } = req.body;

      const companyLogo = req.files["companyLogo"]
        ? `/uploads/${req.files["companyLogo"][0].filename}`
        : null;
      const stamp = req.files["stamp"]
        ? `/uploads/${req.files["stamp"][0].filename}`
        : null;

      // 🔍 Check if company already exists
      let company = await Setting.findOne({
        companyName: { $regex: `^${companyName}$`, $options: "i" },
      });

      if (company) {
        // ✏️ Update existing company
        company.logoAlignment = logoAlignment || company.logoAlignment;
        company.address = address || company.address;
        company.authorizedPerson = authorizedPerson || company.authorizedPerson;
        company.authorizedDesignation =
          authorizedDesignation || company.authorizedDesignation;
        company.purpose = purpose || company.purpose;
        company.phone = phone || company.phone;
        company.place = place || company.place;
        company.email = email || company.email;
        if (companyLogo) company.companyLogo = companyLogo;
        if (stamp) company.stamp = stamp;

        await company.save();

        return res.json({
          success: true,
          message: `✅ Company "${companyName}" updated successfully.`,
          company,
        });
      }

      // 🆕 Create new company
      const newCompany = new Setting({
        companyName,
        logoAlignment,
        address,
        authorizedPerson,
        authorizedDesignation,
        purpose,
        phone,
        email,
        companyLogo,
        stamp,
      });

      await newCompany.save();

      res.status(201).json({
        success: true,
        message: "✅ Company settings saved successfully",
        company: newCompany,
      });
    } catch (error) {
      console.error("❌ Error saving settings:", error);
      res.status(500).json({ message: "Server error", error });
    }
  }
);

// 📤 Fetch all companies
router.get("/list", async (req, res) => {
  try {
    const companies = await Setting.find();
    res.json(companies);
  } catch (error) {
    res.status(500).json({ message: "Error fetching company list" });
  }
});

export default router;
