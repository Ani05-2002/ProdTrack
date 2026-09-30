import {
  useState,
} from "react";

import apiRequest from "../lib/api.js";
import { useToast } from "./ToastProvider.jsx";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  Checkbox,
  FormControlLabel,
  IconButton,
  Chip,
  Divider,
  CircularProgress,
} from "@mui/material";

import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";

// ======================================================
// GUIDE UPDATE MODAL
// Shows the latest unacknowledged guide when an indexer
// logs in. All content is driven by the `guide` prop
// passed from App.jsx after the /pending-ack fetch.
// ======================================================

export default function GuideUpdateModal({ open, onClose, guide }) {
  const toast = useToast();
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] =
    useState(false);
  const [error, setError] = useState("");

  // Reset local state whenever the dialog opens with a new guide.
  const handleClose = () => {
    setChecked(false);
    setError("");
    onClose();
  };

const handleAcknowledge = async () => {
  if (
    !checked ||
    !guide?.version_id ||
    submitting
  ) {
    return;
  }

  try {
    setSubmitting(true);

    await apiRequest(
      `/guides/${guide.version_id}/acknowledge`,
      {
        method: "POST",
      }
    );

    setChecked(false);
    onClose();
  } catch (error) {
    console.error(
      "Acknowledge Guide Error:",
      error
    );

    toast.error(
      error.message ||
        "Failed to acknowledge guide"
    );
  } finally {
    setSubmitting(false);
  }
};

  // Build the version line shown under the guide title.
  const versionLine = guide
    ? [
        guide.version && `Version ${guide.version}`,
        guide.uploaded_at && `Updated ${guide.uploaded_at}`,
        guide.effective_date && `Effective ${guide.effective_date}`,
      ]
        .filter(Boolean)
        .join(" · ")
    : "";

  // Build the acknowledgement checkbox label using the real version.
  const ackLabel = guide
    ? `I have read and understood the updated indexing guide (${guide.version}).`
    : "I have read and understood the updated indexing guide.";

  return (
    <Dialog
      open={open}
      onClose={submitting ? undefined : handleClose}
      maxWidth={false}
      sx={{
        "& .MuiDialog-paper": {
          width: "490px",
          maxWidth: "92vw",
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: "0 8px 28px rgba(15, 23, 42, 0.18)",
        },
      }}
      slotProps={{
        backdrop: {
          sx: {
            backgroundColor: "rgba(15, 23, 42, 0.35)",
            backdropFilter: "blur(2px)",
          },
        },
      }}
    >
      {/* HEADER */}

      <DialogTitle
        sx={{
          px: 2.75,
          py: 2.2,
          fontFamily:
            "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
          fontSize: 16,
          fontWeight: 700,
          color: "#1A2434",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        New updated guide available

        <IconButton
          onClick={handleClose}
          size="small"
          disabled={submitting}
          sx={{ color: "#6A7585" }}
        >
          <CloseRoundedIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <Divider />

      {/* CONTENT */}

      <DialogContent sx={{ px: 2.75, py: 3.25 }}>
        {/* GUIDE INFORMATION */}

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            mb: 2.5,
          }}
        >
          {/* ICON */}

          <Box
            sx={{
              width: 62,
              height: 62,
              borderRadius: "14px",
              backgroundColor: "#e3f6ef",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <DescriptionOutlinedIcon sx={{ fontSize: 32, color: "#a78bfa" }} />
          </Box>

          {/* GUIDE DETAILS */}

          <Box>
            <Typography
              sx={{
                fontSize: 15,
                fontWeight: 700,
                fontFamily:
                  "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
                color: "#1A2434",
                lineHeight: 1.5,
              }}
            >
              {guide
                ? `${guide.project_name} — ${guide.title}`
                : "Loading guide…"}
            </Typography>

            {versionLine && (
              <Typography
                sx={{
                  mt: 0.5,
                  fontSize: 12.5,
                  fontFamily:
                    "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
                  color: "#6A7585",
                }}
              >
                {versionLine}
              </Typography>
            )}

            <Chip
              label="NEW UPDATE"
              size="small"
              sx={{
                mt: 1,
                height: 28,
                borderRadius: "16px",
                backgroundColor: "#ef4444",
                color: "#fff",
                fontSize: 11,
                fontWeight: 800,
                "& .MuiChip-label": { px: 1.25 },
              }}
            />
          </Box>
        </Box>

        {/* DESCRIPTION */}

        <Typography
          sx={{
            fontSize: 13,
            lineHeight: 1.5,
            fontFamily:
              "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
            color: "#6A7585",
            mb: 1.5,
          }}
        >
          {guide?.change_summary ||
            "Please review the updated guide — acknowledgement is mandatory before you continue."}
        </Typography>

        {/* ERROR */}

        {error && (
          <Typography
            sx={{
              fontSize: 12.5,
              color: "#d64545",
              mb: 1.5,
              fontFamily:
                "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
            }}
          >
            {error}
          </Typography>
        )}

        {/* CHECKBOX */}

        <Box
          sx={{
            border: "1px solid #d9e1ec",
            borderRadius: "12px",
            px: 1.2,
            py: 0.75,
            backgroundColor: "#fff",
          }}
        >
          <FormControlLabel
            control={
              <Checkbox
                checked={checked}
                disabled={submitting}
                onChange={(e) => setChecked(e.target.checked)}
                sx={{
                  color: "#7c8798",
                  "&.Mui-checked": { color: "#2f6df6" },
                }}
              />
            }
            //
            label={
              <Typography
                sx={{
                  fontSize: 13,
                  color: "#1A2434",
                  fontFamily:
                    "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
                }}
              >
                {ackLabel}
              </Typography>
            }
          />
        </Box>
      </DialogContent>

      <Divider />

      {/* ACTIONS */}

      <DialogActions
        sx={{
          px: 2.75,
          py: 2,
          backgroundColor: "#f8fafc",
          justifyContent: "flex-end",
          gap: 1,
        }}
      >
        {/* LATER */}

        <Button
          variant="outlined"
          onClick={handleClose}
          disabled={submitting}
          sx={{
            height: 44,
            px: 2,
            borderRadius: "9px",
            textTransform: "none",
            fontSize: "13px",
            fontWeight: 600,
            fontFamily:
              "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
            color: "#33415A",
            backgroundColor: "#fff",
            border: "1px solid #eaf0f8",
            "&:hover": { borderColor: "#d7dee8" },
          }}
        >
          Later
        </Button>

        {/* ACKNOWLEDGE */}

        <Button
          variant="contained"
          disabled={
            !checked ||
            !guide ||
            submitting
          }
          onClick={handleAcknowledge}
          startIcon={
            submitting ? (
              <CircularProgress size={14} sx={{ color: "#fff" }} />
            ) : null
          }
          sx={{
            height: 44,
            px: 2.2,
            borderRadius: "9px",
            textTransform: "none",
            fontFamily:
              "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
            fontSize: "13px",
            fontWeight: 700,
            backgroundColor: "#2f6df0",
            color: "#ffffff",
            boxShadow: "none",
            "&:hover": {
              backgroundColor: "#255dd8",
              boxShadow: "none",
            },
            "&.Mui-disabled": {
              backgroundColor: "#2f6df0",
              color: "#ffffff",
              opacity: 1,
            },
          }}
        >
          {submitting ? "Saving…" : "Acknowledge & continue"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
