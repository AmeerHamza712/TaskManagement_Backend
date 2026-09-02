let mongoose = require("mongoose");

const teamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true, // Perfect - no two teams can have the exact same name
    },

    // 🏛️ Track who created the entire team (Moved outside the array)
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // 👥 Clean list of team members
    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        role: {
          type: String,
          enum: ["admin", "member"],
          default: "member",
        },
      },
    ],

    teamProgress: {
      type: Number,
      default: 0, // Great for calculating percentages like (completed tasks / total tasks) * 100
    },
  },
  { timestamps: true },
); // ⏱️ Tracks team creation and update times automatically

module.exports = mongoose.model("Team", teamSchema);
