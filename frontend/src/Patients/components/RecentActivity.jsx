// Fallback mock data used when no real appointments are provided
const FALLBACK_ACTIVITIES = [
  {
    id: 1,
    doctorName: 'Dr. Emily Chen',
    doctorImage: 'https://images.unsplash.com/photo-1594824813566-88855ce783d1?auto=format&fit=crop&q=80&w=200',
    date: 'Oct 20, 2023',
    reason: 'Annual Checkup',
    status: 'Completed',
  },
  {
    id: 2,
    doctorName: 'Dr. Sarah Jenkins',
    doctorImage: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=200',
    date: 'Sep 15, 2023',
    reason: 'Dental Cleaning',
    status: 'Completed',
  },
  {
    id: 3,
    doctorName: 'Dr. Alan Turing',
    doctorImage: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=200',
    date: 'Aug 28, 2023',
    reason: 'Cognitive Assessment',
    status: 'Completed',
  },
  {
    id: 4,
    doctorName: 'Dr. Marcus Webb',
    doctorImage: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=200',
    date: 'Aug 10, 2023',
    reason: 'Knee Pain',
    status: 'Completed',
  },
  {
    id: 5,
    doctorName: 'Dr. Lisa Ray',
    doctorImage: 'https://images.unsplash.com/photo-1594824813566-88855ce783d1?auto=format&fit=crop&q=80&w=200',
    date: 'Jul 22, 2023',
    reason: 'Eye Exam',
    status: 'Completed',
  },
  {
    id: 6,
    doctorName: 'Dr. James Wilson',
    doctorImage: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=200',
    date: 'Jun 30, 2023',
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
  if (status === 'CANCELLED') {
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
 * Derives the Recent Activity row list from real appointment data.
 * Rows are sorted by the most recent status change (updatedAt) first,
 * and all activities are shown.
 */
const buildActivitiesFromAppointments = (appointments) => {
  if (!appointments || appointments.length === 0) return [];

  const sorted = [...appointments].sort((a, b) => {
    const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return timeB - timeA;
  });

  return sorted.map((appt) => ({
    id: appt.id,
    doctorName: appt.doctorName || 'Unknown Doctor',
    doctorImage: appt.doctorImage || null,
    date: appt.day || '—',
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

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-6 w-full">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Recent Activity</h3>
      </div>

      <div className="overflow-x-auto max-h-[160px] overflow-y-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none] [-ms-overflow-style:none]">
        {activities.length === 0 ? (
          <p className="text-center text-slate-400 font-medium py-12">
            No recent activity yet. Book your first appointment.
          </p>
        ) : (
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-white dark:bg-slate-900 z-10">
                <tr className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-50 dark:border-slate-800">
                  <th className="pb-4">Doctor Name</th>
                  <th className="pb-4">Date</th>
                  <th className="pb-4">Specialty</th>
                  <th className="pb-4">Status</th>
                </tr>
            </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {activities.map((activity) => (
                  <tr key={activity.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/40 transition-colors">
                  <td className="py-4">
                    <div className="flex flex-col gap-1.5">
                      <div className="relative w-10 h-10">
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
                            activity.rawStatus === 'CANCELLED' ? 'bg-red-400' : 'bg-emerald-500'
                          }`}
                        ></div>
                      </div>
                      <span className="font-bold text-slate-800 dark:text-slate-100 text-sm whitespace-nowrap">
                        {activity.doctorName}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 text-slate-500 dark:text-slate-300 font-medium text-sm whitespace-nowrap">
                    {activity.date}
                    {activity.updatedTimeLabel && (
                      <span className="block text-xs text-slate-400 font-normal">
                        {activity.updatedTimeLabel}
                      </span>
                    )}
                  </td>
                  <td className="py-4 text-slate-500 dark:text-slate-300 font-medium text-sm whitespace-nowrap">
                    {activity.reason}
                  </td>
                  <td className="py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full font-bold text-xs ${getStatusBadgeClasses(
                        activity.rawStatus || activity.status
                      )}`}
                    >
                      {activity.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}