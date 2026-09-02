const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    subTask: [
      {
        title: String,
        completed: {
          type: Boolean,
          default: false,
        },
      },
    ],
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    progress: {
      type: Number,
      default: 0,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true, // 🌟 FIX 1: Made required because of the index logic below
    },
    status: {
      type: String,
      enum: ["pending", "in-progress", "completed"],
      default: "pending",
    },
    dueDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

// 🌟 FIX 2: Modified index behavior to align safely with MERN layout logic
taskSchema.index(
  {
    title: 1,
    team: 1,
  },
  {
    unique: true,
  },
);

module.exports = mongoose.model("Task", taskSchema);
