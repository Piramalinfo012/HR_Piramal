import React, { useEffect, useState } from "react";
import { Search, Clock, HistoryIcon, Plus, X, CheckCircle } from "lucide-react";
import useDataStore from "../store/dataStore";
import toast from "react-hot-toast";

const CallingForJobAgencies = () => {

  const [activeTab, setActiveTab] = useState("pending");

  const [historyIndentData, setHistoryIndentData] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [desigFilter, setDesigFilter] = useState("");

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
    jobConsultancyNames: [], // Updated to handle multiple selected consultancies
    consultancyContacts: {}, // New: { [agencyName]: { contactPerson: "", contactNumber: "" } }
    socialSiteTypes: [],
    uploadedFileUrl: "",
  });
  const [consultancyOptions, setConsultancyOptions] = useState([]); // List of consultancies from USER sheet
  const [socialSiteOptions, setSocialSiteOptions] = useState([]); // List of social sites from Master sheet column D
  const [indentData, setIndentData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    masterData,
    fmsData: globalFmsData,
    userData: globalUserData,
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

  // User Data (Consultancy Names)
  useEffect(() => {
    if (!globalUserData || globalUserData.length === 0) return;
    const options = globalUserData.slice(1)
      .map(row => row[9])
      .filter(name => name && name.toString().trim() !== "");
    setConsultancyOptions([...new Set(options)]);
  }, [globalUserData]);

  // FMS Data (Indent Data)
  useEffect(() => {
    if (!globalFmsData || globalFmsData.length < 7) {
      setIndentData([]);
      setHistoryIndentData([]);
      return;
    }

    const resultData = globalFmsData;
    // Find headers dynamically
    let headerRowIndex = 5; // Default fallback
    for (let i = 0; i < Math.min(resultData.length, 20); i++) {
      const row = resultData[i];
      if (row.includes("Indent Number") || row.includes("Post")) {
        headerRowIndex = i;
        break;
      }
    }

    const headers = resultData[headerRowIndex].map((h) => h?.toString().trim());
    const dataFromRow7 = resultData.slice(headerRowIndex + 1);

    // Find column indices
    const timestampIndex = headers.indexOf("Timestamp");
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
    const requiredQualificationsIndex = headers.indexOf("Required Qualifications");
    const residenceIndex = headers.indexOf("Residence");
    const closeByIndex = headers.indexOf("Close By");
    const cunsultancyNumberIndex = headers.indexOf("Cunsultancy Number");
    const cunsultancyScreensortImageIndex = headers.indexOf("Cunsultancy Screensort Image");
    const siteStatusIndex = headers.indexOf("Site Status");
    const socialSiteTypesIndex = headers.indexOf("Social Site Types");
    const CunsultancyScreensortImage = headers.indexOf("Cunsultancy Screensort Image");
    const CunsultancyNumber = headers.indexOf("Cunsultancy Number");
    const JobCunsultancyName = headers.indexOf("Job Cunsultancy Name");

    const processedData = dataFromRow7.map((row) => ({
      timestamp: row[timestampIndex],
      indentNumber: row[4], // Column E
      indenterName: row[5], // Column F
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
      requiredQualifications: row[requiredQualificationsIndex],
      residence: row[residenceIndex],
      closeBy: row[closeByIndex],
      cunsultancyNumber: row[cunsultancyNumberIndex],
      cunsultancyScreensortImage: row[cunsultancyScreensortImageIndex],
      siteStatus: row[siteStatusIndex],
      socialSiteTypes: row[socialSiteTypesIndex],
      columnX: row[23],
      columnY: row[24],
      CunsultancyScreensortImage: row[CunsultancyScreensortImage],
      CunsultancyNumber: row[CunsultancyNumber],
      JobCunsultancyName: row[JobCunsultancyName],
    }));

    const pendingTasks = processedData.filter((item) => item.columnX && !item.columnY);
    const historyTasks = processedData.filter((item) => item.columnX && item.columnY);

    setHistoryIndentData(historyTasks);
    setIndentData(pendingTasks);

  }, [globalFmsData]);

  // Data loading handled by effects below

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

  // fetchIndentDataFromRow7 replaced by effects

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleConsultancyChange = (option) => {
    setFormData((prev) => {
      const isSelected = prev.jobConsultancyNames.includes(option);
      const updatedNames = isSelected
        ? prev.jobConsultancyNames.filter((name) => name !== option)
        : [...prev.jobConsultancyNames, option];

      const updatedContacts = { ...prev.consultancyContacts };
      if (isSelected) {
        delete updatedContacts[option];
      } else {
        updatedContacts[option] = { contactPerson: "", contactNumber: "" };
      }

      return {
        ...prev,
        jobConsultancyNames: updatedNames,
        consultancyContacts: updatedContacts,
      };
    });
  };

  const handleContactInfoChange = (agencyName, field, value) => {
    setFormData((prev) => ({
      ...prev,
      consultancyContacts: {
        ...prev.consultancyContacts,
        [agencyName]: {
          ...prev.consultancyContacts[agencyName],
          [field]: value,
        },
      },
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
              folderId: "1ok_nkIuB761YbEMx8yXtdjCGrtKI7YhqcVUzGYve8FYA6svVawuyvsZbz326MXb94E01DgGc",
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
      formData.jobConsultancyNames.length === 0
    ) {
      toast.error("Please select at least one Job Consultancy");
      return;
    }

    try {
      setSubmitting(true);
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const timestamp = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

      const PO_NUMBER = "PO-2";
      const consultancyNames = formData.jobConsultancyNames.join(", ");
      const contactPersons = formData.jobConsultancyNames
        .map(name => formData.consultancyContacts[name]?.contactPerson || "")
        .join(", ");
      const contactNumbers = formData.jobConsultancyNames
        .map(name => formData.consultancyContacts[name]?.contactNumber || "")
        .join(", ");

      // Row Data: [Indent Number, Step Code ("PO-2"), Timestamp, Status, "", "", Job Consultancy Name, Attachment URL, "", "", "", Contact Person, Contact Number]
      // Mapping:
      // A (0): Indent Number
      // B (1): Step Code
      // C (2): Timestamp
      // D (3): Status
      // E-K (4-10): Placeholders or empty
      // L (11): Contact Person
      // M (12): Contact Number

      const dataResponseRow = [
        formData.indentNumber,
        PO_NUMBER,
        timestamp,
        formData.status,
        "", // Col E 
        "", // Col F 
        consultancyNames, // Col G: Consultancy Name
        "", // Col H: Attachment URL (removed)
        "", // Col I
        "", // Col J
        "", // Col K
        contactPersons, // Col L: Contact Person
        contactNumbers, // Col M: Contact Number
      ];

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
        toast.success("Posted successfully!");
        setFormData((prev) => ({
          ...prev,
          jobConsultancyNames: [],
          consultancyContacts: {},
          uploadedFileUrl: "",
        }));
        setShowModal(false);

        refreshData();
      } else {
        toast.error("Failed to submit: " + (result.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Submit error:", error);
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
      jobConsultancyNames: [],
      contactPerson: "",
      contactNumber: "",
      uploadedFileUrl: "",
      status: "Yes",
    });
    setShowModal(false);
  };

  const handlePostClick = (item) => {
    // Pre-fill only specific fields
    setFormData({
      ...formData,
      indentNumber: item.indentNumber, // Store this for update
      jobConsultancyNames: [],
      consultancyContacts: {},
      uploadedFileUrl: "",
      status: "Yes",
    });
    setShowModal(true);
  };

  const filteredPendingData = indentData.filter((item) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (item.post || "").toLowerCase().includes(term) ||
      (item.indentNumber || "").toLowerCase().includes(term) ||
      (item.department || "").toLowerCase().includes(term);

    const matchesDept = !deptFilter || item.department === deptFilter;
    const matchesDesig = !desigFilter || item.post === desigFilter; // In this page, 'post' seems to be the designation

    return matchesSearch && matchesDept && matchesDesig;
  });

  const filteredHistoryData = historyIndentData.filter((item) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (item.siteStatus || "").toLowerCase().includes(term) ||
      (item.socialSiteTypes || "").toLowerCase().includes(term) ||
      (item.indentNumber || "").toLowerCase().includes(term) ||
      (item.department || "").toLowerCase().includes(term);

    const matchesDept = !deptFilter || item.department === deptFilter;
    const matchesDesig = !desigFilter || item.post === desigFilter;

    return matchesSearch && matchesDept && matchesDesig;
  });

  // Extract unique departments and posts (designations) for filters
  const allData = [...indentData, ...historyIndentData];
  const departments = [...new Set(allData.map(item => item.department))].filter(Boolean).sort();
  const posts = [...new Set(allData.map(item => item.post))].filter(Boolean).sort();

  return (
    <div className="space-y-6 page-content p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Calling For Job Agencies</h1>
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
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy"
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
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy"
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
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy"
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
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy"
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
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy"
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
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy"
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
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy"
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
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy"
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
                          className="h-4 w-4 text-navy focus:ring-navy border-gray-300 rounded"
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
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy"
                  disabled
                  value={formData.indentNumber}
                />
              </div>

              {/* Add after the Social Site Types div closes */}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Job Consultancy Name
                </label>
                <div className="space-y-4 max-h-80 overflow-y-auto border border-gray-300 rounded-md p-3">
                  {consultancyOptions.length > 0 ? (
                    consultancyOptions.map((option) => (
                      <div key={option} className="space-y-2 border-b border-gray-100 pb-3 last:border-0">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id={`consultancy-${option}`}
                            value={option}
                            checked={formData.jobConsultancyNames.includes(option)}
                            onChange={() => handleConsultancyChange(option)}
                            className="h-4 w-4 text-navy focus:ring-navy border-gray-300 rounded"
                          />
                          <label
                            htmlFor={`consultancy-${option}`}
                            className="ml-2 block text-sm font-medium text-gray-700"
                          >
                            {option}
                          </label>
                        </div>

                        {formData.jobConsultancyNames.includes(option) && (
                          <div className="ml-6 grid grid-cols-1 gap-2 border-l-2 border-navy/20 pl-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">
                                Contact person name
                              </label>
                              <input
                                type="text"
                                value={formData.consultancyContacts[option]?.contactPerson || ""}
                                onChange={(e) => handleContactInfoChange(option, "contactPerson", e.target.value)}
                                className="w-full border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-navy"
                                placeholder="Contact name"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">
                                Contact number
                              </label>
                              <input
                                type="text"
                                value={formData.consultancyContacts[option]?.contactNumber || ""}
                                onChange={(e) => handleContactInfoChange(option, "contactNumber", e.target.value)}
                                className="w-full border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-navy"
                                placeholder="Contact number"
                                required
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 italic">No consultancies found</p>
                  )}
                </div>
              </div>

              {/* Global contact info fields removed, now per consultancy */}

              {/* <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Salary
                </label>
                <input
                  type="number"
                  name="salary"
                  value={formData.salary}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy"
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
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy"
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
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy"
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
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy"
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
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy"
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
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy"
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
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy"
                  placeholder="Enter indenter name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy"
                >
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                  <option value="Hold">Hold</option>
                </select>
              </div>

              {/* WhatsApp field removed as per user request */}

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
                </button> */}

                <button
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
                </button>
              </div>
            </form>
          </div >
        </div >
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
              {/* <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Department</label> */}
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
              {/* <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Post</label> */}
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
                        Completion Date
                      </th>

                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Salary
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Office Timing
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
                        Indent No
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Person Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Post
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Salary
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Office Timing
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Types of Weekly Off
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Residence
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
                        Number Of Post
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Completion Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Required Qualifications
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
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
    </div >
  );
};

export default CallingForJobAgencies;
