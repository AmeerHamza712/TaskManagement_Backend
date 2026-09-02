const Team = require("../models/team.model");
const User = require("../models/user.model");
const Task = require("../models/task.model");
const Invitation = require("../models/invitation.model");

// Create Team
exports.postCreateTeam = async (req, res) => {
  try {
    if (!req.session?.isLoggedIn || !req.session?.user) {
      return res.status(401).json({ message: "Login first" });
    }

    const { teamName, members = [], inviteEmail } = req.body;

    if (!teamName || teamName.trim() === "") {
      return res.status(400).json({ message: "Team name is required" });
    }

    const teamExists = await Team.exists({ name: teamName.trim() });
    if (teamExists) {
      return res
        .status(400)
        .json({ message: "A team with this name already exists" });
    }

    const currentUserId = (req.session.user._id || req.session.user).toString();

    const additionalMembers = (Array.isArray(members) ? members : [])
      .filter((userId) => userId && userId.toString() !== currentUserId)
      .map((userId) => ({
        user: userId,
        role: "member",
      }));

    const teamMembers = [
      { user: currentUserId, role: "admin" },
      ...additionalMembers,
    ];

    const newTeam = new Team({
      name: teamName.trim(),
      createdBy: currentUserId,
      members: teamMembers,
    });

    await newTeam.save();

    if (
      inviteEmail &&
      typeof inviteEmail === "string" &&
      inviteEmail.trim() !== ""
    ) {
      const newInvite = new Invitation({
        teamId: newTeam._id,
        inviteeEmail: inviteEmail.trim().toLowerCase(),
        invitedBy: currentUserId,
        role: "member",
        status: "pending",
      });
      await newInvite.save();
    }

    return res.status(201).json({
      message: "Team created successfully",
      teamId: newTeam._id,
    });
  } catch (err) {
    console.error("Error creating team:", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

// Add Member to Team
exports.addMember = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required." });
    }

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    const alreadyMember = team.members.some(
      (m) => m.user && m.user.toString() === userId,
    );

    if (alreadyMember) {
      return res.status(400).json({ message: "User is already a team member" });
    }

    team.members.push({
      user: userId,
      role: "member",
    });

    await team.save();

    await User.findByIdAndUpdate(userId, {
      $set: {
        message: "Congratulations! You have been added as a team member.",
      },
    });

    return res.status(200).json({ message: "Member added successfully", team });
  } catch (err) {
    console.error("Error adding member:", err);
    return res.status(500).json({
      message: "Server error while adding member",
      error: err.message,
    });
  }
};

exports.addTeamMember = exports.addMember;

// Get Available / Unassigned Users (Dual key compatibility)
exports.unAssignedUser = async (req, res) => {
  try {
    const assignedUserIds = await Team.distinct("members.user");
    const unAssigned = await User.find({
      _id: { $nin: assignedUserIds },
    }).select("name username email");

    return res.status(200).json({
      message: "Unassigned members fetched successfully",
      count: unAssigned.length,
      users: unAssigned,
      unAssigned: unAssigned,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error fetching unassigned members",
      error: error.message,
    });
  }
};

exports.getAvailableMembers = exports.unAssignedUser;

// Get Teams List
exports.getTeams = async (req, res) => {
  try {
    const teams = await Team.find();
    return res.status(200).json({
      success: true,
      teams,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMyTeams = exports.getTeams;

// Remove Member
exports.postDeleteMember = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { userId } = req.body;

    const updatedTeam = await Team.findByIdAndUpdate(
      teamId,
      { $pull: { members: { user: userId } } },
      { new: true },
    );

    return res
      .status(200)
      .json({ message: "Member removed successfully", team: updatedTeam });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

// Team Progress Breakdown
exports.getTeamsProgress = async (req, res) => {
  try {
    const { teamId } = req.params;
    const teamTasks = await Task.find({ team: teamId });
    const totalTasks = teamTasks.length;

    let overallProgress = 0;
    if (totalTasks > 0) {
      const sumProgress = teamTasks.reduce(
        (sum, task) => sum + (task.progress || 0),
        0,
      );
      overallProgress = Math.round(sumProgress / totalTasks);
    }

    return res.status(200).json({
      success: true,
      teamId,
      overallProgress,
      totalTasks,
      tasks: teamTasks,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get Single Team Members
exports.getTeamMembers = async (req, res) => {
  try {
    let { teamName } = req.params;
    let team = await Team.findById(teamName)
      .select("members.user")
      .populate("members.user", "name email _id");

    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    let presentMembers = team.members.filter((m) => m.user != null);

    return res.json({
      message: "Team members fetched",
      TeamMember: presentMembers,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Progress Overview
exports.getProg = async (req, res) => {
  try {
    let progress = await Team.aggregate([
      { $sort: { teamProgress: 1 } },
      {
        $group: {
          _id: null,
          pooraDoc: { $push: { progress: "$teamProgress", name: "$name" } },
        },
      },
      { $project: { _id: 0, pooraDoc: 1 } },
    ]);
    return res.send({ message: "Progress Fetched:", progress });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Remove Team
exports.removeTeam = async (req, res) => {
  try {
    const { id } = req.params;
    const team = await Team.findOneAndDelete({ _id: id });

    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    await Task.deleteMany({ team: id });
    return res.status(200).json({ message: "Team deleted successfully" });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};
