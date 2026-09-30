import { useEffect, useState } from "react";
import apiRequest from "../lib/api.js";
import { useToast } from "../components/ToastProvider.jsx";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Typography,
  TextField,
} from "@mui/material";
import InfoRoundedIcon from "@mui/icons-material/InfoRounded";

// ─── Design tokens ────────────────────────────────────────────────────────────
const FONT =
  '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
const CARD_SHADOW = "0 1px 3px rgba(16,30,54,.07), 0 4px 16px rgba(16,30,54,.06)";
const LINE  = "#dfe4ec";
const LINE2 = "#e8ecf3";
const MUTED = "#6a7585";
const HEAD  = "#1a2434";

// ─── Project chip colors ──────────────────────────────────────────────────────
const CHIP_BG    = ["#e4f6ee", "#fbf1dc", "#efe9fb", "#e6efff"];
const CHIP_COLOR = ["#177a53", "#a9741a", "#603bb3", "#285fb8"];

// ─── Field: label above, plain read-only input box below ─────────────────────
function Field({ label, name, value, onChange, editable = false}) {
  return (
    <Box>
      <Typography
        sx={{
          fontFamily: FONT,
          fontSize: 12.5,
          fontWeight: 500,
          color: MUTED,
          mb: 0.6,
        }}
      >
        {label}
      </Typography>

      <TextField
        name={name}
        value={value}
        onChange={onChange}
        disabled={!editable}
        fullWidth
        size="small"
        sx={{
          "& .MuiOutlinedInput-root": {
            minHeight: 40,
            borderRadius: "8px",
            backgroundColor: "#f8fafc",
            fontFamily: FONT,
            fontSize: 13,
            color: HEAD,

            "& fieldset": {
              borderColor: LINE,
            },

            "&:hover fieldset": {
              borderColor: "#b9c3d1",
            },

            "&.Mui-focused fieldset": {
              borderColor: "#2f6df0",
              borderWidth: "1px",
            },
          },

          "& .MuiInputBase-input": {
            px: 1.5,
            py: 1,
          },
          "& .MuiInputBase-input.Mui-disabled": {
  WebkitTextFillColor: HEAD,
  cursor: "default",
},
        }}
      />
    </Box>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function MyProfile({ user }) {
  const toast = useToast();
  const defaultEmail = `${(user.username || "user").replace(
        ".",
        ""
      )}@company.com`;
      const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
      const [
          passwordFieldsUnlocked,
          setPasswordFieldsUnlocked,
        ] = useState(false);
      const [
      changingPassword,
      setChangingPassword,
    ] = useState(false);

    const [passwordErrors, setPasswordErrors] = useState({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });

    const [
      passwordData,
      setPasswordData,
    ] = useState({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  

  const [formData, setFormData] = useState({
    emp: user.emp || "EMP-1042",
    name: user.name || "",
    email: defaultEmail,
    dept: user.dept || "Indexing Ops",
    role: user.role || "",
    lead: user.lead || "Rohan Mehta",
  });

  const [assignedProjects, setAssignedProjects] =
  useState([]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  };

  useEffect(() => {
  const loadProfile = async () => {
    try {
      const data = await apiRequest(
        "/profile/me"
      );

      const profile = data.profile;

      setFormData({
        emp: profile.emp || "",
        name: profile.name || "",
        email: profile.email || "",
        dept: profile.department || "",
        role:
          profile.designation ||
          profile.role ||
          "",
        lead:
          profile.team_lead || "—",
      });

      setAssignedProjects(
        (data.assignedProjects || []).map(
          (project) => project.project_name
        )
      );
    } catch (error) {
      console.error(
        "Load Profile Error:",
        error
      );
      toast.error(error.message);
    }
  };

  loadProfile();
}, [toast]);

  const fields = [
    {
      name: "emp",
      label: "Employee ID",
      value: formData.emp,
    },
    {
      name: "name",
      label: "Full name",
      value: formData.name,
    },
    {
      name: "email",
      label: "Email",
      value: formData.email,
    },
    {
      name: "dept",
      label: "Department",
      value: formData.dept,
    },
    {
      name: "role",
      label: "Designation / Role",
      value: formData.role,
    },
    {
      name: "lead",
      label: "Team lead",
      value: formData.lead,
    },
  ];

  const handlePasswordInputChange = (event) => {
    const { name, value } = event.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
    // Clear the error for this field as user types
    if (passwordErrors[name]) {
      setPasswordErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

const handleChangePassword = async () => {
  const {
    currentPassword,
    newPassword,
    confirmPassword,
  } = passwordData;

  // Inline validation — no toasts
  const errs = { currentPassword: "", newPassword: "", confirmPassword: "" };
  let hasError = false;

  if (!currentPassword) {
    errs.currentPassword = "Current password is required.";
    hasError = true;
  }

  if (!newPassword) {
    errs.newPassword = "New password is required.";
    hasError = true;
  } else if (newPassword.length < 8) {
    errs.newPassword = "Password must contain at least 8 characters.";
    hasError = true;
  } else if (currentPassword && currentPassword === newPassword) {
    errs.newPassword = "New password must be different from current password.";
    hasError = true;
  }

  if (!confirmPassword) {
    errs.confirmPassword = "Please confirm your new password.";
    hasError = true;
  } else if (newPassword && confirmPassword && newPassword !== confirmPassword) {
    errs.confirmPassword = "Passwords do not match.";
    hasError = true;
  }

  if (hasError) {
    setPasswordErrors(errs);
    return;
  }

  setPasswordErrors({ currentPassword: "", newPassword: "", confirmPassword: "" });
  setChangingPassword(true);

  try {
    const data = await apiRequest(
      "/profile/me/password",
      {
        method: "PATCH",

        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      }
    );

    toast.success(data.message);

    setPasswordDialogOpen(false);

    setPasswordData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  } catch (error) {
    console.error(
      "Change Password Error:",
      error
    );

    toast.error(
      error.message ||
        "Failed to change password"
    );
  } finally {
    setChangingPassword(false);
  }
};



  return (
    <Box sx={{ width: "100%", boxSizing: "border-box" }}>

      {/* BREADCRUMB */}
      <Typography sx={{ fontFamily: FONT, fontSize: 12.5, color: MUTED, mb: 0.4 }}>
        ProdTrack · {user.role || "Indexer"}
      </Typography>

      {/* TITLE ROW */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          flexDirection: { xs: "column", sm: "row" },
          gap: 1.5,
          mb: 0.4,
        }}
      >
        <Box>
          <Typography sx={{ fontFamily: FONT, fontSize: 22, fontWeight: 800, letterSpacing: "-0.4px", color: HEAD }}>
            My profile
          </Typography>
          <Typography sx={{ fontFamily: FONT, fontSize: 13.5, color: MUTED, mt: 0.3 }}>
            Your account details and assigned projects.
          </Typography>
        </Box>

                {/* Hides Change password only for Indexer users. */}
        {user.roleKey !== "indexer" && (
          <Button
            variant="outlined"
            onClick={() => {
              setPasswordData({
                currentPassword: "",
                newPassword: "",
                confirmPassword: "",
              });

              setPasswordErrors({
                currentPassword: "",
                newPassword: "",
                confirmPassword: "",
              });

              setPasswordFieldsUnlocked(false);
              setPasswordDialogOpen(true);
            }}
            sx={{
              // KEEP YOUR EXISTING sx STYLES HERE EXACTLY AS THEY ARE.
            }}
          >
            Change password
          </Button>
        )}
      </Box>

      {/* ── TWO COLUMN LAYOUT ─────────────────────────────────────────────── */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          gap: 2,
          mt: 2,
        }}
      >

        {/* ACCOUNT CARD */}
        <Paper
          elevation={0}
          sx={{
            border: `1px solid ${LINE}`,
            borderRadius: "12px",
            boxShadow: CARD_SHADOW,
            bgcolor: "#fff",
            overflow: "hidden",
          }}
        >
          {/* card header */}
          <Box sx={{ px: 2, py: 1.625, borderBottom: `1px solid ${LINE2}` }}>
            <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: 14, color: HEAD }}>
              Account
            </Typography>
          </Box>

          {/* fields grid */}
          <Box
            sx={{
              p: 2,
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: 2,
            }}
          >
          {fields.map((field) => (
              <Field
                key={field.name}
                name={field.name}
                label={field.label}
                value={field.value}
                onChange={handleChange}
                editable={user?.roleKey === "administrator"}
              />
            ))}
          </Box>
        </Paper>

        {/* ASSIGNED PROJECTS CARD */}
        <Paper
          elevation={0}
          sx={{
            border: `1px solid ${LINE}`,
            borderRadius: "12px",
            boxShadow: CARD_SHADOW,
            bgcolor: "#fff",
            overflow: "hidden",
          }}
        >
          {/* card header */}
          <Box sx={{ px: 2, py: 1.625, borderBottom: `1px solid ${LINE2}` }}>
            <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: 14, color: HEAD }}>
              Assigned projects
            </Typography>
          </Box>

          <Box sx={{ p: 2 }}>
            {/* project chips */}
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
              {assignedProjects.map((project, i) => (
                  <Box
                    key={project}
                    sx={{
                      fontFamily: FONT,
                      fontSize: 12,
                      fontWeight: 600,
                      px: "11px",
                      py: "5px",
                      borderRadius: "20px",
                      bgcolor: CHIP_BG[i % CHIP_BG.length],
                      color: CHIP_COLOR[i % CHIP_COLOR.length],
                    }}
                  >
                    {project}
                  </Box>
                ))}
            </Box>

            {/* info notice */}
            <Box
              sx={{
                mt: 2,
                display: "flex",
                alignItems: "flex-start",
                gap: 1,
                p: 1.5,
                border: "1px solid #cfe0f7",
                bgcolor: "#f0f7ff",
                borderRadius: "8px",
              }}
            >
              <InfoRoundedIcon sx={{ fontSize: 16, color: "#2f6df0", flexShrink: 0, mt: "1px" }} />
              <Typography sx={{ fontFamily: FONT, fontSize: 12.5, color: "#44566f", lineHeight: 1.55 }}>
                You only see updates and entries for projects assigned to you. Contact your admin to change assignments.
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
      <Dialog
        open={passwordDialogOpen}
        onClose={() => {
          if (!changingPassword) {
            setPasswordDialogOpen(false);
            setPasswordData({
              currentPassword: "",
              newPassword: "",
              confirmPassword: "",
            });
            setPasswordErrors({ currentPassword: "", newPassword: "", confirmPassword: "" });
          }
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle
          sx={{
            fontFamily: FONT,
            fontWeight: 700,
          }}
        >
          Change password
        </DialogTitle>

        <DialogContent>
          <Typography
            sx={{
              fontFamily: FONT,
              fontSize: 13.5,
              color: MUTED,
              mb: 1.5,
            }}
          >
            Enter your current password and choose
            a new password. Your new password will
            also be sent to your registered email.
          </Typography>

          {/* Current password */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, mb: 1 }}>
            <Typography component="label" sx={{ fontFamily: FONT, fontSize: 12.5, fontWeight: 600, color: "#374151" }}>
              Current password <Box component="span" sx={{ color: "#d32f2f" }}>*</Box>
            </Typography>
            <TextField
              name="currentPassword"
              type="password"
              autoComplete="new-password"
              value={passwordData.currentPassword}
              onFocus={() => setPasswordFieldsUnlocked(true)}
              onChange={handlePasswordInputChange}
              slotProps={{
                htmlInput: { readOnly: !passwordFieldsUnlocked },
              }}
              fullWidth
              size="small"
              error={Boolean(passwordErrors.currentPassword)}
              helperText={passwordErrors.currentPassword}
            />
          </Box>

          {/* New password */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, mb: 1 }}>
            <Typography component="label" sx={{ fontFamily: FONT, fontSize: 12.5, fontWeight: 600, color: "#374151" }}>
              New password <Box component="span" sx={{ color: "#d32f2f" }}>*</Box>
            </Typography>
            <TextField
              name="newPassword"
              type="password"
              value={passwordData.newPassword}
              onChange={handlePasswordInputChange}
              fullWidth
              size="small"
              autoComplete="new-password"
              error={Boolean(passwordErrors.newPassword)}
              helperText={passwordErrors.newPassword || "Password must contain at least 8 characters"}
            />
          </Box>

          {/* Confirm new password */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            <Typography component="label" sx={{ fontFamily: FONT, fontSize: 12.5, fontWeight: 600, color: "#374151" }}>
              Confirm new password <Box component="span" sx={{ color: "#d32f2f" }}>*</Box>
            </Typography>
            <TextField
              name="confirmPassword"
              type="password"
              value={passwordData.confirmPassword}
              onChange={handlePasswordInputChange}
              fullWidth
              size="small"
              autoComplete="new-password"
              error={Boolean(passwordErrors.confirmPassword)}
              helperText={passwordErrors.confirmPassword}
            />
          </Box>
        </DialogContent>

        <DialogActions>
          <Button
            onClick={() => {
              setPasswordDialogOpen(false);
              setPasswordData({
                currentPassword: "",
                newPassword: "",
                confirmPassword: "",
              });
              setPasswordErrors({ currentPassword: "", newPassword: "", confirmPassword: "" });
            }}
            disabled={changingPassword}
            sx={{ fontFamily: FONT, textTransform: "none" }}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={handleChangePassword}
            disabled={changingPassword}
            sx={{
              fontFamily: FONT,
              textTransform: "none",
            }}
          >
            {changingPassword
              ? "Changing..."
              : "Change password"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
