import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  Building2,
  Eye,
  EyeOff,
  FileText,
  Lock,
  ShieldCheck,
  User,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";
import useAuthStore from "../store/authStore";
import { pageRouteMap } from "../config/hrModules";
import { getUserRole, isMobileViewport } from "../utils/authRole";

const SHEET_API_URL = `${import.meta.env.VITE_GOOGLE_SHEET_URL}?sheet=USER&action=fetch`;
const LEAVING_API_URL = `${import.meta.env.VITE_LEAVING_SHEET_URL}?sheet=LEAVING&action=fetch`;
const USER_CACHE_KEY = "hr-fms-user-cache-v2";
const USER_CACHE_TTL = 5 * 60 * 1000;
const USER_FETCH_TIMEOUT = 8000;
const LEAVING_FETCH_TIMEOUT = 2500;

localStorage.removeItem("hasSeenLanguageHint");

const fetchJsonWithTimeout = async (url, timeoutMs) => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    return await response.json();
  } finally {
    window.clearTimeout(timeoutId);
  }
};

const readUserCache = () => {
  try {
    const cached = JSON.parse(localStorage.getItem(USER_CACHE_KEY) || "null");
    if (!cached?.rows || !cached?.cachedAt) return null;
    if (Date.now() - cached.cachedAt > USER_CACHE_TTL) return null;
    return cached.rows;
  } catch {
    return null;
  }
};

const writeUserCache = (rows) => {
  try {
    localStorage.setItem(USER_CACHE_KEY, JSON.stringify({ rows, cachedAt: Date.now() }));
  } catch {
    // Storage is optional; login should never fail because cache is unavailable.
  }
};

const fetchUserRows = async () => {
  const cachedRows = readUserCache();
  if (cachedRows) return cachedRows;

  const result = await fetchJsonWithTimeout(`${SHEET_API_URL}&_t=${Date.now()}`, USER_FETCH_TIMEOUT);
  if (!result?.success || !Array.isArray(result.data)) {
    throw new Error("Error fetching user data");
  }

  writeUserCache(result.data);
  return result.data;
};

const fetchLeavingRows = async () => {
  try {
    const result = await fetchJsonWithTimeout(`${LEAVING_API_URL}&_t=${Date.now()}`, LEAVING_FETCH_TIMEOUT);
    if (!result?.success || !Array.isArray(result.data)) return [];
    return result.data;
  } catch (error) {
    console.warn("Leaving Fetch skipped:", error);
    return [];
  }
};

const parseUsers = (rows) => {
  const headers = rows?.[0] || [];
  const users = rows.slice(1).map((row) => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    obj._authUsername = row[0] ? row[0].toString().trim() : "";
    obj._authPassword = row[1] ? row[1].toString().trim() : "";
    obj.isDeleted = row[10] === "Deleted";
    return obj;
  });

  return { headers, users };
};

const parseLeavingData = (rows) => {
  const headers = rows.length > 5 ? rows[5] : [];
  const data = rows.length > 6
    ? rows.slice(6).map((row) => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index];
      });
      return obj;
    })
    : [];

  return { headers, data };
};

const resolveTargetRoute = (matchedUser) => {
  const userRole = getUserRole(matchedUser);

  if (userRole === "admin") return "/";
  if (userRole === "employee" && isMobileViewport()) return "/employee-mobile";

  const pageAccess = matchedUser["Pages Access"];
  if (!pageAccess) return userRole === "recruiter" ? "/indent" : "/my-profile";

  const accessList = pageAccess.split(",").map((page) => page.trim().toLowerCase());
  const firstAccessibleRoute = accessList.find((page) => pageRouteMap[page]);

  if (firstAccessibleRoute) return pageRouteMap[firstAccessibleRoute];
  return userRole === "recruiter" ? "/indent" : "/my-profile";
};

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  const modules = useMemo(() => [
    { label: "HR", value: "FMS", icon: Users },
    { label: "Docs", value: "Live", icon: FileText },
    { label: "Access", value: "Role", icon: ShieldCheck },
  ], []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      const userRowsPromise = fetchUserRows();
      const leavingRowsPromise = fetchLeavingRows();

      const userRows = await userRowsPromise;
      const { headers: userHeaders, users } = parseUsers(userRows);

      const matchedUser = users.find(
        (user) => user._authUsername === username.trim() && user._authPassword === password.trim() && !user.isDeleted
      );

      if (!matchedUser) {
        toast.error("Invalid credentials");
        setSubmitting(false);
        return;
      }

      const leavingRows = await leavingRowsPromise;
      const { headers: leavingHeaders, data: leavingData } = parseLeavingData(leavingRows);
      const userName = matchedUser[userHeaders[2]];
      const isUserLeaving = leavingData.some((record) => {
        const leavingName = record[leavingHeaders[2]];
        const leavingStatus = record[leavingHeaders[13]];
        return (
          leavingName &&
          userName &&
          leavingName.toString().toLowerCase() === userName.toString().toLowerCase() &&
          leavingStatus !== null &&
          leavingStatus !== undefined &&
          leavingStatus !== ""
        );
      });

      if (isUserLeaving) {
        toast.error("Employee access has been deactivated");
        setSubmitting(false);
        return;
      }

      toast.success("Login successful!");
      localStorage.setItem("user", JSON.stringify(matchedUser));
      login(matchedUser);

      try {
        const FETCH_URL = import.meta.env.VITE_GOOGLE_SHEET_URL;
        const JOIN_URL = import.meta.env.VITE_JOINING_SHEET_URL;
        const JOINING_SUBMIT_URL = "https://script.google.com/macros/s/AKfycbwhFgVoAB4S1cKrU0iDRtCH5B2K-ol2c0RmaaEWXGqv0bdMzs3cs3kPuqOfUAR3KHYZ7g/exec";

        if (FETCH_URL) {
          fetch(`${FETCH_URL}?sheet=FMS&action=fetch`);
          fetch(`${FETCH_URL}?sheet=Calling Tracking&action=fetch`);
          fetch(`${FETCH_URL}?sheet=USER&action=fetch`).then((response) => response.json()).then((freshUserData) => {
            if (freshUserData?.success && Array.isArray(freshUserData.data)) writeUserCache(freshUserData.data);
          }).catch(() => {});
        }
        if (JOIN_URL) fetch(`${JOIN_URL}?action=read&sheet=JOINING_FMS`);
        fetch(`${JOINING_SUBMIT_URL}?action=read&sheet=JOINING ENTRY FORM`);
      } catch (prefetchError) {
        console.error("Prefetch error", prefetchError);
      }

      navigate(resolveTargetRoute(matchedUser), { replace: true });
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Network error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f4f7fb] px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <style>
        {`
          @keyframes login-fade-up {
            from { opacity: 0; transform: translateY(18px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes login-scan {
            0% { transform: translateX(-100%); opacity: 0; }
            18% { opacity: 1; }
            100% { transform: translateX(100%); opacity: 0; }
          }
          @keyframes login-pulse-line {
            0%, 100% { transform: scaleX(0.35); opacity: 0.45; }
            50% { transform: scaleX(1); opacity: 1; }
          }
          .login-grid {
            background-image:
              linear-gradient(rgba(30, 64, 175, 0.08) 1px, transparent 1px),
              linear-gradient(90deg, rgba(30, 64, 175, 0.08) 1px, transparent 1px);
            background-size: 44px 44px;
          }
          .login-fade-up { animation: login-fade-up 580ms ease both; }
          .login-scan { animation: login-scan 4.8s ease-in-out infinite; }
          .login-pulse-line { animation: login-pulse-line 2.6s ease-in-out infinite; transform-origin: left; }
        `}
      </style>

      <div className="pointer-events-none absolute inset-0 login-grid" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-indigo-100/80 via-cyan-50/70 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-violet-100/70 to-transparent" />

      <main className="relative z-10 mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden login-fade-up lg:block">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white/80 px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-indigo-700 shadow-sm">
            <Building2 size={16} />
            HRMS ERP
          </div>

          <h1 className="max-w-xl text-5xl font-black leading-tight tracking-tight text-slate-950">
            HR operations console
          </h1>
          <p className="mt-4 max-w-lg text-base font-medium leading-7 text-slate-600">
            Secure access for attendance, documents, payroll workflows, and field movement data.
          </p>

          <div className="mt-8 grid max-w-xl grid-cols-3 gap-3">
            {modules.map((item, index) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur login-fade-up"
                  style={{ animationDelay: `${120 + index * 90}ms` }}
                >
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                    <Icon size={20} />
                  </div>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">{item.label}</p>
                  <p className="mt-1 text-xl font-black text-slate-950">{item.value}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-6 max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 p-5 text-white shadow-2xl shadow-slate-200">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity size={18} className="text-cyan-300" />
                <span className="text-sm font-bold">Live ERP Sync</span>
              </div>
              <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-bold text-emerald-200">Active</span>
            </div>
            <div className="relative h-2 overflow-hidden rounded-full bg-white/10">
              <div className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-cyan-400 via-indigo-400 to-violet-400 login-pulse-line" />
              <div className="absolute inset-y-0 w-1/2 bg-white/35 blur-md login-scan" />
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3 text-center">
              {["Auth", "Sheets", "Routes"].map((label) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
                  <p className="mt-1 text-sm font-black text-white">Ready</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="login-fade-up">
          <div className="mx-auto w-full max-w-md rounded-[28px] border border-white/80 bg-white/85 p-6 shadow-2xl shadow-indigo-100/70 backdrop-blur-xl sm:p-8">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-500 text-white shadow-xl shadow-indigo-200">
                <Users size={34} />
              </div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-indigo-600">Secure ERP Access</p>
              <h2 className="mt-2 text-4xl font-black tracking-tight text-slate-950">HRMS</h2>
              <p className="mt-2 text-sm font-semibold text-slate-500">Human Resource & File Management System</p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-2 block text-sm font-black text-slate-700">Username</span>
                <span className="relative block">
                  <User className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-sm font-bold text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                    placeholder="Enter your username"
                  />
                </span>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-black text-slate-700">Password</span>
                <span className="relative block">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-12 text-sm font-bold text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </span>
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="group flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-700 via-blue-600 to-cyan-500 text-sm font-black text-white shadow-xl shadow-indigo-200 transition hover:-translate-y-0.5 hover:shadow-2xl disabled:cursor-not-allowed disabled:opacity-75 disabled:hover:translate-y-0"
              >
                {submitting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight size={18} className="transition group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </form>
          </div>
        </section>
      </main>

      <div className="pointer-events-none absolute bottom-4 left-0 z-10 w-full text-center text-sm font-semibold text-slate-500">
        Developed By <span className="font-black text-indigo-600">Deepak Sahu</span>
      </div>
    </div>
  );
};

export default Login;
