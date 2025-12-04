import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Indent from "./pages/Indent";
import SocialSite from "./pages/SocialSite";
import FindEnquiry from "./pages/FindEnquiry";
import CallTracker from "./pages/CallTracker";
import AfterJoiningWork from "./pages/AfterJoiningWork";
import Leaving from "./pages/Leaving";
import AfterLeavingWork from "./pages/AfterLeavingWork";
import Employee from "./pages/Employee";
import MyProfile from "./pages/MyProfile";
import MyAttendance from "./pages/MyAttendance";
import LeaveRequest from "./pages/LeaveRequest";
import MySalary from "./pages/MySalary";
import CompanyCalendar from "./pages/CompanyCalendar";
import ProtectedRoute from "./components/ProtectedRoute";
import Attendance from "./pages/Attendance";
import LeaveManagement from "./pages/LeaveManagement";
import Attendancedaily from "./pages/Attendancedaily";
import Report from "./pages/Report";
import Payroll from "./pages/Payroll";
import MisReport from "./pages/MisReport";
import Joining from "./pages/Joining";
import GatePass from "./pages/GatePass";
import GatePassRequest from "./pages/GatePassRequest";
import Documents from "./pages/Documents";
import Vendors from "./pages/Vendors";
import Videos from "./pages/Videos";
import Inventory from "./pages/Inventory";
import HrLeads from "./pages/HrLeads";
import OnlinePosting from "./pages/OnlinePosting";
import CallingForJobAgencies from "./pages/CallingForJobAgencies";
import FullFillPostion from "./pages/FullFillPostion";

function App() {
  return (
    <div className="gradient-bg min-h-screen">
      <Router>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="indent" element={<Indent />} />
            {/* <Route path="social-site" element={<SocialSite />} /> */}
            <Route path="find-enquiry" element={<FindEnquiry />} />
            <Route path="call-tracker" element={<CallTracker />} />
            <Route path="joining" element={<Joining />} />
            <Route path="after-joining-work" element={<AfterJoiningWork />} />
            <Route path="leaving" element={<Leaving />} />
            <Route path="after-leaving-work" element={<AfterLeavingWork />} />
            <Route path="employee" element={<Employee />} />
            <Route path="my-profile" element={<MyProfile />} />
            <Route path="my-attendance" element={<MyAttendance />} />
            <Route path="leave-request" element={<LeaveRequest />} />
            <Route path="my-salary" element={<MySalary />} />
            <Route path="company-calendar" element={<CompanyCalendar />} />
            <Route path="leave-management" element={<LeaveManagement />} />
            <Route path="gate-pass" element={<GatePass />} />
            <Route path="gate-pass-request" element={<GatePassRequest />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="attendancedaily" element={<Attendancedaily />} />
            <Route path="report" element={<Report />} />
            <Route path="payroll" element={<Payroll />} />
            <Route path="misreport" element={<MisReport />} />


            <Route path="online_posting" element={<OnlinePosting />} />
            <Route path="calling_for_job_agencies" element={<CallingForJobAgencies />} />
            <Route path="full_fill_position" element={<FullFillPostion />} />

            <Route path="documents" element={<Documents />} />
            <Route path="vendor" element={<Vendors />} />
            <Route path="video" element={<Videos />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="hrleads" element={<HrLeads />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
