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
            AND es.code IN ('reviewed', 'locked')
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
            AND es.code IN ('reviewed', 'locked')
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
            AND es.code IN ('reviewed', 'locked')
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
          AND es.code IN ('reviewed', 'locked')
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
const getProjectDailySummary = async (req, res) => {
  try {
    // Start date for the new Daily Entry workflow.
    const backlogWorkflowStartDate = "2026-10-05";

    // Core Team can view all active projects.
    const [projects] = await db.query(`
      SELECT project_id, project_name
      FROM project
      WHERE status = 'active'
      ORDER BY project_name ASC
    `);

    // Store the final summary.
    const summary = [];

    // Process every active project separately.
    for (const project of projects) {

      // Get Indexer reporting categories and completed counts.
      const [indexerCategoryRows] = await db.query(
        `
        SELECT
          totals.production_date,
          totals.team_lead_category_id,

          GROUP_CONCAT(
            CONCAT(totals.category_name, ' - ', totals.completed)
            ORDER BY totals.category_name
            SEPARATOR ', '
          ) AS indexer_category_names

        FROM (
          SELECT
            DATE_FORMAT(de.production_date, '%Y-%m-%d') AS production_date,
            de.team_lead_category_id,
            rc.category_id,
            rc.name AS category_name,
            COALESCE(SUM(de.docs_completed), 0) AS completed

          FROM daily_entry de

          JOIN users u ON u.user_id = de.user_id
          JOIN role r ON r.role_id = u.role_id
            AND r.code = 'indexer'

          JOIN reporting_category rc
            ON rc.category_id = de.category_id
            AND rc.role_type = 'indexer'

          JOIN entry_status es
            ON es.status_id = de.status_id
            AND es.code IN ('submitted', 'reviewed', 'locked')

          WHERE de.project_id = ?
            AND de.production_date >= ?
            AND de.team_lead_category_id IS NOT NULL

          GROUP BY
            de.production_date,
            de.team_lead_category_id,
            rc.category_id,
            rc.name
        ) totals

        GROUP BY
          totals.production_date,
          totals.team_lead_category_id
        `,
        [project.project_id, backlogWorkflowStartDate]
      );

      // Get Indexer totals using the directly selected Team Lead category.
      const [directIndexerRows] = await db.query(
        `
        SELECT
          DATE_FORMAT(de.production_date, '%Y-%m-%d') AS production_date,
          de.team_lead_category_id AS category_id,
          COALESCE(SUM(de.docs_completed), 0) AS completed,
          COALESCE(SUM(de.batches_processed), 0) AS batchesProcessed

        FROM daily_entry de

        JOIN users u ON u.user_id = de.user_id
        JOIN role r ON r.role_id = u.role_id
          AND r.code = 'indexer'

        JOIN entry_status es
          ON es.status_id = de.status_id
          AND es.code IN ('submitted', 'reviewed', 'locked')

        WHERE de.project_id = ?
          AND de.production_date >= ?
          AND de.team_lead_category_id IS NOT NULL

        GROUP BY
          de.production_date,
          de.team_lead_category_id
        `,
        [project.project_id, backlogWorkflowStartDate]
      );

      // Get Team Lead entries and historical Indexer mapping totals.
      const [dailyRows] = await db.query(
        `
        SELECT
          DATE_FORMAT(tl.production_date, '%Y-%m-%d') AS production_date,
          tl.category_id,
          rc.name AS category_name,

          COALESCE(SUM(tl.docs_received), 0) AS received,
          COALESCE(SUM(tl.batches_received), 0) AS batchesReceived,
          COALESCE(SUM(tl.docs_pending), 0) AS documentsPending,
          COALESCE(SUM(tl.batches_pending), 0) AS batchesPending,

          COALESCE(SUM(idxTotals.completed), 0) AS completed,
          COALESCE(SUM(idxTotals.batchesProcessed), 0) AS batchesProcessed

        FROM daily_entry tl

        JOIN users tlUser
          ON tlUser.user_id = tl.user_id

        JOIN role tlRole
          ON tlRole.role_id = tlUser.role_id
          AND tlRole.code IN ('teamLead', 'team_lead', 'lead')

        JOIN entry_status tlStatus
          ON tlStatus.status_id = tl.status_id
          AND tlStatus.code IN ('submitted', 'reviewed', 'locked')

        JOIN reporting_category rc
          ON rc.category_id = tl.category_id
          AND rc.role_type = 'teamLead'

        LEFT JOIN (
          SELECT
            mapping.entry_id AS teamLeadEntryId,
            COALESCE(SUM(idx.docs_completed), 0) AS completed,
            COALESCE(SUM(idx.batches_processed), 0) AS batchesProcessed

          FROM daily_entry_indexer_category mapping

          JOIN daily_entry tlEntry
            ON tlEntry.entry_id = mapping.entry_id

          JOIN daily_entry idx
            ON idx.project_id = tlEntry.project_id
            AND idx.production_date = tlEntry.production_date
            AND idx.category_id = mapping.category_id
            AND idx.team_lead_category_id IS NULL

          JOIN users idxUser
            ON idxUser.user_id = idx.user_id

          JOIN role idxRole
            ON idxRole.role_id = idxUser.role_id
            AND idxRole.code = 'indexer'

          JOIN entry_status idxStatus
            ON idxStatus.status_id = idx.status_id
            AND idxStatus.code IN ('submitted', 'reviewed', 'locked')

          WHERE tlEntry.project_id = ?
            AND tlEntry.production_date >= ?

          GROUP BY mapping.entry_id
        ) idxTotals
          ON idxTotals.teamLeadEntryId = tl.entry_id

        WHERE tl.project_id = ?
          AND tl.production_date >= ?

        GROUP BY
          tl.production_date,
          tl.category_id,
          rc.name

        ORDER BY
          tl.production_date ASC,
          rc.name ASC
        `,
        [
          project.project_id,
          backlogWorkflowStartDate,
          project.project_id,
          backlogWorkflowStartDate,
        ]
      );

      // Track document backlog for each Team Lead reporting category.
      const categoryBacklogs = new Map();

      // Track pending batches for each Team Lead reporting category.
      const categoryPendingBatches = new Map();

      // Build the summary rows.
      for (const row of dailyRows) {
        const categoryId = row.category_id;
        const categoryKey = String(categoryId ?? "uncategorized");
        const productionDate = row.production_date;

        // Match Indexer category breakdown for the same date and category.
        const matchedIndexerCategories = indexerCategoryRows.find(
          (item) =>
            String(item.team_lead_category_id) === String(categoryId) &&
            item.production_date === productionDate
        );

        // Get Indexer category names and completed totals.
        const indexerCategoryNames =
          matchedIndexerCategories?.indexer_category_names || "";

        // Combine Team Lead and Indexer reporting categories.
        const combinedCategoryName = indexerCategoryNames
          ? `${row.category_name} / ${indexerCategoryNames}`
          : row.category_name || "Uncategorized";

        // Find direct Indexer totals.
        const directIndexer = directIndexerRows.find(
          (item) =>
            String(item.category_id) === String(categoryId) &&
            item.production_date === productionDate
        );

        // Get received documents.
        const received = Number(row.received || 0);

        // Combine direct Indexer totals with historical mapped totals.
        const completed =
          Number(row.completed || 0) +
          Number(directIndexer?.completed || 0);

        // Get batch totals.
        const batchesReceived = Number(row.batchesReceived || 0);

        const batchesProcessed =
          Number(row.batchesProcessed || 0) +
          Number(directIndexer?.batchesProcessed || 0);

        // Get previously carried document backlog.
        const carriedBacklog = categoryBacklogs.get(categoryKey) || 0;

        // Calculate completed work applied to old backlog.
        const backlogCompleted = Math.min(
          completed,
          carriedBacklog
        );

        // Calculate remaining old backlog.
        const backlog = Math.max(
          carriedBacklog - backlogCompleted,
          0
        );

        // Use the same manual pending values as Team Lead Dashboard.
        const pending = Number(row.documentsPending ?? 0);

        // Get manual pending batches.
        const pendingBatches = Number(row.batchesPending ?? 0);

        // Add this project and category to the Core Team summary.
        summary.push({
          productionDate,
          projectId: project.project_id,
          projectName: project.project_name,

          categoryId,
          categoryName: combinedCategoryName,

          received,
          completed,
          backlog,
          pending,

          batchesReceived,
          batchesProcessed,
          pendingBatches,
        });

        // Carry today's pending documents into the next production date.
        categoryBacklogs.set(categoryKey, pending);

        // Carry pending batches into the next production date.
        categoryPendingBatches.set(categoryKey, pendingBatches);
      }
    }

    // Show newest production dates first.
    summary.sort(
      (a, b) =>
        new Date(b.productionDate) - new Date(a.productionDate)
    );

    // Return Core Team Project Daily Summary.
    return res.status(200).json({
      success: true,
      summary,
    });

  } catch (error) {
    // Log backend errors.
   console.error("Admin Project Daily Summary Error:", error);

    // Return an error response.
    return res.status(500).json({
      success: false,
      message: "Failed to load project daily summary",
      error: error.message,
    });
  }
};

module.exports = { getAdminDashboard, getProjectDailySummary, };
