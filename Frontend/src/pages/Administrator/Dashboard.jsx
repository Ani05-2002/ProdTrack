import { useEffect, useState } from "react";
import apiRequest from "../../lib/api.js";

import { Box, Button, Card, Grid, Link, Paper, Typography, Skeleton } from "@mui/material";

import MoveToInboxRoundedIcon from "@mui/icons-material/MoveToInboxRounded";
import AssignmentTurnedInRoundedIcon from "@mui/icons-material/AssignmentTurnedInRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";
import BarChartRoundedIcon from "@mui/icons-material/BarChartRounded";

// ─── Design tokens ────────────────────────────────────────────────────────────
const FONT = '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
const CARD_SHADOW = "0 1px 3px rgba(16,30,54,.07), 0 4px 16px rgba(16,30,54,.06)";
const LINE = "#dfe4ec";
const LINE2 = "#e8ecf3";
const MUTED = "#6a7585";
const HEAD = "#1a2434";

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ icon, iconBg, iconColor, label, value, trend, trendColor, loading }) {
  return (
    <Card elevation={0} sx={{
      width: "100%", px: 2, py: { xs: 1.75, sm: 2 },
      borderRadius: "12px", border: `1px solid ${LINE}`,
      boxShadow: CARD_SHADOW, bgcolor: "#fff",
      display: "flex", alignItems: "center", gap: "14px", boxSizing: "border-box",
      "&:hover": { boxShadow: "0 2px 6px rgba(16,30,54,.1), 0 6px 20px rgba(16,30,54,.08)" },
    }}>
      <Box sx={{
        width: 46, height: 46, minWidth: 46, borderRadius: "11px",
        bgcolor: iconBg, display: "flex", alignItems: "center",
        justifyContent: "center", color: iconColor, flexShrink: 0,
        "& svg": { fontSize: 21 },
      }}>
        {icon}
      </Box>
      <Box>
        <Typography sx={{ fontFamily: FONT, color: MUTED, fontSize: 12.5, fontWeight: 600, lineHeight: 1.2, mb: 0.2 }}>
          {label}
        </Typography>
        {loading
          ? <Skeleton variant="text" width={80} height={36} />
          : <Typography sx={{ fontFamily: FONT, color: HEAD, fontSize: 27, fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.6px" }}>
            {value}
          </Typography>
        }
        {trend && !loading && (
          <Typography sx={{ fontFamily: FONT, color: trendColor, fontSize: 11.5, fontWeight: 600, mt: "2px" }}>
            {trend}
          </Typography>
        )}
      </Box>
    </Card>
  );
}

function PanelCard({ title, action, children }) {
  return (
    <Paper elevation={0} sx={{
      border: `1px solid ${LINE}`, borderRadius: "12px",
      boxShadow: CARD_SHADOW, bgcolor: "#fff",
      height: "100%", width: "100%", boxSizing: "border-box",
      overflow: "hidden", display: "flex", flexDirection: "column",
    }}>
      <Box sx={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        px: 2, py: 1.625, borderBottom: `1px solid ${LINE2}`, flexShrink: 0,
      }}>
        <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: 14, color: HEAD }}>
          {title}
        </Typography>
        {action}
      </Box>
      <Box sx={{ flex: 1, width: "100%" }}>{children}</Box>
    </Paper>
  );
}

function ViewLink({ label, onClick }) {
  return (
    <Link component="button" type="button" onClick={onClick} underline="none" sx={{
      fontFamily: FONT, color: "#2f6df0", fontWeight: 600, fontSize: 12.5,
      border: 0, bgcolor: "transparent", cursor: "pointer", p: 0,
      "&:hover": { color: "#1f57c9" },
    }}>
      {label}
    </Link>
  );
}

// ─── Monthly Trend Chart (SVG — maps real data to polyline points) ────────────
function TrendChart({ trend, loading }) {
  if (loading) {
    return (
      <Box sx={{ px: 2.5, pt: 2, pb: 1.5 }}>
        <Skeleton variant="rounded" height={150} />
      </Box>
    );
  }

  if (!trend || trend.length === 0) {
    return (
      <Box sx={{ px: 2.5, py: 3 }}>
        <Typography sx={{ fontFamily: FONT, fontSize: 13, color: MUTED }}>
          No production data available.
        </Typography>
      </Box>
    );
  }

  const maxVal = Math.max(...trend.map((t) => t.received), 1);
  const PADDING = 16;
  const WIDTH = 800;
  const HEIGHT = 160;
  const step = trend.length > 1
    ? (WIDTH - PADDING * 2) / (trend.length - 1)
    : WIDTH / 2;

  const toY = (val) =>
    HEIGHT - PADDING - ((val / maxVal) * (HEIGHT - PADDING * 2));

  const completedPts = trend
    .map((t, i) => `${PADDING + i * step},${toY(t.completed).toFixed(1)}`)
    .join(" ");

  const receivedPts = trend
    .map((t, i) => `${PADDING + i * step},${toY(t.received).toFixed(1)}`)
    .join(" ");
  // Detects when only one month is available in the new workflow.
  const isSingleMonth = trend.length === 1;

  const firstX = PADDING;
  const lastX = PADDING + (trend.length - 1) * step;
  const fillPts = `${completedPts} ${lastX},${HEIGHT} ${firstX},${HEIGHT}`;

  return (
    <Box sx={{ px: 2.5, pt: 2, pb: 1.5 }}>
      {/* SVG chart — no month labels inside SVG */}
      <Box sx={{ height: { xs: 120, sm: 140, md: 155 } }}>
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          width="100%"
          height="100%"
          preserveAspectRatio="none"
          role="img"
          aria-label="Monthly production trend"
        >
          <defs>
            <linearGradient id="adminFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3478ed" stopOpacity=".18" />
              <stop offset="100%" stopColor="#3478ed" stopOpacity=".02" />
            </linearGradient>
          </defs>

          {[32, 64, 96, 128, 160].map((y) => (
            <line key={y} x1="0" y1={y} x2={WIDTH} y2={y} stroke={LINE2} strokeWidth="1" />
          ))}

          <polygon points={fillPts} fill="url(#adminFill)" />

          <polyline points={completedPts} fill="none"
            stroke="#3478ed" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round" />

          <polyline points={receivedPts} fill="none"
            stroke="#8052df" strokeWidth="2"
            strokeDasharray="7 6" strokeLinecap="round" />

          {/* Shows visible data points when only one month is available. */}
          {isSingleMonth && (
            <>
              <circle
                cx={WIDTH / 2}
                cy={toY(trend[0].completed)}
                r="5"
                fill="#3478ed"
              />

              <circle
                cx={WIDTH / 2}
                cy={toY(trend[0].received)}
                r="5"
                fill="#8052df"
              />
            </>
          )}
        </svg>
      </Box>

      {/* Month labels — rendered as HTML below the SVG, properly spaced */}
      {trend.length > 0 && (
        <Box sx={{ display: "flex", justifyContent: "space-between", mt: "6px", px: "2px" }}>
          {trend.map((t) => (
            <Typography key={t.monthLabel} sx={{
              fontFamily: FONT,
              fontSize: 11,
              color: MUTED,
              whiteSpace: "nowrap",
              textAlign: "center",
            }}>
              {t.monthLabel}
            </Typography>
          ))}
        </Box>
      )}

      {/* Legend */}
      <Box sx={{ display: "flex", gap: 2.5, pt: 1, flexWrap: "wrap" }}>
        {[
          { label: "Completed", dash: false },
          { label: "Received", dash: true },
        ].map(({ label, dash }) => (
          <Box key={label} sx={{ display: "flex", alignItems: "center", gap: "5px", fontFamily: FONT, fontSize: 12, color: MUTED }}>
            <Box component="i" sx={{
              display: "inline-block", width: 18, height: 0,
              borderTop: dash ? "2px dashed #8052df" : "2px solid #3478ed",
            }} />
            {label}
          </Box>
        ))}
      </Box>
    </Box>
  );
}

// ─── Backlog by Project ───────────────────────────────────────────────────────
function BacklogRow({ name, pct, total, barPct }) {
  return (
    <Box sx={{
      display: "grid",
      gridTemplateColumns: "minmax(110px,1fr) 1fr 48px",
      alignItems: "center",
      gap: { xs: 1, sm: 1.5 },
      px: 2, py: 1.1,
      borderBottom: `1px solid ${LINE2}`,
      "&:last-child": { borderBottom: "none" },
    }}>
      <Typography sx={{ fontFamily: FONT, fontSize: 12.5, color: HEAD, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {name}
      </Typography>
      <Box sx={{ height: 7, bgcolor: "#edf1f6", borderRadius: 4, overflow: "hidden" }}>
        <Box sx={{ width: `${barPct}%`, height: "100%", bgcolor: "#5267e8", borderRadius: 4, transition: "width .5s ease" }} />
      </Box>
      <Typography sx={{ fontFamily: FONT, fontSize: 12.5, fontWeight: 700, color: HEAD, textAlign: "right" }}>
        {total.toLocaleString()}
      </Typography>
    </Box>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, note, color, action, nav, onNavigate, loading }) {
  return (
    <Paper elevation={0} sx={{
      border: `1px solid ${LINE}`, borderRadius: "12px",
      boxShadow: CARD_SHADOW, bgcolor: "#fff",
      overflow: "hidden", width: "100%",
    }}>
      <Box sx={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        px: 2, py: 1.5, borderBottom: `1px solid ${LINE2}`,
      }}>
        <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: 14, color: HEAD }}>
          {label}
        </Typography>
        <ViewLink label={action} onClick={() => onNavigate(nav)} />
      </Box>
      <Box sx={{ textAlign: "center", py: { xs: 2.5, sm: 3 }, px: 2 }}>
        {loading
          ? <Skeleton variant="text" width={80} height={48} sx={{ mx: "auto" }} />
          : <Typography sx={{ fontFamily: FONT, fontSize: { xs: 34, sm: 40 }, fontWeight: 800, color, lineHeight: 1, letterSpacing: "-1px" }}>
            {value}
          </Typography>
        }
        <Typography sx={{ fontFamily: FONT, color: MUTED, fontSize: 12.5, mt: 0.75 }}>
          {note}
        </Typography>
      </Box>
    </Paper>
  );
}

// Defines column widths for all 10 Project Daily Summary fields.
const DAILY_SUMMARY_COL =
  "1.1fr 1.8fr 1.6fr 1fr 1fr 1fr 1fr 1.3fr 1.3fr 1.3fr";

// Displays the Administrator Project Daily Summary.
function ProjectDailySummaryTable({
  rows,
  page,
  setPage,
  rowsPerPage,
}) {
  // Gets only the records for the current page.
  const paginatedRows = rows.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <PanelCard title="Project Daily Summary">
      <Box sx={{ overflowX: "auto" }}>
        {/* Displays table headings. */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: DAILY_SUMMARY_COL,
            minWidth: 1450,
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

        {/* Displays message when no records exist. */}
        {rows.length === 0 ? (
          <Box sx={{ px: 2, py: 2 }}>
            <Typography sx={{ fontSize: 13, color: MUTED }}>
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
                minWidth: 1450,
                alignItems: "center",
                px: 2,
                py: 1.3,
                borderBottom: `1px solid ${LINE2}`,
              }}
            >
              {/* Displays production date. */}
              <Typography sx={{ fontSize: 13, color: HEAD }}>
                {row.productionDate}
              </Typography>

              {/* Displays project name. */}
              <Typography
                sx={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: HEAD,
                }}
              >
                {row.projectName}
              </Typography>
              {/* Displays Reporting Category. */}
              <Typography sx={{ fontSize: 13, color: HEAD }}>
                {row.categoryName || "Uncategorized"}
              </Typography>

              {/* Displays documents received. */}
              <Typography sx={{ fontSize: 13, color: HEAD }}>
                {Number(row.received || 0).toLocaleString()}
              </Typography>

              {/* Displays documents completed. */}
              <Typography sx={{ fontSize: 13, color: HEAD }}>
                {Number(row.completed || 0).toLocaleString()}
              </Typography>

              {/* Displays remaining previous backlog. */}
              <Typography sx={{ fontSize: 13, color: HEAD }}>
                {Number(row.backlog || 0).toLocaleString()}
              </Typography>

              {/* Displays today's pending documents. */}
              <Typography
                sx={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: HEAD,
                }}
              >
                {Number(row.pending || 0).toLocaleString()}
              </Typography>
              {/* Batches Received */}
              <Typography sx={{ fontSize: 13, color: HEAD }}>
                {Number(row.batchesReceived || 0).toLocaleString()}
              </Typography>

              {/* Batches Processed */}
              <Typography sx={{ fontSize: 13, color: HEAD }}>
                {Number(row.batchesProcessed || 0).toLocaleString()}
              </Typography>

              {/* Pending Batches — includes previous unfinished batches */}
              <Typography
                sx={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: HEAD,
                }}
              >
                {Number(row.pendingBatches || 0).toLocaleString()}
              </Typography>
            </Box>
          ))
        )}
      </Box>

      {/* Displays pagination controls. */}
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
          <Typography sx={{ fontSize: 12.5, color: MUTED }}>
            {page * rowsPerPage + 1}–
            {Math.min((page + 1) * rowsPerPage, rows.length)} of{" "}
            {rows.length}
          </Typography>

          {/* Goes to previous page. */}
          <Button
            disabled={page === 0}
            onClick={() => setPage((current) => current - 1)}
            sx={{
              minWidth: 30,
              p: 0.5,
              fontSize: 18,
            }}
          >
            ‹
          </Button>

          {/* Goes to next page. */}
          <Button
            disabled={(page + 1) * rowsPerPage >= rows.length}
            onClick={() => setPage((current) => current + 1)}
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
// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard({ onNavigate }) {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  // Stores date-wise and project-wise production summary.
  const [projectDailySummary, setProjectDailySummary] = useState([]);

  // Controls pagination for Project Daily Summary.
  const [projectSummaryPage, setProjectSummaryPage] = useState(0);

  // Shows five Project Daily Summary records per page.
  const PROJECT_SUMMARY_ROWS_PER_PAGE = 5;

  useEffect(() => {
    const load = async () => {
      try {
        // Loads the main Administrator dashboard.
        const data = await apiRequest("/admin/dashboard");

        // Stores the main dashboard data.
        setDashboard(data.dashboard);

        // Loads the Administrator Project Daily Summary.
        const summaryData = await apiRequest(
          "/admin/dashboard/project-daily-summary"
        );
        console.log("ADMIN PROJECT SUMMARY:", summaryData);
        // Stores the Project Daily Summary records.
        setProjectDailySummary(summaryData.summary || []);
      } catch (err) {
        console.error("Admin Dashboard error:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ── Stat cards from live data ──────────────────────────────────────────────
  const STAT_CARDS = [
    {
      label: "Total Received",
      value: dashboard?.totalReceived?.toLocaleString() ?? "—",
      icon: <MoveToInboxRoundedIcon />,
      iconBg: "#e5eefe", iconColor: "#2f6df0",
    },
    {
      label: "Total Completed",
      value: dashboard?.totalCompleted?.toLocaleString() ?? "—",
      icon: <AssignmentTurnedInRoundedIcon />,
      iconBg: "#e4f6ee", iconColor: "#1f9d6b",
      trend: dashboard ? `${dashboard.activeProjects} active projects` : null,
      trendColor: "#1f9d6b",
    },
    {
      label: "Project Backlog",
      value: dashboard?.totalBacklog?.toLocaleString() ?? "—",
      icon: <AccessTimeRoundedIcon />,
      iconBg: "#fbf1dc", iconColor: "#d9962b",
      trend: dashboard
        ? `${dashboard.totalReceived > 0
          ? Math.round((dashboard.totalBacklog / dashboard.totalReceived) * 100)
          : 0}% of received`
        : null,
      trendColor: "#d64545",
    },
    {
      label: "Active employees",
      value: dashboard?.activeEmployees ?? "—",
      icon: <PeopleAltRoundedIcon />,
      iconBg: "#efe9fb", iconColor: "#7a51d6",
      trend: dashboard ? `${dashboard.activeProjects} projects` : null,
      trendColor: "#1f9d6b",
    },
  ];

  // ── KPI cards from live data ───────────────────────────────────────────────
  const KPI_CARDS = [
    {
      label: "Pending corrections",
      value: dashboard?.pendingCorrections ?? "—",
      note: "awaiting approval",
      color: "#df9324",
      action: "Review", nav: "corrections",
    },
    {
      label: "Guide compliance",
      value: dashboard ? `${dashboard.guideCompliance.rate}%` : "—",
      note: `${dashboard?.guideCompliance?.acked ?? 0} / ${dashboard?.guideCompliance?.total ?? 0} acknowledged`,
      color: "#15966a",
      action: "Details", nav: "compliance",
    },
    {
      label: "Missing entries",
      value: dashboard?.missingEntriesToday ?? "—",
      note: "employees today",
      color: "#dc3545",
      action: "View", nav: "users",
    },
  ];

  return (
    <Box sx={{ width: "100%", boxSizing: "border-box" }}>

      {/* BREADCRUMB */}
      <Typography sx={{ fontFamily: FONT, fontSize: 12.5, color: MUTED, mb: 0.4 }}>
        ProdTrack · Administrator
      </Typography>

      {/* TITLE ROW */}
      <Box sx={{
        display: "flex",
        alignItems: { xs: "flex-start", sm: "center" },
        flexDirection: { xs: "column", sm: "row" },
        justifyContent: "space-between",
        gap: 1.5, mb: 0.4,
      }}>
        <Typography sx={{ fontFamily: FONT, fontWeight: 800, fontSize: 22, letterSpacing: "-0.4px", color: HEAD }}>
          Admin dashboard
        </Typography>
        <Box sx={{ display: "flex", gap: 1, flexShrink: 0 }}>
          <Button variant="outlined" onClick={() => onNavigate("reports")} sx={{
            fontFamily: FONT, fontSize: 13, fontWeight: 600, px: 2, py: 0.875,
            borderRadius: "8px", textTransform: "none",
            borderColor: "#d0d7e2", color: HEAD, bgcolor: "#fff", boxShadow: "none",
            "&:hover": { borderColor: "#2f6df0", bgcolor: "#f5f8ff", boxShadow: "none" },
          }}>
            Export
          </Button>
          <Button variant="contained" startIcon={<BarChartRoundedIcon sx={{ fontSize: 17 }} />}
            onClick={() => onNavigate("analytics-kpis")} sx={{
              fontFamily: FONT, fontSize: 13, fontWeight: 600, px: 2, py: 0.875,
              borderRadius: "8px", textTransform: "none",
              bgcolor: "#2f6df0", color: "#fff", boxShadow: "none",
              "&:hover": { bgcolor: "#1f57c9", boxShadow: "none" },
            }}>
            Open analytics
          </Button>
        </Box>
      </Box>

      {/* DESCRIPTION */}
      <Typography sx={{ fontFamily: FONT, fontSize: 13.5, color: MUTED, mb: 2.5 }}>
        Organisation-wide production, backlogs and compliance across all projects.
      </Typography>

      {/* STAT CARDS */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        {STAT_CARDS.map((card) => (
          <Grid key={card.label} size={{ xs: 12, sm: 6, md: 3 }} sx={{ display: "flex" }}>
            <StatCard {...card} loading={loading} />
          </Grid>
        ))}
      </Grid>

      {/* TREND CHART + BACKLOG */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid size={{ xs: 12, md: 7.2 }} sx={{ display: "flex" }}>
          <PanelCard
            title="Monthly production trend"
            action={<ViewLink label="Analytics" onClick={() => onNavigate("analytics-kpis")} />}
          >
            <TrendChart trend={dashboard?.monthlyTrend} loading={loading} />
          </PanelCard>
        </Grid>

        <Grid size={{ xs: 12, md: 4.8 }} sx={{ display: "flex" }}>
          <PanelCard title="Backlog by project">
            {loading ? (
              <Box sx={{ px: 2, py: 1 }}>
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} variant="text" height={40} sx={{ mb: 0.5 }} />)}
              </Box>
            ) : dashboard?.backlogByProject?.length === 0 ? (
              <Box sx={{ px: 2, py: 2 }}>
                <Typography sx={{ fontFamily: FONT, fontSize: 13, color: MUTED }}>No backlog data.</Typography>
              </Box>
            ) : (
              <Box sx={{ pt: 0.5, pb: 0.5 }}>
                {(dashboard?.backlogByProject ?? []).map((row) => (
                  <BacklogRow key={row.name} {...row} />
                ))}
              </Box>
            )}
          </PanelCard>
        </Grid>
      </Grid>
      {/* ───────────────── PROJECT DAILY SUMMARY ───────────────── */}

      <Box sx={{ mb: 2.5 }}>
        <ProjectDailySummaryTable
          rows={projectDailySummary}
          page={projectSummaryPage}
          setPage={setProjectSummaryPage}
          rowsPerPage={PROJECT_SUMMARY_ROWS_PER_PAGE}
        />
      </Box>

      {/* KPI CARDS */}
      <Grid container spacing={2}>
        {KPI_CARDS.map((kpi) => (
          <Grid key={kpi.label} size={{ xs: 12, sm: 4 }} sx={{ display: "flex" }}>
            <KpiCard {...kpi} onNavigate={onNavigate} loading={loading} />
          </Grid>
        ))}
      </Grid>

    </Box>
  );
}
