const express = require("express");
const router = express.Router();
const {
  getNotifications,
  markAsRead,
  deleteNotification,
} = require("../controllers/notification.controller");

// Session Authentication Middleware
const isAuthenticated = (req, res, next) => {
  if (!req.session?.user) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  next();
};

router.use(isAuthenticated);

// Mapped route endpoints
router.get("/notifications", getNotifications);
router.patch("/notifications/:id/read", markAsRead);
router.delete("/notifications/:id", deleteNotification);

module.exports = router;
