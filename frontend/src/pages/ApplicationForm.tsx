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
    netCredit: "",
    bankName: "",
    accountNumber: "",
    ifsc: "",
    branchName: "",
    uan: "",
    esi: "",
    // Files
    aadharFile: null,
    resume: null,
    bankPassbook: null,
    pfFile: null,
    referenceFile: null,
  });

  // Fetch lead data by token
  useEffect(() => {
    const fetchLead = async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_BASE}/leads/by-token/${token}`
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
        `${import.meta.env.VITE_API_BASE}/application`,
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
          netCredit: "",
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
          referenceFile: null,
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
            <input
              type="text"
              value={lead?.name || ""}
              placeholder="Full Name"
              className="w-full border p-2 rounded bg-gray-100"
              readOnly
            />
            <input
              type="email"
              value={lead?.email || ""}
              placeholder="Email"
              className="w-full border p-2 rounded bg-gray-100"
              readOnly
            />
            <input
              type="tel"
              value={lead?.phone || ""}
              placeholder="Phone Number"
              className="w-full border p-2 rounded bg-gray-100"
              readOnly
            />
          </div>
        </section>

        {/* Personal Info */}
        <section>
          <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <input
              name="fatherName"
              onChange={handleChange}
              placeholder="Father's Name"
              className="border p-2 rounded"
            />
            <input
              type="date"
              name="dob"
              onChange={handleChange}
              className="border p-2 rounded"
            />
            <select
              name="gender"
              onChange={handleChange}
              className="border p-2 rounded"
            >
              <option value="">Gender</option>
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>
            <select
              name="maritalStatus"
              onChange={handleChange}
              className="border p-2 rounded"
            >
              <option value="">Marital Status</option>
              <option>Single</option>
              <option>Married</option>
            </select>
            <input
              name="address"
              onChange={handleChange}
              placeholder="Address"
              className="border p-2 rounded col-span-2"
            />
            <input
              name="aadhar"
              onChange={handleChange}
              placeholder="Aadhar Number"
              className="border p-2 rounded"
            />
            <input
              type="file"
              name="aadharFile"
              accept=".pdf,.jpg,.png"
              onChange={handleFileChange}
              className="border p-2 rounded"
            />
            <input
              name="pan"
              onChange={handleChange}
              placeholder="PAN Card"
              className="border p-2 rounded"
            />
            <input
              type="file"
              name="resume"
              accept=".pdf,.doc,.docx"
              onChange={handleFileChange}
              className="border p-2 rounded"
            />
          </div>
        </section>

        {/* Professional Info */}
        <section>
          <h3 className="text-lg font-semibold mb-4">Professional Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <input
              name="designation"
              onChange={handleChange}
              placeholder="Designation"
              className="border p-2 rounded"
            />
            <input
              name="department"
              onChange={handleChange}
              placeholder="Department"
              className="border p-2 rounded"
            />
            <input
              type="date"
              name="joiningDate"
              onChange={handleChange}
              className="border p-2 rounded"
            />
            <input
              type="date"
              name="relievingDate"
              onChange={handleChange}
              className="border p-2 rounded"
            />
            <input
              name="ctc"
              onChange={handleChange}
              placeholder="CTC"
              className="border p-2 rounded"
            />
            <input
              name="netCredit"
              onChange={handleChange}
              placeholder="Net Credit"
              className="border p-2 rounded"
            />
          </div>
        </section>

        {/* Beneficiary Info */}
        <section>
          <h3 className="text-lg font-semibold mb-4">
            Beneficiary Information
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <input
              name="bankName"
              onChange={handleChange}
              placeholder="Bank Name"
              className="border p-2 rounded"
            />
            <input
              name="accountNumber"
              onChange={handleChange}
              placeholder="Account Number"
              className="border p-2 rounded"
            />
            <input
              name="ifsc"
              onChange={handleChange}
              placeholder="IFSC"
              className="border p-2 rounded"
            />
            <input
              name="branchName"
              onChange={handleChange}
              placeholder="Branch Name"
              className="border p-2 rounded"
            />

            <input
              name="uan"
              onChange={handleChange}
              placeholder="UAN"
              className="border p-2 rounded"
            />
            <div>
              <label className="text-sm">Upload First Page of Passbook</label>
              <input
                type="file"
                name="bankPassbook"
                accept=".pdf,.jpg,.png"
                onChange={handleFileChange}
                className="border p-2 rounded w-full"
              />
            </div>

            <input
              name="esi"
              onChange={handleChange}
              placeholder="ESI"
              className="border p-2 rounded"
            />
          </div>

          <div className="mt-4">
            <label className="text-sm">Upload PF</label>
            <input
              type="file"
              name="pfFile"
              accept=".pdf"
              onChange={handleFileChange}
              className="border p-2 rounded w-full"
            />
          </div>
        </section>

        {/* Reference */}
        <section>
          <h3 className="text-lg font-semibold mb-4">Reference</h3>
          <input
            type="file"
            name="referenceFile"
            accept=".pdf"
            onChange={handleFileChange}
            className="border p-2 rounded w-full"
          />
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
