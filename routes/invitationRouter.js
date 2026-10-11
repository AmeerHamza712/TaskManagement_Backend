const express = require("express");
const InvitationRouter = express.Router();
const invitationController = require("../controllers/invitation.conroller");

// 1. Get all pending invitations for a specific email
InvitationRouter.get(
  "/getInvitation/:inviteeEmail",
  invitationController.getMyInvitations,
);

// 2. Send an invitation to a team
InvitationRouter.post(
  "/saveInvitation/:teamId",
  (req, res, next) => {
    console.log("✅ saveInvitation route matched");
    next();
  },
  invitationController.postSetEmailInvitation,
);

// 3. Accept an invitation
InvitationRouter.post("/accept", invitationController.acceptInvitation);

// 4. Reject an invitation
InvitationRouter.post("/reject", invitationController.rejectInvitation);

module.exports = InvitationRouter;
