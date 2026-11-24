
const jwt = require("jsonwebtoken");
const db = require("../config/db");

const authenticate = async (req, res, next) => {
  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: "Server auth is misconfigured",
      });
    }

    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const token = authHeader.slice(7);
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    const userId = Number(decoded.id);

    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid user session",
      });
    }

    const [users] = await db.query(
      `
        SELECT status, deleted_at
        FROM users
        WHERE user_id = ?
        LIMIT 1
      `,
      [userId]
    );

    if (
      users.length === 0 ||
      users[0].status !== "active" ||
      users[0].deleted_at !== null
    ) {
      return res.status(401).json({
        success: false,
        message: "Your account is inactive or deleted",
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    console.error("Authentication Error:", error);

    return res.status(500).json({
      success: false,
      message: "Authentication failed",
    });
  }
};

module.exports = authenticate;
