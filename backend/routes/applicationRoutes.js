import express from "express";
import Application from "../models/Application.js";
import Lead from "../models/Lead.js";
import upload from "../middleware/upload.js";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import PDFTable from "pdfkit-table";
import Setting from "../models/SettingModel.js";  // ✅ ADD THIS LINE


const router = express.Router();



// File upload fields (referenceFile removed)
const uploadFields = upload.fields([
  { name: "aadharFile", maxCount: 1 },
  { name: "resume", maxCount: 1 },
  { name: "bankPassbook", maxCount: 1 },
  { name: "pfFile", maxCount: 1 },
  { name: "esiFile", maxCount: 1 },
]);

// ✅ CREATE Application — Based on Lead Only
router.post("/", uploadFields, async (req, res) => {
  try {
    const { token, ...payload } = req.body;

    if (!token)
      return res.status(400).json({ success: false, message: "Missing token" });

    // Find the lead by application token
    const lead = await Lead.findOne({ applicationToken: token });
    if (!lead)
      return res
        .status(404)
        .json({ success: false, message: "Invalid or expired token" });

    const files = req.files || {};
    const getFilePath = (fileArray) =>
      fileArray?.[0]?.filename ? `/uploads/${fileArray[0].filename}` : null;

    // ✅ Remove empty/null fields before saving
    const cleanedPayload = Object.fromEntries(
      Object.entries(payload).filter(([_, v]) => v !== null && v !== "")
    );

    const application = await Application.create({
      lead: lead._id,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      ...cleanedPayload,
      aadharFile: getFilePath(files.aadharFile),
      resume: getFilePath(files.resume),
      bankPassbook: getFilePath(files.bankPassbook),
      pfFile: getFilePath(files.pfFile),
      esiFile: getFilePath(files.esiFile),
    });

    // Update lead status
    lead.applicationSubmitted = true;
    lead.applicationToken = null;
    await lead.save();

    // ✅ Return the full application for instant UI update
    res.json({ success: true, application });
  } catch (err) {
    console.error("❌ Application Create Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


// ✅ UPDATE Application (Skip null fields, allow duplicates)
router.put("/:id", uploadFields, async (req, res) => {
  try {
    const { ...payload } = req.body;
    const files = req.files || {};

    const getFilePath = (fileArray) =>
      fileArray?.[0]?.filename ? `/uploads/${fileArray[0].filename}` : null;

    // ✅ Filter out empty/null values from update
    const cleanedData = Object.fromEntries(
      Object.entries(payload).filter(([_, v]) => v !== null && v !== "")
    );

    if (files.aadharFile) cleanedData.aadharFile = getFilePath(files.aadharFile);
    if (files.resume) cleanedData.resume = getFilePath(files.resume);
    if (files.bankPassbook)
      cleanedData.bankPassbook = getFilePath(files.bankPassbook);
    if (files.pfFile) cleanedData.pfFile = getFilePath(files.pfFile);
    if (files.esiFile) cleanedData.esiFile = getFilePath(files.esiFile);

    const updatedApp = await Application.findByIdAndUpdate(
      req.params.id,
      cleanedData,
      { new: true }
    );

    if (!updatedApp)
      return res
        .status(404)
        .json({ success: false, message: "Application not found" });

    res.json({ success: true, application: updatedApp });
  } catch (err) {
    console.error("❌ Application Update Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ✅ GET All Applications (with lead details)
router.get("/", async (req, res) => {
  try {
    const applications = await Application.find()
      .populate("lead", "name email phone")
      .sort({ createdAt: -1 });

    res.json({ success: true, applications });
  } catch (err) {
    console.error("❌ Get Applications Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.patch("/:id/document-date", async (req, res) => {
  try {
    const { id } = req.params;
    const { type, date } = req.body;

    const updateFields = {};

    if (type === "offer-letter") updateFields.offerDate = date;
    else if (type === "appointment-letter") updateFields.appointmentDate = date;
    else if (type === "experience-letter") updateFields.experienceDate = date;
    else if (type === "certificate") updateFields.internshipDate = date; // ✅ Internship certificate
    else if (type === "payslip") updateFields.payslipDate = date; // ✅ Payslip date
    else if (type === "noc") updateFields.nocDate = date; // ✅ NOC date

    const app = await Application.findByIdAndUpdate(id, updateFields, { new: true });

    if (!app) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    res.json({ success: true, application: app });
  } catch (err) {
    console.error("Error updating document date:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});



// =============================
// 📄 INTERNSHIP CERTIFICATE (Dynamic)
// =============================
router.post("/certificate/:id", async (req, res) => {
  try {
    // ====== 1️⃣ Fetch Application ======
    const app = await Application.findById(req.params.id);
    if (!app)
      return res
        .status(404)
        .json({ success: false, message: "Application not found" });

    // ====== 2️⃣ Fetch Company Settings Dynamically ======
    const company =
      (await Setting.findOne({
        companyName: { $regex: new RegExp(app.companyName || "", "i") },
      })) || (await Setting.findOne()); // fallback to first company

    if (!company)
      return res
        .status(404)
        .json({ success: false, message: "Company settings not found" });

    // ====== 3️⃣ Create PDF ======
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${app.name}_Certificate.pdf`
    );
    doc.pipe(res);

    const pageWidth = doc.page.width;

    // ====== 4️⃣ Company Logo (Dynamic Alignment) ======
    if (company.companyLogo) {
      const logoPath = path.resolve(`.${company.companyLogo}`);
      if (fs.existsSync(logoPath)) {
        let xPos = 50; // default left
        if (company.logoAlignment === "center") xPos = pageWidth / 2 - 50;
        if (company.logoAlignment === "right") xPos = pageWidth - 150;
        doc.image(logoPath, xPos, 40, { width: 100 });
      } else {
        console.log("⚠️ Logo not found at:", logoPath);
      }
    }

    // ====== 5️⃣ Certificate Date (Top-Right) ======
    const internshipDate = app.internshipDate ? new Date(app.internshipDate) : new Date();
    const day = internshipDate.getDate().toString().padStart(2, "0");
    const month = internshipDate.toLocaleString("en-GB", { month: "short" }).toUpperCase();
    const year = internshipDate.getFullYear().toString().slice(-2);
    const formattedDate = `${day}-${month}-${year}`;
    doc.font("Helvetica").fontSize(10).text(`Date: ${formattedDate}`, pageWidth - 150, 80);

    // ====== 6️⃣ Title ======
    let y = 120;
    doc.font("Helvetica-Bold").fontSize(20).text(
      "CERTIFICATE OF INTERNSHIP",
      50,
      y,
      { align: "center", underline: true }
    );
    y += 60;

    // ====== 7️⃣ Main Content ======
    doc.font("Helvetica").fontSize(12);
    doc.text(
      `This is to certify that ${app.name} has successfully completed an internship at ${app.companyName} in the domain of ${app.department || "relevant field"}.`,
      50,
      y,
      { width: pageWidth - 100, lineGap: 2 }
    );
    y += 60;

    doc.text(
      `The internship was carried out from ${app.joiningDate || "N/A"} to ${app.relievingDate || "N/A"} under the guidance of ${app.mentorName || "mentor"}, ${app.mentorDesignation || "designation"}.`,
      50,
      y,
      { width: pageWidth - 100, lineGap: 2 }
    );
    y += 50;

    doc.text("During this period, the intern has:", 50, y);
    y += 20;
    doc.list(
      [
        "Actively participated in assigned projects.",
        "Demonstrated professionalism and learning attitude.",
        "Gained practical knowledge and skills.",
      ],
      70,
      y
    );
    y += 80;

    doc.text(
      `We appreciate the contribution made by ${app.name} and wish them success in future endeavors.`,
      50,
      y,
      { width: pageWidth - 100, lineGap: 2 }
    );

    // ====== 8️⃣ Stamp (Dynamic) ======
    const stampX = pageWidth - 150; // right alignment
    let stampY = y + 40;
    if (company.stamp) {
      const stampPath = path.resolve(`.${company.stamp}`);
      if (fs.existsSync(stampPath)) {
        doc.image(stampPath, stampX, stampY, { width: 100 });
        stampY += 90;
      } else {
        console.log("⚠️ Stamp not found at:", stampPath);
      }
    }

    // ====== 9️⃣ Authorized Signatory ======
    doc.font("Helvetica").fontSize(12).text(
      company.authorizedPerson || "Authorized Signatory",
      stampX,
      stampY
    );

    // ====== 🔟 Footer (Dynamic Address, Phone, Email) ======
    const footerY = doc.page.height - 100;
    doc.fontSize(9).fillColor("gray");

    doc.text(
      company.address ||
        "Address: Plot no:11, Opposite LIC Office, Govt. Women’s College Road, Srikakulam – 532001",
      50,
      footerY,
      { align: "center", width: pageWidth - 100 }
    );

    const phoneText = company.phone
      ? `Phone: ${company.phone}`
      : "Phone: +91-7997473473";
    const emailText = company.email
      ? `Email: ${company.email}`
      : "Email: info@techwell.co.in";

    doc.text(`${phoneText}     ${emailText}`, 50, footerY + 12, {
      align: "center",
      width: pageWidth - 100,
    });

    doc.end();
  } catch (err) {
    console.error("Certificate generation error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// =============================
// 📄 OFFER LETTER TEMPLATE
// =============================
router.post("/offer-letter/:id", async (req, res) => {
  try {
    // ====== 1️⃣ Fetch Application ======
    const app = await Application.findById(req.params.id);
    if (!app)
      return res
        .status(404)
        .json({ success: false, message: "Application not found" });

    // ====== 2️⃣ Fetch Company Settings Dynamically ======
    const company =
      (await Setting.findOne({
        companyName: { $regex: new RegExp(app.companyName || "", "i") },
      })) || (await Setting.findOne()); // fallback to first company

    if (!company)
      return res
        .status(404)
        .json({ success: false, message: "Company settings not found" });

    // ====== 3️⃣ Create PDF Setup ======
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${app.name}_Offer_Letter.pdf`
    );
    doc.pipe(res);

    const pageWidth = doc.page.width;

    // ====== 4️⃣ Company Logo Based on Alignment ======
    if (company.companyLogo) {
      const logoPath = path.resolve(`.${company.companyLogo}`);
      if (fs.existsSync(logoPath)) {
        let xPos = 50; // default: left
        if (company.logoAlignment === "center") xPos = pageWidth / 2 - 50;
        if (company.logoAlignment === "right") xPos = pageWidth - 150;
        doc.image(logoPath, xPos, 40, { width: 100 });
      } else {
        console.log("⚠️ Logo not found at:", logoPath);
      }
    }

    // ====== 5️⃣ Offer Date (Top-Right) ======
    const offerDate = app.offerDate ? new Date(app.offerDate) : new Date();
    const day = offerDate.getDate().toString().padStart(2, "0");
    const month = offerDate
      .toLocaleString("en-GB", { month: "short" })
      .toUpperCase();
    const year = offerDate.getFullYear().toString().slice(-2);
    const formattedDate = `${day}-${month}-${year}`;
    doc.font("Helvetica").fontSize(10).text(`Date: ${formattedDate}`, pageWidth - 150, 80);

    // ====== 6️⃣ Body Content ======
    let y = 120;
    doc.font("Helvetica-Bold").fontSize(12).text(`Dear ${app.name},`, 50, y);
    y += 18;
    doc.font("Helvetica-Bold").fontSize(12).text("Congratulations on your offer !!", 50, y);
    y += 22;

    doc.font("Helvetica").fontSize(10);
    const monthlySalary = app.ctc ? (Number(app.ctc) / 12).toLocaleString("en-IN") : "0";

    const bodyText = `
We are pleased to offer you the position of ${app.designation} at ${app.companyName}, starting on ${app.joiningDate}. In this role, you will report to ${app.mentorName} (${app.mentorDesignation}).

Your monthly salary will be INR ${monthlySalary}, along with benefits including health insurance, paid leave, internet allowance, and performance bonuses. Full details will be shared upon confirmation.

We look forward to having you onboard and seeing your strategic ideas come to life!

Further to the recent interview you had with us, we have pleasure in offering you employment with our organization, as per mutually agreed terms and conditions as defined below.

A formal appointment letter will be issued on the 1st day of working. You are requested to submit the following documents online:
• Aadhar card
• PAN card
• Relieving Letter

We take this opportunity to wish you all success in your career with the company.

In case of any confusion, you can reach out to us anytime.
`;
    doc.text(bodyText, 50, y, { width: pageWidth - 100, lineGap: 2 });

    // ====== 7️⃣ "Regards" & Authorized Person ======
    let sigY = 460;
    doc.font("Helvetica").fontSize(11).text("Regards,", 50, sigY);

    // ====== 8️⃣ Stamp (Dynamic from Settings) ======
    let stampY = sigY + 16;
    if (company.stamp) {
      const stampPath = path.resolve(`.${company.stamp}`);
      if (fs.existsSync(stampPath)) {
        doc.image(stampPath, 50, stampY, { width: 100 });
      } else {
        console.log("⚠️ Stamp not found at:", stampPath);
      }
    }

    // ====== 9️⃣ Authorized Person Details ======
    sigY = stampY + 90;
    doc.text(company.authorizedPerson || "Authorized Signatory", 50, sigY);
    sigY += 14;
    doc.text(company.authorizedDesignation || "Founder & CEO", 50, sigY); // ✅ dynamic value
    sigY += 14;
    doc.text(company.companyName || "Techwell", 50, sigY);

    // ====== 🔟 Footer (Dynamic Address, Phone, Email) ======
    const footerY = doc.page.height - 100;
    doc.fontSize(9).fillColor("gray");
    doc.text(
      company.address ||
        "Address: Plot no:11, Opposite LIC Office, Govt. Women’s College Road, Srikakulam – 532001",
      50,
      footerY,
      { align: "center", width: pageWidth - 100 }
    );

    // ✅ Dynamic Phone and Email (from Setting)
    const phoneText = company.phone
      ? `Phone: ${company.phone}`
      : "Phone: +91-7997473473";
    const emailText = company.email
      ? `Email: ${company.email}`
      : "Email: info@techwell.co.in";

    doc.text(`${phoneText}     ${emailText}`, 50, footerY + 12, {
      align: "center",
      width: pageWidth - 100,
    });

    doc.end();
  } catch (err) {
    console.error("Offer letter generation error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// =============================
// 📄 APPOINTMENT LETTER TEMPLATE
// =============================

router.post("/appointment-letter/:id", async (req, res) => {
  try {
    const app = await Application.findById(req.params.id);
    if (!app)
      return res.status(404).json({ success: false, message: "Application not found" });

    // ✅ Fetch settings from DB
    const settings = await Setting.findOne();
    const companyName = settings?.companyName || "Techwell Solutions Pvt. Ltd.";
    const logoAlignment = settings?.logoAlignment || "left"; // can be "left", "center", or "right"
    const address =
      settings?.address ||
      "Plot No: 11, Opp. LIC Office, Govt. Women’s College Road, Srikakulam – 532001";
    const phone = settings?.phone || "+91-7997473473";
    const email = settings?.email || "info@techwell.co.in";
    const authorizedPerson = settings?.authorizedPerson || "Authorized by Satya";
    const logoPath = settings?.companyLogo
      ? path.join("uploads", path.basename(settings.companyLogo))
      : path.join("assets", "techwell_logo.png");
    const stampPath = settings?.stamp
      ? path.join("uploads", path.basename(settings.stamp))
      : path.join("assets", "stamp.png");

    // ✅ Create PDF document
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${app.name}_Appointment_Letter.pdf`
    );
    doc.pipe(res);

    const pageWidth = doc.page.width;
    const textWidth = pageWidth - 100;

    // ===== Helper: Add Company Logo =====
    function addLogo(gapAfter = 60) {
      let startY = 40;
      if (fs.existsSync(logoPath)) {
        let logoX;

        // ✅ Position dynamically based on alignment
        if (logoAlignment === "center") {
          logoX = pageWidth / 2 - 50; // 100px logo width / 2
        } else if (logoAlignment === "right") {
          logoX = pageWidth - 150;
        } else {
          // left (default)
          logoX = 50;
        }

        doc.image(logoPath, logoX, startY, { width: 100 });
        startY += gapAfter;
      }
      return startY;
    }

    // ===== Helper: Footer Section =====
    function addFooter(doc) {
      const footerY = doc.page.height - 90;
      doc.fontSize(9).fillColor("gray");
      doc.text(`Address: ${address}`, 60, footerY, {
        align: "center",
        width: doc.page.width - 120,
      });
      doc.text(`Phone: ${phone}   Email: ${email}`, 60, footerY + 15, {
        align: "center",
        width: doc.page.width - 120,
      });
      doc.fillColor("black");
    }

    // === PAGE 1 ===
   let contentStartY = addLogo(50);
contentStartY += 5;

// === Appointment Date Top-Right (below logo) ===
// reuse existing pageWidth variable, no 'let' here
const appointmentDate = app.appointmentDate ? new Date(app.appointmentDate) : new Date();
const options = { day: "2-digit", month: "short", year: "2-digit" };
const formattedDate = appointmentDate.toLocaleDateString("en-GB", options).toUpperCase(); // e.g., 24-OCT-24
doc.font("Helvetica").fontSize(10).text(`Date: ${formattedDate}`, pageWidth - 150, 70);

// === Title ===
doc.font("Helvetica-Bold")
   .fontSize(14)
   .text("APPOINTMENT LETTER", 50, contentStartY, { align: "center" });

// === Rest of content ===
doc.moveDown(0.5);
doc.fontSize(11).font("Helvetica").text(`Dear ${app.name},`);
doc.moveDown(0.3);
doc.text(
  `We are pleased to offer you employment at ${app.companyName} as per the following terms.`,
  { width: textWidth, lineGap: 1.6 }
);

    const sectionsPage1 = [
      {
        heading: "DEPUTATION:",
        content: `You are deputed to client under this Contract. The terms of employment are exclusively with ${app.companyName}, the employee shall never be deemed to be the employee of the client, where you have been deputed under this Contract.
You will with effect from ${app.joiningDate} be deputed by ${app.companyName}, to work at client's office/premises at any of their locations.
During the course of your contract, you can be transferred to a location within the territory of India as and required by ${app.companyName} for rendering the services under this contract.`
      },
      { heading: "POSITION:", content: `You are appointed as ${app.designation}.` },
      {
        heading: "REMUNERATION:",
        content: "The details of your salary break up with components are as per the enclosure attached herewith."
      },
      { heading: "TENURE:", content: `The term of your Contract shall be valid from ${app.joiningDate}.` },
      {
        heading: "WORKING HOURS:",
        content: `You will follow the working hours of the client where you will be deputed. You may have to work on shifts, based on the client's requirement. Your attendance will be maintained by the Reporting Officer of the client, which needs to be mandatorily sent to the contact person at ${app.companyName} within the cut-off date as mutually agreed for pay-roll processing.`
      },
      {
        heading: "TERMINATION & SUSPENSION:",
        content: `At the time of termination of the employment either due to termination by either you or the Company or upon the lapse of the term of employment, if there are any dues owing from you to the Company, the same may be adjusted against any monies due to you by the Company on account of salary including bonus or any other payment owed to you under the terms of your employment.

During the tenure of your Contract, any deviation or misconduct in any form that were noticed by the company or if there are any breach of internal policies or any regulation that were mutually agreed to be complied with, ${app.companyName} or principal employer has the rights and authority to suspend your services until you are notified to resume work in writing. ${app.companyName} reserves all such right to withhold full or a portion of your salary during such suspension period.

Your employment with the Company shall be terminated immediately forthwith in the event you are found to be under the age of 18 years and anything done thereof by you shall be considered null and void.`
      },
    ];

    sectionsPage1.forEach(sec => {
      doc.moveDown(0.3);
      doc.font("Helvetica-Bold").text(sec.heading);
      doc.font("Helvetica").text(sec.content, { width: textWidth, lineGap: 1.4 });
    });

    addFooter(doc);

    // === PAGE 2 ===
    doc.addPage();
    contentStartY = addLogo(30);
    contentStartY += 25;
    doc.y = contentStartY;

    const policiesPage2 = [
      {
        heading: "NOTICE PERIOD:",
        content: `In the eventuality if you wish to separate from the organization you will need to give 90 days' notice in writing. The Contract can be terminated at the discretion of ${app.companyName} / Client subject to 30 days' notice. However due to breach of code of conduct, misbehavior or indiscipline etc., ${app.companyName} reserves rights to terminate immediately without giving notice period.`
      },
      {
        heading: "INDEMNITY:",
        content: `You shall be responsible for protecting any property of the Client entrusted to you in the due discharge of your duties and you shall indemnify the client if there is a loss of any kind to the said property.`
      },
      {
        heading: "CODE OF CONDUCT:",
        content: `You shall not engage in any act subversive of discipline in the course of your duties for the Client either within the Client's organization or outside it, and if you were at any time found indulging in such act/s, the Company shall reserve the right to initiate disciplinary action as is deemed fit against you.`
      },
      {
        heading: "HOLIDAYS:",
        content: `You will be entitled to paid holidays in a year as notified by the company from time to time.`
      },
      {
        heading: "ADDRESS FOR COMMUNICATION:",
        content: `The address of communication for the purpose of service of notice and other official communication to the company shall be the registered address of the company. The address of communication and service of notice and other official communication is the address set out as above and your present residential address namely. In the event there is a change in your address, you shall inform the same in writing to the Management and that shall be the address last furnished by you, shall be deemed to be sufficient for communication and shall be deemed to be effective on you.`
      },
      {
        heading: "BACKGROUND VERIFICATION:",
        content: `The company reserves the right to have your background verified directly or through an outside agency. If on such verification it is found that you have furnished wrong information or concealed any material information your services are liable to be terminated with immediate effect.`
      },
      {
        heading: "ABSENTEEISM:",
        content: `You should be regular and punctual in your attendance. If you remain absent for 5 consecutive working days or more without sanction of leave or prior permission or if you over stay sanctioned leave beyond 5 consecutive working days or more it shall be deemed that you have voluntarily abandoned your employment with the company and your services are liable to be terminated accordingly.`
      },
      {
        heading: "RULES AND REGULATIONS:",
        content: `You shall be bound by the Rules & Regulations framed by the company from time to time in relation to conduct, discipline and other service conditions which will be deemed as Rules, Regulation and order and shall form part and parcel of this letter of appointment.`
      },
    ];

    policiesPage2.forEach((policy, index) => {
      if (index !== 0) doc.moveDown(0.5);
      doc.font("Helvetica-Bold").text(policy.heading);
      doc.font("Helvetica").fontSize(11).text(policy.content, { width: 450, lineGap: 1.4 });
    });

    addFooter(doc);

    // === PAGE 3 ===
    doc.addPage();
    contentStartY = addLogo(30);
    contentStartY += 20;

    doc.font("Helvetica-Bold").fontSize(12).text("OTHER TERMS OF CONTRACT:", 50, contentStartY);
    doc.moveDown(0.3);
    doc.font("Helvetica").fontSize(11).text(
      `In addition to the terms of appointment mentioned above, you are also governed by the standard employment rules of ${app.companyName}. The combined rules and procedures as contained in this letter will constitute the standard employment rules and you are required to read both of them in conjunction.`,
      { width: 450, lineGap: 1.4 }
    );

    doc.moveDown(0.3);
    doc.font("Helvetica-Bold").text("JURISDICTION:");
    doc.font("Helvetica").text(
      `Notwithstanding the place of working or placement or the normal or usual residence of the employee concerned or the place where this instrument is signed or executed, this Contract shall only be subject to the jurisdiction of the High Court of Judicature of Karnataka at Bangalore and its subordinate Courts.`,
      { width: 450, lineGap: 1.4 }
    );

    doc.moveDown(0.3);
    doc.font("Helvetica-Bold").text("DEEMED CANCELLATION OF CONTRACT:");
    doc.font("Helvetica").text(
      `The Contract stands cancelled and revoked if you do not report to duty within 3 days from the date of joining & your act will be construed as deemed and implied rejection of the offer of employment from your side; hence no obligation would arise on the part of the company in lieu of such Employment Contract issued.`,
      { width: 450, lineGap: 1.4 }
    );

    doc.moveDown(0.3);
    doc.text(`You shall report to work on ${app.joiningDate} at the client's place.`);

    doc.moveDown(0.3);
    doc.font("Helvetica-Bold").text("Documents to Bring:");
    doc.font("Helvetica").text(
      `1. Educational Certificates
2. Experience Letter / Relieving letter
3. Latest month pay slip
4. Photo ID proof
5. Address Proof
6. 5 Passport size photographs
7. PAN card
8. UAN Card
9. Aadhaar Card
10. Complete Application Form with Bio Data/Resume`,
      { lineGap: 1.4 }
    );

    doc.moveDown(0.3);
    doc.text(
      `Here's wishing you the very best in your assignment with us and as a token of your understanding and accepting of the standard terms of employment, you are requested to sign the duplicate copy of this letter and return to us within a day.`,
      { width: 450, lineGap: 1.4 }
    );

    addFooter(doc);

    // === PAGE 4 ===
    // === Compensation Sheet Header ===
doc.addPage();
contentStartY = addLogo(30);
contentStartY += 20;
doc.moveDown(3);

doc.font("Helvetica").fontSize(11).text(
  `I have read and understood the above mentioned terms and conditions of the Contract. I voluntarily accept the same and I shall abide by the terms and conditions mentioned therein and any amendments from time to time.
All the above mentioned terms and conditions will come in force from your date of joining. In case of no acceptance received before the first salary, it would be deemed as acknowledged and accepted by you on receipt of your first salary.`,
  { width: 450, lineGap: 1.4 }
);

// Compensation Sheet Header
doc.moveDown(2);
doc.font("Helvetica-Bold").fontSize(14).text("COMPENSATION SHEET", { align: "center" });
doc.moveDown(1);

// ===== Salary Calculation based on Annual CTC =====
const annualCTC = app.ctcAnnual || app.ctc || 252012; // Annual CTC from DB
const CTCMonthly = Math.round(annualCTC / 12); // Monthly derived from annual
const basic = Math.round(CTCMonthly * 0.61);
const hra = Math.round(CTCMonthly * 0.23);
const bonus = Math.round(CTCMonthly * 0.051);
const grossSalary = basic + hra + bonus;

// Employer contributions
const employerEsi = Math.round(CTCMonthly * 0.029);
const employerPf = Math.round(CTCMonthly * 0.079);
const totalContribution = employerEsi + employerPf;

// Deductions
const employeeEsi = Math.round(CTCMonthly * 0.0067);
const providentFund = Math.round(CTCMonthly * 0.0733);
const professionalTax = 150;
const totalDeduction = employeeEsi + providentFund + professionalTax;

// Net Take Home
const netTakeHome = grossSalary - totalDeduction;

// Helper for annual values
const annual = (v) => v * 12;

let startX = 50;
let startY = doc.y;
let rowHeight = 20;
let col1Width = 200;
let col2Width = 100;
let col3Width = 100;

function drawRow(y, col1, col2, col3, isHeader = false) {
  doc.rect(startX, y, col1Width, rowHeight).stroke();
  doc.rect(startX + col1Width, y, col2Width, rowHeight).stroke();
  doc.rect(startX + col1Width + col2Width, y, col3Width, rowHeight).stroke();

  doc.font(isHeader ? "Helvetica-Bold" : "Helvetica").fontSize(11)
    .text(col1, startX + 5, y + 5)
    .text(col2, startX + col1Width + 5, y + 5)
    .text(col3, startX + col1Width + col2Width + 5, y + 5);
}

// Salary Table
drawRow(startY, "Pay Heads", "Monthly Pay (Rs.)", "Annual Pay (Rs.)", true); startY += rowHeight;
drawRow(startY, "Basic", basic, annual(basic)); startY += rowHeight;
drawRow(startY, "House Rent Allowance", hra, annual(hra)); startY += rowHeight;
drawRow(startY, "Statutory Bonus", bonus, annual(bonus)); startY += rowHeight;
drawRow(startY, "Gross Salary", grossSalary, annual(grossSalary)); startY += rowHeight + 5;

drawRow(startY, "Employer's Contribution", "Monthly Pay (Rs.)", "Annual Pay (Rs.)", true); startY += rowHeight;
drawRow(startY, "Employer ESI", employerEsi, annual(employerEsi)); startY += rowHeight;
drawRow(startY, "Employer PF", employerPf, annual(employerPf)); startY += rowHeight;
drawRow(startY, "Total Contribution", totalContribution, annual(totalContribution)); startY += rowHeight;

drawRow(startY, "Cost to Company (CTC)", CTCMonthly, annualCTC); startY += rowHeight + 5;

drawRow(startY, "Deductions", "Monthly Pay (Rs.)", "Annual Pay (Rs.)", true); startY += rowHeight;
drawRow(startY, "Employee ESI", employeeEsi, annual(employeeEsi)); startY += rowHeight;
drawRow(startY, "Provident Fund", providentFund, annual(providentFund)); startY += rowHeight;
drawRow(startY, "Professional Tax", professionalTax, annual(professionalTax)); startY += rowHeight;
drawRow(startY, "Total Deduction", totalDeduction, annual(totalDeduction)); startY += rowHeight;
drawRow(startY, "Net Take Home", netTakeHome, annual(netTakeHome)); startY += rowHeight + 15;

// ===== Signature Section =====
doc.moveDown(1);
doc.text("With Warm Regards,", startX, doc.y);

try {
  const stampY = doc.y + 5;
  if (fs.existsSync(stampPath)) {
    doc.image(stampPath, startX, stampY, { width: 90, height: 90 });
  }
  doc.moveDown(8);
} catch (err) {
  console.warn("⚠️ Stamp not found on Page 4:", err.message);
  doc.moveDown(8);
}

// ✅ Dynamic from SettingModel
doc.text(authorizedPerson || "Authorized Signatory", startX, doc.y);
doc.text(settings?.authorizedDesignation || "Founder & CEO", startX, doc.y + 15);

addFooter(doc);


  // 💾 Save Salary Details to Database
await Application.findByIdAndUpdate(app._id, {
  salaryDetails: {
    basic,
    houseRentAllowance: hra,
    statutoryBonus: bonus,
    employerEsi,
    employerPf,
    employeeEsi,
    providentFund,
    professionalTax,
    grossSalary,
    totalContribution,
    totalDeduction,
    netTakeHome,
  },
});

// End PDF
doc.end();
  } catch (err) {
    console.error("Appointment letter generation error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});



// =============================
// 📄 EXPERIENCE LETTER TEMPLATE
// =============================
router.post("/experience-letter/:id", async (req, res) => {
  try {
    // ====== 1️⃣ Fetch Application ======
    const app = await Application.findById(req.params.id);
    if (!app)
      return res
        .status(404)
        .json({ success: false, message: "Application not found" });

    // ====== 2️⃣ Fetch Company Settings Dynamically ======
    const company =
      (await Setting.findOne({
        companyName: { $regex: new RegExp(app.companyName || "", "i") },
      })) || (await Setting.findOne()); // fallback to first company

    if (!company)
      return res
        .status(404)
        .json({ success: false, message: "Company settings not found" });

    // ====== 3️⃣ Create PDF Setup ======
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${app.name}_Experience_Letter.pdf`
    );
    doc.pipe(res);

    const pageWidth = doc.page.width;

    // ====== 4️⃣ Company Logo Based on Alignment ======
    if (company.companyLogo) {
      const logoPath = path.resolve(`.${company.companyLogo}`);
      if (fs.existsSync(logoPath)) {
        let xPos = 50; // default left
        if (company.logoAlignment === "center") xPos = pageWidth / 2 - 50;
        if (company.logoAlignment === "right") xPos = pageWidth - 150;
        doc.image(logoPath, xPos, 40, { width: 100 });
      } else {
        console.log("⚠️ Logo not found at:", logoPath);
      }
    }

    // ====== 5️⃣ Experience Date (Top-Right) ======
    const experienceDate = app.experienceDate ? new Date(app.experienceDate) : new Date();
    const day = experienceDate.getDate().toString().padStart(2, "0");
    const month = experienceDate.toLocaleString("en-GB", { month: "short" }).toUpperCase();
    const year = experienceDate.getFullYear().toString().slice(-2);
    const formattedDate = `${day}-${month}-${year}`;
    doc.font("Helvetica").fontSize(10).text(`Date: ${formattedDate}`, pageWidth - 150, 80);

    // ====== 6️⃣ Title ======
    let y = 120;
    doc.font("Helvetica-Bold").fontSize(14).text("Experience Letter", 50, y, { align: "center" });
    y += 40;

    // ====== 7️⃣ Main Content ======
    doc.font("Helvetica").fontSize(11).fillColor("black");
    const bodyText = `
To whomever it may concern, this is to certify that ${app.name} was employed as ${app.designation} at ${app.companyName} from ${app.joiningDate} to ${app.relievingDate}.

We can confirm ${app.name}'s contributions towards the company during their tenure have been satisfactory.

We are sure their passion and dedication will help them excel in whatever they choose to do next. They have shown high commitment throughout their time with our company.

We wish ${app.name} all the best for their future.
`;
    doc.text(bodyText, 50, y, { width: pageWidth - 100, lineGap: 4 });

    // ====== 8️⃣ “Sincerely” Text ======
    let sigY = doc.y + 20;
    doc.font("Helvetica").fontSize(11).text("Sincerely,", 50, sigY);

    // ====== 9️⃣ Stamp (Dynamic from Settings) ======
    const stampY = sigY + 16;
    if (company.stamp) {
      const stampPath = path.resolve(`.${company.stamp}`);
      if (fs.existsSync(stampPath)) {
        doc.image(stampPath, 50, stampY, { width: 100 });
      } else {
        console.log("⚠️ Stamp not found at:", stampPath);
      }
    }

    // ====== 🔟 Authorized Person Details ======
    sigY = stampY + 90;
    doc.text(company.authorizedPerson || "Authorized Signatory", 50, sigY);
    sigY += 14;
    doc.text(company.authorizedDesignation || "Founder & CEO", 50, sigY); // ✅ dynamic value
    sigY += 14;
    doc.text(company.companyName || "Techwell", 50, sigY);

    // ====== 11️⃣ Footer (Dynamic Address, Phone, Email) ======
    const footerY = doc.page.height - 100;
    doc.fontSize(9).fillColor("gray");

    doc.text(
      company.address ||
        "Address: Plot no:11, Opposite LIC Office, Govt. Women’s College Road, Srikakulam – 532001",
      50,
      footerY,
      { align: "center", width: pageWidth - 100 }
    );

    const contactLine = `Phone: ${company.phone || "+91-7997473473"}     Email: ${
      company.email || "info@techwell.co.in"
    }`;

    doc.text(contactLine, 50, footerY + 12, {
      align: "center",
      width: pageWidth - 100,
    });

    doc.end();
  } catch (err) {
    console.error("Experience letter generation error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// =============================
// 📄 NO OBJECTION CERTIFICATE (NOC)
// =============================
router.post("/noc/:id", async (req, res) => {
  try {
    const app = await Application.findById(req.params.id);
    if (!app)
      return res.status(404).json({ success: false, message: "Application not found" });

    // ✅ Step 1: Get purpose from frontend
    const { purpose: frontendPurpose } = req.body;

    // ✅ Step 2: Fetch company settings dynamically
    const company =
      (await Setting.findOne({
        companyName: { $regex: new RegExp(app.companyName || "", "i") },
      })) || (await Setting.findOne());

    if (!company)
      return res.status(404).json({ success: false, message: "Company settings not found" });

    // ✅ Step 3: Use frontend purpose → company purpose → default text
    const purpose = frontendPurpose || company.purpose || "official purpose";

    // ✅ Step 4: Generate the PDF
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${app.name}_NOC.pdf`
    );
    doc.pipe(res);

    const pageWidth = doc.page.width;

    // ===== Company Logo =====
    if (company.companyLogo) {
      const logoPath = path.resolve(`.${company.companyLogo}`);
      if (fs.existsSync(logoPath)) {
        let xPos = 50;
        if (company.logoAlignment === "center") xPos = pageWidth / 2 - 50;
        if (company.logoAlignment === "right") xPos = pageWidth - 150;
        doc.image(logoPath, xPos, 40, { width: 100 });
      }
    }

    // ===== Title =====
    let y = 130;
    doc.font("Helvetica-Bold").fontSize(16).text("NO OBJECTION CERTIFICATE (NOC)", 50, y, {
      align: "center",
    });
    y += 30;
    doc.font("Helvetica-Bold").fontSize(12).text("To Whom It May Concern", { align: "center" });
    y += 30;

    // ===== Gender Pronoun =====
    const pronoun = app.gender?.toLowerCase() === "female" ? "her" : "his";

    // ===== Main Content =====
    doc.font("Helvetica").fontSize(12);
    const content = `This is to certify that ${app.name}, who has been working with ${app.companyName} as a ${app.designation} in the ${app.department} department, is an employee of our organization since ${app.joiningDate}.

During the period of employment, ${pronoun} conduct and performance have been found satisfactory.

This No Objection Certificate is being issued upon ${pronoun} request for the purpose of ${purpose}. The company has no objection to the same.

We wish ${pronoun} all the best in future endeavors.`;

    doc.text(content, 50, y, {
      width: pageWidth - 100,
      lineGap: 4,
      align: "justify",
    });

    // ===== Issued Date & Place =====
    y = doc.y + 20;
    const issueDate = app.issuedDate ? new Date(app.issuedDate) : new Date();
    const formattedDate = issueDate.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "2-digit",
    });

    doc.font("Helvetica-Bold").text(`Issued on: `, 50, y);
    doc.font("Helvetica").text(formattedDate, 125, y);
    y += 20;

    doc.font("Helvetica-Bold").text(`Place: `, 50, y);
    doc.font("Helvetica").text(company.place || "N/A", 100, y);
    y += 50;

    // ===== Stamp & Signature =====
    if (company.stamp) {
      const stampPath = path.resolve(`.${company.stamp}`);
      if (fs.existsSync(stampPath)) {
        doc.image(stampPath, 50, y - 20, { width: 100 });
      }
    }

    doc.font("Helvetica-Bold").text(`For ${company.companyName}`, 50, y + 60);
    doc.font("Helvetica-Oblique").text("(Authorized Signatory)", 50, y + 80);

    // ===== Footer =====
    const footerY = doc.page.height - 100;
    doc.fontSize(9).fillColor("gray");
    doc.text(company.address || "Address: Srikakulam – 532001", 50, footerY, {
      align: "center",
      width: pageWidth - 100,
    });
    const phoneText = company.phone ? `Phone: ${company.phone}` : "Phone: +91-7997473473";
    const emailText = company.email ? `Email: ${company.email}` : "Email: info@techwell.co.in";
    doc.text(`${phoneText}     ${emailText}`, 50, footerY + 12, {
      align: "center",
      width: pageWidth - 100,
    });

    doc.end();
  } catch (err) {
    console.error("NOC generation error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// === PAYSLIP GENERATION ROUTE (FINAL UPDATED VERSION USING payslipDate) ===
router.post("/payslip/:id", async (req, res) => {
  try {
    const app = await Application.findById(req.params.id);
    if (!app)
      return res
        .status(404)
        .json({ success: false, message: "Application not found" });

    const settings = await Setting.findOne();

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${app.name}_Payslip.pdf`
    );
    doc.pipe(res);

    // ===== COMPANY LOGO =====
    if (settings?.companyLogo) {
      const logoPath = path.resolve(`.${settings.companyLogo}`);
      if (fs.existsSync(logoPath)) {
        const logoX = pageWidth / 2 - 40;
        doc.image(logoPath, logoX, 25, { width: 80 });
      }
    }

    // ===== COMPANY NAME =====
    doc.moveDown(3);
    doc
      .font("Helvetica-Bold")
      .fontSize(13)
      .text("TECHWELL PRIVATE LIMITED", { align: "center" });
    doc.moveDown(0.3);

    // ✅ Dynamic Month-Year (using payslipDate, fallback to offerDate or createdAt)
    const dateSource =
      app.payslipDate || app.offerDate || app.createdAt || new Date();

    let dateObj;
    if (typeof dateSource === "string") {
      const [year, month, day] = dateSource.split("-").map(Number);
      dateObj = new Date(year, month - 1, day || 1);
    } else {
      dateObj = new Date(dateSource);
    }

    const monthYear = dateObj
      .toLocaleString("en-US", { month: "long", year: "numeric" })
      .toUpperCase()
      .replace(" ", "-"); // Example: JUNE-2025

    doc
      .font("Helvetica")
      .fontSize(11)
      .text(`PAYSLIP FOR THE MONTH ${monthYear}`, { align: "center" });

    // ===== GRAY BOX (NAME + DESIGNATION) =====
    const boxStartY = doc.y + 15;
    const fullWidth = pageWidth - 80;
    doc.rect(40, boxStartY, fullWidth, 35).fill("#d9d9d9").stroke();
    doc.fillColor("#000").font("Helvetica-Bold").fontSize(10);
    doc.text("Name :", 50, boxStartY + 10);
    doc.font("Helvetica").text(app.name || "-", 90, boxStartY + 10);
    doc.font("Helvetica-Bold").text("Designation :", 270, boxStartY + 10);
    doc.font("Helvetica").text(app.designation || "-", 350, boxStartY + 10);

    // ===== SECOND TABLE =====
    const tableY = boxStartY + 50;
    const rowHeight = 120;
    const colWidths = [75, 78, 100, 95, 53, 53, 53]; // adjusted per your request
    const colX = [40];
    for (let i = 0; i < colWidths.length; i++) colX.push(colX[i] + colWidths[i]);

    // Outer border
    doc.rect(40, tableY, pageWidth - 80, rowHeight).stroke();

    // Column lines
    for (let i = 1; i < colX.length - 1; i++) {
      doc.moveTo(colX[i], tableY).lineTo(colX[i], tableY + rowHeight).stroke();
    }

    // GRAY BACKGROUND (1st & 3rd cols)
    doc.rect(colX[0], tableY, colWidths[0], rowHeight).fill("#d9d9d9").stroke();
    doc.rect(colX[2], tableY, colWidths[2], rowHeight).fill("#d9d9d9").stroke();

    // === Column Text ===
    doc.fontSize(9).fillColor("#000");
    const y1 = tableY + 8;

    // Column 1
    doc.font("Helvetica-Bold");
    doc.text("Employee ID :", 45, y1);
    doc.text("Department :", 45, y1 + 12);
    doc.text("Bank A/C No :", 45, y1 + 24);
    doc.text("UAN No :", 45, y1 + 36);
    doc.text("Location :", 45, y1 + 60);

    // Column 2
    doc.font("Helvetica");
    doc.text(app.empId || "-", colX[1] + 5, y1);
    doc.text(app.department || "-", colX[1] + 5, y1 + 12);
    doc.text(app.accountNumber || "-", colX[1] + 5, y1 + 24);
    doc.text(app.uan || "-", colX[1] + 5, y1 + 36);
    doc.text(settings?.place || app.place || "-", colX[1] + 5, y1 + 60);

    // Column 3
    doc.font("Helvetica-Bold");
    doc.text("Date of Joining :", colX[2] + 5, y1);
    doc.text("PAN No :", colX[2] + 5, y1 + 12);
    doc.text("Bank Name :", colX[2] + 5, y1 + 24);
    doc.text("ESI No :", colX[2] + 5, y1 + 36);
    doc.text("Aadhaar No :", colX[2] + 5, y1 + 48);

    // Column 4
    doc.font("Helvetica");
    doc.text(app.joiningDate || "-", colX[3] + 5, y1);
    doc.text(app.pan || "-", colX[3] + 5, y1 + 12);
    doc.text(app.bankName || "-", colX[3] + 5, y1 + 24);
    doc.text(app.esi || "-", colX[3] + 5, y1 + 36);
    doc.text(app.aadhar || "-", colX[3] + 5, y1 + 48);

    // Columns 5–7 Titles
    doc.font("Helvetica-Bold").fontSize(9);
    doc.text("No. of", colX[4] + 10, y1);
    doc.text("unpaid", colX[4] + 8, y1 + 10);
    doc.text("leaves", colX[4] + 6, y1 + 20);

    doc.text("No. of", colX[5] + 6, y1);
    doc.text("Extra days", colX[5] + 2, y1 + 10);
    doc.text("paid", colX[5] + 15, y1 + 20);

    doc.text("No. of", colX[6] + 10, y1);
    doc.text("days paid", colX[6] + 6, y1 + 10);

    // Column values (Cols 5–7)
    doc.font("Helvetica").fontSize(9);
    doc.text(app.unpaidLeaves || "-", colX[4] + 18, y1 + 50);
    doc.text(app.extraDaysPaid || "-", colX[5] + 18, y1 + 50);
    doc.text(app.daysPaid || "30", colX[6] + 18, y1 + 50);

    // ===== THIRD TABLE =====
    let y = tableY + rowHeight + 25;
    const sal = app.salaryDetails || {};

    const salaryTableHeight = 20 + 15 * 4 + 40;
    doc.rect(40, y, pageWidth - 80, salaryTableHeight).stroke();

    // Header
    doc.rect(40, y, pageWidth - 80, 20).fill("#d9d9d9").stroke();
    doc.fillColor("#000").font("Helvetica-Bold").fontSize(10);
    doc.text("Particulars", 50, y + 5);
    doc.text("Actual Earnings", 180, y + 5);
    doc.text("Particulars", 340, y + 5);
    doc.text("Amount", 480, y + 5);

    // Salary rows
    let rowY = y + 25;
    const addRow = (l1, v1, l2, v2) => {
      doc.font("Helvetica").fontSize(9);
      doc.text(l1, 50, rowY);
      doc.text(v1 || "-", 180, rowY);
      doc.text(l2, 340, rowY);
      doc.text(v2 || "-", 480, rowY);
      rowY += 15;
    };

    addRow("Basic", sal.basic, "ESI", sal.employeeEsi);
    addRow("House Rent Allowance", sal.houseRentAllowance, "Professional Tax", sal.professionalTax);
    addRow("Statutory Bonus", sal.statutoryBonus, "PF", sal.providentFund);

    const totalEarnings =
      (Number(sal.basic) || 0) +
      (Number(sal.houseRentAllowance) || 0) +
      (Number(sal.statutoryBonus) || 0);
    const totalDeductions =
      (Number(sal.employeeEsi) || 0) +
      (Number(sal.professionalTax) || 0) +
      (Number(sal.providentFund) || 0);
    const netPay = totalEarnings - totalDeductions;

    rowY += 5;
    doc.font("Helvetica-Bold");
    doc.text("Total Earnings", 50, rowY);
    doc.text(totalEarnings.toFixed(2), 180, rowY);
    doc.text("Gross Deductions", 340, rowY);
    doc.text(totalDeductions.toFixed(2), 480, rowY);

    // ===== NET PAY =====
    rowY += 25;
    doc.rect(40, rowY, pageWidth - 80, 20).stroke();
    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .text(
        `Net pay for the month (Rs): ${netPay.toFixed(
          2
        )} /- (${numToWords(netPay)} Rupee(s) only)`,
        50,
        rowY + 5
      );

    // ===== FOOTER =====
    const footerY = rowY + 40;
    doc.font("Helvetica").fontSize(9);
    doc.text("Tax Regime used: Old Regime", 50, footerY);
    doc.text(
      "** Note: This is a System generated Pay slip, hence does not require any Signature **",
      50,
      footerY + 15
    );
    doc.text("** All Figures mentioned are in INR **", 50, footerY + 30);

    // ===== COMPANY FOOTER INFO =====
    doc.fontSize(8);
    doc.text("3rd Street, L.R.Peta, Palakol", 0, pageHeight - 70, {
      align: "center",
    });
    doc.text(
      "CIN: U62013AP2024OPC115203 | 9133733373 | tdevakinandan@gmail.com",
      0,
      pageHeight - 55,
      { align: "center" }
    );

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// === HELPER FUNCTION ===
function numToWords(num) {
  const a = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  if (num === 0) return "Zero";
  if (num < 20) return a[num];
  if (num < 100) return b[Math.floor(num / 10)] + (num % 10 ? " " + a[num % 10] : "");
  if (num < 1000)
    return (
      a[Math.floor(num / 100)] +
      " Hundred" +
      (num % 100 === 0 ? "" : " " + numToWords(num % 100))
    );
  if (num < 100000)
    return (
      numToWords(Math.floor(num / 1000)) +
      " Thousand" +
      (num % 1000 === 0 ? "" : " " + numToWords(num % 1000))
    );
  if (num < 10000000)
    return (
      numToWords(Math.floor(num / 100000)) +
      " Lakh" +
      (num % 100000 === 0 ? "" : " " + numToWords(num % 100000))
    );
  return num.toString();
}



export default router;
