import React, { useEffect, useState, useMemo } from "react";
import useDataStore from "../store/dataStore";
import { Search, Clock, CheckCircle, X, Upload } from "lucide-react";
import toast from "react-hot-toast";

const Joining = () => {
  // TWO DIFFERENT URLs
  const FETCH_URL = import.meta.env.VITE_GOOGLE_SHEET_URL; // For fetching data
  const JOINING_SUBMIT_URL = "https://script.google.com/macros/s/AKfycbwhFgVoAB4S1cKrU0iDRtCH5B2K-ol2c0RmaaEWXGqv0bdMzs3cs3kPuqOfUAR3KHYZ7g/exec"; // For form submission


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

  const { joiningFmsData, candidateSelectionData, isLoading: storeLoading, refreshData, fetchGlobalData } = useDataStore();
  const [candidateData, setCandidateData] = useState([]);

  // Fetch data from Canidate_Selection
  // Fetch data from Canidate_Selection and filter by JOINING_FMS
  // Fetch data from Canidate_Selection and filter by JOINING_FMS
  useEffect(() => {
    const fetchData = async () => {
      setTableLoading(true);
      try {
        // 1. Fetch Canidate_Selection
        console.log("📥 Fetching from Canidate_Selection...");
        const candidateRes = await fetch(`${FETCH_URL}?sheet=Canidate_Selection`);
        const candidateJson = await candidateRes.json();
        console.log("✅ Canidate_Selection Raw Data:", candidateJson);

        // 2. Fetch JOINING_FMS
        const joiningFmsUrl = "https://script.google.com/macros/s/AKfycbwhFgVoAB4S1cKrU0iDRtCH5B2K-ol2c0RmaaEWXGqv0bdMzs3cs3kPuqOfUAR3KHYZ7g/exec";
        console.log("📥 Fetching from JOINING_FMS...");
        const joiningRes = await fetch(`${joiningFmsUrl}?sheet=JOINING_FMS`);
        const joiningJson = await joiningRes.json();
        console.log("✅ JOINING_FMS Raw Data:", joiningJson);

        // Helper to parse JSON - NOW FINDS ACTUAL HEADER ROW
        const parseData = (json) => {
          let allRows = [];
          if (Array.isArray(json)) {
            allRows = json;
          } else if (json && typeof json === 'object' && json.data && Array.isArray(json.data)) {
            allRows = json.data;
          } else {
            return { headers: [], rows: [] };
          }

          // Find the row that contains "ID" or "Candidate Enquiry No" - that's the header row
          const headerRowIndex = allRows.findIndex(row =>
            row && row.some(cell =>
              cell && (
                cell.toString().trim().toUpperCase() === "ID" ||
                cell.toString().trim().toLowerCase().includes("candidate enquiry")
              )
            )
          );

          if (headerRowIndex === -1) {
            // Fallback: use first row as header
            return { headers: allRows[0] || [], rows: allRows.slice(1) };
          }

          console.log(`📍 Found header row at index: ${headerRowIndex}`);
          return {
            headers: allRows[headerRowIndex],
            rows: allRows.slice(headerRowIndex + 1)
          };
        };

        const { headers: cHeaders, rows: cRows } = parseData(candidateJson);
        const { headers: jHeaders, rows: jRows } = parseData(joiningJson);

        console.log("📋 Canidate_Selection Headers:", cHeaders);
        console.log("📋 Canidate_Selection Total Rows:", cRows.length);

        // DETAILED DEBUGGING
        console.log("🔍 DETAILED DEBUGGING:");
        console.log("📋 First 10 Headers:", cHeaders.slice(0, 10));
        console.log("📋 Headers around AJ (30-40):", cHeaders.slice(30, 40));
        console.log("📋 First data row:", cRows[0]);
        console.log("📋 Second data row:", cRows[1]);

        // Check specifically AJ column
        console.log("📋 Column 35 (AJ) in first 10 rows:");
        for (let i = 0; i < 10 && i < cRows.length; i++) {
          console.log(`  Row ${i + 1}: [${i}][35] = "${cRows[i] ? cRows[i][35] : 'undefined'}"`);
        }

        console.log("📋 JOINING_FMS Headers:", jHeaders);
        console.log("📋 JOINING_FMS Total Rows:", jRows.length);

        if (!cHeaders.length || !cRows.length) {
          console.warn("⚠️ No data found in Canidate_Selection");
          setCandidateData([]);
          return;
        }

        // --- Logic for JOINING_FMS ---
        const getFmsIndex = (name, fixedIdx) => {
          const idx = jHeaders.findIndex(h => h && h.toString().trim().toLowerCase() === name.toLowerCase());
          return idx !== -1 ? idx : fixedIdx;
        };

        const idxJ_Id = getFmsIndex("ID", 5);
        const idxJ_Planned = getFmsIndex("Planned", 38);

        console.log("📌 JOINING_FMS Column Indexes - ID:", idxJ_Id, "Planned:", idxJ_Planned);

        const blockedIds = new Set();
        jRows.forEach(row => {
          if (!row) return;
          const id = row[idxJ_Id];
          const planned = row[idxJ_Planned];

          if (id && planned && planned.toString().trim() !== "") {
            blockedIds.add(id.toString().trim());
          }
        });

        console.log("🚫 Blocked IDs from JOINING_FMS:", Array.from(blockedIds));

        // --- Logic for Canidate_Selection ---
        const getCIndex = (name, fallbackIndex) => {
          const idx = cHeaders.findIndex(
            h => h && h.toString().trim().toLowerCase() === name.toLowerCase()
          );
          console.log(`🔍 Searching for "${name}": found at index ${idx} (fallback: ${fallbackIndex})`);
          return idx !== -1 ? idx : fallbackIndex;
        };

        const idxEnquiry = getCIndex("Candidate Enquiry No", 1);
        const idxName = getCIndex("Candidate Name", 4);
        const idxMobile = getCIndex("Mobile No", 5);
        const idxEmail = getCIndex("Email Id", 6);
        const idxResume = getCIndex("Resume/CV", 20);
        const idxQual = getCIndex("Highest Qualification", 8);
        const idxCurrentCTC = getCIndex("Current CTC (LPA)", 16);
        const idxExpectedCTC = getCIndex("Expected (LPA)", 17);
        const idxStatus = getCIndex("Status", 36);
        const idxActualAJ = getCIndex("Actual", 35); // Column AJ

        console.log("📌 Canidate_Selection Column Indexes:");
        console.log("  - Enquiry No:", idxEnquiry);
        console.log("  - Name:", idxName);
        console.log("  - Mobile:", idxMobile);
        console.log("  - Email:", idxEmail);
        console.log("  - Resume:", idxResume);
        console.log("  - Qualification:", idxQual);
        console.log("  - Current CTC:", idxCurrentCTC);
        console.log("  - Expected CTC:", idxExpectedCTC);
        console.log("  - Status:", idxStatus);
        console.log("  - Actual (AJ):", idxActualAJ);

        console.log("🔍 Filtering rows where Column AJ (Actual) is NOT NULL...");

        const processed = cRows
          .filter((row, index) => {
            if (!row || row.length === 0) {
              console.log(`Row ${index + 1}: Empty or undefined row`);
              return false;
            }

            const actualAJ = row[idxActualAJ];
            const id = row[idxEnquiry];

            if (index < 5) { // Log first 5 rows in detail
              console.log(`Row ${index + 1}: ID=${id}, AJ Value="${actualAJ}"`);
            }

            // ✅ AJ must be filled (not null, not empty)
            if (
              actualAJ === undefined ||
              actualAJ === null ||
              actualAJ.toString().trim() === ""
            ) {
              if (index < 5) console.log(`  ❌ Filtered out: AJ is empty`);
              return false;
            }

            // ❌ Skip if already planned in JOINING_FMS
            if (id && blockedIds.has(id.toString().trim())) {
              console.log(`  ❌ Filtered out: Already in JOINING_FMS`);
              return false;
            }

            console.log(`  ✅ Included: ID=${id}, AJ="${actualAJ}"`);
            return true;
          })
          .map((row, i) => ({
            indentNumber: row[idxEnquiry],
            id: row[idxEnquiry] || (i + 1),
            candidateName: row[idxName] || "",
            contactNo: row[idxMobile] || "",
            mail: row[idxEmail] || "",
            resume: row[idxResume] || "",
            qualification: row[idxQual] || "",
            currentCTC: row[idxCurrentCTC] || "",
            expectedCTC: row[idxExpectedCTC] || "",
            status: row[idxStatus] || "",
            joiningDate: row[idxActualAJ] || "" // Display AJ column data as joining date
          }));

        console.log("✅ Final Processed Data (Total:", processed.length, "):", processed);
        setCandidateData(processed);
      } catch (err) {
        console.error("❌ Fetch error:", err);
        setCandidateData([]);
      } finally {
        setTableLoading(false);
      }
    };

    fetchData();
  }, [FETCH_URL]);


  // ============================================
  // EXISTING FETCH LOGIC - NO CHANGE
  // ============================================
  // Removed local fetchCandidateData in favor of store logic


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
    console.log("Selected Candidate (from Joining Table):", candidate);

    // Find corresponding data in candidateSelectionData based on candidate ID or name
    // According to requirements:
    // Column B (index 1) = Candidate Enquiry No
    // Column G (index 6) = Personal Email-Id
    // Column F (index 5) = Mobile No
    let candidateSelectionInfo = null;
    if (candidateSelectionData && candidateSelectionData.length > 0) {
      // Look for matching candidate in candidateSelectionData
      candidateSelectionInfo = candidateSelectionData.find(row => {
        if (!row || row.length < 7) return false;

        // Match by Enquiry Number in column B (index 1)
        const enquiryMatch = row[1] && candidate.indentNumber
          &&
          row[1].toString().trim() === candidate.indentNumber
            .toString().trim();

        // Match by System ID (index 5 in FMS) - if we can find where it is in Canidate_Selection
        // For now, let's use Enquiry No as primary and Name/Mobile/Email as backup

        // Try to match by candidate name (index 0)
        const nameMatch = row[0] && candidate.candidateName &&
          row[0].toString().toLowerCase().includes(candidate.candidateName.toString().toLowerCase());

        // Try to match by mobile number (index 5)
        const mobileMatch = row[5] && candidate.contactNo &&
          candidate.contactNo.toString().length > 5 && // Avoid matching empty/junk contact numbers
          row[5].toString().replace(/\D/g, '').includes(candidate.contactNo.toString().replace(/\D/g, ''));

        // Try to match by email (index 6)
        const emailMatch = row[6] && candidate.mail &&
          candidate.mail.toString().includes('@') &&
          row[6].toString().toLowerCase().trim() === candidate.mail.toString().toLowerCase().trim();

        return enquiryMatch || nameMatch || mobileMatch || emailMatch;
      });
    }

    console.log("Pre-fill Logic Source - selectionInfo:", candidateSelectionInfo ? candidateSelectionInfo[1] : "not found");
    console.log("Pre-fill Logic Source - tableData:", candidate.indentNumber
    );

    setFormData({
      candidateEnquiryNo: candidate.id || "", // Automatically show the ID here
      nameAsPerAadhar: "",
      fatherName: "",
      dateOfJoining: "",
      joiningPlace: candidate.joiningPlace || "",  // Pre-fill joining place from candidate data
      designation: candidate.designation || "",
      salary: candidate.salary || "",  // Pre-fill salary from candidate data
      aadharFrontPhoto: null,
      panCard: null,
      candidatePhoto: null,
      currentAddress: "",
      addressAsPerAadhar: "",
      dobAsPerAadhar: "",
      gender: "",
      mobileNo: candidateSelectionInfo ? (candidateSelectionInfo[5] || candidate.contactNo || "") : (candidate.contactNo || ""), // Column F of Canidate_Selection
      familyMobileNo: "",
      twoReferenceNo: "",
      pastPfId: "",
      currentBankAcNo: "",
      ifscCode: "",
      branchName: "",
      bankPassbookPhoto: null,
      personalEmail: candidateSelectionInfo ? (candidateSelectionInfo[6] || candidate.mail || "") : (candidate.mail || ""), // Column G of Canidate_Selection
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
      // Format timestamp for calendar (ISO format)
      const timestamp = now.toISOString().slice(0, 19).replace('T', ' ');

      // Prepare data for columns B to AD (29 columns total)
      // Column A will be empty (handled by backend)
      const rowData = [
        timestamp,
        // Column B: Pre-filled enquiry number (Candidate ID)
        formData.candidateEnquiryNo,           // B
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
        handleCloseModal();
        refreshData(); // Refresh via store
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


          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-6">
          <div className="overflow-x-auto table-container">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">Action</th>
                  <th className="px-6 py-3">Indent No</th>

                  <th className="px-6 py-3">Resume/CV</th>
                  <th className="px-6 py-3">Highest Qualification</th>
                  <th className="px-6 py-3">Candidate Name</th>
                  <th className="px-6 py-3">Current CTC (LPA)</th>
                  <th className="px-6 py-3">Expected (LPA)</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Joining Date</th>
                </tr>
              </thead>
              <tbody className="divide-y text-gray-500 text-sm">
                {tableLoading ? (
                  <tr>
                    <td colSpan="9" className="py-12 text-center">
                      <div className="flex justify-center items-center gap-3">
                        <svg
                          className="animate-spin h-5 w-5 text-gray-500"
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
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                          />
                        </svg>
                        <span>Loading data...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredData.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="py-10 text-center text-gray-400">
                      No records found
                    </td>
                  </tr>
                ) : (

                  filteredData.map((item, i) => (
                    <tr key={i}>
                      <td className="px-6 py-3">
                        <button
                          onClick={() => handleOpenModal(item)}
                          className="bg-navy text-white px-4 py-2 rounded-lg hover:bg-navy-dark transition-colors"
                        >
                          Fill Details
                        </button>
                      </td>

                      <td className="px-6 py-3">
                        {item.indentNumber}
                      </td>

                      <td className="px-6 py-3">
                        {item.resume ? (
                          <a
                            href={item.resume}
                            target="_blank"
                            className="text-blue-600 underline"
                          >
                            View
                          </a>
                        ) : "-"}
                      </td>

                      <td className="px-6 py-3">{item.qualification}</td>
                      <td className="px-6 py-3">{item.candidateName}</td>
                      <td className="px-6 py-3">{item.currentCTC}</td>
                      <td className="px-6 py-3">{item.expectedCTC}</td>
                      <td className="px-6 py-3">{item.status}</td>
                      <td className="px-6 py-3">{item.joiningDate}</td>
                    </tr>
                  )))}
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
                  <select
                    name="joiningPlace"
                    value={formData.joiningPlace}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy"
                  >
                    <option value="">Select Joining Place</option>
                    <option value="Shyam Plaza Office">Shyam Plaza Office</option>
                    <option value="Shankar Nagar Office">Shankar Nagar Office</option>
                    <option value="Plant">Plant</option>
                    <option value="VBA">VBA</option>
                    <option value="Home">Home</option>
                  </select>
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