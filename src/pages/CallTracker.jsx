import React, { useState, useEffect } from "react";
import useDataStore from "../store/dataStore";
import { Search, Clock, CheckCircle, X, Plus } from "lucide-react";
import toast from "react-hot-toast";

const CallTracker = () => {
  const [activeTab, setActiveTab] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [postFilter, setPostFilter] = useState("");
  const [tableLoading, setTableLoading] = useState(false);

  const [candidateData, setCandidateData] = useState([]);
  const [historyData, setHistoryData] = useState([]);
  const [statusOptions, setStatusOptions] = useState([]);
  const [uniqueStages, setUniqueStages] = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    customerSale: "",
    status: "",
    nextFollowUp: "",
    candidateName: "",
    contactNumber: "",
    notes: "",
    stage: ""
  });



  const FETCH_URL = import.meta.env.VITE_GOOGLE_SHEET_URL;

  const { fmsData: globalFmsData, masterData: globalMasterData, dataResponseData: globalHistoryData, isLoading: storeLoading, refreshData } = useDataStore();

  useEffect(() => {
    setTableLoading(storeLoading);
  }, [storeLoading]);

  // Master Data Effect
  useEffect(() => {
    if (!globalMasterData || globalMasterData.length < 2) {
      setStatusOptions([]);
      return;
    }
    const options = [...new Set(globalMasterData.slice(1).map(row => row[4]).filter(val => val && val.trim()))];
    setStatusOptions(options);
  }, [globalMasterData]);

  // FMS Data Effect
  useEffect(() => {
    if (!globalFmsData || globalFmsData.length < 9) {
      setCandidateData([]);
      setUniqueStages([]); // Reset if no data?
      return;
    }
    const dataRows = globalFmsData.slice(8); // FMS starts from row 9
    const processed = dataRows.map((row, idx) => ({
      rowIndex: idx + 9,
      indentNumber: row[4],     // Column E
      candidateName: row[5],    // Column F
      department: row[12],      // Column M
      post: row[6],             // Column G
      columnAL: row[37],        // Index 37 (Trigger)
      columnAM: row[38],        // Index 38 (Marker)
      gender: row[11],
      salary: row[7],
      experience: row[16]
    })).filter(item => item.indentNumber);

    setCandidateData(processed);
    setUniqueStages(getUniqueStages());
  }, [globalFmsData]);

  // History Data Effect
  useEffect(() => {
    if (!globalHistoryData || globalHistoryData.length < 2) {
      setHistoryData([]);
      return;
    }
    const historyRows = globalHistoryData.slice(1).filter(row => row[1] === "CT-1");
    const processedHistory = historyRows.map(row => ({
      indentNumber: row[0],
      timestamp: row[2],
      status: row[3],
      customerSale: row[13], // Column N
      nextFollowUp: row[14]  // Column O
    }));
    setHistoryData(processedHistory);
  }, [globalHistoryData]);

  const getUniqueStages = () => {
    const allStages = [
      "call back", "intrested", "intrested", "interested", "unavailable", "disconnected",
      "send resume", "not connected", "call not received", "wrong no.", "wrong no",
      "not receive", "not received", "not intrested", "not intrested", "not interested",
      "send resume", "busy", "not answer", "switch off", "disconected call", "disconnect",
      "freshers", "no", "not selected", "interview lineup", "bakup", "hold", "selected",
      "no exp.", "no experience", "NR", "NOT CONN.", "INT.", "int.", "NC", "in.",
      "intrestred", "Call connected", "Call not connected", "Connected", "Connected on call",
      "Busy", "Wrong number", "Invalid number", "Cv share kiya hi", "Working hi",
      "Apna job", "Chattisgarh", "selected"
    ];
    return [...new Set(allStages)];
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleActionClick = (item) => {
    setSelectedItem(item);
    setFormData({
      customerSale: "",
      status: statusOptions[0] || "",
      nextFollowUp: "",
      candidateName: item.candidateName || "",
      contactNumber: "",
      notes: "",
      stage: ""
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.status) {
      toast.error("Please select a status");
      return;
    }

    setSubmitting(true);
    try {
      const now = new Date();
      const month = now.getMonth() + 1; // Month is 0-indexed
      const day = now.getDate();
      const year = now.getFullYear();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const seconds = now.getSeconds();
      const fullTimestamp = `${month}/${day}/${year} ${hours}:${minutes}:${seconds}`;

      // 1. Submit to Calling Tracking
      const responseData = [];
      responseData[0] = fullTimestamp;             // Col A (Timestamp)
      responseData[1] = "";                        // Col B (Empty)
      responseData[2] = formData.candidateName;    // Col C (Candidate Name)
      responseData[3] = formData.contactNumber;    // Col D (Contact Number)
      responseData[7] = formData.stage;            // Col H (Stage)
      responseData[8] = formData.notes;            // Col I (Notes)
      responseData[10] = selectedItem.indentNumber; // Col K (Indent Number)
      responseData[11] = formData.status;          // Col L (Status)
      responseData[13] = formData.customerSale;    // Col N (Customer Sale)
      responseData[14] = formData.nextFollowUp;    // Col O (Next Follow Up)

      const insertResponse = await fetch(FETCH_URL, {
        method: "POST",
        body: new URLSearchParams({
          sheetName: "Calling Tracking",
          action: "bulkInsert",
          rowsData: JSON.stringify([responseData])
        })
      });

      // 2. Update Column AM (index 38) in FMS
      const updateResponse = await fetch(FETCH_URL, {
        method: "POST",
        body: new URLSearchParams({
          sheetName: "FMS",
          action: "updateCell",
          rowIndex: selectedItem.rowIndex,
          // columnIndex: 39, // Column AM is 39th column (1-indexed)
          // value: fullTimestamp
        })
      });

      const res1 = await insertResponse.json();
      const res2 = await updateResponse.json();

      if (res1.success && res2.success) {
        toast.success("Call tracked successfully!");

        // If status is "Closed", switch to history tab
        if (formData.status.toLowerCase() === 'closed') {
          setActiveTab("history");
        }

        setShowModal(false);
        refreshData();
      } else {
        toast.error("Submission failed");
      }
    } catch (error) {
      console.error("Error submitting action:", error);
      toast.error("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  // Create mapping for candidate details
  const candidateMapping = candidateData.reduce((acc, item) => {
    acc[item.indentNumber] = {
      name: item.candidateName,
      dept: item.department,
      post: item.post
    };
    return acc;
  }, {});

  const filteredPendingRows = candidateData.filter(item => {
    const term = searchTerm.toLowerCase();
    const hasAL = !!(item.columnAL && item.columnAL.toString().trim());
    const hasAM = !!(item.columnAM && item.columnAM.toString().trim());
    const matchesTab = hasAL && !hasAM;

    // Check if this indent number has any "Closed" status in history
    const hasClosedStatus = historyData.some(historyItem =>
      historyItem.indentNumber === item.indentNumber &&
      historyItem.status &&
      historyItem.status.trim().toLowerCase() === 'closed'
    );

    const matchesSearch =
      (item.candidateName || "").toLowerCase().includes(term) ||
      (item.indentNumber || "").toLowerCase().includes(term) ||
      (item.post || "").toLowerCase().includes(term);
    const matchesDept = !deptFilter || item.department === deptFilter;
    const matchesPost = !postFilter || item.post === postFilter;

    // Item should be in pending if it matches tab conditions AND doesn't have a closed status
    return matchesTab && matchesSearch && matchesDept && matchesPost && !hasClosedStatus;
  });

  const filteredHistoryRows = historyData.filter(item => {
    const term = searchTerm.toLowerCase();
    const details = candidateMapping[item.indentNumber] || {};
    const matchesSearch =
      (details.name || "").toLowerCase().includes(term) ||
      (item.indentNumber || "").toLowerCase().includes(term) ||
      (details.post || "").toLowerCase().includes(term) ||
      (item.customerSale || "").toLowerCase().includes(term);

    const matchesDept = !deptFilter || details.dept === deptFilter;
    const matchesPost = !postFilter || details.post === postFilter;

    return matchesSearch && matchesDept && matchesPost;
  });

  const departments = [...new Set(candidateData.map(item => item.department))].filter(Boolean).sort();
  const posts = [...new Set(candidateData.map(item => item.post))].filter(Boolean).sort();

  return (
    <div className="space-y-6 page-content p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Call Tracker</h1>
        <div className="flex flex-col md:flex-row items-center gap-3">
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

          <div className="flex items-center gap-2">
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="w-40 px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy bg-gray-50 text-sm"
            >
              <option value="">All Departments</option>
              {departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
            </select>
            <select
              value={postFilter}
              onChange={(e) => setPostFilter(e.target.value)}
              className="w-40 px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy bg-gray-50 text-sm"
            >
              <option value="">All Posts</option>
              {posts.map(post => <option key={post} value={post}>{post}</option>)}
            </select>
            <button
              onClick={() => { setSearchTerm(""); setDeptFilter(""); setPostFilter(""); }}
              className="p-2 text-gray-400 hover:text-navy transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="flex bg-gray-50 border-b">
          <button
            onClick={() => setActiveTab("pending")}
            className={`px-6 py-4 text-sm font-medium transition-colors ${activeTab === "pending" ? "text-navy border-b-2 border-navy bg-white" : "text-gray-500 hover:text-gray-700"}`}
          >
            <div className="flex items-center gap-2">
              <Clock size={16} /> Pending
            </div>
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-6 py-4 text-sm font-medium transition-colors ${activeTab === "history" ? "text-navy border-b-2 border-navy bg-white" : "text-gray-500 hover:text-gray-700"}`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle size={16} /> History
            </div>
          </button>
        </div>

        <div className="p-6">
          <div className="overflow-x-auto max-h-[calc(100vh-320px)] overflow-y-auto table-container">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr className="bg-gray-50">
                  {activeTab === "pending" ? (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Action</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Indent No.</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Candidate Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Department</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Post</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Trigger Date</th>
                    </>
                  ) : (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Indent No.</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Candidate Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Post</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Customer Sale</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Next Follow-Up</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tableLoading ? (
                  <tr><td colSpan="10" className="px-6 py-12 text-center text-gray-500">Loading...</td></tr>
                ) : (activeTab === "pending" ? filteredPendingRows : filteredHistoryRows).length === 0 ? (
                  <tr><td colSpan="10" className="px-6 py-12 text-center text-gray-500">No data found</td></tr>
                ) : (
                  (activeTab === "pending" ? filteredPendingRows : filteredHistoryRows).map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      {activeTab === "pending" ? (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => handleActionClick(item)}
                              className="px-4 py-2 bg-navy text-white rounded-lg hover:bg-navy-dark text-sm transition-colors"
                            >
                              Track Call
                            </button>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-navy">{item.indentNumber}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.candidateName}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.department}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.post}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.columnAL}</td>
                        </>
                      ) : (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-navy">{item.indentNumber}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {candidateMapping[item.indentNumber]?.name || "N/A"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {candidateMapping[item.indentNumber]?.post || "N/A"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                              {item.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{item.customerSale || "-"}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.nextFollowUp || "-"}</td>
                        </>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b">
              <h2 className="text-xl font-bold text-gray-800">Track Call</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700 transition-colors">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Indent Number</label>
                  <input
                    type="text"
                    value={selectedItem?.indentNumber || ""}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
                  <input
                    name="contactNumber"
                    value={formData.contactNumber}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy"
                    placeholder="Enter contact..."
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Candidate Name</label>
                <input
                  name="candidateName"
                  value={formData.candidateName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy"
                  placeholder="Enter candidate name..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">What did the Customer Sale</label>
                <textarea
                  name="customerSale"
                  value={formData.customerSale}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy h-20 sm:h-24"
                  placeholder="Enter details..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy h-20 sm:h-24"
                  placeholder="Enter notes..."
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
                  <select
                    name="stage"
                    value={formData.stage}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy"
                  >
                    <option value="">Select Stage</option>
                    {uniqueStages.map(stage => <option key={stage} value={stage}>{stage}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy"
                    required
                  >
                    <option value="">Select Status</option>
                    {statusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Next Follow-Up Date</label>
                <input
                  type="date"
                  name="nextFollowUp"
                  value={formData.nextFollowUp}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy"
                />
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-4">
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
                  {submitting ? "Submitting..." : "Submit"}
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