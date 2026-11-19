import { useEffect, useState } from "react";
import {
  Alert,
  Autocomplete,
  Avatar,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Paper,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { apiRequest } from "../lib/api.js";
import { useConfirm } from "../components/ConfirmDialog.jsx";

const FONT = '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
const LINE = "#dfe4ec";
const HEAD = "#1a2434";
const MUTED = "#6a7585";
const ENDPOINT = "/core-team/assignment-matrix";

function getRoleLabel(role) {
  const labels = {
    indexer: "Indexer",
    lead: "Team Lead",
    team_lead: "Team Lead",
    teamlead: "Team Lead",
    manager: "Manager",
    assistant_manager: "Assistant Manager",
    operations_manager: "Operations Manager",
    core: "Manager",
    core_team: "Manager",
    coreteam: "Manager",
    admin: "Administrator",
    administrator: "Administrator",
    hr: "HR",
  };
  return labels[String(role || "").toLowerCase()] || role || "Unknown";
}

function getInitials(name = "") {
  return name.split(" ").filter(Boolean).map((part) => part[0])
    .join("").slice(0, 2).toUpperCase();
}

function getProjectIds(user) {
  return (user?.project_ids || []).map(Number);
}

function getUserLabel(user) {
  const role = getRoleLabel(user.role_code ?? user.roleCode ?? user.role);
  return `${user.name}${user.employee_id ? ` (${user.employee_id})` : ""} — ${role}`;
}

const cardSx = {
  border: `1px solid ${LINE}`,
  borderRadius: "10px",
  boxShadow: "0 1px 3px rgba(16,30,54,.07), 0 4px 16px rgba(16,30,54,.06)",
  bgcolor: "#fff",
};
const buttonSx = { textTransform: "none", borderRadius: "8px", fontWeight: 600 };

export default function AssignmentMatrix({ roleKey, roleLabel }) {
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedProjectIds, setSelectedProjectIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);
  const { confirm, ConfirmElement } = useConfirm();

  const selectedUser = users.find((user) => user.id === selectedUserId) || null;
  const editable = Boolean(selectedUser?.editable);
  const originalIds = getProjectIds(selectedUser);
  const dirty = editable && (
    selectedProjectIds.length !== originalIds.length ||
    selectedProjectIds.some((id) => !originalIds.includes(id))
  );
  const allChecked = projects.length > 0 && projects.every(
    (project) => selectedProjectIds.includes(Number(project.id))
  );
  const assignedCount = projects.filter(
    (project) => selectedProjectIds.includes(Number(project.id))
  ).length;
  const label = roleLabel || ({ administrator: "Administrator", coreTeam: "Core Team" }[roleKey]) || "Administrator";

  // Load projects and existing assignments using the unchanged backend API.
  useEffect(() => {
    let active = true;
    async function loadAssignments() {
      try {
        const response = await apiRequest(ENDPOINT);
        if (!response.success || !Array.isArray(response.projects) || !Array.isArray(response.users)) {
          throw new Error(response.message || "Invalid assignment matrix response");
        }
        if (active) {
          setProjects(response.projects);
          setUsers(response.users);
          setLoadError("");
        }
      } catch (error) {
        if (active) setLoadError(error.message || "Failed to load assignment matrix");
      } finally {
        if (active) setLoading(false);
      }
    }
    loadAssignments();
    return () => { active = false; };
  }, [reloadKey]);

  // Each user starts with their own saved project_ids. Confirm before discarding edits.
  async function handleUserChange(_event, nextUser) {
    if (saving || (nextUser?.id ?? null) === selectedUserId) return;
    if (dirty) {
      const discard = await confirm({
        title: "Unsaved assignment changes",
        message: "Switching users will discard the unsaved changes for this employee.",
        confirmLabel: "Discard and switch",
        cancelLabel: "Keep editing",
      });
      if (!discard) return;
    }
    setSelectedUserId(nextUser?.id ?? null);
    setSelectedProjectIds(getProjectIds(nextUser));
    setSaveError("");
    setSaved(false);
  }

  function toggleProject(projectId, checked) {
    if (!editable || saving) return;
    const id = Number(projectId);
    setSelectedProjectIds((previous) => checked
      ? [...new Set([...previous, id])]
      : previous.filter((value) => value !== id));
  }

  function toggleAll(checked) {
    if (!editable || saving) return;
    setSelectedProjectIds(checked ? projects.map((project) => Number(project.id)) : []);
  }

  // Send exactly one user to the API. The backend replaces only that user's assignments.
  async function handleSave() {
    if (!selectedUser || !editable || !dirty || saving || loading) return;
    const userId = selectedUser.id;
    const projectIds = [...selectedProjectIds];
    setSaving(true);
    setSaveError("");
    setSaved(false);
    try {
      const response = await apiRequest(ENDPOINT, {
        method: "POST",
        body: JSON.stringify({ assignments: [{ userId, projectIds }] }),
      });
      if (!response.success) throw new Error(response.message || "Failed to save assignment changes");
      // Update only the saved user's baseline. Other users remain untouched.
      setUsers((previous) => previous.map((user) => user.id === userId
        ? { ...user, project_ids: projectIds }
        : user));
      setSaved(true);
    } catch (error) {
      setSaveError(error.message || "Failed to save assignment changes");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box sx={{ width: "100%", boxSizing: "border-box", fontFamily: FONT }}>
      <Typography sx={{ fontSize: 12.5, color: MUTED, mb: 0.4 }}>
        ProdTrack · {label}
      </Typography>
      <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" },
        alignItems: { xs: "flex-start", sm: "center" }, justifyContent: "space-between", gap: 1.5, mb: 2 }}>
        <Box>
          <Typography sx={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.4px", color: HEAD }}>
            Project assignment matrix
          </Typography>
          <Typography sx={{ fontSize: 13.5, color: MUTED, mt: 0.3 }}>
            Select an employee and choose the projects they should have access to.
          </Typography>
        </Box>
        <Button variant="contained" onClick={handleSave}
          disabled={!selectedUser || !editable || !dirty || saving || loading}
          sx={{ ...buttonSx, bgcolor: "#2f6df0", boxShadow: "none", flexShrink: 0,
            "&:hover": { bgcolor: "#1f57c9", boxShadow: "none" } }}>
          {saving ? "Saving..." : "Save changes"}
        </Button>
      </Box>

      <Alert severity="info" sx={{ mb: 2, bgcolor: "#f0f7ff", border: "1px solid #c5d9ff" }}>
        Check projects to grant access and uncheck to revoke access for the selected user.
        Indexers and Team Leads can be edited. Management and Administrators have automatic access to all projects.
      </Alert>

      {loading ? (
        <Paper elevation={0} sx={{ ...cardSx, p: 4, textAlign: "center" }}>
          <CircularProgress size={28} />
          <Typography sx={{ mt: 1, color: MUTED }}>Loading users and projects...</Typography>
        </Paper>
      ) : loadError ? (
        <Alert severity="error" action={<Button color="inherit" onClick={() => {
          setLoading(true); setLoadError(""); setReloadKey((key) => key + 1);
        }}>Retry</Button>}>{loadError}</Alert>
      ) : (
        <Paper elevation={0} sx={{ ...cardSx, p: { xs: 2, sm: 3 } }}>
          <Typography sx={{ fontWeight: 700, color: HEAD, fontSize: 14, mb: 1 }}>
            Select user
          </Typography>
          <Autocomplete
            id="assignment-user"
            options={users}
            value={selectedUser}
            onChange={handleUserChange}
            getOptionLabel={getUserLabel}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            disabled={saving}
            noOptionsText="No users found"
            renderInput={(params) => <TextField {...params} label="User" placeholder="Search name or employee ID" size="small" />}
            sx={{ maxWidth: 560, width: "100%" }}
          />

          {!selectedUser ? (
            <Box sx={{ textAlign: "center", py: 5, color: MUTED }}>
              <Typography>{users.length ? "Please select a user to view and assign their projects." : "No active users found."}</Typography>
            </Box>
          ) : (
            <>
              <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.5, my: 2.5 }}>
                <Avatar sx={{ bgcolor: "#4f73e3", width: 40, height: 40, fontSize: 14, fontWeight: 700 }}>
                  {getInitials(selectedUser.name)}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 130 }}>
                  <Typography sx={{ fontWeight: 700, color: HEAD }}>{selectedUser.name}</Typography>
                  <Typography sx={{ fontSize: 12, color: MUTED }}>
                    {selectedUser.employee_id ? `${selectedUser.employee_id} · ` : ""}
                    {getRoleLabel(selectedUser.role_code ?? selectedUser.roleCode ?? selectedUser.role)}
                  </Typography>
                </Box>
                <Chip size="small" label={`${assignedCount} of ${projects.length} assigned`}
                  sx={{ bgcolor: "#eaf1ff", color: "#2458c7", fontWeight: 600 }} />
              </Box>

              {!editable && <Alert severity="info" sx={{ mb: 2 }}>
                {selectedUser.accessType === "global"
                  ? "This user has automatic access to all projects. Assignments cannot be changed manually."
                  : "Project assignments for this role cannot be changed from this page."}
              </Alert>}
              {saveError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSaveError("")}>{saveError}</Alert>}

              <TableContainer sx={{ border: `1px solid ${LINE}`, borderRadius: "8px" }}>
                <Table size="small" aria-label="Projects for selected user">
                  <TableHead sx={{ bgcolor: "#f5f7fa" }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Project code</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Project name</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>Status</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, width: 155 }}>
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", whiteSpace: "nowrap" }}>
                          <Checkbox size="small" checked={allChecked}
                            indeterminate={assignedCount > 0 && !allChecked}
                            disabled={!editable || saving || !projects.length}
                            onChange={(event) => toggleAll(event.target.checked)}
                            slotProps={{ input: { "aria-label": "Assign all projects" } }} />
                          Assign project
                        </Box>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {projects.map((project) => {
                      const checked = selectedProjectIds.includes(Number(project.id));
                      return (
                        <TableRow key={project.id} hover selected={checked}>
                          <TableCell sx={{ fontWeight: 600, color: HEAD }}>{project.project_code || "—"}</TableCell>
                          <TableCell>{project.project_name || "—"}</TableCell>
                          <TableCell align="center">
                            <Typography sx={{ fontSize: 12, color: project.status === "active" ? "#157a52" : MUTED, textTransform: "capitalize" }}>
                              {project.status || "—"}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Checkbox size="small" checked={checked} disabled={!editable || saving}
                              onChange={(event) => toggleProject(project.id, event.target.checked)}
                              slotProps={{ input: { "aria-label": `Assign ${project.project_name || project.project_code || project.id}` } }} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {!projects.length && <TableRow><TableCell colSpan={4} align="center" sx={{ py: 3 }}>No projects found.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </TableContainer>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1, mt: 2 }}>
                <Typography sx={{ fontSize: 12, color: dirty ? "#a65e00" : MUTED }}>
                  {dirty ? "You have unsaved changes." : "Showing saved project assignments."}
                </Typography>
                {dirty && <Button variant="outlined" disabled={saving} sx={buttonSx} onClick={() => {
                  setSelectedProjectIds(getProjectIds(selectedUser)); setSaveError("");
                }}>Discard changes</Button>}
              </Box>
            </>
          )}
        </Paper>
      )}

      <Snackbar open={saved} autoHideDuration={3000} onClose={() => setSaved(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert severity="success" variant="filled" onClose={() => setSaved(false)}>
          Assignment changes saved successfully.
        </Alert>
      </Snackbar>
      {ConfirmElement}
    </Box>
  );
}
