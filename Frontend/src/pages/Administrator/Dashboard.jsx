
import { useEffect, useState } from "react";
import apiRequest from "../../lib/api.js";

import {
  Box,
  Button,
  Card,
  Grid,
  Link,
  Paper,
  Typography,
  Skeleton,
} from "@mui/material";

import MoveToInboxRoundedIcon from "@mui/icons-material/MoveToInboxRounded";
import AssignmentTurnedInRoundedIcon from "@mui/icons-material/AssignmentTurnedInRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";
import BarChartRoundedIcon from "@mui/icons-material/BarChartRounded";

// ======================================================
// DESIGN TOKENS
// ======================================================

const FONT =
  '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

const CARD_SHADOW =
  "0 1px 3px rgba(16,30,54,.07), 0 4px 16px rgba(16,30,54,.06)";

const LINE = "#dfe4ec";
const LINE2 = "#e8ecf3";
const MUTED = "#6a7585";
const HEAD = "#1a2434";

// ======================================================
// STAT CARD
// ======================================================

function StatCard({
  icon,
  iconBg,
  iconColor,
  label,
  value,
  trend,
  trendColor,
  loading,
}) {
  return (
    <Card
      elevation={0}
      sx={{
        width: "100%",
        px: 2,
        py: { xs: 1.75, sm: 2 },
        borderRadius: "12px",
        border: `1px solid ${LINE}`,
        boxShadow: CARD_SHADOW,
        bgcolor: "#fff",
        display: "flex",
        alignItems: "center",
        gap: "14px",
        boxSizing: "border-box",

        "&:hover": {
          boxShadow:
            "0 2px 6px rgba(16,30,54,.1), 0 6px 20px rgba(16,30,54,.08)",
        },
      }}
    >
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

          "& svg": {
            fontSize: 21,
          },
        }}
      >
        {icon}
      </Box>

      <Box>
        <Typography
          sx={{
            fontFamily: FONT,
            color: MUTED,
            fontSize: 12.5,
            fontWeight: 600,
            lineHeight: 1.2,
            mb: 0.2,
          }}
        >
          {label}
        </Typography>

        {loading ? (
          <Skeleton
            variant="text"
            width={80}
            height={36}
          />
        ) : (
          <Typography
            sx={{
              fontFamily: FONT,
              color: HEAD,
              fontSize: 27,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: "-0.6px",
            }}
          >
            {value}
          </Typography>
        )}

        {trend && !loading && (
          <Typography
            sx={{
              fontFamily: FONT,
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
    </Card>
  );
}

// ======================================================
// PANEL CARD
// ======================================================

function PanelCard({ title, action, children }) {
  return (
    <Paper
      elevation={0}
      sx={{
        border: `1px solid ${LINE}`,
        borderRadius: "12px",
        boxShadow: CARD_SHADOW,
        bgcolor: "#fff",
        height: "100%",
        width: "100%",
        boxSizing: "border-box",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 2,
          py: 1.625,
          borderBottom: `1px solid ${LINE2}`,
          flexShrink: 0,
        }}
      >
        <Typography
          sx={{
            fontFamily: FONT,
            fontWeight: 700,
            fontSize: 14,
            color: HEAD,
          }}
        >
          {title}
        </Typography>

        {action}
      </Box>

      <Box sx={{ flex: 1, width: "100%" }}>
        {children}
      </Box>
    </Paper>
  );
}

// ======================================================
// VIEW LINK
// ======================================================

function ViewLink({ label, onClick }) {
  return (
    <Link
      component="button"
      type="button"
      onClick={onClick}
      underline="none"
      sx={{
        fontFamily: FONT,
        color: "#2f6df0",
        fontWeight: 600,
        fontSize: 12.5,
        border: 0,
        bgcolor: "transparent",
        cursor: "pointer",
        p: 0,

        "&:hover": {
          color: "#1f57c9",
        },
      }}
    >
      {label}
    </Link>
  );
}

// ======================================================
// MONTHLY PRODUCTION TREND CHART
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
      {/* Horizontally scrollable chart */}
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

      {/* Chart legend */}
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

function BacklogRow({ name, pct, total, barPct }) {
  return (
    <Box
      sx={{
        display: "grid",

        gridTemplateColumns:
          "minmax(110px,1fr) 1fr 48px",

        alignItems: "center",

        gap: {
          xs: 1,
          sm: 1.5,
        },

        px: 2,
        py: 1.1,

        borderBottom: `1px solid ${LINE2}`,

        height: {
          xs: 70,
          sm: 46,
        },
        boxSizing: "border-box",
        flexShrink: 0,


        "&:last-child": {
          borderBottom: "none",
        },
      }}
    >
      <Typography
        sx={{
          fontFamily: FONT,
          fontSize: 12.5,
          color: HEAD,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {name}
      </Typography>

      <Box
        sx={{
          height: 7,
          bgcolor: "#edf1f6",
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            width: `${barPct}%`,
            height: "100%",
            bgcolor: "#5267e8",
            borderRadius: 4,
            transition: "width .5s ease",
          }}
        />
      </Box>

      <Typography
        sx={{
          fontFamily: FONT,
          fontSize: 12.5,
          fontWeight: 700,
          color: HEAD,
          textAlign: "right",
        }}
      >
        {total.toLocaleString()}
      </Typography>
    </Box>
  );
}

// ======================================================
// KPI CARD
// ======================================================

function KpiCard({
  label,
  value,
  note,
  color,
  action,
  nav,
  onNavigate,
  loading,
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        border: `1px solid ${LINE}`,
        borderRadius: "12px",
        boxShadow: CARD_SHADOW,
        bgcolor: "#fff",
        overflow: "hidden",
        width: "100%",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 2,
          py: 1.5,
          borderBottom: `1px solid ${LINE2}`,
        }}
      >
        <Typography
          sx={{
            fontFamily: FONT,
            fontWeight: 700,
            fontSize: 14,
            color: HEAD,
          }}
        >
          {label}
        </Typography>

        <ViewLink
          label={action}
          onClick={() => onNavigate(nav)}
        />
      </Box>

      <Box
        sx={{
          textAlign: "center",
          py: { xs: 2.5, sm: 3 },
          px: 2,
        }}
      >
        {loading ? (
          <Skeleton
            variant="text"
            width={80}
            height={48}
            sx={{ mx: "auto" }}
          />
        ) : (
          <Typography
            sx={{
              fontFamily: FONT,

              fontSize: {
                xs: 34,
                sm: 40,
              },

              fontWeight: 800,
              color,
              lineHeight: 1,
              letterSpacing: "-1px",
            }}
          >
            {value}
          </Typography>
        )}

        <Typography
          sx={{
            fontFamily: FONT,
            color: MUTED,
            fontSize: 12.5,
            mt: 0.75,
          }}
        >
          {note}
        </Typography>
      </Box>
    </Paper>
  );
}

// ======================================================
// PROJECT DAILY SUMMARY
//
// NEW:
// Documents Completed — manual Team Lead count.
// Extracted Documents — manual Team Lead count.
// Batches Processed — manual Team Lead count.
//
// All counts are received from the backend API.
// ======================================================

// Added a 180px column for Extracted Documents.

const DAILY_SUMMARY_COL =
  "130px 210px 420px 110px 120px 180px 100px 100px 170px 190px 170px";

function ProjectDailySummaryTable({
  rows,
  page,
  setPage,
  rowsPerPage,
}) {
  // Gets records for the current page.

  const paginatedRows = rows.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <PanelCard title="Project Daily Summary">
      <Box sx={{ overflowX: "auto" }}>

        {/* ============================================
            TABLE HEADINGS
        ============================================ */}

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: DAILY_SUMMARY_COL,

            // Updated width for the additional column.
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
            TABLE ROWS
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
                  color: HEAD,
                  minWidth: 0,
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
                {Number(
                  row.received || 0
                ).toLocaleString()}
              </Typography>

              {/* Documents Completed */}

              {/* This value comes from the Team Lead's
                  submitted manual count for new dates. */}

              <Typography
                sx={{
                  fontSize: 13,
                  color: HEAD,
                }}
              >
                {Number(
                  row.completed || 0
                ).toLocaleString()}
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
                {Number(
                  row.backlog || 0
                ).toLocaleString()}
              </Typography>

              {/* Pending documents */}

              <Typography
                sx={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: HEAD,
                }}
              >
                {Number(
                  row.pending || 0
                ).toLocaleString()}
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

              {/* This value comes from the Team Lead's
                  submitted manual count for new dates. */}

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
            }}
          >
            ‹
          </Button>

          {/* Next page */}

          <Button
            disabled={
              (page + 1) * rowsPerPage >=
              rows.length
            }
            onClick={() =>
              setPage((current) => current + 1)
            }
            sx={{
              minWidth: 30,
              p: 0.5,
              fontSize: 18,
            }}
          >
            ›
          </Button>
        </Box>
      )}
    </PanelCard>
  );
}

// ======================================================
// MAIN ADMINISTRATOR DASHBOARD
// ======================================================

export default function Dashboard({ onNavigate }) {
  const [dashboard, setDashboard] = useState(null);

  const [loading, setLoading] = useState(true);

  // Stores date-wise and project-wise production summary.

  const [projectDailySummary, setProjectDailySummary] =
    useState([]);

  // Controls Project Daily Summary pagination.

  const [projectSummaryPage, setProjectSummaryPage] =
    useState(0);

  // Shows five records per page.

  const PROJECT_SUMMARY_ROWS_PER_PAGE = 5;

  // ====================================================
  // LOAD DASHBOARD DATA
  // ====================================================

  useEffect(() => {
    const load = async () => {
      try {
        // Load the main Administrator dashboard.

        const data = await apiRequest(
          "/admin/dashboard"
        );

        setDashboard(data.dashboard);

        // Load Project Daily Summary.

        const summaryData = await apiRequest(
          "/admin/dashboard/project-daily-summary"
        );

        console.log(
          "ADMIN PROJECT SUMMARY:",
          summaryData
        );

        // The backend now returns all three manual counts.

        setProjectDailySummary(
          summaryData.summary || []
        );
      } catch (err) {
        console.error(
          "Admin Dashboard error:",
          err
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  // ====================================================
  // STAT CARDS
  //
  // Existing KPI calculations remain unchanged.
  // ====================================================

  const STAT_CARDS = [
    {
      label: "Total Received",

      value:
        dashboard?.totalReceived?.toLocaleString() ??
        "—",

      icon: <MoveToInboxRoundedIcon />,

      iconBg: "#e5eefe",
      iconColor: "#2f6df0",
    },

    {
      label: "Total Completed",

      value:
        dashboard?.totalCompleted?.toLocaleString() ??
        "—",

      icon: <AssignmentTurnedInRoundedIcon />,

      iconBg: "#e4f6ee",
      iconColor: "#1f9d6b",

      trend: dashboard
        ? `${dashboard.activeProjects} active projects`
        : null,

      trendColor: "#1f9d6b",
    },

    {
      label: "Project Backlog",

      value:
        dashboard?.totalBacklog?.toLocaleString() ??
        "—",

      icon: <AccessTimeRoundedIcon />,

      iconBg: "#fbf1dc",
      iconColor: "#d9962b",

      trend: dashboard
        ? `${dashboard.totalReceived > 0
          ? Math.round(
            (dashboard.totalBacklog /
              dashboard.totalReceived) *
            100
          )
          : 0
        }% of received`
        : null,

      trendColor: "#d64545",
    },

    {
      label: "Active employees",

      value:
        dashboard?.activeEmployees ?? "—",

      icon: <PeopleAltRoundedIcon />,

      iconBg: "#efe9fb",
      iconColor: "#7a51d6",

      trend: dashboard
        ? `${dashboard.activeProjects} projects`
        : null,

      trendColor: "#1f9d6b",
    },
  ];

  // ====================================================
  // KPI CARDS
  // ====================================================

  const KPI_CARDS = [
    {
      label: "Pending corrections",

      value:
        dashboard?.pendingCorrections ?? "—",

      note: "awaiting approval",

      color: "#df9324",

      action: "Review",
      nav: "corrections",
    },

    {
      label: "Guide compliance",

      value: dashboard
        ? `${dashboard.guideCompliance.rate}%`
        : "—",

      note:
        `${dashboard?.guideCompliance?.acked ?? 0}` +
        ` / ${dashboard?.guideCompliance?.total ?? 0}` +
        " acknowledged",

      color: "#15966a",

      action: "Details",
      nav: "compliance",
    },

    {
      label: "Missing entries",

      value:
        dashboard?.missingEntriesToday ?? "—",

      note: "employees today",

      color: "#dc3545",

      action: "View",
      nav: "users",
    },
  ];

  // ====================================================
  // DASHBOARD UI
  // ====================================================

  return (
    <Box
      sx={{
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* BREADCRUMB */}

      <Typography
        sx={{
          fontFamily: FONT,
          fontSize: 12.5,
          color: MUTED,
          mb: 0.4,
        }}
      >
        ProdTrack · Administrator
      </Typography>

      {/* ==============================================
          TITLE ROW
      ============================================== */}

      <Box
        sx={{
          display: "flex",

          alignItems: {
            xs: "flex-start",
            sm: "center",
          },

          flexDirection: {
            xs: "column",
            sm: "row",
          },

          justifyContent: "space-between",
          gap: 1.5,
          mb: 0.4,
        }}
      >
        <Typography
          sx={{
            fontFamily: FONT,
            fontWeight: 800,
            fontSize: 22,
            letterSpacing: "-0.4px",
            color: HEAD,
          }}
        >
          Admin dashboard
        </Typography>

        {/* Dashboard action buttons */}

        <Box
          sx={{
            display: "flex",
            gap: 1,
            flexShrink: 0,
          }}
        >
          {/* Export */}

          <Button
            variant="outlined"
            onClick={() => onNavigate("reports")}
            sx={{
              fontFamily: FONT,
              fontSize: 13,
              fontWeight: 600,
              px: 2,
              py: 0.875,
              borderRadius: "8px",
              textTransform: "none",
              borderColor: "#d0d7e2",
              color: HEAD,
              bgcolor: "#fff",
              boxShadow: "none",

              "&:hover": {
                borderColor: "#2f6df0",
                bgcolor: "#f5f8ff",
                boxShadow: "none",
              },
            }}
          >
            Export
          </Button>

          {/* Open analytics */}

          <Button
            variant="contained"
            startIcon={
              <BarChartRoundedIcon
                sx={{ fontSize: 17 }}
              />
            }
            onClick={() =>
              onNavigate("analytics-kpis")
            }
            sx={{
              fontFamily: FONT,
              fontSize: 13,
              fontWeight: 600,
              px: 2,
              py: 0.875,
              borderRadius: "8px",
              textTransform: "none",
              bgcolor: "#2f6df0",
              color: "#fff",
              boxShadow: "none",

              "&:hover": {
                bgcolor: "#1f57c9",
                boxShadow: "none",
              },
            }}
          >
            Open analytics
          </Button>
        </Box>
      </Box>

      {/* DASHBOARD DESCRIPTION */}

      <Typography
        sx={{
          fontFamily: FONT,
          fontSize: 13.5,
          color: MUTED,
          mb: 2.5,
        }}
      >
        Organisation-wide production, backlogs and
        compliance across all projects.
      </Typography>

      {/* ==============================================
          STAT CARDS
      ============================================== */}

      <Grid
        container
        spacing={2}
        sx={{ mb: 2.5 }}
      >
        {STAT_CARDS.map((card) => (
          <Grid
            key={card.label}
            size={{
              xs: 12,
              sm: 6,
              md: 3,
            }}
            sx={{
              display: "flex",
            }}
          >
            <StatCard
              {...card}
              loading={loading}
            />
          </Grid>
        ))}
      </Grid>

      {/* ==============================================
          TREND CHART AND BACKLOG BY PROJECT
      ============================================== */}

      <Grid
        container
        spacing={2}
        sx={{ mb: 2.5 }}
      >
        {/* Monthly production trend */}

        <Grid
          size={{
            xs: 12,
            md: 7.2,
          }}
          sx={{
            display: "flex",
          }}
        >
          <PanelCard
            title="Monthly production trend"
            action={
              <ViewLink
                label="Analytics"
                onClick={() =>
                  onNavigate("analytics-kpis")
                }
              />
            }
          >



            <TrendChart
              data={(dashboard?.monthlyTrend ?? [])
                .slice(-6)
                .map((item, index) => ({
                  month_key: String(index).padStart(2, "0"),
                  month_name: item.monthLabel,
                  received: Number(item.received || 0),
                  completed: Number(item.completed || 0),
                }))}
            />


          </PanelCard>
        </Grid>

        {/* Backlog by project */}

        <Grid
          size={{
            xs: 12,
            md: 4.8,
          }}
          sx={{
            display: "flex",
          }}
        >
          <PanelCard title="Backlog by project">
            {loading ? (
              <Box sx={{ px: 2, py: 1 }}>
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton
                    key={i}
                    variant="text"
                    height={40}
                    sx={{ mb: 0.5 }}
                  />
                ))}
              </Box>
            ) : dashboard?.backlogByProject?.length ===
              0 ? (
              <Box sx={{ px: 2, py: 2 }}>
                <Typography
                  sx={{
                    fontFamily: FONT,
                    fontSize: 13,
                    color: MUTED,
                  }}
                >
                  No backlog data.
                </Typography>
              </Box>
            ) : (

              <Box
                sx={{
                  pt: 0.5,
                  pb: 0.5,

                  // Display up to 10 project records
                  maxHeight: {
                    xs: 708,
                    sm: 468,
                  },

                  // Enable vertical scrolling
                  overflowY: "auto",
                  overflowX: "hidden",

                  // Hide scrollbar in all browsers
                  scrollbarWidth: "none",
                  msOverflowStyle: "none",

                  "&::-webkit-scrollbar": {
                    display: "none",
                  },
                }}
              >
                {(dashboard?.backlogByProject ?? []).map((row) => (
                  <BacklogRow
                    key={row.name}
                    {...row}
                  />
                ))}
              </Box>

            )}
          </PanelCard>
        </Grid>
      </Grid>

      {/* ==============================================
          UPDATED PROJECT DAILY SUMMARY

          Includes:
          - Manual Documents Completed
          - Manual Extracted Documents
          - Manual Batches Processed
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
          KPI CARDS
      ============================================== */}

      <Grid
        container
        spacing={2}
      >
        {KPI_CARDS.map((kpi) => (
          <Grid
            key={kpi.label}
            size={{
              xs: 12,
              sm: 4,
            }}
            sx={{
              display: "flex",
            }}
          >
            <KpiCard
              {...kpi}
              onNavigate={onNavigate}
              loading={loading}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
