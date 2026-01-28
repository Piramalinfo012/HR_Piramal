import React, { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Globe,
  Search,
  Phone,
  UserCheck,
  UserX,
  UserMinus,
  AlarmClockCheck,
  Users,
  Calendar,
  DollarSign,
  FileText as LeaveIcon,
  User as ProfileIcon,
  Clock,
  LogOut as LogOutIcon,
  X,
  DoorOpen,
  User,
  Menu,
  ChevronDown,
  ChevronUp,
  NotebookPen,
  Book,
  BadgeDollarSign,
  BookPlus,
  File,
  PersonStandingIcon,
  Video,
  Inbox,
  CheckCircle,
} from "lucide-react";

import useAuthStore from "../store/authStore";
import logo from "../assets/logo.png";

const Sidebar = ({ onClose }) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState("en");
  const [showLanguageHint, setShowLanguageHint] = useState(false);
  const [isTranslateReady, setIsTranslateReady] = useState(false);

  const userString = localStorage.getItem("user");
  const user = userString ? JSON.parse(userString) : null;

  const userPageAccess = user?.["Pages Access"]
    ? user["Pages Access"].split(",").map((page) => page.trim().toLowerCase())
    : [];

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  // Get current language from Google Translate
  const getCurrentLanguage = () => {
    const googTransCookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("googtrans="));

    if (googTransCookie) {
      const value = googTransCookie.split("=")[1];
      const langCode = value.split("/")[2];
      return langCode || "en";
    }
    return "en";
  };

  useEffect(() => {
    const hasSeenLanguageHint = localStorage.getItem("hasSeenLanguageHint");
    const currentDetectedLang = getCurrentLanguage();
    setCurrentLang(currentDetectedLang);

    if (!hasSeenLanguageHint && currentDetectedLang === "en") {
      setShowLanguageHint(true);
    } else {
      setShowLanguageHint(false);
    }

    // Ensure Google Translate cookie persistence on route change
    const ensureLanguagePersistence = () => {
      const detectedLang = getCurrentLanguage();
      if (detectedLang !== "en" && detectedLang) {
        const cookieValue = `/en/${detectedLang}`;
        const hostname = window.location.hostname;
        const domainPart =
          hostname === "localhost" || !hostname ? "" : `;domain=.${hostname}`;

        document.cookie = `googtrans=${cookieValue}${domainPart};path=/;max-age=31536000`;
        document.cookie = `googtrans=${cookieValue};path=/;max-age=31536000`;
      }
    };

    // Run on component mount
    ensureLanguagePersistence();
  }, []);

  useEffect(() => {
    const checkLanguageChange = () => {
      const newLang = getCurrentLanguage();
      if (newLang !== currentLang) {
        setCurrentLang(newLang);
      }
    };

    // Regularly check for language changes
    const interval = setInterval(checkLanguageChange, 1000);

    // Also check when page becomes visible again
    document.addEventListener("visibilitychange", checkLanguageChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", checkLanguageChange);
    };
  }, [currentLang]);

  useEffect(() => {
    const hideStyles = document.createElement("style");
    hideStyles.innerHTML = `
      /* Hide Google Translate banner/popup completely */
      .goog-te-banner-frame.skiptranslate { 
        display: none !important; 
      }
      
      /* Hide Google Translate popup/notification */
      .goog-te-menu-frame {
        display: none !important;
      }
      
      /* Hide any Google Translate balloons/popups */
      .goog-te-balloon-frame {
        display: none !important;
      }
      
      /* Hide translate suggestion popup */
      .goog-te-ftab {
        display: none !important;
      }
      
      /* Reset body positioning when Google Translate is active */
      body { 
        top: 0 !important; 
        position: static !important;
        margin-top: 0 !important;
        padding-top: 0 !important;
      }
      
      /* Hide the translate element */
      #google_translate_element { 
        display: none !important; 
      }
      
      /* Fix for any translate-related positioning issues */
      .skiptranslate {
        display: none !important;
      }
      
      /* Ensure no translate bar appears */
      iframe.goog-te-banner-frame {
        display: none !important;
      }
      
      /* Hide all translate iframes and popups */
      iframe[src*="translate.googleapis.com"] {
        display: none !important;
      }
      
      /* Fix body displacement on mobile */
      @media (max-width: 768px) {
        body {
          position: relative !important;
          top: 0 !important;
          left: 0 !important;
          margin: 0 !important;
          padding: 0 !important;
        }
      }
      
      /* Additional safety for translate bar and popups */
      .goog-te-banner-frame,
      .goog-te-menu-frame,
      .goog-te-balloon-frame,
      .goog-te-ftab {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        height: 0 !important;
        width: 0 !important;
        position: absolute !important;
        top: -9999px !important;
        left: -9999px !important;
        z-index: -1 !important;
      }
      
      /* Ensure main content is not displaced */
      #root, .app, main, .main-content {
        position: relative !important;
        top: 0 !important;
        margin-top: 0 !important;
      }
    `;
    document.head.appendChild(hideStyles);

    // Enhanced body positioning fix
    const checkAndFixBody = () => {
      const body = document.body;

      // Reset any inline styles that Google Translate might add
      if (body.style.top && body.style.top !== "0px") {
        body.style.top = "0px";
      }
      if (body.style.position === "relative" && body.style.top !== "0px") {
        body.style.position = "static";
        body.style.top = "0px";
      }

      // Remove any margin/padding that might be added
      if (body.style.marginTop && body.style.marginTop !== "0px") {
        body.style.marginTop = "0px";
      }
    };

    window.googleTranslateElementInit = () => {
      if (
        window.google &&
        window.google.translate &&
        window.google.translate.TranslateElement
      ) {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: "en",
            includedLanguages: "en,hi",
            autoDisplay: false,
            layout:
              window.google.translate.TranslateElement.InlineLayout.SIMPLE,
          },
          "google_translate_element"
        );

        setIsTranslateReady(true);

        // Monitor for language changes
        const observer = new MutationObserver(() => {
          const newLang = getCurrentLanguage();
          if (newLang !== currentLang) {
            setCurrentLang(newLang);
          }
          checkAndFixBody();
        });

        observer.observe(document.body, {
          attributes: true,
          childList: true,
          subtree: true,
        });

        setTimeout(checkAndFixBody, 500);
      }
    };

    if (!document.querySelector('script[src*="translate_a/element.js"]')) {
      const script = document.createElement("script");
      script.src =
        "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;
      script.onload = () => {
        setTimeout(checkAndFixBody, 1000);
      };
      document.body.appendChild(script);
    }

    // Run check immediately and set interval for periodic checks
    checkAndFixBody();
    const bodyFixInterval = setInterval(checkAndFixBody, 1000);

    return () => {
      if (bodyFixInterval) {
        clearInterval(bodyFixInterval);
      }
    };
  }, [currentLang]);

  const clearTranslateCookies = () => {
    // Clear all possible Google Translate cookies
    const cookieNames = ["googtrans", "googtrans-cache"];
    const hostname = window.location.hostname;
    const domains = [hostname, `.${hostname}`, "localhost", ""];

    cookieNames.forEach((cookieName) => {
      domains.forEach((domain) => {
        // Clear for current path
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${domain}`;
        // Clear for root path
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
        // Clear without domain
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT;`;
      });
    });
  };

  const toggleLanguage = () => {
    const targetLang = currentLang === "en" ? "hi" : "en";

    // Hide the hint when switching to Hindi or when language is toggled
    if (showLanguageHint) {
      setShowLanguageHint(false);
      localStorage.setItem("hasSeenLanguageHint", "true");
    }

    // Method 1: Try using Google Translate widget directly
    const tryGoogleTranslateWidget = () => {
      try {
        const selectElement = document.querySelector(
          "#google_translate_element select"
        );
        if (selectElement) {
          selectElement.value = targetLang;
          selectElement.dispatchEvent(new Event("change", { bubbles: true }));
          return true;
        }
      } catch (e) {
        console.error("Widget method failed:", e);
      }
      return false;
    };

    // Method 2: Try doGTranslate function
    const tryDoGTranslate = () => {
      try {
        if (typeof window.doGTranslate === "function") {
          window.doGTranslate(`en|${targetLang}`);
          return true;
        }
      } catch (e) {
        console.error("doGTranslate method failed:", e);
      }
      return false;
    };

    // Method 3: Set cookie and reload
    const setCookieAndReload = () => {
      clearTranslateCookies();

      const cookieValue = targetLang === "en" ? "" : `/en/${targetLang}`;
      const hostname = window.location.hostname;
      const domainPart =
        hostname === "localhost" || !hostname ? "" : `;domain=.${hostname}`;

      if (targetLang !== "en") {
        // Set multiple cookie variations to ensure persistence
        document.cookie = `googtrans=${cookieValue}${domainPart};path=/;max-age=31536000;SameSite=Lax`;
        document.cookie = `googtrans=${cookieValue};path=/;max-age=31536000;SameSite=Lax`;

        // Also set in localStorage for additional persistence
        localStorage.setItem("selectedLanguage", targetLang);
      } else {
        localStorage.removeItem("selectedLanguage");
      }

      setTimeout(() => {
        window.location.reload();
      }, 100);
    };

    // Try methods in sequence
    if (isTranslateReady) {
      if (!tryGoogleTranslateWidget()) {
        if (!tryDoGTranslate()) {
          setCookieAndReload();
        }
      }
    } else {
      setCookieAndReload();
    }

    // Update state immediately for UI feedback
    setCurrentLang(targetLang);

    // Force sidebar to re-render with new language
    setTimeout(() => {
      setCurrentLang(targetLang);
      // Force a state update to trigger re-render
      setIsOpen((prev) => !prev);
      setTimeout(() => setIsOpen((prev) => !prev), 100);
    }, 300);

    // Fix body positioning after translation
    setTimeout(() => {
      const body = document.body;
      if (body.style.top && body.style.top !== "0px") {
        body.style.top = "0px";
      }
      if (body.style.position === "relative") {
        body.style.position = "static";
      }
    }, 500);
  };

  const adminMenuItems = [
    { path: "/", icon: LayoutDashboard, label: "Dashboard" },
    { path: "/indent", icon: FileText, label: "Indent" },
    { path: "/online_posting", icon: FileText, label: "Online Posting" },
    // { path: "/find-enquiry", icon: Search, label: "Find Enquiry" },
    {
      path: "/calling_for_job_agencies",
      icon: Search,
      label: "Calling For Job Agencies",
    },
    { path: "/whatsapp", icon: Phone, label: "Whatsapp" },
    { path: "/call-tracker", icon: Phone, label: "Call Tracker" },
    {
      path: "/candidate_shortlisted",
      icon: Users,
      label: "Interview Schedule",
    },
    {
      path: "/candidate_sortlisted",
      icon: Users,
      label: "Candidate Sortlisted",
    },
    {
      path: "/verification_before_interview",
      icon: Search,
      label: "Verification Before Interview",
    },
    {
      path: "/interview_final_selection",
      icon: CheckCircle,
      label: "Interview & Final Selection",
    },
    {
      path: "/joining_follow_up",
      icon: Clock,
      label: "Joining Follow Up",
    },

    { path: "/joining", icon: NotebookPen, label: "Joining" },
    {
      path: "/check-salary-slip-and-resume",
      icon: FileText,
      label: "Check Salary Slip & Resume Copy",
    },
    {
      path: "/joining-letter-release",
      icon: FileText,
      label: "Joining Letter Release",
    },
    {
      path: "/induction-or-training",
      icon: Users,
      label: "Induction Or Training",
    },

    {
      path: "/asset-assignment",
      icon: LayoutDashboard,
      label: "Asset Assignment (IT Team)",
    },
    // {
    //   path: "/after-joining-work",
    //   icon: UserCheck,
    //   label: "After Joining Work",
    // },
    // { path: "/leaving", icon: UserX, label: "Leaving" },
    // {
    //   path: "/after-leaving-work",
    //   icon: UserMinus,
    //   label: "After Leaving Work",
    // },
    { path: "/employee", icon: Users, label: "Employee" },
    // { path: "/leave-management", icon: BookPlus, label: "Leave Management" },
    // { path: "/gate-pass", icon: DoorOpen, label: "Gate Pass" },
    // {
    //   type: "dropdown",
    //   icon: Book,
    //   label: "Attendance",
    //   isOpen: attendanceOpen,
    //   toggle: () => setAttendanceOpen(!attendanceOpen),
    //   items: [
    //     { path: "/attendance", label: "Monthly" },
    //     { path: "/attendancedaily", label: "Daily" },
    //   ],
    // },
    // { path: "/payroll", icon: BadgeDollarSign, label: "Payroll" },
    // { path: "/misreport", icon: AlarmClockCheck, label: "MIS Report" },

    // { path: "/documents", icon: File, label: "Documents" },
    // { path: "/vendor", icon: PersonStandingIcon, label: "Vendors" },
    // { path: "/video", icon: Video, label: "Videos" },
    // { path: "/inventory", icon: Inbox, label: "Inventory" },
    // { path: "/hrleads", icon: Inbox, label: "HR Leads" },
  ];

  const employeeMenuItems = [
    { path: "/my-profile", icon: ProfileIcon, label: "My Profile" },
    { path: "/my-attendance", icon: Clock, label: "My Attendance" },
    { path: "/leave-request", icon: LeaveIcon, label: "Leave Request" },
    { path: "/gate-pass-request", icon: DoorOpen, label: "Gate Pass Request" },
    { path: "/my-salary", icon: DollarSign, label: "My Salary" },
    { path: "/company-calendar", icon: Calendar, label: "Company Calendar" },
  ];

  // let menuItems = user?.Admin === "Yes" ? adminMenuItems : employeeMenuItems;

  // // Filter based on page access - apply to ALL users (including admin if they have restricted access)
  // if (userPageAccess.length > 0) {
  //   menuItems = menuItems.filter(item => {
  //     // For dropdown items, check if "Attendance" is in access list
  //     if (item.type === "dropdown") {
  //       const itemLabel = item.label.toLowerCase();
  //       return userPageAccess.includes(itemLabel);
  //     }

  //     // For regular items, check label
  //     const itemLabel = item.label.toLowerCase();
  //     return userPageAccess.includes(itemLabel);
  //   });
  // }

  let menuItems;

  if (userPageAccess.length > 0) {
    // Combine all possible menu items (admin + employee)
    const allMenuItems = [...adminMenuItems, ...employeeMenuItems];

    // Filter based on user's page access
    menuItems = allMenuItems.filter((item) => {
      // For dropdown items, check if "Attendance" is in access list
      if (item.type === "dropdown") {
        const itemLabel = item.label.toLowerCase();
        return userPageAccess.includes(itemLabel);
      }

      // For regular items, check label
      const itemLabel = item.label.toLowerCase();

      // Temporary bypass for new pages
      const newPages = [
        "check salary slip & resume copy",
        "joining letter release",
        "induction or training",
        "induction or welcome",
        "asset assignment (it team)",
        "whatsapp",
        "interview schedule",
        "candidate sortlisted",
        "verification before interview",
        "interview & final selection",
        "joining follow up",
        "call tracker",
      ];
      if (newPages.includes(itemLabel)) return true;

      return userPageAccess.includes(itemLabel);
    });

    // Remove duplicates (in case any item exists in both admin and employee menus)
    menuItems = menuItems.filter(
      (item, index, self) =>
        index === self.findIndex((t) => t.path === item.path)
    );
  } else {
    // Default behavior: show admin or employee menu based on Admin status
    menuItems = user?.Admin === "Yes" ? adminMenuItems : employeeMenuItems;
  }

  // console.log("userPageAccess",userPageAccess);
  // console.log("menuItems",menuItems);

  const SidebarContent = ({ onClose, isCollapsed = false }) => (
    <div
      className={`flex flex-col h-full ${isCollapsed ? "w-16" : "w-64"
        } bg-opacity-95 backdrop-blur-md shadow-2xl border-r border-white border-opacity-10`}
      style={{ background: 'var(--sidebar-gradient)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-white border-opacity-10">
        {!isCollapsed && (
          <h1 className="text-xl font-extrabold flex items-center gap-2 text-white tracking-tight">
            <div className="w-10 h-10 overflow-hidden rounded-lg shadow-sm border border-white border-opacity-10 flex items-center justify-center bg-white">
              <img src={logo} alt="Logo" className="w-full h-full object-contain" />
            </div>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-indigo-200">
              {currentLang === "en" ? "HR FMS" : "एचआर एफएमएस"}
            </span>
            <div className="relative">
              <button
                onClick={toggleLanguage}
                className="p-2 rounded-md hover:bg-indigo-800 transition relative"
                aria-label="Toggle language"
                title={
                  currentLang === "en"
                    ? "Switch to Hindi (हिंदी में बदलें)"
                    : "Switch to English (अंग्रेजी में बदलें)"
                }
              >
                <Globe size={20} />
                <span className="sr-only">
                  {currentLang === "en" ? "EN" : "हिं"}
                </span>
              </button>

              {/* Language indicator */}
              <div className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {currentLang === "en" ? "EN" : "हिं"}
              </div>

              {/* Language hint tooltip */}
              {showLanguageHint && currentLang === "en" && (
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 z-50">
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                    <div className="w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-orange-500"></div>
                  </div>
                </div>
              )}
            </div>
            <div id="google_translate_element" style={{ display: "none" }} />
            {user?.role === "employee" && (
              <span className="text-xs bg-white bg-opacity-20 px-2 py-1 rounded">
                {currentLang === "en" ? "Employee" : "कर्मचारी"}
              </span>
            )}
          </h1>
        )}
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
          >
            <span className="sr-only">Close sidebar</span>
            <X className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* Menu */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto scrollbar-hide" ref={(el) => {
        // Prevent automatic scrolling to active elements
        if (el) {
          el.style.scrollBehavior = 'auto';
        }
      }}>
        {menuItems.map((item) => {
          if (item.type === "dropdown") {
            return (
              <div key={item.label}>
                <button
                  onClick={item.toggle}
                  className={`flex items-center justify-between w-full py-2.5 px-4 rounded-xl transition-all duration-300 border border-transparent ${item.isOpen
                    ? "bg-white bg-opacity-10 text-white border-white border-opacity-20 shadow-lg"
                    : "text-indigo-100 hover:bg-white hover:bg-opacity-5 hover:text-white"
                    }`}
                >
                  <div className="flex items-center">
                    <item.icon
                      className={isCollapsed ? "mx-auto" : "mr-3"}
                      size={20}
                    />
                    {!isCollapsed && <span>{item.label}</span>}
                  </div>
                  {!isCollapsed &&
                    (item.isOpen ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    ))}
                </button>

                {item.isOpen && !isCollapsed && (
                  <div className="ml-6 mt-1 space-y-1">
                    {item.items.map((subItem) => (
                      <NavLink
                        key={subItem.path}
                        to={subItem.path}
                        className={({ isActive }) =>
                          `flex items-center py-2 px-4 rounded-lg transition-colors ${isActive
                            ? "bg-indigo-700 text-white"
                            : "text-indigo-100 hover:bg-indigo-800 hover:text-white"
                          }`
                        }
                        onClick={() => {
                          onClose?.();
                          // Prevent any scrolling behavior when clicking
                          setTimeout(() => {
                            if (document.activeElement instanceof HTMLElement) {
                              document.activeElement.blur();
                            }
                          }, 10);
                        }}
                      >
                        <span>{subItem.label}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center py-2.5 px-4 rounded-xl transition-all duration-300 border border-transparent mb-1 group ${isActive
                  ? "bg-white bg-opacity-20 text-white border-white border-opacity-30 shadow-lg scale-[1.02]"
                  : "text-indigo-100 hover:bg-white hover:bg-opacity-10 hover:text-white hover:translate-x-1"
                }`
              }
              onClick={() => {
                onClose?.();
                // Prevent any scrolling behavior when clicking
                setTimeout(() => {
                  if (document.activeElement instanceof HTMLElement) {
                    document.activeElement.blur();
                  }
                }, 10);
              }}
            >
              <item.icon
                className={isCollapsed ? "mx-auto" : "mr-3"}
                size={20}
              />
              {!isCollapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer - Always visible */}
      <div className="p-4 border-t border-white border-opacity-10 bg-black bg-opacity-10">
        <div className="flex items-center space-x-3 mb-4 px-2">
          <div className="flex items-center space-x-3 cursor-pointer group">
            <div className="w-10 h-10 rounded-full bg-white bg-opacity-20 flex items-center justify-center border border-white border-opacity-20 transition-transform group-hover:scale-110">
              <User size={20} className="text-white" />
            </div>
            <div className={`${isCollapsed ? "hidden" : "block"}`}>
              <p className="text-sm font-semibold text-white leading-tight">
                {user?.Name || user?.Username || "Guest"}
              </p>
              <p className="text-[10px] text-indigo-200 uppercase tracking-widest font-bold">
                {user?.Admin === "Yes" ? "Administrator" : "Employee"}
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={() => {
            handleLogout();
            onClose?.();
            setIsOpen(false);
          }}
          className="flex items-center py-2.5 px-4 rounded-xl text-white opacity-80 hover:bg-red-500 hover:bg-opacity-20 hover:text-red-300 hover:opacity-100 cursor-pointer transition-all duration-300 w-full group"
        >
          <LogOutIcon className={`${isCollapsed ? "mx-auto" : "mr-3"} group-hover:-translate-x-1 transition-transform`} size={20} />
          {!isCollapsed && <span className="font-medium">Logout</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile menu button - visible only on mobile */}
      {/* Mobile menu button - visible only on mobile */}
      <button
        className={`md:hidden fixed top-4 left-4 z-50 p-2 bg-indigo-900 text-white rounded-md shadow-md transition-opacity duration-300 ${isOpen ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
        onClick={() => setIsOpen(true)}
      >
        <Menu size={24} />
      </button>

      {/* Tablet menu button - visible on tablet (hidden on mobile and desktop) */}
      <button
        className={`hidden md:block lg:hidden fixed top-4 left-4 z-50 p-2 bg-indigo-900 text-white rounded-md shadow-md transition-opacity duration-300 ${isOpen ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
        onClick={() => setIsOpen(true)}
      >
        <Menu size={24} />
      </button>

      {/* Desktop Sidebar - full width on desktop */}
      <div className="hidden lg:block fixed left-0 top-0 h-full">
        <SidebarContent />
      </div>

      {/* Tablet Sidebar - collapsible */}
      <div
        className={`hidden md:block lg:hidden fixed inset-0 z-40 transition-all duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
      >
        <div
          className="fixed inset-0 bg-black bg-opacity-50"
          onClick={() => setIsOpen(false)}
        />
        <div
          className={`fixed left-0 top-0 h-full z-50 transform ${isOpen ? "translate-x-0" : "-translate-x-full"
            } transition-transform duration-300 ease-in-out`}
        >
          <SidebarContent onClose={() => setIsOpen(false)} />
        </div>
      </div>

      {/* Mobile Sidebar - collapsible */}
      <div
        className={`md:hidden fixed inset-0 z-40 transition-all duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
      >
        <div
          className="fixed inset-0 bg-black bg-opacity-50"
          onClick={() => setIsOpen(false)}
        />
        <div
          className={`fixed left-0 top-0 h-full z-50 transform ${isOpen ? "translate-x-0" : "-translate-x-full"
            } transition-transform duration-300 ease-in-out`}
        >
          <SidebarContent onClose={() => setIsOpen(false)} />
        </div>
      </div>

      {/* Add padding to main content when sidebar is open on desktop */}
      <div className="pt-16 md:pt-16 lg:pt-0 lg:pl-64"></div>
    </>
  );
};

export default Sidebar;
