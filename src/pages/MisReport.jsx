import React, { useState, useEffect } from 'react';

const MisReport = () => {
  const [peopleData, setPeopleData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('https://script.google.com/macros/s/AKfycbx7_8IiGXsVplVge8Fi8PIsxL1Ub_QqQI77x1flWxkl2KlyunmnVheG7yA6safW20yZ/exec?sheet=MIS&action=fetch');
      
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Process the data from the sheet
        const processedData = processSheetData(data.data);
        setPeopleData(processedData);
      } else {
        throw new Error(data.error || 'Failed to fetch data from sheet');
      }
    } catch (err) {
      setError(err.message);
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const processSheetData = (sheetData) => {
    if (!sheetData || sheetData.length < 2) return [];
    
    const headers = sheetData[0];
    const rows = sheetData.slice(1);
    
    // Map column letters to indices
    const columnMap = {};
    headers.forEach((header, index) => {
      columnMap[header.trim()] = index;
    });
    
    return rows.map((row, index) => {
      // Get values from each column
      const dateStart = row[columnMap['Date Start']] || '';
      const dateEnd = row[columnMap['Date End']] || '';
      const name = row[columnMap['Name']] || '';
      const target = row[columnMap['Target']] || '';
      const actualWorkDone = row[columnMap['Actual  Work Done']] || '';
      const weeklyWorkDone = row[columnMap['Weekly Work Done %']] || '';
      const weeklyWorkDoneOnTime = row[columnMap['Weekly Work Done On Time %']] || '';
      const totalWorkDone = parseInt(row[columnMap['Total Work Done']]) || 0;
      const weekPending = row[columnMap['Week Pending']] || '';
      const allPendingTillDate = row[columnMap['All Pending Till Date']] || '';
      
      // Generate avatar based on name
      const avatar = name && name.trim() !== '' ? 
        (name.split(' ').length > 1 ? 
          `${name.split(' ')[0][0]}${name.split(' ')[1][0]}`.toUpperCase() : 
          name[0].toUpperCase()) : 
        '👤';

        
      
      return {
        id: index + 1,
        name,
        dateStart,
        dateEnd,
        target,
        actualWorkDone,
        weeklyWorkDone,
        weeklyWorkDoneOnTime,
        totalWorkDone,
        weekPending,
        allPendingTillDate,
        avatar
      };
    });
  };

  const TotalDoneWork = ({ weeks }) => {
    const getColor = (weeks) => {
      if (weeks === 1) return 'bg-green-100 text-green-800';
      if (weeks === 2) return 'bg-yellow-100 text-yellow-800';
      if (weeks === 3) return 'bg-orange-100 text-orange-800';
      return 'bg-red-100 text-red-800';
    };

    return (
      <span className={`px-2 py-1 rounded-full text-sm font-medium ${getColor(weeks)}`}>
        {weeks}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">Error</div>
          <p className="text-gray-600">{error}</p>
          <button 
            onClick={fetchData}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6 sticky top-0 bg-gray-50 z-10 py-2">
          <h1 className="text-2xl font-bold text-gray-900">MIS Report</h1>
          <button 
            onClick={fetchData}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
        
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 180px)' }}>
            <table className="min-w-full">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 sticky top-0">NAME</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 sticky top-0">DATE START</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 sticky top-0">DATE END</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 sticky top-0">TARGET</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 sticky top-0">ACTUAL WORK DONE</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 sticky top-0">WEEKLY WORK DONE %</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 sticky top-0">WEEKLY WORK DONE ON TIME %</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 sticky top-0">TOTAL WORK DONE</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 sticky top-0">WEEK PENDING</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 sticky top-0">ALL PENDING TILL DATE</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {peopleData.length > 0 ? (
                  peopleData.map((person, index) => (
                    <tr key={person.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-lg">
                              {person.avatar}
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{person.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{person.dateStart}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{person.dateEnd}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{person.target}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {person.actualWorkDone}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {person.weeklyWorkDone}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {person.weeklyWorkDoneOnTime}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <TotalDoneWork weeks={person.totalWorkDone} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {person.weekPending}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {person.allPendingTillDate}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="12" className="px-6 py-4 text-center text-gray-500">
                      No data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MisReport;