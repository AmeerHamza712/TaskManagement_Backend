import Notification from "../models/Notification.js";
import User from "../models/User.js";

export const sendNotification = async ({
  recipientId,
  senderId = null,
  type,
  taskId,
  title,
  message,
}) => {
  try {
    const user = await User.findById(recipientId);
    if (!user) return;

    // Check notification preference settings in User schema
    const settings = user.notificationSettings;
    if (type === "TASK_ASSIGNED" && settings?.taskAssigned === false) return;
    if (type === "TASK_OVERDUE" && settings?.taskOverdue === false) return;

    await Notification.create({
      recipient: recipientId,
      sender: senderId,
      type,
      task: taskId,
      title,
      message,
    });
  } catch (error) {
    console.error("Error creating notification:", error.message);
  }
};
