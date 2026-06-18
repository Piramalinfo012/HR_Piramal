import React, { useEffect, useState } from 'react';
import { Search, Download, X, Filter, User, ChevronDown, CalendarDays, Table2, ChevronLeft, ChevronRight, MoreVertical, CheckCircle2, XCircle, Clock, Coffee, AlertCircle, TrendingUp, MapPin, ExternalLink } from 'lucide-react';
import * as XLSX from 'xlsx';

const OUTSTATION_SCRIPT_URL = import.meta.env.VITE_OUTSTATION_SHEET_URL;
const LEAVE_API_URL = import.meta.env.VITE_LEAVE_REQUEST_SHEET_URL;
const LEAVE_SHEET_NAME = 'FMS';
const LEAVE_DATA_START_INDEX = 6;

const OutstationAttendance = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [attendanceView, setAttendanceView] = useState('calendar');
  const [selectedCalendarDay, setSelectedCalendarDay] = useState(null);
  const [attendanceData, setAttendanceData] = useState([]);
  const [leaveData, setLeaveData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const monthOrder = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const formatDateValue = (value) => {
    if (!value) return '';
    const raw = value.toString().trim();
    if (!raw) return '';
    if (raw.includes('T') && raw.includes(':')) {
      const parsed = new Date(raw);
      if (!isNaN(parsed.getTime())) {
        const d = String(parsed.getDate()).padStart(2, '0');
        const m = String(parsed.getMonth() + 1).padStart(2, '0');
        return `${d}/${m}/${parsed.getFullYear()}`;
      }
    }
    if (/^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(raw)) return raw;
    const isoMatch = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) return `${isoMatch[3].padStart(2, '0')}/${isoMatch[2].padStart(2, '0')}/${isoMatch[1]}`;
    return raw;
  };

  const parseDateToObj = (value) => {
    if (!value) return null;
    const raw = value.toString().trim();
    if (raw.includes('T') && raw.includes(':')) {
      const d = new Date(raw);
      return isNaN(d.getTime()) ? null : d;
    }
    const isoMatch = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) return new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
    const slashMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (slashMatch) {
      const y = slashMatch[3].length === 2 ? Number(`20${slashMatch[3]}`) : Number(slashMatch[3]);
      return new Date(y, Number(slashMatch[2]) - 1, Number(slashMatch[1]));
    }
    return null;
  };

  const getDateKey = (date) =>
    date ? `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}` : '';

  const normalizeName = (value) => (value || '').toString().trim().toLowerCase();

  const getLeaveDateKeys = (fromDate, toDate) => {
    const startDate = parseDateToObj(fromDate);
    const endDate = parseDateToObj(toDate || fromDate);
    if (!startDate || !endDate) return [];

    const start = startDate <= endDate ? new Date(startDate) : new Date(endDate);
    const end = startDate <= endDate ? new Date(endDate) : new Date(startDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    const dateKeys = [];
    for (const date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      dateKeys.push(getDateKey(date));
    }
    return dateKeys;
  };

  const normalizeLeaveRows = (rows = []) =>
    rows
      .slice(LEAVE_DATA_START_INDEX)
      .map((row) => ({
        employeeName: (row[2] || '').toString().trim(),
        dateKeys: getLeaveDateKeys(row[6], row[7]),
      }))
      .filter((leave) => leave.employeeName && leave.dateKeys.length > 0);

  const formatTimeValue = (value) => {
    if (!value) return '-';
    const raw = value.toString().trim();
    if (!raw) return '-';
    if (raw.includes('T') && raw.includes(':')) {
      const parsed = new Date(raw);
      if (!isNaN(parsed.getTime())) {
        return `${String(parsed.getHours()).padStart(2, '0')}:${String(parsed.getMinutes()).padStart(2, '0')}`;
      }
    }
    if (raw.includes('/') && raw.includes(':')) {
      const parts = raw.split(' ');
      if (parts.length >= 2) return parts[1].substring(0, 5);
    }
    return raw;
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${OUTSTATION_SCRIPT_URL}?action=getAllData`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      if (result.status !== 'success') throw new Error(result.message || 'Failed to fetch data');

      const rawAttendance = result.attendance || [];
      const rawLeaves = LEAVE_API_URL
        ? await fetch(`${LEAVE_API_URL}?sheet=${encodeURIComponent(LEAVE_SHEET_NAME)}&action=fetch`)
          .then(async (leaveResponse) => {
            if (!leaveResponse.ok) throw new Error(`Leave HTTP error! status: ${leaveResponse.status}`);
            const leaveResult = await leaveResponse.json();
            if (!leaveResult.success) throw new Error(leaveResult.error || 'Failed to fetch leave data');
            return Array.isArray(leaveResult.data || leaveResult) ? (leaveResult.data || leaveResult) : [];
          })
          .catch((leaveError) => {
            console.warn('Leave data skipped for absent calculation:', leaveError);
            return [];
          })
        : [];

      // Group IN/OUT entries by person + date
      const grouped = {};
      rawAttendance.forEach((entry) => {
        const name = (entry.personName || '').toString().trim();
        if (!name) return;
        const dateObj = parseDateToObj(entry.dateTime);
        if (!dateObj) return;
        const dateKey = `${dateObj.getFullYear()}-${dateObj.getMonth()}-${dateObj.getDate()}`;
        const key = `${name}_${dateKey}`;

        if (!grouped[key]) {
          grouped[key] = {
            employeeName: name,
            dateObj: dateObj,
            date: formatDateValue(entry.dateTime),
            month: monthOrder[dateObj.getMonth()],
            year: String(dateObj.getFullYear()),
            day: dateObj.getDate(),
            inTime: '',
            outTime: '',
            status: 'P',
            mapLink: '',
            address: '',
          };
        }

        if (entry.inDate) {
          grouped[key].inTime = formatTimeValue(entry.inDate);
          if (entry.mapLink) grouped[key].mapLink = entry.mapLink;
          if (entry.address) grouped[key].address = entry.address;
        }
        if (entry.outDate) {
          grouped[key].outTime = formatTimeValue(entry.outDate);
        }
      });

      const processed = Object.values(grouped);
      processed.sort((a, b) => b.dateObj - a.dateObj);
      setAttendanceData(processed);
      setLeaveData(normalizeLeaveRows(rawLeaves));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const employeeOptions = [...new Set(attendanceData.map((i) => i.employeeName).filter(Boolean))].sort();
  const monthOptions = [...new Set(attendanceData.map((i) => i.month).filter(Boolean))]
    .sort((a, b) => monthOrder.indexOf(a) - monthOrder.indexOf(b));
  const yearOptions = [...new Set(attendanceData.map((i) => i.year).filter(Boolean))].sort();

  const filteredData = attendanceData.filter((item) => {
    const s = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm ||
      item.date.toLowerCase().includes(s) ||
      item.employeeName.toLowerCase().includes(s) ||
      item.inTime.toLowerCase().includes(s) ||
      item.outTime.toLowerCase().includes(s) ||
      (item.address || '').toLowerCase().includes(s);
    return matchesSearch &&
      (!employeeFilter || item.employeeName === employeeFilter) &&
      (!monthFilter || item.month === monthFilter) &&
      (!yearFilter || item.year === yearFilter);
  });

  const downloadExcel = () => {
    const exp = filteredData.map((item) => ({
      Date: item.date, 'Employee Name': item.employeeName,
      'In Time': item.inTime, 'Out Time': item.outTime,
      Address: item.address, 'Map Link': item.mapLink,
    }));
    const ws = XLSX.utils.json_to_sheet(exp);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Outstation');
    XLSX.writeFile(wb, 'outstation_attendance.xlsx');
  };

  // --- Calendar logic ---
  const calendarMonth = monthFilter || monthOptions[0] || monthOrder[new Date().getMonth()];
  const calendarYear = yearFilter || yearOptions[yearOptions.length - 1] || String(new Date().getFullYear());
  const calendarMonthIndex = monthOrder.indexOf(calendarMonth);
  const hasCalendarMonth = calendarMonthIndex !== -1 && Boolean(calendarYear);

  const calendarRows = hasCalendarMonth
    ? filteredData.filter((item) => item.month === calendarMonth && item.year === calendarYear)
    : [];

  const calendarRowsByDay = calendarRows.reduce((days, item) => {
    if (!item.day) return days;
    if (!days[item.day]) days[item.day] = [];
    days[item.day].push(item);
    return days;
  }, {});

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const daysInCalendarMonth = hasCalendarMonth ? new Date(Number(calendarYear), calendarMonthIndex + 1, 0).getDate() : 0;
  const hasLeaveFormOnDay = (day) => {
    if (!employeeFilter || !hasCalendarMonth || !day) return false;
    const selectedEmployee = normalizeName(employeeFilter);
    const dateKey = getDateKey(new Date(Number(calendarYear), calendarMonthIndex, day));
    return leaveData.some((leave) =>
      normalizeName(leave.employeeName) === selectedEmployee && leave.dateKeys.includes(dateKey)
    );
  };

  const isAbsentCalendarDay = (day) => {
    if (!employeeFilter || !hasCalendarMonth || !day) return false;
    if ((calendarRowsByDay[day] || []).length > 0) return false;
    if (hasLeaveFormOnDay(day)) return false;

    const date = new Date(Number(calendarYear), calendarMonthIndex, day);
    date.setHours(0, 0, 0, 0);

    return date <= todayStart && date.getDay() !== 0;
  };
  const absentCalendarDays = hasCalendarMonth
    ? new Set(Array.from({ length: daysInCalendarMonth }, (_, index) => index + 1).filter(isAbsentCalendarDay))
    : new Set();
  const absentDayCount = absentCalendarDays.size;

  const calendarSummary = calendarRows.reduce((s, item) => {
    s.present += 1;
    if (item.inTime && item.inTime !== '-' && (!item.outTime || item.outTime === '-')) s.punchMiss += 1;
    return s;
  }, { present: 0, punchMiss: 0, absent: absentDayCount });

  const firstCalendarWeekday = hasCalendarMonth ? new Date(Number(calendarYear), calendarMonthIndex, 1).getDay() : 0;
  const calendarStartDate = hasCalendarMonth
    ? new Date(Number(calendarYear), calendarMonthIndex, 1 - firstCalendarWeekday)
    : null;
  const calendarCells = calendarStartDate
    ? Array.from({ length: 42 }, (_, index) => {
      const date = new Date(calendarStartDate);
      date.setDate(calendarStartDate.getDate() + index);
      return {
        key: `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
        day: date.getDate(),
        monthIndex: date.getMonth(),
        year: date.getFullYear(),
        weekday: date.getDay(),
        isCurrentMonth: date.getMonth() === calendarMonthIndex,
      };
    })
    : [];
  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const calendarTitle = `${employeeFilter || 'All Employees'} - ${calendarMonth} ${calendarYear}`;

  const shiftCalendarMonth = (direction) => {
    if (!hasCalendarMonth) return;
    const nextDate = new Date(Number(calendarYear), calendarMonthIndex + direction, 1);
    setMonthFilter(monthOrder[nextDate.getMonth()]);
    setYearFilter(String(nextDate.getFullYear()));
  };

  const getCompactCalendarDayClass = (cell) => {
    const isToday = cell.isCurrentMonth &&
      cell.day === new Date().getDate() &&
      cell.monthIndex === new Date().getMonth() &&
      cell.year === new Date().getFullYear();
    if (!cell.isCurrentMonth) return 'bg-transparent text-slate-400';
    const rows = calendarRowsByDay[cell.day] || [];
    let baseClass = 'bg-white text-slate-900';
    if (rows.length > 0) baseClass = 'bg-emerald-200 text-slate-950';
    else if (cell.weekday === 0) baseClass = 'bg-violet-100 text-violet-800';
    else if (absentCalendarDays.has(cell.day)) baseClass = 'bg-rose-500 text-white shadow-sm shadow-rose-200';
    return `${baseClass} ${isToday ? 'ring-2 ring-cyan-500 ring-offset-2' : ''}`;
  };

  const activeFilterCount = [searchTerm, employeeFilter, monthFilter, yearFilter].filter(Boolean).length;

  return (
    <div className="space-y-5 page-content p-4 sm:p-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 p-5 text-white shadow-lg sm:p-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-black tracking-tight sm:text-2xl">Outstation Attendance</h1>
            <p className="mt-1 text-sm font-medium text-teal-100">
              {filteredData.length} records shown from {attendanceData.length} total entries
            </p>
          </div>
          <button
            onClick={downloadExcel}
            className="inline-flex items-center gap-2 rounded-xl bg-rose-500 px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-rose-600"
          >
            <Download size={18} /> Download Excel
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Filter size={18} />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-800">FILTERS</h2>
            <p className="text-xs text-slate-500">Smart search and focused attendance view</p>
          </div>
          {activeFilterCount > 0 && (
            <span className="ml-auto rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700">{activeFilterCount} active</span>
          )}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-[11px] font-black uppercase tracking-wide text-slate-500">Search</label>
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Search by name, date..." className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-4 text-sm font-semibold text-slate-700 outline-none transition hover:border-slate-400 focus:border-navy focus:ring-2 focus:ring-indigo-100" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-black uppercase tracking-wide text-slate-500">Employee</label>
            <div className="relative">
              <User size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <select value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)} className="h-10 w-full appearance-none rounded-lg border border-slate-300 bg-white pl-10 pr-9 text-sm font-semibold text-slate-700 outline-none transition hover:border-slate-400 focus:border-navy focus:ring-2 focus:ring-indigo-100">
                <option value="">All Employees</option>
                {employeeOptions.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <ChevronDown size={17} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-black uppercase tracking-wide text-slate-500">Month</label>
            <div className="relative">
              <CalendarDays size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="h-10 w-full appearance-none rounded-lg border border-slate-300 bg-white pl-10 pr-9 text-sm font-semibold text-slate-700 outline-none transition hover:border-slate-400 focus:border-navy focus:ring-2 focus:ring-indigo-100">
                <option value="">All Months</option>
                {monthOptions.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <ChevronDown size={17} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-black uppercase tracking-wide text-slate-500">Year</label>
            <div className="relative">
              <CalendarDays size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} className="h-10 w-full appearance-none rounded-lg border border-slate-300 bg-white pl-10 pr-9 text-sm font-semibold text-slate-700 outline-none transition hover:border-slate-400 focus:border-navy focus:ring-2 focus:ring-indigo-100">
                <option value="">All Years</option>
                {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              <ChevronDown size={17} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Calendar / Log Toggle */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wide text-slate-700">Outstation Calendar</h2>
            <p className="text-xs text-slate-500">{calendarTitle}</p>
          </div>
          <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
            <button onClick={() => setAttendanceView('calendar')} className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-bold transition ${attendanceView === 'calendar' ? 'bg-navy text-white shadow-sm' : 'text-slate-600 hover:bg-white'}`}>
              <CalendarDays size={16} /> Calendar
            </button>
            <button onClick={() => setAttendanceView('log')} className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-bold transition ${attendanceView === 'log' ? 'bg-navy text-white shadow-sm' : 'text-slate-600 hover:bg-white'}`}>
              <Table2 size={16} /> Attendance Log
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="mb-3 h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
            <span className="text-sm font-semibold text-slate-500">Loading outstation data...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 py-16">
            <p className="text-sm font-bold text-rose-600">Error: {error}</p>
            <button onClick={fetchData} className="mt-3 rounded-xl bg-navy px-4 py-2 text-sm font-bold text-white transition hover:bg-navy-dark">Retry</button>
          </div>
        ) : attendanceView === 'calendar' ? (
          <>
            {hasCalendarMonth && (
              <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(360px,520px)_1fr]">
                {/* Calendar */}
                <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50/70 p-2 sm:p-4">
                  <div className="mb-3 flex items-center justify-between px-1 sm:mb-4 sm:px-0">
                    <h3 className="text-lg font-black text-slate-950 sm:text-xl">Calendar</h3>
                    <button type="button" onClick={() => setAttendanceView('calendar')} className="text-sm font-bold text-blue-600 transition hover:text-blue-700">Go to calendar</button>
                  </div>
                  <div className="rounded-xl bg-white p-3 shadow-[0_14px_32px_rgba(15,23,42,0.12)] sm:rounded-2xl sm:p-5">
                    <div className="mb-4 flex items-center justify-center gap-4 sm:mb-5 sm:gap-7">
                      <button type="button" onClick={() => shiftCalendarMonth(-1)} className="rounded-full p-1.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 sm:p-2"><ChevronLeft size={21} /></button>
                      <div className="flex items-center gap-3 text-base font-black text-slate-950 sm:gap-4 sm:text-lg">
                        <span>{calendarMonth}</span><span>{calendarYear}</span>
                      </div>
                      <button type="button" onClick={() => shiftCalendarMonth(1)} className="rounded-full p-1.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 sm:p-2"><ChevronRight size={21} /></button>
                    </div>
                    <div className="grid grid-cols-7 gap-x-1 gap-y-2 sm:gap-y-3">
                      {weekDays.map((dayName) => (
                        <div key={dayName} className="text-center text-[17px] font-medium text-black sm:text-2xl">{dayName}</div>
                      ))}
                      {calendarCells.map((cell) => (
                        <div key={cell.key} className="flex justify-center">
                          <div
                            onClick={() => cell.isCurrentMonth && setSelectedCalendarDay(selectedCalendarDay === cell.day ? null : cell.day)}
                            className={`relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-sm font-medium transition hover:scale-105 sm:h-10 sm:w-10 sm:text-xl ${getCompactCalendarDayClass(cell)} ${cell.isCurrentMonth && selectedCalendarDay === cell.day ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}`}
                            style={cell.isCurrentMonth && absentCalendarDays.has(cell.day) ? { backgroundColor: '#ef4444', color: '#ffffff', boxShadow: '0 8px 18px rgba(239, 68, 68, 0.28)' } : undefined}
                          >
                            {cell.day}
                            {cell.isCurrentMonth && absentCalendarDays.has(cell.day) && (
                              <span className="absolute -bottom-1 h-1.5 w-1.5 rounded-full bg-white ring-2 ring-rose-500" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-medium text-slate-700 sm:mt-5 sm:gap-x-5 sm:text-sm">
                      <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-cyan-500" />Today</span>
                      <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-200" />Present</span>
                      <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-red-300" />Absent</span>
                      <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-violet-300" />Sunday</span>
                    </div>
                  </div>
                </div>

                {/* Summary + Day Log */}
                <div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Summary</p>
                        <h3 className="text-sm font-black text-slate-800">{calendarTitle}</h3>
                      </div>
                      <TrendingUp size={14} className="text-slate-300" />
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <div className="group flex flex-col items-center rounded-xl bg-emerald-50 py-2.5 transition-all hover:shadow-md hover:shadow-emerald-100">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm shadow-emerald-200"><CheckCircle2 size={14} /></div>
                        <p className="mt-1.5 text-lg font-black text-emerald-700">{calendarSummary.present}</p>
                        <p className="text-[9px] font-bold uppercase tracking-wide text-emerald-500">Present</p>
                      </div>
                      <div className="group flex flex-col items-center rounded-xl bg-rose-50 py-2.5 transition-all hover:shadow-md hover:shadow-rose-100">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-500 text-white shadow-sm shadow-rose-200"><XCircle size={14} /></div>
                        <p className="mt-1.5 text-lg font-black text-rose-700">{calendarSummary.absent}</p>
                        <p className="text-[9px] font-bold uppercase tracking-wide text-rose-500">Absent</p>
                      </div>
                      <div className="group flex flex-col items-center rounded-xl bg-orange-50 py-2.5 transition-all hover:shadow-md hover:shadow-orange-100">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-500 text-white shadow-sm shadow-orange-200"><AlertCircle size={14} /></div>
                        <p className="mt-1.5 text-lg font-black text-orange-700">{calendarSummary.punchMiss}</p>
                        <p className="text-[9px] font-bold uppercase tracking-wide text-orange-500">Punch Miss</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-center gap-1.5 rounded-lg bg-slate-50 py-1.5 text-[10px] font-semibold text-slate-400">
                      <CalendarDays size={11} /><span className="font-bold text-slate-500">{calendarRows.length}</span> records
                    </div>
                  </div>

                  {/* Day Log Panel */}
                  {selectedCalendarDay && (calendarRowsByDay[selectedCalendarDay] || []).length > 0 && (
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Day Log</p>
                          <h3 className="text-sm font-black text-slate-800">{selectedCalendarDay} {calendarMonth} {calendarYear}</h3>
                        </div>
                        <button type="button" onClick={() => setSelectedCalendarDay(null)} className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"><X size={16} /></button>
                      </div>
                      <div className="overflow-x-auto rounded-xl border border-slate-100">
                        <table className="w-full text-left text-xs">
                          <thead><tr className="bg-slate-50">
                            <th className="px-3 py-2 font-bold uppercase tracking-wide text-slate-500">Employee</th>
                            <th className="px-3 py-2 font-bold uppercase tracking-wide text-slate-500">In</th>
                            <th className="px-3 py-2 font-bold uppercase tracking-wide text-slate-500">Out</th>
                            <th className="px-3 py-2 font-bold uppercase tracking-wide text-slate-500">Address</th>
                            <th className="px-3 py-2 font-bold uppercase tracking-wide text-slate-500">Map</th>
                          </tr></thead>
                          <tbody className="divide-y divide-slate-100">
                            {(calendarRowsByDay[selectedCalendarDay] || []).map((row, i) => (
                              <tr key={i} className="transition hover:bg-slate-50">
                                <td className="px-3 py-2 font-semibold text-slate-700">{row.employeeName}</td>
                                <td className="px-3 py-2 font-medium text-slate-600">{row.inTime || '-'}</td>
                                <td className="px-3 py-2 font-medium text-slate-600">{row.outTime || '-'}</td>
                                <td className="px-3 py-2 text-slate-600 max-w-[150px] truncate">{row.address || '-'}</td>
                                <td className="px-3 py-2">{row.mapLink ? <a href={row.mapLink} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline text-xs font-bold">View</a> : '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  {selectedCalendarDay && (calendarRowsByDay[selectedCalendarDay] || []).length === 0 && (
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="text-sm font-black text-slate-800">{selectedCalendarDay} {calendarMonth} {calendarYear}</h3>
                        <button type="button" onClick={() => setSelectedCalendarDay(null)} className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"><X size={16} /></button>
                      </div>
                      <p className={`text-xs font-medium ${absentCalendarDays.has(selectedCalendarDay) ? 'text-rose-600' : 'text-slate-400'}`}>
                        {absentCalendarDays.has(selectedCalendarDay) ? 'Absent: no attendance mark and no leave form found for this date.' : 'No outstation records for this date.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          /* Attendance Log Table */
          <div className="overflow-x-auto table-container rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50/90">
                <tr>
                  <th className="px-5 py-3.5 text-left text-xs font-black uppercase tracking-wider text-slate-600">Date</th>
                  <th className="px-5 py-3.5 text-left text-xs font-black uppercase tracking-wider text-slate-600">Employee</th>
                  <th className="px-5 py-3.5 text-left text-xs font-black uppercase tracking-wider text-slate-600">In Time</th>
                  <th className="px-5 py-3.5 text-left text-xs font-black uppercase tracking-wider text-slate-600">Out Time</th>
                  <th className="px-5 py-3.5 text-left text-xs font-black uppercase tracking-wider text-slate-600">Address</th>
                  <th className="px-5 py-3.5 text-left text-xs font-black uppercase tracking-wider text-slate-600">Map</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredData.length > 0 ? filteredData.map((item, index) => (
                  <tr key={index} className="transition hover:bg-slate-50">
                    <td className="whitespace-nowrap px-5 py-3 text-sm font-semibold text-slate-800">{item.date}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-sm font-semibold text-slate-700">{item.employeeName}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-sm">
                      {item.inTime && item.inTime !== '-' ? (
                        <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700"><Clock size={12} />{item.inTime}</span>
                      ) : <span className="text-slate-400">-</span>}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-sm">
                      {item.outTime && item.outTime !== '-' ? (
                        <span className="inline-flex items-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700"><Clock size={12} />{item.outTime}</span>
                      ) : <span className="text-slate-400">-</span>}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-600 max-w-[250px]">
                      {item.address ? <span className="inline-flex items-start gap-1.5"><MapPin size={13} className="mt-0.5 shrink-0 text-slate-400" /><span className="line-clamp-2">{item.address}</span></span> : '-'}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-sm">
                      {item.mapLink ? (
                        <a href={item.mapLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100">
                          <ExternalLink size={12} />View
                        </a>
                      ) : '-'}
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan="6" className="px-6 py-16 text-center text-sm text-slate-500">No outstation attendance records found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default OutstationAttendance;
