import React, { useEffect, useState } from 'react';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
  PieChart,
  Pie
} from 'recharts';
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  UserPlus,
  TrendingUp,
  FileText,
  Calendar,
  CheckCircle
} from 'lucide-react';

const Dashboard = () => {
  const [totalEmployee, setTotalEmployee] = useState(0);
  const [activeEmployee, setActiveEmployee] = useState(0);
  const [leftEmployee, setLeftEmployee] = useState(0);
  const [leaveThisMonth, setLeaveThisMonth] = useState(0);
  const [openCount, setOpenCount] = useState(0);
  const [closeCount, setCloseCount] = useState(0);
  const [monthlyHiringData, setMonthlyHiringData] = useState([]);
  const [designationData, setDesignationData] = useState([]);
  const [leaveStatusData, setLeaveStatusData] = useState([]);
  const [leaveTypeData, setLeaveTypeData] = useState([]);
  const [departmentData, setDepartmentData] = useState([]);



  const [indentData, setIndentData] = useState([]);
  const [filterStatus, setFilterStatus] = useState("All");

  const [tableLoading, setTableLoading] = useState(false);

  // Parse DD/MM/YYYY format date
  const parseSheetDate = (dateStr) => {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    return new Date(year, month, day);
  };

  const [globalFmsData, setGlobalFmsData] = useState([]);
  const [joiningEntryData, setJoiningEntryData] = useState([]);
  const [candidateSelectionData, setCandidateSelectionData] = useState([]); // Unused but kept for compatibility
  const [globalLeavingData, setGlobalLeavingData] = useState([]); // Unused/Empty in store
  const [leaveManagementData, setLeaveManagementData] = useState([]); // Unused? Handled in effect
  const [storeLoading, setStoreLoading] = useState(true);

  // API URLs
  const FETCH_URL = import.meta.env.VITE_GOOGLE_SHEET_URL;
  const JOINING_SUBMIT_URL = "https://script.google.com/macros/s/AKfycbwhFgVoAB4S1cKrU0iDRtCH5B2K-ol2c0RmaaEWXGqv0bdMzs3cs3kPuqOfUAR3KHYZ7g/exec";

  useEffect(() => {
    const fetchDashboardData = async () => {
      setStoreLoading(true);
      try {
        const cb = `&_=${Date.now()}`;

        // Parallel Fetch
        const [fmsRes, joiningEntryRes, leaveManageRes] = await Promise.all([
          fetch(`${FETCH_URL}?sheet=FMS&action=fetch${cb}`).then(res => res.json()),
          fetch(`${JOINING_SUBMIT_URL}?action=read&sheet=JOINING ENTRY FORM${cb}`).then(res => res.json()),
          // Attempt to fetch Leave Management if it exists
          // Using a generic fetch for potential Leave data if needed, but for now focusing on what was in store
          Promise.resolve({ data: [] })
        ]);

        if (fmsRes.success) setGlobalFmsData(fmsRes.data);
        if (joiningEntryRes.success) setJoiningEntryData(joiningEntryRes.data);
        // setLeaveManagementData(leaveManageRes.data || []);

      } catch (error) {
        console.error("Dashboard Data Fetch Error:", error);
      } finally {
        setStoreLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  useEffect(() => {
    setTableLoading(storeLoading);
  }, [storeLoading]);

  // Handle Leave Management Data
  useEffect(() => {
    if (!leaveManagementData || leaveManagementData.length < 2) return;
    const headers = leaveManagementData[0];
    const dataRows = leaveManagementData.slice(1);

    const statusIndex = headers.findIndex(h => h && h.toString().trim().toLowerCase().includes("status"));
    const leaveTypeIndex = headers.findIndex(h => h && h.toString().trim().toLowerCase().includes("leave type"));

    const statusCounts = {};
    const typeCounts = {};

    dataRows.forEach(row => {
      const s = row[statusIndex]?.toString().trim() || 'Unknown';
      statusCounts[s] = (statusCounts[s] || 0) + 1;

      const t = row[leaveTypeIndex]?.toString().trim() || 'Unknown';
      typeCounts[t] = (typeCounts[t] || 0) + 1;
    });

    setLeaveStatusData(Object.keys(statusCounts).map(k => ({ status: k, count: statusCounts[k] })));
    setLeaveTypeData(Object.keys(typeCounts).map(k => ({ type: k, count: typeCounts[k] })));
  }, [leaveManagementData]);

  // Handle FMS Data (Total Indents + Indent Table)
  useEffect(() => {
    if (!globalFmsData || globalFmsData.length < 10) {
      setTotalEmployee(0);
      setIndentData([]);
      return;
    }

    // 1. Total Indents
    const validRows = globalFmsData.slice(1).filter(row => row[1] && row[1].toString().trim() !== "");
    setTotalEmployee(validRows.length);

    const open = validRows.filter(row => (row[1] || "").toString().trim().toLowerCase() === "open").length;
    const close = validRows.filter(row => {
      const s = (row[1] || "").toString().trim().toLowerCase();
      return s === "close" || s === "closed";
    }).length;
    setOpenCount(open);
    setCloseCount(close);

    // 2. Indent Table Data
    // Find Header Row (Keep dynamic logic to find valid Indices for display columns)
    let headerRowIndex = -1;
    for (let i = 0; i < globalFmsData.length; i++) {
      const row = globalFmsData[i];
      if (row && (row.includes("Position Status") || row.includes("Indent No"))) {
        headerRowIndex = i;
        break;
      }
    }
    if (headerRowIndex === -1) headerRowIndex = 6;

    const headers = globalFmsData[headerRowIndex].map(h => h ? h.trim() : "");

    // SLICE 9 Logic as requested (Data starts from Row 10)
    // We use the whole array for indices, but slice for data processing
    const dataRows = globalFmsData.slice(9);

    const findIdx = (names) => headers.findIndex(h => names.some(n => h.toLowerCase().includes(n.toLowerCase())));

    const timestampIndex = findIdx(["Timestamp"]);
    const indentNumberIndex = findIdx(["Indent No", "Indent Number"]);
    const postIndex = findIdx(["Post"]);
    const genderIndex = findIdx(["Gender"]);
    const departmentIndex = findIdx(["Department"]);
    const preferIndex = findIdx(["Prefer"]);
    const noOFPostIndex = findIdx(["Number Of Post"]);
    const completionDateIndex = findIdx(["Completion Date"]);
    const experienceIndex = findIdx(["Experience"]);
    const salaryIndex = findIdx(["Salary"]);
    const officeTimingIndex = findIdx(["Office Timing", "Timing"]);
    const typeOfWeekIndex = findIdx(["Type Of Week", "Weekly Off"]);
    const residenceIndex = findIdx(["Residence"]);
    const indenterNameIndex = findIdx(["Indenter Name", "Person Name"]);
    const statusIndex = findIdx(["Position Status", "Status"]); // For display
    const TotalJoiningIndex = findIdx(["Total Joining"]);

    const processed = dataRows.map(row => ({
      timestamp: row[timestampIndex],
      indentNumber: row[indentNumberIndex],
      post: row[postIndex],
      gender: row[genderIndex],
      department: row[departmentIndex],
      prefer: row[preferIndex],
      noOfPost: row[noOFPostIndex],
      completionDate: row[completionDateIndex],
      experience: row[experienceIndex],
      salary: row[salaryIndex],
      officeTiming: row[officeTimingIndex],
      typeOfWeek: row[typeOfWeekIndex],
      residence: row[residenceIndex],
      indenterName: row[indenterNameIndex],
      status: row[statusIndex],
      totaljoining: row[TotalJoiningIndex],
      // Filter Source: Column B (Index 1)
      filterKey: row[1]
    }));

    // Filter based on filterStatus state ("Open", "Close", or "All")
    // Column B (Index 1) check
    const filteredIndents = processed.filter(item => {
      const itemStatus = (item.filterKey || "").toString().trim().toLowerCase();
      if (filterStatus === "All") {
        return true;
      }

      const filterLower = filterStatus.toLowerCase();

      // Handle "Close" matching "Closed" or "Close"
      if (filterLower === "close") {
        return itemStatus === "close" || itemStatus === "closed";
      }

      return itemStatus === filterLower;
    });

    const finalData = filteredIndents.map(item => {
      const noOfPost = parseInt(item.noOfPost) || 0;
      const totalJoining = parseInt(item.totaljoining) || 0;
      return {
        ...item,
        pendingJoining: Math.max(0, noOfPost - totalJoining)
      };
    });
    setIndentData(finalData);

  }, [globalFmsData, filterStatus]);

  // Handle Joining Entry Data (Active Count, Monthly Hiring, Department Data)
  useEffect(() => {
    if (!joiningEntryData || joiningEntryData.length < 6) {
      setActiveEmployee(0);
      setDepartmentData([]);
      return;
    }

    const headers = joiningEntryData[5] || [];
    const dataRows = joiningEntryData.length > 6 ? joiningEntryData.slice(6) : [];

    // Indices
    const statusIndex = headers.findIndex(h => h && h.toString().trim().toLowerCase() === "status");
    const dateOfJoiningIndex = headers.findIndex(h => h && h.toString().trim().toLowerCase().includes("date of joining"));
    const designationIndex = headers.findIndex(h => h && h.toString().trim().toLowerCase() === "designation");
    // Department is column U (index 20) hardcoded in original
    const departmentIndex = 20;

    // Active Employees
    let activeCount = 0;
    if (statusIndex !== -1) {
      activeCount = dataRows.filter(row => row[statusIndex]?.toString().trim().toLowerCase() === "active").length;
    }
    setActiveEmployee(activeCount); // Wait, original code set activeEmployee to dataRows.length but returned activeCount separately? 
    // Original: setActiveEmployee(dataRows.length); 
    // Wait, let me check original code fetchJoiningCount:
    // "let activeCount = 0 ... if (statusIndex !== -1) activeCount = ..."
    // "setActiveEmployee(dataRows.length);"  <-- It sets activeEmployee to TOTAL. 
    // "return { total: dataRows.length, active: activeCount ... }"
    // "setTotalEmployee(fmsTotalIndents);" -> Wait, Total Indents in stats is set from FMS. 
    // "Active Employees" title in stat card uses matches "activeEmployee" state. 
    // So "Active employees" stat shows TOTAL rows in Joining sheet? That seems wrong but that's what the code did.
    // "setTotalEmployee(fmsTotalIndents)" -> in `fetchData`.
    // The stat card says "Active Employees" -> {activeEmployee}.
    // If original code `setActiveEmployee(dataRows.length)`, then it displays count of all joined.
    // I should replicate exactly.
    setActiveEmployee(dataRows.length); // Replicating logic.

    // Monthly Hiring
    const monthlyHiring = {};
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentDate = new Date();
    // Initialize
    for (let i = 5; i >= 0; i--) {
      const monthIndex = (currentDate.getMonth() - i + 12) % 12;
      const monthYear = `${months[monthIndex]} ${currentDate.getFullYear()}`;
      monthlyHiring[monthYear] = { hired: 0 };
    }

    if (dateOfJoiningIndex !== -1) {
      dataRows.forEach(row => {
        const dateStr = row[dateOfJoiningIndex];
        if (dateStr) {
          const date = parseSheetDate(dateStr);
          if (date) {
            const monthYear = `${months[date.getMonth()]} ${date.getFullYear()}`;
            if (monthlyHiring[monthYear]) monthlyHiring[monthYear].hired += 1;
            else monthlyHiring[monthYear] = { hired: 1 };
          }
        }
      });
    }

    // Department Data
    const departmentCounts = {};
    dataRows.forEach(row => {
      const d = row[departmentIndex]?.toString().trim();
      if (d) departmentCounts[d] = (departmentCounts[d] || 0) + 1;
    });
    setDepartmentData(Object.keys(departmentCounts).map(k => ({ department: k, employees: departmentCounts[k] })));

    // Store monthly hiring for combination later
    setMonthlyHiringState(monthlyHiring);

  }, [joiningEntryData]);

  // Handle Designation Data (Direct Fetch from JOINING_FMS)
  useEffect(() => {
    const fetchDesignationData = async () => {
      try {
        const url = `${import.meta.env.VITE_JOINING_SHEET_URL}?action=read&sheet=JOINING_FMS`;
        const response = await fetch(url);
        const data = await response.json();
        const rows = data.data;

        if (!rows || rows.length < 2) {
          setDesignationData([]);
          return;
        }

        const designationCounts = {};
        // Start from index 1 (skip header)
        rows.slice(1).forEach(row => {
          // Filter: Column BM (Index 64) - Don't show if "Yes"
          const colBM = (row[64] || "").toString().trim().toLowerCase();
          if (colBM === "yes") return;

          // Designation: Column O (Index 14)
          const designation = (row[14] || "").toString().trim();
          if (designation) {
            designationCounts[designation] = (designationCounts[designation] || 0) + 1;
          }
        });

        setDesignationData(Object.keys(designationCounts).map(k => ({
          designation: k,
          employees: designationCounts[k]
        })));

      } catch (error) {
        console.error("Error fetching designation data:", error);
      }
    };

    fetchDesignationData();
  }, []);

  // Handle Leaving Data
  useEffect(() => {
    if (!globalLeavingData || globalLeavingData.length < 6) {
      setLeftEmployee(0);
      setLeaveThisMonth(0);
      return;
    }
    const rawData = globalLeavingData;
    const dataRows = rawData.slice(6); // Row 7 onwards

    // Left This Month (Column D / Index 3)
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const thisMonthCount = dataRows.filter(row => {
      const dateStr = row[3];
      if (dateStr) {
        const d = parseSheetDate(dateStr);
        return d && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      }
      return false;
    }).length;

    setLeftEmployee(dataRows.length);
    setLeaveThisMonth(thisMonthCount);

    // Monthly Leaving
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyLeaving = {};
    for (let i = 5; i >= 0; i--) {
      const monthIndex = (now.getMonth() - i + 12) % 12;
      const monthYear = `${months[monthIndex]} ${now.getFullYear()}`;
      monthlyLeaving[monthYear] = { left: 0 };
    }

    dataRows.forEach(row => {
      const dateStr = row[3];
      if (dateStr) {
        const d = parseSheetDate(dateStr);
        if (d) {
          const my = `${months[d.getMonth()]} ${d.getFullYear()}`;
          if (monthlyLeaving[my]) monthlyLeaving[my].left += 1;
          else monthlyLeaving[my] = { left: 1 };
        }
      }
    });

    setMonthlyLeavingState(monthlyLeaving);

  }, [globalLeavingData]);

  const [monthlyHiringState, setMonthlyHiringState] = useState({});
  const [monthlyLeavingState, setMonthlyLeavingState] = useState({});

  useEffect(() => {
    if (Object.keys(monthlyHiringState).length > 0 && Object.keys(monthlyLeavingState).length > 0) {
      setMonthlyHiringData(prepareMonthlyHiringData(monthlyHiringState, monthlyLeavingState));
    } else if (Object.keys(monthlyHiringState).length > 0) {
      // If only hiring data, show it with 0 left
      setMonthlyHiringData(prepareMonthlyHiringData(monthlyHiringState, {}));
    }
  }, [monthlyHiringState, monthlyLeavingState]);




  // Helper to prepare monthly hiring data for chart
  const prepareMonthlyHiringData = (hiring, leaving) => {
    const allMonths = Array.from(new Set([...Object.keys(hiring), ...Object.keys(leaving)]));
    return allMonths.map(month => ({
      month,
      hired: hiring[month]?.hired || 0,
      left: leaving[month]?.left || 0
    })).sort((a, b) => {
      // Very basic sort by date string if possible, or leave as is if already ordered
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const [mA, yA] = a.month.split(' ');
      const [mB, yB] = b.month.split(' ');
      if (yA !== yB) return yA - yB;
      return months.indexOf(mA) - months.indexOf(mB);
    });
  };

  // Helper to get color based on status
  const getStatusColor = (status) => {
    const s = (status || "").toLowerCase();
    if (s.includes("pending")) return "#F59E0B";
    if (s.includes("approve")) return "#10B981";
    if (s.includes("reject")) return "#EF4444";
    return "#6B7280";
  };

  return (
    <div className="space-y-6 page-content p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">HR Dashboard</h1>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-lg border p-6 flex items-start">
          <div className="p-3 rounded-full bg-blue-100 mr-4">
            <Users size={24} className="text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-600 font-medium">Total Indents</p>
            <h3 className="text-2xl font-bold text-gray-800">{totalEmployee}</h3>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border p-6 flex items-start">
          <div className="p-3 rounded-full bg-green-100 mr-4">
            <UserCheck size={24} className="text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-600 font-medium">Active Employees</p>
            <h3 className="text-2xl font-bold text-gray-800">{activeEmployee}</h3>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border p-6 flex items-start">
          <div className="p-3 rounded-full bg-red-100 mr-4">
            <Clock size={24} className="text-red-600" />
          </div>
          <div>
            <p className="text-sm text-gray-600 font-medium">Total Open</p>
            <h3 className="text-2xl font-bold text-gray-800">{openCount}</h3>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border p-6 flex items-start">
          <div className="p-3 rounded-full bg-green-100 mr-4">
            <CheckCircle size={24} className="text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-600 font-medium">Total Close</p>
            <h3 className="text-2xl font-bold text-gray-800">{closeCount}</h3>
          </div>
        </div>
      </div>

      {/* New Charts */}

      {/* <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-lg border p-6 col-span-2">
          <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center">
            <Users size={20} className="mr-2" />
            Department-wise Employee Count
          </h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                <XAxis dataKey="department" stroke="#374151" />
                <YAxis stroke="#374151" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    color: '#374151'
                  }}
                />
                <Bar dataKey="employees" name="Employees">
                  {departmentData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index % 3 === 0 ? '#EF4444' : index % 3 === 1 ? '#10B981' : '#312e81'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div> */}

      {/* reporting table */}
      <div className="flex flex-col md:flex-row justify-between items-center mt-8 mb-4">
        <h2 className="text-lg font-bold text-gray-800 flex items-center">
          <FileText size={20} className="mr-2" />
          Reporting Table
        </h2>
        <div className="relative">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="appearance-none bg-white border border-gray-300 text-gray-700 py-2 px-4 pr-8 rounded leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
          >
            <option value="All">All</option>
            <option value="Open">Open</option>
            <option value="Close">Close</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        {/* Add max-height and overflow-y to the table container */}
        <div className="max-h-[calc(100vh-300px)] overflow-y-auto table-container">
          <table className="min-w-full divide-y divide-gray-200 shadow">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Indent Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Post
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Indenter Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Join
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Enquiry
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pending Joining
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {tableLoading ? (
                <tr>
                  <td colSpan="12" className="px-6 py-12 text-center">
                    <div className="flex justify-center flex-col items-center">
                      <div className="w-6 h-6 border-4 border-navy border-dashed rounded-full animate-spin mb-2"></div>
                      <span className="text-gray-600 text-sm">
                        Loading indent data...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : indentData.length === 0 ? (
                <tr>
                  <td colSpan="12" className="px-6 py-12 text-center">
                    <p className="text-gray-500">No indent data found.</p>
                  </td>
                </tr>
              ) : (
                indentData.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${(item.filterKey || "").toString().toLowerCase().includes("close")
                        ? "bg-green-100 text-green-800"
                        : (item.filterKey || "").toString().toLowerCase().includes("open")
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-800"
                        }`}>
                        {item.filterKey}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.indentNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.post}
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
                      <div className="text-sm text-gray-900 break-words">
                        {item.completionDate
                          ? (() => {
                            const date = new Date(item.completionDate);
                            if (!date || isNaN(date.getTime())) return "Invalid date";
                            return date.toLocaleDateString('en-GB');
                          })()
                          : "—"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.indenterName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.totaljoining || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.totalenquiry || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-bold text-navy">
                      {item.pendingJoining}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Designation-wise Employee Count */}
      <div className="bg-white rounded-xl shadow-lg border p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center">
          <UserPlus size={20} className="mr-2" />
          Designation-wise Employee Count
        </h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={designationData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
              <XAxis
                dataKey="designation"
                stroke="#374151"
                interval={0}
                angle={-30}
                textAnchor="end"
                height={80}
              />
              <YAxis stroke="#374151" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  color: '#374151'
                }}
              />
              <Bar dataKey="employees" name="Employees">
                {designationData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={index % 3 === 0 ? '#EF4444' : index % 3 === 1 ? '#10B981' : '#312e81'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>


    </div >
  );
};

export default Dashboard;
