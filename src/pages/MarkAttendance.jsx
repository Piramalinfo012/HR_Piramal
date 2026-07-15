import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  Clock,
  LocateFixed,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import toast from "react-hot-toast";
import useAuthStore from "../store/authStore";

const OUTSTATION_SCRIPT_URL = import.meta.env.VITE_OUTSTATION_SHEET_URL;
const OUTSTATION_SPREADSHEET_ID = "1WTT8ZQhtf1yeSChNn2uJeW5Tz2TvYjQLrxhTx5l4Fgw";
const ATTENDANCE_SHEET_NAME = "Attendance";
const MASTER_SHEET_NAME = "Master";
const DEFAULT_ALLOWED_RADIUS_METERS = 100;
const MARK_ATTENDANCE_CACHE_TTL_MS = 5 * 60 * 1000;
const MARK_ATTENDANCE_MASTER_CACHE_TTL_MS = 15 * 60 * 1000;
const MARK_ATTENDANCE_LOCATION_CACHE_TTL_MS = 2 * 60 * 1000;
const MARK_ATTENDANCE_DATA_CACHE_KEY = "mark_attendance_data_cache_v1";
const MARK_ATTENDANCE_MASTER_CACHE_KEY = "mark_attendance_master_cache_v1";
const MARK_ATTENDANCE_LOCATION_CACHE_KEY = "mark_attendance_location_cache_v1";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const normalize = (value) => String(value || "").trim().toLowerCase();

const readCache = (key, maxAgeMs) => {
  try {
    const cached = JSON.parse(localStorage.getItem(key) || "null");
    if (!cached || Date.now() - Number(cached.savedAt || 0) > maxAgeMs) return null;
    return cached.data || null;
  } catch {
    return null;
  }
};

const writeCache = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), data }));
  } catch {
    // Cache is only used for faster paint and punch readiness.
  }
};

const pickFirst = (row, keys) => {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") return value;
  }
  return "";
};

const parseNumberOrNull = (value) => {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  const parsed = Number(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
};

const formatDateTimeForSheet = (date) => {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");
  return `${day}/${month}/${year} ${hour}:${minute}:${second}`;
};

const formatDateForSheet = (date) => {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
};

const formatTimeForSheet = (date) =>
  `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}`;

const parseDateToObj = (value) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  const raw = String(value).trim();
  if (!raw) return null;

  if (raw.includes("T") && raw.includes(":")) {
    const date = new Date(raw);
    if (!Number.isNaN(date.getTime())) return date;
  }

  const isoMatch = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (isoMatch) {
    return new Date(
      Number(isoMatch[1]),
      Number(isoMatch[2]) - 1,
      Number(isoMatch[3]),
      Number(isoMatch[4] || 0),
      Number(isoMatch[5] || 0),
      Number(isoMatch[6] || 0)
    );
  }

  const slashMatch = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (slashMatch) {
    const year = slashMatch[3].length === 2 ? Number(`20${slashMatch[3]}`) : Number(slashMatch[3]);
    return new Date(
      year,
      Number(slashMatch[2]) - 1,
      Number(slashMatch[1]),
      Number(slashMatch[4] || 0),
      Number(slashMatch[5] || 0),
      Number(slashMatch[6] || 0)
    );
  }

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDateValue = (value) => {
  const date = parseDateToObj(value);
  if (!date) return value ? String(value) : "-";
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
};

const formatTimeValue = (value) => {
  const date = parseDateToObj(value);
  if (date) return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  if (!value) return "-";
  const raw = String(value).trim();
  if (!raw) return "-";
  if (raw.includes(":")) return raw.split(" ").pop().substring(0, 5);
  return raw;
};

const dateKey = (date) => {
  if (!date) return "";
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
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

const fetchSheetRows = async (sheetName) => {
  const url = `https://docs.google.com/spreadsheets/d/${OUTSTATION_SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}&cb=${Date.now()}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${sheetName} sheet HTTP error! status: ${response.status}`);
  return parseGoogleSheetTable(await response.text(), sheetName);
};

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
};

const getCurrentUserName = (user = {}) =>
  String(
    pickFirst(user, [
      "Sales Person Name",
      "Person Name",
      "Employee Name",
      "Name",
      "name",
      "User Name",
      "Username",
      "username",
      "_authUsername",
    ]) || ""
  ).trim();

const getUserAliases = (user = {}) =>
  [
    getCurrentUserName(user),
    user._authUsername,
    user["User Name"],
    user.Username,
    user.username,
    user["Sales Person Name"],
    user["Person Name"],
    user.Name,
    user.name,
  ]
    .map(normalize)
    .filter(Boolean);

const getMatchedMasterUser = (user = {}, masterUsers = []) => {
  const aliases = getUserAliases(user);
  return masterUsers.find((item) =>
    aliases.includes(normalize(item.personName)) || aliases.includes(normalize(item.username))
  );
};

const getScopedAliases = (user = {}, masterUser = null) =>
  [
    ...getUserAliases(user),
    masterUser?.personName,
    masterUser?.username,
  ]
    .map(normalize)
    .filter(Boolean);

const normalizeMasterRows = (rows = []) =>
  rows
    .map((row) => ({
      personName: row[0] || "",
      username: row[1] || "",
      role: row[3] || "",
      access: row[4] || "",
      employeeType: row[5] || "",
      latitude: parseNumberOrNull(row[6]),
      longitude: parseNumberOrNull(row[7]),
      rangeMeters: parseNumberOrNull(row[8]) || DEFAULT_ALLOWED_RADIUS_METERS,
    }))
    .filter((row) => {
      const name = normalize(row.personName);
      return name && name !== "sales person name";
    });

const getUserLocationRule = (user = {}, masterUsers = [], matchedMasterUser = null) => {
  const masterUser = matchedMasterUser || getMatchedMasterUser(user, masterUsers);
  const employeeType = normalize(masterUser?.employeeType);
  const isOutOfOffice = employeeType.includes("out") && employeeType.includes("office");

  if (isOutOfOffice) {
    return {
      latitude: null,
      longitude: null,
      rangeMeters: masterUser?.rangeMeters || DEFAULT_ALLOWED_RADIUS_METERS,
      source: "Out Off Office",
      employeeType: masterUser?.employeeType || "Out Off Office",
      requiresLocationMatch: false,
    };
  }

  if (masterUser && masterUser.latitude !== null && masterUser.longitude !== null) {
    return {
      latitude: masterUser.latitude,
      longitude: masterUser.longitude,
      rangeMeters: masterUser.rangeMeters || DEFAULT_ALLOWED_RADIUS_METERS,
      source: "Master",
      employeeType: masterUser.employeeType || "In Office",
      requiresLocationMatch: true,
    };
  }

  const profileLatitude = parseNumberOrNull(pickFirst(user, ["latitude", "Latitude", "lat", "Lat"]));
  const profileLongitude = parseNumberOrNull(pickFirst(user, ["longitude", "Longitude", "lng", "Lng", "long", "Long"]));
  const profileRange = parseNumberOrNull(pickFirst(user, ["Range", "range", "Radius", "radius"]));

  if (profileLatitude !== null && profileLongitude !== null) {
    return {
      latitude: profileLatitude,
      longitude: profileLongitude,
      rangeMeters: profileRange || DEFAULT_ALLOWED_RADIUS_METERS,
      source: "User Profile",
      employeeType: masterUser?.employeeType || "In Office",
      requiresLocationMatch: true,
    };
  }

  return {
    latitude: null,
    longitude: null,
    rangeMeters: DEFAULT_ALLOWED_RADIUS_METERS,
    source: masterUser ? "Master" : "",
    employeeType: masterUser?.employeeType || "",
    requiresLocationMatch: true,
  };
};

const haversineDistanceMeters = (from, to) => {
  const radius = 6371000;
  const toRadians = (degree) => (degree * Math.PI) / 180;
  const deltaLatitude = toRadians(to.latitude - from.latitude);
  const deltaLongitude = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);

  const a =
    Math.sin(deltaLatitude / 2) * Math.sin(deltaLatitude / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLongitude / 2) * Math.sin(deltaLongitude / 2);

  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const getBrowserPosition = () =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Browser location support nahi kar raha hai"));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });
  });

const reverseGeocode = async (latitude, longitude) => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 3500);

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
      { signal: controller.signal }
    );
    const data = await response.json();
    return data?.display_name || "";
  } catch {
    return "";
  } finally {
    window.clearTimeout(timeoutId);
  }
};

const getTrustedNow = async () => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch("https://time.akamai.com/?cb=" + Date.now(), {
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error("Trusted time unavailable");

    const text = await response.text();
    const epochSeconds = parseInt(text.trim(), 10);
    if (Number.isNaN(epochSeconds)) throw new Error("Trusted time invalid");

    const utcD = new Date(epochSeconds * 1000);
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: false,
    });

    const parts = formatter.formatToParts(utcD);
    const partVal = (type) => parseInt(parts.find((p) => p.type === type).value, 10);

    const trustedNow = new Date(
      partVal("year"),
      partVal("month") - 1,
      partVal("day"),
      partVal("hour"),
      partVal("minute"),
      partVal("second")
    );

    if (Number.isNaN(trustedNow.getTime())) throw new Error("Trusted time invalid");
    return trustedNow;
  } finally {
    window.clearTimeout(timeoutId);
  }
};

const reviveAttendanceCache = (cached) => {
  if (!cached) return null;
  return {
    attendanceData: (cached.attendanceData || [])
      .map((item) => ({ ...item, dateObj: parseDateToObj(item.dateObj) || parseDateToObj(item.date) }))
      .filter((item) => item.dateObj),
    rawEntries: (cached.rawEntries || [])
      .map((item) => ({ ...item, dateObj: parseDateToObj(item.dateObj) || parseDateToObj(item.date) }))
      .filter((item) => item.dateObj),
  };
};

const mergeAttendanceEntry = (rows, entry) => {
  const entryKey = `${normalize(entry.employeeName)}_${dateKey(entry.dateObj)}`;
  const nextRows = [...rows];
  const existingIndex = nextRows.findIndex((item) => {
    const itemDate = parseDateToObj(item.dateObj) || parseDateToObj(item.date);
    return `${normalize(item.employeeName)}_${dateKey(itemDate)}` === entryKey;
  });

  const existingRow =
    existingIndex >= 0
      ? { ...nextRows[existingIndex], dateObj: parseDateToObj(nextRows[existingIndex].dateObj) || parseDateToObj(nextRows[existingIndex].date) }
      : {
          employeeName: entry.employeeName,
          dateObj: entry.dateObj,
          date: formatDateValue(entry.dateObj),
          month: MONTHS[entry.dateObj.getMonth()],
          year: String(entry.dateObj.getFullYear()),
          day: entry.dateObj.getDate(),
          inTime: "",
          outTime: "",
          mapLink: "",
          address: "",
        };

  const mergedRow = {
    ...existingRow,
    status: "PRESENT",
    mapLink: entry.mapLink || existingRow.mapLink,
    address: entry.address || existingRow.address,
  };

  if (entry.status === "IN") mergedRow.inTime = entry.time;
  if (entry.status === "OUT") mergedRow.outTime = entry.time;

  if (existingIndex >= 0) {
    nextRows[existingIndex] = mergedRow;
  } else {
    nextRows.push(mergedRow);
  }

  return nextRows.sort((a, b) => {
    const dateA = parseDateToObj(a.dateObj) || parseDateToObj(a.date);
    const dateB = parseDateToObj(b.dateObj) || parseDateToObj(b.date);
    return (dateB?.getTime() || 0) - (dateA?.getTime() || 0);
  });
};

const MarkAttendance = () => {
  const authUser = useAuthStore((state) => state.user);
  const currentUser = useMemo(() => authUser || getStoredUser(), [authUser]);
  const currentUserName = useMemo(() => getCurrentUserName(currentUser), [currentUser]);
  const cachedAttendance = useMemo(
    () => reviveAttendanceCache(readCache(MARK_ATTENDANCE_DATA_CACHE_KEY, MARK_ATTENDANCE_CACHE_TTL_MS)),
    []
  );
  const cachedMasterUsers = useMemo(
    () => readCache(MARK_ATTENDANCE_MASTER_CACHE_KEY, MARK_ATTENDANCE_MASTER_CACHE_TTL_MS) || [],
    []
  );

  const [attendanceData, setAttendanceData] = useState(cachedAttendance?.attendanceData || []);
  const [rawEntries, setRawEntries] = useState(cachedAttendance?.rawEntries || []);
  const [masterUsers, setMasterUsers] = useState(cachedMasterUsers);
  const [loading, setLoading] = useState(false);
  const [marking, setMarking] = useState(false);
  const [error, setError] = useState(null);
  const [reason, setReason] = useState("");
  const [locationCheck, setLocationCheck] = useState(null);
  const [rawLocation, setRawLocation] = useState(() => readCache(MARK_ATTENDANCE_LOCATION_CACHE_KEY, MARK_ATTENDANCE_LOCATION_CACHE_TTL_MS) || null);
  const [initialFetchDone, setInitialFetchDone] = useState(false);
  const isSubmittingRef = useRef(false);

  const matchedMasterUser = useMemo(
    () => getMatchedMasterUser(currentUser, masterUsers),
    [currentUser, masterUsers]
  );
  const scopedAliases = useMemo(
    () => getScopedAliases(currentUser, matchedMasterUser),
    [currentUser, matchedMasterUser]
  );
  const punchPersonName = matchedMasterUser?.personName || currentUserName;

  const locationRule = useMemo(
    () => getUserLocationRule(currentUser, masterUsers, matchedMasterUser),
    [currentUser, masterUsers, matchedMasterUser]
  );

  const fetchData = async (options = {}) => {
    const silent = options?.silent === true;
    if (!silent) setLoading(true);
    setError(null);

    try {
      if (!OUTSTATION_SCRIPT_URL) throw new Error("VITE_OUTSTATION_SHEET_URL missing hai");

      const attendancePromise = fetch(`${OUTSTATION_SCRIPT_URL}?action=getAllData`).then(async (response) => {
        if (!response.ok) throw new Error(`Attendance HTTP error! status: ${response.status}`);
        const result = await response.json();
        if (result.status !== "success") throw new Error(result.message || "Attendance data fetch failed");
        return result.attendance || [];
      });

      const masterPromise = fetchSheetRows(MASTER_SHEET_NAME)
        .then(normalizeMasterRows)
        .catch((masterError) => {
          console.warn("Master sheet location rules skipped:", masterError);
          return [];
        });

      const [rawAttendance, masterRows] = await Promise.all([attendancePromise, masterPromise]);
      const grouped = {};
      const entries = [];

      rawAttendance.forEach((entry) => {
        const employeeName = String(entry.personName || "").trim();
        if (!employeeName) return;

        const status = entry.inDate ? "IN" : entry.outDate ? "OUT" : normalize(entry.status).toUpperCase();
        const dateValue = entry.inDate || entry.outDate || entry.dateTime;
        const dateObj = parseDateToObj(dateValue);
        if (!dateObj) return;

        entries.push({
          employeeName,
          status,
          dateObj,
          date: formatDateValue(dateValue),
          time: formatTimeValue(dateValue),
          mapLink: entry.mapLink || "",
          address: entry.address || "",
        });

        const key = `${normalize(employeeName)}_${dateKey(dateObj)}`;
        if (!grouped[key]) {
          grouped[key] = {
            employeeName,
            dateObj,
            date: formatDateValue(dateValue),
            month: MONTHS[dateObj.getMonth()],
            year: String(dateObj.getFullYear()),
            day: dateObj.getDate(),
            inTime: "",
            outTime: "",
            mapLink: "",
            address: "",
          };
        }

        if (status === "IN") {
          grouped[key].inTime = formatTimeValue(dateValue);
          grouped[key].mapLink = entry.mapLink || grouped[key].mapLink;
          grouped[key].address = entry.address || grouped[key].address;
        }

        if (status === "OUT") {
          grouped[key].outTime = formatTimeValue(dateValue);
          grouped[key].mapLink = entry.mapLink || grouped[key].mapLink;
          grouped[key].address = entry.address || grouped[key].address;
        }
      });

      const processed = Object.values(grouped).sort((a, b) => b.dateObj - a.dateObj);
      const sortedEntries = entries.sort((a, b) => b.dateObj - a.dateObj);
      writeCache(MARK_ATTENDANCE_DATA_CACHE_KEY, { attendanceData: processed, rawEntries: sortedEntries });
      writeCache(MARK_ATTENDANCE_MASTER_CACHE_KEY, masterRows);
      setAttendanceData(processed);
      setRawEntries(sortedEntries);
      setMasterUsers(masterRows);
    } catch (err) {
      console.error("Mark attendance fetch error:", err);
      setError(err.message);
    } finally {
      if (!silent) setLoading(false);
      setInitialFetchDone(true);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchData({ silent: true });
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationCheck({ status: "error", message: "Browser location is not supported." });
      return;
    }

    let active = true;

    const handleUpdate = (position) => {
      if (!active) return;
      const latitude = Number(position.coords.latitude.toFixed(7));
      const longitude = Number(position.coords.longitude.toFixed(7));
      const accuracy = position.coords.accuracy || 0;
      
      setRawLocation((prev) => {
        // Prevent delayed low-accuracy network hits from overwriting a warm high-accuracy GPS lock
        if (prev && prev.accuracy && prev.accuracy < 100 && accuracy > 500) {
          return prev;
        }
        // Keep address if moved less than ~50m (approx 0.0004 degrees) to avoid clearing and re-fetching
        const latDiff = prev ? Math.abs(prev.latitude - latitude) : 1;
        const lngDiff = prev ? Math.abs(prev.longitude - longitude) : 1;
        const address = (latDiff < 0.0004 && lngDiff < 0.0004) ? (prev?.address || "") : "";
        
        const nextLoc = { latitude, longitude, address, accuracy };
        writeCache(MARK_ATTENDANCE_LOCATION_CACHE_KEY, nextLoc);
        return nextLoc;
      });
    };

    const handleError = (err) => {
      if (!active) return;
      
      // If high accuracy times out, immediately try a low accuracy check to avoid timeout errors
      if (err.code === 3 || err.message?.includes("Timeout")) {
        navigator.geolocation.getCurrentPosition(
          handleUpdate,
          (fallbackErr) => {
            if (!active) return;
            setLocationCheck((current) =>
              current?.status === "inside" || current?.status === "outside"
                ? current
                : { status: "error", message: fallbackErr.message || "Location check failed." }
            );
          },
          {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 60000,
          }
        );
        return;
      }

      setLocationCheck((current) =>
        current?.status === "inside" || current?.status === "outside"
          ? current
          : { status: "error", message: err.message || "Location check failed." }
      );
    };

    navigator.geolocation.getCurrentPosition(handleUpdate, handleError, {
      enableHighAccuracy: false,
      timeout: 5000,
      maximumAge: 300000,
    });

    const watchId = navigator.geolocation.watchPosition(handleUpdate, handleError, {
      enableHighAccuracy: true,
      timeout: 8000,
      maximumAge: 30000,
    });

    return () => {
      active = false;
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  useEffect(() => {
    if (rawLocation?.latitude && rawLocation?.longitude && !rawLocation.address) {
      let active = true;
      reverseGeocode(rawLocation.latitude, rawLocation.longitude).then((address) => {
        if (!active || !address) return;
        setRawLocation((prev) => {
          if (prev?.latitude === rawLocation.latitude && prev?.longitude === rawLocation.longitude) {
            const nextLoc = { ...prev, address };
            writeCache(MARK_ATTENDANCE_LOCATION_CACHE_KEY, nextLoc);
            return nextLoc;
          }
          return prev;
        });
      });
      return () => { active = false; };
    }
  }, [rawLocation?.latitude, rawLocation?.longitude, rawLocation?.address]);



  useEffect(() => {
    if (!locationRule.source) {
      if (!rawLocation) {
        setLocationCheck({ status: "checking", message: "Checking location..." });
      } else {
        setLocationCheck({ status: "checking", message: "Fetching user settings..." });
      }
      return;
    }

    if (locationRule.requiresLocationMatch && (locationRule.latitude === null || locationRule.longitude === null)) {
      setLocationCheck({ status: "error", message: "Master location is not configured." });
      return;
    }

    if (!rawLocation || rawLocation.latitude === undefined) {
      if (!locationRule.requiresLocationMatch) {
        setLocationCheck({
          status: "inside",
          distance: 0,
          latitude: 0,
          longitude: 0,
          address: "Out of Office (No GPS)",
          message: "Location ready",
        });
      } else if (locationCheck?.status === "error") {
        // Keep the error status if it was set by handleError
      } else {
        setLocationCheck({ status: "checking", message: "Checking location..." });
      }
      return;
    }

    const accuracy = rawLocation.accuracy || 0;

    const rawDistance = locationRule.requiresLocationMatch
      ? haversineDistanceMeters(
        { latitude: rawLocation.latitude, longitude: rawLocation.longitude },
        { latitude: locationRule.latitude, longitude: locationRule.longitude }
      )
      : 0;
    
    // Do not aggressively subtract accuracy, as it breaks geofencing and shows 0m everywhere.
    // Use the exact raw distance as requested for strictness.
    const effectiveDistance = rawDistance;
    
    const roundedDistance = Math.round(effectiveDistance);
    const allowed = !locationRule.requiresLocationMatch || effectiveDistance <= locationRule.rangeMeters;

    const baseMessage = !locationRule.requiresLocationMatch
      ? "Location ready"
      : allowed
        ? `Inside range (${roundedDistance}m / ${locationRule.rangeMeters}m)`
        : `Outside range (${roundedDistance}m / ${locationRule.rangeMeters}m)`;

    const finalMessage = (!allowed && locationRule.requiresLocationMatch && accuracy > 300)
      ? `${baseMessage} - Poor GPS signal (${Math.round(accuracy)}m). Please step near a window.`
      : baseMessage;

    setLocationCheck({
      status: allowed ? "inside" : "outside",
      distance: roundedDistance,
      latitude: rawLocation.latitude,
      longitude: rawLocation.longitude,
      address: rawLocation.address,
      message: finalMessage,
    });
  }, [
    rawLocation,
    locationRule.source,
    locationRule.requiresLocationMatch,
    locationRule.latitude,
    locationRule.longitude,
    locationRule.rangeMeters,
  ]);

  const nextStatus = useMemo(() => {
    const today = dateKey(new Date());
    const todayEntries = rawEntries
      .filter((entry) => scopedAliases.includes(normalize(entry.employeeName)) && dateKey(entry.dateObj) === today)
      .sort((a, b) => a.dateObj - b.dateObj);
    const lastEntry = todayEntries[todayEntries.length - 1];
    return lastEntry?.status === "IN" ? "OUT" : "IN";
  }, [rawEntries, scopedAliases]);

  const todayPunchCount = useMemo(() => {
    const today = dateKey(new Date());
    return rawEntries.filter((entry) => scopedAliases.includes(normalize(entry.employeeName)) && dateKey(entry.dateObj) === today).length;
  }, [rawEntries, scopedAliases]);

  const isAttendanceComplete = useMemo(() => {
    if (todayPunchCount === 0) return false;
    const today = dateKey(new Date());
    const todayEntries = rawEntries
      .filter((entry) => scopedAliases.includes(normalize(entry.employeeName)) && dateKey(entry.dateObj) === today)
      .sort((a, b) => a.dateObj - b.dateObj);
    const lastEntry = todayEntries[todayEntries.length - 1];
    
    // If the last punch of today was IN, then attendance is not complete (needs OUT punch)
    if (lastEntry?.status === "IN") return false;
    
    // Otherwise, if they have 2 or more punches and the last one was OUT, it's complete
    return todayPunchCount >= 2;
  }, [rawEntries, todayPunchCount, scopedAliases]);

  const myTodayRecord = useMemo(() => {
    const today = dateKey(new Date());
    return attendanceData.find((item) => scopedAliases.includes(normalize(item.employeeName)) && dateKey(item.dateObj) === today);
  }, [attendanceData, scopedAliases]);

  const handleMarkAttendance = async () => {
    if (isSubmittingRef.current) return;
    if (marking) return;
    if (isAttendanceComplete) return;
 
    if (!punchPersonName) {
      toast.error("Current user name was not found.");
      return;
    }
 
    if (!locationRule.source) {
      toast.error("Location settings are still loading. Please try again in a moment.");
      return;
    }
 
    if (locationRule.requiresLocationMatch && (locationRule.latitude === null || locationRule.longitude === null)) {
      toast.error("User latitude/longitude is not set in Master.");
      return;
    }
 
    if (!locationCheck || locationCheck.status === "checking") {
      toast.error("Location is still being checked. Please try again in a moment.");
      return;
    }
 
    if (locationCheck.status === "outside") {
      toast.error(`You are outside the allowed range (${locationCheck.distance}m / ${locationRule.rangeMeters}m). Attendance was not marked.`);
      return;
    }
 
    if (locationCheck.status === "error") {
      toast.error(locationCheck.message || "Location check failed.");
      return;
    }
 
    if (locationCheck.latitude === undefined || locationCheck.longitude === undefined) {
      toast.error("Location is not ready. Please try again.");
      return;
    }
 
    isSubmittingRef.current = true;
    setMarking(true);

    try {
      const now = await getTrustedNow();
      const trustedToday = dateKey(now);
      const trustedTodayEntries = rawEntries
        .filter((entry) => scopedAliases.includes(normalize(entry.employeeName)) && dateKey(entry.dateObj) === trustedToday)
        .sort((a, b) => a.dateObj - b.dateObj);

      if (trustedTodayEntries.length >= 2) return;

      const lastTrustedEntry = trustedTodayEntries[trustedTodayEntries.length - 1];
      const statusToMark = lastTrustedEntry?.status === "IN" ? "OUT" : "IN";

      if (statusToMark === "OUT" && lastTrustedEntry) {
        const lastPunchTime = lastTrustedEntry.dateObj.getTime();
        const currentTime = now.getTime();
        const diffMs = currentTime - lastPunchTime;
        const diffMins = diffMs / (1000 * 60);

        if (diffMins < 10) {
          const remainingMins = Math.ceil(10 - diffMins);
          toast.error(`Check-out check-in ke 10 minutes baad hi kar sakte hain. ${remainingMins} min bache hain.`);
          return;
        }
      }
      const latitude = locationCheck.latitude;
      const longitude = locationCheck.longitude;
      const mapLink = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
      const address = locationCheck.address || await reverseGeocode(latitude, longitude);
      if (address) {
        writeCache(MARK_ATTENDANCE_LOCATION_CACHE_KEY, { latitude, longitude, address });
        setLocationCheck((current) =>
          current?.latitude === latitude && current?.longitude === longitude
            ? { ...current, address }
            : current
        );
      }
      const timestamp = formatDateTimeForSheet(now);
      const rowData = [
        timestamp,
        timestamp,
        "",
        statusToMark,
        reason.trim(),
        latitude,
        longitude,
        mapLink,
        address,
        punchPersonName,
        formatDateForSheet(now),
        formatTimeForSheet(now),
        String(now.getFullYear()),
        now.toLocaleString("en-US", { month: "long" }),
      ];

      await fetch(OUTSTATION_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        body: new URLSearchParams({
          sheetName: ATTENDANCE_SHEET_NAME,
          action: "insert",
          rowData: JSON.stringify(rowData),
        }),
      });

      const newEntry = {
        employeeName: punchPersonName,
        status: statusToMark,
        dateObj: now,
        date: formatDateValue(now),
        time: formatTimeValue(now),
        mapLink,
        address,
      };
      const nextRawEntries = [...rawEntries, newEntry].sort((a, b) => b.dateObj - a.dateObj);
      const nextAttendanceData = mergeAttendanceEntry(attendanceData, newEntry);
      writeCache(MARK_ATTENDANCE_DATA_CACHE_KEY, {
        attendanceData: nextAttendanceData,
        rawEntries: nextRawEntries,
      });
      setRawEntries(nextRawEntries);
      setAttendanceData(nextAttendanceData);

      toast.success(`${statusToMark} attendance marked`);
      setReason("");
      await fetchData({ silent: true });
    } catch (err) {
      console.error("Mark attendance error:", err);
      const isTrustedTimeError = err.name === "AbortError" || String(err.message || "").includes("Trusted time");
      toast.error(isTrustedTimeError ? "Please set the correct time." : err.message || "Attendance mark failed");
      if (!isTrustedTimeError) {
        setLocationCheck({ status: "error", message: err.message || "Location error" });
      }
    } finally {
      isSubmittingRef.current = false;
      window.setTimeout(() => setMarking(false), 2000);
    }
  };

  return (
    <div className="page-content space-y-5 p-4 sm:p-6">
      <section className="relative overflow-visible rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-500 via-blue-500 to-indigo-500" />
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-teal-600">Outstation Attendance</p>
            <h1 className="mt-2 text-2xl font-black text-slate-950">Mark Attendance</h1>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Attendance tab se live IN/OUT records aur location based marking.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={fetchData}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-50 to-cyan-50 p-4">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-sm">
                  <ShieldCheck size={21} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-teal-700">Location Guard</p>
                  <h2 className="text-lg font-black text-slate-950">{punchPersonName || "User"}</h2>
                  {matchedMasterUser?.role && (
                    <p className="text-[11px] font-black uppercase tracking-wide text-teal-700">
                      {matchedMasterUser.role} {locationRule.employeeType ? `- ${locationRule.employeeType}` : ""}
                    </p>
                  )}
                </div>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-black ${nextStatus === "IN" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                Next: {nextStatus}
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/70 bg-white/80 p-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Allowed Range</p>
                <p className="mt-1 text-xl font-black text-slate-950">
                  {locationRule.requiresLocationMatch ? `${locationRule.rangeMeters}m` : "Anywhere"}
                </p>
                <p className="text-[11px] font-bold text-slate-500">{locationRule.source || "Not configured"}</p>
              </div>
              <div className="rounded-xl border border-white/70 bg-white/80 p-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Today IN</p>
                <p className="mt-1 text-xl font-black text-slate-950">{myTodayRecord?.inTime || "-"}</p>
                <p className="text-[11px] font-bold text-slate-500">Current day</p>
              </div>
              <div className="rounded-xl border border-white/70 bg-white/80 p-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Today OUT</p>
                <p className="mt-1 text-xl font-black text-slate-950">{myTodayRecord?.outTime || "-"}</p>
                <p className="text-[11px] font-bold text-slate-500">Current day</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">


            <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex items-start gap-3">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                  locationCheck?.status === "inside"
                    ? "bg-emerald-100 text-emerald-700"
                    : locationCheck?.status === "outside" || locationCheck?.status === "error"
                      ? "bg-rose-100 text-rose-700"
                      : "bg-indigo-100 text-indigo-700"
                }`}>
                  <LocateFixed size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-black text-slate-800">{locationCheck?.message || "Location is not ready yet"}</p>
                  <p className="mt-0.5 text-xs font-semibold text-slate-500">
                    {locationRule.requiresLocationMatch
                      ? `In Office users must be within ${locationRule.rangeMeters}m to mark attendance.`
                      : "Out of Office users can punch from anywhere."}
                  </p>
                </div>
              </div>
            </div>

            {!initialFetchDone ? (
              <button
                type="button"
                disabled
                className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-black text-white bg-slate-300 shadow-md cursor-not-allowed"
              >
                <RefreshCw size={18} className="animate-spin" />
                Syncing status...
              </button>
            ) : !isAttendanceComplete && !marking && (
              <button
                type="button"
                onClick={handleMarkAttendance}
                disabled={marking}
                className={`mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 ${
                  nextStatus === "IN"
                    ? "bg-gradient-to-r from-emerald-600 to-teal-600 shadow-emerald-100"
                    : "bg-gradient-to-r from-rose-600 to-orange-500 shadow-rose-100"
                }`}
              >
                <Clock size={18} />
                Check {nextStatus}
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default MarkAttendance;
