import React, { useState, useEffect } from "react";
import axios from "axios";

const Settings = () => {
  const [formData, setFormData] = useState({
    companyName: "",
    logoAlignment: "left",
    address: "",
    authorizedPerson: "",
    authorizedDesignation: "", // ✅ new field
    purpose: "",
    place: "", // ✅ new field
    phone: "",
    email: "",
  });

  const [companyLogo, setCompanyLogo] = useState(null);
  const [stamp, setStamp] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const res = await axios.get("https://training-center-backend-d4sd.onrender.com/api/settings");
      setCompanies(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error fetching companies:", err);
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleFileChange = (e, type) => {
    const file = e.target.files?.[0] || null;
    if (type === "logo") setCompanyLogo(file);
    if (type === "stamp") setStamp(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = new FormData();
      Object.keys(formData).forEach((key) => data.append(key, formData[key]));
      if (companyLogo) data.append("companyLogo", companyLogo);
      if (stamp) data.append("stamp", stamp);

      const res = await axios.post("https://training-center-backend-d4sd.onrender.com/api/settings", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      alert(res.data.message);
      await fetchCompanies();
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Failed to save settings.");
    }
  };

  const handleSelectCompany = (e) => {
    const selected = companies.find((c) => c.companyName === e.target.value);
    if (selected) {
      setFormData({
        companyName: selected.companyName,
        logoAlignment: selected.logoAlignment,
        address: selected.address,
        authorizedPerson: selected.authorizedPerson,
        authorizedDesignation: selected.authorizedDesignation || "",
        purpose: selected.purpose || "",
        place: selected.place || "",
        phone: selected.phone || "",
        email: selected.email || "",
      });
    } else {
      setFormData({
        companyName: "",
        logoAlignment: "left",
        address: "",
        authorizedPerson: "",
        authorizedDesignation: "",
        purpose: "",
        place: "",
        phone: "",
        email: "",
      });
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto bg-white shadow rounded-lg">
      <h1 className="text-2xl font-semibold mb-6 text-gray-800">Company Settings</h1>

      {/* Select Company */}
      <div className="mb-6">
        <label className="block text-gray-700 mb-2 font-medium">Select Company</label>
        {loading ? (
          <p className="text-gray-500">Loading companies...</p>
        ) : companies.length > 0 ? (
          <select
            className="w-full border rounded-lg px-3 py-2 focus:ring focus:ring-blue-300"
            onChange={handleSelectCompany}
            value={formData.companyName}
          >
            <option value="">-- Select Company --</option>
            {companies.map((c) => (
              <option key={c._id} value={c.companyName}>
                {c.companyName}
              </option>
            ))}
          </select>
        ) : (
          <p className="text-gray-600">No companies found.</p>
        )}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input label="Company Name" name="companyName" value={formData.companyName} onChange={handleChange} required />
        <FileInput label="Company Logo" onChange={(e) => handleFileChange(e, "logo")} preview={companyLogo} />
        <Select
          label="Logo Alignment"
          name="logoAlignment"
          value={formData.logoAlignment}
          onChange={handleChange}
          options={["left", "center", "right"]}
        />
        <Textarea label="Address" name="address" value={formData.address} onChange={handleChange} />
        <FileInput label="Stamp" onChange={(e) => handleFileChange(e, "stamp")} preview={stamp} />
        <Input label="Authorized Person" name="authorizedPerson" value={formData.authorizedPerson} onChange={handleChange} />
        <Input label="Authorized Designation" name="authorizedDesignation" value={formData.authorizedDesignation} onChange={handleChange} />
        
        {/* ✅ Purpose Dropdown */}
        <Select
          label="Purpose"
          name="purpose"
          value={formData.purpose}
          onChange={handleChange}
          options={[
            "",
            "Higher Studies",
            "Applying for Visa",
            "Job Change",
            "Address Verification",
            "Loan Application",
          ]}
        />
        <Input label="Place" name="place" value={formData.place} onChange={handleChange} />
        <Input label="Phone" name="phone" value={formData.phone} onChange={handleChange} />
        <Input label="Email" name="email" value={formData.email} onChange={handleChange} type="email" />

        <div className="flex justify-end">
          <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Save / Update
          </button>
        </div>
      </form>
    </div>
  );
};

// Small UI Components
const Input = ({ label, ...props }) => (
  <div>
    <label className="block text-gray-700 mb-2 font-medium">{label}</label>
    <input {...props} className="w-full border rounded-lg px-3 py-2 focus:ring focus:ring-blue-300" />
  </div>
);

const Textarea = ({ label, ...props }) => (
  <div>
    <label className="block text-gray-700 mb-2 font-medium">{label}</label>
    <textarea {...props} className="w-full border rounded-lg px-3 py-2 focus:ring focus:ring-blue-300" rows={3} />
  </div>
);

const FileInput = ({ label, onChange, preview }) => (
  <div>
    <label className="block text-gray-700 mb-2 font-medium">{label}</label>
    <input type="file" accept="image/*" onChange={onChange} className="w-full text-gray-600" />
    {preview && <img src={URL.createObjectURL(preview)} alt="Preview" className="mt-3 h-16 object-contain" />}
  </div>
);

const Select = ({ label, name, value, onChange, options }) => (
  <div>
    <label className="block text-gray-700 mb-2 font-medium">{label}</label>
    <select
      name={name}
      value={value}
      onChange={onChange}
      className="w-full border rounded-lg px-3 py-2 focus:ring focus:ring-blue-300"
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt ? opt : "-- Select --"}
        </option>
      ))}
    </select>
  </div>
);

export default Settings;
