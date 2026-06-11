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
  ArrowRight,
  X
} from 'lucide-react';

import { usePendingCounts } from '../hooks/usePendingCounts';

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
  const [selectedIndent, setSelectedIndent] = useState(null);
  
  const pendingCounts = usePendingCounts();

  const pendingTasks = [
    { title: "Online Posting", pending: pendingCounts?.onlinePostingCount || 0, link: "/online_posting", color: { text: "text-blue-600", bg: "bg-blue-50", hoverText: "group-hover:text-blue-700", border: "border-blue-100", hoverBorder: "hover:border-blue-300", iconText: "text-blue-500", hoverBg: "group-hover:bg-blue-100" } },
    { title: "Calling Job Agencies", pending: pendingCounts?.jobConsultancyCount || 0, link: "/calling_for_job_agencies", color: { text: "text-purple-600", bg: "bg-purple-50", hoverText: "group-hover:text-purple-700", border: "border-purple-100", hoverBorder: "hover:border-purple-300", iconText: "text-purple-500", hoverBg: "group-hover:bg-purple-100" } },
    { title: "Whatsapp Status", pending: pendingCounts?.whatsappCount || 0, link: "/whatsapp", color: { text: "text-emerald-600", bg: "bg-emerald-50", hoverText: "group-hover:text-emerald-700", border: "border-emerald-100", hoverBorder: "hover:border-emerald-300", iconText: "text-emerald-500", hoverBg: "group-hover:bg-emerald-100" } },
    { title: "Verification Before Interview", pending: pendingCounts?.verificationCount || 0, link: "/verification_before_interview", color: { text: "text-rose-600", bg: "bg-rose-50", hoverText: "group-hover:text-rose-700", border: "border-rose-100", hoverBorder: "hover:border-rose-300", iconText: "text-rose-500", hoverBg: "group-hover:bg-rose-100" } },
    { title: "Final Selection", pending: pendingCounts?.interviewSelectionCount || 0, link: "/interview_final_selection", color: { text: "text-amber-600", bg: "bg-amber-50", hoverText: "group-hover:text-amber-700", border: "border-amber-100", hoverBorder: "hover:border-amber-300", iconText: "text-amber-500", hoverBg: "group-hover:bg-amber-100" } },
    { title: "Joining Follow Up", pending: pendingCounts?.joiningFollowUpCount || 0, link: "/joining_follow_up", color: { text: "text-teal-600", bg: "bg-teal-50", hoverText: "group-hover:text-teal-700", border: "border-teal-100", hoverBorder: "hover:border-teal-300", iconText: "text-teal-500", hoverBg: "group-hover:bg-teal-100" } },
    { title: "Joining Management", pending: pendingCounts?.joiningManagementCount || 0, link: "/joining", color: { text: "text-cyan-600", bg: "bg-cyan-50", hoverText: "group-hover:text-cyan-700", border: "border-cyan-100", hoverBorder: "hover:border-cyan-300", iconText: "text-cyan-500", hoverBg: "group-hover:bg-cyan-100" } },
    { title: "Check Salary Slip & Resume", pending: pendingCounts?.checkSalarySlipCount || 0, link: "/check-salary-slip-and-resume", color: { text: "text-violet-600", bg: "bg-violet-50", hoverText: "group-hover:text-violet-700", border: "border-violet-100", hoverBorder: "hover:border-violet-300", iconText: "text-violet-500", hoverBg: "group-hover:bg-violet-100" } },
    { title: "Joining Letter Release", pending: pendingCounts?.joiningLetterCount || 0, link: "/joining-letter-release", color: { text: "text-pink-600", bg: "bg-pink-50", hoverText: "group-hover:text-pink-700", border: "border-pink-100", hoverBorder: "hover:border-pink-300", iconText: "text-pink-500", hoverBg: "group-hover:bg-pink-100" } },
    { title: "Induction Training", pending: pendingCounts?.inductionTrainingCount || 0, link: "/induction-or-training", color: { text: "text-orange-600", bg: "bg-orange-50", hoverText: "group-hover:text-orange-700", border: "border-orange-100", hoverBorder: "hover:border-orange-300", iconText: "text-orange-500", hoverBg: "group-hover:bg-orange-100" } },
    { title: "Asset Assignment", pending: pendingCounts?.assetAssignmentCount || 0, link: "/asset-assignment", color: { text: "text-lime-600", bg: "bg-lime-50", hoverText: "group-hover:text-lime-700", border: "border-lime-100", hoverBorder: "hover:border-lime-300", iconText: "text-lime-500", hoverBg: "group-hover:bg-lime-100" } }
  ];

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

    // Calculate Pending Stage Tasks (Now handled by usePendingCounts hook)

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
    const priorityIndex = findIdx(["Priority", "Priorety"]);
    const TotalJoiningIndex = findIdx(["Total Joining"]);

    const processed = dataRows.map(row => {
      const fullDetails = headers
        .map((header, index) => ({
          label: header || `Column ${index + 1}`,
          value: row[index] ?? ""
        }))
        .filter((detail) => String(detail.label).trim() || String(detail.value).trim());

      return {
        timestamp: row[timestampIndex],
        indentNumber: row[indentNumberIndex],
        post: row[postIndex],
        gender: row[genderIndex],
        department: row[departmentIndex],
        prefer: row[preferIndex],
        priority: priorityIndex >= 0 ? row[priorityIndex] : '',
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
        fullDetails,
        // Filter Source: Column B (Index 1)
        filterKey: row[1]
      };
    });

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

  const getPriorityClass = (priority) => {
    const normalized = (priority || "").toString().trim().toLowerCase();
    if (normalized.includes("high") || normalized.includes("urgent")) return "border-rose-200 bg-rose-50 text-rose-700";
    if (normalized.includes("medium") || normalized.includes("normal")) return "border-amber-200 bg-amber-50 text-amber-700";
    if (normalized.includes("low")) return "border-emerald-200 bg-emerald-50 text-emerald-700";
    return "border-slate-200 bg-slate-50 text-slate-600";
  };

  const totalPendingActions = pendingTasks.reduce((sum, task) => sum + Number(task.pending || 0), 0);
  const closeRate = totalEmployee > 0 ? Math.round((closeCount / totalEmployee) * 100) : 0;

  const summaryCards = [
    {
      title: "Total Indents",
      value: totalEmployee,
      helper: "All recruitment requests",
      icon: Users,
      iconBox: "bg-emerald-500 text-white",
      ring: "ring-emerald-100",
      accent: "from-emerald-500 to-teal-500",
      stroke: "#10b981",
      delay: "80ms"
    },
    {
      title: "Total Open",
      value: openCount,
      helper: "Positions in progress",
      icon: Clock,
      iconBox: "bg-amber-400 text-white",
      ring: "ring-amber-100",
      accent: "from-amber-400 to-orange-500",
      stroke: "#f59e0b",
      delay: "150ms"
    },
    {
      title: "Total Close",
      value: closeCount,
      helper: `${closeRate}% closure rate`,
      icon: CheckCircle,
      iconBox: "bg-violet-600 text-white",
      ring: "ring-violet-100",
      accent: "from-violet-500 to-indigo-500",
      stroke: "#8b5cf6",
      delay: "220ms"
    }
  ];

  const dashboardSignals = [
    { label: "Active Employees", value: activeEmployee, icon: UserCheck, tone: "text-emerald-700 bg-emerald-50 border-emerald-100" },
    { label: "Left Employees", value: leftEmployee, icon: UserX, tone: "text-rose-700 bg-rose-50 border-rose-100" },
    { label: "Left This Month", value: leaveThisMonth, icon: TrendingUp, tone: "text-amber-700 bg-amber-50 border-amber-100" },
    { label: "Pending Tasks", value: totalPendingActions, icon: AlertCircle, tone: "text-indigo-700 bg-indigo-50 border-indigo-100" }
  ];

  return (
    <div className="erp-dashboard relative min-h-screen overflow-hidden rounded-[1.1rem] border border-slate-200/80 bg-[#f4f7fb] p-3 font-sans shadow-sm sm:p-4 md:p-5">
      <style>{`
        @keyframes erp-fade-up {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes erp-scan-line {
          0% { transform: translateX(-100%); opacity: 0; }
          18% { opacity: 1; }
          100% { transform: translateX(120%); opacity: 0; }
        }
        @keyframes erp-meter {
          0%, 100% { transform: scaleX(0.72); opacity: 0.7; }
          50% { transform: scaleX(1); opacity: 1; }
        }
        .erp-fade-up { animation: erp-fade-up 520ms ease both; }
        .erp-scan-line { animation: erp-scan-line 5.8s ease-in-out infinite; }
        .erp-meter { animation: erp-meter 2.8s ease-in-out infinite; transform-origin: left; }
        .erp-grid-surface {
          background-image:
            linear-gradient(rgba(15, 23, 42, 0.045) 1px, transparent 1px),
            linear-gradient(90deg, rgba(15, 23, 42, 0.045) 1px, transparent 1px);
          background-size: 38px 38px;
        }
        @media (prefers-reduced-motion: reduce) {
          .erp-fade-up, .erp-scan-line, .erp-meter { animation: none; }
        }
      `}</style>
      <div className="pointer-events-none absolute inset-0 erp-grid-surface" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-52 bg-gradient-to-b from-white/80 via-cyan-50/40 to-transparent" />

      <div className="relative z-10 space-y-5">
        <section className="erp-dashboard-hero erp-fade-up relative overflow-hidden rounded-2xl border border-teal-900/20 bg-[#003f3b] text-white shadow-xl shadow-teal-950/10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_10%,rgba(20,184,166,0.34),transparent_32%),linear-gradient(135deg,rgba(0,75,70,0.96),rgba(0,45,48,0.98))]" />
          <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(140deg,transparent_0%,transparent_45%,rgba(255,255,255,0.18)_46%,transparent_48%),linear-gradient(30deg,transparent_0%,transparent_62%,rgba(255,255,255,0.14)_63%,transparent_65%)]" />
          <div className="absolute left-0 top-0 h-full w-1/2 bg-[linear-gradient(90deg,rgba(255,255,255,0.12),transparent)] erp-scan-line" />

          <div className="relative grid gap-5 p-5 sm:p-6 lg:grid-cols-[1.35fr_0.65fr] lg:p-7">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/20 px-3 py-1.5 text-[0.68rem] font-black uppercase tracking-[0.22em] text-teal-50">
                <TrendingUp size={14} />
                HRMS ERP Command Center
              </div>
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">HR Dashboard</h1>
              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-300">
                Recruitment, joining, employee signals, and pending workflow overview in one compact ERP console.
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {dashboardSignals.map((signal, index) => {
                  const Icon = signal.icon;
                  return (
                    <div
                      key={signal.label}
                      className="erp-fade-up rounded-xl border border-white/80 bg-white p-4 text-slate-950 shadow-lg shadow-teal-950/10"
                      style={{ animationDelay: `${120 + index * 70}ms` }}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[0.66rem] font-black uppercase tracking-wider text-slate-500">{signal.label}</span>
                        <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border ${signal.tone}`}>
                          <Icon size={15} />
                        </span>
                      </div>
                      <p className="text-2xl font-black text-slate-950">{signal.value}</p>
                      <p className="mt-1 text-[10px] font-bold text-slate-400">vs last month</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-white/80 bg-white p-4 text-slate-950 shadow-xl shadow-teal-950/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[0.7rem] font-black uppercase tracking-[0.2em] text-slate-500">Live Time</p>
                  <p className="mt-1 text-3xl font-black tracking-tight">
                    {currentTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 shadow-lg">
                  <Clock size={22} />
                </div>
              </div>

              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Close Rate</span>
                  <span>{closeRate}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-teal-600 via-emerald-500 to-lime-400 erp-meter"
                    style={{ width: `${Math.min(closeRate, 100)}%` }}
                  />
                </div>
              </div>

              <Link
                to="/joining_calendar"
                className="mt-5 flex h-11 items-center justify-center gap-2 rounded-xl bg-[#00564f] text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-[#00453f]"
              >
                <Calendar size={17} />
                Joining Calendar
              </Link>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="erp-fade-up group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200"
                style={{ animationDelay: card.delay }}
              >
                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${card.accent}`} />
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[0.72rem] font-black uppercase tracking-[0.16em] text-slate-500">{card.title}</p>
                    <h3 className="mt-2 text-3xl font-black tracking-tight text-slate-950">{card.value}</h3>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{card.helper}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <svg className="hidden h-16 w-24 sm:block" viewBox="0 0 120 62" fill="none" aria-hidden="true">
                      <path d="M4 54 C18 48 22 30 34 38 C44 46 48 16 58 24 C70 34 72 8 84 15 C96 22 98 4 116 10" stroke={card.stroke} strokeWidth="3" strokeLinecap="round" />
                      <path d="M4 60 C18 54 22 36 34 44 C44 52 48 22 58 30 C70 40 72 14 84 21 C96 28 98 10 116 16 L116 62 L4 62 Z" fill={card.stroke} opacity="0.12" />
                    </svg>
                    <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${card.iconBox} shadow-lg ring-8 ${card.ring} transition group-hover:scale-105`}>
                      <Icon size={25} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        <section className="erp-fade-up rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" style={{ animationDelay: "260ms" }}>
          <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700 ring-1 ring-amber-100">
                <AlertCircle size={20} />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900">Pending Actions Report</h2>
                <p className="text-xs font-semibold text-slate-500">{totalPendingActions} workflow items pending</p>
              </div>
            </div>
            <span className="inline-flex w-fit items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-black text-amber-800">
              Requires Attention
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {pendingTasks.map((task, idx) => (
              <Link
                key={idx}
                to={task.link}
                className={`erp-fade-up group rounded-xl border ${task.color.border} bg-slate-50/60 p-4 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-md ${task.color.hoverBorder}`}
                style={{ animationDelay: `${320 + idx * 35}ms` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[0.72rem] font-black uppercase tracking-[0.13em] text-slate-500">{task.title}</p>
                    <div className="mt-2 flex items-end gap-2">
                      <span className={`text-2xl font-black leading-none ${task.color.text} ${task.color.hoverText}`}>
                        {task.pending}
                      </span>
                      <span className="text-xs font-bold text-slate-500">pending</span>
                    </div>
                  </div>
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${task.color.bg} ${task.color.hoverBg} transition`}>
                    <ArrowRight size={18} className={`${task.color.iconText} transition group-hover:translate-x-0.5`} />
                  </div>
                </div>
                <div className="mt-3 h-1 overflow-hidden rounded-full bg-slate-200">
                  <div className={`h-full rounded-full ${task.color.bg}`} style={{ width: `${Math.min(Number(task.pending || 0) * 8, 100)}%` }} />
                </div>
              </Link>
            ))}
          </div>
        </section>

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
        <section className="erp-fade-up overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" style={{ animationDelay: "340ms" }}>
        <div className="flex flex-col justify-between gap-3 border-b border-slate-200 bg-slate-50/80 p-4 sm:flex-row sm:items-center sm:p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100">
              <FileText size={19} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">Reporting Table</h2>
              <p className="text-xs font-semibold text-slate-500">{indentData.length} records in current view</p>
            </div>
          </div>
          <div className="relative w-full sm:w-48">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-10 w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 pr-10 text-sm font-bold text-slate-700 shadow-sm outline-none transition hover:border-indigo-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            >
              <option value="All">All Statuses</option>
              <option value="Open">Open</option>
              <option value="Close">Close</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
              <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <div className="max-h-[calc(100vh-235px)] min-h-[460px] overflow-y-auto custom-scrollbar">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur">
                <tr>
                  <th className="px-4 py-3 text-left text-[0.68rem] font-black uppercase tracking-wider text-slate-500">Status</th>
                  <th className="px-4 py-3 text-left text-[0.68rem] font-black uppercase tracking-wider text-slate-500">Indent Number</th>
                  <th className="px-4 py-3 text-left text-[0.68rem] font-black uppercase tracking-wider text-slate-500">Post</th>
                  <th className="px-4 py-3 text-left text-[0.68rem] font-black uppercase tracking-wider text-slate-500">Department</th>
                  <th className="px-4 py-3 text-left text-[0.68rem] font-black uppercase tracking-wider text-slate-500">Priority</th>
                  <th className="px-4 py-3 text-left text-[0.68rem] font-black uppercase tracking-wider text-slate-500">Prefer</th>
                  <th className="px-4 py-3 text-center text-[0.68rem] font-black uppercase tracking-wider text-slate-500">No. of Post</th>
                  <th className="px-4 py-3 text-left text-[0.68rem] font-black uppercase tracking-wider text-slate-500">Completion Date</th>
                  <th className="px-4 py-3 text-left text-[0.68rem] font-black uppercase tracking-wider text-slate-500">Indenter Name</th>
                  <th className="px-4 py-3 text-center text-[0.68rem] font-black uppercase tracking-wider text-slate-500">Total Join</th>
                  <th className="px-4 py-3 text-center text-[0.68rem] font-black uppercase tracking-wider text-slate-500">Total Enquiry</th>
                  <th className="px-4 py-3 text-center text-[0.68rem] font-black uppercase tracking-wider text-slate-500">Pending Joining</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {tableLoading ? (
                  <tr>
                    <td colSpan="12" className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600 shadow-sm" />
                        <span className="text-sm font-bold tracking-wide text-slate-500">Loading reporting data...</span>
                      </div>
                    </td>
                  </tr>
                ) : indentData.length === 0 ? (
                  <tr>
                    <td colSpan="12" className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="mb-4 rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-100">
                          <FileText size={34} className="text-slate-300" />
                        </div>
                        <p className="text-sm font-bold text-slate-500">No indent data found.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  indentData.map((item, index) => (
                    <tr
                      key={index}
                      onClick={() => setSelectedIndent(item)}
                      className="erp-fade-up group cursor-pointer transition duration-200 hover:bg-indigo-50/45"
                      style={{ animationDelay: `${Math.min(index, 14) * 24}ms` }}
                      title="Click to view full details"
                    >
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className={`inline-flex rounded-lg px-2.5 py-1 text-[0.7rem] font-black leading-5 shadow-sm ${(item.filterKey || "").toString().toLowerCase().includes("close")
                          ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                          : (item.filterKey || "").toString().toLowerCase().includes("open")
                            ? "border border-rose-200 bg-rose-50 text-rose-700"
                            : "border border-slate-200 bg-slate-50 text-slate-700"
                          }`}>
                          {item.filterKey || "-"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-black text-slate-900 transition group-hover:text-indigo-700">
                        {item.indentNumber || "-"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-slate-700">
                        {item.post || "-"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">{item.department || "-"}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        <span className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-black ${getPriorityClass(item.priority)}`}>
                          {item.priority || "-"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-slate-500">
                        {item.prefer || "-"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-center text-sm font-black text-slate-900">
                        {item.noOfPost || 0}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-500">
                        {item.completionDate ? (
                          <div className="flex items-center">
                            <Calendar size={14} className="mr-2 text-indigo-400" />
                            <span className="font-bold text-slate-600">
                              {(() => {
                                const date = new Date(item.completionDate);
                                if (!date || isNaN(date.getTime())) return "Invalid date";
                                return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                              })()}
                            </span>
                          </div>
                        ) : "-"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-slate-600">
                        {item.indenterName || "-"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-sm font-black text-emerald-700">
                          {item.totaljoining || 0}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1 text-sm font-black text-blue-700">
                          {item.totalenquiry || 0}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-center">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-sm font-black text-white shadow-sm ring-4 ring-indigo-50">
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
        </section>

        {/* Designation-wise Employee Count */}
        <section className="erp-fade-up rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" style={{ animationDelay: "420ms" }}>
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100">
            <UserPlus size={19} />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900">Designation-wise Employee Count</h2>
            <p className="text-xs font-semibold text-slate-500">Current joining pipeline by designation</p>
          </div>
        </div>
        <div className="h-[390px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={designationData} margin={{ top: 16, right: 24, left: 12, bottom: 72 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="designation"
                stroke="#64748b"
                interval={0}
                angle={-40}
                textAnchor="end"
                height={88}
                tick={{ fontSize: 11, fill: '#475569', fontWeight: 700 }}
                tickMargin={12}
                axisLine={{ stroke: '#cbd5e1' }}
              />
              <YAxis 
                stroke="#64748b" 
                tick={{ fontSize: 11, fill: '#475569', fontWeight: 700 }} 
                axisLine={false} 
                tickLine={false}
                tickMargin={8} 
              />
              <Tooltip
                cursor={{ fill: 'rgba(79, 70, 229, 0.04)' }}
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.98)',
                  border: '1px solid #cbd5e1',
                  borderRadius: '12px',
                  color: '#0f172a',
                  boxShadow: '0 18px 35px rgba(15, 23, 42, 0.12)',
                  padding: '10px 14px',
                  fontWeight: '700',
                  fontSize: '12px'
                }}
                itemStyle={{ color: '#4f46e5', fontWeight: '800' }}
              />
              <Bar dataKey="employees" name="Employees" radius={[8, 8, 0, 0]} maxBarSize={42}>
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
                  <stop offset="100%" stopColor="#2563eb" />
                </linearGradient>
                <linearGradient id="colorGradient1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
                <linearGradient id="colorGradient2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#dc2626" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
        </section>
      </div>

      {selectedIndent && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
          onClick={() => setSelectedIndent(null)}
        >
          <div
            className="erp-fade-up max-h-[86vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600">Indent Full Details</p>
                <h3 className="mt-1 text-xl font-black text-slate-950">
                  {selectedIndent.indentNumber || "-"} - {selectedIndent.post || "-"}
                </h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-black ${(selectedIndent.filterKey || "").toString().toLowerCase().includes("close")
                    ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                    : (selectedIndent.filterKey || "").toString().toLowerCase().includes("open")
                      ? "border border-rose-200 bg-rose-50 text-rose-700"
                      : "border border-slate-200 bg-slate-50 text-slate-700"
                    }`}>
                    {selectedIndent.filterKey || "-"}
                  </span>
                  <span className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-black ${getPriorityClass(selectedIndent.priority)}`}>
                    Priority: {selectedIndent.priority || "-"}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedIndent(null)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                aria-label="Close details"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[calc(86vh-130px)] overflow-y-auto p-5">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {(selectedIndent.fullDetails || []).map((detail, index) => (
                  <div
                    key={`${detail.label}-${index}`}
                    className="erp-fade-up rounded-xl border border-slate-200 bg-slate-50/80 p-3"
                    style={{ animationDelay: `${Math.min(index, 18) * 18}ms` }}
                  >
                    <p className="text-[0.68rem] font-black uppercase tracking-wider text-slate-500">{detail.label}</p>
                    <p className="mt-1 break-words text-sm font-bold text-slate-900">
                      {detail.value !== undefined && detail.value !== null && String(detail.value).trim() !== "" ? String(detail.value) : "-"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
