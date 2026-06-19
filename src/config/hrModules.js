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
      { path: "/online_posting", label: "Online Posting & Job Agency Calling", aliases: ["Online Posting", "Calling for Job Agencies", "Job Agency Calling"] },
      { path: "/call-tracker", label: "Call Tracker" },
      { path: "/interview-scheduled", label: "Interview Scheduled" },
      {
        path: "/candidate_sortlisted",
        label: "Candidate Shortlisted",
        aliases: ["Candidate Sortlisted"],
      },
      { path: "/verification_before_interview", label: "Verification After Interview" },
      { path: "/interview_final_selection", label: "Final Selection", aliases: ["Interview & Final Selection"] },
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
      { path: "/feed-management", label: "Feed Management" },
    ],
  },
  {
    type: "dropdown",
    icon: "UserCheck",
    label: "Employee Management",
    items: [
      { path: "/employee", label: "Employee Master", aliases: ["Employee"] },
      { path: "/employee-profile", label: "Employee Profile", placeholder: true },
      { path: "/documents", label: "Employee Documents", aliases: ["Documents"] },
    ],
  },
  {
    type: "dropdown",
    icon: "Clock",
    label: "Attendance Management",
    items: [
      { path: "/mark-attendance", label: "Mark Attendance" },
      { path: "/attendance", label: "Biometric Attendance", aliases: ["Attendance"] },
      { path: "/shift-management", label: "Shift Management", placeholder: true },
      { path: "/outstation-attendance", label: "Outstation Attendance" },
      { path: "/ta-da", label: "TA & DA" },
    ],
  },
  {
    type: "dropdown",
    icon: "BookPlus",
    label: "Leave Management",
    items: [
      { path: "/leave-request", label: "Leave Application" },
      { path: "/leave-management", label: "Leave Approval", aliases: ["Leave Management"] },
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
      { path: "/outstation-master", label: "Outstation Master" },
      { path: "/role-management", label: "Role Management", placeholder: true },
      { path: "/permission-management", label: "Permission Management", placeholder: true },
      { path: "/login-activity-logs", label: "Login Activity Logs", placeholder: true },
    ],
  },
];

export const employeeNavigationItems = [
  { path: "/employee-mobile", icon: "Home", label: "Home" },
  { path: "/mark-attendance", icon: "Clock", label: "Mark Attendance" },
  { path: "/my-attendance", icon: "Clock", label: "Outstation Attendance" },
  { path: "/leave-request", icon: "LeaveIcon", label: "Leave Request" },
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
