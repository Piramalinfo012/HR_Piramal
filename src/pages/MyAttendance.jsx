import React, { useEffect, useState } from 'react';
import { Calendar, Clock, CheckCircle, XCircle } from 'lucide-react';

const MyAttendance = () => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState(null);
  const [attendanceData, setAttendanceData] = useState([]);
  const [userAttendanceData, setUserAttendanceData] = useState([]);

  // Get username from localStorage
  const getUsername = () => {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        return parsedUser.username || parsedUser.Name || parsedUser.salesPersonName || '';
      }
      return '';
    } catch (error) {
      console.error('Error parsing user data from localStorage:', error);
      return '';
    }
  };

  const formatDOB = (dateString) => {
    if (!dateString) return '';

    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString; // Return as-is if not a valid date
    }

    const day = date.getDate();
    const month = date.getMonth();
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  };

  const fetchReportDailySheet = async () => {
    setLoading(true);
    setTableLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_GOOGLE_SHEET_URL}?sheet=Report Daily&action=fetch`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Raw Report Daily API response:', result);

      if (!result.success) {
        if (result.error && result.error.includes("Cannot read properties of null")) {
          console.warn("Report Daily sheet not found in Google Sheets. Please create it if needed. Defaulting to empty data.");
          setAttendanceData([]);
          return;
        }
        throw new Error(result.error || 'Failed to fetch data from Report Daily sheet');
      }

      const rawData = result.data || result;

      if (!Array.isArray(rawData)) {
        throw new Error('Expected array data not received');
      }

      console.log('Raw data from sheet:', rawData);

      // Find the header row (look for "Date" column)
      let headerRowIndex = 0;
      for (let i = 0; i < rawData.length; i++) {
        if (rawData[i] && rawData[i].some(cell => cell && cell.toString().toLowerCase().includes('date'))) {
          headerRowIndex = i;
          break;
        }
      }

      console.log('Header row index:', headerRowIndex);

      // Get headers
      const headers = rawData[headerRowIndex].map(h => h?.toString().trim() || '');
      console.log('Headers:', headers);

      // Get data rows (skip header row)
      const dataRows = rawData.length > headerRowIndex + 1 ? rawData.slice(headerRowIndex + 1) : [];

      // Map data using header names - use display values directly
      const processedData = dataRows.map((row, index) => {
        const obj = {};
        headers.forEach((header, colIndex) => {
          // Keep the exact value as it appears in the sheet
          obj[header] = row[colIndex] !== undefined && row[colIndex] !== null ? row[colIndex].toString() : '';
        });
        return obj;
      });

      console.log('Processed Report Daily sheet:', processedData);

      // Save into state
      setAttendanceData(processedData);

    } catch (error) {
      console.error('Error fetching Report Daily sheet:', error);
      setError(error.message);
    } finally {
      setLoading(false);
      setTableLoading(false);
    }
  };

  // Filter attendance data for current user
  useEffect(() => {
    const username = getUsername();
    if (username && attendanceData.length > 0) {
      console.log('Filtering for username:', username);

      // Filter data to only show records where the name in Column G matches the username
      const filteredData = attendanceData.filter(record => {
        // Check if the name in Column G matches the username
        const nameInColumnG = record['Name'] || record['name'] || record['G'] || '';
        return nameInColumnG.toLowerCase().includes(username.toLowerCase());
      });

      setUserAttendanceData(filteredData);
      console.log('Filtered attendance data:', filteredData);
    }
  }, [attendanceData]);

  useEffect(() => {
    fetchReportDailySheet();
  }, []);

  // Filter attendance by selected month and year from user-specific data
  const filteredAttendance = userAttendanceData.filter(record => {
    const dateValue = record.Date || record.date || record['C'] || '';
    if (!dateValue) return false;

    try {
      // Try to parse various date formats
      let recordDate;
      if (dateValue.includes('-')) {
        // Format: YYYY-MM-DD or similar
        const [year, month, day] = dateValue.split('-').map(Number);
        recordDate = new Date(year, month - 1, day);
      } else if (dateValue.includes('/')) {
        // Format: MM/DD/YYYY or similar
        const [month, day, year] = dateValue.split('/').map(Number);
        recordDate = new Date(year, month - 1, day);
      } else {
        return true; // Show records with unknown date formats
      }

      return recordDate.getMonth() === selectedMonth && recordDate.getFullYear() === selectedYear;
    } catch (error) {
      console.error('Error parsing date:', dateValue, error);
      return true; // Show records even if date parsing fails
    }
  });

  // Calculate statistics
  const totalDays = userAttendanceData.filter(record => {
    const dateValue = record.Date || record.date || record['C'] || '';
    if (!dateValue) return false;

    try {
      // Try to parse various date formats
      let recordDate;
      if (dateValue.includes('-')) {
        // Format: YYYY-MM-DD or similar
        const [year, month, day] = dateValue.split('-').map(Number);
        recordDate = new Date(year, month - 1, day);
      } else if (dateValue.includes('/')) {
        // Format: MM/DD/YYYY or similar
        const [month, day, year] = dateValue.split('/').map(Number);
        recordDate = new Date(year, month - 1, day);
      } else {
        return false; // Skip records with unknown date formats
      }

      return recordDate.getMonth() === selectedMonth && recordDate.getFullYear() === selectedYear;
    } catch (error) {
      console.error('Error parsing date:', dateValue, error);
      return false; // Skip records if date parsing fails
    }
  }).length;

  const presentDays = userAttendanceData.filter(record => {
    const dateValue = record.Date || record.date || record['C'] || '';
    if (!dateValue) return false;

    try {
      // Try to parse various date formats
      let recordDate;
      if (dateValue.includes('-')) {
        const [year, month, day] = dateValue.split('-').map(Number);
        recordDate = new Date(year, month - 1, day);
      } else if (dateValue.includes('/')) {
        const [month, day, year] = dateValue.split('/').map(Number);
        recordDate = new Date(year, month - 1, day);
      } else {
        return false;
      }

      // Check if record is in selected month/year
      if (recordDate.getMonth() === selectedMonth && recordDate.getFullYear() === selectedYear) {
        // Get status from Column L (index 11)
        const status = record['Status'] || record['status'] || record['L'] || '';
        return status.toLowerCase().includes('present') || status.toLowerCase().includes('holiday');
      }
      return false;
    } catch (error) {
      console.error('Error parsing date:', dateValue, error);
      return false;
    }
  }).length;

  const absentDays = userAttendanceData.filter(record => {
    const dateValue = record.Date || record.date || record['C'] || '';
    if (!dateValue) return false;

    try {
      // Try to parse various date formats
      let recordDate;
      if (dateValue.includes('-')) {
        const [year, month, day] = dateValue.split('-').map(Number);
        recordDate = new Date(year, month - 1, day);
      } else if (dateValue.includes('/')) {
        const [month, day, year] = dateValue.split('/').map(Number);
        recordDate = new Date(year, month - 1, day);
      } else {
        return false;
      }

      // Check if record is in selected month/year
      if (recordDate.getMonth() === selectedMonth && recordDate.getFullYear() === selectedYear) {
        // Get status from Column L (index 11)
        const status = record['Status'] || record['status'] || record['L'] || '';
        return status.toLowerCase().includes('absent');
      }
      return false;
    } catch (error) {
      console.error('Error parsing date:', dateValue, error);
      return false;
    }
  }).length;

  // Calculate working hours based on time strings
  const totalWorkingHours = filteredAttendance.reduce((sum, record) => {
    const checkIn = record['Check In'] || record['check in'] || record['M'] || '';
    const checkOut = record['Check Out'] || record['check out'] || record['N'] || '';

    if (checkIn && checkOut) {
      try {
        const inTime = parseTimeString(checkIn);
        const outTime = parseTimeString(checkOut);

        if (inTime && outTime) {
          let hours = (outTime - inTime) / (1000 * 60 * 60);
          // Handle cases where out time might be next day (e.g., working past midnight)
          if (hours < 0) hours += 24;
          return sum + (hours > 0 ? hours : 0);
        }
      } catch (e) {
        console.log('Could not calculate hours from In/Out times:', e);
      }
    }
    return sum;
  }, 0);

  // Calculate overtime (assuming working hours > 8 is overtime)
  const totalOvertime = filteredAttendance.reduce((sum, record) => {
    const checkIn = record['Check In'] || record['check in'] || record['M'] || '';
    const checkOut = record['Check Out'] || record['check out'] || record['N'] || '';

    if (checkIn && checkOut) {
      try {
        const inTime = parseTimeString(checkIn);
        const outTime = parseTimeString(checkOut);

        if (inTime && outTime) {
          let hours = (outTime - inTime) / (1000 * 60 * 60);
          if (hours < 0) hours += 24;
          return sum + Math.max(0, hours - 8);
        }
      } catch (e) {
        console.log('Could not calculate overtime from In/Out times');
      }
    }
    return sum;
  }, 0);

  // Helper function to parse time strings like "10:00:00 AM"
  const parseTimeString = (timeStr) => {
    if (!timeStr) return null;

    let cleanTime = timeStr.toString().trim();

    // Handle AM/PM format
    let isPM = false;
    if (cleanTime.toLowerCase().includes('pm')) {
      isPM = true;
      cleanTime = cleanTime.toLowerCase().replace('pm', '').trim();
    } else if (cleanTime.toLowerCase().includes('am')) {
      cleanTime = cleanTime.toLowerCase().replace('am', '').trim();
    }

    // Split by colon
    const parts = cleanTime.split(':');
    if (parts.length < 2) return null;

    let hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const seconds = parts.length > 2 ? parseInt(parts[2], 10) : 0;

    // Adjust for PM
    if (isPM && hours < 12) hours += 12;
    if (!isPM && hours === 12) hours = 0; // 12 AM = 0 hours

    // Create a date object with fixed date and the parsed time
    return new Date(2000, 0, 1, hours, minutes, seconds);
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const years = [2023, 2024, 2025];

  // Determine status based on Check In time presence
  const getStatus = (record) => {
    const checkIn = record['Check In'] || record['check in'] || record['M'] || '';
    const status = record['Status'] || record['status'] || record['L'] || '';

    if (status && status !== '' && status !== '-') {
      return status;
    }

    if (checkIn && checkIn !== '' && checkIn !== '-') {
      return 'Present';
    }
    return 'Absent';
  };

  const getRecordValue = (record, keys) => {
    if (!record) return '';
    for (const key of keys) {
      const value = record[key];
      if (value !== undefined && value !== null && value.toString().trim() !== '') {
        return value;
      }
    }
    return '';
  };

  const yearOptions = Array.from(new Set([...years, selectedYear])).sort((a, b) => b - a);
  const latestRecord = filteredAttendance[0] || null;
  const latestStatus = latestRecord ? getStatus(latestRecord) : '';
  const mobileStats = [
    { label: 'Total', value: totalDays, icon: Calendar, tone: 'bg-blue-50 text-blue-700 border-blue-100' },
    { label: 'Present', value: presentDays, icon: CheckCircle, tone: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
    { label: 'Absent', value: absentDays, icon: XCircle, tone: 'bg-rose-50 text-rose-700 border-rose-100' },
    { label: 'Hours', value: totalWorkingHours.toFixed(1), icon: Clock, tone: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
  ];

  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const calendarStartDate = new Date(
    selectedYear,
    selectedMonth,
    1 - new Date(selectedYear, selectedMonth, 1).getDay()
  );

  const calendarCells = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(calendarStartDate);
    date.setDate(calendarStartDate.getDate() + index);
    return {
      key: `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
      day: date.getDate(),
      weekday: date.getDay(),
      isCurrentMonth: date.getMonth() === selectedMonth,
      isToday: date.toDateString() === new Date().toDateString(),
      fullDate: date,
    };
  });

  const getDayClass = (cell) => {
    if (!cell.isCurrentMonth) return 'bg-transparent text-slate-300';

    const record = filteredAttendance.find(r => {
      const dateValue = r.Date || r.date || r['C'] || '';
      if (!dateValue) return false;
      try {
        let recordDate;
        if (dateValue.includes('-')) {
          const [year, month, day] = dateValue.split('-').map(Number);
          recordDate = new Date(year, month - 1, day);
        } else if (dateValue.includes('/')) {
          const [month, day, year] = dateValue.split('/').map(Number);
          recordDate = new Date(year, month - 1, day);
        } else {
          return false;
        }
        return recordDate.toDateString() === cell.fullDate.toDateString();
      } catch (e) {
        return false;
      }
    });

    let statusClass = 'bg-white text-slate-700 shadow-sm border border-slate-100';

    if (record) {
      const status = getStatus(record).toLowerCase();
      if (status.includes('present') || status.includes('holiday')) {
        statusClass = 'bg-emerald-100 text-emerald-800 font-bold border-emerald-200';
      } else if (status.includes('absent')) {
        statusClass = 'bg-rose-100 text-rose-800 font-bold border-rose-200';
      }
    } else if (cell.weekday === 0) {
       statusClass = 'bg-violet-100 text-violet-800 font-bold border-violet-200';
    }

    return `${statusClass} ${cell.isToday ? 'ring-2 ring-emerald-500 ring-offset-2' : ''}`;
  };

  return (
    <>
      <div className="min-h-screen bg-[#f5f7fb] px-4 pb-24 pt-4 text-slate-950 md:hidden">
        <div className="overflow-hidden rounded-[28px] bg-gradient-to-br from-[#053f3a] via-[#0b5b53] to-[#12204d] p-5 text-white shadow-2xl shadow-slate-300">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100">Attendance</p>
              <h1 className="mt-2 text-2xl font-black">My Attendance</h1>
              <p className="mt-1 text-xs font-semibold text-cyan-50/80">{months[selectedMonth]} {selectedYear}</p>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
              <Calendar size={22} />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-white/60">Month</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="h-11 w-full rounded-2xl border border-white/20 bg-white/95 px-3 text-sm font-black text-slate-900 outline-none"
              >
                {months.map((month, index) => (
                  <option key={index} value={index}>{month}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-white/60">Year</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="h-11 w-full rounded-2xl border border-white/20 bg-white/95 px-3 text-sm font-black text-slate-900 outline-none"
              >
                {yearOptions.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-5 rounded-3xl bg-white/12 p-4 ring-1 ring-white/15">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100">Latest Punch</p>
            <div className="mt-3 flex items-end justify-between gap-3">
              <div>
                <p className="text-lg font-black">{getRecordValue(latestRecord, ['Date']) || '-'}</p>
                <p className="mt-1 text-xs font-semibold text-white/70">
                  In {getRecordValue(latestRecord, ['In Time', 'Check In', 'M']) || '-'} / Out {getRecordValue(latestRecord, ['Out Time', 'Check Out', 'N']) || '-'}
                </p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-black ${!latestStatus ? 'bg-white/15 text-white' : latestStatus.toLowerCase().includes('present') ? 'bg-emerald-300 text-emerald-950' : 'bg-rose-200 text-rose-950'}`}>
                {latestStatus || '-'}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {mobileStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className={`rounded-3xl border bg-white p-4 shadow-sm ${stat.tone}`}>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black uppercase tracking-wide opacity-75">{stat.label}</p>
                  <Icon size={18} />
                </div>
                <p className="mt-3 text-2xl font-black">{stat.value}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-5 rounded-3xl bg-white p-5 shadow-sm border border-slate-200">
          <div className="mb-4 grid grid-cols-7 gap-y-3">
            {weekDays.map((day) => (
              <div key={day} className="text-center text-xs font-black text-slate-400 uppercase tracking-wider">{day}</div>
            ))}
            {calendarCells.map((cell) => (
              <div key={cell.key} className="flex justify-center">
                <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm ${getDayClass(cell)}`}>
                  {cell.day}
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[10px] font-black uppercase tracking-widest mt-2 border-t border-slate-100 pt-4">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />Today</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-200" />Present</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-rose-200" />Absent</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-violet-200" />Holiday</span>
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-slate-950">Attendance Log</h2>
              <p className="text-xs font-semibold text-slate-500">{filteredAttendance.length} records</p>
            </div>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center text-sm font-bold text-slate-500 shadow-sm">
              Loading attendance data...
            </div>
          ) : error ? (
            <div className="rounded-3xl border border-rose-100 bg-rose-50 p-6 text-center text-sm font-bold text-rose-700 shadow-sm">
              Error: {error}
            </div>
          ) : filteredAttendance.length > 0 ? (
            <div className="space-y-3">
              {filteredAttendance.map((record, index) => {
                const dateValue = getRecordValue(record, ['Date', 'date', 'C']);
                const checkIn = getRecordValue(record, ['In Time', 'Check In', 'check in', 'M']);
                const checkOut = getRecordValue(record, ['Out Time', 'Check Out', 'check out', 'N']);
                const status = getStatus(record);
                const workingHours = getRecordValue(record, ['Working Hours']) || '0';
                const overtime = getRecordValue(record, ['Overtime Hours']) || '0';
                const isPresent = status.toLowerCase().includes('present') || status.toLowerCase().includes('holiday');

                return (
                  <article key={`${dateValue}-${index}`} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Date</p>
                        <h3 className="mt-1 text-base font-black text-slate-950">{dateValue || '-'}</h3>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${isPresent ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                        {status}
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="rounded-2xl bg-slate-50 p-3">
                        <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Check In</p>
                        <p className="mt-1 text-sm font-black text-slate-800">{checkIn || '-'}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-3">
                        <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Check Out</p>
                        <p className="mt-1 text-sm font-black text-slate-800">{checkOut || '-'}</p>
                      </div>
                      <div className="rounded-2xl bg-indigo-50 p-3">
                        <p className="text-[10px] font-black uppercase tracking-wide text-indigo-400">Working</p>
                        <p className="mt-1 text-sm font-black text-indigo-800">{workingHours} hrs</p>
                      </div>
                      <div className="rounded-2xl bg-amber-50 p-3">
                        <p className="text-[10px] font-black uppercase tracking-wide text-amber-500">Overtime</p>
                        <p className="mt-1 text-sm font-black text-amber-800">{overtime} hrs</p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <p className="text-sm font-bold text-slate-500">No attendance records found for this period.</p>
            </div>
          )}
        </div>
      </div>

      <div className="hidden space-y-6 page-content p-6 md:block">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">My Attendance</h1>
      </div>

      {/* Filter Section */}
      <div className="bg-white p-4 rounded-lg shadow border flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4">
        <div className="flex items-center space-x-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy"
            >
              {months.map((month, index) => (
                <option key={index} value={index}>{month}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy"
            >
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white rounded-xl shadow-lg border p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 mr-4">
              <Calendar size={24} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 font-medium">Total Days</p>
              <h3 className="text-2xl font-bold text-gray-800">{totalDays}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 mr-4">
              <CheckCircle size={24} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 font-medium">Present Days</p>
              <h3 className="text-2xl font-bold text-gray-800">{presentDays}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-red-100 mr-4">
              <XCircle size={24} className="text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 font-medium">Absent Days</p>
              <h3 className="text-2xl font-bold text-gray-800">{absentDays}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-indigo-100 mr-4">
              <Clock size={24} className="text-navy" />
            </div>
            <div>
              <p className="text-sm text-gray-600 font-medium">Working Hours</p>
              <h3 className="text-2xl font-bold text-gray-800">{totalWorkingHours.toFixed(1)}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-amber-100 mr-4">
              <Clock size={24} className="text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 font-medium">Overtime Hours</p>
              <h3 className="text-2xl font-bold text-gray-800">{totalOvertime.toFixed(1)}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <div className="p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">
            Attendance Records - {months[selectedMonth]} {selectedYear}
          </h2>
          {loading ? (
            <div className="px-6 py-12 text-center">
              <p className="text-gray-500">Loading attendance data...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check In</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check Out</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Working Hours</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Overtime</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAttendance.map((record, index) => {
                    const dateValue = record['Date'] || '';
                    const checkIn = record['In Time'] || '';
                    const checkOut = record['Out Time'] || '';
                    const status = record['Status'] || (checkIn ? 'Present' : 'Absent');
                    const workingHoursValue = record['Working Hours'] || '';
                    const overtimeValue = record['Overtime Hours'] || '';

                    let workingHours = 0;
                    let overtime = 0;

                    if (workingHoursValue && !isNaN(parseFloat(workingHoursValue))) {
                      workingHours = parseFloat(workingHoursValue);
                    }
                    if (overtimeValue && !isNaN(parseFloat(overtimeValue))) {
                      overtime = parseFloat(overtimeValue);
                    } else {
                      overtime = Math.max(0, workingHours - 8);
                    }

                    return (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {dateValue || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {checkIn || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {checkOut || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${status.toLowerCase() === 'present'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                            }`}>
                            {status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {workingHours || 0} hrs
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {overtime || 0} hrs
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

              </table>
              {filteredAttendance.length === 0 && !loading && (
                <div className="px-6 py-12 text-center">
                  <p className="text-gray-500">No attendance records found for the selected period.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      </div>
    </>
  );
};

export default MyAttendance;
