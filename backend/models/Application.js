import mongoose from "mongoose";

const applicationSchema = new mongoose.Schema(
  {
    lead: { type: mongoose.Schema.Types.ObjectId, ref: "Lead" },

    // Basic Info
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },

    // Personal
    fatherName: String,
    dob: String,
    gender: String,
    maritalStatus: String,
    address: String,
    aadhar: String,
    pan: String,
    aadharFile: String,
    resume: String,

    // Professional
    designation: String,
    department: String,
    joiningDate: String,
    relievingDate: String,
    ctc: String,

    // Internship / Job Assignment
    companyName: String,
    jobType: String,
    mentorName: String,
    mentorDesignation: String,
    dateDocument: String,
    empId: String,
    approved: { type: Boolean, default: false },

    // Beneficiary
    bankName: String,
    accountNumber: String,
    ifsc: String,
    branchName: String,
    bankPassbook: String,
    uan: String,
    esi: String,
    pfFile: String,

    // Document Dates
    offerDate: String,
    appointmentDate: String,
    experienceDate: String,
    internshipDate: String,
    nocDate: String,
    payslipDate: String,
    appointmentDate: String,
    experienceDate: String,
    internshipDate: String,

    // Reference
    referenceFile: String,

    // ✅ Salary Breakdown (NEW FIELD)
    salaryDetails: {
      basic: Number,
      houseRentAllowance: Number,
      statutoryBonus: Number,
      employerEsi: Number,
      employerPf: Number,
      employeeEsi: Number,
      providentFund: Number,
      professionalTax: Number,
      grossSalary: Number,
      totalContribution: Number,
      totalDeduction: Number,
      netTakeHome: Number,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Application", applicationSchema);
