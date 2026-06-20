import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

const NOTIFICATION_CACHE_KEY = 'hrms_notifications_cache_v1';
const NOTIFICATION_CACHE_TTL_MS = 10 * 60 * 1000;
const SEEN_FEED_IDS_KEY = 'hrms_seen_feed_notification_ids_v1';
const READ_NOTIFICATION_IDS_KEY = 'hrms_read_notification_ids_v1';
const REFRESH_INTERVAL_MS = 30000;

const normalize = (value) => (value || '').toString().trim();

const readCachedNotifications = () => {
  try {
    const cached = JSON.parse(localStorage.getItem(NOTIFICATION_CACHE_KEY) || 'null');
    if (!cached || !Array.isArray(cached.data)) return [];
    if (Date.now() - Number(cached.savedAt || 0) > NOTIFICATION_CACHE_TTL_MS) return [];
    return cached.data;
  } catch {
    return [];
  }
};

const writeCachedNotifications = (data) => {
  try {
    localStorage.setItem(NOTIFICATION_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), data }));
  } catch {
    // Cache is only for faster paint.
  }
};

const readSeenFeedIds = () => {
  try {
    const ids = JSON.parse(localStorage.getItem(SEEN_FEED_IDS_KEY) || 'null');
    return Array.isArray(ids) ? new Set(ids) : null;
  } catch {
    return null;
  }
};

const writeSeenFeedIds = (ids) => {
  try {
    localStorage.setItem(SEEN_FEED_IDS_KEY, JSON.stringify([...ids].slice(0, 300)));
  } catch {
    // Ignore storage failures.
  }
};

const readNotificationIds = () => {
  try {
    const ids = JSON.parse(localStorage.getItem(READ_NOTIFICATION_IDS_KEY) || '[]');
    return Array.isArray(ids) ? ids : [];
  } catch {
    return [];
  }
};

const writeReadNotificationIds = (ids) => {
  try {
    localStorage.setItem(READ_NOTIFICATION_IDS_KEY, JSON.stringify([...ids].slice(-500)));
  } catch {
    // Ignore storage failures.
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

const formatDisplayDate = (date) =>
  date ? date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '';

const isSameMonthDay = (date, today) =>
  date && date.getDate() === today.getDate() && date.getMonth() === today.getMonth();

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
    const hasJoiningId = normalizedRow.some((cell) =>
      cell === 'id' ||
      cell.includes('joining id') ||
      cell.includes('indent number') ||
      cell.includes('employee id')
    );

    if (hasName && hasJoiningId) {
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

const buildJoiningNotifications = (rawRows) => {
  if (!Array.isArray(rawRows)) return [];

  const { headerRowIndex, headers } = findJoiningHeader(rawRows);
  const rows = rawRows.slice(headerRowIndex + 1);
  const idxName = getHeaderIndex(headers, ['Name As Per Aadhar', 'Candidate Name', 'Candiate Name'], 10);
  const idxDob = getHeaderIndex(headers, ['Date Of Birth As Per Aadhar Card', 'Date Of Birth', 'DOB'], -1);
  const idxJoiningDate = getHeaderIndex(headers, ['Date Of Joining', 'Joining Date'], 12);
  const idxPhoto = getHeaderIndex(headers, ["Candidate's Photo", 'Candidate Photo', 'Photo'], 18);
  const idxDesignation = getHeaderIndex(headers, ['Designation'], 14);
  const idxDept = getHeaderIndex(headers, ['Department'], 2);
  const idxEmployeeId = getHeaderIndex(headers, ['Joining ID', 'Indent Number', 'Employee ID'], 5);
  const today = new Date();
  const todayKey = today.toLocaleDateString('en-CA');

  return rows.flatMap((row) => {
    const name = normalize(row[idxName]);
    if (!name) return [];

    const employeeId = normalize(row[idxEmployeeId]);
    const photo = row[idxPhoto] || '';
    const designation = row[idxDesignation] || '';
    const department = row[idxDept] || '';
    const notifications = [];

    if (idxDob !== -1) {
      const birthdayDate = parseSheetDate(row[idxDob]);
      if (isSameMonthDay(birthdayDate, today)) {
        notifications.push({
          id: `birthday-${employeeId || name}-${todayKey}`,
          type: 'birthday',
          title: `${name}'s birthday today`,
          message: designation ? `${designation}${department ? ` - ${department}` : ''}` : 'Send birthday wishes today.',
          dateLabel: birthdayDate ? formatDisplayDate(birthdayDate) : '',
          photo,
          priority: 1,
        });
      }
    }

    if (idxJoiningDate !== -1) {
      const joiningDate = parseSheetDate(row[idxJoiningDate]);
      if (isSameMonthDay(joiningDate, today) && joiningDate.getFullYear() < today.getFullYear()) {
        const years = today.getFullYear() - joiningDate.getFullYear();
        notifications.push({
          id: `joining-anniversary-${employeeId || name}-${todayKey}`,
          type: 'joining-anniversary',
          title: `${name}'s joining anniversary`,
          message: `${years} ${years === 1 ? 'year' : 'years'} completed${designation ? ` - ${designation}` : ''}`,
          dateLabel: joiningDate ? formatDisplayDate(joiningDate) : '',
          photo,
          priority: 2,
        });
      }
    }

    return notifications;
  });
};

const buildFeedNotifications = (rawRows) => {
  if (!Array.isArray(rawRows) || rawRows.length <= 1) return [];

  return rawRows.slice(1).map((row, index) => {
    const date = row[0] || '';
    const image = row[1] || '';
    const sms = row[2] || '';
    const smsType = row[3] || 'Feed';
    const name = row[4] || '';
    const designation = row[5] || '';
    const parsedDate = parseSheetDate(date);
    const stableText = [date, smsType, name, sms].map(normalize).join('|');

    const id = `feed-${index + 2}-${stableText}`;

    return {
      id,
      type: 'feed',
      title: `${smsType} feed uploaded`,
      message: name ? `${name}: ${sms || designation || 'New update uploaded.'}` : sms || 'New feed update uploaded.',
      dateLabel: parsedDate ? formatDisplayDate(parsedDate) : normalize(date),
      photo: image,
      priority: 3,
      targetPath: `/employee-mobile?feed=${encodeURIComponent(id)}`,
    };
  })
    .filter((item) => item.message || item.photo)
    .reverse()
    .slice(0, 10);
};

const showNotificationToasts = (notifications, showToast) => {
  if (!showToast || notifications.length === 0) return;

  const calendarItems = notifications.filter((item) => item.type === 'birthday' || item.type === 'joining-anniversary');
  if (calendarItems.length > 0) {
    const todayKey = new Date().toLocaleDateString('en-CA');
    const toastKey = `hrms_calendar_notification_toast_${todayKey}`;
    if (!sessionStorage.getItem(toastKey)) {
      toast.success(calendarItems.length === 1 ? calendarItems[0].title : `${calendarItems.length} birthday/anniversary notifications today.`);
      sessionStorage.setItem(toastKey, '1');
    }
  }

  const feedItems = notifications.filter((item) => item.type === 'feed');
  if (feedItems.length === 0) return;

  const seenFeedIds = readSeenFeedIds();
  const currentFeedIds = new Set(feedItems.map((item) => item.id));

  if (!seenFeedIds) {
    writeSeenFeedIds(currentFeedIds);
    return;
  }

  const newFeedItems = feedItems.filter((item) => !seenFeedIds.has(item.id));
  if (newFeedItems.length > 0) {
    const toastId = newFeedItems.map((item) => item.id).join(',');
    const sessionKey = `hrms_feed_notification_toast_${toastId}`;
    if (!sessionStorage.getItem(sessionKey)) {
      toast.success(newFeedItems.length === 1 ? newFeedItems[0].title : `${newFeedItems.length} new feed notifications uploaded.`);
      sessionStorage.setItem(sessionKey, '1');
    }
  }

  writeSeenFeedIds(new Set([...seenFeedIds, ...currentFeedIds]));
};

export const useHrmsNotifications = ({ enabled = true, showToast = false } = {}) => {
  const initialNotifications = useMemo(() => readCachedNotifications(), []);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [notificationsLoading, setNotificationsLoading] = useState(initialNotifications.length === 0);
  const [readIds, setReadIds] = useState(() => readNotificationIds());

  useEffect(() => {
    if (!enabled) {
      setNotificationsLoading(false);
      return undefined;
    }

    let isMounted = true;
    let requestRunning = false;

    const fetchNotifications = async ({ silent = false } = {}) => {
      if (requestRunning) return;
      requestRunning = true;

      try {
        if (!silent) setNotificationsLoading(true);
        const cacheBuster = `&_=${Date.now()}`;
        const [joiningResponse, feedResponse] = await Promise.all([
          fetch(`${import.meta.env.VITE_JOINING_SHEET_URL}?action=read&sheet=JOINING_FMS${cacheBuster}`, { cache: 'no-store' }),
          fetch(`${import.meta.env.VITE_GOOGLE_SHEET_URL}?action=fetch&sheet=${encodeURIComponent('Onboard and Status')}${cacheBuster}`, { cache: 'no-store' }),
        ]);

        const [joiningJson, feedJson] = await Promise.all([
          joiningResponse.json(),
          feedResponse.json(),
        ]);

        const joiningRows = joiningJson.data || joiningJson;
        const feedRows = feedJson.data || feedJson;
        const nextNotifications = [
          ...buildJoiningNotifications(joiningRows),
          ...buildFeedNotifications(feedRows),
        ].sort((a, b) => a.priority - b.priority);

        writeCachedNotifications(nextNotifications);
        showNotificationToasts(nextNotifications, showToast);

        if (isMounted) {
          setNotifications(nextNotifications);
          setNotificationsLoading(false);
        }
      } catch (error) {
        console.error('Failed to load HRMS notifications:', error);
        if (isMounted) setNotificationsLoading(false);
      } finally {
        requestRunning = false;
      }
    };

    const refreshNotifications = () => fetchNotifications({ silent: true });
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') refreshNotifications();
    };

    fetchNotifications({ silent: initialNotifications.length > 0 });
    const intervalId = window.setInterval(refreshNotifications, REFRESH_INTERVAL_MS);
    window.addEventListener('focus', refreshNotifications);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshNotifications);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, initialNotifications.length, showToast]);

  const readIdSet = useMemo(() => new Set(readIds), [readIds]);
  const visibleNotifications = useMemo(
    () => notifications.map((item) => ({ ...item, read: readIdSet.has(item.id) })),
    [notifications, readIdSet]
  );
  const unreadCount = useMemo(
    () => visibleNotifications.filter((item) => !item.read).length,
    [visibleNotifications]
  );
  const markNotificationRead = (id) => {
    if (!id) return;
    setReadIds((currentIds) => {
      if (currentIds.includes(id)) return currentIds;
      const nextIds = [...currentIds, id];
      writeReadNotificationIds(nextIds);
      return nextIds;
    });
  };

  return {
    notifications: visibleNotifications,
    notificationsLoading,
    unreadCount,
    markNotificationRead,
  };
};
