import React, { useEffect, useMemo, useState } from "react";
import {
  Edit,
  LocateFixed,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  UserCog,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

const OUTSTATION_SCRIPT_URL = import.meta.env.VITE_OUTSTATION_SHEET_URL;
const OUTSTATION_SPREADSHEET_ID = "1WTT8ZQhtf1yeSChNn2uJeW5Tz2TvYjQLrxhTx5l4Fgw";
const MASTER_SHEET_NAME = "Master";
const MASTER_HEADERS = [
  "Person Name",
  "User Name",
  "Password",
  "admin",
  "Access",
  "Employee Type",
  "latitude",
  "longitude",
  "Range",
  "Deployment Link",
];

const emptyForm = {
  personName: "",
  userName: "",
  password: "",
  role: "User",
  access: "all",
  employeeType: "In Office",
  latitude: "",
  longitude: "",
  range: "100",
  deploymentLink: "",
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

const fetchMasterRows = async () => {
  const url = `https://docs.google.com/spreadsheets/d/${OUTSTATION_SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(MASTER_SHEET_NAME)}&range=A1:J1000&headers=1&cb=${Date.now()}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Master sheet HTTP error! status: ${response.status}`);
  const rows = parseGoogleSheetTable(await response.text(), MASTER_SHEET_NAME);

  return rows
    .map((row, index) => ({
      rowIndex: index + 2,
      personName: row[0] || "",
      userName: row[1] || "",
      password: row[2] || "",
      role: row[3] || "",
      access: row[4] || "",
      employeeType: row[5] || "",
      latitude: row[6] || "",
      longitude: row[7] || "",
      range: row[8] || "",
      deploymentLink: row[9] || "",
      raw: row,
    }))
    .filter((row) => {
      const name = String(row.personName || "").trim().toLowerCase();
      return name && name !== "person name";
    });
};

const formToRow = (form, existingRaw = []) => {
  const row = [...existingRaw];
  while (row.length < MASTER_HEADERS.length) row.push("");

  row[0] = form.personName;
  row[1] = form.userName;
  row[2] = form.password;
  row[3] = form.role;
  row[4] = form.access;
  row[5] = form.employeeType;
  row[6] = form.latitude;
  row[7] = form.longitude;
  row[8] = form.range;
  row[9] = form.deploymentLink;

  return row;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const cleanCell = (value) => String(value ?? "").trim().toLowerCase();

const rowMatchesData = (row, rowData = []) =>
  cleanCell(row.personName) === cleanCell(rowData[0]) &&
  cleanCell(row.userName) === cleanCell(rowData[1]) &&
  cleanCell(row.password) === cleanCell(rowData[2]) &&
  cleanCell(row.role) === cleanCell(rowData[3]) &&
  cleanCell(row.access) === cleanCell(rowData[4]) &&
  cleanCell(row.employeeType) === cleanCell(rowData[5]) &&
  cleanCell(row.latitude) === cleanCell(rowData[6]) &&
  cleanCell(row.longitude) === cleanCell(rowData[7]) &&
  cleanCell(row.range) === cleanCell(rowData[8]) &&
  cleanCell(row.deploymentLink) === cleanCell(rowData[9]);

const countMatchingRows = (rows = [], rowData = []) => rows.filter((row) => rowMatchesData(row, rowData)).length;

const verifyMasterWrite = (latestRows, verification) => {
  if (!verification) return true;

  const { type, rowData, rowIndex, beforeRows = [] } = verification;
  if (type === "insert") {
    return countMatchingRows(latestRows, rowData) > countMatchingRows(beforeRows, rowData);
  }

  if (type === "update") {
    const updatedRow = latestRows.find((row) => Number(row.rowIndex) === Number(rowIndex));
    return Boolean(updatedRow && rowMatchesData(updatedRow, rowData));
  }

  if (type === "delete") {
    return countMatchingRows(latestRows, rowData) < countMatchingRows(beforeRows, rowData);
  }

  return false;
};

const waitForMasterWrite = async (verification) => {
  let latestRows = [];
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await sleep(attempt === 0 ? 1200 : 900);
    latestRows = await fetchMasterRows();
    if (verifyMasterWrite(latestRows, verification)) {
      return latestRows;
    }
  }

  throw new Error("Master sheet me change save nahi hua. Outstation Apps Script me Master insert/update/delete allow karna hoga.");
};

const postMasterAction = async (payload, verification) => {
  if (!OUTSTATION_SCRIPT_URL) {
    throw new Error("VITE_OUTSTATION_SHEET_URL missing hai");
  }

  await fetch(OUTSTATION_SCRIPT_URL, {
    method: "POST",
    mode: "no-cors",
    body: new URLSearchParams({
      sheetName: MASTER_SHEET_NAME,
      ...payload,
    }),
  });

  const latestRows = await waitForMasterWrite(verification);
  return { success: true, rows: latestRows };
};

const OutstationMaster = () => {
  const [rows, setRows] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState("add");
  const [form, setForm] = useState(emptyForm);
  const [editingRow, setEditingRow] = useState(null);
  const [deleteRow, setDeleteRow] = useState(null);

  const fetchRows = async () => {
    setLoading(true);
    try {
      const data = await fetchMasterRows();
      setRows(data);
    } catch (error) {
      console.error("Master fetch error:", error);
      toast.error(error.message || "Master data fetch failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, []);

  const filteredRows = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    if (!search) return rows;
    return rows.filter((row) =>
      [
        row.personName,
        row.userName,
        row.role,
        row.access,
        row.employeeType,
        row.latitude,
        row.longitude,
      ]
        .join(" ")
        .toLowerCase()
        .includes(search)
    );
  }, [rows, searchTerm]);

  const openAddModal = () => {
    setMode("add");
    setEditingRow(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEditModal = (row) => {
    setMode("edit");
    setEditingRow(row);
    setForm({
      personName: row.personName || "",
      userName: row.userName || "",
      password: row.password || "",
      role: row.role || "User",
      access: row.access || "all",
      employeeType: row.employeeType || "In Office",
      latitude: row.latitude || "",
      longitude: row.longitude || "",
      range: row.range || "100",
      deploymentLink: row.deploymentLink || "",
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

  const setCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Browser location support nahi kar raha hai");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((prev) => ({
          ...prev,
          latitude: Number(position.coords.latitude.toFixed(7)).toString(),
          longitude: Number(position.coords.longitude.toFixed(7)).toString(),
          range: prev.range || "100",
        }));
        toast.success("Current lat-long set ho gaya");
      },
      (error) => {
        toast.error(error.message || "Location permission failed");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      if (!form.personName.trim() || !form.userName.trim() || !form.password.trim()) {
        throw new Error("Person Name, User Name aur Password required hai");
      }

      const rowData = formToRow(form, editingRow?.raw || []);
      const result = await postMasterAction(
        {
          action: mode === "add" ? "insert" : "update",
          ...(mode === "edit" ? { rowIndex: String(editingRow.rowIndex) } : {}),
          rowData: JSON.stringify(rowData),
        },
        {
          type: mode === "add" ? "insert" : "update",
          rowData,
          rowIndex: editingRow?.rowIndex,
          beforeRows: rows,
        }
      );

      toast.success(mode === "add" ? "Master user added" : "Master user updated");
      setRows(result.rows);
      closeModal();
    } catch (error) {
      console.error("Master save error:", error);
      toast.error(error.message || "Save failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteRow) return;
    setSubmitting(true);

    try {
      const rowData = formToRow(
        {
          personName: deleteRow.personName,
          userName: deleteRow.userName,
          password: deleteRow.password,
          role: deleteRow.role,
          access: deleteRow.access,
          employeeType: deleteRow.employeeType,
          latitude: deleteRow.latitude,
          longitude: deleteRow.longitude,
          range: deleteRow.range,
          deploymentLink: deleteRow.deploymentLink,
        },
        deleteRow.raw || []
      );
      const result = await postMasterAction(
        {
          action: "delete",
          rowIndex: String(deleteRow.rowIndex),
        },
        {
          type: "delete",
          rowData,
          rowIndex: deleteRow.rowIndex,
          beforeRows: rows,
        }
      );
      toast.success("Master row deleted");
      setRows(result.rows);
      setDeleteRow(null);
    } catch (error) {
      console.error("Master delete error:", error);
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
              <UserCog size={24} />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-teal-600">Outstation Master</p>
              <h1 className="mt-1 text-2xl font-black text-slate-950">Attendance User Master</h1>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                Master sheet users, employee type, lat-long aur range manage karo.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={fetchRows}
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
              Add Master User
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
            placeholder="Search by name, username, type, lat-long..."
            className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
          />
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wide text-slate-700">Master Records</h2>
            <p className="text-xs font-semibold text-slate-500">{filteredRows.length} records shown</p>
          </div>
          {loading && <span className="text-xs font-black text-indigo-600">Loading...</span>}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                {["Person Name", "User Name", "Password", "Role", "Access", "Employee Type", "Latitude", "Longitude", "Range", "Actions"].map((heading) => (
                  <th key={heading} className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-600">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {loading ? (
                <tr>
                  <td colSpan="10" className="px-5 py-12 text-center text-sm font-bold text-slate-500">
                    Loading master users...
                  </td>
                </tr>
              ) : filteredRows.length > 0 ? (
                filteredRows.map((row) => (
                  <tr key={`${row.rowIndex}-${row.userName}`} className="transition hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-black text-slate-900">{row.personName}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-bold text-slate-700">{row.userName}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-slate-500">{row.password}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-slate-700">{row.role || "-"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-slate-500">{row.access || "-"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-black ${
                        String(row.employeeType).toLowerCase().includes("out")
                          ? "bg-sky-100 text-sky-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}>
                        {row.employeeType || "-"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-slate-600">{row.latitude || "-"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-slate-600">{row.longitude || "-"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-slate-600">{row.range || "100"}</td>
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
                  <td colSpan="10" className="px-5 py-14 text-center text-sm font-bold text-slate-500">
                    No master records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-black text-slate-950">
                  {mode === "add" ? "Add Master User" : "Edit Master User"}
                </h2>
                <p className="text-xs font-semibold text-slate-500">
                  Lat-long blank mat chhodo agar employee type In Office hai.
                </p>
              </div>
              <button type="button" onClick={closeModal} className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
                <X size={20} />
              </button>
            </div>

            <div className="grid max-h-[70vh] gap-4 overflow-y-auto px-5 py-5 sm:grid-cols-2">
              <Input label="Person Name" name="personName" value={form.personName} onChange={updateForm} required />
              <Input label="User Name" name="userName" value={form.userName} onChange={updateForm} required />
              <Input label="Password" name="password" value={form.password} onChange={updateForm} required />
              <label className="block">
                <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">Role</span>
                <select name="role" value={form.role} onChange={updateForm} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100">
                  <option value="admin">admin</option>
                  <option value="User">User</option>
                  <option value="Employee">Employee</option>
                </select>
              </label>
              <Input label="Access" name="access" value={form.access} onChange={updateForm} placeholder="all" />
              <label className="block">
                <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">Employee Type</span>
                <select name="employeeType" value={form.employeeType} onChange={updateForm} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100">
                  <option value="In Office">In Office</option>
                  <option value="Out Off Office">Out Off Office</option>
                </select>
              </label>
              <Input label="Latitude" name="latitude" value={form.latitude} onChange={updateForm} placeholder="22.6849747" />
              <Input label="Longitude" name="longitude" value={form.longitude} onChange={updateForm} placeholder="88.4671021" />
              <Input label="Range Meter" name="range" value={form.range} onChange={updateForm} placeholder="100" />
              <Input label="Deployment Link" name="deploymentLink" value={form.deploymentLink} onChange={updateForm} placeholder="https://..." />

              <button
                type="button"
                onClick={setCurrentLocation}
                className="sm:col-span-2 inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-teal-200 bg-teal-50 text-sm font-black text-teal-700 transition hover:bg-teal-100"
              >
                <LocateFixed size={17} />
                Set Current Location Lat-Long
              </button>
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
              <h2 className="text-lg font-black text-slate-950">Delete Master User?</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                {deleteRow.personName} ka row permanently delete hoga.
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

export default OutstationMaster;
