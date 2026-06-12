import React, { useEffect, useMemo, useState } from "react";
import {
  Edit,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  Megaphone,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

const SCRIPT_URL = import.meta.env.VITE_GOOGLE_SHEET_URL;
const SHEET_NAME = "Onboard and Status";

const emptyForm = {
  date: "",
  image: "",
  imageFile: null,
  sms: "",
  smsType: "New Joining",
  name: "",
  designation: "",
};

const uploadFile = async (file) => {
  if (!file) return "";
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const base64Data = e.target.result;
        const response = await fetch(SCRIPT_URL, {
          method: "POST",
          body: new URLSearchParams({
            action: "uploadFile",
            base64Data: base64Data,
            fileName: file.name,
            mimeType: file.type,
            folderId: '1Mu3MgyDhc-kM2UesunFRJxLo1sPYOQvdZa1cyKX8yvhPfiz5ssUDxIofM_MAIjlggXAOR4P9', // Uses candidate photo folder as generic image folder
          }),
        });
        const result = await response.json();
        resolve(result.success ? result.fileUrl : "");
      } catch (error) {
        console.error("Upload error:", error);
        resolve("");
      }
    };
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
};

const parseGoogleSheetTable = (text, sheetLabel = "sheet") => {
  const jsonStart = text.indexOf("{");
  const jsonEnd = text.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
    throw new Error(`Invalid ${sheetLabel} response`);
  }

  const payload = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
  if (payload.status && payload.status !== "ok") {
    throw new Error(payload.errors?.[0]?.detailed_message || `Failed to read ${sheetLabel}`);
  }

  return (payload.table?.rows || []).map((row) =>
    (row.c || []).map((cell) => {
      if (!cell) return "";
      return cell.f ?? cell.v ?? "";
    })
  );
};

const fetchRows = async () => {
  try {
    const cb = `&_=${Date.now()}`;
    const response = await fetch(`${SCRIPT_URL}?sheet=${encodeURIComponent(SHEET_NAME)}&action=fetch${cb}`);
    if (!response.ok) throw new Error("Network error while fetching feed");
    const json = await response.json();
    if (!json.success) throw new Error(json.error || "Failed to fetch feed");

    const rawRows = json.data || [];
    if (rawRows.length <= 1) return [];

    // Skip header row
    return rawRows.slice(1).map((row, index) => ({
      rowIndex: index + 2,
      date: row[0] || "",
      image: row[1] || "",
      sms: row[2] || "",
      smsType: row[3] || "",
      name: row[4] || "",
      designation: row[5] || "",
      raw: row,
    })).filter(row => row.smsType);
  } catch (error) {
    console.error("Feed fetch error fallback to GViz", error);
    // If standard fetch fails, it might need specific handling or gviz
    return [];
  }
};

const formToRow = (form) => {
  return [form.date, form.image, form.sms, form.smsType, form.name, form.designation];
};

const FeedManagement = () => {
  const [rows, setRows] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState("add");
  const [form, setForm] = useState(emptyForm);
  const [editingRow, setEditingRow] = useState(null);
  const [deleteRow, setDeleteRow] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const cb = `&_=${Date.now()}`;
      const response = await fetch(`${SCRIPT_URL}?sheet=${encodeURIComponent(SHEET_NAME)}&action=fetch${cb}`);
      const json = await response.json();
      if (json.success) {
        const rawRows = json.data || [];
        if (rawRows.length > 1) {
          const parsed = rawRows.slice(1).map((row, index) => ({
            rowIndex: index + 2,
            date: row[0] || "",
            image: row[1] || "",
            sms: row[2] || "",
            smsType: row[3] || "",
            name: row[4] || "",
            designation: row[5] || "",
            raw: row,
          })).filter(row => row.smsType);
          setRows(parsed);
        } else {
          setRows([]);
        }
      }
    } catch (error) {
      console.error("Feed fetch error:", error);
      toast.error("Feed data fetch failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredRows = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    if (!search) return rows;
    return rows.filter((row) =>
      [row.date, row.sms, row.smsType]
        .join(" ")
        .toLowerCase()
        .includes(search)
    );
  }, [rows, searchTerm]);

  const openAddModal = () => {
    setMode("add");
    setEditingRow(null);
    setForm({
      date: new Date().toISOString().split("T")[0],
      image: "",
      imageFile: null,
      sms: "",
      smsType: "New Joining",
      name: "",
      designation: "",
    });
    setModalOpen(true);
  };

  const openEditModal = (row) => {
    setMode("edit");
    setEditingRow(row);
    setForm({
      date: row.date || "",
      image: row.image || "",
      imageFile: null,
      sms: row.sms || "",
      smsType: row.smsType || "New Joining",
      name: row.name || "",
      designation: row.designation || "",
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingRow(null);
    setForm(emptyForm);
  };

  const updateForm = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setForm((prev) => ({ ...prev, imageFile: file }));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      if (!form.sms.trim() || !form.smsType.trim()) {
        throw new Error("SMS and Type are required");
      }

      let finalImageUrl = form.image;
      if (form.imageFile) {
        toast.loading("Uploading image...", { id: "upload" });
        const uploadedUrl = await uploadFile(form.imageFile);
        toast.dismiss("upload");
        if (uploadedUrl) {
          finalImageUrl = uploadedUrl;
        } else {
          toast.error("Image upload failed, using previous or empty image");
        }
      }

      const rowData = [form.date, finalImageUrl, form.sms, form.smsType, form.name, form.designation];
      
      const payload = {
        sheetName: SHEET_NAME,
        action: mode === "add" ? "bulkInsert" : "update",
        rowsData: JSON.stringify([rowData]),
      };

      if (mode === "edit") {
        payload.rowIndex = editingRow.rowIndex;
      }

      const response = await fetch(SCRIPT_URL, {
        method: "POST",
        body: new URLSearchParams(payload),
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error || "Save failed");

      toast.success(mode === "add" ? "Feed added successfully" : "Feed updated successfully");
      loadData();
      closeModal();
    } catch (error) {
      console.error("Feed save error:", error);
      toast.error(error.message || "Save failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteRow) return;
    setSubmitting(true);

    try {
      const response = await fetch(SCRIPT_URL, {
        method: "POST",
        body: new URLSearchParams({
          sheetName: SHEET_NAME,
          action: "delete",
          rowIndex: deleteRow.rowIndex,
        }),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || "Delete failed");

      toast.success("Feed deleted successfully");
      loadData();
      setDeleteRow(null);
    } catch (error) {
      console.error("Feed delete error:", error);
      toast.error(error.message || "Delete failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-content mx-auto max-w-[1500px] space-y-5 p-4 sm:p-6">
      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-500 via-cyan-500 to-indigo-500" />
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-sm">
              <Megaphone size={24} />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-teal-600">Onboarding Management</p>
              <h1 className="mt-1 text-2xl font-black text-slate-950">Feed Management</h1>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                Manage mobile app dashboard feeds like New Joining, Birthday, Anniversary.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={loadData}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-indigo-800"
            >
              <Plus size={17} />
              Add Feed
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by date, message, type..."
            className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
          />
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wide text-slate-700">Feed Records</h2>
            <p className="text-xs font-semibold text-slate-500">{filteredRows.length} records shown</p>
          </div>
          {loading && <span className="text-xs font-black text-indigo-600">Loading...</span>}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                {["Date", "Image", "SMS Type", "Message", "Actions"].map((heading) => (
                  <th key={heading} className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-600">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-5 py-12 text-center text-sm font-bold text-slate-500">
                    Loading feed...
                  </td>
                </tr>
              ) : filteredRows.length > 0 ? (
                filteredRows.map((row) => (
                  <tr key={`${row.rowIndex}`} className="transition hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-bold text-slate-700">{row.date}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      {row.image ? (
                        <img src={row.image} alt="Feed" className="h-10 w-10 rounded-lg object-cover shadow-sm border border-slate-200" onError={(e) => e.target.style.display='none'} />
                      ) : (
                        <span className="text-xs text-slate-400 font-semibold italic">No Image</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-black text-indigo-600">
                        {row.smsType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-600 max-w-sm truncate">{row.sms}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(row)}
                          className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-black text-indigo-700 transition hover:bg-indigo-100"
                        >
                          <Edit size={13} />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteRow(row)}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-black text-rose-700 transition hover:bg-rose-100"
                        >
                          <Trash2 size={13} />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-5 py-14 text-center text-sm font-bold text-slate-500">
                    No feed records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-black text-slate-950">
                  {mode === "add" ? "Add Feed" : "Edit Feed"}
                </h2>
                <p className="text-xs font-semibold text-slate-500">
                  Fill details for the mobile dashboard feed.
                </p>
              </div>
              <button type="button" onClick={closeModal} className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
                <X size={20} />
              </button>
            </div>

            <div className="grid gap-4 overflow-y-auto px-5 py-5 sm:grid-cols-2">
              <Input label="Date" name="date" type="date" value={form.date} onChange={updateForm} required />
              
              <label className="block">
                <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">SMS Type</span>
                <select name="smsType" value={form.smsType} onChange={updateForm} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100">
                  <option value="Birthday">Birthday</option>
                  <option value="Annivercery">Annivercery</option>
                  <option value="Joining Anniversary">Joining Anniversary</option>
                  <option value="New Joining">New Joining</option>
                  <option value="Notice">Notice</option>
                </select>
              </label>

              <Input label="Name" name="name" value={form.name} onChange={updateForm} placeholder="e.g. John Doe" />
              <Input label="Designation" name="designation" value={form.designation} onChange={updateForm} placeholder="e.g. Software Engineer" />

              <div className="sm:col-span-2">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">Image Upload</span>
                  <div className="flex items-center gap-3 rounded-xl border border-slate-300 bg-white p-1.5">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-black file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 outline-none"
                    />
                  </div>
                  {form.image && !form.imageFile && (
                    <p className="mt-2 text-xs font-semibold text-emerald-600">Current Image URL already saved.</p>
                  )}
                  {form.imageFile && (
                    <p className="mt-2 text-xs font-semibold text-indigo-600">New file selected: {form.imageFile.name}</p>
                  )}
                </label>
              </div>

              <div className="sm:col-span-2">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">Message (SMS)</span>
                  <textarea
                    name="sms"
                    value={form.sms}
                    onChange={updateForm}
                    rows="3"
                    required
                    className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                    placeholder="Enter welcome message or announcement..."
                  />
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4">
              <button type="button" onClick={closeModal} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-100">
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 rounded-xl bg-indigo-700 px-4 py-2 text-sm font-black text-white transition hover:bg-indigo-800 disabled:opacity-70">
                <Save size={17} />
                {submitting ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}

      {deleteRow && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-lg font-black text-slate-950">Delete Feed?</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                Are you sure you want to delete this {deleteRow.smsType} feed?
              </p>
            </div>
            <div className="flex justify-end gap-3 bg-slate-50 px-5 py-4">
              <button type="button" onClick={() => setDeleteRow(null)} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-100">
                Cancel
              </button>
              <button type="button" onClick={handleDelete} disabled={submitting} className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-black text-white transition hover:bg-rose-700 disabled:opacity-70">
                <Trash2 size={17} />
                {submitting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Input = ({ label, ...props }) => (
  <label className="block">
    <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">{label}</span>
    <input
      {...props}
      className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
    />
  </label>
);

export default FeedManagement;
