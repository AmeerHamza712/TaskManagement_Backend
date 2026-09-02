import Notification from "../models/Notification.js";

// GET /notifications - Get user notifications with counts
export const getNotifications = async (req, res) => {
  try {
    if (!req.session?.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: User session missing.",
      });
    }

    const userId = req.session.user._id || req.session.user;

    const notifications = await Notification.find({ recipient: userId })
      .populate("sender", "name avatar")
      .populate("task", "title")
      .sort({ createdAt: -1 })
      .limit(20);

    const unreadCount = await Notification.countDocuments({
      recipient: userId,
      isRead: false,
    });

    return res.status(200).json({
      success: true,
      count: notifications.length,
      unreadCount: unreadCount,
      data: notifications,
    });
  } catch (error) {
    console.error("Error in getNotifications:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH /notifications/:id/read - Mark single notification read
export const markAsRead = async (req, res) => {
  try {
    if (!req.session?.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const userId = req.session.user._id || req.session.user;

    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: userId },
      { isRead: true },
      { new: true },
    );

    if (!notification) {
      return res
        .status(404)
        .json({ success: false, message: "Notification not found" });
    }

    return res.status(200).json({ success: true, data: notification });
  } catch (error) {
    console.error("Error in markAsRead:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /notifications/:id - Delete single notification
export const deleteNotification = async (req, res) => {
  try {
    if (!req.session?.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const userId = req.session.user._id || req.session.user;

    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: userId,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found or unauthorized",
      });
    }

    return res
      .status(200)
      .json({ success: true, message: "Notification deleted successfully" });
  } catch (error) {
    console.error("DELETE /notifications Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
