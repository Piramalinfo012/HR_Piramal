import React, { useState, useEffect } from 'react';
import { Search, X, Check, Clock, Calendar, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

const LEAVE_API_URL = import.meta.env.VITE_LEAVE_REQUEST_SHEET_URL;
const LEAVE_SHEET_NAME = 'FMS';
const LEAVE_DATA_START_INDEX = 6;

const LeaveManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [approvedLeaves, setApprovedLeaves] = useState([]);
  const [rejectedLeaves, setRejectedLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [actionInProgress, setActionInProgress] = useState(null);
  const [editableDates, setEditableDates] = useState({ from: '', to: '' });
  const [hodNames, setHodNames] = useState([]);

  // New state for leave request modal
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [formData, setFormData] = useState({
    employeeId: '',
    employeeName: '',
    designation: '',
    department: '',
    jobLocation: '',
    fromDate: '',
    toDate: '',
    reason: '',
    remark: '',
    imageUrl: ''
  });

  const fetchHodNames = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_GOOGLE_SHEET_URL}?sheet=${encodeURIComponent('Master')}&action=fetch`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch HOD data');
      }

      const rawData = result.data || result;

      if (!Array.isArray(rawData)) {
        throw new Error('Expected array data not received');
      }

      // Extract HOD names from Column A (index 0), skip header row
      const hodData = rawData.slice(1).map(row => row[0]?.toString().trim()).filter(name => name);

      setHodNames([...new Set(hodData)]); // Remove duplicates
    } catch (error) {
      console.error('Error fetching HOD data:', error);
      toast.error(`Failed to load HOD data: ${error.message}`);

      // Fallback to default HOD names if fetch fails
      setHodNames(['Deepak', 'Vikas', 'Dharam', 'Pratap', 'Aubhav']);
    }
  };

  const handleCheckboxChange = (leaveId, rowData) => {
    if (selectedRow?.serialNo === leaveId) {
      setSelectedRow(null);
      setEditableDates({ from: '', to: '' });
    } else {
      // Convert DD/MM/YYYY to YYYY-MM-DD for date input
      const formatForInput = (dateStr) => {
        const formattedDate = formatDOB(dateStr);
        if (!formattedDate || !formattedDate.includes('/')) return '';
        const [day, month, year] = formattedDate.split('/');
        if (!day || !month || !year) return '';
        return `${year}-${month}-${day}`;
      };

      setSelectedRow(rowData);
      setEditableDates({
        from: formatForInput(rowData.startDate),
        to: formatForInput(rowData.endDate)
      });
    }
  };

  const handleDateChange = (field, value) => {
    setEditableDates(prev => ({
      ...prev,
      [field]: value
    }));
  };

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

  // Fetch employees from JOINING_FMS sheet
  const fetchEmployees = async () => {
    try {
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

      // JOINING_FMS data starts from row 8 (index 7)
      const employeeData = rawData.slice(7).map((row, index) => ({
        id: row[idIndex] || '',
        name: row[nameIndex] || '',
        designation: row[designationIndex] || '',
        jobLocation: row[jobLocationIndex] || '',
        department: row[departmentIndex] || '',
        rowIndex: index + 8
      })).filter(emp => emp.name && emp.id);

      setEmployees(employeeData);
    } catch (error) {
      console.error('Error fetching employee data:', error);
      toast.error(`Failed to load employee data: ${error.message}`);
    }
  };


  // Handle employee selection
  const handleEmployeeChange = (selectedName) => {
    const selectedEmployee = employees.find(emp => emp.name === selectedName);
    setFormData(prev => ({
      ...prev,
      employeeName: selectedName,
      employeeId: selectedEmployee ? selectedEmployee.id : '',
      designation: selectedEmployee ? selectedEmployee.designation : '',
      department: selectedEmployee ? selectedEmployee.department : '',
      jobLocation: selectedEmployee ? selectedEmployee.jobLocation : ''
    }));
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === 'employeeName') {
      handleEmployeeChange(value);
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
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

  // Calculate days between dates
  const calculateDays = (startDateStr, endDateStr) => {
    const startDate = parseSheetDate(startDateStr);
    const endDate = parseSheetDate(endDateStr);
    if (!startDate || !endDate) return 0;

    const diffTime = endDate - startDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const formatDOB = (dateString) => formatDateToDDMMYYYY(dateString);

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

  const getCurrentApproverName = () => {
    try {
      const rawUser = localStorage.getItem('user');
      const user = rawUser ? JSON.parse(rawUser) : {};
      return user.Name || user.name || user['Employee Name'] || user.Username || user.username || 'Admin';
    } catch {
      return 'Admin';
    }
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
    days: row[4] || formatLeaveDays(row[6], row[7]),
    status: getApprovalStatus(row),
    approvalPending: hasSheetValue(row[11]) && !hasSheetValue(row[12]),
    sheetRowIndex: index + LEAVE_DATA_START_INDEX + 1,
  });


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
        toast.success('Leave Request submitted successfully!');
        setFormData({
          employeeId: '',
          employeeName: '',
          designation: '',
          department: '',
          jobLocation: '',
          fromDate: '',
          toDate: '',
          reason: '',
          remark: '',
          imageUrl: ''
        });
        setShowModal(false);
        // Refresh the data
        fetchLeaveData();
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

  const handleLeaveAction = async (action) => {
    if (!selectedRow) {
      toast.error('Please select a leave request');
      return;
    }

    const actionStatus = action === 'accept' ? 'Approved' : 'Rejected';
    const approvalRemark = window.prompt(`Enter remarks for ${actionStatus}`, selectedRow.approvalRemarks || '');
    if (approvalRemark === null) {
      return;
    }

    setActionInProgress(action);
    setLoading(true);

    try {
      const fullDataResponse = await fetch(
        getLeaveFetchUrl()
      );

      if (!fullDataResponse.ok) {
        throw new Error(`HTTP error! status: ${fullDataResponse.status}`);
      }

      const fullDataResult = await fullDataResponse.json();
      const allData = fullDataResult.data || fullDataResult;

      const rowIndex = selectedRow.sheetRowIndex || allData.findIndex((row, idx) =>
        idx >= LEAVE_DATA_START_INDEX &&
        row[1]?.toString().trim() === selectedRow.serialNo?.toString().trim()
      ) + 1;

      if (!rowIndex || rowIndex < 1) {
        throw new Error(`Leave request not found for ${selectedRow.requestedBy || selectedRow.leaveRequestId}`);
      }

      const updates = [];

      // Update dates if they were changed (Column G and H)
      if (editableDates.from && editableDates.from !== selectedRow.startDate) {
        updates.push({ columnIndex: 7, value: formatDOB(editableDates.from) });
      }

      if (editableDates.to && editableDates.to !== selectedRow.endDate) {
        updates.push({ columnIndex: 8, value: formatDOB(editableDates.to) });
      }

      const finalFromDate = editableDates.from && editableDates.from !== selectedRow.startDate
        ? formatDOB(editableDates.from)
        : selectedRow.startDate;
      const finalToDate = editableDates.to && editableDates.to !== selectedRow.endDate
        ? formatDOB(editableDates.to)
        : selectedRow.endDate;

      if (updates.some((update) => update.columnIndex === 7 || update.columnIndex === 8)) {
        updates.push({ columnIndex: 5, value: formatLeaveDays(finalFromDate, finalToDate) });
      }

      updates.push(
        { columnIndex: 13, value: formatSheetTimestamp() },
        { columnIndex: 15, value: getCurrentApproverName() },
        { columnIndex: 16, value: actionStatus },
        { columnIndex: 17, value: approvalRemark }
      );

      const results = await Promise.all(updates.map((update) =>
        fetch(LEAVE_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            sheetName: LEAVE_SHEET_NAME,
            action: "updateCell",
            rowIndex,
            columnIndex: update.columnIndex,
            value: update.value
          }).toString(),
        }).then((res) => res.json())
      ));

      if (results.every((result) => result.success)) {
        toast.success(`Leave ${action === 'accept' ? 'approved' : 'rejected'} for ${selectedRow.requestedBy || 'employee'}`);
        fetchLeaveData();
        setSelectedRow(null);
        setEditableDates({ from: '', to: '' });
      } else {
        const failed = results.find((result) => !result.success);
        throw new Error(failed?.error || "Update failed");
      }

    } catch (error) {
      console.error('Update error:', error);
      toast.error(`Failed to ${action} leave: ${error.message}`);
    } finally {
      setLoading(false);
      setActionInProgress(null);
    }
  };

  const fetchLeaveData = async () => {
    setLoading(true);
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
      const processedData = dataRows
        .map(mapLeaveRow)
        .filter((leave) => leave.serialNo || leave.employeeName || leave.startDate);

      // Case-insensitive filtering
      setPendingLeaves(processedData.filter(leave => leave.approvalPending));
      setApprovedLeaves(processedData.filter(leave =>
        leave.status?.toString().toLowerCase() === 'approved'
      ));
      setRejectedLeaves(processedData.filter(leave =>
        leave.status?.toString().toLowerCase() === 'rejected'
      ));

    } catch (error) {
      console.error('Error fetching leave data:', error);
      setError(error.message);
      toast.error(`Failed to load leave data: ${error.message}`);
    } finally {
      setLoading(false);
      setTableLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveData();
    fetchEmployees();
    fetchHodNames();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return formatDateToDDMMYYYY(dateString) || '-';
  };

  const filteredPendingLeaves = pendingLeaves.filter(item => {
    const matchesSearch = item.requestedBy?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.leaveRequestId?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const filteredApprovedLeaves = approvedLeaves.filter(item => {
    const matchesSearch = item.requestedBy?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.leaveRequestId?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const filteredRejectedLeaves = rejectedLeaves.filter(item => {
    const matchesSearch = item.requestedBy?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.leaveRequestId?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const leaveTypes = [
    'Casual Leave',
    'Earned Leave',
    // 'Normal Leave',
  ];

  const renderPendingLeavesTable = () => (
    <table className="min-w-full divide-y divide-white">
      <thead className="bg-gray-100">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Select
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LR-Unique No.</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requested By</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">To</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Leaves</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Request Remark</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Image</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Location</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Planned</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-white">
        {filteredPendingLeaves.length > 0 ? (
          filteredPendingLeaves.map((item, index) => (
            <tr key={index} className="hover:bg-white">
              <td className="px-6 py-4 whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={selectedRow?.serialNo === item.serialNo}
                  onChange={() => handleCheckboxChange(item.serialNo, item)}
                  className="h-4 w-4 text-navy focus:ring-navy border-gray-300 rounded"
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.leaveRequestId}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.requestedBy}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {selectedRow?.serialNo === item.serialNo ? (
                  <input
                    type="date"
                    value={editableDates.from}
                    onChange={(e) => handleDateChange('from', e.target.value)}
                    className="border rounded p-1 text-sm"
                  />
                ) : (
                  formatDate(item.startDate)
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {selectedRow?.serialNo === item.serialNo ? (
                  <input
                    type="date"
                    value={editableDates.to}
                    onChange={(e) => handleDateChange('to', e.target.value)}
                    className="border rounded p-1 text-sm"
                  />
                ) : (
                  formatDate(item.endDate)
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {selectedRow?.serialNo === item.serialNo ?
                  calculateDays(editableDates.from, editableDates.to) :
                  item.days
                }
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.leaveReason}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.remark}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {item.imageUrl ? (
                  <a href={item.imageUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800">
                    View
                  </a>
                ) : '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.department}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.jobLocation}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(item.approvalPlanned)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleLeaveAction('accept')}
                    disabled={!selectedRow || selectedRow.serialNo !== item.serialNo || loading}
                    className={`px-4 py-2 text-white bg-green-600 rounded-md hover:bg-green-700 min-h-[42px] flex items-center justify-center ${!selectedRow || selectedRow.serialNo !== item.serialNo || loading ? 'opacity-75 cursor-not-allowed' : ''
                      }`}
                  >
                    {loading && selectedRow?.serialNo === item.serialNo && actionInProgress === 'accept' ? (
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
                        <span>Accepting...</span>
                      </div>
                    ) : 'Accept'}
                  </button>
                  <button
                    onClick={() => handleLeaveAction('rejected')}
                    disabled={selectedRow?.serialNo !== item.serialNo || loading}
                    className={`px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 min-h-[42px] flex items-center justify-center ${selectedRow?.serialNo !== item.serialNo || (loading && actionInProgress === 'accept') ? 'opacity-75 cursor-not-allowed' : ''
                      }`}
                  >
                    {loading && selectedRow?.serialNo === item.serialNo && actionInProgress === 'rejected' ? (
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
                        <span>Rejecting...</span>
                      </div>
                    ) : 'Reject'}
                  </button>
                </div>
              </td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan="13" className="px-6 py-12 text-center">
              <p className="text-gray-500">No pending leave requests found.</p>
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );

  const renderApprovedLeavesTable = () => (
    <table className="min-w-full divide-y divide-white">
      <thead className="bg-gray-100">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LR-Unique No.</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requested By</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">To</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Leaves</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Request Remark</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Image</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Location</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Planned</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actual</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Delay</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approved By</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approval Remarks</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-white">
        {filteredApprovedLeaves.length > 0 ? (
          filteredApprovedLeaves.map((item, index) => (
            <tr key={index} className="hover:bg-white">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.leaveRequestId}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.requestedBy}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {formatDate(item.startDate)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {formatDate(item.endDate)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.days}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.leaveReason}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.remark}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {item.imageUrl ? (
                  <a href={item.imageUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800">
                    View
                  </a>
                ) : '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.department}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.jobLocation}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(item.approvalPlanned)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(item.approvalActual)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.approvalDelay}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.approvedBy}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.approvalStatus || item.status}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.approvalRemarks}</td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan="16" className="px-6 py-12 text-center">
              <p className="text-gray-500">No approved leave requests found.</p>
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );

  const renderRejectedLeavesTable = () => (
    <table className="min-w-full divide-y divide-white">
      <thead className="bg-gray-100">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LR-Unique No.</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requested By</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">To</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Leaves</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Request Remark</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Image</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Location</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Planned</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actual</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Delay</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approved By</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approval Remarks</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-white">
        {filteredRejectedLeaves.length > 0 ? (
          filteredRejectedLeaves.map((item, index) => (
            <tr key={index} className="hover:bg-white">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.leaveRequestId}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.requestedBy}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {formatDate(item.startDate)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {formatDate(item.endDate)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.days}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.leaveReason}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.remark}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {item.imageUrl ? (
                  <a href={item.imageUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800">
                    View
                  </a>
                ) : '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.department}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.jobLocation}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(item.approvalPlanned)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(item.approvalActual)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.approvalDelay}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.approvedBy}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.approvalStatus || item.status}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.approvalRemarks}</td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan="16" className="px-6 py-12 text-center">
              <p className="text-gray-500">No rejected leave requests found.</p>
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );

  const renderTable = () => {
    switch (activeTab) {
      case 'pending':
        return renderPendingLeavesTable();
      case 'approved':
        return renderApprovedLeavesTable();
      case 'rejected':
        return renderRejectedLeavesTable();
      default:
        return renderPendingLeavesTable();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Leave Management</h1>
          <span className="text-xs font-normal bg-green-100 text-green-700 px-2 py-0.5 rounded border border-green-200">v1.1 (Sync Fixed)</span>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-navy hover:bg-navy-dark"
        >
          <Plus size={16} className="mr-2" />
          New Leave Request
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4">
        <div className="flex flex-1 max-w-md">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Search by name or employee ID..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('pending')}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${activeTab === 'pending'
                ? 'border-indigo-500 text-navy'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              Pending Leaves ({pendingLeaves.length})
            </button>
            <button
              onClick={() => setActiveTab('approved')}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${activeTab === 'approved'
                ? 'border-indigo-500 text-navy'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              Approved Leaves ({approvedLeaves.length})
            </button>
            <button
              onClick={() => setActiveTab('rejected')}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${activeTab === 'rejected'
                ? 'border-indigo-500 text-navy'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              Rejected Leaves ({rejectedLeaves.length})
            </button>
          </nav>
        </div>

        <div className="p-6">
          <div className="overflow-x-auto">
            {tableLoading ? (
              <div className="px-6 py-12 text-center">
                <div className="flex justify-center flex-col items-center">
                  <div className="w-6 h-6 border-4 border-indigo-500 border-dashed rounded-full animate-spin mb-2"></div>
                  <span className="text-gray-600 text-sm">
                    {loading ? 'Processing request...' : 'Loading leave data...'}
                  </span>
                </div>
              </div>
            ) : error ? (
              <div className="px-6 py-12 text-center">
                <p className="text-red-500">Error: {error}</p>
                <button
                  onClick={fetchLeaveData}
                  className="mt-2 px-4 py-2 bg-navy text-white rounded-md hover:bg-navy-dark"
                >
                  Retry
                </button>
              </div>
            ) : (
              renderTable()
            )}
          </div>
        </div>
      </div>

      {/* Modal for new leave request */}
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
                <select
                  name="employeeName"
                  value={formData.employeeName}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy"
                  required
                >
                  <option value="">Select Employee</option>
                  {employees.map(employee => (
                    <option key={employee.id} value={employee.name}>{employee.name}</option>
                  ))}
                </select>
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

export default LeaveManagement;
