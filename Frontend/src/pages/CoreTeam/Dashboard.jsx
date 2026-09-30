// Imports React hooks to load and store dashboard data.
import { useEffect, useState } from "react";

// Imports Material UI components used on this page.
import { Box, Button, Typography } from "@mui/material";

// Imports the shared API helper used to call backend APIs with authentication.
import { apiRequest } from "../../lib/api.js";

// Imports the common Core Team page layout components.
import CorePageShell, {
  SectionCard,
} from "../../components/CorePageShell.jsx";

// Imports icons used by the dashboard stat cards.
import MoveToInboxRoundedIcon from "@mui/icons-material/MoveToInboxRounded";
import AssignmentTurnedInRoundedIcon from "@mui/icons-material/AssignmentTurnedInRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";

/* ───────────────────────── tokens ───────────────────────── */

// Defines the light border/grid color used throughout the dashboard.
const LINE2 = "#eef1f6";

// Defines the muted text color used for secondary labels.
const MUTED = "#6a7585";

// Defines the main heading/text color.
const HEAD = "#1a2434";

/* ───────────────────────── data ───────────────────────── */

// Stores the visual configuration for the four top statistic cards.
const STAT_CARDS = [
  {
    label: "Total Received",
    value: "12,480",
    icon: MoveToInboxRoundedIcon,
    iconBg: "#e5eefe",
    iconColor: "#2f6df0",
  },
  {
    label: "Total Completed",
    value: "9,860",
    icon: AssignmentTurnedInRoundedIcon,
    iconBg: "#e4f6ee",
    iconColor: "#1f9d6b",
    trend: "▲ 4.1% MoM",
    trendColor: "#1f9d6b",
  },
  {
    label: "Project Backlog",
    value: "2,620",
    icon: AccessTimeRoundedIcon,
    iconBg: "#fbf1dc",
    iconColor: "#d9962b",
    trend: "▲ 3.6%",
    trendColor: "#d64545",
  },
  {
    label: "Active employees",
    value: "42",
    icon: PeopleAltRoundedIcon,
    iconBg: "#efe9fb",
    iconColor: "#7a51d6",
    trend: "6 projects",
    trendColor: "#1f9d6b",
  },
];

// Stores the temporary static KPI summary cards.
const KPI_CARDS = [
  {
    label: "Pending corrections",
    value: "6",
    note: "awaiting approval",
    color: "#df9324",
    action: "Review",
    nav: "corrections",
  },
  {
    label: "Guide compliance",
    value: "91%",
    note: "acknowledged this cycle",
    color: "#15966a",
    action: "Details",
    nav: "compliance"
  },
  {
    label: "Missing entries",
    value: "3",
    note: "employees today",
    color: "#dc3545",
    action: "View",
    nav: "users",
  },
];

/* ───────────────────────── stat card ───────────────────────── */

// Displays one dashboard statistic card.
function StatCard({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  value,
  trend,
  trendColor,
}) {
  return (
    <Box
      sx={{
        width: "100%",
        boxSizing: "border-box",
        px: 2,
        py: { xs: 1.75, sm: 2 },
        borderRadius: "12px",
        border: "1px solid #dfe4ec",
        boxShadow:
          "0 1px 3px rgba(16,30,54,.07), 0 4px 16px rgba(16,30,54,.06)",
        bgcolor: "#fff",
        display: "flex",
        alignItems: "center",
        gap: "14px",
      }}
    >
      {/* Displays the colored icon container. */}
      <Box
        sx={{
          width: 46,
          height: 46,
          minWidth: 46,
          borderRadius: "11px",
          bgcolor: iconBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: iconColor,
          flexShrink: 0,
        }}
      >
        <Icon sx={{ fontSize: 21 }} />
      </Box>

      {/* Displays the card label, value and optional trend text. */}
      <Box sx={{ minWidth: 0 }}>
        <Typography
          sx={{
            color: MUTED,
            fontSize: 12.5,
            fontWeight: 600,
            lineHeight: 1.2,
            mb: 0.2,
          }}
        >
          {label}
        </Typography>

        <Typography
          sx={{
            color: HEAD,
            fontSize: { xs: 18, sm: 20, md: 22 },
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: "-0.4px",
          }}
        >
          {value}
        </Typography>

        {trend && (
          <Typography
            sx={{
              color: trendColor,
              fontSize: 11.5,
              fontWeight: 600,
              mt: "2px",
            }}
          >
            {trend}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

/* ───────────────────────── trend chart ───────────────────────── */

// Builds the Monthly Production Trend chart using live backend data.
function TrendChart({ data }) {
  // Uses an empty array while the monthly trend API is loading.
  const trendData = data || [];

  // Defines the SVG width used for horizontal chart positioning.
  const chartWidth = 800;

  // Defines the SVG height used for vertical chart positioning.
  const chartHeight = 180;

  // Adds spacing so chart points do not touch the chart edges.
  const verticalPadding = 18;

  // Finds the highest completed value to scale all monthly values correctly.
  const maxCompleted = Math.max(
    ...trendData.map((item) => Number(item.completed || 0)),
    1
  );

  // Converts every completed value into an SVG x,y coordinate.
  const completedPoints = trendData
    .map((item, index) => {
      // Calculates the horizontal position of each month.
      const x =
        trendData.length === 1
          ? chartWidth / 2
          : (index / (trendData.length - 1)) * chartWidth;

      // Calculates the vertical position using the completed production value.
      const y =
        chartHeight -
        verticalPadding -
        (Number(item.completed || 0) / maxCompleted) *
          (chartHeight - verticalPadding * 2);

      // Returns the position in SVG coordinate format.
      return `${x},${y}`;
    })
    .join(" ");

  // Creates the shaded area underneath the completed production line.
  const completedFillPoints =
    trendData.length > 0
      ? `0,${chartHeight} ${completedPoints} ${chartWidth},${chartHeight}`
      : "";

  return (
    <Box
      sx={{
        px: { xs: 1.5, sm: 2.5 },
        pt: 2,
        pb: 1.5,
      }}
    >
      {/* Displays the chart itself. */}
      <Box
        sx={{
          height: {
            xs: 140,
            sm: 170,
            md: 200,
          },
        }}
      >
        <svg
          viewBox="0 0 800 180"
          width="100%"
          height="100%"
          preserveAspectRatio="none"
          role="img"
          aria-label="Monthly production trend"
        >
          {/* Defines the gradient used below the chart line. */}
          <defs>
            <linearGradient
              id="dashboardTrendFill"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor="#3478ed"
                stopOpacity=".18"
              />

              <stop
                offset="100%"
                stopColor="#3478ed"
                stopOpacity=".02"
              />
            </linearGradient>
          </defs>

          {/* Draws horizontal grid lines behind the production chart. */}
          {[36, 72, 108, 144, 180].map((y) => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2="800"
              y2={y}
              stroke={LINE2}
              strokeWidth="1"
            />
          ))}

          {/* Draws the shaded area below the live completed trend line. */}
          {trendData.length > 0 && (
            <polygon
              points={completedFillPoints}
              fill="url(#dashboardTrendFill)"
            />
          )}

          {/* Draws the completed-production trend line from live API data. */}
          {trendData.length > 0 && (
            <polyline
              points={completedPoints}
              fill="none"
              stroke="#3478ed"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Draws one circle for every month returned by the API. */}
          {trendData.map((item, index) => {
            // Calculates the horizontal position for this monthly point.
            const x =
              trendData.length === 1
                ? chartWidth / 2
                : (index / (trendData.length - 1)) * chartWidth;

            // Calculates the vertical position for this month's completed value.
            const y =
              chartHeight -
              verticalPadding -
              (Number(item.completed || 0) / maxCompleted) *
                (chartHeight - verticalPadding * 2);

            return (
              <circle
                key={item.month_key}
                cx={x}
                cy={y}
                r="4"
                fill="#3478ed"
              />
            );
          })}
        </svg>
      </Box>

      {/* Displays the month names underneath the production trend chart. */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          mt: 0.5,
          gap: 1,
        }}
      >
        {trendData.map((item) => (
          <Typography
            key={item.month_key}
            sx={{
              fontSize: 11,
              color: MUTED,
              textAlign: "center",
            }}
          >
            {item.month_name}
          </Typography>
        ))}
      </Box>

      {/* Displays the completed-production legend. */}
      <Box
        sx={{
          display: "flex",
          gap: 2.5,
          pt: 1.25,
          flexWrap: "wrap",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            fontSize: 12,
            color: MUTED,
          }}
        >
          {/* Displays the small blue legend line. */}
          <Box
            component="i"
            sx={{
              display: "inline-block",
              width: 18,
              height: 0,
              borderTop: "2px solid #3478ed",
            }}
          />

          Completed
        </Box>
      </Box>
    </Box>
  );
}

/* ───────────────────────── backlog row ───────────────────────── */

// Displays one project inside the Backlog by project section.
function BacklogRow({ name, pct, total }) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr auto",
          sm: "minmax(110px,1fr) 1fr 36px",
        },
        alignItems: "center",
        gap: { xs: 1, sm: 1.5 },
        px: 2,
        py: 1.1,
        borderBottom: `1px solid ${LINE2}`,
        "&:last-of-type": {
          borderBottom: "none",
        },
      }}
    >
      {/* Displays the project name. */}
      <Typography
        sx={{
          fontSize: 12.5,
          color: HEAD,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {name}
      </Typography>

      {/* Displays the backlog progress bar. */}
      <Box
        sx={{
          order: { xs: 3, sm: 0 },
          gridColumn: {
            xs: "1 / -1",
            sm: "auto",
          },
          height: 7,
          bgcolor: "#edf1f6",
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        {/* Sets the progress-bar width using the live backlog percentage. */}
        <Box
          sx={{
            width: `${pct}%`,
            height: "100%",
            bgcolor: "#5267e8",
            borderRadius: 4,
          }}
        />
      </Box>

      {/* Displays the live backlog quantity. */}
      <Typography
        sx={{
          fontSize: 12.5,
          fontWeight: 700,
          color: HEAD,
          textAlign: "right",
        }}
      >
        {total}
      </Typography>
    </Box>
  );
}

/* ───────────────────────── main page ───────────────────────── */

// Displays the complete Core Team dashboard page.
export default function Dashboard({ onNavigate }) {
  // Stores the Core Team summary values returned by the backend.
  const [dashboard, setDashboard] = useState(null);

  // Stores monthly production trend data returned by the backend.
  const [monthlyTrend, setMonthlyTrend] = useState([]);

  // Stores live backlog-by-project data returned by the backend.
  const [backlogProjects, setBacklogProjects] = useState([]);

  // Stores the live pending-corrections count returned by the backend.
  const [pendingCorrections, setPendingCorrections] = useState(null);

  // Stores the live guide-compliance data returned by the backend.
  const [guideCompliance, setGuideCompliance] = useState(null);

  // Stores the live missing-entries count returned by the backend.
  const [missingEntries, setMissingEntries] = useState(null);

  // Loads all required dashboard APIs when this page opens.
  useEffect(() => {
    // Loads the main Core Team dashboard summary values.
    const loadDashboard = async () => {
      try {
        // Calls the main Core Team dashboard endpoint.
        const data = await apiRequest("/core-team/dashboard");

        // Saves the returned dashboard summary values.
        setDashboard(data.dashboard);
      } catch (error) {
        // Logs dashboard-loading errors in the browser console.
        console.error("Core Team Dashboard Error:", error);
      }
    };

    // Loads monthly production trend data.
    const loadMonthlyTrend = async () => {
      try {
        // Calls the monthly production trend backend endpoint.
        const data = await apiRequest(
          "/core-team/dashboard/monthly-trend"
        );

        // Stores the monthly trend array returned by the backend.
        setMonthlyTrend(data.trend || []);
      } catch (error) {
        // Logs monthly-trend loading errors.
        console.error(
          "Monthly Production Trend Error:",
          error
        );
      }
    };

    // Loads live backlog information for every project.
    const loadBacklogProjects = async () => {
      try {
        // Calls the Core Team backlog-by-project backend endpoint.
        const data = await apiRequest(
          "/core-team/dashboard/backlog-by-project"
        );

        // Stores the project backlog array returned by the backend.
        setBacklogProjects(data.projects || []);
      } catch (error) {
        // Logs backlog API errors in the browser console.
        console.error(
          "Backlog By Project Error:",
          error
        );
      }
    };

    // Loads the pending-corrections count from the backend.
    const loadPendingCorrections = async () => {
      try {
        // Calls the Core Team pending-corrections API.
        const data = await apiRequest(
          "/core-team/dashboard/pending-corrections"
        );

        // Stores the live pending-corrections count.
        setPendingCorrections(data.pendingCorrections);
      } catch (error) {
        // Logs pending-corrections API errors in the browser console.
        console.error("Pending Corrections Error:", error);
      }
    };
    // Loads the current guide-compliance information from the backend.
      const loadGuideCompliance = async () => {
        try {
          // Calls the Core Team guide-compliance dashboard API.
          const data = await apiRequest(
            "/core-team/dashboard/guide-compliance"
          );

          // Stores the compliance object returned by the backend.
          setGuideCompliance(data.compliance);
        } catch (error) {
          // Logs guide-compliance API errors for debugging.
          console.error("Guide Compliance Error:", error);
        }
      };

      // Loads today's missing-entry employees from the backend.
      const loadMissingEntries = async () => {
        try {
          // Calls the Core Team missing-entries API.
          const data = await apiRequest(
            "/core-team/dashboard/missing-entries"
          );

          // Stores the number of employees with missing entries.
          setMissingEntries(data.count);
        } catch (error) {
          // Logs missing-entry API errors in the browser console.
          console.error("Missing Entries Error:", error);
        }
      };

    // Starts loading the main dashboard summary.
    loadDashboard();

    // Starts loading monthly trend data.
    loadMonthlyTrend();

    // Starts loading live project backlog data.
    loadBacklogProjects();

    // Starts loading the live pending-corrections count.
    loadPendingCorrections();

    // Starts loading the live guide-compliance data.
    loadGuideCompliance();

    // Starts loading the live missing-entries count.
    loadMissingEntries();
  }, []);

  // Replaces only the top-card values with live values from the backend.
  const liveStatCards = STAT_CARDS.map((card, index) => {
    // Creates the live value list only after dashboard data has loaded.
    const values = dashboard
      ? [
          dashboard.totalReceived,
          dashboard.totalCompleted,
          dashboard.projectBacklog,
          dashboard.activeEmployees,
        ]
      : [];

    // Keeps the original card design while replacing its displayed value.
    return {
      ...card,
      value: values[index] ?? card.value,
    };
  });

  // Creates the KPI cards using live backend data without changing the original UI.
const liveKpiCards = KPI_CARDS.map((card) => {
  // Replaces Pending corrections with its live backend value.
  if (card.label === "Pending corrections") {
    return {
      ...card,
      value: pendingCorrections ?? card.value,
    };
  }

  // Replaces Guide compliance with the live compliance percentage.
  if (card.label === "Guide compliance") {
    return {
      ...card,
      value:
        guideCompliance?.complianceRate !== undefined
          ? `${guideCompliance.complianceRate}%`
          : card.value,
    };
  }
   // Replaces Missing entries with the live backend count.
  if (card.label === "Missing entries") {
    return {
      ...card,
      value: missingEntries ?? card.value,
    };
  }

  // Keeps any other KPI cards unchanged.
  return card;
});

  return (
    <CorePageShell
      title={
        <Typography
          sx={{
            fontWeight: 800,
            fontSize: {
              xs: 18,
              sm: 20,
            },
            letterSpacing: "-0.3px",
            color: HEAD,
          }}
        >
          Admin dashboard
        </Typography>
      }
      description="Organisation-wide production, backlogs and compliance across all projects."
      actionLabel="Open analytics"
      actionHandler={() =>
        onNavigate("analytics-kpis")
      }
      headerExtra={
        <Button
          variant="outlined"
          onClick={() =>
            onNavigate("reports")
          }
          sx={{
            borderColor: "#d0d7e2",
            color: HEAD,
            textTransform: "none",
            fontWeight: 600,
            borderRadius: "8px",
            width: {
              xs: "100%",
              sm: "auto",
            },
          }}
        >
          Export
        </Button>
      }
    >
      {/* ───────────────── STAT CARDS ───────────────── */}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            md: "repeat(4, 1fr)",
          },
          gap: 2,
          mb: 2.5,
        }}
      >
        {/* Displays the top cards using live backend summary values. */}
        {liveStatCards.map((card) => (
          <StatCard
            key={card.label}
            {...card}
          />
        ))}
      </Box>

      {/* ───────────────── TREND + BACKLOG ───────────────── */}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            md: "7.2fr 4.8fr",
          },
          gap: 2,
          mb: 2.5,
        }}
      >
        {/* Displays the live Monthly Production Trend section. */}
        <SectionCard
          title="Monthly production trend"
          action={
            <Button
              size="small"
              onClick={() =>
                onNavigate(
                  "analytics-kpis"
                )
              }
              sx={{
                textTransform:
                  "none",
                fontWeight: 600,
              }}
            >
              Analytics
            </Button>
          }
        >
          {/* Passes live monthly production data into the existing chart UI. */}
          <TrendChart
            data={monthlyTrend}
          />
        </SectionCard>

        {/* Displays the live Backlog by project section. */}
        <SectionCard title="Backlog by project">
          <Box
            sx={{
              pt: 0.5,
              pb: 0.5,
            }}
          >
            {/* Converts backend project data into the same existing BacklogRow UI. */}
            {backlogProjects.map(
              (project) => (
                <BacklogRow
                  key={project.id}
                  name={
                    project.project_name
                  }
                  total={
                    project.backlog
                  }
                  pct={
                    project.received >
                    0
                      ? Math.round(
                          (project.backlog /
                            project.received) *
                            100
                        )
                      : 0
                  }
                />
              )
            )}
          </Box>
        </SectionCard>
      </Box>

      {/* ───────────────── KPI SUMMARY ───────────────── */}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(3, 1fr)",
          },
          gap: 2,
        }}
      >
        {/* Displays KPI cards with available live backend values. */}
        {liveKpiCards.map(
          ({
            label,
            value,
            note,
            color,
            action,
            nav,
          }) => (
            <SectionCard
              key={label}
              title={
                <Typography
                  sx={{
                    fontWeight: 700,
                    fontSize: 12.5,
                    color: HEAD,
                  }}
                >
                  {label}
                </Typography>
              }
              action={
                <Button
                  size="small"
                  onClick={() =>
                    onNavigate(nav)
                  }
                  sx={{
                    textTransform:
                      "none",
                    fontWeight: 600,
                  }}
                >
                  {action}
                </Button>
              }
            >
              {/* Displays the KPI value and its descriptive note. */}
              <Box
                sx={{
                  textAlign:
                    "center",
                  py: {
                    xs: 2.25,
                    sm: 3,
                  },
                }}
              >
                <Typography
                  sx={{
                    fontSize: {
                      xs: 24,
                      sm: 26,
                      md: 30,
                    },
                    fontWeight: 800,
                    color,
                    lineHeight: 1,
                    letterSpacing:
                      "-1px",
                  }}
                >
                  {value}
                </Typography>

                <Typography
                  sx={{
                    color: MUTED,
                    fontSize: 12.5,
                    mt: 0.75,
                  }}
                >
                  {note}
                </Typography>
              </Box>
            </SectionCard>
          )
        )}
      </Box>
    </CorePageShell>
  );
}