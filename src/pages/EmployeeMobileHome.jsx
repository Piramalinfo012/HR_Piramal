import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CalendarDays,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  User,
  Megaphone,
  LogOut,
  Camera,
  Fingerprint,
  Wallet,
  Briefcase,
  ClipboardList,
  Users,
  FolderKanban,
  Sparkles,
  Play
} from 'lucide-react';
import { motion } from 'framer-motion';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';

const ATTENDANCE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx_GRdhFbP5zQX_HV72t9Ofcj5IHurSBJnPC5o0yr6_HvkLkMs9hOSLHIP0e26uG1iDlA/exec';
const ATTENDANCE_SHEET_NAME = 'Data';
const FEED_REFRESH_INTERVAL_MS = 30000;
const FEED_CACHE_KEY = 'employee_mobile_feed_cache_v1';
const FEED_CACHE_TTL_MS = 10 * 60 * 1000;
const MOBILE_ATTENDANCE_CACHE_KEY = 'employee_mobile_latest_attendance_cache_v1';
const MOBILE_ATTENDANCE_CACHE_TTL_MS = 10 * 60 * 1000;
const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const normalize = (value) => (value || '').toString().trim();

const readCachedList = (key, maxAgeMs) => {
  try {
    const cached = JSON.parse(localStorage.getItem(key) || 'null');
    if (!cached || !Array.isArray(cached.data)) return [];
    if (Date.now() - Number(cached.savedAt || 0) > maxAgeMs) return [];
    return cached.data;
  } catch {
    return [];
  }
};

const writeCachedList = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), data }));
  } catch {
    // Cache is only for faster paint; ignore storage quota/private mode failures.
  }
};

const parseTimeToMinutes = (value) => {
  if (!value) return null;
  const match = value.toString().trim().match(/^(\d{1,2})[:.](\d{1,2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
};

const getMonthIndex = (monthName) =>
  monthNames.findIndex((month) => month.toLowerCase() === normalize(monthName).toLowerCase());

const parseAttendanceDate = (value, monthName = '') => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  if (typeof value === 'number') {
    const date = new Date((value - 25569) * 86400 * 1000);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const rawValue = value.toString().trim();
  const isoMatch = rawValue.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    return new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
  }

  const slashMatch = rawValue.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (slashMatch) {
    const first = Number(slashMatch[1]);
    const second = Number(slashMatch[2]);
    const year = slashMatch[3].length === 2 ? Number(`20${slashMatch[3]}`) : Number(slashMatch[3]);
    const namedMonthIndex = getMonthIndex(monthName);

    if (namedMonthIndex !== -1) {
      if (second - 1 === namedMonthIndex) return new Date(year, second - 1, first);
      if (first - 1 === namedMonthIndex) return new Date(year, first - 1, second);
    }

    if (first > 12) return new Date(year, second - 1, first);
    if (second > 12) return new Date(year, first - 1, second);
    return new Date(year, second - 1, first);
  }

  const date = new Date(rawValue);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getDriveImageUrl = (url, size) => {
  if (!url) return null;

  // Cloudinary Optimization
  if (url.includes("cloudinary.com")) {
    if (size) {
      return url.replace("/upload/", `/upload/w_${size},q_auto,f_auto/`);
    }
    return url.replace("/upload/", `/upload/q_auto,f_auto/`);
  }

  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return `https://drive.google.com/thumbnail?id=${match[1]}${size ? `&sz=w${size}` : ""}`;
  }
  return url;
};

const formatTime = (value) => normalize(value) || '-';

const formatWorkingDuration = (inTimeValue, outTimeValue) => {
  const inTime = parseTimeToMinutes(inTimeValue);
  const outTime = parseTimeToMinutes(outTimeValue);

  if (inTime === null || outTime === null) return '-';

  let diff = outTime - inTime;
  if (diff < 0) diff += 24 * 60;

  const hours = Math.floor(diff / 60);
  const minutes = diff % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

const summarizeRows = (rows) => rows.reduce((summary, item) => {
  const status = normalize(item.status).toUpperCase();
  const inTimeMinutes = parseTimeToMinutes(item.inTime);
  const outTimeMinutes = parseTimeToMinutes(item.outTime);
  const inTimeStr = item.inTime ? item.inTime.toString().trim() : '';
  const outTimeStr = item.outTime ? item.outTime.toString().trim() : '';
  const hasInTime = inTimeStr !== '' && inTimeStr !== '-';
  const hasOutTime = outTimeStr !== '' && outTimeStr !== '-';

  const isLateIn = hasInTime && inTimeMinutes !== null && inTimeMinutes > 9 * 60 + 15;
  const isEarlyOut = hasOutTime && outTimeMinutes !== null && outTimeMinutes < 18 * 60;

  if (status === 'P' || status === 'PRESENT') {
    summary.present += 1;
  } else if (status === 'A' || status === 'ABSENT') {
    summary.absent += 1;
  } else if (status === 'WO' || status === 'HOLIDAY') {
    summary.holiday += 1;
  } else if (status === 'HD' || status === 'HALF DAY') {
    summary.late += 1;
  }
  
  if ((status === 'P' || status === 'PRESENT') && (isLateIn || isEarlyOut)) {
    summary.late += 1;
  }

  return summary;
}, { present: 0, absent: 0, holiday: 0, late: 0 });

const EmployeeMobileHome = () => {
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const initialAttendanceData = useMemo(
    () => readCachedList(MOBILE_ATTENDANCE_CACHE_KEY, MOBILE_ATTENDANCE_CACHE_TTL_MS),
    []
  );
  const initialFeedData = useMemo(() => readCachedList(FEED_CACHE_KEY, FEED_CACHE_TTL_MS), []);
  const [attendanceData, setAttendanceData] = useState(initialAttendanceData);
  const [loading, setLoading] = useState(initialAttendanceData.length === 0);
  const [newJoiners, setNewJoiners] = useState(initialFeedData);
  const [feedLoading, setFeedLoading] = useState(initialFeedData.length === 0);
  const [now, setNow] = useState(() => new Date());

  const rawUser = localStorage.getItem('user');
  const user = rawUser ? JSON.parse(rawUser) : {};
  const employeeName = user?.Name || user?.name || user?.Username || 'Employee';

  const [profilePic, setProfilePic] = useState(user?.profilePic || "");
  const [uploadingPic, setUploadingPic] = useState(false);
  const fileInputRef = React.useRef(null);

  useEffect(() => {
    const clockId = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(clockId);
  }, []);

  const handleProfilePicUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPic(true);
    const toastId = toast.loading("Uploading profile picture...");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);

      const cloudinaryRes = await fetch(
        `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: "POST", body: formData }
      );
      const cloudinaryData = await cloudinaryRes.json();
      
      if (!cloudinaryData.secure_url) throw new Error("Upload failed");
      const newPicUrl = cloudinaryData.secure_url;

      if (user?.rowIndex) {
        const payload = {
          sheetName: "USER",
          action: "updateCell",
          rowIndex: user.rowIndex,
          columnIndex: 13,
          value: newPicUrl
        };
        const sheetRes = await fetch(import.meta.env.VITE_GOOGLE_SHEET_URL, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams(payload).toString()
        });
        const sheetData = await sheetRes.json();
        if (!sheetData.success) throw new Error("Failed to save to sheet");
      }

      setProfilePic(newPicUrl);
      
      const updatedUser = { ...user, profilePic: newPicUrl };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      
      toast.success("Profile picture updated!", { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error("Failed to update profile picture", { id: toastId });
    } finally {
      setUploadingPic(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    let isMounted = true;
    let feedRequestRunning = false;

    const fetchJoiners = async ({ silent = false } = {}) => {
      if (feedRequestRunning) return;
      feedRequestRunning = true;

      try {
        if (!silent) setFeedLoading(true);
        const cb = `&_=${Date.now()}&realtime=1`;
        const sheetName = encodeURIComponent('Onboard and Status');
        const response = await fetch(`${import.meta.env.VITE_GOOGLE_SHEET_URL}?action=fetch&sheet=${sheetName}${cb}`, {
          cache: 'no-store',
        });
        const json = await response.json();
        const raw = json.data || [];

        if (!isMounted) return;
        
        if (raw.length > 1) {
          const processed = raw.slice(1).map(row => ({
            date: row[0] || "",
            candidatePhoto: row[1] || "",
            sms: row[2] || "",
            smsType: row[3] || "Announcement",
            name: row[4] || "",
            designation: row[5] || ""
          })).filter(item => item.sms || item.candidatePhoto);
          
          const nextJoiners = processed.reverse();
          writeCachedList(FEED_CACHE_KEY, nextJoiners);
          React.startTransition(() => setNewJoiners(nextJoiners));
        } else {
          writeCachedList(FEED_CACHE_KEY, []);
          setNewJoiners([]);
        }
      } catch (e) {
        console.error("Failed to fetch feed:", e);
      } finally {
        feedRequestRunning = false;
        if (isMounted) {
          setFeedLoading(false);
        }
      }
    };

    const refreshFeed = () => fetchJoiners({ silent: true });
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshFeed();
      }
    };

    fetchJoiners({ silent: initialFeedData.length > 0 });

    const intervalId = window.setInterval(refreshFeed, FEED_REFRESH_INTERVAL_MS);
    window.addEventListener('focus', refreshFeed);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshFeed);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [initialFeedData.length]);

  useEffect(() => {
    const fetchAttendanceData = async () => {
      try {
        const response = await fetch(
          `${ATTENDANCE_SCRIPT_URL}?sheet=${encodeURIComponent(ATTENDANCE_SHEET_NAME)}&action=fetch&range=A:F`
        );
        const result = await response.json();
        const rawData = result.data || result;

        if (!Array.isArray(rawData)) {
          setAttendanceData([]);
          return;
        }

        const headers = rawData[0] || [];
        const rows = rawData.slice(1);
        const getIndex = (headerName) =>
          headers.findIndex((header) => normalize(header).toLowerCase() === headerName.toLowerCase());

        const processedRows = rows.map((row) => ({
          date: row[getIndex('Date')] || '',
          employeeName: row[getIndex('Employee Name')] || '',
          inTime: row[getIndex('In Time')] || '',
          outTime: row[getIndex('Out Time')] || '',
          status: row[getIndex('Status')] || '',
          month: row[getIndex('Month')] || '',
        })).filter((item) => item.date || item.employeeName || item.status);

        writeCachedList(MOBILE_ATTENDANCE_CACHE_KEY, processedRows);
        React.startTransition(() => setAttendanceData(processedRows));
      } catch (error) {
        console.error('Employee mobile attendance fetch failed:', error);
        setAttendanceData((current) => (current.length ? current : []));
      } finally {
        setLoading(false);
      }
    };

    fetchAttendanceData();
  }, []);

  const userRows = useMemo(() => {
    const userName = normalize(employeeName).toLowerCase();
    return attendanceData.filter((item) =>
      normalize(item.employeeName).toLowerCase() === userName ||
      normalize(item.employeeName).toLowerCase().includes(userName)
    );
  }, [attendanceData, employeeName]);

  const latestAttendanceRecord = useMemo(() => {
    return userRows
      .map((item) => ({ ...item, _dateObj: parseAttendanceDate(item.date, item.month) }))
      .filter((item) => item._dateObj)
      .sort((a, b) => b._dateObj - a._dateObj)[0];
  }, [userRows]);

  const currentMonthRows = useMemo(() => {
    return userRows.filter((item) => {
      const date = parseAttendanceDate(item.date, item.month);
      return date && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    });
  }, [userRows, now]);

  const monthSummary = useMemo(() => summarizeRows(currentMonthRows), [currentMonthRows]);
  const firstName = employeeName.split(' ')[0] || 'Employee';
  const currentTime = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const currentDate = now.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long' });
  const attendanceStatusLabel = latestAttendanceRecord?.inTime
    ? latestAttendanceRecord?.outTime
      ? 'Checked Out'
      : 'Checked In'
    : 'Not Checked In';
  const dayGoalHours = 8;
  const latestWorkingDuration = formatWorkingDuration(latestAttendanceRecord?.inTime, latestAttendanceRecord?.outTime);
  const latestWorkingMinutes = latestWorkingDuration === '-'
    ? 0
    : latestWorkingDuration.split(':').reduce((total, value, index) => total + Number(value || 0) * (index === 0 ? 60 : 1), 0);
  const goalProgress = Math.min(100, Math.round((latestWorkingMinutes / (dayGoalHours * 60)) * 100));

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('employeeId');
    logout();
    navigate('/login', { replace: true });
  };

  const quickActions = [
    { icon: Wallet, label: 'Expenses', path: '/employee-mobile', iconClass: 'bg-emerald-50 text-emerald-700 ring-emerald-100' },
    { icon: ClipboardList, label: 'HR Records', path: '/my-attendance', iconClass: 'bg-indigo-50 text-indigo-700 ring-indigo-100' },
    { icon: Fingerprint, label: 'Mark Attendance', path: '/mark-attendance', iconClass: 'bg-blue-50 text-blue-700 ring-blue-100' },
    { icon: FileText, label: 'Leave Request', path: '/leave-request', iconClass: 'bg-rose-50 text-rose-700 ring-rose-100' },
    { icon: CalendarDays, label: 'Leave History', path: '/leave-management', iconClass: 'bg-slate-100 text-slate-700 ring-slate-200' },
    { icon: User, label: 'My Profile', path: '/employee-profile', iconClass: 'bg-amber-50 text-amber-700 ring-amber-100' },
    { icon: Briefcase, label: 'Projects / Tasks', path: '/employee-mobile', iconClass: 'bg-orange-50 text-orange-700 ring-orange-100' },
    { icon: Users, label: 'All Contacts', path: '/employee-mobile', iconClass: 'bg-cyan-50 text-cyan-700 ring-cyan-100' },
  ];

  return (
    <div className="min-h-screen bg-[#f4f7fb] pb-24 text-slate-950">
      <div className="mx-auto max-w-md px-4 pt-5">
        <header className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => !uploadingPic && fileInputRef.current?.click()}
            className="flex min-w-0 items-center gap-3 text-left"
            aria-label="Update profile picture"
          >
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl border border-white bg-white shadow-[0_12px_28px_rgba(15,23,42,0.12)]">
              {uploadingPic ? (
                <div className="flex h-full w-full items-center justify-center">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
                </div>
              ) : profilePic ? (
                <img
                  src={getDriveImageUrl(profilePic, 150)}
                  alt="Profile"
                  decoding="async"
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    if (!e.target.dataset.retried) {
                      e.target.dataset.retried = "true";
                      const match = profilePic.match(/\/d\/([a-zA-Z0-9_-]+)/) || profilePic.match(/id=([a-zA-Z0-9_-]+)/);
                      if (match && match[1]) {
                        e.target.src = `https://drive.google.com/uc?export=view&id=${match[1]}`;
                      } else {
                        e.target.src = profilePic;
                      }
                    }
                  }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-slate-100">
                  <User size={24} className="text-slate-700" />
                </div>
              )}
              <span className="absolute bottom-0 right-0 grid h-5 w-5 place-items-center rounded-full border-2 border-white bg-slate-900">
                <Camera size={10} className="text-white" />
              </span>
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-slate-950">{employeeName}</p>
              <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">Employee Portal</p>
            </div>
            <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleProfilePicUpload} />
          </button>

          <div className="flex items-center gap-2">
            <button type="button" className="relative grid h-10 w-10 place-items-center rounded-2xl bg-white text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.08)]" aria-label="Notifications">
              <Bell size={18} />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
            </button>
            <button type="button" onClick={handleLogout} className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.08)]" aria-label="Logout">
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <motion.section
          className="relative mt-5 overflow-hidden rounded-[28px] bg-slate-950 p-4 text-white shadow-[0_24px_48px_rgba(15,23,42,0.24)]"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <span className="pointer-events-none absolute -right-20 -top-16 h-44 w-44 rounded-full bg-indigo-500/20 blur-2xl" />
          <span className="pointer-events-none absolute -bottom-20 left-10 h-44 w-44 rounded-full bg-cyan-400/10 blur-2xl" />
          <div className="relative z-10 flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Attendance Overview</p>
              <h1 className="mt-1 text-xl font-black leading-tight">Good Morning, {firstName}</h1>
              <p className="mt-1 text-xs font-semibold text-slate-300">{currentDate}</p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-black text-white ring-1 ring-white/15">
              <Sparkles size={12} />
              {attendanceStatusLabel}
            </span>
          </div>

          <div className="relative z-10 mt-5 grid grid-cols-[1fr_auto] items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/10">
                  <Clock size={20} />
                </div>
                <div>
                  <p className="text-2xl font-black leading-none">{currentTime}</p>
                  <p className="mt-1 text-[11px] font-semibold text-slate-400">Current time</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-[10px] font-bold text-slate-400">
                <div>
                  <p>Worked Hrs</p>
                  <p className="mt-1 text-xs font-black text-white">{latestWorkingDuration}</p>
                </div>
                <div>
                  <p>Check In</p>
                  <p className="mt-1 text-xs font-black text-white">{formatTime(latestAttendanceRecord?.inTime)}</p>
                </div>
                <div>
                  <p>Check Out</p>
                  <p className="mt-1 text-xs font-black text-white">{formatTime(latestAttendanceRecord?.outTime)}</p>
                </div>
              </div>
            </div>

            <div className="relative grid h-20 w-20 place-items-center rounded-full border-4 border-white/25 bg-white/10 ring-1 ring-white/10">
              <div className="absolute inset-2 rounded-full border border-white/15" />
              <div className="text-center">
                <p className="text-lg font-black">{goalProgress}%</p>
                <p className="text-[9px] font-black uppercase leading-none text-white/70">Goal</p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/mark-attendance')}
            className="relative z-10 mt-5 flex h-12 w-full items-center justify-between rounded-2xl bg-white px-4 text-sm font-black text-slate-950 shadow-[0_14px_28px_rgba(0,0,0,0.18)] active:scale-[0.99]"
          >
            <span className="inline-flex items-center gap-2">
              <Fingerprint size={18} />
              Check In
            </span>
            <Play size={16} fill="currentColor" />
          </button>
        </motion.section>

        <section className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-slate-950">Quick Actions</h2>
            <button type="button" onClick={() => navigate('/my-attendance')} className="text-xs font-black text-indigo-600">
              View all
            </button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {quickActions.map((action, idx) => (
              <motion.button
                key={action.label}
                type="button"
                onClick={() => navigate(action.path)}
                className="flex h-[62px] items-center justify-between rounded-2xl border border-slate-200/80 bg-white px-3 text-left shadow-[0_14px_30px_rgba(15,23,42,0.07)] active:scale-[0.98]"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * idx, duration: 0.25 }}
                aria-label={action.label}
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-[14px] ring-1 ${action.iconClass}`}>
                    <action.icon size={19} strokeWidth={2.4} />
                  </span>
                  <span className="truncate text-[12px] font-black text-slate-800">{action.label}</span>
                </span>
                <ArrowRight size={15} className="shrink-0 text-slate-400" />
              </motion.button>
            ))}
          </div>
        </section>

        <div className="mt-6 space-y-6">
          <section>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-slate-950">Today Activity</h2>
              <button type="button" onClick={() => navigate('/my-attendance')} className="text-xs font-black text-slate-500">
                View All
              </button>
            </div>
            <div className="mt-3 rounded-[24px] border border-slate-200/80 bg-white p-4 shadow-[0_14px_30px_rgba(15,23,42,0.07)]">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                    <CheckCircle2 size={21} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-900">{attendanceStatusLabel}</p>
                    <p className="mt-0.5 text-[11px] font-bold text-slate-500">
                      {latestAttendanceRecord ? `${formatTime(latestAttendanceRecord.inTime)} - ${formatTime(latestAttendanceRecord.outTime)}` : 'No attendance record yet'}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-700">{latestWorkingDuration}</span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-2xl bg-emerald-50 p-3 text-center ring-1 ring-emerald-100">
                  <p className="text-base font-black text-emerald-700">{monthSummary.present}</p>
                  <p className="text-[9px] font-black uppercase text-emerald-500">Present</p>
                </div>
                <div className="rounded-2xl bg-rose-50 p-3 text-center ring-1 ring-rose-100">
                  <p className="text-base font-black text-rose-700">{monthSummary.absent}</p>
                  <p className="text-[9px] font-black uppercase text-rose-500">Absent</p>
                </div>
                <div className="rounded-2xl bg-amber-50 p-3 text-center ring-1 ring-amber-100">
                  <p className="text-base font-black text-amber-700">{monthSummary.late}</p>
                  <p className="text-[9px] font-black uppercase text-amber-500">Late</p>
                </div>
              </div>
            </div>
          </section>
        <section className="mt-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-black text-slate-950">Company Updates</h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-600">
              {newJoiners.length} New
            </span>
          </div>
          
          {feedLoading ? (
            <div className="flex h-32 items-center justify-center rounded-[24px] bg-white shadow-[0_14px_30px_rgba(15,23,42,0.07)]">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-100 border-t-slate-700"></div>
            </div>
          ) : newJoiners.length > 0 ? (
            <div className="space-y-6">
              {/* Stories / Avatars Scroll */}
              <motion.div 
                className="flex w-full gap-4 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              >
                {newJoiners.slice(0, 10).map((person, idx) => (
                  <motion.div 
                    key={`story-${idx}`} 
                    className="flex flex-col items-center gap-1.5 shrink-0"
                    initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: idx * 0.05 }}
                  >
                    <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-[20px] border border-slate-200 bg-white p-[2px] shadow-[0_10px_22px_rgba(15,23,42,0.08)]">
                      {person.candidatePhoto ? (
                        <img 
                          src={getDriveImageUrl(person.candidatePhoto, 200)} 
                          alt="Story" 
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full rounded-full object-cover bg-gray-50" 
                          onError={(e) => {
                            if (!e.target.dataset.retried) {
                              e.target.dataset.retried = "true";
                              const match = person.candidatePhoto.match(/\/d\/([a-zA-Z0-9_-]+)/) || person.candidatePhoto.match(/id=([a-zA-Z0-9_-]+)/);
                              if (match && match[1]) {
                                e.target.src = `https://drive.google.com/uc?export=view&id=${match[1]}`;
                              } else {
                                e.target.src = person.candidatePhoto;
                              }
                            }
                          }}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center rounded-[18px] bg-slate-100">
                          <Megaphone size={24} className="text-slate-600" />
                        </div>
                      )}
                    </div>
                    <span className="w-[68px] truncate text-center text-[10px] font-black text-slate-700">{person.smsType.split(' ')[0]}</span>
                  </motion.div>
                ))}
              </motion.div>

              {/* Feed Cards */}
              <div className="flex flex-col gap-6 -mx-5 mt-4">
                {newJoiners.slice(0, 5).map((person, idx) => (
                  <motion.div 
                    key={`feed-${idx}`}
                    className="relative overflow-hidden rounded-[24px] border border-slate-200/80 bg-white pb-2 shadow-[0_14px_30px_rgba(15,23,42,0.07)]"
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + idx * 0.1 }}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                          {person.candidatePhoto ? (
                            <img 
                              src={getDriveImageUrl(person.candidatePhoto, 150)} 
                              alt="Profile" 
                              loading="lazy"
                              decoding="async"
                              className="h-full w-full object-cover" 
                              onError={(e) => {
                                if (!e.target.dataset.retried) {
                                  e.target.dataset.retried = "true";
                                  const match = person.candidatePhoto.match(/\/d\/([a-zA-Z0-9_-]+)/) || person.candidatePhoto.match(/id=([a-zA-Z0-9_-]+)/);
                                  if (match && match[1]) {
                                    e.target.src = `https://drive.google.com/uc?export=view&id=${match[1]}`;
                                  } else {
                                    e.target.src = person.candidatePhoto;
                                  }
                                }
                              }}
                            />
                          ) : (
                            <Megaphone size={18} className="text-slate-600" />
                          )}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">{person.name || "HR Updates"}</h3>
                          <p className="text-[11px] font-semibold text-slate-500">{person.designation || person.date}</p>
                        </div>
                      </div>
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-slate-500">
                        {person.smsType}
                      </div>
                    </div>

                    {/* Image (Instagram style) */}
                    {person.candidatePhoto && (
                      <div className="flex w-full justify-center bg-slate-50">
                        <img 
                          src={getDriveImageUrl(person.candidatePhoto, 600)} 
                          alt="Post" 
                          loading="lazy"
                          decoding="async"
                          className="w-full h-auto object-contain max-h-[500px]" 
                          onError={(e) => {
                            if (!e.target.dataset.retried) {
                              e.target.dataset.retried = "true";
                              const match = person.candidatePhoto.match(/\/d\/([a-zA-Z0-9_-]+)/) || person.candidatePhoto.match(/id=([a-zA-Z0-9_-]+)/);
                              if (match && match[1]) {
                                e.target.src = `https://drive.google.com/uc?export=view&id=${match[1]}`;
                              } else {
                                e.target.src = person.candidatePhoto;
                              }
                            }
                          }}
                        />
                      </div>
                    )}

                    {/* Caption / Message */}
                    <div className="px-4 pt-3 pb-2">
                      <p className="whitespace-pre-wrap text-[13px] font-medium leading-relaxed text-slate-700">
                        {person.name && <span className="mr-2 font-bold text-slate-900">{person.name}</span>}
                        {person.sms}
                      </p>
                      <p className="text-[10px] font-semibold text-slate-400 mt-2 uppercase tracking-wide">{person.date}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-[24px] bg-white p-8 text-center shadow-[0_14px_30px_rgba(15,23,42,0.07)]">
              <p className="text-sm font-bold text-slate-400">No new joiners recently.</p>
            </div>
          )}
        </section>
      </div>

      </div>
    </div>
  );
};

export default EmployeeMobileHome;
