import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

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
  CheckCircle,
  AlertCircle,
  ArrowRight
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
  
  const [pendingTasks, setPendingTasks] = useState([]);

  const [tableLoading, setTableLoading] = useState(false);
  
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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
    const dataRows = globalFmsData.slice(9);

    // Calculate Pending Stage Tasks
    let onlinePostingCount = 0;
    let jobConsultancyCount = 0;
    let whatsappCount = 0;

    dataRows.forEach(row => {
      const p1 = row[17]?.toString().trim() || "";
      const a1 = row[18]?.toString().trim() || "";
      if (p1 !== "" && a1 === "") onlinePostingCount++;

      const p2 = row[23]?.toString().trim() || "";
      const a2 = row[24]?.toString().trim() || "";
      if (p2 !== "" && a2 === "") jobConsultancyCount++;

      const p3 = row[30]?.toString().trim() || "";
      const a3 = row[31]?.toString().trim() || "";
      if (p3 !== "" && a3 === "") whatsappCount++;
    });

    setPendingTasks([
      { title: "Online Posting", pending: onlinePostingCount, link: "/online_posting", color: { text: "text-blue-600", bg: "bg-blue-50", hoverText: "group-hover:text-blue-700", border: "border-blue-100", hoverBorder: "hover:border-blue-300", iconText: "text-blue-500", hoverBg: "group-hover:bg-blue-100" } },
      { title: "Calling Job Agencies", pending: jobConsultancyCount, link: "/calling_for_job_agencies", color: { text: "text-purple-600", bg: "bg-purple-50", hoverText: "group-hover:text-purple-700", border: "border-purple-100", hoverBorder: "hover:border-purple-300", iconText: "text-purple-500", hoverBg: "group-hover:bg-purple-100" } },
      { title: "Whatsapp Status", pending: whatsappCount, link: "/whatsapp", color: { text: "text-emerald-600", bg: "bg-emerald-50", hoverText: "group-hover:text-emerald-700", border: "border-emerald-100", hoverBorder: "hover:border-emerald-300", iconText: "text-emerald-500", hoverBg: "group-hover:bg-emerald-100" } },
    ]);

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
    <div className="space-y-8 page-content p-6 md:p-8 bg-gradient-to-br from-slate-50 to-indigo-50/30 min-h-screen font-sans">
      <style>{`
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-x 3s ease infinite;
        }
      `}</style>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-6 border-b border-gray-200/60 gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 animate-gradient-x drop-shadow-sm pb-1">
              HR Dashboard
            </h1>
            <p className="text-sm text-gray-500 mt-1 font-medium">Overview of company indents and reporting</p>
          </div>
          
          {/* Clock Widget */}
          <div className="hidden sm:flex items-center space-x-3 bg-white/60 backdrop-blur-md px-4 py-2 rounded-xl border border-gray-200 shadow-sm ml-2">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <Clock size={18} className="text-indigo-600" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-gray-800">
                {currentTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
              </span>
              <span className="text-xs font-semibold text-gray-500">
                {currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Mobile Clock */}
          <div className="sm:hidden flex items-center bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm text-sm font-bold text-indigo-700">
             {currentTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
          </div>
          <Link 
            to="/joining_calendar" 
            className="flex items-center bg-gradient-to-r from-indigo-600 to-blue-700 text-white px-5 py-2.5 rounded-xl hover:shadow-lg hover:shadow-indigo-500/30 hover:-translate-y-0.5 transition-all duration-300 font-medium"
          >
            <Calendar size={18} className="mr-2" />
            Joining Calendar
          </Link>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center hover:shadow-md hover:border-indigo-100 transition-all duration-300 group">
          <div className="p-4 rounded-2xl bg-indigo-50 group-hover:bg-indigo-600 transition-colors duration-500 mr-5">
            <Users size={28} className="text-indigo-600 group-hover:text-white transition-colors duration-500" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Total Indents</p>
            <h3 className="text-3xl font-black text-gray-800">{totalEmployee}</h3>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center hover:shadow-md hover:border-rose-100 transition-all duration-300 group">
          <div className="p-4 rounded-2xl bg-rose-50 group-hover:bg-rose-500 transition-colors duration-500 mr-5">
            <Clock size={28} className="text-rose-500 group-hover:text-white transition-colors duration-500" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Total Open</p>
            <h3 className="text-3xl font-black text-gray-800">{openCount}</h3>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center hover:shadow-md hover:border-emerald-100 transition-all duration-300 group">
          <div className="p-4 rounded-2xl bg-emerald-50 group-hover:bg-emerald-500 transition-colors duration-500 mr-5">
            <CheckCircle size={28} className="text-emerald-500 group-hover:text-white transition-colors duration-500" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Total Close</p>
            <h3 className="text-3xl font-black text-gray-800">{closeCount}</h3>
          </div>
        </div>
      </div>

      {/* Pending Tasks Report Section */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm border border-orange-100/50 p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-50 rounded-full blur-3xl -z-10 -translate-y-1/2 translate-x-1/2"></div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-gray-800 flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg mr-3 shadow-inner">
              <AlertCircle size={20} className="text-orange-600" />
            </div>
            Pending Actions Report
          </h2>
          <span className="bg-orange-100 text-orange-800 text-xs font-bold px-3 py-1 rounded-full border border-orange-200 shadow-sm">
            Requires Attention
          </span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {pendingTasks.map((task, idx) => (
            <Link 
              key={idx} 
              to={task.link}
              className={`block bg-white rounded-xl border ${task.color.border} p-5 shadow-sm hover:shadow-md hover:-translate-y-1 ${task.color.hoverBorder} transition-all duration-300 group`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-2">{task.title}</p>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-3xl font-black ${task.color.text} ${task.color.hoverText} transition-colors`}>
                      {task.pending}
                    </span>
                    <span className="text-sm font-semibold text-gray-500">pending</span>
                  </div>
                </div>
                <div className={`p-2.5 ${task.color.bg} rounded-full ${task.color.hoverBg} transition-colors`}>
                  <ArrowRight size={20} className={`${task.color.iconText}`} />
                </div>
              </div>
              <div className={`mt-4 pt-4 border-t border-gray-100 flex items-center text-xs font-semibold text-gray-400 ${task.color.hoverText} transition-colors`}>
                Click to view and manage tasks
              </div>
            </Link>
          ))}
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
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mt-8">
        <div className="flex flex-col md:flex-row justify-between items-center p-5 sm:p-6 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-lg font-bold text-gray-800 flex items-center">
            <div className="p-2 bg-indigo-50 rounded-lg mr-3 shadow-inner">
              <FileText size={20} className="text-indigo-600" />
            </div>
            Reporting Table
          </h2>
          <div className="relative mt-4 md:mt-0 w-full md:w-auto">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="appearance-none w-full md:w-48 bg-white border border-gray-200 text-gray-700 py-2.5 px-5 pr-10 rounded-xl leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm hover:border-gray-300 transition-colors font-medium text-sm"
            >
              <option value="All">All Statuses</option>
              <option value="Open">Open</option>
              <option value="Close">Close</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <div className="max-h-[calc(100vh-220px)] min-h-[500px] overflow-y-auto custom-scrollbar">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50/90 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Indent Number</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Post</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Department</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Prefer</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">No. of Post</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Completion Date</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Indenter Name</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Total Join</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Total Enquiry</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Pending Joining</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {tableLoading ? (
                  <tr>
                    <td colSpan="11" className="px-6 py-20 text-center">
                      <div className="flex justify-center flex-col items-center">
                        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4 shadow-sm"></div>
                        <span className="text-gray-500 font-medium tracking-wide">Loading reporting data...</span>
                      </div>
                    </td>
                  </tr>
                ) : indentData.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="p-5 bg-gray-50 rounded-full mb-4 shadow-inner">
                          <FileText size={36} className="text-gray-300" />
                        </div>
                        <p className="text-gray-500 font-medium text-lg">No indent data found.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  indentData.map((item, index) => (
                    <tr key={index} className="hover:bg-indigo-50/40 transition-colors duration-200 group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-md shadow-sm ${(item.filterKey || "").toString().toLowerCase().includes("close")
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : (item.filterKey || "").toString().toLowerCase().includes("open")
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-gray-50 text-gray-700 border border-gray-200"
                          }`}>
                          {item.filterKey}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                        {item.indentNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">
                        {item.post}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className="px-2.5 py-1 bg-gray-100 rounded-md text-gray-700 text-xs font-semibold">{item.department}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.prefer}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium text-center">
                        {item.noOfPost}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.completionDate ? (
                          <div className="flex items-center">
                            <Calendar size={14} className="mr-2 text-indigo-400" />
                            <span className="font-medium text-gray-600">
                              {(() => {
                                const date = new Date(item.completionDate);
                                if (!date || isNaN(date.getTime())) return "Invalid date";
                                return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                              })()}
                            </span>
                          </div>
                        ) : "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                        {item.indenterName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-semibold text-sm border border-emerald-100">
                          {item.totaljoining || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 font-semibold text-sm border border-blue-100">
                          {item.totalenquiry || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm shadow-sm ring-2 ring-white">
                          {item.pendingJoining}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Designation-wise Employee Count */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mt-8 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl -z-10 -translate-y-1/2 translate-x-1/2"></div>
        <h2 className="text-lg font-bold text-gray-800 mb-8 flex items-center">
          <div className="p-2.5 bg-gradient-to-br from-indigo-100 to-indigo-50 rounded-xl mr-3 shadow-inner">
            <UserPlus size={20} className="text-indigo-600" />
          </div>
          Designation-wise Employee Count
        </h2>
        <div className="h-[450px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={designationData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis
                dataKey="designation"
                stroke="#6b7280"
                interval={0}
                angle={-45}
                textAnchor="end"
                height={100}
                tick={{ fontSize: 12, fill: '#4b5563', fontWeight: 500 }}
                tickMargin={15}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis 
                stroke="#6b7280" 
                tick={{ fontSize: 12, fill: '#4b5563', fontWeight: 500 }} 
                axisLine={false} 
                tickLine={false}
                tickMargin={10} 
              />
              <Tooltip
                cursor={{ fill: 'rgba(79, 70, 229, 0.04)' }}
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.98)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  color: '#1f2937',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                  padding: '12px 16px',
                  fontWeight: '500'
                }}
                itemStyle={{ color: '#4f46e5', fontWeight: 'bold' }}
              />
              <Bar dataKey="employees" name="Employees" radius={[8, 8, 0, 0]} maxBarSize={45}>
                {designationData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={`url(#colorGradient${index % 3})`}
                  />
                ))}
              </Bar>
              <defs>
                <linearGradient id="colorGradient0" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#4338ca" />
                </linearGradient>
                <linearGradient id="colorGradient1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
                <linearGradient id="colorGradient2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fbbf24" />
                  <stop offset="100%" stopColor="#d97706" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>


    </div >
  );
};

export default Dashboard;
