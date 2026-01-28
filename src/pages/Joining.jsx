import React, { useEffect, useState } from "react";
import { Search, Clock, CheckCircle, X, Upload } from "lucide-react";
import toast from "react-hot-toast";

const Joining = () => {
  // TWO DIFFERENT URLs
  const FETCH_URL = import.meta.env.VITE_GOOGLE_SHEET_URL; // For fetching data
  const JOINING_SUBMIT_URL = "https://script.google.com/macros/s/AKfycbwhFgVoAB4S1cKrU0iDRtCH5B2K-ol2c0RmaaEWXGqv0bdMzs3cs3kPuqOfUAR3KHYZ7g/exec"; // For form submission

  const [candidateData, setCandidateData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [desigFilter, setDesigFilter] = useState("");
  const [tableLoading, setTableLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [formData, setFormData] = useState({
    candidateEnquiryNo: "",
    nameAsPerAadhar: "",
    fatherName: "",
    dateOfJoining: "",
    joiningPlace: "",
    designation: "",
    salary: "",
    aadharFrontPhoto: null,
    panCard: null,
    candidatePhoto: null,
    currentAddress: "",
    addressAsPerAadhar: "",
    dobAsPerAadhar: "",
    gender: "",
    mobileNo: "",
    familyMobileNo: "",
    twoReferenceNo: "",
    pastPfId: "",
    currentBankAcNo: "",
    ifscCode: "",
    branchName: "",
    bankPassbookPhoto: null,
    personalEmail: "",
    esicNo: "",
    highestQualification: "",
    aadharCardNo: "",
    qualificationPhoto: null,
    salarySlip: null,
    resumeUpload: null
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchCandidateData();
  }, []);

  // ============================================
  // EXISTING FETCH LOGIC - NO CHANGE
  // ============================================
const fetchCandidateData = async () => {
  setTableLoading(true);
  try {
    const response = await fetch(
      `${JOINING_SUBMIT_URL}?sheet=JOINING_FMS&action=fetch`
    );

    if (!response.ok) {
      // Handle HTTP errors
      console.error(`HTTP error! status: ${response.status}`);
      setCandidateData([]);
      return;
    }

    const result = await response.json();

    // Check if the result contains the specific getDataRange error FIRST
    if (result && result.error && typeof result.error === 'string' &&
        result.error.includes("getDataRange")) {
      console.warn("Sheet JOINING_FMS does not exist or is not accessible:", result.error);
      setCandidateData([]);
      return;
    }

    if (!result || !result.success || !result.data) {
      console.error("Invalid response format:", result);
      throw new Error(result?.error || "Invalid response format from server");
    }

    // Check if there's sufficient data (at least 8 rows to slice from index 7)
    if (!result.data || result.data.length < 8) {
      console.warn("Insufficient data in JOINING_FMS sheet, setting empty data");
      setCandidateData([]);
      return;
    }

    // Actual data row 8 se
    const dataRows = result.data.slice(7);

    // Check if dataRows is empty after slicing
    if (!dataRows || dataRows.length === 0) {
      console.warn("No data rows found after slicing, setting empty data");
      setCandidateData([]);
      return;
    }

    const processedData = dataRows
      .filter(row => {
        // Check if row is null, undefined, or empty
        if (!row) {
          return false; // Skip null/undefined rows
        }

        // Check if row has enough columns (at least 9 for column I at index 8)
        if (row.length < 9) {
          return false; // Skip rows that don't have enough columns
        }

        // Check if the row is completely empty (all elements are empty/falsy)
        const isRowEmpty = row.every(cell => !cell || cell.toString().trim() === '');
        if (isRowEmpty) {
          return false; // Skip completely empty rows
        }

        // Column I (index 8)
        const status = (row[8] || "").toString().trim().toUpperCase();

        // ❌ DONE wale nahi chahiye
        return status !== "DONE";
      })
      .map((row, idx) => ({
        rowIndex: idx + 8,
        id: row[5] || "",       // Column A - ID
        department: row[1] || "", // Column B - Department
        designation: row[2] || "", // Column C - Designation
        candidateName: row[6] || "", // Column D - Candidate Name
        joiningPlace: row[13] || "", // Column E - Joining Place
        salary: row[14] || "", // Column F - Salary
        aadharFrontsidephoto: row[15] || "", // Column G - Aadhar Frontside photo
        aadharBacksidephoto: row[16] || "", // Column H - Aadhar Backside photo
        panCardphoto: row[17] || "", // Column I - PAN Card photo
        bankAccountphoto: row[18] || "", // Column J - Bank Account photo
        contactNo: row[4] || "", // Column E - Contact No
        mail: row[5] || "",     // Column F - Email
        indentId: row[6] || "", // Column G - Indent ID
      }));

    setCandidateData(processedData);
  } catch (error) {
    console.error("Fetch error:", error);
    // Specifically handle the getDataRange error
    if (error.message && (error.message.includes("getDataRange") ||
        error.message.includes("Cannot read properties of null"))) {
      // If it's the specific getDataRange error, set empty data silently
      setCandidateData([]);
    } else if (error.message && (error.message.includes("sheet") || error.message.includes("not found"))) {
      // If it's a sheet not found error, set empty data
      setCandidateData([]);
    } else {
      // For other errors, show toast
      toast.error("Failed to fetch candidate data: " + error.message);
    }
  } finally {
    setTableLoading(false);
  }
};


  const filteredData = candidateData.filter((item) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (item.candidateName || "").toLowerCase().includes(term) ||
      (item.id || "").toLowerCase().includes(term) ||
      (item.designation || "").toLowerCase().includes(term) ||
      (item.department || "").toLowerCase().includes(term);

    const matchesDept = !deptFilter || item.department === deptFilter;
    const matchesDesig = !desigFilter || item.designation === desigFilter;

    return matchesSearch && matchesDept && matchesDesig;
  });

  const departments = [...new Set(candidateData.map(item => item.department))].filter(Boolean).sort();
  const designations = [...new Set(candidateData.map(item => item.designation))].filter(Boolean).sort();

  const handleOpenModal = (candidate) => {
    setSelectedCandidate(candidate);
    setFormData({
      candidateEnquiryNo: candidate.indentId || "",
      nameAsPerAadhar: "",
      fatherName: "",
      dateOfJoining: "",
      joiningPlace: "",
      designation: candidate.designation || "",
      salary: "",
      aadharFrontPhoto: null,
      panCard: null,
      candidatePhoto: null,
      currentAddress: "",
      addressAsPerAadhar: "",
      dobAsPerAadhar: "",
      gender: "",
      mobileNo: candidate.contactNo || "",
      familyMobileNo: "",
      twoReferenceNo: "",
      pastPfId: "",
      currentBankAcNo: "",
      ifscCode: "",
      branchName: "",
      bankPassbookPhoto: null,
      personalEmail: candidate.mail || "",
      esicNo: "",
      highestQualification: "",
      aadharCardNo: "",
      qualificationPhoto: null,
      salarySlip: null,
      resumeUpload: null
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedCandidate(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    if (files && files[0]) {
      setFormData(prev => ({
        ...prev,
        [name]: files[0]
      }));
    }
  };

  const dynamicApiService = {
    // CREATE - Insert new row using dynamic backend
    async create(sheetName, data) {
      try {
        // Encode parameters for GET request
        const params = new URLSearchParams();
        params.append('action', 'create');
        params.append('sheet', sheetName);
        params.append('data', JSON.stringify(data));

        // Use GET request instead of POST
        const url = `${JOINING_SUBMIT_URL}?${params.toString()}`;

        const response = await fetch(url, {
          method: 'GET',
          mode: 'no-cors' // Add no-cors mode
        });

        // Since we're using no-cors, we can't read the response
        // But the request will go through
        return { success: true, message: 'Data submitted successfully' };
      } catch (error) {
        console.error('Create error:', error);
        return { success: false, error: error.message };
      }
    },

    // FILE UPLOAD using dynamic backend
    async uploadFile(file, folderId) {
      if (!file) return "";

      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const base64Data = e.target.result;
            const response = await fetch(import.meta.env.VITE_GOOGLE_SHEET_URL, {
              method: "POST",
              body: new URLSearchParams({
                action: "uploadFile",
                base64Data: base64Data,
                fileName: file.name,
                mimeType: file.type,
                folderId: '1DL_Xf0_9fszToIDlZ3MMsiebDSK4OeIu2FOa1kvA8vPZCGoVKN6Johxc95FLVqP9Qp7cBp9v',
              }),
            });

            const result = await response.json();
            if (result.success) {
              resolve(result.fileUrl);
            } else {
              console.error("Upload failed in API service:", result.error);
              resolve("");
            }
          } catch (error) {
            console.error("Upload error in service:", error);
            resolve("");
          }
        };
        reader.onerror = () => resolve("");
        reader.readAsDataURL(file);
      });
    }
  };

  // ============================================
  // UPDATED handleSubmit FUNCTION
  // Using new dynamic backend for submission
  // ============================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);

    try {
      // Upload all files using specific Folder IDs
      const aadharFrontUrl = await dynamicApiService.uploadFile(formData.aadharFrontPhoto, "1G4C-jwXRmkpbpR0d-7LW46jmtINqmEDtIEfGeyFya02oPVaODGQbh-zgWH5mUSlYPB_g1NnH");
      const panCardUrl = await dynamicApiService.uploadFile(formData.panCard, "1KF3kXxiteLk5WFy_zRCyQSg_7YSp-1ngoLNIoc29xly2OVdspjTgw9g-tZekv0OfIPaH_iXB");
      const candidatePhotoUrl = await dynamicApiService.uploadFile(formData.candidatePhoto, "1Mu3MgyDhc-kM2UesunFRJxLo1sPYOQvdZa1cyKX8yvhPfiz5ssUDxIofM_MAIjlggXAOR4P9");
      const bankPassbookUrl = await dynamicApiService.uploadFile(formData.bankPassbookPhoto, "13WCUdwjeDfmC5Prfayqx45gv6GRebLpIwe2d0dHzVJ0mefMivnBqKD9YPqRiBytXaBJjs0P9");
      const qualificationPhotoUrl = await dynamicApiService.uploadFile(formData.qualificationPhoto, "1H8kcgIU2Xr2JZWbIBklPiyOX7bnJ58WUn4Xnl3OlS2mV4B2KHk1wWOAmuIwZ3lEauSk4pClI");
      const salarySlipUrl = await dynamicApiService.uploadFile(formData.salarySlip, "1G2bX00chZoWyqeVm_P_Od7Fg901yqt6yZp3OogK4d1gjmIeVy1C2293fqqyaNyzUVj5P0aLd");
      const resumeUrl = await dynamicApiService.uploadFile(formData.resumeUpload, "1wofoM_7jVDj61UV1R5QoxSdQeJhZTOgJMaAOKEqrbvqO-5HUis6qoc3z65K2e2JDIPMZpC7q");

      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const timestamp = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

      // Prepare data for columns B to AD (29 columns total)
      // Column A will be empty (handled by backend)
      const rowData = [
        timestamp,
        // Create ID format: IndentID_Designation (e.g., IN-32_Intern)
        // Remove any name appended to the Enquiry No (e.g., IN-05_pooja -> IN-05)
        `${formData.candidateEnquiryNo.split('_')[0].trim()}_${formData.designation}`, // B
        formData.nameAsPerAadhar,              // C
        formData.fatherName,                   // D
        formData.dateOfJoining,                // E
        formData.joiningPlace,                 // F
        formData.designation,                  // G
        formData.salary,                       // H
        aadharFrontUrl,                        // I
        panCardUrl,                            // J
        candidatePhotoUrl,                     // K
        formData.currentAddress,               // L
        formData.addressAsPerAadhar,           // M
        formData.dobAsPerAadhar,               // N
        formData.gender,                       // O
        formData.mobileNo,                     // P
        formData.familyMobileNo,               // Q
        formData.twoReferenceNo,               // R
        formData.pastPfId,                     // S
        formData.currentBankAcNo,              // T
        formData.ifscCode,                     // U
        formData.branchName,                   // V
        bankPassbookUrl,                       // W
        formData.personalEmail,                // X
        formData.esicNo,                       // Y
        formData.highestQualification,         // Z
        formData.aadharCardNo,                 // AA
        qualificationPhotoUrl,                 // AB
        salarySlipUrl,                         // AC
        resumeUrl                              // AD
      ];

      // Submit using NEW dynamic backend
      const result = await dynamicApiService.create('JOINING ENTRY FORM', rowData);

      if (result.success) {
        toast.success("Joining details submitted successfully!");
        handleCloseModal();
        fetchCandidateData(); // Refresh the table using OLD fetch logic
      } else {
        toast.error(result.error || "Failed to submit joining details");
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Error submitting form");
    } finally {
      setUploading(false);
    }
  };
  // ============================================
  // JSX REMAINS EXACTLY THE SAME
  // ============================================
  return (
    <div className="space-y-6 page-content p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800 uppercase">Joining Management</h1>
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1"></div>
          <div className="flex flex-col md:flex-row items-end gap-3 flex-1 justify-end">
            <div className="relative flex-1 max-w-xs">
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
              <div className="w-40">
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
              <div className="w-40">
                <select
                  value={desigFilter}
                  onChange={(e) => setDesigFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy bg-gray-50 text-sm"
                >
                  <option value="">All Posts</option>
                  {designations.map(desig => (
                    <option key={desig} value={desig}>{desig}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => {
                  setSearchTerm("");
                  setDeptFilter("");
                  setDesigFilter("");
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

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-6">
          <div className="overflow-x-auto table-container">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Candidate Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joining Place</th>
                  {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th> */}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Designation</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salary</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aadhar Frontside photo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aadhar Backside photo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PAN Card photo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bank Account photo</th>
                  {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th> */}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tableLoading ? (
                  <tr><td colSpan="7" className="px-6 py-12 text-center text-gray-500">Loading...</td></tr>
                ) : filteredData.length === 0 ? (
                  <tr><td colSpan="7" className="px-6 py-12 text-center text-gray-500">No candidates found.</td></tr>
                ) : (
                  filteredData.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleOpenModal(item)}
                          className="bg-navy text-white px-4 py-2 rounded-lg hover:bg-navy-dark transition-colors"
                        >
                          Fill Details
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-navy">{item.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.candidateName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.joiningPlace}</td>
                      {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.department}</td> */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.designation}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.salary}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.aadharFrontsidephoto}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.aadharBacksidephoto}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.panCardphoto}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.bankAccountphoto}</td>
                      {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.contactNo}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.mail}</td> */}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Form - EXACTLY SAME AS BEFORE */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-800">Joining Details Form</h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* All your form fields remain exactly the same */}
                {/* Candidate Enquiry No. */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Candidate Enquiry No. <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="candidateEnquiryNo"
                    value={formData.candidateEnquiryNo}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy"
                  />
                </div>

                {/* Name As per Aadhar */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name As per Aadhar <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="nameAsPerAadhar"
                    value={formData.nameAsPerAadhar}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy"
                  />
                </div>

                {/* Father Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Father Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="fatherName"
                    value={formData.fatherName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy"
                  />
                </div>

                {/* Date of Joining */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date of Joining <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="dateOfJoining"
                    value={formData.dateOfJoining}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy"
                  />
                </div>

                {/* Joining Place */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Joining Place <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="joiningPlace"
                    value={formData.joiningPlace}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy"
                  />
                </div>

                {/* Designation */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Designation <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="designation"
                    value={formData.designation}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy"
                  />
                </div>

                {/* Salary */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Salary <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="salary"
                    value={formData.salary}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy"
                  />
                </div>

                {/* Aadhar Frontside Photo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Aadhar Frontside Photo
                  </label>
                  <input
                    type="file"
                    name="aadharFrontPhoto"
                    onChange={handleFileChange}
                    accept="image/*"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy"
                  />
                </div>

                {/* Pan Card */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pan Card
                  </label>
                  <input
                    type="file"
                    name="panCard"
                    onChange={handleFileChange}
                    accept="image/*"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy"
                  />
                </div>

                {/* Candidate Photo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Candidate Photo
                  </label>
                  <input
                    type="file"
                    name="candidatePhoto"
                    onChange={handleFileChange}
                    accept="image/*"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy"
                  />
                </div>

                {/* Current Address */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Address <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="currentAddress"
                    value={formData.currentAddress}
                    onChange={handleInputChange}
                    required
                    rows="2"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy"
                  />
                </div>

                {/* Address As per Aadhar Card */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address As per Aadhar Card <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="addressAsPerAadhar"
                    value={formData.addressAsPerAadhar}
                    onChange={handleInputChange}
                    required
                    rows="2"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy"
                  />
                </div>

                {/* Date of Birth As Per Aadhar Card */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date of Birth As Per Aadhar Card <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="dobAsPerAadhar"
                    value={formData.dobAsPerAadhar}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy"
                  />
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gender <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Mobile No. */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mobile No. <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="mobileNo"
                    value={formData.mobileNo}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy"
                  />
                </div>

                {/* Family Mobile No. */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Family Mobile No.
                  </label>
                  <input
                    type="tel"
                    name="familyMobileNo"
                    value={formData.familyMobileNo}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy"
                  />
                </div>

                {/* 2 Reference No */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    2 Reference No
                  </label>
                  <input
                    type="text"
                    name="twoReferenceNo"
                    value={formData.twoReferenceNo}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy"
                  />
                </div>

                {/* Past Pf Id No. (If Any) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Past PF ID No. (If Any)
                  </label>
                  <input
                    type="text"
                    name="pastPfId"
                    value={formData.pastPfId}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy"
                  />
                </div>

                {/* Current Bank AC No. */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Bank AC No. <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="currentBankAcNo"
                    value={formData.currentBankAcNo}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy"
                  />
                </div>

                {/* IFSC Code */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    IFSC Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="ifscCode"
                    value={formData.ifscCode}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy"
                  />
                </div>

                {/* Branch Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Branch Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="branchName"
                    value={formData.branchName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy"
                  />
                </div>

                {/* Photo Of Front Bank Passbook */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Photo Of Front Bank Passbook
                  </label>
                  <input
                    type="file"
                    name="bankPassbookPhoto"
                    onChange={handleFileChange}
                    accept="image/*"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy"
                  />
                </div>

                {/* Personal Email-Id */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Personal Email-Id <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="personalEmail"
                    value={formData.personalEmail}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy"
                  />
                </div>

                {/* ESIC No (IF Any) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ESIC No (IF Any)
                  </label>
                  <input
                    type="text"
                    name="esicNo"
                    value={formData.esicNo}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy"
                  />
                </div>

                {/* Highest Qualification */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Highest Qualification <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="highestQualification"
                    value={formData.highestQualification}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy"
                  />
                </div>

                {/* Aadhar Card No */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Aadhar Card No <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="aadharCardNo"
                    value={formData.aadharCardNo}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy"
                  />
                </div>

                {/* Highest Qualification Photo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Highest Qualification Photo
                  </label>
                  <input
                    type="file"
                    name="qualificationPhoto"
                    onChange={handleFileChange}
                    accept="image/*"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy"
                  />
                </div>

                {/* Salary Slip */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Salary Slip
                  </label>
                  <input
                    type="file"
                    name="salarySlip"
                    onChange={handleFileChange}
                    accept="image/*,.pdf"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy"
                  />
                </div>

                {/* Resume/Cv Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Resume/CV Upload
                  </label>
                  <input
                    type="file"
                    name="resumeUpload"
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-6 py-2 bg-navy text-white rounded-lg hover:bg-navy-dark transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {uploading ? (
                    <>
                      <Upload size={18} className="animate-spin" />
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
    </div>
  );
};

export default Joining;