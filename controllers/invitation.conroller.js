const Invitation = require("../models/invitation.model");
const User = require("../models/user.model");
const Team = require("../models/team.model");

// ==========================================
// 1. ACCEPT INVITATION
// ==========================================
exports.acceptInvitation = async (req, res) => {
  try {
    if (!req.session || !req.session.isLoggedIn) {
      return res.status(401).json({ message: "Login first" });
    }

    const { invitationId } = req.body;
    const rawEmail = req.session.user?.email || req.session.email;
    const userId = req.session.user?._id || req.session.user;

    if (!rawEmail) {
      return res
        .status(400)
        .json({ message: "User email not found in session." });
    }

    const userEmail = rawEmail.trim().toLowerCase();

    const invite = await Invitation.findById(invitationId);
    if (!invite) {
      return res.status(404).json({ message: "Invitation not found" });
    }

    if (invite.status !== "pending") {
      return res
        .status(400)
        .json({ message: `Invitation has already been ${invite.status}` });
    }

    if (invite.inviteeEmail.trim().toLowerCase() !== userEmail) {
      return res
        .status(403)
        .json({ message: "This invitation does not belong to you" });
    }

    const team = await Team.findById(invite.teamId);
    if (!team) {
      return res.status(404).json({ message: "Team no longer exists" });
    }

    const isAlreadyMember = team.members?.some(
      (m) => m.user?.toString() === userId?.toString(),
    );

    if (!isAlreadyMember) {
      team.members.push({
        user: userId,
        role: invite.role || "member",
        message: "Joined via email invitation",
      });
      await team.save();
    }

    invite.status = "accepted";
    await invite.save();

    return res.status(200).json({ message: "Successfully joined the team!" });
  } catch (err) {
    console.error("Error accepting invitation:", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

// ==========================================
// 2. REJECT INVITATION
// ==========================================
exports.rejectInvitation = async (req, res) => {
  try {
    const { invitationId } = req.body;
    const invite = await Invitation.findById(invitationId);

    if (!invite) {
      return res.status(404).json({ message: "Invitation not found" });
    }

    invite.status = "rejected";
    await invite.save();

    return res.status(200).json({ message: "Invitation rejected" });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

// ==========================================
// 3. CREATE INVITATION
// ==========================================
exports.postSetEmailInvitation = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { inviteeEmail, role } = req.body;
    const currentUserId = req.session?.user?._id || req.session?.user;

    if (!currentUserId) {
      return res.status(401).json({
        message: "Unauthorized: Session expired or user not logged in.",
      });
    }

    if (
      !inviteeEmail ||
      typeof inviteeEmail !== "string" ||
      !inviteeEmail.includes("@")
    ) {
      return res
        .status(400)
        .json({ message: "Valid email address is required." });
    }

    if (!teamId || teamId === "undefined") {
      return res.status(400).json({ message: "Invalid team ID provided." });
    }

    const normalizedEmail = inviteeEmail.trim().toLowerCase();

    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: "Team not found." });

    // Check Creator or Admin privileges safely
    const isCreator = team.createdBy?.toString() === currentUserId.toString();
    const currentUserMember = team.members?.find(
      (m) => m.user?.toString() === currentUserId.toString(),
    );
    const isAdmin = currentUserMember?.role === "admin";

    if (!isCreator && !isAdmin) {
      return res.status(403).json({
        message: "Access denied. Only team creator or admins can send invites.",
      });
    }

    // Check if recipient is already a member
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      const isAlreadyMember = team.members?.some(
        (m) => m.user?.toString() === existingUser._id.toString(),
      );
      if (isAlreadyMember) {
        return res
          .status(400)
          .json({ message: "User is already a member of this team." });
      }
    }

    // Check for existing pending invitation
    const existingInvitation = await Invitation.findOne({
      inviteeEmail: normalizedEmail,
      teamId,
      status: "pending",
    });

    if (existingInvitation) {
      return res.status(400).json({
        message: "A pending invitation has already been sent to this email.",
      });
    }

    // Save invitation
    const newInvitation = new Invitation({
      teamId,
      inviteeEmail: normalizedEmail,
      invitedBy: currentUserId,
      role: role || "member",
      status: "pending",
    });

    await newInvitation.save();
    return res.status(201).json({ message: "Invitation sent successfully!" });
  } catch (err) {
    console.error("Error creating invitation:", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

// ==========================================
// 4. GET MY INVITATIONS
// ==========================================
// invitation.controller.js
exports.getMyInvitations = async (req, res) => {
  try {
    const email = req.params.inviteeEmail.trim().toLowerCase();

    const invitations = await Invitation.find({
      inviteeEmail: email,
      status: "pending", // ensure you filter by pending status
    })
      .populate("teamId", "name")
      .populate("invitedBy", "name email");

    res.status(200).json({ invitations });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
