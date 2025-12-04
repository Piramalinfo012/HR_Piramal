import React, { useEffect, useState } from "react";
import { Search, Clock, HistoryIcon, Plus, X, CheckCircle } from "lucide-react";
import useDataStore from "../store/dataStore";
import toast from "react-hot-toast";

const OnlinePosting = () => {
  const { addIndent } = useDataStore();

  const [postFormData, setPostFormData] = useState({
    siteStatus: "",
    socialSiteTypes: [],
  });

  const [activeTab, setActiveTab] = useState("pending");

  const [indentData, setIndentData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [historyIndentData, setHistoryIndentData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [showPostModal, setShowPostModal] = useState(false);
  const [selectedIndent, setSelectedIndent] = useState(null);

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

  const fetchIndentDataFromRow7 = async () => {
    try {
      const response = await fetch(
        "https://script.google.com/macros/s/AKfycbx7_8IiGXsVplVge8Fi8PIsxL1Ub_QqQI77x1flWxkl2KlyunmnVheG7yA6safW20yZ/exec?sheet=INDENT&action=fetch"
      );

      const result = await response.json();

      if (result.success && result.data && result.data.length >= 7) {
        // Get data starting from row 7 (array index 6) to end
        const dataFromRow7 = result.data.slice(6);

        // Find headers (assuming they're in row 6 - array index 5)
        const headers = result.data[5].map((h) => h.trim());

        // Find column indices for important fields
        const timestampIndex = headers.indexOf("Timestamp");
        const indentNumberIndex = headers.indexOf("Indent Number");
        const postIndex = headers.indexOf("Post");
        const genderIndex = headers.indexOf("Gender");
        const departmentIndex = headers.indexOf("Department");
        const preferIndex = headers.indexOf("Prefer");
        const noOFPostIndex = headers.indexOf("Number Of Posts");
        const completionDateIndex = headers.indexOf("Completion Date");
        const experienceIndex = headers.indexOf("Experience");

        const jobConsultancyNameIndex = headers.indexOf("Job Cunsultancy Name");
        const salaryIndex = headers.indexOf("Salary");
        const officeTimingIndex = headers.indexOf("Office Timing");
        const typeOfWeekIndex = headers.indexOf("Type Of Week");
        const residenceIndex = headers.indexOf("Residence");
        const closeByIndex = headers.indexOf("Close By");
        const indenterNameIndex = headers.indexOf("Indenter Name");
        const cunsultancyNumberIndex = headers.indexOf("Cunsultancy Number");
        const cunsultancyScreensortImageIndex = headers.indexOf(
          "Cunsultancy Screensort Image"
        );

        const Planned1Index = headers.indexOf("Planned 1");
        const actual1Index = headers.indexOf("Actual1");

        const siteStatusIndex = headers.indexOf("Site Status");
        const socialSiteTypesIndex = headers.indexOf("Social Site Types");

        // Add other column indices as needed

        // Process the data
        const processedData = dataFromRow7.map((row) => ({
          timestamp: row[timestampIndex],
          indentNumber: row[indentNumberIndex],
          post: row[postIndex],
          gender: row[genderIndex],
          department: row[departmentIndex],
          prefer: row[preferIndex],
          noOfPost: row[noOFPostIndex],
          completionDate: row[completionDateIndex],
          experience: row[experienceIndex],

          jobConsultancyName: row[jobConsultancyNameIndex],
          salary: row[salaryIndex],
          officeTiming: row[officeTimingIndex],
          typeOfWeek: row[typeOfWeekIndex],
          residence: row[residenceIndex],
          closeBy: row[closeByIndex],
          indenterName: row[indenterNameIndex],
          cunsultancyNumber: row[cunsultancyNumberIndex],
          cunsultancyScreensortImage: row[cunsultancyScreensortImageIndex],

          plaaned1: row[Planned1Index],
          actual1: row[actual1Index],

          socialSiteTypes: row[socialSiteTypesIndex],

          siteStatus: row[siteStatusIndex],
          // Add other fields as needed
        }));

        const pendingTasks = processedData.filter((item) => {
          // console.log("Itme", item.actual1, item.plaaned1);
          return !item.actual1 && item.plaaned1;
        });

        const historyTasks = processedData.filter((item) => {
          // console.log("Itme", item.actual1, item.plaaned1);
          return item.actual1 && item.plaaned1;
        });

        setHistoryIndentData(historyTasks);

        // console.log("Pending Tasks:", pendingTasks);
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

  const handlePostSubmit = async (e) => {
    e.preventDefault();

    console.log("postFormData.siteStatus", postFormData.siteStatus);

    if (postFormData.siteStatus === "Yes") {
      if (postFormData.socialSiteTypes.length === 0) {
        toast.error("Please select at least one Social Site Type");
        return;
      }
    }

    try {
      setSubmitting(true);

      const response = await fetch(
        "https://script.google.com/macros/s/AKfycbx7_8IiGXsVplVge8Fi8PIsxL1Ub_QqQI77x1flWxkl2KlyunmnVheG7yA6safW20yZ/exec",
        {
          method: "POST",
          body: new URLSearchParams({
            sheetName: "INDENT",
            action: "updatePostColumns",
            indentNumber: selectedIndent.indentNumber,
            siteStatus: postFormData.siteStatus,
            socialSiteTypes: postFormData.socialSiteTypes.join(", "),
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        toast.success("Post data updated successfully!");
        setPostFormData({ siteStatus: "", socialSiteTypes: [] });
        setShowPostModal(false);

        // Refresh table data
        setTableLoading(true);
        await fetchIndentDataFromRow7();
        setTableLoading(false);
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

  const handlePostClick = (indent, rowIndex) => {
    setSelectedIndent({ ...indent, rowIndex });
    setShowPostModal(true);
  };

  const filteredPendingData = indentData.filter((item) => {
    const matchesSearch =
      item.post?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.indentNo?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const filteredHistoryData = historyIndentData.filter((item) => {
    const matchesSearch =
      item.siteStatus?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.socialSiteTypes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.indentNo?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

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
                  setPostFormData({ siteStatus: "", socialSiteTypes: [] });
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handlePostSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Indent Number
                </label>

                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled
                  value={selectedIndent.indentNumber}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Site Status *
                </label>
                <select
                  name="siteStatus"
                  value={postFormData.siteStatus}
                  onChange={(e) =>
                    setPostFormData((prev) => ({
                      ...prev,
                      siteStatus: e.target.value,
                    }))
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">Select</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>

              {postFormData.siteStatus === "Yes" && (
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
                              if (checked) {
                                return {
                                  ...prev,
                                  socialSiteTypes: [
                                    ...prev.socialSiteTypes,
                                    value,
                                  ],
                                };
                              } else {
                                return {
                                  ...prev,
                                  socialSiteTypes: prev.socialSiteTypes.filter(
                                    (t) => t !== value
                                  ),
                                };
                              }
                            });
                          }}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
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
              )}

              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowPostModal(false);
                    setPostFormData({ siteStatus: "", socialSiteTypes: [] });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-all duration-200"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-all duration-200 flex items-center justify-center"
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
      <div className="bg-white p-4 rounded-lg shadow flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4">
        <div className="flex flex-1 max-w-md">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-2 border border-gray-400 border-opacity-30 rounded-lg focus:outline-none focus:ring-2  bg-white bg-opacity-10 focus:ring-indigo-500 text-gray-600  "
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search
              size={20}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 opacity-60"
            />
          </div>
        </div>
      </div>

      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="border-b border-gray-300 border-opacity-20">
          <nav className="flex -mb-px">
            <button
              className={`py-4 px-6 font-medium text-sm border-b-2 ${
                activeTab === "pending"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
              onClick={() => setActiveTab("pending")}
            >
              <Clock size={16} className="inline mr-2" />
              Pending ({filteredPendingData.length})
            </button>
            <button
              className={`py-4 px-6 font-medium text-sm border-b-2 ${
                activeTab === "history"
                  ? "border-indigo-500 text-indigo-600"
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
                              className="text-white bg-blue-600 px-3 py-1 rounded hover:bg-blue-700"
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
                            <button
                              onClick={() => handlePostClick(item, index + 7)}
                              className="text-white bg-blue-600 px-3 py-1 rounded hover:bg-blue-700"
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnlinePosting;
