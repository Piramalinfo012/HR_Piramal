import React, { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import toast from "react-hot-toast";

const AssetAssignment = () => {
    const JOINING_SUBMIT_URL = "https://script.google.com/macros/s/AKfycbwhFgVoAB4S1cKrU0iDRtCH5B2K-ol2c0RmaaEWXGqv0bdMzs3cs3kPuqOfUAR3KHYZ7g/exec";

    const [candidateData, setCandidateData] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
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

    useEffect(() => {
        fetchCandidateData();
    }, []);

    const fetchCandidateData = async () => {
        setTableLoading(true);
        try {
            const url = `${JOINING_SUBMIT_URL}?action=read&sheet=JOINING_FMS&_=${Date.now()}`;
            console.log("Fetching data from:", url);
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const responseText = await response.text();
            let data;
            try { data = JSON.parse(responseText); }
            catch (e) {
                console.error("Failed to parse JSON", e);
                if (responseText.includes("<html")) throw new Error("Google Apps Script returned HTML. Redeploy as Web App.");
                else throw new Error("Invalid JSON response");
            }
            if (!data.success) throw new Error(data.error || "Failed to fetch data");
            const rawData = data.data || [];
            // Skip first 7 rows
            const dataRows = rawData.slice(7);
            const processed = dataRows.map((row, idx) => {
                if (!row || row.length === 0) return null;
                const columnBE = row[56]; // Column BE index 56
                const columnBF = row[57]; // Column BF index 57
                return {
                    indentNumber: row[5] || "",
                    candidateName: row[10] || "",
                    department: row[2] || "",
                    designation: row[14] || "",
                    contactNo: row[23] || "",
                    email: row[31] || "",
                    columnBE,
                    columnBF,
                    // Pending: BE not null && BF null
                    isPending: (columnBE != null && columnBE !== "") && (columnBF == null || columnBF === ""),
                    // History: both not null
                    isHistory: (columnBE != null && columnBE !== "") && (columnBF != null && columnBF !== "")
                };
            }).filter(item => item !== null);
            setCandidateData(processed);
        } catch (err) {
            console.error("Error fetching data:", err);
            toast.error(err.message || "Error fetching data");
            setCandidateData([]);
        } finally {
            setTableLoading(false);
        }
    };

    const getFilteredData = () => {
        let filtered = candidateData;
        if (activeTab === "pending") filtered = filtered.filter(i => i.isPending);
        else if (activeTab === "history") filtered = filtered.filter(i => i.isHistory);
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(item =>
                (item.candidateName || "").toLowerCase().includes(term) ||
                (item.indentNumber || "").toLowerCase().includes(term) ||
                (item.designation || "").toLowerCase().includes(term)
            );
        }
        return filtered;
    };

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
            // Format timestamp as YYYY-MM-DD HH:MM:SS
            const now = new Date();
            const day = String(now.getDate()).padStart(2, '0');
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const year = now.getFullYear();
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
                fetchCandidateData();
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

            <div className="bg-white p-4 rounded-lg shadow">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4">
                    <div className="flex-1 max-w-md">
                        <div className="relative w-full">
                            <input
                                type="text"
                                placeholder="Search by name, indent number or designation..."
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        </div>
                    </div>
                    <div className="flex space-x-2">
                        <button
                            onClick={() => setActiveTab('pending')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'pending' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                        >Pending</button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'history' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                        >History</button>
                    </div>
                </div>
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="p-6">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Indent Number</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Candidate Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Designation</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
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
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600">{item.indentNumber}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.candidateName}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.department}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.designation}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <button onClick={() => handleOpenModal(item)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">Assign Assets</button>
                                            </td>
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
                                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
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
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
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
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
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
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Final Status <span className="text-red-500">*</span></label>
                                <select name="status" value={formData.status} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500">
                                    <option value="">Select Status</option>
                                    <option value="Done">Done</option>
                                    <option value="Not Done">Not Done</option>
                                </select>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <button type="button" onClick={handleCloseModal} className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
                                <button type="submit" disabled={submitting} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed">
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
