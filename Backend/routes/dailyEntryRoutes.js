
const express = require("express");

const authenticate = require(
  "../middleware/authMiddleware"
);

const allowRoles = require(
  "../middleware/roleMiddleware"
);

// Daily Entry controllers.

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
  getShiftSubmissionStatus,
} = require(
  "../controllers/dailyEntryController"
);

// Existing entry restriction checking.

const {
  getRestrictionStatus,
  enforceEntryRestriction,
} = require(
  "../controllers/entryRestrictionController"
);

const router = express.Router();


// Check Indexer entry access.

router.get(
  "/restriction-status",
  authenticate,
  allowRoles("indexer"),
  getRestrictionStatus
);


// ============================================================
// NEW: CHECK SHIFT SUBMISSION AVAILABILITY
// ============================================================

router.get(
  "/shift-submission-status",
  authenticate,
  allowRoles("indexer"),
  getShiftSubmissionStatus
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
