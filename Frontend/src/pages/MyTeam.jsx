import {
  Box,
  Button,
  Paper,
  Typography,
  Avatar,
} from "@mui/material";
import { useEffect, useState } from "react";
import apiRequest from "../lib/api.js";
import { useToast } from "../components/ToastProvider.jsx";

// ─── Design tokens — databin.in/kavya ────────────────────────────────────────
const FONT =
  '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
const CARD_SHADOW = "0 1px 3px rgba(16,30,54,.07), 0 4px 16px rgba(16,30,54,.06)";
const LINE  = "#dfe4ec";
const LINE2 = "#e8ecf3";
const MUTED = "#6a7585";
const HEAD  = "#1a2434";


const COLS = "1.4fr 1fr 1.4fr 1fr 1.2fr 1.8fr";
const HEADERS = ["MEMBER", "EMP ID", "PROJECT(S)", "TODAY", "GUIDE ACK.", "STATUS"];


function GuideChip({ value }) {
  const done = value === "DONE";
  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 80,
        fontFamily: FONT,
        fontSize: 11,
        fontWeight: 800,
        py: "4px",
        borderRadius: "6px",
        letterSpacing: "0.4px",
        textTransform: "uppercase",
        lineHeight: 1.4,
        border: done ? "1.5px solid #1f9d6b" : "1.5px solid #d9962b",
        color: done ? "#1f9d6b" : "#d9962b",
        bgcolor: "transparent",
      }}
    >
      {value}
    </Box>
  );
}

function StatusChip({ value }) {
  const present = value === "PRESENT";
  const leave   = value === "LEAVE";

  const chipStyle = present
    ? { bgcolor: "#e4f6ee", color: "#177a53", border: "1.5px solid #b7e3cc" }
    : leave
    ? { bgcolor: "#fdecea", color: "#c0392b", border: "1.5px solid #f5b7b1" }
    : { bgcolor: "#f3f4f6", color: "#6a7585", border: `1.5px solid ${LINE}` };

  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        minWidth: 90,
        px: "6px",
        fontFamily: FONT,
        fontSize: 11,
        fontWeight: 800,
        py: "4px",
        borderRadius: "6px",
        letterSpacing: "0.4px",
        textTransform: "uppercase",
        lineHeight: 1.4,
        ...chipStyle,
      }}
    >
      {value}
    </Box>
  );
}

// ─── Table row ────────────────────────────────────────────────────────────────

function MemberRow({
  initials,
  name,
  empId,
  avatarColor,
  projects,
  today,
  guide,
  status,
}) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: COLS,
        minWidth: 860,
        alignItems: "center",
        px: 2,
        py: 1.25,
        borderTop: `1px solid ${LINE2}`,
        "&:hover": { bgcolor: "#fafbff" },
      }}
    >
      {/* member */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
        <Avatar
          sx={{
            width: 32, height: 32,
            bgcolor: avatarColor,
            fontSize: 12, fontWeight: 700,
            fontFamily: FONT,
          }}
        >
          {initials}
        </Avatar>
        <Typography sx={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: HEAD, whiteSpace: "nowrap" }}>
          {name}
        </Typography>
      </Box>

      {/* emp id */}
      <Typography sx={{ fontFamily: FONT, fontSize: 12.5, color: MUTED }}>
        {empId}
      </Typography>

      {/* projects */}
      <Typography sx={{ fontFamily: FONT, fontSize: 12.5, color: MUTED, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {projects}
      </Typography>

      {/* today */}
      <Typography sx={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: HEAD }}>
        {today}
      </Typography>

      {/* guide ack */}
      <GuideChip value={guide} />

      {/* attendance status */}
      <StatusChip value={status} />
    </Box>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MyTeam({ onNavigate }) {
  const toast = useToast();
  const [team, setTeam] = useState([]);
  const [teamPage, setTeamPage] = useState(0);
  const TEAM_ROWS_PER_PAGE = 10;

useEffect(() => {
  const loadMyTeam = async () => {
    try {
      const data = await apiRequest("/team-lead/my-team");

      const avatarColors = [
        "#4f73e3",
        "#3aab8e",
        "#5b5ce2",
        "#e05a3a",
        "#7c4dbd",
      ];

      const formattedMembers = (data.members || []).map(
        (member, index) => {
          const memberName =
            member.name || member.full_name || "";

          const initials = memberName
            .split(" ")
            .filter(Boolean)
            .map((part) => part[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();
            
            const attendanceStatus = String(
            member.attendance_status ||
                "NOT MARKED"
            ).toUpperCase();

          return {
            id: member.id || member.user_id,
            initials,
            name: memberName,
            empId:
              member.employee_id ||
              member.employee_code ||
              "—",
            avatarColor:
              avatarColors[index % avatarColors.length],
            projects: member.projects || "—",
            today: Number(member.today_completed || 0),
            guide: String(
              member.guide_acknowledgement || "DONE"
            ).toUpperCase(),
            status: attendanceStatus,
          };
        }
      );

      setTeam(formattedMembers);
    } catch (error) {
      console.error("Load My Team Error:", error);
      toast.error(error.message);
    }
  };

  loadMyTeam();
}, [toast]);

  return (
    <Box sx={{ width: "100%", boxSizing: "border-box" }}>

      {/* BREADCRUMB */}
      <Typography sx={{ fontFamily: FONT, fontSize: 12.5, color: MUTED, mb: 0.4 }}>
        ProdTrack · Team Lead
      </Typography>

      {/* TITLE ROW */}
      <Box
        sx={{
          display: "flex",
          alignItems: { xs: "flex-start", sm: "center" },
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          gap: 1.5,
          mb: 0.4,
        }}
      >
        <Typography sx={{ fontFamily: FONT, fontWeight: 800, fontSize: 22, letterSpacing: "-0.4px", color: HEAD }}>
          My team
        </Typography>

        <Button
          variant="contained"
          onClick={() => onNavigate?.("reports")}
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
            "&:hover": { bgcolor: "#1f57c9", boxShadow: "none" },
          }}
        >
          Team report
        </Button>
      </Box>

      {/* DESCRIPTION */}
      <Typography sx={{ fontFamily: FONT, fontSize: 13.5, color: MUTED, mb: 2.5 }}>
        Members reporting to you, their assignments and today's status.
      </Typography>

      {/* TABLE CARD */}
      <Paper
        elevation={0}
        sx={{
          border: `1px solid ${LINE}`,
          borderRadius: "0px",
          boxShadow: CARD_SHADOW,
          bgcolor: "#fff",
          overflow: "hidden",
        }}
      >
        {/* header row */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: COLS,
            minWidth: 860,
            px: 2,
            py: 1.2,
            bgcolor: "#f8fafc",
            borderBottom: `1px solid ${LINE2}`,
          }}
        >
          {HEADERS.map((h) => (
            <Typography
              key={h}
              sx={{ fontFamily: FONT, fontSize: 11, fontWeight: 800, color: MUTED, letterSpacing: "0.4px" }}
            >
              {h}
            </Typography>
          ))}
        </Box>

        {/* data rows */}
        <Box sx={{ overflowX: "auto" }}>
          {team.slice(teamPage * TEAM_ROWS_PER_PAGE, (teamPage + 1) * TEAM_ROWS_PER_PAGE).map((member) => (
         <MemberRow
              key={member.id}
              {...member}
            />
          ))}
        </Box>
        {Math.ceil(team.length / TEAM_ROWS_PER_PAGE) > 1 && (
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 1, px: 2, py: 1, borderTop: `1px solid ${LINE2}` }}>
            <Typography sx={{ fontFamily: FONT, fontSize: 12, color: MUTED }}>
              {teamPage * TEAM_ROWS_PER_PAGE + 1}–{Math.min((teamPage + 1) * TEAM_ROWS_PER_PAGE, team.length)} of {team.length}
            </Typography>
            <Button size="small" disabled={teamPage === 0} onClick={() => setTeamPage((p) => p - 1)} sx={{ minWidth: 28, height: 28, p: 0, fontSize: 16, color: MUTED }}>‹</Button>
            <Button size="small" disabled={teamPage >= Math.ceil(team.length / TEAM_ROWS_PER_PAGE) - 1} onClick={() => setTeamPage((p) => p + 1)} sx={{ minWidth: 28, height: 28, p: 0, fontSize: 16, color: MUTED }}>›</Button>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
