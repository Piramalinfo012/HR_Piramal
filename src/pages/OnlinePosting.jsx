import React, { useEffect, useState } from "react";
import { Search, Clock, HistoryIcon, Plus, X, CheckCircle } from "lucide-react";

import toast from "react-hot-toast";

const OnlinePosting = () => {

  const [postFormData, setPostFormData] = useState({
    siteStatus: "",
    socialSiteTypes: [],
    onlinePlatformAttachment: "",
    selectedFile: null, // New field to store file locally
    status: "Yes",
    agencyStatus: "Yes",
    jobConsultancyNames: [],
    consultancyContacts: {},
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

  const [masterData, setMasterData] = useState([]);
  const [globalFmsData, setGlobalFmsData] = useState([]);
  const [dataResponseData, setDataResponseData] = useState([]);
  const [globalUserData, setGlobalUserData] = useState([]);
  const [storeLoading, setStoreLoading] = useState(true);
  const [consultancyOptions, setConsultancyOptions] = useState([]);

  const FETCH_URL = import.meta.env.VITE_GOOGLE_SHEET_URL;

  const fetchData = async (isBackground = false) => {
    if (!isBackground) {
      setStoreLoading(true);
      setTableLoading(true);
    }
    try {
      const cb = `&_=${Date.now()}`;
      const [masterRes, fmsRes, dataRes, userRes] = await Promise.all([
        fetch(`${FETCH_URL}?sheet=Master&action=fetch${cb}`).then(res => res.json()),
        fetch(`${FETCH_URL}?sheet=FMS&action=fetch${cb}`).then(res => res.json()),
        fetch(`${FETCH_URL}?sheet=Data Resposnse&action=fetch${cb}`).then(res => res.json()),
        fetch(`${FETCH_URL}?sheet=USER&action=fetch${cb}`).then(res => res.json())
      ]);

      if (masterRes.success) setMasterData(masterRes.data);
      if (fmsRes.success) setGlobalFmsData(fmsRes.data);
      if (dataRes.success) setDataResponseData(dataRes.data);
      if (userRes.success) setGlobalUserData(userRes.data);

    } catch (error) {
      console.error("OnlinePosting Data Fetch Error:", error);
      toast.error("Failed to load data");
    } finally {
      if (!isBackground) {
        setStoreLoading(false);
        setTableLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const refreshData = fetchData;

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

  useEffect(() => {
    if (!globalUserData || globalUserData.length === 0) return;
    const options = globalUserData.slice(1)
      .map(row => row[9])
      .filter(name => name && name.toString().trim() !== "");
    setConsultancyOptions([...new Set(options)]);
  }, [globalUserData]);

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

    const mergedDataResponseMap = {};
    dataResponseData.slice(1).forEach(row => {
      const indentNo = row[0];
      const stepCode = row[1];
      if (!indentNo) return;

      if (!mergedDataResponseMap[indentNo]) mergedDataResponseMap[indentNo] = {};

      if (stepCode === "PO-1") {
        mergedDataResponseMap[indentNo].siteStatus = row[3];
        mergedDataResponseMap[indentNo].socialSiteTypes = row[4];
        mergedDataResponseMap[indentNo].onlineAttachment = row[5];
      }

      if (stepCode === "PO-2") {
        mergedDataResponseMap[indentNo].agencyStatus = row[3];
        mergedDataResponseMap[indentNo].jobConsultancy = row[6];
        mergedDataResponseMap[indentNo].contactPerson = row[11];
        mergedDataResponseMap[indentNo].contactNumber = row[12];
      }
    });

    const dataFromRow2 = globalFmsData.slice(9); // Matches previous slice(8) logic

    const processedData = dataFromRow2.map((row) => {
      const planned = row[17]?.toString().trim() || ""; // Col R
      const actual = row[18]?.toString().trim() || "";  // Col S
      const agencyPlanned = row[23]?.toString().trim() || ""; // Col X
      const agencyActual = row[24]?.toString().trim() || "";  // Col Y
      const responseData = mergedDataResponseMap[row[4]] || {};

      return {
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
        planned,
        actual,
        agencyPlanned,
        agencyActual,
        onlinePending: planned !== "" && actual === "",
        agencyPending: agencyPlanned !== "" && agencyActual === "",
        onlineDone: planned !== "" && actual !== "",
        agencyDone: agencyPlanned !== "" && agencyActual !== "",
        siteStatus: responseData.siteStatus || "",
        socialSiteTypes: responseData.socialSiteTypes || "",
        onlineAttachment: responseData.onlineAttachment || "",
        agencyStatus: responseData.agencyStatus || "",
        jobConsultancyDR: responseData.jobConsultancy || "",
        contactPersonDR: responseData.contactPerson || "",
        contactNumberDR: responseData.contactNumber || "",
      };
    }).filter(item => item.planned || item.actual || item.agencyPlanned || item.agencyActual);

    const filteredPending = processedData.filter(item =>
      item.onlinePending || item.agencyPending
    );

    const filteredHistory = processedData.filter(item =>
      (item.onlineDone || item.agencyDone) && !item.onlinePending && !item.agencyPending
    );


    setHistoryIndentData(filteredHistory);
    setIndentData(filteredPending);

  }, [globalFmsData, dataResponseData]);







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

  const splitListValues = (value) => {
    if (!value) return [];
    return value
      .toString()
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  };

  const hasOnlinePostingStage = (indent) => !!(
    indent && (
      indent.planned ||
      indent.actual ||
      indent.onlinePending ||
      indent.onlineDone ||
      indent.siteStatus ||
      indent.socialSiteTypes ||
      indent.onlineAttachment
    )
  );

  const hasJobAgencyStage = (indent) => !!(
    indent && (
      indent.agencyPlanned ||
      indent.agencyActual ||
      indent.agencyPending ||
      indent.agencyDone ||
      indent.agencyStatus ||
      indent.jobConsultancyDR ||
      indent.contactPersonDR ||
      indent.contactNumberDR
    )
  );

  const buildConsultancyContacts = (names, contactPeople, contactNumbers) => {
    return names.reduce((acc, name, index) => {
      acc[name] = {
        contactPerson: contactPeople[index] || "",
        contactNumber: contactNumbers[index] || "",
      };
      return acc;
    }, {});
  };

  const getPostFormData = (indent = null) => {
    const jobConsultancyNames = splitListValues(indent?.jobConsultancyDR);
    const contactPeople = splitListValues(indent?.contactPersonDR);
    const contactNumbers = splitListValues(indent?.contactNumberDR);

    return {
      siteStatus: "",
      socialSiteTypes: splitListValues(indent?.socialSiteTypes),
      onlinePlatformAttachment: indent?.onlineAttachment || "",
      selectedFile: null,
      status: indent?.siteStatus || "Yes",
      agencyStatus: indent?.agencyStatus || "Yes",
      jobConsultancyNames,
      consultancyContacts: buildConsultancyContacts(jobConsultancyNames, contactPeople, contactNumbers),
    };
  };

  const resetPostFormData = (indent = null) => {
    setPostFormData(getPostFormData(indent));
  };

  const handleConsultancyChange = (option) => {
    setPostFormData((prev) => {
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
    setPostFormData((prev) => ({
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

  const handlePostSubmit = async (e) => {
    e.preventDefault();

    const shouldSubmitOnlinePosting = hasOnlinePostingStage(selectedIndent);
    const shouldSubmitJobAgency = hasJobAgencyStage(selectedIndent);

    if (!shouldSubmitOnlinePosting && !shouldSubmitJobAgency) {
      toast.error("No pending task found for this indent.");
      return;
    }

    if (shouldSubmitOnlinePosting && !postFormData.selectedFile && !postFormData.onlinePlatformAttachment) {
      toast.error("Please select an attachment file before submitting!");
      return;
    }

    if (shouldSubmitOnlinePosting && (!postFormData.socialSiteTypes || postFormData.socialSiteTypes.length === 0)) {
      toast.error("Please select at least one social site type!");
      return;
    }

    if (shouldSubmitJobAgency && (!postFormData.jobConsultancyNames || postFormData.jobConsultancyNames.length === 0)) {
      toast.error("Please select at least one Job Consultancy!");
      return;
    }

    try {
      setSubmitting(true);
      let fileUrl = "";

      if (shouldSubmitOnlinePosting) {
        setUploading(true);
        if (postFormData.selectedFile) {
          try {
            fileUrl = await uploadFileToServer(postFormData.selectedFile);
          } catch (uploadError) {
            toast.error("File upload failed: " + uploadError.message);
            setUploading(false);
            setSubmitting(false);
            return;
          }
        } else {
          fileUrl = postFormData.onlinePlatformAttachment;
        }
        setUploading(false);
      }

      const now = new Date();
      const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

      const rowsData = [];

      if (shouldSubmitOnlinePosting) {
        rowsData.push([
          selectedIndent.indentNumber,
          "PO-1",
          timestamp,
          postFormData.status,
          postFormData.socialSiteTypes.join(", "),
          fileUrl
        ]);
      }

      if (shouldSubmitJobAgency) {
        const consultancyNames = postFormData.jobConsultancyNames.join(", ");
        const contactPersons = postFormData.jobConsultancyNames
          .map(name => postFormData.consultancyContacts[name]?.contactPerson || "")
          .join(", ");
        const contactNumbers = postFormData.jobConsultancyNames
          .map(name => postFormData.consultancyContacts[name]?.contactNumber || "")
          .join(", ");

        rowsData.push([
          selectedIndent.indentNumber,
          "PO-2",
          timestamp,
          postFormData.agencyStatus,
          "",
          "",
          consultancyNames,
          "",
          "",
          "",
          "",
          contactPersons,
          contactNumbers,
        ]);
      }

      const response = await fetch(
        import.meta.env.VITE_GOOGLE_SHEET_URL,
        {
          method: "POST",
          body: new URLSearchParams({
            sheetName: "Data Resposnse",
            action: "bulkInsert",
            rowsData: JSON.stringify(rowsData),
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        toast.success("Posting and agency data submitted successfully!");
        
        setIndentData(prev => prev.filter(item => item.indentNumber !== selectedIndent.indentNumber));
        setHistoryIndentData(prev => [{
          ...selectedIndent,
          actual: selectedIndent.onlinePending ? timestamp : selectedIndent.actual,
          agencyActual: selectedIndent.agencyPending ? timestamp : selectedIndent.agencyActual,
          onlinePending: selectedIndent.onlinePending && !shouldSubmitOnlinePosting,
          agencyPending: selectedIndent.agencyPending && !shouldSubmitJobAgency,
          onlineDone: selectedIndent.onlineDone || selectedIndent.onlinePending,
          agencyDone: selectedIndent.agencyDone || selectedIndent.agencyPending,
          siteStatus: shouldSubmitOnlinePosting ? postFormData.status : selectedIndent.siteStatus,
          socialSiteTypes: shouldSubmitOnlinePosting ? postFormData.socialSiteTypes.join(", ") : selectedIndent.socialSiteTypes,
          onlineAttachment: shouldSubmitOnlinePosting ? fileUrl : selectedIndent.onlineAttachment,
          agencyStatus: shouldSubmitJobAgency ? postFormData.agencyStatus : selectedIndent.agencyStatus,
          jobConsultancyDR: shouldSubmitJobAgency ? postFormData.jobConsultancyNames.join(", ") : selectedIndent.jobConsultancyDR,
          contactPersonDR: shouldSubmitJobAgency
            ? postFormData.jobConsultancyNames.map(name => postFormData.consultancyContacts[name]?.contactPerson || "").join(", ")
            : selectedIndent.contactPersonDR,
          contactNumberDR: shouldSubmitJobAgency
            ? postFormData.jobConsultancyNames.map(name => postFormData.consultancyContacts[name]?.contactNumber || "").join(", ")
            : selectedIndent.contactNumberDR,
        }, ...prev]);

        resetPostFormData();
        setShowPostModal(false);

        fetchData(true);
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
    resetPostFormData(indent);
    setShowPostModal(true);
  };

  const filteredPendingData = indentData.filter((item) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      item.post?.toLowerCase().includes(term) ||
      item.indentNumber?.toLowerCase().includes(term) ||
      item.department?.toLowerCase().includes(term) ||
      item.jobConsultancyDR?.toLowerCase().includes(term);

    const matchesDept = !deptFilter || item.department === deptFilter;
    const matchesDesig = !desigFilter || item.post === desigFilter;

    return matchesSearch && matchesDept && matchesDesig;
  });

  const filteredHistoryData = historyIndentData.filter((item) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      item.siteStatus?.toLowerCase().includes(term) ||
      item.agencyStatus?.toLowerCase().includes(term) ||
      item.socialSiteTypes?.toLowerCase().includes(term) ||
      item.jobConsultancyDR?.toLowerCase().includes(term) ||
      item.indentNumber?.toLowerCase().includes(term) ||
      item.department?.toLowerCase().includes(term);

    const matchesDept = !deptFilter || item.department === deptFilter;
    const matchesDesig = !desigFilter || item.post === desigFilter;

    return matchesSearch && matchesDept && matchesDesig;
  });

  const allData = [...indentData, ...historyIndentData];
  const departments = [...new Set(allData.map(item => item.department))].filter(Boolean).sort();
  const posts = [...new Set(allData.map(item => item.post))].filter(Boolean).sort();
  const showOnlinePostingSection = hasOnlinePostingStage(selectedIndent);
  const showJobAgencySection = hasJobAgencyStage(selectedIndent);
  const jobConsultancyOptionList = [
    ...new Set([
      ...(consultancyOptions || []),
      ...(postFormData.jobConsultancyNames || []),
    ]),
  ];

  return (
    <div className="space-y-6 page-content p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Online Posting</h1>
      </div>

      {/* Post Modal */}
      {showPostModal && (
        <div className="fixed inset-0 modal-backdrop flex items-start justify-center z-50 overflow-y-auto p-3 sm:p-6">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[calc(100dvh-3rem)] overflow-hidden flex flex-col border border-slate-200">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 bg-white">
              <h3 className="text-lg font-medium text-gray-800">
                Update Posting & Agency
              </h3>
              <button
                onClick={() => {
                  setShowPostModal(false);
                  resetPostFormData();
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handlePostSubmit} className="flex min-h-0 flex-1 flex-col">
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                {showOnlinePostingSection && (
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
                )}
              </div>



              {showOnlinePostingSection && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Online Platform Attachment {postFormData.onlinePlatformAttachment ? "" : "*"}
                  </label>
                  {postFormData.onlinePlatformAttachment && (
                    <a
                      href={postFormData.onlinePlatformAttachment}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block text-xs text-blue-600 hover:underline mb-2"
                    >
                      View current attachment
                    </a>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy text-sm"
                      required={!postFormData.onlinePlatformAttachment}
                    />
                  </div>
                  {postFormData.selectedFile && (
                    <p className="text-xs text-blue-600 mt-1 truncate">
                      Selected: {postFormData.selectedFile.name}
                    </p>
                  )}
                  {uploading && <p className="text-xs text-navy mt-1 animate-pulse">Uploading file, please wait...</p>}
                </div>

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
              </>
              )}

              {showJobAgencySection && (
                <div className="border-t border-gray-200 pt-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Job Agency Status *
                    </label>
                    <select
                      value={postFormData.agencyStatus}
                      onChange={(e) =>
                        setPostFormData((prev) => ({
                          ...prev,
                          agencyStatus: e.target.value,
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Job Consultancy *
                    </label>
                    <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-300 rounded-md p-2">
                      {jobConsultancyOptionList.map((option) => (
                        <div key={option} className="space-y-2 border-b border-gray-100 pb-2 last:border-b-0 last:pb-0">
                          <label className="flex items-center text-sm text-gray-700">
                            <input
                              type="checkbox"
                              value={option}
                              checked={postFormData.jobConsultancyNames.includes(option)}
                              onChange={() => handleConsultancyChange(option)}
                              className="h-4 w-4 text-navy focus:ring-navy border-gray-300 rounded"
                            />
                            <span className="ml-2">{option}</span>
                          </label>
                          {postFormData.jobConsultancyNames.includes(option) && (
                            <div className="grid grid-cols-1 gap-2 pl-6">
                              <input
                                type="text"
                                placeholder="Contact person"
                                value={postFormData.consultancyContacts[option]?.contactPerson || ""}
                                onChange={(e) => handleContactInfoChange(option, "contactPerson", e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
                              />
                              <input
                                type="text"
                                placeholder="Contact number"
                                value={postFormData.consultancyContacts[option]?.contactNumber || ""}
                                onChange={(e) => handleContactInfoChange(option, "contactNumber", e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}


              </div>

              <div className="flex justify-end space-x-2 border-t border-gray-200 bg-white px-6 py-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowPostModal(false);
                    resetPostFormData();
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
                      Pending Stage
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex flex-wrap gap-2">
                            {item.onlinePending && (
                              <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
                                Online Posting
                              </span>
                            )}
                            {item.agencyPending && (
                              <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">
                                Job Agency
                              </span>
                            )}
                          </div>
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Job Consultancy
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact Person
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact No
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Agency Status
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.jobConsultancyDR}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.contactPersonDR}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.contactNumberDR}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.agencyStatus}
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
