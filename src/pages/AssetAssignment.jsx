import React, { useEffect, useState } from "react";

import { Search, X } from "lucide-react";
import toast from "react-hot-toast";

const AssetAssignment = () => {
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
        assets: [],
        laptopDetails: "",
        mobileDetails: "",
        gmailId: ""
    });
    const [submitting, setSubmitting] = useState(false);

    const assetOptions = ["LAPTOP", "MOBILE", "SIM", "GMAIL", "ID CARD"];

    // Local State
    const [joiningFmsData, setJoiningFmsData] = useState([]);
    const [storeLoading, setStoreLoading] = useState(true);

    const fetchData = async () => {
        setStoreLoading(true);
        try {
            const cb = `&_=${Date.now()}`;
            // Use existing JOINING_SUBMIT_URL
            const res = await fetch(`${JOINING_SUBMIT_URL}?action=read&sheet=JOINING_FMS${cb}`);
            const json = await res.json();
            if (json.success && json.data) {
                setJoiningFmsData(json.data);
            }
        } catch (error) {
            console.error("AssetAssignment Data Fetch Error:", error);
            toast.error("Failed to load data");
        } finally {
            setStoreLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const refreshData = fetchData;

    useEffect(() => {
        if (!joiningFmsData || joiningFmsData.length < 8) {
            setCandidateData([]);
            return;
        }

        const rawData = joiningFmsData;
        const headers = rawData[6] || []; // Header at index 6 (row 7)
        const dataRows = rawData.slice(7); // Data from index 7 (row 8)

        // Helper to find column index by header name
        const getIndex = (headerName) => {
            const index = headers.findIndex(
                (h) => h && h.toString().trim().toLowerCase() === headerName.trim().toLowerCase()
            );
            return index;
        };

        const idxIndent = getIndex("Indent Number") !== -1 ? getIndex("Indent Number") : 5;
        const idxName = getIndex("Candidate Name") !== -1 ? getIndex("Candidate Name") : 6;
        const idxDept = getIndex("Department") !== -1 ? getIndex("Department") : 2;
        const idxDesig = getIndex("Designation") !== -1 ? getIndex("Designation") : 14;
        const idxMobile = getIndex("Contact No") !== -1 ? getIndex("Contact No") : 23;
        const idxEmail = getIndex("Email Id") !== -1 ? getIndex("Email Id") : 31;
        const idxBE = 56; // Column BE
        const idxBF = 57; // Column BF

        const processed = dataRows.map((row) => {
            const columnBE = row[idxBE];
            const columnBF = row[idxBF];
            const responseG = row[60] || ""; // BI → Laptop
            const responseH = row[61] || ""; // BJ → Mobile
            const responseI = row[62] || ""; // BK → Gmail
            const responseJ = row[63] || ""; // BL → Assets

            return {
                indentNumber: row[idxIndent] || "",
                candidateName: row[idxName] || "",
                department: row[idxDept] || "",
                designation: row[idxDesig] || "",
                contactNo: row[idxMobile] || "",
                email: row[idxEmail] || "",
                columnBE,
                columnBF,
                laptopDetails: responseG,     // BI
                mobileDetails: responseH,     // BJ
                gmailId: responseI,           // BK
                assetsAssigned: responseJ,    // BL

                // Pending: BE not null && BF null
                isPending: (columnBE != null && columnBE !== "") && (columnBF == null || columnBF === ""),
                // History: both not null
                isHistory: (columnBE != null && columnBE !== "") && (columnBF != null && columnBF !== "")
            };
        }).filter(item => item !== null && (item.isPending || item.isHistory)); // Filter irrelevant rows if needed, or keeping all? Original code filtered nulls.
        // Original code: .filter(item => item !== null);

        setCandidateData(processed);
    }, [joiningFmsData]);

    useEffect(() => {
        setTableLoading(storeLoading);
    }, [storeLoading]);

    const getFilteredData = () => {
        let filtered = candidateData;
        if (activeTab === "pending") filtered = filtered.filter(i => i.isPending);
        else if (activeTab === "history") filtered = filtered.filter(i => i.isHistory);

        if (deptFilter) {
            filtered = filtered.filter(item => item.department === deptFilter);
        }

        if (desigFilter) {
            filtered = filtered.filter(item => item.designation === desigFilter);
        }

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(item =>
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
            status: "",
            assets: [],
            laptopDetails: "",
            mobileDetails: "",
            gmailId: ""
        });
        setShowModal(true);
    };

    const handleCloseModal = () => { setShowModal(false); setSelectedCandidate(null); };

    const handleAssetChange = (asset) => {
        setFormData(prev => {
            const newList = prev.assets.includes(asset)
                ? prev.assets.filter(a => a !== asset)
                : [...prev.assets, asset];
            return { ...prev, assets: newList };
        });
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
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

            const dataArray = [
                selectedCandidate.indentNumber,
                "J-5", // step code
                timestamp,
                formData.status,
                "", // E
                "", // F
                formData.laptopDetails,      // Column H
                formData.mobileDetails,      // Column I
                formData.gmailId,            // Column J
                formData.assets.join(", "), // Column G
            ];

            const params = new URLSearchParams({
                action: "submit",
                sheet: "DATA RESPONSE",
                data: JSON.stringify(dataArray)
            });

            const url = `${JOINING_SUBMIT_URL}?${params.toString()}`;
            console.log("Submitting to:", url);
            const response = await fetch(url);
            const result = await response.json();
            if (result.success) {
                toast.success("Asset details submitted successfully!");
                handleCloseModal();
                refreshData();
            } else {
                toast.error(result.error || "Failed to submit assets");
            }
        } catch (err) {
            console.error("Error submitting form:", err);
            toast.error("Error submitting form");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 page-content p-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-800 uppercase">Asset Assignment</h1>
            </div>

            <div className="bg-white p-4 rounded-lg shadow space-y-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4">
                    <div className="flex-1 max-w-md">
                        <div className="relative w-full">
                            <input
                                type="text"
                                placeholder="Search by name, indent, etc..."
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        </div>
                    </div>
                    <div className="flex space-x-2">
                        <button
                            onClick={() => setActiveTab('pending')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'pending' ? 'bg-navy text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                        >Pending</button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'history' ? 'bg-navy text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                        >History</button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 border-t pt-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Department</label>
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
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Designation</label>
                        <select
                            value={desigFilter}
                            onChange={(e) => setDesigFilter(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy bg-gray-50 text-sm"
                        >
                            <option value="">All Designations</option>
                            {designations.map(desig => (
                                <option key={desig} value={desig}>{desig}</option>
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
                            <X size={14} /> Clear All Filters
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="p-6">
                    <div className="overflow-x-auto table-container">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    {activeTab === "pending" && (
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Action
                                        </th>
                                    )}

                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Indent Number</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Candidate Name</th>
                                    {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th> */}
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Designation</th>
                                    {activeTab === "history" && (
                                        <>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                Laptop
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                Mobile
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                Gmail ID
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                Assets
                                            </th>
                                        </>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {tableLoading ? (
                                    <tr><td colSpan="5" className="px-6 py-12 text-center text-gray-500">Loading...</td></tr>
                                ) : filteredData.length === 0 ? (
                                    <tr><td colSpan="5" className="px-6 py-12 text-center text-gray-500">No candidates found.</td></tr>
                                ) : (
                                    filteredData.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50">
                                            {activeTab === "pending" && (
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <button
                                                        onClick={() => handleOpenModal(item)}
                                                        className="bg-navy text-white px-4 py-2 rounded-lg hover:bg-navy-dark transition-colors"
                                                    >
                                                        Assign Assets
                                                    </button>
                                                </td>
                                            )}

                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-navy">{item.indentNumber}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.candidateName}</td>
                                            {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.department}</td> */}
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.designation}</td>
                                            {activeTab === "history" && (
                                                <>
                                                    <td className="px-6 py-4 text-sm text-gray-500">
                                                        {item.laptopDetails || "—"}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-500">
                                                        {item.mobileDetails || "—"}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-500">
                                                        {item.gmailId || "—"}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-500">
                                                        {item.assetsAssigned || "—"}
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b">
                            <h2 className="text-xl font-bold text-gray-800">Asset Assignment</h2>
                            <button onClick={handleCloseModal} className="text-gray-500 hover:text-gray-700"><X size={24} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <p className="text-sm text-gray-600"><strong>Candidate:</strong> {selectedCandidate?.candidateName}</p>
                                <p className="text-sm text-gray-600"><strong>Indent:</strong> {selectedCandidate?.indentNumber}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Assets Assigned</label>
                                <div className="grid grid-cols-2 gap-2 border border-gray-200 rounded-lg p-3">
                                    {assetOptions.map((option, index) => (
                                        <div key={index} className="flex items-center">
                                            <input
                                                type="checkbox"
                                                id={`asset-${index}`}
                                                checked={formData.assets.includes(option)}
                                                onChange={() => handleAssetChange(option)}
                                                className="h-4 w-4 text-navy focus:ring-navy border-gray-300 rounded"
                                            />
                                            <label htmlFor={`asset-${index}`} className="ml-2 block text-sm text-gray-700 cursor-pointer">
                                                {option}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Laptop Brand & Model</label>
                                <input
                                    type="text"
                                    name="laptopDetails"
                                    value={formData.laptopDetails}
                                    onChange={handleInputChange}
                                    placeholder="e.g. Dell Latitude 5420"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Brand & SIM Info</label>
                                <input
                                    type="text"
                                    name="mobileDetails"
                                    value={formData.mobileDetails}
                                    onChange={handleInputChange}
                                    placeholder="e.g. Samsung A23 - SIM 9876543210"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Official Gmail ID</label>
                                <input
                                    type="email"
                                    name="gmailId"
                                    value={formData.gmailId}
                                    onChange={handleInputChange}
                                    placeholder="e.g. employee@company.com"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Final Status <span className="text-red-500">*</span></label>
                                <select name="status" value={formData.status} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy">
                                    <option value="">Select Status</option>
                                    <option value="Done">Done</option>
                                    <option value="Not Done">Not Done</option>
                                </select>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <button type="button" onClick={handleCloseModal} className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
                                <button type="submit" disabled={submitting} className="px-6 py-2 bg-navy text-white rounded-lg hover:bg-navy-dark transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed">
                                    {submitting ? "Submitting..." : "Submit Details"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AssetAssignment;
