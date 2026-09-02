const express = require("express");
const teamRouter = express.Router();

const {
  postCreateTeam,
  addMember,
  getAvailableMembers,
  postDeleteMember,
  getTeamsProgress,
  getTeams,
  getTeamMembers,
  getProg,
  removeTeam,
  unAssignedUser,
} = require("../controllers/team.controller");

// Prefixing routes consistently with /teams
teamRouter.post("/teams/createTeam", postCreateTeam);
teamRouter.post("/teams/addMember/:teamId", addMember);
teamRouter.get("/teams/availableUser", getAvailableMembers);
teamRouter.delete("/teams/deleteMember/:teamId", postDeleteMember);
teamRouter.get("/teams/getTeamProgress/:teamId", getTeamsProgress);
teamRouter.get("/teams/getTeams", getTeams);
teamRouter.get("/teams/getTeamMembers/:teamName", getTeamMembers);
teamRouter.get("/teams/getProg", getProg);
teamRouter.delete("/teams/removeTeam/:id", removeTeam);
teamRouter.get("/teams/getUnAssignedUsers", unAssignedUser);

module.exports = teamRouter;
