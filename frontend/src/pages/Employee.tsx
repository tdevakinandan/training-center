import { useQuery } from "@tanstack/react-query";
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
}

const fetchApplications = async (): Promise<Application[]> => {
  const { data } = await axios.get("/api/application");
  return data.applications || [];
};

const Employee = () => {
  const { data: applications = [], isLoading } = useQuery({
    queryKey: ["applications"],
    queryFn: fetchApplications,
  });

  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async (app: Application) => {
    try {
      setDownloading(true);
      const response = await axios.post(
        `/api/application/certificate/${app._id}`,
        {},
        { responseType: "blob" }
      );

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${app.name}_Certificate.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download error:", err);
      alert("Failed to download certificate");
    } finally {
      setDownloading(false);
    }
  };

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
                  <td className="border px-4 py-2">
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

      {selectedApp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white w-[95%] max-w-md rounded shadow-lg p-6 flex flex-col">
            <h3 className="text-lg font-semibold mb-4">Download Certificate</h3>
            <p className="mb-4">
              Download PDF for <strong>{selectedApp.name}</strong>
              <br />
              <span className="text-sm text-gray-600">
                ({selectedApp.companyName} - {selectedApp.jobType})
              </span>
            </p>
            <button
              onClick={() => handleDownload(selectedApp)}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 mb-4 disabled:opacity-50"
              disabled={downloading}
            >
              {downloading ? "Generating..." : "Download PDF"}
            </button>
            <button
              onClick={() => setSelectedApp(null)}
              className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
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
