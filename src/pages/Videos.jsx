import React, { useState, useEffect } from 'react';
import { Upload, X, Trash2, Plus, Video, Loader, Play } from 'lucide-react';

const Videos = () => {
  const [showModal, setShowModal] = useState(false);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [videoCategories, setVideoCategories] = useState([]);
  
  const [formData, setFormData] = useState({
    videoName: '',
    category: '',
    uploadedVideo: null,
    uploadedBy: ''
  });

  const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx7_8IiGXsVplVge8Fi8PIsxL1Ub_QqQI77x1flWxkl2KlyunmnVheG7yA6safW20yZ/exec';
  const FOLDER_ID = '1L4Bz6-oltUO7LEz8Z4yFCzBn5Pv5Msh5'; // Replace with your actual Google Drive folder ID for videos

  useEffect(() => {
    fetchMasterData();
    fetchVideos();
  }, []);

  const fetchMasterData = async () => {
    try {
      const response = await fetch(`${SCRIPT_URL}?sheet=Master&action=fetch`);
      const result = await response.json();
      
      if (result.success && result.data) {
        const data = result.data;
        const headers = data[0];
        
        // Find Videos Category column index
        const categoryIndex = headers.findIndex(h => 
          h.toLowerCase().includes('videos category') || h.toLowerCase().includes('video category')
        );
        
        if (categoryIndex !== -1) {
          // Extract unique categories (skip header row and filter empty values)
          const categories = [...new Set(
            data.slice(1)
              .map(row => row[categoryIndex])
              .filter(val => val && val.trim())
          )];
          setVideoCategories(categories);
        }
      }
    } catch (error) {
      console.error('Error fetching master data:', error);
      alert('Failed to load video categories');
    }
  };

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${SCRIPT_URL}?sheet=Videos&action=fetch`);
      const result = await response.json();
      
      if (result.success && result.data) {
        // Skip header row and format data
        const formattedVideos = result.data.slice(1).map((row, index) => ({
          rowIndex: index + 2, // +2 because sheet is 1-indexed and we skip header
          timeStamp: row[0] || '',
          videoId: row[1] || '',
          videoName: row[2] || '',
          category: row[3] || '',
          uploadedBy: row[4] || '',
          videoFile: row[5] || ''
        }));
        
        setVideos(formattedVideos);
      }
    } catch (error) {
      console.error('Error fetching videos:', error);
      alert('Failed to load videos');
    } finally {
      setLoading(false);
    }
  };

  const generateVideoId = () => {
    const maxId = videos.reduce((max, video) => {
      const match = video.videoId.match(/VI-(\d+)/);
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

  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check if file is a video
      if (!file.type.startsWith('video/')) {
        alert('Please upload a valid video file');
        return;
      }
      
      // Check file size (max 100MB)
      const maxSize = 100 * 1024 * 1024; // 100MB in bytes
      if (file.size > maxSize) {
        alert('Video file size should not exceed 100MB');
        return;
      }
      
      setFormData(prev => ({
        ...prev,
        uploadedVideo: file
      }));
    }
  };

  const uploadVideoToGoogleDrive = async (file) => {
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
            reject(new Error(result.error || 'Failed to upload video'));
          }
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read video file'));
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.videoName || !formData.category || !formData.uploadedVideo || !formData.uploadedBy) {
      alert('Please fill all fields');
      return;
    }

    setSubmitting(true);
    
    try {
      // Upload video to Google Drive
      const videoUrl = await uploadVideoToGoogleDrive(formData.uploadedVideo);
      
      // Generate timestamp in MM/DD/YYYY HH:MM:SS format
      const now = new Date();
      const timestamp = `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      
      const videoId = generateVideoId();
      
      // Prepare row data - [Timestamp, Video ID, Video Name, Category, Uploaded By, Video File]
      const rowData = [
        timestamp,
        videoId,
        formData.videoName,
        formData.category,
        formData.uploadedBy,
        videoUrl
      ];

      // Submit to Google Sheets
      const submitFormData = new FormData();
      submitFormData.append('action', 'insert');
      submitFormData.append('sheetName', 'Videos');
      submitFormData.append('rowData', JSON.stringify(rowData));

      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        body: submitFormData
      });

      const result = await response.json();
      
      if (result.success) {
        alert('Video uploaded successfully!');
        setShowModal(false);
        setFormData({
          videoName: '',
          category: '',
          uploadedVideo: null,
          uploadedBy: ''
        });
        // Refresh videos list
        fetchVideos();
      } else {
        alert('Failed to save video: ' + result.error);
      }
    } catch (error) {
      console.error('Error submitting:', error);
      alert('Error: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (rowIndex, videoId) => {
    if (!confirm(`Are you sure you want to delete video ${videoId}?`)) {
      return;
    }

    try {
      const deleteFormData = new FormData();
      deleteFormData.append('action', 'delete');
      deleteFormData.append('sheetName', 'Videos');
      deleteFormData.append('rowIndex', rowIndex);

      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        body: deleteFormData
      });

      const result = await response.json();
      
      if (result.success) {
        alert('Video deleted successfully!');
        fetchVideos();
      } else {
        alert('Failed to delete video: ' + result.error);
      }
    } catch (error) {
      console.error('Error deleting video:', error);
      alert('Error deleting video');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Video Management</h1>
            <p className="text-gray-600 mt-1">Manage and track all your videos</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 shadow-lg transition-colors"
          >
            <Plus size={20} />
            Add Video
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
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Video ID</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Video Name</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Category</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Uploaded By</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Video File</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {videos.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                          <Video className="mx-auto mb-2 text-gray-400" size={48} />
                          <p>No videos found. Click "Add Video" to get started.</p>
                        </td>
                      </tr>
                    ) : (
                      videos.map((video) => (
                        <tr key={video.rowIndex} className="border-b hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm text-gray-700">{video.timeStamp}</td>
                          <td className="px-6 py-4 text-sm font-medium text-blue-600">{video.videoId}</td>
                          <td className="px-6 py-4 text-sm text-gray-700">{video.videoName}</td>
                          <td className="px-6 py-4 text-sm">
                            <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                              {video.category}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700">{video.uploadedBy}</td>
                          <td className="px-6 py-4 text-sm">
                            {video.videoFile ? (
                              <a 
                                href={video.videoFile} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline flex items-center gap-1"
                              >
                                <Play size={16} />
                                Watch Video
                              </a>
                            ) : (
                              <span className="text-gray-400">No video</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => handleDelete(video.rowIndex, video.videoId)}
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
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-800">Add New Video</h2>
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
                  Video Name *
                </label>
                <input
                  type="text"
                  name="videoName"
                  value={formData.videoName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter video name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select category</option>
                  {videoCategories.map((category, index) => (
                    <option key={index} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Video * (Max 100MB)
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-500 transition-colors">
                  <input
                    type="file"
                    onChange={handleVideoChange}
                    className="hidden"
                    id="video-upload"
                    accept="video/*"
                  />
                  <label htmlFor="video-upload" className="cursor-pointer">
                    <Video className="mx-auto text-gray-400 mb-2" size={32} />
                    <p className="text-sm text-gray-600">
                      {formData.uploadedVideo ? (
                        <>
                          <span className="font-medium text-blue-600">{formData.uploadedVideo.name}</span>
                          <br />
                          <span className="text-xs text-gray-500">
                            {formatFileSize(formData.uploadedVideo.size)}
                          </span>
                        </>
                      ) : (
                        'Click to upload video'
                      )}
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

export default Videos;