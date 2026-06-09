import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ExternalLink, FileText, Folder, Image as ImageIcon, Loader, Search, User } from 'lucide-react';

const DOCUMENT_FIELDS = [
  {
    key: 'aadharFront',
    label: 'Aadhar Frontside Photo',
    headers: ['Aadhar Frontside Photo', 'Aadhar Frontside photo', 'Aadhar Front Photo'],
  },
  {
    key: 'panCard',
    label: 'Pan Card',
    headers: ['Pan Card', 'Pan card'],
  },
  {
    key: 'candidatePhoto',
    label: 'Candidate Photo',
    headers: ["Candidate's Photo", 'Candidate Photo', 'Candidate Photo Upload'],
  },
  {
    key: 'bankPassbook',
    label: 'Photo Of Front Bank Passbook',
    headers: ['Photo Of Front Bank Passbook', 'Bank Passbook Photo', 'Photo Of Bank Passbook'],
  },
  {
    key: 'qualificationPhoto',
    label: 'Qualication Photo',
    headers: ['Qualication Photo', 'Quafication Photo', 'Qualification Photo', 'Highest Qualification Photo'],
  },
  {
    key: 'resume',
    label: 'Resume/Cv Upload',
    headers: ['Resume/Cv Upload', 'Resume/CV Upload', 'Resume Copy', 'Resume/Cv', 'Resume'],
  },
];

const normalizeHeader = (value) =>
  value?.toString().trim().toLowerCase().replace(/[^a-z0-9]/g, '') || '';

const getDriveFileId = (url) => {
  if (!url) return '';
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return match?.[1] || '';
};

const getDocumentPreviewUrl = (url) => {
  const fileId = getDriveFileId(url);
  return fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w600` : url;
};

const Documents = () => {
  const [employeeFolders, setEmployeeFolders] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const googleSheetUrl = import.meta.env.VITE_GOOGLE_SHEET_URL;
  const joiningSheetUrl = import.meta.env.VITE_JOINING_SHEET_URL;

  const findHeaderIndex = (headers, names, fallbackIndex = -1) => {
    const normalizedNames = names.map(normalizeHeader);
    const index = headers.findIndex((header) => {
      const normalizedHeader = normalizeHeader(header);
      if (!normalizedHeader) return false;
      return normalizedNames.some(
        (name) => normalizedHeader === name || normalizedHeader.includes(name)
      );
    });

    return index !== -1 ? index : fallbackIndex;
  };

  const findHeaderRowIndex = (rows) =>
    rows.findIndex((row) => {
      const normalizedRow = row.map(normalizeHeader);
      return DOCUMENT_FIELDS.some((field) =>
        field.headers.some((header) => normalizedRow.includes(normalizeHeader(header)))
      );
    });

  const buildEmployeeFolders = (rows) => {
    const headerRowIndex = findHeaderRowIndex(rows);
    const headers = rows[headerRowIndex] || [];
    const dataRows = headerRowIndex !== -1 ? rows.slice(headerRowIndex + 1) : [];

    const nameIndex = findHeaderIndex(headers, ['Name As Per Aadhar', 'Name As per Aadhar', 'CANDIATE NAME', 'Candidate Name', 'Employee Name'], 2);
    const idIndex = findHeaderIndex(headers, ['ID', 'Joining ID', 'Indent Number', 'Employee ID', 'Candidate Enquiry No'], 1);
    const departmentIndex = findHeaderIndex(headers, ['Department'], -1);
    const designationIndex = findHeaderIndex(headers, ['Designation'], -1);
    const joiningPlaceIndex = findHeaderIndex(headers, ['Joining Place', 'Job Location'], -1);
    const joiningDateIndex = findHeaderIndex(headers, ['Date Of Joining', 'Joining Date'], -1);

    const documentIndexes = DOCUMENT_FIELDS.reduce((acc, field) => {
      acc[field.key] = findHeaderIndex(headers, field.headers, -1);
      return acc;
    }, {});

    return dataRows
      .map((row, index) => {
        const employeeName = row[nameIndex]?.toString().trim() || '';
        const employeeId = row[idIndex]?.toString().trim() || '';

        if (!employeeName && !employeeId) return null;

        const documents = DOCUMENT_FIELDS.map((field) => ({
          ...field,
          url: documentIndexes[field.key] !== -1 ? row[documentIndexes[field.key]] || '' : '',
        }));

        return {
          id: `${employeeId || employeeName}-${index}`,
          employeeId,
          name: employeeName || employeeId || 'Unknown Employee',
          department: departmentIndex !== -1 ? row[departmentIndex] || '' : '',
          designation: designationIndex !== -1 ? row[designationIndex] || '' : '',
          joiningPlace: joiningPlaceIndex !== -1 ? row[joiningPlaceIndex] || '' : '',
          dateOfJoining: joiningDateIndex !== -1 ? row[joiningDateIndex] || '' : '',
          documents,
          uploadedCount: documents.filter((doc) => doc.url).length,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  const fetchJoiningRows = async () => {
    const sources = [
      `${googleSheetUrl}?sheet=JOINING&action=fetch`,
      `${joiningSheetUrl}?action=read&sheet=JOINING_FMS`,
    ];

    for (const source of sources) {
      if (!source || source.startsWith('undefined')) continue;

      try {
        const response = await fetch(source);
        const result = await response.json();
        const rows = result.data || result;

        if (Array.isArray(rows) && rows.length > 0) {
          const folders = buildEmployeeFolders(rows);
          if (folders.length > 0) return folders;
        }
      } catch (sourceError) {
        console.error('Document source failed:', sourceError);
      }
    }

    throw new Error('No employee document data found');
  };

  const fetchDocuments = async () => {
    setLoading(true);
    setError(null);

    try {
      const folders = await fetchJoiningRows();
      setEmployeeFolders(folders);
    } catch (fetchError) {
      console.error('Error fetching employee documents:', fetchError);
      setError(fetchError.message);
      setEmployeeFolders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const filteredFolders = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return employeeFolders;

    return employeeFolders.filter((folder) =>
      folder.name.toLowerCase().includes(query) ||
      folder.employeeId.toLowerCase().includes(query) ||
      folder.department.toLowerCase().includes(query) ||
      folder.designation.toLowerCase().includes(query)
    );
  }, [employeeFolders, searchTerm]);

  const selectedFolder = employeeFolders.find((folder) => folder.id === selectedFolderId);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Documents Management</h1>
            <p className="mt-1 text-gray-600">Employee-wise folders with joining documents</p>
          </div>

          {!selectedFolder && (
            <div className="relative w-full lg:max-w-sm">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                placeholder="Search employee, ID, department..."
              />
            </div>
          )}
        </div>

        <div className="min-h-[500px] overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader className="animate-spin text-indigo-600" size={40} />
            </div>
          ) : error ? (
            <div className="px-6 py-20 text-center">
              <FileText className="mx-auto mb-4 text-red-200" size={64} />
              <p className="text-lg font-semibold text-red-600">Failed to load employee documents</p>
              <p className="mt-1 text-sm text-gray-500">{error}</p>
              <button
                type="button"
                onClick={fetchDocuments}
                className="mt-4 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-dark"
              >
                Retry
              </button>
            </div>
          ) : !selectedFolder ? (
            <div className="p-6">
              {filteredFolders.length === 0 ? (
                <div className="py-20 text-center text-gray-500">
                  <Folder className="mx-auto mb-4 text-indigo-200" size={64} />
                  <p className="text-lg font-medium text-gray-600">No employee folders found.</p>
                  <p className="mt-1 text-sm">Joining document data is not available yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {filteredFolders.map((folder) => (
                    <button
                      key={folder.id}
                      type="button"
                      onClick={() => setSelectedFolderId(folder.id)}
                      className="group flex min-h-[176px] flex-col items-center justify-center rounded-2xl border border-gray-100 bg-gray-50 p-5 text-center transition-all duration-300 hover:border-indigo-200 hover:bg-indigo-50 hover:shadow-md"
                    >
                      <div className="relative">
                        <Folder
                          size={64}
                          className="text-indigo-400 transition-colors group-hover:text-indigo-500"
                          fill="currentColor"
                          fillOpacity={0.2}
                        />
                        <span className="absolute -bottom-1 -right-2 rounded-full border border-gray-100 bg-white px-2 py-0.5 text-[10px] font-bold text-indigo-700 shadow-sm">
                          {folder.uploadedCount}/6
                        </span>
                      </div>
                      <h3 className="mt-4 line-clamp-2 text-sm font-semibold text-gray-800 group-hover:text-indigo-700">
                        {folder.name}
                      </h3>
                      {folder.employeeId && (
                        <p className="mt-1 text-xs font-medium text-gray-500">{folder.employeeId}</p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex min-h-[500px] flex-col">
              <div className="flex flex-col gap-4 border-b border-gray-100 bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedFolderId(null)}
                    className="rounded-full p-2 text-gray-600 transition-colors hover:bg-gray-200"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <div className="flex items-center gap-3">
                    <Folder size={28} className="text-indigo-500" fill="currentColor" fillOpacity={0.2} />
                    <div>
                      <h2 className="text-lg font-bold text-gray-800">{selectedFolder.name}</h2>
                      <p className="text-xs text-gray-500">
                        {selectedFolder.employeeId || 'No employee ID'} • {selectedFolder.uploadedCount}/6 documents uploaded
                      </p>
                    </div>
                  </div>
                </div>
                <span className="w-fit rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-800">
                  Employee Folder
                </span>
              </div>

              <div className="p-6">
                <div className="mb-6 grid grid-cols-1 gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="flex items-center gap-2">
                    <User size={16} className="text-gray-400" />
                    <div>
                      <p className="text-[11px] font-semibold uppercase text-gray-500">Employee</p>
                      <p className="text-sm font-semibold text-gray-800">{selectedFolder.name}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase text-gray-500">Department</p>
                    <p className="text-sm font-semibold text-gray-800">{selectedFolder.department || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase text-gray-500">Designation</p>
                    <p className="text-sm font-semibold text-gray-800">{selectedFolder.designation || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase text-gray-500">Joining Place</p>
                    <p className="text-sm font-semibold text-gray-800">{selectedFolder.joiningPlace || '-'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                  {selectedFolder.documents.map((document) => (
                    <a
                      key={document.key}
                      href={document.url || undefined}
                      target={document.url ? '_blank' : undefined}
                      rel={document.url ? 'noopener noreferrer' : undefined}
                      aria-disabled={!document.url}
                      onClick={(event) => {
                        if (!document.url) event.preventDefault();
                      }}
                      className={`group overflow-hidden rounded-lg border bg-white shadow-sm transition-all ${
                        document.url
                          ? 'cursor-pointer border-gray-100 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg'
                          : 'cursor-not-allowed border-gray-100 opacity-70'
                      }`}
                    >
                      <div className="relative aspect-square bg-gray-100">
                        {document.url ? (
                          <img
                            src={getDocumentPreviewUrl(document.url)}
                            alt={document.label}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                            loading="lazy"
                            onError={(event) => {
                              event.currentTarget.style.display = 'none';
                              event.currentTarget.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : null}

                        <div className={`${document.url ? 'hidden' : ''} flex h-full w-full items-center justify-center`}>
                          <div className="flex flex-col items-center gap-2 text-gray-400">
                            {document.url ? <FileText size={42} /> : <ImageIcon size={42} />}
                            <span className="text-xs font-semibold">{document.url ? 'Preview unavailable' : 'No file uploaded'}</span>
                          </div>
                        </div>

                        <span
                          className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold shadow-sm ${
                            document.url
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {document.url ? 'Available' : 'Missing'}
                        </span>

                        {document.url && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/25 group-hover:opacity-100">
                            <span className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-bold text-indigo-700 shadow-lg">
                              <ExternalLink size={14} />
                              View
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="p-3">
                        <h3 className="line-clamp-2 min-h-[34px] text-xs font-bold leading-snug text-gray-900">{document.label}</h3>
                        <p className="mt-1 text-xs text-gray-500">
                          {document.url ? 'Click to view document' : 'Not uploaded'}
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Documents;
