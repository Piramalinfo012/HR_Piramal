import React, { useEffect, useState } from "react";
import { Search, Clock, HistoryIcon, Plus, X, CheckCircle } from "lucide-react";
import useDataStore from "../store/dataStore";
import toast from "react-hot-toast";

const CallingForJobAgencies = () => {
  const { addIndent } = useDataStore();

  const [activeTab, setActiveTab] = useState("pending");

  const [historyIndentData, setHistoryIndentData] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [fileUploading, setFileUploading] = useState(false);
  const [formData, setFormData] = useState({
    post: "",
    gender: "",
    department: "",
    prefer: "",
    numberOfPost: "",
    competitionDate: "",
    indentNumber: "",
    timestamp: "",
    experience: "", // New field for experience input

    salary: "",
    officeTimingFrom: "",
    officeTimingTo: "",
    typeOfWeek: "",
    residence: "",
    indenterName: "",

    socialSite: "",
    closedBy: "",
    jobConsultancyName: "",
    socialSiteTypes: [], // New field for social site types
    consultancyWhatsapp: "",
    uploadedFileUrl: "",
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
      if (result.success) {
        console.log("Data from row 7:", result.data);
      } else {
        console.error("Error:", result.error);
      }
      setTableLoading(false);
    };
    loadData();
  }, []);

  const getCurrentTimestamp = () => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");

    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  };

  const fetchIndentDataFromRow7 = async () => {
    try {
      const response = await fetch(
        "https://script.google.com/macros/s/AKfycbxtIL7N05BBt2ihqlPtASeHCjhp4P7cnTvRRqz2u_7uXAfA67EO6zB6R2NpI_DUkcY/exec?sheet=INDENT&action=fetch"
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

        const plaaned4Index = headers.indexOf("Planned 4");
        const actual4Index = headers.indexOf("Actual 4");

        const siteStatusIndex = headers.indexOf("Site Status");
        const socialSiteTypesIndex = headers.indexOf("Social Site Types");

        const CunsultancyScreensortImage = headers.indexOf("Cunsultancy Screensort Image");
        const CunsultancyNumber = headers.indexOf("Cunsultancy Number");
        const JobCunsultancyName = headers.indexOf("Job Cunsultancy Name");

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
          planned4: row[plaaned4Index],
          actual4: row[actual4Index],

          siteStatus: row[siteStatusIndex],
          socialSiteTypes: row[socialSiteTypesIndex],


          CunsultancyScreensortImage: row[CunsultancyScreensortImage],
          CunsultancyNumber: row[CunsultancyNumber],
          JobCunsultancyName: row[JobCunsultancyName],
        }));

        // console.log("processedData",processedData);

        const pendingTasks = processedData.filter((item) => {
          // console.log("Itme", item.actual1, item.plaaned1);
          return !item.actual4 && item.planned4;
        });

        const historyTasks = processedData.filter((item) => {
          // console.log("Itme", item.actual1, item.plaaned1);
          return item.actual4 && item.planned4;
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
          "https://script.google.com/macros/s/AKfycbxtIL7N05BBt2ihqlPtASeHCjhp4P7cnTvRRqz2u_7uXAfA67EO6zB6R2NpI_DUkcY/exec",
          {
            method: "POST",
            body: new URLSearchParams({
              action: "uploadFile",
              base64Data: base64Data,
              fileName: file.name,
              mimeType: file.type,
              folderId: "1L4Bz6-oltUO7LEz8Z4yFCzBn5Pv5Msh5",
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

    if (
      !formData.jobConsultancyName &&
      !formData.consultancyWhatsapp &&
      !formData.uploadedFileUrl
    ) {
      toast.error("Please fill at least one field");
      return;
    }

    try {
      setSubmitting(true);
      const timestamp = getCurrentTimestamp();

      const response = await fetch(
        "https://script.google.com/macros/s/AKfycbxtIL7N05BBt2ihqlPtASeHCjhp4P7cnTvRRqz2u_7uXAfA67EO6zB6R2NpI_DUkcY/exec",
        {
          method: "POST",
          body: new URLSearchParams({
            sheetName: "INDENT",
            action: "updateIndentPost", // NEW ACTION
            indentNumber: formData.indentNumber,
            actualDate: timestamp,
            jobConsultancyName: formData.jobConsultancyName,
            consultancyWhatsapp: formData.consultancyWhatsapp,
            uploadedFileUrl: formData.uploadedFileUrl,
          }),
        }
      );

      const result = await response.json();
      if (result.success) {
        toast.success("Posted successfully!");
        setFormData({
          /* reset */
        });
        setShowModal(false);
        await fetchIndentDataFromRow7();
      }
    } catch (error) {
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
      post: "",
      gender: "",
      department: "",
      prefer: "",
      numberOfPost: "",
      competitionDate: "",
      indentNumber: "",
      timestamp: "",
      experience: "",

      salary: "",
      officeTimingFrom: "",
      officeTimingTo: "",
      typeOfWeek: "",
      residence: "",
      indenterName: "",

      closedBy: "",
      socialSiteTypes: [],
      socialSite: "",
      jobConsultancyName: "",
      consultancyWhatsapp: "",
      uploadedFileUrl: "",
    });
    setShowModal(false);
  };

  const handlePostClick = (item) => {
    // Pre-fill only specific fields
    setFormData({
      ...formData,
      indentNumber: item.indentNumber, // Store this for update
      jobConsultancyName: "",
      consultancyWhatsapp: "",
      uploadedFileUrl: "",
    });
    setShowModal(true);
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
              {/* <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Post (पद)*
                </label>
                <input
                  type="text"
                  name="post"
                  value={formData.post}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter post title"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gender (लिंग) *
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Any">Any</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department (विभाग)
                </label>
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Department</option>
                  <option value="Production">Production</option>
                  <option value="Management">Management</option>
                  <option value="Sales">Sales</option>
                  <option value="HR">HR</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prefer (प्राथमिकता)
                </label>
                <select
                  name="prefer"
                  value={formData.prefer}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Any</option>
                  <option value="Experience">Experience</option>
                  <option value="Fresher">Fresher</option>
                </select>
              </div>

              
              {formData.prefer === "Experience" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Experience (अनुभव) *
                  </label>
                  <input
                    type="text"
                    name="experience"
                    value={formData.experience}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter experience details"
                    required={formData.prefer === "Experience"}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number Of Post (पद की संख्या) *
                </label>
                <input
                  type="number"
                  name="numberOfPost"
                  value={formData.numberOfPost}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter number of posts"
                  min="1"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Competition Date (समापन तिथि) *
                </label>
                <input
                  type="date"
                  name="competitionDate"
                  value={formData.competitionDate}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Social Site (सोशल साइट) *
                </label>
                <select
                  name="socialSite"
                  value={formData.socialSite}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">Select</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div> */}

              {/* Social Site Types checklist - only show when socialSite is Yes */}
              {/* {formData.socialSite === "Yes" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Social Site Types (सोशल साइट प्रकार) *
                  </label>
                  <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-300 rounded-md p-2">
                    {socialSiteOptions.map((option) => (
                      <div key={option} className="flex items-center">
                        <input
                          type="checkbox"
                          id={option}
                          value={option}
                          checked={formData.socialSiteTypes.includes(option)}
                          onChange={handleSocialSiteTypeChange}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <label
                          htmlFor={option}
                          className="ml-2 block text-sm text-gray-700"
                        >
                          {option}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )} */}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Indent Number
                </label>

                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled
                  value={formData.indentNumber}
                />
              </div>

              {/* Add after the Social Site Types div closes */}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Job Consultancy Name
                </label>
                <input
                  type="text"
                  name="jobConsultancyName"
                  value={formData.jobConsultancyName}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter job consultancy name"
                />
              </div>

              {/* <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Salary
                </label>
                <input
                  type="number"
                  name="salary"
                  value={formData.salary}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter salary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Office Timing (From)
                </label>
                <input
                  type="time"
                  name="officeTimingFrom"
                  value={formData.officeTimingFrom}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Office Timing (To)
                </label>
                <input
                  type="time"
                  name="officeTimingTo"
                  value={formData.officeTimingTo}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type of Week
                </label>
                <select
                  name="typeOfWeek"
                  value={formData.typeOfWeek}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select</option>
                  <option value="Week off">Week off</option>
                  <option value="No week off">No week off</option>
                  <option value="Both">Both</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Residence
                </label>
                <select
                  name="residence"
                  value={formData.residence}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select</option>
                  <option value="Stay">Stay</option>
                  <option value="Up-down">Up-down</option>
                  <option value="Both">Both</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Closed By
                </label>
                <input
                  type="text"
                  name="closedBy"
                  value={formData.closedBy}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Indenter Name
                </label>
                <input
                  type="text"
                  name="indenterName"
                  value={formData.indenterName}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter indenter name"
                />
              </div> */}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Consultancy WhatsApp
                </label>
                <input
                  type="tel"
                  name="consultancyWhatsapp"
                  value={formData.consultancyWhatsapp}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter WhatsApp number"
                />
              </div>

              {/* <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Upload File
                </label>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  accept="image/*,application/pdf"
                />
                {formData.uploadedFileUrl && (
                  <p className="text-xs text-green-600 mt-1">
                    File uploaded successfully!
                  </p>
                )}
              </div> */}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Upload File *
                </label>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  accept="image/*,application/pdf"
                  disabled={fileUploading || submitting}
                  required
                />
                {fileUploading && (
                  <div className="flex items-center mt-2">
                    <svg
                      className="animate-spin h-4 w-4 text-indigo-600 mr-2"
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
                    <span className="text-sm text-indigo-600">
                      Uploading file...
                    </span>
                  </div>
                )}
                {formData.uploadedFileUrl && !fileUploading && (
                  <p className="text-xs text-green-600 mt-1 flex items-center">
                    <svg
                      className="w-4 h-4 mr-1"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    File uploaded successfully!
                  </p>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-all duration-200"
                  disabled={submitting}
                >
                  Cancel
                </button>
                {/* <button
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
                      Processing...
                    </>
                  ) : (
                    "Submit"
                  )}
                </button> */}

                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-all duration-200 flex items-center justify-center disabled:bg-gray-400 disabled:cursor-not-allowed"
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
                      {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Closed By
                      </th> */}
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Indenter Name
                      </th>
                      {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Site Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Social Site Types
                      </th> */}
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
                              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
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
                          {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.closeBy}
                          </td> */}
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.indenterName}
                          </td>
                          {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
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
                          </td> */}
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
                        Job Cunsultancy Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cunsultancy Number
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cunsultancy Screensort Image
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
                              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
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
                            {item.JobCunsultancyName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.CunsultancyNumber}
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.CunsultancyScreensortImage ? (
                              <a
                                href={item.CunsultancyScreensortImage}
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
        </div>
      </div>
    </div>
  );
};

export default CallingForJobAgencies;
