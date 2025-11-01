import mongoose from "mongoose";

const settingSchema = new mongoose.Schema(
  {
    companyName: { type: String, required: true, trim: true },
    logoAlignment: {
      type: String,
      enum: ["left", "center", "right"],
      default: "left",
    },
    address: { type: String, trim: true },
    authorizedPerson: { type: String, trim: true },
    authorizedDesignation: { type: String, trim: true }, // ✅ new field
    purpose: {
      type: String,
      enum: [
        "Higher Studies",
        "Applying for Visa",
        "Job Change",
        "Address Verification",
        "Loan Application",
      ], // ✅ dropdown options
      trim: true,
    },
    place: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true },
    companyLogo: { type: String, trim: true },
    stamp: { type: String, trim: true },
  },
  { timestamps: true }
);

export default mongoose.model("Setting", settingSchema);
