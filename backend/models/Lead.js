import mongoose from "mongoose";

const leadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },

    // Allow duplicate tokens and avoid null issues
    applicationToken: { type: String, unique: false, sparse: true },

    applicationSubmitted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Lead", leadSchema);
