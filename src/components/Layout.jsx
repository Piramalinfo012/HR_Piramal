import React, { useState, useEffect } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bell, Gift, LogOut, Mail, Moon, Search, Sun, User } from 'lucide-react';
import Sidebar from './Sidebar';
import useAuthStore from '../store/authStore';
import { getUserRole } from '../utils/authRole';
import MobileBottomNav from './MobileBottomNav';
import { useHrmsNotifications } from '../hooks/useHrmsNotifications';

// ScrollToTop component to handle scrolling to top on route changes
const ScrollToTop = () => {
  const location = useLocation();

  useEffect(() => {
    // Wait for the component to fully render before scrolling
    const timer = setTimeout(() => {
      // Target the main content area that has the overflow-y-auto class
      const mainContent = document.querySelector('main.overflow-y-auto');
      if (mainContent) {
        // Scroll the main content area to top
        mainContent.scrollTop = 0;
      } else {
        // Fallback to window scroll if main content not found
        window.scrollTo({
          top: 0,
          left: 0,
          behavior: 'auto' // Use 'auto' for immediate scroll
        });

        // Also ensure the document body is scrolled to top
        if (document.body) {
          document.body.scrollTop = 0;
          document.documentElement.scrollTop = 0;
        }
      }
    }, 100); // Small delay to ensure DOM is updated

    return () => clearTimeout(timer);
  }, [location.pathname]); // Only run when pathname changes

  return null;
};

const getDriveImageUrl = (url, size) => {
  if (!url) return "";

  if (url.includes("cloudinary.com")) {
    return size ? url.replace("/upload/", `/upload/w_${size},q_auto,f_auto/`) : url;
  }

  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return `https://drive.google.com/thumbnail?id=${match[1]}${size ? `&sz=w${size}` : ""}`;
  }

  return url;
};



const Layout = () => {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('hrms-theme') === 'dark');
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const notificationMenuRef = React.useRef(null);
  const notificationButtonRef = React.useRef(null);
  const notificationButtonDesktopRef = React.useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!showNotificationMenu) return;
      if (
        notificationMenuRef.current?.contains(event.target) ||
        notificationButtonRef.current?.contains(event.target) ||
        notificationButtonDesktopRef.current?.contains(event.target)
      ) {
        return;
      }
      setShowNotificationMenu(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showNotificationMenu]);

  const storedUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  })();
  const currentUser = user || storedUser;
  const currentRole = getUserRole(currentUser || {});
  const isEmployee = currentRole === 'employee';
  const isEmployeeMobile = isEmployee && isMobile;
  const employeeAllowedPaths = ['/employee-mobile', '/my-attendance', '/mark-attendance', '/leave-request', '/leave-management', '/employee-profile'];

  useEffect(() => {
    if (!isEmployee) return;
    if (!navigator.geolocation) return;

    const handleUpdate = (position) => {
      const latitude = Number(position.coords.latitude.toFixed(7));
      const longitude = Number(position.coords.longitude.toFixed(7));
      const accuracy = position.coords.accuracy || 0;

      let cached = null;
      try {
        cached = JSON.parse(localStorage.getItem("mark_attendance_location_cache_v1") || "null");
      } catch {}

      const cachedData = cached?.data;
      const latDiff = cachedData ? Math.abs(cachedData.latitude - latitude) : 1;
      const lngDiff = cachedData ? Math.abs(cachedData.longitude - longitude) : 1;
      const address = (latDiff < 0.0004 && lngDiff < 0.0004) ? (cachedData.address || "") : "";

      const nextLoc = { latitude, longitude, address, accuracy };
      try {
        localStorage.setItem(
          "mark_attendance_location_cache_v1",
          JSON.stringify({ savedAt: Date.now(), data: nextLoc })
        );
      } catch {}
    };

    const handleError = (err) => {
      if (err.code === 3 || err.message?.includes("Timeout")) {
        navigator.geolocation.getCurrentPosition(handleUpdate, () => {}, {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 60000,
        });
      }
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
      navigator.geolocation.clearWatch(watchId);
    };
  }, [isEmployee]);

  useEffect(() => {
    if (!isEmployee) return;

    const prefetchMasterData = async () => {
      let isCacheValid = false;
      try {
        const cached = JSON.parse(localStorage.getItem("mark_attendance_master_cache_v1") || "null");
        if (cached && Date.now() - Number(cached.savedAt || 0) < 15 * 60 * 1000) {
          isCacheValid = true;
        }
      } catch {}

      if (isCacheValid) return;

      try {
        const url = `https://docs.google.com/spreadsheets/d/1WTT8ZQhtf1yeSChNn2uJeW5Tz2TvYjQLrxhTx5l4Fgw/gviz/tq?tqx=out:json&sheet=Master&cb=${Date.now()}`;
        const response = await fetch(url);
        if (!response.ok) return;
        const text = await response.text();
        const jsonStart = text.indexOf("{");
        const jsonEnd = text.lastIndexOf("}");
        if (jsonStart === -1 || jsonEnd === -1) return;
        const payload = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
        const rows = (payload.table?.rows || []).map((row) =>
          (row.c || []).map((cell) => cell?.f ?? cell?.v ?? "")
        );

        const cleanNormalize = (val) => String(val || "").trim().toLowerCase();
        const parseNumberOrNull = (val) => {
          if (val === undefined || val === null || String(val).trim() === "") return null;
          const parsed = Number(String(val).replace(/[^0-9.-]/g, ""));
          return Number.isFinite(parsed) ? parsed : null;
        };

        const normalized = rows
          .map((row) => ({
            personName: row[0] || "",
            username: row[1] || "",
            role: row[3] || "",
            access: row[4] || "",
            employeeType: row[5] || "",
            latitude: parseNumberOrNull(row[6]),
            longitude: parseNumberOrNull(row[7]),
            rangeMeters: parseNumberOrNull(row[8]) || 100,
          }))
          .filter((row) => {
            const name = cleanNormalize(row.personName);
            return name && name !== "sales person name";
          });

        localStorage.setItem(
          "mark_attendance_master_cache_v1",
          JSON.stringify({ savedAt: Date.now(), data: normalized })
        );
      } catch (err) {
        console.error("Prefetch Master data error:", err);
      }
    };

    prefetchMasterData();
  }, [isEmployee]);

  const displayName =
    currentUser?._displayName ||
    currentUser?.Name ||
    currentUser?.name ||
    currentUser?.["Sales Person Name"] ||
    currentUser?.["Employee Name"] ||
    currentUser?.Username ||
    currentUser?.["User Name"] ||
    "User";
  const displayId =
    currentUser?._authUsername ||
    currentUser?.Username ||
    currentUser?.["User Name"] ||
    currentUser?.["User ID"] ||
    currentUser?.id ||
    "";
  const displayRole = currentRole ? currentRole.charAt(0).toUpperCase() + currentRole.slice(1) : "User";
  const profilePic =
    currentUser?.profilePic ||
    currentUser?.ProfilePic ||
    currentUser?.["Profile Pic"] ||
    currentUser?.Photo ||
    currentUser?.["Photo"] ||
    storedUser?.profilePic ||
    "";
  const { notifications, notificationsLoading, unreadCount, markNotificationRead } = useHrmsNotifications({
    enabled: true,
    showToast: !isEmployeeMobile,
  });

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("employeeId");
    logout();
    navigate("/login", { replace: true });
  };

  const handleNotificationClick = (item) => {
    markNotificationRead(item.id);
    if (item.targetPath) {
      setShowNotificationMenu(false);
      navigate(item.targetPath);
    }
  };

  useEffect(() => {
    const updateViewport = () => setIsMobile(window.matchMedia('(max-width: 767px)').matches);
    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  useEffect(() => {
    localStorage.setItem('hrms-theme', isDarkMode ? 'dark' : 'light');
    document.documentElement.classList.toggle('erp-dark-root', isDarkMode);
  }, [isDarkMode]);

  if (isEmployee && location.pathname === '/') {
    return <Navigate to={isMobile ? "/employee-mobile" : "/my-attendance"} replace />;
  }

  if (isEmployee && !employeeAllowedPaths.includes(location.pathname)) {
    return <Navigate to={isMobile ? "/employee-mobile" : "/my-attendance"} replace />;
  }

  if (isEmployeeMobile) {
    return (
      <div className="min-h-screen overflow-x-hidden bg-[#f4f7fb] pb-[100px]">
        <ScrollToTop />
        <header className="fixed left-0 right-0 top-0 z-[110] bg-[#f4f7fb]/95 py-3 backdrop-blur-xl border-b border-slate-200/50">
          <div className="relative flex items-center justify-between px-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl border border-white bg-white shadow-[0_12px_28px_rgba(15,23,42,0.12)]">
                {profilePic ? (
                  <img
                    src={getDriveImageUrl(profilePic, 150)}
                    alt="Profile"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-slate-100">
                    <User size={24} className="text-slate-700" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-950">{displayName}</p>
                <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">Employee Portal</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  ref={notificationButtonRef}
                  type="button"
                  onClick={() => setShowNotificationMenu((visible) => !visible)}
                  className="relative grid h-10 w-10 place-items-center rounded-2xl bg-white text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.08)]"
                  aria-label="Notifications"
                >
                  <Bell size={18} />
                  {unreadCount > 0 ? (
                    <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white ring-2 ring-white">
                      {unreadCount}
                    </span>
                  ) : null}
                </button>

                {showNotificationMenu ? (
                  <div ref={notificationMenuRef} className="absolute right-0 top-12 z-[130] w-[min(340px,calc(100vw-32px))] overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_24px_54px_rgba(15,23,42,0.18)]">
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                      <div>
                        <p className="text-sm font-black text-slate-950">Notifications</p>
                        <p className="text-[11px] font-bold text-slate-400">Birthdays, anniversaries and feed updates</p>
                      </div>
                      <span className="grid h-9 w-9 place-items-center rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-rose-100">
                        <Gift size={18} />
                      </span>
                    </div>
                    <div className="max-h-80 overflow-y-auto p-3">
                      {notificationsLoading ? (
                        <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">Checking notifications...</p>
                      ) : notifications.length > 0 ? (
                        <div className="space-y-2">
                          {notifications.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleNotificationClick(item)}
                              className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left transition ${
                                item.read
                                  ? 'bg-white ring-1 ring-slate-100 hover:bg-slate-50'
                                  : 'bg-rose-50/70 ring-1 ring-rose-100 hover:bg-rose-50'
                              }`}
                            >
                              <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white text-rose-600 ring-1 ring-rose-100">
                                {item.photo ? (
                                  <img src={getDriveImageUrl(item.photo, 120)} alt={item.title} className="h-full w-full object-cover" />
                                ) : (
                                  <Gift size={20} />
                                )}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="flex items-center gap-2">
                                  {!item.read ? <span className="h-2 w-2 shrink-0 rounded-full bg-rose-500" /> : null}
                                  <span className="block truncate text-sm font-black text-slate-900">{item.title}</span>
                                </span>
                                <span className="block truncate text-[11px] font-bold text-slate-500">
                                  {item.message}
                                </span>
                                {item.dateLabel ? (
                                  <span className="mt-0.5 block text-[10px] font-black uppercase tracking-wide text-rose-500">{item.dateLabel}</span>
                                ) : null}
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">No notifications right now.</p>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.08)]"
                aria-label="Logout"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </header>
        <main className="min-h-screen w-full bg-[#f4f7fb] pt-[84px]">
          <Outlet />
        </main>
        <MobileBottomNav />
      </div>
    );
  }

  return (
    <div className={`hrms-app flex h-screen ${isDarkMode ? 'erp-dark bg-[#06101f]' : 'bg-[#e8eef6]'}`}>
      {/* Scroll to top component */}
      <ScrollToTop />

      {/* Sidebar - Remove the key prop that was causing re-render issues */}
      <Sidebar />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="erp-topbar z-40 hidden h-[64px] flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white/95 px-5 shadow-[0_8px_30px_rgba(15,23,42,0.05)] backdrop-blur lg:flex">
          <div className="flex items-center gap-4">
            <label className="relative block w-[360px]">
              <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                placeholder="Search anything..."
                className="erp-topbar-search h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-20 text-sm font-semibold text-slate-700 outline-none transition focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-100"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase tracking-wider text-slate-400">
                Ctrl + K
              </span>
            </label>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsDarkMode((enabled) => !enabled)}
              title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
              aria-pressed={isDarkMode}
              className="erp-theme-toggle flex h-10 w-10 items-center justify-center rounded-xl text-slate-700 transition hover:bg-slate-100"
            >
              {isDarkMode ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <div className="relative">
              <button
                ref={notificationButtonDesktopRef}
                type="button"
                onClick={() => setShowNotificationMenu((visible) => !visible)}
                className="erp-icon-button relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-700 transition hover:bg-slate-100"
                aria-label="Notifications"
              >
                <Bell size={18} />
                {unreadCount > 0 ? (
                  <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white ring-2 ring-white">
                    {unreadCount}
                  </span>
                ) : null}
              </button>

              {showNotificationMenu ? (
                <div ref={notificationMenuRef} className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_24px_54px_rgba(15,23,42,0.18)]">
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                    <div>
                      <p className="text-sm font-black text-slate-950">Notifications</p>
                      <p className="text-[11px] font-bold text-slate-400">Birthdays, anniversaries and feed updates</p>
                    </div>
                    <span className="grid h-9 w-9 place-items-center rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-rose-100">
                      <Gift size={18} />
                    </span>
                  </div>
                  <div className="max-h-80 overflow-y-auto p-3">
                    {notificationsLoading ? (
                      <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">Checking notifications...</p>
                    ) : notifications.length > 0 ? (
                      <div className="space-y-2">
                        {notifications.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleNotificationClick(item)}
                            className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left transition ${
                              item.read
                                ? 'bg-white ring-1 ring-slate-100 hover:bg-slate-50'
                                : 'bg-rose-50/70 ring-1 ring-rose-100 hover:bg-rose-50'
                            }`}
                          >
                            <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white text-rose-600 ring-1 ring-rose-100">
                              {item.photo ? (
                                <img src={getDriveImageUrl(item.photo, 120)} alt={item.title} className="h-full w-full object-cover" />
                              ) : (
                                <Gift size={20} />
                              )}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center gap-2">
                                {!item.read ? <span className="h-2 w-2 shrink-0 rounded-full bg-rose-500" /> : null}
                                <span className="block truncate text-sm font-black text-slate-900">{item.title}</span>
                              </span>
                              <span className="block truncate text-[11px] font-bold text-slate-500">
                                {item.message}
                              </span>
                              {item.dateLabel ? (
                                <span className="mt-0.5 block text-[10px] font-black uppercase tracking-wide text-rose-500">{item.dateLabel}</span>
                              ) : null}
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">No notifications right now.</p>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
            <button className="erp-icon-button flex h-10 w-10 items-center justify-center rounded-xl text-slate-700 transition hover:bg-slate-100">
              <Mail size={18} />
            </button>
            <div className="erp-profile-button ml-2 flex min-w-[220px] items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm">
              <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-slate-800 text-white">
                {profilePic ? (
                  <img
                    src={getDriveImageUrl(profilePic, 96)}
                    alt={displayName}
                    decoding="async"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      if (!e.target.dataset.retried) {
                        e.target.dataset.retried = "true";
                        const match = profilePic.match(/\/d\/([a-zA-Z0-9_-]+)/) || profilePic.match(/id=([a-zA-Z0-9_-]+)/);
                        e.target.src = match && match[1] ? `https://drive.google.com/uc?export=view&id=${match[1]}` : profilePic;
                      }
                    }}
                  />
                ) : (
                  <User size={18} />
                )}
              </span>
              <span className="min-w-0 flex-1 text-left leading-tight">
                <span className="block max-w-[145px] truncate text-sm font-black text-slate-800">
                  {displayName}
                </span>
              </span>
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title="Logout"
              aria-label="Logout"
              className="erp-icon-button flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-rose-50 hover:text-rose-600"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <main className="erp-shell flex-1 overflow-y-auto pt-16 md:pt-16 lg:pt-4 p-3 sm:p-4 scrollbar-hide pb-[100px] md:pb-4">
          <div className="container mx-auto max-w-[1500px]">
            <Outlet />
          </div>
        </main>

        {/* Fixed Footer */}
        <footer className="erp-footer border-t border-slate-200 bg-white/90 px-4 py-2.5 shadow-[0_-10px_30px_rgba(15,23,42,0.05)] backdrop-blur flex-shrink-0 z-50 hidden md:block">
          <div className="container mx-auto text-center text-sm font-semibold text-slate-500">
            Developed By <span className="font-black text-indigo-600">Deepak Sahu</span>
          </div>
        </footer>
        <MobileBottomNav />
      </div>
    </div>
  );
};

export default Layout;
