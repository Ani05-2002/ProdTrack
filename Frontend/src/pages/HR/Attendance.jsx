import { useCallback, useEffect, useState } from "react";

// Import ProdTrack's existing authenticated API helper.
import apiRequest from "../../lib/api.js";

// Import Material UI components.
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TablePagination from "@mui/material/TablePagination";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
// Import the application's reusable confirmation dialog.
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";

// Number of leave requests displayed per page.
const ROWS_PER_PAGE = 10;

// Define leave request tabs.
const LEAVE_TABS = [
    { label: "Pending", status: "PENDING" },
    { label: "Approved", status: "APPROVED" },
    { label: "Rejected", status: "REJECTED" },
];

// Define consistent table cell styling.
const tableCellStyle = {
    fontSize: 13,
    color: "#1A2434",
    py: 1.5,
};

// HR Attendance component.
export default function Attendance() {
    // Store pending leave requests.
    const [requests, setRequests] = useState([]);

    // Store approved and rejected leave history.
    const [reviewedRequests, setReviewedRequests] = useState([]);

    // Track the currently selected tab.
    const [activeTab, setActiveTab] = useState(0);

    // Track table pagination.
    const [page, setPage] = useState(0);

    // Track loading states.
    const [loading, setLoading] = useState(true);
    const [historyLoading, setHistoryLoading] = useState(false);

    // Track the request currently being approved or rejected.
    const [processingId, setProcessingId] = useState(null);

    // Store error messages.
    const [error, setError] = useState("");
    const [historyError, setHistoryError] = useState("");

    // Store successful action messages.
    const [message, setMessage] = useState("");
    // Store the selected action for the application's confirmation dialog.
    const [decisionDialog, setDecisionDialog] = useState(null);

    // Store the optional review comment entered by HR.
    const [reviewComment, setReviewComment] = useState("");

    // =====================================================
    // LOAD PENDING LEAVE REQUESTS
    // =====================================================

    // Load pending requests, optionally without showing the loading indicator.
    const loadRequests = useCallback(async (showLoader = true) => {
        // Show the loading state for initial and manual refreshes.
        if (showLoader) {
            setLoading(true);
        }

        // Clear the previous API error.
        setError("");

        try {
            // Fetch the latest pending leave requests from the backend.
            // Fetch pending requests from the HR API.
            const data = await apiRequest("/hr/leave-requests");

            // Store the returned pending leave requests.
            setRequests(data.requests || []);
        } catch (err) {
            // Show the error if fetching pending requests fails.
            setError(
                err.message || "Failed to load pending leave requests"
            );
        } finally {
            // Hide the loading indicator when this call enabled it.
            if (showLoader) {
                setLoading(false);
            }
        }
    }, []);

    // =====================================================
    // LOAD APPROVED AND REJECTED HISTORY
    // =====================================================

    const loadReviewedRequests = useCallback(async () => {
        // Start history loading.
        setHistoryLoading(true);
        setHistoryError("");

        try {
            // Fetch approved and rejected requests.
            const data = await apiRequest(
                "/hr/leave-requests/history"
            );

            // Store reviewed leave requests.
            setReviewedRequests(data.requests || []);
        } catch (err) {
            // Show history API errors.
            setHistoryError(
                err.message || "Failed to load leave history"
            );
        } finally {
            // Stop history loading.
            setHistoryLoading(false);
        }
    }, []);

    // =====================================================
    // INITIAL DATA LOADING
    // =====================================================

    // Load pending leave requests when HR opens Attendance.
    // Load pending requests initially and automatically refresh the list.
    useEffect(() => {
        // Fetch pending requests when HR opens Attendance.
        loadRequests();

        // Refresh pending requests every 15 seconds.
        const refreshInterval = window.setInterval(() => {
            // Avoid background API calls while the browser tab is hidden.
            if (document.visibilityState === "visible") {
                loadRequests(false);
            }
        }, 15000);

        // Refresh requests when HR returns to the browser tab.
        const handleWindowFocus = () => {
            loadRequests(false);
        };

        // Register the browser focus listener.
        window.addEventListener("focus", handleWindowFocus);

        // Clean up the interval and listener when the component unmounts.
        return () => {
            window.clearInterval(refreshInterval);
            window.removeEventListener("focus", handleWindowFocus);
        };
    }, [loadRequests]);

    // Load history when HR opens Approved or Rejected tabs.
    useEffect(() => {
        if (activeTab !== 0) {
            loadReviewedRequests();
        }
    }, [activeTab, loadReviewedRequests]);

    // =====================================================
    // HANDLE TAB CHANGE
    // =====================================================

    const handleTabChange = (_, newValue) => {
        // Switch to the selected tab.
        setActiveTab(newValue);

        // Reset pagination for the selected tab.
        setPage(0);

        // Clear previous action messages.
        setMessage("");
    };

    // =====================================================
    // APPROVE OR REJECT LEAVE REQUEST
    // =====================================================

    // Open the application's confirmation dialog without browser popups.
    const handleDecision = (requestId, action) => {
        if (processingId !== null) return;
        setReviewComment("");
        setDecisionDialog({ requestId, action });
    };

    // Close the confirmation dialog without changing the leave request.
    const closeDecisionDialog = () => {
        if (processingId !== null) return;
        setDecisionDialog(null);
        setReviewComment("");
    };

    // Submit the confirmed HR decision to the existing backend endpoint.
    const submitDecision = async () => {
        if (!decisionDialog || processingId !== null) return;

        const { requestId, action } = decisionDialog;
        setProcessingId(requestId);
        setError("");
        setMessage("");

        try {
            // Keep the existing approval/rejection API and optional comment field.
            const data = await apiRequest(
                `/hr/leave-requests/${requestId}/${action}`,
                {
                    method: "POST",
                    body: JSON.stringify({
                        reviewComment: reviewComment.trim(),
                    }),
                }
            );

            // Show the backend's success message.
            setMessage(
                data.message ||
                `Leave request ${action === "approve" ? "approved" : "rejected"} successfully`
            );

            // Close the dialog after a successful decision.
            setDecisionDialog(null);
            setReviewComment("");

            // Remove the processed request from the pending list.
            setRequests((current) =>
                current.filter((request) => request.id !== requestId)
            );

            // Refresh pending requests and approval/rejection history.
            await Promise.all([loadRequests(), loadReviewedRequests()]);
        } catch (err) {
            // Keep the dialog open so HR can retry if the API fails.
            setError(err.message || "Failed to process leave request");
        } finally {
            setProcessingId(null);
        }
    };

    // =====================================================
    // REFRESH CURRENT TAB
    // =====================================================

    const handleRefresh = () => {
        // Refresh pending requests when Pending is selected.
        if (activeTab === 0) {
            loadRequests();
        } else {
            // Refresh leave history for Approved or Rejected tabs.
            loadReviewedRequests();
        }
    };

    // =====================================================
    // FILTER REQUESTS BY SELECTED TAB
    // =====================================================

    // Get the selected status.
    const selectedStatus = LEAVE_TABS[activeTab].status;

    // Display pending or reviewed requests based on the tab.
    const visibleRequests =
        activeTab === 0
            ? requests
            : reviewedRequests.filter(
                (request) => request.status === selectedStatus
            );

    // Determine the loading state.
    const isLoading =
        activeTab === 0 ? loading : historyLoading;

    // Determine the current API error.
    const currentError =
        activeTab === 0 ? error : historyError;

    // Keep pagination within the available results.
    const currentPage = Math.min(
        page,
        Math.max(
            0,
            Math.ceil(visibleRequests.length / ROWS_PER_PAGE) - 1
        )
    );

    // Get requests for the current page.
    const paginatedRequests = visibleRequests.slice(
        currentPage * ROWS_PER_PAGE,
        (currentPage + 1) * ROWS_PER_PAGE
    );
   
    // =====================================================
    // USER INTERFACE
    // =====================================================

    return (
        <>
            {/* ProdTrack confirmation dialog with optional review comment. */}
            <Dialog
                open={Boolean(decisionDialog)}
                onClose={closeDecisionDialog}
                maxWidth="xs"
                fullWidth
                aria-labelledby="hr-leave-decision-title"
            >
                <DialogTitle id="hr-leave-decision-title" sx={{ fontWeight: 700 }}>
                    {decisionDialog?.action === "approve"
                        ? "Approve Leave Request"
                        : "Reject Leave Request"}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2 }}>
                        Are you sure you want to {decisionDialog?.action === "approve" ? "approve" : "reject"}
                        {` leave request #${decisionDialog?.requestId ?? ""}?`}
                    </DialogContentText>
                    {/* Allow HR to add a review comment without a browser prompt. */}
                    <TextField
                        label="Review comment (optional)"
                        value={reviewComment}
                        onChange={(event) => setReviewComment(event.target.value)}
                        multiline
                        minRows={2}
                        fullWidth
                        disabled={processingId !== null}
                    />
                    {error && (
                        <Alert severity="error" sx={{ mt: 2 }}>
                            {error}
                        </Alert>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
                    <Button
                        variant="outlined"
                        onClick={closeDecisionDialog}
                        disabled={processingId !== null}
                        sx={{ textTransform: "none" }}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        color={decisionDialog?.action === "approve" ? "success" : "error"}
                        onClick={submitDecision}
                        disabled={processingId !== null}
                        sx={{ textTransform: "none" }}
                    >
                        {processingId !== null
                            ? "Please wait…"
                            : decisionDialog?.action === "approve"
                                ? "Approve"
                                : "Reject"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Preserve the existing HR Attendance page. */}
            <Box sx={{ width: "100%" }}>
                {/* Main card matching the existing ProdTrack Attendance UI. */}
                <Paper
                    elevation={0}
                    sx={{
                        border: "1px solid #e5e7eb",
                        borderRadius: 1,
                        backgroundColor: "#fff",
                        overflow: "hidden",
                    }}
                >
                    {/* Card title and Refresh button. */}
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
                        {/* Card heading. */}
                        <Typography
                            sx={{
                                fontSize: 16,
                                fontWeight: 700,
                                color: "#1A2434",
                            }}
                        >
                            Leave Requests
                        </Typography>

                        {/* Refresh the currently selected tab. */}
                        <Button
                            type="button"
                            onClick={handleRefresh}
                            disabled={isLoading || processingId !== null}
                            sx={{
                                textTransform: "none",
                            }}
                        >
                            Refresh
                        </Button>
                    </Box>

                    {/* Leave request status tabs. */}
                    <Tabs
                        value={activeTab}
                        onChange={handleTabChange}
                        variant="scrollable"
                        scrollButtons="auto"
                        sx={{
                            px: 2,
                            borderBottom: "1px solid #e5e7eb",

                            "& .MuiTab-root": {
                                textTransform: "none",
                                fontSize: 14,
                                fontWeight: 600,
                                minHeight: 48,
                            },
                        }}
                    >
                        {/* Pending tab. */}
                        <Tab label="Pending" />

                        {/* Approved tab. */}
                        <Tab label="Approved" />

                        {/* Rejected tab. */}
                        <Tab label="Rejected" />
                    </Tabs>

                    {/* Show API errors. */}
                    {currentError && (
                        <Alert severity="error" sx={{ m: 2 }}>
                            {currentError}
                        </Alert>
                    )}

                    {/* Show success messages. */}
                    {message && (
                        <Alert severity="success" sx={{ m: 2 }}>
                            {message}
                        </Alert>
                    )}

                    {/* Leave requests table. */}
                    <TableContainer>
                        <Table size="small" sx={{ minWidth: 950 }}>
                            {/* Table headings. */}
                            <TableHead>
                                <TableRow sx={{ bgcolor: "#f8fafc" }}>
                                    {[
                                        "Employee",
                                        "Employee ID",
                                        "Role",
                                        "Leave type",
                                        "From",
                                        "To",
                                        "Reason",
                                        "Actions / Status",
                                    ].map((heading) => (
                                        <TableCell
                                            key={heading}
                                            sx={{
                                                fontWeight: 700,
                                                fontSize: 13,
                                                color: "#1A2434",
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            {heading}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>

                            {/* Table data. */}
                            <TableBody>
                                {/* Show loading state. */}
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={8}>
                                            Loading leave requests...
                                        </TableCell>
                                    </TableRow>
                                ) : currentError ? (
                                    // Show loading errors inside the table.
                                    <TableRow>
                                        <TableCell
                                            colSpan={8}
                                            sx={{ color: "error.main" }}
                                        >
                                            Unable to load leave requests.
                                        </TableCell>
                                    </TableRow>
                                ) : visibleRequests.length === 0 ? (
                                    // Show empty message based on selected tab.
                                    <TableRow>
                                        <TableCell colSpan={8}>
                                            {activeTab === 0
                                                ? "No pending leave requests."
                                                : activeTab === 1
                                                    ? "No approved leave requests."
                                                    : "No rejected leave requests."}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    // Display leave requests for the selected page.
                                    paginatedRequests.map((request) => (
                                        <TableRow
                                            key={request.id}
                                            sx={{
                                                "&:last-child td": {
                                                    borderBottom: 0,
                                                },

                                                "&:hover": {
                                                    bgcolor: "#f8fafc",
                                                },
                                            }}
                                        >
                                            {/* Employee name. */}
                                            <TableCell sx={tableCellStyle}>
                                                {request.employee_name}
                                            </TableCell>

                                            {/* Employee ID. */}
                                            <TableCell sx={tableCellStyle}>
                                                {request.employee_id}
                                            </TableCell>

                                            {/* Employee role. */}
                                            <TableCell sx={tableCellStyle}>
                                                {request.employee_role}
                                            </TableCell>

                                            {/* Leave type. */}
                                            <TableCell sx={tableCellStyle}>
                                                {request.leave_type}
                                            </TableCell>

                                            {/* Leave start date. */}
                                            <TableCell
                                                sx={{
                                                    ...tableCellStyle,
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                {request.start_date}
                                            </TableCell>

                                            {/* Leave end date. */}
                                            <TableCell
                                                sx={{
                                                    ...tableCellStyle,
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                {request.end_date}
                                            </TableCell>

                                            {/* Employee leave reason. */}
                                            <TableCell
                                                sx={{
                                                    ...tableCellStyle,
                                                    maxWidth: 260,
                                                    whiteSpace: "pre-wrap",
                                                    overflowWrap: "anywhere",
                                                }}
                                            >
                                                {request.reason || "—"}
                                            </TableCell>

                                            {/* Actions for Pending, status for Approved/Rejected. */}
                                            <TableCell sx={tableCellStyle}>
                                                {activeTab === 0 ? (
                                                    <Box sx={{ display: "flex", gap: 1 }}>
                                                        {/* Approve button. */}
                                                        <Button
                                                            size="small"
                                                            variant="contained"
                                                            color="success"
                                                            disabled={processingId !== null}
                                                            onClick={() => handleDecision(request.id, "approve")}
                                                            sx={{ textTransform: "none", boxShadow: "none" }}
                                                        >
                                                            Approve
                                                        </Button>

                                                        {/* Reject button. */}
                                                        <Button
                                                            size="small"
                                                            variant="outlined"
                                                            color="error"
                                                            disabled={processingId !== null}
                                                            onClick={() => handleDecision(request.id, "reject")}
                                                            sx={{ textTransform: "none" }}
                                                        >
                                                            Reject
                                                        </Button>
                                                    </Box>
                                                ) : (
                                                    // Display status with stronger contrast.
                                                    <Chip
                                                        label={request.status}
                                                        size="small"
                                                        sx={{
                                                            backgroundColor:
                                                                request.status === "APPROVED" ? "#15803d" : "#dc2626",
                                                            color: "#ffffff",
                                                            fontWeight: 700,
                                                            fontSize: "12px",
                                                            height: "28px",
                                                            borderRadius: "6px",
                                                            "& .MuiChip-label": {
                                                                color: "#ffffff",
                                                                px: 1.5,
                                                            },
                                                        }}
                                                    />
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    {/* Display pagination only when more than 10 requests exist. */}

                    {/* Show pagination whenever the selected tab has leave requests. */}
                    {!isLoading &&
                        !currentError &&
                        visibleRequests.length > 0 && (
                            <TablePagination
                                component="div"
                                count={visibleRequests.length}
                                page={currentPage}
                                rowsPerPage={ROWS_PER_PAGE}
                                rowsPerPageOptions={[ROWS_PER_PAGE]}
                                onPageChange={(_, newPage) => {
                                    // Update the current page when HR clicks Next or Previous.
                                    setPage(newPage);
                                }}
                                sx={{
                                    borderTop: "1px solid #e5e7eb",
                                    backgroundColor: "#ffffff",
                                    "& .MuiTablePagination-toolbar": {
                                        minHeight: 52,
                                    },
                                }}
                            />
                        )}

                </Paper>
            </Box>
        </>
    );
}
