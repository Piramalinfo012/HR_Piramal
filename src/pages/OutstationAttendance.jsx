import React, { useEffect, useState } from 'react';
import { Search, Download, X, Filter, User, ChevronDown, CalendarDays, Table2, ChevronLeft, ChevronRight, MoreVertical, CheckCircle2, XCircle, Clock, Coffee, AlertCircle, TrendingUp, MapPin, ExternalLink } from 'lucide-react';
import XLSX from 'xlsx-js-style';

const OUTSTATION_SCRIPT_URL = import.meta.env.VITE_OUTSTATION_SHEET_URL;
const OUTSTATION_SPREADSHEET_ID = '1WTT8ZQhtf1yeSChNn2uJeW5Tz2TvYjQLrxhTx5l4Fgw';
const LEAVE_API_URL = import.meta.env.VITE_LEAVE_REQUEST_SHEET_URL;
const LEAVE_SHEET_NAME = 'FMS';
const LEAVE_DATA_START_INDEX = 6;

const parseGoogleSheetTable = (text, sheetLabel = "sheet") => {
  const jsonStart = text.indexOf("{");
  const jsonEnd = text.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
    throw new Error(`Invalid ${sheetLabel} response`);
  }
  const payload = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
  if (payload.status && payload.status !== "ok") {
    throw new Error(payload.errors?.[0]?.detailed_message || `Failed to read ${sheetLabel}`);
  }
  return (payload.table?.rows || []).map((row) =>
    (row.c || []).map((cell) => {
      if (!cell) return "";
      return cell.f ?? cell.v ?? "";
    })
  );
};

const OutstationAttendance = () => {
  const currentMonthName = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][new Date().getMonth()];
  const [searchTerm, setSearchTerm] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState(currentMonthName);
  const [yearFilter, setYearFilter] = useState(String(new Date().getFullYear()));
  const [attendanceView, setAttendanceView] = useState('calendar');
  const [logDateFilter, setLogDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [selectedCalendarDay, setSelectedCalendarDay] = useState(null);
  const [attendanceData, setAttendanceData] = useState([]);
  const [leaveData, setLeaveData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportMonth, setReportMonth] = useState('');
  const [reportYear, setReportYear] = useState('');
  const [empCodeMap, setEmpCodeMap] = useState({});
  const [masterData, setMasterData] = useState([]);

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

  const parseTimeToMinutes = (value) => {
    if (!value) return null;
    const match = value.toString().trim().match(/^(\d{1,2})[:.](\d{1,2})/);
    if (!match) return null;
    return Number(match[1]) * 60 + Number(match[2]);
  };

  const isHalfDayRecord = (record, mData = []) => {
    if (!record?.inTime || !record?.outTime || record.inTime === '-' || record.outTime === '-') return false;

    const inMinutes = parseTimeToMinutes(record.inTime);
    const outMinutes = parseTimeToMinutes(record.outTime);

    let expectedInMinutes = 9 * 60 + 15;
    let expectedOutMinutes = 18 * 60;

    if (mData && Array.isArray(mData) && mData.length > 0) {
      const matchedMaster = mData.find(
        (row) =>
          normalizeName(row[0]) === normalizeName(record.employeeName) ||
          normalizeName(row[1]) === normalizeName(record.employeeName)
      );

      if (matchedMaster) {
        const parseMasterTime = (val) => {
          if (!val) return null;
          const match = String(val).trim().match(/^(\d{1,2})[:.](\d{1,2})/);
          if (match) return Number(match[1]) * 60 + Number(match[2]);
          return null;
        };

        const mTimeIn = parseMasterTime(matchedMaster[9]) || parseMasterTime(matchedMaster[8]);
        const mTimeOut = parseMasterTime(matchedMaster[10]) || parseMasterTime(matchedMaster[9]);
        
        if (mTimeIn !== null) expectedInMinutes = mTimeIn;
        if (mTimeOut !== null) expectedOutMinutes = mTimeOut;
      }
    }

    return (
      (inMinutes !== null && inMinutes > expectedInMinutes) ||
      (outMinutes !== null && outMinutes < expectedOutMinutes)
    );
  };

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
      const [response, rawLeaves, joiningResponse, masterResponse] = await Promise.all([
        fetch(`${OUTSTATION_SCRIPT_URL}?action=getAllData`),
        LEAVE_API_URL
          ? fetch(`${LEAVE_API_URL}?sheet=${encodeURIComponent(LEAVE_SHEET_NAME)}&action=fetch`)
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
          : Promise.resolve([]),
        fetch(`${import.meta.env.VITE_JOINING_SHEET_URL}?action=read&sheet=JOINING_FMS`)
          .then(res => res.ok ? res.json() : null)
          .catch(e => {
            console.warn('Joining data skipped for Emp Code map:', e);
            return null;
          }),
        fetch(`https://docs.google.com/spreadsheets/d/${OUTSTATION_SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=Master&cb=${Date.now()}`)
          .then(async (res) => {
            if (!res.ok) throw new Error(`Master sheet HTTP error! status: ${res.status}`);
            const text = await res.text();
            return parseGoogleSheetTable(text, "Master");
          })
          .catch((e) => {
            console.warn('Master shift data skipped:', e);
            return [];
          })
      ]);

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      if (result.status !== 'success') throw new Error(result.message || 'Failed to fetch data');

      const rawAttendance = result.attendance || [];
      setMasterData(masterResponse || []);

      // Build Employee Code Map from Joining Sheet
      const codeMap = {};
      if (joiningResponse && joiningResponse.data) {
        const rawJoining = joiningResponse.data;
        if (rawJoining.length > 7) {
          const headers = rawJoining[6] || [];
          const getIndex = (name) => headers.findIndex(h => h && h.toString().trim().toLowerCase() === name.trim().toLowerCase());
          const idxName = getIndex("Candidate Name") !== -1 ? getIndex("Candidate Name") : 10;
          rawJoining.slice(7).forEach(row => {
            const name = (row[idxName] || '').toString().trim();
            const code = (row[0] || '').toString().trim(); // Column A (Index 0) is the Sr No / ID!
            if (name && code) {
              codeMap[normalizeName(name)] = code;
            }
          });
        }
      }
      setEmpCodeMap(codeMap);

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
    // 1. Determine Report Month and Year from filters or current date
    const currentMonthName = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][new Date().getMonth()];
    const reportMonth = monthFilter || currentMonthName;
    const reportYear = yearFilter || String(new Date().getFullYear());

    // 2. Find days in month
    const monthIndex = monthOrder.indexOf(reportMonth);
    const daysInMonth = new Date(Number(reportYear), monthIndex + 1, 0).getDate();

    // 3. Get unique employees (either matching filter or all)
    const employees = employeeFilter
      ? [employeeFilter]
      : [...new Set(attendanceData.map((i) => i.employeeName).filter(Boolean))].sort();

    const ws = {};
    const lastColIndex = 2 + daysInMonth + 4 - 1;

    // Helper for regular cells
    const setCell = (r, c, val, styles = {}) => {
      const cellRef = XLSX.utils.encode_cell({ r, c });

      const defaultBorder = {
        top: { style: "thin", color: { rgb: "D3D3D3" } },
        bottom: { style: "thin", color: { rgb: "D3D3D3" } },
        left: { style: "thin", color: { rgb: "D3D3D3" } },
        right: { style: "thin", color: { rgb: "D3D3D3" } }
      };

      ws[cellRef] = {
        v: val,
        t: typeof val === "number" ? "n" : "s",
        s: {
          font: { name: "Calibri", sz: 10, ...styles.font },
          alignment: { horizontal: "center", vertical: "center", wrapText: true, ...styles.alignment },
          border: styles.border || defaultBorder,
          fill: styles.fill || undefined
        }
      };
    };

    // Helper for title cells (no border, left align)
    const setTitleCell = (r, c, val, fontStyles = {}) => {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      ws[cellRef] = {
        v: val,
        t: "s",
        s: {
          font: { name: "Calibri", ...fontStyles },
          alignment: { horizontal: "left", vertical: "center" }
        }
      };
    };

    // Row 0, 1, 2 Titles
    setTitleCell(0, 0, "Monthly Attendance Report with (In/Out) Time", { bold: true, sz: 14 });
    setTitleCell(1, 0, `For Period : 1-${reportMonth}-${reportYear} To ${daysInMonth}-${reportMonth}-${reportYear}`, { sz: 10 });
    setTitleCell(2, 0, "Company Name : PIRAMAL PETROLEUM PRIVATE", { bold: true, sz: 11 });

    // Initialize all title cells empty up to last column so that merge bounds are set correctly
    for (let c = 1; c <= lastColIndex; c++) {
      setTitleCell(0, c, "");
      setTitleCell(1, c, "");
      setTitleCell(2, c, "");
    }

    // Row 3 Headers
    const headerStyle = {
      fill: { fgColor: { rgb: "F2F2F2" } },
      font: { bold: true, sz: 10 },
      alignment: { horizontal: "center", vertical: "center" }
    };

    setCell(3, 0, "Emp Code", headerStyle);
    setCell(3, 1, "Emp Name", headerStyle);
    for (let d = 1; d <= daysInMonth; d++) {
      setCell(3, 1 + d, d, { ...headerStyle, font: { bold: true, sz: 7 } });
    }
    setCell(3, 2 + daysInMonth, "Working Day", headerStyle);
    setCell(3, 2 + daysInMonth + 1, "Late Mark", headerStyle);
    setCell(3, 2 + daysInMonth + 2, "Leave", headerStyle);
    setCell(3, 2 + daysInMonth + 3, "pay day", headerStyle);

    // Row 4 onwards: Data
    employees.forEach((employee, idx) => {
      const rIndex = 4 + idx;
      const empNorm = normalizeName(employee);

      // Emp Code (Column A, index 0): get the serial number / Sr. No from JOINING_FMS
      const empCodeRaw = empCodeMap[empNorm] || "";
      const empCodeNum = Number(empCodeRaw);
      const empCode = isNaN(empCodeNum) || empCodeRaw === "" ? empCodeRaw : empCodeNum;

      setCell(rIndex, 0, empCode, {
        font: { bold: true, sz: 10 },
        alignment: { horizontal: "center", vertical: "center" }
      });

      // Emp Name
      setCell(rIndex, 1, employee, {
        font: { bold: true, sz: 10 },
        alignment: { horizontal: "left", vertical: "center" }
      });

      let workingDays = 0;
      let lateMarks = 0;
      let leaves = 0;

      for (let day = 1; day <= daysInMonth; day++) {
        const cIndex = 1 + day;
        const date = new Date(Number(reportYear), monthIndex, day);
        const isSunday = date.getDay() === 0;
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const record = attendanceData.find(item =>
          normalizeName(item.employeeName) === empNorm &&
          item.month === reportMonth &&
          item.year === reportYear &&
          item.day === day
        );

        // Check if there is an approved leave
        const hasLeave = leaveData.some(leave => {
          const dateKey = getDateKey(new Date(Number(reportYear), monthIndex, day));
          return normalizeName(leave.employeeName) === empNorm && leave.dateKeys.includes(dateKey);
        });

        if (record) {
          const inTime = record.inTime && record.inTime !== '-' ? record.inTime : '';
          const outTime = record.outTime && record.outTime !== '-' ? record.outTime : '';

          let cellVal = "";
          if (inTime && outTime) {
            cellVal = `${inTime}\n${outTime}`;
          } else if (inTime) {
            cellVal = `${inTime}`;
          } else if (outTime) {
            cellVal = `${outTime}`;
          } else {
            cellVal = "P";
          }

          workingDays += 1;

          // Late Mark check
          const isPunchMiss = record.inTime && record.inTime !== '-' && (!record.outTime || record.outTime === '-');
          const isHD = !isPunchMiss && isHalfDayRecord(record, masterData);

          if (isPunchMiss) {
            // Orange background for Punch Miss, not counted in lateMarks
            setCell(rIndex, cIndex, cellVal, {
              fill: { fgColor: { rgb: "FFA500" } }, // Orange
              font: { sz: 6 }
            });
          } else if (isHD) {
            lateMarks += 1;
            // Yellow background for Late mark
            setCell(rIndex, cIndex, cellVal, {
              fill: { fgColor: { rgb: "FFFF00" } }, // Yellow
              font: { sz: 6 }
            });
          } else if (!inTime && !outTime) {
            // Present without times: Green background
            setCell(rIndex, cIndex, cellVal, {
              fill: { fgColor: { rgb: "A9DFBF" } }, // Light Green
              font: { bold: true, sz: 6 }
            });
          } else {
            // Present with times: white background
            setCell(rIndex, cIndex, cellVal, {
              font: { sz: 6 }
            });
          }
        } else if (isSunday) {
          setCell(rIndex, cIndex, "WO-I", {
            font: { sz: 6 }
          });
          workingDays += 1; // WO counts as Working Day
        } else if (hasLeave) {
          setCell(rIndex, cIndex, "L", {
            font: { sz: 6 }
          });
          leaves += 1;
        } else if (date <= todayStart) {
          // Absent: Red background, white bold text
          setCell(rIndex, cIndex, "A", {
            fill: { fgColor: { rgb: "FF0000" } }, // Red
            font: { bold: true, color: { rgb: "FFFFFF" }, sz: 6 }
          });
          leaves += 1;
        } else {
          setCell(rIndex, cIndex, "");
        }
      }

      const payDays = Math.max(0, Math.round(daysInMonth - leaves - (lateMarks * 0.5)));

      // Totals columns
      const totalColStart = 2 + daysInMonth;
      const totalStyle = { font: { bold: true, sz: 10 } };

      setCell(rIndex, totalColStart, workingDays, totalStyle);
      setCell(rIndex, totalColStart + 1, lateMarks, totalStyle);
      setCell(rIndex, totalColStart + 2, leaves, totalStyle);
      setCell(rIndex, totalColStart + 3, payDays, totalStyle);
    });

    // Merges for title rows
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: lastColIndex } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: lastColIndex } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: lastColIndex } }
    ];

    // Set column widths
    const wscols = [
      { wch: 10 }, // Emp Code
      { wch: 22 }  // Emp Name
    ];
    for (let d = 1; d <= daysInMonth; d++) {
      wscols.push({ wch: 9 });
    }
    wscols.push({ wch: 13 }); // Working Day
    wscols.push({ wch: 11 }); // Late Mark
    wscols.push({ wch: 9 });  // Leave
    wscols.push({ wch: 11 }); // pay day
    ws['!cols'] = wscols;

    // Set row heights
    const wsrows = [
      { hpt: 26 }, // Title 1
      { hpt: 20 }, // Title 2
      { hpt: 20 }, // Title 3
      { hpt: 22 }  // Headers
    ];
    for (let i = 0; i < employees.length; i++) {
      wsrows.push({ hpt: 30 }); // High height for cells with newlines
    }
    ws['!rows'] = wsrows;

    // Set range reference
    ws['!ref'] = XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: 4 + employees.length - 1, c: lastColIndex }
    });

    // Write and save workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance Matrix');
    
    // File name
    const fileName = `Outstation_Monthly_Attendance_Report_${reportMonth}_${reportYear}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const downloadSummaryReport = () => {
    if (!reportMonth || !reportYear) {
      alert('Please select month and year for report');
      return;
    }

    const employees = [...new Set(attendanceData.map((i) => i.employeeName).filter(Boolean))].sort();
    const monthIndex = monthOrder.indexOf(reportMonth);
    const daysInMonth = new Date(Number(reportYear), monthIndex + 1, 0).getDate();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const reportRows = employees.map(employee => {
      let present = 0;
      let absent = 0;
      let wo = 0;
      let hd = 0;
      let punchMiss = 0;

      const empNameNorm = normalizeName(employee);

      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(Number(reportYear), monthIndex, day);
        date.setHours(0, 0, 0, 0);

        const record = attendanceData.find(item =>
          item.employeeName === employee &&
          item.month === reportMonth &&
          item.year === reportYear &&
          item.day === day
        );

        if (date.getDay() === 0) {
          wo += 1;
        } else if (record) {
          const inMins = parseTimeToMinutes(record.inTime);
          const outMins = parseTimeToMinutes(record.outTime);

          if ((record.inTime && record.inTime !== '-') && (!record.outTime || record.outTime === '-')) {
             punchMiss += 1;
             present += 1;
          } else if (isHalfDayRecord(record, masterData)) {
             hd += 1;
          } else {
             present += 1;
          }
        } else if (date <= todayStart) {
          absent += 1;
        }
      }

      return {
        Month: reportMonth,
        'Employee Name': employee,
        'Total Days': daysInMonth,
        'Total Present': present + (hd / 2),
        'Total Absent': absent + (hd / 2),
        'WO': wo,
        'Late Coming/Half Day': hd,
        'Punch Miss': punchMiss,
        'Pay Days': Math.max(0, Math.round(present + wo + (hd / 2)))
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(reportRows, {
      header: ['Month', 'Employee Name', 'Total Days', 'Total Present', 'Total Absent', 'WO', 'Late Coming/Half Day', 'Punch Miss', 'Pay Days']
    });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Outstation Report');
    XLSX.writeFile(workbook, `outstation_attendance_report_${reportMonth}_${reportYear}.xlsx`);
    setShowReportModal(false);
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

    const date = new Date(Number(calendarYear), calendarMonthIndex, day);
    date.setHours(0, 0, 0, 0);

    return date <= todayStart && date.getDay() !== 0;
  };
  const absentCalendarDays = hasCalendarMonth
    ? new Set(Array.from({ length: daysInCalendarMonth }, (_, index) => index + 1).filter(isAbsentCalendarDay))
    : new Set();
  const absentDayCount = absentCalendarDays.size;

  const calendarSummary = calendarRows.reduce((s, item) => {
    const isPunchMiss = item.inTime && item.inTime !== '-' && (!item.outTime || item.outTime === '-');
    const isHD = !isPunchMiss && isHalfDayRecord(item, masterData);
    
    if (isPunchMiss) s.punchMiss += 1;
    if (isHD) s.halfDay += 1;
    else if (!isPunchMiss) s.fullPresent += 1;
    
    return s;
  }, { fullPresent: 0, halfDay: 0, punchMiss: 0, absent: absentDayCount });

  calendarSummary.present = calendarSummary.fullPresent + calendarSummary.punchMiss + (calendarSummary.halfDay / 2);
  calendarSummary.absent = calendarSummary.absent + (calendarSummary.halfDay / 2);

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
    if (rows.length > 0) {
      const isPunchMiss = rows.some(r => r.inTime && r.inTime !== '-' && (!r.outTime || r.outTime === '-'));
      const isHD = !isPunchMiss && rows.some(r => isHalfDayRecord(r, masterData));
      if (isPunchMiss) {
        baseClass = 'bg-orange-100 ring-2 ring-orange-200 text-orange-800 font-bold';
      } else if (isHD) {
        baseClass = 'half-day-dot text-slate-950 font-bold shadow-sm';
      } else {
        baseClass = 'bg-emerald-200 text-slate-950 font-bold shadow-sm';
      }
    }
    else if (hasLeaveFormOnDay(cell.day)) baseClass = 'bg-violet-200 text-violet-900 font-bold';
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
          <div className="flex gap-2">
            <button
              onClick={() => setShowReportModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-navy px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-navy-dark"
            >
              <Download size={18} /> Download Report
            </button>
            <button
              onClick={downloadExcel}
              className="inline-flex items-center gap-2 rounded-xl bg-rose-500 px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-rose-600"
            >
              <Download size={18} /> Download Excel
            </button>
          </div>
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
          <div className="flex flex-wrap items-center gap-3">
            {attendanceView === 'log' && (
              <div className="relative">
                <input type="date" value={logDateFilter} onChange={(e) => setLogDateFilter(e.target.value)} className="h-9 w-36 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition hover:border-slate-400 focus:border-navy focus:ring-2 focus:ring-indigo-100" />
                {logDateFilter && (
                  <button onClick={() => setLogDateFilter('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X size={14} />
                  </button>
                )}
              </div>
            )}
            <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
              <button onClick={() => setAttendanceView('calendar')} className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-bold transition ${attendanceView === 'calendar' ? 'bg-navy text-white shadow-sm' : 'text-slate-600 hover:bg-white'}`}>
                <CalendarDays size={16} /> Calendar
              </button>
              <button onClick={() => setAttendanceView('log')} className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-bold transition ${attendanceView === 'log' ? 'bg-navy text-white shadow-sm' : 'text-slate-600 hover:bg-white'}`}>
                <Table2 size={16} /> Attendance Log
              </button>
            </div>
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
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
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
                      <div className="group flex flex-col items-center rounded-xl bg-amber-50 py-2.5 transition-all hover:shadow-md hover:shadow-amber-100">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500 text-white shadow-sm shadow-amber-200"><Clock size={14} /></div>
                        <p className="mt-1.5 text-lg font-black text-amber-700">{calendarSummary.halfDay}</p>
                        <p className="text-[9px] font-bold uppercase tracking-wide text-amber-500">Half Day</p>
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
                        {hasLeaveFormOnDay(selectedCalendarDay) ? 'Absent: Leave form found for this date.' : absentCalendarDays.has(selectedCalendarDay) ? 'Absent: no attendance mark and no leave form found for this date.' : 'No outstation records for this date.'}
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
                {(() => {
                  const tableData = filteredData.filter(item => {
                    if (!logDateFilter) return true;
                    const itemDateISO = item.dateObj ? `${item.dateObj.getFullYear()}-${String(item.dateObj.getMonth() + 1).padStart(2, '0')}-${String(item.dateObj.getDate()).padStart(2, '0')}` : '';
                    return itemDateISO === logDateFilter;
                  });

                  return tableData.length > 0 ? tableData.map((item, index) => (
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
                ) })()}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Download Outstation Report</h2>
                <p className="mt-1 text-sm text-slate-500">Select a month and year to export outstation employee summary.</p>
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
                Download Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OutstationAttendance;
