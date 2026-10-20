import * as notificationModel from '../models/notificationModel.js';

/**
 * GET /api/notifications/unread-count/:userId
 * Returns the count of unread notifications for a user.
 */
export const getUnreadCount = async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required.' });
    }

    const count = await notificationModel.getUnreadCount(userId);

    res.json({ count });
  } catch (error) {
    console.error('Error fetching unread notification count:', error);
    next(error);
  }
};

/**
 * GET /api/notifications/:userId
 * Returns all notifications for a user, newest first.
 * Accepts optional ?limit= query parameter.
 */
export const getNotifications = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { limit } = req.query;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required.' });
    }

    const notifications = await notificationModel.getNotificationsByRecipient(
      userId,
      limit ? parseInt(limit, 10) : 50
    );

    res.json({ notifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    next(error);
  }
};

/**
 * POST /api/notifications
 * Creates a new notification. Primarily for testing/manual creation.
 * Expects: { user_id, type, title, message, action_link?, metadata? }
 */
export const createNotification = async (req, res, next) => {
  try {
    const data = req.body;

    if (!data.user_id || !data.type || !data.title || !data.message) {
      return res.status(400).json({
        message: 'Missing required fields: user_id, type, title, message',
      });
    }

    const notification = await notificationModel.createNotification(data);

    res.status(201).json({
      message: 'Notification created.',
      notification,
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    next(error);
  }
};

/**
 * POST /api/notifications/log
 * Creates a notification log entry (for SMS/Email delivery tracking).
 * Expects: { notification_id?, channel, recipient, message, status, ... }
 */
export const createLog = async (req, res, next) => {
  try {
    const data = req.body;

    if (!data.channel || !data.message) {
      return res.status(400).json({
        message: 'Missing required fields: channel, message',
      });
    }

    const logEntry = await notificationModel.createNotificationLog(data);

    res.status(201).json({
      message: 'Notification log created.',
      logEntry,
    });
  } catch (error) {
    console.error('Error creating notification log:', error);
    next(error);
  }
};

/**
 * PATCH /api/notifications/:id/read
 * Marks a single notification as read.
 */
export const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: 'Notification ID is required.' });
    }

    const notification = await notificationModel.markNotificationRead(id);

    res.json({
      message: 'Notification marked as read.',
      notification,
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    next(error);
  }
};

/**
 * PATCH /api/notifications/read-all/:userId
 * Marks all notifications for a user as read.
 */
export const markAllAsRead = async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required.' });
    }

    const count = await notificationModel.markAllNotificationsRead(userId);

    res.json({
      message: `Marked ${count} notification(s) as read.`,
      updatedCount: count,
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    next(error);
  }
};

/**
 * DELETE /api/notifications/:id
 * Deletes a notification.
 */
export const deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: 'Notification ID is required.' });
    }

    await notificationModel.deleteNotification(id);

    res.json({ message: 'Notification deleted.' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    next(error);
  }
};
