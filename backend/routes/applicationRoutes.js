import express from "express";
import Application from "../models/Application.js";
import Lead from "../models/Lead.js";
import upload from "../middleware/upload.js";
import PDFDocument from "pdfkit";

const router = express.Router();

// File upload fields
const uploadFields = upload.fields([
  { name: "aadharFile", maxCount: 1 },
  { name: "resume", maxCount: 1 },
  { name: "bankPassbook", maxCount: 1 },
  { name: "pfFile", maxCount: 1 },
  { name: "esiFile", maxCount: 1 },
  { name: "referenceFile", maxCount: 1 },
]);

// CREATE application
router.post("/", uploadFields, async (req, res) => {
  try {
    const { token, ...payload } = req.body;
    if (!token) return res.status(400).json({ success: false, message: "Missing token" });

    const lead = await Lead.findOne({ applicationToken: token });
    if (!lead) return res.status(404).json({ success: false, message: "Invalid or expired token" });

    const files = req.files || {};
    const getFilePath = (fileArray) => fileArray?.[0]?.filename ? `/uploads/${fileArray[0].filename}` : null;

    const application = await Application.create({
      lead: lead._id,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      ...payload,
      aadharFile: getFilePath(files.aadharFile),
      resume: getFilePath(files.resume),
      bankPassbook: getFilePath(files.bankPassbook),
      pfFile: getFilePath(files.pfFile),
      esiFile: getFilePath(files.esiFile),
      referenceFile: getFilePath(files.referenceFile),
    });

    lead.applicationSubmitted = true;
    lead.applicationToken = null;
    await lead.save();

    res.json({ success: true, applicationId: application._id });
  } catch (err) {
    console.error("Application error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// GET all applications
router.get("/", async (req, res) => {
  try {
    const applications = await Application.find().populate("lead");
    res.json({ success: true, applications });
  } catch (err) {
    console.error("Fetch applications error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// UPDATE application (text + files)
router.put("/:id", uploadFields, async (req, res) => {
  try {
    const files = req.files || {};
    const getFilePath = (fileArray) => fileArray?.[0]?.filename ? `/uploads/${fileArray[0].filename}` : null;

    const updateData = { ...req.body };

    if (files.aadharFile) updateData.aadharFile = getFilePath(files.aadharFile);
    if (files.resume) updateData.resume = getFilePath(files.resume);
    if (files.bankPassbook) updateData.bankPassbook = getFilePath(files.bankPassbook);
    if (files.pfFile) updateData.pfFile = getFilePath(files.pfFile);
    if (files.esiFile) updateData.esiFile = getFilePath(files.esiFile);
    if (files.referenceFile) updateData.referenceFile = getFilePath(files.referenceFile);

    const updatedApp = await Application.findByIdAndUpdate(req.params.id, updateData, { new: true });

    if (!updatedApp) return res.status(404).json({ success: false, message: "Application not found" });

    res.json({ success: true, application: updatedApp });
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// DOWNLOAD Internship Certificate (PDF)
router.post("/certificate/:id", async (req, res) => {
  try {
    const app = await Application.findById(req.params.id);
    if (!app) return res.status(404).json({ success: false, message: "Application not found" });

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=${app.name || "Intern"}_Certificate.pdf`);
    doc.pipe(res);

    doc.fontSize(20).text("CERTIFICATE OF INTERNSHIP", { align: "center", underline: true });
    doc.moveDown(2);

    doc.fontSize(12).text(
      `This is to certify that ${app.name || "the student"} has successfully completed an internship at ${app.companyName || "our organization"} in the domain of ${app.department || "relevant field"}.`
    );
    doc.moveDown(1);

    doc.text(
      `The internship was carried out from ${app.joiningDate || "N/A"} to ${app.relievingDate || "N/A"} under the guidance of ${app.mentorName || "mentor"}, ${app.mentorDesignation || "designation"}.`
    );
    doc.moveDown(1);

    doc.text("During this period, the intern has:");
    doc.list([
      "Actively participated in assigned projects and tasks.",
      "Demonstrated dedication, professionalism, and willingness to learn.",
      "Acquired practical knowledge and skills.",
    ]);
    doc.moveDown(1);

    doc.text(
      `We appreciate the contribution made by ${app.name || "the intern"} and wish them great success in future endeavors.`
    );
    doc.moveDown(4);
    doc.text("Authorized Signatory", { align: "right" });

    doc.end();
  } catch (err) {
    console.error("Certificate generation error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
