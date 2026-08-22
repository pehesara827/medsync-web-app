import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { QrCode, MoreHorizontal, Pencil, XCircle, Star } from 'lucide-react';

/**
 * Returns Tailwind CSS classes for the status badge based on appointment status.
 * @param {string} status - The appointment status
 * @returns {string} Tailwind classes for bg and text color
 */
const getStatusBadgeClasses = (status) => {
  switch (status) {
    case 'Upcoming':
    case 'Scheduled':
      return 'bg-blue-50 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300';
    case 'Completed':
      return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300';
    case 'Waitlist':
      return 'bg-amber-50 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300';
    case 'Cancelled':
      return 'bg-red-50 text-red-600 dark:bg-red-500/20 dark:text-red-300';
    default:
      return 'bg-slate-50 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
  }
};

/**
 * Determines whether the user can view the QR code for this appointment.
 * QR codes are only available for Upcoming and Scheduled appointments.
 */
const canViewQR = (appointment) => {
  const status = (appointment.badgeStatus || appointment.status || '').toUpperCase();
  return status === 'UPCOMING' || status === 'SCHEDULED';
};

/**
 * Resolves the "normalized" display status used for action logic.
 * Returns the badgeStatus if available, otherwise the raw status.
 */
const getNormalizedStatus = (appointment) => {
  return (appointment.badgeStatus || appointment.status || '').toUpperCase();
};

/**
 * Dropdown menu component for appointment actions (Edit / Cancel / Review).
 * Action visibility is driven by the appointment's status:
 *   - Completed  → Review only
 *   - Cancelled  → No actions (menu hidden entirely)
 *   - Other      → Edit + Cancel
 *
 * The dropdown is rendered via a React portal at the document body level so it
 * is never clipped by ancestor containers with `overflow` (e.g. the table's
 * `overflow-x-auto` wrapper).
 */
function ActionsMenu({ appointment, onEdit, onCancel, onReview }) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPos, setMenuPos] = useState(null);
  const buttonRef = useRef(null);

  // Close the dropdown when clicking outside.
  // Uses 'click' (not 'mousedown') so that clicking a menu item inside the
  // portal fires its onClick first, then the outside-click handler closes the
  // dropdown. Using 'mousedown' would unmount the portal before the menu
  // item's click event fires, preventing the action (e.g. opening Review).
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event) => {
      if (buttonRef.current && !buttonRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const handleScroll = () => setIsOpen(false);
    const handleResize = () => setIsOpen(false);
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen]);

  const status = getNormalizedStatus(appointment);

  // Don't render the menu at all for cancelled appointments
  if (status === 'CANCELLED') {
    return null;
  }

  // Build the list of available actions based on status
  const actions = [];

  if (status === 'COMPLETED') {
    // Only show Review for completed appointments
    actions.push({
      label: 'Review',
      icon: <Star size={14} className="text-[#00b8e6]" />,
      onClick: () => {
        setIsOpen(false);
        onReview(appointment);
      },
      className: 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700',
    });
  } else {
    // For upcoming / scheduled appointments: Edit + Cancel
    actions.push({
      label: 'Edit',
      icon: <Pencil size={14} className="text-[#00b8e6]" />,
      onClick: () => {
        setIsOpen(false);
        onEdit(appointment);
      },
      className: 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700',
    });
    actions.push({
      label: 'Cancel',
      icon: <XCircle size={14} />,
      onClick: () => {
        setIsOpen(false);
        onCancel(appointment);
      },
      className: 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30',
    });
  }

  const handleToggle = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + 4,
        left: rect.right,
      });
    }
    setIsOpen((prev) => !prev);
  };

  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
        aria-label="Appointment actions"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <MoreHorizontal size={18} />
      </button>

      {isOpen &&
        menuPos &&
        createPortal(
          <div
            role="menu"
            className="fixed z-[100] w-40 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-lg py-1"
            style={{ top: menuPos.top, left: menuPos.left, transform: 'translateX(-100%)' }}
          >
            {actions.map((action) => (
              <button
                key={action.label}
                role="menuitem"
                onClick={action.onClick}
                className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition text-left ${action.className}`}
              >
                {action.icon}
                {action.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}

export default function AppointmentsTable({
  appointments = [],
  onEdit,
  onCancel,
  onReview,
}) {
  const navigate = useNavigate();

  const handleViewPass = (appointmentId) => {
    navigate(`/patient/appointments/${appointmentId}`);
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-4 md:p-6 w-full">
      <div className="mb-6">
        <h3 className="text-lg md:text-xl font-bold text-slate-800 dark:text-slate-100">Appointments</h3>
      </div>

      {/* ── Mobile Card View (below md breakpoint) ───────────────────────── */}
      <div className="md:hidden space-y-4">
        {appointments.map((appointment) => (
          <div
            key={appointment.id}
            className="border border-slate-100 dark:border-slate-700 rounded-xl p-4 bg-white dark:bg-slate-900"
          >
            {/* Top: Doctor info + Status badge + Actions */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10">
                  {appointment.doctorImage ? (
                    <img
                      src={appointment.doctorImage}
                      alt={appointment.doctorName}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#e6f7fa] dark:bg-slate-700 flex items-center justify-center">
                      <svg className="w-5 h-5 text-[#00b0d8] dark:text-cyan-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></div>
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                    {appointment.doctorName}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {appointment.specialization}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full font-bold text-xs ${getStatusBadgeClasses(appointment.badgeStatus || appointment.status)}`}
                >
                  {appointment.badgeStatus || appointment.status}
                </span>
                <ActionsMenu
                  appointment={appointment}
                  onEdit={onEdit}
                  onCancel={onCancel}
                  onReview={onReview}
                />
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Appointment ID</span>
                <span className="text-slate-500 dark:text-slate-300 font-medium text-sm block font-mono tracking-wider">{appointment.displayId || appointment.id}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Date</span>
                <span className="text-slate-500 dark:text-slate-300 font-medium text-sm block">{appointment.appointmentDate || '—'}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Time</span>
                <span className="text-slate-500 dark:text-slate-300 font-medium text-sm block">{appointment.timeSlot || '—'}</span>
              </div>
            </div>

            {/* View Pass Action - only for Upcoming/Scheduled */}
            {canViewQR(appointment) ? (
              <button
                onClick={() => handleViewPass(appointment.id)}
                className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#00b8e6]/10 text-[#00b8e6] font-semibold text-xs hover:bg-[#00b8e6]/20 transition"
              >
                <QrCode size={14} />
                View Pass
              </button>
            ) : (
              <p className="mt-4 w-full text-center text-xs text-slate-400 font-medium">
                QR code not available
              </p>
            )}
          </div>
        ))}
      </div>

      {/* ── Desktop Table View (md breakpoint and up) ────────────────────── */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-slate-400 dark:text-slate-500 font-bold text-xs uppercase tracking-wider border-b border-slate-50 dark:border-slate-700">
              <th className="pb-4 font-bold text-center">Appointment Number</th>
              <th className="pb-4 font-bold text-center">Doctor</th>
              <th className="pb-4 font-bold text-center">Date & Time</th>
              <th className="pb-4 font-bold text-center">Status</th>
              <th className="pb-4 font-bold text-center">Pass</th>
              <th className="pb-4 font-bold text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
            {appointments.map((appointment) => (
              <tr key={appointment.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/40 transition-colors">
                <td className="py-4 text-slate-500 dark:text-slate-300 font-medium text-sm whitespace-nowrap text-center font-mono tracking-wider">
                  {appointment.displayId || appointment.id}
                </td>
                <td className="py-4 text-center">
                  <div className="flex items-center justify-center gap-3">
                    <div className="relative w-10 h-10">
                      {appointment.doctorImage ? (
                        <img
                          src={appointment.doctorImage}
                          alt={appointment.doctorName}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-[#e6f7fa] dark:bg-slate-700 flex items-center justify-center">
                          <svg className="w-5 h-5 text-[#00b0d8] dark:text-cyan-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                      )}
                      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></div>
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="font-bold text-slate-800 dark:text-slate-100 text-sm whitespace-nowrap">
                        {appointment.doctorName}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {appointment.specialization}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="py-4 text-slate-500 dark:text-slate-300 font-medium text-sm whitespace-nowrap text-center">
                  <div className="flex flex-col items-center justify-center">
                    <span>{appointment.appointmentDate || '—'}</span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">{appointment.timeSlot || '—'}</span>
                  </div>
                </td>
                <td className="py-4 whitespace-nowrap text-center">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full font-bold text-xs ${getStatusBadgeClasses(appointment.badgeStatus || appointment.status)}`}
                  >
                    {appointment.badgeStatus || appointment.status}
                  </span>
                </td>
                <td className="py-4 whitespace-nowrap text-center">
                  {canViewQR(appointment) ? (
                    <button
                      onClick={() => handleViewPass(appointment.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00b8e6]/10 text-[#00b8e6] font-semibold text-xs hover:bg-[#00b8e6]/20 transition"
                    >
                      <QrCode size={13} />
                      View Pass
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">—</span>
                  )}
                </td>
                <td className="py-4 whitespace-nowrap text-center">
                  <ActionsMenu
                    appointment={appointment}
                    onEdit={onEdit}
                    onCancel={onCancel}
                    onReview={onReview}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}