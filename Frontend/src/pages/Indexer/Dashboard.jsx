import { useEffect, useState } from "react";
import apiRequest from "../../lib/api.js";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Link from "@mui/material/Link";
import Skeleton from "@mui/material/Skeleton";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import MoveToInboxRoundedIcon from "@mui/icons-material/MoveToInboxRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import BuildRoundedIcon from "@mui/icons-material/BuildRounded";
import FiberManualRecordRoundedIcon from "@mui/icons-material/FiberManualRecordRounded";
import CampaignRoundedIcon from "@mui/icons-material/CampaignRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";

import IndexingGuide from "../IndexingGuide.jsx";

const FONT =
  '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

// Static icon config for stat cards (order matches API response)
const STAT_CONFIG = [
  {
    label: "Total Received",
    icon: <MoveToInboxRoundedIcon />,
    iconBg: "#e5eefe",
    iconColor: "#2f6df0",
  },
  {
    label: "Total Completed",
    icon: <CheckCircleRoundedIcon />,
    iconBg: "#e4f6ee",
    iconColor: "#1f9d6b",
    trend: "▲ 6.4% vs last week",
    trendColor: "#1f9d6b",
  },
  {
    label: "Total Pending",
    icon: <AccessTimeRoundedIcon />,
    iconBg: "#fbf1dc",
    iconColor: "#d9962b",
    trendColor: "#d64545",
  },
  {
    label: "Today's Productivity",
    icon: <BoltRoundedIcon />,
    iconBg: "#efe9fb",
    iconColor: "#7a51d6",
    trend: "▲ on target",
    trendColor: "#1f9d6b",
  },
];

// =========================================================
// INDEXER DASHBOARD
// =========================================================

export default function IndexerDashboard({ onNavigate, onReviewGuide }) {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const data = await apiRequest("/dashboard/indexer");
        setDashboard(data.dashboard);
      } catch (error) {
        console.error("Dashboard loading error:", error);
      } finally {
        setLoading(false);
      }
    };
    loadDashboard();
  }, []);

  // Build stat cards from live data
  const liveStats = STAT_CONFIG.map((cfg, i) => {
    const values = dashboard
      ? [
          dashboard.totalReceived,
          dashboard.totalCompleted,
          dashboard.totalPending,
          dashboard.todayProductivity,
        ]
      : [null, null, null, null];
    return {
      ...cfg,
      value: values[i] !== null && values[i] !== undefined
        ? Number(values[i]).toLocaleString()
        : "—",
    };
  });

  const projectUpdates  = dashboard?.projectUpdates        ?? [];
  const announcements   = dashboard?.announcements         ?? [];
  const pendingAcks     = dashboard?.pendingAcknowledgements ?? [];
  const myProjects      = dashboard?.myProjects            ?? [];
  const banner          = dashboard?.acknowledgementBanner ?? { show: false };

  // Latest guide for the IndexingGuide card — first assigned project update
  const latestGuide = projectUpdates.length > 0
    ? {
        name: projectUpdates[0].title,
        version: projectUpdates[0].versionLabel,
        updatedDate: projectUpdates[0].effectiveDate ?? "",
      }
    : null;

  return (
    <Box sx={{ width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
      {/* BREADCRUMB */}
      <Typography sx={{ fontFamily: FONT, fontSize: 12.5, color: "#6a7585", mb: 0.5 }}>
        ProdTrack · Indexer
      </Typography>

      {/* TITLE ROW */}
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 2,
          mb: 0.5,
        }}
      >
        <Typography
          sx={{ fontFamily: FONT, fontWeight: 800, fontSize: 22, letterSpacing: "-0.4px", color: "#1a2434" }}
        >
          Dashboard
        </Typography>

        <Button
          variant="contained"
          startIcon={<AddRoundedIcon />}
          onClick={() => onNavigate("daily-entry")}
          sx={{
            fontFamily: FONT,
            fontSize: 13,
            fontWeight: 600,
            px: 1.75,
            py: 1.125,
            borderRadius: "8px",
            textTransform: "none",
            whiteSpace: "nowrap",
            backgroundColor: "#2f6df0",
            color: "#fff",
            boxShadow: "none",
            "&:hover": { backgroundColor: "#1f57c9", boxShadow: "none" },
          }}
        >
          New daily entry
        </Button>
      </Box>

      {/* DESCRIPTION */}
      <Typography sx={{ fontFamily: FONT, fontSize: 13.5, color: "#6a7585", mb: 2.5 }}>
        Your assigned projects, latest guide and pending acknowledgements.
      </Typography>

      {/* ACKNOWLEDGEMENT BANNER */}
      {banner.show && (
        <AcknowledgementBanner
          title={banner.title}
          message={banner.message}
          onReview={onReviewGuide ?? (() => onNavigate("indexing-guide"))}
        />
      )}

      {/* STAT CARDS */}
      <StatCards stats={liveStats} loading={loading} />

      {/* PROJECT UPDATES + ANNOUNCEMENTS */}
      <Grid container spacing={2} sx={{ mb: 2, width: "100%" }}>
        <Grid size={{ xs: 12, md: 7 }} sx={{ display: "flex" }}>
          <Box sx={{ width: "100%" }}>
            <ProjectUpdates
              updates={projectUpdates}
              unreadCount={dashboard?.unreadProjectUpdates ?? 0}
              loading={loading}
            />
          </Box>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }} sx={{ display: "flex" }}>
          <Box sx={{ width: "100%" }}>
            <Announcements announcements={announcements} loading={loading} />
          </Box>
        </Grid>
      </Grid>

      {/* INDEXING GUIDE + PENDING ACKNOWLEDGEMENTS */}
      <Grid container spacing={2} sx={{ mb: 2, width: "100%" }}>
        <Grid size={{ xs: 12, md: 7 }} sx={{ display: "flex" }}>
          <Box sx={{ width: "100%" }}>
            {latestGuide ? (
              <IndexingGuide
                variant="card"
                guide={latestGuide}
                onViewGuide={() => onNavigate("indexing-guide")}
              />
            ) : (
              <Card
                elevation={0}
                sx={{
                  border: "1px solid #dfe4ec",
                  borderRadius: "12px",
                  boxShadow: "0 1px 2px rgba(16,30,54,.06), 0 4px 16px rgba(16,30,54,.05)",
                  backgroundColor: "#ffffff",
                  height: "100%",
                  overflow: "hidden",
                }}
              >
                <Box sx={{ px: 2, py: 1.75, borderBottom: "1px solid #e8ecf3" }}>
                  <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: 14, color: "#1a2434" }}>
                    Indexing Guide
                  </Typography>
                </Box>
                <Box sx={{ px: 2, py: 2 }}>
                  {loading ? (
                    <Skeleton variant="text" width={200} height={24} />
                  ) : (
                    <Typography sx={{ fontFamily: FONT, fontSize: 13, color: "#6a7585" }}>
                      No guide available for your assigned projects.
                    </Typography>
                  )}
                </Box>
              </Card>
            )}
          </Box>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }} sx={{ display: "flex" }}>
          <Box sx={{ width: "100%" }}>
            <PendingAcknowledgements items={pendingAcks} loading={loading} />
          </Box>
        </Grid>
      </Grid>

      {/* MY PROJECTS + KEY HIGHLIGHTS */}
      <Grid container spacing={2} sx={{ width: "100%" }}>
        <Grid size={{ xs: 12, md: 7 }} sx={{ display: "flex" }}>
          <Box sx={{ width: "100%" }}>
            <MyProjects projects={myProjects} loading={loading} />
          </Box>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }} sx={{ display: "flex" }}>
          <Box sx={{ width: "100%" }}>
            <KeyHighlights />
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}


// =========================================================
// PanelCard
// =========================================================
function PanelCard({ title, subtitle, children, onViewAll }) {
  return (
    <Card
      elevation={0}
      sx={{
        border: "1px solid #dfe4ec",
        borderRadius: "12px",
        boxShadow: "0 1px 2px rgba(16,30,54,.06), 0 4px 16px rgba(16,30,54,.05)",
        backgroundColor: "#ffffff",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 2,
          py: 1.75,
          borderBottom: "1px solid #e8ecf3",
        }}
      >
        <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: 14, color: "#1a2434" }}>
          {title}{" "}
          {subtitle && (
            <Typography component="span" sx={{ fontFamily: FONT, color: "#6a7585", fontWeight: 600, fontSize: 12 }}>
              {subtitle}
            </Typography>
          )}
        </Typography>
        {onViewAll && (
          <Link
            component="button"
            type="button"
            onClick={onViewAll}
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
              "&:hover": { color: "#1f57c9" },
            }}
          >
            View all
          </Link>
        )}
      </Box>
      {children}
    </Card>
  );
}

// =========================================================
// AcknowledgementBanner
// =========================================================
function AcknowledgementBanner({ title, message, onReview }) {
  return (
    <Box
      sx={{
        background: "linear-gradient(90deg, #132338, #1b3050)",
        borderRadius: "10px",
        px: 2,
        py: 1.5,
        mb: 2.5,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 1.25,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, flexWrap: "wrap" }}>
        <CampaignRoundedIcon sx={{ color: "#d64545", fontSize: 18 }} />
        <Typography sx={{ fontFamily: FONT, color: "#dce6f7", fontWeight: 700, fontSize: 13 }}>
          {title}
        </Typography>
        <Typography sx={{ fontFamily: FONT, color: "#93a4c2", fontSize: 13 }}>
          {message}
        </Typography>
      </Box>
      <Link
        component="button"
        type="button"
        onClick={onReview}
        underline="none"
        sx={{
          fontFamily: FONT,
          color: "#7fb0ff",
          fontWeight: 700,
          fontSize: 13,
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          whiteSpace: "nowrap",
          border: 0,
          bgcolor: "transparent",
          cursor: "pointer",
          ml: "auto",
          "&:hover": { color: "#a8c8ff" },
        }}
      >
        Review now
        <ArrowForwardRoundedIcon sx={{ fontSize: 15 }} />
      </Link>
    </Box>
  );
}

// =========================================================
// StatCard + StatCards
// =========================================================
function StatCard({ icon, iconBg, iconColor, label, value, trend, trendColor, loading }) {
  return (
    <Card
      elevation={0}
      sx={{
        width: "100%",
        height: 118,
        boxSizing: "border-box",
        px: 2,
        py: 2,
        borderRadius: "12px",
        display: "flex",
        alignItems: "center",
        gap: 1.625,
        backgroundColor: "#ffffff",
        border: "1px solid #dfe4ec",
        boxShadow: "0 1px 2px rgba(16,30,54,.06), 0 4px 16px rgba(16,30,54,.05)",
        "&:hover": { boxShadow: "0 2px 4px rgba(16,30,54,.08), 0 6px 20px rgba(16,30,54,.08)" },
      }}
    >
      <Box
        sx={{
          width: 46,
          height: 46,
          minWidth: 46,
          borderRadius: "11px",
          backgroundColor: iconBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: iconColor,
          flexShrink: 0,
          "& svg": { fontSize: 20 },
        }}
      >
        {icon}
      </Box>
      <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 0 }}>
        <Typography sx={{ fontFamily: FONT, color: "#6a7585", fontSize: 12.5, fontWeight: 600, lineHeight: 1.2, mb: 0.25, whiteSpace: "nowrap" }}>
          {label}
        </Typography>
        {loading ? (
          <Skeleton variant="text" width={60} height={36} />
        ) : (
          <Typography sx={{ fontFamily: FONT, color: "#1a2434", fontSize: 26, fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.6px", whiteSpace: "nowrap" }}>
            {value}
          </Typography>
        )}
        {trend && !loading && (
          <Typography sx={{ fontFamily: FONT, color: trendColor, fontSize: 11.5, fontWeight: 600, lineHeight: 1.2, mt: "3px", whiteSpace: "nowrap" }}>
            {trend}
          </Typography>
        )}
      </Box>
    </Card>
  );
}

function StatCards({ stats = [], loading }) {
  return (
    <Grid container spacing={2} sx={{ mb: 2, width: "100%" }}>
      {stats.map((stat) => (
        <Grid key={stat.label} size={{ xs: 12, sm: 6, md: 3 }} sx={{ display: "flex" }}>
          <StatCard {...stat} loading={loading} />
        </Grid>
      ))}
    </Grid>
  );
}

// =========================================================
// ProjectUpdates
// =========================================================
const badgeStyle = {
  NEW:     { backgroundColor: "#d64545", color: "#fff" },
  UPDATED: { backgroundColor: "#d9962b", color: "#fff" },
};

function Badge({ label }) {
  const style = badgeStyle[label] ?? { backgroundColor: "#dfe4ec", color: "#1a2434" };
  return (
    <Box
      sx={{
        fontFamily: FONT,
        fontSize: 10.5,
        fontWeight: 800,
        px: 1,
        py: "3px",
        borderRadius: "20px",
        letterSpacing: "0.3px",
        textTransform: "uppercase",
        display: "inline-block",
        lineHeight: 1.4,
        ...style,
      }}
    >
      {label}
    </Box>
  );
}

function ProjectUpdates({ updates = [], unreadCount = 0, loading }) {
  return (
    <PanelCard title="Project updates" subtitle={`(Unread: ${unreadCount})`} onViewAll={() => {}}>
      {loading ? (
        <Box sx={{ px: 2, py: 1.5 }}>
          {[1, 2].map((i) => <Skeleton key={i} variant="text" height={48} sx={{ mb: 1 }} />)}
        </Box>
      ) : updates.length === 0 ? (
        <Box sx={{ px: 2, py: 2 }}>
          <Typography sx={{ fontFamily: FONT, fontSize: 13, color: "#6a7585" }}>
            No recent project updates.
          </Typography>
        </Box>
      ) : (
        updates.map((update, i) => (
          <Box
            key={update.title + i}
            sx={{
              px: 2,
              py: 1.625,
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 1.5,
              borderBottom: i < updates.length - 1 ? "1px solid #e8ecf3" : "none",
            }}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: "3px" }}>
                <Badge label={update.badge} />
                <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: 13.5, color: "#1a2434" }}>
                  {update.title}
                </Typography>
              </Box>
              <Typography sx={{ fontFamily: FONT, color: "#6a7585", fontSize: 12.5, mt: "3px" }}>
                {update.description}
              </Typography>
            </Box>
            {update.effectiveDate && (
              <Typography sx={{ fontFamily: FONT, color: "#6a7585", fontSize: 12, textAlign: "right", whiteSpace: "nowrap", pt: "2px" }}>
                Effective
                <br />
                {update.effectiveDate}
              </Typography>
            )}
          </Box>
        ))
      )}
    </PanelCard>
  );
}

// =========================================================
// Announcements
// =========================================================
function Announcements({ announcements = [], loading }) {
  return (
    <PanelCard title="Announcements" onViewAll={() => {}}>
      {loading ? (
        <Box sx={{ px: 2, py: 1.5 }}>
          {[1, 2].map((i) => <Skeleton key={i} variant="text" height={48} sx={{ mb: 1 }} />)}
        </Box>
      ) : announcements.length === 0 ? (
        <Box sx={{ px: 2, py: 2 }}>
          <Typography sx={{ fontFamily: FONT, fontSize: 13, color: "#6a7585" }}>
            No announcements.
          </Typography>
        </Box>
      ) : (
        announcements.map((item, i) => (
          <Box
            key={item.id ?? item.title}
            sx={{
              px: 2,
              py: 1.625,
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 1.5,
              borderBottom: i < announcements.length - 1 ? "1px solid #e8ecf3" : "none",
            }}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: "3px" }}>
                {item.projectName ? (
                  <FiberManualRecordRoundedIcon sx={{ fontSize: 12, color: "#1f9d6b" }} />
                ) : (
                  <BuildRoundedIcon sx={{ fontSize: 15, color: "#6a7585" }} />
                )}
                <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: 13.5, color: "#1a2434" }}>
                  {item.title}
                </Typography>
              </Box>
              <Typography sx={{ fontFamily: FONT, color: "#6a7585", fontSize: 12.5, mt: "3px" }}>
                {item.description}
              </Typography>
            </Box>
            <Typography sx={{ fontFamily: FONT, color: "#6a7585", fontSize: 12, whiteSpace: "nowrap", pt: "2px" }}>
              {item.date}
            </Typography>
          </Box>
        ))
      )}
    </PanelCard>
  );
}

// =========================================================
// PendingAcknowledgements
// =========================================================
function PendingAcknowledgements({ items = [], loading }) {
  return (
    <PanelCard title="Pending acknowledgements" onViewAll={() => {}}>
      {loading ? (
        <Box sx={{ px: 2, py: 1.5 }}>
          {[1, 2].map((i) => <Skeleton key={i} variant="text" height={48} sx={{ mb: 1 }} />)}
        </Box>
      ) : items.length === 0 ? (
        <Box sx={{ px: 2, py: 2 }}>
          <Typography sx={{ fontFamily: FONT, fontSize: 13, color: "#1f9d6b", fontWeight: 600 }}>
            ✓ All guides acknowledged.
          </Typography>
        </Box>
      ) : (
        items.map((item, i) => (
          <Box
            key={item.versionId ?? item.name}
            sx={{
              px: 2,
              py: 1.625,
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 2,
              borderBottom: i < items.length - 1 ? "1px solid #e8ecf3" : "none",
            }}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: 13.5, color: "#1a2434", mb: "3px" }}>
                {item.name}
              </Typography>
              {item.updatedDate && (
                <Typography sx={{ fontFamily: FONT, color: "#6a7585", fontSize: 12.5 }}>
                  Updated {item.updatedDate}
                </Typography>
              )}
            </Box>
            <Box
              sx={{
                fontFamily: FONT,
                fontSize: 10.5,
                fontWeight: 800,
                px: 1,
                py: "3px",
                borderRadius: "20px",
                letterSpacing: "0.3px",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
                backgroundColor: "#fbf1dc",
                color: "#a9741a",
                border: "1px solid #ecd6a3",
                lineHeight: 1.4,
                alignSelf: "flex-start",
              }}
            >
              {item.status}
            </Box>
          </Box>
        ))
      )}
    </PanelCard>
  );
}

// =========================================================
// MyProjects
// =========================================================
const CHIP_COLORS = [
  { backgroundColor: "#e4f6ee", color: "#177a53" },
  { backgroundColor: "#fbf1dc", color: "#a9741a" },
  { backgroundColor: "#efe9fb", color: "#603bb3" },
];

function MyProjects({ projects = [], loading }) {
  return (
    <Card
      elevation={0}
      sx={{
        border: "1px solid #dfe4ec",
        borderRadius: "12px",
        boxShadow: "0 1px 2px rgba(16,30,54,.06), 0 4px 16px rgba(16,30,54,.05)",
        backgroundColor: "#ffffff",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <Box sx={{ px: 2, py: 1.75, borderBottom: "1px solid #e8ecf3" }}>
        <Typography sx={{ fontFamily: FONT, fontSize: 14, fontWeight: 700, color: "#1a2434" }}>
          My projects
        </Typography>
      </Box>
      <Box sx={{ px: 2, py: 2, display: "flex", gap: "6px 6px", flexWrap: "wrap", alignItems: "center" }}>
        {loading ? (
          [1, 2, 3].map((i) => <Skeleton key={i} variant="rounded" width={120} height={28} sx={{ borderRadius: "20px" }} />)
        ) : projects.length === 0 ? (
          <Typography sx={{ fontFamily: FONT, fontSize: 13, color: "#6a7585" }}>
            No projects assigned.
          </Typography>
        ) : (
          projects.map((project, i) => (
            <Box
              key={project.id}
              sx={{
                fontFamily: FONT,
                fontSize: 11.5,
                fontWeight: 600,
                px: "11px",
                py: "5px",
                borderRadius: "20px",
                ...CHIP_COLORS[i % CHIP_COLORS.length],
              }}
            >
              {project.name}
            </Box>
          ))
        )}
      </Box>
    </Card>
  );
}

// =========================================================
// KeyHighlights (static)
// =========================================================
const highlights = [
  "Updates shown for assigned projects only",
  "Unread updates highlighted on login",
  "Quick access to the latest guide",
  "Acknowledgement status always visible",
];

function KeyHighlights() {
  return (
    <Box
      sx={{
        backgroundColor: "#ffffff",
        border: "1px solid #dfe4ec",
        borderRadius: "12px",
        overflow: "hidden",
        height: "100%",
        boxShadow: "0 1px 2px rgba(16,30,54,.06), 0 4px 16px rgba(16,30,54,.05)",
      }}
    >
      <Box sx={{ px: 2, py: 1.75, borderBottom: "1px solid #e8ecf3" }}>
        <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: 14, color: "#1a2434" }}>
          Key highlights
        </Typography>
      </Box>
      <Box component="ul" sx={{ fontFamily: FONT, m: 0, px: "34px", py: 2, color: "#4a5568" }}>
        {highlights.map((highlight) => (
          <Box
            component="li"
            key={highlight}
            sx={{ fontFamily: FONT, fontSize: 13, lineHeight: 1.5, mb: "6px", "&:last-child": { mb: 0 } }}
          >
            {highlight}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
