import React, { useState, useEffect } from 'react';
import { Upload, X, Trash2, Plus, FileText, Loader } from 'lucide-react';

const Documents = () => {
  const [showModal, setShowModal] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [documentCategories, setDocumentCategories] = useState([]);

  const [formData, setFormData] = useState({
    documentName: '',
    documentType: '',
    documentCategory: '',
    uploadedFile: null,
    uploadedBy: ''
  });

  const SCRIPT_URL = import.meta.env.VITE_GOOGLE_SHEET_URL;
  const FOLDER_ID = '1L4Bz6-oltUO7LEz8Z4yFCzBn5Pv5Msh5';

  useEffect(() => {
    fetchMasterData();
    fetchDocuments();
  }, []);

  const fetchMasterData = async () => {
    try {
      const response = await fetch(`${SCRIPT_URL}?sheet=Master&action=fetch`);
      const result = await response.json();

      if (result.success && result.data) {
        const data = result.data;
        const headers = data[0];

        const typeIndex = headers.findIndex(h => h.toLowerCase().includes('document type'));
        const categoryIndex = headers.findIndex(h => h.toLowerCase().includes('document category'));

        const types = [...new Set(data.slice(1).map(row => row[typeIndex]).filter(val => val && val.trim()))];
        const categories = [...new Set(data.slice(1).map(row => row[categoryIndex]).filter(val => val && val.trim()))];

        setDocumentTypes(types);
        setDocumentCategories(categories);
      }
    } catch (error) {
      console.error('Error fetching master data:', error);
      alert('Failed to load document types and categories');
    }
  };

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${SCRIPT_URL}?sheet=Documents&action=fetch`);
      const result = await response.json();

      if (result.success && result.data) {
        const formattedDocs = result.data.slice(1).map((row, index) => ({
          rowIndex: index + 2,
          timeStamp: row[0] || '',
          documentId: row[1] || '',
          documentName: row[2] || '',
          documentType: row[3] || '',
          documentCategory: row[4] || '',
          uploadedFile: row[5] || '',
          uploadedBy: row[6] || ''
        }));

        setDocuments(formattedDocs);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      alert('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const generateDocumentId = () => {
    const maxId = documents.reduce((max, doc) => {
      const match = doc.documentId.match(/DI-(\d+)/);
      if (match) {
        const num = parseInt(match[1]);
        return num > max ? num : max;
      }
      return max;
    }, 0);

    return `DI-${String(maxId + 1).padStart(3, '0')}`;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        uploadedFile: file
      }));
    }
  };

  const uploadFileToGoogleDrive = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const base64Data = e.target.result;

          const formData = new FormData();
          formData.append('action', 'uploadFile');
          formData.append('base64Data', base64Data);
          formData.append('fileName', file.name);
          formData.append('mimeType', file.type);
          formData.append('folderId', FOLDER_ID);

          const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: formData
          });

          const result = await response.json();

          if (result.success) {
            resolve(result.fileUrl);
          } else {
            reject(new Error(result.error || 'Failed to upload file'));
          }
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async () => {
    if (!formData.documentName || !formData.documentType || !formData.documentCategory ||
      !formData.uploadedFile || !formData.uploadedBy) {
      alert('Please fill all fields');
      return;
    }

    setSubmitting(true);

    try {
      const fileUrl = await uploadFileToGoogleDrive(formData.uploadedFile);

      const timestamp = new Date().toLocaleString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).replace(',', '');

      const documentId = generateDocumentId();

      const rowData = [
        timestamp,
        documentId,
        formData.documentName,
        formData.documentType,
        formData.documentCategory,
        fileUrl,
        formData.uploadedBy
      ];

      const submitFormData = new FormData();
      submitFormData.append('action', 'insert');
      submitFormData.append('sheetName', 'Documents');
      submitFormData.append('rowData', JSON.stringify(rowData));

      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        body: submitFormData
      });

      const result = await response.json();

      if (result.success) {
        alert('Document uploaded successfully!');
        setShowModal(false);
        setFormData({
          documentName: '',
          documentType: '',
          documentCategory: '',
          uploadedFile: null,
          uploadedBy: ''
        });
        fetchDocuments();
      } else {
        alert('Failed to save document: ' + result.error);
      }
    } catch (error) {
      console.error('Error submitting:', error);
      alert('Error: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (rowIndex, documentId) => {
    if (!confirm(`Are you sure you want to delete document ${documentId}?`)) {
      return;
    }

    try {
      const deleteFormData = new FormData();
      deleteFormData.append('action', 'delete');
      deleteFormData.append('sheetName', 'Documents');
      deleteFormData.append('rowIndex', rowIndex);

      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        body: deleteFormData
      });

      const result = await response.json();

      if (result.success) {
        alert('Document deleted successfully!');
        fetchDocuments();
      } else {
        alert('Failed to delete document: ' + result.error);
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Error deleting document');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Documents Management</h1>
            <p className="text-gray-600 mt-1">Manage and track all your documents</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 shadow-lg transition-colors"
          >
            <Plus size={20} />
            Add Document
          </button>
        </div>

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
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Document ID</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Document Name</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Document Type</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Document Category</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Uploaded File</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Uploaded By</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                          <FileText className="mx-auto mb-2 text-gray-400" size={48} />
                          <p>No documents found. Click "Add Document" to get started.</p>
                        </td>
                      </tr>
                    ) : (
                      documents.map((doc) => (
                        <tr key={doc.rowIndex} className="border-b hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm text-gray-700">{doc.timeStamp}</td>
                          <td className="px-6 py-4 text-sm font-medium text-blue-600">{doc.documentId}</td>
                          <td className="px-6 py-4 text-sm text-gray-700">{doc.documentName}</td>
                          <td className="px-6 py-4 text-sm text-gray-700">{doc.documentType}</td>
                          <td className="px-6 py-4 text-sm text-gray-700">{doc.documentCategory}</td>
                          <td className="px-6 py-4 text-sm">
                            {doc.uploadedFile ? (
                              <a
                                href={doc.uploadedFile}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline flex items-center gap-1"
                              >
                                <FileText size={16} />
                                View File
                              </a>
                            ) : (
                              <span className="text-gray-400">No file</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700">{doc.uploadedBy}</td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => handleDelete(doc.rowIndex, doc.documentId)}
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

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-800">Add New Document</h2>
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
                  Document Name *
                </label>
                <input
                  type="text"
                  name="documentName"
                  value={formData.documentName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter document name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document Type *
                </label>
                <select
                  name="documentType"
                  value={formData.documentType}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select type</option>
                  {documentTypes.map((type, index) => (
                    <option key={index} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document Category *
                </label>
                <select
                  name="documentCategory"
                  value={formData.documentCategory}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select category</option>
                  {documentCategories.map((category, index) => (
                    <option key={index} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload File *
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-500 transition-colors">
                  <input
                    type="file"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="mx-auto text-gray-400 mb-2" size={32} />
                    <p className="text-sm text-gray-600">
                      {formData.uploadedFile ? formData.uploadedFile.name : 'Click to upload file'}
                    </p>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Uploaded By *
                </label>
                <input
                  type="text"
                  name="uploadedBy"
                  value={formData.uploadedBy}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your name"
                />
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
                      Uploading...
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

export default Documents;