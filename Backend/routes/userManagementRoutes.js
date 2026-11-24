
// Imports Express so Core Team user-management routes can be created.
const express = require("express");

// Imports JWT authentication middleware to verify the logged-in user.
const authenticate = require("../middleware/authMiddleware");

// Imports role middleware to restrict management APIs.
const allowRoles = require("../middleware/roleMiddleware");

// Imports all user-management controller functions.
const {
  getAllUsers,
  getUserTeamLeads,
  getUserProjects,
  getUserDepartments,
  getUserShifts,
  createShift,
  updateShift,
  createUser,
  updateUser,
  deleteUser,
} = require("../controllers/userManagementController");

// Creates an Express router for Core Team Users APIs.
const router = express.Router();


// Gets all users displayed on the Core Team Users screen.
router.get(
  "/users",
  authenticate,
  allowRoles("coreTeam", "administrator"),
  getAllUsers
);


// Gets active Team Leads for the User Details dropdown.
router.get(
  "/users/team-leads",
  authenticate,
  allowRoles("coreTeam", "administrator"),
  getUserTeamLeads
);


// Gets active projects for the Assigned Projects dropdown.
router.get(
  "/users/projects",
  authenticate,
  allowRoles("coreTeam", "administrator"),
  getUserProjects
);


// Gets departments from the database for the Department dropdown.
router.get(
  "/users/departments",
  authenticate,
  allowRoles("coreTeam", "administrator"),
  getUserDepartments
);


// ============================================================
// NEW: GET ALL SHIFTS FOR INDEXER SHIFT DROPDOWN
// ============================================================

router.get(
  "/users/shifts",
  authenticate,
  allowRoles("coreTeam", "administrator"),
  getUserShifts
);


// ============================================================
// ADMIN ONLY — CREATE NEW SHIFT
// ============================================================

router.post(
  "/users/shifts",
  authenticate,
  allowRoles("administrator"),
  createShift
);


// ============================================================
// ADMIN ONLY — UPDATE EXISTING SHIFT
// ============================================================

router.patch(
  "/users/shifts/:shiftId",
  authenticate,
  allowRoles("administrator"),
  updateShift
);


// Creates a new user from the Add User popup.
router.post(
  "/users",
  authenticate,
  allowRoles("coreTeam", "administrator"),
  createUser
);


// Updates an existing employee from the Edit User popup.
router.patch(
  "/users/:id",
  authenticate,
  allowRoles("coreTeam", "administrator"),
  updateUser
);


router.post(
  "/users/:id",
  authenticate,
  allowRoles("coreTeam", "administrator"),
  updateUser
);


// Administrator only — Delete User
router.delete(
  "/users/:id",
  authenticate,
  allowRoles("administrator"),
  deleteUser
);


// Exports the Core Team Users router so index.js can use it.
module.exports = router;
