import React, { useState, useEffect } from 'react';
import { Search, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const HrLeads = () => {
  const [leadsData, setLeadsData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch HR Leads data
  const fetchLeadsData = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        'https://script.google.com/macros/s/AKfycbx7_8IiGXsVplVge8Fi8PIsxL1Ub_QqQI77x1flWxkl2KlyunmnVheG7yA6safW20yZ/exec?sheet=HR Leads&action=fetch'
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.data && result.data.length > 0) {
        // First row contains headers
        const headers = result.data[0].map(h => h ? h.trim() : '');
        const dataRows = result.data.slice(1);

        const getIndex = (headerName) => headers.findIndex(h => h === headerName);

        const processedData = dataRows
          .filter(row => row[getIndex('Timestamp')]) // Filter out empty rows
          .map((row, index) => ({
            id: index,
            timestamp: row[getIndex('Timestamp')],
            leadNumber: row[getIndex('Lead Number')],
            personName: row[getIndex('Person Name')],
            contactNumber: row[getIndex('Contact Number')],
            post: row[getIndex('Post')],
            byWhichPortal: row[getIndex('By Which Portal')],
            resume: row[getIndex('Resume')],
            status: row[getIndex('Status')],
            remarks: row[getIndex("Remark's")]
          }));

        setLeadsData(processedData);
      } else {
        throw new Error(result.error || 'No data found in HR Leads sheet');
      }
    } catch (error) {
      console.error('Error fetching HR Leads data:', error);
      toast.error('Failed to fetch HR Leads data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeadsData();
  }, []);

  // Filter data based on search term
  const filteredData = leadsData.filter(item => {
    const searchLower = searchTerm.toLowerCase();
    return (
      item.leadNumber?.toLowerCase().includes(searchLower) ||
      item.personName?.toLowerCase().includes(searchLower) ||
      item.contactNumber?.toLowerCase().includes(searchLower) ||
      item.post?.toLowerCase().includes(searchLower) ||
      item.status?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">HR Leads</h1>
        <button
          onClick={fetchLeadsData}
          disabled={loading}
          className="flex items-center px-4 py-2 text-white bg-indigo-700 rounded-md hover:bg-opacity-90 disabled:opacity-50"
        >
          <RefreshCw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="relative w-full max-w-md">
          <input
            type="text"
            placeholder="Search by lead number, name, contact, post, or status..."
            className="w-full pl-10 pr-4 py-2 border border-gray-400 border-opacity-30 rounded-lg focus:outline-none focus:ring-2 bg-white bg-opacity-10 focus:ring-indigo-500 text-gray-600"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search
            size={20}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 opacity-60"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                    Lead Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                    Person Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                    Contact Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                    Post
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                    By Which Portal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                    Resume
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                    Remark's
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="9" className="px-6 py-12 text-center">
                      <div className="flex justify-center flex-col items-center">
                        <div className="w-8 h-8 border-4 border-indigo-500 border-dashed rounded-full animate-spin mb-2"></div>
                        <span className="text-gray-600 text-sm">
                          Loading HR Leads data...
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : filteredData.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="px-6 py-12 text-center">
                      <p className="text-gray-500">
                        {searchTerm ? 'No leads found matching your search.' : 'No HR Leads data found.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredData.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.timestamp}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        {item.leadNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.personName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.contactNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.post}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.byWhichPortal}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.resume ? (
                          <a
                            href={item.resume}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:text-indigo-800 underline"
                          >
                            View
                          </a>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            item.status === 'Connected'
                              ? 'bg-green-100 text-green-800'
                              : item.status === 'Not Connected'
                              ? 'bg-red-100 text-red-800'
                              : item.status === 'Shortlisted'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {item.status || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                        {item.remarks || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Results Count */}
      {!loading && filteredData.length > 0 && (
        <div className="text-sm text-gray-600 text-right">
          Showing {filteredData.length} of {leadsData.length} leads
        </div>
      )}
    </div>
  );
};

export default HrLeads;