import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  Car,
  ChevronDown,
  Download,
  ExternalLink,
  FileText,
  Filter,
  RefreshCw,
  Route,
  Search,
  User,
  Wallet,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const OUTSTATION_SCRIPT_URL = import.meta.env.VITE_OUTSTATION_SHEET_URL;
const OUTSTATION_SPREADSHEET_ID = '1WTT8ZQhtf1yeSChNn2uJeW5Tz2TvYjQLrxhTx5l4Fgw';
const ADVANCE_SHEET_NAME = 'Advance';
const FMS_SHEET_NAME = 'FMS';
const BIKE_KM_RATE = 2;
const CAR_KM_RATE = 4;
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const pickValue = (row, keys) => {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') return value;
  }
  return '';
};

const parseNumber = (value) => {
  if (value === undefined || value === null || value === '') return 0;
  const number = Number(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(number) ? number : 0;
};

const getVehicleKmRate = (vehicleType) => {
  const normalized = String(vehicleType || '').toLowerCase();
  if (normalized.includes('bike')) return BIKE_KM_RATE;
  if (normalized.includes('car')) return CAR_KM_RATE;
  return 0;
};

const parseDateToObj = (value) => {
  if (!value) return null;
  const raw = value.toString().trim();
  if (!raw) return null;

  if (raw.includes('T') && raw.includes(':')) {
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const isoMatch = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) return new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));

  const slashMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (slashMatch) {
    const year = slashMatch[3].length === 2 ? Number(`20${slashMatch[3]}`) : Number(slashMatch[3]);
    return new Date(year, Number(slashMatch[2]) - 1, Number(slashMatch[1]));
  }

  return null;
};

const formatDateValue = (value) => {
  const date = parseDateToObj(value);
  if (!date) return value ? String(value) : '-';
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
};

const formatDateObj = (date) => {
  if (!date) return '-';
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
};

const formatTimeValue = (value) => {
  if (!value) return '-';
  const raw = value.toString().trim();
  if (!raw) return '-';

  if (raw.includes('T') && raw.includes(':')) {
    const date = new Date(raw);
    if (!Number.isNaN(date.getTime())) {
      return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    }
  }

  if (raw.includes('/') && raw.includes(':')) {
    const parts = raw.split(' ');
    if (parts.length >= 2) return parts[1].substring(0, 5);
  }

  return raw;
};

const getMonthYear = (value) => {
  const date = parseDateToObj(value);
  if (!date) return { month: '', year: '', dateObj: null };
  return {
    month: MONTHS[date.getMonth()],
    year: String(date.getFullYear()),
    dateObj: date,
  };
};

const buildUrlLinks = (items) => items.filter((item) => item.url);

const parseGoogleSheetTable = (text, sheetLabel = 'sheet') => {
  const jsonStart = text.indexOf('{');
  const jsonEnd = text.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
    throw new Error(`Invalid ${sheetLabel} response`);
  }

  const payload = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
  if (payload.status && payload.status !== 'ok') {
    throw new Error(payload.errors?.[0]?.detailed_message || `Failed to read ${sheetLabel}`);
  }

  return (payload.table?.rows || []).map((row) =>
    (row.c || []).map((cell) => {
      if (!cell) return '';
      return cell.f ?? cell.v ?? '';
    })
  );
};

const fetchSheetRows = async (sheetName) => {
  const url = `https://docs.google.com/spreadsheets/d/${OUTSTATION_SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}&cb=${Date.now()}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${sheetName} sheet HTTP error! status: ${response.status}`);

  const text = await response.text();
  return parseGoogleSheetTable(text, sheetName);
};

const normalizeFmsSheetRow = (row) => {
  const inVehicleType = row[5] || '';
  const outVehicleType = row[16] || '';
  const vehicleType = inVehicleType || outVehicleType;
  const totalRunningKm = parseNumber(row[7]);

  return {
    serialNo: row[1] || '',
    vehicleType,
    inVehicleType,
    outVehicleType,
    totalRunningKm,
    inProofUrl: row[8] || '',
    outProofUrl: row[18] || '',
    totalAmount: totalRunningKm * getVehicleKmRate(vehicleType),
  };
};

const fetchFmsRowsFromSheet = async () => {
  const rows = await fetchSheetRows(FMS_SHEET_NAME);
  return rows
    .filter((row) => {
      const personName = String(row?.[2] || '').trim();
      return personName && personName.toLowerCase() !== 'person name';
    })
    .map(normalizeFmsSheetRow);
};

const fetchAdvanceRowsFromSheet = async () => {
  return fetchSheetRows(ADVANCE_SHEET_NAME);
};

const normalizeAdvanceRow = (row) => {
  if (!Array.isArray(row)) return row || {};

  return {
    timestamp: row[0],
    serialNo: row[1],
    personName: row[2],
    fromLocation: row[3],
    toLocation: row[4],
    startDate: row[5],
    endDate: row[6],
    travelType: row[7],
    advance: row[8],
    companyName: row[9],
    remarks: row[10],
    planned: row[11],
    actual: row[12],
    delay: row[13],
    status: row[14],
    remarks1: row[15],
    approvedBy: row[16],
  };
};

const ProofLink = ({ url, label }) => {
  if (!url) return <span className="text-xs font-semibold text-slate-300">-</span>;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100"
    >
      {label}
      <ExternalLink size={12} />
    </a>
  );
};

const getStatusClass = (status) => {
  const normalized = String(status || '').toLowerCase();
  if (normalized.includes('approved')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (normalized.includes('rejected')) return 'bg-rose-50 text-rose-700 border-rose-200';
  return 'bg-amber-50 text-amber-700 border-amber-200';
};

const sanitizeFileName = (value) =>
  String(value || 'all').trim().replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '').toLowerCase() || 'all';

const TaDa = () => {
  const [visitRows, setVisitRows] = useState([]);
  const [travellingRows, setTravellingRows] = useState([]);
  const [advanceRows, setAdvanceRows] = useState([]);
  const [activeTab, setActiveTab] = useState('fms');
  const [searchTerm, setSearchTerm] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);

  const fetchTaDaData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${OUTSTATION_SCRIPT_URL}?action=getAllData&sheet=FMS`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const result = await response.json();
      if (result.status !== 'success') throw new Error(result.message || 'Failed to fetch TA/DA data');

      let fmsSheetRows = [];
      try {
        fmsSheetRows = await fetchFmsRowsFromSheet();
      } catch (sheetError) {
        console.error('FMS sheet detail fetch failed:', sheetError);
      }

      const visits = (result.visit || [])
        .filter((row) => {
          const personName = String(row?.personName || '').trim();
          return personName && personName.toLowerCase() !== 'person name';
        })
        .map((row, index) => {
          const fmsSheetRow = fmsSheetRows[index] || {};
          const dateSource = pickValue(row, ['date', 'returnDate', 'inTime', 'outTime']);
          const dateMeta = getMonthYear(dateSource);
          const totalRunningKm = fmsSheetRow.totalRunningKm || parseNumber(pickValue(row, ['totalRunning', 'Total Running Km']));
          const vehicleType = pickValue(row, ['vehicleType', 'inVehicleType', 'IN Vehicle Type']) || fmsSheetRow.vehicleType || '';
          const calculatedAmount = totalRunningKm * getVehicleKmRate(vehicleType);
          const inProofUrl = pickValue(row, [
            'inVehicleProof',
            'inVehiclePic',
            'inVehicleMtrPic',
            'inVehicleMtrPicTicketPic',
            'inVehicleMeterPic',
            'ticketPic',
            'ticketUrl',
            'mapLink',
          ]) || fmsSheetRow.inProofUrl;
          const outProofUrl = pickValue(row, [
            'outVehicleProof',
            'outVehiclePic',
            'outVehicleMtrPic',
            'outVehicleMeterPic',
            'vehicleMtrPic',
            'vehicleMtrPicTicketPic',
          ]) || fmsSheetRow.outProofUrl;

          return {
            id: `visit-${index}`,
            source: 'FMS',
            serialNo: pickValue(row, ['serialNo', 'Serial No']) || fmsSheetRow.serialNo || `VIS-${String(index + 1).padStart(3, '0')}`,
            employeeName: String(row.personName || '').trim(),
            date: formatDateValue(dateSource),
            dateObj: dateMeta.dateObj,
            month: dateMeta.month,
            year: dateMeta.year,
            from: pickValue(row, ['from', 'From']),
            to: pickValue(row, ['to', 'To']),
            inTime: formatTimeValue(pickValue(row, ['inTime', 'Timestamp'])),
            outTime: formatTimeValue(pickValue(row, ['outTime', 'Actual'])),
            vehicleType,
            totalRunningKm,
            kmRate: getVehicleKmRate(vehicleType),
            inVehicleAmount: calculatedAmount,
            outVehicleAmount: '',
            totalAmount: calculatedAmount,
            remarks: pickValue(row, ['remarks', 'Remarks']),
            proofLinks: buildUrlLinks([
              { label: 'IN Proof', url: inProofUrl },
              { label: 'OUT Proof', url: outProofUrl },
            ]),
          };
        });

      const travelling = (result.travelling || [])
        .filter((row) => String(row?.personName || '').trim())
        .map((row, index) => {
          const dateMeta = getMonthYear(row.dateTime);
          const advanceAmount = parseNumber(row.advanceAmount);

          return {
            id: `travel-${index}`,
            source: 'Travelling',
            serialNo: `TA-${String(index + 1).padStart(3, '0')}`,
            employeeName: String(row.personName || '').trim(),
            date: formatDateValue(row.dateTime),
            dateObj: dateMeta.dateObj,
            month: dateMeta.month,
            year: dateMeta.year,
            from: row.fromLocation || '',
            to: row.toLocation || '',
            inTime: formatTimeValue(row.dateTime),
            outTime: '-',
            vehicleType: row.vehicleType || '',
            stayDay: parseNumber(row.stayDay),
            advanceAmount,
            totalAmount: advanceAmount,
            proofLinks: buildUrlLinks([
              { label: 'Stay Bill', url: row.stayBillImage },
              { label: 'Food Bill', url: row.foodingBillImage },
              { label: 'Receipt', url: row.travelReceipt },
            ]),
          };
        });

      const rawAdvanceRowsValue = result.advance || result.Advance || result.advances || result.advanceData || result.advanceRows || [];
      let rawAdvanceRows = Array.isArray(rawAdvanceRowsValue) ? rawAdvanceRowsValue : [];
      if (rawAdvanceRows.length === 0) {
        rawAdvanceRows = await fetchAdvanceRowsFromSheet();
      }

      const advances = rawAdvanceRows
        .map(normalizeAdvanceRow)
        .filter((row) => {
          const personName = String(pickValue(row, ['personName', 'Person Name', 'employeeName', 'Employee Name']) || '').trim();
          return personName && personName.toLowerCase() !== 'person name';
        })
        .map((row, index) => {
          const employeeName = String(pickValue(row, ['personName', 'Person Name', 'employeeName', 'Employee Name']) || '').trim();
          const timestamp = pickValue(row, ['timestamp', 'Timestamp']);
          const startDate = pickValue(row, ['startDate', 'Start Date', 'fromDate']);
          const endDate = pickValue(row, ['endDate', 'End Date', 'toDate']);
          const planned = pickValue(row, ['planned', 'Planned']);
          const actual = pickValue(row, ['actual', 'Actual']);
          const dateSource = startDate || timestamp || planned || actual;
          const dateMeta = getMonthYear(dateSource);
          const advanceAmount = parseNumber(pickValue(row, ['advance', 'Advance', 'advanceAmount', 'Advance Amount']));

          return {
            id: `advance-${index}`,
            source: 'Advance',
            serialNo: pickValue(row, ['serialNo', 'Serial No', 'serial']) || `AD-${String(index + 1).padStart(3, '0')}`,
            employeeName,
            date: formatDateValue(dateSource),
            dateObj: dateMeta.dateObj,
            month: dateMeta.month,
            year: dateMeta.year,
            from: pickValue(row, ['fromLocation', 'From Location', 'from', 'From']),
            to: pickValue(row, ['toLocation', 'To Location', 'to', 'To']),
            inTime: formatTimeValue(timestamp),
            outTime: '-',
            vehicleType: pickValue(row, ['travelType', 'Travel Type', 'vehicleType']),
            startDate: formatDateValue(startDate),
            endDate: formatDateValue(endDate),
            plannedDate: formatDateValue(planned),
            actualDate: formatDateValue(actual),
            delay: pickValue(row, ['delay', 'Delay']),
            companyName: pickValue(row, ['companyName', 'Company Name', 'Compnay Name', 'company']),
            status: pickValue(row, ['status', 'Status']),
            approvedBy: pickValue(row, ['approvedBy', 'Approved by', 'Approved By']),
            remarks: pickValue(row, ['remarks', 'Remarks', 'Reamakrs', 'Reamarks']),
            remarks1: pickValue(row, ['remarks1', 'Remarks1', 'Remarks 1']),
            advanceAmount,
            totalAmount: advanceAmount,
            proofLinks: [],
          };
        });

      setVisitRows(visits.sort((a, b) => (b.dateObj || 0) - (a.dateObj || 0)));
      setTravellingRows(travelling.sort((a, b) => (b.dateObj || 0) - (a.dateObj || 0)));
      setAdvanceRows(advances.sort((a, b) => (b.dateObj || 0) - (a.dateObj || 0)));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaDaData();
  }, []);

  const allRows = useMemo(() => [...visitRows, ...travellingRows, ...advanceRows], [visitRows, travellingRows, advanceRows]);
  const activeRows = activeTab === 'fms'
    ? visitRows
    : activeTab === 'travelling'
      ? travellingRows
      : advanceRows;

  const employeeOptions = useMemo(
    () => [...new Set(allRows.map((item) => item.employeeName).filter(Boolean))].sort(),
    [allRows]
  );
  const monthOptions = useMemo(
    () => [...new Set(allRows.map((item) => item.month).filter(Boolean))]
      .sort((a, b) => MONTHS.indexOf(a) - MONTHS.indexOf(b)),
    [allRows]
  );
  const yearOptions = useMemo(
    () => [...new Set(allRows.map((item) => item.year).filter(Boolean))].sort(),
    [allRows]
  );

  const matchesFilters = (item, useEmployeeFilter = true) => {
    const search = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm ||
      item.serialNo.toLowerCase().includes(search) ||
      item.employeeName.toLowerCase().includes(search) ||
      item.from.toLowerCase().includes(search) ||
      item.to.toLowerCase().includes(search) ||
      item.vehicleType.toLowerCase().includes(search) ||
      (item.companyName || '').toLowerCase().includes(search) ||
      (item.status || '').toLowerCase().includes(search) ||
      (item.approvedBy || '').toLowerCase().includes(search) ||
      (item.remarks || '').toLowerCase().includes(search) ||
      item.date.toLowerCase().includes(search);

    return matchesSearch &&
      (!useEmployeeFilter || !employeeFilter || item.employeeName === employeeFilter) &&
      (!monthFilter || item.month === monthFilter) &&
      (!yearFilter || item.year === yearFilter);
  };

  const filteredRows = activeRows.filter((item) => matchesFilters(item));

  const summary = filteredRows.reduce((acc, item) => {
    acc.records += 1;
    acc.totalKm += item.totalRunningKm || 0;
    acc.totalAmount += item.totalAmount || 0;
    acc.stayDays += item.stayDay || 0;
    const status = String(item.status || '').toLowerCase();
    if (status.includes('approved')) acc.approved += 1;
    if (status.includes('rejected')) acc.rejected += 1;
    if (activeTab === 'advance' && !status.includes('approved') && !status.includes('rejected')) acc.pending += 1;
    return acc;
  }, { records: 0, totalKm: 0, totalAmount: 0, stayDays: 0, approved: 0, rejected: 0, pending: 0 });

  const downloadExcel = () => {
    const rows = filteredRows.map((item) => ({
      Source: item.source,
      'Serial No': item.serialNo,
      Date: item.date,
      'Employee Name': item.employeeName,
      From: item.from,
      To: item.to,
      'In Time': item.inTime,
      'Out Time': item.outTime,
      'Vehicle Type': item.vehicleType,
      'Start Date': item.startDate || '',
      'End Date': item.endDate || '',
      'Company Name': item.companyName || '',
      'Total Running KM': item.totalRunningKm || '',
      'Stay Days': item.stayDay || '',
      'In Vehicle Amount': item.inVehicleAmount || '',
      'Out Vehicle Amount': item.outVehicleAmount || '',
      'Advance Amount': item.advanceAmount || '',
      'Total Amount': item.totalAmount || '',
      Planned: item.plannedDate || '',
      Actual: item.actualDate || '',
      Delay: item.delay || '',
      Status: item.status || '',
      'Approved By': item.approvedBy || '',
      'Proof URLs': item.proofLinks.map((link) => `${link.label}: ${link.url}`).join(' | '),
      Remarks: item.remarks || '',
      Remarks1: item.remarks1 || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'TA DA');
    XLSX.writeFile(workbook, `ta_da_${activeTab}_${monthFilter || 'all'}_${yearFilter || 'all'}.xlsx`);
  };

  const buildFmsKmSummary = (rows, includeEmployee) => {
    const summaryMap = rows.reduce((acc, item) => {
      const monthName = item.month || 'No Month';
      const yearName = item.year || '';
      const key = includeEmployee
        ? `${item.employeeName}__${monthName}__${yearName}`
        : `${monthName}__${yearName}`;

      if (!acc[key]) {
        acc[key] = {
          employeeName: item.employeeName,
          monthName: yearName ? `${monthName} ${yearName}` : monthName,
          totalKm: 0,
        };
      }

      acc[key].totalKm += item.totalRunningKm || 0;
      acc[key].amount = (acc[key].amount || 0) + (item.totalAmount || 0);
      return acc;
    }, {});

    return Object.values(summaryMap)
      .sort((a, b) => {
        const employeeSort = includeEmployee ? a.employeeName.localeCompare(b.employeeName) : 0;
        if (employeeSort !== 0) return employeeSort;
        return a.monthName.localeCompare(b.monthName);
      })
      .map((item) => ({
        ...item,
        amount: item.amount || 0,
      }));
  };

  const downloadFmsKmPdf = (reportType) => {
    const isAllReport = reportType === 'all';
    if (!isAllReport && !employeeFilter) {
      alert('Individual PDF ke liye pehle employee select karein.');
      return;
    }

    const reportRows = visitRows
      .filter((item) => matchesFilters(item, !isAllReport))
      .sort((a, b) => {
        if (isAllReport) {
          const nameSort = a.employeeName.localeCompare(b.employeeName);
          if (nameSort !== 0) return nameSort;
        }
        return (a.dateObj || 0) - (b.dateObj || 0);
      });

    if (reportRows.length === 0) {
      alert('Selected filters ke liye FMS report data nahi mila.');
      return;
    }

    const dates = reportRows.map((item) => item.dateObj).filter(Boolean).sort((a, b) => a - b);
    const summaryRows = buildFmsKmSummary(reportRows, isAllReport);
    const totalKm = reportRows.reduce((sum, item) => sum + (item.totalRunningKm || 0), 0);
    const totalAmount = reportRows.reduce((sum, item) => sum + (item.totalAmount || 0), 0);
    const employeeLabel = isAllReport ? 'All Employees' : employeeFilter;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`TA & DA FMS ${isAllReport ? 'All' : 'Individual'} Report`, 14, 15);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Employee: ${employeeLabel}`, 14, 23);
    doc.text(`Month: ${monthFilter || 'All Months'}   Year: ${yearFilter || 'All Years'}   Rate: Bike Rs. ${BIKE_KM_RATE}/KM, Car Rs. ${CAR_KM_RATE}/KM`, 14, 29);
    doc.text(`Start Date: ${formatDateObj(dates[0])}   End Date: ${formatDateObj(dates[dates.length - 1])}`, 14, 35);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total KM: ${totalKm}   Amount: Rs. ${totalAmount}`, 14, 41);

    autoTable(doc, {
      head: [isAllReport ? ['Employee', 'Month Name', 'Total KM', 'Amount'] : ['Month Name', 'Total KM', 'Amount']],
      body: summaryRows.map((item) => (
        isAllReport
          ? [item.employeeName, item.monthName, item.totalKm, `Rs. ${item.amount}`]
          : [item.monthName, item.totalKm, `Rs. ${item.amount}`]
      )),
      startY: 48,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [49, 46, 129], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 247, 255] },
    });

    autoTable(doc, {
      head: [['Date', 'Name', 'Vehicle Type', 'From', 'To', 'Unique Number', 'Total KM', 'Amount']],
      body: reportRows.map((item) => [
        item.date,
        item.employeeName,
        item.vehicleType || '-',
        item.from || '-',
        item.to || '-',
        item.serialNo,
        item.totalRunningKm || 0,
        `Rs. ${item.totalAmount || 0}`,
      ]),
      startY: (doc.lastAutoTable?.finalY || 48) + 8,
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: [6, 182, 212], textColor: 20 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    doc.save(`ta_da_fms_${isAllReport ? 'all' : sanitizeFileName(employeeFilter)}_${sanitizeFileName(monthFilter)}_${sanitizeFileName(yearFilter)}.pdf`);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setEmployeeFilter('');
    setMonthFilter('');
    setYearFilter('');
  };

  return (
    <div className="space-y-5">
      <div className="overflow-visible rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-1 bg-gradient-to-r from-indigo-600 via-sky-500 to-emerald-500" />
        <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-indigo-600">Outstation FMS</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">TA & DA</h1>
            <p className="mt-1 text-sm font-medium text-slate-500">
              FMS sheet se travel, allowance aur proof URL data.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={fetchTaDaData}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            {activeTab === 'fms' ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setDownloadMenuOpen((open) => !open)}
                  disabled={filteredRows.length === 0 && visitRows.length === 0}
                  className="inline-flex items-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-100 transition hover:bg-navy-dark disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download size={17} />
                  Download Report
                  <ChevronDown size={16} />
                </button>

                {downloadMenuOpen && (
                  <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-sm shadow-xl">
                    <button
                      type="button"
                      onClick={() => {
                        setDownloadMenuOpen(false);
                        downloadExcel();
                      }}
                      disabled={filteredRows.length === 0}
                      className="block w-full px-4 py-2.5 text-left font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
                    >
                      Full Data Excel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDownloadMenuOpen(false);
                        downloadFmsKmPdf('individual');
                      }}
                      className="block w-full px-4 py-2.5 text-left font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Individual KM PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDownloadMenuOpen(false);
                        downloadFmsKmPdf('all');
                      }}
                      className="block w-full px-4 py-2.5 text-left font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      All Employees KM PDF
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={downloadExcel}
                disabled={filteredRows.length === 0}
                className="inline-flex items-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-100 transition hover:bg-navy-dark disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download size={17} />
                Download Excel
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-wide text-indigo-700">Records</p>
            <FileText size={18} className="text-indigo-500" />
          </div>
          <p className="mt-2 text-3xl font-black text-indigo-950">{summary.records}</p>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
              {activeTab === 'advance' ? 'Approved' : 'Running KM'}
            </p>
            <Route size={18} className="text-emerald-500" />
          </div>
          <p className="mt-2 text-3xl font-black text-emerald-950">
            {activeTab === 'advance' ? summary.approved : summary.totalKm}
          </p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-wide text-amber-700">Amount</p>
            <Wallet size={18} className="text-amber-500" />
          </div>
          <p className="mt-2 text-3xl font-black text-amber-950">Rs. {summary.totalAmount}</p>
        </div>
        <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-wide text-sky-700">
              {activeTab === 'advance' ? 'Pending' : 'Stay Days'}
            </p>
            <CalendarDays size={18} className="text-sky-500" />
          </div>
          <p className="mt-2 text-3xl font-black text-sky-950">
            {activeTab === 'advance' ? summary.pending : summary.stayDays}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 text-indigo-700">
              <Filter size={20} />
            </div>
            <div>
              <h2 className="text-base font-black uppercase tracking-wide text-slate-800">Filters</h2>
              <p className="text-xs font-semibold text-slate-400">Employee, month, year aur route search</p>
            </div>
          </div>
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-full border border-indigo-200 px-4 py-2 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50"
          >
            Clear filters
          </button>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr_0.75fr_0.65fr]">
          <label className="relative block">
            <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by employee, route, date, vehicle..."
              className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-12 pr-4 text-sm font-semibold text-slate-700 outline-none transition hover:border-slate-400 focus:border-navy focus:ring-4 focus:ring-indigo-100"
            />
          </label>

          <label className="relative block">
            <User size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={employeeFilter}
              onChange={(event) => setEmployeeFilter(event.target.value)}
              className="h-12 w-full appearance-none rounded-xl border border-slate-300 bg-white pl-12 pr-10 text-sm font-semibold text-slate-700 outline-none transition hover:border-slate-400 focus:border-navy focus:ring-4 focus:ring-indigo-100"
            >
              <option value="">All Employees</option>
              {employeeOptions.map((employee) => (
                <option key={employee} value={employee}>{employee}</option>
              ))}
            </select>
            <ChevronDown size={17} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
          </label>

          <label className="relative block">
            <CalendarDays size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={monthFilter}
              onChange={(event) => setMonthFilter(event.target.value)}
              className="h-12 w-full appearance-none rounded-xl border border-slate-300 bg-white pl-12 pr-10 text-sm font-semibold text-slate-700 outline-none transition hover:border-slate-400 focus:border-navy focus:ring-4 focus:ring-indigo-100"
            >
              <option value="">All Months</option>
              {monthOptions.map((month) => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
            <ChevronDown size={17} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
          </label>

          <label className="relative block">
            <CalendarDays size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={yearFilter}
              onChange={(event) => setYearFilter(event.target.value)}
              className="h-12 w-full appearance-none rounded-xl border border-slate-300 bg-white pl-12 pr-10 text-sm font-semibold text-slate-700 outline-none transition hover:border-slate-400 focus:border-navy focus:ring-4 focus:ring-indigo-100"
            >
              <option value="">All Years</option>
              {yearOptions.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <ChevronDown size={17} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
          </label>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setActiveTab('fms')}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-black transition ${activeTab === 'fms' ? 'bg-navy text-white shadow-sm' : 'text-slate-600 hover:bg-white'}`}
            >
              <Car size={16} />
              FMS Travel IN/OUT
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('travelling')}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-black transition ${activeTab === 'travelling' ? 'bg-navy text-white shadow-sm' : 'text-slate-600 hover:bg-white'}`}
            >
              <FileText size={16} />
              TA/DA Bills
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('advance')}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-black transition ${activeTab === 'advance' ? 'bg-navy text-white shadow-sm' : 'text-slate-600 hover:bg-white'}`}
            >
              <Wallet size={16} />
              Advance
            </button>
          </div>
          <p className="text-sm font-semibold text-slate-500">{filteredRows.length} records shown</p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="mb-3 h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
            <p className="text-sm font-bold text-slate-500">Loading TA/DA data...</p>
          </div>
        ) : error ? (
          <div className="m-4 rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center">
            <p className="text-sm font-bold text-rose-700">Error: {error}</p>
            <button
              type="button"
              onClick={fetchTaDaData}
              className="mt-3 rounded-xl bg-navy px-4 py-2 text-sm font-bold text-white transition hover:bg-navy-dark"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto p-4">
            {activeTab === 'advance' ? (
              <table className="min-w-[1380px] w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3 font-black">Start / End</th>
                    <th className="px-4 py-3 font-black">Employee</th>
                    <th className="px-4 py-3 font-black">Route</th>
                    <th className="px-4 py-3 font-black">Travel Type</th>
                    <th className="px-4 py-3 font-black">Advance</th>
                    <th className="px-4 py-3 font-black">Company</th>
                    <th className="px-4 py-3 font-black">Status</th>
                    <th className="px-4 py-3 font-black">Planned / Actual</th>
                    <th className="px-4 py-3 font-black">Approved By</th>
                    <th className="px-4 py-3 font-black">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="px-4 py-12 text-center text-sm font-semibold text-slate-400">
                        No advance records found.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((item) => (
                      <tr key={item.id} className="transition hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-800">{item.startDate || item.date}</p>
                          <p className="text-xs font-semibold text-slate-400">{item.endDate || '-'} - {item.serialNo}</p>
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-800">{item.employeeName}</td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-700">{item.from || '-'}</p>
                          <p className="text-xs font-semibold text-slate-400">to {item.to || '-'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                            {item.vehicleType || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-black text-slate-900">Rs. {item.advanceAmount || 0}</td>
                        <td className="px-4 py-3 font-medium text-slate-600 max-w-[190px] truncate" title={item.companyName || ''}>
                          {item.companyName || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${getStatusClass(item.status)}`}>
                            {item.status || 'Pending'}
                          </span>
                          {item.delay ? <p className="mt-1 text-xs font-semibold text-slate-400">Delay: {item.delay}</p> : null}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-700">{item.plannedDate || '-'}</p>
                          <p className="text-xs font-semibold text-slate-400">Actual: {item.actualDate || '-'}</p>
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-600">{item.approvedBy || '-'}</td>
                        <td className="px-4 py-3 max-w-[260px]">
                          <p className="truncate font-medium text-slate-600" title={item.remarks || ''}>{item.remarks || '-'}</p>
                          {item.remarks1 ? (
                            <p className="mt-1 truncate text-xs font-semibold text-slate-400" title={item.remarks1}>{item.remarks1}</p>
                          ) : null}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : (
              <table className="min-w-[1120px] w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3 font-black">Date</th>
                    <th className="px-4 py-3 font-black">Employee</th>
                    <th className="px-4 py-3 font-black">From</th>
                    <th className="px-4 py-3 font-black">To</th>
                    <th className="px-4 py-3 font-black">Vehicle</th>
                    <th className="px-4 py-3 font-black">KM/Stay</th>
                    <th className="px-4 py-3 font-black">Amount</th>
                    <th className="px-4 py-3 font-black">Proof URLs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-4 py-12 text-center text-sm font-semibold text-slate-400">
                        No TA/DA records found.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((item) => (
                      <tr key={item.id} className="transition hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-800">{item.date}</p>
                          <p className="text-xs font-semibold text-slate-400">{item.serialNo}</p>
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-800">{item.employeeName}</td>
                        <td className="px-4 py-3 font-medium text-slate-600">{item.from || '-'}</td>
                        <td className="px-4 py-3 font-medium text-slate-600">{item.to || '-'}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                            {item.vehicleType || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-700">
                          {activeTab === 'fms' ? `${item.totalRunningKm || 0} KM` : `${item.stayDay || 0} day`}
                        </td>
                        <td className="px-4 py-3 font-black text-slate-900">Rs. {item.totalAmount || 0}</td>
                        <td className="px-4 py-3">
                          {item.proofLinks.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {item.proofLinks.map((link) => (
                                <ProofLink key={`${item.id}-${link.label}`} url={link.url} label={link.label} />
                              ))}
                            </div>
                          ) : (
                            <ProofLink />
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TaDa;
