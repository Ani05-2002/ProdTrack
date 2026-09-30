import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";

import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Slide from "@mui/material/Slide";
import Snackbar from "@mui/material/Snackbar";
import Typography from "@mui/material/Typography";

import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ErrorRoundedIcon from "@mui/icons-material/ErrorRounded";
import InfoRoundedIcon from "@mui/icons-material/InfoRounded";
import WarningRoundedIcon from "@mui/icons-material/WarningRounded";

// ─── Design tokens ────────────────────────────────────────────────────────────

const BG = "#10243e";

const SEVERITY_CONFIG = {
  success: {
    icon: CheckCircleRoundedIcon,
    color: "#4ade80",
  },
  error: {
    icon: ErrorRoundedIcon,
    color: "#f87171",
  },
  warning: {
    icon: WarningRoundedIcon,
    color: "#fb923c",
  },
  info: {
    icon: InfoRoundedIcon,
    color: "#60a5fa",
  },
};

// ─── Slide transition (top-center) ───────────────────────────────────────────

function SlideLeft(props) {
  return <Slide {...props} direction="left" />;
}

// ─── Single toast item ────────────────────────────────────────────────────────

function ToastItem({ toast, onClose }) {
  const cfg =
    SEVERITY_CONFIG[toast.severity] ??
    SEVERITY_CONFIG.info;

  const Icon = cfg.icon;

  return (
    <Snackbar
      open={toast.open}
      autoHideDuration={3000}
      onClose={(_, reason) => {
        if (reason === "clickaway") return;
        onClose(toast.id);
      }}
      anchorOrigin={{
        vertical: "bottom",
        horizontal: "right",
      }}
      TransitionComponent={SlideLeft}
      /*
       * Stack multiple toasts upward from the bottom-right corner.
       * Each toast is offset upward by its index (passed via toast.offset).
       * Inline style ensures viewport-fixed positioning regardless of any
       * positioned ancestor in the layout.
       */
      style={{
        position: "fixed",
        bottom: `${16 + (toast.offset ?? 0) * 68}px`,
        top: "auto",
        right: 16,
        left: "auto",
        transform: "none",
        width: "min(380px, calc(100vw - 32px))",
        zIndex: 1400,
      }}
    >
      {/* Custom dark-navy toast surface */}
      <Box
        role="alert"
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.25,
          bgcolor: BG,
          color: "#ffffff",
          px: 2,
          py: 1.5,
          borderRadius: "12px",
          boxShadow:
            "0 4px 20px rgba(0,0,0,0.35), 0 1px 4px rgba(0,0,0,0.2)",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* Severity icon */}
        <Icon
          sx={{
            fontSize: 20,
            color: cfg.color,
            flexShrink: 0,
          }}
        />

        {/* Message */}
        <Typography
          sx={{
            flex: 1,
            fontSize: 14,
            fontWeight: 600,
            lineHeight: 1.45,
            color: "#ffffff",
          }}
        >
          {toast.message}
        </Typography>

        {/* Close button */}
        <IconButton
          size="small"
          onClick={() => onClose(toast.id)}
          aria-label="Close notification"
          sx={{
            color: "#94a3b8",
            p: 0.25,
            flexShrink: 0,
            "&:hover": { color: "#e2e8f0" },
          }}
        >
          <CloseRoundedIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>
    </Snackbar>
  );
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  /*
   * Use a ref for the counter so it never triggers re-renders and is
   * immune to React Strict Mode double-invocation.
   */
  const counterRef = useRef(0);

  const showToast = useCallback((message, severity = "info") => {
    const id = ++counterRef.current;

    setToasts((prev) => [
      ...prev,
      { id, message, severity, open: true },
    ]);
  }, []);

  const closeToast = useCallback((id) => {
    /* Mark as closed so the exit animation plays, then remove. */
    setToasts((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, open: false } : t
      )
    );

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 400);
  }, []);

  /* Convenience helpers */
  const toast = {
    success: (msg) => showToast(msg, "success"),
    error:   (msg) => showToast(msg, "error"),
    warning: (msg) => showToast(msg, "warning"),
    info:    (msg) => showToast(msg, "info"),
    show:    showToast,
  };

  /* Only render the visible (open) toasts to cap DOM nodes */
  const visibleToasts = toasts.filter((t) => t.open);

  return (
    <ToastContext.Provider value={toast}>
      {children}

      {visibleToasts.map((t, index) => (
        <ToastItem
          key={t.id}
          toast={{ ...t, offset: index }}
          onClose={closeToast}
        />
      ))}
    </ToastContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * useToast()
 *
 * Returns an object with four helpers:
 *   toast.success("Message")
 *   toast.error("Message")
 *   toast.warning("Message")
 *   toast.info("Message")
 */
export function useToast() {
  const ctx = useContext(ToastContext);

  if (!ctx) {
    throw new Error(
      "useToast must be used inside <ToastProvider>."
    );
  }

  return ctx;
}
