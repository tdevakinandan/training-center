import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useState } from "react";

interface Application {
  _id: string;
  name: string;
  email: string;
  phone: string;
  companyName: string;
  jobType: string;
  mentorName?: string;
  mentorDesignation?: string;
  joiningDate?: string;
  relievingDate?: string;
  department?: string;
  offerDate?: string;
  appointmentDate?: string;
  experienceDate?: string;
  internshipDate?: string; // ✅ added for internship
  payslipDate?: string;
  nocDate?: string;
}

interface UpdateDateInput {
  id: string;
  type:
    | "offer-letter"
    | "appointment-letter"
    | "experience-letter"
    | "certificate"
    | "payslip"
    | "noc";
  date: string;
}

// 🔹 Fetch all applications
const fetchApplications = async (): Promise<Application[]> => {
  const { data } = await axios.get("/api/application");
  return data.applications || [];
};

const Employee = () => {
  const queryClient = useQueryClient();

  // 🔹 Fetch applications
  const { data: applications = [], isLoading } = useQuery({
    queryKey: ["applications"],
    queryFn: fetchApplications,
  });

  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [downloading, setDownloading] = useState(false);

  // 🔹 Update document date mutation (✅ updated)
  const updateDateMutation = useMutation({
    mutationFn: async ({ id, type, date }: UpdateDateInput) => {
      const { data } = await axios.patch(`/api/application/${id}/document-date`, {
        type,
        date,
      });
      return data.application; // ✅ Return updated application
    },
    onSuccess: (updatedApp) => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      alert("✅ Date saved successfully!");

      // ✅ Instantly reflect updated date in UI
      setSelectedApp((prev) =>
        prev && prev._id === updatedApp._id ? updatedApp : prev
      );
    },
    onError: (err: any) => {
      console.error("Date update error:", err);
      alert("❌ Failed to save date. Please try again.");
    },
  });

  // 🔹 Handle file download
  const handleDownload = async (app: Application, type: string) => {
    try {
      setDownloading(true);
      const response = await axios.post(
        `/api/application/${type}/${app._id}`,
        {},
        { responseType: "blob" }
      );

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${app.name}_${type}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download error:", err);
      alert("❌ Failed to download document.");
    } finally {
      setDownloading(false);
    }
  };

  // 🔹 When user changes a document date
  const handleDateChange = (
    id: string,
    type: UpdateDateInput["type"],
    date: string
  ) => {
    updateDateMutation.mutate({ id, type, date });
  };

  // -------------------------------
  // 🔹 UI Rendering
  // -------------------------------
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto bg-white rounded shadow">
      <h2 className="text-xl font-bold mb-4">👥 Enrolled Employees</h2>

      {isLoading ? (
        <p>Loading...</p>
      ) : applications.length === 0 ? (
        <p>No employees enrolled yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="table-auto w-full border text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-4 py-2">Name</th>
                <th className="border px-4 py-2">Email</th>
                <th className="border px-4 py-2">Phone</th>
                <th className="border px-4 py-2">Company</th>
                <th className="border px-4 py-2">Job Type</th>
                <th className="border px-4 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
                <tr key={app._id}>
                  <td className="border px-4 py-2">{app.name}</td>
                  <td className="border px-4 py-2">{app.email}</td>
                  <td className="border px-4 py-2">{app.phone}</td>
                  <td className="border px-4 py-2">{app.companyName}</td>
                  <td className="border px-4 py-2">{app.jobType}</td>
                  <td className="border px-4 py-2 text-center">
                    <button
                      className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                      onClick={() => setSelectedApp(app)}
                    >
                      View Document
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 🔹 Popup for selected employee */}
      {selectedApp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white w-[95%] max-w-md rounded shadow-lg p-6 flex flex-col">
            <h3 className="text-lg font-semibold mb-4">
              {selectedApp.jobType === "Internship"
                ? "Download Certificate"
                : "Employee Documents"}
            </h3>

            <p className="mb-4">
              <strong>{selectedApp.name}</strong>
              <br />
              <span className="text-sm text-gray-600">
                ({selectedApp.companyName} - {selectedApp.jobType})
              </span>
            </p>

            {/* 🔸 Internship — only one certificate */}
            {selectedApp.jobType === "Internship" ? (
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={() => handleDownload(selectedApp, "certificate")}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                  disabled={downloading}
                >
                  {downloading ? "Generating..." : "Download Certificate"}
                </button>

                <input
                  type="date"
                  className="border px-2 py-1 rounded text-sm"
                  value={selectedApp.internshipDate || ""}
                  onChange={(e) =>
                    handleDateChange(selectedApp._id, "certificate", e.target.value)
                  }
                />
              </div>
            ) : (
              /* 🔸 Full-Time — multiple documents with date inputs */
              <div className="flex flex-col gap-3 mb-4">
                {(
                  [
                    "offer-letter",
                    "appointment-letter",
                    "experience-letter",
                    "payslip",
                    "noc",
                  ] as const
                ).map((type) => {
                  const typeLabel =
                    type === "offer-letter"
                      ? "Offer Letter"
                      : type === "appointment-letter"
                      ? "Appointment Letter"
                      : type === "experience-letter"
                      ? "Experience Letter"
                      : type === "payslip"
                      ? "Payslip"
                      : "NOC";

                  // ✅ Choose button color
                  const colorClass =
                    type === "offer-letter"
                      ? "bg-green-600 hover:bg-green-700"
                      : type === "appointment-letter"
                      ? "bg-blue-600 hover:bg-blue-700"
                      : type === "experience-letter"
                      ? "bg-orange-600 hover:bg-orange-700"
                      : type === "payslip"
                      ? "bg-purple-600 hover:bg-purple-700"
                      : "bg-red-600 hover:bg-red-700";

                  // ✅ Pick correct date value
                  const dateValue =
                    type === "offer-letter"
                      ? selectedApp.offerDate || ""
                      : type === "appointment-letter"
                      ? selectedApp.appointmentDate || ""
                      : type === "experience-letter"
                      ? selectedApp.experienceDate || ""
                      : type === "payslip"
                      ? selectedApp.payslipDate || ""
                      : selectedApp.nocDate || "";

                  return (
                    <div key={type} className="flex items-center gap-2">
                      <button
                        onClick={() => handleDownload(selectedApp, type)}
                        className={`px-4 py-2 rounded text-white ${colorClass} disabled:opacity-50`}
                        disabled={downloading}
                      >
                        {downloading ? "Generating..." : typeLabel}
                      </button>

                      {/* ✅ Date input for each document */}
                      <input
                        type="date"
                        className="border px-2 py-1 rounded text-sm"
                        value={dateValue}
                        onChange={(e) =>
                          handleDateChange(selectedApp._id, type, e.target.value)
                        }
                      />
                    </div>
                  );
                })}
              </div>
            )}

            <button
              onClick={() => setSelectedApp(null)}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              disabled={downloading}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Employee;
