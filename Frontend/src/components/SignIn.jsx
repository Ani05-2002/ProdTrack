import { useState } from "react";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Paper from "@mui/material/Paper";
import Divider from "@mui/material/Divider";
import Alert from "@mui/material/Alert";
import Link from "@mui/material/Link";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";

import { DEMO_ACCOUNTS } from "../lib/users.js";
import { apiRequest } from "../lib/api.js";
import { useToast } from "../components/ToastProvider.jsx";

export default function SignIn({ onLogin }) {
  const toast = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] =
  useState("");

  const [showPassword, setShowPassword] =
    useState(false);
  const [
    loginFieldsUnlocked,
    setLoginFieldsUnlocked,
  ] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(false);
  const [forgotMode, setForgotMode] =
  useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [forgotMessage, setForgotMessage] =
    useState("");

  const [forgotError, setForgotError] =
    useState("");

  const [fieldErrors, setFieldErrors] = useState({
    username: "",
    password: "",
  });

  const handleDemoUse = (account) => {
    setUsername(account.username);
    setPassword("demo123");
  };

const handleSubmit = async (event) => {
  event.preventDefault();

  const enteredUsername = username.trim();

  // =============================================
  // FORGOT PASSWORD SUBMIT
  // =============================================

  if (forgotMode) {
    if (!enteredUsername) {
      setForgotError("Please enter your email or username.");
      return;
    }

    setSubmitting(true);
    setForgotMessage("");
    setForgotError("");

    try {
      const data = await apiRequest("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({
          email: enteredUsername,
        }),
      });

      setForgotMessage(
        data.message ||
          "A new password has been sent to your email."
      );
    } catch (error) {
      console.error("Forgot password error:", error);
      setForgotError(
        error.message || "Failed to send new password."
      );
    } finally {
      setSubmitting(false);
    }

    return;
  }

  // =============================================
  // NORMAL LOGIN SUBMIT
  // =============================================

  const errs = { username: "", password: "" };
  let hasError = false;

  if (!enteredUsername) {
    errs.username = "Username is required.";
    hasError = true;
  }
  if (!password) {
    errs.password = "Password is required.";
    hasError = true;
  }
  if (hasError) {
    setFieldErrors(errs);
    return;
  }

  setFieldErrors({ username: "", password: "" });
  setSubmitting(true);

  try {
    const data = await apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: enteredUsername,
        password,
      }),
    });

    const storage = keepSignedIn
      ? localStorage
      : sessionStorage;

    const otherStorage = keepSignedIn
      ? sessionStorage
      : localStorage;

    otherStorage.removeItem(
      "prodtrackToken"
    );

    otherStorage.removeItem(
      "prodtrackUser"
    );

    otherStorage.removeItem(
      "prodtrackSessionTimeout"
    );

    storage.setItem(
      "prodtrackToken",
      data.token
    );

    storage.setItem(
      "prodtrackUser",
      JSON.stringify(data.user)
    );

    storage.setItem(
      "prodtrackSessionTimeout",
      String(
        data.sessionTimeoutMinutes ||
          30
      )
    );

    if (onLogin) {
      onLogin(data.user);
    }
  } catch (error) {
    console.error("Login error:", error);
    toast.error(error.message || "Login failed");
  } finally {
    setSubmitting(false);
  }
};

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        bgcolor: "#eef2f8",

        "@media (max-width: 900px)": {
          flexDirection: "column",
          height: "auto",
          overflowY: "auto",  
          
        },
      }}
    >
      {/* ================= LEFT SIDE ================= */}

      <Box
        sx={{
          width: "52%",
          minHeight: "100vh",

          px: {
            xs: 2.5,
            sm: 4,
            md: 5,
          },

          py: {
            xs: 3,
            md: 4,
          },

          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          color: "#ffffff",

          background:
            "radial-gradient(900px 500px at 15% 10%, rgba(47,109,240,.35), transparent 60%), radial-gradient(700px 500px at 85% 90%, rgba(122,81,214,.30), transparent 60%), linear-gradient(160deg, #0d1a2e, #12253f 55%, #0c1728)",

          "@media (max-width: 900px)": {
            width: "100%",
            minHeight: "auto",
            gap: 5,
          },
        }}
      >
        {/* LOGO */}

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.2,
          }}
        >
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: "9px",

              background:
                "linear-gradient(135deg, #5b7cff 0%, #7c4dff 100%)",

              display: "flex",
              alignItems: "center",
              justifyContent: "center",

              boxShadow: "0 8px 20px rgba(91,124,255,0.25)",
            }}
          >
            <Box
              sx={{
                width: 17,
                height: 17,
                position: "relative",
              }}
            >
              <Box
                sx={{
                  position: "absolute",
                  width: 9,
                  height: 9,
                  bgcolor: "#ffffff",
                  top: 0,
                  left: 0,
                }}
              />

              <Box
                sx={{
                  position: "absolute",
                  width: 9,
                  height: 9,
                  bgcolor: "#ffffff",
                  bottom: 0,
                  right: 0,
                }}
              />
            </Box>
          </Box>

          <Typography
            sx={{
              fontSize: 19,
              fontWeight: 800,
              letterSpacing: "-0.3px",
            }}
          >
            ProdTrack
          </Typography>
        </Box>

        {/* HERO CONTENT */}

        <Box
          sx={{
            maxWidth: 500,

            mt: {
              xs: 2,
              md: 4,
            },
          }}
        >
          <Typography
            sx={{
              fontSize: {
                xs: 30,
                sm: 34,
                md: 36,
              },

              lineHeight: 1.08,
              fontWeight: 800,
              mb: 2,
            }}
          >
            Daily Production
            <br />
            Tracking Application
          </Typography>

          <Typography
            sx={{
              fontSize: 14,
              lineHeight: 1.65,

              color: "rgba(255,255,255,0.82)",

              maxWidth: 470,

              mb: 3,
            }}
          >
            One place for indexers, team leads and the core team to log daily
            production, track backlogs, acknowledge guide updates, and stay on
            top of KPIs.
          </Typography>

          {/* FEATURES */}

          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 1.4,
            }}
          >
            {[
              "Role-based dashboards — see only what's assigned to you",
              "Daily entry with Draft → Submit → Review → Lock workflow",
              "Mandatory indexing-guide acknowledgement on login",
              "Live KPIs, correction requests and audit trail",
            ].map((item) => (
              <Box
                key={item}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.2,
                }}
              >
                <Box
                  sx={{
                    width: 20,
                    height: 20,

                    borderRadius: "5px",

                    bgcolor: "rgba(62,216,162,0.12)",

                    color: "#5ee4b7",

                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",

                    fontWeight: 800,
                    fontSize: 12,

                    flexShrink: 0,
                  }}
                >
                  ✓
                </Box>

                <Typography
                  sx={{
                    fontSize: 13.5,
                    color: "rgba(255,255,255,0.92)",
                  }}
                >
                  {item}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* FOOTER */}

        <Typography
          sx={{
            fontSize: 11.5,
            color: "rgba(255,255,255,0.52)",
            mt: 4,
          }}
        >
          DPTA Initiative · Internal build · v0.9 prototype
        </Typography>
      </Box>

      {/* ================= RIGHT SIDE ================= */}

      <Box
        sx={{
          width: "48%",
          minHeight: "100vh",

          display: "flex",
          alignItems: "center",
          justifyContent: "center",

          px: {
            xs: 2.5,
            sm: 4,
            md: 5,
          },

          py: 3,

          "@media (max-width: 900px)": {
            width: "100%",
            minHeight: "auto",
          },
        }}
      >
        <Box
          component="form"
          onSubmit={handleSubmit}
          autoComplete="off"
          sx={{
            width: "100%",
            maxWidth: 420,
          }}
        >
          {/* TITLE */}

          <Typography
            sx={{
              fontSize: 25,
              fontWeight: 800,
              color: "#10233d",
              mb: 0.6,
            }}
          >
           {forgotMode
            ? "Forgot password"
            : "Sign in"}
          </Typography>

          <Typography
            sx={{
              fontSize: 13.5,
              color: "#667085",
              mb: 2.5,
            }}
          >
            {forgotMode
              ? "Enter your email or username. We will send your new password to your registered email."
              : "Use your work account or a demo login below."}
          </Typography>

          {/* USERNAME */}

          <Typography
            sx={{
              fontSize: 12,
              fontWeight: 600,
              color: "#10233d",
              mb: 0.6,
            }}
          >
            {forgotMode ? "Email or username" : "Username *"}
          </Typography>

          <TextField
           name="prodtrackLoginUsername"
            autoComplete="new-password"
            fullWidth
            placeholder="Enter Username"
            value={username}
            onFocus={() => setLoginFieldsUnlocked(true)}
            onChange={(e) => {
              setUsername(e.target.value);
              if (fieldErrors.username) setFieldErrors((p) => ({ ...p, username: "" }));
            }}
            slotProps={{
              htmlInput: { readOnly: !loginFieldsUnlocked },
            }}
            error={!forgotMode && Boolean(fieldErrors.username)}
            helperText={!forgotMode ? fieldErrors.username : ""}
            sx={{
                mb: 0.6,

                // Removes the browser/Edge default eye icon
                "& input::-ms-reveal": {
                  display: "none",
                },

                "& input::-ms-clear": {
                  display: "none",
                },

                "& .MuiOutlinedInput-root": {
                bgcolor: "#ffffff",
                height: 40,
                fontSize: 13,

                "& fieldset": {
                  borderColor: "#d9e0ea",
                },

                "&:hover fieldset": {
                  borderColor: "#b9c3d0",
                },

                "&.Mui-focused fieldset": {
                  borderColor: "#2f6df0",
                },
              },
            }}
          />

          {/* PASSWORD */}
            {!forgotMode && (
              <>
                <Typography
                  sx={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#10233d",
                    mb: 0.6,
                  }}
                >
                  Password *
                </Typography>
                
                <TextField
                  fullWidth
                  name="prodtrackLoginPassword"
                  autoComplete="new-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);

                    if (fieldErrors.password) {
                      setFieldErrors((previousErrors) => ({
                        ...previousErrors,
                        password: "",
                      }));
                    }
                  }}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            type="button"
                            edge="end"
                            aria-label={
                              showPassword
                                ? "Hide password"
                                : "Show password"
                            }
                            onClick={() => {
                              setShowPassword(
                                (currentValue) => !currentValue
                              );
                            }}
                            onMouseDown={(event) => {
                              event.preventDefault();
                            }}
                          >
                            {showPassword ? (
                              <VisibilityOffOutlinedIcon fontSize="small" />
                            ) : (
                              <VisibilityOutlinedIcon fontSize="small" />
                            )}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                  error={Boolean(fieldErrors.password)}
                  helperText={fieldErrors.password}
                  sx={{
                    mb: 0.6,

                    "& input::-ms-reveal": {
                      display: "none",
                    },

                    "& input::-ms-clear": {
                      display: "none",
                    },

                    "& .MuiOutlinedInput-root": {
                      bgcolor: "#ffffff",
                      height: 40,
                      fontSize: 13,

                      "& fieldset": {
                        borderColor: "#d9e0ea",
                      },

                      "&:hover fieldset": {
                        borderColor: "#b9c5d4",
                      },

                      "&.Mui-focused fieldset": {
                        borderColor: "#2f6df0",
                      },
                    },
                  }}
                />
              </>
            )}
          {/* KEEP SIGNED IN */}

            <Box
            sx={{
              display: "flex",
              alignItems: "center",

              justifyContent: forgotMode
                ? "flex-end"
                : "space-between",

              mb: 1.6,
            }}
          >
            {!forgotMode && (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={keepSignedIn}
                    onChange={(event) =>
                      setKeepSignedIn(
                        event.target.checked
                      )
                    }
                    size="small"
                  />
                }
                label={
                  <Typography
                    sx={{
                      fontSize: 12.5,
                      color: "#475467",
                    }}
                  >
                    Keep me signed in
                  </Typography>
                }
                sx={{ m: 0 }}
              />
            )}

            <Link
              component="button"
              type="button"
              underline="none"
              onClick={() => {
                setForgotMode(
                  (currentMode) =>
                    !currentMode
                );

                setForgotMessage("");
                setForgotError("");
              }}
              sx={{
                fontSize: 12.5,
                fontWeight: 500,
                color: "#2f6df0",
                cursor: "pointer",
              }}
            >
              {forgotMode
                ? "Back to sign in"
                : "Forgot password?"}
            </Link>
          </Box>

          {/* SIGN IN BUTTON */}

          <Button
            fullWidth
            variant="contained"
            type="submit"
            disabled={submitting}
            sx={{
              height: 40,
              mb: 1.4,

              fontSize: 13.5,

              bgcolor: "#2f6df0",

              "&:hover": {
                bgcolor: "#245ed8",
              },
            }}
          >
            {submitting
              ? forgotMode
                ? "Sending..."
                : "Signing in..."
              : forgotMode
              ? "Send new password"
              : "Sign in"}
          </Button>
          {forgotMessage && (
              <Alert
                severity="success"
                sx={{
                  mb: 1.5,
                  fontSize: 12.5,
                }}
              >
                {forgotMessage}
              </Alert>
            )}

            {forgotError && (
              <Alert
                severity="error"
                sx={{
                  mb: 1.5,
                  fontSize: 12.5,
                }}
              >
                {forgotError}
              </Alert>
            )}
          {/* INFO */}
          {false && (
          <>
          <Alert
            severity="info"
            sx={{
              mb: 2.2,

              py: 0.4,

              bgcolor: "#eaf2ff",

              border: "1px solid #c9dcff",

              color: "#31558d",

              fontSize: 12,

              "& .MuiAlert-icon": {
                color: "#2f6df0",
                fontSize: 18,
              },
            }}
          >
            SSO via Microsoft Entra ID is the preferred method in production.
            Username &amp; password shown here for the prototype.
          </Alert>
            </>
          )}

          {/* DEMO ACCOUNTS */}
          {false && (
          <Paper
            elevation={0}
            sx={{
              border: "1px solid #dce3ec",

              borderRadius: 2,

              overflow: "hidden",

              bgcolor: "#ffffff",
            }}
          >
            {/* TABLE HEADER */}

            <Box
              sx={{
                px: 1.7,
                py: 1,

                display: "grid",

                gridTemplateColumns: "1fr auto",

                alignItems: "center",
              }}
            >
              <Typography
                sx={{
                  fontSize: 11.5,
                  fontWeight: 800,
                  color: "#344054",
                }}
              >
                DEMO ACCOUNTS
              </Typography>

              <Typography
                sx={{
                  fontSize: 11.5,
                  fontWeight: 800,
                  color: "#344054",
                }}
              >
                PASSWORD: DEMO123
              </Typography>
            </Box>

            <Divider />

            {/* ACCOUNT ROWS */}

            {DEMO_ACCOUNTS.map((account, index) => (
              <Box key={account.username}>
                <Box
                  sx={{
                    px: 1.7,
                    py: 0.9,

                    display: "grid",

                    gridTemplateColumns: "1.2fr 1fr auto",

                    gap: 1.5,

                    alignItems: "center",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#10233d",
                    }}
                  >
                    {account.username}
                  </Typography>

                  <Typography
                    sx={{
                      fontSize: 11.5,
                      color: "#667085",
                    }}
                  >
                    {account.role}
                  </Typography>

                  <Button
                    type="button"
                    onClick={() => handleDemoUse(account)}
                    sx={{
                      minWidth: "auto",

                      px: 0.4,
                      py: 0,

                      fontSize: 11.5,

                      fontWeight: 500,

                      color: "#2f6df0",
                    }}
                  >
                    Use →
                  </Button>
                </Box>

                {index !== DEMO_ACCOUNTS.length - 1 && <Divider />}
              </Box>
            ))}
          </Paper>
          )}
        </Box>
      </Box>
    </Box>
  );
}