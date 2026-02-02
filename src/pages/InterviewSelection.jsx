import React, { useEffect, useState } from "react";
import useDataStore from "../store/dataStore";
import { Search, Clock, Plus, X, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";

const InterviewSelection = () => {
    const FETCH_URL = import.meta.env.VITE_GOOGLE_SHEET_URL;
    const getSubmitUrl = () => import.meta.env.VITE_SUBMIT_URL || FETCH_URL;

    const [candidateData, setCandidateData] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [tableLoading, setTableLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("pending");
    const [actionSubmitting, setActionSubmitting] = useState(false);
    const [showActionModal, setShowActionModal] = useState(false);
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [deptFilter, setDeptFilter] = useState("");
    const [desigFilter, setDesigFilter] = useState("");
    const [indentOptions, setIndentOptions] = useState([]);
    const [fmsDataMap, setFmsDataMap] = useState({});
    const [actionFormData, setActionFormData] = useState({
        indentNumber: "",
        status: "",
        finalizedSalary: "",
    });

    const {
        candidateSelectionData,
        fmsData: globalFmsData,
        isLoading: storeLoading,
        refreshData
    } = useDataStore();

    // Refresh data on mount to ensure we have latest from Canidate_Selection
    useEffect(() => {
        refreshData();
    }, [refreshData]);

    useEffect(() => {
        setTableLoading(storeLoading);
    }, [storeLoading]);

    // FMS Data Effect
    useEffect(() => {
        if (!globalFmsData || globalFmsData.length < 2) return;
        const dataRows = globalFmsData.slice(1);

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

    }, [globalFmsData]);

    // Candidate Data Effect
    useEffect(() => {
        if (!candidateSelectionData || candidateSelectionData.length < 8) {
            setCandidateData([]);
            return;
        }

        const dataRows = candidateSelectionData.slice(8);
        const processedData = dataRows.map((row, idx) => ({
            rowIndex: idx + 8, // Slice 7, so row 1 is index 8
            id: row[1], // Column B
            department: row[2], // Column C
            designation: row[3], // Column D
            candidateName: row[4], // Column E
            contactNo: row[5], // Column F
            mail: row[6], // Column G
            indentId: row[41], // Column A
            trigger_AD: row[29], // Column AD (Previous Step Marker)
            statusMarker_AE: row[30], // Column AE (This Step Marker)
        }));
        setCandidateData(processedData);

    }, [candidateSelectionData]);


    const handleActionClick = (candidate) => {
        setSelectedCandidate(candidate);
        setActionFormData({
            indentNumber: candidate.indentId || "",
            status: "Selected",
            finalizedSalary: "",
        });
        setShowActionModal(true);
    };

    const handleActionSubmit = async (e) => {
        e.preventDefault();
        const { status, finalizedSalary } = actionFormData;
        const candidate = selectedCandidate;

        if (!status) {
            toast.error("Please select a status");
            return;
        }

        // if (!window.confirm(`Are you sure you want to mark as ${status}?`)) return;

        setActionSubmitting(true);
        try {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            const timestamp = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

            // 1. Submit to DATA RESPONSE
            const responseData = [];
            responseData[0] = candidate.indentId; // Column A (Indent Number)
            responseData[1] = "CS-3";             // Column B (Step Code CS-3)
            responseData[2] = timestamp;          // Column C (Timestamp)
            responseData[3] = status;             // Column D (Status)
            responseData[9] = finalizedSalary;    // Column J (Finalized Salary - index 9)

            const insertResponse = await fetch(getSubmitUrl(), {
                method: "POST",
                body: new URLSearchParams({
                    sheetName: "Data Resposnse",
                    action: "bulkInsert",
                    rowsData: JSON.stringify([responseData]),
                }),
            });

            // 2. Update Column AE in Canidate_Selection (index 30, so 31st column)
            const updateResponse = await fetch(getSubmitUrl(), {
                method: "POST",
                body: new URLSearchParams({
                    sheetName: "Data Resposnse",
                    action: "updateCell",
                    rowIndex: candidate.rowIndex,
                    columnIndex: 31, // Column AE is 31st column (1-indexed)
                    value: timestamp
                }),
            });

            // 3. Update Column AF in Canidate_Selection (index 31, so 32nd column) - Action Status for Joining
            const triggerResponse = await fetch(getSubmitUrl(), {
                method: "POST",
                body: new URLSearchParams({
                    sheetName: "Data Resposnse",
                    action: "updateCell",
                    rowIndex: candidate.rowIndex,
                    columnIndex: 32, // Column AF is 32nd column (1-indexed)
                    value: status
                }),
            });

            const res1 = await insertResponse.json();
            const res2 = await updateResponse.json();
            const res3 = await triggerResponse.json();

            if (res1.success && res2.success && res3.success) {
                toast.success(`Selection ${status} successfully!`);
                setShowActionModal(false);
                refreshData();
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

        const hasAD = !!(item.trigger_AD && item.trigger_AD.toString().trim());
        const hasAE = !!(item.statusMarker_AE && item.statusMarker_AE.toString().trim());

        const matchesTab = activeTab === "pending"
            ? (hasAD && !hasAE)
            : (hasAD && hasAE);

        const matchesSearch = (
            (item.candidateName || "").toLowerCase().includes(term) ||
            (item.id || "").toLowerCase().includes(term) ||
            (item.designation || "").toLowerCase().includes(term)
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
                <h1 className="text-2xl font-bold text-gray-800">Interview & Final Selection</h1>
            </div>

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
                    <div className="overflow-x-auto table-container">
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
                                                        {item.statusMarker_AE}
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
                                        <label className="block text-sm font-medium text-gray-700">Finalized Salary (LPA)</label>
                                        <input
                                            type="text"
                                            placeholder="Enter finalized salary..."
                                            value={actionFormData.finalizedSalary}
                                            onChange={(e) => setActionFormData({ ...actionFormData, finalizedSalary: e.target.value })}
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
                                            <option value="Selected">Selected</option>
                                            <option value="Rejected">Rejected</option>

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

export default InterviewSelection;
