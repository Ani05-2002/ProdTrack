// Common sidebar items shared between multiple roles.
const common = [
  { label: "Corrections Requests", icon: "✏️", page: "corrections" },
  { label: "Reports", icon: "📊", page: "reports" },

  // Notification badge is injected dynamically from Sidebar.jsx.
  { label: "Notifications", icon: "🔔", page: "notifications" },

  { label: "My Profile", icon: "👤", page: "my-profile" },
];

// Defines the original sidebar menu structure for every application role.
export const sidebarConfig = {
  indexer: [
    { label: "Dashboard", icon: "🏠", page: "dashboard" },
    { label: "Daily Entry", icon: "📝", page: "daily-entry" },
     // Uncomment if the client wants the Projects page again.
   // { label: "Projects", icon: "📁", page: "projects" },

    // The NEW badge is now injected dynamically from Sidebar.jsx.
    { label: "Indexing Guide", icon: "📘", page: "indexing-guide" },
     // Uncomment if the client wants the Reports page again.
  //{ label: "Reports", icon: "📊", page: "reports" },
    { label: "Attendance", icon: "🗓️", page: "attendance" },
    ...common.filter((item) => item.page !== "reports"),
  ],

  teamLead: [
    { label: "Dashboard", icon: "🏠", page: "dashboard" },
    { label: "Daily Entry", icon: "📝", page: "daily-entry" },
    { label: "My Team", icon: "👥", page: "my-team" },
    { label: "Projects", icon: "📁", page: "projects" },

    // The NEW badge is now injected dynamically from Sidebar.jsx.
    { label: "Indexing Guide", icon: "📘", page: "indexing-guide" },

    // The pending approval count is now injected dynamically from Sidebar.jsx.
    { label: "Approvals", icon: "✅", page: "corrections" },

    { label: "Attendance", icon: "🗓️", page: "attendance" },

    // Prevents the common Corrections item from appearing twice.
    ...common.filter((item) => item.page !== "corrections"),
  ],

  coreTeam: [
    { label: "Dashboard", icon: "🏠", page: "dashboard" },
    { label: "Analytics & KPIs", icon: "📈", page: "analytics-kpis" },
    { label: "Project Master", icon: "📁", page: "project-master" },
    { label: "Users", icon: "👥", page: "users" },
    { label: "Assignment Matrix", icon: "🔗", page: "assignment-matrix" },
    { label: "Guide Manager", icon: "📘", page: "guide-manager" },

    // The pending correction count is now injected dynamically from Sidebar.jsx.
    { label: "Corrections", icon: "✅", page: "corrections" },

    { label: "Compliance", icon: "🛡️", page: "compliance" },

    // Prevents the common Corrections item from appearing twice.
    ...common.filter((item) => item.page !== "corrections"),
  ],

  administrator: [
    { label: "Dashboard", icon: "🏠", page: "dashboard" },
    { label: "Users", icon: "👥", page: "users" },
    { label: "Project Master", icon: "📁", page: "project-master" },
    { label: "Assignment Matrix", icon: "🔗", page: "assignment-matrix" },
    { label: "Guide Manager", icon: "📘", page: "guide-manager" },
    { label: "Locking Rules", icon: "🔒", page: "locking-rules" },

    // The pending correction count is now injected dynamically from Sidebar.jsx.
    {
      label: "Corrections",
      icon: "✅",
      page: "corrections",
    },

    { label: "Analytics & KPIs", icon: "📈", page: "analytics-kpis" },
    { label: "Audit Log", icon: "📜", page: "audit-log" },
    { label: "Settings", icon: "⚙️", page: "settings" },

    // Prevents the common Corrections item from appearing twice.
    ...common.filter((item) => item.page !== "corrections"),
  ],
};

// Exports the sidebar configuration for Sidebar.jsx.
export default sidebarConfig;