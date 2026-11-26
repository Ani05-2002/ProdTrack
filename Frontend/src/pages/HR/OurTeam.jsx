
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
import ExcelJS from "exceljs";
import FileDownloadRoundedIcon from "@mui/icons-material/FileDownloadRounded";



const getTodayIST = () => {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(new Date());

    const value = (type) =>
        parts.find((part) => part.type === type)?.value;

    return `${value("year")}-${value("month")}-${value("day")}`;
};

// HR Our Team page.
export default function OurTeam() {
    // Store employee records returned by the backend.
    const [employees, setEmployees] = useState([]);

    // Track loading and errors.
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Store the employee search text.
    const [search, setSearch] = useState("");

    const [reportDate, setReportDate] = useState(getTodayIST);
    const [exporting, setExporting] = useState(false);


    // Fetch all employees available to HR.
    const loadEmployees = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            // Call the existing HR Our Team endpoint.
            const data = await apiRequest(
                `/hr/our-team?date=${encodeURIComponent(reportDate)}`
            );

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
    }, [reportDate]);

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


    const handleDownloadAttendance = async () => {
        if (!reportDate) {
            setError("Please select an attendance date.");
            return;
        }

        setExporting(true);
        setError("");

        try {
            // Fetch the selected day's data directly.
            const data = await apiRequest(
                `/hr/our-team?date=${encodeURIComponent(reportDate)}`
            );

            const records =
                data.members || data.employees || data.users || [];

            if (!Array.isArray(records) || records.length === 0) {
                setError("No employees found for this report.");
                return;
            }

            const workbook = new ExcelJS.Workbook();
            workbook.creator = "ProdTrack";

            const worksheet = workbook.addWorksheet(
                "Daily Attendance"
            );

            worksheet.columns = [
                { width: 18 },
                { width: 20 },
                { width: 32 },
                { width: 25 },
                { width: 22 },
            ];

            // Report title
            worksheet.mergeCells("A1:E1");
            const titleCell = worksheet.getCell("A1");
            titleCell.value = "PRODTRACK — DAILY ATTENDANCE REPORT";
            titleCell.font = {
                bold: true,
                size: 16,
                color: { argb: "FFFFFFFF" },
            };
            titleCell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FF2F6DF6" },
            };
            titleCell.alignment = {
                vertical: "middle",
                horizontal: "center",
            };
            worksheet.getRow(1).height = 35;

            // Selected date
            worksheet.getCell("A2").value = "Attendance Date";
            worksheet.getCell("B2").value = reportDate;
            worksheet.getCell("A2").font = { bold: true };

            // Attendance totals
            const statusOf = (employee) =>
                String(
                    employee.attendance_status || "Not Marked"
                ).trim();

            const present = records.filter(
                (employee) =>
                    statusOf(employee).toLowerCase() === "present"
            ).length;

            const absent = records.filter(
                (employee) =>
                    statusOf(employee).toLowerCase() === "absent"
            ).length;

            const leave = records.filter(
                (employee) =>
                    statusOf(employee).toLowerCase().includes("leave")
            ).length;

            worksheet.mergeCells("A3:E3");
            worksheet.getCell("A3").value =
                `Total: ${records.length}  |  Present: ${present}  |  Absent: ${absent}  |  Leave: ${leave}`;

            worksheet.getCell("A3").font = { bold: true };

            // Column headers
            const headers = [
                "Attendance Date",
                "Employee ID",
                "Employee Name",
                "Role",
                "Attendance Status",
            ];

            const headerRow = worksheet.getRow(5);
            headerRow.values = headers;
            headerRow.height = 27;

            headerRow.eachCell((cell) => {

                cell.border = {
                    top: { style: "thin", color: { argb: "FF000000" } },
                    left: { style: "thin", color: { argb: "FF000000" } },
                    bottom: { style: "thin", color: { argb: "FF000000" } },
                    right: { style: "thin", color: { argb: "FF000000" } },
                };

                cell.font = {
                    bold: true,
                    color: { argb: "FFFFFFFF" },
                };
                cell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: "FF3478ED" },
                };
                cell.alignment = {
                    vertical: "middle",
                };
            });

            // Prevent spreadsheet formula interpretation
            const safeText = (value) => {
                const text = String(value ?? "");
                return /^[\s]*[=+\-@]/.test(text)
                    ? `'${text}`
                    : text;
            };

            // Employee attendance rows
            records.forEach((employee) => {
                const status = statusOf(employee);

                const row = worksheet.addRow([
                    reportDate,
                    safeText(employee.employee_id || employee.emp_code),
                    safeText(employee.name),
                    safeText(employee.role),
                    safeText(status),
                ]);


                const statusCell = row.getCell(5);

                const normalized = String(status || "")
                    .trim()
                    .toLowerCase();

                let backgroundColor = "FFFFFFFF";

                // Attendance status background colors
                if (normalized === "absent") {
                    backgroundColor = "FFFF6666"; // Red
                } else if (normalized === "present") {
                    backgroundColor = "FF75D5A1"; // Green
                } else if (normalized.includes("leave")) {
                    backgroundColor = "FFFFD966"; // Yellow
                }

                statusCell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: backgroundColor },
                };

                // Black and bold status text
                statusCell.font = {
                    bold: true,
                    color: { argb: "FF000000" },
                };

                statusCell.alignment = {
                    vertical: "middle",
                    horizontal: "center",
                };


                /* Add black borders to every employee row */

                // Increase row height for better readability
                row.height = 25;

                // Apply borders to all 5 columns
                row.eachCell({ includeEmpty: true }, (cell) => {
                    cell.border = {
                        top: {
                            style: "thin",
                            color: { argb: "FF000000" },
                        },
                        left: {
                            style: "thin",
                            color: { argb: "FF000000" },
                        },
                        bottom: {
                            style: "thin",
                            color: { argb: "FF000000" },
                        },
                        right: {
                            style: "thin",
                            color: { argb: "FF000000" },
                        },
                    };

                    cell.alignment = {
                        ...cell.alignment,
                        vertical: "middle",
                    };
                });


            });

            // Excel filters and frozen headings
            worksheet.autoFilter = {
                from: "A5",
                to: `E${worksheet.rowCount}`,
            };

            worksheet.views = [
                {
                    state: "frozen",
                    ySplit: 5,
                },
            ];

            // Generate Excel file
            const buffer = await workbook.xlsx.writeBuffer();

            const blob = new Blob([buffer], {
                type:
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });

            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");

            link.href = url;
            link.download =
                `ProdTrack-Attendance-${reportDate}.xlsx`;

            document.body.appendChild(link);
            link.click();
            link.remove();

            setTimeout(() => URL.revokeObjectURL(url), 2000);
        } catch (error) {
            console.error("Attendance Excel export error:", error);
            setError(error.message || "Failed to download attendance.");
        } finally {
            setExporting(false);
        }
    };

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

                        <TextField
                            label="Attendance Date"
                            type="date"
                            size="small"
                            value={reportDate}
                            onChange={(event) =>
                                setReportDate(event.target.value)
                            }
                            slotProps={{
                                inputLabel: { shrink: true },
                                htmlInput: { max: getTodayIST() },
                            }}
                            sx={{ minWidth: 170 }}
                        />

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

                        <Button
                            variant="contained"
                            startIcon={<FileDownloadRoundedIcon />}
                            onClick={handleDownloadAttendance}
                            disabled={exporting || loading || !reportDate}
                            sx={{
                                bgcolor: "#3478ed",
                                color: "#fff",
                                textTransform: "none",
                                borderRadius: 1.5,
                                fontWeight: 600,
                                whiteSpace: "nowrap",
                                "&:hover": {
                                    bgcolor: "#2463d6",
                                },
                            }}
                        >
                            {exporting ? "Downloading..." : "Download Excel"}
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
