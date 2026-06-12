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
  User
} from 'lucide-react';
import useAuthStore from '../store/authStore';

const ATTENDANCE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx_GRdhFbP5zQX_HV72t9Ofcj5IHurSBJnPC5o0yr6_HvkLkMs9hOSLHIP0e26uG1iDlA/exec';
const ATTENDANCE_SHEET_NAME = 'Data';
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
  const [calendarDate, setCalendarDate] = useState(new Date());

  const rawUser = localStorage.getItem('user');
  const user = rawUser ? JSON.parse(rawUser) : {};
  const employeeName = user?.Name || user?.name || user?.Username || 'Employee';

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

  useEffect(() => {
    if (!userRows.length) return;

    const currentMonthRows = userRows.filter((item) => {
      const date = parseAttendanceDate(item.date, item.month);
      return date && date.getMonth() === calendarDate.getMonth() && date.getFullYear() === calendarDate.getFullYear();
    });

    if (currentMonthRows.length) return;

    const latestDate = userRows
      .map((item) => parseAttendanceDate(item.date, item.month))
      .filter(Boolean)
      .sort((a, b) => b.getTime() - a.getTime())[0];

    if (latestDate) setCalendarDate(new Date(latestDate.getFullYear(), latestDate.getMonth(), 1));
  }, [userRows]);

  const monthRows = useMemo(() => userRows.filter((item) => {
    const date = parseAttendanceDate(item.date, item.month);
    return date && date.getMonth() === calendarDate.getMonth() && date.getFullYear() === calendarDate.getFullYear();
  }), [userRows, calendarDate]);

  const monthSummary = summarizeRows(monthRows);
  const rowsByDay = monthRows.reduce((days, item) => {
    const date = parseAttendanceDate(item.date, item.month);
    if (!date) return days;
    const day = date.getDate();
    if (!days[day]) days[day] = [];
    days[day].push(item);
    return days;
  }, {});

  const calendarStartDate = new Date(
    calendarDate.getFullYear(),
    calendarDate.getMonth(),
    1 - new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1).getDay()
  );
  const calendarCells = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(calendarStartDate);
    date.setDate(calendarStartDate.getDate() + index);
    return {
      key: `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
      day: date.getDate(),
      weekday: date.getDay(),
      isCurrentMonth: date.getMonth() === calendarDate.getMonth(),
      isToday: date.toDateString() === new Date().toDateString(),
    };
  });

  const latestAttendanceRecord = [...userRows]
    .filter((item) => parseAttendanceDate(item.date, item.month))
    .sort((a, b) => parseAttendanceDate(b.date, b.month) - parseAttendanceDate(a.date, a.month))[0];

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('employeeId');
    logout();
    navigate('/login', { replace: true });
  };

  const shiftMonth = (direction) => {
    setCalendarDate((date) => new Date(date.getFullYear(), date.getMonth() + direction, 1));
  };

  const getDayClass = (cell) => {
    if (!cell.isCurrentMonth) return 'bg-transparent text-gray-400';

    const rows = rowsByDay[cell.day] || [];
    const summary = summarizeRows(rows);
    let statusClass = 'bg-white text-black';

    if (summary.late > 0) statusClass = 'half-day-dot text-black';
    else if (summary.present > 0) statusClass = 'bg-emerald-200 text-black';
    else if (summary.absent > 0) statusClass = 'bg-red-100 text-red-800';
    else if (summary.holiday > 0) statusClass = 'bg-violet-100 text-violet-800';
    else if (cell.weekday === 0) statusClass = 'bg-violet-100 text-violet-800';

    return `${statusClass} ${cell.isToday ? 'ring-2 ring-teal-500 ring-offset-2' : ''}`;
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
      <div className="sticky top-0 z-30 bg-[#006241] text-white shadow-md">
        <div className="flex h-16 items-center justify-between px-4">
          <button type="button" onClick={() => navigate('/employee-mobile')} aria-label="Open employee home">
            <Menu size={30} />
          </button>
          <p className="max-w-[170px] truncate text-base font-black uppercase">
            {employeeName}
          </p>
          <div className="flex items-center gap-4">
            <Search size={24} />
            <button type="button" onClick={handleLogout} className="relative" aria-label="Logout">
              <Bell size={22} />
              <span className="absolute -right-0.5 -top-1 h-2.5 w-2.5 rounded-full border border-white bg-red-500" />
            </button>
          </div>
        </div>
        <div className="bg-[#367f65] px-5 pb-12 pt-6">
          <p className="text-lg font-black">Hello, {employeeName.split(' ')[0] || 'Employee'} !</p>
          <p className="mt-2 text-xs font-semibold">Hope you are having a great day</p>
          <p className="mt-4 text-xs font-black">Employee Self Service</p>
          <div className="mt-2 h-1.5 w-28 rounded-full bg-white/40">
            <div className="h-full w-full rounded-full bg-emerald-200" />
          </div>
        </div>
      </div>

      <div className="-mt-6 px-5">
        <div className="grid grid-cols-3 gap-3 md:grid-cols-5">
          {quickActions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => navigate(action.path)}
              className="flex flex-col items-center justify-center rounded-2xl bg-white p-3 shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition hover:-translate-y-1 hover:shadow-lg"
              aria-label={action.label}
            >
              <div className={`mb-2 flex h-12 w-12 items-center justify-center rounded-full ${action.bg} ${action.color}`}>
                <action.icon size={24} />
              </div>
              <span className="text-center text-[10px] font-black uppercase tracking-wide text-slate-700">
                {action.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 pt-7">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-black">Calendar</h2>
            <button type="button" onClick={() => navigate('/my-attendance')} className="text-base font-semibold text-blue-600">
              Go to calendar
            </button>
          </div>

          <div className="rounded-lg bg-white p-4 shadow-[0_12px_25px_rgba(0,0,0,0.12)]">
            <div className="mb-4 flex items-start justify-between">
              <span className="text-sm font-medium">Late Count -{monthSummary.late}</span>
              <MoreVertical size={24} />
            </div>

            <div className="mb-5 flex items-center justify-center gap-6">
              <button type="button" onClick={() => shiftMonth(-1)} className="rounded-full p-1 text-gray-600">
                <ChevronLeft size={25} />
              </button>
              <div className="flex items-center gap-4 text-lg font-black">
                <span>{monthNames[calendarDate.getMonth()]}</span>
                <span>{calendarDate.getFullYear()}</span>
              </div>
              <button type="button" onClick={() => shiftMonth(1)} className="rounded-full p-1 text-gray-600">
                <ChevronRight size={25} />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-y-3">
              {weekDays.map((day) => (
                <div key={day} className="text-center text-xl font-medium">{day}</div>
              ))}
              {calendarCells.map((cell) => (
                <div key={cell.key} className="flex justify-center">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full text-base font-medium ${getDayClass(cell)}`}>
                    {cell.day}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-teal-500" />Today</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-200" />Present</span>
              <span className="inline-flex items-center gap-1.5"><span className="half-day-dot h-2 w-2 rounded-full" />Half Day</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-400" />Absent</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-violet-300" />Holiday</span>
            </div>

            {loading && <p className="mt-4 text-sm font-semibold text-gray-500">Loading attendance...</p>}
          </div>
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
