import { useEffect, useState } from "react";
import apiRequest from "../../lib/api.js";

import {
  Box, Button, Card, Grid, Link,
  Paper, Typography, Skeleton, Avatar,
} from "@mui/material";

import PeopleAltRoundedIcon        from "@mui/icons-material/PeopleAltRounded";
import AssignmentTurnedInRoundedIcon from "@mui/icons-material/AssignmentTurnedInRounded";
import AccessTimeRoundedIcon        from "@mui/icons-material/AccessTimeRounded";
import VerifiedRoundedIcon          from "@mui/icons-material/VerifiedRounded";

// ─── Design tokens ────────────────────────────────────────────────────────────
const FONT        = '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
const CARD_SHADOW = "0 1px 3px rgba(16,30,54,.07), 0 4px 16px rgba(16,30,54,.06)";
const LINE        = "#dfe4ec";
const LINE2       = "#e8ecf3";
const MUTED       = "#6a7585";
const HEAD        = "#1a2434";

// ─── Shared sub-components ────────────────────────────────────────────────────
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
        {loading ? (
          <Skeleton variant="text" width={60} height={36} />
        ) : (
          <Typography sx={{ fontFamily: FONT, color: HEAD, fontSize: 27, fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.6px" }}>
            {value}
          </Typography>
        )}
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
      <Box sx={{ flex: 1 }}>{children}</Box>
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

// ─── Bar Chart ────────────────────────────────────────────────────────────────
function ProductivityChart({ bars, loading }) {
  if (loading) {
    return (
      <Box sx={{ px: 2.5, pt: 3, pb: 2, display: "flex", alignItems: "flex-end", gap: 1, height: 220 }}>
        {[1,2,3,4,5,6,7].map((i) => (
          <Skeleton key={i} variant="rounded" width="100%" height={`${40 + i * 15}px`} sx={{ borderRadius: "6px 6px 0 0" }} />
        ))}
      </Box>
    );
  }

  if (!bars || bars.length === 0) {
    return (
      <Box sx={{ px: 2, py: 3, height: 220, display: "flex", alignItems: "center" }}>
        <Typography sx={{ fontFamily: FONT, fontSize: 13, color: MUTED }}>
          No production data for the last 7 days.
        </Typography>
      </Box>
    );
  }

  const maxVal = Math.max(...bars.map((b) => b.completed), 1);

  return (
    <Box sx={{
      px: { xs: 1.5, sm: 2.5 }, pt: 3, pb: 0,
      height: { xs: 200, sm: 220 },
      display: "flex", alignItems: "flex-end",
      justifyContent: "space-around", gap: { xs: 0.5, sm: 1 }, overflow: "hidden",
    }}>
      {bars.map((bar, i) => {
        const heightPct = `${(bar.completed / maxVal) * 100}%`;
        return (
          <Box key={bar.day_short + i} sx={{
            flex: 1, maxWidth: { xs: 40, sm: 52 }, height: "100%",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "flex-end",
            pb: "26px", position: "relative",
          }}>
            <Typography sx={{ fontFamily: FONT, fontSize: { xs: 10, sm: 11 }, fontWeight: 700, color: HEAD, mb: "4px", lineHeight: 1 }}>
              {bar.completed}
            </Typography>
            <Box sx={{ width: "100%", height: heightPct, bgcolor: i === bars.length - 1 ? "#8060d9" : "#3478ed", borderRadius: "6px 6px 0 0" }} />
            <Typography sx={{ position: "absolute", bottom: 4, fontFamily: FONT, fontSize: { xs: 10, sm: 11 }, color: MUTED, fontWeight: 500 }}>
              {bar.day_short}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}

// ─── Donut / Completion Split ─────────────────────────────────────────────────
function CompletionSplit({ split, loading }) {
  if (loading) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 190 }}>
        <Skeleton variant="circular" width={148} height={148} />
      </Box>
    );
  }

  const completed = split?.completed ?? 0;
  const pending   = split?.pending   ?? 0;
  const inReview  = split?.inReview  ?? 0;
  const total     = completed + pending + inReview || 1;
  const pct       = split?.completionPct ?? 0;

  const DONUT = [
    { label: "Completed", value: completed, color: "#20a36b" },
    { label: "Pending",   value: pending,   color: "#e09a20" },
    { label: "In review", value: inReview,  color: "#3478ed" },
  ];

  let cumPct = 0;
  const stops = DONUT.map(({ color, value }) => {
    const p = (value / total) * 100;
    const stop = `${color} ${cumPct.toFixed(1)}% ${(cumPct + p).toFixed(1)}%`;
    cumPct += p;
    return stop;
  }).join(", ");

  return (
    <Box sx={{
      display: "flex", alignItems: "center", justifyContent: "center",
      gap: { xs: 3, sm: 5 }, flexDirection: { xs: "column", sm: "row" },
      py: { xs: 2.5, sm: 0 }, height: { xs: "auto", sm: "100%" }, minHeight: { xs: 220, sm: 190 },
    }}>
      <Box sx={{
        width: { xs: 130, sm: 148 }, height: { xs: 130, sm: 148 },
        borderRadius: "50%", background: `conic-gradient(${stops})`,
        display: "grid", placeItems: "center", flexShrink: 0,
      }}>
        <Box sx={{
          width: { xs: 84, sm: 96 }, height: { xs: 84, sm: 96 },
          borderRadius: "50%", bgcolor: "#fff",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        }}>
          <Typography sx={{ fontFamily: FONT, fontSize: { xs: 20, sm: 22 }, fontWeight: 800, color: HEAD, lineHeight: 1.1 }}>
            {pct}%
          </Typography>
          <Typography sx={{ fontFamily: FONT, fontSize: 11, color: MUTED }}>Completed</Typography>
        </Box>
      </Box>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {DONUT.map(({ label, value, color }) => (
          <Box key={label} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box sx={{ width: 11, height: 11, bgcolor: color, borderRadius: "2px", flexShrink: 0 }} />
            <Typography sx={{ fontFamily: FONT, fontSize: 12.5, color: HEAD }}>
              {label} · {value.toLocaleString()}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

// ─── Team Members Table ───────────────────────────────────────────────────────
const COL = "1.4fr 1.8fr 1fr 1fr 1.2fr 1fr";

function GuideChip({ value }) {
  const done = value === "DONE";
  return (
    <Box sx={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 80, fontFamily: FONT, fontSize: 11, fontWeight: 800,
      py: "4px", borderRadius: "6px", letterSpacing: "0.4px",
      textTransform: "uppercase", lineHeight: 1.4,
      border: done ? "1.5px solid #1f9d6b" : "1.5px solid #d9962b",
      color: done ? "#1f9d6b" : "#d9962b", bgcolor: "transparent",
    }}>
      {value}
    </Box>
  );
}

function StatusChip({ value }) {
  const present = value === "PRESENT";
  const leave   = value === "LEAVE";
  const style = present
    ? { bgcolor: "#e4f6ee", color: "#177a53", border: "1.5px solid #b7e3cc" }
    : leave
    ? { bgcolor: "#fef3f2", color: "#c0392b", border: "1.5px solid #fbb" }
    : { bgcolor: "#f3f4f6", color: MUTED, border: `1.5px solid ${LINE}` };
  return (
    <Box sx={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 80, fontFamily: FONT, fontSize: 11, fontWeight: 800,
      py: "4px", borderRadius: "6px", letterSpacing: "0.4px",
      textTransform: "uppercase", lineHeight: 1.4, ...style,
    }}>
      {value}
    </Box>
  );
}

function MemberRow({ initials, name, avatarColor, project, completedToday, pendingToday, guideAck, status }) {
  return (
    <Box sx={{
      display: "grid", gridTemplateColumns: COL, minWidth: 860,
      alignItems: "center", px: 2, py: 1.25,
      borderTop: `1px solid ${LINE2}`, "&:hover": { bgcolor: "#fafbff" },
    }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
        <Avatar sx={{ width: 32, height: 32, bgcolor: avatarColor, fontSize: 12, fontWeight: 700, fontFamily: FONT }}>
          {initials}
        </Avatar>
        <Typography sx={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: HEAD, whiteSpace: "nowrap" }}>
          {name}
        </Typography>
      </Box>
      <Typography sx={{ fontFamily: FONT, fontSize: 13, color: MUTED, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {project}
      </Typography>
      <Typography sx={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: HEAD }}>
        {completedToday}
      </Typography>
      <Typography sx={{ fontFamily: FONT, fontSize: 13, color: HEAD }}>
        {pendingToday}
      </Typography>
      <GuideChip value={guideAck} />
      <StatusChip value={status} />
    </Box>
  );
}

function TeamMembersTable({ members, loading, onNavigate }) {
  return (
    <PanelCard
      title="Team members"
      action={<ViewLink label="Manage team" onClick={() => onNavigate("my-team")} />}
    >
      <Box sx={{ display: "grid", gridTemplateColumns: COL, minWidth: 860, px: 2, py: 1.2, bgcolor: "#f8fafc", borderBottom: `1px solid ${LINE2}` }}>
        {["MEMBER","PROJECT","COMPLETED","PENDING","GUIDE ACK.","STATUS"].map((col) => (
          <Typography key={col} sx={{ fontFamily: FONT, fontSize: 11, fontWeight: 800, color: MUTED, letterSpacing: "0.4px" }}>
            {col}
          </Typography>
        ))}
      </Box>
      <Box sx={{ overflowX: "auto" }}>
        {loading ? (
          [1,2,3].map((i) => (
            <Box key={i} sx={{ px: 2, py: 1.5, borderTop: `1px solid ${LINE2}` }}>
              <Skeleton variant="text" height={32} />
            </Box>
          ))
        ) : members.length === 0 ? (
          <Box sx={{ px: 2, py: 2 }}>
            <Typography sx={{ fontFamily: FONT, fontSize: 13, color: MUTED }}>No team members found.</Typography>
          </Box>
        ) : (
          members.map((m) => <MemberRow key={m.userId} {...m} />)
        )}
      </Box>
    </PanelCard>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard({ onNavigate }) {
  const [summary,    setSummary]    = useState(null);
  const [prodBars,   setProdBars]   = useState([]);
  const [split,      setSplit]      = useState(null);
  const [members,    setMembers]    = useState([]);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [s, p, cs, tm] = await Promise.all([
          apiRequest("/team-lead/dashboard"),
          apiRequest("/team-lead/dashboard/productivity"),
          apiRequest("/team-lead/dashboard/completion-split"),
          apiRequest("/team-lead/dashboard/team-members"),
        ]);
        setSummary(s.dashboard);
        setProdBars(p.productivity ?? []);
        setSplit(cs.completionSplit);
        setMembers(tm.members ?? []);
      } catch (err) {
        console.error("Team Lead Dashboard error:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const ackRate    = summary?.ackCompliance?.rate    ?? 0;
  const ackPending = summary?.ackCompliance?.pending ?? 0;

  const STAT_CARDS = [
    {
      label: "Team size",
      value: summary?.teamSize ?? "—",
      icon: <PeopleAltRoundedIcon />,
      iconBg: "#e5eefe", iconColor: "#2f6df0",
    },
    {
      label: "Completed today",
      value: summary?.completedToday?.toLocaleString() ?? "—",
      icon: <AssignmentTurnedInRoundedIcon />,
      iconBg: "#e4f6ee", iconColor: "#1f9d6b",
    },
    {
      label: "Pending approvals",
      value: summary?.pendingApprovals ?? "—",
      icon: <AccessTimeRoundedIcon />,
      iconBg: "#fbf1dc", iconColor: "#d9962b",
      trend: summary?.pendingApprovals > 0 ? `${summary.pendingApprovals} correction req${summary.pendingApprovals > 1 ? "s" : ""}` : null,
      trendColor: "#d64545",
    },
    {
      label: "Ack. compliance",
      value: `${ackRate}%`,
      icon: <VerifiedRoundedIcon />,
      iconBg: "#efe9fb", iconColor: "#7a51d6",
      trend: ackPending > 0 ? `${ackPending} pending` : "All acknowledged",
      trendColor: ackPending > 0 ? "#d64545" : "#1f9d6b",
    },
  ];

  return (
    <Box sx={{ width: "100%", boxSizing: "border-box" }}>
      {/* BREADCRUMB */}
      <Typography sx={{ fontFamily: FONT, fontSize: 12.5, color: MUTED, mb: 0.4 }}>
        ProdTrack · Team Lead
      </Typography>

      {/* TITLE ROW */}
      <Box sx={{
        display: "flex", alignItems: { xs: "flex-start", sm: "center" },
        flexDirection: { xs: "column", sm: "row" },
        justifyContent: "space-between", gap: 1.5, mb: 0.4,
      }}>
        <Typography sx={{ fontFamily: FONT, fontWeight: 800, fontSize: 22, letterSpacing: "-0.4px", color: HEAD }}>
          Team dashboard
        </Typography>
        <Box sx={{ display: "flex", gap: 1, flexShrink: 0 }}>
          <Button variant="outlined" onClick={() => onNavigate("reports")}
            sx={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, px: 2, py: 0.875, borderRadius: "8px", textTransform: "none", borderColor: "#d0d7e2", color: HEAD, bgcolor: "#fff", boxShadow: "none", "&:hover": { borderColor: "#2f6df0", bgcolor: "#f5f8ff", boxShadow: "none" } }}>
            Export report
          </Button>
          <Button variant="contained" onClick={() => onNavigate("corrections")}
            sx={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, px: 2, py: 0.875, borderRadius: "8px", textTransform: "none", bgcolor: "#2f6df0", color: "#fff", boxShadow: "none", "&:hover": { bgcolor: "#1f57c9", boxShadow: "none" } }}>
            Review approvals
          </Button>
        </Box>
      </Box>

      {/* DESCRIPTION */}
      <Typography sx={{ fontFamily: FONT, fontSize: 13.5, color: MUTED, mb: 2.5 }}>
        Production and acknowledgement status for your team across assigned projects.
      </Typography>

      {/* STAT CARDS */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        {STAT_CARDS.map((card) => (
          <Grid key={card.label} size={{ xs: 12, sm: 6, md: 3 }} sx={{ display: "flex" }}>
            <StatCard {...card} loading={loading} />
          </Grid>
        ))}
      </Grid>

      {/* BAR CHART + DONUT */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid size={{ xs: 12, md: 7 }} sx={{ display: "flex" }}>
          <PanelCard title="Team productivity — this week"
            action={<ViewLink label="Details" onClick={() => onNavigate("reports")} />}>
            <ProductivityChart bars={prodBars} loading={loading} />
          </PanelCard>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }} sx={{ display: "flex" }}>
          <PanelCard title="Completion split">
            <CompletionSplit split={split} loading={loading} />
          </PanelCard>
        </Grid>
      </Grid>

      {/* TEAM MEMBERS TABLE */}
      <TeamMembersTable members={members} loading={loading} onNavigate={onNavigate} />
    </Box>
  );
}
