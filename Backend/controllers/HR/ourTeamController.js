
 // Import the existing MySQL database connection.
const db = require("../../config/db");

// Return all active employees with their roles and today's attendance status.
const getOurTeam = async (req, res) => {
  try {
    // Fetch employees across all teams, including their roles and attendance status.
    const [members] = await db.query(`
      SELECT
        u.user_id AS id,
        u.emp_code AS employee_id,
        u.full_name AS name,

        -- Get the employee's role name.
        r.name AS role,

        -- Determine today's attendance status.
        CASE
          -- Check whether the employee has approved leave today.
          WHEN EXISTS (
            SELECT 1
            FROM leave_request lr
            WHERE lr.user_id = u.user_id
              AND lr.status = 'APPROVED'
              AND CURDATE() BETWEEN lr.start_date AND lr.end_date
          )
          THEN 'LEAVE'
           ELSE COALESCE(
            (
              SELECT ats.name
              FROM attendance a
              JOIN attendance_status ats
                ON ats.status_id = a.status_id
              WHERE a.user_id = u.user_id
                AND a.att_date = CURDATE()
              LIMIT 1
            ),

            'Absent'
          )
        END AS attendance_status

      -- Get all employees.
      FROM users u

      -- Join each employee with their assigned role.
      LEFT JOIN role r
        ON r.role_id = u.role_id

      -- Include only active employees.
      WHERE u.status = 'active'

      -- Sort employees alphabetically.
      ORDER BY u.full_name ASC
    `);

    // Return the employee list to the HR frontend.
    return res.status(200).json({
      success: true,
      count: members.length,
      members,
    });
  } catch (error) {
    // Log database errors for debugging.
    console.error("Get HR Our Team Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load HR team members",
    });
  }
};

// Export the controller for HR routes.
module.exports = { getOurTeam };
