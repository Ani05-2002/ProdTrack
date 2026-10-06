const express = require("express");
const router = express.Router();

// Imports Admin Dashboard controllers.
const {
  getAdminDashboard,
  getProjectDailySummary,
} = require("../../controllers/administrator/dashboardController");
const authMiddleware = require("../../middleware/authMiddleware");
const allowRoles = require("../../middleware/roleMiddleware");

// GET /api/admin/dashboard  — admin only
router.get(
  "/dashboard",
  authMiddleware,
  allowRoles("administrator"),
  getAdminDashboard
);

// GET /api/admin/dashboard/project-daily-summary — admin only
router.get(
  "/dashboard/project-daily-summary",
  authMiddleware,
  allowRoles("administrator"),
  getProjectDailySummary
);

module.exports = router;
