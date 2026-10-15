const express = require("express");

const authenticate = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");

const {
  createEntry,
  getMyEntries,
  updateEntry,
  getPendingTeamEntries,
  reviewEntry,
  getProjectFields,
  getProjectDailySummary,
  getProjectIndexerCategories,
  getProjectTeamLeadCategories,
} = require("../controllers/dailyEntryController");

const router = express.Router();

router.get(
  "/team/pending",
  authenticate,
  allowRoles("teamLead"),
  getPendingTeamEntries
);

router.get(
  "/my",
  authenticate,
  allowRoles("indexer","teamLead"),
  getMyEntries
);

router.post(
  "/",
  authenticate,
  allowRoles("indexer","teamLead"),
  createEntry
);

// Loads dynamic Daily Entry fields for a project assigned to the logged-in user.
router.get(
  "/projects/:projectId/fields",
  authenticate,
  allowRoles("indexer", "teamLead"),
  getProjectFields
);

// Returns project-wise Received, Completed and Pending for a selected date.
router.get(
  "/projects/:projectId/summary",
  authenticate,
  allowRoles("teamLead", "coreTeam", "admin"),
  getProjectDailySummary
);
router.get(
  "/projects/:projectId/indexer-categories",
  authenticate,
  allowRoles("teamLead"),
  getProjectIndexerCategories
);
// Returns Team Lead categories for the selected project.
router.get(
  "/projects/:projectId/team-lead-categories",
  authenticate,
  allowRoles("indexer"),
  getProjectTeamLeadCategories
);

router.patch(
  "/:id",
  authenticate,
  allowRoles("indexer", "teamLead"),
  updateEntry
);
router.post(
  "/:id",
  authenticate,
  allowRoles("indexer", "teamLead"),
  updateEntry
);

router.patch(
  "/:id/review",
  authenticate,
  allowRoles("teamLead"),
  reviewEntry
);
router.post(
  "/:id/review",
  authenticate,
  allowRoles("teamLead"),
  reviewEntry
);

module.exports = router;