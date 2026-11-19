
const express = require("express");

const authenticate = require(
  "../middleware/authMiddleware"
);

const allowRoles = require(
  "../middleware/roleMiddleware"
);

// Existing Daily Entry controllers.
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
} = require(
  "../controllers/dailyEntryController"
);

// NEW: Entry restriction checking.
const {
  getRestrictionStatus,
  enforceEntryRestriction,
} = require(
  "../controllers/entryRestrictionController"
);

const router = express.Router();

// NEW: Check Indexer entry access.
router.get(
  "/restriction-status",
  authenticate,
  allowRoles("indexer"),
  getRestrictionStatus
);

// Get pending Team Lead reviews.
router.get(
  "/team/pending",
  authenticate,
  allowRoles("teamLead"),
  getPendingTeamEntries
);

// Get user's daily entries.
router.get(
  "/my",
  authenticate,
  allowRoles("indexer", "teamLead"),
  getMyEntries
);

// Create Daily Entry.
// NEW: Check restriction before saving.
router.post(
  "/",
  authenticate,
  allowRoles("indexer", "teamLead"),
  enforceEntryRestriction,
  createEntry
);

// Get dynamic project fields.
router.get(
  "/projects/:projectId/fields",
  authenticate,
  allowRoles("indexer", "teamLead"),
  getProjectFields
);

// Get Project Daily Summary.
router.get(
  "/projects/:projectId/summary",
  authenticate,
  allowRoles(
    "teamLead",
    "coreTeam",
    "administrator"
  ),
  getProjectDailySummary
);

// Get Indexer categories.
router.get(
  "/projects/:projectId/indexer-categories",
  authenticate,
  allowRoles("teamLead"),
  getProjectIndexerCategories
);

// Get Team Lead categories.
router.get(
  "/projects/:projectId/team-lead-categories",
  authenticate,
  allowRoles("indexer"),
  getProjectTeamLeadCategories
);

// POST method for existing frontend compatibility.
router.post(
  "/projects/:projectId/team-lead-categories",
  authenticate,
  allowRoles("indexer"),
  getProjectTeamLeadCategories
);

// Update existing entry.
// NEW: Check restriction before editing.
router.patch(
  "/:id",
  authenticate,
  allowRoles("indexer", "teamLead"),
  enforceEntryRestriction,
  updateEntry
);

// POST update compatibility.
router.post(
  "/:id",
  authenticate,
  allowRoles("indexer", "teamLead"),
  enforceEntryRestriction,
  updateEntry
);

// Team Lead review remains unchanged.
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
