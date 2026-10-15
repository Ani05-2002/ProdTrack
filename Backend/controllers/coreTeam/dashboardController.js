// Imports the MySQL database connection.
const db = require("../../config/db");


// ============================================================
// 1. CORE TEAM DASHBOARD SUMMARY
// ============================================================

// Gets the main Core Team dashboard summary cards.
const getCoreTeamDashboard = async (req, res) => {
  try {

    // --------------------------------------------------------
    // Total Received + Total Completed
    // --------------------------------------------------------
    const [productionRows] = await db.query(`
  SELECT
    COALESCE(SUM(de.docs_received), 0) AS totalReceived,

    COALESCE(
      SUM(
        CASE
          WHEN r.code = 'indexer'
            AND es.code IN ('reviewed', 'locked')
          THEN de.docs_completed
          ELSE 0
        END
      ), 0
    ) AS totalCompleted

  FROM daily_entry de

  INNER JOIN users u
    ON u.user_id = de.user_id

  INNER JOIN role r
    ON r.role_id = u.role_id

  INNER JOIN entry_status es
    ON es.status_id = de.status_id
`);

    const totalReceived = Number(
      productionRows[0].totalReceived || 0
    );

    const totalCompleted = Number(
      productionRows[0].totalCompleted || 0
    );


    // --------------------------------------------------------
    // Project Backlog
    // --------------------------------------------------------
    const projectBacklog = Math.max(
      totalReceived - totalCompleted,
      0
    );


    // --------------------------------------------------------
    // Active Employees
    //
    // Counts all active users except Administrator.
    // --------------------------------------------------------
    const [employeeRows] = await db.query(`
      SELECT
        COUNT(*) AS activeEmployees
      FROM users u
      INNER JOIN role r
        ON r.role_id = u.role_id
      WHERE u.status = 'active'
        AND r.code <> 'admin'
    `);

    const activeEmployees = Number(
      employeeRows[0].activeEmployees || 0
    );


    // --------------------------------------------------------
    // Completion Rate
    // --------------------------------------------------------
    const completionRate =
      totalReceived > 0
        ? Math.round(
          (totalCompleted / totalReceived) * 100
        )
        : 0;


    // --------------------------------------------------------
    // Response
    // --------------------------------------------------------
    return res.status(200).json({
      success: true,

      dashboard: {
        totalReceived,
        totalCompleted,
        projectBacklog,
        activeEmployees,
        completionRate,
      },
    });

  } catch (error) {

    console.error(
      "Core Team Dashboard Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to load Core Team dashboard",
      error: error.message,
    });
  }
};


// ============================================================
// 2. MONTHLY PRODUCTION TREND
// ============================================================

// Gets received and completed production for the last 6 months.
const getMonthlyProductionTrend = async (req, res) => {
  try {
    // Confirms that this exact monthly-trend controller is being executed.
    console.log("NEW MONTHLY TREND CONTROLLER RUNNING");

    // Confirms which MySQL database the backend connection is actually using.
    const [dbInfo] = await db.query("SELECT DATABASE() AS database_name");

    // Prints the backend's active database name in the terminal.
    console.log("BACKEND DATABASE:", dbInfo[0].database_name);

    // Checks how many daily-entry rows the backend can currently see.
    const [entryCount] = await db.query(
      "SELECT COUNT(*) AS total FROM daily_entry"
    );

    // Prints the number of daily-entry rows visible to the backend.
    console.log("DAILY ENTRY COUNT:", entryCount[0].total);

    const [trend] = await db.query(`
  SELECT
    DATE_FORMAT(de.production_date, '%Y-%m') AS month_key,
    DATE_FORMAT(de.production_date, '%b %Y') AS month_name,

    COALESCE(SUM(de.docs_received), 0) AS received,

    COALESCE(
      SUM(
        CASE
          WHEN r.code = 'indexer'
            AND es.code IN ('reviewed', 'locked')
          THEN de.docs_completed
          ELSE 0
        END
      ), 0
    ) AS completed

  FROM daily_entry de

  INNER JOIN users u
    ON u.user_id = de.user_id

  INNER JOIN role r
    ON r.role_id = u.role_id

  INNER JOIN entry_status es
    ON es.status_id = de.status_id

  WHERE de.production_date IS NOT NULL

  GROUP BY
    DATE_FORMAT(de.production_date, '%Y-%m'),
    DATE_FORMAT(de.production_date, '%b %Y')

  ORDER BY month_key ASC
`);
    // Shows exactly what MySQL returned for the monthly trend query.
    console.log("MONTHLY TREND DB RESULT:", trend);



    // Convert MySQL values to JavaScript numbers.
    const formattedTrend = trend.map((item) => ({
      month_key: item.month_key,
      month_name: item.month_name,
      received: Number(item.received || 0),
      completed: Number(item.completed || 0),
    }));


    return res.status(200).json({
      success: true,
      count: formattedTrend.length,
      trend: formattedTrend,
    });

  } catch (error) {

    console.error(
      "Monthly Production Trend Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to load monthly production trend",
      error: error.message,
    });
  }
};


// ============================================================
// 3. BACKLOG BY PROJECT
// ============================================================

// Gets received, completed and backlog totals for every project.
const getBacklogByProject = async (req, res) => {
  try {

    const [projects] = await db.query(`
  SELECT
    p.project_id AS id,
    p.project_code,
    p.project_name,

    COALESCE(
      SUM(de.docs_received),
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
    ) AS completed,

    GREATEST(
      COALESCE(SUM(de.docs_received), 0)
      -
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
      ),
      0
    ) AS backlog

  FROM project p

  LEFT JOIN daily_entry de
    ON de.project_id = p.project_id

  LEFT JOIN users u
    ON u.user_id = de.user_id

  LEFT JOIN role r
    ON r.role_id = u.role_id

  LEFT JOIN entry_status es
    ON es.status_id = de.status_id

  GROUP BY
    p.project_id,
    p.project_code,
    p.project_name

  ORDER BY
    backlog DESC,
    p.project_name ASC
`);


    const formattedProjects = projects.map(
      (project) => ({
        id: project.id,
        project_code: project.project_code,
        project_name: project.project_name,

        received: Number(
          project.received || 0
        ),

        completed: Number(
          project.completed || 0
        ),

        backlog: Number(
          project.backlog || 0
        ),
      })
    );


    return res.status(200).json({
      success: true,
      count: formattedProjects.length,
      projects: formattedProjects,
    });

  } catch (error) {

    console.error(
      "Backlog By Project Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to load backlog by project",
      error: error.message,
    });
  }
};


// ============================================================
// 4. PENDING CORRECTIONS
// ============================================================

// Gets total correction requests currently waiting for review.
const getPendingCorrections = async (req, res) => {
  try {

    const [rows] = await db.query(`
      SELECT
        COUNT(*) AS pendingCorrections

      FROM correction_request cr

      INNER JOIN correction_status cs
        ON cs.status_id = cr.status_id

      WHERE cs.code = 'pending'
    `);


    const pendingCorrections = Number(
      rows[0].pendingCorrections || 0
    );


    return res.status(200).json({
      success: true,
      pendingCorrections,
    });

  } catch (error) {

    console.error(
      "Pending Corrections Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to load pending corrections",
      error: error.message,
    });
  }
};


// ============================================================
// 5. GUIDE COMPLIANCE
// ============================================================

// Gets organisation-wide guide acknowledgement compliance.
const getGuideCompliance = async (req, res) => {
  try {

    /*
      Required acknowledgement means:

      1. User is an active Indexer.
      2. User is assigned to the project.
      3. Project has a guide.
      4. Guide has a latest version.
      5. Latest version requires acknowledgement.

      Acknowledged means the acknowledgement record
      exists and its status is 'read'.
    */

    const [rows] = await db.query(`
      SELECT

        COUNT(*) AS totalRequired,

        COALESCE(
          SUM(
            CASE
              WHEN ga.ack_id IS NOT NULL
                AND ga.status = 'read'
              THEN 1
              ELSE 0
            END
          ),
          0
        ) AS acknowledged

      FROM project_assignment pa

      INNER JOIN users u
        ON u.user_id = pa.user_id

      INNER JOIN role r
        ON r.role_id = u.role_id
        AND r.code = 'indexer'

      INNER JOIN guide g
        ON g.project_id = pa.project_id

      INNER JOIN guide_version gv
        ON gv.guide_id = g.guide_id
        AND gv.is_latest = 1
        AND gv.requires_ack = 1

      LEFT JOIN guide_acknowledgement ga
        ON ga.version_id = gv.version_id
        AND ga.user_id = pa.user_id

      WHERE u.status = 'active'
    `);


    const totalRequired = Number(
      rows[0].totalRequired || 0
    );

    const acknowledged = Number(
      rows[0].acknowledged || 0
    );


    const pending = Math.max(
      totalRequired - acknowledged,
      0
    );


    const complianceRate =
      totalRequired > 0
        ? Math.round(
          (acknowledged / totalRequired) * 100
        )
        : 100;


    return res.status(200).json({
      success: true,

      compliance: {
        totalRequired,
        acknowledged,
        pending,
        complianceRate,
      },
    });

  } catch (error) {

    console.error(
      "Guide Compliance Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to load guide compliance",
      error: error.message,
    });
  }
};


// ============================================================
// 6. MISSING DAILY ENTRIES
// ============================================================

// Gets active Indexers who have not submitted/created
// any production entry today.
const getMissingEntries = async (req, res) => {
  try {

    /*
      Excludes:

      - inactive users
      - non-Indexers
      - Indexers who already have a daily entry today
      - users whose attendance status says the day
        does not count as a production day
        (for example approved/planned leave)
    */

    const [employees] = await db.query(`
      SELECT
        u.user_id AS id,
        u.emp_code AS employee_id,
        u.full_name AS name,
        u.email

      FROM users u

      INNER JOIN role r
        ON r.role_id = u.role_id

      WHERE r.code = 'indexer'

        AND u.status = 'active'

        AND NOT EXISTS (
          SELECT 1

          FROM daily_entry de

          WHERE de.user_id = u.user_id

            AND de.production_date = CURDATE()
        )

        AND NOT EXISTS (
          SELECT 1

          FROM attendance a

          INNER JOIN attendance_status ats
            ON ats.status_id = a.status_id

          WHERE a.user_id = u.user_id

            AND a.att_date = CURDATE()

            AND ats.counts_as_production_day = 0
        )

      ORDER BY
        u.full_name ASC
    `);


    return res.status(200).json({
      success: true,
      count: employees.length,
      employees,
    });

  } catch (error) {

    console.error(
      "Missing Entries Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to load missing entries",
      error: error.message,
    });
  }
};

// ============================================================
// 7. PROJECT DAILY SUMMARY
// ============================================================

// Gets date-wise and project-wise Received, Completed, Backlog and Pending.
// Gets project-wise and category-wise Daily Summary for Core Team.
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
    console.error("Core Team Project Daily Summary Error:", error);

    // Return an error response.
    return res.status(500).json({
      success: false,
      message: "Failed to load project daily summary",
      error: error.message,
    });
  }
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  getCoreTeamDashboard,
  getMonthlyProductionTrend,
  getBacklogByProject,
  getPendingCorrections,
  getGuideCompliance,
  getMissingEntries,
  getProjectDailySummary,
};