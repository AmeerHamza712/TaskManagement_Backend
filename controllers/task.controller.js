const Task = require("../models/task.model");
const Notification = require("../models/Notification").default;
const User = require("../models/user.model");
const mongoose = require("mongoose");

exports.getProgress = async (req, res) => {
  try {
    const { taskId } = req.body;

    const userTask = await Task.findById(taskId);

    if (!userTask) {
      return res.status(404).json({ message: "Task not found" });
    }

    const totalSubtasks = userTask.subTask.length;

    // 1. Calculate completed count
    const completedCount = userTask.subTask.filter(
      (task) => task.completed,
    ).length;

    // 2. Calculate percentage safely (avoid division by zero)
    const progressPercentage =
      totalSubtasks > 0
        ? Math.round((completedCount / totalSubtasks) * 100)
        : 0;
    if (progressPercentage === 100) {
      userTask.status = "completed";
    }
    userTask.status = userTask.status || "pending";
    // 3. Update document in MongoDB and save
    userTask.progress = progressPercentage;
    await userTask.save();

    console.log(`Task ${taskId} progress updated: ${progressPercentage}%`);

    // 4. Send response
    res.status(200).json({
      message: "Progress calculated successfully",
      completedCount,
      totalSubtasks,
      progress: progressPercentage,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getTaskList = async (req, res) => {
  try {
    let { id } = req.params;

    // Fix: Pass an object or string field name to .sort()
    let userTasks = await Task.find({ assignedTo: id })
      .sort({ createdAt: -1 }) // Sort by newest first
      .limit(3);

    // Note: Task.find returns an array. Empty array [] is truthy, so check .length
    if (!userTasks || userTasks.length === 0) {
      return res
        .status(404)
        .json({ message: "No tasks found for this user", userTasks: [] });
    }

    console.log("Task List", userTasks);
    return res
      .status(200)
      .json({ message: "Tasks fetched successfully", userTasks });
  } catch (error) {
    console.error("Error in getTaskList:", error);
    return res.status(500).json({ message: error.message });
  }
};

exports.postAddTask = async (req, res) => {
  try {
    const {
      title,
      subTask,
      assignedTo,
      assignedBy,
      userName,
      adminName,
      team,
      teamName,
      dueDate,
    } = req.body;

    const resolvedAssignedTo = assignedTo || userName;
    const resolvedAssignedBy =
      assignedBy || req.session?.user?._id || adminName;
    const resolvedTeam = team || teamName;

    if (
      !resolvedAssignedBy ||
      !mongoose.Types.ObjectId.isValid(resolvedAssignedBy)
    ) {
      return res.status(400).json({
        message:
          "Task creation failed: A valid Admin/Assigner ID (assignedBy) is required.",
      });
    }

    if (
      !resolvedAssignedTo ||
      !mongoose.Types.ObjectId.isValid(resolvedAssignedTo)
    ) {
      return res.status(400).json({
        message: "Task creation failed: Invalid or missing assigned user ID.",
      });
    }

    // Check duplicate
    const existingTask = await Task.findOne({
      title,
      assignedTo: resolvedAssignedTo,
      team: resolvedTeam,
    });

    if (existingTask) {
      return res
        .status(400)
        .json({ message: "Task already exists for this user and team." });
    }

    // Format subTask array so every item has a title/completed shape
    const formattedSubtasks = Array.isArray(subTask)
      ? subTask
          .filter((st) => Boolean(st))
          .map((st) => ({
            title: typeof st === "string" ? st : st.title || st.text || "",
            completed:
              typeof st === "object" && st.completed ? st.completed : false,
          }))
      : [];

    // Create Task
    const newTask = new Task({
      title,
      subTask: formattedSubtasks,
      assignedTo: resolvedAssignedTo,
      assignedBy: resolvedAssignedBy,
      team: resolvedTeam,
      dueDate,
    });

    await newTask.save();

    // Create Notification
    await Notification.create({
      recipient: resolvedAssignedTo,
      sender: resolvedAssignedBy,
      type: "TASK_ASSIGNED",
      task: newTask._id,
      title: "New Task Assigned",
      message: `You have been assigned a new task: "${title}".`,
    });

    return res
      .status(201)
      .json({ message: "Task added successfully", task: newTask });
  } catch (err) {
    console.error("Error while adding Task:", err);
    return res
      .status(500)
      .json({ message: "Error while adding Task", err: err.message });
  }
};

// POST /updateMainTask/:userId/:taskId
exports.updateMainTask = async (req, res) => {
  const { taskId } = req.params;
  const { status, progress } = req.body;

  try {
    const updatedTask = await Task.findByIdAndUpdate(
      taskId,
      { status, progress },
      { new: true },
    );

    if (!updatedTask) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.status(200).json({ success: true, task: updatedTask });
  } catch (error) {
    console.error("Error updating task:", error);
    res.status(500).json({ message: "Server error updating task" });
  }
};

exports.updateTaskStatus = async (req, res) => {
  try {
    const { index } = req.params;
    const { taskId } = req.body;

    // 1. Find the exact task by its ID
    const userTask = await Task.findById(taskId);

    if (!userTask) {
      return res
        .status(404)
        .json({ success: false, message: "Task not found" });
    }

    const subtaskIdx = parseInt(index, 10);
    const hasSubtasks = userTask.subTask && userTask.subTask.length > 0;

    // 2. Handle Task with NO Subtasks (Main Task Toggle)
    if (!hasSubtasks) {
      const isCompleted = userTask.status?.toLowerCase() === "completed";
      userTask.status = isCompleted ? "pending" : "completed";
      userTask.progress = isCompleted ? 0 : 100;
    }
    // 3. Handle Task WITH Subtasks
    else {
      if (isNaN(subtaskIdx) || !userTask.subTask[subtaskIdx]) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid subtask index" });
      }

      // Toggle subtask status safely
      const currentStatus =
        userTask.subTask[subtaskIdx].completed ||
        userTask.subTask[subtaskIdx].isCompleted ||
        false;

      userTask.subTask[subtaskIdx].completed = !currentStatus;
      userTask.subTask[subtaskIdx].isCompleted = !currentStatus;

      // Recalculate progress percentage
      const completedCount = userTask.subTask.filter(
        (st) => st.completed || st.isCompleted,
      ).length;

      userTask.progress = Math.round(
        (completedCount / userTask.subTask.length) * 100,
      );

      // Update main status based on progress
      userTask.status = userTask.progress === 100 ? "completed" : "pending";
    }

    // 4. Save and return updated task document
    const updatedTask = await userTask.save();

    return res.status(200).json({
      success: true,
      message: "Task updated successfully",
      task: updatedTask,
    });
  } catch (error) {
    console.error("Error in updateTaskStatus:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// -----------------------------------------------------------------------
// DELETE MAIN TASK
// Fix: Task documents store ownership on `assignedTo`, not `user`.
// The old query `{ _id: taskId, user: userId }` could never match a real
// document, so every delete request came back "Task not found or unauthorized".
// -----------------------------------------------------------------------
exports.deleteTask = async (req, res) => {
  const { userId, taskId } = req.params;

  // Validate Mongo ObjectIDs
  if (
    !mongoose.Types.ObjectId.isValid(userId) ||
    !mongoose.Types.ObjectId.isValid(taskId)
  ) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid ID format" });
  }

  try {
    const deletedTask = await Task.findOneAndDelete({
      _id: taskId,
      assignedTo: userId, // was: user: userId (field didn't exist on schema)
    });

    if (!deletedTask) {
      return res
        .status(404)
        .json({ success: false, message: "Task not found or unauthorized" });
    }

    return res.status(200).json({
      success: true,
      message: "Task deleted successfully",
      taskId,
    });
  } catch (error) {
    console.error("Error deleting task:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// -----------------------------------------------------------------------
// DELETE SUBTASK
// Same fix: match on `assignedTo` instead of the nonexistent `user` field.
// -----------------------------------------------------------------------
exports.deleteSubtask = async (req, res) => {
  const { userId, taskId, subtaskIndex } = req.params;
  const index = parseInt(subtaskIndex, 10);

  if (
    !mongoose.Types.ObjectId.isValid(userId) ||
    !mongoose.Types.ObjectId.isValid(taskId)
  ) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid ID format" });
  }

  if (isNaN(index) || index < 0) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid subtask index" });
  }

  try {
    const task = await Task.findOne({ _id: taskId, assignedTo: userId }); // was: user: userId

    if (!task) {
      return res
        .status(404)
        .json({ success: false, message: "Task not found" });
    }

    if (!task.subTask || index >= task.subTask.length) {
      return res
        .status(400)
        .json({ success: false, message: "Subtask index out of bounds" });
    }

    // Remove subtask from array
    task.subTask.splice(index, 1);

    // Recalculate progress and status
    const totalSubtasks = task.subTask.length;
    if (totalSubtasks > 0) {
      const completedCount = task.subTask.filter(
        (st) => st.completed || st.isCompleted,
      ).length;
      task.progress = Math.round((completedCount / totalSubtasks) * 100);
      task.status = task.progress === 100 ? "completed" : "pending";
    } else {
      task.progress = 0;
      task.status = "pending";
    }

    await task.save();

    return res.status(200).json({
      success: true,
      message: "Subtask deleted successfully",
      task,
    });
  } catch (error) {
    console.error("Error deleting subtask:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
