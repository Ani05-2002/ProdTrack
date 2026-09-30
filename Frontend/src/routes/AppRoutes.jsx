import IndexerDashboard from "../pages/Indexer/Dashboard.jsx";
import TeamLeadDashboard from "../pages/TeamLead/Dashboard.jsx";
import CoreTeamDashboard from "../pages/CoreTeam/Dashboard.jsx";
import AdministratorDashboard from "../pages/Administrator/Dashboard.jsx";
import DailyEntry from "../pages/DailyEntry.jsx";
import Projects from "../pages/Projects.jsx";
import IndexingGuide from "../pages/IndexingGuide.jsx";
import Attendance from "../pages/Attendance.jsx";
import AnalyticsKpis from "../pages/AnalyticsKpis.jsx";
import ProjectMaster from "../pages/ProjectMaster.jsx";
import UserMaster from "../pages/UserMaster.jsx";
import AssignmentMatrix from "../pages/AssignmentMatrix.jsx";
import GuideManager from "../pages/GuideManager.jsx";
import CorrectionApprovals from "../pages/CorrectionApprovals.jsx";
import Compliance from "../pages/Compliance.jsx";
import MyTeam from "../pages/MyTeam.jsx";
import AuditLog from "../pages/AuditLog.jsx";
import LockingRules from "../pages/LockingRules.jsx";
import Settings from "../pages/Settings.jsx";
import MyProfile from "../pages/MyProfile.jsx";
import Reports from "../pages/Reports.jsx";
import Notifications from "../pages/Notifications.jsx";

const dashboards = {
  indexer: IndexerDashboard,
  teamLead: TeamLeadDashboard,
  coreTeam: CoreTeamDashboard,
  administrator: AdministratorDashboard,
};

const rolePages = {
  indexer: {
    "daily-entry": DailyEntry,
    "indexing-guide": IndexingGuide,
      // Temporarily disabled for Indexer.
  // Uncomment if the client wants the Projects page again.
  // projects: Projects,
    attendance: Attendance,
    corrections: CorrectionApprovals,
  },
  teamLead: {
    "daily-entry": DailyEntry,
    projects: Projects,
    "indexing-guide": IndexingGuide,
    attendance: Attendance,
    corrections: CorrectionApprovals,
    "my-team": MyTeam,
  },
  coreTeam: {
    "analytics-kpis": AnalyticsKpis,
    "project-master": ProjectMaster,
    users: UserMaster,
    "assignment-matrix": AssignmentMatrix,
    "guide-manager": GuideManager,
    corrections: CorrectionApprovals,
    compliance: Compliance,
  },
  administrator: {
  "analytics-kpis": AnalyticsKpis,
  "project-master": ProjectMaster,
  users: UserMaster,
  "assignment-matrix": AssignmentMatrix,
  "guide-manager": GuideManager,
  corrections: CorrectionApprovals,
  compliance: Compliance,          // ← yeh line add karo
  "locking-rules": LockingRules,
  "audit-log": AuditLog,
  settings: Settings,
},
};

const commonPages = {
  "my-profile": MyProfile,
  reports: Reports,
  notifications: Notifications,
};

export default function AppRoutes({ user, currentPage, onNavigate, onReviewGuide, searchSelection, }) {
  const roleKey = user.roleKey;
  const Dashboard = dashboards[roleKey] ?? IndexerDashboard;
  // Reports are common for other roles but are not accessible to Indexer.
const isIndexerRestrictedPage =
  roleKey === "indexer" &&
  ["projects", "reports"].includes(currentPage);

// Resolves the page only when the current role is allowed to access it.
const Page = isIndexerRestrictedPage
  ? null
  : commonPages[currentPage] ?? rolePages[roleKey]?.[currentPage];

  if (!Page || currentPage === "dashboard") {
    return (
      <Dashboard
        user={user}
        roleKey={roleKey}
        onNavigate={onNavigate}
        onReviewGuide={onReviewGuide}
      />
    );
  }

  return (
    <Page
      user={user}
      roleKey={roleKey}
      roleLabel={user.role}
      onNavigate={onNavigate}
      searchSelection={searchSelection}
    />
  );
}
