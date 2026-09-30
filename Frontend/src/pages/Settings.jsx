import {
  useEffect,
  useState,
} from "react";

import apiRequest from "../lib/api.js";
import { useToast } from "../components/ToastProvider.jsx";
import {
  Alert,
  Box,
  Checkbox,
  FormControlLabel,
  Paper,
  Select,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import CorePageShell from "../components/CorePageShell.jsx";

const fieldSx = {
  width: "100%",
  height: 42,
  bgcolor: "#fff",
  border: "1px solid #dbe3ec",
  borderRadius: 1.2,
  fontSize: 13,
  "& .MuiSelect-select": { px: 1.5, py: 1.1 },
};


function SettingsCard({ title, children }) {
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
        {title}
      </Typography>
      <Box sx={{ p: 2 }}>{children}</Box>
    </Paper>
  );
}

function SelectSetting({
  label,
  value,
  options,
  onChange,
}) {
  return (
    <Box>
      <Typography
        sx={{
          color: "#526581",
          fontSize: 12,
          mb: 0.6,
        }}
      >
        {label}
      </Typography>

      <Select
        native
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        sx={fieldSx}
        inputProps={{
          "aria-label": label,
        }}
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </Select>
    </Box>
  );
}

export default function Settings() {
  const toast = useToast();
  const [saved, setSaved] = useState(false);
  
  const [saving, setSaving] =
  useState(false);

const [settings, setSettings] =
  useState({
    auth_method: "both",
    password_reset: "self_service",
    session_timeout_minutes: "30",
    productivity_base_metric:
      "documents_completed",
    productivity_exclude_approved_leave:
      "1",
    productivity_formula:
      "completed / (received * available_hours) * 100",
  });

const [
  notificationSettings,
  setNotificationSettings,
] = useState([]);

useEffect(() => {
  const loadSettings = async () => {
    try {
      const data = await apiRequest(
        "/settings"
      );

      setSettings((current) => ({
        ...current,
        ...(data.settings || {}),
      }));

      setNotificationSettings(
        data.notifications || []
      );
    } catch (error) {
      console.error(
        "Load Settings Error:",
        error
      );

      toast.error(error.message);
    }
  };

  loadSettings();
}, [toast]);

const updateSetting = (key, value) => {
  setSettings((current) => ({
    ...current,
    [key]: value,
  }));
};

const updateNotification = (
  code,
  isEnabled
) => {
  setNotificationSettings(
    (current) =>
      current.map((notification) =>
        notification.code === code
          ? {
              ...notification,
              isEnabled,
            }
          : notification
      )
  );
};

const handleSave = async () => {
  if (saving) return;

  try {
    setSaving(true);

    const data = await apiRequest(
      "/settings",
      {
        method: "PATCH",

        body: JSON.stringify({
          settings,

          notifications:
            notificationSettings.map(
              (notification) => ({
                code: notification.code,
                isEnabled:
                  notification.isEnabled,
              })
            ),
        }),
      }
    );

    setSaved(true);
    console.log(data.message);
  } catch (error) {
    console.error(
      "Save Settings Error:",
      error
    );

    toast.error(error.message);
  } finally {
    setSaving(false);
  }
};

  return (
    <>
      <CorePageShell
        breadcrumb="Administrator"
        title="Settings"
        description="Authentication, notifications and productivity formula configuration."
        actionLabel={
            saving ? "Saving..." : "Save"
          }
          actionIcon={null}
          actionHandler={handleSave}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            gap: 2,
            mb: 2,
          }}
        >
          <SettingsCard title="Authentication">
            <Box sx={{ display: "grid", gap: 1.7 }}>
              <SelectSetting
                label="Method"
                value={settings.auth_method}
                onChange={(value) =>
                  updateSetting(
                    "auth_method",
                    value
                  )
                }
                options={[
                  {
                    value: "both",
                    label:
                      "Microsoft Entra ID (SSO) — preferred",
                  },
                  {
                    value: "sso",
                    label:
                      "Microsoft Entra ID (SSO) only",
                  },
                  {
                    value: "password",
                    label: "Email and password",
                  },
                ]}
              />

              <SelectSetting
                label="Password reset"
                value={settings.password_reset}
                onChange={(value) =>
                  updateSetting(
                    "password_reset",
                    value
                  )
                }
                options={[
                  {
                    value: "self_service",
                    label: "Self-service via email",
                  },
                  {
                    value: "administrator",
                    label: "Administrator only",
                  },
                ]}
              />

              <SelectSetting
                label="Session timeout"
                value={
                  settings.session_timeout_minutes
                }
                onChange={(value) =>
                  updateSetting(
                    "session_timeout_minutes",
                    value
                  )
                }
                options={[
                  {
                    value: "15",
                    label: "15 minutes",
                  },
                  {
                    value: "30",
                    label: "30 minutes",
                  },
                  {
                    value: "60",
                    label: "60 minutes",
                  },
                ]}
              />
            </Box>
          </SettingsCard>
          <SettingsCard title="Productivity formula">
            <Box sx={{ display: "grid", gap: 1.7 }}>
              <SelectSetting
                label="Base metric"
                value={
                  settings.productivity_base_metric
                }
                onChange={(value) =>
                  updateSetting(
                    "productivity_base_metric",
                    value
                  )
                }
                options={[
                  {
                    value: "documents_completed",
                    label: "Documents completed",
                  },
                  {
                    value: "batches_processed",
                    label: "Batches processed",
                  },
                ]}
              />
              <SelectSetting
                label="Exclude approved leave"
                value={
                  settings
                    .productivity_exclude_approved_leave
                }
                onChange={(value) =>
                  updateSetting(
                    "productivity_exclude_approved_leave",
                    value
                  )
                }
                options={[
                  {
                    value: "1",
                    label: "Yes",
                  },
                  {
                    value: "0",
                    label: "No",
                  },
                ]}
              />
              <Box>
                <Typography sx={{ color: "#526581", fontSize: 12, mb: 0.6 }}>
                  Formula
                </Typography>
               value={
                    settings.productivity_formula
                  }
                  onChange={(event) =>
                    updateSetting(
                      "productivity_formula",
                      event.target.value
                    )
                  }
              </Box>
            </Box>
          </SettingsCard>
        </Box>
        <SettingsCard title="Email notifications">
          <Box sx={{ display: "grid" }}>
           {notificationSettings.map(
            (notification) => (
              <FormControlLabel
                key={notification.code}
                sx={{
                  m: 0,
                  minHeight: 39,
                  borderBottom:
                    "1px solid #e3e8ef",
                }}
                control={
                  <Checkbox
                    size="small"
                    checked={
                      notification.isEnabled
                    }
                    onChange={(event) =>
                      updateNotification(
                        notification.code,
                        event.target.checked
                      )
                    }
                  />
                }
                label={
                  <Typography
                    sx={{
                      fontSize: 13,
                      color: "#10233d",
                    }}
                  >
                    {notification.name}
                    {" · "}
                    {notification.channel}
                  </Typography>
                }
              />
            )
          )}
          </Box>
        </SettingsCard>
      </CorePageShell>

      <Snackbar
        open={saved}
        autoHideDuration={2600}
        onClose={() => setSaved(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={() => setSaved(false)}
        >
          Settings saved successfully
        </Alert>
      </Snackbar>
    </>
  );
}
