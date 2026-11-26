
import { useEffect, useState } from "react";
import { Box, Button, Typography } from "@mui/material";

import { apiRequest } from "../../lib/api.js";

import CorePageShell, {
  SectionCard,
} from "../../components/CorePageShell.jsx";

import MoveToInboxRoundedIcon from "@mui/icons-material/MoveToInboxRounded";
import AssignmentTurnedInRoundedIcon from "@mui/icons-material/AssignmentTurnedInRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";

// ======================================================
// DESIGN TOKENS
// ======================================================

const LINE2 = "#eef1f6";
const MUTED = "#6a7585";
const HEAD = "#1a2434";

// ======================================================
// STAT CARDS
// ======================================================

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

// ======================================================
// KPI CARDS
// ======================================================

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
    nav: "compliance",
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

// ======================================================
// STAT CARD COMPONENT
// ======================================================

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
      {/* Icon container */}

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

      {/* Card details */}

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

// ======================================================
// MONTHLY PRODUCTION TREND
// ======================================================

function TrendChart({ data }) {
  const trendData = Array.isArray(data)
    ? [...data].sort((a, b) =>
        String(a.month_key).localeCompare(
          String(b.month_key)
        )
      )
    : [];

  const maxValue = Math.max(
    1,
    ...trendData.flatMap((item) => [
      Number(item.received) || 0,
      Number(item.completed) || 0,
    ])
  );

  const formatValue = (value) =>
    Number(value || 0).toLocaleString("en-IN");

  if (trendData.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <Typography color="text.secondary">
          No monthly production records available.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ px: 2.5, pt: 3, pb: 2 }}>
      {/* Horizontal scrolling with hidden scrollbar */}
      <Box
        sx={{
          width: "100%",
          overflowX: "auto",
          overflowY: "hidden",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          "&::-webkit-scrollbar": {
            display: "none",
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-end",
            gap: 2,
            width: "max-content",
            minWidth: "100%",
            borderBottom: "1px solid #dbe3ec",
            pb: 1,
          }}
        >
          {trendData.map((item) => (
            <Box
              key={item.month_key}
              sx={{
                flex: "0 0 145px",
                width: 145,
                textAlign: "center",
              }}
            >
              <Box
                sx={{
                  height: 210,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "flex-end",
                  gap: 2,
                }}
              >
                {[
                  {
                    key: "received",
                    color: "#8054e8",
                  },
                  {
                    key: "completed",
                    color: "#3478ed",
                  },
                ].map((bar) => {
                  const value =
                    Number(item[bar.key]) || 0;

                  const height =
                    (value / maxValue) * 165;

                  return (
                    <Box
                      key={bar.key}
                      title={`${item.month_name} - ${bar.key}: ${formatValue(value)}`}
                      sx={{
                        width: 43,
                        height: `${height}px`,
                        minHeight: value > 0 ? 4 : 0,
                        bgcolor: bar.color,
                        borderRadius: "7px 7px 0 0",
                        position: "relative",
                        transition: "height 0.3s",
                      }}
                    >
                      <Typography
                        sx={{
                          position: "absolute",
                          top: -23,
                          left: "50%",
                          transform: "translateX(-50%)",
                          fontSize: 11,
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                          color: "#10233d",
                        }}
                      >
                        {formatValue(value)}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>

              <Typography
                sx={{
                  mt: 1,
                  fontSize: 12,
                  color: "#526581",
                  fontWeight: 600,
                }}
              >
                {item.month_name}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Received and Completed legend */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          gap: 3,
          mt: 2,
        }}
      >
        {[
          { label: "Received", color: "#8054e8" },
          { label: "Completed", color: "#3478ed" },
        ].map((item) => (
          <Box
            key={item.label}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <Box
              sx={{
                width: 13,
                height: 13,
                bgcolor: item.color,
                borderRadius: "3px",
              }}
            />

            <Typography
              sx={{
                fontSize: 12,
                color: "#526581",
              }}
            >
              {item.label}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}


// ======================================================
// BACKLOG BY PROJECT
// ======================================================

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

        height: {
          xs: 70,
          sm: 46,
        },
        boxSizing: "border-box",
        flexShrink: 0,


        "&:last-of-type": {
          borderBottom: "none",
        },
      }}
    >
      {/* Project name */}

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

      {/* Backlog progress bar */}

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
        <Box
          sx={{
            width: `${pct}%`,
            height: "100%",
            bgcolor: "#5267e8",
            borderRadius: 4,
          }}
        />
      </Box>

      {/* Backlog quantity */}

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

// ======================================================
// PROJECT DAILY SUMMARY
//
// NEW:
// Documents Completed - manual Team Lead count.
// Extracted Documents - manual Team Lead count.
// Batches Processed - manual Team Lead count.
//
// Existing historical calculations are handled by backend.
// ======================================================

// Eleven columns, including Extracted Documents.

const DAILY_SUMMARY_COL =
  "130px 210px 420px 110px 120px 180px 100px 100px 170px 190px 170px";

function ProjectDailySummaryTable({
  rows,
  page,
  setPage,
  rowsPerPage,
}) {
  const paginatedRows = rows.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <SectionCard title="Project Daily Summary">
      <Box sx={{ overflowX: "auto" }}>

        {/* ============================================
            TABLE HEADINGS
        ============================================ */}

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: DAILY_SUMMARY_COL,

            // Updated width for Extracted Documents.
            minWidth: 2030,

            px: 2,
            py: 1.2,
            bgcolor: "#f8fafc",
            borderBottom: `1px solid ${LINE2}`,
          }}
        >
          {[
            "DATE",
            "PROJECT",
            "REPORTING CATEGORY",
            "RECEIVED",
            "COMPLETED",

            // NEW COLUMN
            "EXTRACTED DOCUMENTS",

            "BACKLOG",
            "PENDING",
            "BATCHES RECEIVED",
            "BATCHES PROCESSED",
            "PENDING BATCHES",
          ].map((column) => (
            <Typography
              key={column}
              sx={{
                fontSize: 11,
                fontWeight: 800,
                color: MUTED,
                letterSpacing: "0.4px",
              }}
            >
              {column}
            </Typography>
          ))}
        </Box>

        {/* ============================================
            TABLE DATA
        ============================================ */}

        {rows.length === 0 ? (
          <Box sx={{ px: 2, py: 2 }}>
            <Typography
              sx={{
                fontSize: 13,
                color: MUTED,
              }}
            >
              No project production data found.
            </Typography>
          </Box>
        ) : (
          paginatedRows.map((row, index) => (
            <Box
              key={`${row.projectId}-${row.categoryId ?? "none"}-${row.productionDate}-${index}`}
              sx={{
                display: "grid",
                gridTemplateColumns: DAILY_SUMMARY_COL,
                minWidth: 2030,
                alignItems: "center",
                px: 2,
                py: 1.3,
                borderBottom: `1px solid ${LINE2}`,

                "&:hover": {
                  bgcolor: "#fafbff",
                },
              }}
            >
              {/* Production date */}

              <Typography
                sx={{
                  fontSize: 13,
                  color: HEAD,
                }}
              >
                {row.productionDate}
              </Typography>

              {/* Project name */}

              <Typography
                sx={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: HEAD,
                }}
              >
                {row.projectName}
              </Typography>

              {/* Reporting category */}

              <Typography
                sx={{
                  fontSize: 13,
                  width: "100%",
                  whiteSpace: "normal",
                  overflowWrap: "break-word",
                  lineHeight: 1.6,
                  pr: 3,
                  boxSizing: "border-box",
                }}
              >
                {row.categoryName || "Uncategorized"}
              </Typography>

              {/* Documents Received */}

              <Typography
                sx={{
                  fontSize: 13,
                  color: HEAD,
                }}
              >
                {row.received?.toLocaleString()}
              </Typography>

              {/* Documents Completed */}

              <Typography
                sx={{
                  fontSize: 13,
                  color: HEAD,
                }}
              >
                {row.completed?.toLocaleString()}
              </Typography>

              {/* NEW: Extracted Documents */}

              <Typography
                sx={{
                  fontSize: 13,
                  color: HEAD,
                }}
              >
                {Number(
                  row.extractedDocuments || 0
                ).toLocaleString()}
              </Typography>

              {/* Previous remaining backlog */}

              <Typography
                sx={{
                  fontSize: 13,
                  color: HEAD,
                }}
              >
                {row.backlog?.toLocaleString()}
              </Typography>

              {/* Documents Pending */}

              <Typography
                sx={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: HEAD,
                }}
              >
                {row.pending?.toLocaleString()}
              </Typography>

              {/* Batches Received */}

              <Typography
                sx={{
                  fontSize: 13,
                  color: HEAD,
                }}
              >
                {Number(
                  row.batchesReceived || 0
                ).toLocaleString()}
              </Typography>

              {/* Batches Processed */}

              <Typography
                sx={{
                  fontSize: 13,
                  color: HEAD,
                }}
              >
                {Number(
                  row.batchesProcessed || 0
                ).toLocaleString()}
              </Typography>

              {/* Pending Batches */}

              <Typography
                sx={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: HEAD,
                }}
              >
                {Number(
                  row.pendingBatches || 0
                ).toLocaleString()}
              </Typography>
            </Box>
          ))
        )}
      </Box>

      {/* ==============================================
          PAGINATION
      ============================================== */}

      {rows.length > 0 && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 2,
            px: 2,
            py: 1.4,
            borderTop: `1px solid ${LINE2}`,
          }}
        >
          {/* Current record range */}

          <Typography
            sx={{
              fontSize: 12.5,
              color: MUTED,
            }}
          >
            {page * rowsPerPage + 1}–
            {Math.min(
              (page + 1) * rowsPerPage,
              rows.length
            )}{" "}
            of {rows.length}
          </Typography>

          {/* Previous page */}

          <Button
            disabled={page === 0}
            onClick={() =>
              setPage((current) => current - 1)
            }
            sx={{
              minWidth: 30,
              p: 0.5,
              fontSize: 18,
              textTransform: "none",
            }}
          >
            ‹
          </Button>

          {/* Next page */}

          <Button
            disabled={
              (page + 1) * rowsPerPage >= rows.length
            }
            onClick={() =>
              setPage((current) => current + 1)
            }
            sx={{
              minWidth: 30,
              p: 0.5,
              fontSize: 18,
              textTransform: "none",
            }}
          >
            ›
          </Button>
        </Box>
      )}
    </SectionCard>
  );
}

// ======================================================
// MAIN CORE TEAM DASHBOARD
// ======================================================

export default function Dashboard({ onNavigate }) {

  // Main dashboard state.

  const [dashboard, setDashboard] = useState(null);

  // Monthly production trend.

  const [monthlyTrend, setMonthlyTrend] = useState([]);

  // Project backlog state.

  const [backlogProjects, setBacklogProjects] =
    useState([]);

  // Pending corrections.

  const [pendingCorrections, setPendingCorrections] =
    useState(null);

  // Guide compliance.

  const [guideCompliance, setGuideCompliance] =
    useState(null);

  // Missing daily entries.

  const [missingEntries, setMissingEntries] =
    useState(null);

  // Project Daily Summary.

  const [projectDailySummary, setProjectDailySummary] =
    useState([]);

  // Project Daily Summary pagination.

  const [projectSummaryPage, setProjectSummaryPage] =
    useState(0);

  const PROJECT_SUMMARY_ROWS_PER_PAGE = 5;

  // ====================================================
  // LOAD DASHBOARD APIs
  // ====================================================

  useEffect(() => {

    // Load main Core Team dashboard.

    const loadDashboard = async () => {
      try {
        const data = await apiRequest(
          "/core-team/dashboard"
        );

        setDashboard(data.dashboard);

      } catch (error) {
        console.error(
          "Core Team Dashboard Error:",
          error
        );
      }
    };

    // Load monthly production trend.

    const loadMonthlyTrend = async () => {
      try {
        const data = await apiRequest(
          "/core-team/dashboard/monthly-trend"
        );

        setMonthlyTrend(data.trend || []);

      } catch (error) {
        console.error(
          "Monthly Production Trend Error:",
          error
        );
      }
    };

    // Load backlog by project.

    const loadBacklogProjects = async () => {
      try {
        const data = await apiRequest(
          "/core-team/dashboard/backlog-by-project"
        );

        setBacklogProjects(data.projects || []);

      } catch (error) {
        console.error(
          "Backlog By Project Error:",
          error
        );
      }
    };

    // Load pending corrections.

    const loadPendingCorrections = async () => {
      try {
        const data = await apiRequest(
          "/core-team/dashboard/pending-corrections"
        );

        setPendingCorrections(
          data.pendingCorrections
        );

      } catch (error) {
        console.error(
          "Pending Corrections Error:",
          error
        );
      }
    };

    // Load guide compliance.

    const loadGuideCompliance = async () => {
      try {
        const data = await apiRequest(
          "/core-team/dashboard/guide-compliance"
        );

        setGuideCompliance(data.compliance);

      } catch (error) {
        console.error(
          "Guide Compliance Error:",
          error
        );
      }
    };

    // Load missing daily entries.

    const loadMissingEntries = async () => {
      try {
        const data = await apiRequest(
          "/core-team/dashboard/missing-entries"
        );

        setMissingEntries(data.count);

      } catch (error) {
        console.error(
          "Missing Entries Error:",
          error
        );
      }
    };

    // ==================================================
    // LOAD PROJECT DAILY SUMMARY
    //
    // Backend returns:
    // received
    // completed
    // extractedDocuments
    // backlog
    // pending
    // batchesReceived
    // batchesProcessed
    // pendingBatches
    // ==================================================

    const loadProjectDailySummary = async () => {
      try {
        const data = await apiRequest(
          "/core-team/dashboard/project-daily-summary"
        );

        setProjectDailySummary(
          data.summary || []
        );

      } catch (error) {
        console.error(
          "Project Daily Summary Error:",
          error
        );
      }
    };

    // Load all dashboard sections.

    loadDashboard();
    loadMonthlyTrend();
    loadBacklogProjects();
    loadPendingCorrections();
    loadGuideCompliance();
    loadMissingEntries();
    loadProjectDailySummary();

  }, []);

  // ====================================================
  // LIVE STAT CARDS
  // ====================================================

  const liveStatCards = STAT_CARDS.map(
    (card, index) => {
      const values = dashboard
        ? [
          dashboard.totalReceived,
          dashboard.totalCompleted,
          dashboard.projectBacklog,
          dashboard.activeEmployees,
        ]
        : [];

      return {
        ...card,
        value: values[index] ?? card.value,
      };
    }
  );

  // ====================================================
  // LIVE KPI CARDS
  // ====================================================

  const liveKpiCards = KPI_CARDS.map((card) => {

    // Pending corrections.

    if (card.label === "Pending corrections") {
      return {
        ...card,
        value: pendingCorrections ?? card.value,
      };
    }

    // Guide compliance.

    if (card.label === "Guide compliance") {
      return {
        ...card,

        value:
          guideCompliance?.complianceRate !== undefined
            ? `${guideCompliance.complianceRate}%`
            : card.value,
      };
    }

    // Missing daily entries.

    if (card.label === "Missing entries") {
      return {
        ...card,
        value: missingEntries ?? card.value,
      };
    }

    return card;
  });

  // ====================================================
  // DASHBOARD UI
  // ====================================================

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
          Managers Dashboard
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

      {/* ==============================================
          STAT CARDS
      ============================================== */}

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
        {liveStatCards.map((card) => (
          <StatCard
            key={card.label}
            {...card}
          />
        ))}
      </Box>

      {/* ==============================================
          MONTHLY PRODUCTION TREND
          AND BACKLOG BY PROJECT
      ============================================== */}

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

        {/* Monthly production trend */}

        <SectionCard
          title="Monthly production trend"

          action={
            <Button
              size="small"
              onClick={() =>
                onNavigate("analytics-kpis")
              }
              sx={{
                textTransform: "none",
                fontWeight: 600,
              }}
            >
              Analytics
            </Button>
          }
        >
          <TrendChart data={monthlyTrend.slice(-6)} />
        </SectionCard>

        {/* Backlog by project */}


        <SectionCard title="Backlog by project">
          <Box
            sx={{
              pt: 0.5,
              pb: 0.5,

              // Show up to 10 project rows
              maxHeight: {
                xs: 708,
                sm: 468,
              },

              // Enable vertical scrolling
              overflowY: "auto",
              overflowX: "hidden",

              // Hide scrollbar
              scrollbarWidth: "none",
              msOverflowStyle: "none",

              "&::-webkit-scrollbar": {
                display: "none",
              },
            }}
          >

            {backlogProjects.map((project) => (
              <BacklogRow
                key={project.id}
                name={project.project_name}
                total={project.backlog}

                pct={
                  project.received > 0
                    ? Math.round(
                      (project.backlog /
                        project.received) *
                      100
                    )
                    : 0
                }
              />
            ))}
          </Box>
        </SectionCard>
      </Box>

      {/* ==============================================
          UPDATED PROJECT DAILY SUMMARY

          Includes:
          Documents Completed
          Extracted Documents
          Batches Processed
      ============================================== */}

      <Box sx={{ mb: 2.5 }}>
        <ProjectDailySummaryTable
          rows={projectDailySummary}
          page={projectSummaryPage}
          setPage={setProjectSummaryPage}

          rowsPerPage={
            PROJECT_SUMMARY_ROWS_PER_PAGE
          }
        />
      </Box>

      {/* ==============================================
          KPI SUMMARY
      ============================================== */}

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
                    textTransform: "none",
                    fontWeight: 600,
                  }}
                >
                  {action}
                </Button>
              }
            >

              {/* KPI value and description */}

              <Box
                sx={{
                  textAlign: "center",

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
                    letterSpacing: "-1px",
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
