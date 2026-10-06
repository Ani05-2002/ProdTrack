const db = require("../../config/db");

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ADMIN DASHBOARD  GET /api/admin/dashboard
// Returns: stat cards, backlog by project, KPI cards, monthly trend
// ─────────────────────────────────────────────────────────────────────────────
const getAdminDashboard = async (req, res) => {
  try {

    // ── 1. STAT CARDS ─────────────────────────────────────────────────────
    // Calculates dashboard totals without unsigned subtraction errors.
    // Dashboard production totals according to the new Daily Entry workflow.
    // Gets the latest production date from the new Daily Entry workflow.
    const [latestDateRows] = await db.query(`
  SELECT MAX(production_date) AS latest_date
  FROM daily_entry
  WHERE production_date >= '2026-10-05'
`);

    const latestProductionDate = latestDateRows[0]?.latest_date;

    // Calculates combined Received and Completed for all projects on the latest day.
    const [prodRows] = await db.query(
      `
    SELECT
      COALESCE(
        SUM(
          CASE
            WHEN r.code IN ('teamLead', 'team_lead', 'lead')
            THEN de.docs_received
            ELSE 0
          END
        ),
        0
      ) AS total_received,

      COALESCE(
        SUM(
          CASE
            WHEN r.code = 'indexer'
            THEN de.docs_completed
            ELSE 0
          END
        ),
        0
      ) AS total_completed

    FROM daily_entry de
    INNER JOIN users u ON u.user_id = de.user_id
    INNER JOIN role r ON r.role_id = u.role_id
    INNER JOIN entry_status es ON es.status_id = de.status_id

    WHERE de.production_date = ?
      AND es.code IN ('submitted', 'reviewed', 'locked')
  `,
      [latestProductionDate]
    );
    // Calculates the combined project backlog for the latest production date
    // using the same backlog-first logic as Project Daily Summary.
    const [backlogSummaryRows] = await db.query(
      `
    SELECT
      de.project_id,
      de.production_date,

      COALESCE(
        SUM(
          CASE
            WHEN r.code IN ('teamLead', 'team_lead', 'lead')
            THEN de.docs_received
            ELSE 0
          END
        ),
        0
      ) AS received,

      COALESCE(
        SUM(
          CASE
            WHEN r.code = 'indexer'
            THEN de.docs_completed
            ELSE 0
          END
        ),
        0
      ) AS completed

    FROM daily_entry de
    INNER JOIN users u ON u.user_id = de.user_id
    INNER JOIN role r ON r.role_id = u.role_id
    INNER JOIN entry_status es ON es.status_id = de.status_id

    WHERE de.production_date >= '2026-10-05'
      AND de.production_date <= ?
      AND es.code IN ('submitted', 'reviewed', 'locked')

    GROUP BY
      de.project_id,
      de.production_date

    ORDER BY
      de.project_id ASC,
      de.production_date ASC
  `,
      [latestProductionDate]
    );

    // Keeps each project's running unfinished work separately.
    const projectBacklogs = {};
    let totalBacklog = 0;

    backlogSummaryRows.forEach((row) => {
      const projectId = Number(row.project_id);
      const received = Number(row.received || 0);
      const completed = Number(row.completed || 0);

      const previousBacklog = projectBacklogs[projectId] || 0;

      // Today's completed work clears old backlog first.
      const backlogCompleted = Math.min(completed, previousBacklog);

      const remainingOldBacklog = Math.max(
        previousBacklog - backlogCompleted,
        0
      );

      // Remaining completed work is applied to today's received work.
      const todayCompleted = Math.max(
        completed - backlogCompleted,
        0
      );

      const todayPending = Math.max(
        received - todayCompleted,
        0
      );

      // Total unfinished work carried forward for this project.
      projectBacklogs[projectId] =
        remainingOldBacklog + todayPending;

      // We need the backlog value specifically for the latest date.
      if (
        new Date(row.production_date).toISOString().slice(0, 10) ===
        new Date(latestProductionDate).toISOString().slice(0, 10)
      ) {
        totalBacklog += remainingOldBacklog;
      }
    });
    const [employeeRows] = await db.query(`
      SELECT
        COUNT(*) AS active_employees
      FROM users
      WHERE status = 'active'
        AND role_id != 4
    `);

    const [projectCountRows] = await db.query(`
      SELECT COUNT(*) AS active_projects
      FROM project
      WHERE status = 'active'
    `);

    // ── 2. BACKLOG BY PROJECT ──────────────────────────────────────────────
    // Calculates project backlog without unsigned subtraction errors.
    
    // Calculate percentage for progress bar (backlog / total_received * 100)
    
    // Stores the running unfinished work separately for each project.



// Creates the final Backlog by Project response.
// Gets project-wise production data for Backlog by Project
// using the new Daily Entry workflow.
const [backlogRows] = await db.query(
  `
    SELECT
      p.project_id,
      p.project_name AS name,
      de.production_date,

      -- Received is entered only by Team Leads.
      COALESCE(
        SUM(
          CASE
            WHEN r.code IN ('teamLead', 'team_lead', 'lead')
            THEN de.docs_received
            ELSE 0
          END
        ),
        0
      ) AS received,

      -- Completed is entered only by Indexers.
      COALESCE(
        SUM(
          CASE
            WHEN r.code = 'indexer'
            THEN de.docs_completed
            ELSE 0
          END
        ),
        0
      ) AS completed

    FROM project p

    INNER JOIN daily_entry de
      ON de.project_id = p.project_id

    INNER JOIN users u
      ON u.user_id = de.user_id

    INNER JOIN role r
      ON r.role_id = u.role_id

    INNER JOIN entry_status es
      ON es.status_id = de.status_id

    WHERE p.status = 'active'
      AND de.production_date >= '2026-10-05'
      AND de.production_date <= ?
      AND es.code IN ('submitted', 'reviewed', 'locked')

    GROUP BY
      p.project_id,
      p.project_name,
      de.production_date

    ORDER BY
      p.project_id ASC,
      de.production_date ASC
  `,
  [latestProductionDate]
);
// Stores the running unfinished work separately for each project.
const backlogProjectState = {};

// Stores the latest calculated backlog for each project.
const latestProjectBacklog = {};

backlogRows.forEach((row) => {
  const projectId = Number(row.project_id);
  const received = Number(row.received || 0);
  const completed = Number(row.completed || 0);

  // Gets unfinished work carried from the previous production date.
  const previousBacklog = backlogProjectState[projectId] || 0;

  // Today's completed work clears previous backlog first.
  const backlogCompleted = Math.min(completed, previousBacklog);

  // Old backlog still remaining after today's completion.
  const remainingBacklog = Math.max(
    previousBacklog - backlogCompleted,
    0
  );

  // Remaining completion is applied to today's received work.
  const todayCompleted = Math.max(
    completed - backlogCompleted,
    0
  );

  // Today's unfinished received work becomes pending.
  const pending = Math.max(
    received - todayCompleted,
    0
  );

  // Carries both remaining backlog and today's pending to the next date.
  backlogProjectState[projectId] =
    remainingBacklog + pending;

  // Keeps the latest calculated values for this project.
  latestProjectBacklog[projectId] = {
    name: row.name,
    total: remainingBacklog,
    received,
  };
});

// Finds the largest backlog for proportional progress-bar widths.
const maxBacklog = Math.max(
  ...Object.values(latestProjectBacklog).map(
    (project) => project.total
  ),
  1
);

// Creates the final Backlog by Project response.
const backlog = Object.values(latestProjectBacklog)
  .map((project) => ({
    name: project.name,
    total: project.total,
    received: project.received,
    pct:
      project.received > 0
        ? Math.round(
            (project.total / project.received) * 100
          )
        : 0,
    barPct: Math.round(
      (project.total / maxBacklog) * 100
    ),
  }))
  .sort((a, b) => b.total - a.total);

    // ── 3. KPI CARDS ──────────────────────────────────────────────────────
    // Pending corrections
    const [corrRows] = await db.query(`
      SELECT COUNT(*) AS pending_corrections
      FROM correction_request cr
      JOIN correction_status cs ON cs.status_id = cr.status_id
      WHERE cs.code = 'pending'
    `);

    // Guide compliance — (read acks / total required acks) * 100
    const [complianceRows] = await db.query(`
      SELECT
        COUNT(*)                                   AS total_pairs,
        SUM(CASE WHEN ga.status = 'read' THEN 1 ELSE 0 END) AS acked_pairs
      FROM project_assignment pa
      JOIN guide g          ON g.project_id  = pa.project_id
      JOIN guide_version gv ON gv.guide_id   = g.guide_id
                           AND gv.is_latest  = 1
                           AND gv.requires_ack = 1
      LEFT JOIN guide_acknowledgement ga
                           ON ga.version_id = gv.version_id
                          AND ga.user_id    = pa.user_id
    `);

    const totalPairs = Number(complianceRows[0].total_pairs) || 0;
    const ackedPairs = Number(complianceRows[0].acked_pairs) || 0;
    const complianceRate = totalPairs > 0
      ? Math.round((ackedPairs / totalPairs) * 100)
      : 100;

    // Missing entries today — active indexers who have NOT submitted today
    const [missingRows] = await db.query(`
      SELECT COUNT(*) AS missing_entries
      FROM users u
      WHERE u.status = 'active'
        AND u.role_id = 1
        AND NOT EXISTS (
          SELECT 1 FROM daily_entry de
          WHERE de.user_id = u.user_id
            AND de.production_date = CURDATE()
        )
    `);

    // ── 4. MONTHLY TREND — last 6 months ──────────────────────────────────
    // Monthly production trend according to the new Daily Entry workflow.
    const [trendRows] = await db.query(`
  SELECT
    DATE_FORMAT(de.production_date, '%Y-%m-01') AS month_start,
    DATE_FORMAT(de.production_date, '%b %Y') AS month_label,

    -- Only Indexer completion contributes to Completed.
    COALESCE(
      SUM(
        CASE
          WHEN r.code = 'indexer'
          THEN de.docs_completed
          ELSE 0
        END
      ),
      0
    ) AS completed,

    -- Only Team Lead received count contributes to Received.
    COALESCE(
      SUM(
        CASE
          WHEN r.code IN ('teamLead', 'team_lead', 'lead')
          THEN de.docs_received
          ELSE 0
        END
      ),
      0
    ) AS received

  FROM daily_entry de

  INNER JOIN users u
    ON u.user_id = de.user_id

  INNER JOIN role r
    ON r.role_id = u.role_id

  INNER JOIN entry_status es
    ON es.status_id = de.status_id

  WHERE de.production_date >= '2026-10-05'
    AND es.code IN ('submitted', 'reviewed', 'locked')

  GROUP BY
    DATE_FORMAT(de.production_date, '%Y-%m-01'),
    DATE_FORMAT(de.production_date, '%b %Y')

  ORDER BY month_start ASC
`);
console.log("ADMIN MONTHLY TREND:", trendRows);
    // ── BUILD RESPONSE ─────────────────────────────────────────────────────
    return res.status(200).json({
      success: true,
      dashboard: {
        // Stat cards
        totalReceived: Number(prodRows[0].total_received),
        totalCompleted: Number(prodRows[0].total_completed),
        totalBacklog: Number(totalBacklog || 0),
        activeEmployees: Number(employeeRows[0].active_employees),
        activeProjects: Number(projectCountRows[0].active_projects),

        // Backlog by project
        backlogByProject: backlog,

        // KPI cards
        pendingCorrections: Number(corrRows[0].pending_corrections),
        guideCompliance: {
          rate: complianceRate,
          acked: ackedPairs,
          total: totalPairs,
        },
        missingEntriesToday: Number(missingRows[0].missing_entries),

        // Monthly trend
        monthlyTrend: trendRows.map((r) => ({
          monthLabel: r.month_label,
          completed: Number(r.completed),
          received: Number(r.received),
        })),
      },
    });

  } catch (err) {
    console.error("Admin Dashboard Error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to load Admin dashboard",
      error: err.message,
    });
  }
};
// ─────────────────────────────────────────────────────────────────────────────
// PROJECT DAILY SUMMARY
// Returns: Date, Project, Received, Completed, Backlog and Pending
// Uses backlog-first calculation from 05 October 2026.
// ─────────────────────────────────────────────────────────────────────────────
const getProjectDailySummary = async (req, res) => {
  try {
    // Defines when the new production backlog workflow starts.
    const backlogWorkflowStartDate = "2026-10-05";

    // Gets Received and Completed grouped by project and production date.
    const [rows] = await db.query(
      `
        SELECT
          de.project_id,
          p.project_name,
          de.production_date,

          COALESCE(
            SUM(
              CASE
                WHEN r.code IN ('teamLead', 'team_lead', 'lead')
                THEN de.docs_received
                ELSE 0
              END
            ),
            0
          ) AS received,

          COALESCE(
            SUM(
              CASE
                WHEN r.code = 'indexer'
                THEN de.docs_completed
                ELSE 0
              END
            ),
            0
          ) AS completed

        FROM daily_entry de

        INNER JOIN project p
          ON p.project_id = de.project_id

        INNER JOIN users u
          ON u.user_id = de.user_id

        INNER JOIN role r
          ON r.role_id = u.role_id

        INNER JOIN entry_status es
          ON es.status_id = de.status_id

        WHERE de.production_date >= ?
          AND es.code IN ('submitted', 'reviewed', 'locked')

        GROUP BY
          de.project_id,
          p.project_name,
          de.production_date

        ORDER BY
          de.project_id ASC,
          de.production_date ASC
      `,
      [backlogWorkflowStartDate]
    );

    // Stores the final Project Daily Summary records.
    const summary = [];

    // Stores carried backlog separately for every project.
    const projectBacklogs = {};

    rows.forEach((row) => {
      // Converts the project ID into a number.
      const projectId = Number(row.project_id);

      // Converts database values into numbers.
      const received = Number(row.received || 0);
      const completed = Number(row.completed || 0);

      // Gets backlog carried from previous dates for this project.
      const previousBacklog =
        projectBacklogs[projectId] || 0;

      // Uses today's completion to clear previous backlog first.
      const backlogCompleted = Math.min(
        completed,
        previousBacklog
      );

      // Calculates previous backlog still remaining.
      const backlog = Math.max(
        previousBacklog - backlogCompleted,
        0
      );

      // Gets completion remaining after clearing old backlog.
      const todayCompleted = Math.max(
        completed - backlogCompleted,
        0
      );

      // Calculates pending work from today's Received count.
      const pending = Math.max(
        received - todayCompleted,
        0
      );

      // Adds the calculated record to the response.
      summary.push({
        productionDate: row.production_date,
        projectId,
        projectName: row.project_name,
        received,
        completed,
        backlog,
        pending,
      });

      // Carries remaining unfinished work to the project's next date.
      projectBacklogs[projectId] =
        backlog + pending;
    });

    // Displays the newest production dates first.
    summary.sort(
      (a, b) =>
        new Date(b.productionDate) -
        new Date(a.productionDate)
    );

    // Returns all projects because Administrator has organisation-wide access.
    return res.status(200).json({
      success: true,
      summary,
    });
  } catch (error) {
    // Logs Project Daily Summary errors.
    console.error(
      "Admin Project Daily Summary Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to load project daily summary",
      error: error.message,
    });
  }
};

module.exports = { getAdminDashboard, getProjectDailySummary, };
