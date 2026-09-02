let mongoose = require("mongoose");
let userSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true, // Required, but NOT unique so multiple users can share names!
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    role: {
      type: String,
      enum: ["admin", "member"],
      default: "member",
    },
    password: {
      type: String,
      required: true,
    },
    userAdded: {
      type: Boolean,
      default: false,
    },

    // 👤 1. ADDED FOR EDIT PROFILE SETTINGS
    profile: {
      avatar: { type: String, default: "" }, // Stores image URL or path
      title: { type: String, default: "Team Member" }, // e.g., "Web Developer"
      bio: { type: String, default: "" },
    },

    // 🔔 2. ADDED FOR NOTIFICATION TOGGLES
    notificationSettings: {
      taskAssigned: { type: Boolean, default: true },
      taskOverdue: { type: Boolean, default: true },
    },
  },
  { timestamps: true },
); // ⏱️ Automatically tracks "createdAt" and "updatedAt"

module.exports = mongoose.model("User", userSchema);
