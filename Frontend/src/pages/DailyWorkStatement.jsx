
import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Box,
  Typography,
  Button,
  Paper,
  TextField,
  Chip,
  Alert,
  CircularProgress,
} from "@mui/material";

import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";

import SpreadsheetEditor from "../components/SpreadsheetEditor.jsx";

import apiRequest from "../lib/api.js";

import { useToast } from "../components/ToastProvider.jsx";
import { useConfirm } from "../components/ConfirmDialog.jsx";



// ============================================================
// GET CURRENT DATE IN IST
// ============================================================

const todayIST = () =>
  new Date(Date.now() + 330 * 60000)
    .toISOString()
    .slice(0, 10);

// ============================================================
// GLASS UI STYLE
// ============================================================

const glassSx = {
  background: "rgba(255, 255, 255, 0.75)",

  backdropFilter: "blur(16px)",

  WebkitBackdropFilter: "blur(16px)",

  border: "1px solid rgba(255, 255, 255, 0.65)",

  borderRadius: "16px",

  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
};

const buttonSx = {
  textTransform: "none",
  borderRadius: "9px",
  fontWeight: 600,
  px: 2.5,
  py: 1,
};

// ============================================================
// DAILY WORK STATEMENT PAGE
// ============================================================

export default function DailyWorkStatement() {
  const spreadsheetRef = useRef(null);

  const actionRef = useRef(false);

  const toast = useToast();

  const { confirm, ConfirmElement } = useConfirm();

  const [productionDate, setProductionDate] =
    useState(todayIST);

  const [employeeName, setEmployeeName] =
    useState("");

  const [shiftName, setShiftName] =
    useState("");

  const [statement, setStatement] =
    useState(null);

  const [initialWorkbook, setInitialWorkbook] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [loadError, setLoadError] =
    useState("");

  const [actionError, setActionError] =
    useState("");

  const [reloadKey, setReloadKey] =
    useState(0);

  const isSubmitted =
    statement?.status === "submitted";

  const isDraft =
    statement?.status === "draft";

  // ==========================================================
  // LOAD DAILY WORK STATEMENT
  // ==========================================================

  useEffect(() => {
    let cancelled = false;

    const loadStatement = async () => {
      setLoading(true);

      setLoadError("");
      setActionError("");

      setStatement(null);
      setInitialWorkbook(null);

      setEmployeeName("");
      setShiftName("");

      try {
        const data = await apiRequest(
          `/daily-work-statements/my?date=${encodeURIComponent(
            productionDate
          )}`
        );

        if (!data.success) {
          throw new Error(
            data.message ||
            "Unable to load work statement."
          );
        }

        if (cancelled) return;

        setEmployeeName(
          data.employeeName || ""
        );

        setShiftName(
          data.shiftName || "Not Assigned"
        );

        setStatement(
          data.statement || null
        );

        setInitialWorkbook(
          data.statement?.workbookData || null
        );

      } catch (error) {
        if (cancelled) return;

        setLoadError(
          error.message ||
          "Failed to load daily work statement."
        );

      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadStatement();

    return () => {
      cancelled = true;
    };

  }, [productionDate, reloadKey]);

  // ==========================================================
  // CHANGE PRODUCTION DATE
  // ==========================================================

  const handleDateChange = async (event) => {
    const nextDate = event.target.value;

    if (
      !nextDate ||
      nextDate === productionDate ||
      loading ||
      actionRef.current
    ) {
      return;
    }

    if (nextDate > todayIST()) {
      toast.warning(
        "Future production dates are not allowed."
      );

      return;
    }

    // Protect any unsaved spreadsheet changes.

    actionRef.current = true;
    setSaving(true);

    try {
      if (!isSubmitted && !loadError) {
        const confirmed = await confirm({
          title: "Change production date?",

          message:
            "Any unsaved spreadsheet changes will be lost. Please save your draft before changing the date.",

          confirmLabel: "Change Date",
        });

        if (!confirmed) return;
      }

      setLoading(true);
      setProductionDate(nextDate);

    } finally {
      actionRef.current = false;
      setSaving(false);
    }
  };

  // ==========================================================
  // SAVE DRAFT OR SUBMIT STATEMENT
  // ==========================================================

  const saveStatement = async (status) => {
    if (
      actionRef.current ||
      loading ||
      loadError ||
      isSubmitted
    ) {
      return;
    }

    actionRef.current = true;

    setSaving(true);
    setActionError("");

    try {
      if (!spreadsheetRef.current?.isReady()) {
        throw new Error(
          "Spreadsheet is not ready."
        );
      }

      if (status === "submitted") {
        const confirmed = await confirm({
          title: "Submit Daily Work Statement?",

          message:
            "Your complete daily statement will be available to your Team Lead, Manager and Administrator in Reports. You cannot edit it after submission.",

          confirmLabel: "Submit Statement",
        });

        if (!confirmed) return;
      }

      // Retrieve the complete Univer workbook.

      const workbookData =
        await spreadsheetRef.current.getWorkbookData();

      // Save workbook to MySQL through backend API.

      const data = await apiRequest(
        "/daily-work-statements/my",
        {
          method: "POST",

          body: JSON.stringify({
            productionDate,

            workbookData,

            status,
          }),
        }
      );

      if (!data.success) {
        throw new Error(
          data.message ||
          "Unable to save statement."
        );
      }

      setStatement(data.statement);

      if (
        data.statement?.status === "submitted"
      ) {
        // Reload the final saved snapshot
        // in read-only mode.

        setInitialWorkbook(workbookData);
      }

      // Do not replace initialWorkbook on draft
      // save. This keeps the current editor mounted.

      toast.success(
        data.message ||
        (
          status === "submitted"
            ? "Statement submitted successfully."
            : "Draft saved successfully."
        )
      );

    } catch (error) {
      const message =
        error.message ||
        "Failed to save work statement.";

      setActionError(message);

      toast.error(message);

    } finally {
      actionRef.current = false;
      setSaving(false);
    }
  };
  // ==========================================================
  // PAGE UI
  // ==========================================================

  return (
    <Box
      sx={{
        width: "100%",
        minWidth: 0,
        pb: 3,
      }}
    >
      {ConfirmElement}

      {/* PAGE HEADER */}

      <Box sx={{ mb: 3 }}>
        <Typography
          sx={{
            fontSize: 26,
            fontWeight: 800,
            color: "#10243e",
          }}
        >
          Daily Work Statement
        </Typography>

        <Typography
          sx={{
            fontSize: 13,
            color: "#64748b",
            mt: 0.5,
          }}
        >
          Prepare and submit your complete daily
          work statement.
        </Typography>
      </Box>

      {/* EMPLOYEE DETAILS */}

      <Paper
        elevation={0}
        sx={{
          ...glassSx,
          p: 2.5,
          mb: 2.5,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 2,
            mb: 2.5,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <DescriptionRoundedIcon
              sx={{
                color: "#3169e8",
                fontSize: 25,
              }}
            />

            <Typography
              sx={{
                fontSize: 16,
                fontWeight: 700,
                color: "#10243e",
              }}
            >
              Statement Details
            </Typography>
          </Box>

          {!loading && !loadError && (
            <Chip
              size="small"

              label={
                isSubmitted
                  ? "Submitted"
                  : isDraft
                    ? "Draft"
                    : "New Statement"
              }

              color={
                isSubmitted
                  ? "success"
                  : isDraft
                    ? "warning"
                    : "default"
              }

              sx={{
                fontWeight: 600,
              }}
            />
          )}
        </Box>

        <Box
          sx={{
            display: "grid",

            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(3, minmax(0, 1fr))",
            },

            gap: 2.5,
          }}
        >
          {/* EMPLOYEE NAME */}

          <Box>
            <Typography
              sx={{
                fontSize: 12,
                fontWeight: 600,
                color: "#64748b",
                mb: 1,
              }}
            >
              Employee Name
            </Typography>


            <TextField
              fullWidth
              size="small"
              value={employeeName}
              placeholder="Employee name"
              disabled
              sx={{
                "& .MuiInputBase-input.Mui-disabled": {
                  WebkitTextFillColor: "#10243e",
                  cursor: "not-allowed",
                },
                "& .MuiOutlinedInput-root.Mui-disabled": {
                  backgroundColor: "rgba(241, 245, 249, 0.7)",
                  cursor: "not-allowed",
                },
              }}
            />

          </Box>

          {/* PRODUCTION DATE */}

          <Box>
            <Typography
              sx={{
                fontSize: 12,
                fontWeight: 600,
                color: "#64748b",
                mb: 1,
              }}
            >
              Production Date
            </Typography>

            <TextField
              type="date"

              fullWidth
              size="small"

              value={productionDate}

              onChange={handleDateChange}

              disabled={saving || loading}

              inputProps={{
                max: todayIST(),
                "aria-label": "Production Date",
              }}

              sx={{
                "& input": {
                  colorScheme: "light",
                },
              }}
            />
          </Box>

          {/* SHIFT */}

          <Box>
            <Typography
              sx={{
                fontSize: 12,
                fontWeight: 600,
                color: "#64748b",
                mb: 1,
              }}
            >
              Shift
            </Typography>


            <TextField
              fullWidth
              size="small"
              value={shiftName}
              placeholder="Assigned shift"
              disabled
              sx={{
                "& .MuiInputBase-input.Mui-disabled": {
                  WebkitTextFillColor: "#10243e",
                  cursor: "not-allowed",
                },
                "& .MuiOutlinedInput-root.Mui-disabled": {
                  backgroundColor: "rgba(241, 245, 249, 0.7)",
                  cursor: "not-allowed",
                },
              }}
            />

          </Box>
        </Box>
      </Paper>

      {/* LOAD ERROR */}

      {loadError && (
        <Alert
          severity="error"

          sx={{ mb: 2 }}

          action={
            <Button
              color="inherit"
              size="small"

              onClick={() =>
                setReloadKey((value) => value + 1)
              }
            >
              Retry
            </Button>
          }
        >
          {loadError}
        </Alert>
      )}

      {/* SAVE ERROR */}

      {actionError && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}

          onClose={() => setActionError("")}
        >
          {actionError}
        </Alert>
      )}

      {/* SUBMITTED STATEMENT INFORMATION */}

      {!loading && isSubmitted && (
        <Alert
          severity="success"
          sx={{
            mb: 2,
            borderRadius: "10px",
          }}
        >
          Your daily work statement has been
          submitted successfully and is available
          to authorized management users in Reports.
          This workbook is now read-only.
        </Alert>
      )}

      {/* SPREADSHEET CONTAINER */}

      <Paper
        elevation={0}
        sx={{
          ...glassSx,
          p: { xs: 1, md: 2 },
          minWidth: 0,
        }}
      >
        {/* SPREADSHEET HEADER */}

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 2,
            mb: 2,
          }}
        >
          <Box>
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: 16,
                color: "#10243e",
              }}
            >
              Daily Work Spreadsheet
            </Typography>

            <Typography
              sx={{
                fontSize: 12,
                color: "#64748b",
                mt: 0.5,
              }}
            >
              Enter your complete day's work
              in the spreadsheet below.
            </Typography>
          </Box>
        </Box>

        {/* LOADING STATE */}

        {loading ? (
          <Box
            sx={{
              minHeight: 400,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <CircularProgress size={30} />

            <Typography
              sx={{
                fontSize: 13,
                color: "#64748b",
              }}
            >
              Loading spreadsheet...
            </Typography>
          </Box>
        ) : !loadError ? (
          <Box
            sx={{
              position: "relative",
              minWidth: 0,
            }}
          >
            {/* UNIVER SHEETS */}

            <SpreadsheetEditor
              key={productionDate}

              ref={spreadsheetRef}

              initialWorkbook={initialWorkbook}

              readOnly={isSubmitted}

              height={650}
            />

            {/* BLOCK EDITING DURING SAVE */}

            {saving && (
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,

                  zIndex: 50,

                  background:
                    "rgba(255,255,255,0.45)",

                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CircularProgress size={30} />
              </Box>
            )}
          </Box>
        ) : null}

        {/* ACTION BUTTONS */}

        {!loading &&
          !loadError &&
          !isSubmitted && (
            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-end",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 1.5,
                mt: 2.5,
              }}
            >
              <Button
                variant="outlined"

                startIcon={<SaveRoundedIcon />}

                disabled={saving}

                onClick={() =>
                  saveStatement("draft")
                }

                sx={{
                  ...buttonSx,

                  borderColor: "#3169e8",

                  color: "#3169e8",
                }}
              >
                Save Draft
              </Button>

              <Button
                variant="contained"

                startIcon={
                  saving
                    ? (
                      <CircularProgress
                        size={16}
                        color="inherit"
                      />
                    )
                    : <SendRoundedIcon />
                }

                disabled={saving}

                onClick={() =>
                  saveStatement("submitted")
                }

                sx={{
                  ...buttonSx,

                  bgcolor: "#3169e8",

                  boxShadow:
                    "0 4px 12px rgba(49,105,232,0.25)",

                  "&:hover": {
                    bgcolor: "#2458cb",
                  },
                }}
              >
                {saving
                  ? "Please Wait..."
                  : "Submit Statement"}
              </Button>
            </Box>
          )}

        {!loading &&
          !loadError &&
          !isSubmitted && (
            <Typography
              sx={{
                fontSize: 12,
                color: "#64748b",
                textAlign: "right",
                mt: 1.5,
              }}
            >
              Save your draft periodically to
              avoid losing unsaved changes.
            </Typography>
          )}
      </Paper>
    </Box>
  );
}
