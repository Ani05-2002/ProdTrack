const db = require("../config/db");

const calculateProductivity = ({
  baseMetric,
  received,
  completed,
  batchesProcessed,
  availableHours,
}) => {
  if (baseMetric === "batches_processed") {
    const batches = Number(
      batchesProcessed || 0
    );

    const hours = Number(
      availableHours || 0
    );

    return hours > 0
      ? Number(
        (batches / hours).toFixed(2)
      )
      : 0;
  }

  const totalReceived = Number(
    received || 0
  );

  const totalCompleted = Number(
    completed || 0
  );

  return totalReceived > 0
    ? Math.round(
      (totalCompleted / totalReceived) *
      100
    )
    : 0;
};

// ======================================================
// REPORT SUMMARY
// ======================================================

const getMyReportSummary = async (
  req,
  res
) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    // Accept daily, weekly, and monthly report periods.
    const period = ["day", "week", "month"].includes(req.query.period)
      ? req.query.period
      : "week";
    const rawProjectId =
      req.query.projectId;

    const rawEmployeeId =
      req.query.employeeId;

    const projectId =
      rawProjectId &&
        rawProjectId !== "all"
        ? Number(rawProjectId)
        : null;

    const employeeId =
      rawEmployeeId &&
        rawEmployeeId !== "all"
        ? Number(rawEmployeeId)
        : null;

    if (
      projectId !== null &&
      (!Number.isInteger(projectId) ||
        projectId <= 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    if (
      employeeId !== null &&
      (!Number.isInteger(employeeId) ||
        employeeId <= 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid employee ID",
      });
    }

    const dateCondition =
      getProductionDateCondition(period);

    let rows;

    // =========================
    // INDEXER
    // =========================

    if (role === "indexer") {
      const conditions = [
        "de.user_id = ?",
        dateCondition,
      ];

      const queryValues = [userId];

      if (projectId !== null) {
        conditions.push(
          "de.project_id = ?"
        );

        queryValues.push(projectId);
      }

      [rows] = await db.query(
        `
        SELECT
          COALESCE(
            SUM(de.docs_received),
            0
          ) AS totalReceived,

          COALESCE(
            SUM(de.docs_completed),
            0
          ) AS totalCompleted

        FROM daily_entry de

        WHERE ${conditions.join(
          " AND "
        )}
        `,
        queryValues
      );
    }

    // =========================
    // TEAM LEAD
    // =========================

    else if (role === "teamLead") {
      const conditions = [
        "u.team_lead_id = ?",
        "u.status = 'active'",
        dateCondition,
      ];

      const queryValues = [userId];

      if (projectId !== null) {
        conditions.push(
          "de.project_id = ?"
        );

        queryValues.push(projectId);
      }

      if (employeeId !== null) {
        conditions.push(
          "u.user_id = ?"
        );

        queryValues.push(employeeId);
      }

      [rows] = await db.query(
        `
        SELECT
          COALESCE(
            SUM(de.docs_received),
            0
          ) AS totalReceived,

          COALESCE(
            SUM(de.docs_completed),
            0
          ) AS totalCompleted

        FROM users u

        JOIN daily_entry de
          ON de.user_id = u.user_id

        WHERE ${conditions.join(
          " AND "
        )}
        `,
        queryValues
      );
    }

    // =========================
    // CORE TEAM / ADMINISTRATOR
    // =========================

    else if (
      role === "coreTeam" ||
      role === "administrator"
    ) {
      // Include Team Lead received counts and Indexer completed counts.
      const conditions = [
        "u.status = 'active'",
        "r.code IN ('indexer', 'lead')",
        dateCondition,
      ];

      const queryValues = [];

      if (projectId !== null) {
        conditions.push(
          "de.project_id = ?"
        );

        queryValues.push(projectId);
      }

      if (employeeId !== null) {
        conditions.push(
          "u.user_id = ?"
        );

        queryValues.push(employeeId);
      }

      [rows] = await db.query(
        `
        SELECT
          COALESCE(
            SUM(de.docs_received),
            0
          ) AS totalReceived,

          COALESCE(
            SUM(de.docs_completed),
            0
          ) AS totalCompleted

        FROM users u

        JOIN role r
          ON r.role_id = u.role_id

        JOIN daily_entry de
          ON de.user_id = u.user_id

        WHERE ${conditions.join(
          " AND "
        )}
        `,
        queryValues
      );
    }

    else {
      return res.status(403).json({
        success: false,
        message:
          "You are not allowed to access this report",
      });
    }

    const totalReceived = Number(
      rows[0]?.totalReceived || 0
    );

    const totalCompleted = Number(
      rows[0]?.totalCompleted || 0
    );

    const totalPending = Math.max(
      totalReceived - totalCompleted,
      0
    );

    const completionRate =
      totalReceived > 0
        ? Math.round(
          (
            totalCompleted /
            totalReceived
          ) * 100
        )
        : 0;

    return res.status(200).json({
      success: true,
      summary: {
        totalReceived,
        totalCompleted,
        totalPending,
        completionRate,
      },
    });
  } catch (error) {
    console.error(
      "Report Summary Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to load report summary",
      error: error.message,
    });
  }
};

// ======================================================
// DAILY PRODUCTION REPORT
// ======================================================

const getMyDailyProduction = async (
  req,
  res
) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    // Accept daily, weekly, and monthly report periods.
    const period = ["day", "week", "month"].includes(req.query.period)
      ? req.query.period
      : "week";

    const rawProjectId =
      req.query.projectId;

    const rawEmployeeId =
      req.query.employeeId;

    const projectId =
      rawProjectId &&
        rawProjectId !== "all"
        ? Number(rawProjectId)
        : null;

    const employeeId =
      rawEmployeeId &&
        rawEmployeeId !== "all"
        ? Number(rawEmployeeId)
        : null;

    if (
      projectId !== null &&
      (!Number.isInteger(projectId) ||
        projectId <= 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    if (
      employeeId !== null &&
      (!Number.isInteger(employeeId) ||
        employeeId <= 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid employee ID",
      });
    }

    const dateCondition =
      getProductionDateCondition(period);

    let production;

    // =========================
    // INDEXER
    // =========================

    if (role === "indexer") {
      const conditions = [
        "de.user_id = ?",
        dateCondition,
      ];

      const queryValues = [userId];

      if (projectId !== null) {
        conditions.push(
          "de.project_id = ?"
        );

        queryValues.push(projectId);
      }

      [production] = await db.query(
        `
        SELECT
          DATE_FORMAT(
            de.production_date,
            '%Y-%m-%d'
          ) AS production_date,

          DAYNAME(
            de.production_date
          ) AS day_name,

          COALESCE(
            SUM(de.docs_received),
            0
          ) AS received,

          COALESCE(
            SUM(de.docs_completed),
            0
          ) AS completed

        FROM daily_entry de

        WHERE ${conditions.join(
          " AND "
        )}

        GROUP BY
          de.production_date,
          DAYNAME(de.production_date)

        ORDER BY
          de.production_date ASC
        `,
        queryValues
      );
    }

    // =========================
    // TEAM LEAD
    // =========================

    else if (role === "teamLead") {
      const conditions = [
        "u.team_lead_id = ?",
        "u.status = 'active'",
        dateCondition,
      ];

      const queryValues = [userId];

      if (projectId !== null) {
        conditions.push(
          "de.project_id = ?"
        );

        queryValues.push(projectId);
      }

      if (employeeId !== null) {
        conditions.push(
          "u.user_id = ?"
        );

        queryValues.push(employeeId);
      }

      [production] = await db.query(
        `
        SELECT
          DATE_FORMAT(
            de.production_date,
            '%Y-%m-%d'
          ) AS production_date,

          DAYNAME(
            de.production_date
          ) AS day_name,

          COALESCE(
            SUM(de.docs_received),
            0
          ) AS received,

          COALESCE(
            SUM(de.docs_completed),
            0
          ) AS completed

        FROM users u

        JOIN daily_entry de
          ON de.user_id = u.user_id

        WHERE ${conditions.join(
          " AND "
        )}

        GROUP BY
          de.production_date,
          DAYNAME(de.production_date)

        ORDER BY
          de.production_date ASC
        `,
        queryValues
      );
    }

    // =========================
    // CORE TEAM / ADMINISTRATOR
    // =========================

    else if (
      role === "coreTeam" ||
      role === "administrator"
    ) {
      // Include both roles in daily production totals.
      const conditions = [
        "u.status = 'active'",
        "r.code IN ('indexer', 'lead')",
        dateCondition,
      ];

      const queryValues = [];

      if (projectId !== null) {
        conditions.push(
          "de.project_id = ?"
        );

        queryValues.push(projectId);
      }

      if (employeeId !== null) {
        conditions.push(
          "u.user_id = ?"
        );

        queryValues.push(employeeId);
      }

      [production] = await db.query(
        `
        SELECT
          DATE_FORMAT(
            de.production_date,
            '%Y-%m-%d'
          ) AS production_date,

          DAYNAME(
            de.production_date
          ) AS day_name,

          COALESCE(
            SUM(de.docs_received),
            0
          ) AS received,

          COALESCE(
            SUM(de.docs_completed),
            0
          ) AS completed

        FROM users u

        JOIN role r
          ON r.role_id = u.role_id

        JOIN daily_entry de
          ON de.user_id = u.user_id

        WHERE ${conditions.join(
          " AND "
        )}

        GROUP BY
          de.production_date,
          DAYNAME(de.production_date)

        ORDER BY
          de.production_date ASC
        `,
        queryValues
      );
    }

    else {
      return res.status(403).json({
        success: false,
        message:
          "You are not allowed to access this report",
      });
    }

    return res.status(200).json({
      success: true,
      count: production.length,
      production,
    });
  } catch (error) {
    console.error(
      "Daily Production Report Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to load daily production report",
      error: error.message,
    });
  }
};

// ======================================================
// EMPLOYEE PRODUCTION REPORT
// ======================================================

const getEmployeeProduction = async (
  req,
  res
) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    // Accept daily, weekly, and monthly report periods.
    const period = ["day", "week", "month"].includes(req.query.period)
      ? req.query.period
      : "week";

    const rawProjectId =
      req.query.projectId;

    const rawEmployeeId =
      req.query.employeeId;

    const projectId =
      rawProjectId &&
        rawProjectId !== "all"
        ? Number(rawProjectId)
        : null;

    const employeeId =
      rawEmployeeId &&
        rawEmployeeId !== "all"
        ? Number(rawEmployeeId)
        : null;

    if (
      projectId !== null &&
      (!Number.isInteger(projectId) ||
        projectId <= 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    if (
      employeeId !== null &&
      (!Number.isInteger(employeeId) ||
        employeeId <= 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid employee ID",
      });
    }

    const dateCondition =
      getProductionDateCondition(period);

    const attendanceDateCondition =
      getAttendanceDateCondition(period);

    // Load saved productivity settings
    const [productivitySettingRows] =
      await db.query(
        `
        SELECT
          setting_key,
          setting_value

        FROM app_setting

        WHERE setting_key IN (
          'productivity_base_metric',
          'productivity_exclude_approved_leave'
        )
        `
      );

    const productivitySettings =
      Object.fromEntries(
        productivitySettingRows.map(
          (setting) => [
            setting.setting_key,
            setting.setting_value,
          ]
        )
      );

    const configuredBaseMetric =
      productivitySettings
        .productivity_base_metric;

    const baseMetric = [
      "documents_completed",
      "batches_processed",
    ].includes(configuredBaseMetric)
      ? configuredBaseMetric
      : "documents_completed";

    const excludeApprovedLeave =
      productivitySettings
        .productivity_exclude_approved_leave ===
      "1";

    let userCondition;
    let userConditionValues = [];

    // =========================
    // ROLE CONDITION
    // =========================

    if (role === "indexer") {
      userCondition =
        "u.user_id = ?";

      userConditionValues = [
        userId,
      ];
    }

    else if (role === "teamLead") {
      userCondition = `
        u.team_lead_id = ?
        AND u.status = 'active'
      `;

      userConditionValues = [
        userId,
      ];
    }

    else if (
      role === "coreTeam" ||
      role === "administrator"
    ) {
      userCondition = `
        u.status = 'active'

        AND u.role_id = (
          SELECT role_id
          FROM role
          WHERE code = 'indexer'
          LIMIT 1
        )
      `;

      userConditionValues = [];
    }

    else {
      return res.status(403).json({
        success: false,
        message:
          "You are not allowed to access this report",
      });
    }

    let projectListCondition = "";
    let productionProjectCondition = "";
    let employeeCondition = "";
    let assignedProjectCondition = "";

    const queryValues = [];

    // Project list placeholder
    if (projectId !== null) {
      projectListCondition =
        "WHERE pa.project_id = ?";

      queryValues.push(projectId);
    }

    // Production project placeholder
    if (projectId !== null) {
      productionProjectCondition =
        "AND de.project_id = ?";

      queryValues.push(projectId);
    }

    // Role condition values
    queryValues.push(
      ...userConditionValues
    );

    // Employee filter
    if (employeeId !== null) {
      employeeCondition =
        "AND u.user_id = ?";

      queryValues.push(employeeId);
    }

    // Project-assignment filter
    if (projectId !== null) {
      assignedProjectCondition = `
        AND EXISTS (
          SELECT 1

          FROM project_assignment
            pa_filter

          WHERE
            pa_filter.user_id =
              u.user_id

            AND pa_filter.project_id = ?
        )
      `;

      queryValues.push(projectId);
    }

    const [employees] =
      await db.query(
        `
        SELECT
          u.user_id AS id,
          u.emp_code,
          u.full_name AS employee_name,

          COALESCE(
            projects.project_names,
            '—'
          ) AS projects,

          COALESCE(
            production.received,
            0
          ) AS received,

          COALESCE(
            production.completed,
            0
          ) AS completed,

          COALESCE(
            production.batchesProcessed,
            0
          ) AS batchesProcessed,

          COALESCE(
            attendanceData.availableHours,
            0
          ) AS availableHours,

          GREATEST(
            COALESCE(
              production.received,
              0
            ) -
            COALESCE(
              production.completed,
              0
            ),
            0
          ) AS pending

        FROM users u

        LEFT JOIN (
          SELECT
            pa.user_id,

            GROUP_CONCAT(
              DISTINCT p.project_name
              ORDER BY p.project_name
              SEPARATOR ', '
            ) AS project_names

          FROM project_assignment pa

          JOIN project p
            ON p.project_id =
              pa.project_id

          ${projectListCondition}

          GROUP BY pa.user_id
        ) projects
          ON projects.user_id =
            u.user_id

        LEFT JOIN (
          SELECT
            de.user_id,

            SUM(
              de.docs_received
            ) AS received,

            SUM(
              de.docs_completed
            ) AS completed,

            SUM(
              de.batches_processed
            ) AS batchesProcessed

          FROM daily_entry de

          WHERE ${dateCondition}
            ${productionProjectCondition}

          GROUP BY de.user_id
        ) production
          ON production.user_id =
            u.user_id

        LEFT JOIN (
          SELECT
            a.user_id,

            SUM(
              CASE
                WHEN
                  ast.is_leave = 1
                  AND
                  a.approved_by IS NOT NULL

                THEN ${excludeApprovedLeave
          ? 0
          : 8
        }

                ELSE COALESCE(
                  a.hours,
                  0
                )
              END
            ) AS availableHours

          FROM attendance a

          JOIN attendance_status ast
            ON ast.status_id =
              a.status_id

          WHERE ${attendanceDateCondition}

          GROUP BY a.user_id
        ) attendanceData
          ON attendanceData.user_id =
            u.user_id

        WHERE ${userCondition}
          ${employeeCondition}
          ${assignedProjectCondition}

        ORDER BY
          u.full_name ASC
        `,
        queryValues
      );
    // Identify the start of the selected reporting period.
    const now = new Date();
    const periodStart = new Date(now);

    if (period === "month") {
      // Start from the first day of the current month.
      periodStart.setDate(1);
    } else if (period === "week") {
      // Start from Monday of the current week.
      periodStart.setDate(
        now.getDate() - ((now.getDay() + 6) % 7)
      );
    }

    // Reset the period start to midnight.
    periodStart.setHours(0, 0, 0, 0);

    // Count elapsed working days, excluding Sundays.
    let workingDays = 0;
    const currentDay = new Date(periodStart);

    while (currentDay <= now) {
      if (currentDay.getDay() !== 0) {
        workingDays += 1;
      }

      currentDay.setDate(currentDay.getDate() + 1);
    }

    // Get the IDs of employees returned by the existing report.
    const employeeIds = employees.map((employee) => employee.id);

    // Store each employee's combined daily project target.
    const targetByEmployee = new Map();

    if (employeeIds.length > 0) {
      // Load targets from each employee's assigned projects.
      const [targetRows] = await db.query(
        `
      SELECT
        pa.user_id,
        COALESCE(SUM(p.daily_target), 0) AS dailyTarget
      FROM (
        SELECT DISTINCT user_id, project_id
        FROM project_assignment
      ) pa
      JOIN project p
        ON p.project_id = pa.project_id
      WHERE pa.user_id IN (?)
        AND (? IS NULL OR p.project_id = ?)
      GROUP BY pa.user_id
    `,
        [employeeIds, projectId, projectId]
      );

      // Map combined daily targets to individual employees.
      targetRows.forEach((row) => {
        targetByEmployee.set(
          Number(row.user_id),
          Number(row.dailyTarget || 0)
        );
      });
    }
    const productivityUnit =
      baseMetric ===
        "batches_processed"
        ? "batches/hour"
        : "%";

    // Calculate employee productivity against assigned project targets.
    const employeesWithProductivity = employees.map((employee) => {
      // Combine the daily targets of assigned projects.
      const dailyTarget =
        targetByEmployee.get(Number(employee.id)) || 0;

      // Calculate the target for elapsed working days.
      const target = dailyTarget * workingDays;

      // Read the actual completed documents.
      const completed = Number(employee.completed || 0);

      // Calculate documents remaining against the target.
      const targetRemaining = Math.max(target - completed, 0);

      // Calculate productivity; null means no target is configured.
      const productivity =
        target > 0
          ? Number(((completed / target) * 100).toFixed(2))
          : null;

      return {
        ...employee,
        received: Number(employee.received || 0),
        completed,
        pending: Number(employee.pending || 0),
        batchesProcessed: Number(employee.batchesProcessed || 0),
        availableHours: Number(employee.availableHours || 0),
        dailyTarget,
        target,
        targetRemaining,
        productivity,
        productivityUnit: "%",
      };
    });

    return res.status(200).json({
      success: true,

      count:
        employeesWithProductivity.length,

      baseMetric,

      productivityBaseMetric:
        baseMetric,

      productivityUnit,

      excludeApprovedLeave,

      employees:
        employeesWithProductivity,
    });
  } catch (error) {
    console.error(
      "Employee Production Report Error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Failed to load employee production report",

      error: error.message,
    });
  }
};

// ======================================================
// PROJECT-WISE PRODUCTION REPORT
// ======================================================

const getProjectProduction = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    // Accept daily, weekly, and monthly report periods.
    const period = ["day", "week", "month"].includes(req.query.period)
      ? req.query.period
      : "week";

    const projectId =
      req.query.projectId &&
        req.query.projectId !== "all"
        ? Number(req.query.projectId)
        : null;

    const employeeId =
      req.query.employeeId &&
        req.query.employeeId !== "all"
        ? Number(req.query.employeeId)
        : null;

    if (
      projectId !== null &&
      (!Number.isInteger(projectId) ||
        projectId <= 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    if (
      employeeId !== null &&
      (!Number.isInteger(employeeId) ||
        employeeId <= 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid employee ID",
      });
    }

    const conditions = [
      getProductionDateCondition(
        period,
        "de"
      ),
    ];

    const queryValues = [];

    if (role === "indexer") {
      conditions.push("de.user_id = ?");
      queryValues.push(userId);
    } else if (role === "teamLead") {
      conditions.push(
        "u.team_lead_id = ?",
        "u.status = 'active'"
      );

      queryValues.push(userId);
    } else if (
      role === "coreTeam" ||
      role === "administrator"
    ) {
      // Include Team Lead and Indexer production in project totals.
      conditions.push(
        "r.code IN ('indexer', 'lead')",
        "u.status = 'active'"
      );
    } else {
      return res.status(403).json({
        success: false,
        message:
          "You are not allowed to access this report",
      });
    }

    if (projectId !== null) {
      conditions.push("de.project_id = ?");
      queryValues.push(projectId);
    }

    if (employeeId !== null) {
      conditions.push("de.user_id = ?");
      queryValues.push(employeeId);
    }

    const [projects] = await db.query(
      `
      SELECT
        p.project_id AS id,
        p.project_code,
        p.project_name,
        p.client_name,

        COALESCE(
          SUM(de.docs_received),
          0
        ) AS received,

        COALESCE(
          SUM(de.docs_completed),
          0
        ) AS completed,

        GREATEST(
          COALESCE(
            SUM(de.docs_received),
            0
          ) -
          COALESCE(
            SUM(de.docs_completed),
            0
          ),
          0
        ) AS pending

      FROM daily_entry de

      JOIN project p
        ON p.project_id = de.project_id

      JOIN users u
        ON u.user_id = de.user_id

      JOIN role r
        ON r.role_id = u.role_id

      WHERE ${conditions.join(" AND ")}

      GROUP BY
        p.project_id,
        p.project_code,
        p.project_name,
        p.client_name

      ORDER BY p.project_name ASC
      `,
      queryValues
    );

    const formattedProjects =
      projects.map((project) => {
        const received = Number(
          project.received || 0
        );

        const completed = Number(
          project.completed || 0
        );

        return {
          ...project,
          received,
          completed,
          pending: Number(
            project.pending || 0
          ),
          productivity:
            calculateProductivity({
              baseMetric:
                "documents_completed",
              received,
              completed,
              batchesProcessed: 0,
              availableHours: 0,
            }),
        };
      });

    return res.status(200).json({
      success: true,
      count: formattedProjects.length,
      projects: formattedProjects,
    });
  } catch (error) {
    console.error(
      "Project Production Report Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to load project production report",
      error: error.message,
    });
  }
};

// ======================================================
// CORRECTION REQUEST REPORT
// ======================================================

const getCorrectionReport = async (
  req,
  res
) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    // Accept daily, weekly, and monthly report periods.
    const period = ["day", "week", "month"].includes(req.query.period)
      ? req.query.period
      : "week";

    const projectId =
      req.query.projectId &&
        req.query.projectId !== "all"
        ? Number(req.query.projectId)
        : null;

    const employeeId =
      req.query.employeeId &&
        req.query.employeeId !== "all"
        ? Number(req.query.employeeId)
        : null;

    if (
      projectId !== null &&
      (!Number.isInteger(projectId) ||
        projectId <= 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    if (
      employeeId !== null &&
      (!Number.isInteger(employeeId) ||
        employeeId <= 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid employee ID",
      });
    }

    const conditions = [
      getProductionDateCondition(
        period,
        "cr"
      ),
    ];

    const queryValues = [];

    if (role === "indexer") {
      conditions.push(
        "cr.requested_by = ?"
      );

      queryValues.push(userId);
    } else if (role === "teamLead") {
      conditions.push(
        "requester.team_lead_id = ?"
      );

      queryValues.push(userId);
    } else if (
      role !== "coreTeam" &&
      role !== "administrator"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You are not allowed to access this report",
      });
    }

    if (projectId !== null) {
      conditions.push(
        "cr.project_id = ?"
      );

      queryValues.push(projectId);
    }

    if (employeeId !== null) {
      conditions.push(
        "cr.requested_by = ?"
      );

      queryValues.push(employeeId);
    }

    const [corrections] =
      await db.query(
        `
        SELECT
          cr.request_id AS id,
          cr.entry_id,

          DATE_FORMAT(
            cr.production_date,
            '%Y-%m-%d'
          ) AS production_date,

          cr.field_name,
          cr.old_value,
          cr.new_value,
          cr.reason,

          cs.code AS status,
          cs.name AS status_name,

          requester.user_id AS employee_id,
          requester.emp_code AS employee_code,
          requester.full_name AS employee_name,

          p.project_id,
          p.project_name,

          cr.approver_comments,
          cr.requested_at,
          cr.approved_at,

          reviewer.full_name AS reviewed_by

        FROM correction_request cr

        JOIN correction_status cs
          ON cs.status_id =
            cr.status_id

        JOIN users requester
          ON requester.user_id =
            cr.requested_by

        JOIN project p
          ON p.project_id =
            cr.project_id

        LEFT JOIN users reviewer
          ON reviewer.user_id =
            cr.approved_by

        WHERE ${conditions.join(
          " AND "
        )}

        ORDER BY
          cr.requested_at DESC,
          cr.request_id DESC
        `,
        queryValues
      );

    return res.status(200).json({
      success: true,
      count: corrections.length,
      corrections,
    });
  } catch (error) {
    console.error(
      "Correction Report Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to load correction report",
      error: error.message,
    });
  }
};
// ======================================================
// ALL DAILY ENTRIES REPORT — ADMIN / CORE TEAM
// ======================================================

const getAllDailyEntriesReport = async (req, res) => {
  try {
    // Allow only Administrator and Core Team.
    const role = req.user.role;

    if (!["administrator", "coreTeam"].includes(role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }


    // Read optional project and employee filters.
    const projectId =
      req.query.projectId && req.query.projectId !== "all"
        ? Number(req.query.projectId)
        : null;

    const employeeId =
      req.query.employeeId && req.query.employeeId !== "all"
        ? Number(req.query.employeeId)
        : null;

    // Validate the supplied filter IDs.
    if (
      (projectId !== null &&
        (!Number.isInteger(projectId) || projectId <= 0)) ||
      (employeeId !== null &&
        (!Number.isInteger(employeeId) || employeeId <= 0))
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid project or employee ID",
      });
    }

    // Include all historical entries from Indexers and Team Leads.
    const conditions = [
      "r.code IN ('indexer', 'lead')",
    ];

    // Store parameterized SQL filter values.
    const queryValues = [];

    // Apply the project filter when selected.
    if (projectId !== null) {
      conditions.push("de.project_id = ?");
      queryValues.push(projectId);
    }

    // Apply the employee filter when selected.
    if (employeeId !== null) {
      conditions.push("de.user_id = ?");
      queryValues.push(employeeId);
    }

    // Fetch each daily entry with its creator, project and categories.
    const [entries] = await db.query(
      `
      SELECT
        de.entry_id AS id,
        de.user_id AS employee_id,
        u.full_name AS employee_name,
        u.emp_code AS employee_code,
        r.code AS employee_role,
        p.project_name,

        DATE_FORMAT(
          de.production_date,
          '%Y-%m-%d'
        ) AS production_date,

        tlrc.name AS team_lead_category,
        rc.name AS indexer_category,

        CONCAT_WS(
          ' / ',
          tlrc.name,
          rc.name
        ) AS reporting_category,


        de.docs_received AS received,
        de.docs_completed AS completed,
        de.batches_processed AS batches_processed,
        de.remarks AS notes,

        es.code AS status,
        es.name AS status_name

      FROM daily_entry de

      JOIN users u
        ON u.user_id = de.user_id

      JOIN role r
        ON r.role_id = u.role_id

      JOIN project p
        ON p.project_id = de.project_id

      JOIN entry_status es
        ON es.status_id = de.status_id


      LEFT JOIN reporting_category rc
        ON rc.category_id = de.category_id
        AND rc.role_type = 'indexer'

      LEFT JOIN reporting_category tlrc
        ON tlrc.category_id = COALESCE(
        de.team_lead_category_id,
        de.category_id
        )
        AND tlrc.role_type = 'teamLead'

      WHERE ${conditions.join(" AND ")}

      ORDER BY
        de.production_date DESC,
        de.entry_id DESC
      `,
      queryValues
    );

    // Return all matching individual daily entries.
    return res.status(200).json({
      success: true,
      count: entries.length,
      entries,
    });
  } catch (error) {
    // Log errors for backend troubleshooting.
    console.error("All Daily Entries Report Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load all daily entries",
    });
  }
};
// ======================================================
// PRODUCTION DATE CONDITION
// ======================================================

const getProductionDateCondition = (
  period,
  alias = "de"
) => {
  // Filter production records for today's date only.
  if (period === "day") {
    return `
      ${alias}.production_date >= CURDATE()
      AND ${alias}.production_date < DATE_ADD(CURDATE(), INTERVAL 1 DAY)
    `;
  }
  if (period === "month") {
    return `
      ${alias}.production_date >=
        DATE_FORMAT(
          CURDATE(),
          '%Y-%m-01'
        )

      AND ${alias}.production_date <
        DATE_ADD(
          LAST_DAY(CURDATE()),
          INTERVAL 1 DAY
        )
    `;
  }

  return `
    ${alias}.production_date >=
      DATE_SUB(
        CURDATE(),
        INTERVAL WEEKDAY(
          CURDATE()
        ) DAY
      )

    AND ${alias}.production_date <
      DATE_ADD(
        DATE_SUB(
          CURDATE(),
          INTERVAL WEEKDAY(
            CURDATE()
          ) DAY
        ),
        INTERVAL 7 DAY
      )
  `;
};

// ======================================================
// ATTENDANCE DATE CONDITION
// ======================================================

const getAttendanceDateCondition = (
  period,
  alias = "a"
) => {
  // Filter attendance records for today's date only.
  if (period === "day") {
    return `
      ${alias}.att_date >= CURDATE()
      AND ${alias}.att_date < DATE_ADD(CURDATE(), INTERVAL 1 DAY)
    `;
  }
  if (period === "month") {
    return `
      ${alias}.att_date >=
        DATE_FORMAT(
          CURDATE(),
          '%Y-%m-01'
        )

      AND ${alias}.att_date <
        DATE_ADD(
          LAST_DAY(CURDATE()),
          INTERVAL 1 DAY
        )
    `;
  }

  return `
    ${alias}.att_date >=
      DATE_SUB(
        CURDATE(),
        INTERVAL WEEKDAY(
          CURDATE()
        ) DAY
      )

    AND ${alias}.att_date <
      DATE_ADD(
        DATE_SUB(
          CURDATE(),
          INTERVAL WEEKDAY(
            CURDATE()
          ) DAY
        ),
        INTERVAL 7 DAY
      )
  `;
};

module.exports = {
  getMyReportSummary,
  getMyDailyProduction,
  getEmployeeProduction,
  getProjectProduction,
  getCorrectionReport,
  getAllDailyEntriesReport,
};