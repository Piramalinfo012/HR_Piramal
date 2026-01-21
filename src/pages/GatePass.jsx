import React, { useState, useEffect } from 'react';
import { Search, X, Check, Clock, Calendar, Plus, Image } from 'lucide-react';
import toast from 'react-hot-toast';

const GatePass = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingPasses, setPendingPasses] = useState([]);
  const [approvedPasses, setApprovedPasses] = useState([]);
  const [rejectedPasses, setRejectedPasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [actionInProgress, setActionInProgress] = useState(null);
  const [hodNames, setHodNames] = useState([]);

  // New state for gate pass request modal
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [formData, setFormData] = useState({
    employeeId: '',
    employeeName: '',
    department: '',
    visitPlace: '',
    visitReason: '',
    departureTime: '',
    arrivalTime: '',
    hodName: '',
    whatsappNumber: '',
    gatePassImage: null,
  });

  const SCRIPT_URL = import.meta.env.VITE_GOOGLE_SHEET_URL;

  useEffect(() => {
    fetchGatePassData();
    fetchEmployees();
    fetchHodNames();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await fetch(`${SCRIPT_URL}?sheet=JOINING&action=fetch`);
      const result = await response.json();

      if (result.success) {
        if (result.data && result.data.length > 1) {
          const employeeData = result.data.slice(1).map(row => ({
            id: row[1] || '', // Employee ID from Column B
            name: row[2] || '', // Name from Column C
            department: row[20] || '', // Department from Column U
            whatsappNumber: row[11] || '' // WhatsApp from Column L
          })).filter(emp => emp.id && emp.name);

          setEmployees(employeeData);
        } else {
          // No data in sheet, set empty array
          setEmployees([]);
        }
      } else {
        toast.error('Failed to load employee data');
      }
    } catch (error) {
      console.error('Error fetching employee data:', error);
      toast.error(`Failed to load employee data: ${error.message}`);
    }
  };

  const fetchHodNames = async () => {
    try {
      const response = await fetch(`${SCRIPT_URL}?sheet=Master&action=fetch`);
      const result = await response.json();

      if (result.success) {
        if (result.data && result.data.length > 0) {
          // Extract HOD names from Column A (index 0)
          const hodNames = result.data.slice(1).map(row => row[0]).filter(name => name);
          setHodNames(hodNames);
        } else {
          // No data in sheet, set default names
          setHodNames(['Deepak', 'Vikas', 'Dharam', 'Pratap', 'Aubhav']);
        }
      } else {
        toast.error('Failed to load HOD data');
        setHodNames(['Deepak', 'Vikas', 'Dharam', 'Pratap', 'Aubhav']);
      }
    } catch (error) {
      console.error('Error fetching HOD data:', error);
      toast.error(`Failed to load HOD data: ${error.message}`);
      setHodNames(['Deepak', 'Vikas', 'Dharam', 'Pratap', 'Aubhav']);
    }
  };

  const fetchGatePassData = async () => {
    setLoading(true);
    setTableLoading(true);
    setError(null);

    try {
      const response = await fetch(`${SCRIPT_URL}?sheet=Gate%20Pass&action=fetch`);
      const result = await response.json();

      if (result.success) {
        if (result.data && result.data.length > 1) {
          const gatePassData = result.data.slice(1).map(row => ({
            serialNo: row[1] || '', // Column B
            employeeId: row[2] || '', // Column D
            employeeName: row[3] || '', // Column C
            department: row[4] || '', // Column E
            visitPlace: row[5] || '', // Column F
            visitReason: row[5] || '', // Column F (combined with place)
            departureTime: row[6] || '', // Column G
            arrivalTime: row[7] || '', // Column H
            hodName: row[8] || '', // Column I
            whatsappNumber: row[9] || '', // Column J
            gatePassImage: row[10] || '', // Column K
            status: row[11] || 'pending' // Column L
          }));


          setPendingPasses(gatePassData.filter(pass => pass.status === 'pending'));
          setApprovedPasses(gatePassData.filter(pass => pass.status === 'approved'));
          setRejectedPasses(gatePassData.filter(pass => pass.status === 'rejected'));
        } else {
          // No data in sheet, set empty arrays
          setPendingPasses([]);
          setApprovedPasses([]);
          setRejectedPasses([]);
        }
      } else {
        toast.error('Failed to load gate pass data');
      }
    } catch (error) {
      console.error('Error fetching gate pass data:', error);
      setError(error.message);
      toast.error(`Failed to load gate pass data: ${error.message}`);
    } finally {
      setLoading(false);
      setTableLoading(false);
    }
  };


  const handleCheckboxChange = (passId, rowData) => {
    if (selectedRow?.serialNo === passId) {
      setSelectedRow(null);
    } else {
      setSelectedRow(rowData);
    }
  };

  // Handle employee selection
  const handleEmployeeChange = (selectedName) => {
    const selectedEmployee = employees.find(emp => emp.name === selectedName);
    setFormData(prev => ({
      ...prev,
      employeeName: selectedName,
      employeeId: selectedEmployee ? selectedEmployee.id : '',
      department: selectedEmployee ? selectedEmployee.department : '',
      whatsappNumber: selectedEmployee ? selectedEmployee.whatsappNumber : ''
    }));
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === 'employeeName') {
      handleEmployeeChange(value);
    } else if (name === 'gatePassImage') {
      setFormData(prev => ({
        ...prev,
        [name]: e.target.files[0]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Get next serial number
  const getNextSerialNo = () => {
    if (pendingPasses.length === 0 && approvedPasses.length === 0 && rejectedPasses.length === 0) {
      return '1';
    }

    const allPasses = [...pendingPasses, ...approvedPasses, ...rejectedPasses];
    const serialNumbers = allPasses
      .map(pass => parseInt(pass.serialNo))
      .filter(num => !isNaN(num))
      .sort((a, b) => b - a);

    return serialNumbers.length > 0 ? (serialNumbers[0] + 1).toString() : '1';
  };

  // Update the uploadImageToDrive function
  const uploadImageToDrive = async (file) => {
    try {
      // Convert file to base64
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
      });

      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          action: 'uploadFile',
          base64Data: base64Data,
          fileName: file.name,
          mimeType: file.type,
          folderId: '1AWeKCYD_hy_9pxT17zoLp-tNgSla9gBi'
        })
      });

      const result = await response.json();

      if (result.success) {
        return result.fileUrl;
      } else {
        throw new Error(result.error || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Image upload error:', error);
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.employeeName || !formData.visitPlace || !formData.visitReason ||
      !formData.departureTime || !formData.arrivalTime || !formData.hodName ||
      !formData.whatsappNumber) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      setSubmitting(true);

      // Upload image if provided
      let imageUrl = '';
      if (formData.gatePassImage) {
        imageUrl = await uploadImageToDrive(formData.gatePassImage);
      }

      // Format dates to dd/mm/yy hh:mm:ss for timestamp
      const formatDateTimeForSheet = (dateTimeString) => {
        const date = new Date(dateTimeString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = String(date.getFullYear()).slice(-2);
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');

        return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
      };

      // Format dates to dd/mm/yyyy for departure and arrival
      const formatDateForSheet = (dateTimeString) => {
        const date = new Date(dateTimeString);
        return date; // Return Date object instead of formatted string
      };

      const timestamp = formatDateTimeForSheet(new Date().toISOString());
      const departureTimeDate = formatDateForSheet(formData.departureTime);
      const arrivalTimeDate = formatDateForSheet(formData.arrivalTime);

      const serialNo = getNextSerialNo();
      const placeAndReason = `${formData.visitPlace} - ${formData.visitReason}`;

      const rowData = [
        timestamp,                    // Column A: Timestamp (dd/mm/yy hh:mm:ss)
        serialNo,                     // Column B: Serial No
        formData.employeeId,          // Column C: Employee ID
        formData.employeeName,        // Column D: Name of Employee
        formData.department,          // Column E: Department
        placeAndReason,               // Column F: Place and Reason to visit
        departureTimeDate,            // Column G: Departure From Plant (Date object)
        arrivalTimeDate,              // Column H: Arrival at Plant (Date object)
        formData.hodName,             // Column I: HOD Name
        formData.whatsappNumber,      // Column J: Employee Whatsapp Number
        imageUrl,                     // Column K: Image of Employee gate pass (uploaded URL)
        'pending'                     // Column L: Status
      ];

      // Send data to Google Sheets
      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          action: 'insert',
          sheetName: 'Gate Pass',
          rowData: JSON.stringify(rowData)
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Gate Pass Request submitted successfully!');
        setFormData({
          employeeId: '',
          employeeName: '',
          department: '',
          visitPlace: '',
          visitReason: '',
          departureTime: '',
          arrivalTime: '',
          hodName: '',
          whatsappNumber: '',
          gatePassImage: null,
        });
        setShowModal(false);
        fetchGatePassData(); // Refresh data
      } else {
        toast.error('Failed to submit gate pass request');
      }
    } catch (error) {
      console.error('Submit error:', error);
      toast.error('Something went wrong!');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGatePassAction = async (action) => {
    if (!selectedRow) {
      toast.error('Please select a gate pass request');
      return;
    }

    setActionInProgress(action);
    setLoading(true);

    try {
      // Find the row index in the sheet
      const response = await fetch(`${SCRIPT_URL}?sheet=Gate%20Pass&action=fetch`);
      const result = await response.json();

      if (result.success && result.data) {
        const rowIndex = result.data.findIndex(row => row[1] === selectedRow.serialNo) + 1;

        if (rowIndex > 0) {
          // Update the status column (Column L, index 11)
          const updateResponse = await fetch(SCRIPT_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              action: 'updateCell',
              sheetName: 'Gate Pass',
              rowIndex: rowIndex,
              columnIndex: 12, // Column L is index 12 (1-based)
              value: action === 'accept' ? 'approved' : 'rejected'
            })
          });

          const updateResult = await updateResponse.json();

          if (updateResult.success) {
            toast.success(`Gate Pass ${action === 'accept' ? 'approved' : 'rejected'} for ${selectedRow.employeeName || 'employee'}`);
            setSelectedRow(null);
            fetchGatePassData(); // Refresh data
          } else {
            toast.error(`Failed to ${action} gate pass`);
          }
        } else {
          toast.error('Could not find the selected gate pass in the sheet');
        }
      }
    } catch (error) {
      console.error('Update error:', error);
      toast.error(`Failed to ${action} gate pass: ${error.message}`);
    } finally {
      setLoading(false);
      setActionInProgress(null);
    }
  };

  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return '-';
    return dateTimeString;
  };

  const filteredPendingPasses = pendingPasses.filter(item => {
    const matchesSearch = item.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.employeeId?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const filteredApprovedPasses = approvedPasses.filter(item => {
    const matchesSearch = item.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.employeeId?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const filteredRejectedPasses = rejectedPasses.filter(item => {
    const matchesSearch = item.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.employeeId?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const renderPendingPassesTable = () => (
    <table className="min-w-full divide-y divide-white">
      <thead className="bg-gray-100">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Select
          </th>
          {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Serial No</th> */}
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee ID</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee Name</th>
          {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th> */}
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Place and reason to visit</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Departure From Plant</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Arrival at Plant</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">HOD Name</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee Whatsapp Number</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gate Pass Image</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-white">
        {filteredPendingPasses.length > 0 ? (
          filteredPendingPasses.map((item, index) => (
            <tr key={index} className="hover:bg-white">
              <td className="px-6 py-4 whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={selectedRow?.serialNo === item.serialNo}
                  onChange={() => handleCheckboxChange(item.serialNo, item)}
                  className="h-4 w-4 text-navy focus:ring-navy border-gray-300 rounded"
                />
              </td>
              {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.serialNo}</td> */}
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.employeeId}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.employeeName}</td>
              {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.department}</td> */}
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <div>
                  <div className="font-medium">{item.visitPlace}</div>
                  {/* <div className="text-xs text-gray-400">{item.visitReason}</div> */}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDateTime(item.departureTime)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDateTime(item.arrivalTime)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.hodName}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.whatsappNumber}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.gatePassImage ? (<a href={item.gatePassImage} target='_blank' rel='noopener noreferrer'>{<Image />}</a>) : ('-')}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                  Pending
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleGatePassAction('accept')}
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
                        <span>Approving...</span>
                      </div>
                    ) : 'Approve'}
                  </button>
                  <button
                    onClick={() => handleGatePassAction('rejected')}
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
            <td colSpan="12" className="px-6 py-12 text-center">
              <p className="text-gray-500">No pending gate pass requests found.</p>
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );

  const renderApprovedPassesTable = () => (
    <table className="min-w-full divide-y divide-white">
      <thead className="bg-gray-100">
        <tr>
          {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Serial No</th> */}
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee ID</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee Name</th>
          {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th> */}
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Place and reason to visit</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Departure From Plant</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Arrival at Plant</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">HOD Name</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee Whatsapp Number</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gate Pass Image</th>

          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-white">
        {filteredApprovedPasses.length > 0 ? (
          filteredApprovedPasses.map((item, index) => (
            <tr key={index} className="hover:bg-white">
              {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.serialNo}</td> */}
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.employeeId}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.employeeName}</td>
              {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.department}</td> */}
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <div>
                  <div className="font-medium">{item.visitPlace}</div>
                  {/* <div className="text-xs text-gray-400">{item.visitReason}</div> */}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDateTime(item.departureTime)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDateTime(item.arrivalTime)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.hodName}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.whatsappNumber}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.gatePassImage ? (<a href={item.gatePassImage} target='_blank' rel='noopener noreferrer'><Image /></a>) : ('-')}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                  Approved
                </span>
              </td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan="10" className="px-6 py-12 text-center">
              <p className="text-gray-500">No approved gate pass requests found.</p>
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );

  const renderRejectedPassesTable = () => (
    <table className="min-w-full divide-y divide-white">
      <thead className="bg-gray-100">
        <tr>
          {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Serial No</th> */}
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee ID</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee Name</th>
          {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th> */}
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Place and reason to visit</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Departure From Plant</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Arrival at Plant</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">HOD Name</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee Whatsapp Number</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gate Pass Image</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-white">
        {filteredRejectedPasses.length > 0 ? (
          filteredRejectedPasses.map((item, index) => (
            <tr key={index} className="hover:bg-white">
              {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.serialNo}</td> */}
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.employeeId}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.employeeName}</td>
              {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.department}</td> */}
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <div>
                  <div className="font-medium">{item.visitPlace}</div>
                  {/* <div className="text-xs text-gray-400">{item.visitReason}</div> */}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDateTime(item.departureTime)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDateTime(item.arrivalTime)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.hodName}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.whatsappNumber}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.gatePassImage ? (<a href={item.gatePassImage} target='_blank' rel='noopener noreferrer'><Image /></a>) : ('-')}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                  Rejected
                </span>
              </td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan="10" className="px-6 py-12 text-center">
              <p className="text-gray-500">No rejected gate pass requests found.</p>
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );

  const renderTable = () => {
    switch (activeTab) {
      case 'pending':
        return renderPendingPassesTable();
      case 'approved':
        return renderApprovedPassesTable();
      case 'rejected':
        return renderRejectedPassesTable();
      default:
        return renderPendingPassesTable();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gate Pass Management</h1>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-navy hover:bg-navy-dark"
        >
          <Plus size={16} className="mr-2" />
          New Request
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
              Pending ({pendingPasses.length})
            </button>
            <button
              onClick={() => setActiveTab('approved')}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${activeTab === 'approved'
                  ? 'border-indigo-500 text-navy'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              Approved ({approvedPasses.length})
            </button>
            <button
              onClick={() => setActiveTab('rejected')}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${activeTab === 'rejected'
                  ? 'border-indigo-500 text-navy'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              Rejected ({rejectedPasses.length})
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
                    {loading ? 'Processing request...' : 'Loading gate pass data...'}
                  </span>
                </div>
              </div>
            ) : error ? (
              <div className="px-6 py-12 text-center">
                <p className="text-red-500">Error: {error}</p>
                <button
                  onClick={fetchGatePassData}
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

      {/* Modal for new gate pass request */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto scrollbar-hide">
            <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
              <h3 className="text-lg font-medium">New Gate Pass Request</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name of Employee (कर्मचारी का नाम) *</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID (कर्मचारी आईडी) </label>
                <input
                  type="text"
                  name="employeeId"
                  value={formData.employeeId}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 focus:outline-none"
                  readOnly
                />
              </div>

              {/* <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 focus:outline-none"
                  readOnly
                />
              </div> */}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Place to visit (जगह का दौरा) *</label>
                <input
                  type="text"
                  name="visitPlace"
                  value={formData.visitPlace}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy"
                  placeholder="Enter place to visit"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason to visit (यात्रा करने का कारण) *</label>
                <textarea
                  name="visitReason"
                  value={formData.visitReason}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy"
                  placeholder="Please provide reason for visit..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Departure From Plant *</label>
                  <input
                    type="datetime-local"
                    name="departureTime"
                    value={formData.departureTime}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Arrival at Plant (प्लांट में वापसी) </label>
                  <input
                    type="datetime-local"
                    name="arrivalTime"
                    value={formData.arrivalTime}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">HOD Name (एचओडी का नाम) *</label>
                <select
                  name="hodName"
                  value={formData.hodName}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy"
                  required
                >
                  <option value="">Select HOD</option>
                  {hodNames.map((hod, index) => (
                    <option key={index} value={hod}>{hod}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Number (व्हाट्सएप नंबर) *</label>
                <input
                  type="tel"
                  name="whatsappNumber"
                  value={formData.whatsappNumber}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy"
                  placeholder="Enter WhatsApp number"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gate Pass Image (गेटपास इमेज)</label>
                <input
                  type="file"
                  name="gatePassImage"
                  onChange={handleInputChange}
                  accept="image/*"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-navy text-white rounded-md text-sm font-medium hover:bg-navy-dark disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GatePass;