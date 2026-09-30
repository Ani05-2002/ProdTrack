// Imports React hooks used for loading API data and managing local assignment state.
import { useEffect, useState } from "react";

// Imports the same existing MUI components used by the original UI.
import {
  Alert,
  Avatar,
  Box,
  Button,
  Paper,
  Snackbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";

// Imports the same existing MUI icons used by the original UI.
import InfoRoundedIcon from "@mui/icons-material/InfoRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";

// Imports the shared API helper so requests use the configured backend URL and Bearer token.
import { apiRequest } from "../lib/api.js";


// ─── Design tokens ────────────────────────────────────────────────────────────

// Keeps the original font stack unchanged.
const FONT =
  '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

// Keeps the original card shadow unchanged.
const CARD_SHADOW =
  "0 1px 3px rgba(16,30,54,.07), 0 4px 16px rgba(16,30,54,.06)";

// Keeps the original border colors unchanged.
const LINE = "#dfe4ec";
const LINE2 = "#e8ecf3";

// Keeps the original muted text color unchanged.
const MUTED = "#6a7585";

// Keeps the original heading color unchanged.
const HEAD = "#1a2434";


// ─── Role styles ──────────────────────────────────────────────────────────────

// Keeps the original role chip styles unchanged.
const ROLE_STYLE = {
  Indexer: {
    label: "INDEXER",
    bg: "#eaf1ff",
    color: "#2458c7",
    border: "#bcd2ff",
  },

  "Team Lead": {
    label: "TEAM LEAD",
    bg: "#eaf1ff",
    color: "#2458c7",
    border: "#bcd2ff",
  },

  "Core Team": {
    label: "CORE TEAM",
    bg: "#eaf1ff",
    color: "#2458c7",
    border: "#bcd2ff",
  },

  Administrator: {
    label: "ADMIN",
    bg: "#eaf1ff",
    color: "#2458c7",
    border: "#bcd2ff",
  },
};


// Keeps the original avatar color unchanged.
const AVATAR_COLORS = [
  "#4f73e3",
];


// ─── Helpers ──────────────────────────────────────────────────────────────────

// Converts backend role codes into the same role labels used by the original UI.
function getRoleLabel(role) {
  const roleMap = {
    indexer: "Indexer",
    INDEXER: "Indexer",
    lead: "Team Lead",
    TEAM_LEAD: "Team Lead",
    team_lead: "Team Lead",
    teamLead: "Team Lead",
    core: "Core Team",
    CORE_TEAM: "Core Team",
    core_team: "Core Team",
    coreTeam: "Core Team",
    admin: "Administrator",
    ADMIN: "Administrator",
    administrator: "Administrator",
  };

  return roleMap[role] || roleMap[String(role || "").toLowerCase()] || "Indexer";
}


// Generates initials for the existing avatar UI.
function getInitials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}


// Shortens project names so the table header keeps the same compact visual style.
function getProjectLabel(project) {
  if (!project) {
    return "";
  }

  // Uses the short project code when available to keep dynamic columns compact.
  if (project.project_code) {
    return project.project_code;
  }

  return project.project_name;
}


// ─── Role chip ────────────────────────────────────────────────────────────────

// Keeps the original RoleChip component UI unchanged.
function RoleChip({ role }) {
  const s =
    ROLE_STYLE[role] ??
    ROLE_STYLE.Indexer;

  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        px: 1.2,
        py: "3px",
        borderRadius: "5px",
        bgcolor: s.bg,
        border: `1px solid ${s.border}`,
        color: s.color,
        fontFamily: FONT,
        fontSize: 10.5,
        fontWeight: 800,
        letterSpacing: "0.04em",
        whiteSpace: "nowrap",
      }}
    >
      {s.label}
    </Box>
  );
}


// ─── Access toggle dot ────────────────────────────────────────────────────────

// Keeps the original AccessDot appearance and interaction unchanged.
function AccessDot({
  on,
  locked,
  onClick,
}) {
  const dot = (
    <Box
      component="button"
      type="button"
      aria-label={
        on
          ? "Revoke access"
          : "Grant access"
      }
      onClick={
        locked
          ? undefined
          : onClick
      }
      sx={{
        width: 11,
        height: 11,
        p: 0,
        border: "1.5px solid #7c7777",
        borderRadius: "50%",
        bgcolor: on
          ? "#15966a"
          : "transparent",
        cursor: locked
          ? "default"
          : "pointer",
        display: "block",
        mx: "auto",
        transition:
          "transform .15s, background-color .15s",
        "&:hover": locked
          ? {}
          : {
              transform:
                "scale(1.35)",
            },
      }}
    />
  );

  return locked ? (
    <Tooltip
      title="All projects assigned"
      placement="top"
      arrow
    >
      <span
        style={{
          display: "flex",
          justifyContent: "center",
        }}
      >
        {dot}
      </span>
    </Tooltip>
  ) : (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
      }}
    >
      {dot}
    </Box>
  );
}


// ─── Mobile card view ─────────────────────────────────────────────────────────

// Keeps the original mobile card UI, but uses dynamic project data.
function MobileUserCard({
  user,
  userIdx,
  locked,
  onToggle,
  avatarColor,
  projects,
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        border: `1px solid ${LINE}`,
        borderRadius: "10px",
        p: 2,
        bgcolor: "#fff",
      }}
    >
      {/* Keeps the original mobile user header UI unchanged. */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          mb: 1.5,
        }}
      >
        <Avatar
          sx={{
            width: 36,
            height: 36,
            bgcolor: avatarColor,
            fontSize: 13,
            fontWeight: 700,
            fontFamily: FONT,
          }}
        >
          {user.initials}
        </Avatar>

        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              fontFamily: FONT,
              fontSize: 13,
              fontWeight: 600,
              color: HEAD,
            }}
          >
            {user.name}
          </Typography>

          <Box sx={{ mt: 0.4 }}>
            <RoleChip
              role={user.role}
            />
          </Box>
        </Box>
      </Box>

      {/* Uses live project columns while keeping the same grid-style dot UI. */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns:
            `repeat(${Math.max(
              projects.length,
              1
            )}, 1fr)`,
          gap: 1,
          overflowX: "auto",
        }}
      >
        {projects.map(
          (proj, pi) => (
            <Box
              key={proj.id}
              sx={{
                textAlign: "center",
                minWidth: 55,
              }}
            >
              <Typography
                sx={{
                  fontFamily: FONT,
                  fontSize: 10,
                  fontWeight: 700,
                  color: MUTED,
                  mb: 0.75,
                  letterSpacing:
                    "0.03em",
                }}
              >
                {getProjectLabel(
                  proj
                )}
              </Typography>

              <AccessDot
                on={
                  user.access[
                    pi
                  ] || false
                }
                locked={locked}
                onClick={() =>
                  onToggle(
                    userIdx,
                    pi
                  )
                }
              />
            </Box>
          )
        )}
      </Box>
    </Paper>
  );
}


// ─── Main component ───────────────────────────────────────────────────────────

// Keeps the same Assignment Matrix page layout but loads/saves live backend data.
function AssignmentMatrixPage({
  roleLabel = "Administrator",
}) {
  // Stores live projects returned by the Assignment Matrix GET API.
  const [
    projects,
    setProjects,
  ] = useState([]);

  // Stores live users with their current access-dot state.
  const [
    users,
    setUsers,
  ] = useState([]);

  // Controls the existing success Snackbar.
  const [
    saved,
    setSaved,
  ] = useState(false);

  // Stores API error text so save/load failures can be shown without redesigning the page.
  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  // Tracks save state so duplicate Save clicks are avoided.
  const [
    saving,
    setSaving,
  ] = useState(false);

  // Keeps the original responsive breakpoint behavior.
  const theme = useTheme();

  // Keeps the original desktop/mobile switch unchanged.
  const isMobile =
    useMediaQuery(
      theme.breakpoints.down(
        "md"
      )
    );


  // ─── Load Assignment Matrix ────────────────────────────────────────────────

  // Loads all projects, users and current project assignments from the backend.
  const loadAssignmentMatrix =
    async () => {
      try {
        // Clears any previous API error before loading fresh data.
        setErrorMessage("");

        // Calls the already-tested GET Assignment Matrix endpoint.
        const response =
          await apiRequest(
            "/core-team/assignment-matrix"
          );

        // Stores all backend projects in the same order returned by the API.
        const loadedProjects =
          response.projects || [];

        // Converts backend users into the same data shape the original UI expects.
        const loadedUsers =
          (
            response.users ||
            []
          ).map(
            (user) => ({
              // Stores the actual backend user ID for saving assignments later.
              id: user.id,

              // Keeps the employee ID available for future use without changing the visible UI.
              employeeId:
                user.employee_id,

              // Generates initials for the existing avatar.
              initials:
                getInitials(
                  user.name
                ),

              // Keeps the original visible name.
              name: user.name,

              // Converts backend role code into the original visible role label.
              role:
                getRoleLabel(
                  user.role
                ),

              // Stores whether this row can be manually edited.
              editable:
                Boolean(
                  user.editable
                ),

              // Preserves backend access type for locking behavior.
              accessType:
                user.accessType,

              // Converts project_ids into the existing Boolean access-dot array.
              access:
                loadedProjects.map(
                  (
                    project
                  ) =>
                    (
                      user.project_ids ||
                      []
                    ).includes(
                      project.id
                    )
                ),
            })
          );

        // Updates live projects.
        setProjects(
          loadedProjects
        );

        // Updates live users.
        setUsers(
          loadedUsers
        );
      } catch (error) {
        console.error(
          "Load Assignment Matrix Error:",
          error
        );

        // Shows the backend load error through the existing Snackbar style.
        setErrorMessage(
          error.message ||
            "Failed to load assignment matrix"
        );
      }
    };


  // Loads Assignment Matrix once when this page opens.
  useEffect(() => {
    loadAssignmentMatrix();
  }, []);


  // ─── Lock rules ────────────────────────────────────────────────────────────

  // Uses the backend editable flag so inherited/global users cannot be changed manually.
  const isLocked = (
    user
  ) => !user.editable;


  // ─── Toggle assignment ─────────────────────────────────────────────────────

  // Toggles one project access dot locally without immediately calling the backend.
  function toggle(
    userIdx,
    projIdx
  ) {
    setUsers((prev) =>
      prev.map(
        (user, index) => {
          // Leaves every other user unchanged.
          if (
            index !==
            userIdx
          ) {
            return user;
          }

          // Prevents inherited/global users from being edited even if toggle is called manually.
          if (
            !user.editable
          ) {
            return user;
          }

          // Toggles only the selected project access value.
          return {
            ...user,
            access:
              user.access.map(
                (
                  value,
                  projectIndex
                ) =>
                  projectIndex ===
                  projIdx
                    ? !value
                    : value
              ),
          };
        }
      )
    );
  }


  // ─── Save assignments ──────────────────────────────────────────────────────

  // Converts current editable rows into the exact PUT body required by the backend.
  const handleSave =
    async () => {
      try {
        // Prevents duplicate saves while the current request is running.
        if (saving) {
          return;
        }

        // Starts save state.
        setSaving(true);

        // Clears any previous API error.
        setErrorMessage("");

        // Builds the backend-required assignments array from editable users only.
        const assignments =
          users
            .filter(
              (user) =>
                user.editable
            )
            .map(
              (user) => ({
                // Sends the real backend user ID.
                userId:
                  user.id,

                // Converts true access dots back into project IDs.
                projectIds:
                  projects
                    .filter(
                      (
                        project,
                        projectIndex
                      ) =>
                        user
                          .access[
                          projectIndex
                        ]
                    )
                    .map(
                      (
                        project
                      ) =>
                        project.id || project.project_id
                    ),
              })
            );

        // Calls the already-tested PUT Assignment Matrix endpoint.
        await apiRequest(
          "/core-team/assignment-matrix",
          {
            method: "POST",
            body:
              JSON.stringify(
                {
                  assignments,
                }
              ),
          }
        );

        // Reloads fresh database state after the update succeeds.
        await loadAssignmentMatrix();

        // Opens the original success Snackbar.
        setSaved(true);
      } catch (error) {
        console.error(
          "Save Assignment Matrix Error:",
          error
        );

        // Shows the backend message when save fails.
        setErrorMessage(
          error.message ||
            "Failed to save assignment changes"
        );
      } finally {
        // Ends save state whether the request succeeds or fails.
        setSaving(false);
      }
    };


  // ─── Dynamic desktop grid ──────────────────────────────────────────────────

  // Keeps the original User + Role columns and adds one equal-width column per live project.
  const desktopGridColumns =
    `2fr 1.2fr repeat(${Math.max(
      projects.length,
      1
    )}, 1fr)`;


  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <Box
      sx={{
        width: "100%",
        boxSizing:
          "border-box",
      }}
    >
      {/* BREADCRUMB - keeps the original UI unchanged. */}
      <Typography
        sx={{
          fontFamily: FONT,
          fontSize: 12.5,
          color: MUTED,
          mb: 0.4,
        }}
      >
        ProdTrack ·{" "}
        {roleLabel}
      </Typography>

      {/* TITLE ROW - keeps the original title, description and Save button layout. */}
      <Box
        sx={{
          display: "flex",
          alignItems: {
            xs: "flex-start",
            sm: "center",
          },
          flexDirection: {
            xs: "column",
            sm: "row",
          },
          justifyContent:
            "space-between",
          gap: 1.5,
          mb: 0.4,
        }}
      >
        <Box>
          <Typography
            sx={{
              fontFamily: FONT,
              fontWeight: 800,
              fontSize: 22,
              letterSpacing:
                "-0.4px",
              color: HEAD,
            }}
          >
            Project assignment
            matrix
          </Typography>

          <Typography
            sx={{
              fontFamily: FONT,
              fontSize: 13.5,
              color: MUTED,
              mt: 0.3,
            }}
          >
            Controls project
            visibility. Indexers
            see only assigned
            projects; core &amp;
            admin see all.
          </Typography>
        </Box>

        <Button
          variant="contained"
          // Keeps the original icon commented exactly as before.
          // startIcon={<SaveRoundedIcon sx={{ fontSize: 17 }} />}
          onClick={
            handleSave
          }
          disabled={saving}
          sx={{
            fontFamily: FONT,
            fontSize: 13,
            fontWeight: 600,
            px: 2,
            py: 0.875,
            borderRadius: "8px",
            textTransform:
              "none",
            bgcolor:
              "#2f6df0",
            color: "#fff",
            boxShadow: "none",
            flexShrink: 0,
            "&:hover": {
              bgcolor:
                "#1f57c9",
              boxShadow:
                "none",
            },
          }}
        >
          {saving
            ? "Saving..."
            : "Save changes"}
        </Button>
      </Box>

      {/* INFO BANNER - keeps the original UI unchanged. */}
      <Box
        sx={{
          display: "flex",
          alignItems:
            "flex-start",
          gap: 1,
          px: 1.75,
          py: 1.25,
          mb: 2.5,
          mt: 1.5,
          bgcolor:
            "#f0f7ff",
          border:
            "1px solid #cfe0f7",
          borderRadius:
            "6px",
        }}
      >
        <InfoRoundedIcon
          sx={{
            fontSize: 16,
            color: "#2f6df0",
            flexShrink: 0,
            mt: "1px",
          }}
        />

        <Typography
          sx={{
            fontFamily: FONT,
            fontSize: 12.5,
            color: "#44566f",
            lineHeight: 1.6,
          }}
        >
          Toggle a dot to
          grant or revoke a
          user's access to a
          project. Team Leads
          inherit their team's
          projects. Core Team
          and Admin always have
          full access.
        </Typography>
      </Box>

      {/* ── DESKTOP TABLE ── */}
      {!isMobile && (
        <Paper
          elevation={0}
          sx={{
            border:
              `1px solid ${LINE}`,
            borderRadius:
              "12px",
            boxShadow:
              CARD_SHADOW,
            bgcolor: "#fff",
            overflow:
              "hidden",
          }}
        >
          {/* Keeps horizontal scrolling so additional database projects do not break the original page layout. */}
          <Box
            sx={{
              overflowX:
                "auto",
            }}
          >
            <Box
              sx={{
                minWidth:
                  Math.max(
                    640,
                    300 +
                      projects.length *
                        105
                  ),
              }}
            >
              {/* Header keeps the same visual structure but uses live projects. */}
              <Box
                sx={{
                  display:
                    "grid",
                  gridTemplateColumns:
                    desktopGridColumns,
                  px: 2.5,
                  py: 1.25,
                  bgcolor:
                    "#f8fafc",
                  borderBottom:
                    `1px solid ${LINE2}`,
                }}
              >
                {[
                  "USER",
                  "ROLE",
                  ...projects.map(
                    (
                      project
                    ) =>
                      getProjectLabel(
                        project
                      )
                  ),
                ].map(
                  (
                    col,
                    i
                  ) => (
                    <Typography
                      key={`${col}-${i}`}
                      sx={{
                        fontFamily:
                          FONT,
                        fontSize:
                          11,
                        fontWeight:
                          800,
                        color:
                          MUTED,
                        letterSpacing:
                          "0.4px",
                        textAlign:
                          i >= 2
                            ? "center"
                            : "left",
                        whiteSpace:
                          "nowrap",
                      }}
                    >
                      {col}
                    </Typography>
                  )
                )}
              </Box>

              {/* Rows keep the same visual layout and now use live backend users. */}
              {users.map(
                (
                  user,
                  ui
                ) => (
                  <Box
                    key={
                      user.id
                    }
                    sx={{
                      display:
                        "grid",
                      gridTemplateColumns:
                        desktopGridColumns,
                      px: 2.5,
                      py: 1.4,
                      alignItems:
                        "center",
                      borderTop:
                        `1px solid ${LINE2}`,
                      "&:hover":
                        {
                          bgcolor:
                            "#fafbff",
                        },
                    }}
                  >
                    {/* USER - keeps the original avatar/name design. */}
                    <Box
                      sx={{
                        display:
                          "flex",
                        alignItems:
                          "center",
                        gap: 1.25,
                      }}
                    >
                      <Avatar
                        sx={{
                          width: 32,
                          height: 32,
                          bgcolor:
                            AVATAR_COLORS[
                              ui %
                                AVATAR_COLORS.length
                            ],
                          fontSize:
                            12,
                          fontWeight:
                            700,
                          fontFamily:
                            FONT,
                        }}
                      >
                        {
                          user.initials
                        }
                      </Avatar>

                      <Typography
                        sx={{
                          fontFamily:
                            FONT,
                          fontSize:
                            13,
                          fontWeight:
                            600,
                          color:
                            HEAD,
                        }}
                      >
                        {
                          user.name
                        }
                      </Typography>
                    </Box>

                    {/* ROLE - keeps the original role chip UI. */}
                    <Box>
                      <RoleChip
                        role={
                          user.role
                        }
                      />
                    </Box>

                    {/* ACCESS DOTS - uses live project assignments and backend editability. */}
                    {user.access.map(
                      (
                        on,
                        pi
                      ) => (
                        <AccessDot
                          key={`${user.id}-${projects[pi]?.id || pi}`}
                          on={
                            on
                          }
                          locked={isLocked(
                            user
                          )}
                          onClick={() =>
                            toggle(
                              ui,
                              pi
                            )
                          }
                        />
                      )
                    )}
                  </Box>
                )
              )}
            </Box>
          </Box>
        </Paper>
      )}

      {/* ── MOBILE CARDS ── */}
      {isMobile && (
        <Box
          sx={{
            display: "flex",
            flexDirection:
              "column",
            gap: 1.5,
          }}
        >
          {users.map(
            (
              user,
              ui
            ) => (
              <MobileUserCard
                key={user.id}
                user={user}
                userIdx={ui}
                locked={isLocked(
                  user
                )}
                onToggle={
                  toggle
                }
                avatarColor={
                  AVATAR_COLORS[
                    ui %
                      AVATAR_COLORS.length
                  ]
                }
                projects={
                  projects
                }
              />
            )
          )}
        </Box>
      )}

      {/* SUCCESS SNACKBAR - keeps the original success feedback UI. */}
      <Snackbar
        open={saved}
        autoHideDuration={
          2500
        }
        onClose={() =>
          setSaved(false)
        }
        anchorOrigin={{
          vertical:
            "bottom",
          horizontal:
            "right",
        }}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={() =>
            setSaved(false)
          }
        >
          Assignment changes
          saved
        </Alert>
      </Snackbar>

      {/* ERROR SNACKBAR - uses the same existing Snackbar style without changing page layout. */}
      <Snackbar
        open={Boolean(
          errorMessage
        )}
        autoHideDuration={
          3500
        }
        onClose={() =>
          setErrorMessage(
            ""
          )
        }
        anchorOrigin={{
          vertical:
            "bottom",
          horizontal:
            "right",
        }}
      >
        <Alert
          severity="error"
          variant="filled"
          onClose={() =>
            setErrorMessage(
              ""
            )
          }
        >
          {errorMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}


// ─── Export ───────────────────────────────────────────────────────────────────

// Keeps the original role-specific breadcrumb behavior unchanged.
export default function AssignmentMatrix(
  props
) {
  const labelMap = {
    administrator:
      "Administrator",
    coreTeam:
      "Core Team",
    teamLead:
      "Team Lead",
  };

  return (
    <AssignmentMatrixPage
      roleLabel={
        labelMap[
          props.roleKey
        ] ??
        "Administrator"
      }
    />
  );
}