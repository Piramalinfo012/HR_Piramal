import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, X, Calendar, Clock, CheckCircle, AlertCircle, Filter } from 'lucide-react';

import toast from 'react-hot-toast';

const LEAVE_API_URL = import.meta.env.VITE_LEAVE_REQUEST_SHEET_URL;
const LEAVE_SHEET_NAME = 'FMS';
const LEAVE_DATA_START_INDEX = 6;
const LEAVE_PAGE_SIZE = 25;
const LEAVE_PROCESS_CHUNK_SIZE = 500;

const LeaveRequest = () => {
  const employeeId = localStorage.getItem("employeeId");
  const rawUser = localStorage.getItem("user");
  const user = rawUser ? JSON.parse(rawUser) : {};
  const isAdmin = (user.Admin || user.admin || '').toString().trim().toLowerCase() === 'yes';
  const [tableLoading, setTableLoading] = useState(false);
  const [leavesData, setLeavesData] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [requestedByFilter, setRequestedByFilter] = useState(isAdmin ? 'all' : (user.Name || ''));
  const [visibleLimit, setVisibleLimit] = useState(LEAVE_PAGE_SIZE);
  const [employeeDetailsLoading, setEmployeeDetailsLoading] = useState(false);
  const leaveFetchInProgressRef = useRef(false);
  const employeeDetailsLoadedRef = useRef(false);
  const employeeFetchInProgressRef = useRef(false);
  const [formData, setFormData] = useState({
    employeeId: employeeId,
    employeeName: user.Name || '',
    designation: '',
    department: '',
    jobLocation: '',
    fromDate: '',
    toDate: '',
    reason: '',
    remark: '',
    imageUrl: ''
  });

  const getJoiningFetchUrl = () =>
    `${import.meta.env.VITE_JOINING_SHEET_URL}?action=read&sheet=JOINING_FMS`;

  const getColumnIndex = (headers, names, fallbackIndex) => {
    const normalizedNames = names.map((name) => name.toLowerCase());
    const index = headers.findIndex((header) => {
      const value = header?.toString().trim().toLowerCase();
      return value && normalizedNames.some((name) => value === name || value.includes(name));
    });
    return index !== -1 ? index : fallbackIndex;
  };

  // Fetch employee data including designation
  const fetchEmployeeData = async () => {
    if (employeeDetailsLoadedRef.current || employeeFetchInProgressRef.current) {
      return;
    }

    try {
      employeeFetchInProgressRef.current = true;
      setEmployeeDetailsLoading(true);
      const response = await fetch(getJoiningFetchUrl());

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch employee data');
      }

      const rawData = result.data || result;

      if (!Array.isArray(rawData)) {
        throw new Error('Expected array data not received');
      }

      const headers = rawData[6] || [];
      const idIndex = getColumnIndex(headers, ['Joining ID', 'Indent Number', 'ID'], 5);
      const nameIndex = getColumnIndex(headers, ['Candidate Name', 'Name As Per Aadhar', 'Employee Name'], 10);
      const designationIndex = getColumnIndex(headers, ['Designation'], 14);
      const jobLocationIndex = getColumnIndex(headers, ['Joining Place', 'Job Location', 'Location'], 13);
      const departmentIndex = getColumnIndex(headers, ['Department'], 2);

      const employeeRow = rawData.slice(7).find(row =>
        row[nameIndex]?.toString().trim().toLowerCase() === user.Name?.toString().trim().toLowerCase()
      );

      if (employeeRow) {
        const employeeId = employeeRow[idIndex] || '';
        const designation = employeeRow[designationIndex] || '';
        const jobLocation = employeeRow[jobLocationIndex] || '';
        const department = employeeRow[departmentIndex] || '';

        setFormData(prev => ({
          ...prev,
          employeeId: employeeId,
          designation: designation,
          department: department,
          jobLocation: jobLocation
        }));
        employeeDetailsLoadedRef.current = true;
      }
    } catch (error) {
      console.error('Error fetching employee data:', error);
    } finally {
      employeeFetchInProgressRef.current = false;
      setEmployeeDetailsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleMonthChange = (e) => {
    setSelectedMonth(e.target.value);
  };

  const handleYearChange = (e) => {
    setSelectedYear(e.target.value);
  };

  const handleRequestedByChange = (e) => {
    setRequestedByFilter(e.target.value);
  };

  const formatDateToDDMMYYYY = (dateValue) => {
    if (!dateValue) return '';

    if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
      const day = String(dateValue.getDate()).padStart(2, '0');
      const month = String(dateValue.getMonth() + 1).padStart(2, '0');
      return `${day}/${month}/${dateValue.getFullYear()}`;
    }

    const rawValue = dateValue.toString().trim();
    if (!rawValue) return '';

    const datePart = rawValue.split(/[ T]/)[0];
    const isoMatch = datePart.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      return `${isoMatch[3].padStart(2, '0')}/${isoMatch[2].padStart(2, '0')}/${isoMatch[1]}`;
    }

    if (datePart.includes('/')) {
      const [first, second, year] = datePart.split('/');
      if (first && second && year) {
        const firstNumber = Number(first);
        const secondNumber = Number(second);
        const day = secondNumber > 12 && firstNumber <= 12 ? second : first;
        const month = secondNumber > 12 && firstNumber <= 12 ? first : second;
        return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
      }
    }

    const parsedDate = new Date(rawValue);
    if (isNaN(parsedDate.getTime())) return rawValue;

    const day = String(parsedDate.getDate()).padStart(2, '0');
    const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${parsedDate.getFullYear()}`;
  };

  const parseSheetDate = (dateValue) => {
    const formattedDate = formatDateToDDMMYYYY(dateValue);
    if (!formattedDate || !formattedDate.includes('/')) return null;
    const [day, month, year] = formattedDate.split('/').map(Number);
    const date = new Date(year, month - 1, day);
    return isNaN(date.getTime()) ? null : date;
  };

  const calculateDays = (startDateStr, endDateStr) => {
    const startDate = parseSheetDate(startDateStr);
    const endDate = parseSheetDate(endDateStr);
    if (!startDate || !endDate) return 0;

    const diffTime = endDate - startDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const formatDOB = (dateString) => formatDateToDDMMYYYY(dateString);

  // Function to parse date string in DD/MM/YYYY format
  const parseDate = (dateStr) => {
    if (!dateStr) return null;

    return parseSheetDate(dateStr);
  };

  // Check if a date falls within a specific month and year
  const isDateInSelectedPeriod = (dateStr, monthIndex, year) => {
    if (!dateStr || monthIndex === 'all') return true;

    const date = parseDate(dateStr);
    if (!date) return false;

    return date.getMonth() === parseInt(monthIndex) && date.getFullYear() === parseInt(year);
  };

  const isDateInSelectedYear = (dateStr, year) => {
    if (!dateStr) return false;
    const date = parseDate(dateStr);
    if (!date) return false;
    return date.getFullYear() === parseInt(year);
  };

  const getLeaveFetchUrl = () =>
    `${LEAVE_API_URL}?sheet=${encodeURIComponent(LEAVE_SHEET_NAME)}&action=fetch`;

  const formatSheetTimestamp = () => formatDateToDDMMYYYY(new Date());

  const formatLeaveDays = (fromDate, toDate) => {
    const days = calculateDays(fromDate, toDate);
    if (!days) return '';
    return `${days} ${days === 1 ? 'day' : 'days'}`;
  };

  const hasSheetValue = (value) =>
    value !== null && value !== undefined && value.toString().trim() !== '';

  const normalizeApprovalStatus = (status) => {
    const value = status?.toString().trim().toLowerCase();
    if (value === 'approved' || value === 'approve') return 'approved';
    if (value === 'rejected' || value === 'reject') return 'rejected';
    return '';
  };

  const getApprovalStatus = (row) => {
    const approvalStatus = normalizeApprovalStatus(row[15]);
    if (approvalStatus) return approvalStatus;
    if (hasSheetValue(row[11]) && !hasSheetValue(row[12])) return 'Pending';
    return '';
  };

  const getNextLeaveRequestNo = (rows) => {
    const maxNo = rows
      .slice(LEAVE_DATA_START_INDEX)
      .reduce((max, row) => {
        const match = row[1]?.toString().match(/LR-?(\d+)/i);
        return match ? Math.max(max, Number(match[1])) : max;
      }, 0);

    return `LR-${String(maxNo + 1).padStart(2, '0')}`;
  };

  const mapLeaveRow = (row, index) => ({
    id: index + 1,
    timestamp: row[0] || '',
    leaveRequestId: row[1] || '',
    requestedBy: row[2] || '',
    department: row[3] || '',
    totalLeaves: row[4] || '',
    jobLocation: row[5] || '',
    leaveFromDate: row[6] || '',
    leaveToDate: row[7] || '',
    leaveReason: row[8] || '',
    remark: row[9] || '',
    imageUrl: row[10] || '',
    approvalPlanned: row[11] || '',
    approvalActual: row[12] || '',
    approvalDelay: row[13] || '',
    approvedBy: row[14] || '',
    approvalStatus: row[15] || '',
    approvalRemarks: row[16] || '',
    serialNo: row[1] || '',
    employeeId: row[1] || '',
    employeeName: row[2] || '',
    startDate: row[6] || '',
    endDate: row[7] || '',
    reason: row[8] || '',
    days: row[4] || formatLeaveDays(row[6], row[7]),
    status: getApprovalStatus(row),
    approvalPending: hasSheetValue(row[11]) && !hasSheetValue(row[12]),
    appliedDate: row[0] || '',
  });

  const yieldToBrowser = () =>
    new Promise((resolve) => window.setTimeout(resolve, 0));

  const processLeaveRows = async (rows) => {
    const processedData = [];
    const currentUserName = user.Name?.toString().trim().toLowerCase();

    for (let start = 0; start < rows.length; start += LEAVE_PROCESS_CHUNK_SIZE) {
      const chunk = rows
        .slice(start, start + LEAVE_PROCESS_CHUNK_SIZE)
        .map((row, index) => mapLeaveRow(row, start + index))
        .filter((item) =>
          isAdmin ||
          item.employeeName?.toString().trim().toLowerCase() === currentUserName
        );

      processedData.push(...chunk);

      if (start + LEAVE_PROCESS_CHUNK_SIZE < rows.length) {
        await yieldToBrowser();
      }
    }

    return processedData;
  };

  const fetchLeaveData = async () => {
    if (leaveFetchInProgressRef.current) {
      return;
    }

    leaveFetchInProgressRef.current = true;
    setTableLoading(true);
    setError(null);

    try {
      const response = await fetch(
        getLeaveFetchUrl()
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch leave data');
      }

      const rawData = result.data || result;

      if (!Array.isArray(rawData)) {
        throw new Error('Expected array data not received');
      }

      const dataRows = rawData.length > LEAVE_DATA_START_INDEX ? rawData.slice(LEAVE_DATA_START_INDEX) : [];
      const processedData = await processLeaveRows(dataRows);

      setLeavesData(processedData);

    } catch (error) {
      console.error('Error fetching leave data:', error);
      setError(error.message);
      toast.error(`Failed to load leave data: ${error.message}`);
    } finally {
      leaveFetchInProgressRef.current = false;
      setTableLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveData();
  }, []);

  useEffect(() => {
    if (showModal) {
      fetchEmployeeData();
    }
  }, [showModal]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.employeeName || !formData.department || !formData.jobLocation || !formData.fromDate || !formData.toDate || !formData.reason) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      setSubmitting(true);
      const dataResponse = await fetch(getLeaveFetchUrl());
      const dataResult = await dataResponse.json();
      const existingRows = Array.isArray(dataResult.data) ? dataResult.data : [];
      const formattedTimestamp = formatSheetTimestamp();
      const leaveRequestNo = getNextLeaveRequestNo(existingRows);

      const rowData = [
        formattedTimestamp,
        leaveRequestNo,
        formData.employeeName,
        formData.department || formData.designation,
        formatLeaveDays(formData.fromDate, formData.toDate),
        formData.jobLocation || '',
        formatDOB(formData.fromDate),
        formatDOB(formData.toDate),
        formData.reason,
        formData.remark,
        formData.imageUrl,
      ];

      const response = await fetch(LEAVE_API_URL, {
        method: 'POST',
        body: new URLSearchParams({
          sheetName: LEAVE_SHEET_NAME,
          action: 'insert',
          rowData: JSON.stringify(rowData),
        }),
      });

      const result = await response.json();

      if (result.success) {
        const optimisticLeave = {
          id: leavesData.length + 1,
          timestamp: formattedTimestamp,
          leaveRequestId: leaveRequestNo,
          requestedBy: formData.employeeName,
          department: formData.department || formData.designation,
          totalLeaves: formatLeaveDays(formData.fromDate, formData.toDate),
          jobLocation: formData.jobLocation || '',
          leaveFromDate: formatDOB(formData.fromDate),
          leaveToDate: formatDOB(formData.toDate),
          leaveReason: formData.reason,
          remark: formData.remark,
          imageUrl: formData.imageUrl,
          approvalPlanned: '',
          approvalActual: '',
          approvalDelay: '',
          approvedBy: '',
          approvalStatus: 'Pending',
          approvalRemarks: '',
          serialNo: leaveRequestNo,
          employeeId: leaveRequestNo,
          employeeName: formData.employeeName,
          startDate: formatDOB(formData.fromDate),
          endDate: formatDOB(formData.toDate),
          reason: formData.reason,
          days: formatLeaveDays(formData.fromDate, formData.toDate),
          status: 'Pending',
          approvalPending: true,
          appliedDate: formattedTimestamp,
        };

        setLeavesData((prev) => [optimisticLeave, ...prev]);
        toast.success('Leave Request submitted successfully!');

        setFormData({
          employeeId: employeeId,
          employeeName: user.Name || '',
          designation: formData.designation || '',
          department: formData.department || '',
          jobLocation: formData.jobLocation || '',
          fromDate: '',
          toDate: '',
          reason: '',
          remark: '',
          imageUrl: ''
        });
        setShowModal(false);
        window.setTimeout(fetchLeaveData, 1200);
      } else {
        toast.error('Failed to insert: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Insert error:', error);
      toast.error('Something went wrong!');
    } finally {
      setSubmitting(false);
    }
  };

  const hasSubmittedToday = useMemo(() => {
    const today = new Date();
    const todayStr = formatDateToDDMMYYYY(today);
    const currentUserName = user.Name?.toString().toLowerCase().trim();

    if (!currentUserName) {
      return false;
    }

    return leavesData.some(leave => {
      // Case-insensitive employee name comparison
      if (!leave.timestamp || !leave.employeeName ||
        leave.employeeName.toString().toLowerCase().trim() !== currentUserName) {
        return false;
      }

      // Extract date part from timestamp (M/D/YYYY H:M:S format from sheet)
      return formatDateToDDMMYYYY(leave.timestamp) === todayStr;
    });
  }, [leavesData, user.Name]);

  // Generate year options (current year and previous 5 years)
  const getYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];

    for (let i = currentYear; i >= currentYear - 5; i--) {
      years.push(i);
    }

    return years;
  };

  const yearOptions = getYearOptions();

  const requestedByOptions = useMemo(() => {
    if (!isAdmin) {
      return user.Name ? [user.Name] : [];
    }

    return [...new Set(
      leavesData
        .map((leave) => leave.requestedBy || leave.employeeName)
        .filter(Boolean)
    )].sort();
  }, [isAdmin, leavesData, user.Name]);

  const matchesRequestedByFilter = (leave) =>
    requestedByFilter === 'all' || (leave.requestedBy || leave.employeeName) === requestedByFilter;

  const visibleLeaves = useMemo(() => (
    isAdmin
      ? leavesData
      : leavesData.filter((leave) =>
        leave.employeeName?.toString().trim().toLowerCase() === user.Name?.toString().trim().toLowerCase()
      )
  ), [isAdmin, leavesData, user.Name]);

  const parseLeaveDaysValue = (value) => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;

    const normalized = value.toString().trim().toLowerCase();
    if (!normalized) return 0;
    if (/^1\s*\/\s*2/.test(normalized)) return 0.5;

    const numberMatch = normalized.match(/\d+(?:\.\d+)?/);
    let days = numberMatch ? Number(numberMatch[0]) : 0;
    const hasHalf = /half|haf|hanf|1\s*\/\s*2/.test(normalized);

    if (hasHalf && !normalized.includes('0.5')) {
      days += 0.5;
    }

    return Number.isFinite(days) ? days : 0;
  };

  const getLeaveDayCount = (leave) => {
    const daysFromColumnE = parseLeaveDaysValue(leave.totalLeaves || leave.days);
    return daysFromColumnE || calculateDays(leave.startDate, leave.endDate);
  };

  const formatLeaveCount = (value) =>
    Number.isInteger(value) ? value : Number(value.toFixed(1));

  // Generate month options for the dropdown
  const monthOptions = [
    { value: 'all', label: 'All Months' },
    { value: '0', label: 'January' },
    { value: '1', label: 'February' },
    { value: '2', label: 'March' },
    { value: '3', label: 'April' },
    { value: '4', label: 'May' },
    { value: '5', label: 'June' },
    { value: '6', label: 'July' },
    { value: '7', label: 'August' },
    { value: '8', label: 'September' },
    { value: '9', label: 'October' },
    { value: '10', label: 'November' },
    { value: '11', label: 'December' }
  ];

  const filteredLeaveRequests = useMemo(() => visibleLeaves.filter(leave => {
    const requestedByMatch = matchesRequestedByFilter(leave);
    const matchesYear = selectedMonth === 'all'
      ? (
        isDateInSelectedYear(leave.startDate, selectedYear) ||
        isDateInSelectedYear(leave.endDate, selectedYear) ||
        (!leave.startDate && !leave.endDate)
      )
      : (
        isDateInSelectedPeriod(leave.startDate, selectedMonth, selectedYear) ||
        isDateInSelectedPeriod(leave.endDate, selectedMonth, selectedYear)
      );

    return requestedByMatch && matchesYear;
  }), [visibleLeaves, selectedMonth, selectedYear, requestedByFilter]);

  useEffect(() => {
    setVisibleLimit(LEAVE_PAGE_SIZE);
  }, [selectedMonth, selectedYear, requestedByFilter]);

  const displayedLeaveRequests = useMemo(
    () => filteredLeaveRequests.slice(0, visibleLimit),
    [filteredLeaveRequests, visibleLimit]
  );

  const leaveDaySummary = useMemo(() => filteredLeaveRequests.reduce(
    (summary, leave) => {
      const dayCount = getLeaveDayCount(leave);
      const status = leave.status?.toString().toLowerCase();

      summary.total += dayCount;

      if (status === 'approved') {
        summary.approved += dayCount;
      } else if (status === 'pending') {
        summary.pending += dayCount;
      } else if (status === 'rejected') {
        summary.rejected += dayCount;
      }

      return summary;
    },
    { total: 0, approved: 0, pending: 0, rejected: 0 }
  ), [filteredLeaveRequests]);

  const leaveSummaryCards = useMemo(() => ([
    { label: 'Paid Leave', value: leaveDaySummary.total, subtext: 'Total leave days', icon: Calendar, iconClass: 'text-navy', bgClass: 'bg-indigo-100' },
    { label: 'Approved Leave', value: leaveDaySummary.approved, subtext: 'Approved leave days', icon: CheckCircle, iconClass: 'text-green-600', bgClass: 'bg-green-100' },
    { label: 'Pending Leave', value: leaveDaySummary.pending, subtext: 'Pending leave days', icon: Clock, iconClass: 'text-yellow-600', bgClass: 'bg-yellow-100' },
    { label: 'Rejected Leave', value: leaveDaySummary.rejected, subtext: 'Rejected leave days', icon: AlertCircle, iconClass: 'text-red-600', bgClass: 'bg-red-100' },
  ]), [leaveDaySummary]);

  const getStatusMeta = (status) => {
    const value = status?.toString().trim().toLowerCase();
    if (value === 'approved') {
      return {
        label: 'Approved',
        icon: CheckCircle,
        cardClass: 'bg-green-50 border-green-200',
        badgeClass: 'bg-green-100 text-green-800 border-green-200',
        iconClass: 'text-green-600',
      };
    }
    if (value === 'rejected') {
      return {
        label: 'Rejected',
        icon: AlertCircle,
        cardClass: 'bg-red-50 border-red-200',
        badgeClass: 'bg-red-100 text-red-800 border-red-200',
        iconClass: 'text-red-600',
      };
    }
    return {
      label: 'Pending',
      icon: Clock,
      cardClass: 'bg-yellow-50 border-yellow-200',
      badgeClass: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      iconClass: 'text-yellow-600',
    };
  };

  const DetailItem = ({ label, value, className = '' }) => (
    <div className={`min-w-0 ${className}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-sm text-gray-900 break-words">{value || '-'}</p>
    </div>
  );

  return (
    <div className="space-y-6 page-content p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Leave Request</h1>
        <button
          onClick={() => setShowModal(true)}
          disabled={hasSubmittedToday}
          className={`inline-flex w-full items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white sm:w-auto ${hasSubmittedToday
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-navy hover:bg-navy-dark'
            }`}
          title={hasSubmittedToday ? "You have already submitted a leave request today. Please try again tomorrow." : ""}
        >
          <Plus size={16} className="mr-2" />
          New Leave Request
          {hasSubmittedToday && (
            <span className="ml-2 text-xs">(Disabled for today)</span>
          )}
        </button>
      </div>

      {/* Month and Year Filter */}
      <div className="bg-white rounded-lg shadow border p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Filter size={18} className="text-gray-500 mr-2" />
            <label htmlFor="monthFilter" className="text-sm font-medium text-gray-700 mr-3">
              Filter by Month:
            </label>
            <select
              id="monthFilter"
              value={selectedMonth}
              onChange={handleMonthChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy sm:w-auto"
            >
              {monthOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label htmlFor="yearFilter" className="text-sm font-medium text-gray-700 mr-3">
              Year:
            </label>
            <select
              id="yearFilter"
              value={selectedYear}
              onChange={handleYearChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy sm:w-auto"
            >
              {yearOptions.map(year => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label htmlFor="requestedByFilter" className="text-sm font-medium text-gray-700 mr-3">
              Requested By:
            </label>
            <select
              id="requestedByFilter"
              value={requestedByFilter}
              onChange={handleRequestedByChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy sm:w-auto"
            >
              {isAdmin && <option value="all">All</option>}
              {requestedByOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Leave Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {leaveSummaryCards.map((card) => {
          const SummaryIcon = card.icon;

          return (
            <div key={card.label} className="bg-white rounded-xl shadow-lg border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">{card.label}</p>
                  <h3 className="text-2xl font-bold text-gray-800">{formatLeaveCount(card.value)}</h3>
                  <p className="text-xs text-gray-500">{card.subtext}</p>
                </div>
                <div className={`p-3 rounded-full ${card.bgClass}`}>
                  <SummaryIcon size={24} className={card.iconClass} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Leave Requests */}
      <div className="bg-white rounded-lg shadow border">
        <div className="p-4 sm:p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">My Leave Requests</h2>
          {tableLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredLeaveRequests.length > 0 ? (
                displayedLeaveRequests.map((request) => {
                  const statusMeta = getStatusMeta(request.status);
                  const StatusIcon = statusMeta.icon;
                  const isRejected = statusMeta.label === 'Rejected';

                  return (
                    <article key={request.leaveRequestId || request.id} className={`rounded-lg border p-4 ${statusMeta.cardClass}`}>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-semibold text-gray-900">{request.leaveRequestId || 'Leave Request'}</h3>
                            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusMeta.badgeClass}`}>
                              <StatusIcon size={14} className={statusMeta.iconClass} />
                              {statusMeta.label}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-gray-600 break-words">
                            {formatDOB(request.startDate)} to {formatDOB(request.endDate)} | {request.days || '-'}
                          </p>
                        </div>

                        {request.imageUrl && (
                          <a
                            href={request.imageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex shrink-0 items-center justify-center rounded-md border border-indigo-200 bg-white px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
                          >
                            View Image
                          </a>
                        )}
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <DetailItem label="Department" value={request.department} />
                        <DetailItem label="Job Location" value={request.jobLocation} />
                        <DetailItem label="Planned" value={formatDOB(request.approvalPlanned)} />
                        <DetailItem label="Actual" value={formatDOB(request.approvalActual)} />
                        <DetailItem label="Approved By" value={request.approvedBy} />
                        <DetailItem label="Applied Date" value={formatDOB(request.appliedDate)} />
                        <DetailItem label="Delay" value={request.approvalDelay} />
                        <DetailItem label="Request Remark" value={request.remark} />
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
                        <div className="rounded-md bg-white/70 p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Reason</p>
                          <p className="mt-1 text-sm text-gray-900 break-words">{request.reason || '-'}</p>
                        </div>
                        <div className={`rounded-md p-3 ${isRejected ? 'bg-red-100/70' : 'bg-white/70'}`}>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                            {isRejected ? 'Rejected Reason' : 'Approval Remarks'}
                          </p>
                          <p className="mt-1 text-sm text-gray-900 break-words">{request.approvalRemarks || '-'}</p>
                        </div>
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className="px-6 py-12 text-center">
                  <p className="text-gray-500">No leave requests found.</p>
                </div>
              )}
              {filteredLeaveRequests.length > 0 && (
                <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-gray-500">
                    Showing {Math.min(visibleLimit, filteredLeaveRequests.length)} of {filteredLeaveRequests.length} records
                  </p>
                  {visibleLimit < filteredLeaveRequests.length && (
                    <button
                      type="button"
                      onClick={() => setVisibleLimit((limit) => limit + LEAVE_PAGE_SIZE)}
                      className="inline-flex items-center justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Load more
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal for new leave request - Updated to match LeaveManagement */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto scrollbar-hide">
            <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
              <h3 className="text-lg font-medium">New Leave Request</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Timestamp</label>
                  <input
                    type="text"
                    value="Auto generated"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 focus:outline-none"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">LR-Unique No.</label>
                  <input
                    type="text"
                    value="Auto generated"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 focus:outline-none"
                    readOnly
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Requested By *</label>
                <input
                  type="text"
                  name="employeeName"
                  value={formData.employeeName}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 focus:outline-none"
                  readOnly
                />
                {employeeDetailsLoading && (
                  <p className="mt-1 text-xs text-gray-500">Loading employee details...</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Departments *</label>
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Job location *</label>
                <input
                  type="text"
                  name="jobLocation"
                  value={formData.jobLocation}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of leave FROM *</label>
                  <input
                    type="date"
                    name="fromDate"
                    value={formData.fromDate}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">TO *</label>
                  <input
                    type="date"
                    name="toDate"
                    value={formData.toDate}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy"
                    required
                  />
                </div>
              </div>

              {formData.fromDate && formData.toDate && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-800">
                    Total No of leaves days: <span className="font-semibold">{formatLeaveDays(formData.fromDate, formData.toDate)}</span>
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Taking Leave *</label>
                <textarea
                  name="reason"
                  value={formData.reason}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy"
                  placeholder="Please provide reason for leave..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remark</label>
                <textarea
                  name="remark"
                  value={formData.remark}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy"
                  placeholder="Enter remark..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image</label>
                <input
                  type="url"
                  name="imageUrl"
                  value={formData.imageUrl}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy"
                  placeholder="Paste image URL..."
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 text-white bg-navy rounded-md hover:bg-navy-dark min-h-[42px] flex items-center justify-center ${submitting ? 'opacity-75 cursor-not-allowed' : ''
                    }`}
                  disabled={submitting}
                >
                  {submitting ? (
                    <div className="flex items-center">
                      <svg
                        className="animate-spin h-4 w-4 text-white mr-2"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Submitting...</span>
                    </div>
                  ) : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveRequest;
