const db = require("../config/db");
// Returns Team Lead categories assigned to the selected project.
const getProjectTeamLeadCategories = async (req, res) => {
  try {
    const projectId = Number(req.params.projectId);

    if (!Number.isSafeInteger(projectId) || projectId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    // Ensure the project is assigned to the logged-in user.
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
        SELECT
          rc.category_id,
          rc.name
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

// Checks whether an Indexer is allowed to edit an entry based on the Admin locking rules.
const getIndexerEditPermission = async (
  executor,
  entryStatus,
  lockedAt
) => {
  // Locked entries can never be edited directly by an Indexer.
  if (lockedAt) {
    return false;
  }


  // Normalizes the workflow status before checking the configured rule.
  const statusCode = String(entryStatus || "").toLowerCase();

  // Reviewed and locked entries are not directly editable by an Indexer.
  if (!["draft", "submitted"].includes(statusCode)) {
    return false;
  }

  // Selects the app_setting key that controls the current workflow status.
  const settingKey =
    statusCode === "draft"
      ? "draft_entry_rule"
      : "submitted_entry_rule";

  // Reads the current Administrator-configured rule from the database.
  const [rules] = await executor.query(
    `
    SELECT setting_value
    FROM app_setting
    WHERE setting_key = ?
    LIMIT 1
    `,
    [settingKey]
  );

  // Uses the documented default when the setting has not been created yet.
  const defaultRule =
    statusCode === "draft"
      ? "editable_by_indexer"
      : "read_only_for_indexer";

  // Gets either the saved Admin rule or the default rule.
  const configuredRule =
    rules.length > 0
      ? rules[0].setting_value
      : defaultRule;

  // Returns true only when the Administrator permits Indexer editing.
  return configuredRule === "editable_by_indexer";
};
// Checks whether an Indexer can request a correction for a Locked entry
// according to the Administrator Locking Rules.
const getCorrectionRequestPermission = async (
  executor,
  entryStatus
) => {
  const statusCode = String(entryStatus || "").toLowerCase();

  // Correction requests apply only to Locked entries.
  if (statusCode !== "locked") {
    return false;
  }

  const [rules] = await executor.query(
    `
      SELECT setting_value
      FROM app_setting
      WHERE setting_key = 'locked_entry_rule'
      LIMIT 1
    `
  );

  const configuredRule =
    rules.length > 0
      ? rules[0].setting_value
      : "correction_request_required";

  // Allow the button only when locked entries are allowed
  // to create correction requests.
  return configuredRule === "correction_request_required";
};

// Automatically locks Reviewed entries after the project's configured Auto Lock Time and Grace Period expire.
const applyAutomaticLocks = async () => {
  let connection;

  try {
    // Gets a dedicated database connection because multiple locking queries must run together safely.
    connection = await db.getConnection();

    // Starts a transaction so entry locking and audit logging remain consistent.
    await connection.beginTransaction();

    // Gets the database status ID representing the Locked workflow state.
    const [lockedStatuses] = await connection.query(
      `
      SELECT status_id
      FROM entry_status
      WHERE code = 'locked'
      LIMIT 1
      `
    );

    // Stops safely if the Locked workflow status is not configured.
    if (lockedStatuses.length === 0) {
      await connection.rollback();
      console.error("Automatic Lock Error: locked status is not configured");
      return;
    }

    // Stores the Locked status ID for the update below.
    const lockedStatusId = lockedStatuses[0].status_id;

    // Finds Reviewed entries whose project Auto Lock Time plus Grace Period has already passed.
    const [entriesToLock] = await connection.query(
      `
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
      `
    );

    // Locks each eligible entry and records the automatic action in the audit log.
    for (const entry of entriesToLock) {
      // Changes the workflow state to Locked and records when the lock occurred.
      await connection.query(
        `
        UPDATE daily_entry
        SET status_id = ?,
            locked_at = NOW()
        WHERE entry_id = ?
          AND locked_at IS NULL
        `,
        [
          lockedStatusId,
          entry.entry_id,
        ]
      );

      // Records that the system automatically locked this production entry.
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

    // Saves all automatic lock changes together.
    await connection.commit();

    // Prints a useful backend message only when entries were actually locked.
    if (entriesToLock.length > 0) {
      console.log(
        `Automatic Lock: ${entriesToLock.length} daily entr${entriesToLock.length === 1 ? "y" : "ies"
        } locked`
      );
    }
  } catch (error) {
    // Rolls back all changes if any automatic-lock operation fails.
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

    // Logs the automatic-lock failure without crashing the application.
    console.error(
      "Automatic Daily Entry Lock Error:",
      error
    );
  } finally {
    // Returns the database connection to the pool after processing.
    if (connection) {
      connection.release();
    }
  }
};

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
      WHERE nt.code =
        'entry_submission_confirmation'
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

// Creates a new Daily Entry and saves both fixed and dynamic project field values.
const createEntry = async (req, res) => {
  // Stores the dedicated database connection used for the transaction.
  let connection;

  try {
    // Reads the Daily Entry values sent from the frontend.
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
    // Validate Indexer Reporting Categories selected by Team Lead.
    // The new workflow does not accept Indexer category mappings
    // from Team Lead Daily Entry requests.
    if (indexerCategoryIds !== undefined) {
      return res.status(400).json({
        success: false,
        message:
          "Indexer category mappings are no longer supported. Indexers select their Team Lead category directly.",
      });
    }
    // Requires the project and production date before continuing.
    if (!projectId || !productionDate) {
      return res.status(400).json({
        success: false,
        message: "Project and production date are required",
      });
    }
    // Team Lead can enter received documents; Indexer received count always remains 0.
    const received =
      req.user.role === "teamLead"
        ? Number(documentsReceived || 0)
        : 0;
    // Converts the four current production fields into numbers.
    const completed = Number(documentsCompleted || 0);
    const batchesReceivedCount =
      req.user.role === "teamLead"
        ? Number(batchesReceived ?? 0)
        : 0;
    const processed = Number(batchesProcessed || 0);
    const isTeamLead = req.user.role === "teamLead";

    const parsePending = (value) => {
      if (value === undefined || value === null || value === "") {
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

    // Validates all production numeric values, including Team Lead received count.
    const numericValues = [
      received,
      completed,
      batchesReceivedCount,
      processed,
      errors,
      pendingDocs,
      pendingBatches,
    ].filter((value) => value !== null);

    // Validates that production values are valid unsigned whole numbers.
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

    // Normalizes the Batch ID before saving it.
    const batchRef = String(batchJobId || "").trim();

    // Normalizes the optional notes before saving them.
    const remarks = String(notes || "").trim();

    // Prevents Batch ID values longer than the database column limit.
    if (batchRef.length > 60) {
      return res.status(400).json({
        success: false,
        message: "Batch ID cannot exceed 60 characters",
      });
    }

    // Prevents notes values longer than the allowed limit.
    if (remarks.length > 500) {
      return res.status(400).json({
        success: false,
        message: "Notes cannot exceed 500 characters",
      });
    }

    // Checks whether the selected project is assigned to the logged-in user.
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

    // Blocks Daily Entry creation for a project not assigned to the user.
    if (assignments.length === 0) {
      return res.status(403).json({
        success: false,
        message: "This project is not assigned to you",
      });
    }

    // Stores the reporting category ID used by daily_entry.
    let categoryId = null;

    // Resolves the reporting category when one was provided.
    if (reportingCategory) {
      // Uses the value directly when the frontend sends the category ID.
      if (!Number.isNaN(Number(reportingCategory))) {
        categoryId = Number(reportingCategory);
      } else {
        // Ensure the Team Lead is assigned to this project.
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
        // Finds the category ID when the frontend sends the category name.
        const [categories] = await db.query(
          `
          SELECT category_id
          FROM reporting_category
          WHERE name = ?
          LIMIT 1
          `,
          [reportingCategory]
        );

        // Uses the matching database category ID when found.
        categoryId =
          categories.length > 0
            ? categories[0].category_id
            : null;
      }
    }
    // Validate that the selected reporting category belongs to the project.
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

    // Validate selected Indexer categories for this project.

    // Normalizes the requested workflow status.
    const statusCode = String(
      status || "draft"
    ).toLowerCase();

    // Allows Indexers to create only Draft or Submitted entries.
    if (!["draft", "submitted"].includes(statusCode)) {
      return res.status(400).json({
        success: false,
        message:
          "You can only create draft or submitted entries",
      });
    }

    // Checks required guide acknowledgements before allowing submission.
    if (statusCode === "submitted") {
      // Loads required guides that this user has not acknowledged yet.
      const pendingGuides =
        await getPendingRequiredGuides(
          db,
          req.user.id,
          projectId
        );

      // Blocks submission until required guides are acknowledged.
      if (pendingGuides.length > 0) {
        return res.status(409).json({
          success: false,
          message:
            "Please acknowledge the required indexing guides for this project before submitting.",
          pendingGuides,
        });
      }
    }

    // Loads the database status ID matching Draft or Submitted.
    const [statuses] = await db.query(
      `
      SELECT status_id, code
      FROM entry_status
      WHERE code = ?
      LIMIT 1
      `,
      [statusCode]
    );

    // Rejects the request if the requested workflow status is not configured.
    if (statuses.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid entry status",
      });
    }

    // Stores the resolved database workflow status.
    const selectedStatus = statuses[0];

    // Gets a dedicated database connection because both tables must save together.
    connection = await db.getConnection();

    // Starts a transaction for daily_entry and daily_entry_value.
    await connection.beginTransaction();
    // Serialize Daily Entry creation for the same project.

    // Validate the Team Lead category selected by the Indexer.
    if (req.user.role === "indexer") {
      const selectedTeamLeadCategoryId = Number(teamLeadCategoryId);

      if (
        !Number.isInteger(selectedTeamLeadCategoryId) ||
        selectedTeamLeadCategoryId <= 0
      ) {
        const error = new Error("Please select a Team Lead category");
        error.httpStatus = 400;
        throw error;
      }

      const [validTeamLeadCategories] = await connection.query(
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
        [Number(projectId), selectedTeamLeadCategoryId]
      );

      if (validTeamLeadCategories.length === 0) {
        const error = new Error(
          "Invalid Team Lead category for the selected project"
        );
        error.httpStatus = 400;
        throw error;
      }
    }
    // Creates the main Daily Entry using the existing fixed columns.
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
        docs_pending,
        batches_received,
        batches_processed,
        batches_pending,
        errors_flagged,
        remarks,
        status_id,
        submitted_at
      )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        pendingDocs,
        batchesReceivedCount,
        processed,
        pendingBatches,
        errors,
        remarks || null,
        selectedStatus.status_id,
        selectedStatus.code === "submitted" ? new Date() : null,
      ]
    );

    // Stores the newly created Daily Entry ID.
    const entryId = result.insertId;

    // Loads all configured dynamic fields for the selected project.
    const [projectFields] = await connection.query(
      `
      SELECT
        field_id,
        field_key,
        data_type

      FROM project_field

      WHERE project_id = ?

      ORDER BY
        sort_order ASC,
        field_id ASC
      `,
      [Number(projectId)]
    );

    // Maps the existing request properties to project_field.field_key values.
    const dynamicValues = {
      documents_received: received,
      documents_completed: completed,
      batches_processed: processed,
      errors_flagged: errors,
    };

    // Saves every matching configured field into daily_entry_value.
    for (const field of projectFields) {
      // Gets the submitted value matching this configured field key.
      const fieldValue =
        dynamicValues[field.field_key];

      // Skips fields not yet supported by the current frontend request.
      if (fieldValue === undefined) {
        continue;
      }

      // Stores numeric project fields in value_num.
      if (
        ["int", "decimal"].includes(
          field.data_type
        )
      ) {
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
          [
            entryId,
            field.field_id,
            fieldValue,
          ]
        );
      } else {
        // Stores text and date project fields in value_txt.
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
          [
            entryId,
            field.field_id,
            String(fieldValue),
          ]
        );
      }
    }

    // Commits the main entry and all dynamic values together.
    await connection.commit();

    // Sends the existing notification after a successful submitted entry.
    if (selectedStatus.code === "submitted") {
      await sendEntrySubmissionNotification(
        db,
        req.user.id,
        entryId
      );
    }

    // Returns the same response format currently expected by the frontend.
    return res.status(201).json({
      success: true,
      message:
        selectedStatus.code === "submitted"
          ? "Daily entry submitted successfully"
          : "Daily entry draft saved successfully",
      entryId,
    });
  } catch (error) {
    // Rolls back the transaction when a database operation fails.
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        // Logs rollback errors separately for debugging.
        console.error(
          "Create Daily Entry Rollback Error:",
          rollbackError
        );
      }
    }

    // Logs the original Daily Entry creation error.
    console.error(
      "Create Daily Entry Error:",
      error
    );

    // Handles the existing duplicate Daily Entry database constraint.
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message:
          "An entry already exists for this project, date and batch",
      });
    }

    // Returns a safe response for other database/server failures.
    // Return controlled validation errors with the correct HTTP status.
    if (error.httpStatus) {
      return res.status(error.httpStatus).json({
        success: false,
        message: error.message,
      });
    }

    // Return a safe response for unexpected server errors.
    return res.status(500).json({
      success: false,
      message: "Failed to create daily entry",
    });
  } finally {
    // Always returns the dedicated connection to the MySQL connection pool.
    if (connection) {
      connection.release();
    }
  }
};

// ============================================================
// GET MY DAILY ENTRIES
// ============================================================

// Loads all Daily Entries created by the currently logged-in user together with dynamic project field values.
const getMyEntries = async (req, res) => {
  try {
    // Gets the currently logged-in user's database ID.
    const userId = req.user.id;

    // Loads the user's Daily Entries together with the existing fixed production fields.
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

        CONCAT_WS(' / ', tlrc.name, rc.name) AS reporting_category,

        de.team_lead_category_id AS teamLeadCategoryId,

        de.docs_received AS documents_received,
        de.docs_completed AS documents_completed,
        de.docs_pending AS documents_pending,
        de.batches_received,
        de.batches_processed,
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

    // Returns an empty list immediately when the user has no Daily Entries.
    if (entries.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        entries: [],
      });
    }

    // Collects all Daily Entry IDs so dynamic values can be loaded in one database query.
    const entryIds = entries.map(
      (entry) => entry.entry_id
    );
    // Load selected Indexer Reporting Categories for Daily Entries.
    const [indexerCategoryRows] = await db.query(
      `
    SELECT
      deic.entry_id,
      deic.category_id
    FROM daily_entry_indexer_category deic

    JOIN daily_entry de
      ON de.entry_id = deic.entry_id

    WHERE de.user_id = ?

    ORDER BY deic.category_id ASC
  `,
      [userId]
    );

    // Group selected Indexer category IDs by Daily Entry.
    const indexerCategoriesByEntry = {};

    for (const row of indexerCategoryRows) {
      if (!indexerCategoriesByEntry[row.entry_id]) {
        indexerCategoriesByEntry[row.entry_id] = [];
      }

      indexerCategoriesByEntry[row.entry_id].push(
        Number(row.category_id)
      );
    }

    // Creates SQL placeholders matching the number of Daily Entry IDs.
    const entryPlaceholders = entryIds
      .map(() => "?")
      .join(", ");

    // Loads project field definitions together with the values saved for each Daily Entry.
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

    // Creates a lookup object where each Daily Entry ID points to its dynamic field records.
    const dynamicFieldsByEntry = {};

    // Processes every dynamic field value returned from the database.
    for (const row of dynamicRows) {
      // Creates an array for this Daily Entry the first time it is encountered.
      if (!dynamicFieldsByEntry[row.entry_id]) {
        dynamicFieldsByEntry[row.entry_id] = [];
      }

      // Determines the correct value column according to the configured field type.
      let fieldValue = null;

      // Numeric project fields are stored in value_num.
      if (
        ["int", "decimal"].includes(
          row.data_type
        )
      ) {
        fieldValue =
          row.value_num === null
            ? null
            : Number(row.value_num);
      } else {
        // Text and date project fields are stored in value_txt.
        fieldValue = row.value_txt;
      }

      // Adds the complete dynamic field definition and value to this Daily Entry.
      dynamicFieldsByEntry[row.entry_id].push({
        field_id: row.field_id,
        project_id: row.project_id,
        field_key: row.field_key,
        label: row.label,
        data_type: row.data_type,

        // Converts the MySQL TINYINT value into a JavaScript boolean.
        is_mandatory: Boolean(
          row.is_mandatory
        ),

        // Converts the database sort order into a normal JavaScript number.
        sort_order: Number(
          row.sort_order
        ),

        // Returns the actual value entered by the user.
        value: fieldValue,
      });
    }

    // Adds dynamic values and edit permissions to every Daily Entry.
    const entriesWithPermissions =
      await Promise.all(
        entries.map(async (entry) => {
          // Gets this Daily Entry's dynamic field records.
          const dynamicFields =
            dynamicFieldsByEntry[
            entry.entry_id
            ] || [];

          // Creates a simpler object such as { documents_received: 100 } for easy frontend access.
          const dynamicValues =
            dynamicFields.reduce(
              (values, field) => {
                values[field.field_key] =
                  field.value;

                return values;
              },
              {}
            );

          // Returns the existing Daily Entry properties together with dynamic field data.
          return {
            ...entry,


            indexerCategoryIds:
              indexerCategoriesByEntry[entry.entry_id] || [],

            // Returns detailed field metadata required for fully dynamic forms later.
            dynamic_fields: dynamicFields,


            // Returns a convenient key/value representation for frontend use.
            dynamic_values:
              dynamicValues,

            // Keeps the existing backend-controlled edit permission.
            canEdit:
              await getIndexerEditPermission(
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

    // Returns all Daily Entries together with fixed and dynamic values.
    return res.status(200).json({
      success: true,
      count:
        entriesWithPermissions.length,
      entries:
        entriesWithPermissions,
    });
  } catch (error) {
    // Logs the full database error for backend debugging.
    console.error(
      "Get Daily Entries Error:",
      error
    );

    // Returns a safe API error response.
    return res.status(500).json({
      success: false,
      message:
        "Failed to load daily entries",
      error: error.message,
    });
  }
};

// ============================================================
// UPDATE DAILY ENTRY
// ============================================================

// Updates an existing Daily Entry and keeps daily_entry_value synchronized.
const updateEntry = async (req, res) => {
  // Stores the dedicated database connection used for this transaction.
  let connection;

  try {
    // Converts the Daily Entry ID from the URL into a number.
    const entryId = Number(req.params.id);

    // Gets the currently logged-in user's database ID.
    const userId = req.user.id;

    // Reads the Daily Entry values sent by the frontend.
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
    // Validate Indexer Reporting Categories during Daily Entry update.
    // Reject legacy Indexer category mappings in new update requests.
    if (indexerCategoryIds !== undefined) {
      return res.status(400).json({
        success: false,
        message:
          "Indexer category mappings are no longer supported. Indexers select their Team Lead category directly.",
      });
    }
    // Converts the selected project ID into a number.
    const selectedProjectId = Number(projectId);
    // Stores the reporting category ID selected by the Team Lead.
    let categoryId = null;

    // Resolves the reporting category name or ID from the frontend.
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

    // Normalizes the requested workflow status.
    const statusCode = String(status).toLowerCase();
    const parsePending = (value) => {
      if (value === undefined || value === null || value === "") {
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
    // Documents received is no longer entered by the Indexer.
    // Team Lead can update received documents; Indexer received count always remains 0.
    const received =
      req.user.role === "teamLead"
        ? Number(documentsReceived || 0)
        : 0;
    // Converts the four current production fields into numbers.
    const numbers = [
      received,
      documentsCompleted,
      req.user.role === "teamLead" ? batchesReceived : 0,
      batchesProcessed,
      errorsFlagged,
    ].map((value) => Number(value ?? 0));

    // Stores the normalized production values for easier use below.
    const [
      validatedReceived,
      completed,
      batchesReceivedCount,
      processed,
      errors,
    ] = numbers;

    // Validates that the production date uses YYYY-MM-DD format.
    const validDate =
      typeof productionDate === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(productionDate) &&
      Number.isFinite(Date.parse(productionDate)) &&
      new Date(productionDate)
        .toISOString()
        .slice(0, 10) === productionDate;

    // Validates the entry ID, project ID, and production date.
    if (
      !Number.isSafeInteger(entryId) ||
      entryId <= 0 ||
      !Number.isSafeInteger(selectedProjectId) ||
      selectedProjectId <= 0 ||
      !validDate
    ) {
      return res.status(400).json({
        success: false,
        message:
          "A valid entry ID, project and date are required",
      });
    }

    // Validates that all production values are non-negative whole numbers.
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

    // Allows only Draft and Submitted workflow states from this edit API.
    if (!["draft", "submitted"].includes(statusCode)) {
      return res.status(400).json({
        success: false,
        message:
          "A draft can only be saved or submitted",
      });
    }

    // Normalizes the Batch ID before saving it.
    const batchRef = String(batchJobId ?? "").trim();

    // Normalizes the optional notes before saving them.
    const remarks = String(notes ?? "").trim();

    // Validates Batch ID and Notes against their allowed limits.
    if (
      batchRef.length > 60 ||
      remarks.length > 500
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Batch ID allows 60 characters; notes allow 500",
      });
    }

    // Gets a dedicated database connection because all updates must happen together.
    connection = await db.getConnection();

    // Starts a transaction for both fixed and dynamic Daily Entry values.
    await connection.beginTransaction();

    // Creates a helper for returning controlled HTTP errors from inside the transaction.
    const reject = (httpStatus, message) => {
      throw Object.assign(
        new Error(message),
        { httpStatus }
      );
    };

    // Locks the existing Daily Entry while checking permissions and updating it.

    // Locks the existing Daily Entry while checking permissions and updating it.
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
      [
        entryId,
        userId,
      ]
    );

    // Returns 404 if this Daily Entry does not belong to the logged-in user.
    if (!entries.length) {
      reject(
        404,
        "Entry not found"
      );
    }


    // Stores the current database Daily Entry.
    const entry = entries[0];
    // Restricts Team Leader editing to Draft and Submitted entries.
    if (req.user.role === "teamLead") {
      // Rejects edits to Reviewed, Locked, or otherwise locked entries.
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

      // Prevents a Submitted entry from being changed back to Draft.
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

    // Checks whether the current Administrator locking rule permits editing.
    // Applies Indexer edit restrictions only to Indexer entries.
    // Team Leads can edit their own Draft entry before submitting it.
    if (req.user.role === "indexer") {
      const canEditEntry =
        await getIndexerEditPermission(
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

    // Checks that the selected project is active and assigned to this user.
    const [projects] = await connection.query(
      `
      SELECT
        p.category_id

      FROM project_assignment pa

      JOIN project p
        ON p.project_id = pa.project_id

      WHERE pa.user_id = ?
        AND pa.project_id = ?
        AND p.status = 'active'
      `,
      [
        userId,
        selectedProjectId,
      ]
    );

    // Prevents the user from moving an entry to an unassigned project.
    if (!projects.length) {
      reject(
        403,
        "This active project is not assigned to you"
      );
    }
    // Validate the Team Lead category selected by the Indexer.
    if (req.user.role === "indexer") {
      const selectedTeamLeadCategoryId = Number(teamLeadCategoryId);

      if (
        !Number.isSafeInteger(selectedTeamLeadCategoryId) ||
        selectedTeamLeadCategoryId <= 0
      ) {
        reject(400, "Please select a category");
      }

      const [validTeamLeadCategories] = await connection.query(
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
        [selectedProjectId, selectedTeamLeadCategoryId]
      );

      if (validTeamLeadCategories.length === 0) {
        reject(400, "Invalid category for the selected project");
      }
    }
    // Validate that the selected reporting category belongs to the project.
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
    // Checks mandatory guide acknowledgement before submitting the edited entry.
    if (statusCode === "submitted") {
      // Loads required guides still pending acknowledgement.
      const pendingGuides =
        await getPendingRequiredGuides(
          connection,
          userId,
          selectedProjectId
        );

      // Prevents submission when mandatory guides are still pending.
      if (pendingGuides.length > 0) {
        reject(
          409,
          "Please acknowledge the required indexing guides for this project before submitting."
        );
      }
    }

    // Loads the database workflow status ID.
    const [statuses] = await connection.query(
      `
      SELECT status_id
      FROM entry_status
      WHERE code = ?
      LIMIT 1
      `,
      [statusCode]
    );

    // Stops when the requested workflow state is not configured.
    if (!statuses.length) {
      reject(
        400,
        "Entry status is not configured"
      );
    }

    // Updates the existing fixed Daily Entry columns.
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
        docs_pending = ?,
        batches_received = ?,
        batches_processed = ?,
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
        pendingDocs,
        batchesReceivedCount,
        processed,
        pendingBatches,
        errors,
        remarks || null,
        statuses[0].status_id,

        // Records the current time when this edit submits the entry.
        statusCode === "submitted"
          ? String(entry.status).toLowerCase() === "submitted"
            ? entry.submitted_at
            : new Date()
          : null,

        entryId,
        userId,
      ]
    );
    // Loads all project fields configured for the newly selected project.
    const [projectFields] = await connection.query(
      `
      SELECT
        field_id,
        field_key,
        data_type

      FROM project_field

      WHERE project_id = ?

      ORDER BY
        sort_order ASC,
        field_id ASC
      `,
      [selectedProjectId]
    );

    // Maps the current request properties to project_field.field_key values.
    const dynamicValues = {
      documents_received: received,
      documents_completed: completed,
      batches_processed: processed,
      errors_flagged: errors,
    };

    // If the project changed, removes old dynamic values from the previous project fields.
    if (
      Number(entry.project_id) !==
      selectedProjectId
    ) {
      await connection.query(
        `
        DELETE FROM daily_entry_value
        WHERE entry_id = ?
        `,
        [entryId]
      );
    }

    // Inserts or updates each matching project-specific value.
    for (const field of projectFields) {
      // Gets the value matching this configured field key.
      const fieldValue =
        dynamicValues[field.field_key];

      // Skips project fields that are not yet supplied by the current frontend.
      if (fieldValue === undefined) {
        continue;
      }

      // Stores numeric project fields in value_num.
      if (
        ["int", "decimal"].includes(
          field.data_type
        )
      ) {
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
          [
            entryId,
            field.field_id,
            fieldValue,
          ]
        );
      } else {
        // Stores text/date project fields in value_txt.
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
          [
            entryId,
            field.field_id,
            String(fieldValue),
          ]
        );
      }
    }

    // Records the Daily Entry update in the existing audit log.
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

        // Uses the existing audit action depending on the new workflow state.
        statusCode === "submitted"
          ? "Submitted draft"
          : "Updated draft",

        String(entryId),

        // Records the resulting workflow state for audit visibility.
        `Entry ${entryId} saved with status ${statusCode}`,
      ]
    );

    // Commits fixed values, dynamic values, and audit logging together.
    await connection.commit();

    // Sends the existing submission notification after the transaction succeeds.
    if (statusCode === "submitted") {
      await sendEntrySubmissionNotification(
        db,
        userId,
        entryId
      );
    }

    // Returns the existing API response shape.
    return res.json({
      success: true,
      message:
        statusCode === "submitted"
          ? "Draft submitted successfully"
          : "Draft updated successfully",
      entryId,
    });
  } catch (error) {
    // Rolls back all transaction changes when any operation fails.
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        // Logs rollback failure separately without hiding the main error.
        console.error(
          "Update Daily Entry Rollback Error:",
          rollbackError
        );
      }
    }

    // Logs the original update error for backend debugging.
    console.error(
      "Update Daily Entry Error:",
      error
    );

    // Returns either duplicate, controlled validation, or server error status.
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
    // Always releases the dedicated MySQL connection back to the pool.
    if (connection) {
      connection.release();
    }
  }
};

const getPendingTeamEntries = async (req, res) => {
  try {
    const teamLeadId = req.user.id;

    const [entries] = await db.query(
      `
      SELECT
        de.entry_id AS id,
        de.entry_id,
        DATE_FORMAT(
          de.production_date, '%Y-%m-%d'
        ) AS production_date,
        de.batch_ref AS batch_job_id,

        u.user_id AS employee_id,
        u.emp_code AS employee_code,
        u.full_name AS employee_name,

        p.project_id,
        p.project_name,
        CONCAT_WS(' / ', tlrc.name, rc.name) AS reporting_category,

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

      ORDER BY de.submitted_at ASC, de.entry_id ASC
      `,
      [teamLeadId, teamLeadId, teamLeadId]
    );

    return res.status(200).json({
      success: true,
      count: entries.length,
      entries,
    });
  } catch (error) {
    console.error("Get Pending Team Entries Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load submitted team entries",
    });
  }
};

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

    if (!Number.isSafeInteger(entryId) || entryId <= 0) {
      return res.status(400).json({
        success: false,
        message: "A valid entry ID is required",
      });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    const reject = (httpStatus, message) => {
      throw Object.assign(new Error(message), { httpStatus });
    };

    // Lock the entry and check the same access rules as the pending list.
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
      [entryId, teamLeadId, teamLeadId, teamLeadId]
    );

    if (entries.length === 0) {
      reject(404, "Team entry not found or not accessible");
    }

    const entry = entries[0];

    if (entry.status !== "submitted" || entry.locked_at !== null) {
      reject(409, "Only an unlocked submitted entry can be reviewed");
    }

    const [statuses] = await connection.query(
      `
      SELECT status_id
      FROM entry_status
      WHERE code = 'reviewed'
      LIMIT 1
      `
    );

    if (statuses.length === 0) {
      reject(500, "Reviewed status is not configured");
    }

    const [result] = await connection.query(
      `
      UPDATE daily_entry
      SET status_id = ?,
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
      reject(409, "Entry changed. Refresh the list and try again");
    }

    await connection.query(
      `
      INSERT INTO audit_log
        (user_id, action, entity_type, entity_ref, detail)
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
        console.error("Review rollback error:", rollbackError);
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
    if (connection) connection.release();
  }
};
// Runs the automatic locking check once when the backend starts.
applyAutomaticLocks();

// Checks every 60 seconds for Reviewed entries whose locking deadline has expired.
setInterval(() => {
  applyAutomaticLocks();
}, 60 * 1000);

// ============================================================
// GET DAILY ENTRY PROJECT FIELDS
// ============================================================

// Loads the configured Daily Entry fields for a project assigned to the logged-in user.
const getProjectFields = async (req, res) => {
  try {
    // Converts the project ID from the URL into a number.
    const projectId = Number(req.params.projectId);

    // Rejects an invalid project ID before querying the database.
    if (!Number.isSafeInteger(projectId) || projectId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    // Checks that the selected project is active and assigned to the logged-in user.
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

    // Blocks access when the project is not assigned to the current user.
    if (projects.length === 0) {
      return res.status(403).json({
        success: false,
        message: "This active project is not assigned to you",
      });
    }

    // Loads all fields configured for the selected project.
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

    // Formats database field values for the frontend.
    const formattedFields = fields.map((field) => ({
      id: field.id,
      project_id: field.project_id,
      field_key: field.field_key,
      label: field.label,
      data_type: field.data_type,

      // Converts MySQL TINYINT into a normal JavaScript boolean.
      is_mandatory: Boolean(field.is_mandatory),

      sort_order: Number(field.sort_order),
    }));

    // Returns the selected project and its configured Daily Entry fields.
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
    // Logs the complete database error for backend debugging.
    console.error(
      "Get Daily Entry Project Fields Error:",
      error
    );

    // Returns a safe API error response.
    return res.status(500).json({
      success: false,
      message: "Failed to load project fields",
      error: error.message,
    });
  }
};

// ============================================================
// GET PROJECT DAILY PRODUCTION SUMMARY
// ============================================================

// Calculates Received, Completed and Pending for one project and production date.
const getProjectDailySummary = async (req, res) => {
  try {
    // Reads the project and production date from the request.
    const projectId = Number(req.params.projectId);
    const productionDate = req.query.date;

    // Validates the required project and date.
    if (
      !Number.isSafeInteger(projectId) ||
      projectId <= 0 ||
      !productionDate
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid project ID and production date are required",
      });
    }
    // Team Leads can view the summary only for projects directly assigned to them.
    if (req.user.role === "teamLead") {
      const [assignments] = await db.query(
        `
      SELECT assignment_id
      FROM project_assignment
      WHERE user_id = ?
        AND project_id = ?
      LIMIT 1
    `,
        [
          req.user.id,
          projectId,
        ]
      );

      // Blocks access when the requested project is not assigned to this Team Lead.
      if (assignments.length === 0) {
        return res.status(403).json({
          success: false,
          message: "This project is not assigned to you",
        });
      }
    }
    // Load the selected project and all assigned Reporting Categories.
    // Load the project and its assigned Team Lead Reporting Categories.
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

    const projectName = projectCategories[0].project_name;
    // Get the most recent previous production date
    // and its manually entered pending documents.
    const [previousPendingRows] = await db.query(
      `
  SELECT
    de.production_date,
    SUM(de.docs_pending) AS previousPending
  FROM daily_entry de
  JOIN users u ON u.user_id = de.user_id
  JOIN role r ON r.role_id = u.role_id
  JOIN entry_status es ON es.status_id = de.status_id
  WHERE de.project_id = ?
    AND de.production_date < ?
    AND de.production_date >= ?
    AND r.code IN ('teamLead', 'team_lead', 'lead')
    AND es.code IN ('submitted', 'reviewed', 'locked')
    AND de.docs_pending IS NOT NULL
  GROUP BY de.production_date
  ORDER BY de.production_date DESC
  LIMIT 1
  `,
      [projectId, productionDate, "2026-10-05"]
    );

    const previousDayPending = Number(
      previousPendingRows[0]?.previousPending ?? 0
    );
    const [previousCategoryPendingRows] = await db.query(
      `
  SELECT
    de.category_id,
    COALESCE(SUM(de.docs_pending), 0) AS pending
  FROM daily_entry de
  JOIN users u ON u.user_id = de.user_id
  JOIN role r ON r.role_id = u.role_id
  JOIN entry_status es ON es.status_id = de.status_id
  WHERE de.project_id = ?
    AND de.production_date = ?
    AND r.code IN ('teamLead', 'team_lead', 'lead')
    AND es.code IN ('submitted', 'reviewed', 'locked')
    AND de.docs_pending IS NOT NULL
  GROUP BY de.category_id
  `,
      [projectId, previousPendingRows[0]?.production_date ?? null]
    );
    // Defines when the new Team Lead Received + Indexer Completed backlog workflow starts.
    const backlogWorkflowStartDate = "2026-10-05";
    // Calculates all received and completed work before the selected production date.
    const [previousRows] = await db.query(
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

    JOIN users u
      ON u.user_id = de.user_id

    JOIN role r
      ON r.role_id = u.role_id

    JOIN entry_status es
      ON es.status_id = de.status_id

    WHERE de.project_id = ?
      AND de.production_date >= ?
      AND de.production_date < ?
      AND es.code IN ('submitted', 'reviewed', 'locked')
  `,
      [
        projectId,
        backlogWorkflowStartDate,
        productionDate,
      ]
    );

    // Calculates the Team Lead received count and total Indexer completed count.
    const [rows] = await db.query(
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

        JOIN users u
          ON u.user_id = de.user_id

        JOIN role r
          ON r.role_id = u.role_id
        JOIN entry_status es
           ON es.status_id = de.status_id

       WHERE de.project_id = ?
         AND de.production_date = ?
         AND es.code IN ('submitted', 'reviewed', 'locked')
      `,
      [
        projectId,
        productionDate,
      ]
    );
    // Calculate Indexer totals using the Team Lead category
    // selected directly by the Indexer.
    const [directIndexerDailyRows] = await db.query(
      `
    SELECT
      de.team_lead_category_id AS category_id,
      COALESCE(SUM(de.docs_completed), 0) AS completed,
      COALESCE(SUM(de.batches_processed), 0) AS batchesProcessed

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
     AND es.code IN ('submitted', 'reviewed', 'locked')

    GROUP BY de.team_lead_category_id
  `,
      [projectId, productionDate]
    );

    // Calculate reviewed/locked Indexer totals for each Team Lead category.
    // Calculate reviewed/locked Indexer totals for each Team Lead category.
    const [mappedIndexerDailyRows] = await db.query(
      `
    SELECT
      tlEntry.category_id,

      COALESCE(SUM(idx.docs_completed), 0) AS completed,
      COALESCE(SUM(idx.batches_processed), 0) AS batchesProcessed

    FROM daily_entry tlEntry

    JOIN users leadUser
      ON leadUser.user_id = tlEntry.user_id

    JOIN role leadRole
      ON leadRole.role_id = leadUser.role_id
      AND leadRole.code IN ('teamLead', 'team_lead', 'lead')

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
      AND idxStatus.code IN ('submitted', 'reviewed', 'locked')

    JOIN entry_status leadStatus
      ON leadStatus.status_id = tlEntry.status_id
      AND leadStatus.code IN ('submitted', 'reviewed', 'locked')

    WHERE tlEntry.project_id = ?
      AND tlEntry.production_date = ?

    GROUP BY tlEntry.category_id
  `,
      [projectId, productionDate]
    );
    // Calculate today's Received and Completed for each Reporting Category.
    const [categoryDailyRows] = await db.query(
      `
    SELECT
      de.category_id,

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
             ) AS completed,

        COALESCE(
          SUM(
            CASE
              WHEN r.code IN ('teamLead', 'team_lead', 'lead')
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
              THEN de.batches_processed
              ELSE 0
            END
          ),
          0
      ) AS batchesProcessed,

COALESCE(
  SUM(
    CASE
      WHEN r.code IN ('teamLead', 'team_lead', 'lead')
      THEN de.docs_pending
      ELSE 0
    END
  ),
  0
) AS documentsPending,

COALESCE(
  SUM(
    CASE
      WHEN r.code IN ('teamLead', 'team_lead', 'lead')
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
      AND es.code IN ('submitted', 'reviewed', 'locked')

    GROUP BY de.category_id
  `,
      [projectId, productionDate]
    );
    // Calculate previous Received and Completed for each Reporting Category.
    const [categoryPreviousRows] = await db.query(
      `
    SELECT
      de.production_date,
      de.category_id,

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
     ) AS completed,

COALESCE(
  SUM(
    CASE
      WHEN r.code IN ('teamLead', 'team_lead', 'lead')
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
      AND es.code IN ('submitted', 'reviewed', 'locked')

    GROUP BY de.production_date, de.category_id
ORDER BY de.production_date ASC, de.category_id ASC
  `,
      [projectId, backlogWorkflowStartDate, productionDate]
    );
    // Converts all production totals before the selected date into numbers.
    const previousReceived = Number(previousRows[0]?.received || 0);
    const previousCompleted = Number(previousRows[0]?.completed || 0);

    // Calculates unfinished work carried forward from previous dates.
    const previousBacklog = previousDayPending;
    // Converts database aggregate values into normal numbers.
    const received = Number(rows[0]?.received || 0);
    const completed = Number(rows[0]?.completed || 0);

    // Pending cannot be negative when completed exceeds received.
    // Uses today's completed work to clear the previous backlog first.
    const backlogCompleted = Math.min(
      completed,
      previousBacklog
    );

    // Calculates how much previous backlog still remains.
    const backlog = Math.max(
      previousBacklog - backlogCompleted,
      0
    );

    // Calculates how much of today's completed work remains after clearing backlog.
    const todayCompleted = Math.max(
      completed - backlogCompleted,
      0
    );

    // Calculates today's pending work after applying the remaining completion.

    // Build a separate daily summary for every assigned Reporting Category.
    const categorySummaries = projectCategories
      .filter((category) => category.category_id !== null)
      .map((category) => {
        const categoryId = Number(category.category_id);

        const daily = categoryDailyRows.find(
          (row) => Number(row.category_id) === categoryId
        );

        const previousEntries = categoryPreviousRows.filter(
          (row) => Number(row.category_id) === categoryId
        );
        // Find completed work from the Indexer categories mapped to this Team Lead category.
        const mappedIndexer = mappedIndexerDailyRows.find(
          (row) => Number(row.category_id) === categoryId
        );
        // Find Indexer work directly assigned to this Team Lead category.
        const directIndexer = directIndexerDailyRows.find(
          (row) => Number(row.category_id) === categoryId
        );

        // Received values come from the Team Lead entry.
        const categoryReceived = Number(daily?.received || 0);
        const batchesReceived = Number(daily?.batchesReceived || 0);

        // Completed values come from reviewed/locked Indexer entries.
        // Combine new direct category totals with historical mapping totals.
        const categoryCompleted =
          Number(directIndexer?.completed || 0) +
          Number(mappedIndexer?.completed || 0);

        const batchesProcessed =
          Number(directIndexer?.batchesProcessed || 0) +
          Number(mappedIndexer?.batchesProcessed || 0);
        const manualDocumentsPending = Number(daily?.documentsPending || 0);
        const manualBatchesPending = Number(daily?.batchesPending || 0);

        // Calculate pending batches
        // Calculate pending batches carried forward from previous dates.
        const previousCategoryRow = previousCategoryPendingRows.find(
          (row) => Number(row.category_id) === categoryId
        );

        const previousBacklog = Number(
          previousCategoryRow?.pending ?? 0
        );

        // Add today's received batches and subtract today's processed batches.
        const pendingBatches = manualBatchesPending;

        // Calculate unfinished work from previous dates.
        // Get previous received documents for this category
        // Calculate previous backlog chronologically for this category.


        for (const entry of previousEntries) {
          const dayReceived = Number(entry.received || 0);
          const dayCompleted = Number(entry.completed || 0);

        }

        // Apply today's completed work to previous backlog first.
        const backlogCompleted = Math.min(
          categoryCompleted,
          previousBacklog
        );

        const backlog = Math.max(
          previousBacklog - backlogCompleted,
          0
        );

        // Remaining completed work applies to today's received work.
        const todayCompleted = Math.max(
          categoryCompleted - backlogCompleted,
          0
        );

        const pending = manualDocumentsPending;

        return {
          categoryId,
          categoryName: category.category_name,
          received: categoryReceived,
          completed: categoryCompleted,
          backlog,
          pending,
          batchesReceived,
          batchesProcessed,
          pendingBatches,
        };
      });

    const pending = categorySummaries.reduce(
      (total, category) => total + category.pending,
      0
    );
    // Returns the calculated project/day production totals.
    // Returns today's production totals together with backlog information.
    return res.status(200).json({
      success: true,
      projectId,
      projectName,
      productionDate,

      // Existing overall project totals
      received,
      completed,
      previousBacklog,
      backlogCompleted,
      backlog,
      todayCompleted,
      pending,

      // New category-wise totals
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
const getProjectIndexerCategories = async (req, res) => {
  try {
    const projectId = Number(req.params.projectId);

    if (!Number.isSafeInteger(projectId) || projectId <= 0) {
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
    console.error("Indexer categories loading error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load Indexer reporting categories",
    });
  }
};
module.exports = {
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



