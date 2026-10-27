// Import the existing MySQL connection.
const db = require("../../config/db");

// Fetch pending leave requests from all active Indexers and Team Leaders.
const getPendingLeaveRequests = async (req, res) => {
  try {
    const [requests] = await db.query(
      `
      SELECT
        lr.leave_request_id AS id,
        lr.leave_type,
        DATE_FORMAT(lr.start_date, '%Y-%m-%d') AS start_date,
        DATE_FORMAT(lr.end_date, '%Y-%m-%d') AS end_date,
        lr.reason,
        lr.status,
        lr.created_at,

        u.user_id,
        u.emp_code AS employee_id,
        u.full_name AS employee_name,
        r.name AS employee_role

      FROM leave_request lr

      JOIN users u
        ON u.user_id = lr.user_id

      JOIN role r
        ON r.role_id = u.role_id

      WHERE lr.status = 'PENDING'
        AND u.status = 'active'
        AND r.code IN ('indexer', 'lead')

      ORDER BY lr.created_at DESC, lr.leave_request_id DESC
      `
    );

    // Return all pending leave requests to HR.
    return res.status(200).json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error) {
    // Log database errors without exposing details to clients.
    console.error("HR Pending Leave Requests Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load pending leave requests",
    });
  }
};
// HR approves a pending leave request and updates attendance.
const approveLeaveRequest = async (req, res) => {
  let connection;
  let transactionStarted = false;

  try {
    // Get the logged-in HR user and requested leave ID.
    const hrId = req.user.id;
    const leaveRequestId = Number(req.params.id);
    const { reviewComment = "" } = req.body || {};

    // Validate the leave request ID.
    if (!Number.isSafeInteger(leaveRequestId) || leaveRequestId <= 0) {
      return res.status(400).json({
        success: false,
        message: "A valid leave request ID is required",
      });
    }

    // Start a transaction to keep leave and attendance updates consistent.
    connection = await db.getConnection();
    await connection.beginTransaction();
    transactionStarted = true;

    // Helper to return a controlled error after rollback.
    const reject = (httpStatus, message) => {
      throw Object.assign(new Error(message), { httpStatus });
    };

    // Lock the pending request to prevent simultaneous approvals.
    const [requests] = await connection.query(
      `
      SELECT
        lr.leave_request_id,
        lr.user_id,
        lr.leave_type,
        DATE_FORMAT(lr.start_date, '%Y-%m-%d') AS start_date,
        DATE_FORMAT(lr.end_date, '%Y-%m-%d') AS end_date,
        lr.status

      FROM leave_request lr

      WHERE lr.leave_request_id = ?
      FOR UPDATE
      `,
      [leaveRequestId]
    );

    if (requests.length === 0) {
      reject(404, "Leave request not found");
    }

    const request = requests[0];

    // Only pending requests can be approved.
    if (request.status !== "PENDING") {
      reject(409, "Leave request has already been reviewed");
    }

    // Confirm the requester is an active Indexer or Team Leader.
    const [employees] = await connection.query(
      `
      SELECT u.user_id
      FROM users u
      JOIN role r ON r.role_id = u.role_id
      WHERE u.user_id = ?
        AND u.status = 'active'
        AND r.code IN ('indexer', 'lead')
      LIMIT 1
      `,
      [request.user_id]
    );

    if (employees.length === 0) {
      reject(403, "This leave request is not eligible for HR approval");
    }

    // Find the configured leave attendance status.
    const leaveType = String(request.leave_type || "").trim();
    const leaveTypeKey = leaveType.toLowerCase().replace(/\s+/g, "_");

    const [attendanceStatuses] = await connection.query(
      `
      SELECT status_id
      FROM attendance_status
      WHERE is_leave = 1
        AND (
          code = ?
          OR name = ?
          OR LOWER(REPLACE(code, ' ', '_')) = ?
          OR LOWER(REPLACE(name, ' ', '_')) = ?
        )
      LIMIT 1
      `,
      [leaveType, leaveType, leaveTypeKey, leaveTypeKey]
    );

    if (attendanceStatuses.length === 0) {
      reject(400, "Attendance leave status is not configured");
    }

    // Validate the leave date range.
    const startDate = new Date(`${request.start_date}T00:00:00Z`);
    const endDate = new Date(`${request.end_date}T00:00:00Z`);

    if (
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime()) ||
      startDate > endDate
    ) {
      reject(400, "Leave request has invalid dates");
    }

    // Build the list of dates covered by the approved leave.
    const leaveDates = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      leaveDates.push(currentDate.toISOString().slice(0, 10));
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);

      if (leaveDates.length > 366) {
        reject(400, "Leave duration cannot exceed 366 days");
      }
    }

    // Update attendance for every approved leave date.
    for (const attendanceDate of leaveDates) {
      await connection.query(
        `
        INSERT INTO attendance
        (
          user_id,
          att_date,
          status_id,
          hours,
          note,
          approved_by
        )
        VALUES (?, ?, ?, 0, ?, ?)

        ON DUPLICATE KEY UPDATE
          status_id = VALUES(status_id),
          hours = 0,
          note = VALUES(note),
          approved_by = VALUES(approved_by)
        `,
        [
          request.user_id,
          attendanceDate,
          attendanceStatuses[0].status_id,
          `Approved ${request.leave_type}`,
          hrId,
        ]
      );
    }

    // Record the HR approval decision.
    const [updateResult] = await connection.query(
      `
      UPDATE leave_request
      SET
        status = 'APPROVED',
        review_comment = ?,
        reviewed_by = ?,
        reviewed_at = NOW()
      WHERE leave_request_id = ?
        AND status = 'PENDING'
      `,
      [
        String(reviewComment || "").trim() || null,
        hrId,
        leaveRequestId,
      ]
    );

    if (updateResult.affectedRows !== 1) {
      reject(409, "Leave request changed. Refresh and try again");
    }

    // Record the HR approval in the audit log.
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
        hrId,
        "Approved leave request",
        "leave_request",
        String(leaveRequestId),
        `HR approved leave for user ${request.user_id} from ${request.start_date} to ${request.end_date}`,
      ]
    );

    // Notify the employee about HR approval.
    // Notify the employee that HR approved the leave request.
    await connection.query(
      `
  INSERT INTO notification
  (
    user_id,
    type_id,
    title,
    body,
    is_read
  )
  VALUES (
    ?,
    (SELECT type_id
     FROM notification_type
     WHERE code = 'leave_approved'),
    ?,
    ?,
    0
  )
  `,
      [
        request.user_id,
        "Leave request approved",
        `Your leave request #${leaveRequestId} has been approved by HR.`,
      ]
    );
    // Notify the employee that HR approved the leave request.
    await connection.query(
      `
  INSERT INTO notification
  (
    user_id,
    type_id,
    title,
    body,
    is_read
  )
  VALUES (
    ?,
    (SELECT type_id
     FROM notification_type
     WHERE code = 'leave_approved'),
    ?,
    ?,
    0
  )
  `,
      [
        request.user_id,
        "Leave request approved",
        `Your leave request #${leaveRequestId} has been approved by HR.`,
      ]
    );

    // Save all updates together.
    await connection.commit();
    transactionStarted = false;

    return res.status(200).json({
      success: true,
      message: "Leave request approved and attendance updated successfully",
    });
  } catch (error) {
    // Roll back all changes if approval fails.
    if (connection && transactionStarted) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("HR Leave Approval Rollback Error:", rollbackError);
      }
    }

    if (error.httpStatus) {
      return res.status(error.httpStatus).json({
        success: false,
        message: error.message,
      });
    }

    console.error("HR Approve Leave Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to approve leave request",
    });
  } finally {
    // Release the database connection.
    if (connection) connection.release();
  }
};

// HR rejects a pending leave request without changing attendance.
const rejectLeaveRequest = async (req, res) => {
  let connection;
  let transactionStarted = false;

  try {
    // Get HR reviewer and leave request details.
    const hrId = req.user.id;
    const leaveRequestId = Number(req.params.id);
    const { reviewComment = "" } = req.body || {};

    // Validate request ID.
    if (!Number.isSafeInteger(leaveRequestId) || leaveRequestId <= 0) {
      return res.status(400).json({
        success: false,
        message: "A valid leave request ID is required",
      });
    }

    // Begin transaction.
    connection = await db.getConnection();
    await connection.beginTransaction();
    transactionStarted = true;

    // Lock the request while HR reviews it.
    const [requests] = await connection.query(
      `
      SELECT
        lr.leave_request_id,
        lr.user_id,
        lr.status
      FROM leave_request lr
      JOIN users u ON u.user_id = lr.user_id
      JOIN role r ON r.role_id = u.role_id
      WHERE lr.leave_request_id = ?
        AND u.status = 'active'
        AND r.code IN ('indexer', 'lead')
      FOR UPDATE
      `,
      [leaveRequestId]
    );

    if (requests.length === 0) {
      await connection.rollback();
      transactionStarted = false;

      return res.status(404).json({
        success: false,
        message: "Leave request not found or not eligible",
      });
    }

    // Prevent duplicate review.
    if (requests[0].status !== "PENDING") {
      await connection.rollback();
      transactionStarted = false;

      return res.status(409).json({
        success: false,
        message: "Leave request has already been reviewed",
      });
    }

    // Update the leave request to rejected.
    const [updateResult] = await connection.query(
      `
      UPDATE leave_request
      SET
        status = 'REJECTED',
        review_comment = ?,
        reviewed_by = ?,
        reviewed_at = NOW()
      WHERE leave_request_id = ?
        AND status = 'PENDING'
      `,
      [
        String(reviewComment || "").trim() || null,
        hrId,
        leaveRequestId,
      ]
    );

    if (updateResult.affectedRows !== 1) {
      throw Object.assign(
        new Error("Leave request changed. Refresh and try again"),
        { httpStatus: 409 }
      );
    }

    // Record the rejection in the audit log.
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
        hrId,
        "Rejected leave request",
        "leave_request",
        String(leaveRequestId),
        `HR rejected leave request for user ${requests[0].user_id}`,
      ]
    );

    // Notify the requester about rejection.
    // Notify the employee that HR rejected the leave request.
    await connection.query(
      `
  INSERT INTO notification
  (
    user_id,
    type_id,
    title,
    body,
    is_read
  )
  VALUES (
    ?,
    (SELECT type_id
     FROM notification_type
     WHERE code = 'leave_rejected'),
    ?,
    ?,
    0
  )
  `,
      [
        requests[0].user_id,
        "Leave request rejected",
        `Your leave request #${leaveRequestId} has been rejected by HR.`,
      ]
    );

    // Commit the rejection and notification together.
    await connection.commit();
    transactionStarted = false;

    return res.status(200).json({
      success: true,
      message: "Leave request rejected successfully",
    });
  } catch (error) {
    // Roll back if any operation fails.
    if (connection && transactionStarted) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("HR Leave Rejection Rollback Error:", rollbackError);
      }
    }

    console.error("HR Reject Leave Error:", error);

    return res.status(error.httpStatus || 500).json({
      success: false,
      message: error.httpStatus
        ? error.message
        : "Failed to reject leave request",
    });
  } finally {
    // Release the connection.
    if (connection) connection.release();
  }
};
// Fetch reviewed leave requests for HR history.
const getReviewedLeaveRequests = async (req, res) => {
  try {
    // Retrieve approved and rejected requests from active employees.
    const [requests] = await db.query(
      `
      SELECT
        lr.leave_request_id AS id,
        lr.leave_type,
        DATE_FORMAT(lr.start_date, '%Y-%m-%d') AS start_date,
        DATE_FORMAT(lr.end_date, '%Y-%m-%d') AS end_date,
        lr.reason,
        lr.status,
        lr.review_comment,
        lr.reviewed_at,
        lr.created_at,
        u.user_id,
        u.emp_code AS employee_id,
        u.full_name AS employee_name,
        r.name AS employee_role
      FROM leave_request lr
      JOIN users u ON u.user_id = lr.user_id
      JOIN role r ON r.role_id = u.role_id
      WHERE lr.status IN ('APPROVED', 'REJECTED')
        AND u.status = 'active'
        AND r.code IN ('indexer', 'lead')
      ORDER BY lr.reviewed_at DESC, lr.leave_request_id DESC
      `
    );

    // Return the reviewed requests.
    return res.status(200).json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error) {
    // Log unexpected database errors.
    console.error("HR Reviewed Leave Requests Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load reviewed leave requests",
    });
  }
};

// Export HR leave request and review functions.
module.exports = {
  getPendingLeaveRequests,
  getReviewedLeaveRequests,
  approveLeaveRequest,
  rejectLeaveRequest,
};