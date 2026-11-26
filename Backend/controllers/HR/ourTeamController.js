
 // Import the existing MySQL database connection.
const db = require("../../config/db");

// Return all active employees with their roles and today's attendance status.

const getOurTeam = async (req, res) => {
  try {
    const reportDate = req.query.date || null;

    // Validate the selected date.
    if (
      reportDate &&
      !/^\d{4}-\d{2}-\d{2}$/.test(reportDate)
    ) {
      return res.status(400).json({
        success: false,
        message: "Date must be YYYY-MM-DD",
      });
    }

    const [members] = await db.query(
      `
      SELECT
        u.user_id AS id,
        u.emp_code AS employee_id,
        u.full_name AS name,
        r.name AS role,

        CASE
          WHEN EXISTS (
            SELECT 1
            FROM leave_request lr
            WHERE lr.user_id = u.user_id
              AND lr.status = 'APPROVED'
              AND COALESCE(?, CURDATE())
                  BETWEEN lr.start_date AND lr.end_date
          )
          THEN 'LEAVE'

          ELSE COALESCE(
            (
              SELECT ats.name
              FROM attendance a
              JOIN attendance_status ats
                ON ats.status_id = a.status_id
              WHERE a.user_id = u.user_id
                AND a.att_date = COALESCE(?, CURDATE())
              ORDER BY a.attendance_id DESC
              LIMIT 1
            ),
            'Absent'
          )
        END AS attendance_status

      FROM users u

      LEFT JOIN role r
        ON r.role_id = u.role_id

      WHERE u.status = 'active'

      ORDER BY u.full_name ASC
      `,
      [reportDate, reportDate]
    );

    return res.status(200).json({
      success: true,
      count: members.length,
      members,
    });
  } catch (error) {
    console.error("Get HR Our Team Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load HR team members",
    });
  }
};


// Export the controller for HR routes.
module.exports = { getOurTeam };
