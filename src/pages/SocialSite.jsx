import React, { useState, useEffect } from 'react';
import { Filter, Search, Clock, CheckCircle } from 'lucide-react';

import toast from 'react-hot-toast';

const SocialSite = () => {
  // Local State
  const [socialSiteData, setSocialSiteData] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState({});
  const [loading, setLoading] = useState(false);

  const FETCH_URL = import.meta.env.VITE_GOOGLE_SHEET_URL;

  const fetchData = async () => {
    setLoading(true);
    try {
      const cb = `&_=${Date.now()}`;
      const res = await fetch(`${FETCH_URL}?sheet=FMS&action=fetch${cb}`);
      const json = await res.json();

      if (json.success && json.data && json.data.length > 7) {
        const rawData = json.data;
        const headerRow = rawData[5]; // Row 6 is header
        const dataRows = rawData.slice(8); // Data starts at row 9

        // Get Column Indices
        const headers = headerRow.map(h => h?.toString().trim());
        const idxIndent = headers.indexOf("Indent Number");
        const idxPost = headers.indexOf("Post");
        const idxGender = headers.indexOf("Gender");
        const idxPrefer = headers.indexOf("Prefer");
        const idxNumPost = headers.indexOf("Number Of Posts");
        const idxCompDate = headers.indexOf("Completion Date"); // Approximate name check needed?

        // Load history items from localStorage
        const historyIds = JSON.parse(localStorage.getItem("socialSite_history") || "[]");
        const historySet = new Set(historyIds);

        const processed = dataRows.map(row => {
          const indentNo = row[idxIndent] || "";
          // Generate a unique ID. Using IndentNo for now.
          const id = indentNo;

          if (!indentNo) return null;

          const isHistory = historySet.has(id);

          return {
            id: id,
            indentNo: indentNo,
            post: row[idxPost] || "",
            gender: row[idxGender] || "",
            prefer: row[idxPrefer] || "",
            numberOfPost: row[idxNumPost] || "",
            competitionDate: row[idxCompDate] || "",
            status: isHistory ? 'completed' : 'pending'
          };
        }).filter(item => item !== null);

        setSocialSiteData(processed);
      }
    } catch (error) {
      console.error("SocialSite Data Fetch Error:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchData();
  }, []);

  const pendingData = socialSiteData.filter(item => item.status === 'pending');
  const historyData = socialSiteData.filter(item => item.status === 'completed');

  const handleCheckboxChange = (id) => {
    setSelectedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleMoveToHistory = (id) => {
    // moveSocialSiteToHistory(id); // Removed store call

    // Update local state
    setSocialSiteData(prev => prev.map(item =>
      item.id === id ? { ...item, status: 'completed' } : item
    ));

    // Update localStorage
    const historyIds = JSON.parse(localStorage.getItem("socialSite_history") || "[]");
    if (!historyIds.includes(id)) {
      historyIds.push(id);
      localStorage.setItem("socialSite_history", JSON.stringify(historyIds));
    }

    toast.success('Item moved to history successfully!');
    setSelectedItems(prev => ({ ...prev, [id]: false }));
  };

  const filteredPendingData = pendingData.filter(item => {
    const matchesSearch = item.post?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.indentNo?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const filteredHistoryData = historyData.filter(item => {
    const matchesSearch = item.post?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.indentNo?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6 page-content p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Social Site</h1>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-lg shadow border flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4">
        <div className="flex flex-1 max-w-md">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Search by post or indent number..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              className={`py-4 px-6 font-medium text-sm border-b-2 ${activeTab === 'pending'
                ? 'border-indigo-500 text-navy'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              onClick={() => setActiveTab('pending')}
            >
              <Clock size={16} className="inline mr-2" />
              Pending ({filteredPendingData.length})
            </button>
            <button
              className={`py-4 px-6 font-medium text-sm border-b-2 ${activeTab === 'history'
                ? 'border-indigo-500 text-navy'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              onClick={() => setActiveTab('history')}
            >
              <CheckCircle size={16} className="inline mr-2" />
              History ({filteredHistoryData.length})
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'pending' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Indent No.</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Post</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prefer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Number Of Post</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Competition Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPendingData.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedItems[item.id] || false}
                          onChange={() => handleCheckboxChange(item.id)}
                          className="h-4 w-4 text-navy focus:ring-navy border-gray-300 rounded"
                        />
                        {selectedItems[item.id] && (
                          <button
                            onClick={() => handleMoveToHistory(item.id)}
                            className="ml-2 px-2 py-1 bg-navy text-white rounded text-xs hover:bg-navy-dark"
                          >
                            Move
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.indentNo}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.post}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.gender}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.prefer || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.numberOfPost}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.competitionDate ? new Date(item.competitionDate).toLocaleDateString() : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredPendingData.length === 0 && (
                <div className="px-6 py-12 text-center">
                  <p className="text-gray-500">No pending items found.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Indent No.</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Post</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prefer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Number Of Post</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Competition Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredHistoryData.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.indentNo}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.post}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.gender}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.prefer || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.numberOfPost}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.competitionDate ? new Date(item.competitionDate).toLocaleDateString() : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredHistoryData.length === 0 && (
                <div className="px-6 py-12 text-center">
                  <p className="text-gray-500">No history found.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SocialSite;