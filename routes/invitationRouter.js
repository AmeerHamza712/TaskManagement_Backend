const express = require("express");
const router = express.Router();
const invitationController = require("../controllers/invitation.conroller");

// 1. Get all pending invitations for a specific email
router.get("/:inviteeEmail", invitationController.getMyInvitations);

// 2. Send an invitation to a team
router.post("/team/:teamId", invitationController.postSetEmailInvitation);

// 3. Accept an invitation
router.post("/accept", invitationController.acceptInvitation);

// 4. Reject an invitation
router.post("/reject", invitationController.rejectInvitation);

module.exports = router;
