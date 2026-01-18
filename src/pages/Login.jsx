import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Lock, FileText } from "lucide-react";
import toast from "react-hot-toast";
import useAuthStore from "../store/authStore";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUsers } from "@fortawesome/free-solid-svg-icons";

const SHEET_API_URL = `${import.meta.env.VITE_GOOGLE_SHEET_URL}?sheet=USER&action=fetch`;
const LEAVING_API_URL = "https://script.google.com/macros/s/AKfycbx7_8IiGXsVplVge8Fi8PIsxL1Ub_QqQI77x1flWxkl2KlyunmnVheG7yA6safW20yZ/exec?sheet=LEAVING&action=fetch";

localStorage.removeItem("hasSeenLanguageHint");

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const [userRes, leavingRes] = await Promise.all([
        fetch(SHEET_API_URL),
        fetch(LEAVING_API_URL),
      ]);

      const userJson = await userRes.json();
      const leavingJson = await leavingRes.json();

      // Final Check
      if (!userJson?.success || !leavingJson?.success) {
        console.error("Fetch Error Details:", { userJson, leavingJson });
        toast.error("Error fetching data");
        setSubmitting(false);
        return;
      }

      const userRows = userJson.data;
      const userHeaders = userRows[0];
      const users = userRows.slice(1).map((row) => {
        let obj = {};
        userHeaders.forEach((h, i) => (obj[h] = row[i]));
        return obj;
      });

      const leavingRows = leavingJson.data;
      const leavingHeaders = leavingRows[5];
      const leavingData = leavingRows.slice(6).map((row) => {
        let obj = {};
        leavingHeaders.forEach((h, i) => (obj[h] = row[i]));
        return obj;
      });

      const matchedUser = users.find(
        (u) => u.Username === username && u.Password === password
      );

      if (!matchedUser) {
        toast.error("Invalid credentials");
        setSubmitting(false);
        return;
      }

      const userName = matchedUser[userHeaders[2]];
      const isUserLeaving = leavingData.some((record) => {
        const leavingName = record[leavingHeaders[2]];
        const leavingStatus = record[leavingHeaders[13]];
        return (
          leavingName &&
          userName &&
          leavingName.toString().toLowerCase() ===
          userName.toString().toLowerCase() &&
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

      const adminStatus = matchedUser.Admin
        ? matchedUser.Admin.trim().toLowerCase()
        : "no";

      if (adminStatus === "yes") {
        navigate("/", { replace: true });
      } else {
        // For non-admin users, redirect to first accessible page
        const pageAccess = matchedUser["Pages Access"];

        if (pageAccess) {
          const accessList = pageAccess.split(",").map(page => page.trim().toLowerCase());

          // Map of page names to routes
          const pageRoutes = {
            "my profile": "/my-profile",
            "my attendance": "/my-attendance",
            "leave request": "/leave-request",
            "gate pass request": "/gate-pass-request",
            "my salary": "/my-salary",
            "company calendar": "/company-calendar",
            "dashboard": "/",
            "indent": "/indent",
            "find enquiry": "/find-enquiry",
            "call tracker": "/call-tracker",
            "joining": "/joining",
            "after joining work": "/after-joining-work",
            "leaving": "/leaving",
            "after leaving work": "/after-leaving-work",
            "employee": "/employee",
            "leave management": "/leave-management",
            "gate pass": "/gate-pass",
            "attendance": "/attendance",
            "payroll": "/payroll",
            "mis report": "/misreport"
          };

          // Find first accessible route
          const firstAccessibleRoute = accessList.find(page => pageRoutes[page]);
          const targetRoute = firstAccessibleRoute ? pageRoutes[firstAccessibleRoute] : "/my-profile";

          navigate(targetRoute, { replace: true });
        } else {
          // Fallback if no Pages Access defined
          navigate("/my-profile", { replace: true });
        }
      }

    } catch (err) {
      console.error(err);
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-100 via-purple-100 to-white">
      <div className="max-w-md w-full p-8 rounded-2xl shadow-xl border border-white/20 bg-white/60 backdrop-blur-lg space-y-8 transition-transform hover:scale-[1.01] duration-200">
        {/* Logo Section */}
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="h-16 w-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
              {/* <FileText className="h-8 w-8 text-white" /> */}
              <FontAwesomeIcon icon={faUsers} className="text-white h-8 w-8" />
            </div>
          </div>
          <h2
            className="text-3xl font-extrabold text-gray-900 mb-2 tracking-tight"
            style={{ fontFamily: "Poppins, sans-serif" }}
          >
            HR FMS
          </h2>
          <p
            className="text-sm text-black"
            style={{ fontFamily: "Poppins, sans-serif" }}
          >
            Human Resource & File Management System
          </p>
        </div>

        {/* Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-5">
            {/* Username */}
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-semibold text-blue-700 mb-2"
              >
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="appearance-none w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg shadow-sm bg-white/70 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all sm:text-sm"
                  placeholder="Enter your username"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-blue-700 mb-2"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg shadow-sm bg-white/70 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all sm:text-sm"
                  placeholder="Enter your password"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              className={`w-full flex justify-center py-3 px-4 text-sm font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-purple-600 shadow-md hover:shadow-lg hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 ${submitting ? "opacity-75 cursor-not-allowed" : ""
                }`}
              disabled={submitting}
            >
              {submitting ? (
                <div className="flex items-center">
                  <svg
                    className="animate-spin h-4 w-4 text-white mr-2"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span>Signing in...</span>
                </div>
              ) : (
                "Sign in"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
