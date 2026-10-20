import { Router } from 'express';
import {
  getUnreadCount,
  getNotifications,
  createNotification,
  createLog,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from '../controllers/notificationController.js';

const router = Router();

// GET /api/notifications/unread-count/:userId - Get unread notification count
router.get('/unread-count/:userId', getUnreadCount);

// POST /api/notifications/log - Create a notification log entry (SMS/Email/Push)
router.post('/log', createLog);

// GET /api/notifications/:userId - Get all notifications for a user
router.get('/:userId', getNotifications);

// PATCH /api/notifications/:id/read - Mark a notification as read
router.patch('/:id/read', markAsRead);

// PATCH /api/notifications/read-all/:userId - Mark all notifications as read
router.patch('/read-all/:userId', markAllAsRead);

// POST /api/notifications - Create a notification (manual/testing)
router.post('/', createNotification);

// DELETE /api/notifications/:id - Delete a notification
router.delete('/:id', deleteNotification);

export default router;
