import { supabase } from '../supabase.js';

/**
 * Creates an in-app notification record.
 *
 * @param {Object} data - Notification data
 * @param {string} data.user_id - UUID of the auth user who should receive the notification
 * @param {string} data.type - One of: 'WAITLIST_OFFER', 'APPOINTMENT_CONFIRMED', 'APPOINTMENT_CANCELLED', 'SESSION_DELAY', 'PAYMENT_RECEIVED', 'GENERAL'
 * @param {string} data.title - Short title for the notification
 * @param {string} data.message - Full notification message
 * @param {string|undefined} data.action_link - Optional link to navigate to when clicked
 * @param {Object|undefined} data.metadata - Optional JSON metadata
 * @returns {Promise<Object>} Created notification record
 */
export const createNotification = async (data) => {
  const {
    user_id,
    type,
    title,
    message,
    action_link,
    metadata,
  } = data;

  if (!user_id || !type || !title || !message) {
    throw new Error('Missing required notification fields');
  }

  const { data: notification, error } = await supabase
    .from('notifications')
    .insert([
      {
        user_id,
        type,
        title,
        message,
        action_link: action_link || null,
        metadata: metadata || {},
        is_read: false,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return notification;
};

/**
 * Logs a notification delivery attempt (for SMS/Email/Push placeholders).
 *
 * @param {Object} data - Log data
 * @param {string} data.notification_id - UUID of the related notification
 * @param {string} data.channel - 'IN_APP', 'EMAIL', 'SMS', or 'PUSH'
 * @param {string} data.recipient - Phone number or email address
 * @param {string} data.subject - Subject line (for email)
 * @param {string} data.message - The message body
 * @param {string} data.status - 'PENDING', 'SENT', 'FAILED', or 'SKIPPED'
 * @param {Object|null} data.provider_response - Response from the provider (if any)
 * @param {string|null} data.error_message - Error message if failed
 * @returns {Promise<Object>} Created notification_log record
 */
export const createNotificationLog = async (data) => {
  const {
    notification_id,
    channel = 'IN_APP',
    recipient,
    subject,
    message,
    status = 'PENDING',
    provider_response,
    error_message,
  } = data;

  const { data: logEntry, error } = await supabase
    .from('notification_log')
    .insert([
      {
        notification_id: notification_id || null,
        channel,
        recipient: recipient || null,
        subject: subject || null,
        message,
        status,
        provider_response: provider_response || null,
        error_message: error_message || null,
        sent_at: status === 'SENT' ? new Date().toISOString() : null,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return logEntry;
};

/**
 * Retrieves all notifications for a given user, newest first.
 *
 * @param {string} userId - UUID of the auth user
 * @param {number} [limit=50] - Max results to return
 * @returns {Promise<Array>} Array of notification objects
 */
export const getNotificationsByRecipient = async (userId, limit = 50) => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
};

/**
 * Gets the count of unread notifications for a user.
 *
 * @param {string} userId - UUID of the auth user
 * @returns {Promise<number>} Unread notification count
 */
export const getUnreadCount = async (userId) => {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) throw error;
  return count || 0;
};

/**
 * Marks a single notification as read.
 *
 * @param {string} notificationId - UUID of the notification
 * @returns {Promise<Object>} Updated notification record
 */
export const markNotificationRead = async (notificationId) => {
  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Marks all notifications for a user as read.
 *
 * @param {string} userId - UUID of the auth user
 * @returns {Promise<number>} Number of notifications marked as read
 */
export const markAllNotificationsRead = async (userId) => {
  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('is_read', false)
    .select();

  if (error) throw error;
  return data?.length || 0;
};

/**
 * Deletes a notification (for cleanup).
 *
 * @param {string} notificationId - UUID of the notification
 * @returns {Promise<void>}
 */
export const deleteNotification = async (notificationId) => {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId);

  if (error) throw error;
};