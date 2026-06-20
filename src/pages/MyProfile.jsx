import React, { useEffect, useRef, useState } from 'react';
import { User, Mail, Phone, MapPin, Calendar, Building, Edit3, Save, X, ChevronRight, Briefcase, FileText, ShieldCheck, HeartPulse, LockKeyhole, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';

const MyProfile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [openProfileSections, setOpenProfileSections] = useState(['personal']);
  const [formData, setFormData] = useState({});
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const profileFetchInProgressRef = useRef(false);
  const { user: authUser } = useAuthStore();


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

  const getDriveFileId = (url) => {
    if (!url) return "";
    const match =
      url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
      url.match(/\/d\/([a-zA-Z0-9_-]+)/) ||
      url.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
      url.match(/open\?id=([a-zA-Z0-9_-]+)/) ||
      url.match(/([a-zA-Z0-9_-]{25,})/);
    return match?.[1] || "";
  };

  const getImageUrlCandidates = (...urls) => {
    const candidates = [];
    const add = (value) => {
      if (value && !candidates.includes(value)) candidates.push(value);
    };

    urls.filter(Boolean).forEach((url) => {
      const cleanUrl = url.toString().trim();
      const driveId = getDriveFileId(cleanUrl);
      const displayUrl = getDisplayableImageUrl(cleanUrl);

      add(displayUrl);
      if (driveId) {
        add(`https://drive.google.com/thumbnail?id=${driveId}&sz=w800`);
        add(`https://lh3.googleusercontent.com/d/${driveId}=w800`);
        add(`https://drive.google.com/uc?export=view&id=${driveId}`);
      }
      add(cleanUrl);
    });

    return candidates;
  };

  const getStoredProfilePic = () => {
    try {
      const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
      return (
        authUser?.profilePic ||
        authUser?.ProfilePic ||
        authUser?.["Profile Pic"] ||
        authUser?.Photo ||
        authUser?.photo ||
        authUser?.["Candidate Photo"] ||
        currentUser.profilePic ||
        currentUser.ProfilePic ||
        currentUser["Profile Pic"] ||
        currentUser.Photo ||
        currentUser.photo ||
        currentUser["Candidate Photo"] ||
        ""
      );
    } catch {
      return "";
    }
  };

  const fetchJoiningData = async () => {
    if (profileFetchInProgressRef.current) return;

    try {
      profileFetchInProgressRef.current = true;
      const userData = localStorage.getItem('user');
      if (!userData) {
        throw new Error('No user data found in localStorage');
      }

      const currentUser = JSON.parse(userData);
      const userName = currentUser.Name || currentUser.name || currentUser["Employee Name"] || "";
      const storedEmployeeId =
        localStorage.getItem("employeeId") ||
        currentUser.employeeId ||
        currentUser.EmployeeID ||
        currentUser["Employee ID"] ||
        currentUser["User ID"] ||
        "";

      const response = await fetch(
        `${import.meta.env.VITE_JOINING_SHEET_URL}?action=read&sheet=JOINING_FMS`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error || 'Failed to fetch data from JOINING_FMS sheet');
      }

      const rawData = result.data || result;

      if (!Array.isArray(rawData)) {
        throw new Error('Expected array data not received');
      }

      // Find the header row used by JOINING_FMS
      let headerRowIndex = -1;
      let headers = [];

      for (let i = 0; i < rawData.length; i++) {
        const row = rawData[i];
        if (row && Array.isArray(row)) {
          const normalizedRow = row.map(cell => cell?.toString().trim().toLowerCase());
          const joiningIdIndex = normalizedRow.findIndex(cell =>
            cell && (cell === 'id' || cell.includes('joining id') || cell.includes('indent number'))
          );
          const candidateNameIndex = normalizedRow.findIndex(cell =>
            cell && (cell.includes('candidate name') || cell.includes('candiate name') || cell.includes('name as per aadhar'))
          );

          if (joiningIdIndex !== -1 && candidateNameIndex !== -1) {
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

      const getIndex = (headerNames, fallbackIndex = -1) => {
        const names = Array.isArray(headerNames) ? headerNames : [headerNames];
        const index = headers.findIndex(h =>
          h && names.some(name => {
            const headerValue = h.toString().trim().toLowerCase();
            const expected = name.toLowerCase();
            return headerValue === expected || headerValue.includes(expected);
          })
        );
        return index === -1 ? fallbackIndex : index;
      };

      const idxIndent = getIndex(['Joining ID', 'Indent Number', 'Employee ID'], 5);
      const idxName = getIndex(['Name As Per Aadhar', 'Candidate Name', 'Candiate Name'], 10);
      const idxDept = getIndex(['Department'], 2);
      const idxStatus = getIndex(['Status'], 8);
      const idxFather = getIndex(['Father Name'], 11);
      const idxJoiningDate = getIndex(['Date Of Joining', 'Joining Date'], 12);
      const idxJoiningPlace = getIndex(['Joining Place', 'Job Location'], 13);
      const idxDesignation = getIndex(['Designation'], 14);
      const idxPhoto = getIndex(["Candidate's Photo", 'Candidate Photo', 'Photo'], 18);
      const idxMobile = getIndex(['Contact No', 'Mobile No.', 'Mobile No'], 23);
      const idxEmail = getIndex(['Email Id', 'Personal Email-Id', 'Email'], 31);
      const idxEmployeeCode = getIndex(['Employee Code'], 4);
      const idxCurrentAddress = getIndex(['Current Address'], -1);
      const idxDob = getIndex(['Date Of Birth As Per Aadhar Card', 'Date Of Birth', 'DOB'], -1);
      const idxGender = getIndex(['Gender'], -1);
      const idxFamilyMobile = getIndex(['Family Mobile No', 'Family Mobile'], -1);
      const idxRelation = getIndex(['Relationship With Family Person', 'Relationship with Family Person'], 25);
      const idxPastPf = getIndex(['Past Pf Id No', 'Past PF'], 26);
      const idxBankAccount = getIndex(['Current Bank AC No', 'Bank AC No', 'Account No'], 27);
      const idxIfsc = getIndex(['IFSC Code'], 28);
      const idxBranch = getIndex(['Branch Name'], 29);
      const idxBankPassbook = getIndex(['Photo Of Front Bank Passbook', 'Bank Passbook'], 30);
      const idxAadharPhoto = getIndex(['Aadhar Frontside photo', 'Aadhar Frontside', 'Aadhar Photo'], 16);
      const idxPanCard = getIndex(['Pan Card'], 17);
      const idxQualification = getIndex(['Highest Qualification'], 33);
      const idxQualificationPhoto = getIndex(['Qualication Photo', 'Qualification Photo'], 35);
      const idxSalarySlip = getIndex(['Salary Slip'], 36);
      const idxResume = getIndex(['Resume/Cv Upload', 'Resume', 'CV Upload'], 37);
      const idxEsic = getIndex(['ESIC No'], 32);
      const idxAadhar = getIndex(['Aadhar Card No', 'Aadhar No'], -1);

      const processedData = dataRows.map(row => ({
        employeeCode: idxEmployeeCode !== -1 ? row[idxEmployeeCode] || '' : '',
        timestamp: row[getIndex('Timestamp')] || '',
        joiningNo: row[idxIndent] || '',
        candidateName: row[idxName] || '',
        candidatePhoto: row[idxPhoto] || '',
        fatherName: row[idxFather] || '',
        dateOfJoining: row[idxJoiningDate] || '',
        joiningPlace: row[idxJoiningPlace] || '',
        designation: row[idxDesignation] || '',
        salary: row[idxDept] || '',
        currentAddress: idxCurrentAddress !== -1 ? row[idxCurrentAddress] || '' : '',
        addressAsPerAadhar: '',
        bodAsPerAadhar: idxDob !== -1 ? row[idxDob] || '' : '',
        gender: idxGender !== -1 ? row[idxGender] || '' : '',
        mobileNo: row[idxMobile] || '',
        familyMobileNo: idxFamilyMobile !== -1 ? row[idxFamilyMobile] || '' : '',
        relationWithFamily: idxRelation !== -1 ? row[idxRelation] || '' : '',
        email: row[idxEmail] || '',
        companyName: row[idxDept] || '',
        aadharNo: idxAadhar !== -1 ? row[idxAadhar] || '' : '',
        pastPfIdNo: idxPastPf !== -1 ? row[idxPastPf] || '' : '',
        bankAccountNo: idxBankAccount !== -1 ? row[idxBankAccount] || '' : '',
        ifscCode: idxIfsc !== -1 ? row[idxIfsc] || '' : '',
        branchName: idxBranch !== -1 ? row[idxBranch] || '' : '',
        bankPassbookPhoto: idxBankPassbook !== -1 ? row[idxBankPassbook] || '' : '',
        aadharFrontPhoto: idxAadharPhoto !== -1 ? row[idxAadharPhoto] || '' : '',
        panCardPhoto: idxPanCard !== -1 ? row[idxPanCard] || '' : '',
        highestQualification: idxQualification !== -1 ? row[idxQualification] || '' : '',
        qualificationPhoto: idxQualificationPhoto !== -1 ? row[idxQualificationPhoto] || '' : '',
        salarySlip: idxSalarySlip !== -1 ? row[idxSalarySlip] || '' : '',
        resumeCvUpload: idxResume !== -1 ? row[idxResume] || '' : '',
        esicNo: idxEsic !== -1 ? row[idxEsic] || '' : '',
        status: row[idxStatus] || '',
      }));

      console.log(processedData);


      // Filter data for the current user
      const filteredData = processedData.filter(task =>
        task.candidateName?.trim().toLowerCase() === userName.trim().toLowerCase() ||
        (storedEmployeeId && task.joiningNo?.toString().trim().toLowerCase() === storedEmployeeId.toString().trim().toLowerCase())
      );

      if (filteredData.length > 0) {
        const profile = filteredData[0];

        // Fetch profile image from ENQUIRY sheet
        try {
          const enquiryResponse = await fetch(
            `${import.meta.env.VITE_GOOGLE_SHEET_URL}?sheet=ENQUIRY&action=fetch`
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
      profileFetchInProgressRef.current = false;
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

      // 1. Fetch current data from JOINING_FMS sheet
      const fullDataResponse = await fetch(
        `${import.meta.env.VITE_JOINING_SHEET_URL}?action=read&sheet=JOINING_FMS`
      );

      if (!fullDataResponse.ok) {
        throw new Error(`HTTP error! status: ${fullDataResponse.status}`);
      }

      const fullDataResult = await fullDataResponse.json();
      const allData = fullDataResult.data || fullDataResult;

      // 2. Find header row used by JOINING_FMS
      let headerRowIndex = -1;
      let headers = [];

      for (let i = 0; i < allData.length; i++) {
        const row = allData[i];
        if (row && Array.isArray(row)) {
          const normalizedRow = row.map(cell => cell?.toString().trim().toLowerCase());
          const joiningIdIndex = normalizedRow.findIndex(cell =>
            cell && (cell === 'id' || cell.includes('joining id') || cell.includes('indent number'))
          );
          const candidateNameIndex = normalizedRow.findIndex(cell =>
            cell && (cell.includes('candidate name') || cell.includes('candiate name') || cell.includes('name as per aadhar'))
          );

          if (joiningIdIndex !== -1 && candidateNameIndex !== -1) {
            headerRowIndex = i;
            headers = row.map(h => h?.toString().trim());
            break;
          }
        }
      }

      if (headerRowIndex === -1) {
        throw new Error("Could not find JOINING_FMS header row");
      }

      // 3. Find Employee ID column index
      const employeeIdIndex = headers.findIndex(h =>
        h && (h.toLowerCase().trim() === 'id' || h.toLowerCase().includes('joining id') || h.toLowerCase().includes('indent number'))
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
        'mobileNo': headers.findIndex(h => h && (h.toLowerCase().includes('mobile no') || h.toLowerCase().includes('contact no'))),
        'familyMobileNo': headers.findIndex(h => h && h.toLowerCase().includes('family mobile no')),
        'email': headers.findIndex(h => h && (h.toLowerCase().includes('personal email-id') || h.toLowerCase().includes('email id'))),
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
        sheetName: "JOINING_FMS",
        action: "update",
        rowIndex: rowIndex + 1, // Convert to 1-based index
        rowData: JSON.stringify(currentRow)
      };

      console.log("Final payload being sent:", payload);

      // 8. Send update request
      const response = await fetch(
        import.meta.env.VITE_JOINING_SHEET_URL,
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

  const profileImageSources = getImageUrlCandidates(
    getStoredProfilePic(),
    profileData.profilePic,
    profileData.ProfilePic,
    profileData["Profile Pic"],
    profileData.candidatePhoto,
    profileData["Candidate Photo"],
    profileData.Photo
  );
  const profilePhoto = profileImageSources[0];
  const infoRows = [
    { icon: User, label: 'Employee ID', value: profileData.joiningNo },
    { icon: Mail, label: 'Email', value: profileData.email, editable: 'email', type: 'email' },
    { icon: Phone, label: 'Phone', value: profileData.mobileNo, editable: 'mobileNo', type: 'tel' },
    { icon: Building, label: 'Department', value: profileData.companyName },
    { icon: Calendar, label: 'Date of Joining', value: profileData.dateOfJoining },
    { icon: Briefcase, label: 'Designation', value: profileData.designation },
    { icon: User, label: "Father's Name", value: profileData.fatherName },
    { icon: HeartPulse, label: 'Emergency Contact', value: profileData.familyMobileNo, editable: 'familyMobileNo', type: 'tel' },
    { icon: Calendar, label: 'Date of Birth', value: profileData.bodAsPerAadhar },
    { icon: MapPin, label: 'Current Address', value: profileData.currentAddress, editable: 'currentAddress', textarea: true },
  ];

  const profileLinks = [
    { id: 'personal', icon: ShieldCheck, label: 'Personal Information' },
    { id: 'bank', icon: Building, label: 'Bank Details' },
    { id: 'documents', icon: FileText, label: 'Documents' },
    { id: 'emergency', icon: HeartPulse, label: 'Emergency Contact' },
    { id: 'password', icon: LockKeyhole, label: 'Change Password' },
  ];

  const isLinkValue = (value) => /^https?:\/\//i.test(value?.toString().trim() || '');
  const sectionDetails = {
    personal: {
      title: 'Personal Information',
      rows: infoRows,
    },
    bank: {
      title: 'Bank Details',
      rows: [
        { icon: Building, label: 'Bank Account No.', value: profileData.bankAccountNo },
        { icon: FileText, label: 'IFSC Code', value: profileData.ifscCode },
        { icon: Building, label: 'Branch Name', value: profileData.branchName },
        { icon: FileText, label: 'Passbook Photo', value: profileData.bankPassbookPhoto },
        { icon: ShieldCheck, label: 'ESIC No.', value: profileData.esicNo },
        { icon: ShieldCheck, label: 'Past PF ID No.', value: profileData.pastPfIdNo },
      ],
    },
    documents: {
      title: 'Documents',
      rows: [
        { icon: FileText, label: 'Aadhar Card No.', value: profileData.aadharNo },
        { icon: FileText, label: 'Aadhar Frontside Photo', value: profileData.aadharFrontPhoto },
        { icon: FileText, label: 'PAN Card', value: profileData.panCardPhoto },
        { icon: FileText, label: 'Highest Qualification', value: profileData.highestQualification },
        { icon: FileText, label: 'Qualification Photo', value: profileData.qualificationPhoto },
        { icon: FileText, label: 'Salary Slip', value: profileData.salarySlip },
        { icon: FileText, label: 'Resume/CV Upload', value: profileData.resumeCvUpload },
      ],
    },
    emergency: {
      title: 'Emergency Contact',
      rows: [
        { icon: User, label: "Father's Name", value: profileData.fatherName },
        { icon: Phone, label: 'Family Mobile No.', value: profileData.familyMobileNo, editable: 'familyMobileNo', type: 'tel' },
        { icon: HeartPulse, label: 'Relationship', value: profileData.relationWithFamily },
        { icon: MapPin, label: 'Current Address', value: profileData.currentAddress, editable: 'currentAddress', textarea: true },
      ],
    },
    password: {
      title: 'Change Password',
      rows: [
        { icon: LockKeyhole, label: 'Password Update', value: 'Please contact HR/Admin to change your password.' },
      ],
    },
  };

  return (
    <div className="page-content min-h-screen bg-[#f4f7fb] px-4 pb-24 pt-5 text-slate-950 sm:p-6">
      <div className="mx-auto max-w-md space-y-5 lg:max-w-7xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Employee</p>
            <h1 className="text-2xl font-black text-slate-950">My Profile</h1>
          </div>
        </div>

        <div className="space-y-5 lg:grid lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start lg:gap-6 lg:space-y-0">
        <section className="overflow-hidden rounded-[30px] bg-white shadow-[0_24px_54px_rgba(15,23,42,0.10)] ring-1 ring-slate-200/70 lg:sticky lg:top-24">
          <div className="relative h-36 bg-slate-950">
            <span className="pointer-events-none absolute -right-14 -top-16 h-40 w-40 rounded-full bg-indigo-500/25 blur-2xl" />
            <span className="pointer-events-none absolute -bottom-20 left-10 h-44 w-44 rounded-full bg-cyan-400/15 blur-2xl" />
            <div className="absolute left-1/2 top-16 h-28 w-28 -translate-x-1/2 overflow-hidden rounded-full border-[6px] border-white bg-slate-100 shadow-[0_20px_45px_rgba(15,23,42,0.24)]">
              {profilePhoto ? (
                <img
                  src={profilePhoto}
                  alt="Profile"
                  className="w-full h-full object-cover"
                  data-fallback-index="0"
                  onError={(e) => {
                    const nextIndex = Number(e.currentTarget.dataset.fallbackIndex || 0) + 1;
                    const nextSource = profileImageSources[nextIndex];

                    if (nextSource) {
                      e.currentTarget.dataset.fallbackIndex = String(nextIndex);
                      e.currentTarget.src = nextSource;
                      return;
                    }

                    e.currentTarget.style.display = "none";
                    e.currentTarget.nextElementSibling.style.display = "flex";
                  }}
                />
              ) : null}
              <div
                className={`w-full h-full flex items-center justify-center ${profileImageSources.length ? "hidden" : "flex"
                  }`}
              >
                <User size={48} className="text-indigo-400" />
              </div>
            </div>
          </div>
          <div className="px-5 pb-5 pt-14 text-center">
            <h2 className="text-xl font-black text-slate-950">
              {profileData.candidateName}
            </h2>
            <p className="mt-1 text-sm font-bold text-slate-500">{profileData.designation || 'Employee'}</p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
                <p className="text-[9px] font-black uppercase text-slate-400">ID</p>
                <p className="mt-1 truncate text-xs font-black text-slate-800">{profileData.joiningNo || '-'}</p>
              </div>
              <div className="rounded-2xl bg-indigo-50 p-3 ring-1 ring-indigo-100">
                <p className="text-[9px] font-black uppercase text-indigo-400">Dept</p>
                <p className="mt-1 truncate text-xs font-black text-indigo-800">{profileData.companyName || '-'}</p>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-3 ring-1 ring-emerald-100">
                <p className="text-[9px] font-black uppercase text-emerald-500">Status</p>
                <p className="mt-1 text-xs font-black text-emerald-700">Active</p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[26px] bg-white p-2 shadow-[0_18px_42px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70 lg:p-3">
          {profileLinks.map((item) => {
            const LinkIcon = item.icon;
            const isActive = openProfileSections.includes(item.id);
            const sectionRows = sectionDetails[item.id]?.rows || [];
            return (
              <div
                key={item.label}
                className={`rounded-[24px] transition ${isActive ? 'bg-indigo-50/80' : ''}`}
              >
                <button
                  type="button"
                  onClick={() =>
                    setOpenProfileSections((currentSections) =>
                      currentSections.includes(item.id)
                        ? currentSections.filter((sectionId) => sectionId !== item.id)
                        : [...currentSections, item.id]
                    )
                  }
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition active:bg-slate-50"
                >
                  <span className={`grid h-10 w-10 place-items-center rounded-2xl ring-1 ${isActive ? 'bg-white text-indigo-700 ring-indigo-100' : 'bg-indigo-50 text-indigo-700 ring-indigo-100'}`}>
                    <LinkIcon size={18} />
                  </span>
                  <span className={`flex-1 text-sm font-black ${isActive ? 'text-indigo-700' : 'text-slate-800'}`}>{item.label}</span>
                  <ChevronRight size={18} className={`transition-transform ${isActive ? 'rotate-90 text-indigo-500' : 'text-slate-300'}`} />
                </button>

                {isActive ? (
                  <div className="mx-3 mb-3 rounded-[22px] bg-white p-3 shadow-sm ring-1 ring-indigo-100 lg:p-4">
                    <div className="divide-y divide-slate-100 lg:grid lg:grid-cols-2 lg:gap-3 lg:divide-y-0">
                      {sectionRows.map((row) => {
                        const InfoIcon = row.icon;
                        const hasLink = isLinkValue(row.value);
                        return (
                          <div key={row.label} className="flex items-center gap-3 py-3 lg:rounded-2xl lg:bg-slate-50/70 lg:px-3 lg:ring-1 lg:ring-slate-100">
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-slate-50 text-slate-700 ring-1 ring-slate-100">
                              <InfoIcon size={17} />
                            </span>
                            <div className="min-w-0 flex-1 text-left">
                              <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{row.label}</p>
                              {isEditing && row.editable ? (
                                row.textarea ? (
                                  <textarea
                                    name={row.editable}
                                    value={formData[row.editable] || ""}
                                    onChange={handleInputChange}
                                    rows={2}
                                    className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-slate-900 focus:bg-white"
                                  />
                                ) : (
                                  <input
                                    type={row.type || 'text'}
                                    name={row.editable}
                                    value={formData[row.editable] || ""}
                                    onChange={handleInputChange}
                                    className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-slate-900 focus:bg-white"
                                  />
                                )
                              ) : (
                                hasLink ? (
                                  <a
                                    href={row.value}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-1 inline-flex items-center rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-black text-indigo-700 ring-1 ring-indigo-100"
                                  >
                                    View Document
                                  </a>
                                ) : (
                                  <p className="mt-0.5 break-words text-sm font-bold text-slate-800">{row.value || '-'}</p>
                                )
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem('user');
              localStorage.removeItem('employeeId');
              window.location.href = '/login';
            }}
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left active:bg-rose-50"
          >
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-rose-100">
              <LogOut size={18} />
            </span>
            <span className="flex-1 text-sm font-black text-rose-600">Logout</span>
          </button>
        </section>
        </div>

      </div>
    </div>
  );
};

export default MyProfile;
