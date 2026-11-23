
const db = require("../config/db");

const {
  INDEXER_ROLE_SQL,
  normalizeRoleCode,
} = require("../utils/roleSql");

// Leave room within the existing 2 MB request body limit.
const MAX_WORKBOOK_BYTES = 1536 * 1024;

// ============================================================
// ERROR HANDLING
// ============================================================

const fail = (status, message) => {
  throw Object.assign(new Error(message), {
    httpStatus: status,
  });
};

const handleError = (res, error) => {
  if (error.httpStatus) {
    return res.status(error.httpStatus).json({
      success: false,
      message: error.message,
    });
  }

  console.error(
    "Daily Work Statement Error:",
    error.code || error.name
  );

  return res.status(500).json({
    success: false,
    message: "Unable to process the daily work statement.",
  });
};

// ============================================================
// PRODUCTION DATE VALIDATION — IST
// ============================================================

const todayIST = () =>
  new Date(Date.now() + 330 * 60000)
    .toISOString()
    .slice(0, 10);

const validateDate = (value) => {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    Number(value.slice(0, 4)) < 1000
  ) {
    fail(400, "Invalid production date.");
  }

  const date = new Date(`${value}T00:00:00Z`);

  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    fail(400, "Invalid production date.");
  }

  return value;
};

// ============================================================
// UNIVER WORKBOOK VALIDATION
// ============================================================

const isObject = (value) =>
  value !== null &&
  typeof value === "object" &&
  !Array.isArray(value);

const serializeWorkbook = (workbook) => {
  // Basic validation of the Univer workbook structure.

  if (
    !isObject(workbook) ||
    !isObject(workbook.sheets) ||
    !Array.isArray(workbook.sheetOrder) ||
    workbook.sheetOrder.length === 0 ||
    workbook.sheetOrder.some(
      (id) =>
        typeof id !== "string" ||
        !Object.prototype.hasOwnProperty.call(
          workbook.sheets,
          id
        ) ||
        !isObject(workbook.sheets[id])
    )
  ) {
    fail(400, "A valid spreadsheet workbook is required.");
  }

  const json = JSON.stringify(workbook);

  if (
    Buffer.byteLength(json, "utf8") >
    MAX_WORKBOOK_BYTES
  ) {
    fail(413, "Workbook exceeds the 1.5 MB size limit.");
  }

  return json;
};

// ============================================================
// CURRENT EMPLOYEE AND ROLE VALIDATION
// ============================================================

const getActor = async (
  req,
  executor = db,
  lock = false
) => {
  const id = Number(req.user?.id);

  if (!Number.isSafeInteger(id) || id <= 0) {
    fail(401, "Authentication required.");
  }

  const [users] = await executor.execute(
    `
    SELECT
      user_id,
      full_name,
      role_id,
      shift_id

    FROM users

    WHERE user_id = ?
      AND status = 'active'

    ${lock ? "FOR UPDATE" : ""}
    `,
    [id]
  );

  if (!users.length) {
    fail(403, "Your account is not active.");
  }

  const [roles] = await executor.execute(
    `
    SELECT code
    FROM role
    WHERE role_id = ?
    `,
    [users[0].role_id]
  );

  return {
    ...users[0],
    role: normalizeRoleCode(roles[0]?.code),
  };
};

// Only Indexers can create and edit daily statements.

const requireIndexer = (actor) => {
  if (actor.role !== "indexer") {
    fail(
      403,
      "Only Indexers can manage their statements."
    );
  }
};

// Team Leads, Managers and Administrators can view reports.

const requireManagement = (actor) => {
  if (
    !["lead", "core", "admin"].includes(actor.role)
  ) {
    fail(403, "You cannot access these reports.");
  }
};

// ============================================================
// FORMAT SAVED WORKBOOK
// ============================================================

const parseStatement = (row) =>
  row
    ? {
        ...row,

        workbookData:
          typeof row.workbookData === "string"
            ? JSON.parse(row.workbookData)
            : row.workbookData,
      }
    : null;

const statementColumns = `
  CAST(s.statement_id AS CHAR) AS statementId,

  DATE_FORMAT(
    s.production_date,
    '%Y-%m-%d'
  ) AS productionDate,

  s.shift_id AS shiftId,
  sm.shift_name AS shiftName,

  s.status,

  s.submitted_at AS submittedAt,
  s.modified_at AS modifiedAt
`;

// ============================================================
// GET INDEXER'S OWN DAILY WORK STATEMENT
//
// GET /api/daily-work-statements/my?date=YYYY-MM-DD
// ============================================================

const getMyStatement = async (req, res) => {
  res.set("Cache-Control", "no-store");

  try {
    const actor = await getActor(req);

    requireIndexer(actor);

    const date = validateDate(
      req.query.date || todayIST()
    );

    const [rows] = await db.execute(
      `
      SELECT

        ${statementColumns},

        s.workbook_data AS workbookData

      FROM daily_work_statement s

      LEFT JOIN shift_master sm
        ON sm.shift_id = s.shift_id

      WHERE s.user_id = ?
        AND s.production_date = ?
      `,
      [actor.user_id, date]
    );

    const [shifts] = await db.execute(
      `
      SELECT shift_name
      FROM shift_master
      WHERE shift_id = ?
      `,
      [actor.shift_id]
    );

    return res.json({
      success: true,

      employeeName: actor.full_name,

      productionDate: date,

      shiftName: rows[0]
        ? rows[0].shiftName
        : shifts[0]?.shift_name ?? null,

      statement: parseStatement(rows[0]),
    });

  } catch (error) {
    return handleError(res, error);
  }
};

// ============================================================
// SAVE DRAFT OR SUBMIT DAILY WORK STATEMENT
//
// POST /api/daily-work-statements/my
//
// Request body:
// productionDate
// workbookData
// status: "draft" or "submitted"
// ============================================================

const saveMyStatement = async (req, res) => {
  let connection;
  let inTransaction = false;

  try {
    const {
      productionDate,
      workbookData,
      status = "draft",
    } = req.body || {};

    const date = validateDate(productionDate);

    // Prevent creating statements for future dates.

    if (date > todayIST()) {
      fail(
        400,
        "Future production dates are not allowed."
      );
    }

    // Validate the statement status.

    if (!["draft", "submitted"].includes(status)) {
      fail(400, "Invalid statement status.");
    }

    // Convert the Univer workbook into JSON.

    const workbook = serializeWorkbook(
      workbookData
    );

    connection = await db.getConnection();

    await connection.beginTransaction();

    inTransaction = true;

    // Lock the employee row to prevent overlapping saves.

    const actor = await getActor(
      req,
      connection,
      true
    );

    requireIndexer(actor);

    // Check whether a statement already exists for this date.

    const [existing] = await connection.execute(
      `
      SELECT
        statement_id,
        status

      FROM daily_work_statement

      WHERE user_id = ?
        AND production_date = ?

      FOR UPDATE
      `,
      [actor.user_id, date]
    );

    // Submitted statements cannot be overwritten.

    if (existing[0]?.status === "submitted") {
      fail(
        409,
        "This statement has already been submitted and is read-only."
      );
    }

    const submittedAt =
      status === "submitted"
        ? new Date()
        : null;

    // ========================================================
    // UPDATE EXISTING DRAFT
    // ========================================================

    if (existing.length) {
      await connection.execute(
        `
        UPDATE daily_work_statement

        SET
          workbook_data = ?,
          status = ?,
          submitted_at = ?

        WHERE user_id = ?
          AND production_date = ?
          AND status = 'draft'
        `,
        [
          workbook,
          status,
          submittedAt,
          actor.user_id,
          date,
        ]
      );
    }

    // ========================================================
    // CREATE NEW STATEMENT
    // ========================================================

    else {
      await connection.execute(
        `
        INSERT INTO daily_work_statement
        (
          user_id,
          production_date,
          shift_id,
          workbook_data,
          status,
          submitted_at
        )

        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          actor.user_id,
          date,
          actor.shift_id,
          workbook,
          status,
          submittedAt,
        ]
      );
    }

    // Retrieve saved statement information.

    const [saved] = await connection.execute(
      `
      SELECT

        ${statementColumns}

      FROM daily_work_statement s

      LEFT JOIN shift_master sm
        ON sm.shift_id = s.shift_id

      WHERE s.user_id = ?
        AND s.production_date = ?
      `,
      [actor.user_id, date]
    );

    await connection.commit();

    inTransaction = false;

    return res
      .status(existing.length ? 200 : 201)
      .json({
        success: true,

        message:
          status === "submitted"
            ? "Statement submitted successfully."
            : "Draft saved successfully.",

        statement: saved[0],
      });

  } catch (error) {
    if (inTransaction) {
      try {
        await connection.rollback();

      } catch (rollbackError) {
        console.error(
          "Statement rollback failed:",
          rollbackError.code ||
          rollbackError.name
        );
      }
    }

    return handleError(res, error);

  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// ============================================================
// GET DAILY WORK STATEMENTS FOR MANAGEMENT REPORTS
//
// GET /api/daily-work-statements/reports?date=YYYY-MM-DD
//
// Team Lead: Assigned Indexers only.
// Manager: Existing Core Team access.
// Administrator: All Indexers.
// ============================================================

const getStatementReports = async (req, res) => {
  res.set("Cache-Control", "no-store");

  try {
    const actor = await getActor(req);

    requireManagement(actor);

    const date = validateDate(
      req.query.date || todayIST()
    );

    // Restrict Team Leads to their assigned employees.

    const teamCondition =
      actor.role === "lead"
        ? "AND u.team_lead_id = ?"
        : "";

    const params = [
      date,

      ...(actor.role === "lead"
        ? [actor.user_id]
        : []),
    ];

    const [rows] = await db.execute(
      `
      SELECT

        u.user_id AS userId,

        u.full_name AS employeeName,

        CAST(
          s.statement_id AS CHAR
        ) AS statementId,

        CASE
          WHEN s.statement_id IS NULL
          THEN currentShift.shift_name
          ELSE savedShift.shift_name
        END AS shiftName,

        CASE
          WHEN s.statement_id IS NULL
          THEN 'not_submitted'
          ELSE 'submitted'
        END AS status,

        s.submitted_at AS submittedAt

      FROM users u

      JOIN role r
        ON r.role_id = u.role_id

      LEFT JOIN daily_work_statement s
        ON s.user_id = u.user_id
        AND s.production_date = ?
        AND s.status = 'submitted'

      LEFT JOIN shift_master savedShift
        ON savedShift.shift_id = s.shift_id

      LEFT JOIN shift_master currentShift
        ON currentShift.shift_id = u.shift_id

      WHERE ${INDEXER_ROLE_SQL}

        AND (
          u.status = 'active'
          OR s.statement_id IS NOT NULL
        )

        ${teamCondition}

      ORDER BY
        u.full_name ASC,
        u.user_id ASC
      `,
      params
    );

    // Calculate statement submission summary.

    const submitted = rows.filter(
      (row) => row.status === "submitted"
    ).length;

    return res.json({
      success: true,

      productionDate: date,

      summary: {
        total: rows.length,

        submitted,

        notSubmitted:
          rows.length - submitted,
      },

      statements: rows,
    });

  } catch (error) {
    return handleError(res, error);
  }
};

// ============================================================
// OPEN SUBMITTED WORKBOOK INSIDE REPORTS
//
// GET /api/daily-work-statements/reports/:id
//
// Returns complete Univer workbook JSON.
// No Excel download required.
// ============================================================

const getSubmittedStatement = async (req, res) => {
  res.set("Cache-Control", "no-store");

  try {
    const actor = await getActor(req);

    requireManagement(actor);

    const id = String(req.params.id || "");

    if (
      !/^[1-9]\d{0,19}$/.test(id) ||
      BigInt(id) > 18446744073709551615n
    ) {
      fail(400, "Invalid statement ID.");
    }

    // Verify Team Lead access on individual workbook requests.

    const teamCondition =
      actor.role === "lead"
        ? "AND u.team_lead_id = ?"
        : "";

    const params = [
      id,

      ...(actor.role === "lead"
        ? [actor.user_id]
        : []),
    ];

    const [rows] = await db.execute(
      `
      SELECT

        ${statementColumns},

        u.full_name AS employeeName,

        s.workbook_data AS workbookData

      FROM daily_work_statement s

      JOIN users u
        ON u.user_id = s.user_id

      JOIN role r
        ON r.role_id = u.role_id

      LEFT JOIN shift_master sm
        ON sm.shift_id = s.shift_id

      WHERE s.statement_id = CAST(? AS UNSIGNED)

        AND s.status = 'submitted'

        AND ${INDEXER_ROLE_SQL}

        ${teamCondition}
      `,
      params
    );

    if (!rows.length) {
      fail(
        404,
        "Submitted statement not found."
      );
    }

    return res.json({
      success: true,

      statement: parseStatement(rows[0]),
    });

  } catch (error) {
    return handleError(res, error);
  }
};

// ============================================================
// EXPORT ALL CONTROLLER FUNCTIONS
// ============================================================

module.exports = {
  getMyStatement,
  saveMyStatement,
  getStatementReports,
  getSubmittedStatement,
};
