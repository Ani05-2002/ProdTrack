// Imports React hooks used for loading API data and managing page/dialog state.
import { useEffect, useMemo, useRef, useState } from "react";

// Imports the existing MUI components used by the original UI.


import {
  Chip,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Typography,
  TextField,
  MenuItem,
} from "@mui/material";



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
import AddRoundedIcon from "@mui/icons-material/AddRounded";


// ============================================================
// ROLE HELPERS
// ============================================================

// Maps backend role IDs to the labels already used by the Users UI.
// Available roles and their actual database IDs.
const roleOptions = [
  { label: "Indexer", value: "1" },
  { label: "Team Leader", value: "2" },
  { label: "Assistant Manager", value: "5" },
  { label: "Manager", value: "3" },
  { label: "Operations Manager", value: "6" },
  { label: "HR", value: "7" },
  { label: "Admin", value: "4" },
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
// Converts database role codes into readable labels.
const getRoleDisplayLabel = (role) => {
  const roleLabels = {
    indexer: "INDEXER",
    lead: "TEAM LEADER",
    core: "MANAGER", // Supports legacy Core Team records.
    assistant_manager: "ASSISTANT MANAGER",
    manager: "MANAGER",
    operations_manager: "OPERATIONS MANAGER",
    hr: "HR",
    admin: "ADMIN",
  };

  // Show the mapped label or a fallback for unknown roles.
  return roleLabels[String(role || "").toLowerCase()]
    || String(role || "").toUpperCase();
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
const SHIFT_INITIAL_VALUES = {
  shift_name: "",
  shift_start_time: "",
  shift_end_time: "",
  submission_time: "",
  submission_day_offset: "Same Day",
};


// Convert MySQL HH:mm:ss to a readable time.
const formatShiftTime = (value) => {
  if (!value) return "—";

  const match = /^(\d{2}):(\d{2})/.exec(
    String(value)
  );

  if (!match) return "—";

  const hour = Number(match[1]);

  if (hour > 23) return "—";

  const displayHour = hour % 12 || 12;
  const period = hour >= 12 ? "PM" : "AM";

  return `${displayHour}:${match[2]} ${period}`;
};



function UserMasterPage({
  administrator = false,
  navigationData = null,
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

  const [shifts, setShifts] = useState([]);

  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
  const [savingShift, setSavingShift] = useState(false);


  // One Admin-only dialog: manage, add, or edit shifts.
  const [editingShift, setEditingShift] = useState(null);
  const [shiftAction, setShiftAction] = useState("manage");
  const [shiftValues, setShiftValues] = useState({
    ...SHIFT_INITIAL_VALUES,
  });

  // Stores the user currently being edited; null means Add User mode.
  const [selectedUser, setSelectedUser] = useState(null);

  const handledSearchTargetRef = useRef(null);

  // Controls whether New Password fields are shown in Edit User mode.
  const [changePassword, setChangePassword] = useState(false);

  // Tracks whether API data is currently loading.
  const [loading, setLoading] = useState(false);


  const [userToDelete, setUserToDelete] = useState(null);
  const [deletingUser, setDeletingUser] = useState(false);

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
  // LOAD SHIFTS
  // ==========================================================

  const loadShifts = async () => {
    try {
      const response = await apiRequest(
        "/core-team/users/shifts"
      );

      setShifts(response.shifts || []);

    } catch (error) {
      console.error("Load shifts error:", error);

      toast.error(
        error.message || "Failed to load shifts"
      );
    }
  };

  ///// create Shift plus handle shift 

  const handleSaveShift = async (values) => {
    if (!administrator || savingShift) return;

    const shiftName = String(
      values.shift_name || ""
    ).trim();

    const startTime = String(
      values.shift_start_time || ""
    ).trim();

    const endTime = String(
      values.shift_end_time || ""
    ).trim();

    const submissionTime = String(
      values.submission_time || ""
    ).trim();

    if (!shiftName || !submissionTime) {
      toast.error("Please enter shift details.");
      return;
    }

    if (Boolean(startTime) !== Boolean(endTime)) {
      toast.error(
        "Please enter both shift start and end times."
      );
      return;
    }

    // New shifts must have working hours.
    // Existing shifts may have NULL hours until configured.
    if (!editingShift && (!startTime || !endTime)) {
      toast.error(
        "Please set the shift start and end times."
      );
      return;
    }

    const payload = {
      shift_name: shiftName,
      shift_start_time: startTime,
      shift_end_time: endTime,
      submission_time: submissionTime,
      submission_day_offset:
        values.submission_day_offset === "Next Day"
          ? 1
          : 0,
    };

    const isEditing = Boolean(editingShift);
    const shiftId = Number(editingShift?.id);

    if (isEditing && !Number.isSafeInteger(shiftId)) {
      toast.error("Invalid shift ID.");
      return;
    }

    try {
      setSavingShift(true);

      const endpoint = isEditing
        ? `/core-team/users/shifts/${shiftId}`
        : "/core-team/users/shifts";

      await apiRequest(endpoint, {
        method: isEditing ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });

      await loadShifts();

      // Stay in the same dialog and show the updated shifts list.
      setEditingShift(null);
      setShiftValues({ ...SHIFT_INITIAL_VALUES });
      setShiftAction("manage");

      toast.success(
        isEditing
          ? "Shift updated successfully."
          : "Shift added successfully."
      );
    } catch (error) {
      console.error("Save Shift Error:", error);

      toast.error(
        error.message || "Failed to save shift."
      );
    } finally {
      setSavingShift(false);
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
        loadShifts(),
      ]);

      setLoading(false);
    };

    loadPageData();
  }, []);


  // ==========================================================
  // OPEN EMPLOYEE SELECTED FROM GLOBAL SEARCH
  // ==========================================================

  useEffect(() => {
    if (
      navigationData?.source !== "global-search" ||
      navigationData?.resultType !== "user" ||
      navigationData?.resultId == null
    ) {
      return;
    }

    // Do not reopen the same selection when users reload.
    if (
      handledSearchTargetRef.current === navigationData
    ) {
      return;
    }

    // Find the exact employee using the user ID.
    const targetUser = users.find(
      (user) =>
        String(user.id) ===
        String(navigationData.resultId)
    );

    // Wait until employee data has been loaded.
    if (!targetUser) {
      return;
    }

    // Mark this search navigation as handled.
    handledSearchTargetRef.current = navigationData;

    // Open the existing employee details dialog.
    setSelectedUser(targetUser);
    setChangePassword(false);
    setOpen(true);

  }, [navigationData, users]);


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


        String(user.role || "").trim().toLowerCase() === "indexer"
          ? user.shift_name || "Not assigned"
          : "—",

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

      // Show Username when Administrator edits an existing user.
      ...(administrator && selectedUser
        ? [
          {
            name: "username",
            label: "Username",
            placeholder: "Enter username",
            required: true,
          },
        ]
        : []),

      // Keep the existing username and password fields for Add User.
      ...(administrator && !selectedUser
        ? [
          // Admin chooses the username.
          {
            name: "username",
            label: "Username",
            placeholder: "Enter username",
            required: true,
          },

          // Admin creates the password.
          {
            name: "password",
            label: "Password",
            type: "password",
            placeholder: "Enter password",
            required: true,
          },

          // Admin confirms the password.
          {
            name: "confirmPassword",
            label: "Confirm Password",
            type: "password",
            placeholder: "Confirm password",
            required: true,
          },
        ]
        : []),
      // Shows new password fields only when editing a user and Change Password is enabled.
      ...(administrator && selectedUser && changePassword
        ? [
          {
            name: "password",
            label: "New Password",
            type: "password",
            placeholder: "Enter new password",
            required: true,
          },
          {
            name: "confirmPassword",
            label: "Confirm New Password",
            type: "password",
            placeholder: "Confirm new password",
            required: true,
          },
        ]
        : []),

      // Email is optional in the Admin form.
      // Role-specific validation is performed on submission.
      {
        name: "email",
        label: "Email",
        placeholder: "name@company.com",
        type: "email",
        required: !administrator,
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


      // Shift selection is applicable only to Indexers.

      {
        name: "shift",
        label: "Assign Shift",
        placeholder: "Select shift",

        options: shifts.map(
          (shift) => shift.shift_name
        ),

        required: true,

        visibleWhen: (values) =>
          values.role === "Indexer",
      },

      // Shows Team Lead only while adding a new user.
      // Shows Team Lead in both Add User and Edit User.
      {
        name: "lead",
        label: "Team lead",
        placeholder: "Select team lead",
        options: [
          "None",
          ...teamLeads.map((lead) => lead.name),
        ],
      },
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
    [teamLeads, projects, departments, shifts, administrator, selectedUser, changePassword]
  );


  // ==========================================================
  // OPEN ADD USER
  // ==========================================================

  // Opens the existing dialog in Add User mode.
  // Open Add User and close the Header search dropdown.
  // Open the Add User form with no previously selected user.
  const handleAddUser = () => {
    // Close and clear the Header search.
    window.dispatchEvent(
      new Event("prodtrack-close-search")
    );

    // Clear the selected user so this is a new-user form.
    setSelectedUser(null);

    // Open the Add User dialog.
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
    setChangePassword(false);
    setOpen(true);
  };


  /// delete user Fun 
  const handleConfirmDelete = async () => {
    if (!userToDelete || deletingUser) return;

    try {
      setDeletingUser(true);

      await apiRequest(
        `/core-team/users/${userToDelete.id}`,
        {
          method: "DELETE",
        }
      );

      setUserToDelete(null);

      await loadUsers();

      toast.success("User deleted successfully.");
    } catch (error) {
      console.error("Delete User Error:", error);

      toast.error(
        error.message || "Failed to delete user."
      );
    } finally {
      setDeletingUser(false);
    }
  };


  // ==========================================================
  // FORM INITIAL VALUES
  // ==========================================================

  // Converts the selected backend user into values understood by CoreFormDialog.
  const initialValues = useMemo(() => {
    if (!selectedUser) {
      return {
        employee: "",
        username: "",
        password: "",
        confirmPassword: "",
        email: "",
        department: "",
        designation: "",
        role: "Indexer",
        shift: "",
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
      // Load the existing Employee ID.
      employeeId: selectedUser.employee_id || "",

      // Load the existing Employee name.
      employee: selectedUser.name || "",

      // Load the existing Username.
      username: selectedUser.username || "",

      // Keep password fields empty for security.
      password: "",
      confirmPassword: "",

      // Load the existing email.
      email: selectedUser.email || "",
      department:
        selectedUser.department || "",
      designation:
        selectedUser.designation || "",

      role: getRoleLabelFromId(
        selectedUser.role_id
      ),

      shift: selectedUser.shift_name || "",

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

      // Get the selected shift from Shift Master.

      const selectedShift = shifts.find(
        (shift) => shift.shift_name === values.shift
      );

      // Shift selection is mandatory for Indexers.

      if (values.role === "Indexer" && !selectedShift) {
        toast.error("Please select a valid Indexer shift.");
        return;
      }

      // Non-Indexer employees do not require shifts.

      const shiftId =
        values.role === "Indexer"
          ? Number(selectedShift.id)
          : null;

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
        // Validate the new password only when Administrator selected Change Password.
        if (administrator && changePassword) {
          // Both password fields are required.
          if (!values.password || !values.confirmPassword) {
            toast.error("Please enter and confirm the new password.");
            return;
          }

          // New Password and Confirm New Password must match.
          if (values.password !== values.confirmPassword) {
            toast.error("New passwords do not match.");
            return;
          }
        }
        // Builds the PATCH body using fields supported by updateUser().
        // Get the username entered in the Edit User form.
        const updatedUsername = String(
          values.username || ""
        ).trim();

        // Validate the username before sending the request.
        if (
          administrator &&
          !/^[a-zA-Z0-9._-]{3,60}$/.test(updatedUsername)
        ) {
          toast.error(
            "Username must contain 3–60 letters, numbers, dots, underscores or hyphens."
          );
          return;
        }

        // Build the request body for updating the selected user.
        const updateBody = {
          // Send the updated employee name.
          name: values.employee,

          // Send both Employee ID and Username for Administrator edits.
          ...(administrator
            ? {
              employeeId: values.employeeId,
              username: updatedUsername,
            }
            : {}),

          // Preserve the existing user settings.
          departmentId,
          designation: values.designation,
          roleId,
          teamLeadId,
          shiftId,
          status,
        };

        // Only send email when the user actually changes it.
        const originalEmail = String(selectedUser.email || "").trim();
        const updatedEmail = String(values.email || "").trim();

        if (updatedEmail !== originalEmail) {
          updateBody.email = updatedEmail || null;
        }
        // Sends a new password only when Administrator selected Change Password.
        if (administrator && changePassword) {
          updateBody.password = values.password;
        }

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

      // Identify the selected role.
      const isIndexer = values.role === "Indexer";

      // Use the Admin-entered username.
      // Keep automatic generation for the Core Team.
      const username = administrator
        ? String(values.username || "").trim()
        : generateUsernameFromEmail(values.email);

      // Use the Admin-entered password.
      // Keep automatic generation for the Core Team.
      const temporaryPassword = administrator
        ? values.password
        : generateTemporaryPassword();

      // Convert an empty email to null.
      const email =
        String(values.email || "").trim() || null;

      // Require a username for Admin-created accounts.
      if (administrator && !username) {
        toast.error("Please enter a username.");
        return;
      }

      // Validate the username.
      if (
        administrator &&
        !/^[a-zA-Z0-9._-]{3,60}$/.test(username)
      ) {
        toast.error(
          "Username must contain 3–60 letters, numbers, dots, underscores or hyphens."
        );
        return;
      }

      // Email is optional only for Admin-created Indexers.
      if ((!administrator || !isIndexer) && !email) {
        toast.error("Email is required for this role.");
        return;
      }

      // Require the Admin to enter a password.
      if (administrator && !temporaryPassword) {
        toast.error("Please enter a password.");
        return;
      }

      // Check that both passwords match.
      if (
        administrator &&
        temporaryPassword !== values.confirmPassword
      ) {
        toast.error("Passwords do not match.");
        return;
      }
      // Builds the exact request body required by createUser().
      const createBody = {
        name: values.employee,
        username,
        email,
        password: temporaryPassword,
        roleId,
        departmentId,
        designation:
          values.designation,
        teamLeadId,
        shiftId,
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
      // Do not display Admin-created passwords in notifications.
      toast.success(
        administrator
          ? `User created successfully. Username: ${username}`
          : `User created successfully. Username: ${username}`
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




        {/* Admin-only Shift Management entry point. */}
        {administrator && (
          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-end",
              mb: 2,
            }}
          >


            <Button
              variant="contained"
              startIcon={<AddRoundedIcon />}
              onClick={() => {
                setEditingShift(null);
                setShiftValues({ ...SHIFT_INITIAL_VALUES });
                setShiftAction("manage");
                setShiftDialogOpen(true);
                loadShifts();
              }}
              sx={{
                width: "110px",
                height: "34px",
                minWidth: "110px",
                borderRadius: "10px",
                textTransform: "none",
                fontWeight: 600,
                fontSize: "12px",
              }}
            >
              Shifts
            </Button>


          </Box>
        )}

        <Box
          sx={{
            width: "100%",
            overflowX: "auto",
          }}
        >

          <CoreTable
            columns={[
              "EMPLOYEE",
              "EMP ID",
              "DEPT",
              "ROLE",
              "SHIFT",
              "TEAM LEAD",
              "PROJECTS",
              "STATUS",
            ]}
            rows={tableRows}
            onAction={handleEditUser}
            onDeleteAction={
              administrator
                ? (_row, rowIndex) => {
                  const user = users[rowIndex];

                  if (user) {
                    setUserToDelete(user);
                  }
                }
                : undefined
            }
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
        // Shows a Change Password button only while Administrator is editing a user.
        extraAction={
          administrator && selectedUser
            ? {
              label: changePassword ? "Cancel password change" : "Change Password",
              onClick: () => setChangePassword((current) => !current),
            }
            : null
        }
        // Keeps the original Save user button label.
        submitLabel="Save user"
      />


      {/* One Shift Management dialog with a dropdown for Manage/Add/Edit. */}
      {administrator && (
        <Dialog
          open={shiftDialogOpen}
          onClose={() => {
            if (!savingShift) setShiftDialogOpen(false);
          }}
          fullWidth
          maxWidth="md"
          PaperProps={{ sx: { borderRadius: 2 } }}
        >
          <DialogTitle sx={{ fontWeight: 800 }}>
            Shift Management
            <Typography sx={{ color: "#667085", fontSize: 12, mt: 0.5 }}>
              View, add and edit shifts — all times in IST
            </Typography>
          </DialogTitle>

          <DialogContent dividers>
            <TextField
              select
              fullWidth
              size="small"
              label="Shift action"
              value={shiftAction}
              onChange={(event) => {
                const nextAction = event.target.value;
                setShiftAction(nextAction);

                if (nextAction === "add") {
                  setEditingShift(null);
                  setShiftValues({ ...SHIFT_INITIAL_VALUES });
                } else if (nextAction === "manage") {
                  setEditingShift(null);
                  setShiftValues({ ...SHIFT_INITIAL_VALUES });
                  loadShifts();
                }
              }}
              sx={{ mt: 1, mb: 2 }}
            >
              <MenuItem value="manage">Manage Shifts</MenuItem>
              <MenuItem value="add">Add Shift</MenuItem>
              {editingShift && (
                <MenuItem value="edit">Edit Shift</MenuItem>
              )}
            </TextField>

            {shiftAction === "manage" ? (
              <Box sx={{ overflowX: "auto" }}>
                <Table size="small" sx={{ minWidth: 680 }}>
                  <TableHead>
                    <TableRow>
                      {[
                        "SHIFT NAME",
                        "WORKING HOURS",
                        "SUBMISSION OPENS",
                        "DAY",
                        "ACTION",
                      ].map((heading) => (
                        <TableCell
                          key={heading}
                          sx={{
                            fontSize: 11,
                            fontWeight: 800,
                            color: "#526581",
                          }}
                        >
                          {heading}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {shifts.map((shift) => (
                      <TableRow key={shift.id} hover>
                        <TableCell sx={{ fontWeight: 700 }}>
                          {shift.shift_name}
                        </TableCell>

                        <TableCell>
                          {shift.shift_start_time &&
                            shift.shift_end_time ? (
                            <>
                              {formatShiftTime(shift.shift_start_time)}
                              {" – "}
                              {formatShiftTime(shift.shift_end_time)}
                              {String(shift.shift_end_time) <=
                                String(shift.shift_start_time)
                                ? " (overnight)"
                                : ""}
                            </>
                          ) : (
                            "Not configured"
                          )}
                        </TableCell>

                        <TableCell>
                          {formatShiftTime(shift.submission_time)}
                        </TableCell>

                        <TableCell>
                          {Number(shift.submission_day_offset) === 1
                            ? "Next Day"
                            : "Same Day"}
                        </TableCell>

                        <TableCell>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => {
                              setEditingShift(shift);
                              setShiftValues({
                                shift_name: shift.shift_name || "",
                                shift_start_time: String(
                                  shift.shift_start_time || ""
                                ).slice(0, 5),
                                shift_end_time: String(
                                  shift.shift_end_time || ""
                                ).slice(0, 5),
                                submission_time: String(
                                  shift.submission_time || ""
                                ).slice(0, 5),
                                submission_day_offset:
                                  Number(shift.submission_day_offset) === 1
                                    ? "Next Day"
                                    : "Same Day",
                              });
                              setShiftAction("edit");
                            }}
                            sx={{ textTransform: "none", fontWeight: 700 }}
                          >
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {shifts.length === 0 && (
                  <Typography
                    sx={{ py: 3, textAlign: "center", color: "#667085" }}
                  >
                    No shifts found.
                  </Typography>
                )}
              </Box>
            ) : (

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "1fr 1fr",
                  },
                  columnGap: 2.5,
                  rowGap: 2.5,
                  pt: 0.5,
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "10px",
                    minHeight: 44,
                  },
                }}
              >
                {/* SHIFT NAME */}
                <Box sx={{ gridColumn: "1 / -1" }}>
                  <Typography
                    sx={{
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: "#526581",
                      mb: 0.8,
                    }}
                  >
                    Shift Name *
                  </Typography>

                  <TextField
                    fullWidth
                    size="small"
                    required
                    placeholder="Enter shift name"
                    value={shiftValues.shift_name || ""}
                    onChange={(event) =>
                      setShiftValues((current) => ({
                        ...current,
                        shift_name: event.target.value,
                      }))
                    }
                  />
                </Box>

                {/* SHIFT START TIME */}
                <Box>
                  <Typography
                    sx={{
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: "#526581",
                      mb: 0.8,
                    }}
                  >
                    Shift Start Time (IST)
                  </Typography>

                  <TextField
                    fullWidth
                    size="small"
                    type="time"
                    value={shiftValues.shift_start_time || ""}
                    onChange={(event) =>
                      setShiftValues((current) => ({
                        ...current,
                        shift_start_time: event.target.value,
                      }))
                    }
                    inputProps={{
                      "aria-label": "Shift Start Time IST",
                    }}
                  />
                </Box>

                {/* SHIFT END TIME */}
                <Box>
                  <Typography
                    sx={{
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: "#526581",
                      mb: 0.8,
                    }}
                  >
                    Shift End Time (IST)
                  </Typography>

                  <TextField
                    fullWidth
                    size="small"
                    type="time"
                    value={shiftValues.shift_end_time || ""}
                    onChange={(event) =>
                      setShiftValues((current) => ({
                        ...current,
                        shift_end_time: event.target.value,
                      }))
                    }
                    inputProps={{
                      "aria-label": "Shift End Time IST",
                    }}
                  />
                </Box>

                {/* SUBMISSION OPENING TIME */}
                <Box>
                  <Typography
                    sx={{
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: "#526581",
                      mb: 0.8,
                    }}
                  >
                    Daily Entry Submission Opens (IST) *
                  </Typography>

                  <TextField
                    fullWidth
                    size="small"
                    type="time"
                    required
                    value={shiftValues.submission_time || ""}
                    onChange={(event) =>
                      setShiftValues((current) => ({
                        ...current,
                        submission_time: event.target.value,
                      }))
                    }
                    inputProps={{
                      "aria-label": "Daily Entry Submission Opens IST",
                    }}
                  />
                </Box>

                {/* SUBMISSION DAY */}
                <Box>
                  <Typography
                    sx={{
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: "#526581",
                      mb: 0.8,
                    }}
                  >
                    Submission Day *
                  </Typography>

                  <TextField
                    select
                    fullWidth
                    size="small"
                    value={
                      shiftValues.submission_day_offset || "Same Day"
                    }
                    onChange={(event) =>
                      setShiftValues((current) => ({
                        ...current,
                        submission_day_offset: event.target.value,
                      }))
                    }
                  >
                    <MenuItem value="Same Day">
                      Same Day
                    </MenuItem>

                    <MenuItem value="Next Day">
                      Next Day
                    </MenuItem>
                  </TextField>
                </Box>

                {/* INFORMATION TEXT */}
                <Typography
                  sx={{
                    gridColumn: "1 / -1",
                    fontSize: 12,
                    color: "#667085",
                    mt: 0.5,
                    lineHeight: 1.6,
                  }}
                >
                  Working hours are informational.
                  Submission opening time and day determine
                  when Indexers can submit Daily Entries.
                </Typography>
              </Box>

            )}
          </DialogContent>

          <DialogActions sx={{ p: 2, gap: 1 }}>
            <Button
              disabled={savingShift}
              onClick={() => setShiftDialogOpen(false)}
            >
              Close
            </Button>

            {shiftAction !== "manage" && (
              <Button
                variant="contained"
                disabled={savingShift}
                onClick={() => handleSaveShift(shiftValues)}
                sx={{ textTransform: "none", fontWeight: 700 }}
              >
                {savingShift
                  ? "Saving..."
                  : editingShift
                    ? "Update Shift"
                    : "Save Shift"}
              </Button>
            )}
          </DialogActions>
        </Dialog>
      )}
/// delete diaglog 
      {administrator && (
        <Dialog
          open={Boolean(userToDelete)}
          onClose={() => {
            if (!deletingUser) {
              setUserToDelete(null);
            }
          }}
          fullWidth
          maxWidth="xs"
          PaperProps={{
            sx: { borderRadius: 2 },
          }}
        >
          <DialogTitle sx={{ fontWeight: 800 }}>
            Delete User?
          </DialogTitle>

          <DialogContent>
            <Typography sx={{ fontSize: 14 }}>
              Are you sure you want to delete
              {" "}
              <strong>{userToDelete?.name}</strong>?
            </Typography>

            <Typography
              sx={{
                fontSize: 12,
                color: "#667085",
                mt: 1.5,
              }}
            >
              This employee will be removed from User Master
              and will no longer be able to log in.
              Existing work and audit history will be preserved.
            </Typography>
          </DialogContent>

          <DialogActions sx={{ p: 2, gap: 1 }}>
            <Button
              disabled={deletingUser}
              onClick={() => setUserToDelete(null)}
            >
              No, Cancel
            </Button>

            <Button
              variant="contained"
              color="error"
              disabled={deletingUser}
              onClick={handleConfirmDelete}
            >
              {deletingUser
                ? "Deleting..."
                : "Yes, Delete"}
            </Button>
          </DialogActions>
        </Dialog>
      )}


    </>
  );
}


// ============================================================
// ROLE-SPECIFIC WRAPPERS
// ============================================================

// Renders the shared live Users module for Core Team.

function UserMasterCoreTeam(props) {
  return (
    <UserMasterPage
      {...props}
      administrator={false}
    />
  );
}

function UserMasterAdministrator(props) {
  return (
    <UserMasterPage
      {...props}
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