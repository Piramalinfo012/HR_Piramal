import React, { useState, useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Bell, ChevronDown, Mail, Moon, PanelLeftClose, PanelLeftOpen, Search, Sun, User } from 'lucide-react';
import Sidebar from './Sidebar';
import useAuthStore from '../store/authStore';
import { getUserRole } from '../utils/authRole';
import MobileBottomNav from './MobileBottomNav';

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



const Layout = () => {
  const { user } = useAuthStore();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('hrms-theme') === 'dark');
  const storedUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  })();
  const currentUser = user || storedUser;
  const isEmployee = getUserRole(currentUser || {}) === 'employee';
  const isEmployeeMobile = isEmployee && isMobile;
  const employeeAllowedPaths = ['/employee-mobile', '/my-attendance', '/mark-attendance', '/leave-request', '/leave-management', '/employee-profile'];

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
      <div className="min-h-screen overflow-x-hidden bg-[#f7f7f4] pb-[100px]">
        <ScrollToTop />
        <main className="min-h-screen w-full bg-[#f7f7f4]">
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
      <Sidebar isCollapsed={isSidebarCollapsed} />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="erp-topbar z-40 hidden h-[64px] flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white/95 px-5 shadow-[0_8px_30px_rgba(15,23,42,0.05)] backdrop-blur lg:flex">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed((collapsed) => !collapsed)}
              aria-pressed={isSidebarCollapsed}
              title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              className={`erp-icon-button flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition duration-100 hover:bg-slate-50 ${isSidebarCollapsed ? "border-teal-300 bg-teal-50 text-teal-700" : ""}`}
            >
              {isSidebarCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
            </button>
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
            <button className="erp-icon-button relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-700 transition hover:bg-slate-100">
              <Bell size={18} />
              <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" />
            </button>
            <button className="erp-icon-button flex h-10 w-10 items-center justify-center rounded-xl text-slate-700 transition hover:bg-slate-100">
              <Mail size={18} />
            </button>
            <button className="erp-profile-button ml-2 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm transition hover:bg-slate-50">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-white">
                <User size={18} />
              </span>
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
              <ChevronDown size={16} className="text-slate-500" />
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
