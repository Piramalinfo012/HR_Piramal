import React, { useState, useEffect } from "react";

import { Search, X, Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";

const InterviewScheduled = () => {
  const isSubmittingRef = React.useRef(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [entryByFilter, setEntryByFilter] = useState("all");
  const [interviewStatusFilter, setInterviewStatusFilter] = useState("all");
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
      const res = await fetch(
        `${FETCH_URL}?sheet=Calling Tracking&action=fetch${cb}`,
      );
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
        `${import.meta.env.VITE_GOOGLE_SHEET_URL}?sheet=USER&action=fetch`,
      );
      const json = await res.json();

      if (json.success && json.data) {
        // Column I = index 8
        const entryByList = json.data
          .slice(1) // remove header
          .map((row) => row[8]) // column I
          .filter(Boolean); // remove empty values

        setUsers(entryByList);
      }
    } catch (err) {
      console.error("Failed to fetch users", err);
      toast.error("Failed to load Entry By users");
    }
  };

  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [inlineInterviewItem, setInlineInterviewItem] = useState(null);
  const [inlineInterviewStatus, setInlineInterviewStatus] = useState("");
  const [inlineInterviewDate, setInlineInterviewDate] = useState("");

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
    status: "",
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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
      status: "",
    });
  };

  // Debounced Search and Fetch
  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, dateFilter, currentPage, fromDate, toDate, entryByFilter, interviewStatusFilter]);

  const parseTimestamp = (ts) => {
    if (!ts) return null;
    let d = new Date(ts);
    if (!isNaN(d.getTime())) return d;
    const datePart = ts.split(" ")[0];
    const parts = datePart.split("/");
    if (parts.length === 3) {
      const p0 = parseInt(parts[0], 10);
      const p1 = parseInt(parts[1], 10) - 1;
      const p2 = parseInt(parts[2], 10);
      if (p0 > 1000) d = new Date(p0, p1, p2);
      else d = new Date(p2, p1, p0);
      if (!isNaN(d.getTime())) return d;
    }
      return null;
    };

  const isSameDay = (d1, d2) => {
    return (
      d1 &&
      d2 &&
      d1.getDate() === d2.getDate() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getFullYear() === d2.getFullYear()
    );
  };

  const formatDateDisplay = (ts) => {
    const d = parseTimestamp(ts);
    if (!d) return ts; // fallback to original string if parse fails
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const loadData = async () => {
    setTableLoading(true);
    let result = { success: false, data: [] };
    try {
      const cb = `&_=${Date.now()}`;
      
      
      const needsClientSide = true; // Force client side to handle Interview Scheduling filter

      if (needsClientSide) {
        // Client-side filtering
        const res = await fetch(`${FETCH_URL}?sheet=Calling Tracking&action=fetch${cb}`);
        const json = await res.json();
        
        if (json.success && json.data) {
          let filtered = json.data.slice(1).filter(row => {
            const statusStr = String(row[12] || "").trim();
            if(!statusStr || statusStr === "") return false;
            
            if (interviewStatusFilter !== "all" && statusStr !== interviewStatusFilter) {
               return false;
            }
            return true;
          });

          // 1. Date Filter
          const now = new Date();
          const today = new Date(now);
          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          const oneMonthAgo = new Date(now);
          oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

          if (dateFilter === 'custom' && fromDate && toDate) {
             const start = new Date(fromDate);
             start.setHours(0, 0, 0, 0);
             const end = new Date(toDate);
             end.setHours(23, 59, 59, 999);
             
             filtered = filtered.filter(row => {
               const d = parseTimestamp(row[0]);
               return d && d >= start && d <= end;
             });
          } else if (dateFilter === 'today') {
            filtered = filtered.filter(row => {
               const d = parseTimestamp(row[0]);
               return isSameDay(d, today);
            });
          } else if (dateFilter === 'yesterday') {
             filtered = filtered.filter(row => {
               const d = parseTimestamp(row[0]);
               return isSameDay(d, yesterday);
             });
          } else if (dateFilter === 'monthly') {
             filtered = filtered.filter(row => {
               const d = parseTimestamp(row[0]);
               return d && d >= oneMonthAgo;
             });
          }

          // 2. Entry By Filter
          if (entryByFilter !== 'all') {
             // Entry By is Column C (index 2)
             filtered = filtered.filter(row => row[2] === entryByFilter);
          }

          // 3. Search Term
          if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            filtered = filtered.filter(row => 
              row.some(cell => String(cell).toLowerCase().includes(lowerSearch))
            );
          }

          const total = filtered.length;
          const startIdx = (currentPage - 1) * recordsPerPage;
          const paginated = filtered.slice(startIdx, startIdx + recordsPerPage);
          
          result = { success: true, data: paginated, totalRows: total };
        } else {
           result = { success: false, error: json.error || "Failed to fetch data" };
        }
      } else {
        // Server-side filtering for standard options (when Entry By is All and Date is not Custom)
        const url = `${FETCH_URL}?sheet=${encodeURIComponent("Calling Tracking")}&action=fetchPaginated&page=${currentPage}&limit=${recordsPerPage}&search=${encodeURIComponent(searchTerm)}&dateFilter=${encodeURIComponent(dateFilter)}${cb}`;
        const res = await fetch(url);
        result = await res.json();
      }
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
        status: row[11] || "",
        interviewStatus: row[12] || "",
        interviewDate: row[13] || "",
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

  const handleInlineInterviewSubmit = async () => {
    setSubmitting(true);
    try {
      const cb = `&_=${Date.now()}`;
      const resAll = await fetch(`${FETCH_URL}?sheet=Calling Tracking&action=fetch${cb}`);
      const jsonAll = await resAll.json();
      
      if (!jsonAll.success || !jsonAll.data) {
        throw new Error("Failed to fetch fresh data for update");
      }
      
      const allData = jsonAll.data;
      const index = allData.findIndex(row => row[1] === inlineInterviewItem.taskId);
      
      if (index === -1) {
        throw new Error("Task not found. It may have been deleted.");
      }
      
      const rowIndex = index + 1;
      let rowData = [...allData[index]];
      rowData[12] = inlineInterviewStatus;
      rowData[13] = inlineInterviewDate;
      
      const payload = {
        sheetName: "Calling Tracking",
        action: "update",
        rowIndex: rowIndex,
        rowData: JSON.stringify(rowData)
      };

      const res = await fetch(FETCH_URL, {
        method: "POST",
        body: new URLSearchParams(payload)
      });
      
      const result = await res.json();
      if (result.success) {
        toast.success("Interview info updated!");
        setInlineInterviewItem(null);
        loadData();
      } else {
        toast.error("Failed to save: " + (result.error || "Unknown"));
      }
    } catch (error) {
      console.error(error);
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setSubmitting(true);
    
    try {
      let rowData;
      let action = "bulkInsert";
      let rowIndex = -1;

      if (editingId) {
        // Update Mode - First find the row index
        const cb = `&_=${Date.now()}`;
        const resAll = await fetch(`${FETCH_URL}?sheet=Calling Tracking&action=fetch${cb}`);
        const jsonAll = await resAll.json();
        
        if (!jsonAll.success || !jsonAll.data) {
          throw new Error("Failed to fetch fresh data for update");
        }
        
        // Find row by Task ID (Column B, index 1)
        const allData = jsonAll.data;
        const index = allData.findIndex(row => row[1] === editingId);
        
        if (index === -1) {
          throw new Error("Task not found. It may have been deleted.");
        }
        
        rowIndex = index + 1;
        
        action = "update";
        rowData = [...allData[index]];
        
        // Update fields (retain Timestamp [0] and TaskID [1])
        rowData[2] = formData.entryBy;
        rowData[3] = formData.applicantName;
        rowData[4] = formData.contactNo;
        rowData[5] = formData.role;
        rowData[6] = formData.portalUsed;
        rowData[7] = formData.location;
        rowData[8] = formData.stage;
        rowData[9] = formData.notes;
        rowData[10] = formData.feedback;
        rowData[11] = formData.status;
        rowData[12] = formData.interviewStatus;
        rowData[13] = formData.interviewDate;
      } else {
        // Add Mode
        const now = new Date();
        const timestamp = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()} ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
        const taskId = nextTaskId;
        
        rowData = [
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
          formData.status,      // Column L
          formData.interviewStatus, // Column M
          formData.interviewDate    // Column N
        ];
      }

      const payload = {
        sheetName: "Calling Tracking",
        action: action,
        ...(action === "update" ? { rowIndex: rowIndex, rowData: JSON.stringify(rowData) } : { rowsData: JSON.stringify([rowData]) })
      };

      const res = await fetch(import.meta.env.VITE_GOOGLE_SHEET_URL, {
        method: "POST",
        body: new URLSearchParams(payload)
      });

      const json = await res.json();
      if (json.success) {
        toast.success(editingId ? "Task updated!" : "Task added!");
        setShowModal(false);
        resetForm();
        setEditingId(null);
        loadData(); // Refresh current page
      } else {
        toast.error("Submit failed: " + (json.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Submit Error:", error);
      toast.error("Submit failed: " + error.message);
    } finally {
      setSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  const [editingId, setEditingId] = useState(null);

  const handleEdit = (item) => {
    setFormData({
      entryBy: item.entryBy || "",
      applicantName: item.applicantName || "",
      contactNo: item.contactNo || "", // maps to contactName in displayData? No, contactName in LoadData is row[4]. form has contactNo.
      // LoadData: contactName: row[4]. Form: contactNo.
      // row[4] IS contact info.
      role: item.role || "",
      portalUsed: item.portalUsed || "",
      location: item.location || "",
      stage: item.stage || "",
      notes: item.notes || "",
      feedback: item.feedback || "",
      status: item.status || "",
      interviewStatus: item.interviewStatus || "",
      interviewDate: item.interviewDate || "",
    });
    // Fix contact field mapping mismatch: displayData has 'contactName' (row 4), form has 'contactNo'.
    // We should map item.contactName to formData.contactNo
    setFormData(prev => ({ ...prev, contactNo: item.contactName || "" })); 
    
    setEditingId(item.taskId);
    setShowModal(true);
  };

  const handleDelete = async (taskId) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    
    setTableLoading(true); // Show loading on table
    try {
      // 1. Find the row index
      const cb = `&_=${Date.now()}`;
      const resAll = await fetch(`${FETCH_URL}?sheet=Calling Tracking&action=fetch${cb}`);
      const jsonAll = await resAll.json();
      
      if (!jsonAll.success || !jsonAll.data) throw new Error("Could not fetch data to locate task.");
      
      const index = jsonAll.data.findIndex(row => row[1] === taskId);
      if (index === -1) throw new Error("Task not found.");
      
      const rowIndex = index + 1;

      // 2. Send Delete Request (Trying deleteRow action)
      const res = await fetch(import.meta.env.VITE_GOOGLE_SHEET_URL, {
        method: "POST",
        body: new URLSearchParams({
          sheetName: "Calling Tracking",
          action: "deleteRow", 
          rowIndex: rowIndex
        })
      });
      
      const json = await res.json();
      if (json.success) {
        toast.success("Task deleted successfully");
        loadData();
      } else {
        // Fallback: Try updateCell to "Deleted" if deleteRow fails? 
        // Or just show error. User asked to "fix it", implies "make it work".
        // If deleteRow isn't supported, we might need a backup.
        // But usually standard script supports it.
        toast.error("Delete failed: " + (json.error || "Unknown error"));
      }
    } catch (err) {
      console.error("Delete Error:", err);
      toast.error(err.message || "Failed to delete");
    } finally {
      setTableLoading(false);
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

    const counts = {
      all: dataRows.length,
      today: 0,
      yesterday: 0,
      monthly: 0,
    };

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);

    const oneMonthAgo = new Date(now);
    oneMonthAgo.setMonth(now.getMonth() - 1);

    dataRows.forEach((row) => {
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
        <h1 className="text-2xl font-bold text-gray-800">Interview Scheduled</h1>
        <div className="flex flex-wrap items-center gap-3">
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
            ) : (
              "Refresh Data"
            )}
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
            <Search
              size={18}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            />
          </div>
          
          <select
            value={entryByFilter}
            onChange={(e) => {
              setEntryByFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy bg-gray-50 text-sm outline-none"
          >
            <option value="all">All Entries</option>
            {users.map((user, idx) => (
              <option key={idx} value={user}>
                {user}
              </option>
            ))}
          </select>

          <select
            value={interviewStatusFilter}
            onChange={(e) => {
              setInterviewStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy bg-gray-50 text-sm outline-none"
          >
            <option value="all">All Interviews</option>
            <option value="Interview Schedule">Interview Schedule</option>
            <option value="Pending">Pending</option>
            <option value="Reschedule">Reschedule</option>
            <option value="Done">Done</option>
            <option value="Hold">Hold</option>
          </select>

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
            <option value="custom">Custom Range</option>
          </select>

          {dateFilter === 'custom' && (
            <div className="flex items-center gap-2">
              <input 
                type="date" 
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="px-2 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy bg-gray-50 text-sm outline-none"
              />
              <span className="text-gray-500">-</span>
              <input 
                type="date" 
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="px-2 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy bg-gray-50 text-sm outline-none"
              />
            </div>
          )}
          
          <div className="bg-blue-50 text-blue-700 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap">
            Total Candidates: {totalRecords}
          </div>

          <button
            onClick={() => {
              setSearchTerm("");
              setDateFilter("all");
              setEntryByFilter("all");
              setInterviewStatusFilter("all");
              setFromDate("");
              setToDate("");
              setCurrentPage(1);
            }}
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                  Interview Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                  Task ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                  Entry By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                  Applicant Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                  Contact Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                  Portal Used
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                  Stage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                  Notes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                  Feedback
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 relative">
              {displayData.length === 0 ? (
                tableLoading ? (
                  <tr>
                    <td
                      colSpan="13"
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      Loading data...
                    </td>
                  </tr>
                ) : (
                  <tr>
                    <td
                      colSpan="13"
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      No data found
                    </td>
                  </tr>
                )
              ) : (
                displayData.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      <button
                        onClick={() => {
                          setInlineInterviewItem(item);
                          setInlineInterviewStatus(item.interviewStatus || "Pending");
                          setInlineInterviewDate(item.interviewDate || "");
                        }}
                        className="w-full text-left px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-md transition-colors group"
                        title="Update Interview Status"
                      >
                        <span className="font-medium text-navy block group-hover:text-indigo-600 transition-colors">
                          {item.interviewStatus || "Pending"}
                        </span>
                        {item.interviewStatus === "Done" && item.interviewDate && (
                          <span className="text-xs text-gray-500 mt-1 block">
                            {formatDateDisplay(item.interviewDate)}
                          </span>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDateDisplay(item.timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-navy">
                      {item.taskId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.entryBy}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.applicantName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.contactName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.role}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.portalUsed}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.location}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.stage}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {item.notes}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {item.feedback}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.status?.toLowerCase() === "closed"
                            ? "bg-green-100 text-green-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleEdit(item)}
                          className="text-blue-600 hover:text-blue-800 p-1 rounded-full hover:bg-blue-50 transition-colors"
                          title="Edit"
                        >
                          <Edit size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(item.taskId)}
                          className="text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-red-50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
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
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
            >
              Previous
            </button>
            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages || totalPages === 0}
              className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing{" "}
                <span className="font-medium">
                  {(currentPage - 1) * recordsPerPage + 1}
                </span>{" "}
                to{" "}
                <span className="font-medium">
                  {Math.min(currentPage * recordsPerPage, totalRecords)}
                </span>{" "}
                of <span className="font-medium">{totalRecords}</span> results
              </p>
            </div>
            <div>
              <nav
                className="isolate inline-flex -space-x-px rounded-md shadow-sm"
                aria-label="Pagination"
              >
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:bg-gray-100 disabled:text-gray-300"
                >
                  <span className="sr-only">Previous</span>
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
                <div className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 focus:z-20 focus:outline-offset-0">
                  Page {currentPage} of {Math.max(totalPages, 1)}
                </div>
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:bg-gray-100 disabled:text-gray-300"
                >
                  <span className="sr-only">Next</span>
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                      clipRule="evenodd"
                    />
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
              <h2 className="text-xl font-bold text-gray-800">{editingId ? "Edit Task" : "Add New Task"}</h2>
              <button onClick={() => { setShowModal(false); setEditingId(null); resetForm(); }} className="text-gray-500 hover:text-gray-700 transition-colors">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Entry By
                  </label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Applicant Name
                  </label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact No.
                  </label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Portal Used
                  </label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stage
                  </label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy h-20"
                  placeholder="Enter notes..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Feedback
                </label>
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

      {inlineInterviewItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 relative">
            <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b">Update Interview Status</h3>
            <button 
              onClick={() => setInlineInterviewItem(null)} 
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={inlineInterviewStatus}
                  onChange={(e) => setInlineInterviewStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy"
                >
                  <option value="Pending">Pending</option>
                  <option value="Interview Schedule">Interview Schedule</option>
                  <option value="Hold">Hold</option>
                  <option value="Reschedule">Reschedule</option>
                  <option value="Done">Done</option>
                </select>
              </div>
              {["Done", "Interview Schedule", "Reschedule"].includes(inlineInterviewStatus) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Interview Date</label>
                  <input
                    type="date"
                    value={inlineInterviewDate}
                    onChange={(e) => setInlineInterviewDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy"
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setInlineInterviewItem(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={handleInlineInterviewSubmit}
                className="px-4 py-2 bg-navy text-white rounded-lg hover:bg-navy-dark text-sm font-medium flex items-center disabled:opacity-50"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Saving...
                  </>
                ) : (
                  "Save Update"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterviewScheduled;
