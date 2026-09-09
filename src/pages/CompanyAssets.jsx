import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Package,
  Plus,
  X,
  Upload,
  RefreshCw,
  Search,
  CheckCircle2,
  Undo2,
  Loader2,
  ImageIcon,
  Calendar,
  User,
} from "lucide-react";
import toast from "react-hot-toast";
import { getUserRole } from "../utils/authRole";

const OUTSTATION_SCRIPT_URL = import.meta.env.VITE_OUTSTATION_SHEET_URL;
const OUTSTATION_SPREADSHEET_ID = "1WTT8ZQhtf1yeSChNn2uJeW5Tz2TvYjQLrxhTx5l4Fgw";
const COMPANY_ASSETS_SHEET_NAME = "Company Assests";
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

const normalize = (value) => String(value || "").trim().toLowerCase();

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
};

const getCurrentUserName = (user = {}) =>
  String(
    user["Employee Name"] ||
      user["Person Name"] ||
      user["Sales Person Name"] ||
      user.Name ||
      user.name ||
      user["User Name"] ||
      user.Username ||
      user.username ||
      ""
  ).trim();

const formatDateTime = (date) => {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");
  return `${day}/${month}/${year} ${hour}:${minute}:${second}`;
};

const parseGoogleSheetTable = (text) => {
  const jsonStart = text.indexOf("{");
  const jsonEnd = text.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
    throw new Error("Invalid Company Assets response");
  }
  const payload = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
  return (payload.table?.rows || []).map((row) =>
    (row.c || []).map((cell) => {
      if (!cell) return "";
      return cell.f ?? cell.v ?? "";
    })
  );
};

// Split a stored image cell (comma / newline separated URLs) into an array.
const splitImages = (value) =>
  String(value || "")
    .split(/[\n,]+/)
    .map((url) => url.trim())
    .filter(Boolean);

const optimizeImageUrl = (url, size = 400) => {
  if (!url) return url;
  if (url.includes("cloudinary.com")) {
    return url.replace("/upload/", `/upload/w_${size},q_auto,f_auto/`);
  }
  return url;
};

const uploadToCloudinary = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData }
  );
  const data = await res.json();
  if (!data.secure_url) throw new Error("Image upload failed");
  return data.secure_url;
};

const uploadAllImages = async (files = []) => {
  const urls = [];
  for (const file of files) {
    // Sequential upload keeps memory low and order stable on mobile.
    // eslint-disable-next-line no-await-in-loop
    urls.push(await uploadToCloudinary(file));
  }
  return urls;
};

const emptyEntryForm = { employeeName: "", product: "", reason: "", remark: "" };

const CompanyAssets = () => {
  const currentUser = useMemo(() => getStoredUser(), []);
  const isAdmin = useMemo(() => getUserRole(currentUser) === "admin", [currentUser]);
  const currentEmployeeName = useMemo(() => getCurrentUserName(currentUser), [currentUser]);

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(emptyEntryForm);
  const [addFiles, setAddFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const addFileRef = useRef(null);

  const [returnEntry, setReturnEntry] = useState(null);
  const [returnRemark, setReturnRemark] = useState("");
  const [returnFiles, setReturnFiles] = useState([]);
  const [returning, setReturning] = useState(false);
  const returnFileRef = useRef(null);

  const [previewImages, setPreviewImages] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const fetchEntries = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const url = `https://docs.google.com/spreadsheets/d/${OUTSTATION_SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
        COMPANY_ASSETS_SHEET_NAME
      )}&headers=0&cb=${Date.now()}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const rows = parseGoogleSheetTable(await response.text());

      // headers=0 keeps the header as row[0] (sheet row 1); data starts at row[1].
      // So sheet rowIndex for slice(1) item = arrayIndex + 2 (matches Apps Script update contract).
      const parsed = rows
        .slice(1)
        .map((row, idx) => ({
          rowIndex: idx + 2,
          timestamp: row[0] || "",
          employeeName: row[1] || "",
          product: row[2] || "",
          reason: row[3] || "",
          remark: row[4] || "",
          images: row[5] || "",
          returnDate: row[6] || "",
          returnImages: row[7] || "",
          returnRemark: row[8] || "",
        }))
        .filter((item) => item.employeeName || item.product)
        .reverse();

      setEntries(parsed);
    } catch (err) {
      console.error("Company Assets fetch error:", err);
      setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const filteredEntries = useMemo(() => {
    // Employees only see their own entries; admin sees everyone's data.
    const scoped = isAdmin
      ? entries
      : entries.filter((item) => normalize(item.employeeName) === normalize(currentEmployeeName));
    const search = normalize(searchTerm);
    if (!search) return scoped;
    return scoped.filter((item) =>
      [item.employeeName, item.product, item.reason, item.remark, item.returnRemark]
        .join(" ")
        .toLowerCase()
        .includes(search)
    );
  }, [entries, searchTerm, isAdmin, currentEmployeeName]);

  const postToSheet = async (payload) => {
    if (!OUTSTATION_SCRIPT_URL) throw new Error("VITE_OUTSTATION_SHEET_URL missing hai");
    try {
      await fetch(OUTSTATION_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        body: new URLSearchParams({
          sheetName: COMPANY_ASSETS_SHEET_NAME,
          ...payload,
        }),
      });
    } catch (err) {
      // no-cors gives an opaque response; network errors are logged and UI is updated optimistically.
      console.warn("Company Assets post (no-cors) network note:", err);
    }
  };

  const resetAddForm = () => {
    setAddForm(emptyEntryForm);
    setAddFiles([]);
    if (addFileRef.current) addFileRef.current.value = "";
  };

  const openAdd = () => {
    // Employees can only file under their own name; admin can enter any name.
    setAddForm({ ...emptyEntryForm, employeeName: isAdmin ? "" : currentEmployeeName });
    setAddFiles([]);
    if (addFileRef.current) addFileRef.current.value = "";
    setAddOpen(true);
  };

  const handleAddSubmit = async () => {
    if (saving) return;
    if (!addForm.employeeName.trim()) {
      toast.error("Employee Name daalein.");
      return;
    }
    if (!addForm.product.trim()) {
      toast.error("Product daalein.");
      return;
    }
    if (!navigator.onLine) {
      toast.error("Internet connection check karein.");
      return;
    }

    setSaving(true);
    const toastId = toast.loading("Saving entry...");
    try {
      const imageUrls = addFiles.length ? await uploadAllImages(addFiles) : [];
      const timestamp = formatDateTime(new Date());
      const rowData = [
        timestamp,
        addForm.employeeName.trim(),
        addForm.product.trim(),
        addForm.reason.trim(),
        addForm.remark.trim(),
        imageUrls.join(", "),
        "",
        "",
        "",
      ];

      await postToSheet({ action: "insert", rowData: JSON.stringify(rowData) });

      toast.success("Entry saved", { id: toastId });
      setAddOpen(false);
      resetAddForm();
      // Give Sheets a moment to sync, then refresh from source.
      window.setTimeout(() => fetchEntries({ silent: true }), 1500);
    } catch (err) {
      console.error("Company Assets add error:", err);
      toast.error(err.message || "Entry save failed", { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  const openReturn = (entry) => {
    setReturnEntry(entry);
    setReturnRemark("");
    setReturnFiles([]);
    if (returnFileRef.current) returnFileRef.current.value = "";
  };

  const handleReturnSubmit = async () => {
    if (returning || !returnEntry) return;
    if (!navigator.onLine) {
      toast.error("Internet connection check karein.");
      return;
    }

    setReturning(true);
    const toastId = toast.loading("Updating return...");
    try {
      const returnImageUrls = returnFiles.length ? await uploadAllImages(returnFiles) : [];
      const returnDate = formatDateTime(new Date());
      const rowData = [
        returnEntry.timestamp,
        returnEntry.employeeName,
        returnEntry.product,
        returnEntry.reason,
        returnEntry.remark,
        returnEntry.images,
        returnDate,
        returnImageUrls.join(", "),
        returnRemark.trim(),
      ];

      await postToSheet({
        action: "update",
        rowIndex: String(returnEntry.rowIndex),
        rowData: JSON.stringify(rowData),
      });

      toast.success("Return updated", { id: toastId });
      setReturnEntry(null);
      window.setTimeout(() => fetchEntries({ silent: true }), 1500);
    } catch (err) {
      console.error("Company Assets return error:", err);
      toast.error(err.message || "Return update failed", { id: toastId });
    } finally {
      setReturning(false);
    }
  };

  const ImageThumbs = ({ value }) => {
    const urls = splitImages(value);
    if (!urls.length) return <span className="text-slate-400">-</span>;
    return (
      <div className="flex flex-wrap gap-1.5">
        {urls.map((url, idx) => (
          <button
            key={`${url}-${idx}`}
            type="button"
            onClick={() => setPreviewImages(urls)}
            className="h-11 w-11 overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
            title="View image"
          >
            <img src={optimizeImageUrl(url, 120)} alt="asset" loading="lazy" className="h-full w-full object-cover" />
          </button>
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
              <Package size={22} />
            </span>
            <div>
              <h1 className="text-xl font-black tracking-tight sm:text-2xl">Company Assets</h1>
              <p className="mt-1 text-sm font-medium text-teal-100">
                {filteredEntries.length} entries • products issued to employees
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => fetchEntries()}
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-sm font-bold text-white ring-1 ring-white/20 transition hover:bg-white/25"
            >
              <RefreshCw size={17} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
            <button
              onClick={openAdd}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-teal-700 shadow-md transition hover:bg-teal-50"
            >
              <Plus size={18} /> Add Entry
            </button>
          </div>
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
            placeholder="Search by employee, product, reason..."
            className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-4 text-sm font-semibold text-slate-700 outline-none transition hover:border-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          />
        </div>
      </div>

      {/* List */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="mb-3 h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
            <span className="text-sm font-semibold text-slate-500">Loading company assets...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 py-16">
            <p className="text-sm font-bold text-rose-600">Error: {error}</p>
            <button onClick={() => fetchEntries()} className="mt-3 rounded-xl bg-teal-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-teal-700">Retry</button>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="py-16 text-center text-sm font-semibold text-slate-500">No company asset entries found.</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50/90">
                <tr>
                  {["Date", "Employee", "Product", "Reason", "Remark", "Images", "Status", "Return Date", "Return Images", "Return Remark", "Action"].map((h) => (
                    <th key={h} className="whitespace-nowrap px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredEntries.map((entry) => {
                  const isReturned = Boolean(String(entry.returnDate || "").trim());
                  return (
                    <tr key={`${entry.rowIndex}-${entry.timestamp}`} className="align-top transition hover:bg-slate-50">
                      <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-700">{entry.timestamp || "-"}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-bold text-slate-800">{entry.employeeName || "-"}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">{entry.product || "-"}</td>
                      <td className="max-w-[160px] px-4 py-3 text-slate-600">{entry.reason || "-"}</td>
                      <td className="max-w-[160px] px-4 py-3 text-slate-600">{entry.remark || "-"}</td>
                      <td className="px-4 py-3"><ImageThumbs value={entry.images} /></td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {isReturned ? (
                          <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700"><CheckCircle2 size={12} /> Returned</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">Issued</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{entry.returnDate || "-"}</td>
                      <td className="px-4 py-3"><ImageThumbs value={entry.returnImages} /></td>
                      <td className="max-w-[160px] px-4 py-3 text-slate-600">{entry.returnRemark || "-"}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {isReturned ? (
                          <span className="text-xs font-semibold text-slate-400">Completed</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openReturn(entry)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-teal-700"
                          >
                            <Undo2 size={13} /> Mark Return
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Entry Modal */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-black text-slate-900">Add Asset Entry</h2>
                <p className="mt-0.5 text-sm text-slate-500">Employee ko diya gaya product record karein.</p>
              </div>
              <button onClick={() => { setAddOpen(false); resetAddForm(); }} className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"><X size={22} /></button>
            </div>
            <div className="max-h-[70vh] space-y-4 overflow-y-auto px-6 py-5">
              <div>
                <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Employee Name *</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={addForm.employeeName}
                    onChange={(e) => setAddForm((f) => ({ ...f, employeeName: e.target.value }))}
                    readOnly={!isAdmin}
                    className={`h-11 w-full rounded-lg border border-slate-300 pl-9 pr-3 text-sm font-semibold text-slate-700 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 ${isAdmin ? "bg-white" : "bg-slate-100 cursor-not-allowed"}`}
                    placeholder="Employee ka naam"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Product *</label>
                <input value={addForm.product} onChange={(e) => setAddForm((f) => ({ ...f, product: e.target.value }))} className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" placeholder="e.g. Laptop, Mobile" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Reason</label>
                <input value={addForm.reason} onChange={(e) => setAddForm((f) => ({ ...f, reason: e.target.value }))} className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" placeholder="Kis kaam ke liye" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Remark</label>
                <textarea value={addForm.remark} onChange={(e) => setAddForm((f) => ({ ...f, remark: e.target.value }))} rows={2} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" placeholder="Condition / notes" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Product Images (multiple)</label>
                <input ref={addFileRef} type="file" accept="image/*" multiple onChange={(e) => setAddFiles(Array.from(e.target.files || []))} className="hidden" />
                <button type="button" onClick={() => addFileRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 py-3 text-sm font-bold text-slate-600 transition hover:border-teal-400 hover:bg-teal-50">
                  <Upload size={16} /> {addFiles.length ? `${addFiles.length} image(s) selected` : "Choose images"}
                </button>
                {addFiles.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {addFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                        <ImageIcon size={12} /> <span className="max-w-[120px] truncate">{file.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
              <button onClick={() => { setAddOpen(false); resetAddForm(); }} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">Cancel</button>
              <button onClick={handleAddSubmit} disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-5 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-60">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Save Entry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Modal */}
      {returnEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-black text-slate-900">Mark Return</h2>
                <p className="mt-0.5 text-sm text-slate-500">{returnEntry.employeeName} • {returnEntry.product}</p>
              </div>
              <button onClick={() => setReturnEntry(null)} className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"><X size={22} /></button>
            </div>
            <div className="max-h-[70vh] space-y-4 overflow-y-auto px-6 py-5">
              <div className="flex items-center gap-2 rounded-lg bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-700">
                <Calendar size={14} /> Return date abhi ka time save hoga.
              </div>
              <div>
                <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Return Remark</label>
                <textarea value={returnRemark} onChange={(e) => setReturnRemark(e.target.value)} rows={2} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" placeholder="Return ke waqt condition / notes" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Return Images (multiple)</label>
                <input ref={returnFileRef} type="file" accept="image/*" multiple onChange={(e) => setReturnFiles(Array.from(e.target.files || []))} className="hidden" />
                <button type="button" onClick={() => returnFileRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 py-3 text-sm font-bold text-slate-600 transition hover:border-teal-400 hover:bg-teal-50">
                  <Upload size={16} /> {returnFiles.length ? `${returnFiles.length} image(s) selected` : "Choose images"}
                </button>
                {returnFiles.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {returnFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                        <ImageIcon size={12} /> <span className="max-w-[120px] truncate">{file.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
              <button onClick={() => setReturnEntry(null)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">Cancel</button>
              <button onClick={handleReturnSubmit} disabled={returning} className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-5 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-60">
                {returning ? <Loader2 size={16} className="animate-spin" /> : <Undo2 size={16} />} Update Return
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image preview lightbox */}
      {previewImages && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 p-4" onClick={() => setPreviewImages(null)}>
          <button className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" onClick={() => setPreviewImages(null)}><X size={22} /></button>
          <div className="flex max-h-[85vh] max-w-4xl flex-wrap justify-center gap-3 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {previewImages.map((url, idx) => (
              <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                <img src={optimizeImageUrl(url, 900)} alt="asset" className="max-h-[80vh] max-w-full rounded-xl object-contain" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyAssets;
