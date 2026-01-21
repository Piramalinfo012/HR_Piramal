import React, { useState, useEffect } from 'react';
import { Search, X, Plus, ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';

const GatePassRequest = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingPasses, setPendingPasses] = useState([]);
  const [approvedPasses, setApprovedPasses] = useState([]);
  const [rejectedPasses, setRejectedPasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [hodNames, setHodNames] = useState([]);
  const employeeId = localStorage.getItem("employeeId");
  const rawUser = localStorage.getItem("user");
  const user = rawUser ? JSON.parse(rawUser) : {};
  const currentUserName = user.Name || '';
  const [canSubmitRequest, setCanSubmitRequest] = useState(true);
  const [monthlyRequestCount, setMonthlyRequestCount] = useState(0);

  const [formData, setFormData] = useState({
    employeeId: employeeId || '',
    employeeName: currentUserName,
    department: '',
    visitPlace: '',
    visitReason: '',
    departureTime: '',
    arrivalTime: '',
    hodName: '',
    whatsappNumber: '', // Start with empty string
    gatePassImage: null
  });

  const SCRIPT_URL = import.meta.env.VITE_GOOGLE_SHEET_URL;

  useEffect(() => {
    if (currentUserName) {
      fetchGatePassData();
      fetchEmployees();
      fetchHodNames();
    }
  }, [currentUserName]);

  const checkSubmissionLimit = () => {
    const today = new Date().toDateString();
    const lastSubmissionDate = localStorage.getItem('lastGatePassSubmission');

    // Check if user already submitted today
    if (lastSubmissionDate === today) {
      setCanSubmitRequest(false);
    } else {
      setCanSubmitRequest(true);
    }

    // Check monthly limit (count requests from current month)
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const allPasses = [...pendingPasses, ...approvedPasses, ...rejectedPasses];
    const monthlyRequests = allPasses.filter(pass => {
      if (pass.departureTime) {
        const passDate = new Date(pass.departureTime);
        return passDate.getMonth() === currentMonth && passDate.getFullYear() === currentYear;
      }
      return false;
    });

    setMonthlyRequestCount(monthlyRequests.length);
  };

  const fetchEmployees = async () => {
    try {
      const response = await fetch(`${SCRIPT_URL}?sheet=JOINING&action=fetch`);
      const result = await response.json();

      if (result.success) {
        if (result.data && result.data.length > 1) {
          const employeeData = result.data.slice(1)
            .map(row => ({
              id: row[1] || '', // Employee ID from Column B
              name: row[2] || '', // Name from Column C
              department: row[20] || '', // Department from Column U
              whatsappNumber: row[11] || '' // WhatsApp from Column L
            }))
            .filter(emp => emp.id && emp.name &&
              emp.name.toLowerCase() === currentUserName.toLowerCase());

          setEmployees(employeeData);

          // If current user is found in JOINING sheet, prefill the form
          if (employeeData.length > 0) {
            const userData = employeeData[0];
            setFormData(prev => ({
              ...prev,
              employeeId: userData.id,
              employeeName: userData.name,
              department: userData.department,
              whatsappNumber: userData.whatsappNumber // Prefill but allow editing
            }));
          }
        } else {
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
          const hodNames = result.data
            .slice(1)
            .map(row => row[0])
            .filter(name => name);
          setHodNames(hodNames);
        } else {
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
            timestamp: row[0] || '', // Column A (Timestamp)
            serialNo: row[1] || '', // Column B (Serial No)
            employeeId: row[2] || '', // Column C (Employee ID)
            employeeName: row[3] || '', // Column D (Name)
            department: row[4] || '', // Column E (Department)
            visitPlace: row[5] || '', // Column F (Place and Reason)
            visitReason: row[5] || '', // Column F (combined with place)
            departureTime: row[6] || '', // Column G (Departure Time)
            arrivalTime: row[7] || '', // Column H (Arrival Time)
            hodName: row[8] || '', // Column I (HOD Name)
            whatsappNumber: row[9] || '', // Column J (WhatsApp)
            gatePassImage: row[10] || '', // Column K (Image)
            status: row[11] || 'pending' // Column L (Status)
          }));

          // Filter passes to show only the current user's data using case-insensitive comparison
          const userPendingPasses = gatePassData.filter(
            pass => pass.status === 'pending' &&
              pass.employeeName.toLowerCase() === currentUserName.toLowerCase()
          );
          const userApprovedPasses = gatePassData.filter(
            pass => pass.status === 'approved' &&
              pass.employeeName.toLowerCase() === currentUserName.toLowerCase()
          );
          const userRejectedPasses = gatePassData.filter(
            pass => pass.status === 'rejected' &&
              pass.employeeName.toLowerCase() === currentUserName.toLowerCase()
          );

          setPendingPasses(userPendingPasses);
          setApprovedPasses(userApprovedPasses);
          setRejectedPasses(userRejectedPasses);

          // Check if user has already submitted a request today (any status)
          checkTodaySubmission(result.data.slice(1));
          // Check monthly limit (any status)
          checkMonthlyLimit(result.data.slice(1));
        } else {
          setPendingPasses([]);
          setApprovedPasses([]);
          setRejectedPasses([]);
          setCanSubmitRequest(true);
          setMonthlyRequestCount(0);
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


  const checkTodaySubmission = (allPasses) => {
    const today = new Date().toDateString();
    const userPassesToday = allPasses.filter(pass => {
      if (pass[0]) { // Column A: Timestamp (index 0)
        try {
          // Parse the timestamp from MM/DD/YYYY HH:MM:SS format
          const [datePart, timePart] = pass[0].split(' ');
          const [month, day, year] = datePart.split('/');
          const fullYear = parseInt(year); // Already full year
          const passDate = new Date(fullYear, parseInt(month) - 1, parseInt(day));

          return passDate.toDateString() === today &&
            pass[3] && pass[3].toLowerCase() === currentUserName.toLowerCase(); // Column D: Name (index 3)
        } catch (e) {
          console.error('Error parsing date:', e);
          return false;
        }
      }
      return false;
    });

    setCanSubmitRequest(userPassesToday.length === 0);
  };

  const checkMonthlyLimit = (allPasses) => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const userMonthlyRequests = allPasses.filter(pass => {
      if (pass[0]) { // Column A: Timestamp (index 0)
        try {
          // Parse the timestamp from MM/DD/YYYY HH:MM:SS format
          const [datePart, timePart] = pass[0].split(' ');
          const [month, day, year] = datePart.split('/');
          const fullYear = parseInt(year); // Already full year
          const passDate = new Date(fullYear, parseInt(month) - 1, parseInt(day));

          return passDate.getMonth() === currentMonth &&
            passDate.getFullYear() === currentYear &&
            pass[3] && pass[3].toLowerCase() === currentUserName.toLowerCase(); // Column D: Name (index 3)
        } catch (e) {
          console.error('Error parsing date:', e);
          return false;
        }
      }
      return false;
    });

    setMonthlyRequestCount(userMonthlyRequests.length);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === 'gatePassImage') {
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

  const getNextSerialNo = (allPasses) => {
    if (allPasses.length === 0) {
      return '1';
    }

    const serialNumbers = allPasses
      .map(pass => {
        try {
          // Serial number is in Column B (index 1)
          return parseInt(pass[1] || '0');
        } catch (e) {
          return 0;
        }
      })
      .filter(num => !isNaN(num))
      .sort((a, b) => b - a);

    return serialNumbers.length > 0 ? (serialNumbers[0] + 1).toString() : '1';
  };

  const uploadImageToDrive = async (file) => {
    try {
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

    // Check monthly limit
    if (monthlyRequestCount >= 3) {
      toast.error('You have reached the monthly limit of 3 gate pass requests');
      return;
    }

    if (!formData.visitPlace || !formData.visitReason ||
      !formData.departureTime || !formData.arrivalTime || !formData.hodName) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      setSubmitting(true);

      // Fetch latest data to get accurate serial number and check for today's submissions
      const response = await fetch(`${SCRIPT_URL}?sheet=Gate%20Pass&action=fetch`);
      const result = await response.json();

      if (!result.success) {
        toast.error('Failed to verify request. Please try again.');
        return;
      }

      const allPasses = result.data && result.data.length > 1 ? result.data.slice(1) : [];

      // Check if user has already submitted today
      const today = new Date().toDateString();
      const userPassesToday = allPasses.filter(pass => {
        if (pass[6]) { // Column G: Departure Time (index 6)
          try {
            const [datePart, timePart] = pass[6].split(' ');
            const [day, month, year] = datePart.split('/');
            const fullYear = parseInt(year) + 2000;
            const passDate = new Date(fullYear, parseInt(month) - 1, parseInt(day));

            return passDate.toDateString() === today &&
              pass[3] && pass[3].toLowerCase() === currentUserName.toLowerCase(); // Column D: Name (index 3)
          } catch (e) {
            return false;
          }
        }
        return false;
      });

      if (userPassesToday.length > 0) {
        toast.error('You have already submitted a gate pass request today');
        setCanSubmitRequest(false);
        return;
      }

      let imageUrl = '';
      if (formData.gatePassImage) {
        imageUrl = await uploadImageToDrive(formData.gatePassImage);
      }

      const formatDateTimeForSheet = (date) => {
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');

        // Return in DD/MM/YYYY HH:MM:SS format for Google Sheets
        return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
      };

      // Format dates to dd/mm/yyyy for departure and arrival
      const formatDateForSheet = (dateTimeString) => {
        const date = new Date(dateTimeString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();

        return `${day}/${month}/${year}`;
      };

      const timestamp = formatDateTimeForSheet(new Date());
      const formattedDepartureTime = formatDateForSheet(formData.departureTime);
      const formattedArrivalTime = formatDateForSheet(formData.arrivalTime);

      // Prepare row data according to your column structure
      const serialNo = getNextSerialNo(allPasses);
      const placeAndReason = `${formData.visitPlace} - ${formData.visitReason}`;

      const rowData = [
        timestamp,                    // Column A: Timestamp (dd/mm/yy hh:mm:ss)
        serialNo,                     // Column B: Serial No
        formData.employeeId,          // Column C: Employee ID
        formData.employeeName,        // Column D: Name of Employee
        formData.department,          // Column E: Department
        placeAndReason,               // Column F: Place and Reason to visit
        formattedDepartureTime,       // Column G: Departure From Plant (dd/mm/yyyy)
        formattedArrivalTime,         // Column H: Arrival at Plant (dd/mm/yyyy)
        formData.hodName,             // Column I: HOD Name
        formData.whatsappNumber,      // Column J: Employee Whatsapp Number
        imageUrl,                     // Column K: Image of Employee gate pass (uploaded URL)
        'pending'                     // Column L: Status
      ];

      const insertResponse = await fetch(SCRIPT_URL, {
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

      const insertResult = await insertResponse.json();

      if (insertResult.success) {
        // Update monthly count and disable today's submission
        setMonthlyRequestCount(prev => prev + 1);
        setCanSubmitRequest(false);

        toast.success('Gate Pass Request submitted successfully!');
        setFormData(prev => ({
          ...prev,
          visitPlace: '',
          visitReason: '',
          departureTime: '',
          arrivalTime: '',
          hodName: '',
          gatePassImage: null
        }));
        setShowModal(false);
        fetchGatePassData(); // Refresh the data
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
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee ID</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee Name</th>
          {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th> */}
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Place and reason to visit</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Departure From Plant</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Arrival at Plant</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">HOD Name</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Whatsapp No</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gate Pass Image</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-white">
        {filteredPendingPasses.length > 0 ? (
          filteredPendingPasses.map((item, index) => (
            <tr key={index} className="hover:bg-white">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.employeeId}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.employeeName}</td>
              {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.department}</td> */}
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <div>
                  <div className="font-medium">{item.visitPlace}</div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDateTime(item.departureTime)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDateTime(item.arrivalTime)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.hodName}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.whatsappNumber}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.gatePassImage ? (<a href={item.gatePassImage} target='_blank' rel='noopener noreferrer'><ImageIcon size={20} /></a>) : ("-")}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                  Pending
                </span>
              </td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan="8" className="px-6 py-12 text-center">
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
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee ID</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee Name</th>
          {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th> */}
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Place and reason to visit</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Departure From Plant</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Arrival at Plant</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">HOD Name</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Whatsapp No</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gate Pass Image</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-white">
        {filteredApprovedPasses.length > 0 ? (
          filteredApprovedPasses.map((item, index) => (
            <tr key={index} className="hover:bg-white">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.employeeId}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.employeeName}</td>
              {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.department}</td> */}
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <div>
                  <div className="font-medium">{item.visitPlace}</div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDateTime(item.departureTime)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDateTime(item.arrivalTime)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.hodName}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.whatsappNumber}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.gatePassImage ? (<a href={item.gatePassImage} target='_blank' rel='noopener noreferrer'><ImageIcon size={20} /></a>) : ("-")}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                  Approved
                </span>
              </td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan="8" className="px-6 py-12 text-center">
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
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee ID</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee Name</th>
          {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th> */}
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Place and reason to visit</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Departure From Plant</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Arrival at Plant</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">HOD Name</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Whatsapp No</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gate Pass Image</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-white">
        {filteredRejectedPasses.length > 0 ? (
          filteredRejectedPasses.map((item, index) => (
            <tr key={index} className="hover:bg-white">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.employeeId}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.employeeName}</td>
              {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.department}</td> */}
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <div>
                  <div className="font-medium">{item.visitPlace}</div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDateTime(item.departureTime)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDateTime(item.arrivalTime)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.hodName}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.whatsappNumber}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.gatePassImage ? (<a href={item.gatePassImage} target='_blank' rel='noopener noreferrer'><ImageIcon size={20} /></a>) : ("-")}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                  Rejected
                </span>
              </td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan="8" className="px-6 py-12 text-center">
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
        <h1 className="text-2xl font-bold">My Gate Pass Requests</h1>
        <button
          onClick={() => setShowModal(true)}
          disabled={!canSubmitRequest || monthlyRequestCount >= 3}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-navy hover:bg-navy-dark disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={16} className="mr-2" />
          New Request
          {monthlyRequestCount >= 3 && (
            <span className="ml-2 text-xs">(Monthly limit reached)</span>
          )}
          {!canSubmitRequest && monthlyRequestCount < 3 && (
            <span className="ml-2 text-xs">(Already submitted today)</span>
          )}
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4">
        <div className="flex flex-1 max-w-md">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Search your requests..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search
              size={20}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab("pending")}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${activeTab === "pending"
                  ? "border-indigo-500 text-navy"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
            >
              Pending ({pendingPasses.length})
            </button>
            <button
              onClick={() => setActiveTab("approved")}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${activeTab === "approved"
                  ? "border-indigo-500 text-navy"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
            >
              Approved ({approvedPasses.length})
            </button>
            <button
              onClick={() => setActiveTab("rejected")}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${activeTab === "rejected"
                  ? "border-indigo-500 text-navy"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
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
                    {loading
                      ? "Processing request..."
                      : "Loading gate pass data..."}
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
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name of Employee (कर्मचारी का नाम)
                </label>
                <input
                  type="text"
                  name="employeeName"
                  value={formData.employeeName}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 focus:outline-none"
                  readOnly
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employee ID (कर्मचारी आईडी)
                </label>
                <input
                  type="text"
                  name="employeeId"
                  value={formData.employeeId}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 focus:outline-none"
                  readOnly
                />
              </div>

              {/* <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department
                </label>
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 focus:outline-none"
                  readOnly
                />
              </div> */}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Place to visit (जगह का दौरा) *
                </label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason to visit (यात्रा करने का कारण) *
                </label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Departure From Plant (प्लांट से प्रस्थान)  *
                  </label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Arrival at Plant (प्लांट में वापसी)
                  </label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  HOD Name (एचओडी का नाम) *
                </label>
                <select
                  name="hodName"
                  value={formData.hodName}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy"
                  required
                >
                  <option value="">Select HOD</option>
                  {hodNames.map((hod, index) => (
                    <option key={index} value={hod}>
                      {hod}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  WhatsApp Number (व्हाट्सएप नंबर)
                </label>
                <input
                  type="tel"
                  name="whatsappNumber"
                  value={formData.whatsappNumber}
                  onChange={handleInputChange} // Allow manual editing
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy"
                  placeholder="Enter WhatsApp number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gate Pass Image (गेटपास इमेज)
                </label>
                <input
                  type="file"
                  name="gatePassImage"
                  onChange={handleInputChange}
                  accept="image/*"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy"
                />
              </div>

              {monthlyRequestCount >= 3 && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-red-600 text-sm">
                    You have reached the monthly limit of 3 gate pass requests.
                  </p>
                </div>
              )}

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
                  disabled={submitting || monthlyRequestCount >= 3}
                  className="px-4 py-2 bg-navy text-white rounded-md text-sm font-medium hover:bg-navy-dark disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Submitting..." : "Submit Request"}
                  {monthlyRequestCount >= 3 && " (Limit reached)"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GatePassRequest;