
const db = require("../config/db");

// ============================================================
// INDEXER SHIFT SUBMISSION (IST)
// ============================================================

const getIndexerShiftSubmissionStatus = async (
  userId,
  productionDate
) => {
  const invalidDate = () => Object.assign(
    new Error("Invalid production date."),
    { httpStatus: 400 }
  );

  if (
    typeof productionDate !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(productionDate) ||
    Number(productionDate.slice(0, 4)) < 1000
  ) {
    throw invalidDate();
  }

  const day = new Date(
    `${productionDate}T00:00:00Z`
  );

  if (
    !Number.isFinite(day.getTime()) ||
    day.toISOString().slice(0, 10) !== productionDate
  ) {
    throw invalidDate();
  }

  // Retrieve assigned shift directly from the database.

  const [rows] = await db.query(
    `
    SELECT
      sm.shift_id,
      sm.shift_name,

      TIME_FORMAT(
        sm.submission_time,
        '%H:%i:%s'
      ) AS submission_time,

      sm.submission_day_offset

    FROM users u

    LEFT JOIN shift_master sm
      ON sm.shift_id = u.shift_id

    WHERE u.user_id = ?

    LIMIT 1
    `,
    [userId]
  );

  const shift = rows[0];
  const now = new Date();

  // An Indexer must have an assigned shift to submit.

  if (!shift?.shift_id) {
    return {
      productionDate,
      shiftId: null,
      shiftName: null,
      canSubmit: false,
      opensAt: null,
      serverNow: now.toISOString(),

      message:
        "No shift assigned. Contact your Administrator.",
    };
  }

  const time = String(
    shift.submission_time || ""
  );

  const offset = Number(
    shift.submission_day_offset
  );

  // Validate Shift Master configuration.

  if (
    !/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(time) ||
    shift.submission_day_offset == null ||
    ![0, 1].includes(offset)
  ) {
    throw new Error("Invalid shift configuration.");
  }

  // Third Shift opens on the following calendar day.
  // Production date remains unchanged.

  day.setUTCDate(
    day.getUTCDate() + offset
  );

  const opensOn = day
    .toISOString()
    .slice(0, 10);

  // Explicit Indian Standard Time offset.
  // Independent of server timezone.

  const opens = new Date(
    `${opensOn}T${time}+05:30`
  );

  const canSubmit =
    now.getTime() >= opens.getTime();

  return {
    productionDate,

    shiftId: Number(shift.shift_id),
    shiftName: shift.shift_name,

    submissionTime: time,
    submissionDayOffset: offset,

    canSubmit,

    opensAt: opens.toISOString(),
    serverNow: now.toISOString(),

    message: canSubmit
      ? "Your shift submission is available."
      : `You can submit from ${opensOn} ${time.slice(0, 5)} IST (${shift.shift_name}).`,
  };
};


// ============================================================
// ENFORCE SHIFT SUBMISSION RESTRICTION
// ============================================================

const enforceShiftSubmission = async (
  req,
  productionDate,
  statusCode
) => {

  // Team Leads are unaffected.
  // Saving drafts is unaffected by shift timing.

  if (
    req.user.role !== "indexer" ||
    statusCode !== "submitted"
  ) {
    return;
  }

  const result =
    await getIndexerShiftSubmissionStatus(
      req.user.id,
      productionDate
    );

  // Reject early submission.

  if (!result.canSubmit) {
    throw Object.assign(
      new Error(result.message),
      {
        httpStatus: 403,
      }
    );
  }
};


// ============================================================
// GET SHIFT SUBMISSION STATUS FOR FRONTEND
// ============================================================

const getShiftSubmissionStatus = async (req, res) => {
  res.set("Cache-Control", "no-store");

  try {
    const result =
      await getIndexerShiftSubmissionStatus(
        req.user.id,
        req.query.date
      );

    return res.status(200).json({
      success: true,
      ...result,
    });

  } catch (error) {
    console.error(
      "Shift Submission Status Error:",
      error
    );

    return res.status(
      error.httpStatus || 503
    ).json({
      success: false,
      canSubmit: false,

      message: error.httpStatus
        ? error.message
        : "Could not verify shift submission time. Please try again.",
    });
  }
};


// ============================================================
// MANUAL TEAM LEAD PRODUCTION COUNTS
// ============================================================

const MANUAL_COUNTS_FROM = "2026-11-18";

function readManualTeamLeadCounts(req, productionDate, statusCode) {
  const counts = {
    completed: null,
    extracted: null,
    processed: null,
  };

  if (
    req.user.role !== "teamLead" ||
    productionDate < MANUAL_COUNTS_FROM
  ) {
    return counts;
  }

  const fields = [
    ["completed", "teamLeadDocumentsCompleted", "Documents Completed"],
    ["extracted", "extractedDocuments", "Extracted Documents"],
    ["processed", "teamLeadBatchesProcessed", "Batches Processed"],
  ];

  for (const [key, name, label] of fields) {
    const raw = req.body[name];

    if (
      raw == null ||
      (typeof raw === "string" && raw.trim() === "")
    ) {
      if (statusCode === "submitted") {
        return {
          ...counts,
          error: `Enter ${label}. Use 0 if none.`,
        };
      }

      continue;
    }

    const value =
      typeof raw === "number" ||
        (typeof raw === "string" && /^\d+$/.test(raw.trim()))
        ? Number(raw)
        : NaN;

    if (
      !Number.isInteger(value) ||
      value < 0 ||
      value > 4294967295
    ) {
      return {
        ...counts,
        error: `${label} must be a non-negative whole number.`,
      };
    }

    counts[key] = value;
  }

  return counts;
}

// ============================================================
// AUTOMATIC ATTENDANCE
// ============================================================

const markPresentOnDailyEntrySubmission = async (userId) => {
  try {
    const [statuses] = await db.query(`
      SELECT status_id
      FROM attendance_status
      WHERE code = 'present'
      LIMIT 1
    `);

    if (!statuses.length) {
      throw new Error("Present attendance status not found");
    }

    const [existing] = await db.query(
      `
      SELECT a.attendance_id, ast.code, ast.is_leave
      FROM attendance a
      JOIN attendance_status ast
        ON ast.status_id = a.status_id
      WHERE a.user_id = ?
        AND a.att_date = CURDATE()
      LIMIT 1
      `,
      [userId]
    );

    if (existing.length && existing[0].code !== "absent") {
      return;
    }

    await db.query(
      `
      INSERT INTO attendance
        (user_id, att_date, status_id, hours, note, approved_by)
      VALUES
        (?, CURDATE(), ?, 8,
         'Auto Present - Daily Entry submitted', NULL)
      ON DUPLICATE KEY UPDATE
        status_id = VALUES(status_id),
        hours = VALUES(hours),
        note = VALUES(note),
        approved_by = NULL
      `,
      [userId, statuses[0].status_id]
    );
  } catch (error) {
    console.error("Daily Entry Attendance Error:", error);
  }
};

// ============================================================
// GET PROJECT TEAM LEAD CATEGORIES
// ============================================================

const getProjectTeamLeadCategories = async (req, res) => {
  try {
    const projectId = Number(req.params.projectId);

    if (!Number.isSafeInteger(projectId) || projectId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    const [assignments] = await db.query(
      `
      SELECT 1
      FROM project_assignment
      WHERE project_id = ?
        AND user_id = ?
      LIMIT 1
      `,
      [projectId, req.user.id]
    );

    if (assignments.length === 0) {
      return res.status(403).json({
        success: false,
        message: "This project is not assigned to you",
      });
    }

    const [categories] = await db.query(
      `
      SELECT rc.category_id, rc.name
      FROM reporting_category rc
      JOIN project_reporting_category prc
        ON prc.category_id = rc.category_id
      WHERE prc.project_id = ?
        AND rc.role_type = 'teamLead'
      ORDER BY rc.name ASC
      `,
      [projectId]
    );

    return res.status(200).json({
      success: true,
      categories,
    });
  } catch (error) {
    console.error("Get Project Categories Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load categories",
    });
  }
};

// ============================================================
// INDEXER ENTRY EDIT PERMISSIONS
// ============================================================

const getIndexerEditPermission = async (
  executor,
  entryStatus,
  lockedAt
) => {
  if (lockedAt) {
    return false;
  }

  const statusCode = String(entryStatus || "").toLowerCase();

  if (!["draft", "submitted"].includes(statusCode)) {
    return false;
  }

  const settingKey =
    statusCode === "draft"
      ? "draft_entry_rule"
      : "submitted_entry_rule";

  const [rules] = await executor.query(
    `
    SELECT setting_value
    FROM app_setting
    WHERE setting_key = ?
    LIMIT 1
    `,
    [settingKey]
  );

  const defaultRule =
    statusCode === "draft"
      ? "editable_by_indexer"
      : "read_only_for_indexer";

  const configuredRule =
    rules.length > 0
      ? rules[0].setting_value
      : defaultRule;

  return configuredRule === "editable_by_indexer";
};

// ============================================================
// CORRECTION REQUEST PERMISSIONS
// ============================================================

const getCorrectionRequestPermission = async (
  executor,
  entryStatus
) => {
  const statusCode = String(entryStatus || "").toLowerCase();

  if (statusCode !== "locked") {
    return false;
  }

  const [rules] = await executor.query(`
    SELECT setting_value
    FROM app_setting
    WHERE setting_key = 'locked_entry_rule'
    LIMIT 1
  `);

  const configuredRule =
    rules.length > 0
      ? rules[0].setting_value
      : "correction_request_required";

  return configuredRule === "correction_request_required";
};

// ============================================================
// AUTOMATIC ENTRY LOCKING
// ============================================================

const applyAutomaticLocks = async () => {
  let connection;

  try {
    connection = await db.getConnection();

    await connection.beginTransaction();

    const [lockedStatuses] = await connection.query(`
      SELECT status_id
      FROM entry_status
      WHERE code = 'locked'
      LIMIT 1
    `);

    if (lockedStatuses.length === 0) {
      await connection.rollback();

      console.error(
        "Automatic Lock Error: locked status is not configured"
      );

      return;
    }

    const lockedStatusId = lockedStatuses[0].status_id;

    const [entriesToLock] = await connection.query(`
      SELECT
        de.entry_id,
        de.user_id,
        de.project_id,
        de.production_date,
        p.auto_lock_time,
        COALESCE(p.grace_minutes, 0) AS grace_minutes

      FROM daily_entry de

      JOIN project p
        ON p.project_id = de.project_id

      JOIN entry_status es
        ON es.status_id = de.status_id

      WHERE es.code = 'reviewed'
        AND de.locked_at IS NULL
        AND p.auto_lock_time IS NOT NULL
        AND p.status = 'active'
        AND de.reviewed_at IS NOT NULL

        AND DATE_ADD(
          de.reviewed_at,
          INTERVAL COALESCE(p.grace_minutes, 0) MINUTE
        ) <= NOW()

      FOR UPDATE
    `);

    for (const entry of entriesToLock) {
      await connection.query(
        `
        UPDATE daily_entry
        SET status_id = ?,
            locked_at = NOW()
        WHERE entry_id = ?
          AND locked_at IS NULL
        `,
        [lockedStatusId, entry.entry_id]
      );

      await connection.query(
        `
        INSERT INTO audit_log
        (
          user_id,
          action,
          entity_type,
          entity_ref,
          detail
        )
        VALUES (?, ?, ?, ?, ?)
        `,
        [
          entry.user_id,
          "Auto locked daily entry",
          "daily_entry",
          String(entry.entry_id),
          `System automatically locked entry ${entry.entry_id} after the project Auto Lock Time and Grace Period expired`,
        ]
      );
    }

    await connection.commit();

    if (entriesToLock.length > 0) {
      console.log(
        `Automatic Lock: ${entriesToLock.length} daily entr${entriesToLock.length === 1 ? "y" : "ies"
        } locked`
      );
    }
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error(
          "Automatic Lock Rollback Error:",
          rollbackError
        );
      }
    }

    console.error("Automatic Daily Entry Lock Error:", error);
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// ============================================================
// REQUIRED INDEXING GUIDE ACKNOWLEDGEMENT
// ============================================================

const getPendingRequiredGuides = async (
  executor,
  userId,
  projectId
) => {
  const [guides] = await executor.query(
    `
    SELECT
      gv.version_id,
      g.title,
      gv.version_label
    FROM guide g
    JOIN guide_version gv
      ON gv.guide_id = g.guide_id
    WHERE g.project_id = ?
      AND gv.is_latest = 1
      AND gv.requires_ack = 1

      AND NOT EXISTS (
        SELECT 1
        FROM guide_acknowledgement ga
        WHERE ga.version_id = gv.version_id
          AND ga.user_id = ?
          AND ga.status = 'read'
      )
    `,
    [projectId, userId]
  );

  return guides;
};

// ============================================================
// DAILY ENTRY SUBMISSION NOTIFICATION
// ============================================================

const sendEntrySubmissionNotification = async (
  executor,
  userId,
  entryId
) => {
  try {
    await executor.query(
      `
      INSERT INTO notification
      (
        user_id,
        type_id,
        title,
        body,
        link_hash,
        is_read,
        created_at
      )
      SELECT
        ?,
        nt.type_id,
        'Daily entry submitted',
        ?,
        '#daily-entry',
        0,
        NOW()
      FROM notification_type nt
      WHERE nt.code = 'entry_submission_confirmation'
        AND nt.is_enabled = 1
      LIMIT 1
      `,
      [
        userId,
        `Daily entry #${entryId} was submitted successfully.`,
      ]
    );
  } catch (error) {
    console.error(
      "Entry Submission Notification Error:",
      error
    );
  }
};

// ============================================================
// CREATE DAILY ENTRY
// ============================================================

const createEntry = async (req, res) => {
  let connection;

  try {
    const {
      projectId,
      productionDate,
      batchJobId,
      reportingCategory,
      teamLeadCategoryId,
      indexerCategoryIds,
      documentsReceived,
      documentsCompleted,
      documentsPending,
      batchesReceived,
      batchesProcessed,
      batchesPending,
      errorsFlagged,
      notes,
      status,
    } = req.body;

    if (indexerCategoryIds !== undefined) {
      return res.status(400).json({
        success: false,
        message:
          "Indexer category mappings are no longer supported. Indexers select their Team Lead category directly.",
      });
    }

    if (!projectId || !productionDate) {
      return res.status(400).json({
        success: false,
        message: "Project and production date are required",
      });
    }

    const received =
      req.user.role === "teamLead"
        ? Number(documentsReceived || 0)
        : 0;

    const completed = Number(documentsCompleted || 0);

    const batchesReceivedCount =
      req.user.role === "teamLead"
        ? Number(batchesReceived ?? 0)
        : 0;

    const processed = Number(batchesProcessed || 0);

    const isTeamLead = req.user.role === "teamLead";

    const parsePending = (value) => {
      if (
        value === undefined ||
        value === null ||
        value === ""
      ) {
        return null;
      }

      return Number(value);
    };

    const pendingDocs = isTeamLead
      ? parsePending(documentsPending)
      : null;

    const pendingBatches = isTeamLead
      ? parsePending(batchesPending)
      : null;

    const errors = Number(errorsFlagged || 0);

    const numericValues = [
      received,
      completed,
      batchesReceivedCount,
      processed,
      errors,
      pendingDocs,
      pendingBatches,
    ].filter((value) => value !== null);

    if (
      numericValues.some(
        (value) =>
          !Number.isInteger(value) ||
          value < 0 ||
          value > 4294967295
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Production values must be non-negative whole numbers",
      });
    }

    const batchRef = String(batchJobId || "").trim();
    const remarks = String(notes || "").trim();

    if (batchRef.length > 60) {
      return res.status(400).json({
        success: false,
        message: "Batch ID cannot exceed 60 characters",
      });
    }

    if (remarks.length > 500) {
      return res.status(400).json({
        success: false,
        message: "Notes cannot exceed 500 characters",
      });
    }

    const [assignments] = await db.query(
      `
      SELECT assignment_id
      FROM project_assignment
      WHERE user_id = ?
        AND project_id = ?
      LIMIT 1
      `,
      [req.user.id, projectId]
    );

    if (assignments.length === 0) {
      return res.status(403).json({
        success: false,
        message: "This project is not assigned to you",
      });
    }

    let categoryId = null;

    if (reportingCategory) {
      if (!Number.isNaN(Number(reportingCategory))) {
        categoryId = Number(reportingCategory);
      } else {
        const [assignments] = await db.query(
          `
          SELECT assignment_id
          FROM project_assignment
          WHERE user_id = ?
            AND project_id = ?
          LIMIT 1
          `,
          [req.user.id, projectId]
        );

        if (assignments.length === 0) {
          return res.status(403).json({
            success: false,
            message: "This project is not assigned to you",
          });
        }

        const [categories] = await db.query(
          `
          SELECT category_id
          FROM reporting_category
          WHERE name = ?
          LIMIT 1
          `,
          [reportingCategory]
        );

        categoryId =
          categories.length > 0
            ? categories[0].category_id
            : null;
      }
    }

    if (categoryId !== null) {
      const [allowedCategories] = await db.query(
        `
        SELECT 1
        FROM project_reporting_category
        WHERE project_id = ?
          AND category_id = ?
        LIMIT 1
        `,
        [Number(projectId), categoryId]
      );

      if (allowedCategories.length === 0) {
        return res.status(400).json({
          success: false,
          message:
            "Selected reporting category is not assigned to this project",
        });
      }
    }


    const statusCode = String(
      status || "draft"
    ).toLowerCase();

    // Check Indexer's shift submission time.

    await enforceShiftSubmission(
      req,
      productionDate,
      statusCode
    );

    const manualCounts = readManualTeamLeadCounts(
      req,
      productionDate,
      statusCode
    );


    if (manualCounts.error) {
      return res.status(400).json({
        success: false,
        message: manualCounts.error,
      });
    }

    if (!["draft", "submitted"].includes(statusCode)) {
      return res.status(400).json({
        success: false,
        message:
          "You can only create draft or submitted entries",
      });
    }

    if (statusCode === "submitted") {
      const pendingGuides = await getPendingRequiredGuides(
        db,
        req.user.id,
        projectId
      );

      if (pendingGuides.length > 0) {
        return res.status(409).json({
          success: false,
          message:
            "Please acknowledge the required indexing guides for this project before submitting.",
          pendingGuides,
        });
      }
    }

    const [statuses] = await db.query(
      `
      SELECT status_id, code
      FROM entry_status
      WHERE code = ?
      LIMIT 1
      `,
      [statusCode]
    );

    if (statuses.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid entry status",
      });
    }

    const selectedStatus = statuses[0];

    connection = await db.getConnection();
    await connection.beginTransaction();

    if (req.user.role === "indexer") {
      const selectedTeamLeadCategoryId =
        Number(teamLeadCategoryId);

      if (
        !Number.isInteger(selectedTeamLeadCategoryId) ||
        selectedTeamLeadCategoryId <= 0
      ) {
        const error = new Error(
          "Please select a Team Lead category"
        );

        error.httpStatus = 400;
        throw error;
      }

      const [validTeamLeadCategories] =
        await connection.query(
          `
          SELECT rc.category_id
          FROM reporting_category rc
          JOIN project_reporting_category prc
            ON prc.category_id = rc.category_id
          WHERE prc.project_id = ?
            AND rc.category_id = ?
            AND rc.role_type = 'teamLead'
          LIMIT 1
          `,
          [
            Number(projectId),
            selectedTeamLeadCategoryId,
          ]
        );

      if (validTeamLeadCategories.length === 0) {
        const error = new Error(
          "Invalid Team Lead category for the selected project"
        );

        error.httpStatus = 400;
        throw error;
      }
    }

    // Save Team Lead manual counts separately from Indexer counts.

    const [result] = await connection.query(
      `
      INSERT INTO daily_entry
      (
        project_id,
        user_id,
        production_date,
        batch_ref,
        category_id,
        team_lead_category_id,
        docs_received,
        docs_completed,
        team_lead_docs_completed,
        extracted_documents,
        docs_pending,
        batches_received,
        batches_processed,
        team_lead_batches_processed,
        batches_pending,
        errors_flagged,
        remarks,
        status_id,
        submitted_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        Number(projectId),
        req.user.id,
        productionDate,
        batchRef,
        categoryId,

        req.user.role === "indexer" && teamLeadCategoryId
          ? Number(teamLeadCategoryId)
          : null,

        received,
        completed,
        manualCounts.completed,
        manualCounts.extracted,
        pendingDocs,
        batchesReceivedCount,
        processed,
        manualCounts.processed,
        pendingBatches,
        errors,
        remarks || null,
        selectedStatus.status_id,

        selectedStatus.code === "submitted"
          ? new Date()
          : null,
      ]
    );

    const entryId = result.insertId;

    const [projectFields] = await connection.query(
      `
      SELECT field_id, field_key, data_type
      FROM project_field
      WHERE project_id = ?
      ORDER BY sort_order ASC, field_id ASC
      `,
      [Number(projectId)]
    );

    const dynamicValues = {
      documents_received: received,
      documents_completed: completed,
      batches_processed: processed,
      errors_flagged: errors,
    };

    for (const field of projectFields) {
      const fieldValue = dynamicValues[field.field_key];

      if (fieldValue === undefined) {
        continue;
      }

      if (["int", "decimal"].includes(field.data_type)) {
        await connection.query(
          `
          INSERT INTO daily_entry_value
          (
            entry_id,
            field_id,
            value_num,
            value_txt
          )
          VALUES (?, ?, ?, NULL)
          `,
          [entryId, field.field_id, fieldValue]
        );
      } else {
        await connection.query(
          `
          INSERT INTO daily_entry_value
          (
            entry_id,
            field_id,
            value_num,
            value_txt
          )
          VALUES (?, ?, NULL, ?)
          `,
          [entryId, field.field_id, String(fieldValue)]
        );
      }
    }

    await connection.commit();

    if (selectedStatus.code === "submitted") {
      await markPresentOnDailyEntrySubmission(req.user.id);

      await sendEntrySubmissionNotification(
        db,
        req.user.id,
        entryId
      );
    }

    return res.status(201).json({
      success: true,

      message:
        selectedStatus.code === "submitted"
          ? "Daily entry submitted successfully"
          : "Daily entry draft saved successfully",

      entryId,
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error(
          "Create Daily Entry Rollback Error:",
          rollbackError
        );
      }
    }

    console.error("Create Daily Entry Error:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message:
          "An entry already exists for this project, date and batch",
      });
    }

    if (error.httpStatus) {
      return res.status(error.httpStatus).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create daily entry",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// ============================================================
// GET MY DAILY ENTRIES
// ============================================================

const getMyEntries = async (req, res) => {
  try {
    const userId = req.user.id;

    const [entries] = await db.query(
      `
      SELECT
        de.entry_id AS id,
        de.entry_id,

        DATE_FORMAT(
          de.production_date,
          '%Y-%m-%d'
        ) AS production_date,

        de.batch_ref AS batch_job_id,
        de.batch_ref,

        CONCAT_WS(
          ' / ',
          tlrc.name,
          rc.name
        ) AS reporting_category,

        de.team_lead_category_id AS teamLeadCategoryId,

        de.docs_received AS documents_received,
        de.docs_completed AS documents_completed,

        de.team_lead_docs_completed,
        de.extracted_documents,

        de.docs_pending AS documents_pending,

        de.batches_received,
        de.batches_processed,
        de.team_lead_batches_processed,
        de.batches_pending,

        de.errors_flagged,
        de.remarks AS notes,

        es.code AS status,
        es.name AS status_name,

        p.project_id,
        p.project_code,
        p.project_name,

        de.submitted_at,
        de.reviewed_at,
        de.locked_at,
        de.created_at,
        de.modified_at

      FROM daily_entry de

      JOIN project p
        ON p.project_id = de.project_id

      JOIN entry_status es
        ON es.status_id = de.status_id

      LEFT JOIN reporting_category rc
        ON rc.category_id = de.category_id

      LEFT JOIN reporting_category tlrc
        ON tlrc.category_id = de.team_lead_category_id

      WHERE de.user_id = ?

      ORDER BY
        de.production_date DESC,
        de.entry_id DESC
      `,
      [userId]
    );

    if (entries.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        entries: [],
      });
    }

    const entryIds = entries.map(
      (entry) => entry.entry_id
    );

    const [indexerCategoryRows] = await db.query(
      `
      SELECT deic.entry_id, deic.category_id
      FROM daily_entry_indexer_category deic
      JOIN daily_entry de
        ON de.entry_id = deic.entry_id
      WHERE de.user_id = ?
      ORDER BY deic.category_id ASC
      `,
      [userId]
    );

    const indexerCategoriesByEntry = {};

    for (const row of indexerCategoryRows) {
      if (!indexerCategoriesByEntry[row.entry_id]) {
        indexerCategoriesByEntry[row.entry_id] = [];
      }

      indexerCategoriesByEntry[row.entry_id].push(
        Number(row.category_id)
      );
    }

    const entryPlaceholders = entryIds
      .map(() => "?")
      .join(", ");

    const [dynamicRows] = await db.query(
      `
      SELECT
        dev.entry_id,
        pf.field_id,
        pf.project_id,
        pf.field_key,
        pf.label,
        pf.data_type,
        pf.is_mandatory,
        pf.sort_order,
        dev.value_num,
        dev.value_txt

      FROM daily_entry_value dev

      JOIN project_field pf
        ON pf.field_id = dev.field_id

      WHERE dev.entry_id IN (${entryPlaceholders})

      ORDER BY
        dev.entry_id ASC,
        pf.sort_order ASC,
        pf.field_id ASC
      `,
      entryIds
    );

    const dynamicFieldsByEntry = {};

    for (const row of dynamicRows) {
      if (!dynamicFieldsByEntry[row.entry_id]) {
        dynamicFieldsByEntry[row.entry_id] = [];
      }

      let fieldValue = null;

      if (["int", "decimal"].includes(row.data_type)) {
        fieldValue =
          row.value_num === null
            ? null
            : Number(row.value_num);
      } else {
        fieldValue = row.value_txt;
      }

      dynamicFieldsByEntry[row.entry_id].push({
        field_id: row.field_id,
        project_id: row.project_id,
        field_key: row.field_key,
        label: row.label,
        data_type: row.data_type,
        is_mandatory: Boolean(row.is_mandatory),
        sort_order: Number(row.sort_order),
        value: fieldValue,
      });
    }

    const entriesWithPermissions = await Promise.all(
      entries.map(async (entry) => {
        const dynamicFields =
          dynamicFieldsByEntry[entry.entry_id] || [];

        const dynamicValues = dynamicFields.reduce(
          (values, field) => {
            values[field.field_key] = field.value;
            return values;
          },
          {}
        );

        return {
          ...entry,

          indexerCategoryIds:
            indexerCategoriesByEntry[entry.entry_id] || [],

          dynamic_fields: dynamicFields,
          dynamic_values: dynamicValues,

          canEdit: await getIndexerEditPermission(
            db,
            entry.status,
            entry.locked_at
          ),

          canRequestCorrection:
            await getCorrectionRequestPermission(
              db,
              entry.status
            ),
        };
      })
    );

    return res.status(200).json({
      success: true,
      count: entriesWithPermissions.length,
      entries: entriesWithPermissions,
    });
  } catch (error) {
    console.error("Get Daily Entries Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load daily entries",
      error: error.message,
    });
  }
};

// ============================================================
// UPDATE DAILY ENTRY
// ============================================================

const updateEntry = async (req, res) => {
  let connection;

  try {
    const entryId = Number(req.params.id);
    const userId = req.user.id;

    const {
      projectId,
      productionDate,
      batchJobId,
      reportingCategory,
      teamLeadCategoryId,
      indexerCategoryIds,
      documentsReceived,
      documentsCompleted,
      documentsPending,
      batchesReceived,
      batchesProcessed,
      batchesPending,
      errorsFlagged,
      notes,
      status = "draft",
    } = req.body;

    if (indexerCategoryIds !== undefined) {
      return res.status(400).json({
        success: false,
        message:
          "Indexer category mappings are no longer supported. Indexers select their Team Lead category directly.",
      });
    }

    const selectedProjectId = Number(projectId);

    let categoryId = null;

    if (reportingCategory) {
      if (!Number.isNaN(Number(reportingCategory))) {
        categoryId = Number(reportingCategory);
      } else {
        const [categories] = await db.query(
          `
          SELECT category_id
          FROM reporting_category
          WHERE name = ?
          LIMIT 1
          `,
          [reportingCategory]
        );

        categoryId =
          categories.length > 0
            ? categories[0].category_id
            : null;
      }
    }

    const statusCode = String(status).toLowerCase();

    const parsePending = (value) => {
      if (
        value === undefined ||
        value === null ||
        value === ""
      ) {
        return null;
      }

      return Number(value);
    };

    const pendingDocs =
      req.user.role === "teamLead"
        ? parsePending(documentsPending)
        : null;

    const pendingBatches =
      req.user.role === "teamLead"
        ? parsePending(batchesPending)
        : null;

    const received =
      req.user.role === "teamLead"
        ? Number(documentsReceived || 0)
        : 0;

    const numbers = [
      received,
      documentsCompleted,

      req.user.role === "teamLead"
        ? batchesReceived
        : 0,

      batchesProcessed,
      errorsFlagged,
    ].map((value) => Number(value ?? 0));

    const [
      validatedReceived,
      completed,
      batchesReceivedCount,
      processed,
      errors,
    ] = numbers;

    const validDate =
      typeof productionDate === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(productionDate) &&
      Number.isFinite(Date.parse(productionDate)) &&
      new Date(productionDate)
        .toISOString()
        .slice(0, 10) === productionDate;

    if (
      !Number.isSafeInteger(entryId) ||
      entryId <= 0 ||
      !Number.isSafeInteger(selectedProjectId) ||
      selectedProjectId <= 0 ||
      !validDate
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid entry ID, project and date are required",
      });
    }

    if (
      [...numbers, pendingDocs, pendingBatches]
        .filter((value) => value !== null)
        .some(
          (value) =>
            !Number.isInteger(value) ||
            value < 0 ||
            value > 4294967295
        )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Use valid non-negative whole numbers. Completed cannot exceed received.",
      });
    }

    if (!["draft", "submitted"].includes(statusCode)) {
      return res.status(400).json({
        success: false,
        message: "A draft can only be saved or submitted",
      });
    }


    // Check shift timing before submitting a saved draft.

    await enforceShiftSubmission(
      req,
      productionDate,
      statusCode
    );

    const manualCounts = readManualTeamLeadCounts(
      req,
      productionDate,
      statusCode
    );


    if (manualCounts.error) {
      return res.status(400).json({
        success: false,
        message: manualCounts.error,
      });
    }

    const batchRef = String(batchJobId ?? "").trim();
    const remarks = String(notes ?? "").trim();

    if (batchRef.length > 60 || remarks.length > 500) {
      return res.status(400).json({
        success: false,
        message: "Batch ID allows 60 characters; notes allow 500",
      });
    }

    connection = await db.getConnection();

    await connection.beginTransaction();

    const reject = (httpStatus, message) => {
      throw Object.assign(new Error(message), {
        httpStatus,
      });
    };

    const [entries] = await connection.query(
      `
      SELECT
        de.entry_id,
        de.project_id,
        de.status_id,
        de.locked_at,
        de.submitted_at,
        es.code AS status
      FROM daily_entry de
      JOIN entry_status es
        ON es.status_id = de.status_id
      WHERE de.entry_id = ?
        AND de.user_id = ?
      FOR UPDATE
      `,
      [entryId, userId]
    );

    if (!entries.length) {
      reject(404, "Entry not found");
    }

    const entry = entries[0];

    if (req.user.role === "teamLead") {
      if (
        !["draft", "submitted"].includes(
          String(entry.status).toLowerCase()
        ) ||
        entry.locked_at !== null
      ) {
        reject(
          403,
          "Team Leaders can edit only Draft or Submitted entries"
        );
      }

      if (
        String(entry.status).toLowerCase() === "submitted" &&
        statusCode !== "submitted"
      ) {
        reject(
          400,
          "A Submitted entry must remain Submitted when edited"
        );
      }
    }

    if (req.user.role === "indexer") {
      const canEditEntry = await getIndexerEditPermission(
        connection,
        entry.status,
        entry.locked_at
      );

      if (!canEditEntry) {
        reject(
          403,
          `${entry.status} entries are currently read-only for Indexers`
        );
      }
    }

    const [projects] = await connection.query(
      `
      SELECT p.category_id
      FROM project_assignment pa
      JOIN project p
        ON p.project_id = pa.project_id
      WHERE pa.user_id = ?
        AND pa.project_id = ?
        AND p.status = 'active'
      `,
      [userId, selectedProjectId]
    );

    if (!projects.length) {
      reject(403, "This active project is not assigned to you");
    }

    if (req.user.role === "indexer") {
      const selectedTeamLeadCategoryId =
        Number(teamLeadCategoryId);

      if (
        !Number.isSafeInteger(selectedTeamLeadCategoryId) ||
        selectedTeamLeadCategoryId <= 0
      ) {
        reject(400, "Please select a category");
      }

      const [validTeamLeadCategories] =
        await connection.query(
          `
          SELECT rc.category_id
          FROM reporting_category rc
          JOIN project_reporting_category prc
            ON prc.category_id = rc.category_id
          WHERE prc.project_id = ?
            AND rc.category_id = ?
            AND rc.role_type = 'teamLead'
          LIMIT 1
          `,
          [
            selectedProjectId,
            selectedTeamLeadCategoryId,
          ]
        );

      if (validTeamLeadCategories.length === 0) {
        reject(
          400,
          "Invalid category for the selected project"
        );
      }
    }

    if (categoryId !== null) {
      const [allowedCategories] = await connection.query(
        `
        SELECT 1
        FROM project_reporting_category
        WHERE project_id = ?
          AND category_id = ?
        LIMIT 1
        `,
        [selectedProjectId, categoryId]
      );

      if (allowedCategories.length === 0) {
        reject(
          400,
          "Selected reporting category is not assigned to this project"
        );
      }
    }

    if (statusCode === "submitted") {
      const pendingGuides = await getPendingRequiredGuides(
        connection,
        userId,
        selectedProjectId
      );

      if (pendingGuides.length > 0) {
        reject(
          409,
          "Please acknowledge the required indexing guides for this project before submitting."
        );
      }
    }

    const [statuses] = await connection.query(
      `
      SELECT status_id
      FROM entry_status
      WHERE code = ?
      LIMIT 1
      `,
      [statusCode]
    );

    if (!statuses.length) {
      reject(400, "Entry status is not configured");
    }

    await connection.query(
      `
      UPDATE daily_entry
      SET
        project_id = ?,
        production_date = ?,
        batch_ref = ?,
        category_id = ?,
        team_lead_category_id = ?,
        docs_received = ?,
        docs_completed = ?,
        team_lead_docs_completed = ?,
        extracted_documents = ?,
        docs_pending = ?,
        batches_received = ?,
        batches_processed = ?,
        team_lead_batches_processed = ?,
        batches_pending = ?,
        errors_flagged = ?,
        remarks = ?,
        status_id = ?,
        submitted_at = ?

      WHERE entry_id = ?
        AND user_id = ?
      `,
      [
        selectedProjectId,
        productionDate,
        batchRef,
        categoryId,

        req.user.role === "indexer"
          ? Number(teamLeadCategoryId)
          : null,

        received,
        completed,
        manualCounts.completed,
        manualCounts.extracted,
        pendingDocs,
        batchesReceivedCount,
        processed,
        manualCounts.processed,
        pendingBatches,
        errors,
        remarks || null,
        statuses[0].status_id,

        statusCode === "submitted"
          ? String(entry.status).toLowerCase() === "submitted"
            ? entry.submitted_at
            : new Date()
          : null,

        entryId,
        userId,
      ]
    );

    const [projectFields] = await connection.query(
      `
      SELECT field_id, field_key, data_type
      FROM project_field
      WHERE project_id = ?
      ORDER BY sort_order ASC, field_id ASC
      `,
      [selectedProjectId]
    );

    const dynamicValues = {
      documents_received: received,
      documents_completed: completed,
      batches_processed: processed,
      errors_flagged: errors,
    };

    if (Number(entry.project_id) !== selectedProjectId) {
      await connection.query(
        `
        DELETE FROM daily_entry_value
        WHERE entry_id = ?
        `,
        [entryId]
      );
    }

    for (const field of projectFields) {
      const fieldValue = dynamicValues[field.field_key];

      if (fieldValue === undefined) {
        continue;
      }

      if (["int", "decimal"].includes(field.data_type)) {
        await connection.query(
          `
          INSERT INTO daily_entry_value
          (
            entry_id,
            field_id,
            value_num,
            value_txt
          )
          VALUES (?, ?, ?, NULL)

          ON DUPLICATE KEY UPDATE
            value_num = VALUES(value_num),
            value_txt = NULL
          `,
          [entryId, field.field_id, fieldValue]
        );
      } else {
        await connection.query(
          `
          INSERT INTO daily_entry_value
          (
            entry_id,
            field_id,
            value_num,
            value_txt
          )
          VALUES (?, ?, NULL, ?)

          ON DUPLICATE KEY UPDATE
            value_num = NULL,
            value_txt = VALUES(value_txt)
          `,
          [entryId, field.field_id, String(fieldValue)]
        );
      }
    }

    await connection.query(
      `
      INSERT INTO audit_log
      (
        user_id,
        action,
        entity_type,
        entity_ref,
        detail
      )
      VALUES (?, ?, 'daily_entry', ?, ?)
      `,
      [
        userId,

        statusCode === "submitted"
          ? "Submitted draft"
          : "Updated draft",

        String(entryId),

        `Entry ${entryId} saved with status ${statusCode}`,
      ]
    );

    await connection.commit();

    if (statusCode === "submitted") {
      await markPresentOnDailyEntrySubmission(userId);

      await sendEntrySubmissionNotification(
        db,
        userId,
        entryId
      );
    }

    return res.json({
      success: true,

      message:
        statusCode === "submitted"
          ? "Draft submitted successfully"
          : "Draft updated successfully",

      entryId,
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error(
          "Update Daily Entry Rollback Error:",
          rollbackError
        );
      }
    }

    console.error("Update Daily Entry Error:", error);

    return res
      .status(
        error.code === "ER_DUP_ENTRY"
          ? 409
          : error.httpStatus || 500
      )
      .json({
        success: false,

        message:
          error.code === "ER_DUP_ENTRY"
            ? "An entry already exists for this project, date and batch"
            : error.httpStatus
              ? error.message
              : "Failed to update daily entry",
      });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// ============================================================
// GET PENDING TEAM ENTRIES FOR REVIEW
// ============================================================

const getPendingTeamEntries = async (req, res) => {
  try {
    const teamLeadId = req.user.id;

    const [entries] = await db.query(
      `
      SELECT
        de.entry_id AS id,
        de.entry_id,

        DATE_FORMAT(
          de.production_date,
          '%Y-%m-%d'
        ) AS production_date,

        de.batch_ref AS batch_job_id,

        u.user_id AS employee_id,
        u.emp_code AS employee_code,
        u.full_name AS employee_name,

        p.project_id,
        p.project_name,

        CONCAT_WS(
          ' / ',
          tlrc.name,
          rc.name
        ) AS reporting_category,

        de.docs_received AS documents_received,
        de.docs_completed AS documents_completed,
        de.batches_received,
        de.batches_processed,
        de.errors_flagged,
        de.remarks AS notes,

        es.code AS status,
        de.submitted_at

      FROM daily_entry de

      JOIN users u
        ON u.user_id = de.user_id

      JOIN project p
        ON p.project_id = de.project_id

      JOIN entry_status es
        ON es.status_id = de.status_id

      LEFT JOIN reporting_category rc
        ON rc.category_id = de.category_id

      LEFT JOIN reporting_category tlrc
        ON tlrc.category_id = de.team_lead_category_id
        AND tlrc.role_type = 'teamLead'

      WHERE u.team_lead_id = ?
        AND de.user_id <> ?
        AND es.code = 'submitted'
        AND de.locked_at IS NULL

        AND EXISTS (
          SELECT 1
          FROM project_assignment pa
          WHERE pa.project_id = de.project_id
            AND pa.user_id = ?
        )

      ORDER BY
        de.submitted_at ASC,
        de.entry_id ASC
      `,
      [teamLeadId, teamLeadId, teamLeadId]
    );

    return res.status(200).json({
      success: true,
      count: entries.length,
      entries,
    });
  } catch (error) {
    console.error(
      "Get Pending Team Entries Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to load submitted team entries",
    });
  }
};

// ============================================================
// MARK INDEXER ENTRY AS REVIEWED
// ============================================================

const reviewEntry = async (req, res) => {
  let connection;

  try {
    const teamLeadId = req.user.id;
    const entryId = Number(req.params.id);

    if (req.user.role !== "teamLead") {
      return res.status(403).json({
        success: false,
        message: "Only Team Leads can review entries",
      });
    }

    if (
      !Number.isSafeInteger(entryId) ||
      entryId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid entry ID is required",
      });
    }

    connection = await db.getConnection();

    await connection.beginTransaction();

    const reject = (httpStatus, message) => {
      throw Object.assign(new Error(message), {
        httpStatus,
      });
    };

    const [entries] = await connection.query(
      `
      SELECT
        de.entry_id,
        de.status_id,
        de.locked_at,
        es.code AS status

      FROM daily_entry de

      JOIN users u
        ON u.user_id = de.user_id

      JOIN entry_status es
        ON es.status_id = de.status_id

      WHERE de.entry_id = ?
        AND u.team_lead_id = ?
        AND de.user_id <> ?

        AND EXISTS (
          SELECT 1
          FROM project_assignment pa
          WHERE pa.project_id = de.project_id
            AND pa.user_id = ?
        )

      FOR UPDATE
      `,
      [
        entryId,
        teamLeadId,
        teamLeadId,
        teamLeadId,
      ]
    );

    if (entries.length === 0) {
      reject(
        404,
        "Team entry not found or not accessible"
      );
    }

    const entry = entries[0];

    if (
      entry.status !== "submitted" ||
      entry.locked_at !== null
    ) {
      reject(
        409,
        "Only an unlocked submitted entry can be reviewed"
      );
    }

    const [statuses] = await connection.query(`
      SELECT status_id
      FROM entry_status
      WHERE code = 'reviewed'
      LIMIT 1
    `);

    if (statuses.length === 0) {
      reject(500, "Reviewed status is not configured");
    }

    // These values determine whether Indexer production
    // can be included in the Team Lead's reviewed preview.

    const [result] = await connection.query(
      `
      UPDATE daily_entry
      SET
        status_id = ?,
        reviewed_by = ?,
        reviewed_at = NOW()
      WHERE entry_id = ?
        AND status_id = ?
        AND locked_at IS NULL
      `,
      [
        statuses[0].status_id,
        teamLeadId,
        entryId,
        entry.status_id,
      ]
    );

    if (result.affectedRows !== 1) {
      reject(
        409,
        "Entry changed. Refresh the list and try again"
      );
    }

    await connection.query(
      `
      INSERT INTO audit_log
      (
        user_id,
        action,
        entity_type,
        entity_ref,
        detail
      )
      VALUES (?, ?, ?, ?, ?)
      `,
      [
        teamLeadId,
        "Reviewed daily entry",
        "daily_entry",
        String(entryId),
        "Status changed from submitted to reviewed",
      ]
    );

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Daily entry reviewed successfully",
      entryId,
      status: "reviewed",
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error(
          "Review rollback error:",
          rollbackError
        );
      }
    }

    console.error("Review Entry Error:", error);

    return res.status(error.httpStatus || 500).json({
      success: false,

      message: error.httpStatus
        ? error.message
        : "Failed to review daily entry",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// ============================================================
// AUTOMATIC LOCK SCHEDULER
// ============================================================

applyAutomaticLocks();

setInterval(() => {
  applyAutomaticLocks();
}, 60 * 1000);

// ============================================================
// GET DAILY ENTRY PROJECT FIELDS
// ============================================================

const getProjectFields = async (req, res) => {
  try {
    const projectId = Number(req.params.projectId);

    if (
      !Number.isSafeInteger(projectId) ||
      projectId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    const [projects] = await db.query(
      `
      SELECT
        p.project_id,
        p.project_code,
        p.project_name

      FROM project p

      JOIN project_assignment pa
        ON pa.project_id = p.project_id

      WHERE p.project_id = ?
        AND pa.user_id = ?
        AND p.status = 'active'

      LIMIT 1
      `,
      [projectId, req.user.id]
    );

    if (projects.length === 0) {
      return res.status(403).json({
        success: false,
        message: "This active project is not assigned to you",
      });
    }

    const [fields] = await db.query(
      `
      SELECT
        field_id AS id,
        project_id,
        field_key,
        label,
        data_type,
        is_mandatory,
        sort_order

      FROM project_field

      WHERE project_id = ?

      ORDER BY
        sort_order ASC,
        field_id ASC
      `,
      [projectId]
    );

    const formattedFields = fields.map((field) => ({
      id: field.id,
      project_id: field.project_id,
      field_key: field.field_key,
      label: field.label,
      data_type: field.data_type,
      is_mandatory: Boolean(field.is_mandatory),
      sort_order: Number(field.sort_order),
    }));

    return res.status(200).json({
      success: true,

      project: {
        id: projects[0].project_id,
        project_code: projects[0].project_code,
        project_name: projects[0].project_name,
      },

      count: formattedFields.length,
      fields: formattedFields,
    });
  } catch (error) {
    console.error(
      "Get Daily Entry Project Fields Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to load project fields",
      error: error.message,
    });
  }
};

// ============================================================
// PROJECT DAILY SUMMARY
//
// CORRECTED WORKFLOW:
//
// 1. Indexer submits entry:
//    Do not include counts in reviewed summary.
//
// 2. Team Lead reviews entry:
//    Show reviewed Indexer completed documents and batches
//    in Team Lead Daily Entry Project Daily Summary.
//
// 3. Team Lead saves own draft:
//    Continue displaying reviewed Indexer production.
//
// 4. Team Lead submits own Daily Entry:
//    Display final manually submitted counts.
//
// 5. Keep reviewed Indexer counts separately for reference.
// ============================================================

const getProjectDailySummary = async (req, res) => {
  try {
    const projectId = Number(req.params.projectId);
    const productionDate = req.query.date;

    if (
      !Number.isSafeInteger(projectId) ||
      projectId <= 0 ||
      !productionDate
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Valid project ID and production date are required",
      });
    }

    // --------------------------------------------------------
    // VERIFY TEAM LEAD PROJECT ASSIGNMENT
    // --------------------------------------------------------

    if (req.user.role === "teamLead") {
      const [assignments] = await db.query(
        `
        SELECT assignment_id
        FROM project_assignment
        WHERE user_id = ?
          AND project_id = ?
        LIMIT 1
        `,
        [req.user.id, projectId]
      );

      if (assignments.length === 0) {
        return res.status(403).json({
          success: false,
          message: "This project is not assigned to you",
        });
      }
    }

    // --------------------------------------------------------
    // GET PROJECT REPORTING CATEGORIES
    // --------------------------------------------------------

    const [projectCategories] = await db.query(
      `
      SELECT
        p.project_id,
        p.project_name,
        rc.category_id,
        rc.name AS category_name

      FROM project p

      LEFT JOIN (
        SELECT
          prc.project_id,
          rc.category_id,
          rc.name

        FROM project_reporting_category prc

        INNER JOIN reporting_category rc
          ON rc.category_id = prc.category_id
          AND rc.role_type = 'teamLead'
      ) rc
        ON rc.project_id = p.project_id

      WHERE p.project_id = ?

      ORDER BY rc.name ASC
      `,
      [projectId]
    );

    if (projectCategories.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const projectName =
      projectCategories[0].project_name;

    // --------------------------------------------------------
    // GET PREVIOUS PRODUCTION DAY PENDING
    // --------------------------------------------------------

    const [previousPendingRows] = await db.query(
      `
      SELECT
        de.production_date,
        SUM(de.docs_pending) AS previousPending

      FROM daily_entry de

      JOIN users u
        ON u.user_id = de.user_id

      JOIN role r
        ON r.role_id = u.role_id

      JOIN entry_status es
        ON es.status_id = de.status_id

      WHERE de.project_id = ?
        AND de.production_date < ?
        AND de.production_date >= ?

        AND r.code IN (
          'teamLead',
          'team_lead',
          'lead'
        )

        AND es.code IN (
          'submitted',
          'reviewed',
          'locked'
        )

        AND de.docs_pending IS NOT NULL

      GROUP BY de.production_date

      ORDER BY de.production_date DESC

      LIMIT 1
      `,
      [
        projectId,
        productionDate,
        "2026-10-05",
      ]
    );

    const previousDayPending = Number(
      previousPendingRows[0]?.previousPending ?? 0
    );

    // --------------------------------------------------------
    // GET PREVIOUS PENDING BY REPORTING CATEGORY
    // --------------------------------------------------------

    const [previousCategoryPendingRows] = await db.query(
      `
      SELECT
        de.category_id,
        COALESCE(SUM(de.docs_pending), 0) AS pending

      FROM daily_entry de

      JOIN users u
        ON u.user_id = de.user_id

      JOIN role r
        ON r.role_id = u.role_id

      JOIN entry_status es
        ON es.status_id = de.status_id

      WHERE de.project_id = ?
        AND de.production_date = ?

        AND r.code IN (
          'teamLead',
          'team_lead',
          'lead'
        )

        AND es.code IN (
          'submitted',
          'reviewed',
          'locked'
        )

        AND de.docs_pending IS NOT NULL

      GROUP BY de.category_id
      `,
      [
        projectId,
        previousPendingRows[0]?.production_date ?? null,
      ]
    );

    const backlogWorkflowStartDate = "2026-10-05";

    // --------------------------------------------------------
    // HISTORICAL PRODUCTION TOTALS
    // --------------------------------------------------------

    const [previousRows] = await db.query(
      `
      SELECT

        COALESCE(
          SUM(
            CASE
              WHEN r.code IN (
                'teamLead',
                'team_lead',
                'lead'
              )
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
                AND de.reviewed_at IS NOT NULL
                AND de.reviewed_by IS NOT NULL

              THEN de.docs_completed
              ELSE 0
            END
          ),
          0
        ) AS completed

      FROM daily_entry de

      JOIN users u
        ON u.user_id = de.user_id

      JOIN role r
        ON r.role_id = u.role_id

      JOIN entry_status es
        ON es.status_id = de.status_id

      WHERE de.project_id = ?
        AND de.production_date >= ?
        AND de.production_date < ?

        AND es.code IN (
          'submitted',
          'reviewed',
          'locked'
        )
      `,
      [
        projectId,
        backlogWorkflowStartDate,
        productionDate,
      ]
    );

    // --------------------------------------------------------
    // TODAY'S OVERALL PROJECT TOTALS
    //
    // IMPORTANT:
    // Return NULL if Team Lead has not submitted manual counts.
    // Do not convert missing manual counts into zero.
    //
    // Zero must remain a valid intentionally submitted value.
    // --------------------------------------------------------

    const [rows] = await db.query(
      `
      SELECT

        SUM(
          CASE
            WHEN r.code IN (
              'teamLead',
              'team_lead',
              'lead'
            )
              AND de.submitted_at IS NOT NULL

            THEN de.team_lead_docs_completed
            ELSE NULL
          END
        ) AS manualCompleted,

        COALESCE(
          SUM(
            CASE
              WHEN r.code IN (
                'teamLead',
                'team_lead',
                'lead'
              )
                AND de.submitted_at IS NOT NULL

              THEN de.extracted_documents
              ELSE 0
            END
          ),
          0
        ) AS extractedDocuments,

        SUM(
          CASE
            WHEN r.code IN (
              'teamLead',
              'team_lead',
              'lead'
            )
              AND de.submitted_at IS NOT NULL

            THEN de.team_lead_batches_processed
            ELSE NULL
          END
        ) AS manualBatchesProcessed,

        COALESCE(
          SUM(
            CASE
              WHEN r.code IN (
                'teamLead',
                'team_lead',
                'lead'
              )
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
                AND de.reviewed_at IS NOT NULL
                AND de.reviewed_by IS NOT NULL

              THEN de.docs_completed
              ELSE 0
            END
          ),
          0
        ) AS completed

      FROM daily_entry de

      JOIN users u
        ON u.user_id = de.user_id

      JOIN role r
        ON r.role_id = u.role_id

      JOIN entry_status es
        ON es.status_id = de.status_id

      WHERE de.project_id = ?
        AND de.production_date = ?

        AND es.code IN (
          'submitted',
          'reviewed',
          'locked'
        )
      `,
      [projectId, productionDate]
    );

    // --------------------------------------------------------
    // REVIEWED INDEXER PRODUCTION
    //
    // MAIN FIX:
    // Indexer completed documents and processed batches become
    // available after Team Lead marks the entry as reviewed.
    //
    // No Team Lead Daily Entry submission is required for this
    // reviewed preview.
    // --------------------------------------------------------

    const [directIndexerDailyRows] = await db.query(
      `
      SELECT

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

      JOIN entry_status es
        ON es.status_id = de.status_id

      WHERE de.project_id = ?
        AND de.production_date = ?

        AND de.team_lead_category_id IS NOT NULL
        AND r.code = 'indexer'

        AND es.code IN (
          'reviewed',
          'locked'
        )

        AND de.reviewed_at IS NOT NULL
        AND de.reviewed_by IS NOT NULL

      GROUP BY de.team_lead_category_id
      `,
      [projectId, productionDate]
    );

    // --------------------------------------------------------
    // HISTORICAL INDEXER CATEGORY MAPPINGS
    // --------------------------------------------------------

    const [mappedIndexerDailyRows] = await db.query(
      `
      SELECT

        tlEntry.category_id,

        COALESCE(
          SUM(idx.docs_completed),
          0
        ) AS completed,

        COALESCE(
          SUM(idx.batches_processed),
          0
        ) AS batchesProcessed

      FROM daily_entry tlEntry

      JOIN users leadUser
        ON leadUser.user_id = tlEntry.user_id

      JOIN role leadRole
        ON leadRole.role_id = leadUser.role_id
        AND leadRole.code IN (
          'teamLead',
          'team_lead',
          'lead'
        )

      JOIN daily_entry_indexer_category mapping
        ON mapping.entry_id = tlEntry.entry_id

      JOIN daily_entry idx
        ON idx.project_id = tlEntry.project_id
        AND idx.production_date = tlEntry.production_date
        AND idx.category_id = mapping.category_id
        AND idx.team_lead_category_id IS NULL

      JOIN users indexerUser
        ON indexerUser.user_id = idx.user_id

      JOIN role indexerRole
        ON indexerRole.role_id = indexerUser.role_id
        AND indexerRole.code = 'indexer'

      JOIN entry_status idxStatus
        ON idxStatus.status_id = idx.status_id
        AND idxStatus.code IN ('reviewed', 'locked')
        AND idx.reviewed_at IS NOT NULL
        AND idx.reviewed_by IS NOT NULL

      JOIN entry_status leadStatus
        ON leadStatus.status_id = tlEntry.status_id
        AND leadStatus.code IN (
          'submitted',
          'reviewed',
          'locked'
        )

      WHERE tlEntry.project_id = ?
        AND tlEntry.production_date = ?

      GROUP BY tlEntry.category_id
      `,
      [projectId, productionDate]
    );

    // --------------------------------------------------------
    // CATEGORY-WISE TEAM LEAD MANUAL COUNTS
    //
    // Only submitted, reviewed or locked Team Lead entries
    // provide final manual counts.
    //
    // Draft records are not included.
    // --------------------------------------------------------

    const [categoryDailyRows] = await db.query(
      `
      SELECT

        de.category_id,

        SUM(
          CASE
            WHEN r.code IN (
              'teamLead',
              'team_lead',
              'lead'
            )
              AND de.submitted_at IS NOT NULL

            THEN de.team_lead_docs_completed
            ELSE NULL
          END
        ) AS manualCompleted,

        COALESCE(
          SUM(
            CASE
              WHEN r.code IN (
                'teamLead',
                'team_lead',
                'lead'
              )
                AND de.submitted_at IS NOT NULL

              THEN de.extracted_documents
              ELSE 0
            END
          ),
          0
        ) AS extractedDocuments,

        SUM(
          CASE
            WHEN r.code IN (
              'teamLead',
              'team_lead',
              'lead'
            )
              AND de.submitted_at IS NOT NULL

            THEN de.team_lead_batches_processed
            ELSE NULL
          END
        ) AS manualBatchesProcessed,

        COALESCE(
          SUM(
            CASE
              WHEN r.code IN (
                'teamLead',
                'team_lead',
                'lead'
              )
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
                AND de.reviewed_at IS NOT NULL
                AND de.reviewed_by IS NOT NULL

              THEN de.docs_completed
              ELSE 0
            END
          ),
          0
        ) AS completed,

        COALESCE(
          SUM(
            CASE
              WHEN r.code IN (
                'teamLead',
                'team_lead',
                'lead'
              )
              THEN de.batches_received
              ELSE 0
            END
          ),
          0
        ) AS batchesReceived,

        COALESCE(
          SUM(
            CASE
              WHEN r.code = 'indexer'
                AND es.code IN ('reviewed', 'locked')
                AND de.reviewed_at IS NOT NULL
                AND de.reviewed_by IS NOT NULL

              THEN de.batches_processed
              ELSE 0
            END
          ),
          0
        ) AS batchesProcessed,

        COALESCE(
          SUM(
            CASE
              WHEN r.code IN (
                'teamLead',
                'team_lead',
                'lead'
              )
              THEN de.docs_pending
              ELSE 0
            END
          ),
          0
        ) AS documentsPending,

        COALESCE(
          SUM(
            CASE
              WHEN r.code IN (
                'teamLead',
                'team_lead',
                'lead'
              )
              THEN de.batches_pending
              ELSE 0
            END
          ),
          0
        ) AS batchesPending

      FROM daily_entry de

      JOIN users u
        ON u.user_id = de.user_id

      JOIN role r
        ON r.role_id = u.role_id

      JOIN entry_status es
        ON es.status_id = de.status_id

      WHERE de.project_id = ?
        AND de.production_date = ?

        AND es.code IN (
          'submitted',
          'reviewed',
          'locked'
        )

      GROUP BY de.category_id
      `,
      [projectId, productionDate]
    );

    // --------------------------------------------------------
    // PREVIOUS PRODUCTION TOTALS BY CATEGORY
    // --------------------------------------------------------

    const [categoryPreviousRows] = await db.query(
      `
      SELECT

        de.production_date,
        de.category_id,

        COALESCE(
          SUM(
            CASE
              WHEN r.code IN (
                'teamLead',
                'team_lead',
                'lead'
              )
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
                AND de.reviewed_at IS NOT NULL
                AND de.reviewed_by IS NOT NULL

              THEN de.docs_completed
              ELSE 0
            END
          ),
          0
        ) AS completed,

        COALESCE(
          SUM(
            CASE
              WHEN r.code IN (
                'teamLead',
                'team_lead',
                'lead'
              )
              THEN de.batches_received
              ELSE 0
            END
          ),
          0
        ) AS batchesReceived,

        COALESCE(
          SUM(
            CASE
              WHEN r.code = 'indexer'
                AND es.code IN ('reviewed', 'locked')
                AND de.reviewed_at IS NOT NULL
                AND de.reviewed_by IS NOT NULL

              THEN de.batches_processed
              ELSE 0
            END
          ),
          0
        ) AS batchesProcessed

      FROM daily_entry de

      JOIN users u
        ON u.user_id = de.user_id

      JOIN role r
        ON r.role_id = u.role_id

      JOIN entry_status es
        ON es.status_id = de.status_id

      WHERE de.project_id = ?
        AND de.production_date >= ?
        AND de.production_date < ?

        AND es.code IN (
          'submitted',
          'reviewed',
          'locked'
        )

      GROUP BY
        de.production_date,
        de.category_id

      ORDER BY
        de.production_date ASC,
        de.category_id ASC
      `,
      [
        projectId,
        backlogWorkflowStartDate,
        productionDate,
      ]
    );

    const previousReceived = Number(
      previousRows[0]?.received || 0
    );

    const previousCompleted = Number(
      previousRows[0]?.completed || 0
    );

    const previousBacklog = previousDayPending;

    const received = Number(
      rows[0]?.received || 0
    );

    const useManualCounts =
      productionDate >= MANUAL_COUNTS_FROM;

    const extractedDocuments = useManualCounts
      ? Number(rows[0]?.extractedDocuments || 0)
      : 0;

    // ========================================================
    // BUILD PROJECT DAILY SUMMARY FOR EACH REPORTING CATEGORY
    // ========================================================

    const categorySummaries = projectCategories

      .filter(
        (category) => category.category_id !== null
      )

      .map((category) => {
        const categoryId = Number(
          category.category_id
        );

        const daily = categoryDailyRows.find(
          (row) =>
            Number(row.category_id) === categoryId
        );

        const previousEntries =
          categoryPreviousRows.filter(
            (row) =>
              Number(row.category_id) === categoryId
          );

        const mappedIndexer =
          mappedIndexerDailyRows.find(
            (row) =>
              Number(row.category_id) === categoryId
          );

        const directIndexer =
          directIndexerDailyRows.find(
            (row) =>
              Number(row.category_id) === categoryId
          );

        const categoryReceived = Number(
          daily?.received || 0
        );

        const batchesReceived = Number(
          daily?.batchesReceived || 0
        );

        // ====================================================
        // MAIN FIX — REVIEWED INDEXER PREVIEW
        // ====================================================

        // Calculate reviewed Indexer documents independently
        // from Team Lead's manual entry.

        const reviewedCompleted =
          Number(directIndexer?.completed || 0) +
          Number(mappedIndexer?.completed || 0);

        // Calculate reviewed Indexer processed batches.

        const reviewedBatchesProcessed =
          Number(directIndexer?.batchesProcessed || 0) +
          Number(mappedIndexer?.batchesProcessed || 0);

        // Has Team Lead submitted a manual document count?
        // NULL means not submitted.
        // Zero is a valid submitted count.

        const hasManualCompleted =
          useManualCounts &&
          daily?.manualCompleted != null;

        // Has Team Lead submitted a manual batch count?

        const hasManualBatches =
          useManualCounts &&
          daily?.manualBatchesProcessed != null;

        // Before Team Lead submission:
        // Display reviewed Indexer completed documents.
        //
        // After Team Lead submission:
        // Display final manually submitted count.

        const categoryCompleted = hasManualCompleted
          ? Number(daily.manualCompleted)
          : reviewedCompleted;

        // Extracted documents are always reported manually
        // by the Team Lead.

        const categoryExtractedDocuments = useManualCounts
          ? Number(daily?.extractedDocuments || 0)
          : 0;

        // Before Team Lead submission:
        // Display reviewed Indexer processed batches.
        //
        // After Team Lead submission:
        // Display final manually submitted batch count.

        const batchesProcessed = hasManualBatches
          ? Number(daily.manualBatchesProcessed)
          : reviewedBatchesProcessed;

        // Existing manual pending document count.

        const manualDocumentsPending = Number(
          daily?.documentsPending || 0
        );

        // Existing manual pending batch count.

        const manualBatchesPending = Number(
          daily?.batchesPending || 0
        );

        // Previous pending documents for this category.

        const previousCategoryRow =
          previousCategoryPendingRows.find(
            (row) =>
              Number(row.category_id) === categoryId
          );

        const previousBacklog = Number(
          previousCategoryRow?.pending ?? 0
        );

        const pendingBatches = manualBatchesPending;

        for (const entry of previousEntries) {
          const dayReceived = Number(
            entry.received || 0
          );

          const dayCompleted = Number(
            entry.completed || 0
          );
        }

        // Use today's completed work to reduce previous backlog.

        const backlogCompleted = Math.min(
          categoryCompleted,
          previousBacklog
        );

        const backlog = Math.max(
          previousBacklog - backlogCompleted,
          0
        );

        const todayCompleted = Math.max(
          categoryCompleted - backlogCompleted,
          0
        );

        const pending = manualDocumentsPending;

        // Return both displayed production totals and
        // reviewed Indexer counts for Team Lead reference.

        return {
          categoryId,
          categoryName: category.category_name,

          received: categoryReceived,

          completed: categoryCompleted,

          reviewedCompleted,
          reviewedBatchesProcessed,

          hasManualCompleted,
          hasManualBatches,

          extractedDocuments: categoryExtractedDocuments,

          backlog,
          pending,

          batchesReceived,
          batchesProcessed,
          pendingBatches,
        };
      });

    // ========================================================
    // CALCULATE OVERALL PROJECT TOTALS
    // ========================================================

    const completed = useManualCounts
      ? categorySummaries.reduce(
        (total, category) =>
          total + category.completed,
        0
      )
      : Number(rows[0]?.completed || 0);

    const backlogCompleted = Math.min(
      completed,
      previousBacklog
    );

    const backlog = Math.max(
      previousBacklog - backlogCompleted,
      0
    );

    const todayCompleted = Math.max(
      completed - backlogCompleted,
      0
    );

    const pending = categorySummaries.reduce(
      (total, category) =>
        total + category.pending,
      0
    );

    // ========================================================
    // FINAL PROJECT DAILY SUMMARY RESPONSE
    // ========================================================

    return res.status(200).json({
      success: true,

      projectId,
      projectName,
      productionDate,

      received,
      completed,
      extractedDocuments,

      batchesProcessed: categorySummaries.reduce(
        (total, category) =>
          total + category.batchesProcessed,
        0
      ),

      previousBacklog,
      backlogCompleted,
      backlog,
      todayCompleted,
      pending,

      categorySummaries,
    });
  } catch (error) {
    console.error(
      "Get Project Daily Summary Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to load project daily summary",
      error: error.message,
    });
  }
};

// ============================================================
// GET PROJECT INDEXER CATEGORIES
// ============================================================

const getProjectIndexerCategories = async (req, res) => {
  try {
    const projectId = Number(req.params.projectId);

    if (
      !Number.isSafeInteger(projectId) ||
      projectId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    const [categories] = await db.query(
      `
      SELECT
        rc.category_id,
        rc.name AS category_name

      FROM reporting_category rc

      INNER JOIN project_reporting_category prc
        ON prc.category_id = rc.category_id

      WHERE prc.project_id = ?
        AND rc.role_type = 'indexer'

      ORDER BY rc.name ASC
      `,
      [projectId]
    );

    return res.json({
      success: true,
      categories,
    });
  } catch (error) {
    console.error(
      "Indexer categories loading error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to load Indexer reporting categories",
    });
  }
};

// ============================================================
// EXPORT ALL DAILY ENTRY CONTROLLERS
// ============================================================


module.exports = {
  getShiftSubmissionStatus,
  createEntry,
  getMyEntries,
  updateEntry,
  getPendingTeamEntries,
  reviewEntry,
  getProjectFields,
  getProjectDailySummary,
  getProjectIndexerCategories,
  getProjectTeamLeadCategories,
};

