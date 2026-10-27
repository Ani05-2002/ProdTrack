// Import Express for HR API routes.
const express = require("express");

// Import the existing authentication middleware.
const authenticate = require("../../middleware/authMiddleware");

// Import the existing role authorization middleware.
const allowRoles = require("../../middleware/roleMiddleware");

// Import the HR Our Team controller using the correct relative path.
const { getOurTeam } = require("../../controllers/HR/ourTeamController");
// Import the HR leave approval controller.
// Import all HR leave approval actions.
const {
    getPendingLeaveRequests,
    getReviewedLeaveRequests,
    approveLeaveRequest,
    rejectLeaveRequest,
} = require("../../controllers/HR/leaveApprovalController");

// Create the HR router.
const router = express.Router();

// Require login and HR authorization for all HR routes.
router.use(authenticate);
router.use(allowRoles("hr"));

// Return all active employees to HR.
router.get("/our-team", getOurTeam);
// Allow HR to view pending leave requests from all teams.
router.get(
    "/leave-requests",
    getPendingLeaveRequests
);
// HR approves an Indexer or Team Leader leave request.
router.post(
    "/leave-requests/:id/approve",
    approveLeaveRequest
);

// HR rejects an Indexer or Team Leader leave request.
router.post(
    "/leave-requests/:id/reject",
    rejectLeaveRequest
);
// Allow HR to view approved and rejected leave history.
router.get(
  "/leave-requests/history",
  getReviewedLeaveRequests
);

// Export the HR router.
module.exports = router;