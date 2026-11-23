
const db = require("../config/db");

const {
  INDEXER_ROLE_SQL,
  TEAM_LEAD_ROLE_SQL,
  normalizeRoleCode,
} = require("../utils/roleSql");

// Maximum five results per category.
const PER_CATEGORY_LIMIT = 5;

// ============================================================
// DATE SEARCH: YYYY-MM-DD OR DD-MM-YYYY
// ============================================================

function searchDate(value) {
  let year;
  let month;
  let day;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    [year, month, day] = value.split("-").map(Number);
  } else if (/^\d{2}-\d{2}-\d{4}$/.test(value)) {
    [day, month, year] = value.split("-").map(Number);
  } else {
    return null;
  }

  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// ============================================================
// GLOBAL MANAGEMENT SEARCH
//
// GET /api/search?q=Priya
// ============================================================

const globalSearch = async (req, res) => {
  res.set("Cache-Control", "no-store");

  try {
    if (typeof req.query.q !== "string") {
      return res.status(200).json({
        success: true,
        count: 0,
        results: [],
      });
    }

    const term = req.query.q.trim().replace(/\s+/g, " ");

    if (term.length < 2) {
      return res.status(200).json({
        success: true,
        count: 0,
        results: [],
      });
    }

    if (term.length > 80) {
      return res.status(400).json({
        success: false,
        message: "Search text must be 80 characters or fewer.",
      });
    }

    const userId = Number(req.user?.id);

    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    // Check the current employee role from the database.

    const [actors] = await db.execute(
      `
      SELECT r.code
      FROM users u
      JOIN role r ON r.role_id = u.role_id
      WHERE u.user_id = ?
        AND u.status = 'active'
      LIMIT 1
      `,
      [userId]
    );

    if (!actors.length) {
      return res.status(403).json({
        success: false,
        message: "Account not active.",
      });
    }

    const role = normalizeRoleCode(actors[0].code);

    const isLead = role === "lead";

    // Indexers cannot access global search.

    if (
      !isLead &&
      role !== "core" &&
      role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to use global search.",
      });
    }

    // Avoid user-controlled SQL LIKE wildcards.

    const plainTerm = term.replace(/[%_\\]/g, "").trim();

    if (plainTerm.length < 2) {
      return res.status(200).json({
        success: true,
        count: 0,
        results: [],
      });
    }

    const like = `%${plainTerm}%`;

    const date = searchDate(term);

    const teamFilter = isLead
      ? "AND u.team_lead_id = ?"
      : "";

    const employeeRoleFilter = isLead
      ? ""
      : `AND (${INDEXER_ROLE_SQL} OR ${TEAM_LEAD_ROLE_SQL})`;

    const teamArgs = isLead
      ? [userId]
      : [];

    // ========================================================
    // 1. SEARCH EMPLOYEES
    // ========================================================

    const [users] = await db.execute(
      `
      SELECT
        u.user_id AS id,
        u.full_name AS title,
        r.name AS code,
        'user' AS type

      FROM users u

      JOIN role r
        ON r.role_id = u.role_id

      
      WHERE u.status = 'active'
        ${employeeRoleFilter}


        AND (
          u.full_name LIKE ?
          OR u.emp_code LIKE ?
        )

        ${teamFilter}

      ORDER BY u.full_name ASC

      LIMIT ${PER_CATEGORY_LIMIT}
      `,
      [like, like, ...teamArgs]
    );

    // ========================================================
    // 2. SEARCH PROJECTS
    // ========================================================

    const projectScope = isLead
      ? `
        AND EXISTS (
          SELECT 1
          FROM project_assignment pa
          WHERE pa.project_id = p.project_id
            AND pa.user_id = ?
        )
      `
      : "";

    const [projects] = await db.execute(
      `
      SELECT
        p.project_id AS id,
        p.project_name AS title,
        p.project_code AS code,
        'project' AS type

      FROM project p

      WHERE (
        p.project_name LIKE ?
        OR p.project_code LIKE ?
      )

      ${projectScope}

      ORDER BY p.project_name ASC

      LIMIT ${PER_CATEGORY_LIMIT}
      `,
      [
        like,
        like,
        ...(isLead ? [userId] : []),
      ]
    );

    // ========================================================
    // 3. SEARCH DAILY ENTRIES
    // ========================================================

    const entryDateCondition = date
      ? "OR de.production_date = ?"
      : "";

    const [entries] = await db.execute(
      `
      SELECT
        CAST(de.entry_id AS CHAR) AS id,

        CONCAT(
          u.full_name,
          ' - ',
          p.project_name
        ) AS title,

        COALESCE(
          NULLIF(de.batch_ref, ''),
          DATE_FORMAT(
            de.production_date,
            '%d-%m-%Y'
          )
        ) AS code,

        'entry' AS type,

        DATE_FORMAT(
          de.production_date,
          '%Y-%m-%d'
        ) AS productionDate,

        es.code AS status

      FROM daily_entry de

      JOIN users u
        ON u.user_id = de.user_id

      JOIN role r
        ON r.role_id = u.role_id

      JOIN project p
        ON p.project_id = de.project_id

      JOIN entry_status es
        ON es.status_id = de.status_id

      WHERE (
        u.full_name LIKE ?
        OR p.project_name LIKE ?
        OR de.batch_ref LIKE ?
        ${entryDateCondition}
      )

      AND (
        ${INDEXER_ROLE_SQL}
        OR ${TEAM_LEAD_ROLE_SQL}
      )

      ${teamFilter}

      ORDER BY
        de.production_date DESC,
        de.entry_id DESC

      LIMIT ${PER_CATEGORY_LIMIT}
      `,
      [
        like,
        like,
        like,
        ...(date ? [date] : []),
        ...teamArgs,
      ]
    );

    // ========================================================
    // 4. SEARCH DAILY WORK STATEMENTS
    // ========================================================

    const statementDateCondition = date
      ? "OR s.production_date = ?"
      : "";

    const [statements] = await db.execute(
      `
      SELECT
        CAST(s.statement_id AS CHAR) AS id,

        CONCAT(
          u.full_name,
          ' - Daily Work Statement'
        ) AS title,

        DATE_FORMAT(
          s.production_date,
          '%d-%m-%Y'
        ) AS code,

        'statement' AS type,

        DATE_FORMAT(
          s.production_date,
          '%Y-%m-%d'
        ) AS productionDate,

        'submitted' AS status

      FROM daily_work_statement s

      JOIN users u
        ON u.user_id = s.user_id

      JOIN role r
        ON r.role_id = u.role_id

      WHERE s.status = 'submitted'

        AND ${INDEXER_ROLE_SQL}

        AND (
          u.full_name LIKE ?
          ${statementDateCondition}
        )

        ${teamFilter}

      ORDER BY
        s.production_date DESC,
        s.statement_id DESC

      LIMIT ${PER_CATEGORY_LIMIT}
      `,
      [
        like,
        ...(date ? [date] : []),
        ...teamArgs,
      ]
    );

    // ========================================================
    // COMBINE ALL RESULTS
    // ========================================================

    const results = [
      ...users,
      ...projects,
      ...entries,
      ...statements,
    ];

    return res.status(200).json({
      success: true,
      count: results.length,
      results,
    });

  } catch (error) {
    console.error("Global Search Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to search ProdTrack at this time.",
    });
  }
};

module.exports = {
  globalSearch,
};
