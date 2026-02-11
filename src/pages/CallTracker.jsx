import React, { useState, useEffect } from "react";

import { Search, X, Plus } from "lucide-react";
import { toast } from "react-hot-toast";

const CallTracker = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [tableLoading, setTableLoading] = useState(false);
  const [displayData, setDisplayData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [nextTaskId, setNextTaskId] = useState("TI-001");
  const [users, setUsers] = useState([]);

  const recordsPerPage = 100;

  // Local State
  const [callingTrackingData, setCallingTrackingData] = useState([]);
  const FETCH_URL = import.meta.env.VITE_GOOGLE_SHEET_URL;

  const fetchCallingTrackingData = async () => {
    try {
      const cb = `&_=${Date.now()}`;
      const res = await fetch(`${FETCH_URL}?sheet=Calling Tracking&action=fetch${cb}`);
      const json = await res.json();
      if (json.success && json.data) {
        setCallingTrackingData(json.data);
      }
    } catch (error) {
      console.error("Failed to fetch calling tracking data for counts", error);
    }
  };

  useEffect(() => {
    // Get fresh data for counts on mount
    fetchCallingTrackingData();
  }, []);
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_GOOGLE_SHEET_URL}?sheet=USER&action=fetch`
      );
      const json = await res.json();

      if (json.success && json.data) {
        // Column I = index 8
        const entryByList = json.data
          .slice(1)                 // remove header
          .map(row => row[8])       // column I
          .filter(Boolean);         // remove empty values

        setUsers(entryByList);
      }
    } catch (err) {
      console.error("Failed to fetch users", err);
      toast.error("Failed to load Entry By users");
    }
  };

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

  // Debounced Search and Fetch
  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, dateFilter, currentPage]);

  const loadData = async () => {
    setTableLoading(true);
    let result = { success: false, data: [] };
    try {
      const cb = `&_=${Date.now()}`;
      const url = `${FETCH_URL}?sheet=${encodeURIComponent("Calling Tracking")}&action=fetchPaginated&page=${currentPage}&limit=${recordsPerPage}&search=${encodeURIComponent(searchTerm)}&dateFilter=${encodeURIComponent(dateFilter)}${cb}`;
      const res = await fetch(url);
      result = await res.json();
    } catch (error) {
      console.error("Pagination Fetch Error:", error);
      result = { success: false, error: error.message };
    }

    if (result.success && result.data) {
      // Map data (Assuming server returns array of arrays)
      const processed = result.data.map((row, idx) => ({
        id: (currentPage - 1) * recordsPerPage + idx,
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
      setTotalRecords(result.totalRows || 0);
      if (result.nextTaskId) setNextTaskId(result.nextTaskId);
    } else {
      toast.error(result.error || "Failed to load data");
      setDisplayData([]);
    }
    setTableLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const now = new Date();
      const timestamp = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()} ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
      // Use the server-provided next ID or fallback
      const taskId = nextTaskId;

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
        loadData(); // Refresh current page
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

  const totalPages = Math.ceil(totalRecords / recordsPerPage);

  // Calculate filter counts
  const filterCounts = React.useMemo(() => {
    if (!callingTrackingData || callingTrackingData.length < 2) {
      return { all: 0, today: 0, yesterday: 0, monthly: 0 };
    }

    const dataRows = callingTrackingData.slice(1);
    const now = new Date();

    const parseTimestamp = (ts) => {
      if (!ts) return null;
      let d = new Date(ts);
      if (!isNaN(d.getTime())) return d;

      // Manually parse DD/MM/YYYY or M/D/YYYY if standard parse fails
      const datePart = ts.split(' ')[0];
      const parts = datePart.split('/');
      if (parts.length === 3) {
        // Try assuming DD/MM/YYYY first as it's common in HR sheets
        const p0 = parseInt(parts[0], 10);
        const p1 = parseInt(parts[1], 10) - 1;
        const p2 = parseInt(parts[2], 10);

        // If it looks like year is first (YYYY/MM/DD)
        if (p0 > 1000) d = new Date(p0, p1, p2);
        else d = new Date(p2, p1, p0);

        if (!isNaN(d.getTime())) return d;
      }
      return null;
    };

    const isSameDay = (d1, d2) => {
      return d1 && d2 &&
        d1.getDate() === d2.getDate() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getFullYear() === d2.getFullYear();
    };

    const counts = {
      all: dataRows.length,
      today: 0,
      yesterday: 0,
      monthly: 0
    };

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);

    const oneMonthAgo = new Date(now);
    oneMonthAgo.setMonth(now.getMonth() - 1);

    dataRows.forEach(row => {
      const timestampStr = row[0];
      const d = parseTimestamp(timestampStr);

      if (d) {
        if (isSameDay(d, now)) counts.today++;
        if (isSameDay(d, yesterday)) counts.yesterday++;
        if (d >= oneMonthAgo) counts.monthly++;
      }
    });

    return counts;
  }, [callingTrackingData]);

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
            onClick={loadData}
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
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1); // Reset to page 1 on search
              }}
            />
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>
          <select
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy bg-gray-50 text-sm outline-none"
          >
            <option value="all">All Data</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="monthly">One Month</option>
          </select>
          <button
            onClick={() => { setSearchTerm(""); setCurrentPage(1); }}
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
              {displayData.length === 0 ? (
                tableLoading ? (
                  <tr><td colSpan="11" className="px-6 py-12 text-center text-gray-500">Loading data...</td></tr>
                ) : (
                  <tr><td colSpan="11" className="px-6 py-12 text-center text-gray-500">No data found</td></tr>
                )
              ) : (
                displayData.map((item) => (
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
              disabled={currentPage === totalPages || totalPages === 0}
              className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{(currentPage - 1) * recordsPerPage + 1}</span> to <span className="font-medium">{Math.min(currentPage * recordsPerPage, totalRecords)}</span> of{' '}
                <span className="font-medium">{totalRecords}</span> results
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
                  Page {currentPage} of {Math.max(totalPages, 1)}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages || totalPages === 0}
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
      </div>

      {/* Modal code remains largely unchanged but ensures correct logic */}
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
                  <select
                    name="entryBy"
                    value={formData.entryBy}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy"
                    required
                  >
                    <option value="">Select Entry By</option>
                    {users.map((user, idx) => (
                      <option key={idx} value={user}>
                        {user}
                      </option>
                    ))}
                  </select>

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
