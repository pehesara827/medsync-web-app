import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { supabase } from '../../../supabaseClient';
import {
  X,
  Bell,
  Clock,
  Calendar,
  CheckCheck,
  Info,
  MoreVertical,
  Trash2,
  Loader,
  Frown,
} from 'lucide-react';

// ─────────────────────────────
// Helpers
// ─────────────────────────────

/**
 * Map each notification `type` to an icon + accent color.
 * Falls back to the SYSTEM (Bell) icon for unknown types.
 */
const TYPE_CONFIG = {
  GENERAL: { Icon: Bell, color: 'text-slate-500 dark:text-slate-400', badge: 'bg-slate-100 dark:bg-slate-800' },
  WAITLIST_OFFER: { Icon: Clock, color: 'text-amber-500', badge: 'bg-amber-50 dark:bg-amber-950/30' },
  WAITLIST_EXPIRED: { Icon: Clock, color: 'text-slate-500 dark:text-slate-400', badge: 'bg-slate-50 dark:bg-slate-800' },
  APPOINTMENT_CONFIRMED: { Icon: Calendar, color: 'text-emerald-500', badge: 'bg-emerald-50 dark:bg-emerald-950/30' },
  APPOINTMENT_CANCELLED: { Icon: Calendar, color: 'text-red-500', badge: 'bg-red-50 dark:bg-red-950/30' },
  SESSION_DELAY: { Icon: Clock, color: 'text-orange-500', badge: 'bg-orange-50 dark:bg-orange-950/30' },
  PAYMENT_RECEIVED: { Icon: Info, color: 'text-cyan-500', badge: 'bg-cyan-50 dark:bg-cyan-950/30' },
};

/**
 * Returns Tailwind classes for the colored status dot.
 */
const getUnreadDotClass = (isRead) =>
  isRead ? 'bg-slate-300 dark:bg-slate-600' : 'bg-[#00b8e6]';

/**
 * Formats an ISO timestamp into a friendly "time ago" string.
 * e.g. 'just now', '5m ago', '2h ago', '3d ago', or a date.
 */
const formatTimeAgo = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';

  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// ─────────────────────────────
// Component
// ─────────────────────────────

/**
 * NotificationPanel — a slide-out side panel that lists the current user's
 * in-app notifications, fetched from the existing backend API.
 *
 * Features:
 *  - Live updates via Supabase Realtime on the `notifications` table
 *  - Tab filter: All | Unread
 *  - Per-notification: mark-as-read / delete via context menu
 *  - "Mark all as read" action
 *  - Clicking a notification with an `action_link` navigates to that route
 *
 * @param {object}   props
 * @param {boolean}  props.isOpen              — whether the panel should be visible
 * @param {function} props.onClose             — called when the panel is dismissed
 * @param {string}   props.userId             — the authenticated Supabase user id
 */
export default function NotificationPanel({
  isOpen,
  onClose,
  userId,
}) {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [contextMenu, setContextMenu] = useState(null); // { id, x, y }

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
  const panelRef = useRef(null);

  // ── Derived unread count (recomputed on every render — no state needed) ──
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // ── Close on Escape key ───────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  // ── Close on outside click (only when open) ────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const onOutsideClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', onOutsideClick);
    return () => document.removeEventListener('mousedown', onOutsideClick);
  }, [isOpen, onClose]);

  // ── Fetch full notification list when the panel opens ─────────────────
  useEffect(() => {
    if (!isOpen || !userId) return;

    const loadNotifications = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`${backendUrl}/api/notifications/${userId}`);
        if (!response.ok) {
          throw new Error(`Failed to load notifications (${response.status})`);
        }
        const data = await response.json();
        setNotifications(data.notifications || []);
      } catch (err) {
        setError(err.message || 'Failed to load notifications');
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();

    // Poll every 15 seconds while the panel is open as a fallback
    // in case realtime isn't enabled on the notifications table.
    const pollInterval = setInterval(loadNotifications, 15 * 1000);
    return () => clearInterval(pollInterval);
  }, [isOpen, userId, backendUrl]);

  // ── Real-time subscription to the notifications table ─────────────────
  useEffect(() => {
    if (!userId || !isOpen) return;

    const channel = supabase
      .channel(`public:notifications:recipient=${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const { event, new: newRow, old: oldRow } = payload;

          setNotifications((prev) => {
            switch (event) {
              case 'INSERT':
                // Newest first (API returns newest-first)
                return [newRow, ...prev];
              case 'UPDATE':
                return prev.map((n) =>
                  n.id === newRow.id ? { ...n, ...newRow } : n
                );
              case 'DELETE':
                return prev.filter((n) =>
                  oldRow ? n.id !== oldRow.id : n.id !== newRow.id
                );
              default:
                return prev;
            }
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, isOpen]);

  // ── Actions ───────────────────────────────────────────────────────────

  const handleMarkRead = async (id) => {
    setActionLoadingId(id);
    try {
      const response = await fetch(`${backendUrl}/api/notifications/${id}/read`, {
        method: 'PATCH',
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      setError(err.message || 'Failed to mark notification as read');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleMarkAllRead = async () => {
    setActionLoadingId('all');
    try {
      const response = await fetch(
        `${backendUrl}/api/notifications/read-all/${userId}`,
        { method: 'PATCH' }
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true }))
      );
    } catch (err) {
      setError(err.message || 'Failed to mark all notifications as read');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (id) => {
    setActionLoadingId(id);
    try {
      const response = await fetch(`${backendUrl}/api/notifications/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      setError(err.message || 'Failed to delete notification');
    } finally {
      setActionLoadingId(null);
    }
  };

  // ── Context menu (three dots) ─────────────────────────────────────────
  const openContextMenu = (e, id) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setContextMenu({
      id,
      x: rect.right - 12,
      y: rect.bottom + 8,
    });
  };
  const closeContextMenu = () => setContextMenu(null);

  // ── Auto-close context menu when clicking outside it ──────────────────
  useEffect(() => {
    if (!contextMenu) return;
    const onOutsideClick = () => {
      setContextMenu(null);
    };
    document.addEventListener('mousedown', onOutsideClick);
    return () => document.removeEventListener('mousedown', onOutsideClick);
  }, [contextMenu]);

  // ── Derived list based on active tab ──────────────────────────────────
  const displayed =
    activeTab === 'unread'
      ? notifications.filter((n) => !n.is_read)
      : notifications;

  // ── Render helpers ────────────────────────────────────────────────────
  const renderNotification = (notification) => {
    const typeConfig = TYPE_CONFIG[notification.type] || TYPE_CONFIG.GENERAL;
    const Icon = typeConfig.Icon;

    return (
      <div
        key={notification.id}
        className={`relative group flex items-start gap-4 p-4 rounded-2xl border transition-colors cursor-pointer
          ${
            notification.is_read
              ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/50'
              : 'bg-white dark:bg-slate-900 border-[#00b8e6]/30 dark:border-cyan-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50'
          }`}
        onClick={() => {
          if (!notification.is_read) handleMarkRead(notification.id);
          // If the notification has a deep-link action, navigate to it
          // and close the panel so the target page can pick it up.
          if (notification.action_link) {
            navigate(notification.action_link);
            onClose();
          }
        }}
      >
        {/* Unread status dot */}
        <div
          className={`mt-0.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${getUnreadDotClass(
            notification.is_read
          )}`}
        />

        {/* Type icon */}
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${typeConfig.badge}`}
        >
          <Icon size={18} className={typeConfig.color} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm font-semibold ${
              notification.is_read
                ? 'text-slate-500 dark:text-slate-400'
                : 'text-slate-800 dark:text-slate-100'
            }`}
          >
            {notification.title || 'Notification'}
          </p>
          {notification.message && (
            <p
              className={`mt-0.5 text-sm line-clamp-2 ${
                notification.is_read
                  ? 'text-slate-400 dark:text-slate-500'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              {notification.message}
            </p>
          )}
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            {formatTimeAgo(notification.created_at)}
          </p>
        </div>

        {/* Context menu trigger */}
        <button
          onClick={(e) => openContextMenu(e, notification.id)}
          className="ml-2 flex-shrink-0 p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition opacity-0 group-hover:opacity-100"
          aria-label="More options"
        >
          <MoreVertical size={14} />
        </button>

        {/* Loading overlay for this action */}
        {actionLoadingId === notification.id && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-slate-800/50 rounded-2xl">
            <Loader size={16} className="text-[#00b8e6] animate-spin" />
          </div>
        )}
      </div>
    );
  };

  // ── Panel markup (always rendered; visibility controlled by `isOpen` classes) ──
  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ease-in-out ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Side Panel — slides in from the right */}
      <div
        ref={panelRef}
        className={`fixed top-0 right-0 h-full w-full max-w-sm z-50
          bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800
          shadow-2xl flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* ── Panel Header ── */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#dcf5fa] dark:bg-cyan-950/30 flex items-center justify-center">
              <Bell size={18} className="text-[#00b8e6]" />
            </div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              Notifications
            </h2>
            {unreadCount > 0 && (
              <span className="text-xs font-semibold text-white bg-[#00b8e6] rounded-full h-5 min-w-[20px] px-1.5 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={actionLoadingId === 'all'}
                className="px-2.5 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-[#00b8e6] dark:hover:text-[#00b8e6] rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50"
                title="Mark all as read"
              >
                {actionLoadingId === 'all' ? (
                  <Loader size={12} className="animate-spin" />
                ) : (
                  <CheckCheck size={14} />
                )}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
              aria-label="Close notifications"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Tab Filter ── */}
        <div className="flex items-center gap-1 p-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30">
          {['all', 'unread'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all
                ${
                  activeTab === tab
                    ? 'bg-[#00b8e6] text-white shadow'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
            >
              {tab === 'all' ? 'All' : 'Unread'}
            </button>
          ))}
        </div>

        {/* ── Panel Body ── */}
        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none] [-ms-overflow-style:none]">
          {error && (
            <div className="p-4 m-4 rounded-xl border border-red-200 dark:border-red-600 bg-red-50 dark:bg-red-950/30">
              <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader size={24} className="text-[#00b8e6] animate-spin" />
            </div>
          ) : displayed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                <Frown size={28} className="text-slate-400 dark:text-slate-500" />
              </div>
              <p className="text-slate-500 dark:text-slate-400 font-medium">
                {activeTab === 'unread'
                  ? 'No unread notifications'
                  : 'You have no notifications yet'}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                When you receive notifications, they'll appear here.
              </p>
            </div>
          ) : (
            <div className="p-3 space-y-1">
              {displayed.map(renderNotification)}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        {notifications.length > 0 && !loading && (
          <div className="p-3 border-t border-slate-200 dark:border-slate-700 text-center">
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {unreadCount > 0
                ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`
                : 'All caught up'}
            </p>
          </div>
        )}
      </div>

      {/* ── Context Menu (portaled so it isn't clipped) ── */}
      {contextMenu &&
        createPortal(
          <div
            className="fixed z-[60] min-w-[160px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1"
            style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          >
            <button
              onClick={() => {
                handleMarkRead(contextMenu.id);
                closeContextMenu();
              }}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            >
              <CheckCheck size={14} className="text-[#00b8e6]" />
              Mark as read
            </button>
            <button
              onClick={() => {
                handleDelete(contextMenu.id);
                closeContextMenu();
              }}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>,
          document.body
        )}
    </>,
    document.body
  );
}
