import { useState, useMemo, useEffect, useCallback } from 'react';
import { supabase } from '../../../supabaseClient';
import { Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import AppointmentFilterBar from '../components/AppointmentFilterBar';
import AppointmentsTable from '../components/AppointmentsTable';
import BookAppointmentModal from '../components/BookAppointmentModal';
import WaitlistStatusCard from '../components/WaitlistStatusCard';

export default function PatientsAppointments() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [patientId, setPatientId] = useState(null);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [modalKey, setModalKey] = useState(0);
  const [cancelError, setCancelError] = useState('');
  const [cancellingId, setCancellingId] = useState(null);
  const [confirmCancel, setConfirmCancel] = useState(null);
  const [waitlistEntries, setWaitlistEntries] = useState([]);
  const [loadingWaitlist, setLoadingWaitlist] = useState(false);
  const [waitlistError, setWaitlistError] = useState('');
  const [activeTab, setActiveTab] = useState('appointments');
  const [acceptingId, setAcceptingId] = useState(null);
  const [decliningId, setDecliningId] = useState(null);

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
            doctor_id,
            schedule_id,
            beneficiary_id,
            appointment_date,
            status,
            booking_type,
            doctor_profiles (
              id,
              first_name,
              last_name,
              specialization,
              doctor_image,
              specialties (
                name
              )
            ),
            doctor_schedules (
              id,
              start_time,
              end_time
            ),
            payments (
              payment_status
            ),
            beneficiaries (
              id,
              full_name,
              relationship
            )
          `)
          .eq('patient_id', patientId)
          .neq('status', 'CANCELLED')
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

  // Generate a structured display ID from a UUID
  // Format: MED-<first 8 chars of UUID uppercased, no dashes>
  const generateDisplayId = (uuid) => {
    if (!uuid) return 'MED-UNKNOWN';
    const shortId = uuid.replace(/-/g, '').slice(0, 8).toUpperCase();
    return `MED-${shortId}`;
  };

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

      // Compute badge status based on date and status
      let badgeStatus = appt.status;
      if (appt.status === 'PENDING' || appt.status === 'CONFIRMED') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const apptDate = new Date(`${appt.appointment_date}T00:00:00`);
        if (apptDate.getTime() === today.getTime()) {
          badgeStatus = 'Upcoming';
        } else if (apptDate.getTime() > today.getTime()) {
          badgeStatus = 'Scheduled';
        }
      }

      return {
        id: appt.id,
        displayId: generateDisplayId(appt.id),
        patientName,
        doctorName: `Dr. ${doctor.first_name || ''} ${doctor.last_name || ''}`.trim(),
        specialization: doctor.specialties?.name || doctor.specialization || '—',
        doctorImage: doctor.doctor_image || null,
        appointmentDate: formatDate(appt.appointment_date),
        timeSlot: formatTime(schedule.start_time),
        status: appt.status,
        badgeStatus,
        paymentStatus: payment.payment_status || 'UNPAID',
        // Raw fields needed for editing
        doctorId: appt.doctor_id,
        scheduleId: appt.schedule_id,
        beneficiaryId: appt.beneficiary_id,
        rawDate: appt.appointment_date,
        bookingType: appt.booking_type,
        specialtyId: doctor.specialties?.id || null,
      };
    });
  }, [appointments]);

  // Filter appointments based on the active filter tab
  const filteredAppointments = useMemo(() => {
    // Helper: resolve the display status (badgeStatus takes priority, falls back to status)
    const getDisplayStatus = (appt) => appt.badgeStatus || appt.status;
    if (activeFilter === 'All') return transformedAppointments;
    if (activeFilter === 'Scheduled') {
      // 'Scheduled' includes both 'Upcoming' and 'Scheduled' statuses
      return transformedAppointments.filter(
        (appt) => getDisplayStatus(appt) === 'Upcoming' || getDisplayStatus(appt) === 'Scheduled'
      );
    }
    return transformedAppointments.filter((appt) => getDisplayStatus(appt) === activeFilter);
  }, [activeFilter, transformedAppointments]);

  // ── Edit appointment handler ──────────────────────────────────────
  const handleEdit = (appointment) => {
    setEditingAppointment(appointment);
    setModalKey((k) => k + 1);
    setIsEditModalOpen(true);
  };

  // ── Cancel appointment handler ────────────────────────────────────
  const handleCancel = async (appointment) => {
    setCancellingId(appointment.id);
    setCancelError('');
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      const response = await fetch(`${backendUrl}/api/appointments/${appointment.id}/cancel`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || `Failed to cancel appointment (${response.status})`);
      }

      // Remove the cancelled appointment from the local list
      setAppointments((prev) => prev.filter((a) => a.id !== appointment.id));
      setConfirmCancel(null);
    } catch (err) {
      setCancelError(err.message);
    } finally {
      setCancellingId(null);
    }
  };

  // ── Close edit modal handler ──────────────────────────────────────
  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingAppointment(null);
  };

  // ── Refresh appointments after edit ───────────────────────────────
  const refreshAppointments = useCallback(async () => {
    if (!patientId) return;
    try {
      const { data, error: apptError } = await supabase
        .from('appointments')
        .select(`
          id,
          doctor_id,
          schedule_id,
          beneficiary_id,
          appointment_date,
          status,
          booking_type,
          doctor_profiles (
            id,
            first_name,
            last_name,
            specialization,
            doctor_image,
            specialties (
              name
            )
          ),
          doctor_schedules (
            id,
            start_time,
            end_time
          ),
          payments (
            payment_status
          ),
          beneficiaries (
            id,
            full_name,
            relationship
          )
        `)
        .eq('patient_id', patientId)
        .neq('status', 'CANCELLED')
        .order('appointment_date', { ascending: false });

      if (apptError) throw apptError;
      setAppointments(data || []);
    } catch (err) {
      setError(`Failed to refresh appointments: ${err.message}`);
    }
  }, [patientId]);

  // ── Fetch waitlist entries for the patient ─────────────────────────
  const fetchWaitlist = useCallback(async () => {
    if (!patientId) return;
    setLoadingWaitlist(true);
    setWaitlistError('');
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      const response = await fetch(`${backendUrl}/api/waitlist/patient/${patientId}`);
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || `Failed to load waitlist (${response.status})`);
      }
      const result = await response.json();
      setWaitlistEntries(result.waitlist || []);
    } catch (err) {
      setWaitlistError(err.message);
    } finally {
      setLoadingWaitlist(false);
    }
  }, [patientId]);

  // Fetch waitlist when patient ID is available
  useEffect(() => {
    fetchWaitlist();
  }, [fetchWaitlist]);

  // ── Accept a waitlist offer ────────────────────────────────────────
  const handleAcceptOffer = async (waitlistId) => {
    setAcceptingId(waitlistId);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      const response = await fetch(`${backendUrl}/api/waitlist/${waitlistId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_method: 'PAY_AT_RECEPTION' }),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || `Failed to accept offer (${response.status})`);
      }
      await fetchWaitlist();
      await refreshAppointments();
      alert('Appointment confirmed! Your waitlist offer has been accepted.');
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setAcceptingId(null);
    }
  };

  // ── Decline a waitlist offer ───────────────────────────────────────
  const handleDeclineOffer = async (waitlistId) => {
    if (!window.confirm('Are you sure you want to decline this offer? The next patient in line will be notified.')) return;
    setDecliningId(waitlistId);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      const response = await fetch(`${backendUrl}/api/waitlist/${waitlistId}/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || `Failed to decline offer (${response.status})`);
      }
      await fetchWaitlist();
      alert('Offer declined. The next patient in line has been notified.');
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setDecliningId(null);
    }
  };

  // ── Cancel a waitlist entry ────────────────────────────────────────
  const handleCancelWaitlist = async (waitlistId) => {
    if (!window.confirm('Are you sure you want to remove yourself from the waitlist?')) return;
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      const response = await fetch(`${backendUrl}/api/waitlist/${waitlistId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: patientId }),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || `Failed to cancel waitlist entry (${response.status})`);
      }
      await fetchWaitlist();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-slate-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#00b8e6] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-200">Loading appointments...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-slate-900">
        <div className="text-center p-8 bg-red-50 dark:bg-red-950 rounded-2xl border border-red-200 dark:border-red-700 max-w-md">
          <p className="text-red-700 dark:text-red-200">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full px-4 md:px-6 lg:px-8">
      <p className="text-slate-600 dark:text-slate-300 ml-1 mb-1 text-sm md:text-base">Schedule, track, and manage your medical consultations.</p>

      {/* Tab Navigation */}
      <div className="mt-6 flex gap-2 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setActiveTab('appointments')}
          className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition ${
            activeTab === 'appointments'
              ? 'bg-[#00b8e6] text-white'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100'
          }`}
        >
          My Appointments
        </button>
        <button
          onClick={() => setActiveTab('waitlist')}
          className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition flex items-center gap-2 ${
            activeTab === 'waitlist'
              ? 'bg-[#00b8e6] text-white'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100'
          }`}
        >
          <Clock size={16} />
          My Waitlist
          {waitlistEntries.filter((e) => e.status === 'WAITING' || e.status === 'NOTIFIED').length > 0 && (
            <span className="bg-[#00b8e6]/20 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {waitlistEntries.filter((e) => e.status === 'WAITING' || e.status === 'NOTIFIED').length}
            </span>
          )}
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'appointments' ? (
        <>
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
                  className="w-10 h-10 sm:w-12 sm:h-12 text-slate-300 dark:text-slate-600 mb-4"
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
                <p className="text-slate-500 dark:text-slate-300 text-sm font-medium">
                  No appointments found for the selected filter.
                </p>
              </div>
            ) : (
              // Table view displaying appointment information filtered by status
              <AppointmentsTable
                appointments={filteredAppointments}
                onEdit={handleEdit}
                onCancel={(appt) => setConfirmCancel(appt)}
              />
            )}
          </div>
        </>
      ) : (
        // Waitlist Tab Content
        <div className="mt-6">
          {loadingWaitlist ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-[#00b8e6] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : waitlistError ? (
            <div className="rounded-2xl border border-red-200 dark:border-red-600 bg-red-50 dark:bg-red-950 px-5 py-4 text-sm text-red-700 dark:text-red-200 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
              <span>{waitlistError}</span>
            </div>
          ) : waitlistEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Clock size={48} className="text-slate-300 dark:text-slate-600 mb-4" />
              <p className="text-slate-500 dark:text-slate-300 text-sm font-medium">
                You are not currently on any waitlists.
              </p>
              <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
                When a doctor's schedule is full, you can join the waitlist from the booking page.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {waitlistEntries.map((entry) => (
                <WaitlistStatusCard
                  key={entry.id}
                  entry={entry}
                  onAccept={handleAcceptOffer}
                  onDecline={handleDeclineOffer}
                  onCancel={handleCancelWaitlist}
                  acceptingId={acceptingId}
                  decliningId={decliningId}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit Appointment Modal */}
      <BookAppointmentModal
        key={modalKey}
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        editingAppointment={editingAppointment}
        onUpdated={refreshAppointments}
      />

      {/* Cancel Confirmation Dialog */}
      {confirmCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setConfirmCancel(null)}
          ></div>
          <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
              Cancel Appointment?
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-300 mb-6">
              Are you sure you want to cancel this appointment with{' '}
              <span className="font-semibold text-slate-700 dark:text-slate-100">
                {confirmCancel.doctorName}
              </span>{' '}
              on{' '}
              <span className="font-semibold text-slate-700 dark:text-slate-100">
                {confirmCancel.appointmentDate}
              </span>{' '}
              at{' '}
              <span className="font-semibold text-slate-700 dark:text-slate-100">
                {confirmCancel.timeSlot}
              </span>
              ? This action cannot be undone.
            </p>

            {cancelError && (
              <div className="mb-4 rounded-xl border border-red-200 dark:border-red-600 bg-red-50 dark:bg-red-950 px-4 py-3 text-sm text-red-700 dark:text-red-200">
                {cancelError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirmCancel(null)}
                disabled={cancellingId === confirmCancel.id}
                className="px-5 py-2.5 rounded-xl text-slate-700 dark:text-slate-200 font-semibold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50"
              >
                Keep Appointment
              </button>
              <button
                onClick={() => handleCancel(confirmCancel)}
                disabled={cancellingId === confirmCancel.id}
                className="px-5 py-2.5 rounded-xl bg-red-500 text-white font-semibold text-sm hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {cancellingId === confirmCancel.id ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Cancelling...
                  </>
                ) : (
                  'Yes, Cancel'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
