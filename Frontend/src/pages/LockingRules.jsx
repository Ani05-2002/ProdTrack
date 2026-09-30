// Imports React hooks for component state and API loading.
import { useEffect, useState } from "react";

// Imports Material UI components used by the Locking Rules page.
import {
  Alert,
  Box,
  Button,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";

// Imports the shared Administrator/Core page shell layout.
import CorePageShell from "../components/CorePageShell.jsx";

// Imports the shared API helper used for authenticated backend requests.
import { apiRequest } from "../lib/api.js";

// Defines the shared styling used by rule dropdowns.
const selectSx = {
  width: "100%",
  height: 42,
  bgcolor: "#fff",
  border: "1px solid #dbe3ec",
  borderRadius: 1.2,
  fontSize: 13,
  "& .MuiSelect-select": {
    px: 1.5,
    py: 1.1,
  },
};

// Defines the shared styling used by project time and grace inputs.
const inputSx = {
  "& .MuiOutlinedInput-root": {
    height: 40,
    bgcolor: "#fff",
    fontSize: 13,
  },
};

// Converts backend HH:mm:ss time into HH:mm format for HTML time inputs.
const formatTimeForInput = (time) => {
  // Returns an empty value when no auto-lock time exists.
  if (!time) {
    return "";
  }

  // Keeps only the HH:mm portion of a backend time value.
  return String(time).substring(0, 5);
};

// Converts frontend HH:mm time back into HH:mm:ss format for the backend.
const formatTimeForBackend = (time) => {
  // Returns null when no time was selected.
  if (!time) {
    return null;
  }

  // Adds seconds when the frontend value contains only hours and minutes.
  return time.length === 5 ? `${time}:00` : time;
};

// Displays the Draft → Submitted → Reviewed → Locked workflow.
function Workflow() {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        mb: 2,
        flexWrap: "wrap",
      }}
    >
      {["Draft", "Submitted", "Reviewed", "Locked"].map((step, index) => (
        <Box
          key={step}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <Button
            variant="contained"
            size="small"
            sx={{
              height: 39,
              minWidth: 61,
              bgcolor: "#3478ed",
            }}
          >
            {step}
          </Button>

          {index < 3 && (
            <Typography
              sx={{
                color: "#94a3b8",
                fontSize: 18,
              }}
            >
              →
            </Typography>
          )}
        </Box>
      ))}
    </Box>
  );
}

// Displays and edits the four Administrator global locking rules.
function GlobalRules({ rules, onChange }) {
  return (
    <Paper
      elevation={0}
      sx={{
        border: "1px solid #dbe3ec",
        borderRadius: 1.5,
        overflow: "hidden",
        bgcolor: "#fff",
      }}
    >
      <Typography
        sx={{
          px: 2,
          py: 1.5,
          fontWeight: 800,
          borderBottom: "1px solid #e3e8ef",
        }}
      >
        Global rules
      </Typography>

      <Box
        sx={{
          p: 2,
          display: "grid",
          gap: 1.7,
        }}
      >
        <Box>
          <Typography
            sx={{
              color: "#526581",
              fontSize: 12,
              mb: 0.6,
            }}
          >
            Draft entries
          </Typography>

          <Select
            value={rules.draftEntryRule}
            onChange={(event) =>
              onChange("draftEntryRule", event.target.value)
            }
            sx={selectSx}
            inputProps={{
              "aria-label": "Draft entries",
            }}
          >
            <MenuItem value="editable_by_indexer">
              Editable by indexer
            </MenuItem>

            <MenuItem value="read_only_for_indexer">
              Read-only for indexer
            </MenuItem>
          </Select>
        </Box>

        <Box>
          <Typography
            sx={{
              color: "#526581",
              fontSize: 12,
              mb: 0.6,
            }}
          >
            Submitted entries
          </Typography>

          <Select
            value={rules.submittedEntryRule}
            onChange={(event) =>
              onChange("submittedEntryRule", event.target.value)
            }
            sx={selectSx}
            inputProps={{
              "aria-label": "Submitted entries",
            }}
          >
            <MenuItem value="read_only_for_indexer">
              Read-only for indexer
            </MenuItem>

            <MenuItem value="editable_by_indexer">
              Editable by indexer
            </MenuItem>
          </Select>
        </Box>

        <Box>
          <Typography
            sx={{
              color: "#526581",
              fontSize: 12,
              mb: 0.6,
            }}
          >
            Locked entries
          </Typography>

          <Select
            value={rules.lockedEntryRule}
            onChange={(event) =>
              onChange("lockedEntryRule", event.target.value)
            }
            sx={selectSx}
            inputProps={{
              "aria-label": "Locked entries",
            }}
          >
            <MenuItem value="correction_request_required">
              Correction request required
            </MenuItem>

            <MenuItem value="read_only">
              Read-only
            </MenuItem>
          </Select>
        </Box>

        <Box>
          <Typography
            sx={{
              color: "#526581",
              fontSize: 12,
              mb: 0.6,
            }}
          >
            Correction approver
          </Typography>

          <Select
            value={rules.correctionApproverRule}
            onChange={(event) =>
              onChange("correctionApproverRule", event.target.value)
            }
            sx={selectSx}
            inputProps={{
              "aria-label": "Correction approver",
            }}
          >
            <MenuItem value="team_lead_then_core_team">
              Team lead, then Core Team
            </MenuItem>

            <MenuItem value="team_lead_only">
              Team lead only
            </MenuItem>

            <MenuItem value="core_team_only">
              Core Team only
            </MenuItem>
          </Select>
        </Box>
      </Box>
    </Paper>
  );
}

// Displays all active projects and allows auto-lock timing edits.
function ProjectRules({ projects, onProjectChange }) {
  return (
    <Paper
      elevation={0}
      sx={{
        border: "1px solid #dbe3ec",
        borderRadius: 1.5,
        overflow: "hidden",
        bgcolor: "#fff",
      }}
    >
      <Typography
        sx={{
          px: 2,
          py: 1.5,
          fontWeight: 800,
          borderBottom: "1px solid #e3e8ef",
        }}
      >
        Auto-lock timing per project
      </Typography>

      <Table size="small">
        <TableHead>
          <TableRow
            sx={{
              bgcolor: "#f8fafc",
            }}
          >
            {["PROJECT", "AUTO-LOCK", "GRACE"].map((header) => (
              <TableCell
                key={header}
                sx={{
                  color: "#526581",
                  fontSize: 11,
                  fontWeight: 800,
                  py: 1.4,
                }}
              >
                {header}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>

        <TableBody>
          {projects.map((project) => (
            <TableRow key={project.projectId}>
              <TableCell
                sx={{
                  fontSize: 13,
                  py: 1.4,
                }}
              >
                {project.projectName}
              </TableCell>

              <TableCell
                sx={{
                  fontSize: 13,
                  fontWeight: 700,
                  py: 1.4,
                  minWidth: 130,
                }}
              >
                <TextField
                  type="time"
                  size="small"
                  value={project.autoLockTime}
                  onChange={(event) =>
                    onProjectChange(
                      project.projectId,
                      "autoLockTime",
                      event.target.value
                    )
                  }
                  sx={inputSx}
                  inputProps={{
                    step: 60,
                  }}
                />
              </TableCell>

              <TableCell
                sx={{
                  color: "#526581",
                  fontSize: 13,
                  py: 1.4,
                  minWidth: 110,
                }}
              >
                <TextField
                  type="number"
                  size="small"
                  value={project.graceMinutes}
                  onChange={(event) =>
                    onProjectChange(
                      project.projectId,
                      "graceMinutes",
                      event.target.value
                    )
                  }
                  sx={inputSx}
                  inputProps={{
                    min: 0,
                  }}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
}

// Renders the complete Administrator Daily Entry Locking Rules page.
export default function LockingRules() {
  // Stores the global locking-rule values returned by the backend.
  const [globalRules, setGlobalRules] = useState({
    draftEntryRule: "editable_by_indexer",
    submittedEntryRule: "read_only_for_indexer",
    lockedEntryRule: "correction_request_required",
    correctionApproverRule: "team_lead_then_core_team",
  });

  // Stores the active project locking rules returned by the backend.
  const [projects, setProjects] = useState([]);

  // Tracks whether page data is currently loading.
  const [loading, setLoading] = useState(true);

  // Tracks whether rules are currently being saved.
  const [saving, setSaving] = useState(false);

  // Controls the success Snackbar.
  const [saved, setSaved] = useState(false);

  // Stores any backend or loading error message.
  const [error, setError] = useState("");

  // Loads all Administrator locking rules from the backend.
  const loadLockingRules = async () => {
    try {
      // Shows the loading state while the backend request is running.
      setLoading(true);

      // Clears any previous error message.
      setError("");

      // Gets the global rules and active project configuration.
      const data = await apiRequest("/admin/locking-rules");

      // Stores the returned global rules in component state.
      setGlobalRules(data.globalRules);

      // Converts backend project times into frontend time-input values.
      const formattedProjects = (data.projects || []).map((project) => ({
        ...project,
        autoLockTime: formatTimeForInput(project.autoLockTime),
        graceMinutes: project.graceMinutes ?? 0,
      }));

      // Stores the active project rules in component state.
      setProjects(formattedProjects);
    } catch (err) {
      // Stores the backend error so it can be shown on the page.
      setError(err.message || "Failed to load locking rules");
    } finally {
      // Stops the loading state after the request finishes.
      setLoading(false);
    }
  };

  // Loads Administrator locking rules when the page first opens.
  useEffect(() => {
    loadLockingRules();
  }, []);

  // Updates one global rule when an Administrator changes a dropdown.
  const handleGlobalRuleChange = (field, value) => {
    setGlobalRules((previousRules) => ({
      ...previousRules,
      [field]: value,
    }));
  };

  // Updates one project's time or grace value in local component state.
  const handleProjectChange = (projectId, field, value) => {
    setProjects((previousProjects) =>
      previousProjects.map((project) =>
        project.projectId === projectId
          ? {
              ...project,
              [field]: value,
            }
          : project
      )
    );
  };

  // Saves all global and project locking rules to the backend.
  const handleSaveRules = async () => {
    try {
      // Starts the save loading state.
      setSaving(true);

      // Clears any previous error before saving.
      setError("");

      // Converts the frontend project values into the backend request format.
      const projectPayload = projects.map((project) => ({
        projectId: project.projectId,
        autoLockTime: formatTimeForBackend(project.autoLockTime),
        graceMinutes: Number(project.graceMinutes),
      }));

      // Sends all edited locking rules to the Administrator backend.
      await apiRequest("/admin/locking-rules", {
        method: "PUT",
        body: JSON.stringify({
          globalRules,
          projects: projectPayload,
        }),
      });

      // Opens the success message only after the backend confirms the save.
      setSaved(true);

      // Reloads the rules so the page reflects the latest database values.
      await loadLockingRules();
    } catch (err) {
      // Displays the backend error when saving fails.
      setError(err.message || "Failed to save locking rules");
    } finally {
      // Stops the save loading state.
      setSaving(false);
    }
  };

  return (
    <>
      <CorePageShell
        breadcrumb="Administrator"
        title="Daily entry locking rules"
        description="Configure the Draft → Submitted → Reviewed → Locked workflow per project."
        actionLabel={saving ? "Saving..." : "Save rules"}
        actionIcon={null}
        actionHandler={handleSaveRules}
      >
        {/* Shows an API error without changing the existing page layout. */}
        {error && (
          <Alert
            severity="error"
            sx={{
              mb: 2,
            }}
          >
            {error}
          </Alert>
        )}

        <Workflow />

        {/* Shows a loading message while the locking rules are being fetched. */}
        {loading ? (
          <Paper
            elevation={0}
            sx={{
              border: "1px solid #dbe3ec",
              borderRadius: 1.5,
              p: 3,
              bgcolor: "#fff",
            }}
          >
            <Typography
              sx={{
                color: "#526581",
                fontSize: 13,
              }}
            >
              Loading locking rules...
            </Typography>
          </Paper>
        ) : (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md: "1fr 1fr",
              },
              gap: 2,
            }}
          >
            <GlobalRules
              rules={globalRules}
              onChange={handleGlobalRuleChange}
            />

            <ProjectRules
              projects={projects}
              onProjectChange={handleProjectChange}
            />
          </Box>
        )}
      </CorePageShell>

      {/* Shows the success message only after the PUT API succeeds. */}
      <Snackbar
        open={saved}
        autoHideDuration={2600}
        onClose={() => setSaved(false)}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={() => setSaved(false)}
        >
          Rules saved successfully
        </Alert>
      </Snackbar>
    </>
  );
}