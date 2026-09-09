import React, { useEffect, useMemo, useState } from "react";
import { LogOut, RefreshCw, Search, CheckCircle2, Phone, Package } from "lucide-react";

const LEAVING_SHEET_URL = import.meta.env.VITE_LEAVING_SHEET_URL;
const EXIT_SHEET_NAME = "FMS";

// Column indexes in the HR EMPLOYEE EXIT FMS "FMS" sheet.
const COL = {
  id: 5, // F
  lastWorkingDay: 7, // H
  reason: 8, // I
  name: 10, // K
  designation: 11, // L
  mobile: 12, // M
  handover: 38, // AM - Handover Of Assets / Exit Checklist
  status: 42, // AQ
};

const normalize = (value) => String(value || "").trim().toLowerCase();

const formatDate = (value) => {
  if (!value) return "-";
  const raw = String(value);
  if (raw.includes("T")) {
    const date = new Date(raw);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata" });
    }
  }
  return raw;
};

const splitHandover = (value) =>
  String(value || "")
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);

const isEmployeeRow = (row) => {
  const id = String(row[COL.id] || "").trim();
  const name = String(row[COL.name] || "").trim();
  if (!id || !name) return false;
  if (/click here|exit process/i.test(id)) return false;
  if (/^canidate name$|^candidate name$/i.test(name)) return false;
  return true;
};

const ExitChecklist = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!LEAVING_SHEET_URL) throw new Error("VITE_LEAVING_SHEET_URL missing hai");
      const url = `${LEAVING_SHEET_URL}?action=fetch&sheet=${encodeURIComponent(EXIT_SHEET_NAME)}&_=${Date.now()}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      if (!result.success || !Array.isArray(result.data)) {
        throw new Error(result.error || result.message || "Failed to load exit data");
      }

      const parsed = result.data
        .filter(isEmployeeRow)
        .map((row) => ({
          id: String(row[COL.id] || "").trim(),
          name: String(row[COL.name] || "").trim(),
          designation: String(row[COL.designation] || "").trim(),
          mobile: String(row[COL.mobile] || "").trim(),
          lastWorkingDay: formatDate(row[COL.lastWorkingDay]),
          reason: String(row[COL.reason] || "").trim(),
          handover: splitHandover(row[COL.handover]),
          status: String(row[COL.status] || "").trim(),
        }))
        .reverse();

      setRows(parsed);
    } catch (err) {
      console.error("Exit checklist fetch error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredRows = useMemo(() => {
    const search = normalize(searchTerm);
    if (!search) return rows;
    return rows.filter((row) =>
      [row.name, row.id, row.designation, row.mobile, row.reason, row.handover.join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(search)
    );
  }, [rows, searchTerm]);

  const StatusBadge = ({ status }) => {
    const done = /done|complete/i.test(status);
    return (
      <span className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-bold ${done ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
        {done && <CheckCircle2 size={12} />} {status || "Pending"}
      </span>
    );
  };

  const HandoverChips = ({ items }) => {
    if (!items.length) return <span className="text-slate-400">-</span>;
    return (
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, idx) => (
          <span key={`${item}-${idx}`} className="inline-flex items-center gap-1 rounded-md border border-teal-200 bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-700">
            <Package size={11} /> {item}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-5 page-content p-4 sm:p-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 p-5 text-white shadow-lg sm:p-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/20">
              <LogOut size={22} />
            </span>
            <div>
              <h1 className="text-xl font-black tracking-tight sm:text-2xl">Exit Checklist</h1>
              <p className="mt-1 text-sm font-medium text-teal-100">
                {filteredRows.length} exit records • assets & items handed over
              </p>
            </div>
          </div>
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-sm font-bold text-white ring-1 ring-white/20 transition hover:bg-white/25"
          >
            <RefreshCw size={17} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, ID, designation..."
            className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-4 text-sm font-semibold text-slate-700 outline-none transition hover:border-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          />
        </div>
      </div>

      {/* List */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="mb-3 h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
            <span className="text-sm font-semibold text-slate-500">Loading exit checklist...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 py-16">
            <p className="text-sm font-bold text-rose-600">Error: {error}</p>
            <button onClick={fetchData} className="mt-3 rounded-xl bg-teal-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-teal-700">Retry</button>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="py-16 text-center text-sm font-semibold text-slate-500">No exit records found.</div>
        ) : (
          <>
          {/* Mobile card view */}
          <div className="space-y-3 md:hidden">
            {filteredRows.map((row) => (
              <div key={`m-${row.id}-${row.name}`} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-900">{row.name}</p>
                    <p className="truncate text-xs font-semibold text-slate-500">{row.designation || "-"} • {row.id}</p>
                  </div>
                  <StatusBadge status={row.status} />
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-semibold text-slate-500">
                  {row.mobile && <span className="inline-flex items-center gap-1"><Phone size={11} />{row.mobile}</span>}
                  <span>Last Working: {row.lastWorkingDay}</span>
                </div>
                {row.reason && <p className="mt-1 text-xs text-slate-600"><span className="font-bold text-slate-500">Reason: </span>{row.reason}</p>}
                <div className="mt-2">
                  <p className="mb-1 text-[10px] font-black uppercase tracking-wide text-slate-400">Handover Of Assets</p>
                  <HandoverChips items={row.handover} />
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table view */}
          <div className="hidden overflow-x-auto rounded-xl border border-slate-200 md:block">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50/90">
                <tr>
                  {["Employee", "ID", "Designation", "Mobile", "Last Working Day", "Reason", "Handover Of Assets", "Status"].map((h) => (
                    <th key={h} className="whitespace-nowrap px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredRows.map((row) => (
                  <tr key={`${row.id}-${row.name}`} className="align-top transition hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 font-bold text-slate-800">{row.name}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{row.id}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">{row.designation || "-"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{row.mobile || "-"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{row.lastWorkingDay}</td>
                    <td className="max-w-[180px] px-4 py-3 text-slate-600">{row.reason || "-"}</td>
                    <td className="px-4 py-3"><HandoverChips items={row.handover} /></td>
                    <td className="whitespace-nowrap px-4 py-3"><StatusBadge status={row.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ExitChecklist;
