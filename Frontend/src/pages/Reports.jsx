import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  FormControl,
  Select,
  MenuItem,
  Avatar,
  Chip,
} from "@mui/material";
import apiRequest from "../lib/api.js";
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

function SelectField({ label, children, value, onChange, }) {
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
                defaultValue:
                  children[0]?.props?.value,
              }
          )}
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

export default function Reports({
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
  const periodLabel =
    period === "day"
      ? "today"
      : period === "month"
        ? "this month"
        : "this week";
  const [employeeReportPage, setEmployeeReportPage] = useState(0);
  const EMP_ROWS_PER_PAGE = 10;
  const [bars, setBars] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState("all");
  const [selectedEmployee, setSelectedEmployee] = useState("all");
  const [reportType, setReportType] =
    useState("employee");
  const [projectReportRows, setProjectReportRows] =
    useState([]);

  const [correctionReportRows, setCorrectionReportRows] =
    useState([]);
  const [allDailyEntries, setAllDailyEntries] = useState([]);
  const [dailyEntryRole, setDailyEntryRole] = useState("all");


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
  }, [
    roleKey,
    period,
    selectedProject,
    selectedEmployee,
    toast,
    reportType,
  ]);
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
    // Show all records when no specific role is selected.
    if (dailyEntryRole === "all") return true;

    // Match both supported Team Lead role codes.
    if (dailyEntryRole === "lead") {
      return ["lead", "teamLead"].includes(entry.employee_role);
    }

    // Match Indexer records.
    return entry.employee_role === "indexer";
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
      link.download = `prodtrack-all-daily-entries.csv`;

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

        <Box
          sx={{
            display: "flex",
            gap: 1,
            flexShrink: 0,
            width: {
              xs: "100%",
              md: "auto",
            },
          }}
        >
          <Button
            variant="outlined"
            onClick={handleCsvDownload}
            sx={{
              height: 42,
              flex: {
                xs: 1,
                md: "unset",
              },
              textTransform: "none",
              borderRadius: "8px",
              color: "#1A2434",
              borderColor: "#d5dee9",
              backgroundColor: "#fff",
              fontSize: 13,
              px: 2,
              "&:hover": {
                borderColor: "#2f6df6",
                backgroundColor: "#f8fbff",
              },
            }}
          >
            ↓ CSV
          </Button>

          <Button
            variant="contained"
            startIcon={<DownloadRoundedIcon />}
            onClick={handlePdfDownload}
            sx={{
              height: 42,
              flex: {
                xs: 1,
                md: "unset",
              },
              px: 2,
              textTransform: "none",
              borderRadius: "8px",
              boxShadow: "none",
              fontSize: 13,
              fontWeight: 700,
              "&:hover": {
                boxShadow: "none",
              },
            }}
          >
            PDF
          </Button>
        </Box>
      </Box>

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
            {/* Shows all Indexer and Team Lead entries for Admin and Core Team. */}
            {["administrator", "coreTeam"].includes(roleKey) && (
              <MenuItem value="allEntries">
                All Daily Entries
              </MenuItem>
            )}
          </SelectField>

          {/* PERIOD */}

          <SelectField
            label="Project"
            value={selectedProject}
            onChange={(event) =>
              setSelectedProject(event.target.value)
            }
          >
            <MenuItem value="all">
              All projects
            </MenuItem>

            {projects.map((project) => (
              <MenuItem
                key={project.project_id || project.id}
                value={project.project_id || project.id}
              >
                {project.project_name}
              </MenuItem>
            ))}
          </SelectField>

          <SelectField
            label="Period"
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
          >
            {/* Show only today's records. */}
            <MenuItem value="day">Today</MenuItem>

            {/* Show records from the current week. */}
            <MenuItem value="week">This week</MenuItem>

            {/* Show records from the current month. */}
            <MenuItem value="month">This month</MenuItem>
          </SelectField>

          {/* EMPLOYEE */}

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
              title="All Daily Entries — Today"
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

                // Display processed batches for Indexers.
                {
                  key: "batches_processed",
                  label: "BATCHES",
                  render: (row) =>
                    row.employee_role === "indexer"
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