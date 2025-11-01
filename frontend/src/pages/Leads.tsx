import React, { useState, useEffect } from "react";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";

interface Lead {
  _id: string;
  name: string;
  email: string;
  phone: string;
  applicationToken: string | null;
}

interface Application {
  _id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
  companyName?: string;
  jobType?: string;
  mentorName?: string;
  mentorDesignation?: string;
  aadharFile?: string;
  resume?: string;
  bankPassbook?: string;
  pfFile?: string;
  referenceFile?: string;
  [key: string]: any;
}

const API_BASE = import.meta.env.VITE_API_BASE;

const fetchLeads = async (): Promise<Lead[]> => {
  const { data } = await axios.get<{ success: boolean; leads?: Lead[] }>(
    `${API_BASE}/leads`
  );
  return data.leads || [];
};

const fetchApplications = async (): Promise<Application[]> => {
  const { data } = await axios.get<{ success: boolean; applications: Application[] }>(
    `${API_BASE}/application`
  );
  return data.applications || [];
};

const Leads: React.FC = () => {
  const [formData, setFormData] = useState({ name: "", email: "", phone: "" });
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" | "" }>({
    text: "",
    type: "",
  });
  const [loading, setLoading] = useState(false);
  const [Verify, setVerify] = useState<"leads" | "applications">("leads");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Popup states
  const [editingApp, setEditingApp] = useState<Application | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<{ [key: string]: File | null }>({});
  const [showAssignPopup, setShowAssignPopup] = useState(false);
  const [assignData, setAssignData] = useState({
    companyName: "",
    jobType: "",
    mentorName: "",
    mentorDesignation: "",
    empId: "", // ✅ Added Employee ID
  });

  const [companies, setCompanies] = useState<{ name: string }[]>([]);

useEffect(() => {
  const fetchCompanies = async () => {
    try {
      const res = await axios.get(`${API_BASE}/settings/list`);
      console.log("Company API Response:", res.data);

      // Handle all possible API structures
      const raw =
        res.data.data ||
        res.data.settings ||
        res.data.result ||
        res.data.list ||
        res.data ||
        [];

      const list = Array.isArray(raw) ? raw : [];

      const companyList = list.map((item: any) => ({
        name: item.name || item.companyName || item.title || "Unnamed Company",
      }));

      setCompanies(companyList);
    } catch (err) {
      console.error("Error fetching companies:", err);
    }
  };

  fetchCompanies();
}, []);

  // Leads
  const { data: leads = [], refetch: refetchLeads } = useQuery({
    queryKey: ["students-leads"],
    queryFn: fetchLeads,
  });

  // Applications
  const { data: appsData = [], refetch: refetchApps } = useQuery({
    queryKey: ["students-applications"],
    queryFn: fetchApplications,
    enabled: false,
  });
  const [applications, setApplications] = useState<Application[]>([]);

  useEffect(() => {
    if (appsData.length && applications.length === 0) {
      setApplications(appsData);
    }
  }, [appsData, applications]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    setMessage({ text: "", type: "" });
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/leads`, formData);
      if (res.data.success) {
        setMessage({ text: "✅ Lead saved successfully!", type: "success" });
        setFormData({ name: "", email: "", phone: "" });
        refetchLeads();
      } else {
        setMessage({ text: res.data.message || "⚠️ Failed to save lead.", type: "error" });
      }
    } catch (err: any) {
      setMessage({ text: err.response?.data?.message || "❌ Error saving lead.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (link: string, leadId: string) => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = link;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopiedId(leadId);
    setTimeout(() => setCopiedId(null), 2000);
    try {
      await axios.post("/api/leads/store-link", { leadId, applicationLink: link });
    } catch (err) {
      console.error("Failed to store link:", err);
    }
  };

  const handleSaveClick = () => {
    setShowAssignPopup(true);
  };

  // ✅ Save application updates (text + files)
  const handleUpdateApplication = async () => {
    if (!editingApp) return;
    try {
      const formData = new FormData();

      Object.entries(editingApp).forEach(([key, value]) => {
        if (!["_id", "createdAt", "__v"].includes(key) && value != null) {
          if (["string", "number", "boolean"].includes(typeof value)) {
            formData.append(key, value.toString());
          }
        }
      });

      Object.entries(selectedFiles).forEach(([key, file]) => {
        if (file) formData.append(key, file);
      });

      await axios.put(`${API_BASE}/application/${editingApp._id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      alert("✅ Application updated successfully");
      setEditingApp(null);
      setSelectedFiles({});

      const { data } = await axios.get(`${API_BASE}/application`);
      setApplications(data.applications || []);
    } catch (err: any) {
      console.error("Update failed:", err.response || err);
      alert("❌ Failed to update application");
    }
  };

  // ✅ Assign Popup Submit
const handleAssignSubmit = async () => {
  if (!editingApp) return;

  try {
    const updatedApp = {
      ...editingApp,
      companyName: assignData.companyName,
      jobType: assignData.jobType,
      mentorName: assignData.mentorName,
      mentorDesignation: assignData.mentorDesignation,
      empId: assignData.empId, // ✅ include Employee ID
    };

    // ✅ Send update to backend
    const res = await axios.put(`${API_BASE}/application/${editingApp._id}`, updatedApp);

    if (res.data.success) {
      alert("✅ Application assigned successfully!");

      // ✅ Update the frontend state immediately for instant UI reflection
      setApplications((prev) =>
        prev.map((app) =>
          app._id === editingApp._id ? { ...app, ...updatedApp } : app
        )
      );

      // ✅ Clear popup state
      setShowAssignPopup(false);
      setEditingApp(null);
      setAssignData({
        companyName: "",
        jobType: "",
        mentorName: "",
        mentorDesignation: "",
        empId: "", // ✅ Added Employee ID
      });

      // ✅ Optional: re-fetch fresh data from backend to stay synced
      await refetchApps();
    } else {
      alert(res.data.message || "⚠️ Failed to assign application.");
    }
  } catch (err) {
    console.error("❌ Error assigning application:", err);
    alert("❌ Failed to update application assignment. Please try again.");
  }
};


  

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto bg-white rounded shadow">
      <h2 className="text-xl font-bold mb-4">📋 Manage Leads & Applications</h2>

      {/* Lead Form */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Name"
          className="border p-2 rounded flex-1 min-w-[150px]"
        />
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="Email"
          className="border p-2 rounded flex-1 min-w-[200px]"
        />
        <input
          type="tel"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          placeholder="Phone"
          className="border p-2 rounded flex-1 min-w-[150px]"
        />
        <button
          onClick={handleSubmit}
          disabled={loading}
          className={`px-4 py-2 rounded text-white ${
            loading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {loading ? "Saving..." : "Submit"}
        </button>
      </div>

      {message.text && (
        <p className={`mb-4 text-sm ${message.type === "success" ? "text-green-600" : "text-red-600"}`}>
          {message.text}
        </p>
      )}

      {/* Toggle */}
      <div className="flex gap-4 mb-4">
        <button
          onClick={() => setVerify("leads")}
          className={`px-4 py-2 rounded ${Verify === "leads" ? "bg-gray-800 text-white" : "bg-gray-200"}`}
        >
          Sent Links
        </button>
        <button
          onClick={() => {
            setVerify("applications");
            refetchApps();
          }}
          className={`px-4 py-2 rounded ${Verify === "applications" ? "bg-blue-800 text-white" : "bg-gray-200"}`}
        >
          Applications
        </button>
      </div>

      {/* Tables */}
      <div className="overflow-x-auto">
        {Verify === "leads" ? (
          <table className="table-auto w-full border text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-4 py-2">Name</th>
                <th className="border px-4 py-2">Email</th>
                <th className="border px-4 py-2">Phone</th>
                <th className="border px-4 py-2">Copy Link</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => {
                const baseUrl = API_BASE.replace("/api", "");
                const link = lead.applicationToken
                  ? `${baseUrl}/application?token=${lead.applicationToken}`
                  : "";

                return (
                  <tr key={lead._id}>
                    <td className="border px-4 py-2">{lead.name}</td>
                    <td className="border px-4 py-2">{lead.email}</td>
                    <td className="border px-4 py-2">{lead.phone}</td>
                    <td className="border px-4 py-2">
                      {link ? (
                        <button
                          onClick={() => copyToClipboard(link, lead._id)}
                          className={`px-3 py-1 rounded text-white ${
                            copiedId === lead._id ? "bg-green-500" : "bg-gray-500"
                          }`}
                        >
                          {copiedId === lead._id ? "Copied!" : "Copy"}
                        </button>
                      ) : (
                        <span className="text-gray-400">Used</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <table className="table-auto w-full border text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-4 py-2">Name</th>
                <th className="border px-4 py-2">Email</th>
                <th className="border px-4 py-2">Phone</th>
                <th className="border px-4 py-2">Created</th>
                <th className="border px-4 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
                <tr key={app._id}>
                  <td className="border px-4 py-2">{app.name}</td>
                  <td className="border px-4 py-2">{app.email}</td>
                  <td className="border px-4 py-2">{app.phone}</td>
                  <td className="border px-4 py-2">{new Date(app.createdAt).toLocaleDateString()}</td>
                  <td className="border px-4 py-2">
                    <button
                      onClick={() => setEditingApp(app)}
                      className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Verify
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
{/* ✅ Popup for Application Details */}
{editingApp && !showAssignPopup && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div className="bg-white w-full max-w-3xl max-h-[90vh] rounded shadow-lg flex flex-col overflow-y-auto">

      {/* Header */}
      <div className="flex justify-between items-center border-b p-4">
        <h3 className="text-lg font-semibold">Application Details</h3>
        <button
          onClick={() => setEditingApp(null)}
          className="text-gray-500 hover:text-gray-700"
        >
          ✖
        </button>
      </div>

      {/* Body */}
      <div className="p-4 flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Object.entries(editingApp).map(([key, value]) => {
            // Skip system fields + lead field
            if (["_id", "createdAt", "__v", "lead"].includes(key)) return null;

            // Fields that are download-only (Aadhar, Bank Passbook, PF, Resume)
            const downloadOnlyFields = ["aadharFile", "bankPassbook", "pfFile", "resume"];
            const isDownloadOnly = downloadOnlyFields.includes(key);

            if (isDownloadOnly) {
              // ✅ Download-only: show download link
              return (
                <div key={key}>
                  <label className="block text-sm font-medium capitalize mb-1">
                    {key.replace(/([A-Z])/g, " $1")}
                  </label>
                  {value ? (
                    <div className="flex items-center gap-2">
                      <a
                        href={`https://training-center-backend-d4sd.onrender.com${value.startsWith("/") ? value : "/" + value}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline text-sm flex items-center gap-1"
                      >
                        📄 Download {key.replace(/([A-Z])/g, " $1")}
                      </a>
                    </div>
                  ) : (
                    <p className="text-gray-400 text-sm">No file uploaded</p>
                  )}
                </div>
              );
            }

            // ReferenceFile as read-only text
            if (key === "referenceFile") {
              return (
                <div key={key}>
                  <label className="block text-sm font-medium capitalize mb-1">
                    {key.replace(/([A-Z])/g, " $1")}
                  </label>
                  <input
                    type="text"
                    value={value || ""}
                    readOnly
                    className="border p-2 w-full rounded bg-gray-100 text-gray-700"
                  />
                </div>
              );
            }

            // Editable text fields
            return (
              <div key={key}>
                <label className="block text-sm font-medium capitalize mb-1">
                  {key.replace(/([A-Z])/g, " $1")}
                </label>
                <input
                  type="text"
                  value={value || ""}
                  onChange={(e) =>
                    setEditingApp((prev) =>
                      prev ? { ...prev, [key]: e.target.value } : prev
                    )
                  }
                  className="border p-2 w-full rounded"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-2 border-t p-3">
        <button
          onClick={() => setEditingApp(null)}
          className="px-3 py-1 bg-gray-400 text-white rounded"
        >
          Cancel
        </button>
        <button
          onClick={handleUpdateApplication}
          className="px-3 py-1 bg-green-600 text-white rounded"
        >
          Update
        </button>
        <button
          onClick={handleSaveClick}
          className="px-3 py-1 bg-blue-600 text-white rounded"
        >
          Approve
        </button>
      </div>
    </div>
  </div>
)}




      {/* Popup for assigning */}
      {showAssignPopup && editingApp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white w-[90%] max-w-md rounded shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Assign Company, Job & Mentor</h3>
            <div className="space-y-4">
              <div>
          <label className="block mb-1 font-medium text-gray-700">
            Employee ID
          </label>
          <input
            type="text"
            value={assignData.empId || editingApp.empId || `EMP-${Math.floor(Math.random() * 10000)}`}
            readOnly
            className="border p-2 w-full rounded bg-gray-100 text-gray-700 cursor-not-allowed"
          />
        </div>
             <div>
  <label className="block mb-1 font-medium">Company Name</label>
 <select
  value={assignData.companyName}
  onChange={(e) => setAssignData({ ...assignData, companyName: e.target.value })}
  className="border p-2 w-full rounded"
>
  <option value="">-- Select Company --</option>
  {companies.length > 0 ? (
    companies.map((c, i) => (
      <option key={i} value={c.name}>
        {c.name}
      </option>
    ))
  ) : (
    <option disabled>No companies available</option>
  )}
</select>

</div>
              <div>
                <label className="block mb-1 font-medium">Job Type</label>
                <select
                  value={assignData.jobType}
                  onChange={(e) => setAssignData({ ...assignData, jobType: e.target.value })}
                  className="border p-2 w-full rounded"
                >
                  <option value="">-- Select Job Type --</option>
                  <option value="Internship">Internship</option>
                  <option value="Full Time">Full Time</option>
                </select>
              </div>
              <div>
                <label className="block mb-1 font-medium">Mentor Name</label>
                <input
                  type="text"
                  value={assignData.mentorName}
                  onChange={(e) => setAssignData({ ...assignData, mentorName: e.target.value })}
                  className="border p-2 w-full rounded"
                />
              </div>
              <div>
                <label className="block mb-1 font-medium">Mentor Designation</label>
                <input
                  type="text"
                  value={assignData.mentorDesignation}
                  onChange={(e) =>
                    setAssignData({ ...assignData, mentorDesignation: e.target.value })
                  }
                  className="border p-2 w-full rounded"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowAssignPopup(false)}
                className="px-3 py-1 bg-gray-400 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignSubmit}
                disabled={
                  !assignData.companyName ||
                  !assignData.jobType ||
                  !assignData.mentorName ||
                  !assignData.mentorDesignation
                }
                className={`px-3 py-1 rounded text-white ${
                  !assignData.companyName ||
                  !assignData.jobType ||
                  !assignData.mentorName ||
                  !assignData.mentorDesignation
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leads;
