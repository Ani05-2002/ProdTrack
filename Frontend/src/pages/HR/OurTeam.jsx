
import { useCallback, useEffect, useState } from "react";

// Import ProdTrack's authenticated API helper.
import apiRequest from "../../lib/api.js";

// Import Material UI components.
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
import TextField from "@mui/material/TextField";

// HR Our Team page.
export default function OurTeam() {
    // Store employee records returned by the backend.
    const [employees, setEmployees] = useState([]);

    // Track loading and errors.
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Store the employee search text.
    const [search, setSearch] = useState("");

    // Fetch all employees available to HR.
    const loadEmployees = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            // Call the existing HR Our Team endpoint.
            const data = await apiRequest("/hr/our-team");

            // Support common employee-list response keys.
            const employeeList =
                data.employees || data.members || data.users || [];

            // Store the employee records.
            setEmployees(Array.isArray(employeeList) ? employeeList : []);
        } catch (err) {
            // Display any backend error.
            setError(err.message || "Failed to load employees");
        } finally {
            // Stop the loading indicator.
            setLoading(false);
        }
    }, []);

    // Load employees when the HR page opens.
    useEffect(() => {
        loadEmployees();
    }, [loadEmployees]);

    // Filter employees by name or employee ID.
    const filteredEmployees = employees.filter((employee) => {
        // Search using the same name properties displayed in the table.
        const name = String(employee.name || "").toLowerCase();
        const employeeId = String(
            employee.emp_code || employee.employee_id || ""
        ).toLowerCase();

        const keyword = search.toLowerCase().trim();

        return name.includes(keyword) || employeeId.includes(keyword);
    });

    return (
        <Box sx={{ width: "100%" }}>
            {/* Main card matching the HR Attendance design. */}
            <Paper
                elevation={0}
                sx={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 1,
                    bgcolor: "#fff",
                    overflow: "hidden",
                }}
            >
                {/* Header with title, search, and refresh button. */}
                <Box
                    sx={{
                        px: 2.5,
                        py: 2,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 2,
                        flexWrap: "wrap",
                        borderBottom: "1px solid #e5e7eb",
                    }}
                >
                    <Typography
                        sx={{
                            fontSize: 16,
                            fontWeight: 700,
                            color: "#1A2434",
                        }}
                    >
                        Our Team
                    </Typography>

                    <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                        {/* Search by employee name or ID. */}
                        <TextField
                            size="small"
                            placeholder="Search employees..."
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                        />

                        {/* Refresh the employee list. */}
                        <Button
                            onClick={loadEmployees}
                            disabled={loading}
                            sx={{ textTransform: "none" }}
                        >
                            Refresh
                        </Button>
                    </Box>
                </Box>

                {/* Show backend errors. */}
                {error && (
                    <Alert severity="error" sx={{ m: 2 }}>
                        {error}
                    </Alert>
                )}

                {/* Employee list table. */}
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: "#f8fafc" }}>
                                {["Member", "Emp ID", "Role", "Status"].map((heading) => (
                                    <TableCell
                                        key={heading}
                                        sx={{
                                            fontWeight: 700,
                                            fontSize: 13,
                                            color: "#1A2434",
                                        }}
                                    >
                                        {heading}
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {loading ? (
                                // Show loading message.
                                <TableRow>
                                    <TableCell colSpan={4}>
                                        Loading employees...
                                    </TableCell>
                                </TableRow>
                            ) : filteredEmployees.length === 0 ? (
                                // Show empty state.
                                <TableRow>
                                    <TableCell colSpan={4}>
                                        {error
                                            ? "Unable to load employees."
                                            : "No employees found."}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                // Display matching employees.
                                filteredEmployees.map((employee, index) => {
                                    // Resolve the employee's attendance status.
                                    const status = String(
                                        employee.attendance_status ||
                                        employee.status ||
                                        "Not Marked"
                                    );

                                    // Choose badge color from the status.
                                    const statusColor =
                                        status.toLowerCase() === "present"
                                            ? "success"
                                            : status.toLowerCase().includes("leave")
                                                ? "warning"
                                                : "default";

                                    return (
                                        <TableRow
                                            key={employee.user_id || employee.id || index}
                                            hover
                                        >
                                            {/* Employee name. */}
                                            <TableCell>
                                                {employee.name || "—"}
                                            </TableCell>

                                            {/* Employee ID. */}
                                            <TableCell>
                                                {employee.emp_code ||
                                                    employee.employee_id ||
                                                    "—"}
                                            </TableCell>
                                            {/* Display the role returned by the backend. */}
                                            <TableCell>
                                                {employee.role || "—"}
                                            </TableCell>

                                            {/* Employee attendance status. */}
                                            <TableCell>
                                                <Chip
                                                    label={status}
                                                    color={statusColor}
                                                    size="small"
                                                    sx={{ fontWeight: 600 }}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Box>
    );
}
