import { useEffect, useState } from "react";
import axios from "axios";
import { useSearchParams } from "react-router-dom";

const ApplicationForm = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [lead, setLead] = useState<any>(null);
  const [message, setMessage] = useState("");

  const [formData, setFormData] = useState<any>({
    fatherName: "",
    dob: "",
    gender: "",
    maritalStatus: "",
    address: "",
    aadhar: "",
    pan: "",
    designation: "",
    department: "",
    joiningDate: "",
    relievingDate: "",
    ctc: "",
    bankName: "",
    accountNumber: "",
    ifsc: "",
    branchName: "",
    uan: "",
    esi: "",
    aadharFile: null,
    resume: null,
    bankPassbook: null,
    pfFile: null,
    referenceFile: "",
  });

  // Fetch lead data by token
  useEffect(() => {
    const fetchLead = async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.PUBLIC_APP_URL}/leads/by-token/${token}`
        );
        if (res.data.success) setLead(res.data.lead);
        else setMessage("Invalid or expired link.");
      } catch {
        setMessage("Error loading form.");
      }
    };
    if (token) fetchLead();
  }, [token]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFormData({ ...formData, [e.target.name]: e.target.files[0] });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    try {
      const form = new FormData();
      form.append("token", token || "");
      form.append("name", lead?.name || "");
      form.append("email", lead?.email || "");
      form.append("phone", lead?.phone || "");

      Object.entries(formData).forEach(([key, value]) => {
        if (value instanceof File) form.append(key, value);
        else form.append(key, value as string);
      });

      const res = await axios.post(
        `${import.meta.env.PUBLIC_APP_URL}/application`,
        form,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      setMessage(
        res.data.success
          ? "✅ Application submitted successfully!"
          : "⚠️ Failed to submit."
      );

      if (res.data.success) {
        setFormData({
          fatherName: "",
          dob: "",
          gender: "",
          maritalStatus: "",
          address: "",
          aadhar: "",
          pan: "",
          designation: "",
          department: "",
          joiningDate: "",
          relievingDate: "",
          ctc: "",
          bankName: "",
          accountNumber: "",
          ifsc: "",
          branchName: "",
          uan: "",
          esi: "",
          aadharFile: null,
          resume: null,
          bankPassbook: null,
          pfFile: null,
          referenceFile: "",
        });
      }
    } catch {
      setMessage("❌ Error submitting application.");
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-6 text-center">
        Employee Application Form
      </h2>

      <form
        onSubmit={handleSubmit}
        className="space-y-10"
        encType="multipart/form-data"
      >
        {/* Applicant Details */}
        <section>
          <h3 className="text-lg font-semibold mb-4">Applicant Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <label>
              <span className="block text-sm font-medium mb-1">Full Name</span>
              <input
                type="text"
                value={lead?.name || ""}
                className="w-full border p-2 rounded bg-gray-100"
                readOnly
              />
            </label>

            <label>
              <span className="block text-sm font-medium mb-1">Email</span>
              <input
                type="email"
                value={lead?.email || ""}
                className="w-full border p-2 rounded bg-gray-100"
                readOnly
              />
            </label>

            <label>
              <span className="block text-sm font-medium mb-1">Phone Number</span>
              <input
                type="tel"
                value={lead?.phone || ""}
                className="w-full border p-2 rounded bg-gray-100"
                readOnly
              />
            </label>
          </div>
        </section>

        {/* Personal Info */}
        <section>
          <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <label>
              <span className="block text-sm font-medium mb-1">
                Father’s Name
              </span>
              <input
                name="fatherName"
                onChange={handleChange}
                className="border p-2 rounded w-full"
              />
            </label>

            <label>
              <span className="block text-sm font-medium mb-1">Date of Birth</span>
              <input
                type="date"
                name="dob"
                onChange={handleChange}
                className="border p-2 rounded w-full"
              />
            </label>

            <label>
              <span className="block text-sm font-medium mb-1">Gender</span>
              <select
                name="gender"
                onChange={handleChange}
                className="border p-2 rounded w-full"
              >
                <option value="">Select</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </label>

            <label>
              <span className="block text-sm font-medium mb-1">Marital Status</span>
              <select
                name="maritalStatus"
                onChange={handleChange}
                className="border p-2 rounded w-full"
              >
                <option value="">Select</option>
                <option>Single</option>
                <option>Married</option>
              </select>
            </label>

            <label className="col-span-2">
              <span className="block text-sm font-medium mb-1">Address</span>
              <input
                name="address"
                onChange={handleChange}
                className="border p-2 rounded w-full"
              />
            </label>

            <label>
              <span className="block text-sm font-medium mb-1">Aadhar Number</span>
              <input
                name="aadhar"
                onChange={handleChange}
                className="border p-2 rounded w-full"
              />
            </label>

            <label>
              <span className="block text-sm font-medium mb-1">
                Upload Aadhar (PDF/JPG/PNG)
              </span>
              <input
                type="file"
                name="aadharFile"
                accept=".pdf,.jpg,.png"
                onChange={handleFileChange}
                className="border p-2 rounded w-full"
              />
            </label>

            <label>
              <span className="block text-sm font-medium mb-1">PAN Number</span>
              <input
                name="pan"
                onChange={handleChange}
                className="border p-2 rounded w-full"
              />
            </label>

            <label>
              <span className="block text-sm font-medium mb-1">Upload Resume</span>
              <input
                type="file"
                name="resume"
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
                className="border p-2 rounded w-full"
              />
            </label>
          </div>
        </section>

        {/* Professional Info */}
        <section>
          <h3 className="text-lg font-semibold mb-4">Professional Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <label>
              <span className="block text-sm font-medium mb-1">Designation</span>
              <input
                name="designation"
                onChange={handleChange}
                className="border p-2 rounded w-full"
              />
            </label>

            <label>
              <span className="block text-sm font-medium mb-1">Department</span>
              <input
                name="department"
                onChange={handleChange}
                className="border p-2 rounded w-full"
              />
            </label>

            <label>
              <span className="block text-sm font-medium mb-1">Joining Date</span>
              <input
                type="date"
                name="joiningDate"
                onChange={handleChange}
                className="border p-2 rounded w-full"
              />
            </label>

            <label>
              <span className="block text-sm font-medium mb-1">Relieving Date</span>
              <input
                type="date"
                name="relievingDate"
                onChange={handleChange}
                className="border p-2 rounded w-full"
              />
            </label>

            <label>
              <span className="block text-sm font-medium mb-1">CTC</span>
              <input
                name="ctc"
                onChange={handleChange}
                className="border p-2 rounded w-full"
              />
            </label>
          </div>
        </section>

        {/* Beneficiary Info */}
        <section>
          <h3 className="text-lg font-semibold mb-4">Beneficiary Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <label>
              <span className="block text-sm font-medium mb-1">Bank Name</span>
              <input
                name="bankName"
                onChange={handleChange}
                className="border p-2 rounded w-full"
              />
            </label>

            <label>
              <span className="block text-sm font-medium mb-1">
                Account Number
              </span>
              <input
                name="accountNumber"
                onChange={handleChange}
                className="border p-2 rounded w-full"
              />
            </label>

            <label>
              <span className="block text-sm font-medium mb-1">IFSC Code</span>
              <input
                name="ifsc"
                onChange={handleChange}
                className="border p-2 rounded w-full"
              />
            </label>

            <label>
              <span className="block text-sm font-medium mb-1">Branch Name</span>
              <input
                name="branchName"
                onChange={handleChange}
                className="border p-2 rounded w-full"
              />
            </label>

            <label>
              <span className="block text-sm font-medium mb-1">UAN</span>
              <input
                name="uan"
                onChange={handleChange}
                className="border p-2 rounded w-full"
              />
            </label>

            <label>
              <span className="block text-sm font-medium mb-1">
                Upload First Page of Passbook
              </span>
              <input
                type="file"
                name="bankPassbook"
                accept=".pdf,.jpg,.png"
                onChange={handleFileChange}
                className="border p-2 rounded w-full"
              />
            </label>

            <label>
              <span className="block text-sm font-medium mb-1">ESI</span>
              <input
                name="esi"
                onChange={handleChange}
                className="border p-2 rounded w-full"
              />
            </label>
          </div>

          <div className="mt-4">
            <label className="block">
              <span className="block text-sm font-medium mb-1">Upload PF File</span>
              <input
                type="file"
                name="pfFile"
                accept=".pdf"
                onChange={handleFileChange}
                className="border p-2 rounded w-full"
              />
            </label>
          </div>
        </section>

        {/* Reference */}
        <section>
          <h3 className="text-lg font-semibold mb-4">Reference Details</h3>
          <label className="block">
            <span className="block text-sm font-medium mb-1">
              Reference Name / Contact
            </span>
            <input
              type="text"
              name="referenceFile"
              onChange={handleChange}
              value={formData.referenceFile}
              className="border p-2 rounded w-full"
            />
          </label>
        </section>

        <button
          type="submit"
          className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
        >
          Submit Application
        </button>
      </form>

      {message && <p className="mt-4 text-sm text-gray-700">{message}</p>}
    </div>
  );
};

export default ApplicationForm;
