import React, { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import toast from "react-hot-toast";

const CheckSalarySlipAndResume = () => {
    const FETCH_URL = import.meta.env.VITE_GOOGLE_SHEET_URL;
    const SUBMIT_URL = import.meta.env.VITE_SUBMIT_URL || FETCH_URL;
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
        status: ""
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchCandidateData();
    }, []);

    const fetchCandidateData = async () => {
        setTableLoading(true);

        try {
            // Google Apps Script Web App URL
            const url = `${JOINING_SUBMIT_URL}?action=read&sheet=JOINING_FMS&_=${Date.now()}`;

            console.log("Fetching data from:", url);

            // Fetch data from Google Apps Script
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            // Get response as text first
            const responseText = await response.text();
            console.log("Raw response:", responseText.substring(0, 500));

            // Try to parse as JSON
            let data;
            try {
                data = JSON.parse(responseText);
            } catch (parseError) {
                console.error("Failed to parse JSON:", parseError);

                // Check if it's HTML response (Google Apps Script default)
                if (responseText.includes("<!DOCTYPE html>") || responseText.includes("<html")) {
                    throw new Error("Google Apps Script is returning HTML instead of JSON. Please redeploy as Web App with JSON output.");
                } else {
                    throw new Error("Invalid JSON response from server");
                }
            }

            // Check if response has success flag
            if (!data.success) {
                throw new Error(data.error || "Failed to fetch data from sheet");
            }

            // Process the data from sheet
            const rawData = data.data || [];
            console.log("Raw sheet data:", rawData);
            console.log("Total rows fetched:", rawData.length);

            // Skip first 7 rows (index 0-6), start from index 7
            const dataRows = rawData.slice(7);
            console.log("Data rows after skipping first 7:", dataRows.length);

            // Transform sheet data to match component structure
            const headers = rawData[6] || [];
            // dataRows is already defined above, so we don't redefine it here.
            // const dataRows = rawData.length > 7 ? rawData.slice(7) : []; // This line was causing a redeclaration error.

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

            const processedData = dataRows.map((row, index) => {
                // Skip empty rows
                if (!row || row.length === 0) return null;

                const columnAM = row[38];
                const columnAN = row[39];

                // Assuming salary slip is in column AC (index 28) and resume is in column AD (index 29)
                // based on typical JOINING ENTRY FORM structure
                const salarySlip = row[36]; // Column AC
                const resume = row[37];     // Column AD

                return {
                    indentNumber: row[idxIndent] || "",
                    candidateName: row[idxName] || "",
                    department: row[idxDept] || "",
                    designation: row[idxDesig] || "",
                    contactNo: row[idxMobile] || "",
                    email: row[idxEmail] || "",
                    salarySlip: salarySlip || "",
                    resume: resume || "",
                    columnAM: columnAM,
                    columnAN: columnAN,
                    isPending: (columnAM != null && columnAM !== "") && (columnAN == null || columnAN === ""),
                    isHistory: (columnAM != null && columnAM !== "") && (columnAN != null && columnAN !== "")
                };
            }).filter(item => item !== null);

            console.log("Processed data for UI:", processedData);
            setCandidateData(processedData);

            if (processedData.length === 0) {
                toast.success("No data found in sheet");
            } else {
                toast.success(`Successfully loaded ${processedData.length} candidates`);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            if (error.message.includes("HTML instead of JSON")) {
                toast.error("Please redeploy Google Apps Script as Web App");
            } else if (error.message.includes("CORS") || error.message.includes("Failed to fetch")) {
                toast.error("Network error. Check if Google Apps Script is accessible");
            } else {
                toast.error(`Error: ${error.message}`);
            }
            setCandidateData([]);
        } finally {
            setTableLoading(false);
        }
    };

    // Filter data based on active tab
    const getFilteredData = () => {
        let filtered = candidateData;

        if (activeTab === "pending") {
            filtered = filtered.filter(item => item.isPending);
        } else if (activeTab === "history") {
            filtered = filtered.filter(item => item.isHistory);
        }

        // Apply search filter
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
            status: "Yes"
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const now = new Date();
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
                "J-1",                            // Column B - Step Code (hardcoded)
                timestamp,                        // Column C - Timestamp (DD/MM/YY HH:MM:SS)
                formData.status                   // Column D - Status
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

            // Since we're using GET, try to parse the response
            const result = await response.json();
            console.log("Submit result:", result);

            if (result.success) {
                toast.success("Status submitted successfully!");
                handleCloseModal();
                fetchCandidateData(); // Refresh the table
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
                    Check Salary Slip & Resume Copy
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
                                    {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Department
                                    </th> */}
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Designation
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Contact
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Email
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Salary Slip
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Resume
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {tableLoading ? (
                                    <tr>
                                        <td colSpan="9" className="px-6 py-12 text-center text-gray-500">
                                            Loading...
                                        </td>
                                    </tr>
                                ) : filteredData.length === 0 ? (
                                    <tr>
                                        <td colSpan="9" className="px-6 py-12 text-center text-gray-500">
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
                                            {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {item.department}
                                            </td> */}
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {item.designation}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {item.contactNo}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {item.email}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {item.salarySlip ? (
                                                    <a href={item.salarySlip} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                                        View
                                                    </a>
                                                ) : (
                                                    "Not Available"
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {item.resume ? (
                                                    <a href={item.resume} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                                        View
                                                    </a>
                                                ) : (
                                                    "Not Available"
                                                )}
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

                            <div className="mb-6">
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
                                    disabled={submitting}
                                    className="px-6 py-2 bg-navy text-white rounded-lg hover:bg-navy-dark transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                                >
                                    {submitting ? "Submitting..." : "Submit"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CheckSalarySlipAndResume;
