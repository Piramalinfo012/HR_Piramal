const normalize = (value) => value.trim().toLowerCase();

export const adminNavigationItems = [
  {
    path: "/",
    icon: "LayoutDashboard",
    label: "Dashboard",
  },
  {
    type: "dropdown",
    icon: "Users",
    label: "Recruitment Management",
    items: [
      { path: "/indent", label: "Indent" },
      { path: "/online_posting", label: "Online Posting" },
      { path: "/calling_for_job_agencies", label: "Calling for Job Agencies" },
      { path: "/whatsapp", label: "WhatsApp Recruitment", aliases: ["Whatsapp"] },
      { path: "/call-tracker", label: "Call Tracker" },
      { path: "/interview-scheduled", label: "Interview Scheduled" },
      {
        path: "/candidate_shortlisted",
        label: "Candidate Shortlisted",
        aliases: ["Candidate Sortlisted"],
      },
      { path: "/verification_before_interview", label: "Verification Before Interview" },
      { path: "/interview_final_selection", label: "Interview & Final Selection" },
      { path: "/joining_follow_up", label: "Joining Follow Up" },
    ],
  },
  {
    type: "dropdown",
    icon: "NotebookPen",
    label: "Onboarding Management",
    items: [
      { path: "/joining", label: "Joining" },
      { path: "/check-salary-slip-and-resume", label: "Check Salary Slip & Resume Copy" },
      { path: "/joining-letter-release", label: "Joining Letter Release" },
      {
        path: "/induction-or-training",
        label: "Induction / Training",
        aliases: ["Induction Or Training"],
      },
      { path: "/asset-assignment", label: "Asset Assignment (IT Team)" },
    ],
  },
  {
    type: "dropdown",
    icon: "UserCheck",
    label: "Employee Management",
    items: [
      { path: "/employee", label: "Employee Master", aliases: ["Employee"] },
      { path: "/employee-profile", label: "Employee Profile", placeholder: true },
      {
        path: "/department-designation-management",
        label: "Department & Designation Management",
        placeholder: true,
      },
      { path: "/documents", label: "Employee Documents", aliases: ["Documents"] },
      {
        path: "/employee-lifecycle-management",
        label: "Employee Lifecycle Management",
        placeholder: true,
      },
    ],
  },
  {
    type: "dropdown",
    icon: "Clock",
    label: "Attendance Management",
    items: [
      { path: "/attendance", label: "Attendance" },
      { path: "/shift-management", label: "Shift Management", placeholder: true },
      { path: "/attendance-regularization", label: "Attendance Regularization", placeholder: true },
      { path: "/biometric-integration", label: "Biometric Integration", placeholder: true },
    ],
  },
  {
    type: "dropdown",
    icon: "BookPlus",
    label: "Leave Management",
    items: [
      { path: "/leave-request", label: "Leave Application" },
      { path: "/leave-management", label: "Leave Approval", aliases: ["Leave Management"] },
      { path: "/leave-balance", label: "Leave Balance", placeholder: true },
      { path: "/leave-reports", label: "Leave Reports", placeholder: true },
    ],
  },
  {
    type: "dropdown",
    icon: "BadgeDollarSign",
    label: "Payroll Management",
    items: [
      { path: "/payroll", label: "Salary Processing", aliases: ["Payroll"] },
      { path: "/salary-slip-generation", label: "Salary Slip Generation", placeholder: true },
      { path: "/reimbursement-management", label: "Reimbursement Management", placeholder: true },
      { path: "/full-final-settlement", label: "Full & Final Settlement", placeholder: true },
    ],
  },
  {
    type: "dropdown",
    icon: "CheckCircle",
    label: "Performance Management",
    items: [
      { path: "/kpi-management", label: "KPI Management", placeholder: true },
      { path: "/kra-management", label: "KRA Management", placeholder: true },
      { path: "/performance-review", label: "Performance Review", placeholder: true },
      { path: "/appraisal-management", label: "Appraisal Management", placeholder: true },
    ],
  },
  {
    type: "dropdown",
    icon: "Book",
    label: "Training & Development",
    items: [
      { path: "/employee-training", label: "Employee Training", placeholder: true },
      { path: "/skill-development", label: "Skill Development", placeholder: true },
      { path: "/training-calendar", label: "Training Calendar", placeholder: true },
      { path: "/training-feedback", label: "Training Feedback", placeholder: true },
    ],
  },
  {
    type: "dropdown",
    icon: "UserX",
    label: "Exit Management",
    items: [
      { path: "/leaving", label: "Leaving / Resignation", aliases: ["Leaving"] },
      { path: "/exit-interview", label: "Exit Interview", placeholder: true },
      { path: "/clearance-process", label: "Clearance Process", placeholder: true },
      { path: "/full-final-settlement", label: "Full & Final Settlement", placeholder: true },
    ],
  },
  {
    type: "dropdown",
    icon: "UserCog",
    label: "User & Access Management",
    items: [
      { path: "/user-management", label: "User Management" },
      { path: "/role-management", label: "Role Management", placeholder: true },
      { path: "/permission-management", label: "Permission Management", placeholder: true },
      { path: "/login-activity-logs", label: "Login Activity Logs", placeholder: true },
    ],
  },
];

export const employeeNavigationItems = [
  { path: "/my-profile", icon: "ProfileIcon", label: "My Profile" },
  { path: "/my-attendance", icon: "Clock", label: "My Attendance" },
  { path: "/leave-request", icon: "LeaveIcon", label: "Leave Request" },
  { path: "/gate-pass-request", icon: "DoorOpen", label: "Gate Pass Request" },
  { path: "/my-salary", icon: "DollarSign", label: "My Salary" },
  { path: "/company-calendar", icon: "Calendar", label: "Company Calendar" },
];

export const flattenNavigationItems = (items = adminNavigationItems) =>
  items.flatMap((item) => {
    if (item.type === "dropdown") {
      return item.items.map((child) => ({ ...child, module: item.label }));
    }

    return [{ ...item, module: "General" }];
  });

const uniqueByLabel = (labels) => [...new Set(labels)];

export const pageAccessGroups = [
  {
    label: "General",
    items: adminNavigationItems.filter((item) => item.type !== "dropdown").map((item) => item.label),
  },
  ...adminNavigationItems
    .filter((item) => item.type === "dropdown")
    .map((item) => ({
      label: item.label,
      items: item.items.map((child) => child.label),
    })),
  {
    label: "Employee Self Service",
    items: employeeNavigationItems.map((item) => item.label),
  },
].filter((group) => group.items.length > 0);

export const pageAccessOptions = uniqueByLabel(pageAccessGroups.flatMap((group) => group.items));

const allRouteItems = [
  ...flattenNavigationItems(adminNavigationItems),
  ...employeeNavigationItems.map((item) => ({ ...item, module: "Employee Self Service" })),
];

export const pageRouteMap = adminNavigationItems.reduce((routes, item) => {
  if (item.type === "dropdown" && item.items[0]) {
    routes[normalize(item.label)] = item.items[0].path;
  }

  return routes;
}, {});

allRouteItems.forEach((item) => {
  pageRouteMap[normalize(item.label)] = item.path;
  (item.aliases || []).forEach((alias) => {
    pageRouteMap[normalize(alias)] = item.path;
  });
});

const placeholderRouteMap = new Map();

flattenNavigationItems(adminNavigationItems)
  .filter((item) => item.placeholder)
  .forEach((item) => {
    if (!placeholderRouteMap.has(item.path)) {
      placeholderRouteMap.set(item.path, {
        path: item.path,
        label: item.label,
        module: item.module,
      });
    }
  });

export const placeholderRoutes = [...placeholderRouteMap.values()];
