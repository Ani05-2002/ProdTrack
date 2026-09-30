import {
  useEffect,
  useState,
} from "react";

import apiRequest from "../lib/api.js";
import { useToast } from "../components/ToastProvider.jsx";

import {
  Box,
  Button,
  Typography,
} from "@mui/material";
import CorePageShell, {
  CoreMetricCards,
  CoreTable,
  SectionCard,
  Person,
} from "../components/CorePageShell.jsx";

export default function Compliance({ roleLabel }) {
  const toast = useToast();
  const [complianceData, setComplianceData] =
  useState({
    summary: {
      overallCompliance: 0,
      pendingAcknowledgements: 0,
      activeGuides: 0,
      remindersSent: 0,
    },
    projectCompliance: [],
    guideTracking: [],
    pendingAcknowledgements: [],
  });

useEffect(() => {
  const loadCompliance = async () => {
    try {
      const data = await apiRequest(
        "/compliance"
      );

      setComplianceData({
        summary: data.summary || {},
        projectCompliance:
          data.projectCompliance || [],
        guideTracking:
          data.guideTracking || [],
        pendingAcknowledgements:
          data.pendingAcknowledgements || [],
      });
    } catch (error) {
      console.error(
        "Load Compliance Error:",
        error
      );

      toast.error(error.message);
    }
  };

  loadCompliance();
}, [toast]);

const guideRows =
  complianceData.guideTracking.map(
    (guide) => [
      guide.projectName,
      guide.version,
      `${guide.acknowledged} / ${guide.totalEmployees}`,
    ]
  );

const pendingRows =
  complianceData.pendingAcknowledgements.map(
    (employee) => {
      const employeeName =
        employee.employeeName || "Unknown";

      const initials = employeeName
        .split(" ")
        .filter(Boolean)
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

      return [
        <Person
          key={`${employee.user_id}-${employee.version_id}`}
          initials={initials}
          name={employeeName}
        />,
        employee.emp_code,
        employee.project_name,
        employee.version,
        employee.status || "PENDING",
      ];
    }
  );

  const [sendingReminders, setSendingReminders] =
  useState(false);

const handleSendReminders = async () => {
  if (sendingReminders) {
    return;
  }

  try {
    setSendingReminders(true);

    const data = await apiRequest(
      "/compliance/reminders",
      {
        method: "POST",
      }
    );

    setComplianceData((current) => ({
      ...current,

      summary: {
        ...current.summary,

        remindersSent:
          Number(
            current.summary.remindersSent || 0
          ) +
          Number(data.remindersSent || 0),
      },
    }));

    toast.success(data.message);
  } catch (error) {
    console.error(
      "Send Reminders Error:",
      error
    );

    toast.error(error.message);
  } finally {
    setSendingReminders(false);
  }
};

const handleExportCompliance = () => {
  const escapeCsv = (value) => {
    let text = String(value ?? "");

    // Prevent spreadsheet formula execution.
    if (/^[=+\-@]/.test(text)) {
      text = `'${text}`;
    }

    return `"${text.replaceAll('"', '""')}"`;
  };

  const rows = [
    ["COMPLIANCE SUMMARY"],
    [
      "Overall Compliance",
      `${complianceData.summary.overallCompliance || 0}%`,
    ],
    [
      "Pending Acknowledgements",
      complianceData.summary
        .pendingAcknowledgements || 0,
    ],
    [
      "Active Guides",
      complianceData.summary.activeGuides || 0,
    ],
    [
      "Reminders Sent",
      complianceData.summary.remindersSent || 0,
    ],

    [],

    ["PROJECT-WISE COMPLIANCE"],
    [
      "Project",
      "Required",
      "Acknowledged",
      "Compliance",
    ],

    ...complianceData.projectCompliance.map(
      (project) => [
        project.projectName,
        project.totalRequired,
        project.acknowledged,
        `${project.compliance}%`,
      ]
    ),

    [],

    ["GUIDE VERSION TRACKING"],
    [
      "Project",
      "Version",
      "Employees",
      "Acknowledged",
    ],

    ...complianceData.guideTracking.map(
      (guide) => [
        guide.projectName,
        guide.version,
        guide.totalEmployees,
        guide.acknowledged,
      ]
    ),

    [],

    ["PENDING ACKNOWLEDGEMENTS"],
    [
      "Employee",
      "Employee ID",
      "Project",
      "Guide Version",
      "Status",
    ],

    ...complianceData.pendingAcknowledgements.map(
      (employee) => [
        employee.employeeName,
        employee.emp_code,
        employee.project_name,
        employee.version,
        employee.status || "PENDING",
      ]
    ),
  ];

  const csvContent = rows
    .map((row) =>
      row.map(escapeCsv).join(",")
    )
    .join("\n");

  const file = new Blob(
    [csvContent],
    {
      type: "text/csv;charset=utf-8;",
    }
  );

  const downloadUrl =
    URL.createObjectURL(file);

  const link =
    document.createElement("a");

  link.href = downloadUrl;
  link.download =
    `compliance-report-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(downloadUrl);
};

  return (
  <CorePageShell
      title="Update compliance"
      description="Guide acknowledgement status across employees and projects."
      actionLabel={
        sendingReminders
          ? "Sending..."
          : "Send reminders"
      }
      actionIcon={null}
      actionHandler={handleSendReminders}
      headerExtra={
        <Button
          variant="outlined"
          onClick={handleExportCompliance}
        >
          Export
        </Button>
      }
      breadcrumb={roleLabel}
    >
      <CoreMetricCards
      items={[
          [
            "Overall compliance",
            `${complianceData.summary.overallCompliance || 0}%`,
          ],
          [
            "Pending acks.",
            complianceData.summary
              .pendingAcknowledgements || 0,
          ],
          [
            "Active guides",
            complianceData.summary.activeGuides || 0,
          ],
          [
            "Reminders sent",
            complianceData.summary.remindersSent || 0,
          ],
        ]}
      />
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 2,
          "@media (max-width:700px)": { gridTemplateColumns: "1fr" },
        }}
      >
        <SectionCard title="Project-wise compliance">
          {complianceData.projectCompliance.map(
            (project) => (
            <Box
              key={project.projectId}
              sx={{
                display: "grid",
                gridTemplateColumns: "155px 1fr 45px",
                gap: 1,
                alignItems: "center",
                px: 2,
                py: 0.7,
              }}
            >
              <Typography sx={{ fontSize: 12 }}>{project.projectName}</Typography>
              <Box sx={{ height: 8, bgcolor: "#edf1f6", borderRadius: 4 }}>
                <Box
                  sx={{
                    width: `${project.compliance}%`,
                    height: "100%",
                    bgcolor: "#7251d6",
                    borderRadius: 4,
                  }}
                />
              </Box>
              <Typography sx={{ fontSize: 12 }}>
                {project.compliance || 0}%
              </Typography>
            </Box>
          ))}
        </SectionCard>
        <SectionCard title="Guide version tracking">
          <CoreTable
            columns={["PROJECT", "VERSION", "ACKED"]}
            rows={guideRows}
            actionLabel={null}
          />
        </SectionCard>
      </Box>
      <SectionCard title="Pending acknowledgements">
        <CoreTable
          columns={["EMPLOYEE", "EMP ID", "PROJECT", "GUIDE", "STATUS"]}
          rows={pendingRows}
          actionLabel={null}
        />
      </SectionCard>
    </CorePageShell>
  );
}