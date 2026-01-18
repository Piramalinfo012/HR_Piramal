import React, { useState, useEffect } from 'react';
import { X, Trash2, Plus, Users, Loader, Phone } from 'lucide-react';

const Vendors = () => {
  const [showModal, setShowModal] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [vendorTypes, setVendorTypes] = useState([]);
  
  const [formData, setFormData] = useState({
    vendorName: '',
    contactNo: '',
    vendorType: ''
  });

  const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxtIL7N05BBt2ihqlPtASeHCjhp4P7cnTvRRqz2u_7uXAfA67EO6zB6R2NpI_DUkcY/exec';

  useEffect(() => {
    fetchMasterData();
    fetchVendors();
  }, []);

  const fetchMasterData = async () => {
    try {
      const response = await fetch(`${SCRIPT_URL}?sheet=Master&action=fetch`);
      const result = await response.json();
      
      if (result.success && result.data) {
        const data = result.data;
        const headers = data[0];
        
        // Find Vendor Type column index
        const vendorTypeIndex = headers.findIndex(h => 
          h.toLowerCase().includes('vendor type') || h.toLowerCase() === 'vendor_type'
        );
        
        if (vendorTypeIndex !== -1) {
          // Extract unique vendor types (skip header row and filter empty values)
          const types = [...new Set(
            data.slice(1)
              .map(row => row[vendorTypeIndex])
              .filter(val => val && val.trim())
          )];
          setVendorTypes(types);
        }
      }
    } catch (error) {
      console.error('Error fetching master data:', error);
      alert('Failed to load vendor types');
    }
  };

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${SCRIPT_URL}?sheet=Vendor&action=fetch`);
      const result = await response.json();
      
      if (result.success && result.data) {
        // Skip header row and format data
        const formattedVendors = result.data.slice(1).map((row, index) => ({
          rowIndex: index + 2, // +2 because sheet is 1-indexed and we skip header
          timeStamp: row[0] || '',
          vendorId: row[1] || '',
          vendorName: row[2] || '',
          contactNo: row[3] || '',
          vendorType: row[4] || ''
        }));
        
        setVendors(formattedVendors);
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
      alert('Failed to load vendors');
    } finally {
      setLoading(false);
    }
  };

  const generateVendorId = () => {
    const maxId = vendors.reduce((max, vendor) => {
      const match = vendor.vendorId.match(/VI-(\d+)/);
      if (match) {
        const num = parseInt(match[1]);
        return num > max ? num : max;
      }
      return max;
    }, 0);
    
    return `VI-${String(maxId + 1).padStart(3, '0')}`;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const formatPhoneNumber = (value) => {
    // Remove all non-digit characters
    const cleaned = value.replace(/\D/g, '');
    // Limit to 10 digits
    return cleaned.slice(0, 10);
  };

  const handlePhoneChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    setFormData(prev => ({
      ...prev,
      contactNo: formatted
    }));
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.vendorName || !formData.contactNo || !formData.vendorType) {
      alert('Please fill all fields');
      return;
    }

    if (formData.contactNo.length !== 10) {
      alert('Please enter a valid 10-digit phone number');
      return;
    }

    setSubmitting(true);
    
    try {
      // Generate timestamp in MM/DD/YYYY HH:MM:SS format
      const now = new Date();
      const timestamp = `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      
      const vendorId = generateVendorId();
      
      // Prepare row data - [Timestamp, Vendor ID, Vendor Name, Contact No, Vendor Type]
      const rowData = [
        timestamp,
        vendorId,
        formData.vendorName,
        formData.contactNo,
        formData.vendorType
      ];

      // Submit to Google Sheets
      const submitFormData = new FormData();
      submitFormData.append('action', 'insert');
      submitFormData.append('sheetName', 'Vendor');
      submitFormData.append('rowData', JSON.stringify(rowData));

      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        body: submitFormData
      });

      const result = await response.json();
      
      if (result.success) {
        alert('Vendor added successfully!');
        setShowModal(false);
        setFormData({
          vendorName: '',
          contactNo: '',
          vendorType: ''
        });
        // Refresh vendors list
        fetchVendors();
      } else {
        alert('Failed to add vendor: ' + result.error);
      }
    } catch (error) {
      console.error('Error submitting:', error);
      alert('Error: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (rowIndex, vendorId) => {
    if (!confirm(`Are you sure you want to delete vendor ${vendorId}?`)) {
      return;
    }

    try {
      const deleteFormData = new FormData();
      deleteFormData.append('action', 'delete');
      deleteFormData.append('sheetName', 'Vendor');
      deleteFormData.append('rowIndex', rowIndex);

      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        body: deleteFormData
      });

      const result = await response.json();
      
      if (result.success) {
        alert('Vendor deleted successfully!');
        fetchVendors();
      } else {
        alert('Failed to delete vendor: ' + result.error);
      }
    } catch (error) {
      console.error('Error deleting vendor:', error);
      alert('Error deleting vendor');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Vendor Management</h1>
            <p className="text-gray-600 mt-1">Manage and track all your vendors</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 shadow-lg transition-colors"
          >
            <Plus size={20} />
            Add Vendor
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader className="animate-spin text-blue-600" size={40} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="max-h-[600px] overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Time Stamp</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Vendor ID</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Vendor Name</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Contact No</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Vendor Type</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendors.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                          <Users className="mx-auto mb-2 text-gray-400" size={48} />
                          <p>No vendors found. Click "Add Vendor" to get started.</p>
                        </td>
                      </tr>
                    ) : (
                      vendors.map((vendor) => (
                        <tr key={vendor.rowIndex} className="border-b hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm text-gray-700">{vendor.timeStamp}</td>
                          <td className="px-6 py-4 text-sm font-medium text-blue-600">{vendor.vendorId}</td>
                          <td className="px-6 py-4 text-sm text-gray-700">{vendor.vendorName}</td>
                          <td className="px-6 py-4 text-sm text-gray-700">
                            <div className="flex items-center gap-2">
                              <Phone size={16} className="text-gray-400" />
                              {vendor.contactNo}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                              {vendor.vendorType}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => handleDelete(vendor.rowIndex, vendor.vendorId)}
                              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded flex items-center gap-2 transition-colors"
                            >
                              <Trash2 size={16} />
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-800">Add New Vendor</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vendor Name *
                </label>
                <input
                  type="text"
                  name="vendorName"
                  value={formData.vendorName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter vendor name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact No *
                </label>
                <div className="relative">
                  <Phone size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="tel"
                    name="contactNo"
                    value={formData.contactNo}
                    onChange={handlePhoneChange}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter 10-digit phone number"
                    maxLength="10"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {formData.contactNo.length}/10 digits
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vendor Type *
                </label>
                <select
                  name="vendorType"
                  value={formData.vendorType}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select vendor type</option>
                  {vendorTypes.map((type, index) => (
                    <option key={index} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:bg-blue-400 flex items-center justify-center gap-2"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader className="animate-spin" size={16} />
                      Submitting...
                    </>
                  ) : (
                    'Submit'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Vendors;