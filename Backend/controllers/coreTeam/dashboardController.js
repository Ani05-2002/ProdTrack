
const db = require("../../config/db");

// 1. CORE TEAM DASHBOARD SUMMARY

const getCoreTeamDashboard = async (req, res) => {
  try {
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
          ),
          0
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

    const projectBacklog = Math.max(
      totalReceived - totalCompleted,
      0
    );

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

    const completionRate =
      totalReceived > 0
        ? Math.round(
            (totalCompleted / totalReceived) * 100
          )
        : 0;

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

// 2. MONTHLY PRODUCTION TREND

const getMonthlyProductionTrend = async (req, res) => {
  try {
    console.log(
      "NEW MONTHLY TREND CONTROLLER RUNNING"
    );

    const [dbInfo] = await db.query(
      "SELECT DATABASE() AS database_name"
    );

    console.log(
      "BACKEND DATABASE:",
      dbInfo[0].database_name
    );

    const [entryCount] = await db.query(
      "SELECT COUNT(*) AS total FROM daily_entry"
    );

    console.log(
      "DAILY ENTRY COUNT:",
      entryCount[0].total
    );

    const [trend] = await db.query(`
      SELECT
        DATE_FORMAT(
          de.production_date,
          '%Y-%m'
        ) AS month_key,

        DATE_FORMAT(
          de.production_date,
          '%b %Y'
        ) AS month_name,

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

    console.log(
      "MONTHLY TREND DB RESULT:",
      trend
    );

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

// 3. BACKLOG BY PROJECT

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

// 4. PENDING CORRECTIONS

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

// 5. GUIDE COMPLIANCE

const getGuideCompliance = async (req, res) => {
  try {
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

// 6. MISSING DAILY ENTRIES

const getMissingEntries = async (req, res) => {
  try {
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

// 7. PROJECT DAILY SUMMARY

// Historical Indexer production includes reviewed entries only.
// From MANUAL_COUNTS_FROM, Documents Completed and
// Batches Processed come from submitted Team Lead entries.
// Extracted Documents is an independent Team Lead count.

const getProjectDailySummary = async (req, res) => {
  try {
    const backlogWorkflowStartDate = "2026-10-05";
    const MANUAL_COUNTS_FROM = "2026-11-18";

    const [projects] = await db.query(`
      SELECT project_id, project_name

      FROM project

      WHERE status = 'active'

      ORDER BY project_name ASC
    `);

    const summary = [];

    for (const project of projects) {
      // Only reviewed or reviewed-and-locked Indexer entries
      // are displayed in category-level completed totals.

      const [indexerCategoryRows] = await db.query(
        `
        SELECT
          totals.production_date,
          totals.team_lead_category_id,

          GROUP_CONCAT(
            CONCAT(
              totals.category_name,
              ' - ',
              totals.completed
            )
            ORDER BY totals.category_name
            SEPARATOR ', '
          ) AS indexer_category_names

        FROM (
          SELECT
            DATE_FORMAT(
              de.production_date,
              '%Y-%m-%d'
            ) AS production_date,

            de.team_lead_category_id,
            rc.category_id,
            rc.name AS category_name,

            COALESCE(
              SUM(de.docs_completed),
              0
            ) AS completed

          FROM daily_entry de

          JOIN users u
            ON u.user_id = de.user_id

          JOIN role r
            ON r.role_id = u.role_id
            AND r.code = 'indexer'

          JOIN reporting_category rc
            ON rc.category_id = de.category_id
            AND rc.role_type = 'indexer'

          JOIN entry_status es
            ON es.status_id = de.status_id
            AND es.code IN ('reviewed', 'locked')
            AND de.reviewed_at IS NOT NULL
            AND de.reviewed_by IS NOT NULL

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
        [
          project.project_id,
          backlogWorkflowStartDate,
        ]
      );

      // Only include approved Indexer production.

      const [directIndexerRows] = await db.query(
        `
        SELECT
          DATE_FORMAT(
            de.production_date,
            '%Y-%m-%d'
          ) AS production_date,

          de.team_lead_category_id AS category_id,

          COALESCE(
            SUM(de.docs_completed),
            0
          ) AS completed,

          COALESCE(
            SUM(de.batches_processed),
            0
          ) AS batchesProcessed

        FROM daily_entry de

        JOIN users u
          ON u.user_id = de.user_id

        JOIN role r
          ON r.role_id = u.role_id
          AND r.code = 'indexer'

        JOIN entry_status es
          ON es.status_id = de.status_id
          AND es.code IN ('reviewed', 'locked')
          AND de.reviewed_at IS NOT NULL
          AND de.reviewed_by IS NOT NULL

        WHERE de.project_id = ?
          AND de.production_date >= ?
          AND de.team_lead_category_id IS NOT NULL

        GROUP BY
          de.production_date,
          de.team_lead_category_id
        `,
        [
          project.project_id,
          backlogWorkflowStartDate,
        ]
      );

      // Team Lead entries and historical category mappings.

      const [dailyRows] = await db.query(
        `
        SELECT
          DATE_FORMAT(
            tl.production_date,
            '%Y-%m-%d'
          ) AS production_date,

          tl.category_id,
          rc.name AS category_name,

          COALESCE(
            SUM(tl.docs_received),
            0
          ) AS received,

          COALESCE(
            SUM(tl.batches_received),
            0
          ) AS batchesReceived,

          COALESCE(
            SUM(tl.docs_pending),
            0
          ) AS documentsPending,

          COALESCE(
            SUM(tl.batches_pending),
            0
          ) AS batchesPending,

          COALESCE(
            SUM(
              CASE
                WHEN tl.submitted_at IS NOT NULL
                THEN tl.team_lead_docs_completed
                ELSE 0
              END
            ),
            0
          ) AS manualCompleted,

          COALESCE(
            SUM(
              CASE
                WHEN tl.submitted_at IS NOT NULL
                THEN tl.extracted_documents
                ELSE 0
              END
            ),
            0
          ) AS extractedDocuments,

          COALESCE(
            SUM(
              CASE
                WHEN tl.submitted_at IS NOT NULL
                THEN tl.team_lead_batches_processed
                ELSE 0
              END
            ),
            0
          ) AS manualBatchesProcessed,

          COALESCE(
            SUM(idxTotals.completed),
            0
          ) AS completed,

          COALESCE(
            SUM(idxTotals.batchesProcessed),
            0
          ) AS batchesProcessed

        FROM daily_entry tl

        JOIN users tlUser
          ON tlUser.user_id = tl.user_id

        JOIN role tlRole
          ON tlRole.role_id = tlUser.role_id
          AND tlRole.code IN (
            'teamLead',
            'team_lead',
            'lead'
          )

        JOIN entry_status tlStatus
          ON tlStatus.status_id = tl.status_id
          AND tlStatus.code IN (
            'submitted',
            'reviewed',
            'locked'
          )

        JOIN reporting_category rc
          ON rc.category_id = tl.category_id
          AND rc.role_type = 'teamLead'

        LEFT JOIN (
          SELECT
            mapping.entry_id AS teamLeadEntryId,

            COALESCE(
              SUM(idx.docs_completed),
              0
            ) AS completed,

            COALESCE(
              SUM(idx.batches_processed),
              0
            ) AS batchesProcessed

          FROM daily_entry_indexer_category mapping

          JOIN daily_entry tlEntry
            ON tlEntry.entry_id = mapping.entry_id

          JOIN daily_entry idx
            ON idx.project_id = tlEntry.project_id
            AND idx.production_date =
              tlEntry.production_date

            AND idx.category_id = mapping.category_id

            AND idx.team_lead_category_id IS NULL

          JOIN users idxUser
            ON idxUser.user_id = idx.user_id

          JOIN role idxRole
            ON idxRole.role_id = idxUser.role_id
            AND idxRole.code = 'indexer'

          JOIN entry_status idxStatus
            ON idxStatus.status_id = idx.status_id
            AND idxStatus.code IN ('reviewed', 'locked')
            AND idx.reviewed_at IS NOT NULL
            AND idx.reviewed_by IS NOT NULL

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

      const categoryBacklogs = new Map();
      const categoryPendingBatches = new Map();

      for (const row of dailyRows) {
        const categoryId = row.category_id;

        const categoryKey = String(
          categoryId ?? "uncategorized"
        );

        const productionDate = row.production_date;

        const matchedIndexerCategories =
          indexerCategoryRows.find(
            (item) =>
              String(item.team_lead_category_id) ===
                String(categoryId) &&
              item.production_date === productionDate
          );

        const indexerCategoryNames =
          matchedIndexerCategories
            ?.indexer_category_names || "";

        const combinedCategoryName =
          indexerCategoryNames
            ? `${row.category_name} / ${indexerCategoryNames}`
            : row.category_name || "Uncategorized";

        const directIndexer =
          directIndexerRows.find(
            (item) =>
              String(item.category_id) ===
                String(categoryId) &&
              item.production_date === productionDate
          );

        const received = Number(
          row.received || 0
        );

        // NEW: Use manual Team Lead counts for new dates.
        // Preserve historical Indexer-based calculations.

        const useManualCounts =
          productionDate >= MANUAL_COUNTS_FROM;

        // Documents Completed

        const completed = useManualCounts
          ? Number(row.manualCompleted || 0)
          : Number(row.completed || 0) +
            Number(directIndexer?.completed || 0);

        // Extracted Documents

        const extractedDocuments = useManualCounts
          ? Number(row.extractedDocuments || 0)
          : 0;

        const batchesReceived = Number(
          row.batchesReceived || 0
        );

        // Batches Processed

        const batchesProcessed = useManualCounts
          ? Number(row.manualBatchesProcessed || 0)
          : Number(row.batchesProcessed || 0) +
            Number(directIndexer?.batchesProcessed || 0);

        const carriedBacklog =
          categoryBacklogs.get(categoryKey) || 0;

        const backlogCompleted = Math.min(
          completed,
          carriedBacklog
        );

        const backlog = Math.max(
          carriedBacklog - backlogCompleted,
          0
        );

        const pending = Number(
          row.documentsPending ?? 0
        );

        const pendingBatches = Number(
          row.batchesPending ?? 0
        );

        summary.push({
          productionDate,
          projectId: project.project_id,
          projectName: project.project_name,

          categoryId,
          categoryName: combinedCategoryName,

          received,
          completed,
          extractedDocuments,
          backlog,
          pending,

          batchesReceived,
          batchesProcessed,
          pendingBatches,
        });

        categoryBacklogs.set(
          categoryKey,
          pending
        );

        categoryPendingBatches.set(
          categoryKey,
          pendingBatches
        );
      }
    }

    summary.sort(
      (a, b) =>
        new Date(b.productionDate) -
        new Date(a.productionDate)
    );

    return res.status(200).json({
      success: true,
      summary,
    });
  } catch (error) {
    console.error(
      "Core Team Project Daily Summary Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to load project daily summary",
      error: error.message,
    });
  }
};

// EXPORTS

module.exports = {
  getCoreTeamDashboard,
  getMonthlyProductionTrend,
  getBacklogByProject,
  getPendingCorrections,
  getGuideCompliance,
  getMissingEntries,
  getProjectDailySummary,
};
