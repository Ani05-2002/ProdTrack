
import { useEffect, useState } from "react";

import {
    Alert,
    Autocomplete,
    Box,
    Button,
    MenuItem,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from "@mui/material";

import { apiRequest } from "../lib/api.js";
import { useConfirm } from "./ConfirmDialog.jsx";

const todayIST = () =>
    new Date(
        Date.now() + 330 * 60000
    ).toISOString().slice(0, 10);

const endpoint =
    "/admin/locking-rules/user-restrictions";

export default function UserEntryRestrictions() {
    const { confirm, ConfirmElement } = useConfirm();
    // Indexers and saved restrictions.
    const [users, setUsers] = useState([]);
    const [rules, setRules] = useState([]);

    // Restriction form.
    const [user, setUser] = useState(null);
    const [date, setDate] = useState(todayIST);

    const [type, setType] =
        useState("full_day");

    const [cutoffTime, setCutoffTime] =
        useState("13:00");

    const [reason, setReason] =
        useState("");

    // Loading and feedback states.
    const [loading, setLoading] =
        useState(true);

    const [busy, setBusy] =
        useState(false);

    const [error, setError] =
        useState("");

    const [success, setSuccess] =
        useState("");

    // ===================================================
    // LOAD INDEXERS AND RESTRICTIONS
    // ===================================================

    const load = async () => {
        setLoading(true);

        try {
            const data = await apiRequest(endpoint);

            if (!data.success) {
                throw new Error(
                    data.message ||
                    "Unable to load restrictions."
                );
            }

            setUsers(data.users || []);
            setRules(data.restrictions || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    // ===================================================
    // APPLY RESTRICTION
    // ===================================================

    const save = async () => {
        if (
            !user ||
            !date ||
            !reason.trim() ||
            (
                type === "after_time" &&
                !cutoffTime
            )
        ) {
            return;
        }

        setBusy(true);
        setError("");
        setSuccess("");

        try {
            await apiRequest(endpoint, {
                method: "POST",

                body: JSON.stringify({
                    userId: user.userId,
                    date,
                    type,
                    cutoffTime,
                    reason: reason.trim(),
                }),
            });

            setSuccess(
                "Entry restriction saved successfully."
            );

            setReason("");

            await load();
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    };

    // ===================================================
    // REMOVE RESTRICTION
    // ===================================================


    const remove = async (rule) => {
        if (busy) return;

        const confirmed = await confirm({
            title: "Remove entry restriction?",

            message: `Are you sure you want to remove the entry restriction for ${rule.name} on ${rule.date}? The Indexer will regain normal daily entry access, subject to existing locking rules.`,

            confirmLabel: "Remove",
            cancelLabel: "Cancel",
            danger: false,
        });

        if (!confirmed) return;

        setBusy(true);
        setError("");
        setSuccess("");

        try {
            await apiRequest(
                `${endpoint}/${rule.id}`,
                {
                    method: "DELETE",
                }
            );

            setSuccess(
                "Entry restriction removed."
            );

            await load();

        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    };

    // ===================================================
    // USER RESTRICTION UI
    // ===================================================

    return (
        <Paper
            elevation={0}
            sx={{
                mt: 2,
                mb: 2,
                p: 2.5,
                border: "1px solid #dbe3ec",
                borderRadius: 1.5,
                bgcolor: "#fff",
            }}
        >
            {/* Section heading */}

            <Typography
                sx={{
                    fontWeight: 800,
                    fontSize: 16,
                }}
            >
                User-specific entry restrictions
            </Typography>

            <Typography
                sx={{
                    color: "#64748b",
                    fontSize: 13,
                    mb: 2,
                }}
            >
                Restrict a selected Indexer across all
                projects. All dates and times use IST.
            </Typography>

            {/* Success and error messages */}

            {error && (
                <Alert
                    severity="error"
                    sx={{ mb: 2 }}
                >
                    {error}
                </Alert>
            )}

            {success && (
                <Alert
                    severity="success"
                    sx={{ mb: 2 }}
                >
                    {success}
                </Alert>
            )}

            {/* Restriction form */}

            <Box
                sx={{
                    display: "grid",

                    gridTemplateColumns: {
                        xs: "1fr",
                        md: "repeat(2, minmax(0, 1fr))",
                    },

                    gap: 2,
                }}
            >
                {/* Select Indexer */}

                <Autocomplete
                    options={users}
                    value={user}
                    loading={loading}
                    disabled={busy || loading}

                    onChange={(_, value) =>
                        setUser(value)
                    }

                    isOptionEqualToValue={(a, b) =>
                        a.userId === b.userId
                    }

                    getOptionLabel={(item) =>
                        `${item.name} (${item.empCode})`
                    }

                    renderInput={(params) => (
                        <TextField
                            {...params}
                            size="small"
                            label="Select Indexer"
                        />
                    )}
                />

                {/* Select restriction date */}

                <TextField
                    size="small"
                    label="Restriction date"
                    type="date"
                    value={date}
                    disabled={busy}

                    onChange={(event) =>
                        setDate(event.target.value)
                    }

                    slotProps={{
                        inputLabel: {
                            shrink: true,
                        },
                    }}
                />

                {/* Select restriction type */}

                <TextField
                    select
                    label="Restriction type"
                    size="small"
                    value={type}
                    disabled={busy}

                    onChange={(event) =>
                        setType(event.target.value)
                    }
                >
                    <MenuItem value="full_day">
                        Block entire day
                    </MenuItem>

                    <MenuItem value="after_time">
                        Block after selected time (half day)
                    </MenuItem>
                </TextField>

                {/* Show time only for half-day option */}

                {type === "after_time" && (
                    <TextField
                        size="small"
                        label="Block from (IST)"
                        type="time"
                        value={cutoffTime}
                        disabled={busy}

                        onChange={(event) =>
                            setCutoffTime(event.target.value)
                        }

                        slotProps={{
                            inputLabel: {
                                shrink: true,
                            },
                        }}
                    />
                )}

                {/* Reason */}

                <TextField
                    size="small"
                    label="Reason"
                    placeholder="e.g. Half-day work"
                    value={reason}
                    disabled={busy}

                    onChange={(event) =>
                        setReason(event.target.value)
                    }

                    slotProps={{
                        htmlInput: {
                            maxLength: 250,
                        },
                    }}

                    sx={{
                        gridColumn: "1 / -1",
                    }}
                />
            </Box>

            <Typography
                sx={{
                    color: "#64748b",
                    fontSize: 12,
                    mt: 1,
                }}
            >
                Saving the same employee and date
                replaces the existing restriction.
            </Typography>

            {/* Apply button */}

            <Box
                sx={{
                    display: "flex",
                    justifyContent: "flex-end",
                    mt: 2,
                    mb: 3,
                }}
            >
                <Button
                    variant="contained"
                    onClick={save}

                    disabled={
                        busy ||
                        loading ||
                        !user ||
                        !date ||
                        !reason.trim() ||
                        (
                            type === "after_time" &&
                            !cutoffTime
                        )
                    }

                    sx={{
                        textTransform: "none",
                    }}
                >
                    {busy
                        ? "Please wait..."
                        : "Apply restriction"}
                </Button>
            </Box>

            {/* Saved restrictions table */}

            <Typography
                sx={{
                    fontWeight: 800,
                    mb: 1,
                }}
            >
                Saved restrictions
            </Typography>

            <Box
                sx={{
                    overflowX: "auto",
                }}
            >
                <Table size="small">
                    <TableHead>
                        <TableRow
                            sx={{
                                bgcolor: "#f8fafc",
                            }}
                        >
                            {[
                                "Indexer",
                                "Date",
                                "Restriction",
                                "Reason",
                                "Action",
                            ].map((header) => (
                                <TableCell
                                    key={header}
                                    sx={{
                                        fontWeight: 700,
                                    }}
                                >
                                    {header}
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>

                    <TableBody>
                        {rules.map((rule) => (
                            <TableRow key={rule.id}>
                                {/* Employee */}

                                <TableCell>
                                    {rule.name}

                                    <Typography
                                        variant="caption"
                                        display="block"
                                        color="text.secondary"
                                    >
                                        {rule.empCode}
                                    </Typography>
                                </TableCell>

                                {/* Restriction date */}

                                <TableCell>
                                    {rule.date}
                                </TableCell>

                                {/* Restriction type */}

                                <TableCell>
                                    {rule.type === "full_day"
                                        ? "Full day"
                                        : `From ${String(
                                            rule.cutoffTime
                                        ).slice(0, 5)} IST`}
                                </TableCell>

                                {/* Reason */}

                                <TableCell
                                    sx={{
                                        overflowWrap: "anywhere",
                                        maxWidth: 300,
                                    }}
                                >
                                    {rule.reason}
                                </TableCell>

                                {/* Remove button */}

                                <TableCell>
                                    <Button
                                        color="error"
                                        size="small"

                                        disabled={
                                            busy || loading
                                        }

                                        onClick={() =>
                                            remove(rule)
                                        }

                                        sx={{
                                            textTransform: "none",
                                        }}
                                    >
                                        Remove
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}

                        {/* Empty table */}

                        {!rules.length && (
                            <TableRow>
                                <TableCell colSpan={5}>
                                    {loading
                                        ? "Loading restrictions..."
                                        : "No restrictions added."}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Box>
            {ConfirmElement}
        </Paper>
    );
}
