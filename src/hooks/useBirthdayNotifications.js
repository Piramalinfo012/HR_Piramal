import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

const BIRTHDAY_CACHE_KEY = 'hrms_birthday_notifications_cache_v1';
const BIRTHDAY_CACHE_TTL_MS = 10 * 60 * 1000;

const normalize = (value) => (value || '').toString().trim();

const readCachedBirthdays = () => {
  try {
    const cached = JSON.parse(localStorage.getItem(BIRTHDAY_CACHE_KEY) || 'null');
    if (!cached || !Array.isArray(cached.data)) return [];
    if (Date.now() - Number(cached.savedAt || 0) > BIRTHDAY_CACHE_TTL_MS) return [];
    return cached.data;
  } catch {
    return [];
  }
};

const writeCachedBirthdays = (data) => {
  try {
    localStorage.setItem(BIRTHDAY_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), data }));
  } catch {
    // Cache is only for fast notification paint.
  }
};

const parseSheetDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  if (typeof value === 'number') {
    const date = new Date((value - 25569) * 86400 * 1000);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const raw = value.toString().trim();
  const isoMatch = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    return new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
  }

  const slashMatch = raw.match(/^(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?$/);
  if (slashMatch) {
    const day = Number(slashMatch[1]);
    const month = Number(slashMatch[2]);
    const year = slashMatch[3]
      ? slashMatch[3].length === 2
        ? Number(`20${slashMatch[3]}`)
        : Number(slashMatch[3])
      : new Date().getFullYear();
    return new Date(year, month - 1, day);
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const findJoiningHeader = (rows) => {
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    if (!Array.isArray(row)) continue;

    const normalizedRow = row.map((cell) => normalize(cell).toLowerCase());
    const hasName = normalizedRow.some((cell) =>
      cell.includes('candidate name') ||
      cell.includes('candiate name') ||
      cell.includes('name as per aadhar')
    );
    const hasBirthday = normalizedRow.some((cell) =>
      cell === 'dob' ||
      cell.includes('date of birth') ||
      cell.includes('birth as per aadhar')
    );

    if (hasName && hasBirthday) {
      return { headerRowIndex: i, headers: row.map((cell) => normalize(cell)) };
    }
  }

  return { headerRowIndex: 6, headers: Array.isArray(rows[6]) ? rows[6].map((cell) => normalize(cell)) : [] };
};

const getHeaderIndex = (headers, names, fallbackIndex = -1) => {
  const acceptedNames = Array.isArray(names) ? names : [names];
  const index = headers.findIndex((header) =>
    acceptedNames.some((name) => {
      const headerValue = normalize(header).toLowerCase();
      const expected = name.toLowerCase();
      return headerValue === expected || headerValue.includes(expected);
    })
  );
  return index === -1 ? fallbackIndex : index;
};

const formatBirthdayDate = (date) =>
  date.toLocaleDateString('en-IN', { day: '2-digit', month: 'long' });

export const useBirthdayNotifications = ({ enabled = true, showToast = false } = {}) => {
  const initialBirthdays = useMemo(() => readCachedBirthdays(), []);
  const [birthdayNotifications, setBirthdayNotifications] = useState(initialBirthdays);
  const [birthdayLoading, setBirthdayLoading] = useState(initialBirthdays.length === 0);

  useEffect(() => {
    if (!enabled) return undefined;

    let isMounted = true;

    const fetchBirthdays = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_JOINING_SHEET_URL}?action=read&sheet=JOINING_FMS&_=${Date.now()}`,
          { cache: 'no-store' }
        );
        const result = await response.json();
        const rawRows = result.data || result;

        if (!Array.isArray(rawRows)) {
          if (isMounted) {
            setBirthdayNotifications([]);
            setBirthdayLoading(false);
          }
          return;
        }

        const { headerRowIndex, headers } = findJoiningHeader(rawRows);
        const rows = rawRows.slice(headerRowIndex + 1);
        const idxName = getHeaderIndex(headers, ['Name As Per Aadhar', 'Candidate Name', 'Candiate Name'], 10);
        const idxDob = getHeaderIndex(headers, ['Date Of Birth As Per Aadhar Card', 'Date Of Birth', 'DOB'], -1);
        const idxPhoto = getHeaderIndex(headers, ["Candidate's Photo", 'Candidate Photo', 'Photo'], 18);
        const idxDesignation = getHeaderIndex(headers, ['Designation'], 14);
        const idxDept = getHeaderIndex(headers, ['Department'], 2);
        const idxEmployeeId = getHeaderIndex(headers, ['Joining ID', 'Indent Number', 'Employee ID'], 5);

        if (idxDob === -1) {
          if (isMounted) {
            setBirthdayNotifications([]);
            setBirthdayLoading(false);
          }
          return;
        }

        const today = new Date();
        const birthdays = rows
          .map((row) => {
            const birthdayDate = parseSheetDate(row[idxDob]);
            return {
              employeeId: row[idxEmployeeId] || '',
              name: row[idxName] || '',
              photo: row[idxPhoto] || '',
              designation: row[idxDesignation] || '',
              department: row[idxDept] || '',
              birthday: row[idxDob] || '',
              birthdayLabel: birthdayDate ? formatBirthdayDate(birthdayDate) : '',
              birthdayDate,
            };
          })
          .filter((item) =>
            item.name &&
            item.birthdayDate &&
            item.birthdayDate.getDate() === today.getDate() &&
            item.birthdayDate.getMonth() === today.getMonth()
          )
          .map(({ birthdayDate, ...item }) => item);

        writeCachedBirthdays(birthdays);
        if (isMounted) {
          setBirthdayNotifications(birthdays);
          setBirthdayLoading(false);
        }
      } catch (error) {
        console.error('Failed to load birthday notifications:', error);
        if (isMounted) setBirthdayLoading(false);
      }
    };

    fetchBirthdays();

    return () => {
      isMounted = false;
    };
  }, [enabled]);

  useEffect(() => {
    if (!showToast || birthdayNotifications.length === 0) return;

    const todayKey = new Date().toLocaleDateString('en-CA');
    const toastKey = `hrms_birthday_toast_${todayKey}`;
    if (sessionStorage.getItem(toastKey)) return;

    const firstName = birthdayNotifications[0].name;
    const extraCount = birthdayNotifications.length - 1;
    toast.success(
      extraCount > 0
        ? `Today is ${firstName}'s birthday and ${extraCount} more.`
        : `Today is ${firstName}'s birthday.`
    );
    sessionStorage.setItem(toastKey, '1');
  }, [birthdayNotifications, showToast]);

  return { birthdayNotifications, birthdayLoading };
};
