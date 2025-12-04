import React, { useEffect, useState } from 'react';
import { Plus, X, Calendar, Clock, CheckCircle, AlertCircle, Filter, Search } from 'lucide-react';
import useAuthStore from '../store/authStore';
import useDataStore from '../store/dataStore';
import toast from 'react-hot-toast';

const LeaveRequest = () => {
  const employeeId = localStorage.getItem("employeeId");
  const rawUser = localStorage.getItem("user");
  const user = rawUser ? JSON.parse(rawUser) : {}; 
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [leavesData, setLeavesData] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [employees, setEmployees] = useState([]);
  const [hodNames, setHodNames] = useState([]);
  const [formData, setFormData] = useState({
  employeeId: employeeId,
  employeeName: user.Name || '',
  designation: '',
  hodName: '',
  leaveType: '',
  fromDate: '',
  toDate: '',
  reason: ''
});

  const fetchHodNames = async () => {
    try {
      const response = await fetch(
        'https://script.google.com/macros/s/AKfycbx7_8IiGXsVplVge8Fi8PIsxL1Ub_QqQI77x1flWxkl2KlyunmnVheG7yA6safW20yZ/exec?sheet=Master&action=fetch'
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

      // Skip the first row (header) and get HOD names from Column A (index 0)
      const hodData = rawData.slice(1).map(row => row[0] || '').filter(name => name);
      
      setHodNames(hodData);
    } catch (error) {
      console.error('Error fetching HOD data:', error);
      toast.error(`Failed to load HOD data: ${error.message}`);
    }
  };

  // Fetch employee data including designation
  const fetchEmployeeData = async () => {
    try {
      const response = await fetch(
        'https://script.google.com/macros/s/AKfycbx7_8IiGXsVplVge8Fi8PIsxL1Ub_QqQI77x1flWxkl2KlyunmnVheG7yA6safW20yZ/exec?sheet=JOINING&action=fetch'
      );
      
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

      // Data starts from row 7 (index 6)
      // Column C (index 2) contains Employee Name
      // Column B (index 1) contains Employee ID
      // Column F (index 5) contains Designation
      const employeeRow = rawData.slice(6).find(row => 
        row[2]?.toString().trim().toLowerCase() === user.Name?.toString().trim().toLowerCase()
      );
      
      if (employeeRow) {
        const employeeId = employeeRow[1] || '';
        const designation = employeeRow[5] || '';
        
        setFormData(prev => ({
          ...prev,
          employeeId: employeeId,
          designation: designation
        }));
      }
    } catch (error) {
      console.error('Error fetching employee data:', error);
    }
  };

  // Fetch employees from JOINING sheet
  const fetchEmployees = async () => {
    try {
      const response = await fetch(
        'https://script.google.com/macros/s/AKfycbx7_8IiGXsVplVge8Fi8PIsxL1Ub_QqQI77x1flWxkl2KlyunmnVheG7yA6safW20yZ/exec?sheet=JOINING&action=fetch'
      );
      
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

      // Data starts from row 7 (index 6)
      // Column C is index 2 (Employee Name)
      // Column B is index 1 (Employee ID)
      // Column F is index 5 (Designation)
      const employeeData = rawData.slice(6).map((row, index) => ({
        id: row[1] || '', // Column B (Employee ID)
        name: row[2] || '', // Column C (Employee Name)
        designation: row[5] || '', // Column F (Designation)
        rowIndex: index + 7 // Actual row number in sheet
      })).filter(emp => emp.name && emp.id); // Filter out empty entries

      setEmployees(employeeData);
    } catch (error) {
      console.error('Error fetching employee data:', error);
      toast.error(`Failed to load employee data: ${error.message}`);
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

  const calculateDays = (startDateStr, endDateStr) => {
    if (!startDateStr || !endDateStr) return 0;
    
    let startDate, endDate;
    
    // Handle different date formats
    if (startDateStr.includes('/')) {
      const [startDay, startMonth, startYear] = startDateStr.split('/').map(Number);
      startDate = new Date(startYear, startMonth - 1, startDay);
    } else {
      startDate = new Date(startDateStr);
    }
    
    if (endDateStr.includes('/')) {
      const [endDay, endMonth, endYear] = endDateStr.split('/').map(Number);
      endDate = new Date(endYear, endMonth - 1, endDay);
    } else {
      endDate = new Date(endDateStr);
    }
    
    const diffTime = endDate - startDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

const calculateDaysInMonth = (startDateStr, endDateStr, month, year) => {
  if (!startDateStr || !endDateStr || month === 'all') {
    // For "All Months" selection, return the total days
    return calculateDays(startDateStr, endDateStr);
  }
  
  let startDate, endDate;
  
  // Handle different date formats
  if (startDateStr.includes('/')) {
    const [startDay, startMonth, startYear] = startDateStr.split('/').map(Number);
    startDate = new Date(startYear, startMonth - 1, startDay);
  } else {
    startDate = new Date(startDateStr);
  }
  
  if (endDateStr.includes('/')) {
    const [endDay, endMonth, endYear] = endDateStr.split('/').map(Number);
    endDate = new Date(endYear, endMonth - 1, endDay);
  } else {
    endDate = new Date(endDateStr);
  }
  
  // If the leave doesn't fall in the selected month and year at all, return 0
  const selectedMonthStart = new Date(year, parseInt(month), 1);
  const selectedMonthEnd = new Date(year, parseInt(month) + 1, 0);
  
  if (endDate < selectedMonthStart || startDate > selectedMonthEnd) {
    return 0;
  }
  
  // Adjust start date if it's before the selected month
  const adjustedStartDate = startDate < selectedMonthStart ? selectedMonthStart : startDate;
  
  // Adjust end date if it's after the selected month
  const adjustedEndDate = endDate > selectedMonthEnd ? selectedMonthEnd : endDate;
  
  // Calculate days in the selected month
  const diffTime = adjustedEndDate - adjustedStartDate;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  
  return Math.max(0, diffDays); // Ensure we don't return negative values
};


const formatDOB = (dateString) => {
  if (!dateString) return '';
  
  // If already in dd/mm/yyyy format, return as-is
  if (typeof dateString === 'string' && dateString.includes('/')) {
    const parts = dateString.split('/');
    if (parts.length === 3 && parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
      return dateString;
    }
  }
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return dateString; // Return as-is if not a valid date
  }
  
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  
  return `${day}/${month}/${year}`;
};

  // Function to parse date string in DD/MM/YYYY format
  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    
    // Handle different date formats that might come from the API
    if (dateStr.includes('/')) {
      const [day, month, year] = dateStr.split('/').map(Number);
      return new Date(year, month - 1, day);
    } else if (dateStr.includes('-')) {
      return new Date(dateStr);
    }
    
    return null;
  };

  // Check if a date falls within a specific month and year
  const isDateInSelectedPeriod = (dateStr, monthIndex, year) => {
    if (!dateStr || monthIndex === 'all') return true;
    
    const date = parseDate(dateStr);
    if (!date) return false;
    
    return date.getMonth() === parseInt(monthIndex) && date.getFullYear() === parseInt(year);
  };

const fetchLeaveData = async () => {
  setLoading(true);
  setTableLoading(true);
  setError(null);

  try {
    const response = await fetch(
      'https://script.google.com/macros/s/AKfycbx7_8IiGXsVplVge8Fi8PIsxL1Ub_QqQI77x1flWxkl2KlyunmnVheG7yA6safW20yZ/exec?sheet=Leave Management&action=fetch'
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch leave data');
    }
    
    const rawData = result.data || result;
    console.log("Raw data from API:", rawData);
    
    if (!Array.isArray(rawData)) {
      throw new Error('Expected array data not received');
    }

    const dataRows = rawData.length > 1 ? rawData.slice(1) : [];
    
    // Process and filter data by employee name
    // Update column indices according to your requirements:
    // Column E (index 4) - From Date
    // Column F (index 5) - To Date
    // Column L (index 11) - Leave Type
    const processedData = dataRows
      .map((row, index) => ({
        id: index + 1,
        timestamp: row[0] || '',
        serialNo: row[1] || '',
        employeeId: row[2] || '',
        employeeName: row[3] || '',
        startDate: row[4] || '', // Column E (index 4) - From Date
        endDate: row[5] || '',   // Column F (index 5) - To Date
        reason: row[6] || '',
        days: calculateDays(row[4], row[5]),
        status: row[7] || 'Pending',
        leaveType: row[8] || '', // Column L (index 11) - Leave Type
        appliedDate: row[0] || '', // Using timestamp as applied date
        approvedBy: row[9] || '',
      }))
      .filter(item => item.employeeName === user.Name);
    
    console.log("Filtered leave data:", processedData);
    setLeavesData(processedData);
   
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
    fetchEmployeeData();
    fetchHodNames();
  }, []);

const handleSubmit = async (e) => {
  e.preventDefault();

  if (!formData.employeeName || !formData.leaveType || !formData.fromDate || !formData.toDate || !formData.reason || !formData.hodName) {
    toast.error('Please fill all required fields');
    return;
  }

  try {
    setSubmitting(true);

   const now = new Date();

// Format timestamp as DD/MM/YYYY HH:MM:SS
const day = String(now.getDate()).padStart(2, '0');
const month = String(now.getMonth() + 1).padStart(2, '0');
const year = now.getFullYear();
const hours = String(now.getHours()).padStart(2, '0');
const minutes = String(now.getMinutes()).padStart(2, '0');
const seconds = String(now.getSeconds()).padStart(2, '0');
const formattedTimestamp = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;

    const rowData = [
      formattedTimestamp,           // Timestamp
      "",                          // Serial number (empty for auto-increment)
      formData.employeeId,         // Employee ID
      formData.employeeName,       // Employee Name
      formatDOB(formData.fromDate), // Leave Date Start (formatted to dd/mm/yyyy)
      formatDOB(formData.toDate),   // Leave Date End (formatted to dd/mm/yyyy)
      formData.reason,             // Reason
      "Pending",                   // Status
      formData.leaveType,          // Leave Type (Column L, index 11)
      formData.hodName,            // HOD Name
      formData.designation,        // Designation
    ];

    const response = await fetch('https://script.google.com/macros/s/AKfycbx7_8IiGXsVplVge8Fi8PIsxL1Ub_QqQI77x1flWxkl2KlyunmnVheG7yA6safW20yZ/exec', {
      method: 'POST',
      body: new URLSearchParams({
        sheetName: 'Leave Management',
        action: 'insert',
        rowData: JSON.stringify(rowData),
      }),
    });

    const result = await response.json();

    if (result.success) {
  toast.success('Leave Request submitted successfully!');
  
  // Refresh the data immediately to update the button state
  await fetchLeaveData();
  
  setFormData({
    employeeId: employeeId,
    employeeName: user.Name || '',
    designation: formData.designation || '',
    hodName: '',
    leaveType: '',
    fromDate: '',
    toDate: '',
    reason: ''
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

const hasSubmittedToday = () => {
  const today = new Date();
  const todayStr = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;
  
  return leavesData.some(leave => {
    // Case-insensitive employee name comparison
    if (!leave.timestamp || !leave.employeeName || 
        leave.employeeName.toLowerCase().trim() !== user.Name.toLowerCase().trim()) {
      return false;
    }
    
    // Extract date part from timestamp (M/D/YYYY H:M:S format from sheet)
    const timestampDate = leave.timestamp.split(' ')[0];
    return timestampDate === todayStr;
  });
};
  const leaveTypes = [
    'Casual Leave',
    'Earned Leave',
  ];

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

  // Calculate leave counts based on selected month and year
const calculateLeaveCounts = () => {
  // Filter for approved leaves for this specific employee
  const approvedLeaves = leavesData.filter(leave => 
    leave.status && leave.status.toLowerCase() === 'approved' && 
    leave.employeeName === user.Name
  );
  
  return {
    'Casual Leave': approvedLeaves
      .filter(leave => leave.leaveType && leave.leaveType.toLowerCase().includes('casual'))
      .reduce((sum, leave) => sum + calculateDaysInMonth(leave.startDate, leave.endDate, selectedMonth, parseInt(selectedYear)), 0),
    'Earned Leave': approvedLeaves
      .filter(leave => leave.leaveType && leave.leaveType.toLowerCase().includes('earned'))
      .reduce((sum, leave) => sum + calculateDaysInMonth(leave.startDate, leave.endDate, selectedMonth, parseInt(selectedYear)), 0),
  };
};

  // Calculate remaining leaves for the year
  const calculateRemainingLeaves = () => {
    const currentYear = new Date().getFullYear();
    
    // Filter for approved leaves for this specific employee in the current year
    const approvedLeaves = leavesData.filter(leave => 
      leave.status && leave.status.toLowerCase() === 'approved' && 
      leave.employeeName === user.Name
    );
    
    // Calculate total days taken for each leave type in the current year
    const casualLeaveTaken = approvedLeaves
      .filter(leave => leave.leaveType && leave.leaveType.toLowerCase().includes('casual'))
      .reduce((sum, leave) => {
        const leaveYear = new Date(parseDate(leave.startDate) || new Date()).getFullYear();
        return leaveYear === currentYear ? sum + calculateDays(leave.startDate, leave.endDate) : sum;
      }, 0);
      
    const earnedLeaveTaken = approvedLeaves
      .filter(leave => leave.leaveType && leave.leaveType.toLowerCase().includes('earned'))
      .reduce((sum, leave) => {
        const leaveYear = new Date(parseDate(leave.startDate) || new Date()).getFullYear();
        return leaveYear === currentYear ? sum + calculateDays(leave.startDate, leave.endDate) : sum;
      }, 0);
    
    // Company policy: 12 Casual Leave and 15 Earned Leave per year
    return {
      'Casual Leave': 12 - casualLeaveTaken,
      'Earned Leave': 24 - earnedLeaveTaken,
    };
  };

  // ✅ Approved leave counts (only number of requests)
  const calculateApprovedLeaveCounts = () => {
    const approvedLeaves = leavesData.filter(
      leave =>
        leave.status &&
        leave.status.toLowerCase() === 'approved' &&
        leave.employeeName === user.Name &&
        (selectedMonth === 'all' ||
          isDateInSelectedPeriod(leave.startDate, selectedMonth, selectedYear) ||
          isDateInSelectedPeriod(leave.endDate, selectedMonth, selectedYear))
    );

    return {
      'Casual Leave': approvedLeaves.filter(
        leave => leave.leaveType && leave.leaveType.toLowerCase() === 'casual leave'
      ).length,
      'Earned Leave': approvedLeaves.filter(
        leave => leave.leaveType && leave.leaveType.toLowerCase() === 'earned leave'
      ).length,
    };
  };

  const approvedCounts = calculateApprovedLeaveCounts();

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

  const remainingLeaves = calculateRemainingLeaves();

  return (
    <div className="space-y-6 page-content p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Leave Request</h1>
        <button 
  onClick={() => setShowModal(true)}
  disabled={hasSubmittedToday()}
  className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
    hasSubmittedToday() 
      ? 'bg-gray-400 cursor-not-allowed' 
      : 'bg-indigo-600 hover:bg-indigo-700'
  }`}
  title={hasSubmittedToday() ? "You have already submitted a leave request today. Please try again tomorrow." : ""}
>
  <Plus size={16} className="mr-2" />
  New Leave Request
  {hasSubmittedToday() && (
    <span className="ml-2 text-xs">(Disabled for today)</span>
  )}
</button>
      </div>

      {/* Month and Year Filter */}
      <div className="bg-white rounded-lg shadow border p-4">
        <div className="flex items-center flex-wrap gap-4">
          <div className="flex items-center">
            <Filter size={18} className="text-gray-500 mr-2" />
            <label htmlFor="monthFilter" className="text-sm font-medium text-gray-700 mr-3">
              Filter by Month:
            </label>
            <select
              id="monthFilter"
              value={selectedMonth}
              onChange={handleMonthChange}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {monthOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center">
            <label htmlFor="yearFilter" className="text-sm font-medium text-gray-700 mr-3">
              Year:
            </label>
            <select
              id="yearFilter"
              value={selectedYear}
              onChange={handleYearChange}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {yearOptions.map(year => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Leave Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Object.entries(calculateLeaveCounts()).map(([leaveType, days]) => (
          <div key={leaveType} className="bg-white rounded-xl shadow-lg border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">{leaveType}</p>
                <h3 className="text-2xl font-bold text-gray-800">{days}</h3>
                <p className="text-xs text-gray-500">
                  {selectedMonth === 'all' ? 'Total approved days' : `Days in ${monthOptions.find(m => m.value === selectedMonth)?.label || ''}`}
                </p>
              </div>
              <div className="p-3 rounded-full bg-indigo-100">
                <Calendar size={24} className="text-indigo-600" />
              </div>
            </div>
          </div>
        ))}
        
        {/* Total Leave Card */}
        <div className="bg-white rounded-xl shadow-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Total Leave</p>
              <h3 className="text-2xl font-bold text-gray-800">
                {Object.values(calculateLeaveCounts()).reduce((sum, days) => sum + days, 0)}
              </h3>
              <p className="text-xs text-gray-500">
                {selectedMonth === 'all' ? 'All approved days' : `Total days in ${monthOptions.find(m => m.value === selectedMonth)?.label || ''}`}
              </p>
            </div>
            <div className="p-3 rounded-full bg-indigo-100">
              <Calendar size={24} className="text-indigo-600" />
            </div>
          </div>
        </div>
        
        {/* Remaining Leaves Card */}
        <div className="bg-white rounded-xl shadow-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Remaining Leaves</p>
              <h3 className="text-2xl font-bold text-gray-800">
                {remainingLeaves['Casual Leave'] + remainingLeaves['Earned Leave']}
              </h3>
              <p className="text-xs text-gray-500">
                Casual: {remainingLeaves['Casual Leave']} | Earned: {remainingLeaves['Earned Leave']}
              </p>
            </div>
            <div className="p-3 rounded-full bg-green-100">
              <CheckCircle size={24} className="text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Leave Requests Table */}
      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <div className="p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">My Leave Requests</h2>
          {tableLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Leave Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">To Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applied Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {leavesData
                    .filter(leave => 
                      selectedMonth === 'all' || 
                      isDateInSelectedPeriod(leave.startDate, selectedMonth, selectedYear) || 
                      isDateInSelectedPeriod(leave.endDate, selectedMonth, selectedYear)
                    )
                    .map((request) => (
                    <tr key={request.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{request.leaveType}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDOB(request.startDate)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
  {formatDOB(request.endDate)}
</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{request.days}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">{request.reason}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          request.status === 'approved' 
                            ? 'bg-green-100 text-green-800' 
                            : request.status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {request.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {request.appliedDate}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {leavesData.length === 0 && (
                <div className="px-6 py-12 text-center">
                  <p className="text-gray-500">No leave requests found.</p>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee Name (कर्मचारी का नाम) *</label>
                <input
                  type="text"
                  name="employeeName"
                  value={formData.employeeName}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 focus:outline-none"
                  readOnly
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID (कर्मचारी आईडी)</label>
                <input
                  type="text"
                  name="employeeId"
                  value={formData.employeeId}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 focus:outline-none"
                  readOnly
                />
              </div>

              <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Designation (पद का नाम)</label>
          <input
            type="text"
            name="designation"
            value={formData.designation}
            onChange={handleInputChange}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">HOD Name (एचओडी का नाम) *</label>
                <select
                  name="hodName"
                  value={formData.hodName}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">Select HOD</option>
                  {hodNames.map((name, index) => (
                    <option key={index} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type *</label>
                <select
                  name="leaveType"
                  value={formData.leaveType}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">Select Leave Type</option>
                  {leaveTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From Date *</label>
                  <input
                    type="date"
                    name="fromDate"
                    value={formData.fromDate}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">To Date *</label>
                  <input
                    type="date"
                    name="toDate"
                    value={formData.toDate}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              {formData.fromDate && formData.toDate && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-800">
                    Total Days: <span className="font-semibold">{calculateDays(formData.fromDate, formData.toDate)}</span>
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
                <textarea
                  name="reason"
                  value={formData.reason}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Please provide reason for leave..."
                  required
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
                  className={`px-4 py-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-700 min-h-[42px] flex items-center justify-center ${
                    submitting ? 'opacity-75 cursor-not-allowed' : ''
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