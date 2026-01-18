import React, { useEffect, useState } from "react";
import { HistoryIcon, Plus, X } from "lucide-react";
import useDataStore from "../store/dataStore";
import toast from "react-hot-toast";

const Indent = () => {
  const { addIndent } = useDataStore();
  const [showModal, setShowModal] = useState(false);
  const [posts, setPosts] = useState([{
    post: "",
    gender: "",
    department: "",
    prefer: "",
    numberOfPost: "",
    experience: "",
    salary: "",
    officeTimingFrom: "",
    officeTimingTo: "",
    typeOfWeek: "",
    residence: "",
    indenterName: "",
    qualifications: "",
  }]);
  const [formData, setFormData] = useState({
    competitionDate: "",
  });
  const [indentData, setIndentData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Social site options
  const socialSiteOptions = [
    "Instagram",
    "Facebook",
    "LinkedIn",
    "Referral",
    "Job Consultancy",
  ];

  useEffect(() => {
    const loadData = async () => {
      setTableLoading(true);
      const result = await fetchIndentDataFromRow7();
      if (result.success) {
        console.log("Data from row 7:", result.data);
      } else {
        console.error("Error:", result.error);
      }
      setTableLoading(false);
    };
    loadData();
  }, []);

  const generateIndentNumber = async () => {
    try {
      const result = await fetchLastIndentNumber();

      if (result.success) {
        const nextNumber = result.lastIndentNumber + 1;
        return `REC-${String(nextNumber).padStart(2, "0")}`;
      }
      // Fallback if fetch fails
      return "REC-01";
    } catch (error) {
      console.error("Error generating indent number:", error);
      return "REC-01";
    }
  };

  const getCurrentTimestamp = () => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");

    // Using YYYY-MM-DD format to prevent backend month overflow (the 2027 issue)
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  const fetchIndentDataFromRow7 = async () => {
    try {
      const response = await fetch(
        "https://script.google.com/macros/s/AKfycbxtIL7N05BBt2ihqlPtASeHCjhp4P7cnTvRRqz2u_7uXAfA67EO6zB6R2NpI_DUkcY/exec?sheet=FMS&action=fetch"
      );

      const result = await response.json();

      if (result && result.success && result.data && result.data.length >= 7) {
        // Headers are on Row 1 (index 0), Data starts on Row 2 (index 1)
        const headers = result.data[0].map((h) => (h ? h.trim() : ""));
        const dataFromRow2 = result.data.slice(1);

        // MAPPING matched to FMS Sheet (Step 0 Screenshot)
        const processedData = dataFromRow2
          .filter((row) => row && row[1]) // Column B (Indent No) or A (Timestamp) as filter
          .map((row) => ({
            status: "OPEN",                              // Default to OPEN (Not in FMS Col A)
            indentNumber: (row[4] || "").toString(),     // B (1)
            // timestamp: (row[0] || "").toString(),        // A (0)
            indenterName: (row[5] || "").toString(),     // C (2)
            post: (row[6] || "").toString(),             // D (3)
            salary: (row[7] || "").toString(),           // E (4)
            officeTiming: (row[8] || "").toString(),     // F (5)
            typeOfWeek: (row[9] || "").toString(),       // G (6)
            residence: (row[10] || "").toString(),        // H (7)
            gender: (row[11] || "").toString(),           // I (8)
            department: (row[12] || "").toString(),       // J (9)
            prefer: (row[13] || "").toString(),          // K (10)
            noOfPost: (row[14] || "").toString(),        // L (11)
            completionDate: (row[15] || "").toString(),  // M (12)
            qualifications: (row[16] || "").toString(),  // N (13)
          }))
          .reverse();

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

  const fetchLastIndentNumber = async () => {
    try {
      const response = await fetch(
        "https://script.google.com/macros/s/AKfycbxtIL7N05BBt2ihqlPtASeHCjhp4P7cnTvRRqz2u_7uXAfA67EO6zB6R2NpI_DUkcY/exec?sheet=FMS&action=fetch"
      );

      const result = await response.json();

      if (result.success && result.data && result.data.length > 1) {
        // Find the first row with actual headers (skip empty rows)
        let headerRowIndex = 0;
        while (
          headerRowIndex < result.data.length &&
          result.data[headerRowIndex].every(
            (cell) => !cell || cell.trim() === ""
          )
        ) {
          headerRowIndex++;
        }

        if (headerRowIndex >= result.data.length) {
          throw new Error("No header row found in sheet");
        }

        const headers = result.data[headerRowIndex].map((h) =>
          h ? h.trim().toLowerCase() : ""
        );
        console.log("Headers found:", headers);

        // Try to find the indent number column by common names
        const possibleNames = [
          "indent number",
          "indentnumber",
          "indent_no",
          "indentno",
          "indent",
        ];
        let indentNumberIndex = -1;

        for (const name of possibleNames) {
          indentNumberIndex = headers.indexOf(name);
          if (indentNumberIndex !== -1) break;
        }

        if (indentNumberIndex === -1) {
          // If still not found, try to find by position (Column C is index 2)
          indentNumberIndex = 2;
          console.warn("Using fallback column index 2 for indent number");
        }

        // Find the last non-empty row with data
        let lastDataRowIndex = result.data.length - 1;
        while (
          lastDataRowIndex > headerRowIndex &&
          (!result.data[lastDataRowIndex][indentNumberIndex] ||
            result.data[lastDataRowIndex][indentNumberIndex].trim() === "")
        ) {
          lastDataRowIndex--;
        }

        if (lastDataRowIndex <= headerRowIndex) {
          return {
            success: true,
            lastIndentNumber: 0,
            message: "No data rows found",
          };
        }

        const lastIndentNumber =
          result.data[lastDataRowIndex][indentNumberIndex];

        // Extract numeric part from "REC-01" format
        let numericValue = 0;
        if (typeof lastIndentNumber === "string") {
          const match = lastIndentNumber.match(/\d+/);
          numericValue = match ? parseInt(match[0]) : 0;
        } else {
          numericValue = parseInt(lastIndentNumber) || 0;
        }

        return {
          success: true,
          lastIndentNumber: numericValue,
          fullLastIndent: lastIndentNumber,
        };
      } else {
        return {
          success: true,
          lastIndentNumber: 0,
          message: "Sheet is empty or has no data rows",
        };
      }
    } catch (error) {
      console.error("Error in fetchLastIndentNumber:", error);
      return {
        success: false,
        error: error.message,
        lastIndentNumber: 0,
      };
    }
  };

  const handlePostInputChange = (index, e) => {
    const { name, value } = e.target;
    const updatedPosts = [...posts];
    updatedPosts[index] = { ...updatedPosts[index], [name]: value };
    setPosts(updatedPosts);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const addPostField = () => {
    setPosts([...posts, {
      post: "",
      gender: "",
      department: "",
      prefer: "",
      numberOfPost: "",
      experience: "",
      salary: "",
      officeTimingFrom: "",
      officeTimingTo: "",
      typeOfWeek: "",
      residence: "",
      indenterName: "",
      qualifications: "",
    }]);
  };

  const removePostField = (index) => {
    if (posts.length > 1) {
      setPosts(posts.filter((_, i) => i !== index));
    }
  };

  const handleSocialSiteTypeChange = (e) => {
    const { value, checked } = e.target;

    setFormData((prev) => {
      if (checked) {
        return {
          ...prev,
          socialSiteTypes: [...prev.socialSiteTypes, value],
        };
      } else {
        return {
          ...prev,
          socialSiteTypes: prev.socialSiteTypes.filter(
            (type) => type !== value
          ),
        };
      }
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result;

        const response = await fetch(
          "https://script.google.com/macros/s/AKfycbxtIL7N05BBt2ihqlPtASeHCjhp4P7cnTvRRqz2u_7uXAfA67EO6zB6R2NpI_DUkcY/exec",
          {
            method: "POST",
            body: new URLSearchParams({
              action: "uploadFile",
              base64Data: base64Data,
              fileName: file.name,
              mimeType: file.type,
              folderId: "1L4Bz6-oltUO7LEz8Z4yFCzBn5Pv5Msh5", // Replace with your folder ID
            }),
          }
        );

        const result = await response.json();

        if (result.success) {
          setFormData((prev) => ({
            ...prev,
            uploadedFileUrl: result.fileUrl,
          }));
          toast.success("File uploaded successfully!");
        } else {
          toast.error("File upload failed");
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("File upload error");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.competitionDate) {
      toast.error("Please fill the competition date");
      return;
    }

    // Validate all posts
    for (let i = 0; i < posts.length; i++) {
      const p = posts[i];
      if (!p.post || !p.gender || !p.numberOfPost) {
        toast.error(`Please fill all required fields for Post #${i + 1}`);
        return;
      }
      if (p.prefer === "Experience" && !p.experience) {
        toast.error(`Please enter experience details for Post #${i + 1}`);
        return;
      }
    }

    try {
      setSubmitting(true);

      const now = new Date();
      const timestamp = getCurrentTimestamp();
      const formattedDate = formatDateForSheet(formData.competitionDate);

      // --- FINAL SYNCHRONIZED MAPPING (A to P) ---
      const rowsData = posts.map((p, idx) => {
        const row = [
          timestamp,                  // A (0): Timestamp
          "",                         // B (1): Indent No (Backend will fill this)
          p.indenterName || "",       // C (2): Person Name (Indenter)
          p.post || "",               // D (3): Post
          p.salary || "",             // E (4): Salary
          p.officeTimingFrom ? `${p.officeTimingFrom} to ${p.officeTimingTo}` : "", // F (5): Timing
          p.typeOfWeek || "",         // G (6): Types of Weekly Off
          p.residence || "",          // H (7): Residence
          p.gender || "",             // I (8): Gender
          p.department || "",         // J (9): Department
          p.prefer || "",             // K (10): Prefer
          p.numberOfPost || "",       // L (11): Number of Post
          formattedDate,              // M (12): Completion Date
          p.qualifications || "",      // N (13): Required Qualifications
        ];

        console.log(`Post #${idx + 1} finalized row:`, row);
        return row;
      });


      console.log("rowsData", rowsData)

      console.log("--- FINAL SUBMISSION DEBUG (v2.1) ---");
      console.table(rowsData);

      const response = await fetch(
        "https://script.google.com/macros/s/AKfycbxtIL7N05BBt2ihqlPtASeHCjhp4P7cnTvRRqz2u_7uXAfA67EO6zB6R2NpI_DUkcY/exec",
        {
          method: "POST",
          body: new URLSearchParams({
            sheetName: "Position Opning Form",
            action: "bulkInsert",
            rowsData: JSON.stringify(rowsData),
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        toast.success(`Successfully created ${posts.length} indents!`);
        setPosts([{
          post: "",
          gender: "",
          department: "",
          prefer: "",
          numberOfPost: "",
          experience: "",
          salary: "",
          officeTimingFrom: "",
          officeTimingTo: "",
          typeOfWeek: "",
          residence: "",
          indenterName: "",
          qualifications: "",
        }]);
        setFormData({ competitionDate: "" });
        setShowModal(false);
        setTableLoading(true);
        await fetchIndentDataFromRow7();
        setTableLoading(false);
      } else {
        toast.error("Failed to insert: " + (result.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Insert error:", error);
      toast.error("Something went wrong!");
    } finally {
      setSubmitting(false);
    }
  };

  // Helper function to format date for Google Sheets
  const formatDateForSheet = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear();
    return `${year}-${month}-${day}`;
  };

  const handleCancel = () => {
    setPosts([{
      indenterName: "",
      post: "",
      gender: "",
      department: "",
      prefer: "",
      numberOfPost: "",
      experience: "",
      salary: "",
      officeTimingFrom: "",
      officeTimingTo: "",
      typeOfWeek: "",
      residence: "",
      qualifications: "",
    }]);
    setFormData({
      competitionDate: "",
    });
    setShowModal(false);
  };

  return (
    <div className="space-y-6 page-content p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          Indent
          <span className="text-xs font-normal bg-green-100 text-green-700 px-2 py-0.5 rounded border border-green-200">v2.1 (A-P Sync)</span>
        </h1>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-all duration-200"
          disabled={loading}
        >
          {loading ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
              Loading...
            </>
          ) : (
            <>
              <Plus size={16} className="mr-2" />
              Create Indent
            </>
          )}
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 sticky top-0 bg-white z-20">
              <h3 className="text-lg font-medium text-gray-800">
                Create Multiple Indents
              </h3>
              <button
                onClick={handleCancel}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 mb-4">
                <label className="block text-sm font-semibold text-indigo-900 mb-1">
                  Common Completion Date *
                </label>
                <input
                  type="date"
                  name="competitionDate"
                  value={formData.competitionDate}
                  onChange={handleInputChange}
                  className="w-full border border-indigo-200 rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              {posts.map((postField, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg space-y-4 relative bg-gray-50/50">
                  <div className="flex justify-between items-center bg-gray-100 p-2 -mx-4 -mt-4 rounded-t-lg border-b border-gray-200">
                    <span className="text-xs font-bold text-gray-600 uppercase tracking-wider ml-2">Post #{index + 1}</span>
                    {posts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePostField(index)}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="Remove Post"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4 mt-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Post (पद)*
                      </label>
                      <input
                        type="text"
                        name="post"
                        value={postField.post}
                        onChange={(e) => handlePostInputChange(index, e)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        placeholder="Enter post title"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Gender *
                        </label>
                        <select
                          name="gender"
                          value={postField.gender}
                          onChange={(e) => handlePostInputChange(index, e)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-500 text-sm"
                          required
                        >
                          <option value="">Select</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Any">Any</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          No. of Post *
                        </label>
                        <input
                          type="number"
                          name="numberOfPost"
                          value={postField.numberOfPost}
                          onChange={(e) => handlePostInputChange(index, e)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-500 text-sm"
                          min="1"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Department
                        </label>
                        <select
                          name="department"
                          value={postField.department}
                          onChange={(e) => handlePostInputChange(index, e)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-500 text-sm"
                        >
                          <option value="">Select</option>
                          <option value="Production">Production</option>
                          <option value="Management">Management</option>
                          <option value="Sales">Sales</option>
                          <option value="HR">HR</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Prefer
                        </label>
                        <select
                          name="prefer"
                          value={postField.prefer}
                          onChange={(e) => handlePostInputChange(index, e)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-500 text-sm"
                        >
                          <option value="">Any</option>
                          <option value="Experience">Experience</option>
                          <option value="Fresher">Fresher</option>
                        </select>
                      </div>
                    </div>

                    {postField.prefer === "Experience" && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Experience Details *
                        </label>
                        <input
                          type="text"
                          name="experience"
                          value={postField.experience}
                          onChange={(e) => handlePostInputChange(index, e)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-500 text-sm"
                          placeholder="e.g. 2+ years in Manufacturing"
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Salary
                        </label>
                        <input
                          type="text"
                          name="salary"
                          value={postField.salary}
                          onChange={(e) => handlePostInputChange(index, e)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                          placeholder="Salary"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Qualifications
                        </label>
                        <input
                          type="text"
                          name="qualifications"
                          value={postField.qualifications}
                          onChange={(e) => handlePostInputChange(index, e)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                          placeholder="e.g. Graduate"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Weekly Off
                        </label>
                        <select
                          name="typeOfWeek"
                          value={postField.typeOfWeek}
                          onChange={(e) => handlePostInputChange(index, e)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        >
                          <option value="">Select</option>
                          <option value="Week off">Week off</option>
                          <option value="No week off">No week off</option>
                          <option value="Both">Both</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Residence
                        </label>
                        <select
                          name="residence"
                          value={postField.residence}
                          onChange={(e) => handlePostInputChange(index, e)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        >
                          <option value="">Select</option>
                          <option value="Stay">Stay</option>
                          <option value="Up-down">Up-down</option>
                          <option value="Both">Both</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Timing (From)
                        </label>
                        <input
                          type="time"
                          name="officeTimingFrom"
                          value={postField.officeTimingFrom}
                          onChange={(e) => handlePostInputChange(index, e)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Timing (To)
                        </label>
                        <input
                          type="time"
                          name="officeTimingTo"
                          value={postField.officeTimingTo}
                          onChange={(e) => handlePostInputChange(index, e)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Person Name (Indenter)
                      </label>
                      <input
                        type="text"
                        name="indenterName"
                        value={postField.indenterName}
                        onChange={(e) => handlePostInputChange(index, e)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        placeholder="Enter name"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addPostField}
                className="w-full py-2 border-2 border-dashed border-indigo-300 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-all flex items-center justify-center font-medium"
              >
                <Plus size={16} className="mr-2" />
                Add Another Post entry
              </button>

              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-all duration-200"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-all duration-200 flex items-center justify-center"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                      Processing...
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

      {/* Info Card */}
      <div className="bg-white rounded-xl shadow-lg border p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">
          Indent Management
        </h2>
      </div>

      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          {/* Add max-height and overflow-y to the table container */}
          <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200 shadow">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>

                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Indent Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Person Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Post
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Salary
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Weekly Off
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Residence
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gender
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
                    Qualifications
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {tableLoading ? (
                  <tr>
                    <td colSpan="13" className="px-6 py-12 text-center">
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
                    <td colSpan="13" className="px-6 py-12 text-center">
                      <p className="text-gray-500">No indent data found.</p>
                    </td>
                  </tr>
                ) : (
                  indentData.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${item.status?.toLowerCase() === 'open' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600">
                        {item.indentNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.indenterName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.post}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.salary}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.typeOfWeek}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.residence}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.gender}
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
                        {item.completionDate}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.qualifications}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div >
  );
};

export default Indent;
