import React, { useState, useEffect } from 'react';
import { X, Trash2, Plus, Package, Loader, AlertCircle } from 'lucide-react';

const Inventory = () => {
  const [showModal, setShowModal] = useState(false);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Dropdown options from Master sheet
  const [inventoryCategories, setInventoryCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [conditions, setConditions] = useState([]);
  const [statuses, setStatuses] = useState([]);
  
  const [formData, setFormData] = useState({
    itemName: '',
    inventoryCategory: '',
    brand: '',
    availableQty: '',
    unit: '',
    condition: '',
    status: '',
    remarks: ''
  });

  const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxtIL7N05BBt2ihqlPtASeHCjhp4P7cnTvRRqz2u_7uXAfA67EO6zB6R2NpI_DUkcY/exec';

  useEffect(() => {
    fetchMasterData();
    fetchInventory();
  }, []);

  const fetchMasterData = async () => {
    try {
      const response = await fetch(`${SCRIPT_URL}?sheet=Master&action=fetch`);
      const result = await response.json();
      
      if (result.success && result.data) {
        const data = result.data;
        const headers = data[0];
        
        // Find column indices
        const inventoryCategoryIndex = headers.findIndex(h => 
          h.toLowerCase().includes('inventory category')
        );
        const unitIndex = headers.findIndex(h => 
          h.toLowerCase() === 'unit'
        );
        const conditionIndex = headers.findIndex(h => 
          h.toLowerCase() === 'condition'
        );
        const statusIndex = headers.findIndex(h => 
          h.toLowerCase() === 'status'
        );
        
        // Extract unique values (skip header row and filter empty values)
        if (inventoryCategoryIndex !== -1) {
          const categories = [...new Set(
            data.slice(1).map(row => row[inventoryCategoryIndex]).filter(val => val && val.trim())
          )];
          setInventoryCategories(categories);
        }
        
        if (unitIndex !== -1) {
          const unitsList = [...new Set(
            data.slice(1).map(row => row[unitIndex]).filter(val => val && val.trim())
          )];
          setUnits(unitsList);
        }
        
        if (conditionIndex !== -1) {
          const conditionsList = [...new Set(
            data.slice(1).map(row => row[conditionIndex]).filter(val => val && val.trim())
          )];
          setConditions(conditionsList);
        }
        
        if (statusIndex !== -1) {
          const statusesList = [...new Set(
            data.slice(1).map(row => row[statusIndex]).filter(val => val && val.trim())
          )];
          setStatuses(statusesList);
        }
      }
    } catch (error) {
      console.error('Error fetching master data:', error);
      alert('Failed to load dropdown options');
    }
  };

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${SCRIPT_URL}?sheet=Inventory&action=fetch`);
      const result = await response.json();
      
      if (result.success && result.data) {
        // Skip header row and format data
        const formattedItems = result.data.slice(1).map((row, index) => ({
          rowIndex: index + 2, // +2 because sheet is 1-indexed and we skip header
          timeStamp: row[0] || '',
          inventoryId: row[1] || '',
          itemName: row[2] || '',
          inventoryCategory: row[3] || '',
          brand: row[4] || '',
          availableQty: row[5] || '',
          unit: row[6] || '',
          condition: row[7] || '',
          status: row[8] || '',
          remarks: row[9] || ''
        }));
        
        setInventoryItems(formattedItems);
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
      alert('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const generateInventoryId = () => {
    const maxId = inventoryItems.reduce((max, item) => {
      const match = item.inventoryId.match(/INI-(\d+)/);
      if (match) {
        const num = parseInt(match[1]);
        return num > max ? num : max;
      }
      return max;
    }, 0);
    
    return `INI-${String(maxId + 1).padStart(3, '0')}`;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.itemName || !formData.inventoryCategory || !formData.brand || 
        !formData.availableQty || !formData.unit || !formData.condition || !formData.status) {
      alert('Please fill all required fields');
      return;
    }

    if (isNaN(formData.availableQty) || formData.availableQty < 0) {
      alert('Please enter a valid quantity');
      return;
    }

    setSubmitting(true);
    
    try {
      // Generate timestamp in MM/DD/YYYY HH:MM:SS format
      const now = new Date();
      const timestamp = `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      
      const inventoryId = generateInventoryId();
      
      // Prepare row data
      const rowData = [
        timestamp,
        inventoryId,
        formData.itemName,
        formData.inventoryCategory,
        formData.brand,
        formData.availableQty,
        formData.unit,
        formData.condition,
        formData.status,
        formData.remarks
      ];

      // Submit to Google Sheets
      const submitFormData = new FormData();
      submitFormData.append('action', 'insert');
      submitFormData.append('sheetName', 'Inventory');
      submitFormData.append('rowData', JSON.stringify(rowData));

      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        body: submitFormData
      });

      const result = await response.json();
      
      if (result.success) {
        alert('Inventory item added successfully!');
        setShowModal(false);
        setFormData({
          itemName: '',
          inventoryCategory: '',
          brand: '',
          availableQty: '',
          unit: '',
          condition: '',
          status: '',
          remarks: ''
        });
        fetchInventory();
      } else {
        alert('Failed to add inventory item: ' + result.error);
      }
    } catch (error) {
      console.error('Error submitting:', error);
      alert('Error: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (rowIndex, inventoryId) => {
    if (!confirm(`Are you sure you want to delete item ${inventoryId}?`)) {
      return;
    }

    try {
      const deleteFormData = new FormData();
      deleteFormData.append('action', 'delete');
      deleteFormData.append('sheetName', 'Inventory');
      deleteFormData.append('rowIndex', rowIndex);

      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        body: deleteFormData
      });

      const result = await response.json();
      
      if (result.success) {
        alert('Inventory item deleted successfully!');
        fetchInventory();
      } else {
        alert('Failed to delete item: ' + result.error);
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Error deleting item');
    }
  };

  const getStatusColor = (status) => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('1')) return 'bg-green-100 text-green-800';
    if (statusLower.includes('2')) return 'bg-blue-100 text-blue-800';
    if (statusLower.includes('3')) return 'bg-yellow-100 text-yellow-800';
    if (statusLower.includes('4')) return 'bg-orange-100 text-orange-800';
    if (statusLower.includes('5')) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getConditionColor = (condition) => {
    const conditionLower = condition.toLowerCase();
    if (conditionLower.includes('1')) return 'bg-green-100 text-green-800';
    if (conditionLower.includes('2')) return 'bg-blue-100 text-blue-800';
    if (conditionLower.includes('3')) return 'bg-yellow-100 text-yellow-800';
    if (conditionLower.includes('4')) return 'bg-orange-100 text-orange-800';
    if (conditionLower.includes('5')) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Inventory Management</h1>
            <p className="text-gray-600 mt-1">Manage and track all your inventory items</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 shadow-lg transition-colors"
          >
            <Plus size={20} />
            Add Item
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
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Inventory ID</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Item Name</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Category</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Brand</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Available Qty</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Unit</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Condition</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Remarks</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventoryItems.length === 0 ? (
                      <tr>
                        <td colSpan="11" className="px-6 py-12 text-center text-gray-500">
                          <Package className="mx-auto mb-2 text-gray-400" size={48} />
                          <p>No inventory items found. Click "Add Item" to get started.</p>
                        </td>
                      </tr>
                    ) : (
                      inventoryItems.map((item) => (
                        <tr key={item.rowIndex} className="border-b hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm text-gray-700">{item.timeStamp}</td>
                          <td className="px-6 py-4 text-sm font-medium text-blue-600">{item.inventoryId}</td>
                          <td className="px-6 py-4 text-sm text-gray-700 font-medium">{item.itemName}</td>
                          <td className="px-6 py-4 text-sm">
                            <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                              {item.inventoryCategory}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700">{item.brand}</td>
                          <td className="px-6 py-4 text-sm text-gray-700 font-semibold">{item.availableQty}</td>
                          <td className="px-6 py-4 text-sm text-gray-700">{item.unit}</td>
                          <td className="px-6 py-4 text-sm">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getConditionColor(item.condition)}`}>
                              {item.condition}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                            {item.remarks || '-'}
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => handleDelete(item.rowIndex, item.inventoryId)}
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
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
              <h2 className="text-2xl font-bold text-gray-800">Add New Inventory Item</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Item Name *
                  </label>
                  <input
                    type="text"
                    name="itemName"
                    value={formData.itemName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter item name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Inventory Category *
                  </label>
                  <select
                    name="inventoryCategory"
                    value={formData.inventoryCategory}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select category</option>
                    {inventoryCategories.map((category, index) => (
                      <option key={index} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Brand *
                  </label>
                  <input
                    type="text"
                    name="brand"
                    value={formData.brand}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter brand name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Available Quantity *
                  </label>
                  <input
                    type="number"
                    name="availableQty"
                    value={formData.availableQty}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter quantity"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Unit *
                  </label>
                  <select
                    name="unit"
                    value={formData.unit}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select unit</option>
                    {units.map((unit, index) => (
                      <option key={index} value={unit}>{unit}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Condition *
                  </label>
                  <select
                    name="condition"
                    value={formData.condition}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select condition</option>
                    {conditions.map((condition, index) => (
                      <option key={index} value={condition}>{condition}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status *
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select status</option>
                    {statuses.map((status, index) => (
                      <option key={index} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Remarks
                </label>
                <textarea
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleInputChange}
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter any additional remarks (optional)"
                />
              </div>

              <div className="bg-blue-50 p-4 rounded-lg flex items-start gap-2">
                <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
                <p className="text-sm text-blue-800">
                  All fields marked with * are required. Make sure to fill them before submitting.
                </p>
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

export default Inventory;