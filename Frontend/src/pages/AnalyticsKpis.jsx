// Imports React state and lifecycle hooks for loading live Analytics data.
import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Snackbar,
  Alert,
  Typography,
  Paper,
    // Provides the dropdown container for the Analytics month filter.
  Menu,

  // Provides each selectable month inside the Analytics filter.
  MenuItem,
} from "@mui/material";
import CorePageShell, {
  CoreMetricCards,
  SectionCard,
  Person,
} from "../components/CorePageShell.jsx";

// Imports the shared authenticated API helper used for Core Team Analytics requests.
import { apiRequest } from "../lib/api.js";
// Displays Completed vs Target data while preserving the original chart UI.
function TrendChartCoreTeam({ trend, targetConfigured }) {
  // Converts backend values into normal numeric chart values.
  const chartData = (trend || []).map((item) => ({
    ...item,
    completed: Number(item.completed || 0),
    target: Number(item.target || 0),
  }));

  // Finds the highest value so chart points can be scaled inside the SVG.
  const maxValue = Math.max(
    ...chartData.flatMap((item) => [item.completed, item.target]),
    1,
  );

  // Converts Completed values into SVG coordinates.
  const completedPoints = chartData
    .map((item, index) => {
      const x =
        chartData.length > 1
          ? (index / (chartData.length - 1)) * 800
          : 400;

      const y = 158 - (item.completed / maxValue) * 140;

      return `${x},${y}`;
    })
    .join(" ");

  // Converts Target values into SVG coordinates.
  const targetPoints = chartData
    .map((item, index) => {
      const x =
        chartData.length > 1
          ? (index / (chartData.length - 1)) * 800
          : 400;

      const y = 158 - (item.target / maxValue) * 140;

      return `${x},${y}`;
    })
    .join(" ");

  // Builds the filled area underneath the Completed line.
  const completedAreaPoints =
    chartData.length > 0
      ? `0,158 ${completedPoints} 800,158`
      : "";

  return (
    <Box
      sx={{
        px: 2,
        pt: 2,
        pb: 1,
      }}
    >
      <Box
        sx={{
          width: "100%",
          height: 180,
          position: "relative",
        }}
      >
        {/* Shows a truthful empty state when production targets are not configured. */}
        {!targetConfigured ? (
          <Box
            sx={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#667085",
              fontSize: 13,
            }}
          >
            Production target not configured
          </Box>
        ) : (
          /* Uses the original SVG chart styling when target data is available. */
          <svg
            viewBox="0 0 800 180"
            width="100%"
            height="100%"
            preserveAspectRatio="none"
            role="img"
            aria-label="Completed versus target monthly production trend"
          >
            <defs>
              <linearGradient
                id="trendFill"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor="#3478ed"
                  stopOpacity=".24"
                />

                <stop
                  offset="100%"
                  stopColor="#3478ed"
                  stopOpacity=".04"
                />
              </linearGradient>
            </defs>

            {/* Keeps the original chart baseline. */}
            <line
              x1="0"
              y1="158"
              x2="800"
              y2="158"
              stroke="#dbe3ec"
            />

            {/* Draws a normal trend when multiple months are available. */}
{chartData.length > 1 && (
  <>
    {/* Keeps the blue filled area underneath the Completed trend. */}
    <polygon
      points={completedAreaPoints}
      fill="url(#trendFill)"
    />

    {/* Draws the Completed multi-month trend line. */}
    <polyline
      points={completedPoints}
      fill="none"
      stroke="#3478ed"
      strokeWidth="3"
      strokeLinejoin="round"
      strokeLinecap="round"
    />

    {/* Draws the Target multi-month dotted trend line. */}
    <polyline
      points={targetPoints}
      fill="none"
      stroke="#8052df"
      strokeWidth="2"
      strokeDasharray="7 7"
    />
  </>
)}

{/* Handles a single selected month without creating a triangle. */}
{chartData.length === 1 && (() => {
  // Reads the single selected month's Completed value.
  const completed = chartData[0].completed;

  // Reads the single selected month's Target value.
  const target = chartData[0].target;

  // Calculates the vertical position of the Completed value.
  const completedY =
    158 - (completed / maxValue) * 140;

  // Calculates the vertical position of the Target value.
  const targetY =
    158 - (target / maxValue) * 140;

  return (
    <>
      {/* Adds a light blue area underneath the single-month Completed value. */}
      <polygon
        points={`0,${completedY} 800,${completedY} 800,158 0,158`}
        fill="url(#trendFill)"
      />

      {/* Draws the single-month Completed value as a horizontal blue line. */}
      <line
        x1="0"
        y1={completedY}
        x2="800"
        y2={completedY}
        stroke="#3478ed"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Draws the single-month Target value as a horizontal purple dotted line. */}
      <line
        x1="0"
        y1={targetY}
        x2="800"
        y2={targetY}
        stroke="#8052df"
        strokeWidth="2"
        strokeDasharray="7 7"
      />
    </>
  );
})()}
          </svg>
        )}
      </Box>

      {/* Keeps the original Completed and Target legend unchanged. */}
      <Box
        sx={{
          display: "flex",
          gap: 2,
          pt: 1,
          color: "#526581",
          fontSize: 12,
        }}
      >
        <span>
          <i
            style={{
              display: "inline-block",
              width: 12,
              borderTop: "2px solid #3478ed",
              marginRight: 4,
              verticalAlign: "middle",
            }}
          />
          Completed
        </span>

        <span>
          <i
            style={{
              display: "inline-block",
              width: 12,
              borderTop: "2px dashed #8052df",
              marginRight: 4,
              verticalAlign: "middle",
            }}
          />
          Target
        </span>
      </Box>
    </Box>
  );
}
// Displays live workflow distribution data using the original donut-chart UI.
function StatusChartCoreTeam({ distribution }) {
  // Uses safe zero values until the backend response finishes loading.
  const completed = distribution?.completed ?? 0;
  const pending = distribution?.pending ?? 0;
  const inReview = distribution?.inReview ?? 0;
  const completionRate = distribution?.completionRate ?? 0;
  const received = distribution?.received ?? 0;

  // Calculates the donut percentages from the live backend values.
  const completedPercent = received > 0 ? (completed / received) * 100 : 0;
  const pendingPercent =
    received > 0 ? ((completed + pending) / received) * 100 : 0;

  return (
    <Box
      sx={{
        height: 225,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 5,
        px: 2,
        "@media (max-width: 500px)": {
          gap: 2,
          flexDirection: "column",
          height: 280,
        },
      }}
    >
      <Box
        sx={{
          width: 150,
          height: 150,
          flexShrink: 0,
          borderRadius: "50%",
          // Keeps the original donut colors while using live status percentages.
          background: `conic-gradient(
            #20a36b 0 ${completedPercent}%,
            #e09a20 ${completedPercent}% ${pendingPercent}%,
            #3478ed ${pendingPercent}% 100%
          )`,
          display: "grid",
          placeItems: "center",
        }}
      >
        <Box
          sx={{
            width: 96,
            height: 96,
            borderRadius: "50%",
            bgcolor: "#fff",
            display: "grid",
            placeItems: "center",
            textAlign: "center",
          }}
        >
          <strong
            style={{
              fontSize: 23,
            }}
          >
            {completionRate}%
          </strong>
          <small
            style={{
              color: "#667085",
            }}
          >
            Completed
          </small>
        </Box>
      </Box>
      <Box
        sx={{
          display: "grid",
          gap: 1,
          color: "#10233d",
          fontSize: 12,
        }}
      >
        <span>
          <b
            style={{
              color: "#20a36b",
            }}
          >
            ■
          </b>{" "}
          Completed · {completed}
        </span>
        <span>
          <b
            style={{
              color: "#e09a20",
            }}
          >
            ■
          </b>{" "}
          Pending · {pending}
        </span>
        <span>
          <b
            style={{
              color: "#3478ed",
            }}
          >
            ■
          </b>{" "}
          In review · {inReview}
        </span>
      </Box>
    </Box>
  );
}
function AnalyticsKpisCoreTeam() {
  // Controls the existing Export success notification.
  const [notice, setNotice] = useState(false);

  // Stores the element used to position the existing month dropdown.
const [monthAnchorEl, setMonthAnchorEl] = useState(null);

// Stores the selected production month; empty means all available data.
const [selectedMonth, setSelectedMonth] = useState("");

// Stores the production months returned dynamically by the backend.
const [availableMonths, setAvailableMonths] = useState([]);

// Opens the existing month-filter dropdown.
const handleMonthMenuOpen = (event) => {
  setMonthAnchorEl(event.currentTarget);
};

// Closes the existing month-filter dropdown.
const handleMonthMenuClose = () => {
  setMonthAnchorEl(null);
};

// Changes the selected month and closes the dropdown.
const handleMonthChange = (month) => {
  setSelectedMonth(month);
  setMonthAnchorEl(null);
};

// Builds the month query string used by the Analytics APIs.
const monthQuery = selectedMonth
  ? `?month=${selectedMonth}`
  : "";

  // Stores the live Analytics summary returned by the backend.
  const [analyticsSummary, setAnalyticsSummary] = useState(null);

  // Stores the live status-distribution values returned by the backend.
  const [statusDistribution, setStatusDistribution] = useState(null);

  // Stores live project-comparison data returned by the backend.
  const [projectComparison, setProjectComparison] = useState([]);

  // Stores live top-performer data returned by the backend.
  const [topPerformers, setTopPerformers] = useState([]);

  // Stores Completed vs Target trend data returned by the backend.
const [completedVsTarget, setCompletedVsTarget] = useState([]);

// Stores whether a production target is currently configured in the database.
const [targetConfigured, setTargetConfigured] = useState(false);

// Pagination for top performers table.
const [performersPage, setPerformersPage] = useState(0);
const PERFORMERS_PER_PAGE = 10;

// Loads available production months once when the Analytics page opens.
useEffect(() => {
  // Requests the months that actually contain production data.
  const loadAvailableMonths = async () => {
    try {
      // Calls the Monthly Analytics endpoint used to build the month dropdown.
      const data = await apiRequest(
        "/core-team/analytics/monthly",
      );

      // Converts backend monthly records into dropdown options.
      const dynamicMonths = (data.monthly || [])
        .map((item) => ({
          value: item.month_key,
          label: item.month_name,
        }))
        // Shows the newest available production month first.
        .reverse();

      // Stores the database-driven month list.
      setAvailableMonths(dynamicMonths);
    } catch (error) {
      // Logs month-loading errors without breaking the Analytics page.
      console.error(
        "Available Analytics Months Error:",
        error,
      );

      // Keeps the dropdown safe if month loading fails.
      setAvailableMonths([]);
    }
  };

  // Loads the available production months once when the page opens.
  loadAvailableMonths();
}, []);


  // Loads all currently connected Core Team Analytics data when the page opens.
  useEffect(() => {
    // Loads the main organisation-wide KPI summary.
   // Loads the main Analytics KPI summary for the selected month.
const loadAnalyticsSummary = async () => {
  try {
    // Calls the summary API using the current month filter.
    const data = await apiRequest(
      `/core-team/analytics/summary${monthQuery}`,
    );

    // TEMP: Shows exactly what the frontend receives from the backend.
    console.log("SUMMARY API RESPONSE:", data);

    // Stores the returned summary object for the KPI cards.
    setAnalyticsSummary(data?.summary || null);
  } catch (error) {
    // Shows the exact frontend API error if the request fails.
    console.error("Analytics Summary Error:", error);
  }
};

    // Loads the production workflow status distribution.
    const loadStatusDistribution = async () => {
      try {
        // Loads workflow Status Distribution for the selected month.
const data = await apiRequest(
  `/core-team/analytics/status-distribution${monthQuery}`,
);
        setStatusDistribution(data.distribution);
      } catch (error) {
        console.error("Status Distribution Error:", error);
      }
    };

    // Loads live project comparison values.
    const loadProjectComparison = async () => {
      try {
        // Loads Project Comparison for the selected month.
          const data = await apiRequest(`/core-team/analytics/projects${monthQuery}`,);
        setProjectComparison(data.projects || []);
      } catch (error) {
        console.error("Project Comparison Error:", error);
      }
    };

    // Loads live employee performance values.
    const loadTopPerformers = async () => {
      try {
          // Loads Top Performers for the selected month.
        const data = await apiRequest( `/core-team/analytics/top-performers${monthQuery}`,
);
        setTopPerformers(data.performers || []);
      } catch (error) {
        console.error("Top Performers Error:", error);
      }
    };
    // Loads Completed vs Target Analytics data from the backend.
    // Loads Completed vs Target Analytics for the selected month.
const loadCompletedVsTarget = async () => {
  try {
    // Sends the selected month to the Completed vs Target backend API.
    const data = await apiRequest(
      `/core-team/analytics/completed-vs-target${monthQuery}`,
    );

    // Stores whether production targets are configured.
    setTargetConfigured(Boolean(data.targetConfigured));

    // Stores the filtered Completed vs Target trend.
    setCompletedVsTarget(data.trend || []);
  } catch (error) {
    // Logs Completed vs Target API errors.
    console.error("Completed Vs Target Error:", error);
  }
};

    // Starts all Analytics requests without changing the existing UI structure.
    loadAnalyticsSummary();
    loadStatusDistribution();
    loadProjectComparison();
    loadTopPerformers();
    loadCompletedVsTarget();
    // Reloads Analytics automatically whenever the selected month changes.
  }, [selectedMonth]);

  // Exports the currently displayed Analytics data as a CSV file.
const handleExportAnalytics = () => {
  // Creates a readable name for the currently selected reporting period.
  const selectedMonthLabel = selectedMonth
    ? availableMonths.find(
        (option) => option.value === selectedMonth,
      )?.label || selectedMonth
    : "All Months";

  // Starts the CSV with the selected Analytics period.
  const csvRows = [
    ["ProdTrack Analytics Report"],
    ["Period", selectedMonthLabel],
    [],
    ["KPI SUMMARY"],
    ["Metric", "Value"],

    // Adds the live KPI summary currently displayed on the page.
    [
      "Total Received",
      analyticsSummary?.totalReceived ?? 0,
    ],
    [
      "Total Completed",
      analyticsSummary?.totalCompleted ?? 0,
    ],
    [
      "Backlog",
      analyticsSummary?.backlog ?? 0,
    ],
    [
      "Completion Rate",
      `${analyticsSummary?.completionRate ?? 0}%`,
    ],
    [
      "Average Productivity",
      analyticsSummary?.averageProductivity ?? 0,
    ],
    [
      "Active Indexers",
      analyticsSummary?.activeIndexers ?? 0,
    ],
    [
      "Production Days",
      analyticsSummary?.productionDays ?? 0,
    ],

    [],
    ["STATUS DISTRIBUTION"],
    ["Status", "Documents"],

    // Adds the live workflow distribution values.
    [
      "Completed",
      statusDistribution?.completed ?? 0,
    ],
    [
      "Pending",
      statusDistribution?.pending ?? 0,
    ],
    [
      "In Review",
      statusDistribution?.inReview ?? 0,
    ],

    [],
    ["COMPLETED VS TARGET"],
    [
      "Month",
      "Completed",
      "Target",
      "Achievement Rate",
    ],

    // Adds every currently loaded Completed vs Target record.
    ...completedVsTarget.map((item) => [
      item.month_name || item.month_key,
      item.completed ?? 0,
      item.target ?? 0,
      `${item.achievementRate ?? 0}%`,
    ]),

    [],
    ["PROJECT COMPARISON"],
    [
      "Project Code",
      "Project Name",
      "Received",
      "Completed",
      "Backlog",
      "Completion Rate",
    ],

    // Adds every project from the currently filtered project comparison.
    ...projectComparison.map((project) => [
      project.project_code,
      project.project_name,
      project.received ?? 0,
      project.completed ?? 0,
      project.backlog ?? 0,
      `${project.completion_rate ?? 0}%`,
    ]),

    [],
    ["TOP PERFORMERS"],
    [
      "Employee ID",
      "Employee",
      "Received",
      "Completed",
      "Production Days",
      "Productivity",
      "Average Daily Productivity",
    ],

    // Adds every currently displayed top performer.
    ...topPerformers.map((performer) => [
      performer.employee_id,
      performer.name,
      performer.received ?? 0,
      performer.completed ?? 0,
      performer.productionDays ?? 0,
      `${performer.productivity ?? 0}%`,
      performer.averageDailyProductivity ?? 0,
    ]),
  ];

  // Escapes CSV values so commas, quotes and special characters remain valid.
  const escapeCsvValue = (value) => {
    const stringValue = String(value ?? "");

    return `"${stringValue.replace(/"/g, '""')}"`;
  };

  // Converts all Analytics rows into standard CSV text.
  const csvContent = csvRows
    .map((row) =>
      row.map((value) => escapeCsvValue(value)).join(","),
    )
    .join("\n");

  // Creates a temporary browser file containing the generated CSV.
  const csvBlob = new Blob(
    ["\uFEFF", csvContent],
    {
      type: "text/csv;charset=utf-8;",
    },
  );

  // Creates a temporary browser URL for the generated CSV file.
  const downloadUrl = URL.createObjectURL(csvBlob);

  // Creates an invisible download link.
  const downloadLink = document.createElement("a");

  // Uses the generated CSV URL as the download source.
  downloadLink.href = downloadUrl;

  // Creates a different filename depending on the selected month.
  downloadLink.download = selectedMonth
    ? `ProdTrack_Analytics_${selectedMonth}.csv`
    : "ProdTrack_Analytics_All_Months.csv";

  // Temporarily adds the download link to the page.
  document.body.appendChild(downloadLink);

  // Starts the CSV download.
  downloadLink.click();

  // Removes the temporary download element.
  document.body.removeChild(downloadLink);

  // Releases the temporary browser URL from memory.
  URL.revokeObjectURL(downloadUrl);

  // Shows the existing success Snackbar after the export completes.
  setNotice(true);
};

  return (
    <CorePageShell
      title="Analytics & KPIs"
      description="Real-time production, backlog and performance across all projects."

      headerExtra={
  <>
    {/* Keeps the existing month-filter button styling and opens its dropdown. */}
    <Button
      variant="outlined"
      size="small"
      onClick={handleMonthMenuOpen}
      sx={{
        width: 112,
        height: 36,
        bgcolor: "#fff",
        borderColor: "#c8d9ff",
        borderRadius: "8px",
        justifyContent: "space-between",
        px: 1.5,
        color: "#2458c7",
        fontSize: 12,
        textTransform: "none",
      }}
    >
      
     {/* Shows the selected database-driven month or All months. */}
{selectedMonth
  ? availableMonths.find(
      (option) => option.value === selectedMonth,
    )?.label || "All months"
  : "All months"}

      <span aria-hidden="true">⌄</span>
    </Button>

    {/* Displays available production months below the existing filter button. */}
    <Menu
      anchorEl={monthAnchorEl}
      open={Boolean(monthAnchorEl)}
      onClose={handleMonthMenuClose}
    >
      {/* Creates one selectable menu item for every available production month. */}
    {/* Provides an option to remove the month filter and show all production data. */}
<MenuItem
  selected={selectedMonth === ""}
  onClick={() => handleMonthChange("")}
  sx={{
    fontSize: 12,
    minWidth: 130,
  }}
>
  All months
</MenuItem>

{/* Creates month options automatically from production data returned by the backend. */}
{availableMonths.map((option) => (
  <MenuItem
    key={option.value}
    selected={selectedMonth === option.value}
    onClick={() =>
      handleMonthChange(option.value)
    }
    sx={{
      fontSize: 12,
      minWidth: 130,
    }}
  >
    {option.label}
  </MenuItem>
))}
    </Menu>
  </>
}
        
      actionLabel="Export"
      // Downloads the currently filtered Analytics data.
      actionHandler={handleExportAnalytics}
    >
      {/* Displays live KPI values inside the original metric-card UI. */}
      <CoreMetricCards
        items={[
          [
            "Received (mo.)",
            analyticsSummary?.totalReceived?.toLocaleString() ?? "0",
          ],
          [
            "Completed (mo.)",
            analyticsSummary?.totalCompleted?.toLocaleString() ?? "0",
          ],
          [
            "Backlog",
            analyticsSummary?.backlog?.toLocaleString() ?? "0",
          ],
          [
            "Avg. productivity",
            analyticsSummary?.averageProductivity !== undefined
              ? `${analyticsSummary.averageProductivity}`
              : "0",
          ],
        ]}
      />
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1.6fr 1fr",
          gap: 2,
          "@media (max-width: 800px)": {
            gridTemplateColumns: "1fr",
          },
        }}
      >
        <SectionCard title="Completed vs target — trend">
          <TrendChartCoreTeam  trend={completedVsTarget}
  targetConfigured={targetConfigured} />
        </SectionCard>
        <SectionCard title="Status distribution">
          {/* Passes live status data into the original donut-chart component. */}
          <StatusChartCoreTeam distribution={statusDistribution} />
        </SectionCard>
      </Box>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 2,
          "@media (max-width: 700px)": {
            gridTemplateColumns: "1fr",
          },
        }}
      >
        <SectionCard title="Project comparison">
          <Box
            sx={{
              height: 235,
              display: "flex",
              alignItems: "end",
              justifyContent: "space-around",
              px: 2,
              pb: 2,
              mb:3,
            }}
          >
            {/* Renders live project values with the original bar-chart layout. */}
            {projectComparison.map((project, index) => {
              // Uses completed documents as the existing bar value.
              const value = Number(project.completed || 0);

              // Uses the backend project name for the existing label.
              const name = project.project_name;

              // Finds the largest live value so every bar remains proportional.
              const maxCompleted = Math.max(
                ...projectComparison.map((item) => Number(item.completed || 0)),
                1,
              );

              // Converts the completed count into the original maximum bar height.
              const barHeight = (value / maxCompleted) * 145;

              return (
                <Box
                  key={project.id}
                  sx={{
                    width: 38,
                    height: `${barHeight}px`,
                    maxHeight: 145,
                    bgcolor:
                      index === projectComparison.length - 1
                        ? "#8060d9"
                        : "#4b7ff0",
                    borderRadius: "7px 7px 0 0",
                    position: "relative",
                  }}
                >
                  <Typography
                    sx={{
                      position: "absolute",
                      top: -22,
                      width: 40,
                      textAlign: "center",
                      fontSize: 11,
                    }}
                  >
                    {value}
                  </Typography>
                  <Typography
                    sx={{
                      position: "absolute",
                      bottom: -24,
                      width: 50,
                      left: -6,
                      textAlign: "center",
                      fontSize: 11,
                      color: "#526581",
                    }}
                  >
                    {name.split(" ")[0]}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </SectionCard>
        <SectionCard title="Top performers — this month">
  <Box
    sx={{
      display: "grid",
      gridTemplateColumns: "repeat(3, minmax(max-content, 1fr))",
      bgcolor: "#f8fafc",
      px: 2,
      py: 1,
      color: "#526581",
      fontSize: 11,
      fontWeight: 700,
      alignItems: "center",
      gap: 1,
    }}
  >
    <span>EMPLOYEE</span>
    <span>COMPLETED</span>
    <span>PRODUCTIVITY</span>
  </Box>

  {topPerformers.slice(performersPage * PERFORMERS_PER_PAGE, (performersPage + 1) * PERFORMERS_PER_PAGE).map((performer) => {
    const initials = performer.name
      ? performer.name
          .split(" ")
          .map((part) => part[0])
          .join("")
          .slice(0, 2)
          .toUpperCase()
      : "";

    return (
      <Box
        key={performer.id}
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(max-content, 1fr))",
          alignItems: "center",
          px: 2,
          py: 1.1,
          borderTop: "1px solid #e3e8ef",
          fontSize: 12,
          gap: 1,
        }}
      >
        <Person initials={initials} name={performer.name} />

        <span>{performer.completed}</span>

        <Chip
          label={`${performer.productivity}%`}
          size="small"
          color="success"
          sx={{
            width: 43,
            fontSize: 10,
            fontWeight: 800,
          }}
        />
      </Box>
    );
  })}

  {/* Performers pagination footer */}
  {Math.ceil(topPerformers.length / PERFORMERS_PER_PAGE) > 1 && (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 1,
        px: 2,
        py: 1,
        borderTop: "1px solid #e3e8ef",
      }}
    >
      <Typography sx={{ fontSize: 12, color: "#526581" }}>
        {performersPage * PERFORMERS_PER_PAGE + 1}–
        {Math.min((performersPage + 1) * PERFORMERS_PER_PAGE, topPerformers.length)}{" "}
        of {topPerformers.length}
      </Typography>
      <Button
        size="small"
        disabled={performersPage === 0}
        onClick={() => setPerformersPage((p) => p - 1)}
        sx={{ minWidth: 28, height: 28, p: 0, fontSize: 16, color: "#526581" }}
      >
        ‹
      </Button>
      <Button
        size="small"
        disabled={performersPage >= Math.ceil(topPerformers.length / PERFORMERS_PER_PAGE) - 1}
        onClick={() => setPerformersPage((p) => p + 1)}
        sx={{ minWidth: 28, height: 28, p: 0, fontSize: 16, color: "#526581" }}
      >
        ›
      </Button>
    </Box>
  )}
</SectionCard>
      </Box>
      <Snackbar
        open={notice}
        autoHideDuration={2500}
        onClose={() => setNotice(false)}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={() => setNotice(false)}
        >
          Analytics exported successfully
        </Alert>
      </Snackbar>
    </CorePageShell>
  );
}
const weeklyBarsAdministrator = [
  {
    day: "Mon",
    received: 142,
    completed: 128,
  },
  {
    day: "Tue",
    received: 165,
    completed: 154,
  },
  {
    day: "Wed",
    received: 120,
    completed: 98,
  },
  {
    day: "Thu",
    received: 188,
    completed: 175,
  },
  {
    day: "Fri",
    received: 174,
    completed: 162,
  },
  {
    day: "Sat",
    received: 95,
    completed: 88,
  },
];
const projectKpisAdministrator = [
  ["ABC Medical Imaging", "87%", 87, "4,320", "3,760", "#20a36f"],
  ["Ortho Kids", "94%", 94, "2,100", "1,974", "#3475ee"],
  ["Spine Indexing", "81%", 81, "1,860", "1,505", "#e09a22"],
  ["Cardio Records", "95%", 95, "1,440", "1,368", "#20a36f"],
  ["Neuro Scan", "78%", 78, "760", "593", "#e05a22"],
];
const maxReceivedAdministrator = Math.max(
  ...weeklyBarsAdministrator.map((b) => b.received),
);
function WeeklyChartAdministrator() {
  return (
    <Box
      sx={{
        px: {
          xs: 1,
          sm: 3,
        },
        pt: 2,
        pb: 1,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-around",
          height: {
            xs: 120,
            sm: 160,
          },
          gap: {
            xs: 0.5,
            sm: 1.5,
          },
        }}
      >
        {weeklyBarsAdministrator.map((bar) => (
          <Box
            key={bar.day}
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "flex-end",
              height: "100%",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "flex-end",
                gap: "3px",
                width: "100%",
                justifyContent: "center",
              }}
            >
              <Box
                sx={{
                  width: {
                    xs: 10,
                    sm: 16,
                  },
                  height: `${(bar.received / maxReceivedAdministrator) * 100}%`,
                  minHeight: 10,
                  borderRadius: "4px 4px 0 0",
                  bgcolor: "#cfdeff",
                }}
              />
              <Box
                sx={{
                  width: {
                    xs: 10,
                    sm: 16,
                  },
                  height: `${(bar.completed / maxReceivedAdministrator) * 100}%`,
                  minHeight: 10,
                  borderRadius: "4px 4px 0 0",
                  background: "linear-gradient(180deg,#4f82ef,#2f6df6)",
                }}
              />
            </Box>
            <Typography
              sx={{
                fontSize: {
                  xs: 8,
                  sm: 10,
                },
                color: "#61718a",
                mt: 0.5,
              }}
            >
              {bar.day}
            </Typography>
          </Box>
        ))}
      </Box>

      <Box
        sx={{
          display: "flex",
          gap: 2,
          pt: 1,
          flexWrap: "wrap",
        }}
      >
        {[
          ["#cfdeff", "Received"],
          ["#2f6df6", "Completed"],
        ].map(([color, label]) => (
          <Box
            key={label}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.7,
            }}
          >
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: "2px",
                bgcolor: color,
              }}
            />
            <Typography
              sx={{
                fontSize: 11,
                color: "#526581",
              }}
            >
              {label}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
function AnalyticsKpisAdministrator() {
  const [tablePage, setTablePage] = useState(0);
  const TABLE_ROWS_PER_PAGE = 3;

  const pagedProjectKpis = projectKpisAdministrator.slice(
    tablePage * TABLE_ROWS_PER_PAGE,
    (tablePage + 1) * TABLE_ROWS_PER_PAGE,
  );
  const totalTablePages = Math.ceil(projectKpisAdministrator.length / TABLE_ROWS_PER_PAGE);

  return (
    <CorePageShell
      breadcrumb="Administrator"
      title="Analytics & KPIs"
      description="Monitor organisation-wide KPIs and operational trends."
    >
      {/* ── METRIC CARDS ── */}
      <CoreMetricCards
        items={[
          ["Org Productivity", "89%", "▲ 2.1% MoM"],
          ["Avg Turnaround", "1.4 days", "▼ 0.2 days"],
          ["Correction Rate", "3.2%", "▼ 0.5%"],
          ["Guide Compliance", "91%", "▲ 4%"],
        ]}
      />

      {/* ── CHART + PRODUCTIVITY BARS ── */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            lg: "1.5fr 1fr",
          },
          gap: 2,
          mb: 2,
        }}
      >
        <SectionCard title="Weekly received vs completed">
          <WeeklyChartAdministrator />
        </SectionCard>

        <SectionCard title="Productivity by project">
          {projectKpisAdministrator.map(([name, pct, raw, , , color]) => (
            <Box
              key={name}
              sx={{
                px: 2,
                py: 0.9,
                borderTop: "1px solid #e7ebf0",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  mb: 0.4,
                }}
              >
                <Typography
                  sx={{
                    fontSize: 12,
                    color: "#243b5a",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: "75%",
                  }}
                >
                  {name}
                </Typography>
                <Typography
                  sx={{
                    fontSize: 12,
                    fontWeight: 800,
                    color,
                  }}
                >
                  {pct}
                </Typography>
              </Box>
              <Box
                sx={{
                  height: 5,
                  bgcolor: "#edf1f6",
                  borderRadius: 4,
                  overflow: "hidden",
                }}
              >
                <Box
                  sx={{
                    width: `${raw}%`,
                    height: "100%",
                    bgcolor: color,
                    borderRadius: 4,
                  }}
                />
              </Box>
            </Box>
          ))}
        </SectionCard>
      </Box>

      {/* ── SUMMARY TABLE ── */}
      <Paper
        elevation={0}
        sx={{
          border: "1px solid #dbe3ec",
          borderRadius: 1.5,
          overflow: "hidden",
          bgcolor: "#fff",
        }}
      >
        <Box
          sx={{
            px: 2,
            py: 1.5,
            borderBottom: "1px solid #e3e8ef",
          }}
        >
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: 13,
            }}
          >
            Project-wise production summary
          </Typography>
        </Box>

        {/* Table header */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "2fr 1fr 1fr",
              sm: "2fr 1fr 1fr 1fr",
            },
            px: 2,
            py: 1,
            bgcolor: "#f8fafc",
            borderBottom: "1px solid #e3e8ef",
          }}
        >
          {["PROJECT", "PRODUCTIVITY", "RECEIVED", "COMPLETED"].map((h, i) => (
            <Typography
              key={h}
              sx={{
                fontSize: 10,
                fontWeight: 800,
                color: "#526581",
                display:
                  i === 3
                    ? {
                        xs: "none",
                        sm: "block",
                      }
                    : "block",
              }}
            >
              {h}
            </Typography>
          ))}
        </Box>

        {/* Table rows — current page only */}
        {pagedProjectKpis.map(
          ([name, pct, , received, completed, color]) => (
            <Box
              key={name}
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "2fr 1fr 1fr",
                  sm: "2fr 1fr 1fr 1fr",
                },
                px: 2,
                py: 1.2,
                alignItems: "center",
                borderTop: "1px solid #e7ebf0",
              }}
            >
              <Typography
                sx={{
                  fontSize: {
                    xs: 11,
                    sm: 13,
                  },
                  color: "#243b5a",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {name}
              </Typography>
              <Typography
                sx={{
                  fontSize: 13,
                  fontWeight: 800,
                  color,
                }}
              >
                {pct}
              </Typography>
              <Typography
                sx={{
                  fontSize: 13,
                  color: "#526581",
                }}
              >
                {received}
              </Typography>
              <Typography
                sx={{
                  fontSize: 13,
                  color: "#526581",
                  display: {
                    xs: "none",
                    sm: "block",
                  },
                }}
              >
                {completed}
              </Typography>
            </Box>
          ),
        )}

        {/* Pagination footer */}
        {totalTablePages > 1 && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 1,
              px: 2,
              py: 1,
              borderTop: "1px solid #e3e8ef",
            }}
          >
            <Typography sx={{ fontSize: 12, color: "#526581" }}>
              {tablePage * TABLE_ROWS_PER_PAGE + 1}–
              {Math.min((tablePage + 1) * TABLE_ROWS_PER_PAGE, projectKpisAdministrator.length)}{" "}
              of {projectKpisAdministrator.length}
            </Typography>
            <Button
              size="small"
              disabled={tablePage === 0}
              onClick={() => setTablePage((p) => p - 1)}
              sx={{ minWidth: 28, height: 28, p: 0, fontSize: 16, color: "#526581" }}
            >
              ‹
            </Button>
            <Button
              size="small"
              disabled={tablePage >= totalTablePages - 1}
              onClick={() => setTablePage((p) => p + 1)}
              sx={{ minWidth: 28, height: 28, p: 0, fontSize: 16, color: "#526581" }}
            >
              ›
            </Button>
          </Box>
        )}
      </Paper>
    </CorePageShell>
  );
}
void AnalyticsKpisAdministrator;
export default function AnalyticsKpis(props) {
  switch (props.roleKey) {
    case "coreTeam":
      return <AnalyticsKpisCoreTeam {...props} />;
    case "administrator":
      return <AnalyticsKpisCoreTeam {...props} />;
    default:
      return <AnalyticsKpisCoreTeam {...props} />;
  }
}
