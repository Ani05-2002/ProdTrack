
const express = require("express");

const authenticate = require(
  "../../middleware/authMiddleware"
);

const allowRoles = require(
  "../../middleware/roleMiddleware"
);

// Existing locking rule controllers.
const {
  getLockingRules,
  updateLockingRules,
} = require(
  "../../controllers/administrator/lockingRulesController"
);

// NEW: Individual Indexer restriction controllers.
const {
  listRestrictions,
  saveRestriction,
  removeRestriction,
} = require(
  "../../controllers/entryRestrictionController"
);

const router = express.Router();

// =====================================================
// EXISTING GLOBAL AND PROJECT LOCKING RULES
// =====================================================

router.get(
  "/locking-rules",
  authenticate,
  allowRoles("administrator"),
  getLockingRules
);

router.put(
  "/locking-rules",
  authenticate,
  allowRoles("administrator"),
  updateLockingRules
);

router.post(
  "/locking-rules",
  authenticate,
  allowRoles("administrator"),
  updateLockingRules
);

// =====================================================
// NEW: USER-SPECIFIC ENTRY RESTRICTIONS
// =====================================================

// Get Indexers and saved restrictions.
router.get(
  "/locking-rules/user-restrictions",
  authenticate,
  allowRoles("administrator"),
  listRestrictions
);

// Create or update a restriction.
router.post(
  "/locking-rules/user-restrictions",
  authenticate,
  allowRoles("administrator"),
  saveRestriction
);

// Remove a restriction.
router.delete(
  "/locking-rules/user-restrictions/:id",
  authenticate,
  allowRoles("administrator"),
  removeRestriction
);

module.exports = router;
