// Import Express.
const express = require("express");

// Import authentication and role middleware.
const authenticate = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");

// Import notification controllers.
const {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
} = require("../controllers/notificationController");

// Create Express router.
const router = express.Router();

// Allow all existing roles and HR to access their own notifications.
const notificationRoles = allowRoles(
  "indexer",
  "teamLead",
  "coreTeam",
  "administrator",
  "hr" // NEW: Allow HR role.
);

// GET: Fetch notifications for the logged-in user.
router.get(
  "/my",
  authenticate,
  notificationRoles,
  getMyNotifications
);

// PATCH: Mark all notifications as read.
router.patch(
  "/read-all",
  authenticate,
  notificationRoles,
  markAllAsRead
);

// POST: Mark all notifications as read (existing compatibility route).
router.post(
  "/read-all",
  authenticate,
  notificationRoles,
  markAllAsRead
);

// PATCH: Mark one notification as read.
router.patch(
  "/:id/read",
  authenticate,
  notificationRoles,
  markAsRead
);

// POST: Mark one notification as read (existing compatibility route).
router.post(
  "/:id/read",
  authenticate,
  notificationRoles,
  markAsRead
);

// Export notification routes.
module.exports = router;