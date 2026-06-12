import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  HandHeart,
  Menu,
  MoreVertical,
  Search,
  Clock,
  FileText,
  User,
  Megaphone,
  LogOut,
  Camera
} from 'lucide-react';
import { motion } from 'framer-motion';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';

const ATTENDANCE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx_GRdhFbP5zQX_HV72t9Ofcj5IHurSBJnPC5o0yr6_HvkLkMs9hOSLHIP0e26uG1iDlA/exec';
const ATTENDANCE_SHEET_NAME = 'Data';
const FEED_REFRESH_INTERVAL_MS = 30000;
const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const normalize = (value) => (value || '').toString().trim();

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
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newJoiners, setNewJoiners] = useState([]);
  const [feedLoading, setFeedLoading] = useState(true);

  const rawUser = localStorage.getItem('user');
  const user = rawUser ? JSON.parse(rawUser) : {};
  const employeeName = user?.Name || user?.name || user?.Username || 'Employee';

  const [profilePic, setProfilePic] = useState(user?.profilePic || "");
  const [uploadingPic, setUploadingPic] = useState(false);
  const fileInputRef = React.useRef(null);

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

    const fetchJoiners = async ({ silent = false } = {}) => {
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
          
          setNewJoiners(processed.reverse());
        } else {
          setNewJoiners([]);
        }
      } catch (e) {
        console.error("Failed to fetch feed:", e);
      } finally {
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

    fetchJoiners();

    const intervalId = window.setInterval(refreshFeed, FEED_REFRESH_INTERVAL_MS);
    window.addEventListener('focus', refreshFeed);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshFeed);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

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

        setAttendanceData(processedRows);
      } catch (error) {
        console.error('Employee mobile attendance fetch failed:', error);
        setAttendanceData([]);
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

  const latestAttendanceRecord = [...userRows]
    .filter((item) => parseAttendanceDate(item.date, item.month))
    .sort((a, b) => parseAttendanceDate(b.date, b.month) - parseAttendanceDate(a.date, a.month))[0];

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('employeeId');
    logout();
    navigate('/login', { replace: true });
  };

  const quickActions = [
    { icon: Clock, label: 'Mark Attendance', path: '/mark-attendance', color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { icon: CalendarDays, label: 'My Attendance', path: '/my-attendance', color: 'text-blue-600', bg: 'bg-blue-100' },
    { icon: HandHeart, label: 'Leave Request', path: '/leave-request', color: 'text-rose-600', bg: 'bg-rose-100' },
    { icon: FileText, label: 'Leave Management', path: '/leave-management', color: 'text-purple-600', bg: 'bg-purple-100' },
    { icon: User, label: 'Profile', path: '/employee-profile', color: 'text-amber-600', bg: 'bg-amber-100' },
  ];

  const leaveBalances = [
    { value: '10.5', label: 'Provisiona...' },
    { value: '7', label: 'Wedding L...' },
    { value: '3', label: 'Medical L...' },
    { value: '2', label: 'Short Leave' },
    { value: '0.5', label: 'Birthday L...' },
    { value: '0.5', label: 'Marriage ...' },
  ];

  return (
    <div className="min-h-screen bg-[#f7f7f4] pb-20 text-black">
      <div className="sticky top-0 z-30 bg-[#006241] text-white shadow-md md:hidden">
        <div className="flex h-16 items-center justify-between px-4">
          <button type="button" onClick={() => navigate('/employee-mobile')} aria-label="Open employee home">
            <Menu size={30} />
          </button>
          <p className="max-w-[170px] truncate text-base font-black uppercase">
            {employeeName}
          </p>
          <div className="flex items-center gap-4">
            <Search size={22} />
            <button type="button" className="relative" aria-label="Notifications">
              <Bell size={22} />
              <span className="absolute -right-0.5 -top-1 h-2.5 w-2.5 rounded-full border border-[#006241] bg-red-500" />
            </button>
            <button type="button" onClick={handleLogout} className="text-white hover:text-red-200" aria-label="Logout">
              <LogOut size={22} />
            </button>
          </div>
        </div>
      </div>
      <div className="bg-[#367f65] px-5 pb-6 pt-6 rounded-b-[30px] shadow-sm text-white relative z-20 flex justify-between items-center">
        <div>
          <p className="text-lg font-black">Hello, {employeeName.split(' ')[0] || 'Employee'} !</p>
          <p className="mt-2 text-xs font-semibold">Hope you are having a great day</p>
          <p className="mt-4 text-xs font-black">Employee Self Service</p>
          <div className="mt-2 h-1.5 w-28 rounded-full bg-white/40">
            <div className="h-full w-full rounded-full bg-emerald-200" />
          </div>
        </div>
        
        <div className="relative group cursor-pointer" onClick={() => !uploadingPic && fileInputRef.current?.click()}>
          <div className="h-20 w-20 rounded-full border-[3px] border-emerald-400/50 bg-white/10 overflow-hidden shadow-lg backdrop-blur flex justify-center items-center">
            {uploadingPic ? (
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : profilePic ? (
              <img 
                src={getDriveImageUrl(profilePic, 150)} 
                alt="Profile" 
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
              <User size={36} className="text-emerald-100" />
            )}
          </div>
          <div className="absolute bottom-0 right-0 rounded-full bg-indigo-500 p-1.5 shadow-md border-2 border-[#367f65]">
            <Camera size={12} className="text-white" />
          </div>
          <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleProfilePicUpload} />
        </div>
      </div>

      <div className="relative z-10 pt-4">
        <motion.div 
          className="flex w-full snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-6 pt-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          {quickActions.map((action, idx) => (
            <motion.button
              key={action.label}
              type="button"
              onClick={() => navigate(action.path)}
              className="flex min-w-[110px] shrink-0 snap-center flex-col items-center justify-center rounded-[24px] bg-white p-4 shadow-[0_12px_30px_rgba(0,0,0,0.08)] transition-all hover:-translate-y-1 hover:shadow-xl active:scale-95"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1, duration: 0.3 }}
              aria-label={action.label}
            >
              <div className={`mb-3 flex h-14 w-14 items-center justify-center rounded-2xl ${action.bg} ${action.color} shadow-sm`}>
                <action.icon size={26} strokeWidth={2.5} />
              </div>
              <span className="text-center text-[10px] font-black uppercase leading-tight tracking-widest text-slate-700">
                {action.label.split(' ').map((word, i) => (
                  <React.Fragment key={i}>
                    {word}
                    {i < action.label.split(' ').length - 1 && <br />}
                  </React.Fragment>
                ))}
              </span>
            </motion.button>
          ))}
        </motion.div>
      </div>

      <div className="px-5 pt-7">
        <section className="mt-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-black">Welcome Aboard 🚀</h2>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
              {newJoiners.length} New
            </span>
          </div>
          
          {feedLoading ? (
            <div className="flex h-32 items-center justify-center rounded-[24px] bg-white shadow-sm">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600"></div>
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
                    <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-[3px] border-emerald-500 bg-white p-[2px] shadow-sm">
                      {person.candidatePhoto ? (
                        <img 
                          src={getDriveImageUrl(person.candidatePhoto, 200)} 
                          alt="Story" 
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
                        <div className="flex h-full w-full items-center justify-center rounded-full bg-emerald-100">
                          <Megaphone size={24} className="text-emerald-500" />
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
                    className="relative overflow-hidden bg-white shadow-sm border-y border-slate-200/60 pb-2"
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + idx * 0.1 }}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-100 border border-emerald-200">
                          {person.candidatePhoto ? (
                            <img 
                              src={getDriveImageUrl(person.candidatePhoto, 150)} 
                              alt="Profile" 
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
                            <Megaphone size={18} className="text-emerald-500" />
                          )}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-800">{person.name || "HR Updates"}</h3>
                          <p className="text-[11px] font-semibold text-slate-500">{person.designation || person.date}</p>
                        </div>
                      </div>
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-indigo-600">
                        {person.smsType}
                      </div>
                    </div>

                    {/* Image (Instagram style) */}
                    {person.candidatePhoto && (
                      <div className="w-full bg-slate-50 flex justify-center">
                        <img 
                          src={getDriveImageUrl(person.candidatePhoto, 800)} 
                          alt="Post" 
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
                      <p className="text-[13px] font-medium text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {person.name && <span className="font-bold text-slate-900 mr-2">{person.name}</span>}
                        {person.sms}
                      </p>
                      <p className="text-[10px] font-semibold text-slate-400 mt-2 uppercase tracking-wide">{person.date}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-[24px] bg-white p-8 text-center shadow-sm">
              <p className="text-sm font-bold text-slate-400">No new joiners recently.</p>
            </div>
          )}
        </section>

        <section className="mt-7">
          <h2 className="text-xl font-black">Leave balance</h2>
          <div className="mt-3 rounded-lg bg-white p-5 shadow-[0_12px_25px_rgba(0,0,0,0.12)]">
            <div className="grid grid-cols-3 gap-y-5 divide-x divide-gray-200">
              {leaveBalances.map((leave) => (
                <div key={`${leave.value}-${leave.label}`} className="px-2">
                  <p className="text-2xl font-black">{leave.value}</p>
                  <p className="mt-2 truncate text-base text-slate-800">{leave.label}</p>
                </div>
              ))}
            </div>
            <div className="mt-7 flex items-center justify-between">
              <button
                type="button"
                onClick={() => navigate('/leave-request')}
                className="rounded-md border border-red-400 px-6 py-2.5 text-base font-black text-red-500 shadow-sm"
              >
                Apply Leave
              </button>
              <button type="button" className="text-sm font-bold text-[#006241]">View less</button>
            </div>
          </div>
        </section>

        <section className="mt-7">
          <h2 className="text-xl font-black">Latest attendance</h2>
          <div className="mt-3 grid grid-cols-[1fr_1px_1fr] items-center rounded-lg bg-white p-5 shadow-[0_12px_25px_rgba(0,0,0,0.12)]">
            <div>
              <p className="text-xl font-medium">
                {formatWorkingDuration(latestAttendanceRecord?.inTime, latestAttendanceRecord?.outTime)}
              </p>
              <p className="mt-2 text-base text-slate-700">Total working hours</p>
            </div>
            <div className="h-14 bg-gray-200" />
            <div className="grid grid-cols-2 gap-3 text-center">
              <div>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-slate-600">In-time</span>
                <p className="mt-2 text-base">{formatTime(latestAttendanceRecord?.inTime)}</p>
              </div>
              <div>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-slate-600">Out-time</span>
                <p className="mt-2 text-base">{formatTime(latestAttendanceRecord?.outTime)}</p>
              </div>
            </div>
          </div>
        </section>
      </div>

    </div>
  );
};

export default EmployeeMobileHome;
