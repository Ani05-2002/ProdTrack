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

function SelectField({ label, children,value,onChange, }) {
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
        <Typography
          sx={{
            fontSize: 14,
            fontWeight: 800,
            color: "#17233a",
          }}
        >
          {title}
        </Typography>
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
      {srTotalPages > 1 && (
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
        reportType === "project"
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
      ]);

      setSummary(summaryData.summary);
      setProjects(projectData.projects || []);

      setProjectReportRows(
        projectReportData.projects || []
      );

      setCorrectionReportRows(
        correctionReportData.corrections || []
      );

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
            initials,
            employeeName,
            employee.projects || "—",
            Number(employee.received || 0),
            Number(employee.completed || 0),
            Number(employee.pending || 0),
            `${Number(employee.productivity || 0)}%`,
            employee.id,
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

  const displayedEmployees =
  reportType === "pending"
    ? [...employees]
        .filter(
          (employee) =>
            Number(employee[5]) > 0
        )
        .sort(
          (a, b) =>
            Number(b[5]) - Number(a[5])
        )
    : employees;

  // Reset employee table page when data or type changes.
  const pagedEmployees = displayedEmployees.slice(
    employeeReportPage * EMP_ROWS_PER_PAGE,
    (employeeReportPage + 1) * EMP_ROWS_PER_PAGE,
  );
  const empTotalPages = Math.ceil(displayedEmployees.length / EMP_ROWS_PER_PAGE);

  const handleCsvDownload = () => {
  if (employees.length === 0) {
    toast.info("No report data is available to export");
    return;
  }

  const headings = [
    "Employee",
    "Project",
    "Received",
    "Completed",
    "Pending",
    "Productivity",
  ];

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
      "Received",
      "Completed",
      "Pending",
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
              <MenuItem value="week">This week</MenuItem>
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
      {["employee", "pending"].includes(
        reportType
      ) && (
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
            ? `Pending backlog — ${
                period === "month"
                  ? "this month"
                  : "this week"
              }`
            : `Employee-wise production — ${
                period === "month"
                  ? "this month"
                  : "this week"
              }`}
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
            "RECEIVED",
            "COMPLETED",
            "PENDING",
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
      {/* PROJECT-WISE REPORT */}

      {reportType === "project" && (
        <SimpleReportTable
          title={`Project-wise production — ${
            period === "month"
              ? "this month"
              : "this week"
          }`}
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
          title={`Received vs Completed — ${
            period === "month"
              ? "this month"
              : "this week"
          }`}
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
          title={`Correction request log — ${
            period === "month"
              ? "this month"
              : "this week"
          }`}
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
    </Box>
  );
}