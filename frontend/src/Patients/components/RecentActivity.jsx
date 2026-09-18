import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Receipt, CalendarCheck2, Plus } from 'lucide-react';
import ReceiptModal from './ReceiptModal';
// Fallback mock data used when no real appointments are provided
const FALLBACK_ACTIVITIES = [
  {
    id: 1,
    displayId: 'ACT-1001',
    doctorName: 'Dr. Emily Chen',
    doctorImage: 'https://images.unsplash.com/photo-1594824813566-88855ce783d1?auto=format&fit=crop&q=80&w=200',
    date: 'Oct 20, 2023',
    time: '9:00 AM',
    reason: 'Annual Checkup',
    status: 'Completed',
  },
  {
    id: 2,
    displayId: 'ACT-1002',
    doctorName: 'Dr. Sarah Jenkins',
    doctorImage: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=200',
    date: 'Sep 15, 2023',
    time: '10:30 AM',
    reason: 'Dental Cleaning',
    status: 'Completed',
  },
  {
    id: 3,
    displayId: 'ACT-1003',
    doctorName: 'Dr. Alan Turing',
    doctorImage: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=200',
    date: 'Aug 28, 2023',
    time: '2:00 PM',
    reason: 'Cognitive Assessment',
    status: 'Completed',
  },
  {
    id: 4,
    displayId: 'ACT-1004',
    doctorName: 'Dr. Marcus Webb',
    doctorImage: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=200',
    date: 'Aug 10, 2023',
    time: '11:15 AM',
    reason: 'Knee Pain',
    status: 'Completed',
  },
  {
    id: 5,
    displayId: 'ACT-1005',
    doctorName: 'Dr. Lisa Ray',
    doctorImage: 'https://images.unsplash.com/photo-1594824813566-88855ce783d1?auto=format&fit=crop&q=80&w=200',
    date: 'Jul 22, 2023',
    time: '3:30 PM',
    reason: 'Eye Exam',
    status: 'Completed',
  },
  {
    id: 6,
    displayId: 'ACT-1006',
    doctorName: 'Dr. James Wilson',
    doctorImage: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=200',
    date: 'Jun 30, 2023',
    time: '9:45 AM',
    reason: 'Blood Test',
    status: 'Completed',
  },
];

/**
 * Maps a database/appointment status to a friendly display label.
 */
const getDisplayStatus = (rawStatus) => {
  const status = (rawStatus || '').toUpperCase();
  switch (status) {
    case 'COMPLETED':
      return 'Completed';
    case 'CANCELLED':
      return 'Cancelled';
    case 'MISSED':
      return 'Missed';
    case 'CONFIRMED':
      return 'Confirmed';
    case 'PENDING':
      return 'Pending';
    case 'UPCOMING':
      return 'Upcoming';
    case 'SCHEDULED':
      return 'Scheduled';
    case 'WAITLIST':
      return 'Waitlist';
    default:
      return rawStatus || '—';
  }
};

/**
 * Returns Tailwind badge classes based on the appointment status.
 * Completed → green, Cancelled → red, everything else → blue/cyan.
 */
const getStatusBadgeClasses = (rawStatus) => {
  const status = (rawStatus || '').toUpperCase();
  if (status === 'COMPLETED') {
    return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300';
  }
  if (status === 'CANCELLED' || status === 'MISSED') {
    return 'bg-red-50 text-red-600 dark:bg-red-500/20 dark:text-red-300';
  }
  return 'bg-[#dcf5fa] text-[#00b0d8] dark:bg-cyan-500/20 dark:text-cyan-300';
};

/**
 * Formats a status-change timestamp into a readable "when" label.
 * e.g. '2h ago', '1d ago', or a friendly date.
 */
const formatUpdatedTime = (updatedAt) => {
  if (!updatedAt) return '';
  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) return '';

  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Rolling window (in days) for what counts as "recent".
 * A row shows iff it was newly booked OR changed within this window.
 */
const RECENT_DAYS = 5;
const RECENT_WINDOW_MS = RECENT_DAYS * 24 * 60 * 60 * 1000;
// Tolerance so the initial INSERT (createdAt == updatedAt) is not
// mistaken for a later change due to ms rounding.
const CHANGE_TOLERANCE_MS = 60 * 1000;

/**
 * Returns true when the given timestamp falls inside the recent window.
 * Missing / invalid dates return false (stale rows are excluded, not shown).
 */
const isWithinLastDays = (timestamp, now = Date.now()) => {
  if (!timestamp) return false;
  const time = new Date(timestamp).getTime();
  if (Number.isNaN(time)) return false;
  return now - time <= RECENT_WINDOW_MS;
};

/**
 * Derives the Recent Activity row list from real appointment data.
 * - Booked / active / completed rows: shown if newly booked OR changed
 *   in the last RECENT_DAYS (sorted by most recent change first).
 * - CANCELLED / MISSED rows: shown ONLY if the cancellation / missed-marking
 *   itself happened in the last RECENT_DAYS (updatedAt meaningfully after
 *   createdAt AND inside the window). Older terminal rows never resurface.
 */
const buildActivitiesFromAppointments = (appointments) => {
  if (!appointments || appointments.length === 0) return [];

  const sorted = [...appointments]
    .filter((appt) => {
      const now = Date.now();
      const status = (appt.badgeStatus || appt.status || '').toUpperCase();
      const createdTime = appt.createdAt ? new Date(appt.createdAt).getTime() : NaN;
      const updatedTime = appt.updatedAt ? new Date(appt.updatedAt).getTime() : NaN;
      const actuallyChanged =
        !Number.isNaN(updatedTime) &&
        (Number.isNaN(createdTime) || updatedTime - createdTime > CHANGE_TOLERANCE_MS);

      // Strict rule for cancellations and missed marks: only show when the
      // terminal change happened in the last 5 days.
      // A fresh `createdAt` alone must NOT bring back an old terminal row,
      // and rows without a valid change timestamp stay hidden.
      if (status === 'CANCELLED' || status === 'MISSED') {
        return actuallyChanged && isWithinLastDays(appt.updatedAt, now);
      }

      // Newly booked / scheduled within the window.
      if (isWithinLastDays(appt.createdAt, now)) return true;
      // Changed after booking: updatedAt is meaningfully later than
      // createdAt AND falls inside the window.
      if (Number.isNaN(updatedTime)) return false;
      return actuallyChanged && isWithinLastDays(appt.updatedAt, now);
    })
    .sort((a, b) => {
      const timeA = a.updatedAt
        ? new Date(a.updatedAt).getTime()
        : a.createdAt
          ? new Date(a.createdAt).getTime()
          : 0;
    const timeB = b.updatedAt
      ? new Date(b.updatedAt).getTime()
      : b.createdAt
        ? new Date(b.createdAt).getTime()
        : 0;
    return timeB - timeA;
  });

  return sorted.map((appt) => ({
    id: appt.id,
    displayId: appt.displayId || null,
    doctorName: appt.doctorName || 'Unknown Doctor',
    doctorImage: appt.doctorImage || null,
    date: appt.day || '—',
    time: appt.time || null,
    reason: appt.specialty || '—',
    status: getDisplayStatus(appt.badgeStatus || appt.status),
    rawStatus: appt.status,
    updatedAt: appt.updatedAt,
    updatedTimeLabel: formatUpdatedTime(appt.updatedAt),
  }));
};

export default function RecentActivity({ appointments }) {
  // If real appointment data is provided, derive rows from it.
  // Only use fallback mock data when the component is used without an appointments prop.
  const hasRealData = Array.isArray(appointments);
  const activities = hasRealData
    ? buildActivitiesFromAppointments(appointments)
    : FALLBACK_ACTIVITIES;

  // Tracks the row whose receipt modal is currently open (or null).
  const [receiptActivity, setReceiptActivity] = useState(null);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-6 w-full">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Recent Activity</h3>
        <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-1">
          Changed or booked in the last {RECENT_DAYS} days
        </p>
      </div>

      <div className="overflow-x-auto max-h-[440px] overflow-y-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none] [-ms-overflow-style:none]">
        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center px-6 py-12 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-[#dcf5fa] text-[#00b0d8] dark:bg-cyan-500/15 dark:text-cyan-300 mb-4">
              <CalendarCheck2 size={26} />
            </div>
            <h4 className="text-base font-bold text-slate-800 dark:text-slate-100">
              All caught up
            </h4>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1.5 max-w-xs leading-relaxed">
              No changes or new bookings in the last {RECENT_DAYS} days. Your latest updates will appear here.
            </p>
            <Link
              to="/patient/appointments"
              className="mt-5 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#00b8e6] hover:bg-[#009bbf] text-white text-xs font-semibold transition-all shadow-[0_4px_12px_rgba(0,176,216,0.25)] active:scale-[0.98]"
            >
              <Plus size={14} />
              Book Appointment
            </Link>
          </div>
        ) : (
          <table className="w-full text-left table-auto">
            <colgroup>
              <col className="w-auto" />
              <col className="w-[110px]" />
              <col className="w-[160px]" />
              <col className="w-[110px]" />
              <col className="w-[96px]" />
            </colgroup>
            <thead className="sticky top-0 bg-white dark:bg-slate-900 z-10">
                <tr className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-50 dark:border-slate-800">
                  <th className="pb-4 pr-3 font-bold whitespace-nowrap">Doctor</th>
                  <th className="pb-4 pr-3 font-bold whitespace-nowrap">Date</th>
                  <th className="pb-4 pr-3 font-bold whitespace-nowrap">Specialty</th>
                  <th className="pb-4 pr-3 font-bold whitespace-nowrap">Status</th>
                  <th className="pb-4 font-bold whitespace-nowrap text-right">Receipt</th>
                </tr>
            </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {activities.map((activity) => (
                  <tr key={activity.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/40 transition-colors">
                  <td className="py-4 pr-3 align-middle">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative w-10 h-10 flex-shrink-0">
                        {activity.doctorImage ? (
                          <img
                            src={activity.doctorImage}
                            alt={activity.doctorName}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-[#e6f7fa] dark:bg-slate-800 flex items-center justify-center">
                            <svg className="w-5 h-5 text-[#00b0d8] dark:text-cyan-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                        )}
                        <div
                          className={`absolute bottom-0 right-0 w-2.5 h-2.5 border-2 border-white rounded-full ${
                            activity.rawStatus === 'CANCELLED' || activity.rawStatus === 'MISSED' ? 'bg-red-400' : 'bg-emerald-500'
                          }`}
                        ></div>
                      </div>
                      <span className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate" title={activity.doctorName}>
                        {activity.doctorName}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 pr-3 align-middle text-slate-500 dark:text-slate-300 font-medium text-sm whitespace-nowrap">
                    {activity.date}
                    {activity.updatedTimeLabel && (
                      <span className="block text-xs text-slate-400 font-normal">
                        {activity.updatedTimeLabel}
                      </span>
                    )}
                  </td>
                  <td className="py-4 pr-3 align-middle text-slate-500 dark:text-slate-300 font-medium text-sm max-w-[160px] truncate" title={activity.reason}>
                    {activity.reason}
                  </td>
                  <td className="py-4 pr-3 align-middle whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full font-bold text-xs ${getStatusBadgeClasses(
                        activity.rawStatus || activity.status
                      )}`}
                    >
                      {activity.status}
                    </span>
                  </td>
                  <td className="py-4 align-middle whitespace-nowrap text-right">
                    {['COMPLETED', 'CONFIRMED'].includes((activity.rawStatus || activity.status || '').toUpperCase()) ? (
                      <button
                        type="button"
                        onClick={() => setReceiptActivity(activity)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00b8e6]/10 text-[#00b8e6] font-semibold text-xs hover:bg-[#00b8e6]/20 transition whitespace-nowrap"
                      >
                        <Receipt size={13} />
                        Receipt
                      </button>
                    ) : (
                      <span className="text-slate-300 dark:text-slate-600 text-sm font-medium">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ReceiptModal
        isOpen={receiptActivity !== null}
        activity={receiptActivity}
        onClose={() => setReceiptActivity(null)}
      />
    </div>
  );
}