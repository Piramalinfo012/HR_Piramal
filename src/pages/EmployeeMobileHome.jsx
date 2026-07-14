import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  Gift,
  MessageCircle,
  Phone,
  Search,
  Sparkles,
  Play,
  Share2,
  ThumbsUp,
  X
} from 'lucide-react';
import { motion } from 'framer-motion';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';
import { useHrmsNotifications } from '../hooks/useHrmsNotifications';

const ATTENDANCE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx_GRdhFbP5zQX_HV72t9Ofcj5IHurSBJnPC5o0yr6_HvkLkMs9hOSLHIP0e26uG1iDlA/exec';
const ATTENDANCE_SHEET_NAME = 'Data';
const OUTSTATION_SCRIPT_URL = import.meta.env.VITE_OUTSTATION_SHEET_URL;
const FEED_REFRESH_INTERVAL_MS = 30000;
const FEED_CACHE_KEY = 'employee_mobile_feed_cache_v1';
const FEED_CACHE_TTL_MS = 10 * 60 * 1000;
const MOBILE_ATTENDANCE_CACHE_KEY = 'employee_mobile_latest_attendance_cache_v1';
const MOBILE_ATTENDANCE_CACHE_TTL_MS = 10 * 60 * 1000;
const MARK_ATTENDANCE_DATA_CACHE_KEY = 'mark_attendance_data_cache_v1';
const MARK_ATTENDANCE_CACHE_TTL_MS = 5 * 60 * 1000;
const CONTACTS_CACHE_KEY = 'employee_mobile_contacts_cache_v1';
const CONTACTS_CACHE_TTL_MS = 10 * 60 * 1000;
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

const readCachedObject = (key, maxAgeMs) => {
  try {
    const cached = JSON.parse(localStorage.getItem(key) || 'null');
    if (!cached || Date.now() - Number(cached.savedAt || 0) > maxAgeMs) return null;
    return cached.data || null;
  } catch {
    return null;
  }
};

const readInitialAttendanceRows = () => {
  const markAttendanceCache = readCachedObject(MARK_ATTENDANCE_DATA_CACHE_KEY, MARK_ATTENDANCE_CACHE_TTL_MS);
  if (Array.isArray(markAttendanceCache?.attendanceData) && markAttendanceCache.attendanceData.length) {
    return markAttendanceCache.attendanceData;
  }
  return readCachedList(MOBILE_ATTENDANCE_CACHE_KEY, MOBILE_ATTENDANCE_CACHE_TTL_MS);
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
  if (rawValue.includes('T') && rawValue.includes(':')) {
    const date = new Date(rawValue);
    if (!Number.isNaN(date.getTime())) return date;
  }

  const isoMatch = rawValue.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    return new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
  }

  const slashMatch = rawValue.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (slashMatch) {
    const first = Number(slashMatch[1]);
    const second = Number(slashMatch[2]);
    const year = slashMatch[3].length === 2 ? Number(`20${slashMatch[3]}`) : Number(slashMatch[3]);
    const hour = Number(slashMatch[4] || 0);
    const minute = Number(slashMatch[5] || 0);
    const secondPart = Number(slashMatch[6] || 0);
    const namedMonthIndex = getMonthIndex(monthName);

    if (namedMonthIndex !== -1) {
      if (second - 1 === namedMonthIndex) return new Date(year, second - 1, first, hour, minute, secondPart);
      if (first - 1 === namedMonthIndex) return new Date(year, first - 1, second, hour, minute, secondPart);
    }

    if (first > 12) return new Date(year, second - 1, first, hour, minute, secondPart);
    if (second > 12) return new Date(year, first - 1, second, hour, minute, secondPart);
    return new Date(year, second - 1, first, hour, minute, secondPart);
  }

  const date = new Date(rawValue);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatAttendanceDateValue = (value) => {
  const date = parseAttendanceDate(value);
  if (!date) return normalize(value);
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
};

const formatAttendanceTimeValue = (value) => {
  const date = parseAttendanceDate(value);
  if (date) return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  const rawValue = normalize(value);
  if (!rawValue) return '';
  if (rawValue.includes(':')) return rawValue.split(/\s+/).pop().substring(0, 5);
  return rawValue;
};

const attendanceDateKey = (date) => {
  if (!date) return '';
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
};

const buildOutstationAttendanceRows = (rawAttendance = []) => {
  const grouped = {};

  rawAttendance.forEach((entry) => {
    const employeeName = normalize(entry.personName || entry.employeeName || entry.name);
    if (!employeeName) return;

    const status = entry.inDate ? 'IN' : entry.outDate ? 'OUT' : normalize(entry.status).toUpperCase();
    const dateValue = entry.inDate || entry.outDate || entry.dateTime || entry.timestamp || entry.date || entry.time;
    const dateObj = parseAttendanceDate(dateValue);
    if (!dateObj) return;

    const key = `${employeeName.toLowerCase()}_${attendanceDateKey(dateObj)}`;
    if (!grouped[key]) {
      grouped[key] = {
        employeeName,
        dateObj,
        date: formatAttendanceDateValue(dateValue),
        month: monthNames[dateObj.getMonth()],
        year: String(dateObj.getFullYear()),
        day: dateObj.getDate(),
        inTime: '',
        outTime: '',
        status: '',
      };
    }

    if (status === 'IN') {
      grouped[key].inTime = formatAttendanceTimeValue(dateValue);
    }

    if (status === 'OUT') {
      grouped[key].outTime = formatAttendanceTimeValue(dateValue);
    }

    if (!grouped[key].status) {
      grouped[key].status = grouped[key].inTime || grouped[key].outTime ? 'PRESENT' : status;
    }
  });

  return Object.values(grouped)
    .map((item) => ({ ...item, status: item.inTime || item.outTime ? 'PRESENT' : item.status }))
    .sort((a, b) => b.dateObj - a.dateObj);
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

const getFeedNotificationId = (row, index) => {
  const date = row[0] || '';
  const sms = row[2] || '';
  const smsType = row[3] || 'Feed';
  const name = row[4] || '';
  const stableText = [date, smsType, name, sms].map(normalize).join('|');
  return `feed-${index + 2}-${stableText}`;
};

const getJoiningHeaderIndex = (headers, names, fallbackIndex = -1) => {
  const searchNames = names.map((name) => name.toLowerCase());
  const index = headers.findIndex((header) => {
    const value = header?.toString().trim().toLowerCase();
    return value && searchNames.some((name) => value === name || value.includes(name));
  });
  return index === -1 ? fallbackIndex : index;
};

const buildEmployeeContacts = (rawData = []) => {
  let headerRowIndex = -1;
  let headers = [];

  for (let index = 0; index < rawData.length; index += 1) {
    const row = rawData[index];
    if (!Array.isArray(row)) continue;

    const normalizedRow = row.map((cell) => cell?.toString().trim().toLowerCase());
    const idIndex = normalizedRow.findIndex((cell) =>
      cell && (cell === 'id' || cell.includes('joining id') || cell.includes('indent number'))
    );
    const nameIndex = normalizedRow.findIndex((cell) =>
      cell && (cell.includes('candidate name') || cell.includes('candiate name') || cell.includes('name as per aadhar'))
    );

    if (idIndex !== -1 && nameIndex !== -1) {
      headerRowIndex = index;
      headers = row.map((header) => header?.toString().trim());
      break;
    }
  }

  if (headerRowIndex === -1) return [];

  const idxId = getJoiningHeaderIndex(headers, ['Joining ID', 'Indent Number', 'Employee ID', 'ID'], 5);
  const idxName = getJoiningHeaderIndex(headers, ['Name As Per Aadhar', 'Candidate Name', 'Candiate Name', 'Employee Name'], 10);
  const idxDept = getJoiningHeaderIndex(headers, ['Department'], 2);
  const idxDesignation = getJoiningHeaderIndex(headers, ['Designation'], 14);
  const idxPhoto = getJoiningHeaderIndex(headers, ["Candidate's Photo", 'Candidate Photo', 'Photo', 'Profile Pic'], 18);
  const idxMobile = getJoiningHeaderIndex(headers, ['Contact No', 'Mobile No.', 'Mobile No', 'Phone'], 23);
  const idxStatus = getJoiningHeaderIndex(headers, ['Status'], 8);

  const uniqueContacts = new Map();

  rawData.slice(headerRowIndex + 1).forEach((row, index) => {
    if (!Array.isArray(row)) return;

    const name = normalize(row[idxName]);
    const mobileNo = normalize(row[idxMobile]);
    if (!name || !mobileNo) return;

    const key = `${name.toLowerCase()}-${mobileNo.replace(/\D/g, '')}`;
    if (uniqueContacts.has(key)) return;

    uniqueContacts.set(key, {
      id: normalize(row[idxId]) || key,
      name,
      mobileNo,
      department: normalize(row[idxDept]),
      designation: normalize(row[idxDesignation]),
      photo: normalize(row[idxPhoto]),
      status: normalize(row[idxStatus]),
      rowIndex: headerRowIndex + index + 2,
    });
  });

  return Array.from(uniqueContacts.values()).sort((a, b) => a.name.localeCompare(b.name));
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
  const location = useLocation();
  const { logout } = useAuthStore();
  const initialAttendanceData = useMemo(
    () => readInitialAttendanceRows(),
    []
  );
  const initialFeedData = useMemo(() => readCachedList(FEED_CACHE_KEY, FEED_CACHE_TTL_MS), []);
  const initialContacts = useMemo(() => readCachedList(CONTACTS_CACHE_KEY, CONTACTS_CACHE_TTL_MS), []);
  const [attendanceData, setAttendanceData] = useState(initialAttendanceData);
  const [loading, setLoading] = useState(initialAttendanceData.length === 0);
  const [newJoiners, setNewJoiners] = useState(initialFeedData);
  const [feedLoading, setFeedLoading] = useState(initialFeedData.length === 0);
  const [contacts, setContacts] = useState(initialContacts);
  const [contactsLoading, setContactsLoading] = useState(initialContacts.length === 0);
  const [showContacts, setShowContacts] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  const [now, setNow] = useState(() => new Date());
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const { notifications, notificationsLoading, unreadCount, markNotificationRead } = useHrmsNotifications({ showToast: true });

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

  const fetchContacts = async ({ silent = false } = {}) => {
    if (!import.meta.env.VITE_JOINING_SHEET_URL) {
      setContactsLoading(false);
      return;
    }

    try {
      if (!silent) setContactsLoading(true);
      const response = await fetch(`${import.meta.env.VITE_JOINING_SHEET_URL}?action=read&sheet=JOINING_FMS`);
      const result = await response.json();
      const rawData = Array.isArray(result?.data) ? result.data : [];
      const parsedContacts = buildEmployeeContacts(rawData);
      setContacts(parsedContacts);
      writeCachedList(CONTACTS_CACHE_KEY, parsedContacts);
    } catch (error) {
      console.error('Employee contacts fetch failed:', error);
      if (!silent) toast.error('Failed to load contacts');
    } finally {
      if (!silent) setContactsLoading(false);
    }
  };

  useEffect(() => {
    if (showContacts && contacts.length === 0) {
      fetchContacts();
    }
  }, [showContacts]);

  useEffect(() => {
    const feedId = new URLSearchParams(location.search).get('feed');
    if (!feedId || feedLoading) return undefined;

    const timer = window.setTimeout(() => {
      const targetElement = [...document.querySelectorAll('[data-feed-notification-id]')]
        .find((element) => element.dataset.feedNotificationId === feedId);

      if (!targetElement) return;
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      targetElement.classList.add('ring-4', 'ring-rose-200');
      window.setTimeout(() => {
        targetElement.classList.remove('ring-4', 'ring-rose-200');
      }, 2200);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [feedLoading, location.search, newJoiners.length]);

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
          const processed = raw.slice(1).map((row, index) => ({
            date: row[0] || "",
            candidatePhoto: row[1] || "",
            sms: row[2] || "",
            smsType: row[3] || "Announcement",
            name: row[4] || "",
            designation: row[5] || "",
            notificationId: getFeedNotificationId(row, index),
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
    let isMounted = true;

    const fetchLegacyAttendanceData = async () => {
      const response = await fetch(
        `${ATTENDANCE_SCRIPT_URL}?sheet=${encodeURIComponent(ATTENDANCE_SHEET_NAME)}&action=fetch&range=A:F`
      );
      const result = await response.json();
      const rawData = result.data || result;

      if (!Array.isArray(rawData)) return [];

      const headers = rawData[0] || [];
      const rows = rawData.slice(1);
      const getIndex = (headerName) =>
        headers.findIndex((header) => normalize(header).toLowerCase() === headerName.toLowerCase());

      return rows.map((row) => ({
        date: row[getIndex('Date')] || '',
        employeeName: row[getIndex('Employee Name')] || '',
        inTime: row[getIndex('In Time')] || '',
        outTime: row[getIndex('Out Time')] || '',
        status: row[getIndex('Status')] || '',
        month: row[getIndex('Month')] || '',
      })).filter((item) => item.date || item.employeeName || item.status);
    };

    const fetchAttendanceData = async () => {
      try {
        let processedRows = [];

        if (OUTSTATION_SCRIPT_URL) {
          const response = await fetch(`${OUTSTATION_SCRIPT_URL}?action=getAllData&ts=${Date.now()}`, {
            cache: 'no-store',
          });
          if (!response.ok) throw new Error(`Outstation attendance HTTP error! status: ${response.status}`);
          const result = await response.json();
          if (result.status !== 'success') throw new Error(result.message || 'Outstation attendance fetch failed');
          processedRows = buildOutstationAttendanceRows(result.attendance || []);
        }

        if (!processedRows.length) {
          processedRows = await fetchLegacyAttendanceData();
        }

        writeCachedList(MOBILE_ATTENDANCE_CACHE_KEY, processedRows);
        if (isMounted) React.startTransition(() => setAttendanceData(processedRows));
      } catch (error) {
        console.error('Employee mobile attendance fetch failed:', error);
        try {
          const fallbackRows = await fetchLegacyAttendanceData();
          if (fallbackRows.length) {
            writeCachedList(MOBILE_ATTENDANCE_CACHE_KEY, fallbackRows);
            if (isMounted) React.startTransition(() => setAttendanceData(fallbackRows));
          }
        } catch (fallbackError) {
          console.error('Employee mobile legacy attendance fetch failed:', fallbackError);
          if (isMounted) setAttendanceData((current) => (current.length ? current : []));
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchAttendanceData();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') fetchAttendanceData();
    };

    window.addEventListener('focus', fetchAttendanceData);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      window.removeEventListener('focus', fetchAttendanceData);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const userRows = useMemo(() => {
    const userName = normalize(employeeName).toLowerCase();
    return attendanceData.filter((item) =>
      normalize(item.employeeName).toLowerCase() === userName ||
      normalize(item.employeeName).toLowerCase().includes(userName)
    );
  }, [attendanceData, employeeName]);

  const todayAttendanceRecord = useMemo(() => {
    const todayKey = attendanceDateKey(now);
    return userRows
      .map((item) => ({ ...item, _dateObj: parseAttendanceDate(item.date, item.month) }))
      .filter((item) => item._dateObj && attendanceDateKey(item._dateObj) === todayKey)
      .sort((a, b) => b._dateObj - a._dateObj)[0];
  }, [userRows, now]);

  const currentMonthRows = useMemo(() => {
    return userRows.filter((item) => {
      const date = parseAttendanceDate(item.date, item.month);
      return date && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    });
  }, [userRows, now]);

  const monthSummary = useMemo(() => summarizeRows(currentMonthRows), [currentMonthRows]);
  const firstName = employeeName.split(' ')[0] || 'Employee';
  const greetingLabel = useMemo(() => {
    const hour = now.getHours();
    if (hour >= 5 && hour < 12) return 'Good Morning';
    if (hour >= 12 && hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, [now]);
  const currentTime = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const currentDate = now.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long' });
  const attendanceCardRecord = todayAttendanceRecord || null;
  const attendanceStatusLabel = attendanceCardRecord?.inTime
    ? attendanceCardRecord?.outTime
      ? 'Checked Out'
      : 'Checked In'
    : 'Not Checked In';
  const attendanceActionLabel = attendanceCardRecord?.inTime && !attendanceCardRecord?.outTime ? 'Check Out' : 'Check In';
  const dayGoalHours = 8;
  const latestWorkingDuration = formatWorkingDuration(attendanceCardRecord?.inTime, attendanceCardRecord?.outTime);
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

  const handleNotificationClick = (item) => {
    markNotificationRead(item.id);
    if (item.targetPath) {
      setShowNotificationMenu(false);
      navigate(item.targetPath);
    }
  };

  const filteredContacts = useMemo(() => {
    const query = contactSearch.trim().toLowerCase();
    if (!query) return contacts;

    return contacts.filter((contact) =>
      contact.name.toLowerCase().includes(query) ||
      contact.mobileNo.toLowerCase().includes(query) ||
      contact.designation.toLowerCase().includes(query) ||
      contact.department.toLowerCase().includes(query)
    );
  }, [contacts, contactSearch]);

  const handleQuickAction = (action) => {
    if (action.id === 'contacts') {
      return;
    }
    if (action.externalUrl) {
      window.open(action.externalUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    navigate(action.path);
  };

  const quickActions = [
    { icon: Wallet, label: 'New System Development', externalUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSfbs_I-HzZT2miZUS6Aacvu6qd5vxkkD12Of_QjOKEnEZkphg/viewform?usp=header', path: '/employee-mobile', iconClass: 'bg-emerald-50 text-emerald-700 ring-emerald-100' },
    { icon: ClipboardList, label: 'HR Records', path: '/my-attendance', iconClass: 'bg-indigo-50 text-indigo-700 ring-indigo-100' },
    { icon: Fingerprint, label: 'Mark Attendance', path: '/mark-attendance', iconClass: 'bg-blue-50 text-blue-700 ring-blue-100' },
    { icon: FileText, label: 'Leave Request', path: '/leave-request', iconClass: 'bg-rose-50 text-rose-700 ring-rose-100' },
    { icon: CalendarDays, label: 'Leave History', path: '/leave-management', iconClass: 'bg-slate-100 text-slate-700 ring-slate-200' },
    { icon: User, label: 'My Profile', path: '/employee-profile', iconClass: 'bg-amber-50 text-amber-700 ring-amber-100' },
    { icon: Briefcase, label: 'Alteration Form', externalUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSewFXJwJjtXErhqO_PoCLqIi-eH7i3Qau94LcnARJsgiwf2Lw/viewform?usp=publish-editor', path: '/employee-mobile', iconClass: 'bg-orange-50 text-orange-700 ring-orange-100' },
    { id: 'contacts', icon: Users, label: 'All Contacts', path: '/employee-mobile', iconClass: 'bg-cyan-50 text-cyan-700 ring-cyan-100' },
  ];

  return (
    <div className="min-h-screen bg-[#f4f7fb] pb-24 text-slate-950 lg:bg-[#f0f2f5] lg:pb-10">
      <div className="mx-auto max-w-md px-4 pt-5 lg:max-w-[1480px] lg:px-8 lg:pt-8">
        <header className="hidden">
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
            <button
              type="button"
              onClick={() => setShowNotificationMenu((visible) => !visible)}
              className="relative grid h-10 w-10 place-items-center rounded-2xl bg-white text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.08)]"
              aria-label="Notifications"
            >
              <Bell size={18} />
              {unreadCount > 0 ? (
                <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white ring-2 ring-white">
                  {unreadCount}
                </span>
              ) : null}
            </button>
            <button type="button" onClick={handleLogout} className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.08)]" aria-label="Logout">
              <LogOut size={18} />
            </button>
          </div>

          {showNotificationMenu ? (
            <div className="absolute right-0 top-14 z-40 w-[min(340px,calc(100vw-32px))] overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_24px_54px_rgba(15,23,42,0.18)]">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <div>
                  <p className="text-sm font-black text-slate-950">Notifications</p>
                  <p className="text-[11px] font-bold text-slate-400">Birthdays, anniversaries and feed updates</p>
                </div>
                <span className="grid h-9 w-9 place-items-center rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-rose-100">
                  <Gift size={18} />
                </span>
              </div>
              <div className="max-h-80 overflow-y-auto p-3">
                {notificationsLoading ? (
                  <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">Checking notifications...</p>
                ) : notifications.length > 0 ? (
                  <div className="space-y-2">
                    {notifications.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleNotificationClick(item)}
                        className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left transition ${
                          item.read
                            ? 'bg-white ring-1 ring-slate-100 hover:bg-slate-50'
                            : 'bg-rose-50/70 ring-1 ring-rose-100 hover:bg-rose-50'
                        }`}
                      >
                        <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white text-rose-600 ring-1 ring-rose-100">
                          {item.photo ? (
                            <img src={getDriveImageUrl(item.photo, 120)} alt={item.title} className="h-full w-full object-cover" />
                          ) : (
                            <Gift size={20} />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            {!item.read ? <span className="h-2 w-2 shrink-0 rounded-full bg-rose-500" /> : null}
                            <span className="block truncate text-sm font-black text-slate-900">{item.title}</span>
                          </span>
                          <span className="block truncate text-[11px] font-bold text-slate-500">
                            {item.message}
                          </span>
                          {item.dateLabel ? (
                            <span className="mt-0.5 block text-[10px] font-black uppercase tracking-wide text-rose-500">{item.dateLabel}</span>
                          ) : null}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">No notifications right now.</p>
                )}
              </div>
            </div>
          ) : null}
        </header>

        <div className="mt-5 space-y-6 lg:grid lg:grid-cols-[320px_minmax(0,680px)_360px] lg:items-start lg:gap-6 lg:space-y-0">
        <div className="lg:sticky lg:top-20 lg:col-start-3 lg:row-start-1 lg:-mt-2 lg:space-y-5">
        <motion.section
          className="relative overflow-hidden rounded-[28px] bg-slate-950 p-4 text-white shadow-[0_24px_48px_rgba(15,23,42,0.24)] lg:min-h-0 lg:rounded-[24px] lg:p-5"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <span className="pointer-events-none absolute -right-20 -top-16 h-44 w-44 rounded-full bg-indigo-500/20 blur-2xl" />
          <span className="pointer-events-none absolute -bottom-20 left-10 h-44 w-44 rounded-full bg-cyan-400/10 blur-2xl" />
          <div className="relative z-10 flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Attendance Overview</p>
              <h1 className="mt-1 text-xl font-black leading-tight">{greetingLabel}, {firstName}</h1>
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
                  <p className="mt-1 text-xs font-black text-white">{formatTime(attendanceCardRecord?.inTime)}</p>
                </div>
                <div>
                  <p>Check Out</p>
                  <p className="mt-1 text-xs font-black text-white">{formatTime(attendanceCardRecord?.outTime)}</p>
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
              {attendanceActionLabel}
            </span>
            <Play size={16} fill="currentColor" />
          </button>
        </motion.section>

        <section className="mt-6 lg:mt-0">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-slate-950">Quick Actions</h2>
            <button type="button" onClick={() => navigate('/my-attendance')} className="text-xs font-black text-indigo-600">
              View all
            </button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 lg:gap-4">
            {quickActions.map((action, idx) => (
              <motion.button
                key={action.label}
                type="button"
                onClick={() => handleQuickAction(action)}
                className="flex h-[62px] items-center justify-between rounded-2xl border border-slate-200/80 bg-white px-3 text-left shadow-[0_14px_30px_rgba(15,23,42,0.07)] active:scale-[0.98] lg:h-[76px] lg:px-4"
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
        </div>

        <div className="mt-6 space-y-6 lg:contents">
          <section className="lg:sticky lg:top-24 lg:col-start-1 lg:row-start-1">
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
                      {attendanceCardRecord ? `${formatTime(attendanceCardRecord.inTime)} - ${formatTime(attendanceCardRecord.outTime)}` : 'No attendance record yet'}
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
        <section className="mt-2 lg:col-start-2 lg:row-start-1 lg:mt-0">
          <div className="mb-3 flex items-center justify-between lg:mx-auto lg:max-w-[680px]">
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
                className="flex w-full gap-4 overflow-x-auto pb-2 lg:mx-auto lg:max-w-[680px] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
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
              <div className="mt-4 flex flex-col gap-6 lg:mx-auto lg:max-w-[680px] lg:gap-5">
                {newJoiners.slice(0, 10).map((person, idx) => (
                  <motion.div 
                    key={`feed-${idx}`}
                    data-feed-notification-id={person.notificationId}
                    className="relative overflow-hidden rounded-[24px] border border-slate-200/80 bg-white pb-2 shadow-[0_14px_30px_rgba(15,23,42,0.07)] transition-all lg:rounded-[18px] lg:pb-0 lg:shadow-[0_12px_28px_rgba(15,23,42,0.08)]"
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + idx * 0.1 }}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 pb-3 lg:px-4 lg:py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 lg:rounded-full">
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

                    {/* Image */}
                    {person.candidatePhoto && (
                      <div className="flex w-full justify-center bg-slate-50 lg:border-y lg:border-slate-100 lg:bg-slate-100">
                        <img 
                          src={getDriveImageUrl(person.candidatePhoto, 600)} 
                          alt="Post" 
                          loading="lazy"
                          decoding="async"
                          className="h-auto w-full object-contain max-h-[500px] lg:max-h-[620px]" 
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
                    <div className="px-4 pt-3 pb-2 lg:pb-3">
                      <p className="whitespace-pre-wrap text-[13px] font-medium leading-relaxed text-slate-700">
                        {person.name && <span className="mr-2 font-bold text-slate-900">{person.name}</span>}
                        {person.sms}
                      </p>
                      <p className="text-[10px] font-semibold text-slate-400 mt-2 uppercase tracking-wide">{person.date}</p>
                    </div>
                    <div className="hidden border-t border-slate-100 px-2 py-1.5 lg:flex">
                      {[
                        { icon: ThumbsUp, label: 'Like' },
                        { icon: MessageCircle, label: 'Comment' },
                        { icon: Share2, label: 'Share' },
                      ].map((action) => (
                        <button
                          key={action.label}
                          type="button"
                          className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg text-sm font-black text-slate-500 transition hover:bg-slate-50"
                        >
                          <action.icon size={17} />
                          {action.label}
                        </button>
                      ))}
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

      {showContacts && (
        <div className="fixed inset-0 z-[140] flex items-end justify-center bg-slate-950/55 p-4 pb-24 backdrop-blur-sm lg:items-center lg:pb-4">
          <motion.div
            initial={{ opacity: 0, y: 22, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="w-full max-w-md overflow-hidden rounded-[30px] bg-white shadow-[0_28px_70px_rgba(15,23,42,0.28)] lg:max-w-xl"
          >
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-500">Directory</p>
                  <h3 className="text-xl font-black text-slate-950">All Contacts</h3>
                  <p className="mt-1 text-xs font-bold text-slate-400">{contacts.length} employee contacts</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowContacts(false)}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-slate-50 text-slate-500"
                  aria-label="Close contacts"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="relative mt-4">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={contactSearch}
                  onChange={(event) => setContactSearch(event.target.value)}
                  placeholder="Search name or number..."
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-bold text-slate-800 outline-none focus:border-cyan-500 focus:bg-white focus:ring-4 focus:ring-cyan-100"
                />
              </div>
            </div>

            <div className="max-h-[58dvh] space-y-3 overflow-y-auto p-4">
              {contactsLoading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-100 border-t-cyan-600" />
                </div>
              ) : filteredContacts.length > 0 ? (
                filteredContacts.map((contact) => (
                  <div
                    key={`${contact.id}-${contact.mobileNo}`}
                    className="flex items-center gap-3 rounded-[22px] border border-slate-200 bg-white p-3 shadow-[0_10px_24px_rgba(15,23,42,0.06)]"
                  >
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-cyan-50 ring-1 ring-cyan-100">
                      {contact.photo ? (
                        <img
                          src={getDriveImageUrl(contact.photo, 160)}
                          alt={contact.name}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover"
                          onError={(event) => {
                            if (!event.target.dataset.retried) {
                              event.target.dataset.retried = "true";
                              const match = contact.photo.match(/\/d\/([a-zA-Z0-9_-]+)/) || contact.photo.match(/id=([a-zA-Z0-9_-]+)/);
                              event.target.src = match && match[1] ? `https://drive.google.com/uc?export=view&id=${match[1]}` : contact.photo;
                            }
                          }}
                        />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-lg font-black text-cyan-700">
                          {contact.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate text-sm font-black text-slate-950">{contact.name}</h4>
                      <p className="mt-0.5 truncate text-[11px] font-bold text-slate-500">
                        {contact.designation || contact.department || 'Employee'}
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 text-xs font-black text-cyan-700">
                        <Phone size={13} />
                        {contact.mobileNo}
                      </p>
                    </div>
                    <a
                      href={`tel:${contact.mobileNo.replace(/\s+/g, '')}`}
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100"
                      aria-label={`Call ${contact.name}`}
                    >
                      <Phone size={17} />
                    </a>
                  </div>
                ))
              ) : (
                <div className="rounded-3xl bg-slate-50 p-8 text-center">
                  <p className="text-sm font-black text-slate-500">No contacts found.</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      </div>

      </div>
    </div>
  );
};

export default EmployeeMobileHome;
