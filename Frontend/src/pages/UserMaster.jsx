// Imports React hooks used for loading API data and managing page/dialog state.
import { useEffect, useMemo, useState } from "react";

// Imports the existing MUI components used by the original UI.
import { Chip, Box } from "@mui/material";

// Imports the existing shared Core Team page components.
import CorePageShell, {
  CoreFormDialog,
  CoreTable,
  Person,
} from "../components/CorePageShell.jsx";

// Imports the shared API helper so all requests use the configured backend URL and token.
import { apiRequest } from "../lib/api.js";

// Imports the global toast notification hook.
import { useToast } from "../components/ToastProvider.jsx";


// ============================================================
// ROLE HELPERS
// ============================================================

// Maps backend role IDs to the labels already used by the Users UI.
const roleOptions = [
  { label: "Indexer", value: "1" },
  { label: "Team Lead", value: "2" },
  { label: "Core Team", value: "3" },
  { label: "Administrator", value: "4" },
];

// Converts a role ID into the text shown in the form.
const getRoleLabelFromId = (roleId) => {
  const role = roleOptions.find(
    (item) => Number(item.value) === Number(roleId)
  );

  return role?.label || "";
};

// Converts the selected role label back into the backend role ID.
const getRoleIdFromLabel = (label) => {
  const role = roleOptions.find(
    (item) => item.label === label
  );

  return role ? Number(role.value) : null;
};

// Converts backend role codes into the uppercase labels shown in the table.
const getRoleDisplayLabel = (role) => {
  const roleLabels = {
    indexer: "INDEXER",
    lead: "TEAM LEAD",
    core: "CORE TEAM",
    admin: "ADMINISTRATOR",
  };

  return roleLabels[role] || String(role || "").toUpperCase();
};


// ============================================================
// ACCOUNT HELPERS
// ============================================================

// Generates a username from the user's email because the current UI has no username field.
const generateUsernameFromEmail = (email = "") =>
  email
    .split("@")[0]
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "");

// Generates a temporary password because the existing dialog has no password field.
const generateTemporaryPassword = () => {
  const randomPart = Math.random()
    .toString(36)
    .slice(-6);

  return `Prod@${randomPart}9A`;
};

// Returns initials for the existing Person avatar component.
const getInitials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();


// ============================================================
// SHARED USER MASTER
// ============================================================

function UserMasterPage({
  administrator = false,
}) {
  const toast = useToast();
  // Stores whether the Add/Edit User dialog is open.
  const [open, setOpen] = useState(false);

  // Stores the live users returned by the backend.
  const [users, setUsers] = useState([]);

  // Stores active Team Leads used by the Team Lead dropdown.
  const [teamLeads, setTeamLeads] = useState([]);

  // Stores active projects used by the Assigned Projects dropdown.
  const [projects, setProjects] = useState([]);

  // Stores departments loaded from the database for the Department dropdown.
  const [departments, setDepartments] = useState([]);

  // Stores the user currently being edited; null means Add User mode.
  const [selectedUser, setSelectedUser] = useState(null);

  // Tracks whether API data is currently loading.
  const [loading, setLoading] = useState(false);


  // ==========================================================
  // LOAD USERS
  // ==========================================================

  // Loads all users from the working Core Team Users API.
  const loadUsers = async () => {
    try {
      const response = await apiRequest(
        "/core-team/users"
      );

      setUsers(response.users || []);
    } catch (error) {
      console.error(
        "Load users error:",
        error
      );

      toast.error(
        error.message || "Failed to load users"
      );
    }
  };


  // ==========================================================
  // LOAD TEAM LEADS
  // ==========================================================

  // Loads active Team Leads for the Add/Edit User dialog.
  const loadTeamLeads = async () => {
    try {
      const response = await apiRequest(
        "/core-team/users/team-leads"
      );

      setTeamLeads(
        response.teamLeads || []
      );
    } catch (error) {
      console.error(
        "Load Team Leads error:",
        error
      );
    }
  };


  // ==========================================================
  // LOAD PROJECTS
  // ==========================================================

  // Loads active projects for user assignment.
  const loadProjects = async () => {
    try {
      const response = await apiRequest(
        "/core-team/users/projects"
      );

      setProjects(
        response.projects || []
      );
    } catch (error) {
      console.error(
        "Load projects error:",
        error
      );
    }
  };

  // ==========================================================
// LOAD DEPARTMENTS
// ==========================================================

// Loads departments from the database for the Add/Edit User dialog.
const loadDepartments = async () => {
  try {
    // Calls the new backend Department API.
    const response = await apiRequest(
      "/core-team/users/departments"
    );

    // Stores the returned departments for the dropdown.
    setDepartments(
      response.departments || []
    );
  } catch (error) {
    // Logs department loading errors without changing the existing UI.
    console.error(
      "Load departments error:",
      error
    );
  }
};

  // ==========================================================
  // INITIAL API LOAD
  // ==========================================================

  // Loads Users, Team Leads and Projects when the page first opens.
  useEffect(() => {
    const loadPageData = async () => {
      setLoading(true);

      await Promise.all([
        loadUsers(),
        loadTeamLeads(),
        loadProjects(),
        loadDepartments(),
      ]);

      setLoading(false);
    };

    loadPageData();
  }, []);


  // ==========================================================
  // TABLE ROWS
  // ==========================================================

  // Converts live backend user objects into the exact existing CoreTable structure.
  const tableRows = useMemo(
    () =>
      users.map((user) => [
        <Person
          key={`person-${user.id}`}
          initials={getInitials(user.name)}
          name={user.name}
        />,

        user.employee_id,

        user.department || "—",

        <Chip
          key={`role-${user.id}`}
          label={getRoleDisplayLabel(
            user.role
          )}
          size="small"
          color="primary"
        />,

        user.team_lead_name || "—",

        user.projects?.length
          ? user.projects.length
          : "0",

        String(
          user.status || ""
        ).toUpperCase(),
      ]),
    [users]
  );


  // ==========================================================
  // FORM FIELDS
  // ==========================================================

  // Builds the same existing form fields but replaces static dropdown data with API data.
  const fields = useMemo(
    () => [
          // Shows Employee ID only to Administrator while editing an existing user.
    ...(administrator && selectedUser
      ? [
          {
            name: "employeeId",
            label: "Employee ID",
            placeholder: "e.g. EMP-0005",
            required: true,
          },
        ]
      : []),
      {
        name: "employee",
        label: "Employee name",
        placeholder: "e.g. Aditya Rao",
        required: true,
      },
      {
        name: "email",
        label: "Email",
        placeholder: "name@company.com",
        type: "email",
        required: true,
      },
      // Shows the available database departments as a dropdown.
      // Shows departments loaded dynamically from the database.
      {
         name: "department",
        label: "Department",
        placeholder: "Select department",

        // Converts API department objects into the existing dropdown's text options.
        options: departments.map(
        (department) => department.name
        ),
      },
      {
        name: "designation",
        label: "Designation",
        placeholder: "e.g. Senior Indexer",
      },
      {
        name: "role",
        label: "Role",
        placeholder: "Indexer",
        options: roleOptions.map(
          (role) => role.label
        ),
        required: true,
      },
        // Shows Team Lead only while adding a new user.
  ...(!selectedUser
    ? [
        {
          name: "lead",
          label: "Team lead",
          placeholder:
            teamLeads.length > 0
              ? teamLeads[0].name
              : "e.g. Rohan Mehta",
          options: [
            "None",
            ...teamLeads.map(
              (lead) => lead.name
            ),
          ],
        },
      ]
    : []),
      {
        name: "status",
        label: "Status",
        placeholder: "Select status",
        options: [
          "Active",
          "Inactive",
        ],
        required: true,
      },
      {
        name: "projects",
        label: "Assigned projects",
        placeholder: "Select...",
        options: [
          ...projects.map(
            (project) =>
              project.project_name
          ),
          "All projects",
        ],
      },
    ],
    [teamLeads, projects,departments,administrator, selectedUser]
  );


  // ==========================================================
  // OPEN ADD USER
  // ==========================================================

  // Opens the existing dialog in Add User mode.
  const handleAddUser = () => {
    setSelectedUser(null);
    setOpen(true);
  };


  // ==========================================================
  // OPEN EDIT USER
  // ==========================================================

  // Finds the backend user using the clicked table row index and opens Edit mode.
  const handleEditUser = (
    row,
    rowIndex
  ) => {
    const user = users[rowIndex];

    if (!user) {
      return;
    }

    setSelectedUser(user);
    setOpen(true);
  };


  // ==========================================================
  // FORM INITIAL VALUES
  // ==========================================================

  // Converts the selected backend user into values understood by CoreFormDialog.
  const initialValues = useMemo(() => {
    if (!selectedUser) {
      return {
        employee: "",
        email: "",
        department: "",
        designation: "",
        role: "Indexer",
        lead: "None",
        status: "",
        projects: "",
      };
    }

    // Finds the Team Lead name already assigned to the selected employee.
    const leadName =
      selectedUser.team_lead_name ||
      "None";

    // Determines how the current project assignment should appear in the existing single-select control.
    let projectValue = "";

    // Shows the project directly when exactly one project is assigned.
    if (
      selectedUser.projects?.length === 1
    ) {
      projectValue =
        selectedUser.projects[0];
    }

    // Shows All projects when every active project is assigned.
    if (
      projects.length > 0 &&
      selectedUser.project_ids?.length ===
        projects.length
    ) {
      projectValue = "All projects";
    }

    return {
      employeeId: selectedUser.employee_id || "",
      employee: selectedUser.name || "",
      email: selectedUser.email || "",
      department:
        selectedUser.department || "",
      designation:
        selectedUser.designation || "",
      role: getRoleLabelFromId(
        selectedUser.role_id
      ),
      lead: leadName,
      status:
        selectedUser.status === "inactive"
          ? "Inactive"
          : "Active",
      projects: projectValue,
    };
  }, [selectedUser, projects]);


  // ==========================================================
  // PROJECT VALUE → IDS
  // ==========================================================

  // Converts the form's project dropdown selection into project IDs expected by the backend.
  const getSelectedProjectIds = (
    projectSelection
  ) => {
    // Assigns every active project when All projects is selected.
    if (
      projectSelection ===
      "All projects"
    ) {
      return projects.map(
        (project) => project.id
      );
    }

    // Finds the selected project by its visible project name.
    const selectedProject =
      projects.find(
        (project) =>
          project.project_name ===
          projectSelection
      );

    // Returns either the selected project ID or an empty assignment.
    return selectedProject
      ? [selectedProject.id]
      : [];
  };


  // ==========================================================
  // TEAM LEAD VALUE → ID
  // ==========================================================

  // Converts the selected Team Lead name into its backend user ID.
  const getSelectedTeamLeadId = (
    leadName
  ) => {
    if (
      !leadName ||
      leadName === "None"
    ) {
      return null;
    }

    const lead = teamLeads.find(
      (item) =>
        item.name === leadName
    );

    return lead?.id || null;
  };


  // ==========================================================
  // SAVE USER
  // ==========================================================

  // Creates a new user or updates the selected existing user.
  const handleSubmit = async (
    values
  ) => {
    try {
      // Converts the visible Role label into the normalized database role ID.
      const roleId =
        getRoleIdFromLabel(
          values.role
        );

      // Finds the database department selected by its visible name.
    const selectedDepartment =
    departments.find(
    (department) =>
      department.name === values.department
      );

// Gets the real database department ID instead of using a hardcoded mapping.
const departmentId =
  selectedDepartment?.id || null;
      // Converts Team Lead selection into its user ID.
      const teamLeadId =
        getSelectedTeamLeadId(
          values.lead
        );

      // Converts Active/Inactive into lowercase backend values.
      const status =
        values.status === "Inactive"
          ? "inactive"
          : "active";


      // ======================================================
      // EDIT EXISTING USER
      // ======================================================

      if (selectedUser) {
        // Builds the PATCH body using fields supported by updateUser().
        const updateBody = {
          name: values.employee,
          email: values.email,
           ...(administrator
          ? { employeeId: values.employeeId }
          : {}),
          departmentId,
          designation:
            values.designation,
          roleId,
          status,
        };

        /*
         * Only updates project assignments when the user selected a
         * project value. This prevents existing multi-project users
         * from accidentally losing assignments when the single-select
         * UI cannot represent all of their current projects.
         */
        if (values.projects) {
          updateBody.projectIds =
            getSelectedProjectIds(
              values.projects
            );
        }

        // Sends the user update to the working PATCH endpoint.
        await apiRequest(
          `/core-team/users/${selectedUser.id}`,
          {
            method: "PATCH",
            body: JSON.stringify(
              updateBody
            ),
          }
        );

        // Closes the dialog after successful update.
        setOpen(false);

        // Clears Edit mode.
        setSelectedUser(null);

        // Reloads fresh database values into the table.
        await loadUsers();

        return;
      }


      // ======================================================
      // CREATE NEW USER
      // ======================================================

      // Generates the username from the entered email address.
      const username =
        generateUsernameFromEmail(
          values.email
        );

      // Generates a temporary first-login password.
      const temporaryPassword =
        generateTemporaryPassword();

      // Builds the exact request body required by createUser().
      const createBody = {
        name: values.employee,
        username,
        email: values.email,
        password: temporaryPassword,
        roleId,
        departmentId,
        designation:
          values.designation,
        teamLeadId,
        status,
        projectIds:
          getSelectedProjectIds(
            values.projects
          ),
      };

      // Sends the new user to the working POST endpoint.
      const response = await apiRequest(
        "/core-team/users",
        {
          method: "POST",
          body: JSON.stringify(
            createBody
          ),
        }
      );

      // Closes the existing dialog after creation.
      setOpen(false);

      // Reloads the Users table with the newly-created database user.
      await loadUsers();

      // Shows the generated credentials once because the current UI contains no username/password fields.
      toast.success(
        `User created successfully.\n\nEmployee ID: ${
          response.user?.employee_id || ""
        }\nUsername: ${username}\nTemporary Password: ${temporaryPassword}`
      );
    } catch (error) {
      console.error(
        "Save user error:",
        error
      );

      // Shows the backend error without a bottom toast — CoreFormDialog handles display.
      // Do not re-throw so the dialog stays open quietly.
    }
  };


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <>
      <CorePageShell
        // Keeps the Administrator breadcrumb used by the original Administrator version.
        breadcrumb={
          administrator
            ? "Administrator"
            : undefined
        }
        // Keeps the original page title for each role.
        title={
          administrator
            ? "User master"
            : "Users"
        }
        // Keeps the original page description exactly the same.
        description="Centralised user management — roles, departments and assignments."
        // Keeps the original Add user action.
        actionLabel="Add user"
        // Opens the form in Add mode.
        actionHandler={handleAddUser}
      >
        <Box
          sx={{
            width: "100%",
            overflowX: "auto",
          }}
        >
          <CoreTable
            // Keeps the original table columns exactly the same.
            columns={[
              "EMPLOYEE",
              "EMP ID",
              "DEPT",
              "ROLE",
              "TEAM LEAD",
              "PROJECTS",
              "STATUS",
            ]}
            // Uses live rows instead of the original hardcoded rows.
            rows={tableRows}
            // Opens the selected table user in Edit mode.
            onAction={handleEditUser}
          />
        </Box>

        {/* Keeps loading behavior lightweight without changing the existing page design. */}
        {loading && users.length === 0
          ? null
          : null}
      </CorePageShell>

      <CoreFormDialog
        // Controls whether the existing dialog is open.
        open={open}
        // Closes the dialog and clears Edit mode.
        onClose={() => {
          setOpen(false);
          setSelectedUser(null);
        }}
        // Keeps the original dialog title.
        title="User details"
        // Supplies API-powered form fields.
        fields={fields}
        // Supplies existing user data when editing.
        initialValues={initialValues}
        // Sends Add/Edit values to the backend.
        onSubmit={handleSubmit}
        // Keeps the original Save user button label.
        submitLabel="Save user"
      />
    </>
  );
}


// ============================================================
// ROLE-SPECIFIC WRAPPERS
// ============================================================

// Renders the shared live Users module for Core Team.
function UserMasterCoreTeam() {
  return (
    <UserMasterPage
      administrator={false}
    />
  );
}

// Renders the same shared live Users module for Administrator.
function UserMasterAdministrator() {
  return (
    <UserMasterPage
      administrator
    />
  );
}


// ============================================================
// MAIN EXPORT
// ============================================================

// Selects the correct Users page according to the logged-in application role.
export default function UserMaster(
  props
) {
  switch (props.roleKey) {
    case "coreTeam":
      return (
        <UserMasterCoreTeam
          {...props}
        />
      );

    case "administrator":
      return (
        <UserMasterAdministrator
          {...props}
        />
      );

    default:
      return (
        <UserMasterCoreTeam
          {...props}
        />
      );
  }
}