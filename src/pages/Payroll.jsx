import React, { useState, useEffect } from 'react';
import { Search, Calendar, Filter, MoreVertical } from 'lucide-react';

const Payroll = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState(""); // Changed to empty string by default
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [payrollData, setPayrollData] = useState([]);
  const [notification, setNotification] = useState(null);
  const [filters, setFilters] = useState({
    department: "",
    status: "",
    employmentType: "",
    location: "",
  });

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch data from Google Sheets using the provided AppScript URL
        const response = await fetch(
          "https://script.google.com/macros/s/AKfycbxtIL7N05BBt2ihqlPtASeHCjhp4P7cnTvRRqz2u_7uXAfA67EO6zB6R2NpI_DUkcY/exec?sheet=Payroll&action=fetch"
        );
        const data = await response.json();

        if (data && data.success && data.data) {
          // Extract headers and data rows
          const headers = data.data[0];
          const rows = data.data.slice(1);

          // Transform the data to match our structure
          const transformedData = rows.map((row) => ({
            serialNo: row[0] || "",
            employeeCode: row[1] || "",
            employeeName: row[2] || "",
            designation: row[3] || "",
            daysPresent: row[4] || 0,
            totalActual: parseFloat(row[5]) || 0,
            basic: parseFloat(row[6]) || 0,
            conveyance: parseFloat(row[7]) || 0,
            hra: parseFloat(row[8]) || 0,
            medicalAllowance: parseFloat(row[9]) || 0,
            specialAllowance: parseFloat(row[10]) || 0,
            otherAllowances: parseFloat(row[11]) || 0,
            loan: parseFloat(row[12]) || 0,
            additionalSalary: parseFloat(row[13]) || 0,
            toBePaidAfterPF: parseFloat(row[14]) || 0,
            year: row[15] || "",
            month: row[16] || "",
          }));

          setPayrollData(transformedData);
        } else {
          throw new Error(data.error || "Failed to fetch data");
        }
      } catch (error) {
        setError(error.message);
        showNotification(`Failed to load data: ${error.message}`, "error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleFilterChange = (filterName, value) => {
    setFilters((prev) => ({
      ...prev,
      [filterName]: value,
    }));
  };

  // Filter data based on search term and selected period
   const filteredData = payrollData.filter((item) => {
    // Filter by search term (emp code, name, designation, year, month)
    const matchesSearch = 
      item.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.year.toString().includes(searchTerm) ||
      item.month.toString().toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filter by selected period (year-month)
    let matchesPeriod = true;
    if (selectedPeriod) {
      const [selectedYear, selectedMonthNum] = selectedPeriod.split('-');
      
      // Convert numeric month to full month name
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      const selectedMonthName = monthNames[parseInt(selectedMonthNum) - 1];
      
      // Match with year in column P and month name in column Q
      matchesPeriod = item.year.toString() === selectedYear && 
                     item.month.toString() === selectedMonthName;
    }
    
    return matchesSearch && matchesPeriod;
  });

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-4 md:p-6">
      {/* Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 ${
            notification.type === "error"
              ? "bg-red-100 text-red-800 border border-red-300"
              : "bg-green-100 text-green-800 border border-green-300"
          }`}
        >
          {notification.message}
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h1 className="text-2xl md:text-3xl font-bold text-blue-900">
            Payroll Management
          </h1>
        </div>

        {/* Controls Row */}
        <div className="bg-white bg-opacity-70 backdrop-blur-md rounded-2xl p-4 md:p-6 border border-gray-200 shadow-lg">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by emp code, name, designation, year or month..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Search
                  size={20}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                />
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative">
                <input
                  type="month"
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
                <Calendar
                  size={20}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                />
              </div>

              <div className="relative group">
                <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 p-4 space-y-2 border border-gray-200">
                  <div>
                    <label className="block text-sm mb-1 text-gray-700">
                      Department
                    </label>
                    <select
                      value={filters.department}
                      onChange={(e) =>
                        handleFilterChange("department", e.target.value)
                      }
                      className="w-full bg-gray-50 border border-gray-300 rounded-md px-3 py-1 text-gray-900 text-sm"
                    >
                      <option value="">All Departments</option>
                      <option value="IT">IT</option>
                      <option value="HR">HR</option>
                      <option value="Finance">Finance</option>
                      <option value="Operations">Operations</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Payroll Table */}
        <div className="bg-white bg-opacity-70 backdrop-blur-md rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
          <div className="p-6">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
              </div>
            ) : error ? (
              <div className="px-6 py-12 text-center">
                <p className="text-red-600">Error: {error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Retry
                </button>
              </div>
            ) : (
              <div className="overflow-auto" style={{ maxHeight: "calc(100vh - 250px)", minHeight: "400px" }}>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider bg-blue-100">
                        S.No
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider bg-blue-100">
                        Emp Code
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider bg-blue-100">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider bg-blue-100">
                        Designation
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider bg-blue-100">
                        Days Present
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider bg-blue-100">
                        Total Actual
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider bg-blue-100">
                        Basic
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider bg-blue-100">
                        Conveyance
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider bg-blue-100">
                        HRA
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider bg-blue-100">
                        Medical Allowance
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider bg-blue-100">
                        Special Allowance
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider bg-blue-100">
                        Other Allowances
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider bg-blue-100">
                        Loan
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider bg-blue-100">
                        Additional Salary
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider bg-blue-100">
                        To Be Paid After PF
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider bg-blue-100">
                        Year
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider bg-blue-100">
                        Month
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredData.length > 0 ? (
                      filteredData.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.serialNo}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.employeeCode}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.employeeName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.designation}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.daysPresent}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ₹{item.totalActual.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ₹{item.basic.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ₹{item.conveyance.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ₹{item.hra.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ₹{item.medicalAllowance.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ₹{item.specialAllowance.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ₹{item.otherAllowances.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ₹{item.loan.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ₹{item.additionalSalary.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ₹{item.toBePaidAfterPF.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.year}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.month}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="17" className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <p className="text-gray-500 text-lg font-medium">
                              No payroll data found
                            </p>
                            <p className="text-gray-400 mt-1">
                              Try adjusting your search or filters
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payroll;