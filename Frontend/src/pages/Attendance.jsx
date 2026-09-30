import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";

import EventAvailableRoundedIcon from "@mui/icons-material/EventAvailableRounded";
import BeachAccessRoundedIcon from "@mui/icons-material/BeachAccessRounded";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import { useCallback, useEffect, useState } from "react";
import apiRequest from "../lib/api.js";
import { useToast } from "../components/ToastProvider.jsx";
import Alert from "@mui/material/Alert";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";

// =====================================================
// ATTENDANCE DATA
// =====================================================

// const attendanceData = [
//   {
//     date: "20 May",
//     day: "Tue",
//     status: "Present",
//     hours: "8.0",
//     note: "—",
//   },
//   {
//     date: "19 May",
//     day: "Mon",
//     status: "Present",
//     hours: "8.0",
//     note: "—",
//   },
//   {
//     date: "16 May",
//     day: "Fri",
//     status: "Planned Leave",
//     hours: "0",
//     note: "Personal",
//   },
//   {
//     date: "15 May",
//     day: "Thu",
//     status: "Training",
//     hours: "8.0",
//     note: "Guide v2.3 session",
//   },
//   {
//     date: "14 May",
//     day: "Wed",
//     status: "Present",
//     hours: "7.5",
//     note: "—",
//   },
// ];

// =====================================================
// SUMMARY CARD
// =====================================================

function AttendanceCard({
  icon,
  iconBg,
  iconColor,
  label,
  value,
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        border: "1px solid",
        borderColor: "#e5e7eb",
        borderRadius: 1,
        p: 2.5,

        display: "flex",
        alignItems: "center",

        gap: 2,

        height: "100%",

        boxSizing: "border-box",

        backgroundColor: "#fff",
      }}
    >
      <Box
        sx={{
          width: 46,
          height: 46,

          borderRadius: 1,

          bgcolor: iconBg,
          color: iconColor,

          display: "flex",
          alignItems: "center",
          justifyContent: "center",

          flexShrink: 0,
        }}
      >
        {icon}
      </Box>

      <Box>
        <Typography
          sx={{
            color: "#6b7280",
            fontSize: 13,
            mb: 0.3,
          }}
        >
          {label}
        </Typography>

        <Typography
          sx={{
            color: "#111827",
            fontSize: 25,
            lineHeight: 1.2,
            fontWeight: 800,
          }}
        >
          {value}
        </Typography>
      </Box>
    </Paper>
  );
}

// =====================================================
// STATUS STYLE
// =====================================================

function getStatusStyle(status) {
  switch (status) {
    case "Present":
      return {
        backgroundColor: "#dcfce7",
        color: "#15803d",
      };

    case "Planned Leave":
      return {
        backgroundColor: "#fef3c7",
        color: "#b45309",
      };

    case "Training":
      return {
        backgroundColor: "#ede9fe",
        color: "#7c3aed",
      };

    default:
      return {
        backgroundColor: "#f3f4f6",
        color: "#374151",
      };
  }
}

// =====================================================
// ATTENDANCE PAGE
// =====================================================

export default function Attendance({ roleLabel = "Indexer", roleKey, }) {
  const toast = useToast();
  const [summary, setSummary] = useState(null);
  const [summaryError, setSummaryError] = useState("");
  const [attendance, setAttendance] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [attendanceError, setAttendanceError] = useState("");
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaveSaving, setLeaveSaving] = useState(false);

  // Pagination state for the three tables.
  const [attendancePage, setAttendancePage] = useState(0);
  const [teamLeavePage, setTeamLeavePage] = useState(0);
  const [myLeavePage, setMyLeavePage] = useState(0);
  const ROWS_PER_PAGE = 10;
  const [leaveErrors, setLeaveErrors] = useState({
    leaveType: false,
    startDate: false,
    endDate: false,
    dateRange: false,
    reason: false,
  });
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveLoading, setLeaveLoading] = useState(true);
  const [leaveError, setLeaveError] = useState("");
  const [teamLeaveRequests, setTeamLeaveRequests] =
  useState([]);

  const [teamLeaveLoading, setTeamLeaveLoading] =
    useState(false);

  const [teamLeaveError, setTeamLeaveError] =
    useState("");

  const [reviewingLeaveId, setReviewingLeaveId] =
    useState(null);

  const loadLeaveRequests = useCallback(async () => {
  setLeaveLoading(true);
  setLeaveError("");

  try {
    const data = await apiRequest("/leave-requests/my");

    if (!data.success) {
      throw new Error(data.message || "Failed to load leave requests");
    }

    setLeaveRequests(data.requests || []);
  } catch (error) {
    setLeaveError(error.message || "Failed to load leave requests");
  } finally {
    setLeaveLoading(false);
  }
}, []);

const loadTeamLeaveRequests = useCallback(
  async () => {
    setTeamLeaveLoading(true);
    setTeamLeaveError("");

    try {
      const data = await apiRequest(
        "/team-lead/leave-requests"
      );

      setTeamLeaveRequests(
        data.requests || []
      );
    } catch (error) {
      setTeamLeaveError(
        error.message ||
          "Failed to load team leave requests"
      );
    } finally {
      setTeamLeaveLoading(false);
    }
  },
  []
);

useEffect(() => {
  if (roleKey === "teamLead") {
    loadTeamLeaveRequests();
  }
}, [roleKey, loadTeamLeaveRequests]);

const handleLeaveDecision = async (
  requestId,
  decision
) => {
  if (reviewingLeaveId !== null) return;

  setReviewingLeaveId(requestId);

  try {
    const data = await apiRequest(
      `/team-lead/leave-requests/${requestId}/${decision}`,
      {
        method: "POST",
        body: JSON.stringify({
          reviewComment: "",
        }),
      }
    );

    toast.success(data.message);

    setTeamLeaveRequests((current) =>
      current.filter(
        (request) =>
          request.id !== requestId
      )
    );
  } catch (error) {
    toast.error(error.message);
  } finally {
    setReviewingLeaveId(null);
  }
};

useEffect(() => {
  loadLeaveRequests();
}, [loadLeaveRequests]);

  const handleSubmitLeave = async () => {
  if (leaveSaving) return;

  const errors = {
    leaveType: !leaveForm.leaveType,
    startDate: !leaveForm.startDate,
    endDate: !leaveForm.endDate,
    dateRange: false,
    reason: !leaveForm.reason.trim(),
  };

  if (!errors.startDate && !errors.endDate && leaveForm.startDate > leaveForm.endDate) {
    errors.dateRange = true;
  }

  if (errors.leaveType || errors.startDate || errors.endDate || errors.dateRange || errors.reason) {
    setLeaveErrors(errors);
    return;
  }

  setLeaveErrors({ leaveType: false, startDate: false, endDate: false, dateRange: false, reason: false });
  setLeaveSaving(true);

  try {
    const data = await apiRequest("/leave-requests", {
      method: "POST",
      body: JSON.stringify({
        ...leaveForm,
        reason: leaveForm.reason.trim(),
      }),
    });

    if (!data.success) {
      throw new Error(data.message || "Failed to submit leave request");
    }

    setLeaveOpen(false);

    setLeaveForm({
    leaveType: "planned_leave",
    startDate: "",
    endDate: "",
    reason: "",
  });

  setLeaveErrors({ leaveType: false, startDate: false, endDate: false, dateRange: false, reason: false });

  await loadLeaveRequests();

  toast.success(
    `Leave request #${data.leaveRequestId} submitted. Status: PENDING.`
  );
  } catch (error) {
    toast.error(error.message || "Failed to submit leave request");
  } finally {
    setLeaveSaving(false);
  }
};

    const [leaveForm, setLeaveForm] = useState({
      leaveType: "",
      startDate: "",
      endDate: "",
      reason: "",
    });

    const handleLeaveChange = (event) => {
      const { name, value } = event.target;

      setLeaveForm((current) => ({
        ...current,
        [name]: value,
      }));
    };

  useEffect(() => {
    const loadAttendance = async () => {
      setAttendanceLoading(true);
      setAttendanceError("");

      try {
        const data = await apiRequest("/attendance/my");

        if (!data.success) {
          throw new Error(data.message || "Failed to load attendance");
        }

        setAttendance(
          (data.attendance || []).map((record) => ({
            id: record.id,
            date: new Date(
              `${record.attendance_date}T00:00:00`
            ).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            }),
            day: record.day_name,
            status: record.status,
            hours: Number(record.hours || 0).toFixed(1),
            note: record.note || "—",
          }))
        );
      } catch (error) {
        setAttendanceError(
          error.message || "Failed to load attendance"
        );
      } finally {
        setAttendanceLoading(false);
      }
    };

    loadAttendance();
  }, []);

  useEffect(() => {
    const loadSummary = async () => {
      try {
        const data = await apiRequest("/attendance/summary");

        if (!data.success) {
          throw new Error(data.message || "Failed to load summary");
        }

        setSummary(data.summary);
      } catch (error) {
        setSummaryError(error.message || "Failed to load summary");
      }
    };

    loadSummary();
  }, []);

  return (
    <Box
      sx={{
        width: "100%",
      }}
    >
      {/* =================================================
          BREADCRUMB
      ================================================= */}

      <Typography
        sx={{
          color: "#6A7585",
          fontSize: 12.5,
          mb: 0.7,
        }}
      >
        ProdTrack · {roleLabel}
      </Typography>

      {/* =================================================
          PAGE HEADER
      ================================================= */}

      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",

          mb: 0.5,

          gap: 2,
        }}
      >
        <Box>
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: 22,

              color: "#1A2434",

              lineHeight: 1.5,
            }}
          >
            Leave & attendance
          </Typography>

          <Typography
            sx={{
              color: "#6A7585",
              fontSize: 14,
              mt: 0.5,
            }}
          >
            Track availability. Approved leave can be excluded from productivity
            calculations.
          </Typography>
        </Box>

        {/* APPLY FOR LEAVE */}

        <Button
          variant="contained"
          startIcon={<AddRoundedIcon />}
          type="button"
          onClick={() => setLeaveOpen(true)}
          sx={{
            px: 2,
            py: 1.15,

            borderRadius: 1,

            textTransform: "none",

            fontSize: 14,
            fontWeight: 600,

            whiteSpace: "nowrap",

            boxShadow: "none",

            flexShrink: 0,

            "&:hover": {
              boxShadow: "none",
            },
          }}
        >
          Apply for leave
        </Button>
      </Box>

        {summaryError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {summaryError}
          </Alert>
        )}

        <Typography sx={{ mt: 2, color: "#6A7585", fontSize: 13 }}>
          Summary for all recorded dates
        </Typography>
      {/* =================================================
          SUMMARY CARDS
      ================================================= */}

      <Grid
        container
        spacing={2.5}
        sx={{
          mt: 2.5,
          mb: 3,
        }}
      >
        {/* PRESENT DAYS */}

        <Grid
          size={{
            xs: 12,
            sm: 6,
            md: 3,
          }}
        >
          <AttendanceCard
            icon={<EventAvailableRoundedIcon />}
            iconBg="#dcfce7"
            iconColor="#16a34a"
            label="Present days"
            value={summary ? Number(summary.present_days) : "—"}
          />
        </Grid>

        {/* LEAVE TAKEN */}

        <Grid
          size={{
            xs: 12,
            sm: 6,
            md: 3,
          }}
        >
          <AttendanceCard
            icon={<BeachAccessRoundedIcon />}
            iconBg="#fff3dc"
            iconColor="#d97706"
            label="Leave taken"
            value={summary ? Number(summary.leave_days) : "—"}
          />
        </Grid>

        {/* TRAINING */}

        <Grid
          size={{
            xs: 12,
            sm: 6,
            md: 3,
          }}
        >
          <AttendanceCard
            icon={<SchoolRoundedIcon />}
            iconBg="#ede9fe"
            iconColor="#7c3aed"
            label="Training"
            value={summary ? Number(summary.training_days) : "—"}
          />
        </Grid>

        {/* WORKING DAYS */}

        <Grid
          size={{
            xs: 12,
            sm: 6,
            md: 3,
          }}
        >
          <AttendanceCard
            icon={<CalendarMonthRoundedIcon />}
            iconBg="#e5efff"
            iconColor="#2563eb"
            label="Production days"
            value={summary ? Number(summary.working_days) : "—"}
          />
        </Grid>
      </Grid>

      {/* =================================================
          THIS MONTH
      ================================================= */}

      <Paper
        elevation={0}
        sx={{
          border: "1px solid",

          borderColor: "#e5e7eb",

          borderRadius: 1,

          backgroundColor: "#fff",

          overflow: "hidden",
        }}
      >
        {/* TABLE HEADER */}

        <Box
          sx={{
            px: 2.5,
            py: 2,

            borderBottom: "1px solid",

            borderColor: "#e5e7eb",
          }}
        >
          <Typography
            sx={{
              fontSize: 16,

              fontWeight: 700,

              color: "#1A2434",
            }}
          >
            Attendance records
          </Typography>
        </Box>

        {/* TABLE */}

        <TableContainer>
          <Table
            sx={{
              minWidth: 700,
            }}
          >
            <TableHead>
              <TableRow
                sx={{
                  backgroundColor: "#f8fafc",
                }}
              >
                <TableCell
                  sx={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#6A7585",
                    py: 1.5,
                  }}
                >
                  Date
                </TableCell>

                <TableCell
                  sx={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#6A7585",
                    py: 1.5,
                  }}
                >
                  Day
                </TableCell>

                <TableCell
                  sx={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#6A7585",
                    py: 1.5,
                  }}
                >
                  Status
                </TableCell>

                <TableCell
                  align="center"
                  sx={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#6A7585",
                    py: 1.5,
                  }}
                >
                  Hours
                </TableCell>

                <TableCell
                  sx={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#6A7585",
                    py: 1.5,
                  }}
                >
                  Note
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {attendanceLoading && (
                <TableRow>
                  <TableCell colSpan={5}>
                    Loading attendance...
                  </TableCell>
                </TableRow>
              )}

              {!attendanceLoading && attendanceError && (
                <TableRow>
                  <TableCell colSpan={5} sx={{ color: "error.main" }}>
                    {attendanceError}
                  </TableCell>
                </TableRow>
              )}

              {!attendanceLoading &&
                !attendanceError &&
                attendance.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5}>
                      No attendance records found.
                    </TableCell>
                  </TableRow>
                )}
              {attendance.slice(attendancePage * ROWS_PER_PAGE, (attendancePage + 1) * ROWS_PER_PAGE).map((row) => {
                const statusStyle = getStatusStyle(row.status);

                return (
                  <TableRow
                    key={row.id}
                    sx={{
                      "&:last-child td": {
                        borderBottom: 0,
                      },

                      "&:hover": {
                        backgroundColor: "#f8fafc",
                      },
                    }}
                  >
                    {/* DATE */}

                    <TableCell
                      sx={{
                        fontSize: 14,

                        color: "#1A2434",

                        fontWeight: 500,

                        py: 1.8,
                      }}
                    >
                      {row.date}
                    </TableCell>

                    {/* DAY */}

                    <TableCell
                      sx={{
                        fontSize: 14,

                        color: "#1A2434",

                        py: 1.8,
                      }}
                    >
                      {row.day}
                    </TableCell>

                    {/* STATUS */}

                    <TableCell
                      sx={{
                        py: 1.8,
                      }}
                    >
                      <Box
                        sx={{
                          display: "inline-flex",

                          alignItems: "center",

                          px: 1.2,

                          py: 0.45,

                          borderRadius: 1.5,

                          backgroundColor:
                            statusStyle.backgroundColor,

                          color:
                            statusStyle.color,

                          fontSize: 10.5,

                          fontWeight: 800,
                        }}
                      >
                        {row.status.toUpperCase()}
                      </Box>
                    </TableCell>

                    {/* HOURS */}

                    <TableCell
                      align="center"
                      sx={{
                        fontSize: 14,

                        color: "#1A2434",

                        fontWeight: 600,

                        py: 1.8,
                      }}
                    >
                      {row.hours}
                    </TableCell>

                    {/* NOTE */}

                    <TableCell
                      sx={{
                        fontSize: 13,

                        color: "#6A7585",

                        py: 1.8,
                      }}
                    >
                      {row.note}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        {Math.ceil(attendance.length / ROWS_PER_PAGE) > 1 && (
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 1, px: 2, py: 1, borderTop: "1px solid #e5e7eb" }}>
            <Typography sx={{ fontSize: 12, color: "#6A7585" }}>
              {attendancePage * ROWS_PER_PAGE + 1}–{Math.min((attendancePage + 1) * ROWS_PER_PAGE, attendance.length)} of {attendance.length}
            </Typography>
            <Button size="small" disabled={attendancePage === 0} onClick={() => setAttendancePage((p) => p - 1)} sx={{ minWidth: 28, height: 28, p: 0, fontSize: 16 }}>‹</Button>
            <Button size="small" disabled={attendancePage >= Math.ceil(attendance.length / ROWS_PER_PAGE) - 1} onClick={() => setAttendancePage((p) => p + 1)} sx={{ minWidth: 28, height: 28, p: 0, fontSize: 16 }}>›</Button>
          </Box>
        )}
      </Paper>
      {roleKey === "teamLead" && (
  <Paper
    elevation={0}
    sx={{
      mt: 3,
      border: "1px solid #e5e7eb",
      borderRadius: 1,
      overflow: "hidden",
    }}
  >
    <Box
      sx={{
        px: 2.5,
        py: 2,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: "1px solid #e5e7eb",
      }}
    >
      <Typography
        sx={{ fontSize: 16, fontWeight: 700 }}
      >
        Pending team leave requests
      </Typography>

      <Button
        onClick={loadTeamLeaveRequests}
        disabled={teamLeaveLoading}
        sx={{ textTransform: "none" }}
      >
        Refresh
      </Button>
    </Box>

    {teamLeaveError && (
      <Alert severity="error" sx={{ m: 2 }}>
        {teamLeaveError}
      </Alert>
    )}

    <TableContainer>
      <Table size="small" sx={{ minWidth: 850 }}>
        <TableHead>
          <TableRow sx={{ bgcolor: "#f8fafc" }}>
            {[
              "Employee",
              "Leave type",
              "From",
              "To",
              "Reason",
              "Actions",
            ].map((heading) => (
              <TableCell
                key={heading}
                sx={{ fontWeight: 700 }}
              >
                {heading}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>

        <TableBody>
          {teamLeaveLoading ? (
            <TableRow>
              <TableCell colSpan={6}>
                Loading leave requests...
              </TableCell>
            </TableRow>
          ) : teamLeaveRequests.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6}>
                No pending team leave requests.
              </TableCell>
            </TableRow>
          ) : (
          teamLeaveRequests.slice(teamLeavePage * ROWS_PER_PAGE, (teamLeavePage + 1) * ROWS_PER_PAGE).map((request) => (
              <TableRow key={request.id}>
                <TableCell>
                  {request.employee_name}
                  <Typography
                    sx={{
                      fontSize: 11,
                      color: "#64748b",
                    }}
                  >
                    {request.employee_id}
                  </Typography>
                </TableCell>

                <TableCell>
                  {request.leave_type}
                </TableCell>

                <TableCell>
                  {request.start_date}
                </TableCell>

                <TableCell>
                  {request.end_date}
                </TableCell>

                <TableCell>
                  {request.reason}
                </TableCell>

                <TableCell>
                  <Box
                    sx={{
                      display: "flex",
                      gap: 1,
                    }}
                  >
                    <Button
                      size="small"
                      variant="contained"
                      color="success"
                      disabled={
                        reviewingLeaveId !== null
                      }
                      onClick={() =>
                        handleLeaveDecision(
                          request.id,
                          "approve"
                        )
                      }
                    >
                      Approve
                    </Button>

                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      disabled={
                        reviewingLeaveId !== null
                      }
                      onClick={() =>
                        handleLeaveDecision(
                          request.id,
                          "reject"
                        )
                      }
                    >
                      Reject
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
        {Math.ceil(teamLeaveRequests.length / ROWS_PER_PAGE) > 1 && (
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 1, px: 2, py: 1, borderTop: "1px solid #e5e7eb" }}>
            <Typography sx={{ fontSize: 12, color: "#6A7585" }}>
              {teamLeavePage * ROWS_PER_PAGE + 1}–{Math.min((teamLeavePage + 1) * ROWS_PER_PAGE, teamLeaveRequests.length)} of {teamLeaveRequests.length}
            </Typography>
            <Button size="small" disabled={teamLeavePage === 0} onClick={() => setTeamLeavePage((p) => p - 1)} sx={{ minWidth: 28, height: 28, p: 0, fontSize: 16 }}>‹</Button>
            <Button size="small" disabled={teamLeavePage >= Math.ceil(teamLeaveRequests.length / ROWS_PER_PAGE) - 1} onClick={() => setTeamLeavePage((p) => p + 1)} sx={{ minWidth: 28, height: 28, p: 0, fontSize: 16 }}>›</Button>
          </Box>
        )}
  </Paper>
)}
      <Paper
        elevation={0}
        sx={{
          mt: 3,
          border: "1px solid #e5e7eb",
          borderRadius: 1,
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            px: 2.5,
            py: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 2,
            borderBottom: "1px solid #e5e7eb",
          }}
        >
          <Typography sx={{ fontSize: 16, fontWeight: 700 }}>
            My leave requests
          </Typography>

          <Button
            type="button"
            onClick={loadLeaveRequests}
            disabled={leaveLoading || leaveSaving}
            sx={{ textTransform: "none" }}
          >
            Refresh
          </Button>
        </Box>

        <TableContainer>
          <Table size="small" sx={{ minWidth: 700 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: "#f8fafc" }}>
                {["ID", "Leave type", "From", "To", "Status", "Reason"].map(
                  (heading) => (
                    <TableCell key={heading} sx={{ fontWeight: 700 }}>
                      {heading}
                    </TableCell>
                  )
                )}
              </TableRow>
            </TableHead>

            <TableBody>
              {leaveLoading ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    Loading leave requests...
                  </TableCell>
                </TableRow>
              ) : leaveError ? (
                <TableRow>
                  <TableCell colSpan={6} sx={{ color: "error.main" }}>
                    {leaveError}
                  </TableCell>
                </TableRow>
              ) : leaveRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    You have not submitted any leave requests.
                  </TableCell>
                </TableRow>
              ) : (
                leaveRequests.slice(myLeavePage * ROWS_PER_PAGE, (myLeavePage + 1) * ROWS_PER_PAGE).map((request) => (
                  <TableRow key={request.leave_request_id}>
                    <TableCell>{request.leave_request_id}</TableCell>
                    <TableCell>{request.leave_type}</TableCell>
                    <TableCell>{request.start_date}</TableCell>
                    <TableCell>{request.end_date}</TableCell>

                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: 12,
                          fontWeight: 700,
                          color:
                            request.status === "APPROVED"
                              ? "#15803d"
                              : request.status === "REJECTED"
                                ? "#b91c1c"
                                : "#b45309",
                        }}
                      >
                        {request.status}
                      </Typography>
                    </TableCell>

                    <TableCell
                      sx={{
                        maxWidth: 300,
                        whiteSpace: "pre-wrap",
                        overflowWrap: "anywhere",
                      }}
                    >
                      {request.reason}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {Math.ceil(leaveRequests.length / ROWS_PER_PAGE) > 1 && (
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 1, px: 2, py: 1, borderTop: "1px solid #e5e7eb" }}>
            <Typography sx={{ fontSize: 12, color: "#6A7585" }}>
              {myLeavePage * ROWS_PER_PAGE + 1}–{Math.min((myLeavePage + 1) * ROWS_PER_PAGE, leaveRequests.length)} of {leaveRequests.length}
            </Typography>
            <Button size="small" disabled={myLeavePage === 0} onClick={() => setMyLeavePage((p) => p - 1)} sx={{ minWidth: 28, height: 28, p: 0, fontSize: 16 }}>‹</Button>
            <Button size="small" disabled={myLeavePage >= Math.ceil(leaveRequests.length / ROWS_PER_PAGE) - 1} onClick={() => setMyLeavePage((p) => p + 1)} sx={{ minWidth: 28, height: 28, p: 0, fontSize: 16 }}>›</Button>
          </Box>
        )}
      </Paper>
      <Dialog
      
            open={leaveOpen}
            onClose={() => {
                if (!leaveSaving) {
                  setLeaveOpen(false);
                  setLeaveErrors({ leaveType: false, startDate: false, endDate: false, dateRange: false, reason: false });
                }
              }}
            fullWidth
            maxWidth="sm"
            aria-labelledby="leave-dialog-title"
          >
            <DialogTitle id="leave-dialog-title">
              Apply for leave
            </DialogTitle>

            <DialogContent dividers>
              <Box sx={{ display: "grid", gap: 2 }}>

                {/* Leave type */}
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                  <Typography component="label" sx={{ fontSize: 12.5, fontWeight: 600, color: "#374151" }}>
                    Leave type <Box component="span" sx={{ color: "#d32f2f" }}>*</Box>
                  </Typography>
                  <TextField
                    select
                    name="leaveType"
                    value={leaveForm.leaveType}
                    onChange={(e) => {
                      handleLeaveChange(e);
                      setLeaveErrors((prev) => ({ ...prev, leaveType: false }));
                    }}
                    fullWidth
                    size="small"
                    error={leaveErrors.leaveType}
                    helperText={leaveErrors.leaveType ? "Leave type is required." : ""}
                  >
                    <MenuItem value="planned_leave">Planned Leave</MenuItem>
                    <MenuItem value="sick_leave">Sick Leave</MenuItem>
                  </TextField>
                </Box>

                {/* Start date */}
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                  <Typography component="label" sx={{ fontSize: 12.5, fontWeight: 600, color: "#374151" }}>
                    Start date <Box component="span" sx={{ color: "#d32f2f" }}>*</Box>
                  </Typography>
                  <TextField
                    type="date"
                    name="startDate"
                    value={leaveForm.startDate}
                    onChange={(e) => {
                      handleLeaveChange(e);
                      setLeaveErrors((prev) => ({ ...prev, startDate: false, dateRange: false }));
                    }}
                    fullWidth
                    size="small"
                    error={leaveErrors.startDate}
                    helperText={leaveErrors.startDate ? "Start date is required." : ""}
                  />
                </Box>

                {/* End date */}
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                  <Typography component="label" sx={{ fontSize: 12.5, fontWeight: 600, color: "#374151" }}>
                    End date <Box component="span" sx={{ color: "#d32f2f" }}>*</Box>
                  </Typography>
                  <TextField
                    type="date"
                    name="endDate"
                    value={leaveForm.endDate}
                    onChange={(e) => {
                      handleLeaveChange(e);
                      setLeaveErrors((prev) => ({ ...prev, endDate: false, dateRange: false }));
                    }}
                    fullWidth
                    size="small"
                    error={leaveErrors.endDate || leaveErrors.dateRange}
                    helperText={
                      leaveErrors.endDate
                        ? "End date is required."
                        : leaveErrors.dateRange
                        ? "End date cannot be before start date."
                        : ""
                    }
                  />
                </Box>

                {/* Reason */}
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                  <Typography component="label" sx={{ fontSize: 12.5, fontWeight: 600, color: "#374151" }}>
                    Reason <Box component="span" sx={{ color: "#d32f2f" }}>*</Box>
                  </Typography>
                  <TextField
                    name="reason"
                    value={leaveForm.reason}
                    onChange={(e) => {
                      handleLeaveChange(e);
                      setLeaveErrors((prev) => ({ ...prev, reason: false }));
                    }}
                    multiline
                    rows={3}
                    slotProps={{ htmlInput: { maxLength: 500 } }}
                    fullWidth
                    error={leaveErrors.reason}
                    helperText={leaveErrors.reason ? "Reason is required." : ""}
                  />
                </Box>

              </Box>
            </DialogContent>

            <DialogActions>
              <Button
                  type="button"
                  disabled={leaveSaving}
                  onClick={() => {
                    setLeaveOpen(false);
                    setLeaveErrors({ leaveType: false, startDate: false, endDate: false, dateRange: false, reason: false });
                  }}
                >
                  Cancel
                </Button>

              <Button
                  type="button"
                  variant="contained"
                  onClick={handleSubmitLeave}
                  disabled={leaveSaving}
                >
                  {leaveSaving ? "Submitting..." : "Submit request"}
                </Button>
            </DialogActions>
          </Dialog>

    </Box>
  );
}