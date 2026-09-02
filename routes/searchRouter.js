const express = require("express");
const router = express.Router();
const User = require("../models/user.model"); // Adjust to your actual User model path
const Task = require("../models/task.model"); // Adjust to your actual Task model path

// GET /search?query=...
router.get("/search", async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || !query.trim()) {
      return res.status(200).json({ success: true, results: [] });
    }

    // Escape regex characters to prevent injection
    const sanitizedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const searchRegex = new RegExp(sanitizedQuery, "i");

    // Execute queries across models concurrently
    const [users, tasks] = await Promise.all([
      User.find({
        $or: [{ name: searchRegex }, { email: searchRegex }],
      })
        .select("name email avatar")
        .limit(5),

      Task.find({
        $or: [{ title: searchRegex }, { description: searchRegex }],
      })
        .select("title description status")
        .limit(5),
    ]);

    // Format output uniform for the SearchBar UI
    const formattedUsers = users.map((u) => ({
      _id: u._id,
      title: u.name,
      description: u.email,
      type: "user",
    }));

    const formattedTasks = tasks.map((t) => ({
      _id: t._id,
      title: t.title,
      description: t.description,
      type: "task",
    }));

    const results = [...formattedUsers, ...formattedTasks];
    return res.status(200).json({ success: true, results });
  } catch (error) {
    console.error("Search endpoint error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server search error" });
  }
});

module.exports = router;
