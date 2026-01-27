import React, { useEffect, useState } from "react";
import { Search, Clock, Plus, X, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";

const JoiningFollowUp = () => {
    const FETCH_URL = import.meta.env.VITE_GOOGLE_SHEET_URL;
    const getSubmitUrl = () => import.meta.env.VITE_SUBMIT_URL || FETCH_URL;

    const [candidateData, setCandidateData] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [deptFilter, setDeptFilter] = useState("");
    const [desigFilter, setDesigFilter] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [tableLoading, setTableLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [fileUploading, setFileUploading] = useState(false);
    const [indentOptions, setIndentOptions] = useState([]);
    const [fmsDataMap, setFmsDataMap] = useState({});
    const [activeTab, setActiveTab] = useState("pending");
    const [actionSubmitting, setActionSubmitting] = useState(false);
    const [showActionModal, setShowActionModal] = useState(false);
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [actionFormData, setActionFormData] = useState({
        indentNumber: "",
        status: "",
        joiningDate: "",
    });

    const [formData, setFormData] = useState({
        openPositionDepartment: "",
        designation: "",
        nameOfCandidate: "",
        contactNo: "",
        mailID: "",
        age: "",
        highestQualification: "",
        nativePlace: "",
        currentWorkingLocation: "",
        currentEmploymentStatus: "",
        currentCompany: "",
        currentDesignation: "",
        tenureWithCurrentCompany: "",
        totalWorkExperience: "",
        currentCTC: "",
        expectedCTC: "",
        noticePeriod: "",
        interviewDate: "",
        resumeUrl: "",
        indentNumber: "",
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setTableLoading(true);
        await Promise.all([fetchCandidateData(), fetchFmsData()]);
        setTableLoading(false);
    };

    const fetchFmsData = async () => {
        try {
            const response = await fetch(
                `${FETCH_URL}?sheet=Canidate_Selection&action=fetch`
            );
            const result = await response.json();

            if (result.success && result.data) {
                const dataRows = result.data.slice(1);

                const openRows = dataRows.filter(row => {
                    const status = (row[1] || "").toString().toUpperCase();
                    return status === "OPEN";
                });

                const options = openRows.map(row => (row[4] || "").toString()).filter(val => val);
                const mapping = {};
                openRows.forEach(row => {
                    const id = (row[4] || "").toString();
                    if (id) mapping[id] = (row[6] || "").toString();
                });

                setIndentOptions([...new Set(options)]);
                setFmsDataMap(mapping);
            }
        } catch (error) {
            console.error("Error fetching FMS data:", error);
        }
    };

    const fetchCandidateData = async () => {
        try {
            const response = await fetch(
                `${FETCH_URL}?sheet=Canidate_Selection&action=fetch`
            );
            const result = await response.json();

            if (result.success && result.data) {
                const dataRows = result.data.slice(7);
                const processedData = dataRows.map((row, idx) => ({
                    rowIndex: idx + 8, // Slice 7, so row 1 is index 8
                    id: row[1], // Column B
                    department: row[2], // Column C
                    designation: row[3], // Column D
                    candidateName: row[4], // Column E
                    contactNo: row[5], // Column F
                    mail: row[6], // Column G
                    indentId: row[41], // Column A
                    trigger_AI: row[34], // Column AI
                    statusMarker_AJ: row[35], // Column AJ
                }));
                console.log("Processed Joining Follow Up Candidates:", processedData);
                setCandidateData(processedData);
            }
        } catch (error) {
            console.error("Error fetching candidate data:", error);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name === "indentNumber") {
            setFormData((prev) => ({
                ...prev,
                indentNumber: value,
                openPositionDepartment: fmsDataMap[value] || prev.openPositionDepartment,
            }));
        } else {
            setFormData((prev) => ({ ...prev, [name]: value }));
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setFileUploading(true);
        try {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64Data = reader.result;
                const response = await fetch(import.meta.env.VITE_GOOGLE_SHEET_URL, {
                    method: "POST",
                    body: new URLSearchParams({
                        action: "uploadFile",
                        base64Data: base64Data,
                        fileName: file.name,
                        mimeType: file.type,
                        folderId: "1tSoT0na5lGKAE82z0kDiDNU6ikkHJjA1OayGwV5CFq9tfc3BVrbLl3g-nkyKwHoYIMzTI2aI",
                    }),
                });

                const result = await response.json();
                if (result.success) {
                    setFormData((prev) => ({ ...prev, resumeUrl: result.fileUrl }));
                    toast.success("Resume uploaded successfully!");
                } else {
                    toast.error("Upload failed: " + (result.error || "Unknown error"));
                }
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
        setSubmitting(true);

        try {
            const newID = `${formData.indentNumber}_${formData.designation}`;
            const now = new Date();
            const day = String(now.getDate()).padStart(2, '0');
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const year = String(now.getFullYear()).slice(-2);
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            const timestamp = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;

            const rowData = [];
            rowData[0] = timestamp; // Column A
            rowData[1] = newID;     // Column B (Combined ID: Indent_Designation)
            rowData[2] = formData.openPositionDepartment; // Column C
            rowData[3] = formData.designation; // Column D
            rowData[4] = formData.nameOfCandidate; // Column E
            rowData[5] = formData.contactNo; // Column F
            rowData[6] = formData.mailID; // Column G
            rowData[7] = formData.age; // Column H
            rowData[8] = formData.highestQualification; // Column I
            rowData[9] = formData.nativePlace; // Column J
            rowData[10] = formData.currentWorkingLocation; // Column K
            rowData[11] = formData.currentEmploymentStatus; // Column L
            rowData[12] = formData.currentCompany; // Column M
            rowData[13] = formData.currentDesignation; // Column N
            rowData[14] = formData.tenureWithCurrentCompany; // Column O
            rowData[15] = formData.totalWorkExperience; // Column P
            rowData[16] = formData.currentCTC; // Column Q
            rowData[17] = formData.expectedCTC; // Column R
            rowData[18] = formData.noticePeriod; // Column S
            rowData[19] = formData.interviewDate; // Column T
            rowData[20] = formData.resumeUrl; // Column U
            rowData[21] = formData.indentNumber; // Column V

            console.log("Submitting Row Data to 'appsheet db':", rowData);

            const response = await fetch(import.meta.env.VITE_GOOGLE_SHEET_URL, {
                method: "POST",
                body: new URLSearchParams({
                    sheetName: "appsheet db",
                    action: "bulkInsert",
                    rowsData: JSON.stringify([rowData]),
                }),
            });

            const result = await response.json();
            console.log("Submission Result:", result);

            if (result.success) {
                toast.success("Joining follow-up data submitted successfully!");
                setShowModal(false);
                setFormData({
                    openPositionDepartment: "",
                    designation: "",
                    nameOfCandidate: "",
                    contactNo: "",
                    mailID: "",
                    age: "",
                    highestQualification: "",
                    nativePlace: "",
                    currentWorkingLocation: "",
                    currentEmploymentStatus: "",
                    currentCompany: "",
                    currentDesignation: "",
                    tenureWithCurrentCompany: "",
                    totalWorkExperience: "",
                    currentCTC: "",
                    expectedCTC: "",
                    noticePeriod: "",
                    interviewDate: "",
                    resumeUrl: "",
                    indentNumber: "",
                });
                await fetchCandidateData();
            } else {
                toast.error("Submission failed: " + result.error);
            }
        } catch (error) {
            console.error("Submission error:", error);
            toast.error("Something went wrong");
        } finally {
            setSubmitting(false);
        }
    };

    const handleActionClick = (candidate) => {
        setSelectedCandidate(candidate);
        setActionFormData({
            indentNumber: candidate.indentId || "",
            status: "Yes",
            joiningDate: "",
        });
        setShowActionModal(true);
    };

    const handleActionSubmit = async (e) => {
        e.preventDefault();
        const { status, joiningDate } = actionFormData;
        const candidate = selectedCandidate;

        if (!status) {
            toast.error("Please select a status");
            return;
        }

        if (!window.confirm(`Are you sure you want to mark as ${status}?`)) return;

        setActionSubmitting(true);
        try {
            const now = new Date();
            const day = String(now.getDate()).padStart(2, '0');
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const year = String(now.getFullYear()).slice(-2);
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            const timestamp = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;

            // 1. Submit to DATA RESPONSE
            const responseData = [];
            responseData[0] = candidate.indentId; // Column A (Indent Number)
            responseData[1] = "CS-4";             // Column B (Step Code CS-4)
            responseData[2] = timestamp;          // Column C (Timestamp)
            responseData[3] = status;             // Column D (Status)
            responseData[10] = joiningDate;      // Column K (Joining Date - index 10)

            const insertResponse = await fetch(getSubmitUrl(), {
                method: "POST",
                body: new URLSearchParams({
                    sheetName: "Data Resposnse",
                    action: "bulkInsert",
                    rowsData: JSON.stringify([responseData]),
                }),
            });

            // 2. Update Column AJ in appsheet db (index 35)
            const updateResponse = await fetch(getSubmitUrl(), {
                method: "POST",
                body: new URLSearchParams({
                    sheetName: "appsheet db",
                    action: "updateCell",
                    rowIndex: candidate.rowIndex,
                    columnIndex: 36, // Column AJ is 36th column (1-indexed)
                    value: timestamp
                }),
            });

            const res1 = await insertResponse.json();
            const res2 = await updateResponse.json();

            if (res1.success && res2.success) {
                toast.success(`Submission ${status} successfully!`);
                setShowActionModal(false);
                await fetchCandidateData();
            } else {
                toast.error("Action submission failed");
            }
        } catch (error) {
            console.error("Action error:", error);
            toast.error("Something went wrong");
        } finally {
            setActionSubmitting(false);
        }
    };

    const filteredData = candidateData.filter((item, index) => {
        const term = searchTerm.toLowerCase();

        const hasAI = !!(item.trigger_AI && item.trigger_AI.toString().trim());
        const hasAJ = !!(item.statusMarker_AJ && item.statusMarker_AJ.toString().trim());

        const matchesTab = activeTab === "pending"
            ? (hasAI && !hasAJ)
            : (hasAI && hasAJ);

        const matchesSearch = (
            (item.candidateName || "").toLowerCase().includes(term) ||
            (item.id || "").toLowerCase().includes(term) ||
            (item.designation || "").toLowerCase().includes(term) ||
            (item.department || "").toLowerCase().includes(term)
        );

        const matchesDept = !deptFilter || item.department === deptFilter;
        const matchesDesig = !desigFilter || item.designation === desigFilter;

        return matchesTab && matchesSearch && matchesDept && matchesDesig;
    });

    const departments = [...new Set(candidateData.map(item => item.department))].filter(Boolean).sort();
    const designations = [...new Set(candidateData.map(item => item.designation))].filter(Boolean).sort();

    return (
        <div className="space-y-6 page-content p-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-800">Follow up for joining/ Joining Date</h1>
            </div>

            {/* Filter and Search */}
            <div className="bg-white p-4 rounded-lg shadow">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg w-fit">
                        <button
                            onClick={() => setActiveTab("pending")}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${activeTab === "pending" ? "bg-white text-navy shadow-sm" : "text-gray-600 hover:text-gray-800"}`}
                        >
                            <Clock size={18} />
                            Pending
                        </button>
                        <button
                            onClick={() => setActiveTab("history")}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${activeTab === "history" ? "bg-white text-navy shadow-sm" : "text-gray-600 hover:text-gray-800"}`}
                        >
                            <CheckCircle size={18} />
                            History
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
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{activeTab === "pending" ? "Action" : "Completed At"}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Candidate Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Designation</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {tableLoading ? (
                                    <tr><td colSpan="6" className="px-6 py-12 text-center text-gray-500">Loading...</td></tr>
                                ) : filteredData.length === 0 ? (
                                    <tr><td colSpan="6" className="px-6 py-12 text-center text-gray-500">No candidates found.</td></tr>
                                ) : (
                                    filteredData.map((item, index) => (
                                        <tr key={index} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {activeTab === "pending" ? (
                                                    <button
                                                        onClick={() => handleActionClick(item)}
                                                        className="px-3 py-1 bg-navy text-white rounded text-xs hover:bg-navy-dark transition-colors"
                                                    >
                                                        Take Action
                                                    </button>
                                                ) : (
                                                    <span className="flex items-center gap-1 text-green-600">
                                                        <CheckCircle size={14} />
                                                        {item.statusMarker_AJ}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-navy">{item.id}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.candidateName}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.department}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.designation}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.contactNo}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 transition-opacity" onClick={() => setShowModal(false)}>
                            <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                        </div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen"></span>&#8203;
                        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
                            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-bold text-gray-900">Add Follow-up Record</h3>
                                    <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-500"><X size={24} /></button>
                                </div>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Indent Number</label>
                                            <select name="indentNumber" value={formData.indentNumber} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required>
                                                <option value="">Select Indent</option>
                                                {indentOptions.map((opt, i) => (<option key={i} value={opt}>{opt}</option>))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Open position department</label>
                                            <input type="text" name="openPositionDepartment" value={formData.openPositionDepartment} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Designation</label>
                                            <input type="text" name="designation" value={formData.designation} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Name of candidate</label>
                                            <input type="text" name="nameOfCandidate" value={formData.nameOfCandidate} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Contact No.</label>
                                            <input type="text" name="contactNo" value={formData.contactNo} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Mail ID</label>
                                            <input type="email" name="mailID" value={formData.mailID} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Age</label>
                                            <input type="number" name="age" value={formData.age} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Highest Qualification</label>
                                            <input type="text" name="highestQualification" value={formData.highestQualification} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Native Place</label>
                                            <input type="text" name="nativePlace" value={formData.nativePlace} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Current Working Location</label>
                                            <input type="text" name="currentWorkingLocation" value={formData.currentWorkingLocation} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Current Employment Status</label>
                                            <select name="currentEmploymentStatus" value={formData.currentEmploymentStatus} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                                                <option value="">Select Status</option>
                                                <option value="Employed">Employed</option>
                                                <option value="Unemployed">Unemployed</option>
                                                <option value="Freelance">Freelance</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Current Company</label>
                                            <input type="text" name="currentCompany" value={formData.currentCompany} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Current Designation</label>
                                            <input type="text" name="currentDesignation" value={formData.currentDesignation} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Tenure with current company</label>
                                            <input type="text" name="tenureWithCurrentCompany" value={formData.tenureWithCurrentCompany} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Total Work Experience</label>
                                            <input type="text" name="totalWorkExperience" value={formData.totalWorkExperience} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Current CTC (LPA)</label>
                                            <input type="text" name="currentCTC" value={formData.currentCTC} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Expected (LPA)</label>
                                            <input type="text" name="expectedCTC" value={formData.expectedCTC} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Notice Period</label>
                                            <input type="text" name="noticePeriod" value={formData.noticePeriod} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Interview Date with HR SPOC</label>
                                            <input type="date" name="interviewDate" value={formData.interviewDate} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                                        </div>
                                        <div className="md:col-span-3">
                                            <label className="block text-sm font-medium text-gray-700">Resume/cv</label>
                                            <div className="mt-1 flex items-center gap-4">
                                                <input type="file" onChange={handleFileUpload} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
                                                {fileUploading && <Clock className="animate-spin text-navy" size={20} />}
                                                {formData.resumeUrl && <CheckCircle className="text-green-600" size={20} />}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-8 flex justify-end gap-3">
                                        <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
                                        <button type="submit" disabled={submitting || fileUploading} className="px-4 py-2 bg-navy text-white rounded-md hover:bg-navy-dark disabled:opacity-50 flex items-center gap-2">
                                            {submitting ? "Submitting..." : "Submit Follow-up"}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {showActionModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 transition-opacity" onClick={() => setShowActionModal(false)}>
                            <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                        </div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen"></span>&#8203;
                        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-bold text-gray-900">Take Action: {selectedCandidate?.candidateName}</h3>
                                    <button onClick={() => setShowActionModal(false)} className="text-gray-400 hover:text-gray-500">
                                        <X size={24} />
                                    </button>
                                </div>
                                <form onSubmit={handleActionSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Indent Number</label>
                                        <input
                                            type="text"
                                            value={actionFormData.indentNumber}
                                            readOnly
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-gray-50"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Joining Date</label>
                                        <input
                                            type="date"
                                            value={actionFormData.joiningDate}
                                            onChange={(e) => setActionFormData({ ...actionFormData, joiningDate: e.target.value })}
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Status</label>
                                        <select
                                            value={actionFormData.status}
                                            onChange={(e) => setActionFormData({ ...actionFormData, status: e.target.value })}
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                            required
                                        >
                                            <option value="Yes">Yes</option>
                                            <option value="No">No</option>
                                            <option value="Hold">Hold</option>
                                        </select>
                                    </div>
                                    <div className="mt-8 flex justify-end gap-3">
                                        <button type="button" onClick={() => setShowActionModal(false)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
                                        <button type="submit" disabled={actionSubmitting} className="px-4 py-2 bg-navy text-white rounded-md hover:bg-navy-dark disabled:opacity-50 flex items-center gap-2">
                                            {actionSubmitting ? "Submitting..." : "Submit Action"}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default JoiningFollowUp;
