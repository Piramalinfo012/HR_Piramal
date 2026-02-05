import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import toast from 'react-hot-toast';

const Leaving = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [leavingData, setLeavingData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Action Modal State
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedActionItem, setSelectedActionItem] = useState(null);
  const [actionFormData, setActionFormData] = useState({
    resignationLetterReceived: false,
    resignationStatus: '',
    approval: false,
    approvalStatus: '',
    handoverOfAssets: false,
    assetChecklist: {
      idCard: false,
      visitingCard: false,
      laptop: false,
      mobile: false,
      sim: false,
      benefitEnrollment: false,
      dataSecurity: false,
      whatsappGroup: false,
      documentsData: false
    },
    finalExitInterview: false,
    finalExitStatus: ''
  });

  const fetchLeavingData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch data from FMS sheet
      const response = await fetch(
        `${import.meta.env.VITE_LEAVING_SHEET_URL}?sheet=FMS&action=fetch`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch data from FMS sheet');
      }

      const rawData = result.data || result;

      if (!Array.isArray(rawData)) {
        throw new Error('Expected array data not received');
      }

      const processedData = rawData.slice(7).map((row, index) => {

        return {
          originalRow: row, // Store full row for preserving data
          id: index, // unique key for React
          employeeId: row[5] || '',
          lastWorkingDay: row[7] || '',
          reason: row[8] || '',
          salary: row[9] || '',
          candidateName: row[10] || '',
          designation: row[11] || '',
          mobileNumber: row[12] || ''
        };
      }).filter(item => {
        // Basic filter for valid rows
        if (!item.employeeId && !item.candidateName) return false;

        // Filter out "Archived" rows based on Column AS (Index 44)
        // If "Yes", hide from this page (Leaving Page)
        const row = item.originalRow;
        const isArchived = row[44] && row[44].toString().trim().toLowerCase() === 'yes';

        return !isArchived;
      });

      setLeavingData(processedData);

    } catch (error) {
      console.error('Error fetching leaving data:', error);
      setError(error.message);
      toast.error(`Failed to load leaving data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeavingData();
  }, []);

  const filteredData = leavingData.filter(item => {
    const searchLower = searchTerm.toLowerCase();
    return (
      item.candidateName?.toLowerCase().includes(searchLower) ||
      item.employeeId?.toString().toLowerCase().includes(searchLower) ||
      item.designation?.toLowerCase().includes(searchLower)
    );
  });

  const formatDisplayDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('en-GB'); // dd/mm/yyyy
    }
    return dateString;
  };

  const handleActionClick = (item) => {
    setSelectedActionItem(item);

    // Pre-fill Logic from originalRow
    // Indices (0-based from row array):
    // AC=28, AD=29 (Resignation)
    // AG=32, AH=33 (Approval)
    // AK=36 (Handover - Date)
    // AM=38 (Assets List)
    // AP=41, AQ=42 (Final Exit)

    const row = item.originalRow || [];

    // Parse Asset Checkbox List
    const assetString = row[38] || ''; // AM
    const currentAssets = {
      idCard: false,
      visitingCard: false,
      laptop: false,
      mobile: false,
      sim: false,
      benefitEnrollment: false,
      dataSecurity: false,
      whatsappGroup: false,
      documentsData: false
    };

    // Mapping Labels back to Keys
    const assetLabelsToKeys = {
      'ID CARD': 'idCard',
      'VISITING CARD': 'visitingCard',
      'LAPTOP': 'laptop',
      'MOBILE': 'mobile',
      'SIM': 'sim',
      'Remove Benefit Enrollment': 'benefitEnrollment',
      'Data security document sign': 'dataSecurity',
      'Remove from whatapp group': 'whatsappGroup',
      'Documents and data handover': 'documentsData'
    };

    if (assetString) {
      assetString.split(',').forEach(label => {
        const trimmedLabel = label.trim();
        const key = assetLabelsToKeys[trimmedLabel];
        if (key) {
          currentAssets[key] = true;
        }
      });
    }

    setActionFormData({
      resignationLetterReceived: !!row[28] || !!row[29],
      resignationStatus: row[29] || '',

      approval: !!row[32] || !!row[33],
      approvalStatus: row[33] || '',

      handoverOfAssets: !!row[36] || !!assetString,

      assetChecklist: currentAssets,

      finalExitInterview: !!row[41] || !!row[42],
      finalExitStatus: row[42] || ''
    });
    setShowActionModal(true);
  };

  const handleActionCheckboxChange = (name) => {
    setActionFormData(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  const handleStatusChange = (e, field) => {
    const { value } = e.target;
    setActionFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAssetCheckboxChange = (assetKey) => {
    setActionFormData(prev => ({
      ...prev,
      assetChecklist: {
        ...prev.assetChecklist,
        [assetKey]: !prev.assetChecklist[assetKey]
      }
    }));
  };

  const handleActionSubmit = async (e) => {
    e.preventDefault();
    const toastId = toast.loading('Updating action details...');

    try {
      // 1. Calculate Row Index (Row 1 is index 1 in Sheets, data starts at index 7 of slice => Row 8)
      // item.id is index from slice(7), so 0 means Row 8.
      const rowIndex = selectedActionItem.id + 8;

      // Date Format: MM/DD/YYYY (e.g., 02/05/2026)
      const today = new Date();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const yyyy = today.getFullYear();
      const submissionDate = `${mm}/${dd}/${yyyy}`;

      // Map Asset Keys to Labels
      const assetLabels = {
        idCard: 'ID CARD',
        visitingCard: 'VISITING CARD',
        laptop: 'LAPTOP',
        mobile: 'MOBILE',
        sim: 'SIM',
        benefitEnrollment: 'Remove Benefit Enrollment',
        dataSecurity: 'Data security document sign',
        whatsappGroup: 'Remove from whatapp group',
        documentsData: 'Documents and data handover'
      };

      const selectedAssetsList = Object.entries(actionFormData.assetChecklist)
        .filter(([key, val]) => val)
        .map(([key]) => assetLabels[key]);

      const selectedAssetsString = selectedAssetsList.join(',');

      // Check if ALL assets are checked
      // Total assets = 9
      const allAssetsChecked = selectedAssetsList.length === 9;

      // Conditional Date Logic
      // 1. Resignation Letter Received: Insert Date ONLY if Status == 'Done'
      const resignationDate = (actionFormData.resignationLetterReceived && actionFormData.resignationStatus === 'Done')
        ? submissionDate
        : '';

      // 2. Final Exit Interview: Insert Date ONLY if Status == 'Done'
      const finalExitDate = (actionFormData.finalExitInterview && actionFormData.finalExitStatus === 'Done')
        ? submissionDate
        : '';

      // 3. Handover of Assets: Insert Date ONLY if ALL assets checked
      const handoverDate = (actionFormData.handoverOfAssets && allAssetsChecked)
        ? submissionDate
        : '';

      // 4. Approval: Insert Date ONLY if ALL assets checked AND Status == 'Done'
      const approvalDate = (actionFormData.approval && allAssetsChecked && actionFormData.approvalStatus === 'Done')
        ? submissionDate
        : '';

      // Prepare distinct updates for 'updateCell' to avoid overwriting formulas in other columns
      // We rely on 'updateCell' to surgically update only these columns.
      // Columns (1-based):
      // AC=29, AD=30
      // AG=33, AH=34
      // AK=37
      // AM=39
      // AP=42, AQ=43

      const updates = [
        // AC (29) - Resignation Letter Received
        { columnIndex: 29, value: resignationDate },
        // AD (30) - Resignation Status
        { columnIndex: 30, value: actionFormData.resignationStatus },

        // AG (33) - Approval
        { columnIndex: 33, value: approvalDate },
        // AH (34) - Approval Status
        { columnIndex: 34, value: actionFormData.approvalStatus },

        // AK (37) - Handover Of Assets
        { columnIndex: 37, value: handoverDate },

        // AM (39) - Asset Checkboxes
        { columnIndex: 39, value: selectedAssetsString },

        // AP (42) - Final Exit Interview
        { columnIndex: 42, value: finalExitDate },
        // AQ (43) - Final Exit Status
        { columnIndex: 43, value: actionFormData.finalExitStatus }
      ];

      // Filter out updates where value is undefined (optional, but good practice, though we control values above)
      // Construct Promise array
      const updatePromises = updates.map(update => {
        // We submit even empty strings to 'clear' the cell if unticked/empty
        return fetch(import.meta.env.VITE_LEAVING_SHEET_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            action: 'updateCell',
            sheetName: 'FMS',
            rowIndex: rowIndex,
            columnIndex: update.columnIndex,
            value: update.value
          })
        }).then(res => res.json());
      });

      // Execute all updates
      const results = await Promise.all(updatePromises);

      // Check for failures
      const errors = results.filter(r => !r.success);
      if (errors.length > 0) {
        console.error('Some updates failed:', errors);
        throw new Error(`${errors.length} column(s) failed to update.`);
      }

      toast.success('Action checklist updated successfully!', { id: toastId });
      setShowActionModal(false);
      fetchLeavingData();

    } catch (error) {
      console.error('Error submitting action:', error);
      toast.error(`Update failed: ${error.message}`, { id: toastId });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Leaving (FMS)</h1>
        <button
          onClick={fetchLeavingData}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center"
        >
          Refresh
        </button>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-lg shadow flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4">
        <div className="flex flex-1 max-w-md">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Search by name, ID, or designation..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-500"
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Designation</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mobile No</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Working Day</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salary</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center">
                      <div className="flex justify-center flex-col items-center">
                        <div className="w-6 h-6 border-4 border-indigo-500 border-dashed rounded-full animate-spin mb-2"></div>
                        <span className="text-gray-600 text-sm">Loading data...</span>
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
                ) : filteredData.length > 0 ? (
                  filteredData.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => handleActionClick(item)}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                        >
                          Action
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.employeeId}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{item.candidateName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.designation}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.mobileNumber}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDisplayDate(item.lastWorkingDay)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.salary}</td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={item.reason}>{item.reason}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center">
                      <p className="text-gray-500">No records found.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>


      {/* Action Modal */}
      {
        showActionModal && selectedActionItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-md max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center p-6 border-b border-gray-200 flex-shrink-0">
                <h3 className="text-lg font-medium text-gray-700">Action Checklist</h3>
                <button
                  onClick={() => setShowActionModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="overflow-y-auto p-6">
                <form onSubmit={handleActionSubmit} className="space-y-4">
                  {/* Employee Info Read-only */}
                  <div className="bg-gray-50 p-3 rounded-md mb-4 border border-gray-200">
                    <p className="text-sm text-gray-600"><span className="font-semibold">ID:</span> {selectedActionItem.employeeId}</p>
                    <p className="text-sm text-gray-600"><span className="font-semibold">Name:</span> {selectedActionItem.candidateName}</p>
                  </div>

                  <div className="space-y-4">
                    {/* Resignation Letter Received */}
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="resignationLetterReceived"
                          checked={actionFormData.resignationLetterReceived}
                          onChange={() => handleActionCheckboxChange('resignationLetterReceived')}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <label htmlFor="resignationLetterReceived" className=" ml-2 text-sm text-gray-700 font-medium">
                          Resignation Letter Received
                        </label>
                      </div>
                      {actionFormData.resignationLetterReceived && (
                        <select
                          value={actionFormData.resignationStatus}
                          onChange={(e) => handleStatusChange(e, 'resignationStatus')}
                          className="ml-6 block w-full pl-3 pr-8 py-1 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-gray-50"
                        >
                          <option value="">Select Status</option>
                          <option value="Done">Done</option>
                          <option value="Hold">Hold</option>
                          <option value="Pending">Pending</option>
                        </select>
                      )}
                    </div>

                    {/* Approval */}
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="approval"
                          checked={actionFormData.approval}
                          onChange={() => handleActionCheckboxChange('approval')}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <label htmlFor="approval" className="ml-2 text-sm text-gray-700 font-medium">
                          Approval
                        </label>
                      </div>
                      {actionFormData.approval && (
                        <select
                          value={actionFormData.approvalStatus}
                          onChange={(e) => handleStatusChange(e, 'approvalStatus')}
                          className="ml-6 block w-full pl-3 pr-8 py-1 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-gray-50"
                        >
                          <option value="">Select Status</option>
                          <option value="Done">Done</option>
                          <option value="Hold">Hold</option>
                          <option value="Pending">Pending</option>
                        </select>
                      )}
                    </div>

                    {/* Handover Of Assets */}
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="handoverOfAssets"
                          checked={actionFormData.handoverOfAssets}
                          onChange={() => handleActionCheckboxChange('handoverOfAssets')}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <label htmlFor="handoverOfAssets" className="ml-2 text-sm text-gray-700 font-medium">
                          Handover Of Assets
                        </label>
                      </div>
                      {actionFormData.handoverOfAssets && (
                        <div className="ml-6 space-y-2 pl-2 border-l-2 border-gray-200">
                          {[
                            { key: 'idCard', label: 'ID CARD' },
                            { key: 'visitingCard', label: 'VISITING CARD' },
                            { key: 'laptop', label: 'LAPTOP' },
                            { key: 'mobile', label: 'MOBILE' },
                            { key: 'sim', label: 'SIM' },
                            { key: 'benefitEnrollment', label: 'Remove Benefit Enrollment' },
                            { key: 'dataSecurity', label: 'Data security document sign' },
                            { key: 'whatsappGroup', label: 'Remove from whatapp group' },
                            { key: 'documentsData', label: 'Documents and data handover' }
                          ].map((asset) => (
                            <div key={asset.key} className="flex items-center">
                              <input
                                type="checkbox"
                                id={asset.key}
                                checked={actionFormData.assetChecklist[asset.key]}
                                onChange={() => handleAssetCheckboxChange(asset.key)}
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                              />
                              <label htmlFor={asset.key} className="ml-2 text-sm text-gray-600">
                                {asset.label}
                              </label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Final Exit Interview */}
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="finalExitInterview"
                          checked={actionFormData.finalExitInterview}
                          onChange={() => handleActionCheckboxChange('finalExitInterview')}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <label htmlFor="finalExitInterview" className="ml-2 text-sm text-gray-700 font-medium">
                          Final Exit Interview
                        </label>
                      </div>
                      {actionFormData.finalExitInterview && (
                        <select
                          value={actionFormData.finalExitStatus}
                          onChange={(e) => handleStatusChange(e, 'finalExitStatus')}
                          className="ml-6 block w-full pl-3 pr-8 py-1 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-gray-50"
                        >
                          <option value="">Select Status</option>
                          <option value="Done">Done</option>
                          <option value="Hold">Hold</option>
                          <option value="Pending">Pending</option>
                        </select>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 pt-4 border-t border-gray-100 mt-6">
                    <button
                      type="button"
                      onClick={() => setShowActionModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm"
                    >
                      Submit
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )
      }
    </div>
  );
};


export default Leaving;