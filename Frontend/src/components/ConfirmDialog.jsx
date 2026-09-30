import { useCallback, useRef, useState } from "react";

import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * useConfirm()
 *
 * Returns:
 *   confirm(options)   — async function; resolves true/false
 *   ConfirmElement     — React element to render once anywhere in the tree
 *
 * Options:
 *   title      {string}   Dialog heading
 *   message    {string}   Body text
 *   confirmLabel {string} Confirm button label  (default "Confirm")
 *   cancelLabel  {string} Cancel button label   (default "Cancel")
 *   danger       {bool}   Red confirm button for destructive actions
 */
export function useConfirm() {
  const [state, setState] = useState({
    open: false,
    title: "",
    message: "",
    confirmLabel: "Confirm",
    cancelLabel: "Cancel",
    danger: false,
    loading: false,
  });

  /*
   * resolveRef holds the resolve function of the currently-pending Promise so
   * the button handlers can settle it without needing it in React state.
   */
  const resolveRef = useRef(null);

  const confirm = useCallback((options = {}) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;

      setState({
        open: true,
        title: options.title ?? "Are you sure?",
        message: options.message ?? "",
        confirmLabel: options.confirmLabel ?? "Confirm",
        cancelLabel: options.cancelLabel ?? "Cancel",
        danger: options.danger ?? false,
        loading: false,
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setState((prev) => ({ ...prev, loading: true }));

    /*
     * Resolve on the next tick so the loading spinner renders before the
     * caller's async work begins.
     */
    setTimeout(() => {
      resolveRef.current?.(true);
      resolveRef.current = null;
      setState((prev) => ({ ...prev, open: false, loading: false }));
    }, 0);
  }, []);

  const handleCancel = useCallback(() => {
    resolveRef.current?.(false);
    resolveRef.current = null;
    setState((prev) => ({ ...prev, open: false, loading: false }));
  }, []);

  const ConfirmElement = (
    <Dialog
      open={state.open}
      onClose={state.loading ? undefined : handleCancel}
      maxWidth="xs"
      fullWidth
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
    >
      <DialogTitle id="confirm-dialog-title">
        {state.title}
      </DialogTitle>

      {state.message ? (
        <DialogContent>
          <DialogContentText id="confirm-dialog-description">
            {state.message}
          </DialogContentText>
        </DialogContent>
      ) : null}

      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button
          onClick={handleCancel}
          disabled={state.loading}
          variant="outlined"
          sx={{
            textTransform: "none",
            borderColor: "#d0d7e2",
            color: "#1a2434",
            "&:hover": { borderColor: "#b0baca" },
          }}
        >
          {state.cancelLabel}
        </Button>

        <Button
          onClick={handleConfirm}
          disabled={state.loading}
          variant="contained"
          color={state.danger ? "error" : "primary"}
          startIcon={
            state.loading ? (
              <CircularProgress size={14} color="inherit" />
            ) : null
          }
          sx={{ textTransform: "none", minWidth: 90 }}
        >
          {state.loading ? "Please wait…" : state.confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );

  return { confirm, ConfirmElement };
}
