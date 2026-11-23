
import { useEffect, useState, useRef } from "react";

import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";

import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";

import apiRequest from "../lib/api.js";
import SpreadsheetEditor from "./SpreadsheetEditor.jsx";

import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";

import {
  downloadAllDailyWorkStatements,
} from "../lib/downloadAllDailyWorkStatements.js";


// ============================================================
// CURRENT DATE IN IST
// ============================================================

const todayIST = () =>
  new Date(Date.now() + 330 * 60000)
    .toISOString()
    .slice(0, 10);

// ============================================================
// GLASS UI
// ============================================================

const glassSx = {
  background: "rgba(255,255,255,0.75)",

  backdropFilter: "blur(16px)",

  border: "1px solid rgba(255,255,255,0.65)",

  borderRadius: "16px",

  boxShadow: "0 8px 24px rgba(15,23,42,0.06)",
};

// ============================================================
// READ-ONLY WORKBOOK VIEWER
// ============================================================

function WorkbookViewer({
  statementId,
  onClose,
}) {
  const [statement, setStatement] =
    useState(null);

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const viewerRef = useRef(null);

  useEffect(() => {
    if (!loading) {
      viewerRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [statementId, loading]);


  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError("");
    setStatement(null);

    async function loadWorkbook() {
      try {
        const data = await apiRequest(
          `/daily-work-statements/reports/${encodeURIComponent(
            statementId
          )}`
        );

        if (
          !data.success ||
          !data.statement?.workbookData
        ) {
          throw new Error(
            data.message ||
            "Unable to open workbook."
          );
        }

        if (!cancelled) {
          setStatement(data.statement);
        }

      } catch (err) {
        if (!cancelled) {
          setError(err.message);
        }

      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadWorkbook();

    return () => {
      cancelled = true;
    };

  }, [statementId]);

  return (

    <Paper
      ref={viewerRef}
      elevation={0}
      sx={{
        ...glassSx,
        p: 2,
        mt: 3,
        minWidth: 0,
        scrollMarginTop: "20px",
      }}
    >

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 2,
          mb: 2,
        }}
      >
        <Box>
          <Typography
            sx={{
              fontWeight: 700,
              color: "#10243e",
            }}
          >
            {statement?.employeeName ||
              "Daily Work Statement"}
          </Typography>

          <Typography
            sx={{
              fontSize: 12,
              color: "#64748b",
            }}
          >
            {statement?.productionDate}{" "}
            {statement?.shiftName || ""}
          </Typography>
        </Box>

        <Button
          startIcon={<CloseRoundedIcon />}
          onClick={onClose}
          sx={{ textTransform: "none" }}
        >
          Close
        </Button>
      </Box>

      {loading && (
        <CircularProgress size={28} />
      )}


      {error && (
        <Alert severity="error">
          {error}
        </Alert>
      )}

      {!loading && !error && statement && (
        <SpreadsheetEditor
          initialWorkbook={statement.workbookData}
          readOnly={true}
          height={650}
        />
      )}
    </Paper>
  );
}

// ============================================================
// DAILY WORK STATEMENT REPORTS
// ============================================================

export default function DailyWorkStatementReports({
  searchTarget = null,
}) {

  const [date, setDate] = useState(() => {
    const targetDate = searchTarget?.productionDate;

    return (
      searchTarget?.resultType === "statement" &&
      /^\d{4}-\d{2}-\d{2}$/.test(targetDate || "")
    )
      ? targetDate
      : todayIST();
  });


  const [search, setSearch] =
    useState("");

  const [report, setReport] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [selectedId, setSelectedId] =
    useState(null);

  const [reload, setReload] =
    useState(0);

  const [searchNotice, setSearchNotice] = useState("");

  const [downloading, setDownloading] =
    useState(false);

  const [
    downloadProgress,
    setDownloadProgress,
  ] = useState({
    completed: 0,
    total: 0,
  });

  const [
    downloadError,
    setDownloadError,
  ] = useState("");


  useEffect(() => {
    if (
      searchTarget?.source !== "global-search" ||
      searchTarget?.resultType !== "statement" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(
        searchTarget.productionDate || ""
      )
    ) {
      return;
    }

    setDate(searchTarget.productionDate);
    setSearch("");
  }, [searchTarget]);


  // ==========================================================
  // FETCH MANAGEMENT REPORTS
  // ==========================================================

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError("");
    setReport(null);
    setSelectedId(null);

    async function loadReports() {
      try {
        const data = await apiRequest(
          `/daily-work-statements/reports?date=${encodeURIComponent(
            date
          )}`
        );

        if (!data.success) {
          throw new Error(
            data.message ||
            "Unable to load statements."
          );
        }


        if (!cancelled) {
          setReport(data);

          // Check whether navigation came from Global Search.

          const isSearchSelection =
            searchTarget?.source === "global-search" &&
            searchTarget?.resultType === "statement" &&
            searchTarget?.productionDate === date &&
            searchTarget?.statementId != null;

          if (isSearchSelection) {
            // Find the exact submitted statement.

            const matchingRow = (
              data.statements || []
            ).find((row) =>
              row.status === "submitted" &&
              String(row.statementId) ===
              String(searchTarget.statementId)
            );

            if (matchingRow) {
              // Opens the existing read-only WorkbookViewer.

              setSelectedId(
                String(matchingRow.statementId)
              );

              setSearchNotice("");
            } else {
              setSelectedId(null);

              setSearchNotice(
                "The selected statement is not available " +
                "for this date or your account."
              );
            }
          }
        }


      } catch (err) {
        if (!cancelled) {
          setError(err.message);
        }

      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadReports();

    return () => {
      cancelled = true;
    };

  }, [date, reload, searchTarget]);

  // ==========================================================
  // EMPLOYEE NAME SEARCH
  // ==========================================================

  const rows = (
    report?.statements || []
  ).filter((row) =>
    String(row.employeeName || "")
      .toLowerCase()
      .includes(
        search.trim().toLowerCase()
      )
  );

  const summary = report?.summary;


  const handleDownloadAll = async () => {
    if (
      downloading ||
      loading ||
      error ||
      !report
    ) {
      return;
    }

    setDownloading(true);

    setDownloadError("");

    setDownloadProgress({
      completed: 0,
      total: 0,
    });

    try {
      await downloadAllDailyWorkStatements({
        statements: report.statements,
        productionDate: date,
        onProgress: setDownloadProgress,
      });

    } catch (err) {
      setDownloadError(
        err.message ||
        "Failed to download daily work statements."
      );

    } finally {
      setDownloading(false);
    }
  };


  // ==========================================================
  // REPORTS UI
  // ==========================================================

  return (
    <Box
      sx={{
        width: "100%",
        minWidth: 0,
        pb: 3,
      }}
    >
      {/* PAGE HEADER */}

      <Typography
        sx={{
          fontSize: 22,
          fontWeight: 800,
          color: "#10243e",
        }}
      >
        Daily Work Statements
      </Typography>

      <Typography
        sx={{
          fontSize: 13,
          color: "#64748b",
          mb: 2.5,
        }}
      >
        View complete daily workbooks submitted
        by Indexers.
      </Typography>

      {/* SUMMARY CARDS */}

      <Box
        sx={{
          display: "grid",

          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(3, minmax(0, 1fr))",
          },

          gap: 2,
          mb: 2.5,
        }}
      >
        {[
          [
            "Total Indexers",
            summary?.total,
            "#10243e",
          ],

          [
            "Submitted",
            summary?.submitted,
            "#15803d",
          ],

          [
            "Not Submitted",
            summary?.notSubmitted,
            "#b7791f",
          ],

        ].map(([label, value, color]) => (
          <Paper
            key={label}
            elevation={0}
            sx={{
              ...glassSx,
              p: 2,
            }}
          >
            <Typography
              sx={{
                fontSize: 13,
                color: "#64748b",
              }}
            >
              {label}
            </Typography>

            <Typography
              sx={{
                fontSize: 27,
                fontWeight: 800,
                color,
              }}
            >
              {value ?? "—"}
            </Typography>
          </Paper>
        ))}
      </Box>

      {/* SEARCH AND DATE FILTER */}

      <Paper
        elevation={0}
        sx={{
          ...glassSx,
          p: 2,
          mb: 2.5,
        }}
      >
        <Box
          sx={{
            display: "grid",

            gridTemplateColumns: {
              xs: "1fr",
              md: "1fr 1fr auto",
            },

            alignItems: "center",
            gap: 2,
          }}
        >
          <TextField
            label="Search Employee"
            size="small"
            fullWidth

            value={search}

            onChange={(e) =>
              setSearch(e.target.value)
            }

            placeholder="Enter employee name"
          />

          <TextField
            label="Production Date"
            type="date"
            size="small"
            fullWidth

            value={date}

            InputLabelProps={{
              shrink: true,
            }}

            inputProps={{
              max: todayIST(),
            }}

            sx={{
              "& input": {
                colorScheme: "light",
              },
            }}

            onChange={(e) => {
              const next = e.target.value;

              if (
                next &&
                next !== date &&
                next <= todayIST()
              ) {
                setSelectedId(null);
                setReport(null);
                setLoading(true);
                setDate(next);
              }
            }}
          />

          <Button
            variant="outlined"

            disabled={loading}

            sx={{
              textTransform: "none",
            }}

            onClick={() => {
              setSelectedId(null);
              setReload((n) => n + 1);
            }}
          >
            Refresh
          </Button>
        </Box>
      </Paper>

      {/* API ERROR */}

      {/* SEARCH NAVIGATION NOTICE */}

      {searchNotice && (
        <Alert
          severity="warning"
          sx={{ mb: 2 }}
        >
          {searchNotice}
        </Alert>
      )}


      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
        >
          {error}
        </Alert>
      )}

      {/* EMPLOYEE STATEMENT TABLE */}

      <Paper
        elevation={0}
        sx={{
          ...glassSx,
          overflow: "hidden",
        }}
      >
        {loading ? (
          <Box
            sx={{
              p: 4,
              textAlign: "center",
            }}
          >
            <CircularProgress size={28} />
          </Box>
        ) : !error && (
          <TableContainer>
            <Table size="small">

              {/* TABLE HEADINGS */}

              <TableHead>
                <TableRow
                  sx={{
                    bgcolor: "#f1f5f9",
                  }}
                >
                  {[
                    "Employee Name",
                    "Production Date",
                    "Shift",
                    "Status",
                    "Action",
                  ].map((label) => (
                    <TableCell
                      key={label}
                      sx={{
                        fontWeight: 700,
                        color: "#475569",
                      }}
                    >
                      {label}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>

              {/* EMPLOYEE RECORDS */}

              <TableBody>
                {rows.map((row) => (
                  <TableRow
                    hover
                    key={row.userId}

                    selected={
                      Boolean(selectedId) &&
                      selectedId === row.statementId
                    }
                  >
                    <TableCell
                      sx={{ fontWeight: 600 }}
                    >
                      {row.employeeName}
                    </TableCell>

                    <TableCell>
                      {date
                        .split("-")
                        .reverse()
                        .join("-")}
                    </TableCell>

                    <TableCell>
                      {row.shiftName ||
                        "Not Assigned"}
                    </TableCell>

                    <TableCell>
                      <Chip
                        size="small"

                        label={
                          row.status === "submitted"
                            ? "Submitted"
                            : "Not Submitted"
                        }

                        color={
                          row.status === "submitted"
                            ? "success"
                            : "warning"
                        }
                      />
                    </TableCell>

                    {/* VIEW WORKBOOK BUTTON */}

                    <TableCell>
                      {row.status === "submitted" &&
                        row.statementId ? (
                        <Button
                          size="small"
                          variant="outlined"

                          startIcon={
                            <VisibilityRoundedIcon />
                          }

                          sx={{
                            textTransform: "none",
                          }}

                          onClick={() =>
                            setSelectedId(
                              row.statementId
                            )
                          }
                        >
                          View
                        </Button>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))}

                {!rows.length && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      align="center"
                      sx={{ py: 3 }}
                    >
                      No employees found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>

            </Table>
          </TableContainer>
        )}
      </Paper>


      {/* DOWNLOAD ALL INDEXER STATEMENTS */}

      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          mb: 2,
        }}
      >
        <Button
          variant="contained"
          color="success"

          startIcon={
            <DownloadRoundedIcon />
          }

          disabled={
            loading ||
            downloading ||
            !summary?.submitted
          }

          onClick={handleDownloadAll}

          sx={{
            textTransform: "none",
            fontWeight: 600,
            borderRadius: "9px",
          }}
        >
          {downloading
            ? `Preparing Excel (${downloadProgress.completed}/${downloadProgress.total})`
            : `Download All Excel (${summary?.submitted ?? 0})`}
        </Button>
      </Box>

      {/* DOWNLOAD ERROR */}

      {downloadError && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}

          onClose={() =>
            setDownloadError("")
          }
        >
          {downloadError}
        </Alert>
      )}


      {/* OPEN WORKBOOK INSIDE REPORTS */}

      {selectedId && (
        <WorkbookViewer
          key={selectedId}

          statementId={selectedId}

          onClose={() =>
            setSelectedId(null)
          }
        />
      )}
    </Box>
  );
}
