import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coffee,
  Download,
  ExternalLink,
  Filter,
  MapPin,
  MoreVertical,
  RefreshCw,
  Search,
  Table2,
  TrendingUp,
  User,
  X,
  XCircle,
} from "lucide-react";
import * as XLSX from "xlsx";
import useAuthStore from "../store/authStore";

const OUTSTATION_SCRIPT_URL = import.meta.env.VITE_OUTSTATION_SHEET_URL;

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const normalize = (value) => String(value || "").trim().toLowerCase();

const pickFirst = (row, keys) => {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") return value;
  }
  return "";
};

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
};

const getCurrentUserName = (user = {}) =>
  String(
    pickFirst(user, [
      "Sales Person Name",
      "Person Name",
      "Employee Name",
      "Name",
      "name",
      "User Name",
      "Username",
      "username",
      "salesPersonName",
      "_authUsername",
    ]) || ""
  ).trim();

const getUserAliases = (user = {}) =>
  [
    getCurrentUserName(user),
    user._authUsername,
    user["User Name"],
    user.Username,
    user.username,
    user["Sales Person Name"],
    user["Person Name"],
    user["Employee Name"],
    user.Name,
    user.name,
    user.salesPersonName,
  ]
    .map(normalize)
    .filter(Boolean);

const parseDateToObj = (value) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  if (typeof value === "number") {
    const date = new Date((value - 25569) * 86400 * 1000);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const raw = String(value).trim();
  if (!raw) return null;

  if (raw.includes("T") && raw.includes(":")) {
    const date = new Date(raw);
    if (!Number.isNaN(date.getTime())) return date;
  }

  const isoMatch = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (isoMatch) {
    return new Date(
      Number(isoMatch[1]),
      Number(isoMatch[2]) - 1,
      Number(isoMatch[3]),
      Number(isoMatch[4] || 0),
      Number(isoMatch[5] || 0),
      Number(isoMatch[6] || 0)
    );
  }

  const slashMatch = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (slashMatch) {
    const year = slashMatch[3].length === 2 ? Number(`20${slashMatch[3]}`) : Number(slashMatch[3]);
    return new Date(
      year,
      Number(slashMatch[2]) - 1,
      Number(slashMatch[1]),
      Number(slashMatch[4] || 0),
      Number(slashMatch[5] || 0),
      Number(slashMatch[6] || 0)
    );
  }

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDateValue = (value) => {
  const date = parseDateToObj(value);
  if (!date) return value ? String(value) : "-";
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
};

const formatTimeValue = (value) => {
  const date = parseDateToObj(value);
  if (date) return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  if (!value) return "-";

  const raw = String(value).trim();
  if (!raw) return "-";
  if (raw.includes(":")) return raw.split(" ").pop().substring(0, 5);
  return raw;
};

const dateKey = (date) => {
  if (!date) return "";
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
};

const parseTimeToMinutes = (value) => {
  if (!value || value === "-") return null;
  const match = String(value).trim().match(/^(\d{1,2})[:.](\d{1,2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
};

const calculateDurationHours = (inTime, outTime) => {
  const start = parseTimeToMinutes(inTime);
  const end = parseTimeToMinutes(outTime);
  if (start === null || end === null) return 0;

  let minutes = end - start;
  if (minutes < 0) minutes += 24 * 60;
  return minutes / 60;
};

const getEntryName = (entry) =>
  String(
    pickFirst(entry, [
      "personName",
      "Person Name",
      "name",
      "Name",
      "employeeName",
      "Employee Name",
    ]) || ""
  ).trim();

const getEntryStatus = (entry) => {
  if (entry?.inDate) return "IN";
  if (entry?.outDate) return "OUT";
  return String(pickFirst(entry, ["status", "Status"]) || "").trim().toUpperCase();
};

const MyAttendance = () => {
  const authUser = useAuthStore((state) => state.user);
  const currentUser = useMemo(() => authUser || getStoredUser(), [authUser]);
  const currentUserName = useMemo(() => getCurrentUserName(currentUser), [currentUser]);
  const scopedAliases = useMemo(() => getUserAliases(currentUser), [currentUser]);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [attendanceView, setAttendanceView] = useState("calendar");
  const [selectedCalendarDay, setSelectedCalendarDay] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [attendanceData, setAttendanceData] = useState([]);

  const fetchOutstationAttendance = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!OUTSTATION_SCRIPT_URL) throw new Error("VITE_OUTSTATION_SHEET_URL missing hai");

      const response = await fetch(`${OUTSTATION_SCRIPT_URL}?action=getAllData&realtime=1&_=${Date.now()}`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const result = await response.json();
      if (result.status !== "success") throw new Error(result.message || "Outstation attendance fetch failed");

      const rawAttendance = Array.isArray(result.attendance) ? result.attendance : [];
      const grouped = {};

      rawAttendance.forEach((entry) => {
        const employeeName = getEntryName(entry);
        if (!employeeName || scopedAliases.length === 0) return;
        if (!scopedAliases.includes(normalize(employeeName))) return;

        const status = getEntryStatus(entry);
        const dateValue =
          entry.inDate ||
          entry.outDate ||
          entry.dateTime ||
          entry["Date & Time"] ||
          entry.Date ||
          entry.date;
        const dateObj = parseDateToObj(dateValue);
        if (!dateObj) return;

        const key = `${normalize(employeeName)}_${dateKey(dateObj)}`;
        if (!grouped[key]) {
          grouped[key] = {
            employeeName,
            dateObj,
            date: formatDateValue(dateValue),
            month: MONTHS[dateObj.getMonth()],
            year: String(dateObj.getFullYear()),
            day: dateObj.getDate(),
            inTime: "",
            outTime: "",
            mapLink: "",
            address: "",
          };
        }

        if (status === "IN") {
          grouped[key].inTime = formatTimeValue(dateValue);
          grouped[key].mapLink = entry.mapLink || entry["Map Link"] || grouped[key].mapLink;
          grouped[key].address = entry.address || entry.Address || grouped[key].address;
        }

        if (status === "OUT") {
          grouped[key].outTime = formatTimeValue(dateValue);
          grouped[key].mapLink = entry.mapLink || entry["Map Link"] || grouped[key].mapLink;
          grouped[key].address = entry.address || entry.Address || grouped[key].address;
        }
      });

      setAttendanceData(Object.values(grouped).sort((a, b) => b.dateObj - a.dateObj));
    } catch (err) {
      console.error("Outstation attendance fetch error:", err);
      setAttendanceData([]);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOutstationAttendance();
  }, [scopedAliases.join("|")]);

  const yearOptions = useMemo(() => {
    const years = attendanceData.map((record) => Number(record.year)).filter(Boolean);
    return [...new Set([new Date().getFullYear(), selectedYear, ...years])].sort((a, b) => b - a);
  }, [attendanceData, selectedYear]);

  const monthRows = useMemo(
    () =>
      attendanceData.filter(
        (record) =>
          record.dateObj.getMonth() === selectedMonth &&
          record.dateObj.getFullYear() === selectedYear
      ),
    [attendanceData, selectedMonth, selectedYear]
  );

  const filteredAttendance = useMemo(() => {
    const query = normalize(searchTerm);
    if (!query) return monthRows;

    return monthRows.filter((record) =>
      [
        record.date,
        record.employeeName,
        record.inTime,
        record.outTime,
        record.address,
        record.mapLink,
        getRecordStatus(record),
      ]
        .map(normalize)
        .some((value) => value.includes(query))
    );
  }, [monthRows, searchTerm]);

  const halfDayDays = filteredAttendance.filter((record) => getRecordStatus(record) === "HD").length;
  const presentDays = filteredAttendance.filter((record) => getRecordStatus(record) === "Present").length;
  const punchMissDays = filteredAttendance.filter(
    (record) => (record.inTime || record.outTime) && (!record.inTime || !record.outTime)
  ).length;
  const workingHours = filteredAttendance.reduce(
    (sum, record) => sum + calculateDurationHours(record.inTime, record.outTime),
    0
  );
  const attendanceDaySet = new Set(filteredAttendance.map((record) => record.day).filter(Boolean));
  const today = new Date();
  const selectedMonthStart = new Date(selectedYear, selectedMonth, 1);
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEndDay =
    selectedMonthStart > currentMonthStart
      ? 0
      : selectedMonthStart < currentMonthStart
        ? new Date(selectedYear, selectedMonth + 1, 0).getDate()
        : today.getDate();
  const absentDays = Array.from({ length: monthEndDay }, (_, index) => index + 1).filter((day) => {
    const date = new Date(selectedYear, selectedMonth, day);
    return date.getDay() !== 0 && !attendanceDaySet.has(day);
  }).length;
  const weekOffDays = Array.from({ length: monthEndDay }, (_, index) => index + 1).filter((day) => {
    const date = new Date(selectedYear, selectedMonth, day);
    return date.getDay() === 0;
  }).length;

  const calendarMonth = MONTHS[selectedMonth];
  const calendarYear = String(selectedYear);
  const calendarTitle = `${currentUserName || "Employee"} - ${calendarMonth} ${calendarYear}`;
  const calendarRowsByDay = filteredAttendance.reduce((days, item) => {
    if (!item.day) return days;
    if (!days[item.day]) days[item.day] = [];
    days[item.day].push(item);
    return days;
  }, {});

  const firstCalendarWeekday = new Date(selectedYear, selectedMonth, 1).getDay();
  const calendarStartDate = new Date(selectedYear, selectedMonth, 1 - firstCalendarWeekday);
  const calendarCells = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(calendarStartDate);
    date.setDate(calendarStartDate.getDate() + index);
    return {
      key: `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
      day: date.getDate(),
      monthIndex: date.getMonth(),
      year: date.getFullYear(),
      weekday: date.getDay(),
      isCurrentMonth: date.getMonth() === selectedMonth,
      isToday: date.toDateString() === new Date().toDateString(),
      fullDate: date,
    };
  });

  const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const selectedDayRows = selectedCalendarDay ? calendarRowsByDay[selectedCalendarDay] || [] : [];
  const activeFilterCount = [searchTerm, selectedMonth !== new Date().getMonth(), selectedYear !== new Date().getFullYear()].filter(Boolean).length;

  const shiftCalendarMonth = (direction) => {
    const nextDate = new Date(selectedYear, selectedMonth + direction, 1);
    setSelectedMonth(nextDate.getMonth());
    setSelectedYear(nextDate.getFullYear());
    setSelectedCalendarDay(null);
  };

  const getCalendarDayClass = (cell) => {
    if (!cell.isCurrentMonth) return "bg-transparent text-slate-300";

    const rows = calendarRowsByDay[cell.day] || [];
    let baseClass = "bg-white text-slate-700 border border-slate-100 shadow-sm";

    if (rows.some((row) => getRecordStatus(row) === "Punch Miss")) {
      baseClass = "bg-orange-100 text-orange-800 font-black border-orange-200";
    } else if (rows.some((row) => getRecordStatus(row) === "HD")) {
      baseClass = "half-day-dot text-slate-950";
    } else if (rows.some((row) => getRecordStatus(row) === "Present")) {
      baseClass = "bg-emerald-100 text-emerald-800 font-black border-emerald-200";
    } else if (cell.weekday === 0) {
      baseClass = "bg-violet-100 text-violet-800 font-black border-violet-200";
    }

    return `${baseClass} ${cell.isToday ? "ring-2 ring-cyan-500 ring-offset-2" : ""}`;
  };

  const downloadExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      filteredAttendance.map((record) => ({
        Date: record.date,
        Employee: record.employeeName,
        "In Time": record.inTime || "-",
        "Out Time": record.outTime || "-",
        Status: getRecordStatus(record),
        Address: record.address || "-",
        "Map Link": record.mapLink || "-",
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Outstation Attendance");
    XLSX.writeFile(workbook, `outstation_attendance_${calendarMonth}_${selectedYear}.xlsx`);
  };

  const summaryCards = [
    {
      label: "Present",
      value: presentDays,
      icon: CheckCircle2,
      cardClass: "bg-emerald-50 text-emerald-700",
      iconClass: "bg-emerald-500 text-white shadow-emerald-200",
    },
    {
      label: "Absent",
      value: absentDays,
      icon: XCircle,
      cardClass: "bg-rose-50 text-rose-700",
      iconClass: "bg-rose-500 text-white shadow-rose-200",
    },
    {
      label: "Half Day",
      value: halfDayDays,
      icon: Clock,
      cardClass: "bg-amber-50 text-amber-700",
      iconClass: "bg-amber-500 text-white shadow-amber-200",
    },
    {
      label: "Week Off",
      value: weekOffDays,
      icon: Coffee,
      cardClass: "bg-violet-50 text-violet-700",
      iconClass: "bg-violet-500 text-white shadow-violet-200",
    },
    {
      label: "Punch Miss",
      value: punchMissDays,
      icon: AlertCircle,
      cardClass: "bg-orange-50 text-orange-700",
      iconClass: "bg-orange-500 text-white shadow-orange-200",
    },
    {
      label: "Working Hours",
      value: `${workingHours.toFixed(1)}h`,
      icon: Clock,
      cardClass: "bg-cyan-50 text-cyan-700",
      iconClass: "bg-cyan-500 text-white shadow-cyan-200",
    },
  ];

  const renderMobileAttendanceLog = () => (
    <div className="space-y-3 md:hidden">
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm font-bold text-slate-500">
          Loading outstation attendance...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-6 text-center text-sm font-bold text-rose-700">
          Error: {error}
        </div>
      ) : filteredAttendance.length > 0 ? (
        filteredAttendance.map((record) => (
          <article key={`${record.employeeName}-${dateKey(record.dateObj)}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Date</p>
                <h3 className="mt-1 text-base font-black text-slate-950">{record.date || "-"}</h3>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-black ${getStatusBadgeClass(record)}`}>
                {getRecordStatus(record)}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">In Time</p>
                <p className="mt-1 text-sm font-black text-slate-800">{record.inTime || "-"}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Out Time</p>
                <p className="mt-1 text-sm font-black text-slate-800">{record.outTime || "-"}</p>
              </div>
            </div>
            <div className="mt-3 rounded-xl bg-indigo-50 p-3">
              <p className="text-[10px] font-black uppercase tracking-wide text-indigo-400">Address</p>
              <p className="mt-1 text-xs font-bold leading-relaxed text-indigo-950">{record.address || "-"}</p>
              {record.mapLink && (
                <a
                  href={record.mapLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-black text-indigo-700"
                >
                  View Map <ExternalLink size={12} />
                </a>
              )}
            </div>
          </article>
        ))
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-500">
          No outstation attendance records found.
        </div>
      )}
    </div>
  );

  const renderDesktopAttendanceLog = () => (
    <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white md:block">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50/90">
          <tr>
            <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-600">Date</th>
            <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-600">Employee</th>
            <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-600">In Time</th>
            <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-600">Out Time</th>
            <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-600">Status</th>
            <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-600">Address</th>
            <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-600">Map</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {loading ? (
            <tr>
              <td colSpan="7" className="px-6 py-12 text-center">
                <div className="flex flex-col items-center justify-center">
                  <div className="mb-2 h-6 w-6 animate-spin rounded-full border-4 border-indigo-500 border-dashed" />
                  <span className="text-sm text-gray-600">Loading outstation attendance...</span>
                </div>
              </td>
            </tr>
          ) : error ? (
            <tr>
              <td colSpan="7" className="px-6 py-12 text-center">
                <p className="text-red-500">Error: {error}</p>
                <button
                  type="button"
                  onClick={fetchOutstationAttendance}
                  className="mt-2 rounded-md bg-navy px-4 py-2 text-white hover:bg-navy-dark"
                >
                  Retry
                </button>
              </td>
            </tr>
          ) : filteredAttendance.length > 0 ? (
            filteredAttendance.map((record) => (
              <tr key={`${record.employeeName}-${dateKey(record.dateObj)}`} className="transition hover:bg-slate-50">
                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-slate-700">{record.date}</td>
                <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-slate-900">{record.employeeName}</td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">{record.inTime || "-"}</td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">{record.outTime || "-"}</td>
                <td className="whitespace-nowrap px-6 py-4 text-sm">
                  <span className={`inline-flex min-w-20 justify-center rounded-full px-2.5 py-1 text-xs font-bold ${getStatusBadgeClass(record)}`}>
                    {getRecordStatus(record)}
                  </span>
                </td>
                <td className="max-w-[360px] px-6 py-4 text-sm text-slate-600">
                  <span className="inline-flex items-start gap-2">
                    <MapPin size={14} className="mt-0.5 shrink-0 text-slate-400" />
                    <span className="line-clamp-2">{record.address || "-"}</span>
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm">
                  {record.mapLink ? (
                    <a
                      href={record.mapLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700 transition hover:bg-indigo-100"
                    >
                      View <ExternalLink size={12} />
                    </a>
                  ) : "-"}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="7" className="px-6 py-12 text-center">
                <p className="text-gray-500">No outstation attendance records found.</p>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-5 p-4 pb-24 page-content sm:p-6 md:pb-6">
      <section className="relative overflow-visible rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-700 via-blue-500 to-teal-500" />
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-950">Outstation Attendance</h1>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              {filteredAttendance.length} records shown from {attendanceData.length} total entries
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={fetchOutstationAttendance}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            <button
              type="button"
              onClick={downloadExcel}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-emerald-100 transition hover:-translate-y-0.5"
            >
              <Download size={18} />
              Download Excel
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-600">
            <Filter size={22} />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-800">FILTERS</h2>
            <p className="text-xs font-semibold text-slate-400">Smart search and focused attendance view</p>
          </div>
          {activeFilterCount > 0 && (
            <span className="ml-auto rounded-full bg-indigo-100 px-3 py-1 text-xs font-black text-indigo-700">
              {activeFilterCount} active
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.4fr_1fr_0.9fr_0.8fr]">
          <label className="block">
            <span className="mb-1 block text-[11px] font-black uppercase tracking-wide text-slate-500">Search</span>
            <span className="relative block">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by date, time, status, address..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-sm font-bold text-slate-700 outline-none transition hover:border-slate-400 focus:border-navy focus:ring-2 focus:ring-indigo-100"
              />
            </span>
          </label>

          <label className="block">
            <span className="mb-1 block text-[11px] font-black uppercase tracking-wide text-slate-500">Employee</span>
            <span className="relative flex h-12 items-center rounded-xl border border-slate-300 bg-white pl-10 pr-9 text-sm font-bold text-slate-700">
              <User size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <span className="truncate">{currentUserName || "Employee"}</span>
              <ChevronDown size={17} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </span>
          </label>

          <label className="block">
            <span className="mb-1 block text-[11px] font-black uppercase tracking-wide text-slate-500">Month</span>
            <span className="relative block">
              <CalendarDays size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={selectedMonth}
                onChange={(event) => {
                  setSelectedMonth(Number(event.target.value));
                  setSelectedCalendarDay(null);
                }}
                className="h-12 w-full appearance-none rounded-xl border border-slate-300 bg-white pl-10 pr-9 text-sm font-bold text-slate-700 outline-none transition hover:border-slate-400 focus:border-navy focus:ring-2 focus:ring-indigo-100"
              >
                {MONTHS.map((month, index) => (
                  <option key={month} value={index}>{month}</option>
                ))}
              </select>
              <ChevronDown size={17} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </span>
          </label>

          <label className="block">
            <span className="mb-1 block text-[11px] font-black uppercase tracking-wide text-slate-500">Year</span>
            <span className="relative block">
              <CalendarDays size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={selectedYear}
                onChange={(event) => {
                  setSelectedYear(Number(event.target.value));
                  setSelectedCalendarDay(null);
                }}
                className="h-12 w-full appearance-none rounded-xl border border-slate-300 bg-white pl-10 pr-9 text-sm font-bold text-slate-700 outline-none transition hover:border-slate-400 focus:border-navy focus:ring-2 focus:ring-indigo-100"
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <ChevronDown size={17} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </span>
          </label>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wide text-slate-700">
              {attendanceView === "calendar" ? "Outstation Calendar" : "Outstation Log"}
            </h2>
            <p className="mt-1 text-sm font-bold text-slate-800">{calendarTitle}</p>
          </div>
          <div className="flex w-full gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-sm sm:w-auto">
            <button
              type="button"
              onClick={() => setAttendanceView("calendar")}
              className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-black transition sm:flex-none ${
                attendanceView === "calendar"
                  ? "bg-gradient-to-r from-indigo-700 to-blue-600 text-white shadow-lg shadow-indigo-100"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <CalendarDays size={16} />
              Calendar
            </button>
            <button
              type="button"
              onClick={() => setAttendanceView("log")}
              className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-black transition sm:flex-none ${
                attendanceView === "log"
                  ? "bg-gradient-to-r from-indigo-700 to-blue-600 text-white shadow-lg shadow-indigo-100"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Table2 size={16} />
              Outstation Log
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          {attendanceView === "calendar" ? (
            loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="mb-3 h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
                <span className="text-sm font-semibold text-slate-500">Loading outstation data...</span>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 py-16">
                <p className="text-sm font-bold text-rose-600">Error: {error}</p>
                <button
                  type="button"
                  onClick={fetchOutstationAttendance}
                  className="mt-3 rounded-xl bg-navy px-4 py-2 text-sm font-bold text-white transition hover:bg-navy-dark"
                >
                  Retry
                </button>
              </div>
            ) : (
              <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(340px,520px)_1fr]">
                <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 sm:p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-lg font-black text-slate-950 sm:text-xl">Calendar</h3>
                    <button type="button" className="text-sm font-black text-blue-600 transition hover:text-blue-700">
                      Go to calendar
                    </button>
                  </div>

                  <div className="rounded-xl bg-white p-3 shadow-[0_14px_32px_rgba(15,23,42,0.12)] sm:rounded-2xl sm:p-5">
                    <div className="mb-4 flex items-start justify-between">
                      <span className="rounded-md bg-orange-100 px-2.5 py-1.5 text-sm font-semibold text-slate-900">
                        Half Day - {halfDayDays}
                      </span>
                      <button type="button" className="rounded-full p-1 text-slate-700 transition hover:bg-slate-100 sm:p-1.5" aria-label="Calendar options">
                        <MoreVertical size={20} />
                      </button>
                    </div>

                    <div className="mb-4 flex items-center justify-center gap-4 sm:mb-5 sm:gap-7">
                      <button type="button" onClick={() => shiftCalendarMonth(-1)} className="rounded-full p-1.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 sm:p-2" aria-label="Previous month">
                        <ChevronLeft size={21} />
                      </button>
                      <div className="flex items-center gap-3 text-base font-black text-slate-950 sm:gap-4 sm:text-lg">
                        <span>{calendarMonth}</span>
                        <span>{calendarYear}</span>
                      </div>
                      <button type="button" onClick={() => shiftCalendarMonth(1)} className="rounded-full p-1.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 sm:p-2" aria-label="Next month">
                        <ChevronRight size={21} />
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-x-1 gap-y-2 sm:gap-y-3">
                      {weekDays.map((dayName) => (
                        <div key={dayName} className="text-center text-[17px] font-medium text-black sm:text-2xl">
                          {dayName}
                        </div>
                      ))}
                      {calendarCells.map((cell) => (
                        <div key={cell.key} className="flex justify-center">
                          <button
                            type="button"
                            onClick={() => cell.isCurrentMonth && setSelectedCalendarDay(selectedCalendarDay === cell.day ? null : cell.day)}
                            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition hover:scale-105 sm:h-10 sm:w-10 sm:text-xl ${getCalendarDayClass(cell)} ${
                              cell.isCurrentMonth && selectedCalendarDay === cell.day ? "ring-2 ring-indigo-500 ring-offset-2" : ""
                            }`}
                          >
                            {cell.day}
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-medium text-slate-700 sm:mt-5 sm:gap-x-5 sm:text-sm">
                      <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-cyan-500" />Today</span>
                      <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-300" />Present</span>
                      <span className="inline-flex items-center gap-2"><span className="half-day-dot h-2 w-2 rounded-full" />Half Day</span>
                      <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-orange-300" />Punch Miss</span>
                      <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-violet-300" />Sunday</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Summary</p>
                      <h3 className="text-sm font-black text-slate-800">{calendarTitle}</h3>
                    </div>
                    <TrendingUp size={14} className="text-slate-300" />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {summaryCards.map((card) => {
                      const Icon = card.icon;
                      return (
                        <div key={card.label} className={`group flex flex-col items-center rounded-xl py-2.5 transition-all hover:shadow-md ${card.cardClass}`}>
                          <div className={`flex h-7 w-7 items-center justify-center rounded-full shadow-sm ${card.iconClass}`}>
                            <Icon size={14} />
                          </div>
                          <p className="mt-1.5 text-lg font-black">{card.value}</p>
                          <p className="text-[9px] font-bold uppercase tracking-wide">{card.label}</p>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-3 flex items-center justify-center gap-1.5 rounded-lg bg-slate-50 py-1.5 text-[10px] font-semibold text-slate-400">
                    <CalendarDays size={11} />
                    <span className="font-bold text-slate-500">{filteredAttendance.length}</span> records
                  </div>

                  {selectedCalendarDay && (
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Day Log</p>
                          <h3 className="text-sm font-black text-slate-800">{selectedCalendarDay} {calendarMonth} {calendarYear}</h3>
                        </div>
                        <button type="button" onClick={() => setSelectedCalendarDay(null)} className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
                          <X size={16} />
                        </button>
                      </div>

                      {selectedDayRows.length > 0 ? (
                        <div className="overflow-x-auto rounded-xl border border-slate-100">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="bg-slate-50">
                                <th className="px-3 py-2 font-bold uppercase tracking-wide text-slate-500">In</th>
                                <th className="px-3 py-2 font-bold uppercase tracking-wide text-slate-500">Out</th>
                                <th className="px-3 py-2 font-bold uppercase tracking-wide text-slate-500">Status</th>
                                <th className="px-3 py-2 font-bold uppercase tracking-wide text-slate-500">Map</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {selectedDayRows.map((row) => (
                                <tr key={`${row.employeeName}-${dateKey(row.dateObj)}`} className="transition hover:bg-slate-50">
                                  <td className="px-3 py-2 font-medium text-slate-600">{row.inTime || "-"}</td>
                                  <td className="px-3 py-2 font-medium text-slate-600">{row.outTime || "-"}</td>
                                  <td className="px-3 py-2">
                                    <span className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold ${getStatusBadgeClass(row)}`}>
                                      {getRecordStatus(row)}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2">
                                    {row.mapLink ? (
                                      <a href={row.mapLink} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-indigo-600 hover:underline">
                                        View
                                      </a>
                                    ) : "-"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-xs font-medium text-slate-400">No outstation records for this date.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          ) : (
            <>
              {renderMobileAttendanceLog()}
              {renderDesktopAttendanceLog()}
            </>
          )}
        </div>
      </section>
    </div>
  );
};

const getRecordStatus = (record) => {
  if (!record) return "-";
  if ((record.inTime || record.outTime) && (!record.inTime || !record.outTime)) return "Punch Miss";
  if (isHalfDayRecord(record)) return "HD";
  if (record.inTime && record.outTime) return "Present";
  return "Present";
};

const getStatusBadgeClass = (record) => {
  const status = getRecordStatus(record);
  if (status === "Present") return "bg-emerald-50 text-emerald-700 border border-emerald-200";
  if (status === "HD") return "bg-amber-50 text-amber-700 border border-amber-200";
  if (status === "Punch Miss") return "bg-orange-50 text-orange-700 border border-orange-200";
  return "bg-blue-50 text-blue-700 border border-blue-200";
};

const isHalfDayRecord = (record) => {
  if (!record?.inTime || !record?.outTime) return false;

  const inMinutes = parseTimeToMinutes(record.inTime);
  const outMinutes = parseTimeToMinutes(record.outTime);
  const lateInLimit = 9 * 60 + 15;
  const earlyOutLimit = 18 * 60;

  return (
    (inMinutes !== null && inMinutes > lateInLimit) ||
    (outMinutes !== null && outMinutes < earlyOutLimit)
  );
};

export default MyAttendance;
