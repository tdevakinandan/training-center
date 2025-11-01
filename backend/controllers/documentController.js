import Application from "../models/applicationModel.js";
import Setting from "../models/SettingModel.js";
import pdfkit from "pdfkit";
import fs from "fs";

export const generateOfferLetter = async (req, res) => {
  try {
    const app = await Application.findById(req.params.id);
    const setting = await Setting.findOne();
    if (!app || !setting)
      return res.status(404).json({ message: "Data not found" });

    const doc = new pdfkit();
    const filePath = `temp/${app.name}_offer_letter.pdf`;
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    doc.fontSize(16).text(`Offer Letter`, { align: setting.logoAlignment });
    doc.moveDown();
    doc.fontSize(12).text(`Dear ${app.name},`);
    doc.text(`We are pleased to offer you a position at ${setting.companyName}.`);
    doc.text(`Company Address: ${setting.address}`);
    doc.text(`Authorized By: ${setting.authorizedPerson}`);
    doc.end();

    stream.on("finish", () => {
      res.download(filePath, `${app.name}_offer_letter.pdf`, () => {
        fs.unlinkSync(filePath); // delete temp file
      });
    });
  } catch (err) {
    console.error("Offer letter generation error:", err);
    res.status(500).json({ message: "Error generating offer letter" });
  }
};
