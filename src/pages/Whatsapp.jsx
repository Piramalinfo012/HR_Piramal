import React, { useEffect, useState } from "react";
import { Search, Clock, HistoryIcon, Plus, X, CheckCircle } from "lucide-react";
import useDataStore from "../store/dataStore";
import toast from "react-hot-toast";

const Whatsapp = () => {
    const { addIndent } = useDataStore();

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
        status: "Yes",
    });
    const [indentData, setIndentData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [tableLoading, setTableLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            setTableLoading(true);
            await fetchIndentData();
            setTableLoading(false);
        };
        loadData();
    }, []);

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

    const fetchIndentData = async () => {
        try {
            const response = await fetch(
                `${import.meta.env.VITE_GOOGLE_SHEET_URL}?sheet=FMS&action=fetch`
            );

            const result = await response.json();

            if (result.success && result.data && result.data.length >= 7) {
                // Find headers dynamically or use index 5 (standard for FMS)
                const headerRowIndex = 5;
                const headers = result.data[headerRowIndex].map((h) => h?.toString().trim());

                // Get data starting from row after headers
                const dataRows = result.data.slice(headerRowIndex + 1);

                // Map column indices (standard for FMS sheet)
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

                // Process the data
                const processedData = dataRows.map((row) => {
                    const getVal = (idx, fallbackIdx) => {
                        const val = row[idx];
                        if (val !== undefined && val !== null && val.toString().trim() !== "") return val;
                        // Only use fallback if initial index failed
                        const fallbackVal = row[fallbackIdx];
                        if (fallbackVal !== undefined && fallbackVal !== null && fallbackVal.toString().trim() !== "") return fallbackVal;
                        return "";
                    };

                    return {
                        timestamp: row[timestampIndex],
                        indentNumber: row[4] || "", // Column E
                        indenterName: row[5] || "", // Column F
                        post: getVal(postIndex, 6), // Column G fallback
                        gender: getVal(genderIndex, 11), // Column L fallback
                        department: getVal(departmentIndex, 12), // Column M fallback
                        prefer: row[preferIndex],
                        noOfPost: row[noOFPostIndex],
                        completionDate: row[completionDateIndex],
                        experience: row[experienceIndex],
                        salary: row[salaryIndex],
                        officeTiming: row[officeTimingIndex],
                        residence: row[residenceIndex],

                        // User requested filtering: AE (index 30) and AF (index 31)
                        columnAE: row[30],
                        columnAF: row[31],
                    };
                });

                // Pending: AE not null and AF null
                const pendingTasks = processedData.filter((item) => {
                    const hasAE = item.columnAE !== undefined && item.columnAE !== null && item.columnAE.toString().trim() !== "";
                    const hasAF = item.columnAF !== undefined && item.columnAF !== null && item.columnAF.toString().trim() !== "";
                    return hasAE && !hasAF;
                });

                // History: AE not null and AF not null
                const historyTasks = processedData.filter((item) => {
                    const hasAE = item.columnAE !== undefined && item.columnAE !== null && item.columnAE.toString().trim() !== "";
                    const hasAF = item.columnAF !== undefined && item.columnAF !== null && item.columnAF.toString().trim() !== "";
                    return hasAE && hasAF;
                });

                setHistoryIndentData(historyTasks);
                setIndentData(pendingTasks);

                return {
                    success: true,
                    data: processedData,
                };
            }
            return { success: false, error: "No data found" };
        } catch (error) {
            console.error("Error fetching data:", error);
            return { success: false, error: error.message };
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
                    setFormData((prev) => ({
                        ...prev,
                        screenshotUrl: result.fileUrl,
                    }));
                    toast.success("Screenshot uploaded successfully!");
                } else {
                    toast.error("File upload failed: " + (result.error || "Unknown error"));
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

        try {
            setSubmitting(true);
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
                formData.screenshotUrl // I (8)
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
                }));
                setShowModal(false);
                await fetchIndentData();
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

    const handleCancel = () => {
        setFormData({
            ...formData,
            indentNumber: "",
            screenshotUrl: "",
            status: "Yes",
        });
        setShowModal(false);
    };

    const handlePostClick = (item) => {
        setFormData((prev) => ({
            ...prev,
            indentNumber: item.indentNumber,
            screenshotUrl: "",
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
                                <label className="block text-sm font-medium text-gray-700 mb-1">Screenshot Upload</label>
                                <input
                                    type="file"
                                    onChange={handleFileUpload}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-navy focus:border-navy"
                                    accept="image/*"
                                    disabled={fileUploading || submitting}
                                />
                                {fileUploading && <p className="text-xs text-navy mt-1">Uploading...</p>}
                                {formData.screenshotUrl && !fileUploading && (
                                    <p className="text-xs text-green-600 mt-1">Screenshot uploaded successfully!</p>
                                )}
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
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {tableLoading ? (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-12 text-center text-gray-500">Loading...</td>
                                        </tr>
                                    ) : (activeTab === "pending" ? filteredPendingData : filteredHistoryData).length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-12 text-center text-gray-500">No data found.</td>
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
