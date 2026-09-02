let express = require("express");
let taskRouter = express.Router();
let {
  postAddTask,
  getProgress,
  updateTaskStatus,
  getTaskList,
  updateMainTask,
  deleteTask,
  deleteSubtask,
} = require("../controllers/task.controller");

// Fetch Routes
taskRouter.get("/getProgress", getProgress);
taskRouter.get("/getTaskList/:id", getTaskList);

// Create / Update Routes
taskRouter.post("/addTask", postAddTask);
taskRouter.post("/updateTaskStatus/:userId/:index", updateTaskStatus);
taskRouter.post("/updateMainTask/:userId/:taskId", updateMainTask);

// Delete Routes
taskRouter.delete("/deleteTask/:userId/:taskId", deleteTask);
taskRouter.delete(
  "/deleteSubtask/:userId/:taskId/:subtaskIndex",
  deleteSubtask,
);

module.exports = taskRouter;
