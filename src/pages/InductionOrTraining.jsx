import React, { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import toast from "react-hot-toast";

const InductionOrTraining = () => {
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
        checklist: []
    });
    const [submitting, setSubmitting] = useState(false);

    const checklistOptions = [
        "Check Salary Slip & Resume Copy (वेतन पर्ची और बायोडेटा कॉपी)",
        "Offer Letter Received (प्रस्ताव पत्र प्राप्त हुआ)",
        "Welcome Meeting (स्वागत बैठक)",
        "Biometric Access बायोमीट्रिक एक्सेस",
        "Official Email ID (ऑफ़िशियल ईमेल आईडी)",
        "Assign Assets (असाइन एसेट्स)",
        "PF / ESIC (पी.एफ./ई.एस.आई.सी.)",
        "5 Reference Numbers (5 संदर्भ नंबर)",
        "How to save WhatsApp name at the time of login (व्हाट्सएप नाम कैसे सेव करें)",
        "Company Directory (कंपनी निर्देशिका)"
    ];

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

            const processed = dataRows.map((row, idx) => {
                if (!row || row.length === 0) return null;
                const columnAV = row[47]; // AV (0‑based index 47)
                const columnAW = row[48]; // AW (0‑based index 48)
                return {
                    indentNumber: row[idxIndent] || "",
                    candidateName: row[idxName] || "",
                    department: row[idxDept] || "",
                    designation: row[idxDesig] || "",
                    contactNo: row[idxMobile] || "",
                    email: row[idxEmail] || "",
                    columnAV,
                    columnAW,
                    // Pending: AV not null && AW null
                    isPending: (columnAV != null && columnAV !== "") && (columnAW == null || columnAW === ""),
                    // History: both not null
                    isHistory: (columnAV != null && columnAV !== "") && (columnAW != null && columnAW !== "")
                };
            }).filter(item => item !== null);
            setCandidateData(processed);
            toast.success(`Loaded ${processed.length} records`);
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
            status: "Yes",
            checklist: []
        });
        setShowModal(true);
    };
    const handleCloseModal = () => { setShowModal(false); setSelectedCandidate(null); };
    const handleChecklistChange = (item) => {
        setFormData(prev => {
            const newList = prev.checklist.includes(item)
                ? prev.checklist.filter(i => i !== item)
                : [...prev.checklist, item];
            return { ...prev, checklist: newList };
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
                "J-3", // step code for this page
                timestamp,
                formData.status,
                "",
                formData.checklist.join(", ") // Column F
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
                toast.success("Status submitted successfully!");
                handleCloseModal();
                fetchCandidateData();
            } else {
                toast.error(result.error || "Failed to submit status");
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
                <h1 className="text-2xl font-bold text-gray-800 uppercase">Induction Or Training</h1>
            </div>
            {/* Search & Tabs */}
            <div className="bg-white p-4 rounded-lg shadow">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg w-fit">
                        <button
                            onClick={() => setActiveTab('pending')}
                            className={`px-4 py-2 rounded-md transition-all ${activeTab === 'pending' ? 'bg-white text-navy shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}
                        >
                            Pending
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`px-4 py-2 rounded-md transition-all ${activeTab === 'history' ? 'bg-white text-navy shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}
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
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Indent Number</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Candidate Name</th>
                                    {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th> */}
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Designation</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {tableLoading ? (
                                    <tr><td colSpan="7" className="px-6 py-12 text-center text-gray-500">Loading...</td></tr>
                                ) : filteredData.length === 0 ? (
                                    <tr><td colSpan="7" className="px-6 py-12 text-center text-gray-500">No candidates found.</td></tr>
                                ) : (
                                    filteredData.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-navy">{item.indentNumber}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.candidateName}</td>
                                            {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.department}</td> */}
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.designation}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.contactNo}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.email}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <button onClick={() => handleOpenModal(item)} className="bg-navy text-white px-4 py-2 rounded-lg hover:bg-navy-dark transition-colors">Update Status</button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                        <div className="flex items-center justify-between p-6 border-b">
                            <h2 className="text-xl font-bold text-gray-800">Update Status</h2>
                            <button onClick={handleCloseModal} className="text-gray-500 hover:text-gray-700"><X size={24} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6">
                            <div className="mb-4">
                                <p className="text-sm text-gray-600 mb-1"><strong>Indent Number:</strong> {selectedCandidate?.indentNumber}</p>
                                <p className="text-sm text-gray-600 mb-1"><strong>Candidate:</strong> {selectedCandidate?.candidateName}</p>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Checklist <span className="text-red-500">*</span></label>
                                <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                                    {checklistOptions.map((option, index) => (
                                        <div key={index} className="flex items-start">
                                            <input
                                                type="checkbox"
                                                id={`check-${index}`}
                                                checked={formData.checklist.includes(option)}
                                                onChange={() => handleChecklistChange(option)}
                                                className="mt-1 h-4 w-4 text-navy focus:ring-navy border-gray-300 rounded"
                                            />
                                            <label htmlFor={`check-${index}`} className="ml-2 block text-sm text-gray-700 cursor-pointer">
                                                {option}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Status <span className="text-red-500">*</span></label>
                                <select name="status" value={formData.status} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-navy focus:border-navy">
                                    <option value="Yes">Yes</option>
                                    <option value="No">No</option>
                                    <option value="Hold">Hold</option>
                                </select>
                            </div>
                            <div className="flex justify-end gap-3">
                                <button type="button" onClick={handleCloseModal} className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
                                <button type="submit" disabled={submitting} className="px-6 py-2 bg-navy text-white rounded-lg hover:bg-navy-dark transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed">
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

export default InductionOrTraining;
