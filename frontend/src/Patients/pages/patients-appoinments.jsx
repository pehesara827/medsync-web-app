import { useState, useMemo, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import AppointmentFilterBar from '../components/AppointmentFilterBar';
import AppointmentsTable from '../components/AppointmentsTable';

export default function PatientsAppointments() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [patientId, setPatientId] = useState(null);

  // Resolve patient ID on mount
  useEffect(() => {
    const resolvePatientId = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user;
        if (!user) {
          setError('You must be logged in to view appointments.');
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('patient_profiles')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profileError) throw profileError;
        if (!profile) {
          setError('No patient profile found for this account.');
          return;
        }

        setPatientId(profile.id);
      } catch (err) {
        setError(`Failed to load patient profile: ${err.message}`);
      }
    };

    resolvePatientId();
  }, []);

  // Fetch appointments when patient ID is available
  useEffect(() => {
    if (!patientId) return;

    const fetchAppointments = async () => {
      setLoading(true);
      setError('');
      try {
        const { data, error: apptError } = await supabase
          .from('appointments')
          .select(`
            id,
            appointment_date,
            status,
            booking_type,
            doctor_profiles (
              first_name,
              last_name,
              specialization
            ),
            doctor_schedules (
              start_time,
              end_time
            ),
            payments (
              payment_status
            ),
            beneficiaries (
              full_name,
              relationship
            )
          `)
          .eq('patient_id', patientId)
          .order('appointment_date', { ascending: false });

        if (apptError) throw apptError;
        setAppointments(data || []);
      } catch (err) {
        setError(`Failed to load appointments: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [patientId]);

  // Format time from HH:MM:SS to 12-hour format
  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 === 0 ? 12 : hours % 12;
    return `${hour12}:${String(minutes).padStart(2, '0')} ${period}`;
  };

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const date = new Date(`${dateStr}T00:00:00`);
    if (Number.isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Transform appointments for table display
  const transformedAppointments = useMemo(() => {
    return appointments.map((appt) => {
      const doctor = appt.doctor_profiles || {};
      const schedule = appt.doctor_schedules || {};
      const payment = appt.payments || {};
      const beneficiary = appt.beneficiaries || null;

      let patientName = 'Self';
      if (appt.booking_type === 'BENEFICIARY' && beneficiary) {
        patientName = beneficiary.relationship
          ? `${beneficiary.full_name} (${beneficiary.relationship})`
          : beneficiary.full_name;
      }

      return {
        id: appt.id,
        patientName,
        doctorName: `Dr. ${doctor.first_name || ''} ${doctor.last_name || ''}`.trim(),
        specialization: doctor.specialization || '—',
        appointmentDate: formatDate(appt.appointment_date),
        timeSlot: formatTime(schedule.start_time),
        status: appt.status,
        paymentStatus: payment.payment_status || 'UNPAID',
      };
    });
  }, [appointments]);

  // Filter appointments based on the active filter tab
  const filteredAppointments = useMemo(() => {
    if (activeFilter === 'All') return transformedAppointments;
    if (activeFilter === 'Upcoming') {
      // 'Upcoming' includes both 'Upcoming' and 'Scheduled' statuses
      return transformedAppointments.filter(
        (appt) => appt.status === 'Upcoming' || appt.status === 'Scheduled' || appt.status === 'PENDING'
      );
    }
    return transformedAppointments.filter((appt) => appt.status === activeFilter);
  }, [activeFilter, transformedAppointments]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#00b8e6] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading appointments...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-8 bg-red-50 rounded-2xl border border-red-200 max-w-md">
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full px-4 md:px-6 lg:px-8">
      <p className="text-slate-600 ml-1 mb-1 text-sm md:text-base">Schedule, track, and manage your medical consultations.</p>

      <AppointmentFilterBar
        onFilterChange={setActiveFilter}
        onAddNew={() => alert('Add New Appointment clicked')}
        appointments={transformedAppointments}
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
