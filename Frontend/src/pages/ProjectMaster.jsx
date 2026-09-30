// Imports React hooks for state management and loading backend data.
import { useEffect, useMemo, useState } from "react";

// Imports the existing shared Core Team page, form dialog and table components.
import CorePageShell, {
  CoreFormDialog,
  CoreTable,
} from "../components/CorePageShell.jsx";

// Imports the existing Material UI components used for notifications and responsive table wrapping.
import {
  Alert,
  Box,
  Snackbar,
} from "@mui/material";

// Imports the shared authenticated API helper.
import { apiRequest } from "../lib/api.js";


// ============================================================
// PROJECT MASTER HELPERS
// ============================================================

// Converts backend 24-hour time into the existing table's 12-hour display format.
const formatTimeForTable = (time) => {
  // Displays the existing dash when auto-lock is not configured.
  if (!time) {
    return "—";
  }

  // Separates the hour and minute from a MySQL HH:mm:ss value.
  const [hourValue, minuteValue] = time.split(":");

  // Converts the hour to a JavaScript number.
  const hour = Number(hourValue);

  // Determines whether the time is AM or PM.
  const suffix = hour >= 12 ? "PM" : "AM";

  // Converts 24-hour time into a 12-hour clock value.
  const displayHour = hour % 12 || 12;

  // Returns the formatted table value.
  return `${displayHour}:${minuteValue} ${suffix}`;
};


// ============================================================
// CORE TEAM PROJECT MASTER
// ============================================================

// Displays Project Master for Core Team and Administrator without changing the existing UI.
function ProjectMasterCoreTeam({
  breadcrumb = "Core Team",
}) {
  // Controls whether the existing Project Details dialog is open.
  const [open, setOpen] = useState(false);

  // Tracks whether the existing dialog is creating or editing a project.
  const [edit, setEdit] = useState(false);

  // Stores all projects loaded from the backend.
  const [projects, setProjects] = useState([]);

  // Stores reporting categories loaded from the backend.
  const [categories, setCategories] = useState([]);

  // Stores active Team Leads loaded from the backend.
  const [teamLeads, setTeamLeads] = useState([]);

  // Stores the project currently selected for editing.
  const [selectedProject, setSelectedProject] =
    useState(null);

  // Stores the success notification message.
  const [successMessage, setSuccessMessage] =
    useState("");

  // Stores the API error notification message.
  const [errorMessage, setErrorMessage] =
    useState("");

  // Tracks whether the Project Master data is currently loading.
  const [loading, setLoading] = useState(false);


  // ============================================================
  // LOAD PROJECTS
  // ============================================================

  // Loads all Project Master records from the backend.
  const loadProjects = async () => {
    try {
      // Calls the existing Core Team Project Master API.
      const data = await apiRequest(
        "/core-team/projects",
      );

      // Stores the returned projects in React state.
      setProjects(data.projects || []);
    } catch (error) {
      // Logs project-loading errors for debugging.
      console.error(
        "Load Project Master Error:",
        error,
      );

      // Displays the backend error inside the existing Snackbar style.
      setErrorMessage(
        error.message || "Failed to load projects",
      );
    }
  };


  // ============================================================
  // LOAD REPORTING CATEGORIES
  // ============================================================

  // Loads reporting-category dropdown values from the backend.
  const loadCategories = async () => {
    try {
      // Calls the reporting-category API.
      const data = await apiRequest(
        "/core-team/projects/reporting-categories",
      );

      // Stores all available reporting categories.
      setCategories(data.categories || []);
    } catch (error) {
      // Logs category-loading errors for debugging.
      console.error(
        "Load Reporting Categories Error:",
        error,
      );

      // Displays a useful error message.
      setErrorMessage(
        error.message ||
          "Failed to load reporting categories",
      );
    }
  };


  // ============================================================
  // LOAD TEAM LEADS
  // ============================================================

  // Loads active Team Leads for the Assigned Team dropdown.
  const loadTeamLeads = async () => {
    try {
      // Calls the existing Team Lead dropdown API.
      const data = await apiRequest(
        "/core-team/projects/team-leads",
      );

      // Stores Team Lead records in state.
      setTeamLeads(data.teamLeads || []);
    } catch (error) {
      // Logs Team Lead loading errors for debugging.
      console.error(
        "Load Team Leads Error:",
        error,
      );

      // Displays a useful error message.
      setErrorMessage(
        error.message ||
          "Failed to load Team Leads",
      );
    }
  };


  // ============================================================
  // INITIAL PAGE LOAD
  // ============================================================

  // Loads projects and dropdown data when Project Master opens.
  useEffect(() => {
    // Loads all required Project Master API data together.
    const loadProjectMasterData = async () => {
      // Shows the loading state while requests are running.
      setLoading(true);

      // Runs the three independent API requests.
      await Promise.all([
        loadProjects(),
        loadCategories(),
        loadTeamLeads(),
      ]);

      // Removes the loading state after requests finish.
      setLoading(false);
    };

    // Starts loading Project Master data.
    loadProjectMasterData();
  }, []);


  // ============================================================
  // LIVE TABLE ROWS
  // ============================================================

  // Converts backend project objects into the same row-array format expected by CoreTable.
  const rowsCoreTeam = useMemo(
    () =>
      projects.map((project) => [
        // Displays project code.
        project.project_code || "—",

        // Displays project name.
        project.project_name || "—",

        // Displays client name.
        project.client_name || "—",

        // Displays reporting-category name.
        project.reporting_category || "—",

        // Displays formatted auto-lock time.
        formatTimeForTable(
          project.auto_lock_time,
        ),

        // Displays the existing TEAM column using assigned team size.
        String(project.team_size ?? 0),

        // Displays project status using the existing uppercase UI.
        String(
          project.status || "inactive",
        ).toUpperCase(),
      ]),
    [projects],
  );


  // ============================================================
  // LIVE FORM FIELDS
  // ============================================================

  // Creates the same form field structure while replacing hardcoded dropdown values with backend data.
  const fieldsCoreTeam = useMemo(
    () => [
      // Project code field.
      {
        name: "code",
        label: "Project code",
        placeholder: "e.g. ABC",
        required: true,
      },

      // Project name field.
      {
        name: "name",
        label: "Project name",
        placeholder:
          "e.g. ABC Medical Imaging",
        required: true,
      },

      // Client name field.
      {
        name: "client",
        label: "Client name",
        placeholder: "Enter client name",
      },

      // Reporting category field with live backend options.
      {
        name: "category",
        label: "Reporting category",
        placeholder: "Select category",
        options: categories.map(
          (category) => category.name,
        ),
        required: true,
      },

      // Auto-lock timing field.
      {
        name: "lock",
        label: "Auto-lock timing",
        placeholder: "18:00",
        type: "time",
      },

      // Assigned Team field with active Team Leads from the backend.
      {
        name: "team",
        label: "Assigned team",
        placeholder: "Select team",
        options: teamLeads.map(
          (teamLead) => teamLead.name,
        ),
      },

      // Project status field.
      {
        name: "status",
        label: "Status",
        placeholder: "Select status",
        options: ["Active", "Inactive"],
        required: true,
      },
    ],
    [categories, teamLeads],
  );


  // ============================================================
  // NEW PROJECT
  // ============================================================

  // Opens the existing Project Details popup in create mode.
  const openNewProject = () => {
    // Changes the dialog into create mode.
    setEdit(false);

    // Removes any previously selected project.
    setSelectedProject(null);

    // Opens the existing form dialog.
    setOpen(true);
  };


  // ============================================================
  // EDIT PROJECT
  // ============================================================

  // Opens the existing Project Details popup for the selected table project.
  const openEdit = (row, rowIndex) => {
    // Tries to identify the selected project from the supplied CoreTable row.
    let project = null;

    // Uses the row's project code when CoreTable sends the complete row.
    if (Array.isArray(row)) {
      project = projects.find(
        (item) =>
          item.project_code === row[0],
      );
    }

    // Uses a numeric row index when CoreTable sends the index.
    if (
      !project &&
      typeof row === "number"
    ) {
      project = projects[row];
    }

    // Uses the second callback argument when CoreTable supplies row and index separately.
    if (
      !project &&
      typeof rowIndex === "number"
    ) {
      project = projects[rowIndex];
    }

    // Supports CoreTable returning a project-like object.
    if (
      !project &&
      row &&
      typeof row === "object" &&
      !Array.isArray(row)
    ) {
      const projectCode =
        row.project_code ||
        row.code ||
        row[0];

      project = projects.find(
        (item) =>
          item.project_code === projectCode,
      );
    }

    // Falls back to the first project only when the table action does not provide row information.
    if (!project && projects.length === 1) {
      project = projects[0];
    }

    // Stops editing when the selected table row cannot be identified.
    if (!project) {
      setErrorMessage(
        "Unable to identify the selected project.",
      );

      return;
    }

    // Stores the selected backend project.
    setSelectedProject(project);

    // Changes the dialog into edit mode.
    setEdit(true);

    // Opens the existing dialog.
    setOpen(true);
  };


  // ============================================================
  // EDIT FORM VALUES
  // ============================================================

  // Builds initial values for the existing Project Details dialog.
  const initialValues = useMemo(() => {
    // Returns default values when creating a new project.
    if (!edit || !selectedProject) {
      return {
        code: "",
        name: "",
        client: "",
        category: "",
        lock: "",
        team: "",
        status: "",
      };
    }

    // Returns the selected project's current values when editing.
    return {
      code:
        selectedProject.project_code || "",

      name:
        selectedProject.project_name || "",

      client:
        selectedProject.client_name || "",

      category:
        selectedProject.reporting_category ||
        "",

      lock:
        selectedProject.auto_lock_time
          ? selectedProject.auto_lock_time.slice(
              0,
              5,
            )
          : "",

      // Team Lead is left empty because the current projects API returns team size rather than assigned lead ID/name.
      team: "",

      status:
        selectedProject.status === "inactive"
          ? "Inactive"
          : "Active",
    };
  }, [edit, selectedProject]);


  // ============================================================
  // SAVE PROJECT
  // ============================================================

  // Creates or updates a project using values from the existing dialog.
  const handleSaveProject = async (
    formValues,
  ) => {
    try {
      // Finds the reporting-category object selected by its displayed name.
      const selectedCategory =
        categories.find(
          (category) =>
            category.name ===
            formValues.category,
        );

      // Finds the selected Team Lead object by its displayed name.
      const selectedTeamLead =
        teamLeads.find(
          (teamLead) =>
            teamLead.name === formValues.team,
        );

      // Builds the request body expected by the Project Master backend.
      const requestBody = {
        // Sends the project code.
        projectCode:
          formValues.code.trim(),

        // Sends the project name.
        projectName:
          formValues.name.trim(),

        // Sends client name or null when empty.
        clientName:
          formValues.client?.trim() || null,

        // Sends the selected reporting-category database ID.
        categoryId:
          selectedCategory.category_id,

        // Converts the HTML time value into MySQL-compatible HH:mm:ss.
        autoLockTime:
          formValues.lock
            ? `${formValues.lock}:00`
            : null,

        // Sends the selected Team Lead database ID only when a Team Lead was selected.
        ...(formValues.team
          ? {
              teamLeadId:
                selectedTeamLead?.id || null,
            }
          : {}),

        // Converts the UI status into the backend ENUM format.
        status:
          String(
            formValues.status,
          ).toLowerCase(),
      };

      // Updates the selected project when the dialog is in edit mode.
      if (edit && selectedProject) {
        // Calls the PATCH Project Master endpoint.
        await apiRequest(
          `/core-team/projects/${selectedProject.id}`,
          {
            // Uses PATCH because only the selected project is being updated.
            method: "PATCH",

            // Sends Project Master form values as JSON.
            body: JSON.stringify(
              requestBody,
            ),
          },
        );

        // Displays the existing success Snackbar after updating.
        setSuccessMessage(
          "Project updated successfully",
        );
      } else {
        // Calls the POST Project Master endpoint for a new project.
        await apiRequest(
          "/core-team/projects",
          {
            // Uses POST to create a new project.
            method: "POST",

            // Sends Project Master form values as JSON.
            body: JSON.stringify(
              requestBody,
            ),
          },
        );

        // Displays the existing success Snackbar after creation.
        setSuccessMessage(
          "Project saved successfully",
        );
      }

      // Reloads the Project Master table so it immediately shows database changes.
      await loadProjects();

      // Closes the Project Details popup after a successful save.
      setOpen(false);

      // Clears the currently selected project.
      setSelectedProject(null);

      // Resets the edit state.
      setEdit(false);
    } catch (error) {
      // Logs project-save errors for debugging.
      console.error(
        "Save Project Error:",
        error,
      );

      // Displays the backend error without changing the page UI.
      setErrorMessage(
        error.message ||
          "Failed to save project",
      );
    }
  };


  // ============================================================
  // PAGE UI
  // ============================================================

  return (
    <>
      {/* Keeps the original Project Master page layout exactly the same. */}
      <CorePageShell
        breadcrumb={breadcrumb}
        title="Project master"
        description="Create and manage projects — no code changes needed. Configure locking, category and team."
        actionLabel="New project"
        actionHandler={openNewProject}
      >
        {/* Keeps the existing table responsive without changing its visual design. */}
        <Box
          sx={{
            width: "100%",
            overflowX: "auto",
          }}
        >
          {/* Displays live backend Project Master records using the existing table UI. */}
          <CoreTable
            columns={[
              "CODE",
              "PROJECT",
              "CLIENT",
              "CATEGORY",
              "AUTO-LOCK",
              "TEAM",
              "STATUS",
            ]}
            rows={rowsCoreTeam}
            onAction={openEdit}
          />
        </Box>
      </CorePageShell>

      {/* Keeps the existing Project Details dialog while connecting it to live API data. */}
      <CoreFormDialog
        open={open}
        onClose={() => {
          // Closes the existing popup.
          setOpen(false);

          // Clears edit selection after closing.
          setSelectedProject(null);

          // Resets dialog mode.
          setEdit(false);
        }}
        title={
          edit
            ? "Project details"
            : "Project details"
        }
        fields={fieldsCoreTeam}
        initialValues={initialValues}
        values={initialValues}
        submitLabel="Save project"
        onSubmit={handleSaveProject}
      />

      {/* Displays successful create/update messages using the existing Material UI notification style. */}
      <Snackbar
        open={Boolean(successMessage)}
        autoHideDuration={2500}
        onClose={() =>
          setSuccessMessage("")
        }
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={() =>
            setSuccessMessage("")
          }
        >
          {successMessage}
        </Alert>
      </Snackbar>

      {/* Displays API errors without changing the page layout. */}
      <Snackbar
        open={Boolean(errorMessage)}
        autoHideDuration={4000}
        onClose={() =>
          setErrorMessage("")
        }
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
      >
        <Alert
          severity="error"
          variant="filled"
          onClose={() =>
            setErrorMessage("")
          }
        >
          {errorMessage}
        </Alert>
      </Snackbar>

      {/* Keeps the loading variable available without introducing a new UI element. */}
      {void loading}
    </>
  );
}


// ============================================================
// ORIGINAL ADMINISTRATOR VERSION
// ============================================================

// Keeps the previous Administrator-specific component available without changing its UI.
const rowsAdministrator = [
  [
    "ABC",
    "ABC Medical Imaging",
    "ABC Medical",
    "Implant Indexing",
    "6:00 PM",
    "8",
    "ACTIVE",
  ],
  [
    "ORT",
    "Ortho Kids",
    "Ortho Kids Ltd",
    "Field Mapping",
    "7:00 PM",
    "5",
    "ACTIVE",
  ],
  [
    "SPN",
    "Spine Indexing",
    "SpineCare",
    "Indexing",
    "6:00",
    "6",
    "ACTIVE",
  ],
  [
    "CAR",
    "Cardio Records",
    "CardioCrop",
    "QC Review",
    "8:00",
    "4",
    "ACTIVE",
  ],
  [
    "NEU",
    "Neuro Scan",
    "NeuroLab",
    "Indexing",
    "_",
    "3",
    "ACTIVE",
  ],
];

// Keeps the original Administrator form fields unchanged.
const fieldsAdministrator = [
  {
    name: "name",
    label: "Project name",
    placeholder:
      "e.g. ABC Medical Imaging",
  },
  {
    name: "category",
    label: "Category",
    placeholder:
      "e.g. Ortho / Imaging",
  },
  {
    name: "lead",
    label: "Team lead",
    placeholder: "Rohan Mehta",
    options: [
      "Rohan Mehta",
      "Meera Nair",
    ],
  },
  {
    name: "indexers",
    label: "No. of indexers",
    placeholder: "10",
    type: "number",
  },
  {
    name: "status",
    label: "Status",
    placeholder: "Active",
    options: [
      "Active",
      "Inactive",
    ],
  },
];

// Keeps the original standalone Administrator Project Master UI available.
function ProjectMasterAdministrator() {
  // Controls the Administrator dialog.
  const [open, setOpen] =
    useState(false);

  // Controls the Administrator success notification.
  const [saved, setSaved] =
    useState(false);

  return (
    <>
      {/* Keeps the original Administrator page UI. */}
      <CorePageShell
        breadcrumb="Administrator"
        title="Project Master"
        description="Create and manage projects — no code changes needed. Configure locking, category and team."
        actionLabel="Add project"
        actionHandler={() =>
          setOpen(true)
        }
      >
        {/* Keeps the original responsive table wrapper. */}
        <Box
          sx={{
            width: "100%",
            overflowX: "auto",
          }}
        >
          {/* Keeps the original Administrator table. */}
          <CoreTable
            columns={[
              "CODE",
              "PROJECT",
              "CLIENT",
              "CATEGORY",
              "AUTO-LOCK",
              "TEAM",
              "STATUS",
            ]}
            rows={rowsAdministrator}
            onAction={() =>
              setOpen(true)
            }
          />
        </Box>
      </CorePageShell>

      {/* Keeps the original Administrator dialog. */}
      <CoreFormDialog
        open={open}
        onClose={() => {
          setOpen(false);
          setSaved(true);
        }}
        title="Project details"
        fields={fieldsAdministrator}
        submitLabel="Save project"
      />

      {/* Keeps the original Administrator success notification. */}
      <Snackbar
        open={saved}
        autoHideDuration={2500}
        onClose={() =>
          setSaved(false)
        }
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={() =>
            setSaved(false)
          }
        >
          Project saved successfully
        </Alert>
      </Snackbar>
    </>
  );
}

// Keeps the previous Administrator component available.
void ProjectMasterAdministrator;


// ============================================================
// ROLE SWITCH
// ============================================================

// Displays the correct Project Master page for the logged-in role.
export default function ProjectMaster(
  props,
) {
  switch (props.roleKey) {
    // Displays Project Master for Core Team.
    case "coreTeam":
      return (
        <ProjectMasterCoreTeam
          {...props}
        />
      );

    // Reuses the same live Project Master API integration for Administrator.
    case "administrator":
      return (
        <ProjectMasterCoreTeam
          {...props}
          breadcrumb="Administrator"
        />
      );

    // Uses Core Team Project Master as the fallback.
    default:
      return (
        <ProjectMasterCoreTeam
          {...props}
        />
      );
  }
}