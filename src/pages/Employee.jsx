import React, { useEffect, useState } from "react";
import { Filter, Search, Clock, CheckCircle, ImageIcon, X, User, Briefcase, MapPin, Calendar, FileText, Phone, Mail } from "lucide-react";

import toast from "react-hot-toast";

const Employee = () => {
  const [activeTab, setActiveTab] = useState("joining");
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    dateOfLeaving: "",
    mobileNumber: "",
    reasonOfLeaving: "",
    salary: ""
  });
  const [joiningData, setJoiningData] = useState([]);
  const [leavingData, setLeavingData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [joiningPlaceFilter, setJoiningPlaceFilter] = useState("");
  const [joiningPlaces, setJoiningPlaces] = useState([]);

  // Helper to convert Google Drive link to direct image link
  const getDriveImageUrl = (url) => {
    if (!url) return null;
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      // Safest embedded link that works in img tags
      return `https://drive.google.com/thumbnail?id=${match[1]}`;
    }
    return url;
  };

  const formatDOB = (dateString) => {
    if (!dateString) return "";

    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString; // Return as-is if not a valid date
    }

    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  };

  // Fetch global data from store (still needed only for refreshing data after submit)


  // Helper to normalize IDs for consistent comparison
  // Removes all non-alphanumeric characters and lowercases
  const normalizeId = (id) => id ? id.toString().toLowerCase().replace(/[^a-z0-9]/g, "") : "";

  const fetchData = async () => {
    setLoading(true);
    setTableLoading(true);
    setError(null);
    try {
      // Fetch both sheets in parallel using SPECIFIC URLs from .env
      const [joiningResponse, leavingResponse] = await Promise.all([
        fetch(`${import.meta.env.VITE_JOINING_SHEET_URL}?action=read&sheet=JOINING_FMS`),
        fetch(`${import.meta.env.VITE_LEAVING_SHEET_URL}?action=read&sheet=FMS`)
      ]);

      const [joiningText, leavingText] = await Promise.all([
        joiningResponse.text(),
        leavingResponse.text()
      ]);

      // Parse JSON
      let joiningJson, leavingJson;
      try { joiningJson = JSON.parse(joiningText); } catch (e) { console.error("Joining Parse Error", e); joiningJson = { data: [] }; }
      try { leavingJson = JSON.parse(leavingText); } catch (e) { console.error("Leaving Parse Error", e); leavingJson = { data: [] }; }

      const rawJoining = joiningJson.data || [];
      const rawLeaving = leavingJson.data || [];

      // --- Process FMS / Leaving Data ---
      // We need FMS IDs to filter Joining Data
      const fmsIds = new Set();
      let processedLeaving = [];

      if (rawLeaving.length > 7) {
        const leavingRows = rawLeaving.slice(7);

        // 1. Build ID Set for Deduplication
        leavingRows.forEach(row => {
          const id = normalizeId(row[5]); // Column F (Index 5) is ID
          if (id) fmsIds.add(id);
        });

        // 2. Process for Leaving Tab Display (Column AS / Index 44 == 'Yes')
        processedLeaving = leavingRows.map(row => ({
          originalRow: row,
          employeeId: row[5] || "",
          name: row[10] || "",
          candidateName: row[10] || "", // For modal compatibility
          designation: row[11] || "",
          mobileNo: row[12] || "",
          lastWorkingDay: row[7] || "",
          dateOfLeaving: row[7] || "",
          reasonOfLeaving: row[8] || "",
          salary: row[9] || "",
          dateOfJoining: "",
          joiningPlace: "",
          department: "",
          fatherName: "",

          isArchived: row[44] && row[44].toString().trim().toLowerCase() === 'yes'
        })).filter(item => item.isArchived);
      }

      setLeavingData(processedLeaving);

      // --- Process Joining Data ---
      let processedJoining = [];
      if (rawJoining.length > 7) {
        // Dynamic Headers check
        const headers = rawJoining[6] || [];
        const getIndex = (name) => headers.findIndex(h => h && h.toString().trim().toLowerCase() === name.trim().toLowerCase());

        const idxIndent = getIndex("Indent Number") !== -1 ? getIndex("Indent Number") : 5;
        const idxName = getIndex("Candidate Name") !== -1 ? getIndex("Candidate Name") : 10;
        const idxDept = getIndex("Department") !== -1 ? getIndex("Department") : 2;
        const idxDesig = getIndex("Designation") !== -1 ? getIndex("Designation") : 14;
        const idxMobile = getIndex("Contact No") !== -1 ? getIndex("Contact No") : 23;
        const idxEmail = getIndex("Email Id") !== -1 ? getIndex("Email Id") : 31;
        // Dynamic Status Index
        const idxStatus = getIndex("Status") !== -1 ? getIndex("Status") : 8;

        processedJoining = rawJoining.slice(7).map(row => ({
          employeeId: row[idxIndent] || "",
          candidateName: row[idxName] || "",
          department: row[idxDept] || "",
          designation: row[idxDesig] || "",
          mobileNo: row[idxMobile] || "",
          emailId: row[idxEmail] || "",
          fatherName: row[11] || "",
          dateOfJoining: row[12] || "",
          joiningPlace: row[13] || "",
          aadharPhoto: row[16] || "",
          candidatePhoto: row[18] || "",
          status: row[idxStatus] || "",
          colBM: row[64] || "", // Column BM (Index 64)
        })).filter(item => {
          // Filter 1: Status is DONE (Case Insensitive)
          const isDone = item.status && item.status.toString().trim().toUpperCase() === "DONE";
          // Filter 2: Not in FMS (Robust check)
          const id = normalizeId(item.employeeId);
          const inFms = fmsIds.has(id);
          // Filter 3: Column BM (Index 64) must be EMPTY/NULL
          // "where not null value ... hide the data" -> so enable if null/empty
          const isBMEmpty = !item.colBM || item.colBM.toString().trim() === "";

          return isDone && !inFms && isBMEmpty;
        });
      }

      setJoiningData(processedJoining);

      // Extract unique joining places for the filter dropdown case-insensitively
      const placesMap = new Map();
      processedJoining.forEach(item => {
        const place = item.joiningPlace && item.joiningPlace.toString().trim();
        if (place) {
          const lowerPlace = place.toLowerCase();
          if (!placesMap.has(lowerPlace)) {
            // Store the first occurrence as the display name
            placesMap.set(lowerPlace, place);
          }
        }
      });
      const places = Array.from(placesMap.values()).sort();
      setJoiningPlaces(places);

    } catch (err) {
      console.error("Fetch Data Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
      setTableLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredJoiningData = joiningData.filter((item) => {
    const matchesSearch =
      item.candidateName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.employeeId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.designation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.fatherName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.emailId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.mobileNo?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesJoiningPlace = !joiningPlaceFilter ||
      (item.joiningPlace && item.joiningPlace.toString().trim().toLowerCase() === joiningPlaceFilter.toString().trim().toLowerCase());

    return matchesSearch && matchesJoiningPlace;
  });

  const filteredLeavingData = leavingData.filter((item) => {
    const matchesSearch =
      item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.employeeId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.designation?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const handleLeaveClick = (e, item) => {
    e.stopPropagation();
    setSelectedItem(item);
    setFormData({
      dateOfLeaving: "",
      mobileNumber: item.mobileNo || "",
      reasonOfLeaving: "",
      salary: ""
    });
    setShowModal(true);
  };

  const handleViewProfile = (item) => {
    setSelectedProfile(item);
    setShowProfileModal(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.dateOfLeaving || !formData.reasonOfLeaving) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      setSubmitting(true);
      const now = new Date();
      // Format as dd/mm/yyyy
      const formattedTimestamp = `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}/${now.getFullYear()}`;

      // Format leaving date as dd/mm/yyyy
      const leavingDate = new Date(formData.dateOfLeaving);
      const formattedLeavingDate = `${String(leavingDate.getMonth() + 1).padStart(2, '0')}/${String(leavingDate.getDate()).padStart(2, '0')}/${leavingDate.getFullYear()}`;

      // Construct row data matching specific indices for FMS sheet
      // Index 5: ID, 6: Timestamp, 7: Last Working Day, 8: Reason, 9: Salary, 10: Name, 11: Designation, 12: Mobile, 27: Planned Date
      const rowData = new Array(13).fill(""); // Create array up to index 12 (length 13)

      rowData[5] = selectedItem.employeeId;
      rowData[6] = formattedTimestamp;
      rowData[7] = formattedLeavingDate;
      rowData[8] = formData.reasonOfLeaving;
      rowData[9] = formData.salary;
      rowData[10] = selectedItem.candidateName;
      rowData[11] = selectedItem.designation;
      rowData[12] = formData.mobileNumber;


      // Insert into FMS sheet via specific LEAVING URL
      const insertParams = new URLSearchParams({
        sheetName: 'FMS',
        action: 'insert',
        rowData: JSON.stringify(rowData),
      });

      const insertResponse = await fetch(import.meta.env.VITE_LEAVING_SHEET_URL, {
        method: 'POST',
        body: insertParams,
      });

      const insertText = await insertResponse.text();
      let insertResult;

      try {
        insertResult = JSON.parse(insertText);
      } catch (parseError) {
        console.error('Failed to parse FMS insert response:', insertText);
        throw new Error(`Server returned invalid response: ${insertText.substring(0, 100)}...`);
      }

      if (insertResult.success) {
        setFormData({
          dateOfLeaving: '',
          reasonOfLeaving: '',
          salary: '',
          mobileNumber: ''
        });
        setShowModal(false);
        toast.success('Leaving details submitted successfully!');
        setSelectedItem(null);

        // Refresh global data to reflect changes if necessary
        // fetchData();
        // Refresh local data
        fetchData();
      } else {
        throw new Error(insertResult.error || 'Failed to insert into FMS sheet');
      }
    } catch (error) {
      console.error('Submit error:', error);
      toast.error('Something went wrong: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-gray-100">
        <div>
          <h1 className="text-3xl font-black text-gray-800 tracking-tight">Employee Master</h1>
          <p className="text-sm text-gray-500 font-medium mt-1">Manage all joining and leaving personnel</p>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4">
        <div className="flex flex-1 max-w-md">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Search by name, ID, or designation..."
              className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50 text-gray-800 font-medium transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search
              size={20}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
            />
          </div>
        </div>

        {activeTab === "joining" && (
          <div className="flex items-center space-x-2">
            <Filter size={20} className="text-gray-500" />
            <select
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white text-gray-500 text-sm"
              value={joiningPlaceFilter}
              onChange={(e) => setJoiningPlaceFilter(e.target.value)}
            >
              <option value="">All Joining Places</option>
              {joiningPlaces.map((place, index) => (
                <option key={index} value={place}>
                  {place}
                </option>
              ))}
            </select>
            {joiningPlaceFilter && (
              <button
                onClick={() => setJoiningPlaceFilter("")}
                className="p-2 text-gray-500 hover:text-red-500"
                title="Clear filter"
              >
                <X size={16} />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="border-b border-gray-200 bg-gray-50/50">
          <nav className="flex px-4 pt-4 gap-4">
            <button
              className={`py-3 px-6 font-bold text-sm rounded-t-xl transition-all flex items-center ${activeTab === "joining"
                ? "bg-white text-indigo-700 border-t border-l border-r border-gray-200 shadow-[0_4px_0_0_white]"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-100/50 border border-transparent"
                }`}
              onClick={() => setActiveTab("joining")}
            >
              <CheckCircle size={18} className={`mr-2 ${activeTab === "joining" ? "text-indigo-500" : "text-gray-400"}`} />
              Active / Joining <span className={`ml-2 px-2.5 py-0.5 rounded-full text-xs ${activeTab === "joining" ? "bg-indigo-100 text-indigo-700" : "bg-gray-200 text-gray-600"}`}>{filteredJoiningData.length}</span>
            </button>
            <button
              className={`py-3 px-6 font-bold text-sm rounded-t-xl transition-all flex items-center ${activeTab === "leaving"
                ? "bg-white text-indigo-700 border-t border-l border-r border-gray-200 shadow-[0_4px_0_0_white]"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-100/50 border border-transparent"
                }`}
              onClick={() => setActiveTab("leaving")}
            >
              <Clock size={18} className={`mr-2 ${activeTab === "leaving" ? "text-rose-500" : "text-gray-400"}`} />
              Archived / Leaving <span className={`ml-2 px-2.5 py-0.5 rounded-full text-xs ${activeTab === "leaving" ? "bg-rose-100 text-rose-700" : "bg-gray-200 text-gray-600"}`}>{filteredLeavingData.length}</span>
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === "joining" && (
            <div className="overflow-x-auto table-container">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider rounded-tl-lg">Profile</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Employee ID</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Details</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Joining Date</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Location</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Documents</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider rounded-tr-lg">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {tableLoading ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-16 text-center">
                        <div className="flex justify-center flex-col items-center">
                          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                          <span className="text-gray-500 font-medium">Loading employee master data...</span>
                        </div>
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center">
                        <div className="bg-red-50 text-red-600 p-4 rounded-xl inline-block">
                          <p className="font-semibold mb-2">Error loading data</p>
                          <p className="text-sm">{error}</p>
                          <button onClick={fetchData} className="mt-3 px-4 py-2 bg-red-100 text-red-700 font-bold rounded-lg hover:bg-red-200 transition">Retry</button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredJoiningData.map((item, index) => (
                      <tr key={index} onClick={() => handleViewProfile(item)} className="hover:bg-indigo-50/80 transition-colors group cursor-pointer">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-indigo-100 overflow-hidden flex items-center justify-center border-2 border-white shadow-sm flex-shrink-0">
                              {item.candidatePhoto ? (
                                <img src={getDriveImageUrl(item.candidatePhoto)} alt={item.candidateName} className="w-full h-full object-contain bg-white" onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
                              ) : null}
                              <User size={24} className={`text-indigo-400 ${item.candidatePhoto ? 'hidden' : 'block'}`} />
                            </div>
                            <div>
                              <p className="font-bold text-gray-800">{item.candidateName}</p>
                              {item.fatherName && item.fatherName !== "N/A" && item.fatherName !== "na" && (
                                <p className="text-xs text-gray-500 flex items-center mt-1"><User size={12} className="mr-1" /> C/O {item.fatherName}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md text-sm">{item.employeeId}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-sm font-semibold text-gray-700 flex items-center"><Briefcase size={14} className="mr-1.5 text-gray-400"/>{item.designation || 'N/A'}</p>
                          {item.department && item.department !== "N/A" && item.department !== "na" && (
                            <p className="text-xs text-gray-500 mt-1">{item.department}</p>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm font-medium text-gray-600">
                            <Calendar size={14} className="mr-2 text-indigo-400" />
                            {item.dateOfJoining ? formatDOB(item.dateOfJoining) : "-"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                            <MapPin size={12} className="mr-1" />
                            {item.joiningPlace || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {item.aadharPhoto ? (
                            <a href={item.aadharPhoto} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg text-xs font-bold transition-colors">
                              <FileText size={14} />
                              Aadhar
                            </a>
                          ) : (
                            <span className="text-gray-400 text-xs font-medium bg-gray-50 px-2 py-1 rounded">No doc</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <button
                            onClick={(e) => handleLeaveClick(e, item)}
                            className="px-4 py-2 bg-white border-2 border-rose-200 text-rose-600 font-bold rounded-xl hover:bg-rose-50 hover:border-rose-300 transition-colors shadow-sm"
                          >
                            Mark Leave
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {!tableLoading && filteredJoiningData.length === 0 && (
                <div className="px-6 py-12 text-center">
                  <p className="text-gray-500 ">
                    No joining employees found.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === "leaving" && (
            <div className="overflow-x-auto table-container">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider rounded-tl-lg">Profile</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Employee ID</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Role & Details</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Duration</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider rounded-tr-lg">Reason for Leaving</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {tableLoading ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-16 text-center">
                        <div className="flex justify-center flex-col items-center">
                          <div className="w-8 h-8 border-4 border-rose-200 border-t-rose-600 rounded-full animate-spin mb-4"></div>
                          <span className="text-gray-500 font-medium">Loading archived records...</span>
                        </div>
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center">
                        <div className="bg-red-50 text-red-600 p-4 rounded-xl inline-block">
                          <p className="font-semibold mb-2">Error loading data</p>
                          <p className="text-sm">{error}</p>
                          <button onClick={fetchData} className="mt-3 px-4 py-2 bg-red-100 text-red-700 font-bold rounded-lg hover:bg-red-200 transition">Retry</button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredLeavingData.map((item, index) => (
                      <tr key={index} onClick={() => handleViewProfile(item)} className="hover:bg-rose-50/80 transition-colors group cursor-pointer">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center border-2 border-white shadow-sm flex-shrink-0">
                              {item.candidatePhoto ? (
                                <img src={getDriveImageUrl(item.candidatePhoto)} alt={item.name} className="w-full h-full object-contain bg-white grayscale" onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
                              ) : null}
                              <User size={20} className={`text-gray-400 ${item.candidatePhoto ? 'hidden' : 'block'}`} />
                            </div>
                            <div>
                              <p className="font-bold text-gray-700 line-through decoration-rose-300 opacity-80">{item.name}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-md text-sm opacity-80">{item.employeeId}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-sm font-semibold text-gray-600">{item.designation}</p>
                          {item.department && <p className="text-xs text-gray-400 mt-0.5">{item.department}</p>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1.5">
                            {item.dateOfJoining && (
                              <div className="flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded w-max border border-emerald-100">
                                <span className="mr-1 font-bold">Joined:</span> {formatDOB(item.dateOfJoining)}
                              </div>
                            )}
                            <div className="flex items-center text-xs font-medium text-rose-600 bg-rose-50 px-2 py-0.5 rounded w-max border border-rose-100">
                              <span className="mr-1 font-bold">Left:</span> {item.dateOfLeaving ? formatDOB(item.dateOfLeaving) : 'N/A'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                          {item.mobileNo || '-'}
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-600 italic border-l-2 border-rose-200 pl-3 py-1 bg-gray-50 rounded-r-lg max-w-xs truncate" title={item.reasonOfLeaving}>
                            "{item.reasonOfLeaving || 'No reason provided'}"
                          </p>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {!tableLoading && filteredLeavingData.length === 0 && (
                <div className="px-6 py-12 text-center">
                  <p className="text-gray-500 ">
                    No leaving employees found.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {
        showModal && selectedItem && (
          <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center p-6 border-b border-gray-300">
                <h3 className="text-lg font-medium text-gray-700">Leaving Form</h3>
                <button onClick={() => setShowModal(false)} className="text-gray-700">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Joining ID</label>
                  <input
                    type="text"
                    value={selectedItem.employeeId}
                    disabled
                    className="w-full border border-gray-500 rounded-md px-3 py-2 bg-white text-gray-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Working Day *</label>
                  <input
                    type="date"
                    name="dateOfLeaving"
                    value={formData.dateOfLeaving}
                    onChange={handleChange}
                    className="w-full border border-gray-500 rounded-md px-3 py-2 bg-white text-gray-700"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason For Resignation *</label>
                  <textarea
                    name="reasonOfLeaving"
                    value={formData.reasonOfLeaving}
                    onChange={handleChange}
                    rows={3}
                    className="w-full border border-gray-500 rounded-md px-3 py-2 bg-white text-gray-700"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Salary</label>
                  <input
                    type="text"
                    name="salary"
                    value={formData.salary}
                    onChange={handleChange}
                    className="w-full border border-gray-500 rounded-md px-3 py-2 bg-white text-gray-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Candidate Name</label>
                  <input
                    type="text"
                    value={selectedItem.candidateName}
                    disabled
                    className="w-full border border-gray-500 rounded-md px-3 py-2 bg-gray-100 text-gray-700 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                  <input
                    type="text"
                    value={selectedItem.designation}
                    disabled
                    className="w-full border border-gray-500 rounded-md px-3 py-2 bg-gray-100 text-gray-700 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mobile No.</label>
                  <input
                    type="text"
                    name="mobileNumber"
                    value={formData.mobileNumber}
                    onChange={handleChange}
                    className="w-full border border-gray-500 rounded-md px-3 py-2 bg-white text-gray-700"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`px-4 py-2 text-white bg-indigo-700 rounded-md hover:bg-indigo-800 min-h-[42px] flex items-center justify-center ${submitting ? 'opacity-90 cursor-not-allowed' : ''}`}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <div className="flex items-center">
                        <svg
                          className="animate-spin h-4 w-4 text-white mr-2"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Submitting...</span>
                      </div>
                    ) : 'Submit'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* Profile Details Modal */}
      {showProfileModal && selectedProfile && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col relative">
            <div className="absolute top-4 right-4 z-10">
              <button onClick={() => setShowProfileModal(false)} className="p-2 bg-white/50 backdrop-blur-md rounded-full text-gray-600 hover:text-gray-900 hover:bg-white shadow-sm transition-all">
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto w-full">
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 h-24 w-full flex-shrink-0"></div>
              
              <div className="px-6 pb-6">
                <div className="relative flex justify-between items-end -mt-12 mb-4">
                <div className="w-24 h-24 rounded-full bg-white p-1 shadow-md border border-gray-100 flex-shrink-0">
                  <div className="w-full h-full bg-white rounded-full overflow-hidden flex items-center justify-center">
                    {selectedProfile.candidatePhoto ? (
                      <img src={getDriveImageUrl(selectedProfile.candidatePhoto)} alt={selectedProfile.candidateName || selectedProfile.name} className="w-full h-full object-contain" onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
                    ) : null}
                    <User size={40} className={`text-indigo-300 ${selectedProfile.candidatePhoto ? 'hidden' : 'block'}`} />
                  </div>
                </div>
                <div className="mb-1 flex-shrink-0">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${selectedProfile.isArchived ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'}`}>
                    {selectedProfile.isArchived ? 'Inactive' : 'Active Employee'}
                  </span>
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-black text-gray-800 tracking-tight">{selectedProfile.candidateName || selectedProfile.name}</h2>
                <div className="flex items-center gap-2 mt-1.5 text-gray-600 font-medium text-sm">
                  <span className="flex items-center gap-1"><Briefcase size={14} className="text-indigo-400" /> {selectedProfile.designation || 'No Designation'}</span>
                  <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                  <span className="text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-md text-xs">{selectedProfile.employeeId}</span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Contact Info</h3>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-white rounded-lg shadow-sm text-blue-500"><Phone size={18} /></div>
                        <div>
                          <p className="text-xs text-gray-500 font-medium mb-0.5">Mobile Number</p>
                          <p className="text-sm font-bold text-gray-800">{selectedProfile.mobileNo || 'N/A'}</p>
                        </div>
                      </div>
                      {!selectedProfile.isArchived && (
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-white rounded-lg shadow-sm text-purple-500"><Mail size={18} /></div>
                          <div>
                            <p className="text-xs text-gray-500 font-medium mb-0.5">Email Address</p>
                            <p className="text-sm font-bold text-gray-800 truncate pr-2">{selectedProfile.emailId || 'N/A'}</p>
                          </div>
                        </div>
                      )}
                      {selectedProfile.fatherName && selectedProfile.fatherName !== "N/A" && selectedProfile.fatherName !== "na" && (
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-white rounded-lg shadow-sm text-emerald-500"><User size={18} /></div>
                          <div>
                            <p className="text-xs text-gray-500 font-medium mb-0.5">Father's Name</p>
                            <p className="text-sm font-bold text-gray-800">{selectedProfile.fatherName}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Employment Details</h3>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-white rounded-lg shadow-sm text-orange-500"><Calendar size={18} /></div>
                        <div>
                          <p className="text-xs text-gray-500 font-medium mb-0.5">Date of Joining</p>
                          <p className="text-sm font-bold text-gray-800">{selectedProfile.dateOfJoining ? formatDOB(selectedProfile.dateOfJoining) : 'N/A'}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-white rounded-lg shadow-sm text-rose-500"><MapPin size={18} /></div>
                        <div>
                          <p className="text-xs text-gray-500 font-medium mb-0.5">Location & Dept</p>
                          <p className="text-sm font-bold text-gray-800">
                            {selectedProfile.joiningPlace || 'N/A'} 
                            {selectedProfile.department && selectedProfile.department !== "N/A" && selectedProfile.department !== "na" && (
                              <><span className="text-gray-400 font-normal mx-1">|</span> {selectedProfile.department}</>
                            )}
                          </p>
                        </div>
                      </div>
                      
                      {selectedProfile.isArchived && (
                        <div className="flex items-start gap-3 mt-4 pt-4 border-t border-gray-200">
                          <div className="p-2 bg-rose-100 rounded-lg shadow-sm text-rose-600"><Clock size={18} /></div>
                          <div>
                            <p className="text-xs text-rose-500 font-bold mb-0.5">Date of Leaving</p>
                            <p className="text-sm font-bold text-gray-800">{selectedProfile.dateOfLeaving ? formatDOB(selectedProfile.dateOfLeaving) : 'N/A'}</p>
                            {selectedProfile.reasonOfLeaving && (
                              <p className="text-xs text-gray-600 mt-1 italic">"{selectedProfile.reasonOfLeaving}"</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {selectedProfile.aadharPhoto && (
                <div className="mt-4">
                  <a 
                    href={selectedProfile.aadharPhoto} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-full gap-2 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl transition-colors border border-indigo-100"
                  >
                    <FileText size={18} />
                    View Aadhar Document
                  </a>
                </div>
              )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Employee;
