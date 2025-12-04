import React, { useState, useEffect } from 'react';
import { Filter, Search, Clock, CheckCircle, X } from 'lucide-react';
import useDataStore from '../store/dataStore';
import toast from 'react-hot-toast';

const Leaving = () => {
  const [activeTab, setActiveTab] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [pendingData, setPendingData] = useState([]);
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    dateOfLeaving: '',
    mobileNumber: '',
    reasonOfLeaving: ''
  });

const fetchJoiningData = async () => {
  setLoading(true);
  setTableLoading(true);
  setError(null);

  try {
    const response = await fetch(
      'https://script.google.com/macros/s/AKfycbx7_8IiGXsVplVge8Fi8PIsxL1Ub_QqQI77x1flWxkl2KlyunmnVheG7yA6safW20yZ/exec?sheet=JOINING&action=fetch'
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

    const headers = rawData[5];
    const dataRows = rawData.length > 6 ? rawData.slice(6) : [];
    
    const getIndex = (headerName) => {
      const index = headers.findIndex(h => 
        h && h.toString().trim().toLowerCase() === headerName.toLowerCase()
      );
      return index;
    };

    const processedData = dataRows.map((row, index) => ({
      rowIndex: index + 7, // Actual row number in sheet (starting from row 7)
      employeeNo: row[getIndex('Joining ID')] || row[1] || '', // Column B (index 1)
      candidateName: row[getIndex('Name As Per Aadhar')] || row[2] || '', // Column C (index 2)
      fatherName: row[getIndex('Father Name')] || row[3] || '', // Column D (index 3)
      dateOfJoining: row[getIndex('Date Of Joining')] || row[4] || '', // Column E (index 4)
      designation: row[getIndex('Designation')] || row[5] || '', // Column F (index 5)
      department: row[getIndex('Department')] || row[20] || '', // Column U (index 20)
      mobileNo: row[getIndex('Mobile No.')] || '',
      firmName: row[getIndex('Joining Company Name')] || '', 
      workingPlace: row[getIndex('Joining Place')] || '',
      plannedDate: row[getIndex('Planned Date')] || '',
      actual: row[getIndex('Actual')] || '',
      // Get values from specific column indices
      leavingDate: row[24] || '', // Column Y (index 24)
      reason: row[25] || '', // Column Z (index 25)
      columnAB: row[27] || '', // Column AB (index 27)
    }));

    // Filter for employees with non-null value in AQ and null value in AO
    const pendingLeavingTasks = processedData.filter(
      (task) => task.columnAB && !task.leavingDate
    );
    
    setPendingData(pendingLeavingTasks);
  } catch (error) {
    console.error('Error fetching joining data:', error);
    setError(error.message);
    toast.error(`Failed to load joining data: ${error.message}`);
  } finally {
    setLoading(false);
    setTableLoading(false);
  }
};

  // Fetch leaving data
  const fetchLeavingData = async () => {
    setLoading(true);
    setTableLoading(true);
    setError(null);

    try {
      const response = await fetch(
        'https://script.google.com/macros/s/AKfycbx7_8IiGXsVplVge8Fi8PIsxL1Ub_QqQI77x1flWxkl2KlyunmnVheG7yA6safW20yZ/exec?sheet=LEAVING&action=fetch'
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

      // Process data starting from row 7 (index 6) - skip headers
      const dataRows = rawData.length > 6 ? rawData.slice(6) : [];
      
      const processedData = dataRows.map(row => ({
        timestamp: row[0] || '',
        employeeId: row[1] || '',
        name: row[2] || '',
        dateOfLeaving: row[3] || '',
        mobileNo: row[4] || '',
        reasonOfLeaving: row[5] || '',
        firmName: row[6] || '',
        fatherName: row[7] || '', 
        dateOfJoining: row[8] || '', 
        workingLocation: row[9] || '', 
        designation: row[10] || '', 
        department: row[11] || '', 
        plannedDate: row[12] || '', 
        actual: row[13] || '', 
      }));

      const historyTasks = processedData;
      setHistoryData(historyTasks);
    } catch (error) {
      console.error('Error fetching leaving data:', error);
      setError(error.message);
      toast.error(`Failed to load leaving data: ${error.message}`);
    } finally {
      setLoading(false);
      setTableLoading(false);
    }
  };

  useEffect(() => {
    fetchJoiningData();
    fetchLeavingData();
  }, []);

  // Filter out employees who already have leaving records
  const filteredPendingData = pendingData
    .filter(item => {
      // Remove items that exist in history
      const isInHistory = historyData.some(historyItem => 
        historyItem.employeeId === item.employeeNo
      );
      return !isInHistory;
    })
    .filter(item => {
      // Apply search filter
      const matchesSearch = item.candidateName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.employeeNo?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });

  const filteredHistoryData = historyData.filter(item => {
    const matchesSearch = item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.employeeId?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const handleLeavingClick = (item) => {
    setSelectedItem(item);
    setFormData({
      dateOfLeaving: '',
      mobileNumber: item.mobileNo || '',
      reasonOfLeaving: ''
    });
    setShowModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

const formatPlannedDate = (dateString) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return dateString;
  }
  
  // Format as "9/18/2025 13:56:18"
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  
  return `${month}/${day}/${year} ${hours}:${minutes}:${seconds}`;
};

const formatDOB = (dateString) => {
  if (!dateString) return '';
  
  // If it's already in dd/mm/yyyy format, return as is
  if (typeof dateString === 'string' && dateString.includes('/')) {
    return dateString;
  }
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return dateString;
  }
  
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  
  return `${day}/${month}/${year}`;
};

const handleSubmit = async (e) => {
  e.preventDefault();
  if (!formData.dateOfLeaving || !formData.reasonOfLeaving) {
    toast.error('Please fill all required fields');
    return;
  }

  try {
    setSubmitting(true);
    const now = new Date();
    // Format timestamp as "9/18/2025 13:56:18"
    const formattedTimestamp = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()} ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
    
    // Format leaving date as "20/09/2025" (dd/mm/yyyy)
    const leavingDate = new Date(formData.dateOfLeaving);
    const formattedLeavingDate = `${leavingDate.getDate().toString().padStart(2, '0')}/${(leavingDate.getMonth() + 1).toString().padStart(2, '0')}/${leavingDate.getFullYear()}`;

    const rowData = [
      formattedTimestamp,
      selectedItem.employeeNo,
      selectedItem.candidateName,
      formattedLeavingDate, // This will be stored in LEAVING sheet
      formData.mobileNumber,
      formData.reasonOfLeaving,
      selectedItem.firmName,
      selectedItem.fatherName,
      formatDOB(selectedItem.dateOfJoining),
      selectedItem.workingPlace,
      selectedItem.designation,
      selectedItem.department,
    ];

    // First, update the JOINING sheet with leaving date (Column Y, index 24)
    const updateJoiningParams = new URLSearchParams({
      sheetName: 'JOINING',
      action: 'updateCell',
      rowIndex: selectedItem.rowIndex.toString(),
      columnIndex: '25', // Column Y is index 25 (0-based index + 1 for Sheets)
      value: formattedLeavingDate, // This will be stored in JOINING sheet
    });

    const updateJoiningResponse = await fetch('https://script.google.com/macros/s/AKfycbx7_8IiGXsVplVge8Fi8PIsxL1Ub_QqQI77x1flWxkl2KlyunmnVheG7yA6safW20yZ/exec', {
      method: 'POST',
      body: updateJoiningParams,
    });

    const updateText = await updateJoiningResponse.text();
    let updateResult;
    
    try {
      updateResult = JSON.parse(updateText);
    } catch (parseError) {
      console.error('Failed to parse JOINING update response:', updateText);
      throw new Error(`Server returned invalid response: ${updateText.substring(0, 100)}...`);
    }
    
    if (!updateResult.success) {
      throw new Error(updateResult.error || 'Failed to update JOINING sheet');
    }

    // Update reason in JOINING sheet (Column Z, index 25)
    const updateReasonParams = new URLSearchParams({
      sheetName: 'JOINING',
      action: 'updateCell',
      rowIndex: selectedItem.rowIndex.toString(),
      columnIndex: '26', // Column Z is index 26 (0-based index + 1 for Sheets)
      value: formData.reasonOfLeaving,
    });

    const updateReasonResponse = await fetch('https://script.google.com/macros/s/AKfycbx7_8IiGXsVplVge8Fi8PIsxL1Ub_QqQI77x1flWxkl2KlyunmnVheG7yA6safW20yZ/exec', {
      method: 'POST',
      body: updateReasonParams,
    });

    const updateReasonText = await updateReasonResponse.text();
    let updateReasonResult;
    
    try {
      updateReasonResult = JSON.parse(updateReasonText);
    } catch (parseError) {
      console.error('Failed to parse JOINING reason update response:', updateReasonText);
      throw new Error(`Server returned invalid response: ${updateReasonText.substring(0, 100)}...`);
    }
    
    if (!updateReasonResult.success) {
      throw new Error(updateReasonResult.error || 'Failed to update reason in JOINING sheet');
    }

    // Then, insert the leaving record
    const insertParams = new URLSearchParams({
      sheetName: 'LEAVING',
      action: 'insert',
      rowData: JSON.stringify(rowData),
    });

    const insertResponse = await fetch('https://script.google.com/macros/s/AKfycbx7_8IiGXsVplVge8Fi8PIsxL1Ub_QqQI77x1flWxkl2KlyunmnVheG7yA6safW20yZ/exec', {
      method: 'POST',
      body: insertParams,
    });

    const insertText = await insertResponse.text();
    let insertResult;
    
    try {
      insertResult = JSON.parse(insertText);
    } catch (parseError) {
      console.error('Failed to parse LEAVING insert response:', insertText);
      throw new Error(`Server returned invalid response: ${insertText.substring(0, 100)}...`);
    }

    if (insertResult.success) {
      setFormData({
        dateOfLeaving: '',
        reasonOfLeaving: '',
      });
      setShowModal(false);
      toast.success('Leaving request added successfully!');
      setSelectedItem(null);
      
      // Refresh both datasets
      await fetchJoiningData();
      await fetchLeavingData();
    } else {
      throw new Error(insertResult.error || 'Failed to insert into LEAVING sheet');
    }
  } catch (error) {
    console.error('Submit error:', error);
    toast.error('Something went wrong: ' + error.message);
  } finally {
    setSubmitting(false);
  }
};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold ">Leaving</h1>
      </div>

      {/* Filter and Search */}
      <div className="bg-white  p-4 rounded-lg shadow flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4">
        <div className="flex flex-1 max-w-md">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Search by name or employee ID..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300   rounded-lg focus:outline-none focus:ring-2  focus:ring-blue-500 bg-white   text-gray-500    "
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500  " />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className=" bg-white  rounded-lg shadow overflow-hidden">
        <div className="border-b border-gray-300  ">
          <nav className="flex -mb-px">
            <button
              className={`py-4 px-6 font-medium text-sm border-b-2 ${
                activeTab === 'pending'
              ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
               }`}
              onClick={() => setActiveTab('pending')}
            >
              <Clock size={16} className="inline mr-2" />
              Pending ({filteredPendingData.length})
            </button>
            <button
              className={`py-4 px-6 font-medium text-sm border-b-2 ${
                activeTab === 'history'
           ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              onClick={() => setActiveTab('history')}
            >
              <CheckCircle size={16} className="inline mr-2" />
              History ({filteredHistoryData.length})
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'pending' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-white  ">
                <thead className="bg-gray-100 ">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joining ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Father Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Of Joining</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Designation</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white  ">
                  {tableLoading ? (
            <tr>
              <td colSpan="7" className="px-6 py-12 text-center">
                <div className="flex justify-center flex-col items-center">
                  <div className="w-6 h-6 border-4 border-indigo-500 border-dashed rounded-full animate-spin mb-2"></div>
                  <span className="text-gray-600 text-sm">Loading pending calls...</span>
                </div>
              </td>
            </tr>
          ) : error ? (
            <tr>
              <td colSpan="7" className="px-6 py-12 text-center">
                <p className="text-red-500">Error: {error}</p>
                <button 
                  onClick={fetchJoiningData}
                  className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Retry
                </button>
              </td>
            </tr>
          ) :filteredPendingData.map((item,index) => (
                    <tr key={index} className="hover:bg-white hover: ">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleLeavingClick(item)}
                          className="px-3 py-1  bg-indigo-700 text-white rounded-md  text-sm"
                        >
                          Leaving
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.employeeNo}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.candidateName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.fatherName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
  {item.dateOfJoining ? formatDOB(item.dateOfJoining) : '-'}
</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.designation}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.department}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {! tableLoading &&filteredPendingData.length === 0 && (
                <div className="px-6 py-12 text-center">
                  <p className="text-gray-500  ">No pending leaving requests found.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-white  ">
                <thead className="bg-gray-100 ">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joining ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Of Joining</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Of Leaving</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Designation</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason Of Leaving</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white  ">
                  {tableLoading ? (
            <tr>
              <td colSpan="7" className="px-6 py-12 text-center">
                <div className="flex justify-center flex-col items-center">
                  <div className="w-6 h-6 border-4 border-indigo-500 border-dashed rounded-full animate-spin mb-2"></div>
                  <span className="text-gray-600 text-sm">Loading pending calls...</span>
                </div>
              </td>
            </tr>
          ) : error ? (
            <tr>
              <td colSpan="7" className="px-6 py-12 text-center">
                <p className="text-red-500">Error: {error}</p>
                <button 
                  onClick={fetchLeavingData}
                  className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Retry
                </button>
              </td>
            </tr>
          ) :filteredHistoryData.map((item,index) => (
                    <tr key={index} className="hover:bg-white hover: ">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.employeeId}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.dateOfJoining ? formatDOB(item.dateOfJoining) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.dateOfLeaving ?formatDOB(item.dateOfLeaving) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.designation}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.department}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.reasonOfLeaving}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredHistoryData.length === 0 && (
                <div className="px-6 py-12 text-center">
                  <p className="text-gray-500  ">No leaving history found.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && selectedItem && (
        <div className=" fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4">
          <div className=" bg-white rounded-lg shadow-lg w-full max-w-md">
            <div className="flex justify-between items-center p-6 border-b border-gray-300  ">
              <h3 className="text-lg font-medium text-gray-700">Leaving Form</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-700  ">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Joining ID</label>
                <input
                  type="text"
                  value={selectedItem.employeeNo}
                  disabled
                  className="w-full border border-gray-500   rounded-md px-3 py-2 bg-white   text-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name (नाम) </label>
                <input
                  type="text"
                  value={selectedItem.candidateName}
                  disabled
                  className="w-full border border-gray-500   rounded-md px-3 py-2 bg-white   text-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Date Of Leaving (छोड़ने का दिनांक) *</label>
                <input
                  type="date"
                  name="dateOfLeaving"
                  value={formData.dateOfLeaving}
                  onChange={handleInputChange}
                  className="w-full border border-gray-500   rounded-md px-3 py-2 focus:outline-none focus:ring-2  focus:ring-blue-500 bg-white   text-gray-700"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Mobile Number (मोबाइल नंबर) </label>
                <input
                  type="tel"
                  name="mobileNumber"
                  value={formData.mobileNumber}
                  onChange={handleInputChange}
                  className="w-full border border-gray-500   rounded-md px-3 py-2 focus:outline-none focus:ring-2  focus:ring-blue-500 bg-white   text-gray-700    "
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason Of Leaving (छोड़ने का कारण) *</label>
                <textarea
                  name="reasonOfLeaving"
                  value={formData.reasonOfLeaving}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full border border-gray-500   rounded-md px-3 py-2 focus:outline-none focus:ring-2  focus:ring-blue-500 bg-white   text-gray-700    "
                  required
                />
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300   rounded-md text-gray-700 hover:bg-white  "
                >
                  Cancel
                </button>
               <button
    type="submit"
    className={`px-4 py-2 text-white bg-indigo-700 rounded-md hover:bg-indigo-800 min-h-[42px] flex items-center justify-center ${
      submitting ? 'opacity-90 cursor-not-allowed' : ''
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
    ) : 'Submit'}
  </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leaving;