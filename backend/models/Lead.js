import mongoose from "mongoose";

const leadSchema = new mongoose.Schema(
  {
    name: String,
    email: String,
    phone: String,
    applicationToken: { type: String, unique: true },
    applicationSubmitted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Lead", leadSchema);
