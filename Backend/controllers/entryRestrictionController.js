
const db = require("../config/db");

// Indian Standard Time, independent of server timezone.
function istNow(now = new Date()) {
  const local = new Date(
    now.getTime() + 330 * 60000
  ).toISOString();

  return {
    date: local.slice(0, 10),
    time: local.slice(11, 19),
  };
}

// Validate YYYY-MM-DD dates.
function validDate(value) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return false;
  }

  if (Number(value.slice(0, 4)) < 1000) {
    return false;
  }

  const date = new Date(value + "T00:00:00Z");

  return (
    Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

// Validate database IDs.
function validId(value) {
  return (
    Number.isSafeInteger(Number(value)) &&
    Number(value) > 0
  );
}

// Common error response.
const fail = (res, status, message) =>
  res.status(status).json({
    success: false,
    message,
  });

// =====================================================
// 1. GET INDEXERS AND EXISTING RESTRICTIONS
// =====================================================

async function listRestrictions(req, res) {
  try {
    // Get only active Indexer users.
    const [users] = await db.query(`
      SELECT
        u.user_id AS userId,
        u.full_name AS name,
        u.emp_code AS empCode

      FROM users u

      JOIN role r
        ON r.role_id = u.role_id

      WHERE r.code = 'indexer'
        AND u.status = 'active'

      ORDER BY u.full_name, u.user_id
    `);

    // Load existing restrictions.
    const [restrictions] = await db.query(`
      SELECT
        er.restriction_id AS id,
        er.user_id AS userId,

        u.full_name AS name,
        u.emp_code AS empCode,

        DATE_FORMAT(
          er.restriction_date,
          '%Y-%m-%d'
        ) AS date,

        er.restriction_type AS type,
        er.cutoff_time AS cutoffTime,
        er.reason

      FROM user_entry_restriction er

      JOIN users u
        ON u.user_id = er.user_id

      ORDER BY
        er.restriction_date DESC,
        u.full_name,
        er.restriction_id DESC
    `);

    return res.json({
      success: true,
      users,
      restrictions,
    });
  } catch (error) {
    console.error(
      "List entry restrictions:",
      error
    );

    return fail(
      res,
      500,
      "Failed to load entry restrictions."
    );
  }
}

// =====================================================
// 2. CREATE OR UPDATE USER RESTRICTION
// =====================================================

async function saveRestriction(req, res) {
  try {
    const {
      userId,
      date,
      type,
      cutoffTime,
      reason,
    } = req.body || {};

    const note =
      typeof reason === "string"
        ? reason.trim()
        : "";

    // Validate employee and restriction date.
    if (!validId(userId) || !validDate(date)) {
      return fail(
        res,
        400,
        "Select a valid Indexer and date."
      );
    }

    // Allow only the two restriction types.
    if (
      !["full_day", "after_time"].includes(type)
    ) {
      return fail(
        res,
        400,
        "Invalid restriction type."
      );
    }

    // Validate cutoff time for half-day restrictions.
    if (
      type === "after_time" &&
      (
        typeof cutoffTime !== "string" ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(
          cutoffTime
        )
      )
    ) {
      return fail(
        res,
        400,
        "Select a valid cutoff time (IST)."
      );
    }

    if (!note || note.length > 250) {
      return fail(
        res,
        400,
        "Enter a reason (1–250 characters)."
      );
    }

    // Confirm that the selected employee is an active Indexer.
    const [users] = await db.query(
      `
      SELECT u.user_id

      FROM users u

      JOIN role r
        ON r.role_id = u.role_id

      WHERE u.user_id = ?
        AND r.code = 'indexer'
        AND u.status = 'active'

      LIMIT 1
      `,
      [Number(userId)]
    );

    if (!users.length) {
      return fail(
        res,
        404,
        "Active Indexer not found."
      );
    }

    // Save a new restriction or update the existing
    // restriction for the same employee and date.
    await db.query(
      `
      INSERT INTO user_entry_restriction
      (
        user_id,
        restriction_date,
        restriction_type,
        cutoff_time,
        reason,
        modified_by
      )
      VALUES (?, ?, ?, ?, ?, ?)

      ON DUPLICATE KEY UPDATE

        restriction_type =
          VALUES(restriction_type),

        cutoff_time =
          VALUES(cutoff_time),

        reason =
          VALUES(reason),

        modified_by =
          VALUES(modified_by),

        modified_at =
          CURRENT_TIMESTAMP
      `,
      [
        Number(userId),
        date,
        type,

        type === "after_time"
          ? cutoffTime + ":00"
          : null,

        note,
        req.user.id,
      ]
    );

    return res.json({
      success: true,
      message: "Entry restriction saved.",
    });
  } catch (error) {
    console.error(
      "Save entry restriction:",
      error
    );

    return fail(
      res,
      500,
      "Failed to save entry restriction."
    );
  }
}

// =====================================================
// 3. REMOVE USER RESTRICTION
// =====================================================

async function removeRestriction(req, res) {
  try {
    if (!validId(req.params.id)) {
      return fail(
        res,
        400,
        "Invalid restriction ID."
      );
    }

    const [result] = await db.query(
      `
      DELETE FROM user_entry_restriction
      WHERE restriction_id = ?
      `,
      [Number(req.params.id)]
    );

    if (!result.affectedRows) {
      return fail(
        res,
        404,
        "Restriction not found."
      );
    }

    return res.json({
      success: true,
      message: "Entry restriction removed.",
    });
  } catch (error) {
    console.error(
      "Remove entry restriction:",
      error
    );

    return fail(
      res,
      500,
      "Failed to remove entry restriction."
    );
  }
}

// =====================================================
// 4. CHECK WHETHER AN INDEXER IS RESTRICTED
// =====================================================

async function findRestriction(
  userId,
  date,
  entryId
) {
  const now = istNow();

  // Check both:
  // - Today's actual IST date
  // - Selected production date
  //
  // This prevents bypassing an active restriction
  // by changing the production date.

  const dates = new Set([
    now.date,
    date,
  ]);

  // When editing an existing entry, also check its
  // original production date.
  if (
    entryId !== undefined &&
    entryId !== null &&
    entryId !== ""
  ) {
    if (!validId(entryId)) {
      throw Object.assign(
        new Error("Invalid entry ID."),
        { httpStatus: 400 }
      );
    }

    const [entries] = await db.query(
      `
      SELECT
        DATE_FORMAT(
          production_date,
          '%Y-%m-%d'
        ) AS date

      FROM daily_entry

      WHERE entry_id = ?
        AND user_id = ?

      LIMIT 1
      `,
      [
        Number(entryId),
        userId,
      ]
    );

    if (!entries.length) {
      throw Object.assign(
        new Error("Entry not found."),
        { httpStatus: 404 }
      );
    }

    dates.add(entries[0].date);
  }

  const values = [...dates];

  const placeholders = values
    .map(() => "?")
    .join(",");

  const [rows] = await db.query(
    `
    SELECT
      DATE_FORMAT(
        restriction_date,
        '%Y-%m-%d'
      ) AS date,

      restriction_type AS type,
      cutoff_time AS cutoffTime,
      reason

    FROM user_entry_restriction

    WHERE user_id = ?
      AND restriction_date IN (${placeholders})

    ORDER BY restriction_date DESC
    `,
    [
      userId,
      ...values,
    ]
  );

  const rule = rows.find((row) => {
    // Full-day restriction blocks all entries
    // for the restricted date.
    if (row.type === "full_day") {
      return true;
    }

    // Half-day restriction becomes active at
    // the selected cutoff time.
    if (row.type === "after_time") {
      return (
        row.date < now.date ||
        (
          row.date === now.date &&
          now.time >= String(row.cutoffTime)
        )
      );
    }

    return false;
  });

  if (!rule) {
    return {
      blocked: false,
      message: "",
    };
  }

  const when =
    rule.type === "full_day"
      ? "full day"
      : `from ${String(
          rule.cutoffTime
        ).slice(0, 5)} IST`;

  return {
    blocked: true,

    message:
      `Daily entry restricted for ${rule.date} ` +
      `(${when}). Reason: ${rule.reason}. ` +
      `Contact your Administrator.`,
  };
}

// =====================================================
// 5. RETURN ENTRY RESTRICTION STATUS TO FRONTEND
// =====================================================

async function getRestrictionStatus(req, res) {
  try {
    const date = req.query.date;

    if (!validDate(date)) {
      return fail(
        res,
        400,
        "Invalid production date."
      );
    }

    const result = await findRestriction(
      req.user.id,
      date,
      req.query.entryId
    );

    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error(
      "Entry restriction status:",
      error
    );

    return fail(
      res,
      error.httpStatus || 500,

      error.httpStatus
        ? error.message
        : "Could not verify entry restrictions."
    );
  }
}

// =====================================================
// 6. BACKEND MIDDLEWARE TO BLOCK DAILY ENTRIES
// =====================================================

async function enforceEntryRestriction(
  req,
  res,
  next
) {
  // Team Leads are unaffected.
  if (req.user.role !== "indexer") {
    return next();
  }

  try {
    const date = req.body?.productionDate;

    if (!validDate(date)) {
      return fail(
        res,
        400,
        "Invalid production date."
      );
    }

    const result = await findRestriction(
      req.user.id,
      date,
      req.params.id
    );

    // Reject restricted requests before saving.
    if (result.blocked) {
      return fail(
        res,
        403,
        result.message
      );
    }

    return next();
  } catch (error) {
    console.error(
      "Check entry restriction:",
      error
    );

    // Do not allow saving if restriction
    // permissions could not be verified.
    return fail(
      res,
      error.httpStatus || 503,

      error.httpStatus
        ? error.message
        : "Could not verify entry restrictions. Please try again."
    );
  }
}

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  listRestrictions,
  saveRestriction,
  removeRestriction,
  getRestrictionStatus,
  enforceEntryRestriction,
};
