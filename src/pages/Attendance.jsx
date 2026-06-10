import React, { useEffect, useState } from 'react';
import { Search, Download, X, Filter, User, Calendar, ChevronDown, CalendarDays, Table2, ChevronLeft, ChevronRight, MoreVertical } from 'lucide-react';
import * as XLSX from 'xlsx';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';


const Attendance = () => {
  const ATTENDANCE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx_GRdhFbP5zQX_HV72t9Ofcj5IHurSBJnPC5o0yr6_HvkLkMs9hOSLHIP0e26uG1iDlA/exec';
  const ATTENDANCE_SHEET_NAME = 'Data';

  const [searchTerm, setSearchTerm] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [reportMonth, setReportMonth] = useState('');
  const [reportYear, setReportYear] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);
  const [attendanceView, setAttendanceView] = useState('calendar');
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState({}); // Track individual download states

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const fetchAttendanceData = async () => {
    setLoading(true);
    setTableLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${ATTENDANCE_SCRIPT_URL}?sheet=${encodeURIComponent(ATTENDANCE_SHEET_NAME)}&action=fetch&range=A:F`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Raw attendance API response:', result);

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch data from attendance sheet');
      }

      const rawData = result.data || result;

      if (!Array.isArray(rawData)) {
        throw new Error('Expected array data not received');
      }

      // In your screenshot, headers looked around row 4–5 → adjust index if needed
      const headers = rawData[0] || [];
      const dataRows = rawData.length > 1 ? rawData.slice(1) : [];

      const getIndex = (headerName) => {
        const index = headers.findIndex(
          (h) => h && h.toString().trim().toLowerCase() === headerName.toLowerCase()
        );
        if (index === -1) {
          console.warn(`Column "${headerName}" not found in sheet. Available headers:`, headers);
        }
        return index;
      };


      const processedData = dataRows.map((row) => ({
        date: row[getIndex('Date')] || '',
        employeeName: row[getIndex('Employee Name')] || '',
        inTime: row[getIndex('In Time')] || '',
        outTime: row[getIndex('Out Time')] || '',
        status: row[getIndex('Status')] || '',
        month: row[getIndex('Month')] || '',
      })).filter((item) => item.date || item.employeeName || item.inTime || item.outTime || item.status || item.month);

      console.log('Processed attendance data:', processedData);

      // Example usage: set state
      setAttendanceData(processedData);

    } catch (error) {
      console.error('Error fetching attendance data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
      setTableLoading(false);
    }
  };

  useEffect(() => {
    // Small delay to ensure page settles before any potential scroll adjustments
    const timer = setTimeout(() => {
      // Ensure the page stays at the current position to prevent unwanted scrolling
      const currentScrollY = window.scrollY;
      window.scrollTo({ top: currentScrollY, behavior: 'auto' });
    }, 10);

    // Fetch data
    fetchAttendanceData();

    // Cleanup timeout if component unmounts quickly
    return () => clearTimeout(timer);
  }, []);

  // Download data as Excel
  const downloadExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(attendanceData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");
    XLSX.writeFile(workbook, "attendance_data.xlsx");
  };

  const monthOrder = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const getMonthIndexFromName = (monthName) =>
    monthOrder.findIndex((month) => month.toLowerCase() === monthName.toString().trim().toLowerCase());

  const parseAttendanceDate = (value, monthName = '') => {
    if (!value) return null;

    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }

    if (typeof value === 'number') {
      const date = new Date((value - 25569) * 86400 * 1000);
      return Number.isNaN(date.getTime()) ? null : date;
    }

    const trimmedValue = value.toString().trim();

    if (trimmedValue.includes('T') && trimmedValue.includes(':')) {
      const date = new Date(trimmedValue);
      if (!Number.isNaN(date.getTime())) {
        return date;
      }
    }

    const isoMatch = trimmedValue.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);

    if (isoMatch) {
      const date = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
      return Number.isNaN(date.getTime()) ? null : date;
    }

    const slashMatch = trimmedValue.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);

    if (slashMatch) {
      const firstPart = Number(slashMatch[1]);
      const secondPart = Number(slashMatch[2]);
      const year = slashMatch[3].length === 2 ? Number(`20${slashMatch[3]}`) : Number(slashMatch[3]);
      const monthIndexFromName = getMonthIndexFromName(monthName);

      if (monthIndexFromName !== -1) {
        if (secondPart - 1 === monthIndexFromName) {
          return new Date(year, secondPart - 1, firstPart);
        }

        if (firstPart - 1 === monthIndexFromName) {
          return new Date(year, firstPart - 1, secondPart);
        }
      }

      if (firstPart > 12) {
        return new Date(year, secondPart - 1, firstPart);
      }

      if (secondPart > 12) {
        return new Date(year, firstPart - 1, secondPart);
      }

      return new Date(year, secondPart - 1, firstPart);
    }

    const date = new Date(trimmedValue);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const formatAttendanceDate = (value, monthName = '') => {
    if (!value) return '';
    const date = parseAttendanceDate(value, monthName);
    if (!date) return value;
    return date.toLocaleDateString('en-IN');
  };

  const getAttendanceYear = (value, monthName = '') => {
    if (!value) return '';
    const date = parseAttendanceDate(value, monthName);
    if (!date) return '';
    return String(date.getFullYear());
  };

  const getAttendanceDay = (value, monthName = '') => {
    const date = parseAttendanceDate(value, monthName);
    return date ? date.getDate() : null;
  };

  const parseTimeToMinutes = (value) => {
    if (!value) return null;
    const match = value.toString().trim().match(/^(\d{1,2})[:.](\d{1,2})/);
    if (!match) return null;
    return Number(match[1]) * 60 + Number(match[2]);
  };

  const employeeOptions = [...new Set(attendanceData.map((item) => item.employeeName).filter(Boolean))].sort();
  const monthOptions = [...new Set(attendanceData.map((item) => item.month).filter(Boolean))]
    .sort((a, b) => monthOrder.indexOf(a) - monthOrder.indexOf(b));
  const yearOptions = [...new Set(attendanceData.map((item) => getAttendanceYear(item.date, item.month)).filter(Boolean))].sort();

  const getStatusBadgeClass = (status) => {
    const normalizedStatus = status.toString().trim().toUpperCase();
    if (normalizedStatus === 'P') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (normalizedStatus === 'A') return 'bg-rose-50 text-rose-700 border-rose-200';
    if (normalizedStatus === 'WO') return 'bg-slate-100 text-slate-700 border-slate-200';
    return 'bg-amber-50 text-amber-700 border-amber-200';
  };

  const downloadSummaryReport = () => {
    if (!reportMonth || !reportYear) {
      alert('Please select month and year for report');
      return;
    }

    const lateThresholdMinutes = 9 * 60 + 15;
    const selectedRows = attendanceData.filter((item) =>
      item.month === reportMonth && getAttendanceYear(item.date, item.month) === reportYear
    );

    if (selectedRows.length === 0) {
      alert(`No attendance data found for ${reportMonth} ${reportYear}`);
      return;
    }

    const employeeSummary = selectedRows.reduce((summary, item) => {
      const employeeName = item.employeeName || 'Unknown';
      const status = item.status.toString().trim().toUpperCase();
      const inTimeMinutes = parseTimeToMinutes(item.inTime);

      if (!summary[employeeName]) {
        summary[employeeName] = {
          Month: reportMonth,
          'Employee Name': employeeName,
          'Total Present': 0,
          'Total Absent': 0,
          WO: 0,
          'Late Coming/Half Day': 0,
        };
      }

      if (status === 'P') {
        summary[employeeName]['Total Present'] += 1;
      }

      if (status === 'A') {
        summary[employeeName]['Total Absent'] += 1;
      }

      if (status === 'WO') {
        summary[employeeName].WO += 1;
      }

      if (status === 'P' && inTimeMinutes !== null && inTimeMinutes > lateThresholdMinutes) {
        summary[employeeName]['Late Coming/Half Day'] += 1;
      }

      return summary;
    }, {});

    const reportRows = Object.values(employeeSummary).sort((a, b) =>
      a['Employee Name'].localeCompare(b['Employee Name'])
    );
    const worksheet = XLSX.utils.json_to_sheet(reportRows, {
      header: ['Month', 'Employee Name', 'Total Present', 'Total Absent', 'WO', 'Late Coming/Half Day'],
    });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Report');
    XLSX.writeFile(workbook, `attendance_report_${reportMonth}_${reportYear}.xlsx`);
    setShowReportModal(false);
  };

  const downloadDailyData = async (empId, name, month) => {
    // Check if we have valid parameters
    if (!empId || !month) {
      console.error('Missing parameters - empId:', empId, 'month:', month);
      alert('Cannot download: Missing employee ID or month information');
      return;
    }

    setDownloading(prev => ({ ...prev, [`${name}-${month}`]: true }));

    try {
      const response = await fetch(
        `${import.meta.env.VITE_GOOGLE_SHEET_URL}?sheet=Report Daily&action=fetch`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Daily data response:', result);

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch daily data');
      }

      const rawData = result.data || result;

      if (!Array.isArray(rawData) || rawData.length === 0) {
        throw new Error('No daily data found');
      }

      // Get headers from the first row
      const headers = rawData[0];

      // Find column indices
      const getIndex = (headerName) => {
        return headers.findIndex(
          (h) => h && h.toString().trim().toLowerCase() === headerName.toLowerCase()
        );
      };

      const empIdIndex = getIndex('Employee ID');
      const monthIndex = getIndex('Month');

      console.log('Searching for - Emp ID:', empId, 'Month:', month);
      console.log('Found indices - Emp ID:', empIdIndex, 'Month:', monthIndex);

      if (empIdIndex === -1 || monthIndex === -1) {
        throw new Error('Required columns not found in daily data');
      }

      // Filter data based on employee ID and month
      const filteredData = rawData.filter((row, index) => {
        if (index === 0) return false; // Skip header row

        const rowEmpId = row[empIdIndex] ? row[empIdIndex].toString().trim() : '';
        const rowMonth = row[monthIndex] ? row[monthIndex].toString().trim().toLowerCase() : '';
        const targetMonth = month.toString().trim().toLowerCase();

        return rowEmpId === empId.toString().trim() && rowMonth === targetMonth;
      });

      console.log('Filtered data count:', filteredData.length);

      if (filteredData.length === 0) {
        throw new Error(`No daily data found for Employee ID: ${empId} and Month: ${month}`);
      }

      // Create PDF document
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      // Add title
      doc.setFontSize(16);
      doc.text(`Daily Attendance - ${name} (${empId}) - ${month}`, 14, 15);

      // Prepare data for the table
      const tableData = filteredData.map(row => {
        return headers.map((header, index) => {
          return row[index] !== undefined ? String(row[index]) : '';
        });
      });

      // Add table to PDF
      autoTable(doc, {
        head: [headers],
        body: tableData,
        startY: 20,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185] }
      });

      // Save the PDF
      doc.save(`${empId}_${name}_${month}_daily_attendance.pdf`);

    } catch (error) {
      console.error('Error downloading daily data:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setDownloading(prev => ({ ...prev, [`${name}-${month}`]: false }));
    }
  };

  // Filter data based on search term, employee name, month, and year.
  const filteredData = attendanceData.filter((item) => {
    const normalizedSearch = searchTerm.toLowerCase();
    const itemYear = getAttendanceYear(item.date, item.month);
    const matchesSearch =
      formatAttendanceDate(item.date, item.month).toLowerCase().includes(normalizedSearch) ||
      item.employeeName.toLowerCase().includes(normalizedSearch) ||
      item.inTime.toLowerCase().includes(normalizedSearch) ||
      item.outTime.toLowerCase().includes(normalizedSearch) ||
      item.status.toLowerCase().includes(normalizedSearch) ||
      item.month.toLowerCase().includes(normalizedSearch) ||
      itemYear.includes(normalizedSearch);
    const matchesEmployee = !employeeFilter || item.employeeName === employeeFilter;
    const matchesMonth = !monthFilter || item.month === monthFilter;
    const matchesYear = !yearFilter || itemYear === yearFilter;

    return matchesSearch && matchesEmployee && matchesMonth && matchesYear;
  });

  const activeFilterCount = [searchTerm, employeeFilter, monthFilter, yearFilter].filter(Boolean).length;
  const buildAttendanceSummary = (rows) => rows.reduce((summary, item) => {
    const status = item.status.toString().trim().toUpperCase();
    const inTimeMinutes = parseTimeToMinutes(item.inTime);
    const halfDayThresholdMinutes = 9 * 60 + 15;

    if (status === 'P' || status === 'PRESENT') {
      summary.present += 1;
    } else if (status === 'A' || status === 'ABSENT') {
      summary.absent += 1;
    } else if (status === 'WO' || status === 'HOLIDAY') {
      summary.wo += 1;
    } else if (status === 'HD' || status === 'HALF DAY') {
      summary.halfDay += 1;
    }

    if (status === 'P' && inTimeMinutes !== null && inTimeMinutes > halfDayThresholdMinutes) {
      summary.halfDay += 1;
    }

    return summary;
  }, { present: 0, absent: 0, halfDay: 0, wo: 0 });

  const calendarMonth = monthFilter || monthOptions[0] || monthOrder[new Date().getMonth()];
  const calendarYear = yearFilter || yearOptions[yearOptions.length - 1] || String(new Date().getFullYear());
  const calendarMonthIndex = monthOrder.indexOf(calendarMonth);
  const hasCalendarMonth = calendarMonthIndex !== -1 && Boolean(calendarYear);
  const calendarRows = hasCalendarMonth
    ? filteredData.filter((item) => item.month === calendarMonth && getAttendanceYear(item.date, item.month) === calendarYear)
    : [];
  const calendarSummary = buildAttendanceSummary(calendarRows);
  const calendarRowsByDay = calendarRows.reduce((days, item) => {
    const day = getAttendanceDay(item.date, item.month);
    if (!day) return days;
    if (!days[day]) days[day] = [];
    days[day].push(item);
    return days;
  }, {});
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

  const getCalendarDayLabel = (rows) => {
    if (!rows.length) return '';
    const daySummary = buildAttendanceSummary(rows);

    if (rows.length === 1) {
      const status = rows[0].status.toString().trim().toUpperCase();
      const inTimeMinutes = parseTimeToMinutes(rows[0].inTime);
      if (status === 'P' && inTimeMinutes !== null && inTimeMinutes > 9 * 60 + 15) return 'HD';
      return status || '-';
    }

    if (daySummary.absent > 0) return `A ${daySummary.absent}`;
    if (daySummary.halfDay > 0) return `HD ${daySummary.halfDay}`;
    if (daySummary.present > 0) return `P ${daySummary.present}`;
    if (daySummary.wo > 0) return `WO ${daySummary.wo}`;
    return `${rows.length}`;
  };

  const getCalendarDayClass = (rows) => {
    if (!rows.length) return 'border-slate-200 bg-slate-50/70 text-slate-400';
    const daySummary = buildAttendanceSummary(rows);

    if (daySummary.absent > 0 && daySummary.present === 0) return 'border-rose-200 bg-rose-50 text-rose-800';
    if (daySummary.halfDay > 0) return 'border-amber-200 bg-amber-50 text-amber-800';
    if (daySummary.present > 0) return 'border-emerald-200 bg-emerald-50 text-emerald-800';
    if (daySummary.wo > 0) return 'border-slate-300 bg-slate-100 text-slate-700';
    return 'border-indigo-200 bg-indigo-50 text-navy';
  };

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
    const daySummary = buildAttendanceSummary(rows);
    let baseClass = 'bg-white text-slate-900';

    if (daySummary.present > 0) baseClass = 'bg-emerald-200 text-slate-950';
    else if (daySummary.halfDay > 0) baseClass = 'half-day-dot text-slate-950';
    else if (daySummary.absent > 0) baseClass = 'bg-red-100 text-red-800';
    else if (daySummary.wo > 0) baseClass = 'bg-violet-100 text-violet-800';
    else if (cell.weekday === 0) baseClass = 'bg-violet-100 text-violet-800';

    return `${baseClass} ${isToday ? 'ring-2 ring-cyan-500 ring-offset-2' : ''}`;
  };

  const getCompactCalendarDayTitle = (cell) => {
    if (!cell.isCurrentMonth) return '';
    const rows = calendarRowsByDay[cell.day] || [];
    if (!rows.length) return 'No record';
    const summary = buildAttendanceSummary(rows);
    return `Present: ${summary.present}, Absent: ${summary.absent}, Half Day: ${summary.halfDay}, WO: ${summary.wo}`;
  };

  return (
    <div className="space-y-4 p-3 sm:space-y-6 sm:p-6">
      <div className="relative overflow-hidden rounded-2xl border border-slate-300/80 bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] sm:p-6">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-navy via-indigo-500 to-emerald-500" />
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-950">Attendance Records Monthly</h1>
            <p className="mt-1 text-sm text-slate-500">
              {filteredData.length} records shown from {attendanceData.length} total entries
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={() => setShowReportModal(true)}
              className="inline-flex items-center justify-center rounded-xl bg-navy px-5 py-3 text-sm font-bold text-white shadow-[0_12px_24px_rgba(49,46,129,0.24)] transition hover:-translate-y-0.5 hover:bg-navy-dark"
            >
              <Download size={18} className="mr-2" />
              Download Attendance Report
            </button>
            <button
              onClick={downloadExcel}
              className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-[0_12px_24px_rgba(5,150,105,0.22)] transition hover:-translate-y-0.5 hover:bg-emerald-700"
            >
              <Download size={18} className="mr-2" />
              Download Excel
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-300/80 bg-gradient-to-br from-white via-white to-slate-50 p-3 shadow-[0_14px_32px_rgba(15,23,42,0.06)] sm:p-4">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 text-navy shadow-inner">
              <Filter size={18} />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wide text-slate-700">Filters</h2>
              <p className="text-xs font-semibold text-slate-400">Smart search and focused attendance view</p>
            </div>
          </div>
          {activeFilterCount > 0 && (
            <button
              onClick={() => {
                setSearchTerm('');
                setEmployeeFilter('');
                setMonthFilter('');
                setYearFilter('');
              }}
              className="inline-flex items-center justify-center rounded-full border border-indigo-200 bg-white px-4 py-1.5 text-sm font-bold text-navy shadow-[0_8px_18px_rgba(49,46,129,0.10)] transition hover:-translate-y-0.5 hover:bg-indigo-50 hover:text-navy-dark"
            >
              Clear filters
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(280px,1fr)_280px_220px_180px]">
          <div className="relative">
            <label className="mb-1 block text-[11px] font-black uppercase tracking-wide text-slate-500">Search</label>
            <input
              type="text"
              placeholder="Search by date, employee name, time, status, or month..."
              className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-sm font-semibold text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-navy focus:ring-4 focus:ring-indigo-100"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search size={18} className="absolute left-3.5 top-[33px] text-slate-400" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-black uppercase tracking-wide text-slate-500">Employee</label>
            <div className="relative">
              <User size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={employeeFilter}
                onChange={(e) => setEmployeeFilter(e.target.value)}
                className="h-11 w-full appearance-none rounded-xl border border-slate-300 bg-white pl-10 pr-9 text-sm font-semibold text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] outline-none transition hover:border-slate-400 focus:border-navy focus:ring-4 focus:ring-indigo-100"
              >
                <option value="">All Employees</option>
                {employeeOptions.map((employeeName) => (
                  <option key={employeeName} value={employeeName}>
                    {employeeName}
                  </option>
                ))}
              </select>
              <ChevronDown size={17} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-black uppercase tracking-wide text-slate-500">Month</label>
            <div className="relative">
              <Calendar size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="h-11 w-full appearance-none rounded-xl border border-slate-300 bg-white pl-10 pr-9 text-sm font-semibold text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] outline-none transition hover:border-slate-400 focus:border-navy focus:ring-4 focus:ring-indigo-100"
              >
                <option value="">All Months</option>
                {monthOptions.map((month) => (
                  <option key={month} value={month}>
                    {month}
                  </option>
                ))}
              </select>
              <ChevronDown size={17} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-black uppercase tracking-wide text-slate-500">Year</label>
            <div className="relative">
              <CalendarDays size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="h-11 w-full appearance-none rounded-xl border border-slate-300 bg-white pl-10 pr-9 text-sm font-semibold text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] outline-none transition hover:border-slate-400 focus:border-navy focus:ring-4 focus:ring-indigo-100"
              >
                <option value="">All Years</option>
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              <ChevronDown size={17} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>
        </div>
        {activeFilterCount > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {searchTerm && (
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-600 shadow-sm">
                Search: {searchTerm}
              </span>
            )}
            {employeeFilter && (
              <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-bold text-navy shadow-sm">
                Employee: {employeeFilter}
              </span>
            )}
            {monthFilter && (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 shadow-sm">
                Month: {monthFilter}
              </span>
            )}
            {yearFilter && (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 shadow-sm">
                Year: {yearFilter}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-300/80 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/80 px-3 py-3 sm:px-6 sm:py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wide text-slate-600">
              {attendanceView === 'calendar' ? 'Attendance Calendar' : 'Attendance Log'}
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-900">{calendarTitle}</p>
          </div>
          <div className="grid w-full grid-cols-2 rounded-full border border-slate-200 bg-white p-1 shadow-sm sm:inline-flex sm:w-auto">
            <button
              type="button"
              onClick={() => setAttendanceView('calendar')}
              className={`inline-flex items-center justify-center rounded-full px-3 py-2 text-xs font-bold transition sm:px-4 sm:text-sm ${
                attendanceView === 'calendar'
                  ? 'bg-navy text-white shadow-[0_8px_18px_rgba(49,46,129,0.20)]'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <CalendarDays size={17} className="mr-2" />
              Calendar
            </button>
            <button
              type="button"
              onClick={() => setAttendanceView('log')}
              className={`inline-flex items-center justify-center rounded-full px-3 py-2 text-xs font-bold transition sm:px-4 sm:text-sm ${
                attendanceView === 'log'
                  ? 'bg-navy text-white shadow-[0_8px_18px_rgba(49,46,129,0.20)]'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Table2 size={17} className="mr-2" />
              Attendance Log
            </button>
          </div>
        </div>
        <div className="p-3 sm:p-6">
          {attendanceView === 'calendar' ? (
            <>
              {tableLoading ? (
                <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
                  <div className="mb-3 h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
                  <span className="text-sm font-semibold text-slate-500">Loading attendance data...</span>
                </div>
              ) : error ? (
                <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-rose-200 bg-rose-50">
                  <p className="text-sm font-bold text-rose-600">Error: {error}</p>
                  <button
                    onClick={fetchAttendanceData}
                    className="mt-3 rounded-xl bg-navy px-4 py-2 text-sm font-bold text-white transition hover:bg-navy-dark"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(360px,520px)_1fr]">
                  <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50/70 p-2 sm:p-4">
                    <div className="mb-3 flex items-center justify-between px-1 sm:mb-4 sm:px-0">
                      <h3 className="text-lg font-black text-slate-950 sm:text-xl">Calendar</h3>
                      <button
                        type="button"
                        onClick={() => setAttendanceView('calendar')}
                        className="max-w-[120px] truncate text-sm font-bold text-blue-600 transition hover:text-blue-700 sm:max-w-none"
                      >
                        Go to calendar
                      </button>
                    </div>

                    <div className="rounded-xl bg-white p-3 shadow-[0_14px_32px_rgba(15,23,42,0.12)] sm:rounded-2xl sm:p-5">
                      <div className="mb-4 flex items-start justify-between">
                        <span className="rounded-md bg-orange-100 px-2.5 py-1.5 text-sm font-semibold text-slate-900">
                          Late Count -{calendarSummary.halfDay}
                        </span>
                        <button
                          type="button"
                          className="rounded-full p-1 text-slate-700 transition hover:bg-slate-100 sm:p-1.5"
                          aria-label="Calendar options"
                        >
                          <MoreVertical size={20} />
                        </button>
                      </div>

                      <div className="mb-4 flex items-center justify-center gap-4 sm:mb-5 sm:gap-7">
                        <button
                          type="button"
                          onClick={() => shiftCalendarMonth(-1)}
                          className="rounded-full p-1.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 sm:p-2"
                          aria-label="Previous month"
                        >
                          <ChevronLeft size={21} />
                        </button>
                        <div className="flex items-center gap-3 text-base font-black text-slate-950 sm:gap-4 sm:text-lg">
                          <span>{calendarMonth}</span>
                          <span>{calendarYear}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => shiftCalendarMonth(1)}
                          className="rounded-full p-1.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 sm:p-2"
                          aria-label="Next month"
                        >
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
                            <div
                              title={getCompactCalendarDayTitle(cell)}
                              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition hover:scale-105 sm:h-10 sm:w-10 sm:text-xl ${getCompactCalendarDayClass(cell)}`}
                            >
                              {cell.day}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-medium text-slate-700 sm:mt-5 sm:gap-x-5 sm:text-sm">
                        <span className="inline-flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-cyan-500" />
                          Today
                        </span>
                        <span className="inline-flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-emerald-200" />
                          Present
                        </span>
                        <span className="inline-flex items-center gap-2">
                          <span className="half-day-dot h-2 w-2 rounded-full" />
                          Half Day
                        </span>
                        <span className="inline-flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-red-400" />
                          Absent
                        </span>
                        <span className="inline-flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-violet-300" />
                          Holiday
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 sm:p-5">
                    <p className="text-xs font-black uppercase tracking-wide text-slate-500">Selected Summary</p>
                    <h3 className="mt-1 text-lg font-black text-slate-950 sm:text-xl">{calendarTitle}</h3>
                    <div className="mt-4 grid grid-cols-2 gap-2 sm:mt-5 sm:gap-3">
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 sm:rounded-2xl sm:px-4 sm:py-3">
                        <p className="text-xs font-black uppercase tracking-wide text-emerald-700">Present</p>
                        <p className="mt-1 text-xl font-black text-emerald-800 sm:text-2xl">{calendarSummary.present}</p>
                      </div>
                      <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 sm:rounded-2xl sm:px-4 sm:py-3">
                        <p className="text-xs font-black uppercase tracking-wide text-rose-700">Absent</p>
                        <p className="mt-1 text-xl font-black text-rose-800 sm:text-2xl">{calendarSummary.absent}</p>
                      </div>
                      <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 sm:rounded-2xl sm:px-4 sm:py-3">
                        <p className="text-xs font-black uppercase tracking-wide text-amber-700">Half Day</p>
                        <p className="mt-1 text-xl font-black text-amber-800 sm:text-2xl">{calendarSummary.halfDay}</p>
                      </div>
                      <div className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 sm:rounded-2xl sm:px-4 sm:py-3">
                        <p className="text-xs font-black uppercase tracking-wide text-slate-600">WO</p>
                        <p className="mt-1 text-xl font-black text-slate-800 sm:text-2xl">{calendarSummary.wo}</p>
                      </div>
                    </div>
                    <p className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2.5 text-xs font-semibold text-navy sm:mt-5 sm:rounded-2xl sm:px-4 sm:py-3 sm:text-sm">
                      {calendarRows.length} attendance records in this calendar view.
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="overflow-x-auto table-container rounded-2xl border border-slate-200 bg-white">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50/90">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-600">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-600">Employee Name</th>
                    <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-600">In Time</th>
                    <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-600">Out Time</th>
                    <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-600">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-600">Month</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {tableLoading ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <div className="mb-2 h-6 w-6 animate-spin rounded-full border-4 border-indigo-500 border-dashed"></div>
                          <span className="text-sm text-gray-600">Loading attendance data...</span>
                        </div>
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center">
                        <p className="text-red-500">Error: {error}</p>
                        <button
                          onClick={fetchAttendanceData}
                          className="mt-2 rounded-md bg-navy px-4 py-2 text-white hover:bg-navy-dark"
                        >
                          Retry
                        </button>
                      </td>
                    </tr>
                  ) : filteredData.length > 0 ? (
                    filteredData.map((item, index) => (
                      <tr key={index} className="transition hover:bg-slate-50">
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-slate-700">{formatAttendanceDate(item.date, item.month)}</td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-slate-900">{item.employeeName}</td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">{item.inTime || '-'}</td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">{item.outTime || '-'}</td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm">
                          <span className={`inline-flex min-w-12 justify-center rounded-full border px-2.5 py-1 text-xs font-bold ${getStatusBadgeClass(item.status)}`}>
                            {item.status || '-'}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">{item.month}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center">
                        <p className="text-gray-500">No attendance records found.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Download Attendance Report</h2>
                <p className="mt-1 text-sm text-slate-500">Select a month and year to export employee summary.</p>
              </div>
              <button
                onClick={() => setShowReportModal(false)}
                className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={22} />
              </button>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Month</label>
                <select
                  value={reportMonth}
                  onChange={(e) => setReportMonth(e.target.value)}
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-navy focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="">Select Month</option>
                  {monthOptions.map((month) => (
                    <option key={month} value={month}>
                      {month}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Year</label>
                <select
                  value={reportYear}
                  onChange={(e) => setReportYear(e.target.value)}
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-navy focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="">Select Year</option>
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
              <button
                onClick={() => setShowReportModal(false)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={downloadSummaryReport}
                className="inline-flex items-center justify-center rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-navy-dark"
              >
                <Download size={18} className="mr-2" />
                Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Attendance;
