
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
        // Downloads the original file into memory using JWT authentication.
        const blob = await apiDownload(
          `/guides/versions/${versionId}/preview`
        );

        // Stops processing if the viewer was closed.
        if (!active) return;

        // Reads the extension from the original uploaded file path.
        const extension = filePath
          .split(/[\\/]/)
          .pop()
          ?.split(".")
          .pop()
          ?.toLowerCase();

        // Reads the response MIME type.
        const mimeType = blob.type.toLowerCase();

        // Detects PDF files.
        const isPdf =
          mimeType.includes("application/pdf") ||
          extension === "pdf";

        // Detects modern Word files.
        const isDocx =
          mimeType.includes("wordprocessingml") ||
          extension === "docx";

        // Detects modern Excel files.
        const isXlsx =
          mimeType.includes("spreadsheetml.sheet") ||
          extension === "xlsx";

        // Detects legacy Office formats.
        const isLegacy =
          extension === "doc" ||
          extension === "xls" ||
          mimeType === "application/msword" ||
          mimeType === "application/vnd.ms-excel";

        // Displays PDFs through the browser's built-in PDF viewer.
        if (isPdf) {
          objectUrl = URL.createObjectURL(blob);
          setPreviewUrl(objectUrl);
          setFileType("pdf");
          return;
        }

        // Prepares DOCX files for the Word renderer.
        if (isDocx) {
          setWordBlob(blob);
          setFileType("word");
          return;
        }

        // Reads XLSX files directly in the browser.
        if (isXlsx) {
          // Creates an Excel workbook instance.
          const workbook = new ExcelJS.Workbook();

          // Loads the uploaded workbook.
          await workbook.xlsx.load(await blob.arrayBuffer());

          // Stops if the viewer was closed during parsing.
          if (!active) return;

          // Extracts each worksheet and its cell values.
          const sheets = workbook.worksheets.map((sheet) => {
            // Includes empty rows and columns within the used range.
            const rows = [];

            // Reads the worksheet rows.
            sheet.eachRow({ includeEmpty: true }, (row) => {
              // Stores cell values in their original column positions.
              const cells = [];

              // Reads each cell from column 1 through the used range.
              for (let col = 1; col <= sheet.columnCount; col++) {
                cells.push(getCellText(row.getCell(col).value));
              }

              // Adds the row to the worksheet.
              rows.push(cells);
            });

            // Returns the worksheet name and rows.
            return { name: sheet.name, rows };
          });

          // Stores the parsed worksheets.
          setWorksheets(sheets);
          setFileType("excel");
          return;
        }

        // Explains why older binary Office formats are not displayed.
        if (isLegacy) {
          throw new Error(
            "Legacy DOC/XLS preview needs an additional compatible renderer."
          );
        }

        // Rejects unknown formats.
        throw new Error("Unsupported guide file format.");
      } catch (err) {
        // Displays the error only while the viewer is active.
        if (active) {
          setError(err.message || "Failed to load guide preview.");
        }
      } finally {
        // Ends loading only while the viewer is active.
        if (active) setLoading(false);
      }
    };

    // Starts loading the selected guide.
    loadPreview();

    // Cleans up the temporary PDF URL.
    return () => {
      active = false;

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [open, versionId, filePath]);

  useEffect(() => {
    // Waits until the Word preview container is mounted.
    if (fileType !== "word" || !wordBlob || !wordContainerRef.current) {
      return;
    }

    // Prevents updates after cleanup.
    let active = true;

    // Gets the Word preview container.
    const container = wordContainerRef.current;

    // Clears the previous document.
    container.innerHTML = "";

    // Renders the DOCX document directly inside ProdTrack.
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
  }, [fileType, wordBlob]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Box>
          <Typography fontWeight={700}>{title}</Typography>

          <Typography variant="caption" color="text.secondary">
            Read-only guide preview
          </Typography>
        </Box>

        {/* Closes the preview dialog. */}
        <IconButton onClick={onClose}>
          <CloseRoundedIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ minHeight: 350 }}>
        {/* Displays a loading indicator. */}
        {loading && (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              py: 8,
            }}
          >
            <CircularProgress />
          </Box>
        )}

        {/* Displays errors returned by the API or renderer. */}
        {error && <Alert severity="error">{error}</Alert>}

        {/* Displays PDF guides. */}
        {!loading && !error && fileType === "pdf" && (
          <Box
            component="iframe"
            src={previewUrl}
            title={title}
            sx={{
              width: "100%",
              height: "75vh",
              border: 0,
            }}
          />
        )}

        {/* Displays DOCX guides. */}
        {!loading && !error && fileType === "word" && (
          <Box
            ref={wordContainerRef}
            sx={{
              height: "75vh",
              overflow: "auto",
              bgcolor: "#f5f5f5",
              "& .docx-wrapper": {
                backgroundColor: "#f5f5f5",
              },
            }}
          />
        )}

        {/* Displays XLSX guides. */}
        {!loading && !error && fileType === "excel" && (
          <Box sx={{ maxHeight: "75vh", overflow: "auto" }}>
            {worksheets.map((sheet, sheetIndex) => (
              <Box key={sheetIndex} sx={{ mb: 4 }}>
                {/* Displays the worksheet name. */}
                <Typography variant="h6" sx={{ mb: 2 }}>
                  {sheet.name}
                </Typography>

                {/* Displays worksheet data in a scrollable table. */}
                <Box sx={{ overflowX: "auto" }}>
                  <Box
                    component="table"
                    sx={{
                      borderCollapse: "collapse",
                      minWidth: "100%",
                      "& td": {
                        border: "1px solid #ddd",
                        padding: "8px",
                        fontSize: 13,
                        whiteSpace: "pre-wrap",
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
