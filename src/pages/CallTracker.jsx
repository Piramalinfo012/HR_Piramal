import React, { useState, useEffect } from "react";
import useDataStore from "../store/dataStore";
import { Search, X, Plus } from "lucide-react";
import { toast } from "react-hot-toast";

const CallTracker = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [tableLoading, setTableLoading] = useState(false);
  const [displayData, setDisplayData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

  const { callingTrackingData, isLoading: storeLoading, fetchSpecificSheets, error: storeError } = useDataStore();

  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    entryBy: "",
    applicantName: "",
    contactNo: "",
    role: "",
    portalUsed: "",
    location: "",
    stage: "",
    notes: "",
    feedback: "",
    status: ""
  });

  const generateTaskId = () => {
    if (!callingTrackingData || callingTrackingData.length < 2) return "TI-001";

    const taskIds = callingTrackingData.slice(1)
      .map(row => row[1]) // Column B is index 1
      .filter(id => id && id.startsWith("TI-"))
      .map(id => parseInt(id.replace("TI-", "")))
      .filter(num => !isNaN(num));

    if (taskIds.length === 0) return "TI-001";
    const maxId = Math.max(...taskIds);
    return `TI-${(maxId + 1).toString().padStart(3, '0')}`;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      entryBy: "",
      applicantName: "",
      contactNo: "",
      role: "",
      portalUsed: "",
      location: "",
      stage: "",
      notes: "",
      feedback: "",
      status: ""
    });
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, dateFilter]);

  useEffect(() => {
    // Silent refresh specifically for Calling Tracking data when this page loads
    // This allows showing cached data immediately while fetching updates
    fetchSpecificSheets({ callingTrackingData: "Calling Tracking" });
  }, [fetchSpecificSheets]);

  useEffect(() => {
    setTableLoading(storeLoading);
  }, [storeLoading]);

  useEffect(() => {
    console.log("Calling Tracking Data Update:", callingTrackingData);
    if (!callingTrackingData || callingTrackingData.length < 2) {
      setDisplayData([]);
      return;
    }

    // Skip header row and map to requested columns
    const processed = callingTrackingData.slice(1).map((row, idx) => ({
      id: idx,
      timestamp: row[0] || "",
      taskId: row[1] || "",
      entryBy: row[2] || "",
      applicantName: row[3] || "",
      contactName: row[4] || "",
      role: row[5] || "",
      portalUsed: row[6] || "",
      location: row[7] || "",
      stage: row[8] || "",
      notes: row[9] || "",
      feedback: row[10] || "",
      status: row[11] || ""
    }));

    setDisplayData(processed);
  }, [callingTrackingData]);

  const filteredRows = displayData.filter(item => {
    // 1. Search filter
    const term = searchTerm.toLowerCase();
    const matchesSearch = (
      (item.taskId || "").toLowerCase().includes(term) ||
      (item.applicantName || "").toLowerCase().includes(term) ||
      (item.entryBy || "").toLowerCase().includes(term) ||
      (item.role || "").toLowerCase().includes(term) ||
      (item.status || "").toLowerCase().includes(term)
    );

    if (!matchesSearch) return false;

    // 2. Date filter
    if (dateFilter === "all") return true;

    if (!item.timestamp) return false;

    const recordDate = new Date(item.timestamp);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const recordDateOnly = new Date(recordDate);
    recordDateOnly.setHours(0, 0, 0, 0);

    if (dateFilter === "today") {
      return recordDateOnly.getTime() === today.getTime();
    }

    if (dateFilter === "yesterday") {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return recordDateOnly.getTime() === yesterday.getTime();
    }

    if (dateFilter === "monthly") {
      const lastMonth = new Date(today);
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      return recordDate >= lastMonth;
    }

    return true;
  });

  const totalPages = Math.ceil(filteredRows.length / recordsPerPage);
  const paginatedRows = filteredRows.slice(
    (currentPage - 1) * recordsPerPage,
    currentPage * recordsPerPage
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const now = new Date();
      const timestamp = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()} ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
      const taskId = generateTaskId();

      const rowData = [
        timestamp,            // Column A
        taskId,               // Column B
        formData.entryBy,     // Column C
        formData.applicantName, // Column D
        formData.contactNo,   // Column E
        formData.role,        // Column F
        formData.portalUsed,  // Column G
        formData.location,    // Column H
        formData.stage,       // Column I
        formData.notes,       // Column J
        formData.feedback,    // Column K
        formData.status       // Column L
      ];

      const res = await fetch(import.meta.env.VITE_GOOGLE_SHEET_URL, {
        method: "POST",
        body: new URLSearchParams({
          sheetName: "Calling Tracking",
          action: "bulkInsert",
          rowsData: JSON.stringify([rowData])
        })
      });

      const json = await res.json();
      if (json.success) {
        toast.success("Task added successfully!");
        setShowModal(false);
        resetForm();
        fetchSpecificSheets({ callingTrackingData: "Calling Tracking" });
      } else {
        toast.error("Submit failed: " + (json.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Submit Error:", error);
      toast.error("Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 page-content p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Call Tracker Data</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm transition-colors"
          >
            <Plus size={18} />
            Add New Task
          </button>
          <button
            onClick={() => fetchSpecificSheets({ callingTrackingData: "Calling Tracking" })}
            disabled={tableLoading}
            className="flex items-center gap-2 px-4 py-2 bg-navy text-white rounded-lg hover:bg-navy-dark text-sm transition-colors disabled:bg-gray-400"
          >
            {tableLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Refreshing...
              </>
            ) : "Refresh Data"}
          </button>
          <div className="relative w-full md:w-64">
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy bg-gray-50 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy bg-gray-50 text-sm outline-none"
          >
            <option value="all">All Data</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="monthly">One Month</option>
          </select>
          <button
            onClick={() => setSearchTerm("")}
            className="p-2 text-gray-400 hover:text-navy transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden p-6">
        <div className="overflow-x-auto max-h-[calc(100vh-250px)] overflow-y-auto table-container">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Task ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Entry By</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Applicant Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Contact Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Portal Used</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Stage</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Notes</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Feedback</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 relative">
              {paginatedRows.length === 0 ? (
                tableLoading ? (
                  <tr><td colSpan="11" className="px-6 py-12 text-center text-gray-500">Loading initial data...</td></tr>
                ) : storeError ? (
                  <tr><td colSpan="11" className="px-6 py-12 text-center text-red-500 font-medium">Error: {storeError}</td></tr>
                ) : (
                  <tr><td colSpan="11" className="px-6 py-12 text-center text-gray-500">No data found in 'Calling Tracking'</td></tr>
                )
              ) : (
                paginatedRows.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-navy">{item.taskId}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.entryBy}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.applicantName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.contactName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.role}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.portalUsed}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.location}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.stage}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{item.notes}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{item.feedback}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.status?.toLowerCase() === 'closed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {filteredRows.length > 0 && (
          <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200 bg-gray-50">
            <div className="flex flex-1 justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{(currentPage - 1) * recordsPerPage + 1}</span> to <span className="font-medium">{Math.min(currentPage * recordsPerPage, filteredRows.length)}</span> of{' '}
                  <span className="font-medium">{filteredRows.length}</span> results
                </p>
              </div>
              <div>
                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:bg-gray-100 disabled:text-gray-300"
                  >
                    <span className="sr-only">Previous</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <div className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 focus:z-20 focus:outline-offset-0">
                    Page {currentPage} of {totalPages}
                  </div>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:bg-gray-100 disabled:text-gray-300"
                  >
                    <span className="sr-only">Next</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-gray-800">Add New Task</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700 transition-colors">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Entry By</label>
                  <input
                    name="entryBy"
                    value={formData.entryBy}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy"
                    placeholder="Enter name..."
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Applicant Name</label>
                  <input
                    name="applicantName"
                    value={formData.applicantName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy"
                    placeholder="Enter name..."
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact No.</label>
                  <input
                    name="contactNo"
                    value={formData.contactNo}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy"
                    placeholder="Enter number..."
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <input
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy"
                    placeholder="Enter role..."
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Portal Used</label>
                  <input
                    name="portalUsed"
                    value={formData.portalUsed}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy"
                    placeholder="Enter portal..."
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy"
                    placeholder="Enter location..."
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
                  <input
                    name="stage"
                    value={formData.stage}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy"
                    placeholder="Enter stage..."
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <input
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy"
                    placeholder="Enter status..."
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy h-20"
                  placeholder="Enter notes..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Feedback</label>
                <textarea
                  name="feedback"
                  value={formData.feedback}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy h-20"
                  placeholder="Enter feedback..."
                />
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-navy text-white rounded-lg hover:bg-navy-dark transition-colors disabled:bg-gray-400"
                  disabled={submitting}
                >
                  {submitting ? "Adding..." : "Add Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CallTracker;
