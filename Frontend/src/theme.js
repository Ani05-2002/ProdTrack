import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  // ======================================================
  // COLORS
  // ======================================================

  palette: {
    primary: {
      main: "#2f6df0",
      dark: "#2458c7",
      light: "#eaf1ff",
    },

    navy: {
      main: "#10233d",
      dark: "#0b192c",
      light: "#1b3b67",
      lightHover: "#24476f",
    },

    background: {
      default: "#eef2f7",
      paper: "#ffffff",
    },

    text: {
      primary: "#10233d",
      secondary: "#667085",
    },

    success: {
      main: "#E4F6EE",
      light: "#e2f6ec",
    },

    warning: {
      main: "#f59e0b",
      light: "#fff3dc",
    },

    error: {
      main: "#dc3545",
    },

    grey: {
      50: "#f8fafc",
      100: "#eef2f6",
      200: "#e2e8f0",
      300: "#cbd5e1",
      400: "#94a3b8",
      500: "#64748b",
      600: "#475569",
      700: "#334155",
      800: "#1e293b",
      900: "#0f172a",
    },
  },

  // ======================================================
  // TYPOGRAPHY
  // Matched closer to your reference screenshot
  // ======================================================

  typography: {
    fontFamily: ["Inter", "Arial", "sans-serif"].join(","),

    // Default MUI = 14px
    // We use approx. 12.2px
    fontSize: 12.2,

    h1: {
      fontWeight: 800,
      fontSize: "2rem",
      lineHeight: 1.15,
    },

    h2: {
      fontWeight: 800,
      fontSize: "1.7rem",
      lineHeight: 1.2,
    },

    h3: {
      fontWeight: 800,
      fontSize: "1.35rem",
      lineHeight: 1.25,
    },

    h4: {
      fontWeight: 800,
      fontSize: "1.18rem",
      lineHeight: 1.3,
    },

    h5: {
      fontWeight: 700,
      fontSize: "1rem",
      lineHeight: 1.35,
    },

    h6: {
      fontWeight: 700,
      fontSize: "0.9rem",
      lineHeight: 1.4,
    },

    subtitle1: {
      fontSize: "0.88rem",
      lineHeight: 1.45,
      fontWeight: 500,
    },

    subtitle2: {
      fontSize: "0.78rem",
      lineHeight: 1.45,
      fontWeight: 500,
    },

    body1: {
      fontSize: "0.875rem",
      lineHeight: 1.5,
    },

    body2: {
      fontSize: "0.78rem",
      lineHeight: 1.5,
    },

    button: {
      fontSize: "0.78rem",
      fontWeight: 700,
      textTransform: "none",
    },

    caption: {
      fontSize: "0.68rem",
      lineHeight: 1.4,
    },

    overline: {
      fontSize: "0.65rem",
      fontWeight: 700,
      letterSpacing: "0.07em",
    },
  },

  // ======================================================
  // SHAPE
  // ======================================================

  shape: {
    borderRadius: 10,
  },

  // ======================================================
  // COMPONENT OVERRIDES
  // ======================================================

  components: {
    // BUTTONS

    MuiButton: {
      styleOverrides: {
        root: {
          boxShadow: "none",
          borderRadius: 8,
          textTransform: "none",
          fontWeight: 700,
          fontSize: "0.78rem",
        },
      },
    },

    // PAPER

    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },

    // CARDS

    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },

    // TEXTFIELDS

    MuiTextField: {
      defaultProps: {
        size: "small",
      },
    },

    // INPUT

    MuiInputBase: {
      styleOverrides: {
        root: {
          fontSize: "0.78rem",
        },

        input: {
          fontSize: "0.78rem",
        },
      },
    },

    // CHIP

    MuiChip: {
      styleOverrides: {
        root: {
          fontSize: "0.68rem",
          fontWeight: 700,
        },

        label: {
          fontSize: "0.68rem",
        },
      },
    },

    // LIST ITEMS

    MuiListItemText: {
      styleOverrides: {
        primary: {
          fontSize: "0.82rem",
          lineHeight: 1.3,
        },

        secondary: {
          fontSize: "0.72rem",
        },
      },
    },

    // TABLE

    MuiTableCell: {
      styleOverrides: {
        root: {
          fontSize: "0.77rem",
        },

        head: {
          fontSize: "0.76rem",
          fontWeight: 700,
        },
      },
    },

    // FORM LABEL

    MuiFormLabel: {
      styleOverrides: {
        root: {
          fontSize: "0.76rem",
        },
      },
    },

    // TOOLTIP

    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          fontSize: "0.68rem",
        },
      },
    },

    // BADGE

    MuiBadge: {
      styleOverrides: {
        badge: {
          fontSize: "0.62rem",
          fontWeight: 700,
        },
      },
    },
  },
});

export default theme;
