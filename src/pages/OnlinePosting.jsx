import React, { useEffect, useState } from "react";
import { Search, Clock, HistoryIcon, Plus, X, CheckCircle } from "lucide-react";
import useDataStore from "../store/dataStore";
import toast from "react-hot-toast";

const OnlinePosting = () => {

  const [postFormData, setPostFormData] = useState({
    siteStatus: "",
    socialSiteTypes: [],
    onlinePlatformAttachment: "",
    selectedFile: null, // New field to store file locally
    status: "Yes",
  });

  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("pending");

  const [indentData, setIndentData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [desigFilter, setDesigFilter] = useState("");
  const [historyIndentData, setHistoryIndentData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [showPostModal, setShowPostModal] = useState(false);
  const [selectedIndent, setSelectedIndent] = useState(null);

  // Social site options from Master sheet
  const [socialSiteOptions, setSocialSiteOptions] = useState([]);

  const {
    masterData,
    fmsData: globalFmsData,
    dataResponseData,
    isLoading: storeLoading,
    refreshData
  } = useDataStore();

  useEffect(() => {
    setTableLoading(storeLoading);
  }, [storeLoading]);

  // Master Data (Social Sites)
  useEffect(() => {
    if (!masterData || masterData.length === 0) return;
    const data = masterData;
    const socialSitesList = [...new Set(
      data.slice(1).map(row => row[3]).filter(val => val && val.trim())
    )];
    setSocialSiteOptions(socialSitesList);
  }, [masterData]);

  // FMS Data (Indent Data)
  useEffect(() => {
    if (!globalFmsData || globalFmsData.length < 8) {
      setIndentData([]);
      setHistoryIndentData([]);
      return;
    }

    // 🔥 Data Response Map (create once)
    const dataResponseMap = {};
    dataResponseData.slice(1).forEach(row => {
      const indentNo = row[0];      // Col A (Indent Number)
      if (!indentNo) return;

      dataResponseMap[indentNo] = {
        siteStatus: row[3],         // ✅ Col D
        socialSiteTypes: row[4],    // ✅ Col E
      };
    });

    const dataFromRow2 = globalFmsData.slice(9); // Matches previous slice(8) logic

    const processedData = dataFromRow2.map((row) => ({
      status: row[0],              // Col A
      stepCode: row[1],            // Col B
      indentNumber: row[4],        // Col E
      timestamp: row[3],           // Col D
      indenterName: row[5],        // Col F
      post: row[6],                // Col G
      salary: row[7],              // Col H
      officeTiming: row[8],        // Col I
      typeOfWeek: row[9],          // Col J
      residence: row[10],           // Col K
      gender: row[11],             // Col L
      department: row[12],         // Col M
      prefer: row[13],             // Col N
      noOfPost: row[14],           // Col O
      completionDate: row[15],     // Col P
      experience: row[16],         // Col Q
       planned: row[17]?.toString().trim() || "", // Col R
  actual: row[18]?.toString().trim() || "",  // Col S
      siteStatus: dataResponseMap[row[4]]?.siteStatus || "",
      socialSiteTypes: dataResponseMap[row[4]]?.socialSiteTypes || "",
    }));

   const filteredPending = processedData.filter(item =>
  item.planned !== "" && item.actual === ""
);

const filteredHistory = processedData.filter(item =>
  item.planned !== "" && item.actual !== ""
);


    setHistoryIndentData(filteredHistory);
    setIndentData(filteredPending);

  }, [globalFmsData]);







  // fetchMasterData is replaced by useEffect reacting to global store

  // fetchIndentDataFromRow7 is replaced by useEffect reacting to global store


  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) {
      setPostFormData((prev) => ({
        ...prev,
        selectedFile: null,
      }));
      return;
    }

    console.log("📁 File selected locally:", file.name);
    setPostFormData((prev) => ({
      ...prev,
      selectedFile: file,
    }));
    toast.success("File selected: " + file.name);
  };

  // Internal upload function used during submission
  const uploadFileToServer = async (file) => {
    console.log("🚀 Starting file upload during submission...");
    try {
      const base64Data = await convertFileToBase64(file);
      const response = await fetch(import.meta.env.VITE_GOOGLE_SHEET_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          action: "uploadFile",
          base64Data: base64Data,
          fileName: file.name,
          mimeType: file.type,
          folderId: "11INOky8szb4bHx4-M-62HqkXi-SAM6K-",
        }),
      });

      const result = await response.json();
      if (result.success) {
        console.log("✅ Upload success, file URL:", result.fileUrl);
        return result.fileUrl;
      } else {
        throw new Error(result.error || "Upload failed");
      }
    } catch (error) {
      console.error("🔥 Upload error:", error);
      throw error;
    }
  };


  // Helper function
  const convertFileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  const handlePostSubmit = async (e) => {
    e.preventDefault();

    // Validate that file is selected
    if (!postFormData.selectedFile) {
      toast.error("Please select an attachment file before submitting!");
      return;
    }

    // Validate that at least one social site is selected
    if (!postFormData.socialSiteTypes || postFormData.socialSiteTypes.length === 0) {
      toast.error("Please select at least one social site type!");
      return;
    }

    try {
      setSubmitting(true);
      setUploading(true); // Show uploading status

      // 1. Upload the file first
      let fileUrl = "";
      try {
        fileUrl = await uploadFileToServer(postFormData.selectedFile);
      } catch (uploadError) {
        toast.error("File upload failed: " + uploadError.message);
        setUploading(false);
        setSubmitting(false);
        return;
      }

      setUploading(false);

      // 2. Prepare data for submission
      const PO_NUMBER = "PO-1";
      const now = new Date();
      const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

      const dataResponseRow = [
        selectedIndent.indentNumber,
        PO_NUMBER,
        timestamp,
        postFormData.status,
        postFormData.socialSiteTypes.join(", "),
        fileUrl
      ];

      // 3. Submit to DATA RESPONSE
      const response = await fetch(
        import.meta.env.VITE_GOOGLE_SHEET_URL,
        {
          method: "POST",
          body: new URLSearchParams({
            sheetName: "Data Resposnse",
            action: "bulkInsert",
            rowsData: JSON.stringify([dataResponseRow]),
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        toast.success("Post data submitted successfully!");
        setPostFormData({ siteStatus: "", socialSiteTypes: [], onlinePlatformAttachment: "", selectedFile: null, status: "Yes" });
        setShowPostModal(false);

        // Refresh table data
        setTableLoading(true);
        await refreshData();
        setTableLoading(false);
      } else {
        toast.error("Failed to submit: " + (result.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Update error:", error);
      toast.error("Something went wrong!");
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  const handlePostClick = (indent, rowIndex) => {
    setSelectedIndent({ ...indent, rowIndex });
    setShowPostModal(true);
  };

  const filteredPendingData = indentData.filter((item) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      item.post?.toLowerCase().includes(term) ||
      item.indentNumber?.toLowerCase().includes(term) ||
      item.department?.toLowerCase().includes(term);

    const matchesDept = !deptFilter || item.department === deptFilter;
    const matchesDesig = !desigFilter || item.post === desigFilter;

    return matchesSearch && matchesDept && matchesDesig;
  });

  const filteredHistoryData = historyIndentData.filter((item) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      item.siteStatus?.toLowerCase().includes(term) ||
      item.socialSiteTypes?.toLowerCase().includes(term) ||
      item.indentNumber?.toLowerCase().includes(term) ||
      item.department?.toLowerCase().includes(term);

    const matchesDept = !deptFilter || item.department === deptFilter;
    const matchesDesig = !desigFilter || item.post === desigFilter;

    return matchesSearch && matchesDept && matchesDesig;
  });

  const allData = [...indentData, ...historyIndentData];
  const departments = [...new Set(allData.map(item => item.department))].filter(Boolean).sort();
  const posts = [...new Set(allData.map(item => item.post))].filter(Boolean).sort();

  return (
    <div className="space-y-6 page-content p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Online Posting</h1>
      </div>

      {/* Post Modal */}
      {showPostModal && (
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
              <h3 className="text-lg font-medium text-gray-800">
                Post to Social Sites
              </h3>
              <button
                onClick={() => {
                  setShowPostModal(false);
                  setPostFormData({ siteStatus: "", socialSiteTypes: [], onlinePlatformAttachment: "", selectedFile: null, status: "Yes" });
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handlePostSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Indent Number
                  </label>

                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy bg-gray-50"
                    disabled
                    value={selectedIndent.indentNumber}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status *
                  </label>
                  <select
                    name="status"
                    value={postFormData.status}
                    onChange={(e) =>
                      setPostFormData((prev) => ({
                        ...prev,
                        status: e.target.value,
                      }))
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy"
                    required
                  >
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                    <option value="Hold">Hold</option>
                  </select>
                </div>
              </div>



              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Online Platform Attachment *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy text-sm"
                      required
                    />
                  </div>
                  {postFormData.selectedFile && (
                    <p className="text-xs text-blue-600 mt-1 truncate">
                      Selected: {postFormData.selectedFile.name}
                    </p>
                  )}
                  {uploading && <p className="text-xs text-navy mt-1 animate-pulse">Uploading file, please wait...</p>}
                </div>
              </>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Social Site Types *
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-300 rounded-md p-2">
                  {socialSiteOptions.map((option) => (
                    <div key={option} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`post-${option}`}
                        value={option}
                        checked={postFormData.socialSiteTypes.includes(
                          option
                        )}
                        onChange={(e) => {
                          const { value, checked } = e.target;
                          setPostFormData((prev) => {
                            const currentTypes = prev.socialSiteTypes || [];
                            if (checked) {
                              return {
                                ...prev,
                                socialSiteTypes: [...currentTypes, value],
                              };
                            } else {
                              return {
                                ...prev,
                                socialSiteTypes: currentTypes.filter((t) => t !== value),
                              };
                            }
                          });
                        }}
                        className="h-4 w-4 text-navy focus:ring-navy border-gray-300 rounded"
                      />
                      <label
                        htmlFor={`post-${option}`}
                        className="ml-2 block text-sm text-gray-700"
                      >
                        {option}
                      </label>
                    </div>
                  ))}
                </div>
              </div>


              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowPostModal(false);
                    setPostFormData({ siteStatus: "", socialSiteTypes: [], onlinePlatformAttachment: "", selectedFile: null, status: "Yes" });
                  }}
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
                      Submitting...
                    </>
                  ) : (
                    "Submit"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-lg shadow space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search by post, indent, etc..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy bg-gray-50 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search
              size={20}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="space-y-1">

              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy bg-gray-50 text-sm"
              >
                <option value="">All Departments</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">

              <select
                value={desigFilter}
                onChange={(e) => setDesigFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy bg-gray-50 text-sm"
              >
                <option value="">All Posts</option>
                {posts.map(post => (
                  <option key={post} value={post}>{post}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm("");
                  setDeptFilter("");
                  setDesigFilter("");
                }}
                className="text-sm text-navy hover:text-indigo-800 font-medium flex items-center gap-1 mb-2"
              >
                <X size={14} /> Clear Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="border-b border-gray-300 border-opacity-20">
          <nav className="flex -mb-px">
            <button
              className={`py-4 px-6 font-medium text-sm border-b-2 ${activeTab === "pending"
                ? "border-indigo-500 text-navy"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              onClick={() => setActiveTab("pending")}
            >
              <Clock size={16} className="inline mr-2" />
              Pending ({filteredPendingData.length})
            </button>
            <button
              className={`py-4 px-6 font-medium text-sm border-b-2 ${activeTab === "history"
                ? "border-indigo-500 text-navy"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              onClick={() => setActiveTab("history")}
            >
              <CheckCircle size={16} className="inline mr-2" />
              History ({filteredHistoryData.length})
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === "pending" && (
            <div className="table-container shadow">
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
                      Indenter Name
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
                    <th className="px-4 py-2 text-sm font-medium text-gray-500 max-w-[180px] whitespace-normal break-words">
                      Experience
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      No. of Post
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Completion Date
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
                            onClick={() => handlePostClick(item, index + 7)}
                            className="text-white bg-navy px-3 py-1 rounded hover:bg-navy-dark"
                          >
                            Post
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {item.indentNumber}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.indenterName}
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
                        <td className="px-4 py-2 text-sm font-medium text-gray-500 max-w-[180px] whitespace-normal break-words">
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
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "history" && (
            <div className="table-container shadow">
              <table className="min-w-full divide-y divide-gray-200 shadow">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
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
                    <th className="px-4 py-2 text-sm font-medium text-gray-500 max-w-[180px] whitespace-normal break-words">
                      Experience
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      No. of Post
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Completion Date
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
                      Site Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Social Site Types
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
                        <td className="px-4 py-2 text-sm font-medium text-gray-500 max-w-[180px] whitespace-normal break-words">
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
                          {item.siteStatus}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.socialSiteTypes}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnlinePosting;
