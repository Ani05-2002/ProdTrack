import { useEffect, useState } from "react";
import apiRequest from "../lib/api.js";
import { useToast } from "../components/ToastProvider.jsx";
import { useConfirm } from "../components/ConfirmDialog.jsx";
import {
  Box,
  Typography,
  Button,
  Card,
  Chip,
  Avatar,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  IconButton,
  Divider,
  CircularProgress,
} from "@mui/material";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import PendingActionsRoundedIcon from "@mui/icons-material/PendingActionsRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CancelRoundedIcon from "@mui/icons-material/CancelRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import CorePageShell, {
  CoreMetricCards,
  CoreTable,
} from "../components/CorePageShell.jsx";

const FONT =
  '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';


const correctionStatusStyles = {
  PENDING: {
    backgroundColor: "#fff4db",
    color: "#c27a12",
    border: "1px solid #f2d39b",
  },
  APPROVED: {
    backgroundColor: "#e4f6ee",
    color: "#177a53",
    border: "1px solid #b7e3cc",
  },
  REJECTED: {
    backgroundColor: "#fde8e8",
    color: "#b42318",
    border: "1px solid #f5c4c4",
  },
};

function IndexerCorrectionRequestsIndexer({ user, onNavigate, }) {
  const toast = useToast();
  const [requestsIndexer, setRequestsIndexer] = useState([]);
  const [indexerPage, setIndexerPage] = useState(0);
  const INDEXER_ROWS_PER_PAGE = 10;

  const userName = user?.name || "Indexer";

  const userInitials = userName
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const loadMyCorrectionRequests = async () => {
    try {
      const data = await apiRequest(
        "/indexer/corrections/my"
      );

      const formattedRequests = (
        data.requests || []
      ).map((request) => ({
        id: request.request_id || request.id,
        project: request.project_name,
        date: request.production_date,
        field: request.field_name,
        change:
          `${request.old_value ?? "—"} → ` +
          `${request.new_value ?? "—"}`,
        status: String(
          request.status || "pending"
        ).toUpperCase(),
      }));

      setRequestsIndexer(formattedRequests);
    } catch (error) {
      console.error(
        "Load Indexer corrections error:",
        error
      );
      toast.error(error.message);
    }
  };

  useEffect(() => {
    loadMyCorrectionRequests();
  }, []);

  return (
    <Box
      sx={{
        width: "100%",
      }}
    >
      {/* =================================================
          HEADER
       ================================================= */}

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          mb: 2.2,
          gap: 2,
        }}
      >
        <Box>
          <Typography
            sx={{
              color: "#6A7585",
              fontSize: 12.5,
              mb: 0.7,
            }}
          >
            ProdTrack · Indexer
          </Typography>

          <Typography
            sx={{
              fontSize: 18,
              fontWeight: 800,
              color: "#1A2434",
            }}
          >
            My correction requests
          </Typography>

          <Typography
            sx={{
              mt: 0.7,
              color: "#6A7585",
              fontSize: 13.5,
            }}
          >
            Request changes to locked entries. Each request is reviewed before
            the audit log updates.
          </Typography>
        </Box>
      </Box>

      {/* =================================================
          WORKFLOW
       ================================================= */}

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.8,
          mb: 2.2,
          flexWrap: "wrap",
        }}
      >
        {[
          "Indexer submits",
          "Lead / Core review",
          "Approve / Reject",
          "Audit log update",
        ].map((item, index) => (
          <Box
            key={item}
            sx={{
              display: "flex",
              alignItems: "center",
            }}
          >
            <Box
              sx={{
                px: 1.6,
                py: 1,
                borderRadius: "8px",
                border: "1px solid #d7e0eb",
                backgroundColor: index === 0 ? "#2f6df6" : "#fff",
                color: index === 0 ? "#fff" : "#1A2434",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {item}
            </Box>

            {index !== 3 && (
              <ArrowForwardRoundedIcon
                sx={{
                  mx: 0.4,
                  color: "#6A7585",
                  fontSize: 17,
                }}
              />
            )}
          </Box>
        ))}
      </Box>

      {/* =================================================
          REQUEST TABLE
       ================================================= */}

      <Card
        elevation={0}
        sx={{
          border: "1px solid #dce3ec",
          borderRadius: "10px",
          boxShadow: "0 4px 12px rgba(15,23,42,.05)",
          overflow: "hidden",
          backgroundColor: "#fff",
        }}
      >
        {/* ================= TABLE HEADER ================= */}

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1.5fr .75fr 1fr 2fr 1.35fr .8fr",
            px: 1.6,
            py: 1.2,
            backgroundColor: "#f8fafc",
            borderBottom: "1px solid #dce3ec",
            columnGap: 1,
          }}
        >
          {[
            "PROJECT",
            "PROD. DATE",
            "FIELD",
            "OLD → NEW",
            "REQUESTED BY",
            "STATUS",
          ].map((header) => (
            <Typography
              key={header}
              sx={{
                fontSize: 11,
                fontWeight: 800,
                color: "#6A7585",
              }}
            >
              {header}
            </Typography>
          ))}
        </Box>

        {/* ================= TABLE ROWS ================= */}

        {requestsIndexer.slice(indexerPage * INDEXER_ROWS_PER_PAGE, (indexerPage + 1) * INDEXER_ROWS_PER_PAGE).map((request, index) => (
          <Box
            key={request.id}
            sx={{
              display: "grid",
              gridTemplateColumns: "1.5fr .75fr 1fr 2fr 1.35fr .8fr",
              px: 1.6,
              py: 1.4,
              columnGap: 1,
              alignItems: "center",
              borderBottom:
                index !== requestsIndexer.length - 1
                  ? "1px solid #e6ebf1"
                  : "none",
            }}
          >
            {/* PROJECT */}

            <Typography
              sx={{
                fontSize: 12,
                color: "#1A2434",
              }}
            >
              {request.project}
            </Typography>

            {/* DATE */}

            <Typography
              sx={{
                fontSize: 13,
                color: "#1A2434",
              }}
            >
              {request.date}
            </Typography>

            {/* FIELD */}

            <Typography
              sx={{
                fontSize: 13,
                color: "#1A2434",
              }}
            >
              {request.field}
            </Typography>

            {/* OLD → NEW */}

            <Typography
              sx={{
                fontSize: 13,
                color: "#6A7585",
              }}
            >
              {request.change}
            </Typography>

            {/* REQUESTED BY */}

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.8,
              }}
            >
              <Avatar
                sx={{
                  width: 24,
                  height: 24,
                  fontSize: 10,
                  fontWeight: 700,
                  backgroundColor: "#6366df",
                }}
              >
                {userInitials}
              </Avatar>

              <Typography
                sx={{
                  fontSize: 12,
                  color: "#1A2434",
                }}
              >
                {userName}
              </Typography>
            </Box>

            {/* STATUS */}

            <Chip
              label={request.status}
              size="small"
              sx={{
                width: "fit-content",
                height: 22,
                ...correctionStatusStyles[request.status],
                fontSize: 9,
                fontWeight: 800,
              }}
            />
          </Box>
        ))}
      </Card>
      {Math.ceil(requestsIndexer.length / INDEXER_ROWS_PER_PAGE) > 1 && (
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 1, px: 2, py: 1, border: "1px solid #dce3ec", borderTop: "none", borderRadius: "0 0 10px 10px", bgcolor: "#fff" }}>
          <Typography sx={{ fontSize: 12, color: "#6A7585" }}>
            {indexerPage * INDEXER_ROWS_PER_PAGE + 1}–{Math.min((indexerPage + 1) * INDEXER_ROWS_PER_PAGE, requestsIndexer.length)} of {requestsIndexer.length}
          </Typography>
          <Button size="small" disabled={indexerPage === 0} onClick={() => setIndexerPage((p) => p - 1)} sx={{ minWidth: 28, height: 28, p: 0, fontSize: 16, color: "#6A7585" }}>‹</Button>
          <Button size="small" disabled={indexerPage >= Math.ceil(requestsIndexer.length / INDEXER_ROWS_PER_PAGE) - 1} onClick={() => setIndexerPage((p) => p + 1)} sx={{ minWidth: 28, height: 28, p: 0, fontSize: 16, color: "#6A7585" }}>›</Button>
        </Box>
      )}

    </Box>
  );
}
const initialTeamLead = [
  ["ABC Medical Imaging", "18 Aug 2026", "Priya Sharma", "312", "Pending"],
  ["Ortho Kids", "18 Aug 2026", "Aditya Rao", "281", "Pending"],
  ["Spine Indexing", "17 Aug 2026", "Sneha Iyer", "214", "Approved"],
];
function ApprovalsTeamLead() {
  const [rows, setRows] = useState(initialTeamLead);
  const update = (i, status) =>
    setRows((r) => r.map((x, n) => (n === i ? [...x.slice(0, 4), status] : x)));
  return (
    <Box>
      <Typography
        sx={{
          color: "#6A7585",
          fontSize: 12.5,
        }}
      >
        ProdTrack · Team Lead
      </Typography>
      <Typography
        sx={{
          fontSize: 18,
          fontWeight: 800,
        }}
      >
        Approvals
      </Typography>
      <Typography
        sx={{
          color: "#6A7585",
          fontSize: 13.5,
          mt: 0.4,
          mb: 2,
        }}
      >
        Review team entries and correction requests before final submission.
      </Typography>
      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          border: "1px solid #dbe3ec",
          borderRadius: 2,
        }}
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              {[
                "PROJECT",
                "DATE",
                "EMPLOYEE",
                "COMPLETED",
                "STATUS",
                "ACTION",
              ].map((h) => (
                <TableCell
                  key={h}
                  sx={{
                    fontWeight: 800,
                    fontSize: 11,
                  }}
                >
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={r[0] + r[2]}>
                {r.slice(0, 4).map((c, j) => (
                  <TableCell key={j}>{c}</TableCell>
                ))}
                <TableCell>
                  <Chip
                    size="small"
                    label={r[4]}
                    color={r[4] === "Approved" ? "success" : "warning"}
                  />
                </TableCell>
                <TableCell>
                  {r[4] === "Pending" && (
                    <>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => update(i, "Approved")}
                      >
                        Approve
                      </Button>
                      <Button
                        size="small"
                        sx={{
                          ml: 0.5,
                        }}
                        onClick={() => update(i, "Rejected")}
                      >
                        Reject
                      </Button>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
const rowsCoreTeam = [
  [
    "ABC Medical Imaging",
    "19 May",
    "Implant Name",
    "ABC Screw 5.0 → ABC Screw 5.5",
    "Priya Sharma",
    "PENDING",
  ],
  [
    "Ortho Kids",
    "18 May",
    "Lot Number",
    "LT-441 → LT-4471",
    "Aditya Rao",
    "PENDING",
  ],
  [
    "Spine Indexing",
    "17 May",
    "Page Type",
    "Op → OP Note",
    "Sneha Iyer",
    "APPROVED",
  ],
  [
    "Cardio Records",
    "16 May",
    "Manufacturer",
    "ABC → ABC Medical",
    "Divya Menon",
    "REJECTED",
  ],
];
function CorrectionsCoreTeam({
  roleKey,
  roleLabel = "Team Lead",
}) {
  const toast = useToast();
  const { confirm, ConfirmElement } = useConfirm();
  const [rows, setRows] = useState([]);
  const [correctionHistory, setCorrectionHistory] = useState([]);
  // Tracks the current page of correction history.
  const [historyPage, setHistoryPage] = useState(0);

  // Displays five history records per page.
  const HISTORY_ROWS_PER_PAGE = 5;
  // Stores the daily correction approval statistics.
  const [approvalSummary, setApprovalSummary] = useState({
    awaitingReview: 0,
    approvedToday: 0,
    rejectedToday: 0,
    averageTurnaroundHours: 0,
  });
  const [correctionPage, setCorrectionPage] = useState(0);
  const CORRECTION_ROWS_PER_PAGE = 10;

  useEffect(() => {
    const loadPendingRequests = async () => {
      if (
        ![
          "teamLead",
          "coreTeam",
          "administrator",
        ].includes(roleKey)
      ) {
        return;
      }
      try {
        const data = await apiRequest("/team-lead/approvals");

        // Maps correction requests, including their reporting categories.
        const backendRows = (data.requests || []).map((request) => [
          request.project_name,
          request.reporting_category || "—",
          request.production_date,
          request.field_name,
          `${request.old_value ?? "—"} → ${request.new_value ?? "—"}`,
          request.employee_name,
          String(request.status || "pending").toUpperCase(),
          request.request_id || request.id,
        ]);

        setRows(backendRows);
      } catch (error) {
        console.error("Load correction approvals error:", error);
        toast.error(error.message);
      }
    };

    loadPendingRequests();
  }, [roleKey]);

  // Loads the latest five approved or rejected correction requests.
  const loadCorrectionHistory = async () => {
    try {
      // Fetches correction history from the backend.
      const data = await apiRequest("/team-lead/approvals/history");

      // Saves the latest five records in component state.
      setCorrectionHistory(data.requests || []);
    } catch (error) {
      // Logs errors without interrupting the existing approvals page.
      console.error("Load correction history error:", error);
      toast.error(error.message);
    }
  };

  const loadApprovalSummary = async () => {
    if (
      ![
        "teamLead",
        "coreTeam",
        "administrator",
      ].includes(roleKey)
    ) {
      return;
    }
    try {
      const data = await apiRequest(
        "/team-lead/approvals/summary"
      );

      setApprovalSummary(data.summary);
    } catch (error) {
      console.error("Load approval summary error:", error);
    }
  };

  useEffect(() => {
    loadApprovalSummary();
    loadCorrectionHistory();
  }, [roleKey]);

  const updateStatus = async (rowIndex, newStatus) => {
    const requestId = rows[rowIndex]?.[7];

    if (!requestId) {
      toast.warning("Correction request ID is missing");
      return;
    }

    const isDanger = newStatus === "REJECTED";
    const confirmed = await confirm({
      title: newStatus === "APPROVED" ? "Approve correction?" : "Reject correction?",
      // Displays the correct employee name in the confirmation dialog.
      message: `${newStatus === "APPROVED" ? "Approve" : "Reject"} the correction request from ${rows[rowIndex]?.[5] || "this employee"}?`,
      confirmLabel: newStatus === "APPROVED" ? "Approve" : "Reject",
      danger: isDanger,
    });

    if (!confirmed) return;

    const action =
      newStatus === "APPROVED"
        ? "approve"
        : "reject";

    try {
      const data = await apiRequest(
        `/team-lead/approvals/${requestId}/${action}`,
        {
          method: "POST",
          body: JSON.stringify({
            reviewComment:
              newStatus === "APPROVED"
                ? "Approved from Team Lead approvals page"
                : "Rejected from Team Lead approvals page",
          }),
        }
      );

      // Updates the status without changing the reporting category or request ID.
      setRows((currentRows) =>
        currentRows.map((row, index) =>
          index === rowIndex
            ? [...row.slice(0, 6), newStatus, row[7]]
            : row
        )
      );

      toast.success(data.message);
      await loadApprovalSummary();
      await loadCorrectionHistory();
    } catch (error) {
      console.error("Update correction status error:", error);
      toast.error(error.message);
    }
  };

  const workflowSteps = [
    "Indexer submits",
    "Lead / Core review",
    "Approve / Reject",
    "Audit log update",
  ];

  const metrics = [
    {
      icon: <PendingActionsRoundedIcon />,
      label: "Awaiting review",
      value: approvalSummary.awaitingReview,
      background: "#fff3dc",
      iconColor: "#a66b00",
    },
    {
      icon: <CheckCircleRoundedIcon />,
      label: "Approved (today)",
      value: approvalSummary.approvedToday,
      background: "#e2f6ec",
      iconColor: "#087a4d",
    },
    {
      icon: <CancelRoundedIcon />,
      label: "Rejected (today)",
      value: approvalSummary.rejectedToday,
      background: "#fde8e8",
      iconColor: "#b42318",
    },
    {
      icon: <AccessTimeRoundedIcon />,
      label: "Avg. turnaround (today)",
      value: `${approvalSummary.averageTurnaroundHours}h`,
      background: "#eaf1ff",
      iconColor: "#2f6df6",
    },
  ];

  const statusColors = {
    PENDING: {
      backgroundColor: "#fff3dc",
      color: "#a66b00",
      border: "1px solid #efd499",
    },
    APPROVED: {
      backgroundColor: "#e2f6ec",
      color: "#087a4d",
      border: "1px solid #b9e5d0",
    },
    REJECTED: {
      backgroundColor: "#fde8e8",
      color: "#b42318",
      border: "1px solid #f5c4c4",
    },
  };

  return (
    <>
      <CorePageShell
        breadcrumb={roleLabel}
        title="Correction requests"
        description="Review and approve/reject correction requests raised on locked entries."
        actionLabel={null}
      >
        {/* WORKFLOW */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 1,
            mb: 2.5,
          }}
        >
          {workflowSteps.map((step, index) => (
            <Box
              key={step}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <Box
                sx={{
                  px: 2.2,
                  py: 1.4,
                  borderRadius: "11px",
                  border: "1px solid #dbe3ec",
                  backgroundColor: index === 1 ? "#3478ed" : "#ffffff",
                  color: index === 1 ? "#ffffff" : "#1A2434",
                  fontSize: 13,
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                }}
              >
                {step}
              </Box>

              {index < workflowSteps.length - 1 && (
                <Typography
                  sx={{
                    color: "#6A7585",
                    fontSize: 18,
                  }}
                >
                  →
                </Typography>
              )}
            </Box>
          ))}
        </Box>

        {/* METRIC CARDS */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, 1fr)",
              lg: "repeat(4, 1fr)",
            },
            gap: 2,
            mb: 2.5,
          }}
        >
          {metrics.map((metric) => (
            <Paper
              key={metric.label}
              elevation={0}
              sx={{
                minHeight: 98,
                p: 2,
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                border: "1px solid #dbe3ec",
                borderRadius: "12px",
                boxShadow: "0 2px 5px rgba(16,35,61,.08)",
              }}
            >
              <Box
                sx={{
                  width: 46,
                  height: 46,
                  flexShrink: 0,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: "12px",
                  backgroundColor: metric.background,
                  color: metric.iconColor,
                }}
              >
                {metric.icon}
              </Box>

              <Box>
                <Typography
                  sx={{
                    color: "#6A7585",
                    fontSize: 12.5,
                  }}
                >
                  {metric.label}
                </Typography>

                <Typography
                  sx={{
                    color: "#1A2434",
                    fontSize: 25,
                    fontWeight: 800,
                    lineHeight: 1.2,
                  }}
                >
                  {metric.value}
                </Typography>
              </Box>
            </Paper>
          ))}
        </Box>

        {/* CORRECTION TABLE */}
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{
            border: "1px solid #dbe3ec",
            borderRadius: "12px",
            overflowX: "auto",
          }}
        >
          <Table size="small" sx={{ minWidth: 1050 }}>
            <TableHead>
              <TableRow sx={{ backgroundColor: "#f8fafc" }}>
                {[
                  "PROJECT",
                  "REPORTING CATEGORY",
                  "PROD. DATE",
                  "FIELD",
                  "OLD → NEW",
                  "REQUESTED BY",
                  "STATUS",
                  "ACTION",
                ].map((heading) => (
                  <TableCell
                    key={heading}
                    sx={{
                      py: 1.5,
                      color: "#6A7585",
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    {heading}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {rows.slice(correctionPage * CORRECTION_ROWS_PER_PAGE, (correctionPage + 1) * CORRECTION_ROWS_PER_PAGE).map((row, rowIndex) => {
                const globalIndex = correctionPage * CORRECTION_ROWS_PER_PAGE + rowIndex;
                return (
                  <TableRow key={row[7] || `${row[0]}-${rowIndex}`} hover>

                    {/* Project name */}
                    <TableCell>{row[0]}</TableCell>

                    {/* Reporting category */}
                    <TableCell>{row[1]}</TableCell>

                    {/* Production date */}
                    <TableCell>{row[2]}</TableCell>

                    {/* Correction field */}
                    <TableCell>
                      {row[3] === "docs_completed"
                        ? "Documents Completed"
                        : row[3] === "batches_processed"
                          ? "Batches Processed"
                          : row[3]}
                    </TableCell>

                    {/* Old and new values */}
                    <TableCell sx={{ color: "#6A7585" }}>
                      {row[4]}
                    </TableCell>

                    {/* Employee who requested the correction */}
                    <TableCell>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          whiteSpace: "nowrap",
                        }}
                      >
                        <Avatar
                          sx={{
                            width: 32,
                            height: 32,
                            bgcolor: "#5b5ce2",
                            color: "#ffffff",
                            fontSize: 11,
                            fontWeight: 800,
                          }}
                        >
                          {String(row[5] || "")
                            .split(" ")
                            .filter(Boolean)
                            .map((name) => name[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </Avatar>

                        <Typography
                          sx={{
                            fontSize: 13,
                            color: "#1A2434",
                          }}
                        >
                          {row[5]}
                        </Typography>
                      </Box>
                    </TableCell>

                    {/* Correction status */}
                    <TableCell>
                      <Chip
                        label={row[6]}
                        size="small"
                        sx={{
                          ...statusColors[row[6]],
                          height: 25,
                          fontSize: 10,
                          fontWeight: 800,
                        }}
                      />
                    </TableCell>

                    {/* Approve and Reject actions */}
                    <TableCell>
                      {row[6] === "PENDING" && (
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.7,
                          }}
                        >
                          {/* Approve button */}
                          <Button
                            variant="contained"
                            size="small"
                            onClick={() => updateStatus(globalIndex, "APPROVED")}
                            sx={{
                              minWidth: 84,
                              height: 38,
                              borderRadius: "10px",
                              textTransform: "none",
                              fontWeight: 700,
                              boxShadow: "none",
                            }}
                          >
                            Approve
                          </Button>

                          {/* Reject button */}
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => updateStatus(globalIndex, "REJECTED")}
                            sx={{
                              minWidth: 70,
                              height: 38,
                              borderRadius: "10px",
                              textTransform: "none",
                              color: "#17233a",
                              borderColor: "#dbe3ec",
                              fontWeight: 500,
                            }}
                          >
                            Reject
                          </Button>
                        </Box>
                      )}
                    </TableCell>

                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        {Math.ceil(rows.length / CORRECTION_ROWS_PER_PAGE) > 1 && (
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 1, px: 2, py: 1, borderTop: "1px solid #dbe3ec" }}>
            <Typography sx={{ fontSize: 12, color: "#6A7585" }}>
              {correctionPage * CORRECTION_ROWS_PER_PAGE + 1}–{Math.min((correctionPage + 1) * CORRECTION_ROWS_PER_PAGE, rows.length)} of {rows.length}
            </Typography>
            <Button size="small" disabled={correctionPage === 0} onClick={() => setCorrectionPage((p) => p - 1)} sx={{ minWidth: 28, height: 28, p: 0, fontSize: 16, color: "#6A7585" }}>‹</Button>
            <Button size="small" disabled={correctionPage >= Math.ceil(rows.length / CORRECTION_ROWS_PER_PAGE) - 1} onClick={() => setCorrectionPage((p) => p + 1)} sx={{ minWidth: 28, height: 28, p: 0, fontSize: 16, color: "#6A7585" }}>›</Button>
          </Box>
        )}
        {/* Displays the five most recently reviewed correction requests. */}
        <Box sx={{ mt: 3 }}>
          {/* History section heading. */}
          <Typography
            sx={{
              fontSize: 17,
              fontWeight: 800,
              color: "#1A2434",
              mb: 0.5,
            }}
          >
            Recent Correction History
          </Typography>

          {/* Explains which records appear in the history. */}
          <Typography
            sx={{
              fontSize: 12.5,
              color: "#6A7585",
              mb: 2,
            }}
          >
            Latest 5 approved or rejected correction requests.
          </Typography>

          {/* History table container. */}
          <TableContainer
            component={Paper}
            elevation={0}
            sx={{
              border: "1px solid #dbe3ec",
              borderRadius: "12px",
              overflowX: "auto",
            }}
          >
            <Table size="small" sx={{ minWidth: 1150 }}>
              {/* History table headings. */}
              <TableHead>
                <TableRow sx={{ backgroundColor: "#f8fafc" }}>
                  {[
                    "PROJECT",
                    "REPORTING CATEGORY", // Displays the reporting category column.
                    "PROD. DATE",
                    "FIELD",
                    "OLD → NEW",
                    "REQUESTED BY",
                    "STATUS",
                    "REVIEWED AT",
                  ].map((heading) => (
                    <TableCell
                      key={heading}
                      sx={{
                        py: 1.5,
                        color: "#6A7585",
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      {heading}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>

              {/* History table records. */}
              <TableBody>
                {/* Displays only the correction history records for the current page. */}
                {correctionHistory
                  .slice(
                    historyPage * HISTORY_ROWS_PER_PAGE,
                    (historyPage + 1) * HISTORY_ROWS_PER_PAGE
                  )
                  .map((request) => (
                    <TableRow key={request.request_id} hover>
                      {/* Project name. */}
                      <TableCell>{request.project_name}</TableCell>

                      <TableCell>{request.reporting_category || "—"}</TableCell>

                      {/* Production date. */}
                      <TableCell>{request.production_date}</TableCell>

                      {/* Human-readable corrected field. */}
                      <TableCell>
                        {request.field_name === "docs_completed"
                          ? "Documents Completed"
                          : request.field_name === "batches_processed"
                            ? "Batches Processed"
                            : request.field_name}
                      </TableCell>

                      {/* Original and requested values. */}
                      <TableCell sx={{ color: "#6A7585" }}>
                        {request.old_value ?? "—"} → {request.new_value ?? "—"}
                      </TableCell>

                      {/* Employee who requested the correction. */}
                      <TableCell>{request.employee_name}</TableCell>

                      {/* Approved or rejected status. */}
                      <TableCell>
                        <Chip
                          label={request.status}
                          size="small"
                          sx={{
                            ...correctionStatusStyles[request.status],
                            height: 25,
                            fontSize: 10,
                            fontWeight: 800,
                          }}
                        />
                      </TableCell>

                      {/* Date and time of the review. */}
                      <TableCell>{request.reviewed_at || "—"}</TableCell>
                    </TableRow>
                  ))}

                {/* Displays a message when no reviewed corrections exist. */}
                {correctionHistory.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      align="center"
                      sx={{ py: 4, color: "#6A7585" }}
                    >
                      No approved or rejected correction requests found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination controls for Recent Correction History. */}
          {correctionHistory.length > 0 && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: 1,
                px: 2,
                py: 1,
                border: "1px solid #dbe3ec",
                borderTop: "none",
                borderRadius: "0 0 12px 12px",
                backgroundColor: "#fff",
              }}
            >
              {/* Displays the current range and total history records. */}
              <Typography sx={{ fontSize: 12, color: "#6A7585" }}>
                {historyPage * HISTORY_ROWS_PER_PAGE + 1}–
                {Math.min(
                  (historyPage + 1) * HISTORY_ROWS_PER_PAGE,
                  correctionHistory.length
                )}{" "}
                of {correctionHistory.length}
              </Typography>

              {/* Previous page button. */}
              <Button
                size="small"
                disabled={historyPage === 0}
                onClick={() => setHistoryPage((page) => page - 1)}
                sx={{
                  minWidth: 28,
                  height: 28,
                  p: 0,
                  fontSize: 16,
                  color: "#6A7585",
                }}
              >
                ‹
              </Button>

              {/* Next page button. */}
              <Button
                size="small"
                disabled={
                  historyPage >=
                  Math.ceil(correctionHistory.length / HISTORY_ROWS_PER_PAGE) - 1
                }
                onClick={() => setHistoryPage((page) => page + 1)}
                sx={{
                  minWidth: 28,
                  height: 28,
                  p: 0,
                  fontSize: 16,
                  color: "#6A7585",
                }}
              >
                ›
              </Button>
            </Box>
          )}

        </Box>

      </CorePageShell>
      {ConfirmElement}
    </>
  );
}
const rowsAdministrator = [
  [
    "ABC-2024-0511",
    "Priya Sharma",
    "Implant Name",
    "Typo in device label",
    "20 May 09:12",
    "PENDING",
  ],
  [
    "ORT-2024-0320",
    "Aditya Rao",
    "Procedure Code",
    "Wrong CPT code entered",
    "19 May 14:35",
    "PENDING",
  ],
  [
    "SPI-2024-0198",
    "Karan Patel",
    "Patient DOB",
    "Date format mismatch",
    "18 May 11:00",
    "PENDING",
  ],
  [
    "ABC-2024-0489",
    "Priya Sharma",
    "Surgeon Name",
    "Spelling correction",
    "17 May 16:20",
    "APPROVED",
  ],
  [
    "CAR-2024-0077",
    "Sneha Iyer",
    "Report Date",
    "Incorrect month",
    "16 May 08:55",
    "REJECTED",
  ],
];
function CorrectionsAdministrator() {
  const [notice, setNotice] = useState("");
  function handleAction(row) {
    setNotice(`Correction for ${row[0]} updated`);
  }
  return (
    <>
      <CorePageShell
        breadcrumb="Administrator"
        title="Corrections"
        description="Manage correction approval workflow and audit status."
        actionLabel={null}
      >
        {/* ── FILTER TABS ── */}
        <Box
          sx={{
            display: "flex",
            gap: 1,
            mb: 2,
            flexWrap: "wrap",
          }}
        >
          {["All", "Pending", "Approved", "Rejected"].map((tab) => (
            <Chip
              key={tab}
              label={tab}
              clickable
              variant={tab === "All" ? "filled" : "outlined"}
              color={tab === "All" ? "primary" : "default"}
              size="small"
              sx={{
                fontWeight: 600,
                fontSize: 11,
              }}
            />
          ))}
        </Box>

        <Box
          sx={{
            width: "100%",
            overflowX: "auto",
          }}
        >
          <CoreTable
            columns={[
              "ENTRY ID",
              "EMPLOYEE",
              "FIELD",
              "REASON",
              "SUBMITTED",
              "STATUS",
            ]}
            rows={rowsAdministrator}
            actionLabel="Review"
            actionVariant="text"
            onAction={handleAction}
          />
        </Box>
      </CorePageShell>

      <Snackbar
        open={Boolean(notice)}
        autoHideDuration={2500}
        onClose={() => setNotice("")}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={() => setNotice("")}
        >
          {notice}
        </Alert>
      </Snackbar>
    </>
  );
}
void ApprovalsTeamLead;
void CorrectionsAdministrator;
export default function CorrectionApprovals(props) {
  switch (props.roleKey) {
    case "indexer":
      return <IndexerCorrectionRequestsIndexer {...props} />;
    case "teamLead":
      return <CorrectionsCoreTeam roleKey={props.roleKey}
        roleLabel={props.roleLabel}{...props} />;
    case "coreTeam":
      return <CorrectionsCoreTeam roleKey={props.roleKey}
        roleLabel={props.roleLabel}{...props} />;
    case "administrator":
      return <CorrectionsCoreTeam roleKey={props.roleKey}
        roleLabel={props.roleLabel}{...props} />;
    default:
      return <IndexerCorrectionRequestsIndexer {...props} />;
  }
}
