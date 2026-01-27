import React, { useEffect, useState } from "react";
import { Search, Clock, HistoryIcon, Plus, X, CheckCircle } from "lucide-react";
import useDataStore from "../store/dataStore";
import toast from "react-hot-toast";

const FullFillPostion = () => {
  const { addIndent } = useDataStore();

  const [activeTab, setActiveTab] = useState("pending");

  const [historyIndentData, setHistoryIndentData] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [postFilter, setPostFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [fileUploading, setFileUploading] = useState(false);
  const [formData, setFormData] = useState({
    indentNumber: "",
    status: "",
    closedBy: "",
  });

  const [indentData, setIndentData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Social site options
  const socialSiteOptions = [
    "Instagram",
    "Facebook",
    "LinkedIn",
    "Referral",
    "Job Consultancy",
  ];

  useEffect(() => {
    const loadData = async () => {
      setTableLoading(true);
      const result = await fetchIndentDataFromRow7();
      setTableLoading(false);
    };
    loadData();
  }, []);

  const getCurrentTimestamp = () => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = String(now.getFullYear()).slice(-2);
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");

    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  };

  const fetchIndentDataFromRow7 = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_GOOGLE_SHEET_URL}?sheet=FMS&action=fetch`
      );

      const result = await response.json();

      if (result.success && result.data && result.data.length > 0) {
        // Dynamically find header row
        let headerRowIndex = -1;
        for (let i = 0; i < result.data.length; i++) {
          const row = result.data[i];
          if (row && (row.includes("Position Status") || row.includes("Indent No"))) {
            headerRowIndex = i;
            break;
          }
        }

        if (headerRowIndex === -1) {
          console.warn("Could not find dynamic header row in FMS, falling back to Row 7");
          headerRowIndex = 6;
        }

        const headers = result.data[headerRowIndex].map((h) => h ? h.trim() : "");
        const dataFromRow7 = result.data.slice(headerRowIndex + 1);

        // Find column indices with more flexible matching
        const findIdx = (names) => headers.findIndex(h => names.some(n => h.toLowerCase().includes(n.toLowerCase())));

        const timestampIndex = findIdx(["Timestamp"]);
        const indentNumberIndex = findIdx(["Indent No", "Indent Number"]);
        const postIndex = findIdx(["Post"]);
        const genderIndex = findIdx(["Gender"]);
        const departmentIndex = findIdx(["Department"]);
        const preferIndex = findIdx(["Prefer"]);
        const noOFPostIndex = findIdx(["Number Of Post", "Number Of Posts"]);
        const completionDateIndex = findIdx(["Completion Date"]);
        const experienceIndex = findIdx(["Experience"]);

        const jobConsultancyNameIndex = findIdx(["Job Cunsultancy Name", "Consultancy Name"]);
        const salaryIndex = findIdx(["Salary"]);
        const officeTimingIndex = findIdx(["Office Timing", "Timing"]);
        const typeOfWeekIndex = findIdx(["Type Of Week", "Weekly Off"]);
        const residenceIndex = findIdx(["Residence"]);
        const indenterNameIndex = findIdx(["Indenter Name", "Person Name"]);

        const statusIndex = findIdx(["Position Status", "Status"]);

        const planned3Index = findIdx(["Planned 3"]);
        const actual3Index = findIdx(["Actual 3"]);

        // Process the data
        const processedData = dataFromRow7.map((row) => ({
          timestamp: (row[timestampIndex] || "").toString(),
          indentNumber: (row[indentNumberIndex] || "").toString(),
          post: (row[postIndex] || "").toString(),
          gender: (row[genderIndex] || "").toString(),
          department: (row[departmentIndex] || "").toString(),
          prefer: (row[preferIndex] || "").toString(),
          noOfPost: (row[noOFPostIndex] || "").toString(),
          completionDate: (row[completionDateIndex] || "").toString(),
          experience: (row[experienceIndex] || "").toString(),
          jobConsultancyName: (row[jobConsultancyNameIndex] || "").toString(),
          salary: (row[salaryIndex] || "").toString(),
          officeTiming: (row[officeTimingIndex] || "").toString(),
          typeOfWeek: (row[typeOfWeekIndex] || "").toString(),
          residence: (row[residenceIndex] || "").toString(),
          indenterName: (row[indenterNameIndex] || "").toString(),
          status: (row[statusIndex] || "").toString(),
          planned3: row[planned3Index],
          actual3: row[actual3Index],
        }));

        const pendingTasks = processedData.filter((item) => {
          return !item.actual3 && item.planned3;
        });

        const historyTasks = processedData.filter((item) => {
          return item.actual3 && item.planned3;
        });

        setHistoryIndentData(historyTasks);
        setIndentData(pendingTasks);
        return {
          success: true,
          data: processedData,
          headers: headers,
        };
      } else {
        return {
          success: false,
          error: "Not enough rows in sheet data",
        };
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileUploading(true); // Start upload

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result;

        const response = await fetch(
          import.meta.env.VITE_GOOGLE_SHEET_URL,
          {
            method: "POST",
            body: new URLSearchParams({
              action: "uploadFile",
              base64Data: base64Data,
              fileName: file.name,
              mimeType: file.type,
              folderId: "1tSoT0na5lGKAE82z0kDiDNU6ikkHJjA1OayGwV5CFq9tfc3BVrbLl3g-nkyKwHoYIMzTI2aI",
            }),
          }
        );

        const result = await response.json();
        console.log("Upload result:", result); // Debug

        if (result.success) {
          setFormData((prev) => ({
            ...prev,
            uploadedFileUrl: result.fileUrl,
          }));
          toast.success("File uploaded successfully!");
        } else {
          toast.error(
            "File upload failed: " + (result.error || "Unknown error")
          );
        }
        setFileUploading(false); // Upload complete
      };

      reader.onerror = () => {
        toast.error("Error reading file");
        setFileUploading(false);
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("File upload error");
      setFileUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.status) {
      toast.error("Please select status");
      return;
    }

    if (formData.status === "Close" && !formData.closedBy) {
      toast.error("Please enter Close By name");
      return;
    }

    try {
      setSubmitting(true);
      const timestamp = getCurrentTimestamp();

      const response = await fetch(
        import.meta.env.VITE_GOOGLE_SHEET_URL,
        {
          method: "POST",
          body: new URLSearchParams({
            sheetName: "FMS",
            action: "updateFullFillStatus", // NEW ACTION
            indentNumber: formData.indentNumber,
            actualDate: timestamp,
            status: formData.status,
            closedBy: formData.closedBy || "",
          }),
        }
      );

      const result = await response.json();
      if (result.success) {
        toast.success("Status updated successfully!");
        setFormData({
          indentNumber: "",
          status: "",
          closedBy: "",
        });
        setShowModal(false);
        await fetchIndentDataFromRow7();
      } else {
        toast.error("Failed to update: " + (result.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Update error:", error);
      toast.error("Something went wrong!");
    } finally {
      setSubmitting(false);
    }
  };

  // Helper function to format date for Google Sheets
  const formatDateForSheet = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  const handleCancel = () => {
    setFormData({
      indentNumber: "",
      status: "Yes",
      closedBy: "",
    });
    setShowModal(false);
  };
  const handlePostClick = (item) => {
    setFormData({
      indentNumber: item.indentNumber,
      status: "Yes",
      closedBy: "",
    });
    setShowModal(true);
  };

  const filteredPendingData = indentData.filter((item) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      item.post?.toLowerCase().includes(term) ||
      item.indentNumber?.toLowerCase().includes(term) ||
      item.department?.toLowerCase().includes(term);
    const matchesDept = !deptFilter || item.department === deptFilter;
    const matchesPost = !postFilter || item.post === postFilter;
    return matchesSearch && matchesDept && matchesPost;
  });

  const filteredHistoryData = historyIndentData.filter((item) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      item.post?.toLowerCase().includes(term) ||
      item.indentNumber?.toLowerCase().includes(term) ||
      item.department?.toLowerCase().includes(term);
    const matchesDept = !deptFilter || item.department === deptFilter;
    const matchesPost = !postFilter || item.post === postFilter;
    return matchesSearch && matchesDept && matchesPost;
  });

  const departments = [...new Set(indentData.concat(historyIndentData).map(item => item.department))].filter(Boolean).sort();
  const posts = [...new Set(indentData.concat(historyIndentData).map(item => item.post))].filter(Boolean).sort();

  return (
    <div className="space-y-6 page-content p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Indent</h1>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
              <h3 className="text-lg font-medium text-gray-800">
                Create New Indent
              </h3>
              <button
                onClick={handleCancel}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Indent Number
                </label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy"
                  disabled
                  value={formData.indentNumber}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status *
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy"
                  required
                >
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                  <option value="Hold">Hold</option>
                </select>
              </div>

              {/* Show Close By input only when status is "Close" */}
              {formData.status === "Close" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Close By *
                  </label>
                  <input
                    type="text"
                    name="closedBy"
                    value={formData.closedBy}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy"
                    placeholder="Enter name"
                    required={formData.status === "Close"}
                  />
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-all duration-200"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-navy text-white rounded-md hover:bg-navy-dark transition-all duration-200 flex items-center justify-center"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    "Submit"
                  )}
                </button>

                {/* <button
                  type="submit"
                  className="px-4 py-2 bg-navy text-white rounded-md hover:bg-navy-dark transition-all duration-200 flex items-center justify-center disabled:bg-gray-400 disabled:cursor-not-allowed"
                  disabled={submitting || fileUploading}
                >
                  {submitting ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Processing...
                    </>
                  ) : fileUploading ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Uploading file...
                    </>
                  ) : (
                    "Submit"
                  )}
                </button> */}
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg w-fit">
            <button
              className={`py-2 px-4 font-medium text-sm rounded-md transition-all ${activeTab === "pending"
                ? "bg-white text-navy shadow-sm"
                : "text-gray-500 hover:text-gray-700"
                }`}
              onClick={() => setActiveTab("pending")}
            >
              <Clock size={16} className="inline mr-2" />
              Pending ({filteredPendingData.length})
            </button>
            <button
              className={`py-2 px-4 font-medium text-sm rounded-md transition-all ${activeTab === "history"
                ? "bg-white text-navy shadow-sm"
                : "text-gray-500 hover:text-gray-700"
                }`}
              onClick={() => setActiveTab("history")}
            >
              <CheckCircle size={16} className="inline mr-2" />
              History ({filteredHistoryData.length})
            </button>
          </div>

          <div className="flex flex-col md:flex-row items-end gap-3 flex-1 justify-end">
            <div className="relative flex-1 max-w-xs">
              <input
                type="text"
                placeholder="Search..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy bg-gray-50 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search
                size={18}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="w-40">
                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy bg-gray-50 text-sm"
                >
                  <option value="">All Departments</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-40">
                <select
                  value={postFilter}
                  onChange={(e) => setPostFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy bg-gray-50 text-sm"
                >
                  <option value="">All Posts</option>
                  {posts.map((post) => (
                    <option key={post} value={post}>
                      {post}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => {
                  setSearchTerm("");
                  setDeptFilter("");
                  setPostFilter("");
                }}
                className="p-2 text-gray-400 hover:text-navy transition-colors"
                title="Clear Filters"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow-lg rounded-lg overflow-hidden mt-6">
        <div className="p-6">
          {activeTab === "pending" && (
            <div className="overflow-x-auto">
              {/* Add max-height and overflow-y to the table container */}
              <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200 shadow">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Indent Number
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Post
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Gender
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Department
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Prefer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Experience
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        No. of Post
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Completion Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Social Site
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Social Site Types
                      </th>

                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Job Consultancy
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Salary
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Office Timing
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type Of Week
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Residence
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Closed By
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Indenter Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Consultancy WhatsApp
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        File
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {tableLoading ? (
                      <tr>
                        <td colSpan="7" className="px-6 py-12 text-center">
                          <div className="flex justify-center flex-col items-center">
                            <div className="w-6 h-6 border-4 border-blue-500 border-dashed rounded-full animate-spin mb-2"></div>
                            <span className="text-gray-600 text-sm">
                              Loading indent data...
                            </span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredPendingData.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-6 py-12 text-center">
                          <p className="text-gray-500">No indent data found.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredPendingData.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => handlePostClick(item)}
                              className="px-3 py-1 bg-navy text-white rounded hover:bg-navy-dark"
                            >
                              Post
                            </button>
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap">
                            {item.indentNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.post}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.gender}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.department}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.prefer}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.experience}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.noOfPost}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="text-sm text-gray-900 break-words">
                              {item.completionDate
                                ? (() => {
                                  const date = new Date(item.completionDate);
                                  if (!date || isNaN(date.getTime()))
                                    return "Invalid date";
                                  const day = date
                                    .getDate()
                                    .toString()
                                    .padStart(2, "0");
                                  const month = (date.getMonth() + 1)
                                    .toString()
                                    .padStart(2, "0");
                                  const year = date.getFullYear();
                                  const hours = date
                                    .getHours()
                                    .toString()
                                    .padStart(2, "0");
                                  const minutes = date
                                    .getMinutes()
                                    .toString()
                                    .padStart(2, "0");
                                  const seconds = date
                                    .getSeconds()
                                    .toString()
                                    .padStart(2, "0");
                                  return (
                                    <div>
                                      <div className="font-medium break-words">
                                        {`${day}/${month}/${year}`}
                                      </div>
                                      <div className="text-xs text-gray-500 break-words">
                                        {`${hours}:${minutes}:${seconds}`}
                                      </div>
                                    </div>
                                  );
                                })()
                                : "—"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.socialSite}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.socialSiteTypes}
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.jobConsultancyName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.salary}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.officeTiming}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.typeOfWeek}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.residence}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.closeBy}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.indenterName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.cunsultancyNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.cunsultancyScreensortImage ? (
                              <a
                                href={item.cunsultancyScreensortImage}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                View
                              </a>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "history" && (
            <div className="overflow-x-auto">
              {/* Add max-height and overflow-y to the table container */}
              <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200 shadow">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Indent Number
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Post
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Gender
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Department
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Prefer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Experience
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        No. of Post
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Completion Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Social Site
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Social Site Types
                      </th>

                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Job Consultancy
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Salary
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Office Timing
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type Of Week
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Residence
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Indenter Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Closed By
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {tableLoading ? (
                      <tr>
                        <td colSpan="7" className="px-6 py-12 text-center">
                          <div className="flex justify-center flex-col items-center">
                            <div className="w-6 h-6 border-4 border-blue-500 border-dashed rounded-full animate-spin mb-2"></div>
                            <span className="text-gray-600 text-sm">
                              Loading indent data...
                            </span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredHistoryData.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-6 py-12 text-center">
                          <p className="text-gray-500">No indent data found.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredHistoryData.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => handlePostClick(item)}
                              className="px-3 py-1 bg-navy text-white rounded hover:bg-navy-dark"
                            >
                              Post
                            </button>
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap">
                            {item.indentNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.post}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.gender}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.department}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.prefer}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.experience}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.noOfPost}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="text-sm text-gray-900 break-words">
                              {item.completionDate
                                ? (() => {
                                  const date = new Date(item.completionDate);
                                  if (!date || isNaN(date.getTime()))
                                    return "Invalid date";
                                  const day = date
                                    .getDate()
                                    .toString()
                                    .padStart(2, "0");
                                  const month = (date.getMonth() + 1)
                                    .toString()
                                    .padStart(2, "0");
                                  const year = date.getFullYear();
                                  const hours = date
                                    .getHours()
                                    .toString()
                                    .padStart(2, "0");
                                  const minutes = date
                                    .getMinutes()
                                    .toString()
                                    .padStart(2, "0");
                                  const seconds = date
                                    .getSeconds()
                                    .toString()
                                    .padStart(2, "0");
                                  return (
                                    <div>
                                      <div className="font-medium break-words">
                                        {`${day}/${month}/${year}`}
                                      </div>
                                      <div className="text-xs text-gray-500 break-words">
                                        {`${hours}:${minutes}:${seconds}`}
                                      </div>
                                    </div>
                                  );
                                })()
                                : "—"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.socialSite}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.socialSiteTypes}
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.jobConsultancyName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.salary}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.officeTiming}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.typeOfWeek}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.residence}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.indenterName}
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.closeBy}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.status}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div >
  );
};

export default FullFillPostion;
