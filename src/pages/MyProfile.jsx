import React, { useEffect, useState } from 'react';
import { User, Mail, Phone, MapPin, Calendar, Building, Edit3, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';

const MyProfile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [leaveData, setLeaveData] = useState([]);
  const [gatePassData, setGatePassData] = useState([]);


  const getDisplayableImageUrl = (url) => {
    if (!url) return null;

    try {
      const directMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (directMatch && directMatch[1]) {
        return `https://drive.google.com/thumbnail?id=${directMatch[1]}&sz=w400`;
      }
      
      const ucMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (ucMatch && ucMatch[1]) {
        return `https://drive.google.com/thumbnail?id=${ucMatch[1]}&sz=w400`;
      }
      
      const openMatch = url.match(/open\?id=([a-zA-Z0-9_-]+)/);
      if (openMatch && openMatch[1]) {
        return `https://drive.google.com/thumbnail?id=${openMatch[1]}&sz=w400`;
      }
      
      if (url.includes("thumbnail?id=")) {
        return url;
      }

      const anyIdMatch = url.match(/([a-zA-Z0-9_-]{25,})/);
      if (anyIdMatch && anyIdMatch[1]) {
        return `https://drive.google.com/thumbnail?id=${anyIdMatch[1]}&sz=w400`;
      }
      
      const cacheBuster = Date.now();
      return url.includes("?") ? `${url}&cb=${cacheBuster}` : `${url}?cb=${cacheBuster}`;
    } catch (e) {
      console.error("Error processing image URL:", url, e);
      return url; // Return original URL as fallback
    }
  };

const fetchLeaveData = async () => {
  try {
    // Get employee ID from localStorage
    const employeeId = localStorage.getItem("employeeId");
    if (!employeeId) {
      console.log("No employee ID found for fetching leave data");
      return;
    }

    // Fetch data from the Leave Management sheet
    const response = await fetch(
      'https://script.google.com/macros/s/AKfycbx7_8IiGXsVplVge8Fi8PIsxL1Ub_QqQI77x1flWxkl2KlyunmnVheG7yA6safW20yZ/exec?sheet=Leave Management&action=fetch'
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

    // Use row 1 as headers (index 0 in the array)
    if (rawData.length < 1) {
      console.error('No data found in Leave Management sheet');
      return;
    }

    const headers = rawData[0].map(h => h?.toString().trim());
    const dataRows = rawData.length > 1 ? rawData.slice(1) : [];
    
    // Get column indices - using more flexible matching
    const getIndex = (possibleNames) => {
      for (const name of possibleNames) {
        const index = headers.findIndex(h => 
          h && h.toString().trim().toLowerCase().includes(name.toLowerCase())
        );
        if (index !== -1) return index;
      }
      return -1;
    };

    const employeeNameIndex = getIndex(['employee name', 'name', 'employee']);
    const fromDateIndex = getIndex(['Leave Date Start', 'from', 'start date']);
    const toDateIndex = getIndex(['Leaave Date End', 'to', 'end date']);
    const remarksIndex = getIndex(['remarks', 'comment', 'reason']);
    const statusIndex = getIndex(['status', 'approval status']);
    const leaveTypeIndex = getIndex(['leave type', 'type', 'leave']);

    // Log for debugging
    console.log('Leave sheet headers:', headers);
    console.log('Column indices:', {
      employeeNameIndex,
      fromDateIndex,
      toDateIndex,
      remarksIndex,
      statusIndex,
      leaveTypeIndex
    });

    // Process data and filter for current employee
    const processedData = dataRows
      .filter(row => {
        if (employeeNameIndex === -1) return false;
        
        const rowEmployeeName = row[employeeNameIndex]?.toString().trim();
        return rowEmployeeName && 
               rowEmployeeName.toLowerCase() === profileData.candidateName?.toLowerCase();
      })
      .map(row => ({
        employeeName: employeeNameIndex !== -1 ? row[employeeNameIndex] || '' : 'N/A',
        fromDate: fromDateIndex !== -1 ? row[fromDateIndex] || '' : 'N/A',
        toDate: toDateIndex !== -1 ? row[toDateIndex] || '' : 'N/A',
        remarks: remarksIndex !== -1 ? row[remarksIndex] || '' : 'N/A',
        status: statusIndex !== -1 ? row[statusIndex] || '' : 'Pending',
        leaveType: leaveTypeIndex !== -1 ? row[leaveTypeIndex] || '' : 'N/A'
      }));

    console.log('Processed leave data:', processedData);
    setLeaveData(processedData);
  } catch (error) {
    console.error('Error fetching leave data:', error);
  }
};


const fetchGatePassData = async () => {
  try {
    const response = await fetch(
      'https://script.google.com/macros/s/AKfycbx7_8IiGXsVplVge8Fi8PIsxL1Ub_QqQI77x1flWxkl2KlyunmnVheG7yA6safW20yZ/exec?sheet=Gate Pass&action=fetch'
    );

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to fetch Gate Pass sheet');

    const rawData = result.data || result;
    if (!Array.isArray(rawData)) throw new Error('Expected array data not received');

    const headers = rawData[0].map(h => h?.toString().trim());
    const dataRows = rawData.slice(1);
    
    const getIndex = (col) => headers.findIndex(h => h && h.toLowerCase().includes(col.toLowerCase()));
    
    const empIndex = getIndex('Employee Name');
    const placeIndex = getIndex('Place and reason to visit');
    const departureIndex = getIndex('Departure From Plant');
    const arrivalIndex = getIndex('Arrival at Plant');
    const statusIndex = getIndex('Status');

    const processedData = dataRows
    .filter(row => row[empIndex]?.toString().trim().toLowerCase() === profileData.candidateName?.toLowerCase())
      .map(row => ({
        employeeName: row[empIndex] || '',
        place: row[placeIndex] || '',
        departure: row[departureIndex] || '',
        arrival: row[arrivalIndex] || '',
        status: row[statusIndex] || ''
      }));
      
      setGatePassData(processedData);
    } catch (error) {
      console.error('Error fetching gate pass data:', error);
  }
};

useEffect(() => {
  if (profileData && profileData.candidateName) {
    fetchLeaveData();
    fetchGatePassData(); 
  }
}, [profileData]);


  const fetchJoiningData = async () => {
    try {
      const userData = localStorage.getItem('user');
      if (!userData) {
        throw new Error('No user data found in localStorage');
      }

      const currentUser = JSON.parse(userData);
      const userName = currentUser.Name;

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

      // Find the header row by looking for the 'Joining ID' column
      let headerRowIndex = -1;
      let headers = [];
      
      for (let i = 0; i < rawData.length; i++) {
        const row = rawData[i];
        if (row && Array.isArray(row)) {
          const joiningIdIndex = row.findIndex(cell => 
            cell && cell.toString().trim().toLowerCase().includes('joining id')
          );
          
          if (joiningIdIndex !== -1) {
            headerRowIndex = i;
            headers = row.map(h => h?.toString().trim());
            break;
          }
        }
      }
      
      if (headerRowIndex === -1) {
        throw new Error('Could not find header row with Joining ID column');
      }

      const dataRows = rawData.length > headerRowIndex + 1 ? rawData.slice(headerRowIndex + 1) : [];
      
      const getIndex = (headerName) => {
        const index = headers.findIndex(h => 
          h && h.toString().trim().toLowerCase() === headerName.toLowerCase()
        );
        if (index === -1) {
          console.warn(`Column "${headerName}" not found in sheet`);
        }
        return index;
      };

      const processedData = dataRows.map(row => ({
        timestamp: row[getIndex('Timestamp')] || '',
        joiningNo: row[getIndex('Joining ID')] || '',
        candidateName: row[getIndex('Name As Per Aadhar')] || '',
        candidatePhoto: row[getIndex("Candidate's Photo")] || '',
        fatherName: row[getIndex('Father Name')] || '',
        dateOfJoining: row[getIndex('Date Of Joining')] || '',
        joiningPlace: '',
        designation: row[getIndex('Designation')] || '',
        salary: row[getIndex('Department')] || '',
        currentAddress: row[getIndex('Current Address')] || '',
        addressAsPerAadhar: '',
        bodAsPerAadhar: row[getIndex('Date Of Birth As Per Aadhar Card')] || '',
        gender: row[getIndex('Gender')] || '',
        mobileNo: row[getIndex('Mobile No.')] || '',
        familyMobileNo: row[getIndex('Family Mobile No')] || '',
        relationWithFamily: row[getIndex('Relationship With Family Person')] || '',
        email: row[getIndex('Personal Email-Id')] || '', 
        companyName: row[getIndex('Department')] || '',
        aadharNo: row[getIndex('Aadhar Card No')] || '',
      }));

      console.log(processedData);
      

      // Filter data for the current user
      const filteredData = processedData.filter(task => 
        task.candidateName?.trim().toLowerCase() === userName.trim().toLowerCase()
      );

      if (filteredData.length > 0) {
        const profile = filteredData[0];
        
        // Fetch profile image from ENQUIRY sheet
        try {
          const enquiryResponse = await fetch(
            'https://script.google.com/macros/s/AKfycbx7_8IiGXsVplVge8Fi8PIsxL1Ub_QqQI77x1flWxkl2KlyunmnVheG7yA6safW20yZ/exec?sheet=ENQUIRY&action=fetch'
          );
          
          if (enquiryResponse.ok) {
            const enquiryResult = await enquiryResponse.json();
            if (enquiryResult.success) {
              const enquiryData = enquiryResult.data || enquiryResult;
              
              // Find the header row in ENQUIRY sheet
              let enquiryHeaderRowIndex = -1;
              let enquiryHeaders = [];
              
              for (let i = 0; i < enquiryData.length; i++) {
                const row = enquiryData[i];
                if (row && Array.isArray(row)) {
                  const candidatePhotoIndex = row.findIndex(cell => 
                    cell && cell.toString().trim().toLowerCase().includes("candidate's photo")
                  );
                  
                  if (candidatePhotoIndex !== -1) {
                    enquiryHeaderRowIndex = i;
                    enquiryHeaders = row.map(h => h?.toString().trim());
                    break;
                  }
                }
              }
              
              if (enquiryHeaderRowIndex !== -1) {
                const photoIndex = enquiryHeaders.findIndex(h => 
                  h && h.toLowerCase().includes("candidate's photo")
                );
                
                // Find the row with matching employee ID
                const employeeIdIndex = enquiryHeaders.findIndex(h => 
                  h && h.toLowerCase().includes('joining id')
                );
                
                if (employeeIdIndex !== -1 && photoIndex !== -1) {
                  for (let i = enquiryHeaderRowIndex + 1; i < enquiryData.length; i++) {
                    const row = enquiryData[i];
                    if (row[employeeIdIndex] === profile.joiningNo && row[photoIndex]) {
                      profile.candidatePhoto = row[photoIndex];
                      break;
                    }
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error('Error fetching profile image from ENQUIRY sheet:', error);
          // Continue without the profile image if there's an error
        }
        
        setProfileData(profile);
        setFormData(profile);
        localStorage.setItem("employeeId", profile.joiningNo);
      } else {
        toast.error('No profile data found for current user');
      }
      
    } catch (error) {
      console.error('Error fetching joining data:', error);
      toast.error(`Failed to load profile data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJoiningData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch current data from JOINING sheet
      const fullDataResponse = await fetch(
        'https://script.google.com/macros/s/AKfycbx7_8IiGXsVplVge8Fi8PIsxL1Ub_QqQI77x1flWxkl2KlyunmnVheG7yA6safW20yZ/exec?sheet=JOINING&action=fetch'
      );
      
      if (!fullDataResponse.ok) {
        throw new Error(`HTTP error! status: ${fullDataResponse.status}`);
      }

      const fullDataResult = await fullDataResponse.json();
      const allData = fullDataResult.data || fullDataResult;

      // 2. Find header row by looking for the 'Joining ID' column
      let headerRowIndex = -1;
      let headers = [];
      
      for (let i = 0; i < allData.length; i++) {
        const row = allData[i];
        if (row && Array.isArray(row)) {
          const joiningIdIndex = row.findIndex(cell => 
            cell && cell.toString().trim().toLowerCase().includes('joining id')
          );
          
          if (joiningIdIndex !== -1) {
            headerRowIndex = i;
            headers = row.map(h => h?.toString().trim());
            break;
          }
        }
      }
      
      if (headerRowIndex === -1) {
        throw new Error("Could not find header row with 'Joining ID' column");
      }

      // 3. Find Employee ID column index
      const employeeIdIndex = headers.findIndex(h => 
        h && h.toLowerCase().includes('joining id')
      );
      
      if (employeeIdIndex === -1) {
        throw new Error("Could not find 'Joining ID' column");
      }

      // 4. Find the employee row index
      const rowIndex = allData.findIndex((row, idx) =>
        idx > headerRowIndex &&
        row[employeeIdIndex]?.toString().trim() === profileData.joiningNo?.toString().trim()
      );
      
      if (rowIndex === -1) throw new Error(`Employee ${profileData.joiningNo} not found`);

      // 5. Get a copy of the existing row
      let currentRow = [...allData[rowIndex]];

      // 6. Apply updates to the row data
      // Map form fields to their respective column indices
      const headerMap = {
        'mobileNo': headers.findIndex(h => h && h.toLowerCase().includes('mobile no')),
        'familyMobileNo': headers.findIndex(h => h && h.toLowerCase().includes('family mobile no')),
        'email': headers.findIndex(h => h && h.toLowerCase().includes('personal email-id')),
        'currentAddress': headers.findIndex(h => h && h.toLowerCase().includes('current address'))
      };

      // Only update fields that are editable in the form
      if (headerMap['mobileNo'] !== -1) {
        currentRow[headerMap['mobileNo']] = formData.mobileNo || '';
      }
      if (headerMap['familyMobileNo'] !== -1) {
        currentRow[headerMap['familyMobileNo']] = formData.familyMobileNo || '';
      }
      if (headerMap['email'] !== -1) {
        currentRow[headerMap['email']] = formData.email || '';
      }
      if (headerMap['currentAddress'] !== -1) {
        currentRow[headerMap['currentAddress']] = formData.currentAddress || '';
      }

      // 7. Prepare payload
      const payload = {
        sheetName: "JOINING",
        action: "update",
        rowIndex: rowIndex + 1, // Convert to 1-based index
        rowData: JSON.stringify(currentRow)
      };

      console.log("Final payload being sent:", payload);

      // 8. Send update request
      const response = await fetch(
        "https://script.google.com/macros/s/AKfycbx7_8IiGXsVplVge8Fi8PIsxL1Ub_QqQI77x1flWxkl2KlyunmnVheG7yA6safW20yZ/exec",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams(payload).toString(),
        }
      );

      const result = await response.json();
      console.log("Update result:", result);

      if (result.success) {
        // Update local state only after successful API update
        setProfileData(formData);
        toast.success('Profile updated successfully!');
        setIsEditing(false);
      } else {
        throw new Error(result.error || "Failed to update data");
      }

    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(`Failed to update profile: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData(profileData || {});
    setIsEditing(false);
  };

  if (loading) {
    return <div className="page-content p-6"><div className="flex justify-center flex-col items-center">
                        <div className="w-6 h-6 border-4 border-indigo-500 border-dashed rounded-full animate-spin mb-2"></div>
                        <span className="text-gray-600 text-sm">Loading profile data...</span>
                      </div></div>;
  }

  if (!profileData) {
    return <div className="page-content p-6">No profile data available</div>;
  }

  return (
    <div className="space-y-6 page-content p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">My Profile</h1>
        <div className="flex space-x-2">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              <Edit3 size={16} className="mr-2" />
              Edit Profile
            </button>
          ) : (
            <div className="flex space-x-2">
              <button
                onClick={handleSave}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Save size={16} className="mr-2" />
                Save
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                <X size={16} className="mr-2" />
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Picture & Basic Info */}
        <div className="bg-white rounded-xl shadow-lg border p-6">
          <div className="text-center">
            <div className="w-32 h-32 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden">
              {profileData.candidatePhoto ? (
                <img
                  src={getDisplayableImageUrl(profileData.candidatePhoto)}
                  alt="Profile"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    console.log("Image failed to load:", e.target.src);
                    // First try the original URL directly
                    if (e.target.src !== profileData.candidatePhoto) {
                      console.log(
                        "Trying original URL:",
                        profileData.candidatePhoto
                      );
                      e.target.src = profileData.candidatePhoto;
                    } else {
                      // If that also fails, show user icon
                      console.log("Both thumbnail and original URL failed");
                      e.target.style.display = "none";
                      e.target.nextSibling.style.display = "flex";
                    }
                  }}
                  onLoad={(e) => {
                    console.log("Image loaded successfully:", e.target.src);
                  }}
                />
              ) : null}
              <div
                className={`w-full h-full flex items-center justify-center ${
                  profileData.candidatePhoto ? "hidden" : "flex"
                }`}
              >
                <User size={48} className="text-indigo-400" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-gray-800">
              {profileData.candidateName}
            </h2>
            <p className="text-gray-600">{profileData.designation}</p>
            <p className="text-sm text-gray-500">{profileData.joiningNo}</p>
          </div>
        </div>

        {/* Personal Information */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-lg border p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-6">
            Personal Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* First Column */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User size={16} className="inline mr-2" />
                  Full Name
                </label>
                <p className="text-gray-800 font-medium">
                  {profileData.candidateName}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Building size={16} className="inline mr-2" />
                  Designation
                </label>
                <p className="text-gray-800">{profileData.designation}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Building size={16} className="inline mr-2" />
                  Department
                </label>
                <p className="text-gray-800">{profileData.companyName}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar size={16} className="inline mr-2" />
                  Date of Birth
                </label>
                <p className="text-gray-800">{profileData.bodAsPerAadhar}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gender
                </label>
                <p className="text-gray-800">{profileData.gender}</p>
              </div>
            </div>

            {/* Second Column */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Father's Name
                </label>
                <p className="text-gray-800">{profileData.fatherName}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar size={16} className="inline mr-2" />
                  Joining Date
                </label>
                <p className="text-gray-800">{profileData.dateOfJoining}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Mail size={16} className="inline mr-2" />
                  Email Address
                </label>
                {isEditing ? (
                  <input
                    type="email"
                    name="email"
                    value={formData.email || ""}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                ) : (
                  <p className="text-gray-800">{profileData.email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Phone size={16} className="inline mr-2" />
                  Phone Number
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    name="mobileNo"
                    value={formData.mobileNo || ""}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                ) : (
                  <p className="text-gray-800">{profileData.mobileNo}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Emergency Contact
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    name="familyMobileNo"
                    value={formData.familyMobileNo || ""}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                ) : (
                  <p className="text-gray-800">{profileData.familyMobileNo}</p>
                )}
              </div>
            </div>
          </div>

          {/* Current Address - Full width below the two columns */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin size={16} className="inline mr-2" />
              Current Address
            </label>
            {isEditing ? (
              <textarea
                name="currentAddress"
                value={formData.currentAddress || ""}
                onChange={handleInputChange}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            ) : (
              <p className="text-gray-800 whitespace-pre-line">
                {profileData.currentAddress}
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leave History Card */}
        <div className="bg-white rounded-xl shadow-lg border p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-6">
            Leave History
          </h3>
          {leaveData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Leave Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      From Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      To Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Remarks
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {leaveData.map((leave, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 text-sm text-gray-800">
                        {leave.leaveType}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-800">
                        {leave.fromDate}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-800">
                        {leave.toDate}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            leave.status.toLowerCase() === "approved"
                              ? "bg-green-100 text-green-800"
                              : leave.status.toLowerCase() === "rejected"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {leave.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-800">
                        {leave.remarks}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-600 text-center py-4">
              No leave records found
            </p>
          )}
        </div>

        {/* Gate Pass Card */}
        <div className="bg-white rounded-xl shadow-lg border p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-6">
            Gate Pass History
          </h3>
          {gatePassData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Place & Reason
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Departure
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Arrival
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {gatePassData.map((gp, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 text-sm text-gray-800">
                        {gp.place}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-800">
                        {gp.departure}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-800">
                        {gp.arrival}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            gp.status.toLowerCase() === "approved"
                              ? "bg-green-100 text-green-800"
                              : gp.status.toLowerCase() === "rejected"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {gp.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-600 text-center py-4">
              No gate pass records found
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyProfile;