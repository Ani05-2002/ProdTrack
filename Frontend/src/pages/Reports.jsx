import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  TextField,
  Alert,
  FormControl,
  Select,
  Menu,
  MenuItem,
  Avatar,
  Chip,
} from "@mui/material";
import apiRequest from "../lib/api.js";
import { Tabs, Tab } from "@mui/material";
import DailyWorkStatementReports from "../components/DailyWorkStatementReports.jsx";
import ExcelJS from "exceljs";
import { useToast } from "../components/ToastProvider.jsx";
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";

import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";


// =========================================================
// EMPLOYEE DATA
// =========================================================



// =========================================================
// ROLE NAME
// =========================================================

const roleNames = {
  indexer: "Indexer",
  teamLead: "Team Lead",
  coreTeam: "Core Team",
  administrator: "Administrator",
};

// =========================================================
// SELECT FIELD
// =========================================================
function SelectField({ label, children, value, onChange }) {
  return (
    <Box sx={{ width: "100%" }}>
      <Typography
        sx={{
          fontSize: 12,
          fontWeight: 600,
          color: "#6A7585",
          mb: 0.8,
        }}
      >
        {label}
      </Typography>

      <FormControl fullWidth size="small">
        <Select
          {...(
            value !== undefined
              ? { value, onChange }
              : {
                defaultValue: children[0]?.props?.value,
              }
          )}
          // Keep dropdown height limited and make its scrollbar available.
          MenuProps={{
            // Support the classic MUI Menu API.
            PaperProps: {
              sx: {
                maxHeight: 280,
                overflowY: "auto",
                overflowX: "hidden",
                mt: 0.8,
                borderRadius: "14px",
                backgroundColor: "#fff",
                boxShadow: "0 6px 14px rgba(0, 0, 0, 0.22)",
                scrollbarWidth: "thin",
                scrollbarColor: "#9AA9BD #F1F4F8",

                "&::-webkit-scrollbar": {
                  width: "8px",
                },
                "&::-webkit-scrollbar-track": {
                  backgroundColor: "#F1F4F8",
                },
                "&::-webkit-scrollbar-thumb": {
                  backgroundColor: "#9AA9BD",
                  borderRadius: "10px",
                },
              },
            },

            // Support newer MUI Menu slot configuration.
            slotProps: {
              paper: {
                sx: {
                  maxHeight: 280,
                  overflowY: "auto",
                  overflowX: "hidden",
                },
              },
            },

            // Keep dropdown option styling.
            MenuListProps: {
              sx: {
                py: 0.5,

                "& .MuiMenuItem-root": {
                  minHeight: 40,
                  fontSize: 14,
                  color: "#172B4D",
                  px: 2.5,
                },

                "& .MuiMenuItem-root.Mui-selected": {
                  backgroundColor: "#EAF1FF",
                },

                "& .MuiMenuItem-root.Mui-selected:hover": {
                  backgroundColor: "#DCE8FF",
                },

                "& .MuiMenuItem-root:hover": {
                  backgroundColor: "#F3F6FC",
                },
              },
            },
          }}

          sx={{
            height: 44,
            fontSize: 13,
            backgroundColor: "#fff",
            borderRadius: "8px",

            "& .MuiSelect-select": {
              display: "flex",
              alignItems: "center",
              minHeight: "44px !important",
              boxSizing: "border-box",
              py: 1,
            },

            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: "#d5dee9",
            },

            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: "#bfcbd9",
            },

            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: "#2f6df6",
            },
          }}
        >
          {children}
        </Select>
      </FormControl>
    </Box>
  );
}

// =========================================================
// REPORTS PAGE
// =========================================================
function SimpleReportTable({
  title,
  columns,
  rows,
  headerActions = null,
}) {
  const [srPage, setSrPage] = useState(0);
  const SR_ROWS_PER_PAGE = 10;
  // Reset page when rows change (filter/type switch).
  useEffect(() => { setSrPage(0); }, [rows.length]);
  const pagedRows = rows.slice(srPage * SR_ROWS_PER_PAGE, (srPage + 1) * SR_ROWS_PER_PAGE);
  const srTotalPages = Math.ceil(rows.length / SR_ROWS_PER_PAGE);

  const minWidth = Math.max(
    720,
    columns.length * 150
  );

  return (
    <Card
      elevation={0}
      sx={{
        border: "1px solid #dce3ec",
        borderRadius: "10px",
        overflow: "hidden",
        backgroundColor: "#fff",
      }}
    >
      <Box
        sx={{
          px: 2,
          py: 1.5,
          minHeight: 54,
          display: "flex",
          alignItems: "center",
          borderBottom:
            "1px solid #e2e7ee",
        }}
      >
        {/* Main header container: title and buttons in separate rows. */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            width: "100%",
            gap: 1.5,
          }}
        >
          {/* First row: display the report title. */}
          <Typography
            sx={{
              fontSize: 15,
              fontWeight: 800,
              color: "#17233a",
              display: "block",
              width: "100%",
            }}
          >
            {title}
          </Typography>

          {/* Second row: display role filter buttons below the title. */}
          {headerActions && (
            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-start",
                width: "100%",
              }}
            >
              {headerActions}
            </Box>
          )}
        </Box>
      </Box>

      <Box
        sx={{
          width: "100%",
          overflowX: "auto",
        }}
      >
        <Box sx={{ minWidth }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: `repeat(${columns.length}, minmax(140px, 1fr))`,
              px: 2,
              py: 1.5,
              backgroundColor: "#f8fafc",
            }}
          >
            {columns.map((column) => (
              <Typography
                key={column.key}
                sx={{
                  fontSize: 12,
                  color: "#6A7585",
                  fontWeight: 700,
                }}
              >
                {column.label}
              </Typography>
            ))}
          </Box>

          {rows.length === 0 ? (
            <Typography
              sx={{
                px: 2,
                py: 3,
                color: "#6A7585",
                fontSize: 13,
              }}
            >
              No report data found.
            </Typography>
          ) : (
            pagedRows.map((row, index) => (
              <Box
                key={row.id || index}
                sx={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${columns.length}, minmax(140px, 1fr))`,
                  px: 2,
                  py: 1.5,
                  minHeight: 58,
                  alignItems: "center",
                  borderTop:
                    "1px solid #e7ebf0",
                }}
              >
                {columns.map((column) => (
                  <Typography
                    key={column.key}
                    sx={{
                      fontSize: 13,
                      color: "#1A2434",
                      pr: 1.5,
                      overflowWrap: "anywhere",
                    }}
                  >
                    {column.render
                      ? column.render(row)
                      : row[column.key] ?? "—"}
                  </Typography>
                ))}
              </Box>
            ))
          )}
        </Box>
      </Box>
      {rows.length > 0 && (
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 1, px: 2, py: 1, borderTop: "1px solid #e2e7ee" }}>
          <Typography sx={{ fontSize: 12, color: "#6A7585" }}>
            {srPage * SR_ROWS_PER_PAGE + 1}–{Math.min((srPage + 1) * SR_ROWS_PER_PAGE, rows.length)} of {rows.length}
          </Typography>
          <Button size="small" disabled={srPage === 0} onClick={() => setSrPage((p) => p - 1)} sx={{ minWidth: 28, height: 28, p: 0, fontSize: 16, color: "#6A7585" }}>‹</Button>
          <Button size="small" disabled={srPage >= srTotalPages - 1} onClick={() => setSrPage((p) => p + 1)} sx={{ minWidth: 28, height: 28, p: 0, fontSize: 16, color: "#6A7585" }}>›</Button>
        </Box>
      )}
    </Card>
  );
}
// Returns today's date in the browser's local timezone.
const getLocalDateInputValue = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};


// ============================================================
// REPORTS TAB NAVIGATION
// ============================================================

export default function Reports(props) {

  const [activeTab, setActiveTab] = useState(
    props.navigationData?.reportTab === "statements"
      ? "statements"
      : "existing"
  );


  const canViewStatements = [
    "teamLead",
    "coreTeam",
    "administrator",
  ].includes(props.roleKey);

  // Other roles retain their existing Reports page.


  if (!canViewStatements) {

    useEffect(() => {
      const navigation = props.navigationData;

      if (
        navigation?.source === "global-search" &&
        navigation?.reportTab === "statements" &&
        navigation?.resultType === "statement"
      ) {
        setActiveTab("statements");
      }
    }, [props.navigationData]);

    return <ExistingReports {...props} />;
  }

  return (
    <Box
      sx={{
        width: "100%",
        minWidth: 0,
      }}
    >
      <Tabs
        value={activeTab}

        onChange={(_, value) =>
          setActiveTab(value)
        }

        variant="scrollable"
        scrollButtons="auto"

        sx={{
          mb: 2.5,

          bgcolor:
            "rgba(255,255,255,0.75)",

          borderRadius: "12px",

          "& .MuiTab-root": {
            textTransform: "none",
            fontWeight: 600,
          },
        }}
      >
        <Tab
          label="Existing Reports"
          value="existing"
        />

        <Tab
          label="Daily Work Statements"
          value="statements"
        />
      </Tabs>

      {activeTab === "statements" ? (

        <DailyWorkStatementReports
          searchTarget={
            props.navigationData?.reportTab === "statements"
              ? props.navigationData
              : null
          }
        />

      ) : (
        <ExistingReports {...props} />
      )}
    </Box>
  );
}

// ============================================================
// EXISTING REPORTS FUNCTIONALITY
// ============================================================

function ExistingReports({
  roleKey = "indexer",
}) {

  const toast = useToast();
  const [summary, setSummary] = useState({
    totalReceived: 0,
    totalCompleted: 0,
    totalPending: 0,
    completionRate: 0,
  });
  const [period, setPeriod] = useState("week");
  // Display the correct label for the selected report period.
  const periodLabel = period === "day" ? "today" : period === "month" ? "this month" : "this week";
  const [employeeReportPage, setEmployeeReportPage] = useState(0);
  const EMP_ROWS_PER_PAGE = 10;
  const [bars, setBars] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState("all");
  const [selectedEmployee, setSelectedEmployee] = useState("all");
  const [reportType, setReportType] = useState("employee");
  // Controls the Export dropdown menu.
  const [exportMenuAnchor, setExportMenuAnchor] = useState(null);
  // Checks whether the Export menu is open.
  const exportMenuOpen = Boolean(exportMenuAnchor);
  // Opens the Export menu.
  const handleExportMenuOpen = (event) => { setExportMenuAnchor(event.currentTarget); };
  // Closes the Export menu.
  const handleExportMenuClose = () => { setExportMenuAnchor(null); };
  const [projectReportRows, setProjectReportRows] = useState([]);
  const [correctionReportRows, setCorrectionReportRows] = useState([]);
  const [allDailyEntries, setAllDailyEntries] = useState([]);
  const [dailyEntryRole, setDailyEntryRole] = useState("all");
  // Selected date for All Daily Entries
  const [dailyEntriesDate, setDailyEntriesDate] = useState(getLocalDateInputValue);
  // Stores the selected production date.
  const [dailySummaryDate, setDailySummaryDate] = useState(getLocalDateInputValue);
  // Stores project-wise daily summary records.
  const [dailySummaryRows, setDailySummaryRows] = useState([]);
  // Tracks report loading and errors.
  const [dailySummaryLoading, setDailySummaryLoading] = useState(false);
  const [dailySummaryError, setDailySummaryError] = useState("");


  useEffect(() => {
    const loadReports = async () => {
      if (
        ![
          "indexer",
          "teamLead",
          "coreTeam",
          "administrator",
        ].includes(roleKey)
      ) {
        return;
      }

      try {
        const queryParams = new URLSearchParams({
          period,
        });

        if (selectedProject !== "all") {
          queryParams.set(
            "projectId",
            selectedProject
          );
        }

        if (selectedEmployee !== "all") {
          queryParams.set(
            "employeeId",
            selectedEmployee
          );
        }

        const reportQuery = queryParams.toString();


        const [
          summaryData,
          productionData,
          employeeData,
          employeeOptionsData,
          projectData,
          projectReportData,
          correctionReportData,
          allDailyEntriesData
        ] = await Promise.all([
          apiRequest(
            `/reports/my-summary?${reportQuery}`
          ),

          apiRequest(
            `/reports/my-daily-production?${reportQuery}`
          ),

          apiRequest(
            `/reports/employee-production?${reportQuery}`
          ),

          // Unfiltered request for dropdown options
          apiRequest(
            `/reports/employee-production?period=${period}`
          ),

          apiRequest("/projects/my"),
          // Load project data for both Project-wise Production and Pending Backlog.
          ["project", "pending"].includes(reportType)
            ? apiRequest(
              `/reports/project-production?${reportQuery}`
            )
            : Promise.resolve({
              projects: [],
            }),

          reportType === "correction"
            ? apiRequest(
              `/reports/correction-log?${reportQuery}`
            )
            : Promise.resolve({
              corrections: [],
            }),
          // Fetch individual daily entries only for Admin and Core Team.
          ["administrator", "coreTeam"].includes(roleKey) &&
            reportType === "allEntries"
            ? apiRequest(
              "/reports/all-daily-entries"
            )
            : Promise.resolve({
              entries: [],
            }),
        ]);

        setSummary(summaryData.summary);
        setProjects(projectData.projects || []);

        setProjectReportRows(
          projectReportData.projects || []
        );

        setCorrectionReportRows(
          correctionReportData.corrections || []
        );

        // Sort all daily entries by production date, newest first.
        const sortedDailyEntries = [
          ...(allDailyEntriesData.entries || []),
        ].sort((a, b) => {
          // Compare production dates.
          const dateA = String(a.production_date || "").slice(0, 10);
          const dateB = String(b.production_date || "").slice(0, 10);

          // Show the newest date first.
          const dateDifference = dateB.localeCompare(dateA);

          // For entries on the same date, show the newest entry ID first.
          return dateDifference || Number(b.id || 0) - Number(a.id || 0);
        });

        // Store sorted daily entries.
        setAllDailyEntries(sortedDailyEntries);

        const formattedBars = (
          productionData.production || []
        ).map((entry) => ({
          day: String(
            entry.day_name || ""
          ).slice(0, 3),

          value: Number(entry.completed || 0),
          received: Number(entry.received || 0),
          completed: Number(entry.completed || 0),
        }));

        setBars(formattedBars);

        const formatEmployees = (employeeList) =>
          (employeeList || []).map((employee) => {
            const employeeName =
              employee.employee_name || "";

            const initials = employeeName
              .split(" ")
              .filter(Boolean)
              .map((part) => part[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();

            return [
              initials, // [0] Employee initials.
              employeeName, // [1] Employee name.
              employee.projects || "—", // [2] Assigned projects.
              Number(employee.target || 0), // [3] Combined project target.
              Number(employee.completed || 0), // [4] Completed documents.
              Number(employee.targetRemaining || 0), // [5] Target remaining.
              employee.productivity == null
                ? "—"
                : `${Number(employee.productivity).toFixed(2)}%`, // [6] Productivity.
              employee.id, // [7] Employee ID for filters.
            ];
          });

        setEmployees(
          formatEmployees(employeeData.employees)
        );

        setEmployeeOptions(
          formatEmployees(
            employeeOptionsData.employees
          )
        );
      } catch (error) {
        console.error(
          "Load Reports Error:",
          error
        );

        toast.error(error.message);
      }
    };

    loadReports();
  },


    [
      roleKey,
      period,
      selectedProject,
      selectedEmployee,
      toast,
      reportType,
    ]);
  // Loads the dashboard's existing Project Daily Summary for the selected date.
  useEffect(() => {
    // Do not load this API for other report types.
    if (reportType !== "dailySummary") return;

    // Select the existing endpoint according to the logged-in role.
    const summaryEndpoints = {
      teamLead: "/team-lead/dashboard/project-daily-summary",
      coreTeam: "/core-team/dashboard/project-daily-summary",
      administrator: "/admin/dashboard/project-daily-summary",
    };

    const endpoint = summaryEndpoints[roleKey];

    // Validate the selected date.
    if (!dailySummaryDate) {
      setDailySummaryRows([]);
      setDailySummaryLoading(false);
      setDailySummaryError("Select a production date.");
      return;
    }

    // Check role access.
    if (!endpoint) {
      setDailySummaryRows([]);
      setDailySummaryError("This role cannot access this report.");
      return;
    }

    let active = true;

    // Fetch the selected-date summary.
    const loadProjectDailySummary = async () => {
      setDailySummaryLoading(true);
      setDailySummaryError("");

      try {
        // Reuses the existing dashboard calculation.
        const data = await apiRequest(
          `${endpoint}?date=${encodeURIComponent(dailySummaryDate)}`
        );

        if (!data.success) {
          throw new Error(data.message || "Failed to load project summary");
        }

        if (active) {
          setDailySummaryRows(data.summary || []);
        }
      } catch (error) {
        if (active) {
          setDailySummaryRows([]);
          setDailySummaryError(
            error.message || "Failed to load project summary"
          );
          toast.error(error.message || "Failed to load project summary");
        }
      } finally {
        if (active) {
          setDailySummaryLoading(false);
        }
      }
    };

    loadProjectDailySummary();

    // Prevents old requests from updating the component.
    return () => {
      active = false;
    };
  }, [reportType, roleKey, dailySummaryDate, toast]);
  // Filter projects that have pending documents.
  const pendingProjectRows = [...projectReportRows]
    // Include only projects with pending greater than zero.
    .filter((project) => Number(project.pending || 0) > 0)
    // Display projects with the highest pending count first.
    .sort(
      (a, b) =>
        Number(b.pending || 0) - Number(a.pending || 0)
    );
  // Filter daily entries by role while preserving newest-first order.

  const filteredDailyEntries = allDailyEntries.filter((entry) => {
    // Show only the selected production date
    const entryDate = String(
      entry.production_date || ""
    ).slice(0, 10);

    if (entryDate !== dailyEntriesDate) {
      return false;
    }

    // Keep existing role filters
    if (dailyEntryRole === "all") {
      return true;
    }

    if (dailyEntryRole === "lead") {
      return ["lead", "teamLead"].includes(
        entry.employee_role
      );
    }

    return entry.employee_role === "indexer";
  });

  // Filters the summary by the selected date and project.
  const filteredDailySummaryRows = dailySummaryRows.filter((row) => {
    const rowDate = String(row.productionDate || "").slice(0, 10);

    const matchesDate = rowDate === dailySummaryDate;

    const matchesProject =
      selectedProject === "all" ||
      String(row.projectId) === String(selectedProject);

    return matchesDate && matchesProject;
  });
  const max = Math.max(
    1,
    ...bars.map((bar) => bar.value)
  );

  const currentRole =
    roleNames[roleKey] || "Indexer";

  const completedDegrees =
    (Math.min(
      Math.max(summary.completionRate, 0),
      100
    ) / 100) * 360;

  const displayedEmployees = employees;
  // Reset employee table page when data or type changes.
  const pagedEmployees = displayedEmployees.slice(
    employeeReportPage * EMP_ROWS_PER_PAGE,
    (employeeReportPage + 1) * EMP_ROWS_PER_PAGE,
  );
  const empTotalPages = Math.ceil(displayedEmployees.length / EMP_ROWS_PER_PAGE);

  const handleCsvDownload = () => {
    // Exports Project Daily Summary for the selected date.
    if (reportType === "dailySummary") {
      if (!dailySummaryDate) {
        toast.info("Select a production date before exporting");
        return;
      }

      if (dailySummaryLoading) {
        toast.info("Project Daily Summary is still loading");
        return;
      }

      if (filteredDailySummaryRows.length === 0) {
        toast.info("No data found for the selected date");
        return;
      }

      // Defines the CSV columns.
      const headings = [
        "Date",
        "Project",
        "Reporting Category",
        "Received",
        "Completed",
        "Backlog",
        "Pending",
        "Batches Received",
        "Batches Processed",
        "Pending Batches",
      ];

      // Converts summary records into CSV rows.
      const reportRows = filteredDailySummaryRows.map((row) => [
        row.productionDate || dailySummaryDate,
        row.projectName || "",
        row.categoryName || "Uncategorized",
        Number(row.received || 0),
        Number(row.completed || 0),
        Number(row.backlog || 0),
        Number(row.pending || 0),
        Number(row.batchesReceived || 0),
        Number(row.batchesProcessed || 0),
        Number(row.pendingBatches || 0),
      ]);

      // Escapes CSV values and prevents spreadsheet formula injection.
      const escapeCsvValue = (value) => {
        const text = String(value ?? "");
        const safeText = /^[\s]*[=+\-@\t\r]/.test(text)
          ? `'${text}`
          : text;

        return `"${safeText.replace(/"/g, '""')}"`;
      };

      // Creates Excel-compatible CSV content.
      const csvContent = [headings, ...reportRows]
        .map((row) => row.map(escapeCsvValue).join(","))
        .join("\r\n");

      const file = new Blob(["\uFEFF", csvContent], {
        type: "text/csv;charset=utf-8;",
      });

      // Starts the CSV download.
      const downloadUrl = URL.createObjectURL(file);
      const link = document.createElement("a");

      link.href = downloadUrl;
      link.download =
        `prodtrack-project-daily-summary-${dailySummaryDate}.csv`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(downloadUrl);
      return;
    }
    // Export individual daily entries when Admin/Core Team selects this report.
    if (
      reportType === "allEntries" &&
      ["administrator", "coreTeam"].includes(roleKey)
    ) {
      // Prevent downloading an empty report.
      if (filteredDailyEntries.length === 0) {
        toast.info("No daily entries available to export");
        return;
      }

      // Define the CSV columns.
      const headings = [
        "Employee",
        "Employee Code",
        "Role",
        "Project",
        "Production Date",
        "Team Lead Category",
        "Indexer Category",
        "Received",
        "Completed",
        "Batches",
        "Status",
        "Notes",
      ];

      // Export only entries matching the selected role filter.
      const reportRows = filteredDailyEntries.map((entry) => {
        const isTeamLead = ["lead", "teamLead"].includes(
          entry.employee_role
        );

        return [
          entry.employee_name,
          entry.employee_code,
          isTeamLead ? "Team Lead" : "Indexer",
          entry.project_name,
          entry.production_date,
          entry.team_lead_category || "",
          entry.indexer_category || "",
          isTeamLead ? Number(entry.received || 0) : "",
          !isTeamLead ? Number(entry.completed || 0) : "",
          !isTeamLead ? Number(entry.batches_processed || 0) : "",
          entry.status_name || "",
          entry.notes || "",
        ];
      });

      // Escape CSV values and protect spreadsheet applications from formula injection.
      const escapeCsvValue = (value) => {
        const text = String(value ?? "");
        const safeText = /^[\s]*[=+\-@\t\r]/.test(text)
          ? `'${text}`
          : text;

        return `"${safeText.replace(/"/g, '""')}"`;
      };

      // Generate the CSV content with headings.
      const csvContent = [headings, ...reportRows]
        .map((row) => row.map(escapeCsvValue).join(","))
        .join("\r\n");

      // Create the CSV file.
      const file = new Blob(["\uFEFF", csvContent], {
        type: "text/csv;charset=utf-8;",
      });

      // Generate a temporary download URL.
      const downloadUrl = URL.createObjectURL(file);
      const link = document.createElement("a");

      // Set the CSV filename based on the selected period.
      link.href = downloadUrl;
      link.download =
        `prodtrack-daily-entries-${dailyEntriesDate}.csv`;

      // Trigger the CSV download.
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Release the temporary URL.
      URL.revokeObjectURL(downloadUrl);

      return;
    }
    if (employees.length === 0) {
      toast.info("No report data is available to export");
      return;
    }

    const headings = [
      "Employee",
      "Project",
      "Target",
      "Completed",
      "Target Left",
      "Productivity",
    ];

    // Export the same values shown in the employee table.
    const reportRows = employees.map((employee) => [
      employee[1],
      employee[2],
      employee[3],
      employee[4],
      employee[5],
      employee[6],
    ]);
    const csvContent = [headings, ...reportRows]
      .map((row) =>
        row
          .map((value) =>
            `"${String(value ?? "").replace(/"/g, '""')}"`
          )
          .join(",")
      )
      .join("\n");

    const file = new Blob(
      [csvContent],
      {
        type: "text/csv;charset=utf-8;",
      }
    );

    const downloadUrl = URL.createObjectURL(file);
    const link = document.createElement("a");

    link.href = downloadUrl;
    link.download = `prodtrack-report-${period}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(downloadUrl);
  };


  const handleAllEntriesExcelDownload = async () => {
    const selectedDate = dailyEntriesDate;

    if (!selectedDate) {
      toast.info("Please select a production date");
      return;
    }

    // Use all records for the date so both roles are exported,
    // regardless of the currently selected role tab.
    const entries = allDailyEntries
      .filter(
        (entry) =>
          String(entry.production_date || "").slice(0, 10) ===
          selectedDate
      )
      .sort((a, b) =>
        String(a.project_name || "").localeCompare(
          String(b.project_name || "")
        )
      );

    if (entries.length === 0) {
      toast.info("No daily entries found for this date");
      return;
    }

    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "ProdTrack";
      workbook.title = `Daily Entries - ${selectedDate}`;

      const projectSheet = workbook.addWorksheet(
        "Project-wise Entries"
      );
      const allSheet = workbook.addWorksheet("All Entries");

      const headings = [
        "Production Date",
        "Project",
        "Entry ID",
        "Employee",
        "Role",
        "Team Lead Category",
        "Indexer Category",
        "Batch / Job",
        "Documents Received",
        "Indexer Completed",
        "Team Lead Completed",
        "Extracted Documents",
        "Documents Pending",
        "Batches Received",
        "Indexer Batches Processed",
        "Team Lead Batches Processed",
        "Batches Pending",
        "Status",
        "Notes",
      ];

      const isTeamLead = (entry) =>
        ["lead", "teamLead", "team_lead"].includes(
          entry.employee_role
        );

      // Prevent user-entered text from becoming Excel formulas.
      const safeText = (value) => {
        const text = String(value ?? "");
        return /^\s*[=+\-@]/.test(text) ? `'${text}` : text;
      };

      // Preserve blank values instead of turning them into zero.
      const count = (value) =>
        value === null || value === undefined || value === ""
          ? ""
          : Number(value);

      const createEntryRow = (entry) => {
        const lead = isTeamLead(entry);

        return [
          selectedDate,
          safeText(entry.project_name),
          entry.id,
          safeText(entry.employee_name),
          lead ? "Team Lead" : "Indexer",
          safeText(entry.team_lead_category),
          safeText(entry.indexer_category),
          safeText(entry.batch_ref),
          lead ? count(entry.received) : "",
          !lead ? count(entry.completed) : "",
          lead ? count(entry.team_lead_docs_completed) : "",
          lead ? count(entry.extracted_documents) : "",
          count(entry.documents_pending),
          lead ? count(entry.batches_received) : "",
          !lead ? count(entry.batches_processed) : "",
          lead
            ? count(entry.team_lead_batches_processed)
            : "",
          count(entry.batches_pending),
          safeText(entry.status_name),
          safeText(entry.notes),
        ];
      };

      // Set column widths for both worksheets.
      [projectSheet, allSheet].forEach((sheet) => {
        sheet.columns = headings.map((heading) => ({
          width: Math.max(18, Math.min(34, heading.length + 5)),
        }));

        sheet.getColumn(2).width = 32;
        sheet.getColumn(4).width = 28;
        sheet.getColumn(19).width = 48;
      });

      const styleHeader = (row) => {
        row.height = 29;

        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.font = {
            bold: true,
            color: { argb: "FFFFFFFF" },
          };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF2F6DF6" },
          };
          cell.alignment = {
            vertical: "middle",
            wrapText: true,
          };
        });
      };

      const addBand = (sheet, title, color) => {
        const row = sheet.addRow([title]);

        sheet.mergeCells(
          row.number,
          1,
          row.number,
          headings.length
        );

        row.height = 27;
        const cell = row.getCell(1);

        cell.font = {
          bold: true,
          color: { argb: "FF10233D" },
        };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: color },
        };
      };

      // --------------------------------------------------
      // SHEET 1: PROJECT-WISE GROUPED ENTRIES
      // --------------------------------------------------

      addBand(
        projectSheet,
        `PRODTRACK — DAILY ENTRIES — ${selectedDate}`,
        "FFDCE8FF"
      );

      projectSheet.addRow([]);

      const projectGroups = new Map();

      entries.forEach((entry) => {
        const name = entry.project_name || "Unknown Project";

        if (!projectGroups.has(name)) {
          projectGroups.set(name, []);
        }

        projectGroups.get(name).push(entry);
      });

      for (const [projectName, projectEntries] of projectGroups) {
        const projectRow = projectSheet.addRow([
          `PROJECT: ${projectName}`,
        ]);

        projectSheet.mergeCells(
          projectRow.number,
          1,
          projectRow.number,
          headings.length
        );

        projectRow.height = 24;

        const projectCell = projectRow.getCell(1);


        projectCell.font = {
          bold: true,
          color: { argb: "FF000000" }, // Black text
        };

        projectCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFF6666" }, // Red background
        };


        projectCell.alignment = {
          vertical: "middle",
          horizontal: "left",
        };

        const teamLeadEntries = projectEntries.filter(isTeamLead);
        const indexerEntries = projectEntries.filter(
          (entry) => !isTeamLead(entry)
        );

        const addSection = (title, rows) => {
          addBand(projectSheet, title, "FFEAF4F1");

          styleHeader(projectSheet.addRow(headings));

          if (rows.length === 0) {
            projectSheet.addRow(["No entries"]);
          } else {
            rows.forEach((entry) => {
              projectSheet.addRow(createEntryRow(entry));
            });
          }

          projectSheet.addRow([]);
        };

        addSection(
          `TEAM LEAD ENTRIES (${teamLeadEntries.length})`,
          teamLeadEntries
        );

        addSection(
          `INDEXER ENTRIES (${indexerEntries.length})`,
          indexerEntries
        );

        projectSheet.addRow([]);
      }

      // --------------------------------------------------
      // SHEET 2: ALL ENTRIES (FILTERABLE EXCEL TABLE)
      // --------------------------------------------------

      styleHeader(allSheet.addRow(headings));

      entries.forEach((entry) => {
        allSheet.addRow(createEntryRow(entry));
      });

      allSheet.views = [
        {
          state: "frozen",
          ySplit: 1,
          xSplit: 4,
        },
      ];

      allSheet.autoFilter = {
        from: "A1",
        to: `S${allSheet.rowCount}`,
      };

      // --------------------------------------------------
      // DOWNLOAD EXCEL FILE
      // --------------------------------------------------

      const buffer = await workbook.xlsx.writeBuffer();

      const file = new Blob([buffer], {
        type:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const downloadUrl = URL.createObjectURL(file);
      const link = document.createElement("a");

      link.href = downloadUrl;
      link.download =
        `ProdTrack-Daily-Entries-${selectedDate}.xlsx`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => {
        URL.revokeObjectURL(downloadUrl);
      }, 1000);

      toast.success("Daily Entries Excel report downloaded");
    } catch (error) {
      console.error("Daily Entries Excel export error:", error);
      toast.error("Failed to generate Excel report");
    }
  };

  // Downloads Project Daily Summary as a formatted Excel workbook.
  const handleExcelDownload = async () => {
    // Allow Excel export only for Project Daily Summary.
    if (reportType !== "dailySummary") return;

    // Validate the selected production date.
    if (!dailySummaryDate) {
      toast.info("Select a production date before exporting");
      return;
    }

    // Prevent export while summary data is loading.
    if (dailySummaryLoading) {
      toast.info("Project Daily Summary is still loading");
      return;
    }

    // Prevent empty Excel reports.
    if (filteredDailySummaryRows.length === 0) {
      toast.info("No data available for the selected date");
      return;
    }

    try {
      // Create a new Excel workbook.
      const workbook = new ExcelJS.Workbook();

      // Set workbook information.
      workbook.creator = "ProdTrack";
      workbook.subject = "Project Daily Summary";
      workbook.title = `Project Daily Summary - ${dailySummaryDate}`;

      // Create the worksheet.
      const worksheet = workbook.addWorksheet("Daily Summary");

      // Set the worksheet column headings.
      const headings = [
        "Date",
        "Project",
        "Reporting Category",
        "Received",
        "Completed",
        "Extracted Documents",
        "Backlog",
        "Pending",
        "Batches Received",
        "Batches Processed",
        "Pending Batches",
      ];

      // Add the heading row.
      worksheet.addRow(headings);

      // Add selected-date project summary data.
      filteredDailySummaryRows.forEach((row) => {
        // Convert YYYY-MM-DD into a local Excel date.
        const dateText = String(
          row.productionDate || dailySummaryDate
        ).slice(0, 10);

        const [year, month, day] = dateText.split("-").map(Number);

        const excelDate =
          year && month && day
            ? new Date(year, month - 1, day)
            : dateText;

        worksheet.addRow([
          excelDate,
          row.projectName || "",
          row.categoryName || "Uncategorized",
          Number(row.received || 0),
          Number(row.completed || 0),
          Number(row.extractedDocuments || 0),
          Number(row.backlog || 0),
          Number(row.pending || 0),
          Number(row.batchesReceived || 0),
          Number(row.batchesProcessed || 0),
          Number(row.pendingBatches || 0),
        ]);
      });

      // Set readable widths for all columns.
      worksheet.columns = [
        { width: 16 }, // Date
        { width: 30 }, // Project
        { width: 42 }, // Reporting Category
        { width: 15 }, // Received
        { width: 15 }, // Completed
        { width: 24 }, // Extracted Documents
        { width: 15 }, // Backlog
        { width: 15 }, // Pending
        { width: 19 }, // Batches Received
        { width: 20 }, // Batches Processed
        { width: 19 }, // Pending Batches
      ];


      // Freeze the heading row.
      worksheet.views = [
        { state: "frozen", ySplit: 1 },
      ];

      // Add filters to all report columns.
      worksheet.autoFilter = {
        from: "A1",
        to: `K${worksheet.rowCount}`,
      };

      // Format the heading row.
      const headerRow = worksheet.getRow(1);
      headerRow.height = 32;

      headerRow.eachCell((cell) => {
        cell.font = {
          bold: true,
          color: { argb: "FFFFFFFF" },
          size: 11,
        };

        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF2F6DF6" },
        };

        cell.border = {
          top: { style: "thin", color: { argb: "FFD5DEE9" } },
          bottom: { style: "thin", color: { argb: "FFD5DEE9" } },
          left: { style: "thin", color: { argb: "FFD5DEE9" } },
          right: { style: "thin", color: { argb: "FFD5DEE9" } },
        };
      });

      // Center-align every cell horizontally and vertically.
      worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
        row.height = rowNumber === 1 ? 32 : 28;

        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.alignment = {
            horizontal: "center",
            vertical: "middle",
            wrapText: true,
          };

          // Add borders to every report cell.
          cell.border = {
            top: { style: "thin", color: { argb: "FFE2E8F0" } },
            bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
            left: { style: "thin", color: { argb: "FFE2E8F0" } },
            right: { style: "thin", color: { argb: "FFE2E8F0" } },
          };
        });
      });

      // Display production dates in day-month-year format.
      worksheet.getColumn(1).numFmt = "dd-mm-yyyy";

      // Generate the Excel workbook.
      const buffer = await workbook.xlsx.writeBuffer();

      // Create the downloadable Excel file.
      const file = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      // Generate a temporary download URL.
      const downloadUrl = URL.createObjectURL(file);
      const link = document.createElement("a");

      // Set the Excel filename.
      link.href = downloadUrl;
      link.download =
        `prodtrack-project-daily-summary-${dailySummaryDate}.xlsx`;

      // Start the download.
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Release the temporary URL.
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    } catch (error) {
      // Log and display Excel export errors.
      console.error("Excel Export Error:", error);
      toast.error(error.message || "Failed to export Excel report");
    }
  };

  const handlePdfDownload = () => {
    if (employees.length === 0) {
      toast.info("No report data is available to export");
      return;
    }

    const document = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    document.setFontSize(18);
    document.text("ProdTrack Production Report", 14, 16);

    document.setFontSize(10);
    document.text(
      `Role: ${currentRole} | Period: ${period}`,
      14,
      24
    );

    document.text(
      `Received: ${summary.totalReceived}   Completed: ${summary.totalCompleted}   Pending: ${summary.totalPending}   Completion: ${summary.completionRate}%`,
      14,
      31
    );

    autoTable(document, {
      startY: 38,
      head: [[
        "Employee",
        "Project",
        "Target",
        "Completed",
        "Target Left",
        "Productivity",
      ]],
      body: employees.map((employee) => [
        employee[1],
        employee[2],
        employee[3],
        employee[4],
        employee[5],
        employee[6],
      ]),
      theme: "grid",
      headStyles: {
        fillColor: [47, 109, 246],
        textColor: [255, 255, 255],
      },
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
    });

    document.save(`prodtrack-report-${period}.pdf`);
  };

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
          alignItems: {
            xs: "stretch",
            md: "flex-end",
          },
          flexDirection: {
            xs: "column",
            md: "row",
          },
          mb: 2.5,
          gap: 2,
        }}
      >
        <Box>
          <Typography
            sx={{
              color: "#6A7585",
              fontSize: 12.5,
              mb: 0.4,
            }}
          >
            ProdTrack · {currentRole}
          </Typography>

          <Typography
            sx={{
              fontSize: 22,
              lineHeight: 1.5,
              fontWeight: 800,
              color: "#1A2434",
            }}
          >
            Reports
          </Typography>

          <Typography
            sx={{
              mt: 0.4,
              color: "#6A7585",
              fontSize: 13,
            }}
          >
            Daily, weekly, monthly and audit reports. Filter by project,
            employee and date.
          </Typography>
        </Box>

        {/* EXPORT BUTTONS */}

        {/* EXPORT DROPDOWN */}

        <Box
          sx={{
            display: "flex",
            flexShrink: 0,
            width: {
              xs: "100%",
              md: "auto",
            },
          }}
        >
          {/* Main Export dropdown button. */}
          <Button
            variant="contained"
            onClick={handleExportMenuOpen}
            endIcon={<span>▾</span>}
            sx={{
              height: 42,
              minWidth: 135,
              px: 2.5,
              textTransform: "none",
              borderRadius: "8px",
              backgroundColor: "#16834A",
              boxShadow: "none",
              fontSize: 13,
              fontWeight: 700,
              "&:hover": {
                backgroundColor: "#116B3B",
                boxShadow: "none",
              },
            }}
          >
            Export
          </Button>

          {/* Displays the available export formats. */}
          <Menu
            anchorEl={exportMenuAnchor}
            open={exportMenuOpen}
            onClose={handleExportMenuClose}
            anchorOrigin={{
              vertical: "bottom",
              horizontal: "right",
            }}
            transformOrigin={{
              vertical: "top",
              horizontal: "right",
            }}
            slotProps={{
              paper: {
                sx: {
                  mt: 0.8,
                  minWidth: 180,
                  borderRadius: "9px",
                  boxShadow: "0 4px 18px rgba(15,23,42,0.15)",
                },
              },
            }}
          >
            {/* CSV export option. */}
            <MenuItem
              onClick={() => {
                handleExportMenuClose();
                handleCsvDownload();
              }}
              sx={{ fontSize: 13, py: 1.2 }}
            >
              ↓ &nbsp; CSV (.csv)
            </MenuItem>

            {/* Excel export option for Project Daily Summary. */}
            <MenuItem
              disabled={
                !["dailySummary", "allEntries"].includes(reportType)
              }

              onClick={() => {
                handleExportMenuClose();

                if (reportType === "allEntries") {
                  handleAllEntriesExcelDownload();
                } else {
                  handleExcelDownload();
                }
              }}

              sx={{ fontSize: 13, py: 1.2 }}
            >
              <span style={{ color: "#16834A", fontWeight: 700 }}>
                X
              </span>
              &nbsp; Excel (.xlsx)
            </MenuItem>

            {/* PDF export option. */}
            <MenuItem
              disabled={reportType === "dailySummary"}
              onClick={() => {
                handleExportMenuClose();
                handlePdfDownload();
              }}
              sx={{ fontSize: 13, py: 1.2 }}
            >
              ↓ &nbsp; PDF
            </MenuItem>
          </Menu>
        </Box>

      </Box> {/* Closes the main Reports header section. */}

      {/* =================================================
          FILTERS
      ================================================= */}

      <Card
        elevation={0}
        sx={{
          p: {
            xs: 2,
            sm: 2.25,
          },
          mb: 2.5,
          border: "1px solid #dce3ec",
          borderRadius: "10px",
          boxShadow: "0 3px 10px rgba(15,23,42,.04)",
          backgroundColor: "#fff",
        }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "1fr 1fr",
            },
            gap: {
              xs: 2,
              md: 2.2,
            },
          }}
        >
          {/* REPORT TYPE */}

          <SelectField
            label="Report type"
            value={reportType}
            onChange={(event) =>
              setReportType(event.target.value)
            }
          >
            <MenuItem value="employee">
              Employee-wise production
            </MenuItem>

            <MenuItem value="project">
              Project-wise production
            </MenuItem>

            <MenuItem value="received">
              Received vs Completed
            </MenuItem>

            <MenuItem value="pending">
              Pending backlog
            </MenuItem>

            <MenuItem value="correction">
              Correction request log
            </MenuItem>
            {/* Makes Project Daily Summary available to management roles. */}
            {["teamLead", "coreTeam", "administrator"].includes(roleKey) && (
              <MenuItem value="dailySummary">
                Project Daily Summary
              </MenuItem>
            )}
            {/* Shows all Indexer and Team Lead entries for Admin and Core Team. */}
            {["administrator", "coreTeam"].includes(roleKey) && (
              <MenuItem value="allEntries">
                All Daily Entries
              </MenuItem>
            )}
          </SelectField>

          {/* Shows production date with the same styling as SelectField. */}
          {["dailySummary", "allEntries"].includes(reportType) ? (
            <Box sx={{ width: "100%" }}>
              {/* Keeps the label above the input, matching Report Type. */}
              <Typography
                sx={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#6A7585",
                  mb: 0.8,
                }}
              >
                Production date
              </Typography>

              {/* Matches the existing SelectField dimensions and styling. */}
              <TextField
                type="date"

                value={
                  reportType === "allEntries"
                    ? dailyEntriesDate
                    : dailySummaryDate
                }
                onChange={(event) => {
                  if (reportType === "allEntries") {
                    setDailyEntriesDate(event.target.value);
                  } else {
                    setDailySummaryDate(event.target.value);
                  }
                }}

                size="small"
                fullWidth
                sx={{
                  "& .MuiOutlinedInput-root": {
                    height: 44,
                    fontSize: 13,
                    backgroundColor: "#fff",
                    borderRadius: "8px",
                    "& fieldset": {
                      borderColor: "#d5dee9",
                    },
                    "&:hover fieldset": {
                      borderColor: "#bfcbd9",
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: "#2f6df6",
                    },
                  },
                }}
              />
            </Box>
          ) : (
            <>
              {/* Existing period filter for other reports. */}
              <SelectField
                label="Period"
                value={period}
                onChange={(event) => setPeriod(event.target.value)}
              >
                <MenuItem value="week">This week</MenuItem>
                <MenuItem value="month">This month</MenuItem>
              </SelectField>

              {/* Existing employee filter for other reports. */}
              <SelectField
                label="Employee"
                value={selectedEmployee}
                onChange={(event) =>
                  setSelectedEmployee(event.target.value)
                }
              >
                <MenuItem value="all">
                  All employees
                </MenuItem>

                {employeeOptions.map((employee) => (
                  <MenuItem
                    key={employee[7]}
                    value={employee[7]}
                  >
                    {employee[1]}
                  </MenuItem>
                ))}
              </SelectField>
            </>
          )}
        </Box>
      </Card>

      {/* =================================================
          CHARTS
      ================================================= */}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            lg: "1.65fr 1fr",
          },
          gap: 2,
          mb: 2,
        }}
      >
        {/* =================================================
            RECEIVED VS COMPLETED
        ================================================= */}

        <Card
          elevation={0}
          sx={{
            border: "1px solid #dce3ec",
            borderRadius: "10px",
            overflow: "hidden",
            backgroundColor: "#fff",
          }}
        >
          {/* HEADER */}

          <Box
            sx={{
              // Add spacing inside the table header.
              px: 2,
              py: 1.5,
              minHeight: 54,

              // Arrange the heading and buttons vertically.
              display: "flex",
              flexDirection: "column",

              // Align the heading and buttons to the left.
              alignItems: "flex-start",
              justifyContent: "center",

              // Maintain spacing between the heading and buttons.
              gap: 1.5,

              // Separate the header from the table columns.
              borderBottom: "1px solid #e2e7ee",
            }}
          >
            <Typography
              sx={{
                fontSize: 14,
                fontWeight: 800,
                color: "#1A2434",
              }}
            >
              Received vs completed
            </Typography>
          </Box>

          {/* BAR GRAPH */}

          <Box
            sx={{
              height: 210,
              px: {
                xs: 2,
                sm: 4,
              },
              pt: 2.5,
              pb: 2.5,
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-around",
              gap: {
                xs: 1,
                sm: 2,
              },
              boxSizing: "border-box",
            }}
          >
            {bars.map((bar, index) => (
              <Box
                key={bar.day}
                sx={{
                  height: "100%",
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  minWidth: 0,
                }}
              >
                {/* VALUE */}

                <Typography
                  sx={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#6A7585",
                    mb: 0.7,
                  }}
                >
                  {bar.value}
                </Typography>

                {/* BAR */}

                <Box
                  sx={{
                    width: {
                      xs: 28,
                      sm: 36,
                    },
                    height: `${(bar.value / max) * 125}px`,
                    minHeight: 35,
                    borderRadius: "7px 7px 0 0",
                    background:
                      index === 5
                        ? "linear-gradient(180deg,#8a62dc,#7650c8)"
                        : "linear-gradient(180deg,#4f82ef,#2f6df6)",
                  }}
                />

                {/* DAY */}

                <Typography
                  sx={{
                    fontSize: 11,
                    color: "#6A7585",
                    mt: 0.8,
                  }}
                >
                  {bar.day}
                </Typography>
              </Box>
            ))}
          </Box>
        </Card>

        {/* =================================================
            DISTRIBUTION
        ================================================= */}

        <Card
          elevation={0}
          sx={{
            border: "1px solid #dce3ec",
            borderRadius: "10px",
            overflow: "hidden",
            backgroundColor: "#fff",
          }}
        >
          {/* HEADER */}

          <Box
            sx={{
              px: 2,
              py: 1.5,
              minHeight: 54,
              display: "flex",
              alignItems: "center",
              borderBottom: "1px solid #e2e7ee",
              boxSizing: "border-box",
            }}
          >
            <Typography
              sx={{
                fontSize: 14,
                fontWeight: 800,
                color: "#1A2434",
              }}
            >
              Distribution
            </Typography>
          </Box>

          {/* DONUT BODY */}

          <Box
            sx={{
              minHeight: 210,
              py: 2.5,
              px: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: {
                xs: 2,
                sm: 3,
              },
              flexWrap: {
                xs: "wrap",
                sm: "nowrap",
              },
              boxSizing: "border-box",
            }}
          >
            {/* DONUT */}

            <Box
              sx={{
                width: {
                  xs: 110,
                  sm: 126,
                },
                height: {
                  xs: 110,
                  sm: 126,
                },
                borderRadius: "50%",
                background: `conic-gradient(
                    #20a36f 0deg ${completedDegrees}deg,
                    #e09a22 ${completedDegrees}deg 360deg
                  )`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {/* INNER CIRCLE */}

              <Box
                sx={{
                  width: {
                    xs: 70,
                    sm: 80,
                  },
                  height: {
                    xs: 70,
                    sm: 80,
                  },
                  borderRadius: "50%",
                  backgroundColor: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "column",
                }}
              >
                <Typography
                  sx={{
                    fontSize: 20,
                    fontWeight: 800,
                    color: "#1A2434",
                  }}
                >
                  {summary.completionRate}%
                </Typography>

                <Typography
                  sx={{
                    fontSize: 11,
                    color: "#6A7585",
                  }}
                >
                  Completed
                </Typography>
              </Box>
            </Box>

            {/* LEGEND */}

            <Box>
              {[
                [
                  "#20a36f",
                  `Completed · ${summary.totalCompleted}`,
                ],
                [
                  "#e09a22",
                  `Pending · ${summary.totalPending}`,
                ],
                [
                  "#3475ee",
                  `Received · ${summary.totalReceived}`,
                ],
              ].map(([color, label]) => (
                <Box
                  key={label}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.7,
                    mb: 1.3,
                  }}
                >
                  <Box
                    sx={{
                      width: 9,
                      height: 9,
                      borderRadius: "2px",
                      backgroundColor: color,
                    }}
                  />

                  <Typography
                    sx={{
                      fontSize: 11,
                      color: "#6A7585",
                    }}
                  >
                    {label}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Card>
      </Box>

      {/* Project Daily Summary for the selected production date. */}
      {reportType === "dailySummary" && (
        <>
          {/* Displays API errors. */}
          {dailySummaryError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {dailySummaryError}
            </Alert>
          )}

          {/* Displays the project-wise summary. */}
          <SimpleReportTable
            key={`${dailySummaryDate}-${selectedProject}`}
            title={`Project Daily Summary — ${dailySummaryDate}`}
            loading={dailySummaryLoading}
            emptyMessage="No summary data found for this date."
            rows={filteredDailySummaryRows}
            columns={[
              { key: "productionDate", label: "DATE" },
              { key: "projectName", label: "PROJECT" },
              { key: "categoryName", label: "REPORTING CATEGORY" },
              {
                key: "received",
                label: "RECEIVED",
                render: (row) => Number(row.received || 0).toLocaleString(),
              },
              {
                key: "completed",
                label: "COMPLETED",
                render: (row) => Number(row.completed || 0).toLocaleString(),
              },

              {
                key: "extractedDocuments",
                label: "EXTRACTED DOCUMENTS",
                render: (row) =>
                  Number(row.extractedDocuments || 0).toLocaleString(),
              },

              {
                key: "backlog",
                label: "BACKLOG",
                render: (row) => Number(row.backlog || 0).toLocaleString(),
              },
              {
                key: "pending",
                label: "PENDING",
                render: (row) => Number(row.pending || 0).toLocaleString(),
              },
              {
                key: "batchesReceived",
                label: "BATCHES RECEIVED",
                render: (row) => Number(row.batchesReceived || 0).toLocaleString(),
              },
              {
                key: "batchesProcessed",
                label: "BATCHES PROCESSED",
                render: (row) => Number(row.batchesProcessed || 0).toLocaleString(),
              },
              {
                key: "pendingBatches",
                label: "PENDING BATCHES",
                render: (row) => Number(row.pendingBatches || 0).toLocaleString(),
              },
            ]}
          />
        </>
      )}

      {/* =================================================
          EMPLOYEE TABLE
      ================================================= */}
      {reportType === "employee" && (
        <Card
          elevation={0}
          sx={{
            border: "1px solid #dce3ec",
            borderRadius: "10px",
            overflow: "hidden",
            backgroundColor: "#fff",
          }}
        >
          {/* TABLE TITLE */}

          <Box
            sx={{
              px: 2,
              py: 1.5,
              minHeight: 54,
              display: "flex",
              alignItems: "center",
              borderBottom: "1px solid #e2e7ee",
              boxSizing: "border-box",
            }}
          >
            <Typography
              sx={{
                fontSize: 14,
                fontWeight: 800,
                color: "#17233a",
              }}
            >
              {reportType === "pending"
                ? `Pending backlog — ${periodLabel}`
                : `Employee-wise production — ${periodLabel}`}
            </Typography>
          </Box>
          {/* RESPONSIVE TABLE AREA */}
          <Box
            sx={{
              width: "100%",
              overflowX: "auto",
              WebkitOverflowScrolling: "touch",
            }}
          >
            <Box sx={{ minWidth: 900 }}>
              {/* TABLE HEADER */}

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns:
                    "2fr 2fr 1fr 1fr 1fr 1fr",
                  px: 2,
                  py: 1.5,
                  minWidth: 760,
                  backgroundColor: "#f8fafc",
                  boxSizing: "border-box",
                }}
              >
                {[
                  "EMPLOYEE",
                  "PROJECT",
                  "TARGET",
                  "COMPLETED",
                  "TARGET LEFT",
                  "PRODUCTIVITY",
                ].map((header) => (
                  <Typography
                    key={header}
                    sx={{
                      fontSize: 12,
                      color: "#6A7585",
                      fontWeight: 700,
                    }}
                  >
                    {header}
                  </Typography>
                ))}
              </Box>

              {/* TABLE ROWS */}

              <Box
                sx={{
                  overflowX: "visible",
                  width: "100%",
                }}
              >
                {pagedEmployees.map((employee) => (
                  <Box
                    key={employee[7] || employee[1]}
                    sx={{
                      display: "grid",
                      gridTemplateColumns:
                        "2fr 2fr 1fr 1fr 1fr 1fr",
                      minWidth: 760,
                      px: 2,
                      py: 1.5,
                      minHeight: 62,
                      alignItems: "center",
                      borderTop: "1px solid #e7ebf0",
                      boxSizing: "border-box",
                    }}
                  >
                    {/* EMPLOYEE */}

                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        minWidth: 0,
                      }}
                    >
                      <Avatar
                        sx={{
                          width: 30,
                          height: 30,
                          fontSize: 10,
                          fontWeight: 700,
                          background: "linear-gradient(135deg, #3f7bff, #7a51d6);",
                          flexShrink: 0,
                        }}
                      >
                        {employee[0]}
                      </Avatar>

                      <Typography
                        sx={{
                          fontSize: 13,
                          color: "#6A7585",
                          whiteSpace: "normal",
                          overflowWrap: "anywhere",
                          pr: 2,
                        }}
                      >
                        {employee[1]}
                      </Typography>
                    </Box>

                    {/* PROJECT */}

                    <Typography
                      sx={{
                        fontSize: 13,
                        color: "#6A7585",
                        whiteSpace: "normal",
                        overflowWrap: "anywhere",
                        pr: 2,
                      }}
                    >
                      {employee[2]}
                    </Typography>

                    {/* RECEIVED */}

                    <Typography
                      sx={{
                        fontSize: 13,
                        color: "#1A2434",
                        fontWeight: 500,
                      }}
                    >
                      {employee[3]}
                    </Typography>

                    {/* COMPLETED */}

                    <Typography
                      sx={{
                        fontSize: 13,
                        color: "#1A2434",
                        fontWeight: 500,
                      }}
                    >
                      {employee[4]}
                    </Typography>

                    {/* PENDING */}

                    <Typography
                      sx={{
                        fontSize: 13,
                        color: "#1A2434",
                        fontWeight: 500,
                      }}
                    >
                      {employee[5]}
                    </Typography>

                    {/* PRODUCTIVITY */}

                    <Chip
                      label={employee[6]}
                      size="small"
                      sx={{
                        width: "fit-content",
                        height: 28,
                        backgroundColor: "#e5f7ef",
                        color: "#10694a",
                        border: "1px solid #b9e5d1",
                        fontSize: 11,
                        fontWeight: 800,
                        borderRadius: "15px",
                      }}
                    />

                  </Box>


                ))}
              </Box>
            </Box>
          </Box>
          {empTotalPages > 1 && (
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 1, px: 2, py: 1, borderTop: "1px solid #e2e7ee" }}>
              <Typography sx={{ fontSize: 12, color: "#6A7585" }}>
                {employeeReportPage * EMP_ROWS_PER_PAGE + 1}–{Math.min((employeeReportPage + 1) * EMP_ROWS_PER_PAGE, displayedEmployees.length)} of {displayedEmployees.length}
              </Typography>
              <Button size="small" disabled={employeeReportPage === 0} onClick={() => setEmployeeReportPage((p) => p - 1)} sx={{ minWidth: 28, height: 28, p: 0, fontSize: 16, color: "#6A7585" }}>‹</Button>
              <Button size="small" disabled={employeeReportPage >= empTotalPages - 1} onClick={() => setEmployeeReportPage((p) => p + 1)} sx={{ minWidth: 28, height: 28, p: 0, fontSize: 16, color: "#6A7585" }}>›</Button>
            </Box>
          )}
        </Card>
      )}
      {/* =================================================
    PROJECT-WISE PENDING BACKLOG REPORT
================================================= */}

      {reportType === "pending" && (
        <SimpleReportTable
          title={`Pending backlog — ${periodLabel}`}
          columns={[
            // Display the project name.
            {
              key: "project_name",
              label: "PROJECT",
            },

            // Display the project code.
            {
              key: "project_code",
              label: "PROJECT CODE",
            },

            // Display the received document count.
            {
              key: "received",
              label: "RECEIVED",
              render: (row) => Number(row.received || 0),
            },

            // Display the completed document count.
            {
              key: "completed",
              label: "COMPLETED",
              render: (row) => Number(row.completed || 0),
            },

            // Display the pending document count.
            {
              key: "pending",
              label: "PENDING",
              render: (row) => Number(row.pending || 0),
            },

            // Display the completion percentage.
            {
              key: "productivity",
              label: "PRODUCTIVITY",
              render: (row) => `${Number(row.productivity || 0)}%`,
            },
          ]}
          rows={pendingProjectRows}
        />
      )}
      {/* PROJECT-WISE REPORT */}

      {reportType === "project" && (
        <SimpleReportTable
          title={`Project-wise production — ${periodLabel}`}
          columns={[
            {
              key: "project_name",
              label: "PROJECT",
            },
            {
              key: "project_code",
              label: "CODE",
            },
            {
              key: "client_name",
              label: "CLIENT",
            },
            {
              key: "received",
              label: "RECEIVED",
            },
            {
              key: "completed",
              label: "COMPLETED",
            },
            {
              key: "pending",
              label: "PENDING",
            },
            {
              key: "productivity",
              label: "PRODUCTIVITY",
              render: (row) =>
                `${row.productivity || 0}%`,
            },
          ]}
          rows={projectReportRows}
        />
      )}

      {/* RECEIVED VS COMPLETED REPORT */}

      {reportType === "received" && (
        <SimpleReportTable
          title={`Received vs Completed — ${periodLabel}`}
          columns={[
            {
              key: "day",
              label: "DAY",
            },
            {
              key: "received",
              label: "RECEIVED",
            },
            {
              key: "completed",
              label: "COMPLETED",
            },
            {
              key: "pending",
              label: "PENDING",
            },
          ]}
          rows={bars.map((bar, index) => ({
            id: index + 1,
            day: bar.day,
            received: bar.received,
            completed: bar.completed,
            pending: Math.max(
              Number(bar.received || 0) -
              Number(bar.completed || 0),
              0
            ),
          }))}
        />
      )}

      {/* CORRECTION REQUEST REPORT */}

      {reportType === "correction" && (
        <SimpleReportTable
          title={`Correction request log — ${periodLabel}`}
          columns={[
            {
              key: "id",
              label: "REQUEST ID",
            },
            {
              key: "employee_name",
              label: "EMPLOYEE",
            },
            {
              key: "project_name",
              label: "PROJECT",
            },
            {
              key: "production_date",
              label: "DATE",
            },
            {
              key: "field_name",
              label: "FIELD",
            },
            {
              key: "old_value",
              label: "OLD VALUE",
            },
            {
              key: "new_value",
              label: "NEW VALUE",
            },
            {
              key: "status",
              label: "STATUS",
              render: (row) =>
                String(
                  row.status || "pending"
                ).toUpperCase(),
            },
          ]}
          rows={correctionReportRows}
        />
      )}
      {/* =================================================
    ALL DAILY ENTRIES — ADMIN / CORE TEAM
    SINGLE TABLE WITH ROLE FILTER AND PAGINATION
================================================= */}

      {["administrator", "coreTeam"].includes(roleKey) &&
        reportType === "allEntries" && (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            {/* =============================================
          ROLE FILTER BUTTONS
      ============================================= */}

            {/* =============================================
          ALL DAILY ENTRIES TABLE
          PAGINATION HANDLED BY SimpleReportTable
      ============================================= */}
            <SimpleReportTable
              key={`${dailyEntriesDate}-${dailyEntryRole}`}
              title={`All Daily Entries — ${dailyEntriesDate}`}
              headerActions={
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  {/* Switch between all records, Team Leads and Indexers. */}
                  {[
                    { label: "All Entries", value: "all" },
                    { label: "Team Lead", value: "lead" },
                    { label: "Indexer", value: "indexer" },
                  ].map((option) => (
                    <Button
                      key={option.value}
                      size="small"
                      variant={
                        dailyEntryRole === option.value
                          ? "contained"
                          : "outlined"
                      }
                      onClick={() => setDailyEntryRole(option.value)}
                      sx={{
                        textTransform: "none",
                        borderRadius: "8px",
                        fontWeight: 600,
                      }}
                    >
                      {option.label}
                    </Button>
                  ))}
                </Box>
              }

              columns={[
                // Display the production date.
                {
                  key: "production_date",
                  label: "DATE",
                },

                // Display employee name.
                {
                  key: "employee_name",
                  label: "EMPLOYEE",
                },

                // Display employee role.
                {
                  key: "employee_role",
                  label: "ROLE",
                  render: (row) =>
                    ["lead", "teamLead"].includes(row.employee_role)
                      ? "Team Lead"
                      : "Indexer",
                },

                // Display project name.
                {
                  key: "project_name",
                  label: "PROJECT",
                },

                // Display Team Lead reporting category.
                {
                  key: "team_lead_category",
                  label: "TEAM LEAD CATEGORY",
                },

                // Display Indexer reporting category.
                {
                  key: "indexer_category",
                  label: "INDEXER CATEGORY",
                },

                // Display received documents for Team Leads.
                {
                  key: "received",
                  label: "RECEIVED",
                  render: (row) =>
                    ["lead", "teamLead"].includes(row.employee_role)
                      ? Number(row.received || 0)
                      : "—",
                },

                // Display completed documents for Indexers.
                {
                  key: "completed",
                  label: "COMPLETED",
                  render: (row) =>
                    row.employee_role === "indexer"
                      ? Number(row.completed || 0)
                      : "—",
                },

                // Display received batches for Team Leads and processed batches for Indexers.
                {
                  key: "batches_processed",
                  label: "BATCHES",
                  render: (row) =>
                    ["lead", "teamLead"].includes(row.employee_role)
                      ? Number(row.batches_received || 0)
                      : row.employee_role === "indexer"
                        ? Number(row.batches_processed || 0)
                        : "—",
                },

                // Display actual entry status.
                {
                  key: "status_name",
                  label: "STATUS",
                  render: (row) => row.status_name || "—",
                },

                // Display entry remarks.
                {
                  key: "notes",
                  label: "NOTES",
                },
              ]}
              rows={filteredDailyEntries}
            />
          </Box>
        )}
    </Box>
  );
}