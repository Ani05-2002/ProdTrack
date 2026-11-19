
import { useEffect, useState } from "react";

import apiRequest from "../lib/api.js";
import { useConfirm } from "../components/ConfirmDialog.jsx";
import GuideViewer from "../components/GuideViewer.jsx";

import {
  Box,
  Typography,
  Button,
  Card,
  Chip,
  Divider,
  Alert,
  Link,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from "@mui/material";

import FileDownloadRoundedIcon from "@mui/icons-material/FileDownloadRounded";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";

const FONT =
  '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

const defaultGuide = {
  name: "ABC Medical Imaging Indexing Guide v2.3",
  version: "2.3",
  updatedDate: "16 May 2025",
};

// Common View Guide button styling.
const primaryButtonStyle = {
  height: 36,
  borderRadius: "8px",
  textTransform: "none",
  fontWeight: 700,
  fontSize: 12.5,
  whiteSpace: "nowrap",
  boxShadow: "none",
  backgroundColor: "#2f6df6",

  "&:hover": {
    backgroundColor: "#2458cf",
    boxShadow: "none",
  },
};

// Common Version History button styling.
const secondaryButtonStyle = {
  height: 36,
  borderRadius: "8px",
  textTransform: "none",
  fontWeight: 600,
  fontSize: 12.5,
  whiteSpace: "nowrap",
  color: "#1A2434",
  borderColor: "#d6dee9",
  backgroundColor: "#ffffff",

  "&:hover": {
    backgroundColor: "#f5f8fc",
    borderColor: "#aebed3",
  },
};

export default function IndexingGuide({
  variant = "page",
  guide: providedGuide = defaultGuide,
  onViewGuide,
  roleLabel = "Indexer",
}) {
  // Stores all available indexing guides.
  const [guides, setGuides] = useState([]);

  // Main page loading and error states.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Stores the guide currently being acknowledged.
  const [savingId, setSavingId] = useState(null);

  // Full-screen guide viewer states.
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewGuide, setPreviewGuide] = useState(null);

  // Version history states.
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyError, setHistoryError] = useState("");
  const [historyTitle, setHistoryTitle] = useState("");

  // Existing confirmation dialog.
  const { confirm, ConfirmElement } = useConfirm();

  // =========================================================
  // LOAD ALL INDEXING GUIDES
  // =========================================================

  useEffect(() => {
    // Preserve the existing dashboard card functionality.
    if (variant === "card") return;

    let active = true;

    const loadGuides = async () => {
      setLoading(true);
      setError("");

      try {
        const data = await apiRequest("/guides/latest");

        if (!data.success) {
          throw new Error(
            data.message || "Failed to load guides"
          );
        }

        // Convert backend guide data into frontend format.
        const items = (data.guides || []).map((item) => ({
          ...item,

          name: item.title || "Indexing Guide",

          version: item.version,

          updatedDate: item.updated_date
            ? new Date(
                item.updated_date
              ).toLocaleDateString("en-IN")
            : "—",

          acknowledged:
            item.acknowledged === true ||
            Number(item.acknowledged) === 1,

          requiresAck:
            item.requires_ack === true ||
            Number(item.requires_ack) === 1,
        }));

        if (!active) return;

        setGuides(items);
      } catch (err) {
        if (active) {
          setError(
            err.message || "Failed to load guides"
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadGuides();

    return () => {
      active = false;
    };
  }, [variant]);

  // =========================================================
  // ACKNOWLEDGE INDIVIDUAL GUIDE
  // =========================================================

  const handleAcknowledge = async (guide) => {
    if (
      !guide ||
      guide.acknowledged ||
      savingId !== null
    ) {
      return;
    }

    const versionId = guide.version_id;

    // Prevent multiple acknowledgement actions.
    setSavingId(versionId);

    try {
      const confirmed = await confirm({
        title: "Acknowledge guide?",

        message: `Confirm that you have read "${guide.name}" (${guide.version}).`,

        confirmLabel: "Acknowledge",
      });

      if (!confirmed) return;

      setError("");

      // Acknowledge only the selected guide.
      const data = await apiRequest(
        `/guides/${versionId}/acknowledge`,
        {
          method: "POST",
        }
      );

      if (!data.success) {
        throw new Error(
          data.message ||
            "Failed to acknowledge guide"
        );
      }

      // Update only the acknowledged guide.
      setGuides((currentGuides) =>
        currentGuides.map((item) =>
          String(item.version_id) ===
          String(versionId)
            ? {
                ...item,
                acknowledged: true,
              }
            : item
        )
      );
    } catch (err) {
      setError(
        err.message ||
          "Failed to acknowledge guide"
      );
    } finally {
      setSavingId(null);
    }
  };

  // =========================================================
  // OPEN FULL-SCREEN GUIDE VIEWER
  // =========================================================

  const handleViewGuide = (guide) => {
    if (!guide?.version_id) return;

    // Store the exact guide clicked by the employee.
    setPreviewGuide(guide);

    // Open the searchable document viewer.
    setPreviewOpen(true);
  };

  const handleCloseGuide = () => {
    setPreviewOpen(false);
    setPreviewGuide(null);
  };

  // =========================================================
  // VIEW INDIVIDUAL GUIDE VERSION HISTORY
  // =========================================================

  const handleViewHistory = async (guide) => {
    if (!guide || historyLoading) return;

    setHistoryOpen(true);
    setHistoryTitle(guide.name);
    setHistory([]);
    setHistoryError("");
    setHistoryLoading(true);

    try {
      // Existing backend project history API.
      const data = await apiRequest(
        `/guides/${guide.project_id}/history`
      );

      if (!data.success) {
        throw new Error(
          data.message ||
            "Failed to load guide history"
        );
      }

      // The backend returns all guide versions for a project.
      // Filter them to show only the selected guide's versions.
      const selectedGuideHistory = (
        data.history || []
      ).filter(
        (item) =>
          String(item.guide_id) ===
          String(guide.guide_id)
      );

      setHistory(selectedGuideHistory);
    } catch (err) {
      setHistoryError(
        err.message ||
          "Failed to load guide history"
      );
    } finally {
      setHistoryLoading(false);
    }
  };

  // =========================================================
  // EXISTING COMPACT DASHBOARD CARD
  // =========================================================

  if (variant === "card") {
    const guide = providedGuide;

    return (
      <Card
        elevation={0}
        sx={{
          border: "1px solid #dfe4ec",
          borderRadius: "12px",

          boxShadow:
            "0 1px 2px rgba(16,30,54,.06), 0 4px 16px rgba(16,30,54,.05)",

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
          <Typography
            sx={{
              fontFamily: FONT,
              fontWeight: 800,
              fontSize: 14,
              color: "#341a1a",
            }}
          >
            Indexing guide (latest)
          </Typography>

          <Link
            component="button"
            type="button"
            onClick={onViewGuide}
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
            View all
          </Link>
        </Box>

        <Box
          sx={{
            px: 2,
            py: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                fontFamily: FONT,
                fontWeight: 700,
                fontSize: 13.5,
                color: "#1a2434",
                mb: "3px",
              }}
            >
              {guide.name}
            </Typography>

            <Typography
              sx={{
                fontFamily: FONT,
                color: "#6a7585",
                fontSize: 12.5,
              }}
            >
              Version {guide.version} · Updated{" "}
              {guide.updatedDate}
            </Typography>
          </Box>

          <Button
            variant="contained"
            startIcon={
              <FileDownloadRoundedIcon
                sx={{ fontSize: 16 }}
              />
            }
            onClick={onViewGuide}
            sx={{
              ...primaryButtonStyle,
              fontFamily: FONT,
              px: 2,
              py: 1,
            }}
          >
            View / Download
          </Button>
        </Box>
      </Card>
    );
  }

  // =========================================================
  // MAIN INDEXING GUIDE PAGE
  // =========================================================

  return (
    <Box
      sx={{
        width: "100%",
        fontFamily: FONT,
      }}
    >
      {/* PAGE HEADER */}

      <Box sx={{ mb: 2.3 }}>
        <Typography
          sx={{
            color: "#6A7585",
            fontSize: 12.5,
            mb: 0.7,
          }}
        >
          ProdTrack · {roleLabel}
        </Typography>

        <Typography
          sx={{
            fontSize: 22,
            fontWeight: 800,
            color: "#1A2434",
          }}
        >
          Indexing guide
        </Typography>

        <Typography
          sx={{
            mt: 0.7,
            color: "#6A7585",
            fontSize: 13.5,
          }}
        >
          View the latest approved guides for your
          assigned projects.
        </Typography>
      </Box>

      {/* ERROR MESSAGE */}

      {error && (
        <Alert
          severity="error"
          sx={{
            mb: 2,
            borderRadius: "9px",
          }}
        >
          {error}
        </Alert>
      )}

      {/* LOADING STATE */}

      {loading ? (
        <Card
          elevation={0}
          sx={{
            p: 5,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
            border: "1px solid #dce3ec",
            borderRadius: "12px",
          }}
        >
          <CircularProgress size={24} />

          <Typography
            sx={{
              fontSize: 13.5,
              color: "#6A7585",
            }}
          >
            Loading indexing guides...
          </Typography>
        </Card>
      ) : guides.length === 0 ? (
        /* EMPTY STATE */

        !error && (
          <Alert
            severity="info"
            sx={{
              borderRadius: "9px",
            }}
          >
            No guides are available for your assigned
            projects.
          </Alert>
        )
      ) : (
        /* INDEXING GUIDES LIST */

        <Card
          elevation={0}
          sx={{
            border: "1px solid #dce3ec",
            borderRadius: "12px",

            boxShadow:
              "0 4px 14px rgba(15,23,42,.05)",

            overflow: "hidden",
            backgroundColor: "#ffffff",
          }}
        >
          {/* LIST HEADER */}

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              px: 2,
              py: 1.75,
              gap: 2,
            }}
          >
            <Typography
              sx={{
                fontSize: 15,
                fontWeight: 800,
                color: "#1A2434",
              }}
            >
              Indexing guides
            </Typography>

            <Typography
              sx={{
                fontSize: 12.5,
                color: "#6A7585",
              }}
            >
              {guides.length}{" "}
              {guides.length === 1
                ? "guide"
                : "guides"}{" "}
              available
            </Typography>
          </Box>

          <Divider />

          {/* DISPLAY ALL GUIDES ONE BY ONE */}

          {guides.map((guide, index) => (
            <Box key={guide.version_id}>
              {/* INDIVIDUAL GUIDE ROW */}

              <Box
                sx={{
                  display: "flex",

                  flexDirection: {
                    xs: "column",
                    md: "row",
                  },

                  alignItems: {
                    xs: "stretch",
                    md: "center",
                  },

                  justifyContent: "space-between",
                  px: 2,
                  py: 2,
                  gap: 2,

                  transition:
                    "background-color 0.15s ease",

                  "&:hover": {
                    backgroundColor: "#fafcff",
                  },
                }}
              >
                {/* LEFT SIDE: GUIDE INFORMATION */}

                <Box
                  sx={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 1.75,
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  {/* DOCUMENT ICON */}

                  <Box
                    sx={{
                      width: 44,
                      height: 48,
                      borderRadius: "9px",
                      backgroundColor: "#eaf1ff",
                      color: "#2f6df6",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <DescriptionOutlinedIcon
                      sx={{
                        fontSize: 25,
                      }}
                    />
                  </Box>

                  {/* GUIDE NAME AND DETAILS */}

                  <Box
                    sx={{
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    {/* GUIDE TITLE AND LATEST CHIP */}

                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        flexWrap: "wrap",
                        mb: 0.5,
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: 14,
                          fontWeight: 800,
                          color: "#1A2434",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {guide.name}
                      </Typography>

                      <Chip
                        label="LATEST"
                        size="small"
                        sx={{
                          height: 22,
                          borderRadius: "12px",
                          backgroundColor: "#e3f7ed",
                          color: "#177A53",
                          border: "1px solid #b9e5d0",
                          fontSize: 10.5,
                          fontWeight: 800,
                        }}
                      />
                    </Box>

                    {/* PROJECT NAME AND VERSION */}

                    <Typography
                      sx={{
                        color: "#6A7585",
                        fontSize: 12.5,
                        lineHeight: 1.8,
                      }}
                    >
                      {guide.project_name} · Version{" "}
                      {guide.version} · Updated{" "}
                      {guide.updatedDate}
                    </Typography>

                    {/* ACKNOWLEDGEMENT STATUS */}

                    {guide.acknowledged ? (
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 0.7,
                          mt: 0.8,
                          color: "#177A53",
                        }}
                      >
                        <CheckCircleOutlineRoundedIcon
                          sx={{ fontSize: 17 }}
                        />

                        <Typography
                          sx={{
                            fontSize: 12.5,
                            fontWeight: 600,
                          }}
                        >
                          Acknowledged
                        </Typography>
                      </Box>
                    ) : (
                      <Box sx={{ mt: 0.8 }}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.7,
                            flexWrap: "wrap",
                          }}
                        >
                          <WarningAmberRoundedIcon
                            sx={{
                              fontSize: 18,
                              color: "#ed8b16",
                            }}
                          />

                          <Typography
                            sx={{
                              color: "#a66a12",
                              fontSize: 12.5,
                              fontWeight: 600,
                            }}
                          >
                            Acknowledgement pending
                          </Typography>

                          <Button
                            type="button"
                            disabled={
                              savingId !== null
                            }
                            onClick={() =>
                              handleAcknowledge(guide)
                            }
                            sx={{
                              p: 0,
                              ml: 0.5,
                              minWidth: 0,
                              textTransform: "none",
                              fontWeight: 700,
                              fontSize: 12.5,
                              textDecoration:
                                "underline",
                              color: "#2f6df6",
                            }}
                          >
                            {String(savingId) ===
                            String(guide.version_id)
                              ? "Saving..."
                              : "Acknowledge now"}
                          </Button>
                        </Box>

                        {guide.requiresAck && (
                          <Typography
                            sx={{
                              mt: 0.5,
                              fontSize: 11.5,
                              color: "#6A7585",
                            }}
                          >
                            Read and acknowledge this
                            guide before submitting
                            daily entries.
                          </Typography>
                        )}
                      </Box>
                    )}
                  </Box>
                </Box>

                {/* RIGHT SIDE: GUIDE ACTION BUTTONS */}

                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: {
                      xs: "flex-end",
                      md: "flex-start",
                    },
                    flexWrap: "wrap",
                    gap: 1,
                    flexShrink: 0,
                  }}
                >
                  {/* VERSION HISTORY BUTTON */}

                  <Button
                    variant="outlined"
                    disabled={historyLoading}
                    onClick={() =>
                      handleViewHistory(guide)
                    }
                    sx={secondaryButtonStyle}
                  >
                    Version history
                  </Button>

                  {/* VIEW GUIDE BUTTON */}

                  <Button
                    variant="contained"
                    disabled={!guide.version_id}
                    onClick={() =>
                      handleViewGuide(guide)
                    }
                    sx={primaryButtonStyle}
                  >
                    View Guide
                  </Button>
                </Box>
              </Box>

              {/* SEPARATOR BETWEEN GUIDES */}

              {index < guides.length - 1 && (
                <Divider
                  sx={{
                    borderColor: "#e8ecf3",
                  }}
                />
              )}
            </Box>
          ))}
        </Card>
      )}

      {/* ===================================================
          VERSION HISTORY DIALOG
      =================================================== */}

      <Dialog
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        fullWidth
        maxWidth="md"
        aria-labelledby="guide-history-title"
        slotProps={{
          paper: {
            sx: {
              borderRadius: "12px",
            },
          },
        }}
      >
        <DialogTitle id="guide-history-title">
          Version history — {historyTitle}
        </DialogTitle>

        <DialogContent dividers>
          {historyLoading ? (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 1.5,
                py: 4,
              }}
            >
              <CircularProgress size={22} />

              <Typography sx={{ fontSize: 13 }}>
                Loading version history...
              </Typography>
            </Box>
          ) : historyError ? (
            <Alert severity="error">
              {historyError}
            </Alert>
          ) : history.length === 0 ? (
            <Alert severity="info">
              No guide versions found.
            </Alert>
          ) : (
            <Box sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow
                    sx={{
                      backgroundColor: "#f5f7fa",
                    }}
                  >
                    <TableCell>
                      Guide / version
                    </TableCell>

                    <TableCell>
                      Uploaded
                    </TableCell>

                    <TableCell>
                      Changes
                    </TableCell>

                    <TableCell>
                      Status
                    </TableCell>

                    <TableCell>
                      Acknowledgement
                    </TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {history.map((item) => (
                    <TableRow
                      key={item.version_id}
                      hover
                    >
                      <TableCell>
                        <Typography
                          sx={{
                            fontSize: 13,
                            fontWeight: 600,
                          }}
                        >
                          {item.title}
                        </Typography>

                        <Typography
                          sx={{
                            fontSize: 12,
                            color: "#6A7585",
                          }}
                        >
                          Version {item.version}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        {item.updated_date
                          ? new Date(
                              item.updated_date
                            ).toLocaleDateString(
                              "en-IN"
                            )
                          : "—"}
                      </TableCell>

                      <TableCell>
                        {item.description || "—"}
                      </TableCell>

                      <TableCell>
                        <Chip
                          size="small"
                          label={
                            Number(item.is_latest) === 1
                              ? "Latest"
                              : "Previous"
                          }
                          color={
                            Number(item.is_latest) === 1
                              ? "success"
                              : "default"
                          }
                        />
                      </TableCell>

                      <TableCell>
                        <Chip
                          size="small"
                          label={
                            Number(item.acknowledged) ===
                            1
                              ? "Read"
                              : "Unread"
                          }
                          color={
                            Number(item.acknowledged) ===
                            1
                              ? "success"
                              : "warning"
                          }
                          variant="outlined"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button
            onClick={() =>
              setHistoryOpen(false)
            }
            sx={{
              textTransform: "none",
              fontWeight: 600,
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* ===================================================
          FULL-SCREEN SEARCHABLE GUIDE VIEWER
      =================================================== */}

      <GuideViewer
        open={previewOpen}
        onClose={handleCloseGuide}
        versionId={previewGuide?.version_id}
        title={
          previewGuide?.name || "Indexing Guide"
        }
        filePath={
          previewGuide?.file_path || ""
        }
      />

      {/* EXISTING CONFIRMATION DIALOG */}

      {ConfirmElement}
    </Box>
  );
}
