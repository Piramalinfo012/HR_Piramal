import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
  PieChart,
  Pie
} from 'recharts';
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  UserPlus,
  TrendingUp,
  FileText,
  Calendar
} from 'lucide-react';

const Dashboard = () => {
  const [totalEmployee, setTotalEmployee] = useState(0);
  const [activeEmployee, setActiveEmployee] = useState(0);
  const [leftEmployee, setLeftEmployee] = useState(0);
  const [leaveThisMonth, setLeaveThisMonth] = useState(0);
  const [monthlyHiringData, setMonthlyHiringData] = useState([]);
  const [designationData, setDesignationData] = useState([]);
  const [leaveStatusData, setLeaveStatusData] = useState([]);
  const [leaveTypeData, setLeaveTypeData] = useState([]);
  const [departmentData, setDepartmentData] = useState([]);



  const [indentData, setIndentData] = useState([]);

  const [tableLoading, setTableLoading] = useState(false);

  // Parse DD/MM/YYYY format date
  const parseSheetDate = (dateStr) => {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    return new Date(year, month, day);
  };

  // Fetch Leave Management Data for New Analytics
  const fetchLeaveManagementAnalytics = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_GOOGLE_SHEET_URL}?sheet=Leave%20Management&action=fetch`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch data from Leave Management sheet');
      }

      const rawData = result.data || result;
      if (!Array.isArray(rawData)) {
        throw new Error('Expected array data not received');
      }

      // Assuming headers are in the first row
      const headers = rawData[0];
      const dataRows = rawData.slice(1);

      // Find column indexes based on the image
      const statusIndex = headers.findIndex(h => h && h.toString().trim().toLowerCase().includes("status"));
      const leaveTypeIndex = headers.findIndex(h => h && h.toString().trim().toLowerCase().includes("leave type"));

      // Count leave status distribution
      const statusCounts = {};
      const typeCounts = {};

      dataRows.forEach(row => {
        // Count by status
        const status = row[statusIndex]?.toString().trim() || 'Unknown';
        if (statusCounts[status]) {
          statusCounts[status] += 1;
        } else {
          statusCounts[status] = 1;
        }

        // Count by leave type
        const leaveType = row[leaveTypeIndex]?.toString().trim() || 'Unknown';
        if (typeCounts[leaveType]) {
          typeCounts[leaveType] += 1;
        } else {
          typeCounts[leaveType] = 1;
        }
      });

      // Convert to array format for charts
      const statusArray = Object.keys(statusCounts).map(key => ({
        status: key,
        count: statusCounts[key]
      }));

      const typeArray = Object.keys(typeCounts).map(key => ({
        type: key,
        count: typeCounts[key]
      }));

      setLeaveStatusData(statusArray);
      setLeaveTypeData(typeArray);

    } catch (error) {
      console.error("Error fetching leave management analytics:", error);
      setLeaveStatusData([]);
      setLeaveTypeData([]);
    }
  };

  const fetchJoiningCount = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_GOOGLE_SHEET_URL}?sheet=JOINING&action=fetch`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch data from JOINING sheet');
      }

      const rawData = result.data || result;
      if (!Array.isArray(rawData)) {
        throw new Error('Expected array data not received');
      }

      // Headers are row 6 → index 5
      const headers = rawData[5];
      const dataRows = rawData.length > 6 ? rawData.slice(6) : [];

      // Find index of "Status", "Date of Joining", and "Designation" columns
      const statusIndex = headers.findIndex(
        h => h && h.toString().trim().toLowerCase() === "status"
      );

      const dateOfJoiningIndex = headers.findIndex(
        h => h && h.toString().trim().toLowerCase().includes("date of joining")
      );

      const designationIndex = headers.findIndex(
        h => h && h.toString().trim().toLowerCase() === "designation"
      );

      let activeCount = 0;
      const monthlyHiring = {};
      const designationCounts = {};

      // Initialize monthly hiring data for the last 6 months
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const currentDate = new Date();
      for (let i = 5; i >= 0; i--) {
        const monthIndex = (currentDate.getMonth() - i + 12) % 12;
        const monthYear = `${months[monthIndex]} ${currentDate.getFullYear()}`;
        monthlyHiring[monthYear] = { hired: 0 };
      }

      if (statusIndex !== -1) {
        activeCount = dataRows.filter(
          row => row[statusIndex]?.toString().trim().toLowerCase() === "active"
        ).length;
      }

      // Count hires by month if date of joining column exists
      if (dateOfJoiningIndex !== -1) {
        dataRows.forEach(row => {
          const dateStr = row[dateOfJoiningIndex];
          if (dateStr) {
            const date = parseSheetDate(dateStr);
            if (date) {
              const monthYear = `${months[date.getMonth()]} ${date.getFullYear()}`;
              if (monthlyHiring[monthYear]) {
                monthlyHiring[monthYear].hired += 1;
              } else {
                monthlyHiring[monthYear] = { hired: 1 };
              }
            }
          }
        });
      }

      // Count employees by designation
      if (designationIndex !== -1) {
        dataRows.forEach(row => {
          const designation = row[designationIndex]?.toString().trim();
          if (designation) {
            if (designationCounts[designation]) {
              designationCounts[designation] += 1;
            } else {
              designationCounts[designation] = 1;
            }
          }
        });

        // Convert to array format for the chart
        const designationArray = Object.keys(designationCounts).map(key => ({
          designation: key,
          employees: designationCounts[key]
        }));

        setDesignationData(designationArray);
      }

      // Update state
      setActiveEmployee(dataRows.length);

      // Return both counts and monthly hiring data
      return {
        total: dataRows.length,
        active: activeCount,
        monthlyHiring
      };

    } catch (error) {
      console.error("Error fetching joining count:", error);
      return { total: 0, active: 0, monthlyHiring: {} };
    }
  };

  const fetchDepartmentData = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_GOOGLE_SHEET_URL}?sheet=JOINING&action=fetch`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch data from JOINING sheet');
      }

      const rawData = result.data || result;
      if (!Array.isArray(rawData)) {
        throw new Error('Expected array data not received');
      }

      // Headers are row 6 → index 5
      const headers = rawData[5];
      const dataRows = rawData.length > 6 ? rawData.slice(6) : [];

      // Find index of "Department" column (Column U, index 20)
      const departmentIndex = 20;

      const departmentCounts = {};

      // Count employees by department
      dataRows.forEach(row => {
        const department = row[departmentIndex]?.toString().trim();
        if (department) {
          if (departmentCounts[department]) {
            departmentCounts[department] += 1;
          } else {
            departmentCounts[department] = 1;
          }
        }
      });

      // Convert to array format for the chart
      const departmentArray = Object.keys(departmentCounts).map(key => ({
        department: key,
        employees: departmentCounts[key]
      }));

      return departmentArray;

    } catch (error) {
      console.error("Error fetching department data:", error);
      return [];
    }
  };

  const fetchLeaveCount = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_GOOGLE_SHEET_URL}?sheet=LEAVING&action=fetch`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch data from LEAVING sheet');
      }

      const rawData = result.data || result;
      if (!Array.isArray(rawData)) {
        throw new Error('Expected array data not received');
      }

      const headers = rawData[5];       // Row 6 headers
      const dataRows = rawData.slice(6); // Row 7 onwards

      // Check for Column D (index 3) for "Left This Month" count
      let thisMonthCount = 0;
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      if (dataRows.length > 0) {
        // Use column D (index 3) for date of leaving
        thisMonthCount = dataRows.filter(row => {
          const dateStr = row[3]; // Column D (index 3)
          if (dateStr) {
            const parsedDate = parseSheetDate(dateStr);
            return (
              parsedDate &&
              parsedDate.getMonth() === currentMonth &&
              parsedDate.getFullYear() === currentYear
            );
          }
          return false;
        }).length;
      }

      // Count leaving by month (for the chart)
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthlyLeaving = {};

      // Initialize monthly leaving data for the last 6 months
      for (let i = 5; i >= 0; i--) {
        const monthIndex = (now.getMonth() - i + 12) % 12;
        const monthYear = `${months[monthIndex]} ${now.getFullYear()}`;
        monthlyLeaving[monthYear] = { left: 0 };
      }

      dataRows.forEach(row => {
        const dateStr = row[3]; // Use Column D (index 3) for date of leaving
        if (dateStr) {
          const date = parseSheetDate(dateStr);
          if (date) {
            const monthYear = `${months[date.getMonth()]} ${date.getFullYear()}`;
            if (monthlyLeaving[monthYear]) {
              monthlyLeaving[monthYear].left += 1;
            } else {
              monthlyLeaving[monthYear] = { left: 1 };
            }
          }
        }
      });

      // Update states
      setLeftEmployee(dataRows.length);
      setLeaveThisMonth(thisMonthCount);

      return { total: dataRows.length, monthlyLeaving };

    } catch (error) {
      console.error("Error fetching leave count:", error);
      return { total: 0, monthlyLeaving: {} };
    }
  };

  const prepareMonthlyHiringData = (hiringData, leavingData) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentDate = new Date();
    const result = [];

    // Get data for the last 6 months
    for (let i = 5; i >= 0; i--) {
      const monthIndex = (currentDate.getMonth() - i + 12) % 12;
      const monthYear = `${months[monthIndex]} ${currentDate.getFullYear()}`;

      result.push({
        month: months[monthIndex],
        hired: hiringData[monthYear]?.hired || 0,
        left: leavingData[monthYear]?.left || 0
      });
    }

    return result;
  };

  // Color palette for charts
  const getStatusColor = (status) => {
    const colors = {
      'approved': '#10B981',
      'pending': '#F59E0B',
      'rejected': '#EF4444',
      'cancelled': '#6B7280'
    };
    return colors[status.toLowerCase()] || '#3B82F6';
  };

  const getTypeColor = (index) => {
    const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];
    return colors[index % colors.length];
  };



  const fetchIndentDataFromRow7 = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_GOOGLE_SHEET_URL}?sheet=INDENT&action=fetch`
      );

      const result = await response.json();

      if (result.success && result.data && result.data.length >= 7) {
        // Get data starting from row 7 (array index 6) to end
        const dataFromRow7 = result.data.slice(6);

        // Find headers (assuming they're in row 6 - array index 5)
        const headers = result.data[5].map((h) => h.trim());

        // Find column indices for important fields
        const timestampIndex = headers.indexOf("Timestamp");
        const indentNumberIndex = headers.indexOf("Indent Number");
        const postIndex = headers.indexOf("Post");
        const genderIndex = headers.indexOf("Gender");
        const departmentIndex = headers.indexOf("Department");
        const preferIndex = headers.indexOf("Prefer");
        const noOFPostIndex = headers.indexOf("Number Of Posts");
        const completionDateIndex = headers.indexOf("Completion Date");
        const experienceIndex = headers.indexOf("Experience");

        const jobConsultancyNameIndex = headers.indexOf("Job Cunsultancy Name");
        const salaryIndex = headers.indexOf("Salary");
        const officeTimingIndex = headers.indexOf("Office Timing");
        const typeOfWeekIndex = headers.indexOf("Type Of Week");
        const residenceIndex = headers.indexOf("Residence");
        const indenterNameIndex = headers.indexOf("Indenter Name");
        const cunsultancyNumberIndex = headers.indexOf("Cunsultancy Number");
        const cunsultancyScreensortImageIndex = headers.indexOf(
          "Cunsultancy Screensort Image"
        );

        const plaaned3Index = headers.indexOf("Planned 3");
        const actual3Index = headers.indexOf("Actual 3");

        const closeByIndexNew = headers.indexOf("Close By");

        const siteStatusIndex = headers.indexOf("Site Status");
        const socialSiteTypesIndex = headers.indexOf("Social Site Types");

        const statusIndex = headers.indexOf("Status");
        const closeByIndex = headers.indexOf("Close By");

        const TotalEnquiryIndex = headers.indexOf("Total Enquiry");
        const TotalJoiningIndex = headers.indexOf("Total Joining");

        // Add other column indices as needed

        // Process the data
        const processedData = dataFromRow7.map((row) => ({
          timestamp: row[timestampIndex],
          indentNumber: row[indentNumberIndex],
          post: row[postIndex],
          gender: row[genderIndex],
          department: row[departmentIndex],
          prefer: row[preferIndex],
          noOfPost: row[noOFPostIndex],
          completionDate: row[completionDateIndex],
          experience: row[experienceIndex],

          jobConsultancyName: row[jobConsultancyNameIndex],
          salary: row[salaryIndex],
          officeTiming: row[officeTimingIndex],
          typeOfWeek: row[typeOfWeekIndex],
          residence: row[residenceIndex],
          indenterName: row[indenterNameIndex],
          cunsultancyNumber: row[cunsultancyNumberIndex],
          cunsultancyScreensortImage: row[cunsultancyScreensortImageIndex],
          planned3: row[plaaned3Index],
          actual3: row[actual3Index],
          closeByNew: row[closeByIndexNew],
          siteStatus: row[siteStatusIndex],
          socialSiteTypes: row[socialSiteTypesIndex],
          closeBy: row[closeByIndex],
          status: row[statusIndex],

          totalenquiry: row[TotalEnquiryIndex],
          totaljoining: row[TotalJoiningIndex],


        }));

        setIndentData(processedData);
        return {
          success: true,
          data: processedData,
          headers: headers,
        };
      } else {
        return {
          success: false,
          error: "Not enough rows in sheet data",
        };
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  };



  useEffect(() => {
    const loadData = async () => {
      setTableLoading(true);
      const result = await fetchIndentDataFromRow7();
      setTableLoading(false);
    };
    loadData();
  }, []);


  useEffect(() => {
    const fetchData = async () => {
      try {
        const [joiningResult, leavingResult, departmentResult] = await Promise.all([
          fetchJoiningCount(),
          fetchLeaveCount(),
          fetchDepartmentData(),
          fetchLeaveManagementAnalytics()
        ]);

        setTotalEmployee(joiningResult.total + leavingResult.total);
        setDepartmentData(departmentResult);

        const monthlyData = prepareMonthlyHiringData(
          joiningResult.monthlyHiring,
          leavingResult.monthlyLeaving
        );

        setMonthlyHiringData(monthlyData);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="space-y-6 page-content p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">HR Dashboard</h1>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-lg border p-6 flex items-start">
          <div className="p-3 rounded-full bg-blue-100 mr-4">
            <Users size={24} className="text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-600 font-medium">Total Employees</p>
            <h3 className="text-2xl font-bold text-gray-800">{totalEmployee}</h3>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border p-6 flex items-start">
          <div className="p-3 rounded-full bg-green-100 mr-4">
            <UserCheck size={24} className="text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-600 font-medium">Active Employees</p>
            <h3 className="text-2xl font-bold text-gray-800">{activeEmployee}</h3>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border p-6 flex items-start">
          <div className="p-3 rounded-full bg-amber-100 mr-4">
            <Clock size={24} className="text-amber-600" />
          </div>
          <div>
            <p className="text-sm text-gray-600 font-medium">On Resigned</p>
            <h3 className="text-2xl font-bold text-gray-800">{leftEmployee}</h3>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border p-6 flex items-start">
          <div className="p-3 rounded-full bg-red-100 mr-4">
            <UserX size={24} className="text-red-600" />
          </div>
          <div>
            <p className="text-sm text-gray-600 font-medium">Left This Month</p>
            <h3 className="text-2xl font-bold text-gray-800">{leaveThisMonth}</h3>
          </div>
        </div>
      </div>

      {/* New Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leave Status Distribution Chart */}
        <div className="bg-white rounded-xl shadow-lg border p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center">
            <FileText size={20} className="mr-2" />
            Leave Status Distribution
          </h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={leaveStatusData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                <XAxis dataKey="status" stroke="#374151" />
                <YAxis stroke="#374151" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    color: '#374151'
                  }}
                />
                <Bar dataKey="count" name="Number of Leaves">
                  {leaveStatusData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={getStatusColor(entry.status)}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Leave Type Distribution Chart */}
        <div className="bg-white rounded-xl shadow-lg border p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center">
            <Users size={20} className="mr-2" />
            Department-wise Employee Count
          </h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                <XAxis dataKey="department" stroke="#374151" />
                <YAxis stroke="#374151" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    color: '#374151'
                  }}
                />
                <Bar dataKey="employees" name="Employees">
                  {departmentData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index % 3 === 0 ? '#EF4444' : index % 3 === 1 ? '#10B981' : '#3B82F6'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Designation-wise Employee Count */}
      <div className="bg-white rounded-xl shadow-lg border p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center">
          <UserPlus size={20} className="mr-2" />
          Designation-wise Employee Count
        </h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={designationData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
              <XAxis dataKey="designation" stroke="#374151" />
              <YAxis stroke="#374151" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  color: '#374151'
                }}
              />
              <Bar dataKey="employees" name="Employees">
                {designationData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={index % 3 === 0 ? '#EF4444' : index % 3 === 1 ? '#10B981' : '#3B82F6'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>


      {/* reporting table */}

      <div className="overflow-x-auto">
        {/* Add max-height and overflow-y to the table container */}
        <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200 shadow">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Indent Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Post
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prefer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  No. of Post
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Completion Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Indenter Name
                </th>

                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Join
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Enquiry
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pending Joining
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {tableLoading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center">
                    <div className="flex justify-center flex-col items-center">
                      <div className="w-6 h-6 border-4 border-blue-500 border-dashed rounded-full animate-spin mb-2"></div>
                      <span className="text-gray-600 text-sm">
                        Loading indent data...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : indentData.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center">
                    <p className="text-gray-500">No indent data found.</p>
                  </td>
                </tr>
              ) : (
                indentData.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">

                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.indentNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.post}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.department}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.prefer}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.noOfPost}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="text-sm text-gray-900 break-words">
                        {item.completionDate
                          ? (() => {
                            const date = new Date(item.completionDate);
                            if (!date || isNaN(date.getTime()))
                              return "Invalid date";
                            const day = date
                              .getDate()
                              .toString()
                              .padStart(2, "0");
                            const month = (date.getMonth() + 1)
                              .toString()
                              .padStart(2, "0");
                            const year = date.getFullYear();
                            const hours = date
                              .getHours()
                              .toString()
                              .padStart(2, "0");
                            const minutes = date
                              .getMinutes()
                              .toString()
                              .padStart(2, "0");
                            const seconds = date
                              .getSeconds()
                              .toString()
                              .padStart(2, "0");
                            return (
                              <div>
                                <div className="font-medium break-words">
                                  {`${day}/${month}/${year}`}
                                </div>
                                <div className="text-xs text-gray-500 break-words">
                                  {`${hours}:${minutes}:${seconds}`}
                                </div>
                              </div>
                            );
                          })()
                          : "—"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.indenterName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.totaljoining}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.totalenquiry}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.noOfPost - item.totaljoining}
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
