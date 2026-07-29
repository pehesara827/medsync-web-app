import { MOCK_APPOINTMENTS } from '../../MockData/mockAppoinmentData';

/**
 * Returns Tailwind CSS classes for the status badge based on appointment status.
 * @param {string} status - The appointment status
 * @returns {string} Tailwind classes for bg and text color
 */
const getStatusBadgeClasses = (status) => {
  switch (status) {
    case 'Upcoming':
    case 'Scheduled':
      return 'bg-blue-50 text-blue-600';
    case 'Completed':
      return 'bg-emerald-50 text-emerald-600';
    case 'Waitlist':
      return 'bg-amber-50 text-amber-600';
    case 'Cancelled':
      return 'bg-red-50 text-red-600';
    default:
      return 'bg-slate-50 text-slate-600';
  }
};

export default function AppointmentsTable({ appointments = MOCK_APPOINTMENTS }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-4 md:p-6 w-full">
      <div className="mb-6">
        <h3 className="text-lg md:text-xl font-bold text-slate-800">Appointments</h3>
      </div>

      {/* ── Mobile Card View (below md breakpoint) ───────────────────────── */}
      <div className="md:hidden space-y-4">
        {appointments.map((appointment) => (
          <div
            key={appointment.id}
            className="border border-slate-100 rounded-xl p-4 bg-white"
          >
            {/* Top: Doctor info + Status badge */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10">
                  <img
                    src={appointment.doctorImage}
                    alt={appointment.doctorName}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></div>
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-slate-800 text-sm">
                    {appointment.doctorName}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    {appointment.specialty}
                  </span>
                </div>
              </div>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full font-bold text-xs ${getStatusBadgeClasses(appointment.status)}`}
              >
                {appointment.status}
              </span>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <span className="text-xs text-slate-400 font-medium">Appointment ID</span>
                <span className="text-slate-500 font-medium text-sm block">#{appointment.id}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-medium">Date</span>
                <span className="text-slate-500 font-medium text-sm block">{appointment.day}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-medium">Time</span>
                <span className="text-slate-500 font-medium text-sm block">{appointment.time}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-medium">Consultation</span>
                <span className="text-slate-500 font-medium text-sm block truncate">{appointment.consultationType}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Desktop Table View (md breakpoint and up) ────────────────────── */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-slate-400 font-bold text-xs uppercase tracking-wider border-b border-slate-50">
              <th className="pb-4 font-bold">Appointment Number</th>
              <th className="pb-4 font-bold">Doctor</th>
              <th className="pb-4 font-bold">Date & Time</th>
              <th className="pb-4 font-bold">Consultation Type</th>
              <th className="pb-4 font-bold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {appointments.map((appointment) => (
              <tr key={appointment.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="py-4 text-slate-500 font-medium text-sm whitespace-nowrap">
                  #{appointment.id}
                </td>
                <td className="py-4">
                  <div className="flex items-center justify-start gap-3">
                    <div className="relative w-10 h-10">
                      <img
                        src={appointment.doctorImage}
                        alt={appointment.doctorName}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></div>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800 text-sm whitespace-nowrap">
                        {appointment.doctorName}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        {appointment.specialty}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="py-4 text-slate-500 font-medium text-sm whitespace-nowrap">
                  <div className="flex flex-col items-start justify-start">
                    <span>{appointment.day}</span>
                    <span className="text-xs text-slate-400">{appointment.time}</span>
                  </div>
                </td>
                <td className="py-4 text-slate-500 font-medium text-sm whitespace-nowrap">
                  {appointment.consultationType}
                </td>
                <td className="py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full font-bold text-xs ${getStatusBadgeClasses(appointment.status)}`}
                  >
                    {appointment.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
