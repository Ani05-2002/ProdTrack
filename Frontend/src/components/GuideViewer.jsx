
import { useEffect, useRef, useState } from "react";

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";

import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import KeyboardArrowUpRoundedIcon from "@mui/icons-material/KeyboardArrowUpRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import NavigateBeforeRoundedIcon from "@mui/icons-material/NavigateBeforeRounded";
import NavigateNextRoundedIcon from "@mui/icons-material/NavigateNextRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import RemoveRoundedIcon from "@mui/icons-material/RemoveRounded";

import { renderAsync } from "docx-preview";
import ExcelJS from "exceljs";

import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import "pdfjs-dist/web/pdf_viewer.css";

import { apiDownload } from "../lib/api.js";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

// Convert Excel cell values into readable text.
const getCellText = (cell) => {
  if (cell === null || cell === undefined) {
    return "";
  }

  if (cell instanceof Date) {
    return cell.toLocaleDateString();
  }

  if (typeof cell === "object") {
    if (cell.result !== undefined) {
      return String(cell.result ?? "");
    }

    if (cell.text !== undefined) {
      return String(cell.text ?? "");
    }

    if (Array.isArray(cell.richText)) {
      return cell.richText
        .map((item) => item.text || "")
        .join("");
    }

    return "";
  }

  return String(cell);
};

export default function GuideViewer({
  open,
  onClose,
  versionId,
  title = "Indexing Guide",
  filePath = "",
}) {
  // Document states.
  const [fileType, setFileType] = useState("");
  const [pdfBlob, setPdfBlob] = useState(null);
  const [wordBlob, setWordBlob] = useState(null);
  const [worksheets, setWorksheets] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Common search states.
  const [search, setSearch] = useState("");
  const [matches, setMatches] = useState([]);
  const [matchIndex, setMatchIndex] = useState(0);

  // PDF states.
  const [pdfReady, setPdfReady] = useState(false);
  const [pdfSearching, setPdfSearching] = useState(false);

  const [pdfMatches, setPdfMatches] = useState({
    current: 0,
    total: 0,
  });

  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [zoom, setZoom] = useState(100);

  const [wordReady, setWordReady] = useState(false);

  // Document references.
  const wordContainerRef = useRef(null);
  const excelContainerRef = useRef(null);

  const pdfContainerRef = useRef(null);
  const pdfElementRef = useRef(null);

  const pdfViewerRef = useRef(null);
  const eventBusRef = useRef(null);

  // =====================================================
  // LOAD SELECTED GUIDE
  // =====================================================

  useEffect(() => {
    if (!open || !versionId) return;

    let active = true;

    const loadPreview = async () => {
      setLoading(true);
      setError("");

      setFileType("");
      setPdfBlob(null);
      setWordBlob(null);
      setWorksheets([]);

      setSearch("");
      setMatches([]);
      setMatchIndex(0);

      setPdfReady(false);
      setPdfSearching(false);
      setPdfMatches({ current: 0, total: 0 });

      setPage(1);
      setPageCount(0);
      setZoom(100);
      setWordReady(false);

      try {
        const blob = await apiDownload(
          `/guides/versions/${versionId}/preview`
        );

        if (!active) return;

        const extension = filePath
          .split(/[\\/]/)
          .pop()
          ?.split(".")
          .pop()
          ?.toLowerCase();

        const mimeType = (
          blob.type || ""
        ).toLowerCase();

        const isPdf =
          mimeType.includes("application/pdf") ||
          extension === "pdf";

        const isDocx =
          mimeType.includes("wordprocessingml") ||
          extension === "docx";

        const isXlsx =
          mimeType.includes("spreadsheetml.sheet") ||
          extension === "xlsx";

        // PDF document.
        if (isPdf) {
          setPdfBlob(blob);
          setFileType("pdf");
          return;
        }

        // Word document.
        if (isDocx) {
          setWordBlob(blob);
          setFileType("word");
          return;
        }

        // Excel document.
        if (isXlsx) {
          const workbook = new ExcelJS.Workbook();

          await workbook.xlsx.load(
            await blob.arrayBuffer()
          );

          if (!active) return;

          const sheets = workbook.worksheets.map(
            (sheet) => {
              const rows = [];

              sheet.eachRow(
                { includeEmpty: true },
                (row) => {
                  const cells = [];

                  for (
                    let col = 1;
                    col <= sheet.columnCount;
                    col++
                  ) {
                    cells.push(
                      getCellText(
                        row.getCell(col).value
                      )
                    );
                  }

                  rows.push(cells);
                }
              );

              return {
                name: sheet.name,
                rows,
              };
            }
          );

          setWorksheets(sheets);
          setFileType("excel");
          return;
        }

        throw new Error(
          "Unsupported guide format. Please upload a PDF, DOCX or XLSX file."
        );
      } catch (err) {
        if (active) {
          setError(
            err.message ||
              "Failed to load guide preview."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadPreview();

    return () => {
      active = false;
    };
  }, [open, versionId, filePath]);

  // =====================================================
  // INITIALIZE SEARCHABLE PDF VIEWER
  // =====================================================

  useEffect(() => {
    if (
      !open ||
      loading ||
      fileType !== "pdf" ||
      !pdfBlob ||
      !pdfContainerRef.current
    ) {
      return;
    }

    let active = true;
    let loadingTask = null;
    let viewer = null;
    let linkService = null;
    let eventBus = null;

    const initializePdf = async () => {
      try {
        const {
          PDFViewer,
          PDFLinkService,
          PDFFindController,
          EventBus,
        } = await import(
          "pdfjs-dist/web/pdf_viewer.mjs"
        );

        const buffer = await pdfBlob.arrayBuffer();

        if (!active) return;

        eventBus = new EventBus();

        linkService = new PDFLinkService({
          eventBus,
        });

        const findController =
          new PDFFindController({
            eventBus,
            linkService,
          });

        viewer = new PDFViewer({
          container: pdfContainerRef.current,
          viewer: pdfElementRef.current,
          eventBus,
          linkService,
          findController,
          textLayerMode: 1,
          annotationEditorMode: -1,
          annotationMode: 1,
        });

        linkService.setViewer(viewer);

        pdfViewerRef.current = viewer;
        eventBusRef.current = eventBus;

        eventBus.on("pagesinit", () => {
          if (!active) return;

          viewer.currentScaleValue = "page-width";
          setPdfReady(true);
        });

        eventBus.on("pagechanging", (event) => {
          if (active) {
            setPage(event.pageNumber);
          }
        });

        eventBus.on("scalechanging", (event) => {
          if (active) {
            setZoom(
              Math.round(event.scale * 100)
            );
          }
        });

        eventBus.on(
          "updatefindmatchescount",
          (event) => {
            if (!active) return;

            setPdfMatches({
              current:
                event.matchesCount?.current || 0,
              total:
                event.matchesCount?.total || 0,
            });
          }
        );

        eventBus.on(
          "updatefindcontrolstate",
          (event) => {
            if (!active) return;

            setPdfSearching(event.state === 3);

            if (event.matchesCount) {
              setPdfMatches({
                current:
                  event.matchesCount.current || 0,
                total:
                  event.matchesCount.total || 0,
              });
            }
          }
        );

        loadingTask = pdfjsLib.getDocument({
          data: new Uint8Array(buffer),
          isEvalSupported: false,
          useSystemFonts: true,
        });

        const pdfDocument =
          await loadingTask.promise;

        if (!active) return;

        setPageCount(pdfDocument.numPages);

        linkService.setDocument(pdfDocument);
        viewer.setDocument(pdfDocument);
      } catch (err) {
        if (active) {
          setError(
            err.message || "Unable to load PDF."
          );
        }
      }
    };

    initializePdf();

    return () => {
      active = false;

      viewer?.setDocument(null);
      linkService?.setDocument(null);

      if (loadingTask) {
        loadingTask.destroy().catch(() => {});
      }

      pdfViewerRef.current = null;
      eventBusRef.current = null;
    };
  }, [open, loading, fileType, pdfBlob]);

  // =====================================================
  // RENDER WORD DOCUMENT
  // =====================================================

  useEffect(() => {
    if (
      !open ||
      loading ||
      fileType !== "word" ||
      !wordBlob ||
      !wordContainerRef.current
    ) {
      return;
    }

    let active = true;

    const container = wordContainerRef.current;
    const documentContent =
      document.createElement("div");

    setWordReady(false);
    container.replaceChildren();

    renderAsync(wordBlob, documentContent)
      .then(() => {
        if (!active) return;

        container.replaceChildren(documentContent);
        setWordReady(true);
      })
      .catch((err) => {
        if (active) {
          setError(
            err.message ||
              "Unable to render Word document."
          );
        }
      });

    return () => {
      active = false;
      container.replaceChildren();
    };
  }, [open, loading, fileType, wordBlob]);

  // =====================================================
  // PDF SEARCH
  // =====================================================

  const findPdf = (
    query,
    type = "",
    previous = false
  ) => {
    if (!pdfReady || !eventBusRef.current) {
      return;
    }

    eventBusRef.current.dispatch("find", {
      source: eventBusRef.current,
      type,
      query: query.trim(),
      phraseSearch: true,
      caseSensitive: false,
      entireWord: false,
      highlightAll: true,
      findPrevious: previous,
      matchDiacritics: false,
    });
  };

  useEffect(() => {
    if (
      !open ||
      !pdfReady ||
      fileType !== "pdf" ||
      !eventBusRef.current
    ) {
      return;
    }

    setPdfMatches({
      current: 0,
      total: 0,
    });

    if (!search.trim()) {
      setPdfSearching(false);

      eventBusRef.current.dispatch(
        "find",
        {
          source: eventBusRef.current,
          type: "",
          query: "",
          highlightAll: false,
          caseSensitive: false,
          entireWord: false,
          findPrevious: false,
        }
      );

      eventBusRef.current.dispatch(
        "findbarclose",
        { source: eventBusRef.current }
      );

      return;
    }

    setPdfSearching(true);

    const timer = setTimeout(() => {
      eventBusRef.current?.dispatch("find", {
        source: eventBusRef.current,
        type: "",
        query: search.trim(),
        phraseSearch: true,
        caseSensitive: false,
        entireWord: false,
        highlightAll: true,
        findPrevious: false,
        matchDiacritics: false,
      });
    }, 200);

    return () => clearTimeout(timer);
  }, [open, search, pdfReady, fileType]);

  // =====================================================
  // WORD AND EXCEL SEARCH
  // =====================================================

  useEffect(() => {
    const registry = globalThis.CSS?.highlights;

    registry?.delete("prodtrack-match");
    registry?.delete("prodtrack-current");

    setMatches([]);
    setMatchIndex(0);

    if (
      !open ||
      loading ||
      !search.trim() ||
      !["word", "excel"].includes(fileType)
    ) {
      return;
    }

    if (fileType === "word" && !wordReady) {
      return;
    }

    const container =
      fileType === "word"
        ? wordContainerRef.current
        : excelContainerRef.current;

    if (!container) return;

    // Escape special characters in the search text.
    const escapedSearch = search
      .trim()
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const expression = new RegExp(
      escapedSearch,
      "gi"
    );

    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          if (
            node.parentElement?.closest(
              "style, script, [data-no-search]"
            )
          ) {
            return NodeFilter.FILTER_REJECT;
          }

          return NodeFilter.FILTER_ACCEPT;
        },
      }
    );

    const results = [];
    let node;

    while ((node = walker.nextNode())) {
      const text = node.textContent || "";

      expression.lastIndex = 0;

      let match;

      while ((match = expression.exec(text))) {
        const range = document.createRange();

        range.setStart(node, match.index);

        range.setEnd(
          node,
          match.index + match[0].length
        );

        results.push(range);
      }
    }

    // Highlight matching words.
    if (
      registry &&
      typeof globalThis.Highlight === "function"
    ) {
      const highlight = new Highlight();

      results.forEach((range) => {
        highlight.add(range);
      });

      registry.set(
        "prodtrack-match",
        highlight
      );
    }

    setMatches(results);
    setMatchIndex(0);

    return () => {
      registry?.delete("prodtrack-match");
      registry?.delete("prodtrack-current");
    };
  }, [
    open,
    search,
    loading,
    fileType,
    wordReady,
    worksheets,
  ]);

  // Scroll to the current search result.
  useEffect(() => {
    if (!open || !matches.length) return;

    const range = matches[matchIndex];

    if (
      !range ||
      !range.startContainer.isConnected
    ) {
      return;
    }

    if (
      globalThis.CSS?.highlights &&
      typeof globalThis.Highlight === "function"
    ) {
      CSS.highlights.set(
        "prodtrack-current",
        new Highlight(range)
      );
    }

    range.startContainer.parentElement
      ?.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });
  }, [open, matches, matchIndex]);

  // =====================================================
  // SEARCH NAVIGATION
  // =====================================================

  const totalMatches =
    fileType === "pdf"
      ? pdfMatches.total
      : matches.length;

  const currentMatch =
    fileType === "pdf"
      ? pdfMatches.current
      : matches.length
        ? matchIndex + 1
        : 0;

  const nextMatch = () => {
    if (!search.trim()) return;

    if (fileType === "pdf") {
      findPdf(search, "again", false);
      return;
    }

    if (!matches.length) return;

    setMatchIndex(
      (previous) =>
        (previous + 1) % matches.length
    );
  };

  const previousMatch = () => {
    if (!search.trim()) return;

    if (fileType === "pdf") {
      findPdf(search, "again", true);
      return;
    }

    if (!matches.length) return;

    setMatchIndex(
      (previous) =>
        (
          previous -
          1 +
          matches.length
        ) % matches.length
    );
  };

  const clearSearch = () => {
    setSearch("");
    setMatches([]);
    setMatchIndex(0);

    setPdfMatches({
      current: 0,
      total: 0,
    });
  };

  // =====================================================
  // PDF PAGE AND ZOOM CONTROLS
  // =====================================================

  const changePage = (nextPage) => {
    if (!pdfViewerRef.current) return;

    pdfViewerRef.current.currentPageNumber =
      Math.min(
        Math.max(nextPage, 1),
        pageCount
      );
  };

  const changeZoom = (direction) => {
    const viewer = pdfViewerRef.current;

    if (!viewer) return;

    viewer.currentScale = Math.min(
      Math.max(
        viewer.currentScale *
          (direction > 0 ? 1.1 : 1 / 1.1),
        0.25
      ),
      4
    );
  };

  const fitWidth = () => {
    if (pdfViewerRef.current) {
      pdfViewerRef.current.currentScaleValue =
        "page-width";
    }
  };

  const searchReady =
    !loading &&
    !error &&
    (
      fileType === "excel" ||
      (fileType === "word" && wordReady) ||
      (fileType === "pdf" && pdfReady)
    );

  // =====================================================
  // GUIDE VIEWER UI
  // =====================================================

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
      slotProps={{
        paper: {
          sx: {
            m: 0,
            width: "100vw",
            maxWidth: "100vw",
            height: "100dvh",
            maxHeight: "100dvh",
            borderRadius: 0,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          },
        },
      }}
    >
      {/* Search highlight styling. */}

      <style>
        {`
          ::highlight(prodtrack-match) {
            background-color: #ffeb3b;
            color: #000;
          }

          ::highlight(prodtrack-current) {
            background-color: #ff9800;
            color: #000;
          }
        `}
      </style>

      {/* Guide title and close button. */}

      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexShrink: 0,
          gap: 2,
          borderBottom: "1px solid #dbe3ed",
          px: 2.5,
          py: 1.25,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography
            fontWeight={700}
            noWrap
          >
            {title}
          </Typography>

          <Typography
            variant="caption"
            color="text.secondary"
          >
            Read-only guide preview
          </Typography>
        </Box>

        <IconButton
          onClick={onClose}
          aria-label="Close guide"
        >
          <CloseRoundedIcon />
        </IconButton>
      </DialogTitle>

      {/* ===============================================
          ALWAYS VISIBLE SEARCH TOOLBAR
          This is outside the document content.
          It will appear even for empty Excel files.
      =============================================== */}

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          flexShrink: 0,
          gap: 1,
          px: 2,
          py: 1.25,
          backgroundColor: "#f5f8fc",
          borderBottom: "1px solid #dbe3ed",
        }}
      >
        <TextField
          size="small"
          placeholder="Search inside guide..."
          value={search}
          disabled={!searchReady}
          onChange={(event) =>
            setSearch(event.target.value)
          }
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();

              if (event.shiftKey) {
                previousMatch();
              } else {
                nextMatch();
              }
            }
          }}
          sx={{
            width: {
              xs: "100%",
              sm: 360,
            },

            backgroundColor: "#ffffff",

            "& .MuiOutlinedInput-root": {
              borderRadius: "8px",
            },
          }}
          slotProps={{
            htmlInput: {
              "aria-label": "Search inside guide",
            },

            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon
                    fontSize="small"
                    sx={{
                      color: "#6b7b90",
                    }}
                  />
                </InputAdornment>
              ),

              endAdornment: search ? (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={clearSearch}
                    aria-label="Clear search"
                  >
                    <CloseRoundedIcon
                      fontSize="small"
                    />
                  </IconButton>
                </InputAdornment>
              ) : null,
            },
          }}
        />

        {/* Search result count. */}

        <Typography
          variant="body2"
          sx={{
            fontSize: 12.5,
            color:
              search.trim() &&
              totalMatches === 0 &&
              !pdfSearching
                ? "#d32f2f"
                : "#64748b",
            minWidth: 85,
          }}
        >
          {!search.trim()
            ? "Find in guide"
            : fileType === "pdf" && pdfSearching
              ? "Searching..."
              : totalMatches > 0
                ? `${currentMatch} of ${totalMatches}`
                : "No results"}
        </Typography>

        {/* Previous search result. */}

        <Tooltip title="Previous result">
          <span>
            <IconButton
              size="small"
              disabled={!totalMatches}
              onClick={previousMatch}
              aria-label="Previous result"
              sx={{
                border: "1px solid #dbe3ed",
                borderRadius: "7px",
              }}
            >
              <KeyboardArrowUpRoundedIcon />
            </IconButton>
          </span>
        </Tooltip>

        {/* Next search result. */}

        <Tooltip title="Next result">
          <span>
            <IconButton
              size="small"
              disabled={!totalMatches}
              onClick={nextMatch}
              aria-label="Next result"
              sx={{
                border: "1px solid #dbe3ed",
                borderRadius: "7px",
              }}
            >
              <KeyboardArrowDownRoundedIcon />
            </IconButton>
          </span>
        </Tooltip>

        {search.trim() && (
          <Button
            size="small"
            onClick={clearSearch}
            sx={{
              textTransform: "none",
              fontWeight: 600,
            }}
          >
            Clear
          </Button>
        )}
      </Box>

      {/* PDF navigation toolbar. */}

      {fileType === "pdf" && !error && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 1,
            flexWrap: "wrap",
            flexShrink: 0,
            backgroundColor: "#323639",
            color: "#ffffff",
            py: 0.75,
          }}
        >
          <IconButton
            size="small"
            disabled={!pdfReady || page <= 1}
            onClick={() => changePage(page - 1)}
            aria-label="Previous page"
            sx={{ color: "#ffffff" }}
          >
             <NavigateBeforeRoundedIcon />
          </IconButton>

          <Typography variant="body2">
            Page {page} / {pageCount || "—"}
          </Typography>

          <IconButton
            size="small"
            disabled={
              !pdfReady || page >= pageCount
            }
            onClick={() => changePage(page + 1)}
            aria-label="Next page"
            sx={{ color: "#ffffff" }}
          >
            <NavigateNextRoundedIcon />
          </IconButton>

          <Box
            sx={{
              height: 24,
              borderLeft: "1px solid #666",
              mx: 1,
            }}
          />

          <IconButton
            size="small"
            onClick={() => changeZoom(-1)}
            disabled={!pdfReady}
            aria-label="Zoom out"
            sx={{ color: "#ffffff" }}
          >
            <RemoveRoundedIcon />
          </IconButton>

          <Typography variant="body2">
            {zoom}%
          </Typography>

          <IconButton
            size="small"
            onClick={() => changeZoom(1)}
            disabled={!pdfReady}
            aria-label="Zoom in"
            sx={{ color: "#ffffff" }}
          >
            <AddRoundedIcon />
          </IconButton>

          <Button
            size="small"
            disabled={!pdfReady}
            onClick={fitWidth}
            sx={{
              color: "#ffffff",
              textTransform: "none",
            }}
          >
            Fit width
          </Button>
        </Box>
      )}

      {/* Main document content. */}

      <DialogContent
        sx={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
          p: 0,
          width: "100%",
        }}
      >
        {/* Loading indicator. */}

        {loading && (
          <Box
            sx={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
            }}
          >
            <CircularProgress size={26} />

            <Typography variant="body2">
              Loading guide...
            </Typography>
          </Box>
        )}

        {/* Display errors. */}

        {error && (
          <Alert
            severity="error"
            sx={{ m: 2 }}
          >
            {error}
          </Alert>
        )}

        {/* PDF guide content. */}

        {open &&
          !loading &&
          !error &&
          fileType === "pdf" && (
            <Box
              sx={{
                position: "relative",
                flex: 1,
                minHeight: 0,
                bgcolor: "#525659",
                overflow: "hidden",

                "& .textLayer .highlight": {
                  backgroundColor:
                    "rgba(255, 225, 0, 0.55) !important",
                },

                "& .textLayer .highlight.selected": {
                  backgroundColor:
                    "rgba(255, 145, 0, 0.85) !important",
                },
              }}
            >
              <Box
                ref={pdfContainerRef}
                sx={{
                  position: "absolute",
                  inset: 0,
                  overflow: "auto",
                }}
              >
                <div
                  ref={pdfElementRef}
                  className="pdfViewer"
                />
              </Box>

              {!pdfReady && (
                <Box
                  sx={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    pointerEvents: "none",
                  }}
                >
                  <CircularProgress
                    sx={{ color: "#ffffff" }}
                  />
                </Box>
              )}
            </Box>
          )}

        {/* Word guide content. */}

        {!loading &&
          !error &&
          fileType === "word" && (
            <Box
              ref={wordContainerRef}
              sx={{
                flex: 1,
                minHeight: 0,
                width: "100%",
                overflow: "auto",
                bgcolor: "#f5f5f5",

                "& .docx-wrapper": {
                  backgroundColor: "#f5f5f5",
                  padding: "20px",
                },

                "& .docx": {
                  maxWidth: "100%",
                },
              }}
            />
          )}

        {/* Excel guide content. */}

        {!loading &&
          !error &&
          fileType === "excel" && (
            <Box
              ref={excelContainerRef}
              sx={{
                flex: 1,
                minHeight: 0,
                overflow: "auto",
                width: "100%",
                p: 2,
              }}
            >
              {worksheets.map(
                (sheet, sheetIndex) => (
                  <Box
                    key={sheetIndex}
                    sx={{ mb: 4 }}
                  >
                    {/* Worksheet name. */}

                    <Typography
                      variant="h6"
                      data-no-search
                      sx={{
                        mb: 2,
                        fontWeight: 700,
                        fontSize: 16,
                      }}
                    >
                      {sheet.name}
                    </Typography>

                    {/* Empty sheet message. */}

                    {!sheet.rows.some(
                      (row) =>
                        row.some(
                          (cell) =>
                            String(cell).trim() !== ""
                        )
                    ) ? (
                      <Alert
                        severity="info"
                        data-no-search
                        sx={{
                          borderRadius: "8px",
                        }}
                      >
                        This worksheet is empty.
                      </Alert>
                    ) : (
                      <Box
                        sx={{
                          overflowX: "auto",
                        }}
                      >
                        <Box
                          component="table"
                          sx={{
                            borderCollapse:
                              "collapse",
                            minWidth: "100%",
                            backgroundColor:
                              "#ffffff",

                            "& td": {
                              border:
                                "1px solid #dbe3ed",
                              padding: "8px",
                              fontSize: 13,
                              whiteSpace:
                                "pre-wrap",
                              minWidth: "80px",
                            },

                            "& tr:hover": {
                              backgroundColor:
                                "#f5f8fc",
                            },
                          }}
                        >
                          <tbody>
                            {sheet.rows.map(
                              (row, rowIndex) => (
                                <tr key={rowIndex}>
                                  {row.map(
                                    (
                                      cell,
                                      cellIndex
                                    ) => (
                                      <td
                                        key={
                                          cellIndex
                                        }
                                      >
                                        {cell}
                                      </td>
                                    )
                                  )}
                                </tr>
                              )
                            )}
                          </tbody>
                        </Box>
                      </Box>
                    )}
                  </Box>
                )
              )}

              {worksheets.length === 0 && (
                <Alert severity="info" data-no-search>
                  No worksheets available.
                </Alert>
              )}
            </Box>
          )}
      </DialogContent>
    </Dialog>
  );
}
