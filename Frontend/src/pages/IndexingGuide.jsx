import { useEffect, useState } from "react";
import apiRequest, { apiDownload } from "../lib/api.js";
import { useConfirm } from "../components/ConfirmDialog.jsx";
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
} from "@mui/material";

import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import FileDownloadRoundedIcon from "@mui/icons-material/FileDownloadRounded";

const FONT =
  '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';


const defaultGuide = {
  name: "ABC Medical Imaging Indexing Guide v2.3",
  version: "2.3",
  updatedDate: "16 May 2025",
};

// =========================================================
// IndexingGuide
// variant="card" -> compact dashboard summary (Image 1)
// variant="page" (default) -> full guide detail page (Image 2)
// =========================================================
export default function IndexingGuide({
  variant = "page",
  guide: providedGuide = defaultGuide,
  onViewGuide,
  roleLabel = "Indexer",
}) {
  const [selected, setSelected] = useState(0);
  const [guides, setGuides] = useState([]);
  const [selectedVersionId, setSelectedVersionId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyError, setHistoryError] = useState("");
  const [historyProject, setHistoryProject] = useState("");
  const { confirm, ConfirmElement } = useConfirm();
  const [sectionsError, setSectionsError] = useState("");
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [guideSections, setGuideSections] = useState([]);


  useEffect(() => {
    // Keep the compact dashboard card using its existing prop.
    if (variant === "card") return;

    let active = true;

    const loadGuides = async () => {
      setLoading(true);
      setError("");

      try {
        const data = await apiRequest("/guides/latest");

        if (!data.success) {
          throw new Error(data.message || "Failed to load guides");
        }

        const items = (data.guides || []).map((item) => ({
          ...item,
          name: item.title,
          version: item.version,
          updatedDate: item.updated_date
            ? new Date(item.updated_date).toLocaleDateString("en-IN")
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
        setSelectedVersionId(
          items.length ? String(items[0].version_id) : ""
        );
      } catch (err) {
        if (active) {
          setError(err.message || "Failed to load guides");
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadGuides();

    return () => {
      active = false;
    };
  }, [variant]);
  // =========================================================
// LOAD GUIDE SECTIONS
// =========================================================

// Loads the preview sections whenever the selected guide version changes.
useEffect(() => {
  // Does not load sections for the compact dashboard card.
  if (variant === "card") return;

  // Clears section data when no guide version is selected.
  if (!selectedVersionId) {
    setGuideSections([]);
    return;
  }

  let active = true;

  // Loads all sections configured for the selected guide version.
  const loadGuideSections = async () => {
    try {
      // Shows the loading state inside the guide preview.
      setSectionsLoading(true);

      // Clears any previous section-loading error.
      setSectionsError("");

      // Gets the sections for the currently selected guide version.
      const data = await apiRequest(
        `/guides/${selectedVersionId}/sections`
      );

      // Stops if the backend reports an unsuccessful request.
      if (!data.success) {
        throw new Error(
          data.message || "Failed to load guide sections"
        );
      }

      // Stops state updates if the component has already changed/unmounted.
      if (!active) return;

      // Stores all backend-driven guide sections.
      setGuideSections(data.sections || []);

      // Automatically selects Overview/the first available section.
      setSelected(0);
    } catch (err) {
      // Stops state updates if this request is no longer active.
      if (!active) return;

      // Clears old sections when loading fails.
      setGuideSections([]);

      // Stores the error for the preview area.
      setSectionsError(
        err.message || "Failed to load guide sections"
      );
    } finally {
      // Ends loading only while this request is still active.
      if (active) {
        setSectionsLoading(false);
      }
    }
  };

  // Starts loading the selected guide's sections.
  loadGuideSections();

  // Prevents an old request from updating the page after selection changes.
  return () => {
    active = false;
  };
}, [selectedVersionId, variant]);

  const guide =
    variant === "card"
      ? providedGuide
      : guides.find(
          (item) => String(item.version_id) === selectedVersionId
        );


  const handleAcknowledge = async () => {
    if (!guide || guide.acknowledged || saving) return;

    const confirmed = await confirm({
      title: "Acknowledge guide?",
      message: `Confirm that you have read "${guide.name}" (${guide.version}).`,
      confirmLabel: "Acknowledge",
    });

    if (!confirmed) return;

    const versionId = guide.version_id;

    try {
      setSaving(true);
      setError("");

      const data = await apiRequest(
        `/guides/${versionId}/acknowledge`,
        { method: "POST" }
      );

      if (!data.success) {
        throw new Error(
          data.message || "Failed to acknowledge guide"
        );
      }

      // Update the screen only after the backend confirms success.
      setGuides((currentGuides) =>
        currentGuides.map((item) =>
          String(item.version_id) === String(versionId)
            ? { ...item, acknowledged: true }
            : item
        )
      );
    } catch (err) {
      setError(err.message || "Failed to acknowledge guide");
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async () => {
    if (!guide || downloading) return;

    try {
      setDownloading(true);
      setError("");

      const blob = await apiDownload(
        `/guides/${guide.version_id}/download`
      );

      const fileName = `${guide.name}-${guide.version}`
        .replace(/[^a-zA-Z0-9._-]+/g, "-");

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `${fileName}.pdf`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      // Release the temporary URL after the browser starts downloading.
      window.setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 10000);
    } catch (err) {
      setError(err.message || "Failed to download guide");
    } finally {
      setDownloading(false);
    }
  };

  const handleViewHistory = async () => {
    if (!guide || historyLoading) return;

    setHistoryOpen(true);
    setHistoryProject(guide.project_name);
    setHistory([]);
    setHistoryError("");
    setHistoryLoading(true);

    try {
      const data = await apiRequest(
        `/guides/${guide.project_id}/history`
      );

      if (!data.success) {
        throw new Error(data.message || "Failed to load guide history");
      }

      setHistory(data.history || []);
    } catch (err) {
      setHistoryError(err.message || "Failed to load guide history");
    } finally {
      setHistoryLoading(false);
    }
  };

  // -------------------------------------------------------
  // COMPACT CARD MODE ....Dashboard
  // -------------------------------------------------------
  if (variant === "card") {
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
          <Typography
            sx={{ fontFamily: FONT, fontWeight: 800, fontSize: 14, color: "#341a1a" }}
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
              "&:hover": { color: "#1f57c9" },
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
              sx={{ fontFamily: FONT, fontWeight: 700, fontSize: 13.5, color: "#1a2434", mb: "3px" }}
            >
              {guide.name}
            </Typography>

            <Typography sx={{ fontFamily: FONT, color: "#6a7585", fontSize: 12.5 }}>
              Version {guide.version} · Updated {guide.updatedDate}
            </Typography>
          </Box>

          <Button
            variant="contained"
            startIcon={<FileDownloadRoundedIcon sx={{ fontSize: 16 }} />}
            onClick={onViewGuide}
            sx={{
              fontFamily: FONT,
              fontSize: 13,
              fontWeight: 700,
              textTransform: "none",
              whiteSpace: "nowrap",
              borderRadius: "8px",
              px: 2,
              py: 1,
              backgroundColor: "#2f6df0",
              boxShadow: "none",
              "&:hover": { backgroundColor: "#1f57c9", boxShadow: "none" },
            }}
          >
            View / Download
          </Button>
        </Box>
      </Card>
    );
  }

  // -------------------------------------------------------
  // FULL PAGE MODE (default)
  // -------------------------------------------------------
  if (loading) {
    return <Typography>Loading indexing guides...</Typography>;
  }

  if (!guide) {
    return (
      <Alert severity={error ? "error" : "info"}>
        {error || "No guides are available for your assigned projects."}
      </Alert>
    );
  }

  return (
    <Box sx={{ width: "100%" }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
        {guides.map((item) => (
          <Button
            key={item.version_id}
            disabled={saving}
            variant={
              String(item.version_id) === selectedVersionId
                ? "contained"
                : "outlined"
            }
            onClick={() => {
              setSelectedVersionId(String(item.version_id));
              setError("");
            }}
            sx={{ textTransform: "none", borderRadius: "8px" }}
          >
            {item.project_name} · {item.acknowledged ? "Read" : "Unread"}
          </Button>
        ))}
      </Box>

  {/* HEADER */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          mb: 2.3,
          gap: 2,
        }}
      >
        <Box>
          <Typography sx={{ color: "#6A7585", fontSize: 12.5, mb: 0.7 }}>
            ProdTrack · {roleLabel}
          </Typography>

          <Typography sx={{ fontSize: 22, fontWeight: 800, color: "#1A2434" }}>
            Indexing guide
          </Typography>

          <Typography sx={{ mt: 0.7, color: "#6A7585", fontSize: 13.5 }}>
            {guide.name.replace(/\sv[\d.]+$/, "")} — the latest approved version.
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 1, flexShrink: 0 }}>
          <Button
            variant="outlined"
            onClick={handleViewHistory}
            disabled={historyLoading}
            sx={{
              height: 36,
              borderRadius: "8px",
              textTransform: "none",
              color: "#1A2434",
              borderColor: "#d6dee9",
              backgroundColor: "#fff",
            }}
          >
            Version history
          </Button>

          <Button
            variant="contained"
            onClick={handleDownload}
            disabled={downloading}
            startIcon={<DownloadRoundedIcon />}
            sx={{
              height: 36,
              borderRadius: "8px",
              textTransform: "none",
              fontWeight: 700,
              boxShadow: "none",
              backgroundColor: "#2f6df6",
              "&:hover": { backgroundColor: "#2458cf", boxShadow: "none" },
            }}
          >
            Download
          </Button>
        </Box>
      </Box>
      
      {/* ACKNOWLEDGEMENT */}
      <Alert
        severity={guide.acknowledged ? "success" : "warning"}
        sx={{ mb: 2, borderRadius: "9px" }}
      >
        {guide.acknowledged ? (
          <Typography component="span" sx={{ fontSize: 13.5 }}>
            You have acknowledged {guide.version} for {guide.project_name}.
          </Typography>
        ) : (
          <Box>
            <Typography sx={{ fontSize: 13.5 }}>
              <strong>Acknowledgement pending.</strong>{" "}
              {guide.requiresAck
                ? `Read and acknowledge ${guide.version} before submitting entries for ${guide.project_name}.`
                : `You have not acknowledged ${guide.version} for ${guide.project_name}.`}
            </Typography>

            <Button
              type="button"
              disabled={saving}
              onClick={handleAcknowledge}
              sx={{
                mt: 0.5,
                p: 0,
                textTransform: "none",
                fontWeight: 700,
                textDecoration: "underline",
              }}
            >
              {saving ? "Saving..." : "Acknowledge now"}
            </Button>
          </Box>
        )}
      </Alert>

      {/* GUIDE CARD */}
      <Card
        elevation={0}
        sx={{
          border: "1px solid #dce3ec",
          borderRadius: "12px",
          boxShadow: "0 4px 14px rgba(15,23,42,.05)",
          overflow: "hidden",
          backgroundColor: "#fff",
        }}
      >
        <Box
          sx={{
            minHeight: 46,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 1.75,
            gap: 2,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 800, color: "#1A2434" }}>
              {guide.name}
            </Typography>

            <Chip
              label="LATEST"
              size="small"
              sx={{
                height: 23,
                backgroundColor: "#e3f7ed",
                color: "#177A53",
                border: "1px solid #b9e5d0",
                fontSize: 10.5,
                fontWeight: 800,
              }}
            />
          </Box>

          <Typography sx={{ color: "#6A7585", fontSize: 12.5, whiteSpace: "nowrap" }}>
            Document preview
          </Typography>
        </Box>

        <Divider />

        <Box sx={{ display: "flex", minHeight: 460 }}>
          {/* LEFT MENU */}
          <Box
            sx={{
              width: 205,
              borderRight: "1px solid #e2e7ee",
              p: 1.5,
              flexShrink: 0,
            }}
          >
            {/* Shows loading text while guide sections are coming from the backend. */}
            {sectionsLoading ? (
              <Typography
                sx={{
                  px: 1.25,
                  py: 1,
                  color: "#6A7585",
                  fontSize: 13,
                }}
              >
                Loading sections...
              </Typography>
            ) : sectionsError ? (
              // Shows the section API error without changing the existing page layout.
              <Typography
                sx={{
                  px: 1.25,
                  py: 1,
                  color: "#d32f2f",
                  fontSize: 13,
                }}
              >
                {sectionsError}
              </Typography>
            ) : guideSections.length === 0 ? (
              // Shows a message when this guide version has no configured sections.
              <Typography
                sx={{
                  px: 1.25,
                  py: 1,
                  color: "#6A7585",
                  fontSize: 13,
                }}
              >
                No sections available.
              </Typography>
            ) : (
              // Renders all guide sections returned by the backend.
              guideSections.map((section, index) => (
                <Box
                  key={section.section_id}
                  onClick={() => setSelected(index)}
                  sx={{
                    px: 1.25,
                    py: 1,
                    mb: 0.5,
                    borderRadius: "7px",
                    cursor: "pointer",

                    // Keeps the original selected-section background.
                    backgroundColor:
                      selected === index
                        ? "#e6efff"
                        : "transparent",

                    // Keeps the original selected-section text color.
                    color:
                      selected === index
                        ? "#2563eb"
                        : "#48566D",

                    // Keeps the original selected-section font weight.
                    fontWeight:
                      selected === index
                        ? 700
                        : 500,

                    fontSize: 13,
                  }}
                >
                  {/* Displays the section title stored in guide_section.title. */}
                  {section.title}
                </Box>
              ))
            )}
          </Box>

                    {/* CONTENT */}
          <Box
            sx={{
              flex: 1,
              px: 2.75,
              py: 2.5,
              minWidth: 0,

              // Styles backend HTML tables inside the existing preview block.
              "& table": {
                width: "100%",
                borderCollapse: "collapse",
                marginTop: "16px",
                marginBottom: "16px",
              },

              // Styles table headings like the original UI.
              "& th": {
                border: "1px solid #e2e8f0",
                backgroundColor: "#f8fafc",
                padding: "10px 12px",
                textAlign: "left",
                fontSize: 11,
                fontWeight: 700,
                color: "#6A7585",
                textTransform: "uppercase",
              },

              // Styles table values like the original UI.
              "& td": {
                border: "1px solid #e6ebf1",
                padding: "10px 12px",
                fontSize: 12,
                color: "#1A2434",
              },

              // Styles main section headings.
              "& h2": {
                marginTop: 0,
                marginBottom: "16px",
                fontSize: 18,
                fontWeight: 800,
                color: "#1A2434",
              },

              // Styles subsection headings.
              "& h3": {
                marginTop: "18px",
                marginBottom: "6px",
                fontSize: 14,
                fontWeight: 800,
                color: "#1A2434",
              },

              // Styles paragraph content.
              "& p": {
                fontSize: 13.5,
                lineHeight: 1.8,
                color: "#3A4648",
              },

              // Styles bullet-list content.
              "& ul": {
                paddingLeft: "22px",
                fontSize: 13.5,
                lineHeight: 1.9,
                color: "#3A4648",
              },
            }}
          >
            {/* Shows loading state while guide sections are loading. */}
            {sectionsLoading ? (
              <Typography
                sx={{
                  color: "#6A7585",
                  fontSize: 13.5,
                }}
              >
                Loading preview...
              </Typography>
            ) : sectionsError ? (
              // Shows an API error inside the existing preview block.
              <Alert severity="error">
                {sectionsError}
              </Alert>
            ) : guideSections.length === 0 ? (
              // Shows when this guide version has no configured sections.
              <Alert severity="info">
                No preview content is available for this guide version.
              </Alert>
            ) : guideSections[selected] ? (
              // Displays the selected backend section in this same block.
              <Box
                dangerouslySetInnerHTML={{
                  __html: guideSections[selected].content,
                }}
              />
            ) : (
              // Safe fallback when no section is selected.
              <Alert severity="info">
                Select a section to preview its content.
              </Alert>
            )}
          </Box>
        </Box>
      </Card>
      <Dialog
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        fullWidth
        maxWidth="md"
        aria-labelledby="guide-history-title"
      >
        <DialogTitle id="guide-history-title">
          Version history — {historyProject}
        </DialogTitle>

        <DialogContent dividers>
          {historyLoading ? (
            <Typography>Loading version history...</Typography>
          ) : historyError ? (
            <Alert severity="error">{historyError}</Alert>
          ) : history.length === 0 ? (
            <Alert severity="info">No guide versions found.</Alert>
          ) : (
            <Box sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Guide / version</TableCell>
                    <TableCell>Uploaded</TableCell>
                    <TableCell>Changes</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Acknowledgement</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {history.map((item) => (
                    <TableRow key={item.version_id}>
                      <TableCell>
                        <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                          {item.title}
                        </Typography>
                        {item.version}
                      </TableCell>

                      <TableCell>
                        {item.updated_date
                          ? new Date(item.updated_date).toLocaleDateString(
                              "en-IN"
                            )
                          : "—"}
                      </TableCell>

                      <TableCell>{item.description || "—"}</TableCell>

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
                        {Number(item.acknowledged) === 1 ? "Read" : "Unread"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setHistoryOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
      {ConfirmElement}
    </Box>
  );
}