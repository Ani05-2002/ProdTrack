
const express = require("express");

// Existing authentication middleware.
const authenticate = require(
  "../middleware/authMiddleware"
);

// Existing role permission middleware.
const allowRoles = require(
  "../middleware/roleMiddleware"
);

// Daily Work Statement controller functions.
const {
  getMyStatement,
  saveMyStatement,
  getStatementReports,
  getSubmittedStatement,
} = require(
  "../controllers/dailyWorkStatementController"
);

const router = express.Router();

// ============================================================
// INDEXER — GET OWN DAILY WORK STATEMENT
//
// Loads an existing workbook for the selected production date.
// If no statement exists, frontend opens a blank workbook.
// ============================================================

router.get(
  "/my",
  authenticate,
  allowRoles("indexer"),
  getMyStatement
);

// ============================================================
// INDEXER — SAVE DRAFT OR SUBMIT STATEMENT
//
// Creates a new statement or updates an existing draft.
// Submitted statements cannot be edited.
// ============================================================

router.post(
  "/my",
  authenticate,
  allowRoles("indexer"),
  saveMyStatement
);

// ============================================================
// MANAGEMENT — DAILY WORK STATEMENT REPORTS
//
// Team Lead: Assigned Indexers.
// Manager: Existing Core Team permissions.
// Administrator: All Indexers.
// ============================================================

router.get(
  "/reports",
  authenticate,
  allowRoles(
    "teamLead",
    "coreTeam",
    "administrator"
  ),
  getStatementReports
);

// ============================================================
// MANAGEMENT — VIEW SUBMITTED WORKBOOK
//
// Opens the Indexer's submitted workbook inside Reports.
// Workbook is displayed using Univer Sheets in read-only mode.
// ============================================================

router.get(
  "/reports/:id",
  authenticate,
  allowRoles(
    "teamLead",
    "coreTeam",
    "administrator"
  ),
  getSubmittedStatement
);

// ============================================================
// EXPORT ROUTER
// ============================================================

module.exports = router;
