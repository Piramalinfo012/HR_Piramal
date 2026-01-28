import React, { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import toast from "react-hot-toast";

const JoiningLetterRelease = () => {
    const JOINING_SUBMIT_URL = "https://script.google.com/macros/s/AKfycbwhFgVoAB4S1cKrU0iDRtCH5B2K-ol2c0RmaaEWXGqv0bdMzs3cs3kPuqOfUAR3KHYZ7g/exec";

    const [candidateData, setCandidateData] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [deptFilter, setDeptFilter] = useState("");
    const [desigFilter, setDesigFilter] = useState("");
    const [tableLoading, setTableLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("pending");
    const [showModal, setShowModal] = useState(false);
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [formData, setFormData] = useState({
        status: "",
        attachmentUrl: ""
    });
    const [uploading, setUploading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchCandidateData();
    }, []);

    const fetchCandidateData = async () => {
        setTableLoading(true);

        try {
            const url = `${JOINING_SUBMIT_URL}?action=read&sheet=JOINING_FMS&_=${Date.now()}`;
            console.log("Fetching data from:", url);

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const responseText = await response.text();
            console.log("Raw response:", responseText.substring(0, 500));

            let data;
            try {
                data = JSON.parse(responseText);
            } catch (parseError) {
                console.error("Failed to parse JSON:", parseError);

                if (responseText.includes("<!DOCTYPE html>") || responseText.includes("<html")) {
                    throw new Error("Google Apps Script is returning HTML instead of JSON. Please redeploy as Web App with JSON output.");
                } else {
                    throw new Error("Invalid JSON response from server");
                }
            }

            if (!data.success) {
                throw new Error(data.error || "Failed to fetch data from sheet");
            }

            const rawData = data.data || [];
            const headers = rawData[6] || [];
            const dataRows = rawData.length > 7 ? rawData.slice(7) : [];

            // Helper to find column index by header name
            const getIndex = (headerName) => {
                const index = headers.findIndex(
                    (h) => h && h.toString().trim().toLowerCase() === headerName.trim().toLowerCase()
                );
                return index;
            };

            const idxIndent = getIndex("Indent Number") !== -1 ? getIndex("Indent Number") : 5;
            const idxName = getIndex("Candidate Name") !== -1 ? getIndex("Candidate Name") : 10;
            const idxDept = getIndex("Department") !== -1 ? getIndex("Department") : 2;
            const idxDesig = getIndex("Designation") !== -1 ? getIndex("Designation") : 14;
            const idxMobile = getIndex("Contact No") !== -1 ? getIndex("Contact No") : 23;
            const idxEmail = getIndex("Email Id") !== -1 ? getIndex("Email Id") : 31;

            const processedData = dataRows.map((row) => {
                if (!row || row.length === 0) return null;

                const columnAQ = row[42];
                const columnAR = row[43];

                return {
                    indentNumber: row[idxIndent] || "",
                    candidateName: row[idxName] || "",
                    department: row[idxDept] || "",
                    designation: row[idxDesig] || "",
                    contactNo: row[idxMobile] || "",
                    email: row[idxEmail] || "",
                    columnAQ: columnAQ,
                    columnAR: columnAR,
                    isPending: (columnAQ != null && columnAQ !== "") && (columnAR == null || columnAR === ""),
                    isHistory: (columnAQ != null && columnAQ !== "") && (columnAR != null && columnAR !== "")
                };
            }).filter(item => item !== null);

            console.log("Processed JLR Candidates:", processedData);
            setCandidateData(processedData);

            if (processedData.length === 0) {
                toast.success("No data found in sheet");
            } else {
                toast.success(`Successfully loaded ${processedData.length} candidates`);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            toast.error(`Error loading data: ${error.message}`);
            setCandidateData([]);
        } finally {
            setTableLoading(false);
        }
    };

    const getFilteredData = () => {
        let filtered = candidateData;

        if (activeTab === "pending") {
            filtered = filtered.filter(item => item.isPending);
        } else if (activeTab === "history") {
            filtered = filtered.filter(item => item.isHistory);
        }

        if (deptFilter) {
            filtered = filtered.filter(item => item.department === deptFilter);
        }

        if (desigFilter) {
            filtered = filtered.filter(item => item.designation === desigFilter);
        }

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter((item) =>
                (item.candidateName || "").toLowerCase().includes(term) ||
                (item.indentNumber || "").toLowerCase().includes(term) ||
                (item.designation || "").toLowerCase().includes(term) ||
                (item.department || "").toLowerCase().includes(term)
            );
        }

        return filtered;
    };

    const departments = [...new Set(candidateData.map(item => item.department))].filter(Boolean).sort();
    const designations = [...new Set(candidateData.map(item => item.designation))].filter(Boolean).sort();

    const filteredData = getFilteredData();

    const handleOpenModal = (candidate) => {
        setSelectedCandidate(candidate);
        setFormData({
            status: "Yes",
            attachmentUrl: ""
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

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            setUploading(true);
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
                            folderId: "1DL_Xf0_9fszToIDlZ3MMsiebDSK4OeIu2FOa1kvA8vPZCGoVKN6Johxc95FLVqP9Qp7cBp9v",
                        }),
                    }
                );

                const result = await response.json();

                if (result.success) {
                    setFormData((prev) => ({
                        ...prev,
                        attachmentUrl: result.fileUrl,
                    }));
                    toast.success("File uploaded successfully!");
                } else {
                    toast.error("File upload failed");
                }
                setUploading(false);
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error("Upload error:", error);
            toast.error("File upload error");
            setUploading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            // Create a new Date object
            const now = new Date();
            // Format timestamp as YYYY-MM-DD HH:MM:SS
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            const timestamp = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

            // Prepare data for submission
            const dataArray = [
                selectedCandidate.indentNumber,  // Column A - Indent Number
                "J-2",                            // Column B - Step Code (hardcoded J-2)
                timestamp,                        // Column C - Timestamp (DD/MM/YY HH:MM:SS)
                formData.status,                  // Column D - Status
                formData.attachmentUrl            // Column E - Attachment URL
            ];

            // Use GET request with URL parameters for Google Apps Script
            const params = new URLSearchParams({
                action: "submit",
                sheet: "DATA RESPONSE",
                data: JSON.stringify(dataArray)
            });

            const url = `${JOINING_SUBMIT_URL}?${params.toString()}`;
            console.log("Submitting to:", url);

            const response = await fetch(url);
            const result = await response.json();
            console.log("Submit result:", result);

            if (result.success) {
                toast.success("Status submitted successfully!");
                handleCloseModal();
                fetchCandidateData();
            } else {
                toast.error(result.error || "Failed to submit status");
            }
        } catch (error) {
            console.error("Error submitting form:", error);
            toast.error("Error submitting form");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 page-content p-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-800 uppercase">
                    Joining Letter Release
                </h1>
            </div>

            {/* Search and Tabs */}
            <div className="bg-white p-4 rounded-lg shadow">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg w-fit">
                        <button
                            onClick={() => setActiveTab("pending")}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${activeTab === "pending" ? "bg-white text-navy shadow-sm" : "text-gray-600 hover:text-gray-800"}`}
                        >
                            Pending
                        </button>
                        <button
                            onClick={() => setActiveTab("history")}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${activeTab === "history" ? "bg-white text-navy shadow-sm" : "text-gray-600 hover:text-gray-800"}`}
                        >
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

            {/* Table */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="p-6">
                    <div className="overflow-x-auto table-container">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Action
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Indent Number
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Candidate Name
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Department
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Designation
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Contact
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Email
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {tableLoading ? (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                                            Loading...
                                        </td>
                                    </tr>
                                ) : filteredData.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                                            No candidates found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredData.map((item, index) => (
                                        <tr key={index} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <button
                                                    onClick={() => handleOpenModal(item)}
                                                    className="bg-navy text-white px-4 py-2 rounded-lg hover:bg-navy-dark transition-colors"
                                                >
                                                    Update Status
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-navy">
                                                {item.indentNumber}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {item.candidateName}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {item.department}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {item.designation}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {item.contactNo}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {item.email}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal Form */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                        <div className="flex items-center justify-between p-6 border-b">
                            <h2 className="text-xl font-bold text-gray-800">Update Status</h2>
                            <button
                                onClick={handleCloseModal}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6">
                            <div className="mb-4">
                                <p className="text-sm text-gray-600 mb-2">
                                    <strong>Indent Number:</strong> {selectedCandidate?.indentNumber}
                                </p>
                                <p className="text-sm text-gray-600 mb-4">
                                    <strong>Candidate:</strong> {selectedCandidate?.candidateName}
                                </p>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Status <span className="text-red-500">*</span>
                                </label>
                                <select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy"
                                >
                                    <option value="Yes">Yes</option>
                                    <option value="No">No</option>
                                    <option value="Hold">Hold</option>
                                </select>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Attachment File
                                </label>
                                <input
                                    type="file"
                                    onChange={handleFileUpload}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy text-sm"
                                    disabled={uploading}
                                />
                                {uploading && <p className="text-xs text-navy mt-1">Uploading...</p>}
                                {formData.attachmentUrl && (
                                    <p className="text-xs text-green-600 mt-1 truncate">
                                        Uploaded: {formData.attachmentUrl}
                                    </p>
                                )}
                            </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting || uploading}
                                    className="px-6 py-2 bg-navy text-white rounded-lg hover:bg-navy-dark transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                                >
                                    {submitting ? "Submitting..." : (uploading ? "Uploading..." : "Submit")}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default JoiningLetterRelease;
