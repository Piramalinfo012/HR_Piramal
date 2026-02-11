import React, { useEffect, useState } from "react";
import { Search, Clock, HistoryIcon, Plus, X, CheckCircle } from "lucide-react";

import toast from "react-hot-toast";

const Whatsapp = () => {

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
        experience: "",
        salary: "",
        officeTimingFrom: "",
        officeTimingTo: "",
        typeOfWeek: "",
        residence: "",
        indenterName: "",
        closedBy: "",
        screenshotUrl: "",
        selectedFile: null, // Local file storage
        status: "Yes",
    });
    const [indentData, setIndentData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [tableLoading, setTableLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Local State Replacement for Store
    const [fmsData, setFmsData] = useState([]);
    const [dataResponseData, setDataResponseData] = useState([]);
    const [storeLoading, setStoreLoading] = useState(true);
    const FETCH_URL = import.meta.env.VITE_GOOGLE_SHEET_URL;

    const fetchData = async () => {
        setStoreLoading(true);
        setTableLoading(true);
        try {
            const cb = `&_=${Date.now()}`;
            const [fmsRes, dataRes] = await Promise.all([
                fetch(`${FETCH_URL}?sheet=FMS&action=fetch${cb}`).then(res => res.json()),
                fetch(`${FETCH_URL}?sheet=Data Resposnse&action=fetch${cb}`).then(res => res.json())
            ]);

            if (fmsRes.success) setFmsData(fmsRes.data);
            if (dataRes.success) setDataResponseData(dataRes.data);

        } catch (error) {
            console.error("Whatsapp Data Fetch Error:", error);
            toast.error("Failed to load data");
        } finally {
            setStoreLoading(false);
            setTableLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const refreshData = fetchData;

    useEffect(() => {
        if (!fmsData || fmsData.length < 7) {
            setIndentData([]);
            setHistoryIndentData([]);
            return;
        }

        const resultData = fmsData;
        const headerRowIndex = 5;
        const headers = resultData[headerRowIndex].map((h) => h?.toString().trim());
        const dataRows = resultData.slice(8);

        const timestampIndex = headers.indexOf("Timestamp");
        const postIndex = headers.indexOf("Post");
        const genderIndex = headers.indexOf("Gender");
        const departmentIndex = headers.indexOf("Department");
        const preferIndex = headers.indexOf("Prefer");
        const noOFPostIndex = headers.indexOf("Number Of Posts");
        const completionDateIndex = headers.indexOf("Completion Date");
        const experienceIndex = headers.indexOf("Experience");
        const salaryIndex = headers.indexOf("Salary");
        const officeTimingIndex = headers.indexOf("Office Timing");
        const residenceIndex = headers.indexOf("Residence");

        const processedData = dataRows.map((row) => {
            const getVal = (idx, fallbackIdx) => {
                const val = row[idx];
                if (val !== undefined && val !== null && val.toString().trim() !== "") return val;
                const fallbackVal = row[fallbackIdx];
                if (fallbackVal !== undefined && fallbackVal !== null && fallbackVal.toString().trim() !== "") return fallbackVal;
                return "";
            };



            // 🔥 Data Response Map (IndentNumber → extra info)
            const dataResponseMap = {};
            dataResponseData?.slice(1).forEach(row => {
                const indentNo = row[0]; // Column A (Indent Number)
                if (!indentNo) return;

                dataResponseMap[indentNo] = {
                    status: row[3],              // Column D
                    jobConsultancy: row[6],      // Column G
                    contactPerson: row[11],      // Column L
                    contactNumber: row[12],      // Column M
                    screenshotUrl: row[8], // ✅ Column I

                };
            });


            return {
                timestamp: row[timestampIndex],
                indentNumber: row[4] || "",
                indenterName: row[5] || "",
                post: getVal(postIndex, 6),
                gender: getVal(genderIndex, 11),
                department: getVal(departmentIndex, 12),
                prefer: row[preferIndex],
                noOfPost: row[noOFPostIndex],
                completionDate: row[completionDateIndex],
                experience: row[experienceIndex],
                salary: row[salaryIndex],
                officeTiming: row[officeTimingIndex],
                residence: row[residenceIndex],
                columnAE: row[30],
                columnAF: row[31],
                statusDR: dataResponseMap[row[4]]?.status || "",
                jobConsultancyDR: dataResponseMap[row[4]]?.jobConsultancy || "",
                contactPersonDR: dataResponseMap[row[4]]?.contactPerson || "",
                contactNumberDR: dataResponseMap[row[4]]?.contactNumber || "",
                screenshotUrl: dataResponseMap[row[4]]?.screenshotUrl || "",


            };
        });

        const pendingTasks = processedData.filter((item) => {
            const hasAE = item.columnAE !== undefined && item.columnAE !== null && item.columnAE.toString().trim() !== "";
            const hasAF = item.columnAF !== undefined && item.columnAF !== null && item.columnAF.toString().trim() !== "";
            return hasAE && !hasAF;
        });

        const historyTasks = processedData.filter((item) => {
            const hasAE = item.columnAE !== undefined && item.columnAE !== null && item.columnAE.toString().trim() !== "";
            const hasAF = item.columnAF !== undefined && item.columnAF !== null && item.columnAF.toString().trim() !== "";
            return hasAE && hasAF;
        });

        setHistoryIndentData(historyTasks);
        setIndentData(pendingTasks);

    }, [fmsData, dataResponseData]);

    const getCurrentTimestamp = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");
        const hours = String(now.getHours()).padStart(2, "0");
        const minutes = String(now.getMinutes()).padStart(2, "0");
        const seconds = String(now.getSeconds()).padStart(2, "0");
        const timestamp = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        return timestamp;
    };

    // fetchIndentData replaced by useEffect reacting to global store

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) {
            setFormData((prev) => ({
                ...prev,
                selectedFile: null,
            }));
            return;
        }

        console.log("📁 File selected locally:", file.name);
        setFormData((prev) => ({
            ...prev,
            selectedFile: file,
        }));
        toast.success("File selected: " + file.name);
    };

    // Internal function to convert file to base64
    const convertFileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
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
                    folderId: "1tSoT0na5lGKAE82z0kDiDNU6ikkHJjA1OayGwV5CFq9tfc3BVrbLl3g-nkyKwHoYIMzTI2aI",
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

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.selectedFile) {
            toast.error("Please select a screenshot to upload!");
            return;
        }

        try {
            setSubmitting(true);
            setFileUploading(true); // Show uploading status

            // 1. Upload the file first
            let uploadedUrl = "";
            try {
                uploadedUrl = await uploadFileToServer(formData.selectedFile);
            } catch (uploadError) {
                toast.error("Screenshot upload failed: " + uploadError.message);
                setFileUploading(false);
                setSubmitting(false);
                return;
            }

            setFileUploading(false);

            // 2. Prepare data for submission
            const timestamp = getCurrentTimestamp();
            const PO_NUMBER = "PO-3";

            const dataResponseRow = [
                formData.indentNumber, // A (0)
                PO_NUMBER,             // B (1)
                timestamp,              // C (2)
                formData.status,        // D (3)
                "",                     // E (4)
                "",                     // F (5)
                "",                     // G (6) 
                "",                     // H (7)
                uploadedUrl            // I (8)
            ];

            const response = await fetch(import.meta.env.VITE_GOOGLE_SHEET_URL, {
                method: "POST",
                body: new URLSearchParams({
                    sheetName: "Data Resposnse",
                    action: "bulkInsert",
                    rowsData: JSON.stringify([dataResponseRow]),
                }),
            });

            const result = await response.json();
            if (result.success) {
                toast.success("Posted successfully!");
                setFormData((prev) => ({
                    ...prev,
                    screenshotUrl: "",
                    selectedFile: null,
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
            setFileUploading(false);
        }
    };

    const handleCancel = () => {
        setFormData({
            ...formData,
            indentNumber: "",
            screenshotUrl: "",
            selectedFile: null,
            status: "Yes",
        });
        setShowModal(false);
    };

    const handlePostClick = (item) => {
        setFormData((prev) => ({
            ...prev,
            indentNumber: item.indentNumber,
            screenshotUrl: "",
            selectedFile: null,
            status: "Yes",
        }));
        setShowModal(true);
    };

    const filteredPendingData = indentData.filter((item) => {
        const term = searchTerm.toLowerCase();
        const matchesSearch =
            (item.post || "").toLowerCase().includes(term) ||
            (item.indentNumber || "").toLowerCase().includes(term) ||
            (item.department || "").toLowerCase().includes(term);

        const matchesDept = !deptFilter || item.department === deptFilter;
        const matchesDesig = !desigFilter || item.post === desigFilter;

        return matchesSearch && matchesDept && matchesDesig;
    });

    const filteredHistoryData = historyIndentData.filter((item) => {
        const term = searchTerm.toLowerCase();
        const matchesSearch =
            (item.post || "").toLowerCase().includes(term) ||
            (item.indentNumber || "").toLowerCase().includes(term) ||
            (item.department || "").toLowerCase().includes(term);

        const matchesDept = !deptFilter || item.department === deptFilter;
        const matchesDesig = !desigFilter || item.post === desigFilter;

        return matchesSearch && matchesDept && matchesDesig;
    });

    const allData = [...indentData, ...historyIndentData];
    const departments = [...new Set(allData.map(item => item.department))].filter(Boolean).sort();
    const posts = [...new Set(allData.map(item => item.post))].filter(Boolean).sort();

    return (
        <div className="space-y-6 page-content p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Whatsapp</h1>
                <div className="flex flex-col md:flex-row items-center gap-3">
                    <div className="relative w-full md:w-64">
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
                        <select
                            value={deptFilter}
                            onChange={(e) => setDeptFilter(e.target.value)}
                            className="w-40 px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy bg-gray-50 text-sm"
                        >
                            <option value="">All Departments</option>
                            {departments.map(dept => (
                                <option key={dept} value={dept}>{dept}</option>
                            ))}
                        </select>
                        <select
                            value={desigFilter}
                            onChange={(e) => setDesigFilter(e.target.value)}
                            className="w-40 px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy bg-gray-50 text-sm"
                        >
                            <option value="">All Posts</option>
                            {posts.map(post => (
                                <option key={post} value={post}>{post}</option>
                            ))}
                        </select>
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

            {showModal && (
                <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
                            <h3 className="text-lg font-medium text-gray-800">Whatsapp Update</h3>
                            <button onClick={handleCancel} className="text-gray-500 hover:text-gray-700">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Indent Number</label>
                                <input
                                    type="text"
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50"
                                    disabled
                                    value={formData.indentNumber}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleInputChange}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-navy focus:border-navy"
                                >
                                    <option value="Yes">Yes</option>
                                    <option value="No">No</option>
                                    <option value="Hold">Hold</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Screenshot Upload *</label>
                                <input
                                    type="file"
                                    onChange={handleFileUpload}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-navy focus:border-navy"
                                    accept="image/*"
                                    required
                                />
                                {formData.selectedFile && (
                                    <p className="text-xs text-blue-600 mt-1">Selected: {formData.selectedFile.name}</p>
                                )}
                                {fileUploading && <p className="text-xs text-navy mt-1 animate-pulse">Uploading screenshot, please wait...</p>}
                            </div>

                            <div className="flex justify-end space-x-2 pt-4">
                                <button
                                    type="button"
                                    onClick={handleCancel}
                                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                                    disabled={submitting}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-navy text-white rounded-md hover:bg-navy-dark flex items-center justify-center disabled:opacity-50"
                                    disabled={submitting || fileUploading}
                                >
                                    {submitting ? "Processing..." : "Submit"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}



            <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="border-b border-gray-200">
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
                    <div className="overflow-x-auto">
                        <div className="overflow-x-auto table-container">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50 sticky top-0 z-10">
                                    <tr>
                                        {activeTab === "pending" && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>}
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Indent Number</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Post</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Indenter Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Job Consultancy
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Contact Person
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Contact No
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Status
                                        </th>
                                        {activeTab === "history" && (
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                Screenshot
                                            </th>
                                        )}

                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {tableLoading ? (
                                        <tr>
                                            <td colSpan={activeTab === "history" ? 9 : 8} className="px-6 py-12 text-center text-gray-500">Loading...</td>
                                        </tr>
                                    ) : (activeTab === "pending" ? filteredPendingData : filteredHistoryData).length === 0 ? (
                                        <tr>
                                            <td colSpan={activeTab === "history" ? 9 : 8} className="px-6 py-12 text-center text-gray-500">No data found.</td>
                                        </tr>
                                    ) : (activeTab === "pending" ? filteredPendingData : filteredHistoryData).map((item, index) => (
                                        <tr key={index} className="hover:bg-gray-50">
                                            {activeTab === "pending" && (
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <button
                                                        onClick={() => handlePostClick(item)}
                                                        className="px-3 py-1 bg-navy text-white rounded hover:bg-navy-dark text-sm"
                                                    >
                                                        Post
                                                    </button>
                                                </td>
                                            )}
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.indentNumber}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.post}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.department}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.indenterName}</td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                {item.jobConsultancyDR}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                {item.contactPersonDR}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                {item.contactNumberDR}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                {item.statusDR}
                                            </td>
                                            {activeTab === "history" && (
                                                <td className="px-6 py-4 text-sm text-gray-500">
                                                    {item.screenshotUrl ? (
                                                        <a
                                                            href={item.screenshotUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-blue-600 underline"
                                                        >
                                                            View
                                                        </a>
                                                    ) : (
                                                        "—"
                                                    )}
                                                </td>
                                            )}

                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Whatsapp;
