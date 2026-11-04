import { useEffect, useRef, useState } from "react";

// Imports Material UI components for the guide preview.
import {
  Alert,
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from "@mui/material";

// Imports the close icon.
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";

// Imports the Word document renderer.
import { renderAsync } from "docx-preview";

// Imports the Excel workbook reader.
import ExcelJS from "exceljs";

// Imports the authenticated API helper.
import { apiDownload } from "../lib/api.js";

// Converts Excel cell values into readable text.
const getCellText = (cell) => {
  // Handles empty cells.
  if (cell === null || cell === undefined) return "";

  // Handles dates.
  if (cell instanceof Date) return cell.toLocaleDateString();

  // Handles formula, hyperlink and rich-text objects.
  if (typeof cell === "object") {
    if (cell.result !== undefined) return String(cell.result ?? "");
    if (cell.text !== undefined) return String(cell.text ?? "");

    if (Array.isArray(cell.richText)) {
      return cell.richText.map((item) => item.text || "").join("");
    }

    return "";
  }

  // Handles ordinary text and numbers.
  return String(cell);
};

// Displays uploaded guides inside ProdTrack.
export default function GuideViewer({
  open,
  onClose,
  versionId,
  title = "Indexing Guide",
  filePath = "",
}) {
  // Stores the temporary PDF URL.
  const [previewUrl, setPreviewUrl] = useState("");

  // Stores the detected document format.
  const [fileType, setFileType] = useState("");

  // Stores the Word document Blob.
  const [wordBlob, setWordBlob] = useState(null);

  // Stores Excel worksheet data.
  const [worksheets, setWorksheets] = useState([]);

  // Tracks document loading.
  const [loading, setLoading] = useState(false);

  // Stores preview errors.
  const [error, setError] = useState("");

  // References the Word document display container.
  const wordContainerRef = useRef(null);

  // Loads the selected guide when the viewer opens.
  useEffect(() => {
    // Skips requests when the dialog is closed.
    if (!open || !versionId) return;

    // Prevents updates after cleanup.
    let active = true;

    // Stores the PDF object URL for cleanup.
    let objectUrl = "";

    // Fetches the original guide file.
    const loadPreview = async () => {
      // Resets previous preview information.
      setLoading(true);
      setError("");
      setPreviewUrl("");
      setFileType("");
      setWordBlob(null);
      setWorksheets([]);

      try {
        // Downloads the guide using the authenticated API.
        const blob = await apiDownload(
          `/guides/versions/${versionId}/preview`
        );

        // Stops processing if the viewer was closed.
        if (!active) return;

        // Reads the extension from the uploaded file path.
        const extension = filePath
          .split(/[\\/]/)
          .pop()
          ?.split(".")
          .pop()
          ?.toLowerCase();

        // Reads the response MIME type safely.
        const mimeType = (blob.type || "").toLowerCase();

        // Detects PDF files.
        const isPdf =
          mimeType.includes("application/pdf") ||
          extension === "pdf";

        // Detects modern Word documents.
        const isDocx =
          mimeType.includes("wordprocessingml") ||
          extension === "docx";

        // Detects modern Excel workbooks.
        const isXlsx =
          mimeType.includes("spreadsheetml.sheet") ||
          extension === "xlsx";

        // Detects older DOC and XLS file formats.
        const isLegacy =
          extension === "doc" ||
          extension === "xls" ||
          mimeType === "application/msword" ||
          mimeType === "application/vnd.ms-excel";

        // Displays PDF documents using the browser PDF viewer.
        if (isPdf) {
          objectUrl = URL.createObjectURL(blob);
          setPreviewUrl(objectUrl);
          setFileType("pdf");
          return;
        }

        // Prepares DOCX documents for rendering.
        if (isDocx) {
          setWordBlob(blob);
          setFileType("word");
          return;
        }

        // Reads XLSX documents in the browser.
        if (isXlsx) {
          // Creates an Excel workbook.
          const workbook = new ExcelJS.Workbook();

          // Loads the uploaded workbook.
          await workbook.xlsx.load(await blob.arrayBuffer());

          // Stops if the viewer closed during parsing.
          if (!active) return;

          // Extracts each worksheet and its cell values.
          const sheets = workbook.worksheets.map((sheet) => {
            // Stores the worksheet rows.
            const rows = [];

            // Reads worksheet rows, including empty rows in the used range.
            sheet.eachRow({ includeEmpty: true }, (row) => {
              // Stores the cell values in column order.
              const cells = [];

              // Reads each cell in the row.
              for (let col = 1; col <= sheet.columnCount; col++) {
                cells.push(getCellText(row.getCell(col).value));
              }

              // Adds the row to the worksheet data.
              rows.push(cells);
            });

            // Returns the worksheet name and its rows.
            return {
              name: sheet.name,
              rows,
            };
          });

          // Stores the parsed worksheets.
          setWorksheets(sheets);
          setFileType("excel");
          return;
        }

        // Explains why older binary Office formats are unsupported.
        if (isLegacy) {
          throw new Error(
            "Legacy DOC/XLS preview needs an additional compatible renderer."
          );
        }

        // Rejects unsupported file formats.
        throw new Error("Unsupported guide file format.");
      } catch (err) {
        // Displays errors only while the viewer is active.
        if (active) {
          setError(err.message || "Failed to load guide preview.");
        }
      } finally {
        // Ends loading only while the viewer is active.
        if (active) {
          setLoading(false);
        }
      }
    };

    // Starts loading the selected guide.
    loadPreview();

    // Cleans up the temporary PDF URL when the viewer closes.
    return () => {
      active = false;

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [open, versionId, filePath]);

  // Renders DOCX documents after their container is mounted.
  useEffect(() => {
    // Waits until the Word preview container is ready.
    if (
      !open ||
      fileType !== "word" ||
      !wordBlob ||
      !wordContainerRef.current
    ) {
      return;
    }

    // Prevents updates after cleanup.
    let active = true;

    // Gets the Word preview container.
    const container = wordContainerRef.current;

    // Clears any previous document content.
    container.innerHTML = "";

    // Renders the Word document inside the viewer.
    renderAsync(wordBlob, container).catch((err) => {
      if (active) {
        setError(err.message || "Unable to render Word document.");
      }
    });

    // Cleans up the rendered document.
    return () => {
      active = false;
      container.innerHTML = "";
    };
  }, [open, fileType, wordBlob]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
      PaperProps={{
        sx: {
          // Removes the default dialog margin.
          m: 0,

          // Uses the full browser viewport width.
          width: "100vw",
          maxWidth: "100vw",

          // Uses the full available viewport height.
          height: "100vh",
          height: "100dvh",
          maxHeight: "100dvh",

          // Removes rounded popup corners.
          borderRadius: 0,

          // Keeps the toolbar and document in one layout.
          display: "flex",
          flexDirection: "column",

          // Keeps scrolling inside the document viewer.
          overflow: "hidden",
        },
      }}
    >
      {/* Full-screen toolbar containing the guide title and close button. */}
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 2,
          flexShrink: 0,
          borderBottom: "1px solid",
          borderColor: "divider",
          px: { xs: 1.5, sm: 2.5 },
          py: 1.25,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography fontWeight={700} noWrap>
            {title}
          </Typography>

          <Typography variant="caption" color="text.secondary">
            Read-only guide preview
          </Typography>
        </Box>

        {/* Closes the full-screen guide viewer. */}
        <IconButton
          onClick={onClose}
          aria-label="Close guide preview"
        >
          <CloseRoundedIcon />
        </IconButton>
      </DialogTitle>

      {/* Main document area fills the remaining screen. */}
      <DialogContent
        dividers
        sx={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
          width: "100%",
          p: { xs: 1, sm: 1.5 },
        }}
      >
        {/* Shows a loading indicator while the guide is fetched. */}
        {loading && (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              flex: 1,
              minHeight: 0,
            }}
          >
            <CircularProgress />
          </Box>
        )}

        {/* Shows API or document-rendering errors. */}
        {error && <Alert severity="error">{error}</Alert>}

        {/* Displays PDF guides at full available size. */}
        {!loading && !error && fileType === "pdf" && (
          <Box
            component="iframe"
            src={previewUrl}
            title={title}
            sx={{
              display: "block",
              width: "100%",
              height: "100%",
              flex: 1,
              minHeight: 0,
              border: 0,
            }}
          />
        )}

        {/* Displays DOCX guides with full-height scrolling. */}
        {!loading && !error && fileType === "word" && (
          <Box
            ref={wordContainerRef}
            sx={{
              width: "100%",
              height: "100%",
              flex: 1,
              minHeight: 0,
              overflow: "auto",
              bgcolor: "#f5f5f5",

              // Keeps Word document pages centered in the viewer.
              "& .docx-wrapper": {
                backgroundColor: "#f5f5f5",
                padding: { xs: "8px", sm: "20px" },
              },

              // Prevents wide Word pages from overflowing the viewer.
              "& .docx": {
                maxWidth: "100%",
              },
            }}
          />
        )}

        {/* Displays XLSX guides with horizontal and vertical scrolling. */}
        {!loading && !error && fileType === "excel" && (
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              overflow: "auto",
              width: "100%",
            }}
          >
            {worksheets.map((sheet, sheetIndex) => (
              <Box key={sheetIndex} sx={{ mb: 4 }}>
                {/* Displays the worksheet name. */}
                <Typography variant="h6" sx={{ mb: 2 }}>
                  {sheet.name}
                </Typography>

                {/* Allows wide spreadsheet tables to scroll horizontally. */}
                <Box sx={{ overflowX: "auto" }}>
                  <Box
                    component="table"
                    sx={{
                      borderCollapse: "collapse",
                      minWidth: "100%",
                      backgroundColor: "#ffffff",

                      // Styles spreadsheet cells.
                      "& td": {
                        border: "1px solid #ddd",
                        padding: "8px",
                        fontSize: 13,
                        whiteSpace: "pre-wrap",
                        minWidth: "80px",
                      },
                    }}
                  >
                    <tbody>
                      {sheet.rows.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          {row.map((cell, cellIndex) => (
                            <td key={cellIndex}>{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}