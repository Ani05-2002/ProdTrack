const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/db");
const crypto = require("crypto");

const { sendPasswordEmail } = require("../utils/mailer");

const { getAppSetting } = require("../utils/appSettings");

const { sendError } = require("../utils/httpError");

// Maps database role codes to existing application role permissions.
const roleKeyMap = {
  // Existing Indexer role.
  indexer: "indexer",

  // Existing Team Leader role.
  lead: "teamLead",
  team_lead: "teamLead",
  teamlead: "teamLead",

  // Legacy Core Team roles.
  core: "coreTeam",
  core_team: "coreTeam",
  coreteam: "coreTeam",

  // New management roles share the Core Team dashboard.
  assistant_manager: "coreTeam",
  manager: "coreTeam",
  operations_manager: "coreTeam",

  // HR has its own restricted role.
  hr: "hr",

  // Existing Admin role.
  admin: "administrator",
  administrator: "administrator",
};

// Successful Indexer login par today's attendance Present mark karta hai.

const markManagementPresentOnLogin = async (user) => {
  try {
    // Read the user's actual database role.
    const roleCode = String(user.role_code || "").toLowerCase();

    // Indexers and Team Leads must submit Daily Entry for attendance.
    if (["indexer", "lead", "team_lead", "teamlead"].includes(roleCode)) {
      return;
    }

    // Do not override approved leave.
    const [approvedLeaves] = await db.query(
      `SELECT leave_request_id
       FROM leave_request
       WHERE user_id = ?
         AND status = 'APPROVED'
         AND CURDATE() BETWEEN start_date AND end_date
       LIMIT 1`,
      [user.user_id]
    );

    if (approvedLeaves.length > 0) return;

    // Check whether attendance already exists for today.
    const [existing] = await db.query(
      `SELECT a.attendance_id, ats.code, ats.is_leave
       FROM attendance a
       JOIN attendance_status ats ON ats.status_id = a.status_id
       WHERE a.user_id = ? AND a.att_date = CURDATE()
       LIMIT 1`,
      [user.user_id]
    );

    // Preserve existing special statuses and already marked Present.
    if (
      existing.length > 0 &&
      existing[0].code !== "absent"
    ) {
      return;
    }

    // Get the configured Present status.
    const [statuses] = await db.query(
      `SELECT status_id
       FROM attendance_status
       WHERE code = 'present'
       LIMIT 1`
    );

    if (!statuses.length) {
      throw new Error("Present attendance status is missing");
    }

    // Insert today's attendance or update an existing Absent record.
    await db.query(
      `INSERT INTO attendance
       (user_id, att_date, status_id, hours, note, approved_by)
       VALUES (?, CURDATE(), ?, 8,
         'Automatically marked Present after successful login', NULL)
       ON DUPLICATE KEY UPDATE
         status_id = VALUES(status_id),
         hours = VALUES(hours),
         note = VALUES(note),
         approved_by = NULL`,
      [user.user_id, statuses[0].status_id]
    );
  } catch (error) {
    // Attendance errors must not prevent successful login.
    db.logError("Automatic login attendance failed", error);
  }
};


const recordLoginEvent = async ({
  req,
  userId = null,
  usernameTried = "",
  success = false,
}) => {
  try {
    const ipAddress = req.ip || req.socket?.remoteAddress || null;

    const userAgent = String(req.headers["user-agent"] || "").slice(0, 255);

    await db.query(
      `
      INSERT INTO login_event
      (
        user_id,
        username_tried,
        success,
        method,
        ip_address,
        user_agent,
        created_at
      )
      VALUES (
        ?,
        ?,
        ?,
        'password',
        INET6_ATON(?),
        ?,
        NOW()
      )
      `,
      [
        userId,
        String(usernameTried || "").slice(0, 60),
        success ? 1 : 0,
        ipAddress,
        userAgent || null,
      ],
    );
  } catch (error) {
    db.logError("Login event insert failed (login will still continue)", error);
  }
};

const getSessionTimeoutMinutes = async () => {
  const [rows] = await db.query(
    `
      SELECT setting_value
      FROM app_setting
      WHERE setting_key =
        'session_timeout_minutes'
      LIMIT 1
      `,
  );

  const timeoutMinutes = Number(rows[0]?.setting_value);

  const allowedTimeouts = [15, 30, 60];

  return allowedTimeouts.includes(timeoutMinutes) ? timeoutMinutes : 30;
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const [users] = await db.query(
      `
        SELECT
          u.user_id,
          u.emp_code,
          u.full_name,
          u.username,
          u.email,
          u.password_hash,
          u.designation,
          u.status,
          d.name AS department,
          r.code AS role_code,
          r.name AS role_name,
          u.auth_method
        FROM users u
        JOIN role r
          ON r.role_id = u.role_id
        LEFT JOIN department d
          ON d.department_id = u.department_id
        WHERE u.email = ? OR u.username = ?
        LIMIT 1
        `,
      [email, email],
    );

    if (users.length === 0) {
      await recordLoginEvent({
        req,
        usernameTried: email,
        success: false,
      });

      return res.status(401).json({
        success: false,
        // message: "Invalid email or password",
        // Username and email are both accepted for login.
        message: "Invalid username/email or password",
      });
    }

    const user = users[0];

    if (user.status !== "active") {
      await recordLoginEvent({
        req,
        userId: user.user_id,
        usernameTried: email,
        success: false,
      });
      return res.status(403).json({
        success: false,
        message: "Your account is inactive",
      });
    }

    let globalAuthMethod = "both";
    try {
      globalAuthMethod = await getAppSetting("auth_method", "both");
    } catch (error) {
      db.logError("auth_method lookup failed; using both", error);
    }

    const userAuthMethod = user.auth_method || "both";

    const passwordLoginAllowed =
      ["password", "both"].includes(globalAuthMethod) &&
      ["password", "both"].includes(userAuthMethod);

    if (!passwordLoginAllowed) {
      await recordLoginEvent({
        req,
        userId: user.user_id,
        usernameTried: email,
        success: false,
      });

      return res.status(403).json({
        success: false,
        message: "Password login is disabled. Please use Microsoft SSO.",
      });
    }

    if (!user.password_hash) {
      await recordLoginEvent({
        req,
        userId: user.user_id,
        usernameTried: email,
        success: false,
      });

      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      await recordLoginEvent({
        req,
        userId: user.user_id,
        usernameTried: email,
        success: false,
      });

      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const roleKey = roleKeyMap[String(user.role_code || "").toLowerCase()];

    if (!roleKey) {
      await recordLoginEvent({
        req,
        userId: user.user_id,
        usernameTried: email,
        success: false,
      });
      return res.status(403).json({
        success: false,
        message: "Invalid user role",
      });
    }

    let sessionTimeoutMinutes = 30;
    try {
      sessionTimeoutMinutes = await getSessionTimeoutMinutes();
    } catch (error) {
      db.logError(
        "session_timeout_minutes lookup failed; using default 30",
        error,
      );
    }

    const token = jwt.sign(
      {
        id: user.user_id,
        employeeId: user.emp_code,
        role: roleKey,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "8h",
      },
    );

    await db.query(
      `
      UPDATE users
      SET last_login_at = NOW()
      WHERE user_id = ?
      `,
      [user.user_id],
    );

    await markManagementPresentOnLogin(user);

    await recordLoginEvent({
      req,
      userId: user.user_id,
      usernameTried: email,
      success: true,
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      sessionTimeoutMinutes,
      token,
      user: {
        id: user.user_id,
        emp: user.emp_code,
        employeeId: user.emp_code,
        name: user.full_name,
        username: user.username,
        email: user.email,
        department: user.department,
        dept: user.department,
        designation: user.designation,
        role: user.role_name,
        roleKey,
      },
    });
  } catch (error) {
    return sendError(res, error, {
      context: "POST /api/auth/login",
      message: "Server error during login",
    });
  }
};

const forgotPassword = async (req, res) => {
  let connection;

  try {
    const identifier = String(req.body?.email || "").trim();

    if (!identifier) {
      return res.status(400).json({
        success: false,
        message: "Email or username is required",
      });
    }

    // Check whether self-service reset is enabled
    const passwordResetMethod = await getAppSetting(
      "password_reset",
      "self_service",
    );

    if (passwordResetMethod !== "self_service") {
      return res.status(403).json({
        success: false,
        message:
          "Self-service password reset is disabled. Contact the administrator.",
      });
    }

    // Find user using email or username
    const [users] = await db.query(
      `
      SELECT
        user_id,
        full_name,
        username,
        email,
        status
      FROM users
      WHERE email = ?
         OR username = ?
      LIMIT 1
      `,
      [identifier, identifier],
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No user was found with this email or username",
      });
    }

    const user = users[0];

    if (user.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "This account is inactive",
      });
    }

    if (!user.email) {
      return res.status(400).json({
        success: false,
        message: "No email is registered for this user",
      });
    }

    // Generate actual new password
    const newPassword = `Prod@${crypto.randomBytes(6).toString("base64url")}`;

    // Store only its hash in database
    const passwordHash = await bcrypt.hash(newPassword, 10);

    connection = await db.getConnection();

    await connection.beginTransaction();

    await connection.query(
      `
      UPDATE users
      SET password_hash = ?
      WHERE user_id = ?
      `,
      [passwordHash, user.user_id],
    );

    // Send actual generated password by email
    await sendPasswordEmail({
      name: user.full_name,
      email: user.email,
      password: newPassword,
      passwordSource: "Forgot Password",
      subject: "Your new ProdTrack password",
    });

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "A new password has been sent to your registered email.",
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    return sendError(res, error, {
      context: "POST /api/auth/forgot-password",
      message: "Failed to reset password",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

module.exports = {
  login,
  forgotPassword,
};
