import { useState, useMemo } from 'react';
import AppointmentFilterBar from '../components/AppointmentFilterBar';
import AppointmentsTable from '../components/AppointmentsTable';
import { MOCK_APPOINTMENTS } from '../../MockData/mockAppoinmentData';

export default function PatientsAppointments() {
  const [activeFilter, setActiveFilter] = useState('All');

  // Filter appointments based on the active filter tab
  const filteredAppointments = useMemo(() => {
    return MOCK_APPOINTMENTS.filter((appointment) => {
      if (activeFilter === 'All') return true;
      if (activeFilter === 'Upcoming') {
        // 'Upcoming' includes both 'Upcoming' and 'Scheduled' statuses
        return appointment.status === 'Upcoming' || appointment.status === 'Scheduled';
      }
      return appointment.status === activeFilter;
    });
  }, [activeFilter]);

  return (
    <div className="flex-1 w-full px-4 md:px-6 lg:px-8">
      <p className="text-slate-600 ml-1 mb-1 text-sm md:text-base">Schedule, track, and manage your medical consultations.</p>

      <AppointmentFilterBar
        onFilterChange={setActiveFilter}
        onAddNew={() => alert('Add New Appointment clicked')}
        appointments={MOCK_APPOINTMENTS}
      />

      {/* Appointment Display Area */}
      <div className="mt-6">
        {filteredAppointments.length === 0 ? (
          // Empty State
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <svg
              className="w-10 h-10 sm:w-12 sm:h-12 text-slate-300 mb-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-slate-500 text-sm font-medium">
              No appointments found for the selected filter.
            </p>
          </div>
        ) : (
          // Table view displaying appointment information filtered by status
          <AppointmentsTable appointments={filteredAppointments} />
        )}
      </div>
    </div>
  );
}
