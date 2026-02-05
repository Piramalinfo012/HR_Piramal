import React, { useEffect, useState } from "react";
import { Filter, Search, Clock, CheckCircle, ImageIcon, X } from "lucide-react";
import useDataStore from "../store/dataStore";
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
  const { fetchGlobalData } = useDataStore();

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
    return matchesSearch;
  });

  const filteredLeavingData = leavingData.filter((item) => {
    const matchesSearch =
      item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.employeeId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.designation?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const handleLeaveClick = (item) => {
    setSelectedItem(item);
    setFormData({
      dateOfLeaving: "",
      mobileNumber: item.mobileNo || "",
      reasonOfLeaving: "",
      salary: ""
    });
    setShowModal(true);
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
        fetchGlobalData(true);
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold ">Employee</h1>
      </div>

      <div className="bg-white p-4 rounded-lg shadow flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4">
        <div className="flex flex-1 max-w-md">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Search by name, employee ID, or designation..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white text-gray-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search
              size={20}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="border-b border-gray-300">
          <nav className="flex -mb-px">
            <button
              className={`py-4 px-6 font-medium text-sm border-b-2 ${activeTab === "joining"
                ? "border-indigo-500 text-navy"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              onClick={() => setActiveTab("joining")}
            >
              <CheckCircle size={16} className="inline mr-2" />
              Joining ({filteredJoiningData.length})
            </button>
            <button
              className={`py-4 px-6 font-medium text-sm border-b-2 ${activeTab === "leaving"
                ? "border-indigo-500 text-navy"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              onClick={() => setActiveTab("leaving")}
            >
              <Clock size={16} className="inline mr-2" />
              Leaving ({filteredLeavingData.length})
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === "joining" && (
            <div className="overflow-x-auto table-container">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Father Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date Of Joining
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Designation
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Aadhar Photo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Candidate Photo
                    </th>
                    {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date of Birth
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Gender
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mobile No
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Family No
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Relationship
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Account No
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      IFSC
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Branch
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Passbook
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email Id
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Equipment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Aadhar No
                    </th> */}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {tableLoading ? (
                    <tr>
                      <td colSpan="21" className="px-6 py-12 text-center">
                        <div className="flex justify-center flex-col items-center">
                          <div className="w-6 h-6 border-4 border-indigo-500 border-dashed rounded-full animate-spin mb-2"></div>
                          <span className="text-gray-600 text-sm">
                            Loading employees...
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan="21" className="px-6 py-12 text-center">
                        <p className="text-red-500">Error: {error}</p>
                        <button
                          onClick={fetchGlobalData}
                          className="mt-2 px-4 py-2 bg-navy text-white rounded-md hover:bg-navy-dark"
                        >
                          Retry
                        </button>
                      </td>
                    </tr>
                  ) : (
                    filteredJoiningData.map((item, index) => (
                      <tr
                        key={index}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <button
                            onClick={() => handleLeaveClick(item)}
                            className="px-4 py-2 bg-navy text-white rounded-md hover:bg-navy-dark"
                          >
                            Leave
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.employeeId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.candidateName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.fatherName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.dateOfJoining
                            ? formatDOB(item.dateOfJoining)
                            : "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.designation}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.aadharPhoto ? (
                            <a
                              href={item.aadharPhoto}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-navy hover:text-indigo-800"
                            >
                              <ImageIcon size={20} />
                            </a>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.candidatePhoto ? (
                            <a
                              href={item.candidatePhoto}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-navy hover:text-indigo-800"
                            >
                              <ImageIcon size={20} />
                            </a>
                          ) : (
                            "-"
                          )}
                        </td>
                        {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.address || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.dateOfBirth
                            ? formatDOB(item.dateOfBirth)
                            : "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.gender || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.mobileNo}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.familyNo || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.relationshipWithFamily || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.accountNo || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.ifsc || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.branch || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.passbook ? (
                            <a
                              href={item.passbook}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-navy hover:text-indigo-800"
                            ><ImageIcon size={20} /></a>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.emailId || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.department}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.equipment || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.aadharNo || "-"}
                        </td> */}
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
                <thead className="bg-gray-100 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date Of Joining
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date Of Leaving
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mobile Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Father Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Designation
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reason Of Leaving
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {tableLoading ? (
                    <tr>
                      <td colSpan="9" className="px-6 py-12 text-center">
                        <div className="flex justify-center flex-col items-center">
                          <div className="w-6 h-6 border-4 border-indigo-500 border-dashed rounded-full animate-spin mb-2"></div>
                          <span className="text-gray-600 text-sm">
                            Loading leaving employees...
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan="9" className="px-6 py-12 text-center">
                        <p className="text-red-500">Error: {error}</p>
                        <button
                          onClick={fetchGlobalData}
                          className="mt-2 px-4 py-2 bg-navy text-white rounded-md hover:bg-navy-dark"
                        >
                          Retry
                        </button>
                      </td>
                    </tr>
                  ) : (
                    filteredLeavingData.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.employeeId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.dateOfJoining
                            ? formatDOB(item.dateOfJoining)
                            : "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.dateOfLeaving
                            ? formatDOB(item.dateOfLeaving)
                            : "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.mobileNo}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.fatherName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.designation}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.department}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.reasonOfLeaving}
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
    </div>
  );
};

export default Employee;
