const Task = require("../models/task.model");
const Notification = require("../models/Notification").default;
const User = require("../models/user.model");
// exports.postAddTask = async (req, res) => {
//   let { title, subTask, userName, adminName, teamName, dueDate } = req.body;
//   const existingTask = await Task.findOne({
//     title,
//     assignedTo: userName,
//     team: teamName,
//   });

//   if (existingTask) {
//     return res.status(400).send("Task already exists");
//   }

//   let newTask = new Task({
//     title,
//     subTask,
//     assignedTo: userName,
//     assignedBy: adminName,
//     team: teamName,
//     dueDate,
//   });
//   await newTask
//     .save()
//     .then(() => {
//       console.log("Task added");
//       res.send({ message: "Task added" });
//     })
//     .catch((err) => {
//       res.send({ message: "Error while adding Task", err });
//     });
// };

// exports.postAddTask = async (req, res) => {
//   try {
//     let { title, subTask, userName, adminName, teamName, dueDate } = req.body;

//     const existingTask = await Task.findOne({
//       title,
//       assignedTo: userName,
//       team: teamName,
//     });

//     if (existingTask) {
//       return res.status(400).send("Task already exists");
//     }

//     let newTask = new Task({
//       title,
//       subTask,
//       assignedTo: userName,
//       assignedBy: adminName,
//       team: teamName,
//       dueDate,
//     });

//     await newTask.save();
//     console.log("Task added");

//     // -------------------------------------------------------------
//     // CREATE NOTIFICATION FOR ASSIGNED USER
//     // -------------------------------------------------------------
//     // Find assigned user's ID using their username/email
//     const recipientUser = await User.findOne({
//       $or: [{ name: userName }, { email: userName }],
//     });

//     if (recipientUser) {
//       await Notification.create({
//         recipient: recipientUser._id,
//         sender: req.session?.user || null,
//         type: "TASK_ASSIGNED",
//         task: newTask._id,
//         title: "New Task Assigned",
//         message: `You have been assigned a new task: "${title}" by ${adminName}.`,
//       });
//     }

//     return res.status(201).json({ message: "Task added" });
//   } catch (err) {
//     console.error("Error while adding Task:", err);
//     return res
//       .status(500)
//       .json({ message: "Error while adding Task", err: err.message });
//   }
// };
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
    userTask.statuse = "pending";
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

// exports.updateTaskStatus = async (req, res) => {
//   try {
//     const { userId, index } = req.params;

//     // 1. Find the task document
//     const userTask = await Task.findOne({ assignedTo: userId });

//     if (!userTask) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Task not found" });
//     }

//     // 2. Safely check if subTask exists at that index
//     if (!userTask.subTask || !userTask.subTask[index]) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Invalid subTask index" });
//     }

//     // 3. Toggle the boolean value (flip true to false, or false to true)
//     userTask.subTask[index].completed = !userTask.subTask[index].completed;
//     //1.1 Setting Progres
//     let completed = userTask.subTask.filter((task) => task.completed === true);
//     console.log("Completed Task:", completed.length);
//     userTask.progress = (completed.length / userTask.subTask.length) * 100;
//     console.log("Total Task:", userTask.subTask.length);
//     console.log("Progress:", userTask.progress);
//     //3.1 Change Status
//     userTask.status = userTask.progress === 100 ? "completed" : "pending";
//     // 4. Save to database using await
//     const updatedTask = await userTask.save();

//     // 5. Send updated task back to the client
//     res.status(200).json({
//       success: true,
//       message: "Task updated successfully",
//       task: updatedTask,
//     });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };
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

const mongoose = require("mongoose");

exports.postAddTask = async (req, res) => {
  try {
    let { title, subTask, userName, adminName, teamName, dueDate } = req.body;

    // Resolve assignedBy ID from session or payload
    const assignedByUserId = req.session?.user?._id || adminName;

    // Validate assignedBy presence and format
    if (
      !assignedByUserId ||
      !mongoose.Types.ObjectId.isValid(assignedByUserId)
    ) {
      return res.status(400).json({
        message:
          "Task creation failed: A valid Admin/Assigner ID (assignedBy) is required.",
      });
    }

    if (!userName || !mongoose.Types.ObjectId.isValid(userName)) {
      return res.status(400).json({
        message: "Task creation failed: Invalid or missing assigned user ID.",
      });
    }

    // Check duplicate
    const existingTask = await Task.findOne({
      title,
      assignedTo: userName,
      team: teamName,
    });

    if (existingTask) {
      return res
        .status(400)
        .json({ message: "Task already exists for this user and team." });
    }

    // Create Task
    const newTask = new Task({
      title,
      subTask,
      assignedTo: userName,
      assignedBy: assignedByUserId, // Guaranteed non-undefined valid ObjectId
      team: teamName,
      dueDate,
    });

    await newTask.save();

    // Create Notification
    await Notification.create({
      recipient: userName,
      sender: assignedByUserId,
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
// Inside task.controller.js

exports.postAddTask = async (req, res) => {
  try {
    const { title, subTask, assignedTo, assignedBy, team, dueDate } = req.body;

    // Format subTask array to ensure every item has a title property
    const formattedSubtasks = Array.isArray(subTask)
      ? subTask
          .filter((st) => Boolean(st)) // Remove empty entries
          .map((st) => ({
            title: typeof st === "string" ? st : st.title || st.text || "",
            completed:
              typeof st === "object" && st.completed ? st.completed : false,
          }))
      : [];

    const newTask = new Task({
      title,
      subTask: formattedSubtasks,
      assignedTo,
      assignedBy,
      team,
      dueDate,
    });

    const savedTask = await newTask.save();

    return res.status(201).json({
      success: true,
      message: "Task created successfully",
      task: savedTask,
    });
  } catch (error) {
    console.error("Error creating task:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create task",
    });
  }
};

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
    // Check if your schema uses 'user' or 'userId'
    const deletedTask = await Task.findOneAndDelete({
      _id: taskId,
      user: userId, // Change to 'userId: userId' if your schema field is named 'userId'
    });

    if (!deletedTask) {
      return res
        .status(404)
        .json({ success: false, message: "Task not found or unauthorized" });
    }

    // Explicitly return HTTP 200 OK
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

// Delete Subtask
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
    const task = await Task.findOne({ _id: taskId, user: userId });

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
