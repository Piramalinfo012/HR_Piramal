import React, { useState, useEffect } from "react";
import {
  Search,
  Users,
  Clock,
  CheckCircle,
  Eye,
  X,
  Download,
  Upload,
  Share,
} from "lucide-react";
import toast from "react-hot-toast";

const Joining = () => {
  const [activeTab, setActiveTab] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showJoiningModal, setShowJoiningModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [joiningData, setJoiningData] = useState([]);
  const [error, setError] = useState(null);
  const [followUpData, setFollowUpData] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareFormData, setShareFormData] = useState({
    recipientName: "",
    recipientEmail: "",
    subject: "Candidate Joining Details",
    message: "Please find the candidate joining details attached below.",
  });
  const [formData, setFormData] = useState({
    candidateSays: "",
    status: "",
    nextDate: "",
  });
  const [joiningFormData, setJoiningFormData] = useState({
    joiningId: "",
    nameAsPerAadhar: "",
    fatherName: "",
    dateOfJoining: "",
    joiningPlace: "",
    designation: "",
    salary: "",
    aadharFrontPhoto: null,
    aadharBackPhoto: null,
    panCard: null,
    candidatePhoto: null,
    currentAddress: "",
    addressAsPerAadhar: "",
    dobAsPerAadhar: "",
    gender: "",
    mobileNo: "",
    familyMobileNo: "",
    relationshipWithFamily: "",
    pastPfId: "",
    currentBankAc: "",
    ifscCode: "",
    branchName: "",
    bankPassbookPhoto: null,
    personalEmail: "",
    esicNo: "",
    highestQualification: "",
    pfEligible: "",
    esicEligible: "",
    joiningCompanyName: "",
    emailToBeIssue: "",
    issueMobile: "",
    issueLaptop: "",
    aadharCardNo: "",
    modeOfAttendance: "",
    qualificationPhoto: null,
    paymentMode: "",
    salarySlip: null,
    resumeCopy: null,
    department: "",
    equipment: "",
    panCard: null,
    educationDocuments: null,
  });

  function handleEmailShare(params) {
    try {
      console.log(
        "Handling email share with params:",
        JSON.stringify({
          recipientEmail: params.recipientEmail,
          subject: params.subject,
          message: params.message
            ? params.message.substring(0, 100) + "..."
            : "empty",
          hasDocuments: !!params.documents,
        })
      );

      // Validate required parameters
      if (!params.recipientEmail || !params.subject || !params.message) {
        throw new Error(
          "Missing required email parameters: recipientEmail, subject, or message"
        );
      }

      // Parse documents if provided
      var documents = [];
      if (params.documents) {
        try {
          documents = JSON.parse(params.documents);
        } catch (e) {
          console.warn("Failed to parse documents:", e);
        }
      }

      // Prepare email content with HTML formatting
      var emailSubject = params.subject;
      var htmlBody = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <p>${params.message.replace(/\n/g, "<br>")}</p>
    `;

      // Add document details to email body if available
      if (documents.length > 0) {
        htmlBody += `
        <h3 style="color: #333; border-bottom: 2px solid #4f46e5; padding-bottom: 5px;">
          Candidate Details:
        </h3>
        <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
      `;

        for (var i = 0; i < documents.length; i++) {
          var doc = documents[i];
          htmlBody += `
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background-color: #f9f9f9;">Candidate Name:</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${
              doc.name || "N/A"
            }</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background-color: #f9f9f9;">Enquiry No:</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${
              doc.serialNo || "N/A"
            }</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background-color: #f9f9f9;">Position:</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${
              doc.documentType || "N/A"
            }</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background-color: #f9f9f9;">Department:</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${
              doc.category || "N/A"
            }</td>
          </tr>
        `;

          if (doc.imageUrl) {
            htmlBody += `
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background-color: #f9f9f9;">Photo:</td>
              <td style="padding: 8px; border: 1px solid #ddd;">
                <a href="${doc.imageUrl}" style="color: #4f46e5; text-decoration: none;">View Photo</a>
              </td>
            </tr>
          `;
          }

          htmlBody += `<tr><td colspan="2" style="padding: 10px; background-color: #f0f0f0;"></td></tr>`;
        }

        htmlBody += `</table>`;
      }

      // Add fixed Google.com link
      htmlBody += `
      <h3 style="color: #333; border-bottom: 2px solid #4f46e5; padding-bottom: 5px;">
        Useful Links:
      </h3>
      <ul style="list-style: none; padding: 0;">
        <li style="margin: 5px 0;">
          <a href="https://www.google.com" style="color: #4f46e5; text-decoration: none;">🔗 Google.com</a>
        </li>
      </ul>
      
      <p style="margin-top: 20px; padding-top: 10px; border-top: 1px solid #ddd; color: #666;">
        This email was sent via Joining Management System.
      </p>
      </div>
    `;

      // Plain text version for email clients that don't support HTML
      var plainBody = params.message + "\n\n";
      if (documents.length > 0) {
        plainBody += "Candidate Details:\n";
        plainBody += "==================\n\n";
        for (var i = 0; i < documents.length; i++) {
          var doc = documents[i];
          plainBody += `Candidate Name: ${doc.name || "N/A"}\n`;
          plainBody += `Enquiry No: ${doc.serialNo || "N/A"}\n`;
          plainBody += `Position: ${doc.documentType || "N/A"}\n`;
          plainBody += `Department: ${doc.category || "N/A"}\n`;
          if (doc.imageUrl) {
            plainBody += `Photo: ${doc.imageUrl}\n`;
          }
          plainBody += "\n";
        }
      }
      plainBody += "\nUseful Links:\n";
      plainBody += "=============\n";
      plainBody += "Google.com: https://www.google.com\n\n";
      plainBody += "This email was sent via Joining Management System.";

      // Send the email
      MailApp.sendEmail({
        to: params.recipientEmail,
        subject: emailSubject,
        body: plainBody,
        htmlBody: htmlBody,
      });

      console.log("Email sent successfully to:", params.recipientEmail);

      return ContentService.createTextOutput(
        JSON.stringify({
          success: true,
          message: "Email sent successfully to " + params.recipientEmail,
        })
      ).setMimeType(ContentService.MimeType.JSON);
    } catch (error) {
      console.error("Error sending email:", error);
      return ContentService.createTextOutput(
        JSON.stringify({
          success: false,
          error: "Failed to send email: " + error.toString(),
        })
      ).setMimeType(ContentService.MimeType.JSON);
    }
  }

  const handleShareClick = (item) => {
    setSelectedItem(item);
    // Create the share link with enquiry number
    const shareLink = `https://hr-joining-form.vercel.app/?enquiry=${
      item.candidateEnquiryNo || ""
    }`;

    setShareFormData({
      recipientName: item.candidateName || "", // Auto-fill from Column E
      recipientEmail: item.candidateEmail || "", // Auto-fill from Column H
      subject: "Candidate Joining Details - " + item.candidateName,
      message: `Dear Recipient,\n\nPlease find the joining details for candidate ${item.candidateName} who is applying for the position of ${item.applyingForPost}.\n\nCandidate Details:\n- Name: ${item.candidateName}\n- Position: ${item.applyingForPost}\n- Department: ${item.department}\n- Phone: ${item.candidatePhone}\n- Email: ${item.candidateEmail}\n- Candidate Enquiry Number: ${item.candidateEnquiryNo}\n\nJoining Form Link: ${shareLink}\n\nBest regards,\nHR Team`,
    });

    // Log the share link to console
    console.log("Share Link:", shareLink);

    setShowShareModal(true);
  };

  const handleShareSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const documents = [
        {
          name: selectedItem.candidateName,
          serialNo: selectedItem.candidateEnquiryNo,
          documentType: selectedItem.applyingForPost,
          category: selectedItem.department,
          imageUrl: selectedItem.candidatePhoto || "",
        },
      ];

      const URL =
        "https://script.google.com/macros/s/AKfycbx7_8IiGXsVplVge8Fi8PIsxL1Ub_QqQI77x1flWxkl2KlyunmnVheG7yA6safW20yZ/exec";

      const params = new URLSearchParams();
      params.append("action", "shareViaEmail");
      params.append("recipientEmail", shareFormData.recipientEmail);
      params.append("subject", shareFormData.subject);
      params.append("message", shareFormData.message);
      params.append("documents", JSON.stringify(documents));

      const response = await fetch(URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to send email");
      }

      toast.success("Details shared successfully!");
      setShowShareModal(false);
    } catch (error) {
      console.error("Error sharing details:", error);
      toast.error(`Failed to share details: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleShareInputChange = (e) => {
    const { name, value } = e.target;
    setShareFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const fetchJoiningData = async () => {
    setLoading(true);
    setTableLoading(true);
    setError(null);

    try {
      const [enquiryResponse, followUpResponse] = await Promise.all([
        fetch(
          "https://script.google.com/macros/s/AKfycbx7_8IiGXsVplVge8Fi8PIsxL1Ub_QqQI77x1flWxkl2KlyunmnVheG7yA6safW20yZ/exec?sheet=ENQUIRY&action=fetch"
        ),
        fetch(
          "https://script.google.com/macros/s/AKfycbx7_8IiGXsVplVge8Fi8PIsxL1Ub_QqQI77x1flWxkl2KlyunmnVheG7yA6safW20yZ/exec?sheet=Follow - Up&action=fetch"
        ),
      ]);

      if (!enquiryResponse.ok || !followUpResponse.ok) {
        throw new Error(
          `HTTP error! status: ${enquiryResponse.status} or ${followUpResponse.status}`
        );
      }

      const [enquiryResult, followUpResult] = await Promise.all([
        enquiryResponse.json(),
        followUpResponse.json(),
      ]);

      if (
        !enquiryResult.success ||
        !enquiryResult.data ||
        enquiryResult.data.length < 7
      ) {
        throw new Error(
          enquiryResult.error || "Not enough rows in enquiry sheet data"
        );
      }

      // Process enquiry data
      const enquiryHeaders = enquiryResult.data[5].map((h) => h.trim());
      const enquiryDataFromRow7 = enquiryResult.data.slice(6);

      const getIndex = (headerName) =>
        enquiryHeaders.findIndex((h) => h === headerName);

      const departmentIndex = getIndex("Department");
      const abIndex = 27; // Column AB index (0-based index 27)

      const processedEnquiryData = enquiryDataFromRow7
        .map((row) => ({
          id: row[getIndex("Timestamp")],
          indentNo: row[getIndex("Indent Number")],
          candidateEnquiryNo: row[getIndex("Candidate Enquiry Number")],
          applyingForPost: row[getIndex("Applying For the Post")],
          department: row[departmentIndex] || "",
          candidateName: row[getIndex("Candidate Name")],
          candidateDOB: row[getIndex("DOB")],
          candidatePhone: row[getIndex("Candidate Phone Number")],
          candidateEmail: row[getIndex("Candidate Email")],
          previousCompany: row[getIndex("Previous Company Name")],
          jobExperience: row[getIndex("Job Experience")] || "",
          lastSalary: row[getIndex("Last Salary Drawn")] || "",
          previousPosition: row[getIndex("Previous Position")] || "",
          reasonForLeaving:
            row[getIndex("Reason Of Leaving Previous Company")] || "",
          maritalStatus: row[getIndex("Marital Status")] || "",
          lastEmployerMobile:
            row[getIndex("Last Employer Mobile Number")] || "",
          candidatePhoto: row[getIndex("Candidate Photo")] || "",
          candidateResume: row[19] || "",
          referenceBy: row[getIndex("Reference By")] || "",
          presentAddress: row[getIndex("Present Address")] || "",
          aadharNo: row[getIndex("Aadhar Number")] || "",
          designation: row[getIndex("Applying For the Post")] || "",
          actualDate: row[26] || "", // Column AA (index 26) - Actual date
          joiningDate: row[abIndex] || "", // Column AB (index 27)
        }))
        // Filter out items with null/empty values in Column AA
        .filter((item) => item.actualDate && item.actualDate.trim() !== "")
        // Filter out items with non-null values in Column AB
        .filter((item) => !item.joiningDate || item.joiningDate.trim() === "");

      // Process follow-up data for filtering
      if (followUpResult.success && followUpResult.data) {
        const rawFollowUpData = followUpResult.data || followUpResult;
        const followUpRows = Array.isArray(rawFollowUpData[0])
          ? rawFollowUpData.slice(1)
          : rawFollowUpData;

        const processedFollowUpData = followUpRows.map((row) => ({
          enquiryNo: row[1] || "", // Column B (index 1) - Enquiry No
          status: row[2] || "", // Column C (index 2) - Status
        }));

        setFollowUpData(processedFollowUpData);

        // Filter data to show only items with "Joining" status in follow-up sheet
        const joiningItems = processedEnquiryData.filter((item) => {
          const hasJoiningStatus = processedFollowUpData.some(
            (followUp) =>
              followUp.enquiryNo === item.candidateEnquiryNo &&
              followUp.status === "Joining"
          );
          return hasJoiningStatus;
        });

        setJoiningData(joiningItems);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setError(error.message);
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
      setTableLoading(false);
    }
  };

  useEffect(() => {
    fetchJoiningData();
  }, []);

  const handleViewClick = (item) => {
    setSelectedItem(item);
    setShowModal(true);
  };

  const handleJoiningClick = (item) => {
    setSelectedItem(item);
    setJoiningFormData({
      joiningId: "", // Initialize with empty value
      nameAsPerAadhar: item.candidateName || "",
      fatherName: "",
      dateOfJoining: "",
      joiningPlace: "",
      designation: item.designation || "",
      salary: "",
      aadharFrontPhoto: null,
      aadharBackPhoto: null,
      panCard: null,
      candidatePhoto: null,
      currentAddress: item.presentAddress || "",
      addressAsPerAadhar: "",
      dobAsPerAadhar: formatDOB(item.candidateDOB) || "",
      gender: "",
      mobileNo: item.candidatePhone || "",
      familyMobileNo: "",
      relationshipWithFamily: "",
      pastPfId: "",
      currentBankAc: "",
      ifscCode: "",
      branchName: "",
      bankPassbookPhoto: null,
      personalEmail: item.candidateEmail || "",
      esicNo: "",
      highestQualification: "",
      pfEligible: "",
      esicEligible: "",
      joiningCompanyName: "",
      emailToBeIssue: "",
      issueMobile: "",
      issueLaptop: "",
      aadharCardNo: item.aadharNo || "",
      modeOfAttendance: "",
      qualificationPhoto: null,
      paymentMode: "",
      salarySlip: null,
      resumeCopy: null,
      department: item.department || "",
      equipment: "",
      panCard: null,
      educationDocuments: null,
    });
    setShowJoiningModal(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";

    let date;

    if (dateString instanceof Date) {
      date = dateString;
    } else if (typeof dateString === "string") {
      if (dateString.includes("/")) {
        const parts = dateString.split("/");
        if (parts.length === 3) {
          date = new Date(parts[2], parts[1] - 1, parts[0]);
        }
      } else {
        date = new Date(dateString);
      }
    }

    if (!date || isNaN(date.getTime())) {
      return dateString || "";
    }

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  };

  const formatDOB = (dateString) => {
    if (!dateString) return "";

    // If it's already in dd/mm/yyyy format, return as is
    if (typeof dateString === "string" && dateString.includes("/")) {
      const parts = dateString.split("/");
      if (parts.length === 3) {
        // Check if it's already in dd/mm/yyyy format
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]);

        if (day > 0 && day <= 31 && month > 0 && month <= 12) {
          // If day is greater than 12, it's likely dd/mm/yyyy format
          if (day > 12) {
            return dateString; // Return as is (dd/mm/yyyy)
          }
          // If month is greater than 12, it's likely mm/dd/yyyy format
          else if (month > 12) {
            return `${parts[1]}/${parts[0]}/${parts[2]}`; // Swap day and month
          }
        }
      }
    }

    // For other cases, try to parse as Date object
    let date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString; // Return original if can't parse
    }

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  };

  // Add a function to format date for storage (mm/dd/yyyy)
  const formatDateForStorage = (dateString) => {
    if (!dateString) return "";

    // If it's in dd/mm/yyyy format, convert to mm/dd/yyyy
    if (typeof dateString === "string" && dateString.includes("/")) {
      const parts = dateString.split("/");
      if (parts.length === 3) {
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]);

        // If it's already in dd/mm/yyyy format, swap day and month
        if (day > 0 && day <= 31 && month > 0 && month <= 12 && day > 12) {
          return `${parts[1]}/${parts[0]}/${parts[2]}`;
        }
      }
    }

    // For other cases, try to parse as Date object
    let date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString;
    }

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();

    return `${month}/${day}/${year}`;
  };

  const handleJoiningInputChange = (e) => {
    const { name, value } = e.target;
    setJoiningFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (e, fieldName) => {
    const file = e.target.files[0];
    if (file) {
      setJoiningFormData((prev) => ({
        ...prev,
        [fieldName]: file,
      }));
    }
  };

  const postToJoiningSheet = async (rowData) => {
    const URL =
      "https://script.google.com/macros/s/AKfycbx7_8IiGXsVplVge8Fi8PIsxL1Ub_QqQI77x1flWxkl2KlyunmnVheG7yA6safW20yZ/exec";

    try {
      console.log("Attempting to post:", {
        sheetName: "JOINING",
        rowData: rowData,
      });

      const params = new URLSearchParams();
      params.append("sheetName", "JOINING");
      params.append("action", "insert");
      params.append("rowData", JSON.stringify(rowData));

      const response = await fetch(URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log("Server response:", data);

      if (!data.success) {
        throw new Error(data.error || "Server returned unsuccessful response");
      }

      return data;
    } catch (error) {
      console.error("Full error details:", {
        error: error.message,
        stack: error.stack,
        rowData: rowData,
        timestamp: new Date().toISOString(),
      });
      throw new Error(`Failed to update sheet: ${error.message}`);
    }
  };

  const uploadFileToDrive = async (
    file,
    folderId = "1L4Bz6-oltUO7LEz8Z4yFCzBn5Pv5Msh5"
  ) => {
    try {
      const reader = new FileReader();
      const base64Data = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const params = new URLSearchParams();
      params.append("action", "uploadFile");
      params.append("base64Data", base64Data);
      params.append("fileName", file.name);
      params.append("mimeType", file.type);
      params.append("folderId", folderId);

      const response = await fetch(
        "https://script.google.com/macros/s/AKfycbx7_8IiGXsVplVge8Fi8PIsxL1Ub_QqQI77x1flWxkl2KlyunmnVheG7yA6safW20yZ/exec",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: params,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "File upload failed");
      }

      return data.fileUrl;
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error(`Failed to upload file: ${error.message}`);
      throw error;
    }
  };

  const updateEnquirySheet = async (enquiryNo, timestamp) => {
    const URL =
      "https://script.google.com/macros/s/AKfycbx7_8IiGXsVplVge8Fi8PIsxL1Ub_QqQI77x1flWxkl2KlyunmnVheG7yA6safW20yZ/exec";

    try {
      const params = new URLSearchParams();
      params.append("sheetName", "ENQUIRY");
      params.append("action", "updateEnquiryColumn");
      params.append("enquiryNo", enquiryNo);
      params.append("timestamp", timestamp);

      const response = await fetch(URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error("Error updating enquiry sheet:", error);
      throw new Error(`Failed to update enquiry sheet: ${error.message}`);
    }
  };

  const handleJoiningSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Upload only the required files
      const uploadPromises = {};
      const fileFields = [
        "aadharFrontPhoto",
        "bankPassbookPhoto",
        "panCard",
        "educationDocuments",
      ];

      for (const field of fileFields) {
        if (joiningFormData[field]) {
          uploadPromises[field] = uploadFileToDrive(joiningFormData[field]);
        } else {
          uploadPromises[field] = Promise.resolve("");
        }
      }

      // Wait for all uploads to complete
      const uploadedUrls = await Promise.all(
        Object.values(uploadPromises).map((promise) =>
          promise.catch((error) => {
            console.error("Upload failed:", error);
            return ""; // Return empty string if upload fails
          })
        )
      );

      // Map uploaded URLs to their respective fields
      const fileUrls = {};
      Object.keys(uploadPromises).forEach((field, index) => {
        fileUrls[field] = uploadedUrls[index];
      });

      const now = new Date();
      const formattedTimestamp = `${
        now.getMonth() + 1
      }/${now.getDate()}/${now.getFullYear()} ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;

      const formatDateForStorage = (dateString) => {
        if (!dateString) return "";

        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;

        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const year = date.getFullYear();

        return `${month}/${day}/${year}`;
      };

      // Format DOB for storage (mm/dd/yyyy)
      const formatDOBForStorage = (dateString) => {
        if (!dateString) return "";

        // If it's in dd/mm/yyyy format, convert to mm/dd/yyyy
        if (typeof dateString === "string" && dateString.includes("/")) {
          const parts = dateString.split("/");
          if (parts.length === 3) {
            return `${parts[1]}/${parts[0]}/${parts[2]}`;
          }
        }

        // For other cases, try to parse as Date object
        let date = new Date(dateString);
        if (isNaN(date.getTime())) {
          return dateString;
        }

        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const year = date.getFullYear();

        return `${month}/${day}/${year}`;
      };

      // Create an array with all column values in order
      const rowData = [];

      // Assign values directly to array indices according to specified columns
      rowData[0] = formattedTimestamp; // Column A: Timestamp
      rowData[1] = joiningFormData.joiningId; // Column B: Joining ID
      rowData[2] = selectedItem.candidateName; // Column C: Name As Per Aadhar
      rowData[3] = joiningFormData.fatherName; // Column D: Father Name
      rowData[4] = formatDateForStorage(joiningFormData.dateOfJoining); // Column E: Date Of Joining (mm/dd/yyyy)
      rowData[5] = selectedItem.designation || selectedItem.applyingForPost; // Column F: Designation
      rowData[6] = fileUrls.aadharFrontPhoto; // Column G: Aadhar card
      rowData[7] = selectedItem.candidatePhoto; // Column H: Candidate Photo
      rowData[8] = selectedItem.presentAddress; // Column I: Current Address
      rowData[9] = formatDOBForStorage(selectedItem.candidateDOB); // Column J: Date Of Birth (mm/dd/yyyy)
      rowData[10] = joiningFormData.gender; // Column K: Gender
      rowData[11] = selectedItem.candidatePhone; // Column L: Mobile No.
      rowData[12] = joiningFormData.familyMobileNo; // Column M: Family Mobile Number
      rowData[13] = joiningFormData.relationshipWithFamily; // Column N: Relationship With Family
      rowData[14] = joiningFormData.currentBankAc; // Column O: Current Account No
      rowData[15] = joiningFormData.ifscCode; // Column P: IFSC Code
      rowData[16] = joiningFormData.branchName; // Column Q: Branch Name
      rowData[17] = fileUrls.bankPassbookPhoto; // Column R: Photo Of Front Bank Passbook
      rowData[18] = selectedItem.candidateEmail; // Column S: Candidate Email
      rowData[19] = joiningFormData.highestQualification; // Column T: Highest Qualification
      rowData[20] = selectedItem.department || ""; // Column U: Department
      rowData[21] = joiningFormData.equipment; // Column V: Equipment
      rowData[22] = selectedItem.aadharNo; // Column W: Aadhar Number
      rowData[23] = selectedItem.candidateResume; // Column X: Candidate Resume
      rowData[24] = "";
      rowData[25] = "";
      rowData[26] = selectedItem.actualDate || formattedTimestamp; // Column AA: Actual Date

      rowData[38] = fileUrls.panCard || ""; // Column AM: PAN Card
      rowData[39] = fileUrls.educationDocuments || ""; // Column AN: Education Documents
      rowData[40] = selectedItem.candidateEnquiryNo; // Column AO: Record Created At

      await postToJoiningSheet(rowData);

      // Update ENQUIRY sheet Column AB with the timestamp
      await updateEnquirySheet(
        selectedItem.candidateEnquiryNo,
        formattedTimestamp
      );

      toast.success("Employee added successfully!");
      setShowJoiningModal(false);
      setSelectedItem(null);
      fetchJoiningData();
    } catch (error) {
      console.error("Error submitting joining form:", error);
      toast.error(`Failed to submit joining form: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredJoiningData = joiningData.filter((item) => {
    const matchesSearch =
      item.candidateName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.applyingForPost?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.candidatePhone?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Joining Management</h1>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-lg shadow flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4">
        <div className="flex flex-1 max-w-md">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Search by name, post or phone number..."
              className="w-full pl-10 pr-4 py-2 border border-gray-400 border-opacity-30 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-600"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search
              size={20}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 opacity-60"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="border-b border-gray-300 border-opacity-20">
          <nav className="flex -mb-px">
            <button
              className={`py-4 px-6 font-medium text-sm border-b-2 ${
                activeTab === "pending"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
              onClick={() => setActiveTab("pending")}
            >
              <Clock size={16} className="inline mr-2" />
              Pending Joinings ({filteredJoiningData.length})
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === "pending" && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Indent No.
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Candidate Enquiry No.
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Applying For Post
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Candidate Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Photo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Resume
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tableLoading ? (
                    <tr>
                      <td colSpan="10" className="px-6 py-12 text-center">
                        <div className="flex justify-center flex-col items-center">
                          <div className="w-6 h-6 border-4 border-indigo-500 border-dashed rounded-full animate-spin mb-2"></div>
                          <span className="text-gray-600 text-sm">
                            Loading pending joinings...
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan="10" className="px-6 py-12 text-center">
                        <p className="text-red-500">Error: ${error}</p>
                        <button
                          onClick={fetchJoiningData}
                          className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                        >
                          Retry
                        </button>
                      </td>
                    </tr>
                  ) : filteredJoiningData.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="px-6 py-12 text-center">
                        <p className="text-gray-500">
                          No pending joinings found.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredJoiningData.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleJoiningClick(item)}
                              className="px-3 py-1 text-white bg-green-600 rounded-md hover:bg-opacity-90 text-sm"
                            >
                              Joining
                            </button>
                            <button
                              onClick={() => handleShareClick(item)}
                              className="px-3 py-1 text-white bg-blue-600 rounded-md hover:bg-opacity-90 text-sm flex items-center"
                            >
                              <Share size={14} className="mr-1" />
                              Share
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.indentNo || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.candidateEnquiryNo || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.applyingForPost || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.department || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.candidateName || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.candidatePhone || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.candidateEmail || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.candidatePhoto ? (
                            <a
                              href={item.candidatePhoto}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-600 hover:text-indigo-800"
                            >
                              View
                            </a>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.candidateResume ? (
                            <a
                              href={item.candidateResume}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-600 hover:text-indigo-800"
                            >
                              View
                            </a>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                            Pending Joining
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Joining Modal */}
      {showJoiningModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-300">
              <h3 className="text-lg font-medium text-gray-900">
                Employee Joining Form
              </h3>
              <button
                onClick={() => setShowJoiningModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleJoiningSubmit} className="p-6 space-y-6">
              {/* Section 1: Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Joining ID (जॉइनिंग आईडी)
                  </label>
                  <input
                    type="text"
                    name="joiningId"
                    value={joiningFormData.joiningId}
                    onChange={handleJoiningInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name As Per Aadhar (नाम आधार के अनुसार)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={selectedItem.candidateName}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Father Name (पिता का नाम)
                  </label>
                  <input
                    type="text"
                    name="fatherName"
                    value={joiningFormData.fatherName}
                    onChange={handleJoiningInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date Of Birth As per Aadhar (जन्मतिथि आधार के अनुसार)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={formatDOB(selectedItem.candidateDOB)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gender (लिंग)
                  </label>
                  <select
                    name="gender"
                    value={joiningFormData.gender}
                    onChange={handleJoiningInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
                  >
                    <option value="">Select Gender (लिंग चुनें)</option>
                    <option value="Male">Male (पुरुष)</option>
                    <option value="Female">Female (महिला) </option>
                    <option value="Other">Other (अन्य)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department (विभाग)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={selectedItem.department || ""} // Use selectedItem.department instead of joiningFormData.department
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Equipment (उपकरण)
                  </label>
                  <input
                    type="text"
                    name="equipment"
                    value={joiningFormData.equipment}
                    onChange={handleJoiningInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
                  />
                </div>
              </div>

              {/* Section 2: Contact Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mobile No. (मोबाइल नंबर)
                  </label>
                  <input
                    type="tel"
                    disabled
                    value={selectedItem.candidatePhone}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Personal Email (ईमेल)
                  </label>
                  <input
                    type="email"
                    disabled
                    value={selectedItem.candidateEmail}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Family Mobile Number (परिवार का मोबाइल नंबर)
                  </label>
                  <input
                    name="familyMobileNo"
                    value={joiningFormData.familyMobileNo}
                    onChange={handleJoiningInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Relationship With Family (परिवार के साथ संबंध)
                  </label>
                  <input
                    name="relationshipWithFamily"
                    value={joiningFormData.relationshipWithFamily}
                    onChange={handleJoiningInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
                  />
                </div>
              </div>

              {/* Section 3: Address Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Address (वर्त्तमान पता)
                  </label>
                  <textarea
                    disabled
                    value={selectedItem.presentAddress}
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
                  />
                </div>
              </div>

              {/* Section 4: Employment Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date Of Joining (शामिल होने की तारीख)
                  </label>
                  <input
                    type="date"
                    name="dateOfJoining"
                    value={joiningFormData.dateOfJoining}
                    onChange={handleJoiningInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Designation (पद का नाम)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={selectedItem.designation}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Highest Qualification (उच्चतम योग्यता)
                  </label>
                  <input
                    name="highestQualification"
                    value={joiningFormData.highestQualification}
                    onChange={handleJoiningInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
                  />
                </div>
              </div>

              {/* Section 5: Bank & Financial Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Aadhar Card Number (आधार कार्ड नंबर)
                  </label>
                  <input
                    disabled
                    value={selectedItem.aadharNo}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Bank Account No (बैंक खाता संख्या)
                  </label>
                  <input
                    name="currentBankAc"
                    value={joiningFormData.currentBankAc}
                    onChange={handleJoiningInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    IFSC Code (आईएफएससी कोड)
                  </label>
                  <input
                    name="ifscCode"
                    value={joiningFormData.ifscCode}
                    onChange={handleJoiningInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Branch Name (शाखा का नाम)
                  </label>
                  <input
                    name="branchName"
                    value={joiningFormData.branchName}
                    onChange={handleJoiningInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
                  />
                </div>
              </div>

              {/* Section 6: Document Uploads */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Aadhar Card (आधार कार्ड)
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, "aadharFrontPhoto")}
                      className="hidden"
                      id="aadhar-front-upload"
                    />
                    <label
                      htmlFor="aadhar-front-upload"
                      className="flex items-center px-4 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 text-gray-700"
                    >
                      <Upload size={16} className="mr-2" />
                      Upload Photo (फोटो अपलोड करें)
                    </label>
                    {joiningFormData.aadharFrontPhoto && (
                      <span className="text-sm text-gray-700">
                        {joiningFormData.aadharFrontPhoto.name}
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Photo Of Front Bank Passbook (बैंक पासबुक की फ़ोटो)
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, "bankPassbookPhoto")}
                      className="hidden"
                      id="bank-passbook-upload"
                    />
                    <label
                      htmlFor="bank-passbook-upload"
                      className="flex items-center px-4 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 text-gray-700"
                    >
                      <Upload size={16} className="mr-2" />
                      Upload Photo
                    </label>
                    {joiningFormData.bankPassbookPhoto && (
                      <span className="text-sm text-gray-700">
                        {joiningFormData.bankPassbookPhoto.name}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    PAN Card (पैन कार्ड)
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => handleFileChange(e, "panCard")}
                      className="hidden"
                      id="pan-card-upload"
                    />
                    <label
                      htmlFor="pan-card-upload"
                      className="flex items-center px-4 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 text-gray-700"
                    >
                      <Upload size={16} className="mr-2" />
                      Upload PAN Card
                    </label>
                    {joiningFormData.panCard && (
                      <span className="text-sm text-gray-700">
                        {joiningFormData.panCard.name}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Education Documents (शैक्षिक दस्तावेज)
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) =>
                        handleFileChange(e, "educationDocuments")
                      }
                      className="hidden"
                      id="education-documents-upload"
                    />
                    <label
                      htmlFor="education-documents-upload"
                      className="flex items-center px-4 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 text-gray-700"
                    >
                      <Upload size={16} className="mr-2" />
                      Upload Documents
                    </label>
                    {joiningFormData.educationDocuments && (
                      <span className="text-sm text-gray-700">
                        {joiningFormData.educationDocuments.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowJoiningModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 text-white bg-indigo-700 rounded-md hover:bg-indigo-800 flex items-center justify-center min-h-[42px] ${
                    submitting ? "opacity-90 cursor-not-allowed" : ""
                  }`}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <svg
                        className="animate-spin h-4 w-4 text-white mr-2"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Submitting...
                    </>
                  ) : (
                    "Submit"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showShareModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
            <div className="flex justify-between items-center p-6 border-b border-gray-300">
              <h3 className="text-lg font-medium text-gray-900">
                Share Candidate Details
              </h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleShareSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recipient Name *
                </label>
                <input
                  type="text"
                  name="recipientName"
                  value={shareFormData.recipientName}
                  onChange={handleShareInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  name="recipientEmail"
                  value={shareFormData.recipientEmail}
                  onChange={handleShareInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject *
                </label>
                <input
                  type="text"
                  name="subject"
                  value={shareFormData.subject}
                  onChange={handleShareInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message *
                </label>
                <textarea
                  name="message"
                  value={shareFormData.message}
                  onChange={handleShareInputChange}
                  rows={5}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Attached Links
                </label>
                <div className="text-sm text-gray-600 space-y-1">
                  <div className="flex items-center">
                    <a
                      href="https://hr-joining-form.vercel.app/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-800"
                    >
                      Joining Form Link
                    </a>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowShareModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 text-white bg-indigo-700 rounded-md hover:bg-indigo-800 flex items-center justify-center min-h-[42px] ${
                    submitting ? "opacity-90 cursor-not-allowed" : ""
                  }`}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <svg
                        className="animate-spin h-4 w-4 text-white mr-2"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Sending...
                    </>
                  ) : (
                    "Send Email"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Joining;
