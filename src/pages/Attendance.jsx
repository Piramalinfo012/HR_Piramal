import React, { useEffect, useState } from 'react';
import { Search, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';


const Attendance = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState({}); // Track individual download states

  const fetchAttendanceData = async () => {
    setLoading(true);
    setTableLoading(true);
    setError(null);

    try {
      const response = await fetch(
        'https://script.google.com/macros/s/AKfycbx7_8IiGXsVplVge8Fi8PIsxL1Ub_QqQI77x1flWxkl2KlyunmnVheG7yA6safW20yZ/exec?sheet=Report&action=fetch'
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Raw REPORT API response:', result);

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch data from REPORT sheet');
      }

      const rawData = result.data || result;

      if (!Array.isArray(rawData)) {
        throw new Error('Expected array data not received');
      }

      // In your screenshot, headers looked around row 4–5 → adjust index if needed
      const headers = rawData[3]; // row 4 in sheet (0-based index = 3)
      const dataRows = rawData.length > 4 ? rawData.slice(4) : [];

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
        year: row[getIndex('Year')] || '',
        month: row[getIndex('Month')] || '',
        empId: row[getIndex('Employee ID')] || '',
        name: row[getIndex('Name')] || '',
        designation: row[getIndex('Designation')] || '',
        company: row[getIndex('Company Name')] || '',
        punchDays: row[getIndex('Punch Days')] || '',
        totalOnTime: row[getIndex('Total On Time (>=8)')] || '',
        lateDays: row[getIndex('Late Days(4-8)')] || '',
        lateNotAllowed: row[getIndex('Late Not Allowed')],
        lateAllowed: row[getIndex('Late Allowed')] || '',
        punchMiss: row[getIndex('Punch Miss')] || '',
        holidays: row[getIndex('Sunday+National  Holiday Given')] || '',
        absents: row[getIndex('Absent(<4)')] || '',
        totalWorking: row[getIndex('Total Days')] || '',
        mgmtAdjustment: row[getIndex('Mgmt Adjustment')] || '',
        grandTotalDays: row[getIndex('Grand Total Days')] || '',
      }));

      console.log('Processed attendance data:', processedData);

      // Example usage: set state
      setAttendanceData(processedData);

    } catch (error) {
      console.error('Error fetching REPORT data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
      setTableLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceData();
  }, []);

  // Download data as Excel
  const downloadExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(attendanceData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");
    XLSX.writeFile(workbook, "attendance_data.xlsx");
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
        `https://script.google.com/macros/s/AKfycbx7_8IiGXsVplVge8Fi8PIsxL1Ub_QqQI77x1flWxkl2KlyunmnVheG7yA6safW20yZ/exec?sheet=Report Daily&action=fetch`
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
        orientation:'landscape',
        unit:'mm',
        format:'a4'
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

  // Filter data based on search term (name, empId, month, designation, year)
  const filteredData = attendanceData.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.empId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.month.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.year.toString().includes(searchTerm)
  );

  return (
    <div className="space-y-6 ml-50 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Attendance Records Monthly</h1>
        <button
          onClick={downloadExcel}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <Download size={20} className="mr-2" />
          Download Excel
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-1 max-w-md">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Search by name, ID, month, designation, or year..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Designation</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Punch Days</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Absent</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Days</th>
                  
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Late Days</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Late Not Allowed</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Late Allowed</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Punch Miss</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Holidays</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Download</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tableLoading ? (
                  <tr>
                    <td colSpan="14" className="px-6 py-12 text-center">
                      <div className="flex justify-center flex-col items-center">
                        <div className="w-6 h-6 border-4 border-indigo-500 border-dashed rounded-full animate-spin mb-2"></div>
                        <span className="text-gray-600 text-sm">Loading attendance data...</span>
                      </div>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan="14" className="px-6 py-12 text-center">
                      <p className="text-red-500">Error: {error}</p>
                      <button 
                        onClick={fetchAttendanceData}
                        className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                      >
                        Retry
                      </button>
                    </td>
                  </tr>
                ) : filteredData.length > 0 ? (
                  filteredData.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.year}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.empId}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                      
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.designation}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.month}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.punchDays}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.absents}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.totalWorking}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.lateDays}</td>
                       <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.lateNotAllowed}</td> 
                       <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.lateAllowed}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.punchMiss}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.holidays}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <button
  onClick={() => downloadDailyData(item.empId, item.name, item.month)}
  disabled={downloading[`${item.name}-${item.month}`]}
  className="p-2 text-blue-600 hover:text-blue-800 disabled:opacity-50"
  title="Download daily attendance"
> 
  {downloading[`${item.name}-${item.month}`] ? (
    <div className="w-4 h-4 border-2 border-blue-600 border-dashed rounded-full animate-spin"></div>
  ) : (
    <Download size={16} />
  )}
</button>
                        </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="14" className="px-6 py-12 text-center">
                      <p className="text-gray-500">No attendance records found.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Attendance;