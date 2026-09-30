import { useEffect,useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Paper,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";

// Provides the MUI icon set used inside the metric cards, replacing the previous emoji icons.
import MoveToInboxRoundedIcon from "@mui/icons-material/MoveToInboxRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import MenuBookRoundedIcon from "@mui/icons-material/MenuBookRounded";
import ShieldRoundedIcon from "@mui/icons-material/ShieldRounded";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import FolderRoundedIcon from "@mui/icons-material/FolderRounded";

// Maps each metric-card position to a real MUI icon component instead of an emoji.
const icons = [
  MoveToInboxRoundedIcon,
  CheckRoundedIcon,
  AccessTimeRoundedIcon,
  BoltRoundedIcon,
  GroupsRoundedIcon,
  MenuBookRoundedIcon,
  ShieldRoundedIcon,
  LinkRoundedIcon,
  FolderRoundedIcon,
];

// Colors each icon to match its card's background tint, cycling every 4 cards like the backgrounds do.
const iconColors = ["#3478ed", "#20a36f", "#e09a22", "#7c3aed"];

export function CoreMetricCards({ items }) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "repeat(4, minmax(150px, 1fr))",
        gap: 2,
        mb: 2,
        "@media (max-width: 800px)": { gridTemplateColumns: "repeat(2, 1fr)" },
        "@media (max-width: 480px)": { gridTemplateColumns: "1fr" },
      }}
    >
      {items.map(([label, value, note], index) => {
        // Selects the MUI icon component for this card's position.
        const IconComponent = icons[index % icons.length];

        return (
        <Paper
          key={label}
          elevation={0}
          sx={{
            p: 1.7,
            minHeight: 98,
            border: "1px solid #dbe3ec",
            borderRadius: 1.5,
            boxShadow: "0 2px 5px rgba(16,35,61,.08)",
            display: "flex",
            alignItems: "center",
            gap: 1.3,
          }}
        >
          <Box
            sx={{
              width: 45,
              height: 45,
              flexShrink: 0,
              borderRadius: 1.3,
              bgcolor: ["#eaf1ff", "#e2f6ec", "#fff3dc", "#f0e9ff"][index % 4],
              display: "grid",
              placeItems: "center",
              fontSize: 22,
            }}
          >
            <IconComponent
              sx={{
                fontSize: 22,
                color: iconColors[index % 4],
              }}
            />
          </Box>
          <Box>
            <Typography sx={{ color: "#667085", fontSize: 12 }}>
              {label}
            </Typography>
            <Typography
              sx={{ fontSize: 25, lineHeight: 1.12, fontWeight: 800 }}
            >
              {value}
            </Typography>
            {note && (
              <Typography
                sx={{
                  color: note.startsWith("-") ? "#dc3545" : "#15966a",
                  fontSize: 11,
                }}
              >
                {note}
              </Typography>
            )}
          </Box>
        </Paper>
        );
      })}
    </Box>
  );
}

const ROLE_LABELS = ["INDEXER", "TEAM LEAD", "CORE TEAM", "ADMIN"];

const ROLE_COLORS = {
  INDEXER: { bg: "#eaf1ff", color: "#2458c7", border: "#bcd2ff" },
  "TEAM LEAD": { bg: "#e9f7ef", color: "#15803d", border: "#a7d7bc" },
  "CORE TEAM": { bg: "#f3e8ff", color: "#7c3aed", border: "#d3b4fd" },
  ADMIN: { bg: "#fff0e0", color: "#b45309", border: "#f5c480" },
};

// Shared pagination footer used by CoreTable and other tables throughout the app.
export function TablePagination({ page, total, rowsPerPage, onPageChange }) {
  const totalPages = Math.ceil(total / rowsPerPage);
  if (totalPages <= 1) return null;
  const start = page * rowsPerPage + 1;
  const end = Math.min((page + 1) * rowsPerPage, total);
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 1,
        px: 2,
        py: 1,
        borderTop: "1px solid #e3e8ef",
      }}
    >
      <Typography sx={{ fontSize: 12, color: "#526581" }}>
        {start}–{end} of {total}
      </Typography>
      <Button
        size="small"
        disabled={page === 0}
        onClick={() => onPageChange(page - 1)}
        sx={{ minWidth: 28, height: 28, p: 0, fontSize: 16, color: "#526581" }}
      >
        ‹
      </Button>
      <Button
        size="small"
        disabled={page >= totalPages - 1}
        onClick={() => onPageChange(page + 1)}
        sx={{ minWidth: 28, height: 28, p: 0, fontSize: 16, color: "#526581" }}
      >
        ›
      </Button>
    </Box>
  );
}

const CORE_TABLE_ROWS_PER_PAGE = 10;

export function CoreTable({
  columns,
  rows,
  actionLabel = "Edit",
  onAction,
  onCellAction,
  actionVariant = "outlined",
}) {
  const [page, setPage] = useState(0);

  // Reset to page 0 whenever rows change (filter/data refresh).
  useEffect(() => { setPage(0); }, [rows.length]);

  const pagedRows = rows.slice(
    page * CORE_TABLE_ROWS_PER_PAGE,
    (page + 1) * CORE_TABLE_ROWS_PER_PAGE,
  );

  return (
    <Paper
      elevation={0}
      sx={{ border: "1px solid #dbe3ec", borderRadius: 1.5, overflow: "auto" }}
    >
      <Table size="small" sx={{ minWidth: 680 }}>
        <TableHead>
          <TableRow sx={{ bgcolor: "#f8fafc" }}>
            {columns.map((column, index) => {
              const firstCell = rows[0]?.[index];
              const isDotColumn = firstCell === "●" || firstCell === "○";
              return (
                <TableCell
                  key={column}
                  align={isDotColumn ? "center" : "left"}
                  sx={{
                    fontWeight: 800,
                    fontSize: 11,
                    color: "#526581",
                    py: 1.4,
                  }}
                >
                  {column}
                </TableCell>
              );
            })}
            {actionLabel && <TableCell />}
          </TableRow>
        </TableHead>
        <TableBody>
          {pagedRows.map((row, rowIndex) => {
            const globalIndex = page * CORE_TABLE_ROWS_PER_PAGE + rowIndex;
            return (
            <TableRow key={`row-${globalIndex}`} hover>
              {row.map((cell, cellIndex) => (
                <TableCell
                  key={`${row[0]}-${cellIndex}`}
                  align={cell === "●" || cell === "○" ? "center" : "left"}
                  sx={{ verticalAlign: "middle", py: 1.9 }}
                >
                  {cell === "●" || cell === "○" ? (
                    <Box
                      component="button"
                      type="button"
                      aria-label={
                        cell === "●"
                          ? "Revoke project access"
                          : "Grant project access"
                      }
                      onClick={() => onCellAction?.(globalIndex, cellIndex)}
                      sx={{
                        width: 10,
                        height: 10,
                        p: 0,
                        minWidth: 10,
                        borderRadius: "50%",
                        border:
                          cell === "●"
                            ? "1px solid #15966a"
                            : "1px solid #cbd5e1",
                        bgcolor: cell === "●" ? "#15966a" : "transparent",
                        cursor: onCellAction ? "pointer" : "default",
                        "&:hover": onCellAction
                          ? { transform: "scale(1.25)" }
                          : {},
                      }}
                    />
                  ) : cellIndex === row.length - 1 &&
                    [
                      "Active",
                      "ACTIVE",
                      "Pending",
                      "PENDING",
                      "INACTIVE",
                    ].includes(cell) ? (
                    <Chip
                      size="small"
                      label={cell}
                      color={
                        cell.toLowerCase() === "active"
                          ? "success"
                          : cell.toLowerCase() === "pending"
                            ? "warning"
                            : "default"
                      }
                      sx={{ fontSize: 10, fontWeight: 800 }}
                    />
                  ) : ROLE_LABELS.includes(cell) ? (
                    <Box
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        px: 1.2,
                        py: 0.3,
                        borderRadius: "5px",
                        bgcolor: ROLE_COLORS[cell]?.bg,
                        border: `1px solid ${ROLE_COLORS[cell]?.border}`,
                        color: ROLE_COLORS[cell]?.color,
                        fontSize: 10,
                        fontWeight: 800,
                        letterSpacing: "0.04em",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {cell}
                    </Box>
                  ) : (
                    cell
                  )}
                </TableCell>
              ))}
              {actionLabel && (
                <TableCell sx={{ py: 1.9 }}>
                  <Button
                    size="small"
                    variant={actionVariant}
                    onClick={() => onAction?.(row, globalIndex)}
                    sx={
                      actionVariant === "text"
                        ? { color: "#10233d", minWidth: 0, px: 0, fontSize: 12 }
                        : {}
                    }
                  >
                    {actionLabel}
                  </Button>
                </TableCell>
              )}
            </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <TablePagination
        page={page}
        total={rows.length}
        rowsPerPage={CORE_TABLE_ROWS_PER_PAGE}
        onPageChange={setPage}
      />
    </Paper>
  );
}

export default function CorePageShell({
  title,
  description,
  actionLabel,
  actionIcon,
  actionHandler,
  headerExtra,
  children,
  breadcrumb = "Core Team",
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const openAction = () => setDialogOpen(true);
  const closeAction = () => setDialogOpen(false);
  const completeAction = () => {
    setDialogOpen(false);
    setNotice(`${actionLabel || "Action"} completed`);
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Typography sx={{ color: "#6A7585", fontSize: 12.5 }}>
        ProdTrack · {breadcrumb}
      </Typography>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 2,
          mb: 2,
          mt: 0.7,
          "@media (max-width: 600px)": { flexDirection: "column" },
        }}
      >
        <Box>
          <Typography component="div" sx={{ fontSize: 22, fontWeight: 800, color:"#1A2434" }}>
            {title}
          </Typography>
          <Typography sx={{ color: "#6A7585", fontSize: 13.5, mt: 0.4 }}>
            {description}
          </Typography>
        </Box>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            flexWrap: "wrap",
            justifyContent: "flex-end",
          }}
        >
          {headerExtra}
          {actionLabel && (
            <Button
              variant="contained"
              startIcon={
                actionIcon === null
                  ? undefined
                  : actionIcon || <AddRoundedIcon />
              }
              onClick={actionHandler || openAction}
            >
              {actionLabel}
            </Button>
          )}
        </Box>
      </Box>
      {children}
      <Dialog
        open={dialogOpen}
        onClose={closeAction}
        fullWidth
        maxWidth="sm"
        slotProps={{
          paper: {
            sx: {
              borderRadius: 2,
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 800,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          {actionLabel || "Action"}
          <IconButton onClick={closeAction} size="small">
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <Divider />
        <DialogContent
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 2,
            pt: 2,
            "@media (max-width: 560px)": { gridTemplateColumns: "1fr" },
          }}
        >
          <TextField label="Name" placeholder="Enter details" fullWidth />
          <TextField
            label="Description"
            placeholder="Add a short description"
            fullWidth
          />
        </DialogContent>
        <Divider />
        <DialogActions sx={{ p: 2, bgcolor: "#f8fafc" }}>
          <Button onClick={closeAction}>Cancel</Button>
          <Button variant="contained" onClick={completeAction}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={Boolean(notice)}
        autoHideDuration={2600}
        onClose={() => setNotice("")}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setNotice("")}
          severity="success"
          variant="filled"
        >
          {notice}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export function UploadAction() {
  return <UploadFileRoundedIcon />;
}
export function SectionCard({ title, action, children }) {
  return (
    <Paper
      elevation={0}
      sx={{
        border: "1px solid #dbe3ec",
        borderRadius: 1.5,
        overflow: "hidden",
        mb: 2,
      }}
    >
      <Box
        sx={{
          px: 2,
          py: 1.5,
          borderBottom: "1px solid #e3e8ef",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography
            component="div"
            sx={{ fontWeight: 800 }}
          >
            {title}
          </Typography>
        {action}
      </Box>
      {children}
    </Paper>
  );
}
export function Person({ initials, name }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Avatar
        sx={{
          width: 28,
          height: 28,
          bgcolor: "#5b5ce2",
          fontSize: 11,
          fontWeight: 700,
        }}
      >
        {initials}
      </Avatar>
      {name}
    </Box>
  );
}
// Displays the shared Add/Edit form dialog while supporting selectable fields and API submission.
export function CoreFormDialog({
  open,
  onClose,
  title,
  fields,
  submitLabel = "Save",
  onSubmit,
  initialValues = {},
}) {
  // Stores the current values entered or selected inside the form.
  const [values, setValues] = useState({});

  // Stores inline field-level validation errors.
  const [errors, setErrors] = useState({});

  // Updates one form field and clears its error.
  const update = (name, value) => {
    setValues((current) => ({ ...current, [name]: value }));
    if (errors[name]) {
      setErrors((current) => ({ ...current, [name]: false }));
    }
  };

  // Initializes the form whenever the dialog opens.
  useEffect(() => {
    if (open) {
      setValues(initialValues || {});
      setErrors({});
    }
  }, [open, initialValues]);

  // Validates required fields and submits.
  const submit = async () => {
    const newErrors = {};
    (fields || []).forEach((field) => {
      if (field.required) {
        const val = values[field.name];
        if (!val || String(val).trim() === "") {
          newErrors[field.name] = true;
        }
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (onSubmit) {
      await onSubmit(values);
      return;
    }

    onClose();
    setValues({});
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      slotProps={{ paper: { sx: { borderRadius: 2 } } }}
    >
      <DialogTitle
        sx={{ fontWeight: 800, display: "flex", justifyContent: "space-between" }}
      >
        {title}
        <IconButton onClick={onClose} size="small">
          <CloseRoundedIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 2,
          pt: 2,
          "@media (max-width: 560px)": { gridTemplateColumns: "1fr" },
        }}
      >
        {(fields || []).map((field) => (
          // Wraps each field in a Box so the label sits above the input like the reference design.
          <Box key={field.name} sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            {/* Label rendered outside and above the input box, always visible. */}
            <Typography
              component="label"
              htmlFor={`field-${field.name}`}
              sx={{
                fontSize: 12.5,
                fontWeight: 600,
                color: "#374151",
                lineHeight: 1.4,
              }}
            >
              {field.label}
              {field.required && (
                <Box component="span" sx={{ color: "#d32f2f", ml: 0.3 }}>*</Box>
              )}
            </Typography>

            {/* Input box with no MUI floating label — just a clean placeholder. */}
            <TextField
              id={`field-${field.name}`}
              placeholder={field.placeholder}
              type={field.options ? "text" : (field.type || "text")}
              value={values[field.name] || ""}
              onChange={(event) => update(field.name, event.target.value)}
              select={Boolean(field.options)}
              fullWidth
              size="small"
              error={Boolean(errors[field.name])}
              helperText={errors[field.name] ? `${field.label} is required.` : ""}
              // No label prop — label is rendered above as a Typography element.
              InputLabelProps={{ shrink: false }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 1.2,
                  bgcolor: "#fff",
                },
                "& .MuiInputBase-input::placeholder": {
                  color: "#9ca3af",
                  opacity: 1,
                  fontSize: 13.5,
                },
              }}
            >
              {field.options && (
                <MenuItem value="">
                  <Box component="span" sx={{ color: "#9ca3af" }}>
                    {field.placeholder || "Select..."}
                  </Box>
                </MenuItem>
              )}
              {field.options?.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        ))}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2, bgcolor: "#f8fafc" }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={submit}>
          {submitLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
