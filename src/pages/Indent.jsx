import React, { useEffect, useState } from "react";
import { HistoryIcon, Plus, X, Search, Pencil, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import useAuthStore from "../store/authStore";

const Indent = () => {
  const user = useAuthStore((state) => state.user);

  const [showModal, setShowModal] = useState(false);
  const [editingIndent, setEditingIndent] = useState(null);
  const [posts, setPosts] = useState([{
    post: "",
    gender: "",
    priority: "",
    department: "",
    prefer: "",
    numberOfPost: "",
    // experience: "",
    salary: "",
    officeTiming: "",
    typeOfWeek: "",
    residence: "",
    indenterName: "",
    qualifications: "",
    location: "",
  }]);
  const [formData, setFormData] = useState({
    competitionDate: "",
  });
  const [indentData, setIndentData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [desigFilter, setDesigFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Dropdown options from Master sheet
  const [departments, setDepartments] = useState([]);
  const [indenterNames, setIndenterNames] = useState([]);
  const [timings, setTimings] = useState([]);

  // Social site options
  const socialSiteOptions = [
    "Instagram",
    "Facebook",
    "LinkedIn",
    "Referral",
    "Job Consultancy",
  ];

  const [globalFmsData, setGlobalFmsData] = useState([]);
  const [globalMasterData, setGlobalMasterData] = useState([]);
  const [storeLoading, setStoreLoading] = useState(true);

  const FETCH_URL = import.meta.env.VITE_GOOGLE_SHEET_URL;

  const fetchData = async () => {
    setStoreLoading(true);
    // 1. Force clear App Script cache for "FMS" and "Master" sheets by writing empty values to column Z
    try {
      await Promise.all([
        fetch(FETCH_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            sheetName: "FMS",
            action: "updateCell",
            rowIndex: "2",
            columnIndex: "26",
            value: "",
          }).toString(),
        }),
        fetch(FETCH_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            sheetName: "Master",
            action: "updateCell",
            rowIndex: "2",
            columnIndex: "26",
            value: "",
          }).toString(),
        })
      ]);
    } catch (cacheErr) {
      console.warn("Cache clearing request failed, proceeding anyway", cacheErr);
    }

    // 2. Fetch the fresh data with multiple cache-busting options
    try {
      const cb = `&_=${Date.now()}&realtime=1&cache=false&bypassCache=true`;
      const [fmsRes, masterRes] = await Promise.all([
        fetch(`${FETCH_URL}?sheet=FMS&action=fetch${cb}`).then(res => res.json()),
        fetch(`${FETCH_URL}?sheet=Master&action=fetch${cb}`).then(res => res.json())
      ]);

      if (fmsRes.success) setGlobalFmsData(fmsRes.data);
      if (masterRes.success) setGlobalMasterData(masterRes.data);

    } catch (error) {
      console.error("Indent Data Fetch Error:", error);
      toast.error("Failed to load data");
    } finally {
      setStoreLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const refreshData = async () => {
    setTableLoading(true);
    // 1. Force clear App Script cache for "FMS" sheet by writing Cell Z2 to empty value
    try {
      await fetch(FETCH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          sheetName: "FMS",
          action: "updateCell",
          rowIndex: "2",
          columnIndex: "26",
          value: "",
        }).toString(),
      });
    } catch (cacheErr) {
      console.warn("FMS cache clearing request failed, proceeding anyway", cacheErr);
    }

    // 2. Wait 3000ms to allow Google Sheets to complete recalculation/sync
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 3. Fetch the fresh data with multiple cache-busting options
    try {
      const cb = `&_=${Date.now()}&realtime=1&cache=false&bypassCache=true`;
      const fmsRes = await fetch(`${FETCH_URL}?sheet=FMS&action=fetch${cb}`).then(res => res.json());
      if (fmsRes.success) setGlobalFmsData(fmsRes.data);
    } catch (error) {
      console.error("Indent Data Fetch Error:", error);
      toast.error("Failed to load data");
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    setTableLoading(storeLoading);
  }, [storeLoading]);

  // Master Data Effect
  useEffect(() => {
    if (!globalMasterData || globalMasterData.length < 2) return;
    const data = globalMasterData;

    // Column A: Person Name (Indenter)
    const indenterNamesList = [...new Set(
      data.slice(1).map(row => row[0]).filter(val => val && val.trim())
    )];
    setIndenterNames(indenterNamesList);

    // Column B: Department
    const departmentsList = [...new Set(
      data.slice(1).map(row => row[1]).filter(val => val && val.trim())
    )];
    setDepartments(departmentsList);

    // Column C: Time
    const timingsList = [...new Set(
      data.slice(1).map(row => row[2]).filter(val => val && val.trim())
    )];
    setTimings(timingsList);

  }, [globalMasterData]);

  // FMS Data Effect (Indent Table)
  useEffect(() => {
    if (!globalFmsData || globalFmsData.length < 2) {
      setIndentData([]);
      return;
    }

    const resultData = globalFmsData;

    // Dynamically find header row
    let headerRowIndex = -1;
    for (let i = 0; i < resultData.length; i++) {
      const row = resultData[i];
      if (row && (row.includes("Position Status") || row.includes("Indent No"))) {
        headerRowIndex = i;
        break;
      }
    }

    if (headerRowIndex === -1) headerRowIndex = 6;

    const headers = resultData[headerRowIndex].map((h) => (h ? h.trim() : ""));
    const dataRows = resultData.slice(9);

    const getIndex = (name) => headers.findIndex(h => h.toLowerCase().includes(name.toLowerCase()));

    const statusIdx = getIndex("Position Status");
    const indentIdx = getIndex("Indent No");
    const nameIdx = getIndex("Person Name");
    const postIdx = getIndex("Post");
    const salaryIdx = getIndex("Salary");
    const timingIdx = getIndex("Office Timing");
    const weekOffIdx = getIndex("Weekly Off");
    const residenceIdx = getIndex("Residence");
    const genderIdx = getIndex("Gender");
    const deptIdx = getIndex("Department");
    const preferIdx = getIndex("Prefer");
    const noOfPostIdx = getIndex("Number Of Post");
    const dateIdx = getIndex("Completion Date");
    const qualIdx = getIndex("Qualifications");
    const locationIdx = getIndex("For Which Location");

    const processedData = dataRows
      .map((row, index) => ({ row, rowIndex: index + 10 }))
      .filter(({ row }) => row && (row[statusIdx] || row[indentIdx]))
      .map(({ row, rowIndex }) => ({
        rowIndex,
        status: (row[statusIdx] || "OPEN").toString(),
        indentNumber: (row[indentIdx] || "").toString(),
        indenterName: (row[nameIdx] || "").toString(),
        post: (row[postIdx] || "").toString(),
        salary: (row[salaryIdx] || "").toString(),
        officeTiming: (row[timingIdx] || "").toString(),
        typeOfWeek: (row[weekOffIdx] || "").toString(),
        residence: (row[residenceIdx] || "").toString(),
        gender: (row[genderIdx] || "").toString(),
        department: (row[deptIdx] || "").toString(),
        prefer: (row[preferIdx] || "").toString(),
        noOfPost: (row[noOfPostIdx] || "").toString(),
        completionDate: (row[dateIdx] || "").toString(),
        qualifications: (row[qualIdx] || "").toString(),
        location: (locationIdx !== -1 && row[locationIdx] ? row[locationIdx] : "").toString(),
      }))
      .filter(item => {
        const isRecruiter = user?.Admin?.trim().toLowerCase() === "recruiter";
        const userLocation = user?.Location?.trim().toLowerCase() || "";
        const isRestrictedPlantRecruiter = isRecruiter && userLocation === "plant";
        
        if (isRestrictedPlantRecruiter) {
          return item.location.toLowerCase() === "plant";
        }
        return true;
      })
      .reverse();

    setIndentData(processedData);

  }, [globalFmsData]);

  const getCurrentTimestamp = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  const handlePostInputChange = (index, e) => {
    const { name, value } = e.target;
    const updatedPosts = [...posts];
    updatedPosts[index] = { ...updatedPosts[index], [name]: value };
    setPosts(updatedPosts);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const addPostField = () => {
    setPosts([...posts, {
      post: "",
      gender: "",
      priority: "",
      department: "",
      prefer: "",
      numberOfPost: "",
      experience: "",
      salary: "",
      officeTiming: "",
      typeOfWeek: "",
      residence: "",
      indenterName: "",
      qualifications: "",
      location: "",
    }]);
  };

  const removePostField = (index) => {
    if (posts.length > 1) {
      setPosts(posts.filter((_, i) => i !== index));
    }
  };

  const handleEdit = (indent) => {
    setEditingIndent(indent);
    setPosts([{
      post: indent.post,
      gender: indent.gender,
      priority: "", 
      department: indent.department,
      prefer: indent.prefer,
      numberOfPost: indent.noOfPost,
      salary: indent.salary,
      officeTiming: indent.officeTiming,
      typeOfWeek: indent.typeOfWeek,
      residence: indent.residence,
      indenterName: indent.indenterName,
      qualifications: indent.qualifications,
      location: indent.location || "",
    }]);
    
    let parsedDate = "";
    if (indent.completionDate) {
      if (indent.completionDate.includes('/')) {
         const parts = indent.completionDate.split('/');
         if (parts.length === 3) {
            const p1 = parseInt(parts[0], 10);
            const p2 = parseInt(parts[1], 10);
            if (p2 > 12) {
               parsedDate = `${parts[2]}-${parts[0].padStart(2,'0')}-${parts[1].padStart(2,'0')}`;
            } else {
               parsedDate = `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
            }
         }
      } else if (indent.completionDate.includes('-')) {
         parsedDate = indent.completionDate;
      }
    }
    setFormData({ competitionDate: parsedDate });
    setShowModal(true);
  };

  const handleDelete = async (indent) => {
    if (!window.confirm(`Are you sure you want to delete indent ${indent.indentNumber}?`)) {
      return;
    }
    
    try {
      setTableLoading(true);
      
      const fetchRes = await fetch(`${import.meta.env.VITE_GOOGLE_SHEET_URL}?sheet=Position Opning Form&action=fetch&_=${Date.now()}`);
      const fetchData = await fetchRes.json();
      if (!fetchData.success || !fetchData.data) throw new Error("Could not connect to database");

      const index = fetchData.data.findIndex(row => row[1] === indent.indentNumber);
      if (index === -1) throw new Error("Indent not found in database");
      const realRowIndex = index + 1;
      
      const response = await fetch(import.meta.env.VITE_GOOGLE_SHEET_URL, {
        method: 'POST',
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          sheetName: "Position Opning Form",
          action: 'delete',
          rowIndex: realRowIndex,
        }).toString(),
      });
      
      const result = await response.json();
      
      if (result.success || result.status === 'success' || (result.message && result.message.toLowerCase().includes('success'))) {
        toast.success('Indent deleted successfully!');
        setIndentData(prev => prev.filter(l => l.indentNumber !== indent.indentNumber));
        await refreshData();
      } else {
        toast.error('Failed to delete: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Something went wrong!');
    } finally {
      setTableLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.competitionDate) {
      toast.error("Please fill the competition date");
      return;
    }

    // Validate all posts
    for (let i = 0; i < posts.length; i++) {
      const p = posts[i];
      if (!p.post || !p.gender || !p.numberOfPost) {
        toast.error(`Please fill all required fields for Post #${i + 1}`);
        return;
      }

    }

    try {
      setSubmitting(true);

      const formattedDate = formatDateForSheet(formData.competitionDate);

      if (editingIndent) {
        const fetchRes = await fetch(`${import.meta.env.VITE_GOOGLE_SHEET_URL}?sheet=Position Opning Form&action=fetch&_=${Date.now()}`);
        const fetchData = await fetchRes.json();
        if (!fetchData.success || !fetchData.data) throw new Error("Could not connect to database");

        const index = fetchData.data.findIndex(row => row[1] === editingIndent.indentNumber);
        if (index === -1) throw new Error("Indent not found for editing");
        const realRowIndex = index + 1;

        const p = posts[0];
        const updates = [
          { columnIndex: 3, value: p.indenterName || "" },
          { columnIndex: 4, value: p.post || "" },
          { columnIndex: 5, value: p.salary || "" },
          { columnIndex: 6, value: p.officeTiming || "" },
          { columnIndex: 7, value: p.typeOfWeek || "" },
          { columnIndex: 8, value: p.residence || "" },
          { columnIndex: 9, value: p.gender || "" },
          { columnIndex: 10, value: p.department || "" },
          { columnIndex: 11, value: p.prefer || "" },
          { columnIndex: 12, value: p.numberOfPost || "" },
          { columnIndex: 13, value: formattedDate },
          { columnIndex: 14, value: p.qualifications || "" },
          { columnIndex: 15, value: p.location || "" },
          { columnIndex: 16, value: p.priority || "" },
        ];

        const results = await Promise.all(updates.map((update) =>
          fetch(import.meta.env.VITE_GOOGLE_SHEET_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              sheetName: "Position Opning Form",
              action: "updateCell",
              rowIndex: realRowIndex,
              columnIndex: update.columnIndex,
              value: update.value
            }).toString(),
          }).then((res) => res.json())
        ));

        if (results.every((result) => result.success)) {
          toast.success("Indent updated successfully!");
          const p = posts[0];
          setIndentData((prev) =>
            prev.map((item) => {
              if (item.indentNumber === editingIndent.indentNumber) {
                return {
                  ...item,
                  indenterName: p.indenterName || "",
                  post: p.post || "",
                  salary: p.salary || "",
                  officeTiming: p.officeTiming || "",
                  typeOfWeek: p.typeOfWeek || "",
                  residence: p.residence || "",
                  gender: p.gender || "",
                  department: p.department || "",
                  prefer: p.prefer || "",
                  noOfPost: p.numberOfPost || "",
                  completionDate: formattedDate,
                  qualifications: p.qualifications || "",
                  location: p.location || "",
                  priority: p.priority || "",
                };
              }
              return item;
            })
          );
          handleCancel();
          await refreshData();
        } else {
          toast.error("Failed to update some fields");
        }
      } else {

      const now = new Date();
      const timestamp = getCurrentTimestamp();

      // --- FINAL SYNCHRONIZED MAPPING (A to P) ---
      const rowsData = posts.map((p, idx) => {
        const row = [
          timestamp,                  // A (0): Timestamp
          "",                         // B (1): Indent No (Backend will fill this)
          p.indenterName || "",       // C (2): Person Name (Indenter)
          p.post || "",               // D (3): Post
          p.salary || "",             // E (4): Salary
          p.officeTiming || "",       // F (5): Office Timing
          p.typeOfWeek || "",         // G (6): Types of Weekly Off
          p.residence || "",          // H (7): Residence
          p.gender || "",             // I (8): Gender
          p.department || "",         // J (9): Department
          p.prefer || "",             // K (10): Prefer
          p.numberOfPost || "",       // L (11): Number of Post
          formattedDate,              // M (12): Completion Date
          p.qualifications || "",      // N (13): Required Qualifications
        ];

        row.push(p.location || "");   // O (14): For Which Location
        row.push(p.priority || "");   // P (15): Priority

        console.log(`Post #${idx + 1} finalized row:`, row);
        return row;
      });


      console.log("rowsData", rowsData)

      console.log("--- FINAL SUBMISSION DEBUG (v2.1) ---");
      console.table(rowsData);

      const response = await fetch(
        import.meta.env.VITE_GOOGLE_SHEET_URL,
        {
          method: "POST",
          body: new URLSearchParams({
            sheetName: "Position Opning Form",
            action: "bulkInsert",
            rowsData: JSON.stringify(rowsData),
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        toast.success(`Successfully created ${posts.length} indents!`);
        setPosts([{
          post: "",
          gender: "",
          priority: "",
          department: "",
          prefer: "",
          numberOfPost: "",
          experience: "",
          salary: "",
          officeTiming: "",
          typeOfWeek: "",
          residence: "",
          indenterName: "",
          qualifications: "",
        }]);
        setFormData({ competitionDate: "" });
        setShowModal(false);
        await refreshData();
      } else {
        toast.error("Failed to insert: " + (result.error || "Unknown error"));
      }
      }
    } catch (error) {
      console.error("Insert error:", error);
      toast.error("Something went wrong!");
    } finally {
      setSubmitting(false);
    }
  };

  // Helper function to format date for Google Sheets
  const formatDateForSheet = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear();
    return `${year}-${month}-${day}`;
  };

  const handleCancel = () => {
    setPosts([{
      indenterName: "",
      post: "",
      gender: "",
      priority: "",
      department: "",
      prefer: "",
      numberOfPost: "",
      experience: "",
      salary: "",
      officeTiming: "",
      typeOfWeek: "",
      residence: "",
      qualifications: "",
      location: "",
    }]);
    setFormData({
      competitionDate: "",
    });
    setEditingIndent(null);
    setShowModal(false);
  };

  return (
    <div className="space-y-6 page-content p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          Indent
          <span className="text-sm font-medium text-white bg-navy px-2.5 py-0.5 rounded-full">
            {indentData.filter(item => {
              const matchesSearch = Object.values(item).some(val =>
                val.toString().toLowerCase().includes(searchTerm.toLowerCase())
              );
              const matchesDept = !deptFilter || item.department === deptFilter;
              const matchesDesig = !desigFilter || item.post === desigFilter;
              const matchesStatus = !statusFilter || item.status === statusFilter;
              return matchesSearch && matchesDept && matchesDesig && matchesStatus;
            }).length}
          </span>
        </h1>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search indents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-navy focus:border-navy text-sm w-64"
            />
          </div>
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-navy focus:border-navy text-sm"
          >
            <option value="">All Departments</option>
            {[...new Set(indentData.map(item => item.department))].filter(Boolean).sort().map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
          <select
            value={desigFilter}
            onChange={(e) => setDesigFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-navy focus:border-navy text-sm"
          >
            <option value="">All Posts</option>
            {[...new Set(indentData.map(item => item.post))].filter(Boolean).sort().map(post => (
              <option key={post} value={post}>{post}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-navy focus:border-navy text-sm"
          >
            <option value="">All Statuses</option>
            {[...new Set(indentData.map(item => item.status))].filter(Boolean).sort().map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-navy hover:bg-navy-dark transition-all duration-200"
            disabled={loading}
          >
            {loading ? (
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
                Loading...
              </>
            ) : (
              <>
                <Plus size={16} className="mr-2" />
                Create Indent
              </>
            )}
          </button>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 modal-backdrop z-50 flex items-start justify-center overflow-y-auto p-4 pb-28 pt-10">
          <div className="flex w-full max-w-6xl max-h-[82vh] flex-col overflow-hidden rounded-lg bg-white shadow-lg">
            <div className="flex shrink-0 justify-between items-center p-5 border-b border-gray-200 bg-white z-20">
              <h3 className="text-lg font-medium text-gray-800">
                {editingIndent ? 'Edit Indent' : 'Create Multiple Indents'}
              </h3>
              <button
                onClick={handleCancel}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
              <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 mb-4 max-w-sm">
                <label className="block text-sm font-semibold text-indigo-900 mb-1">
                  Common Completion Date *
                </label>
                <input
                  type="date"
                  name="competitionDate"
                  value={formData.competitionDate}
                  onChange={handleInputChange}
                  className="w-full border border-indigo-200 rounded-md px-3 py-2 focus:ring-2 focus:ring-navy"
                  required
                />
              </div>

              {posts.map((postField, index) => (
                <div key={index} className="p-3 border border-gray-200 rounded-lg space-y-3 relative bg-gray-50/50">
                  <div className="flex justify-between items-center bg-gray-100 p-2 -mx-3 -mt-3 rounded-t-lg border-b border-gray-200">
                    <span className="text-xs font-bold text-gray-600 uppercase tracking-wider ml-2">Post #{index + 1}</span>
                    {posts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePostField(index)}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="Remove Post"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4 mt-2 md:grid-cols-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Post (पद)*
                      </label>
                      <input
                        type="text"
                        name="post"
                        value={postField.post}
                        onChange={(e) => handlePostInputChange(index, e)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy text-sm"
                        placeholder="Enter post title"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:contents">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Gender *
                        </label>
                        <select
                          name="gender"
                          value={postField.gender}
                          onChange={(e) => handlePostInputChange(index, e)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-navy text-sm"
                          required
                        >
                          <option value="">Select</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Any">Any</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Priority
                        </label>
                        <select
                          name="priority"
                          value={postField.priority}
                          onChange={(e) => handlePostInputChange(index, e)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-navy text-sm"
                        >
                          <option value="">Select</option>
                          <option value="High">High</option>
                          <option value="Medium">Medium</option>
                          <option value="Low">Low</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          No. of Post *
                        </label>
                        <input
                          type="number"
                          name="numberOfPost"
                          value={postField.numberOfPost}
                          onChange={(e) => handlePostInputChange(index, e)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-navy text-sm"
                          min="1"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:contents">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Department
                        </label>
                        <select
                          name="department"
                          value={postField.department}
                          onChange={(e) => handlePostInputChange(index, e)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-navy text-sm"
                        >
                          <option value="">Select</option>
                          {departments.map((dept, idx) => (
                            <option key={idx} value={dept}>{dept}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Prefer
                        </label>
                        <select
                          name="prefer"
                          value={postField.prefer}
                          onChange={(e) => handlePostInputChange(index, e)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-navy text-sm"
                        >
                          <option value="">Any</option>
                          <option value="Experience">Experience</option>
                          <option value="Fresher">Fresher</option>
                        </select>
                      </div>
                    </div>



                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:contents">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Salary
                        </label>
                        <input
                          type="text"
                          name="salary"
                          value={postField.salary}
                          onChange={(e) => handlePostInputChange(index, e)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                          placeholder="Salary"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Qualifications
                        </label>
                        <input
                          type="text"
                          name="qualifications"
                          value={postField.qualifications}
                          onChange={(e) => handlePostInputChange(index, e)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                          placeholder="e.g. Graduate"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:contents">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Weekly Off
                        </label>
                        <select
                          name="typeOfWeek"
                          value={postField.typeOfWeek}
                          onChange={(e) => handlePostInputChange(index, e)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        >
                          <option value="">Select</option>
                          <option value="Week off">Week off</option>
                          <option value="No week off">No week off</option>
                          <option value="Both">Both</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Residence
                        </label>
                        <select
                          name="residence"
                          value={postField.residence}
                          onChange={(e) => handlePostInputChange(index, e)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        >
                          <option value="">Select</option>
                          <option value="Stay">Stay</option>
                          <option value="Up-down">Up-down</option>
                          <option value="Both">Both</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:contents">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Office Timing
                        </label>
                        <select
                          name="officeTiming"
                          value={postField.officeTiming}
                          onChange={(e) => handlePostInputChange(index, e)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        >
                          <option value="">Select</option>
                          {timings.map((timing, idx) => (
                            <option key={idx} value={timing}>{timing}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Person Name (Indenter)
                        </label>
                        <select
                          name="indenterName"
                          value={postField.indenterName}
                          onChange={(e) => handlePostInputChange(index, e)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        >
                          <option value="">Select</option>
                          {indenterNames.map((name, idx) => (
                            <option key={idx} value={name}>{name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:contents">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Location
                        </label>
                        <select
                          name="location"
                          value={postField.location}
                          onChange={(e) => handlePostInputChange(index, e)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        >
                          <option value="">Select</option>
                          <option value="Shankar Nagar">Shankar Nagar</option>
                          <option value="Plant">Plant</option>
                          <option value="Shyam Plaza">Shyam Plaza</option>
                          <option value="Home">Home</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {!editingIndent && (
              <button
                type="button"
                onClick={addPostField}
                className="w-full py-2 border-2 border-dashed border-indigo-300 text-navy rounded-lg hover:bg-indigo-50 transition-all flex items-center justify-center font-medium"
              >
                <Plus size={16} className="mr-2" />
                Add Another Post entry
              </button>
              )}
              </div>

              <div className="flex shrink-0 justify-end space-x-2 border-t border-gray-200 bg-white p-4">
                <button
                  type="button"
                  onClick={handleCancel}
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
                      Processing...
                    </>
                  ) : editingIndent ? (
                    "Update"
                  ) : (
                    "Submit"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}




      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          {/* Add max-height and overflow-y to the table container */}
          <div className="overflow-x-auto table-container">
            <table className="min-w-full divide-y divide-gray-200 shadow">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>

                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Indent Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Person Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Post
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Salary
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Weekly Off
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Residence
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    No. of Post
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Completion Date
                  </th>
                  <th className="px-4 py-2 text-sm font-medium text-gray5500 max-w-[880px] whitespace-normal break-words">
                    Qualification                   </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>

                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {tableLoading ? (
                  <tr>
                    <td colSpan="15" className="px-6 py-12 text-center">
                      <div className="flex justify-center flex-col items-center">
                        <div className="w-6 h-6 border-4 border-blue-500 border-dashed rounded-full animate-spin mb-2"></div>
                        <span className="text-gray-600 text-sm">
                          Loading indent data...
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : indentData.length === 0 ? (
                  <tr>
                    <td colSpan="15" className="px-6 py-12 text-center">
                      <p className="text-gray-500">No indent data found.</p>
                    </td>
                  </tr>
                ) : (
                  indentData
                    .filter(item => {
                      const matchesSearch = Object.values(item).some(val =>
                        val.toString().toLowerCase().includes(searchTerm.toLowerCase())
                      );
                      const matchesDept = !deptFilter || item.department === deptFilter;
                      const matchesDesig = !desigFilter || item.post === desigFilter;
                      const matchesStatus = !statusFilter || item.status === statusFilter;
                      return matchesSearch && matchesDept && matchesDesig && matchesStatus;
                    })
                    .map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">

                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${item.status?.toLowerCase() === 'open' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.location}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-navy">
                          {item.indentNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.indenterName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.post}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.salary}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.typeOfWeek}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.residence}
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.noOfPost}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.completionDate}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-500 max-w-[180px] whitespace-normal break-words">
                          {item.qualifications}                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleEdit(item)}
                            className="text-indigo-600 hover:text-indigo-900 mr-3 p-1 rounded-full hover:bg-indigo-50 transition-colors"
                            title="Edit"
                          >
                            <Pencil size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-50 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>

                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div >
  );
};

export default Indent;
