import { X, Receipt, CalendarDays, Stethoscope, Hash, BadgeCheck } from 'lucide-react';

/**
 * Returns Tailwind badge classes based on the appointment status.
 * Mirrors the styling used in RecentActivity / AppointmentsTable.
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
 * Receipt Modal
 * Displays a compact appointment receipt when the user clicks the
 * "Receipt" action button on a Recent Activity row.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is visible
 * @param {Function} props.onClose - Callback to close the modal
 * @param {Object|null} props.activity - The Recent Activity row being viewed
 */
export default function ReceiptModal({ isOpen, onClose, activity }) {
  if (!isOpen || !activity) return null;

  const receiptNo = activity.displayId || `ACT-${activity.id}`;
  const service = activity.reason || activity.specialty || '—';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* Modal Panel */}
      <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          aria-label="Close receipt"
        >
          <X size={16} />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#dcf5fa] text-[#00b0d8] dark:bg-cyan-500/20 dark:text-cyan-300 mb-3">
            <Receipt size={22} />
          </div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            Appointment Receipt
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-1">
            {receiptNo} • Issued{' '}
            {new Date().toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        </div>

        {/* Receipt Body */}
        <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-5 space-y-4">
          {/* Doctor */}
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 flex-shrink-0">
              {activity.doctorImage ? (
                <img
                  src={activity.doctorImage}
                  alt={activity.doctorName}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#e6f7fa] dark:bg-slate-800 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-[#00b0d8] dark:text-cyan-300"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
              )}
            </div>
            <div className="min-w-0">
              <span className="block text-[11px] uppercase tracking-wide font-semibold text-slate-400 dark:text-slate-500">
                Doctor
              </span>
              <span className="block font-bold text-slate-800 dark:text-slate-100 text-sm truncate">
                {activity.doctorName}
              </span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-4">
            <div>
              <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide font-semibold text-slate-400 dark:text-slate-500">
                <Stethoscope size={12} />
                Service
              </span>
              <span className="block font-medium text-slate-700 dark:text-slate-200 text-sm mt-1">
                {service}
              </span>
            </div>
            <div>
              <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide font-semibold text-slate-400 dark:text-slate-500">
                <CalendarDays size={12} />
                Date
              </span>
              <span className="block font-medium text-slate-700 dark:text-slate-200 text-sm mt-1">
                {activity.date || '—'}
                {activity.time ? ` • ${activity.time}` : ''}
              </span>
            </div>
            <div>
              <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide font-semibold text-slate-400 dark:text-slate-500">
                <Hash size={12} />
                Receipt No.
              </span>
              <span className="block font-mono font-medium text-slate-700 dark:text-slate-200 text-sm mt-1">
                {receiptNo}
              </span>
            </div>
            <div>
              <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide font-semibold text-slate-400 dark:text-slate-500">
                <BadgeCheck size={12} />
                Status
              </span>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full font-bold text-xs mt-1 ${getStatusBadgeClasses(
                  activity.rawStatus || activity.status
                )}`}
              >
                {activity.status}
              </span>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-5 px-4 leading-relaxed">
          This receipt confirms your appointment record. Visit the reception desk
          for payment and billing details.
        </p>

        {/* Actions */}
        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#00b8e6] text-white font-semibold text-sm hover:bg-[#009bbf] transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
}