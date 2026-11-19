
const db = require("../../config/db");

// MAIN ADMIN DASHBOARD
const getAdminDashboard = async (req, res) => {
  try {
    const [latestDateRows] = await db.query(`
      SELECT MAX(production_date) AS latest_date
      FROM daily_entry
      WHERE production_date >= '2026-10-05'
    `);

    const latestProductionDate =
      latestDateRows[0]?.latest_date;

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

    // Calculate project backlog.
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

    const projectBacklogs = {};
    let totalBacklog = 0;

    backlogSummaryRows.forEach((row) => {
      const projectId = Number(row.project_id);
      const received = Number(row.received || 0);
      const completed = Number(row.completed || 0);

      const previousBacklog =
        projectBacklogs[projectId] || 0;

      const backlogCompleted = Math.min(
        completed,
        previousBacklog
      );

      const remainingOldBacklog = Math.max(
        previousBacklog - backlogCompleted,
        0
      );

      const todayCompleted = Math.max(
        completed - backlogCompleted,
        0
      );

      const todayPending = Math.max(
        received - todayCompleted,
        0
      );

      projectBacklogs[projectId] =
        remainingOldBacklog + todayPending;

      if (
        new Date(row.production_date)
          .toISOString()
          .slice(0, 10) ===
        new Date(latestProductionDate)
          .toISOString()
          .slice(0, 10)
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

    // BACKLOG BY PROJECT

    const [backlogRows] = await db.query(
      `
      SELECT
        p.project_id,
        p.project_name AS name,
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

    const backlogProjectState = {};
    const latestProjectBacklog = {};

    backlogRows.forEach((row) => {
      const projectId = Number(row.project_id);
      const received = Number(row.received || 0);
      const completed = Number(row.completed || 0);

      const previousBacklog =
        backlogProjectState[projectId] || 0;

      const backlogCompleted = Math.min(
        completed,
        previousBacklog
      );

      const remainingBacklog = Math.max(
        previousBacklog - backlogCompleted,
        0
      );

      const todayCompleted = Math.max(
        completed - backlogCompleted,
        0
      );

      const pending = Math.max(
        received - todayCompleted,
        0
      );

      backlogProjectState[projectId] =
        remainingBacklog + pending;

      latestProjectBacklog[projectId] = {
        name: row.name,
        total: remainingBacklog,
        received,
      };
    });

    const maxBacklog = Math.max(
      ...Object.values(latestProjectBacklog).map(
        (project) => project.total
      ),
      1
    );

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

    // KPI CARDS

    const [corrRows] = await db.query(`
      SELECT COUNT(*) AS pending_corrections
      FROM correction_request cr
      JOIN correction_status cs
        ON cs.status_id = cr.status_id
      WHERE cs.code = 'pending'
    `);

    const [complianceRows] = await db.query(`
      SELECT
        COUNT(*) AS total_pairs,

        SUM(
          CASE
            WHEN ga.status = 'read'
            THEN 1
            ELSE 0
          END
        ) AS acked_pairs

      FROM project_assignment pa

      JOIN guide g
        ON g.project_id = pa.project_id

      JOIN guide_version gv
        ON gv.guide_id = g.guide_id
        AND gv.is_latest = 1
        AND gv.requires_ack = 1

      LEFT JOIN guide_acknowledgement ga
        ON ga.version_id = gv.version_id
        AND ga.user_id = pa.user_id
    `);

    const totalPairs =
      Number(complianceRows[0].total_pairs) || 0;

    const ackedPairs =
      Number(complianceRows[0].acked_pairs) || 0;

    const complianceRate =
      totalPairs > 0
        ? Math.round((ackedPairs / totalPairs) * 100)
        : 100;

    const [missingRows] = await db.query(`
      SELECT COUNT(*) AS missing_entries

      FROM users u

      WHERE u.status = 'active'
        AND u.role_id = 1

        AND NOT EXISTS (
          SELECT 1
          FROM daily_entry de
          WHERE de.user_id = u.user_id
            AND de.production_date = CURDATE()
        )
    `);

    // MONTHLY PRODUCTION TREND

    const [trendRows] = await db.query(`
      SELECT
        DATE_FORMAT(
          de.production_date,
          '%Y-%m-01'
        ) AS month_start,

        DATE_FORMAT(
          de.production_date,
          '%b %Y'
        ) AS month_label,

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

    return res.status(200).json({
      success: true,

      dashboard: {
        totalReceived: Number(
          prodRows[0].total_received
        ),

        totalCompleted: Number(
          prodRows[0].total_completed
        ),

        totalBacklog: Number(totalBacklog || 0),

        activeEmployees: Number(
          employeeRows[0].active_employees
        ),

        activeProjects: Number(
          projectCountRows[0].active_projects
        ),

        backlogByProject: backlog,

        pendingCorrections: Number(
          corrRows[0].pending_corrections
        ),

        guideCompliance: {
          rate: complianceRate,
          acked: ackedPairs,
          total: totalPairs,
        },

        missingEntriesToday: Number(
          missingRows[0].missing_entries
        ),

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

// PROJECT DAILY SUMMARY
// Include only reviewed Indexer production.

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
      // Get reviewed Indexer category production.

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

      // Get only approved Indexer completed counts.

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

      // Team Lead production and historical mapping.

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

          COALESCE(SUM(CASE WHEN tl.submitted_at IS NOT NULL
            THEN tl.team_lead_docs_completed ELSE 0 END), 0) AS manualCompleted,
          COALESCE(SUM(CASE WHEN tl.submitted_at IS NOT NULL
            THEN tl.extracted_documents ELSE 0 END), 0) AS extractedDocuments,
          COALESCE(SUM(CASE WHEN tl.submitted_at IS NOT NULL
            THEN tl.team_lead_batches_processed ELSE 0 END), 0) AS manualBatchesProcessed,


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

        const received = Number(row.received || 0);

        const useManualCounts = productionDate >= MANUAL_COUNTS_FROM;
        const completed = useManualCounts
          ? Number(row.manualCompleted || 0)
          : Number(row.completed || 0) + Number(directIndexer?.completed || 0);
        const extractedDocuments = useManualCounts
          ? Number(row.extractedDocuments || 0) : 0;

        const batchesReceived = Number(
          row.batchesReceived || 0
        );

        const batchesProcessed = useManualCounts
          ? Number(row.manualBatchesProcessed || 0)
          : Number(row.batchesProcessed || 0) + Number(directIndexer?.batchesProcessed || 0);

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

module.exports = {
  getAdminDashboard,
  getProjectDailySummary,
};
