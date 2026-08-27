import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../../supabaseClient';
import AppointmentFilterBar from '../components/AppointmentFilterBar';
import AppointmentsTable from '../components/AppointmentsTable';
import BookAppointmentModal from '../components/BookAppointmentModal';
import AppointmentReviewModal from '../components/AppointmentReviewModal';
import WaitlistStatusCard from '../components/WaitlistStatusCard';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function PatientsAppointments() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeFilter, setActiveFilter] = useState('All');
  const [appointments, setAppointments] = useState([]);
  const [waitlistEntries, setWaitlistEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [patientId, setPatientId] = useState(null);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [modalKey, setModalKey] = useState(0);
  const [cancelError, setCancelError] = useState('');
  const [cancellingId, setCancellingId] = useState(null);
  const [confirmCancel, setConfirmCancel] = useState(null);
  const [waitlistOffer, setWaitlistOffer] = useState(null);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [claimLoading, setClaimLoading] = useState(false);
  const [acceptingId, setAcceptingId] = useState(null);
  const [decliningId, setDecliningId] = useState(null);
  const [reviewAppointment, setReviewAppointment] = useState(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

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

  // Fetch appointments AND waitlist entries when patient ID is available
  useEffect(() => {
    if (!patientId) return;

    const fetchAll = async () => {
      setLoading(true);
      setError('');
      try {
        // Fetch appointments (including cancelled so the Cancelled filter works)
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
          .order('appointment_date', { ascending: false });

        if (apptError) throw apptError;
        setAppointments(data || []);

        // Fetch waitlist entries
        try {
          const waitlistResponse = await fetch(`${backendUrl}/api/waitlist/patient/${patientId}`);
          if (waitlistResponse.ok) {
            const waitlistData = await waitlistResponse.json();
            setWaitlistEntries(waitlistData.waitlist || []);
          }
        } catch (waitlistErr) {
          console.warn('Failed to load waitlist entries:', waitlistErr);
        }
      } catch (err) {
        setError(`Failed to load appointments: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [patientId, backendUrl]);

  // ── Handle waitlist offer claim from notification deep-link ────────────
  useEffect(() => {
    const claimId = searchParams.get('claim');
    if (!claimId) return;

    const loadWaitlistOffer = async () => {
      setClaimLoading(true);
      setError('');
      try {
        const response = await fetch(`${backendUrl}/api/waitlist/${claimId}`);
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.message || `Failed to load waitlist offer (${response.status})`);
        }
        const data = await response.json();
        setWaitlistOffer(data.waitlist);
        setModalKey((k) => k + 1);
        setIsClaimModalOpen(true);
      } catch (err) {
        setError(err.message || 'Failed to load waitlist offer.');
      } finally {
        setClaimLoading(false);
      }
    };

    loadWaitlistOffer();
  }, [searchParams, backendUrl]);

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

  // Format status from uppercase (e.g. COMPLETED) to title case (e.g. Completed)
  const formatStatus = (status) => {
    if (!status) return '';
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
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
      let badgeStatus = formatStatus(appt.status);
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

  // Transform waitlist entries for display
  const transformedWaitlist = useMemo(() => {
    return waitlistEntries.map((entry) => {
      const doctor = entry.doctor_profiles || {};
      const schedule = entry.doctor_schedules || {};

      // Map waitlist status to display status
      let badgeStatus = 'Waitlist';
      if (entry.status === 'WAITING') badgeStatus = 'Waitlist';
      else if (entry.status === 'NOTIFIED') badgeStatus = 'Waitlist';
      else if (entry.status === 'CONVERTED') badgeStatus = 'Completed';
      else if (entry.status === 'CANCELLED') badgeStatus = 'Cancelled';
      else if (entry.status === 'EXPIRED' || entry.status === 'SKIPPED') badgeStatus = 'Cancelled';

      return {
        id: entry.id,
        displayId: generateDisplayId(entry.id),
        patientName: 'Self',
        doctorName: `Dr. ${doctor.first_name || ''} ${doctor.last_name || ''}`.trim(),
        specialization: doctor.specialties?.name || doctor.specialization || '—',
        doctorImage: doctor.doctor_image || null,
        appointmentDate: formatDate(schedule.available_date),
        timeSlot: formatTime(schedule.start_time),
        status: entry.status,
        badgeStatus,
        paymentStatus: 'UNPAID',
        isWaitlist: true,
        waitlistEntry: entry,
        // Raw fields
        doctorId: entry.doctor_id,
        scheduleId: entry.schedule_id,
        rawDate: schedule.available_date,
      };
    });
  }, [waitlistEntries]);

  // Combine appointments and waitlist entries
  const allItems = useMemo(() => {
    return [...transformedAppointments, ...transformedWaitlist];
  }, [transformedAppointments, transformedWaitlist]);

  // Filter appointments based on the active filter tab
  const filteredAppointments = useMemo(() => {
    // Helper: resolve the display status (badgeStatus takes priority, falls back to status)
    // Normalize to lowercase for case-insensitive comparison
    const getDisplayStatus = (appt) => (appt.badgeStatus || appt.status || '').toLowerCase();
    if (activeFilter === 'All') return allItems;
    if (activeFilter === 'Scheduled') {
      // 'Scheduled' includes both 'Upcoming' and 'Scheduled' statuses
      return allItems.filter(
        (appt) => getDisplayStatus(appt) === 'upcoming' || getDisplayStatus(appt) === 'scheduled'
      );
    }
    return allItems.filter((appt) => getDisplayStatus(appt) === activeFilter.toLowerCase());
  }, [activeFilter, allItems]);

  // ── Edit appointment handler ──────────────────────────────────────
  const handleEdit = (appointment) => {
    setEditingAppointment(appointment);
    setModalKey((k) => k + 1);
    setIsEditModalOpen(true);
  };

  // ── Review appointment handler ────────────────────────────────────
  const handleReview = (appointment) => {
    setReviewAppointment(appointment);
    setIsReviewModalOpen(true);
  };

  // ── Close review modal handler ────────────────────────────────────
  const handleCloseReviewModal = () => {
    setIsReviewModalOpen(false);
    setReviewAppointment(null);
  };

  // ── Cancel appointment handler ────────────────────────────────────
  const handleCancel = async (appointment) => {
    setCancellingId(appointment.id);
    setCancelError('');
    try {
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

  // ── Cancel waitlist entry handler ─────────────────────────────────
  const handleCancelWaitlist = async (waitlistId) => {
    setCancellingId(waitlistId);
    setCancelError('');
    try {
      const response = await fetch(`${backendUrl}/api/waitlist/${waitlistId}/cancel`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: patientId }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || `Failed to cancel waitlist entry (${response.status})`);
      }

      // Remove the cancelled waitlist entry from the local list
      setWaitlistEntries((prev) => prev.filter((e) => e.id !== waitlistId));
    } catch (err) {
      setCancelError(err.message);
    } finally {
      setCancellingId(null);
    }
  };

  // ── Accept waitlist offer handler ─────────────────────────────────
  const handleAcceptWaitlist = async (waitlistId) => {
    setAcceptingId(waitlistId);
    setCancelError('');
    try {
      const response = await fetch(`${backendUrl}/api/waitlist/${waitlistId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || `Failed to accept waitlist offer (${response.status})`);
      }

      // Refresh both appointments and waitlist
      await refreshAll();
    } catch (err) {
      setCancelError(err.message);
    } finally {
      setAcceptingId(null);
    }
  };

  // ── Decline waitlist offer handler ────────────────────────────────
  const handleDeclineWaitlist = async (waitlistId) => {
    setDecliningId(waitlistId);
    setCancelError('');
    try {
      const response = await fetch(`${backendUrl}/api/waitlist/${waitlistId}/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || `Failed to decline waitlist offer (${response.status})`);
      }

      // Refresh waitlist
      await refreshAll();
    } catch (err) {
      setCancelError(err.message);
    } finally {
      setDecliningId(null);
    }
  };

  // ── Close edit modal handler ──────────────────────────────────────
  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingAppointment(null);
  };

  // ── Close claim modal handler ─────────────────────────────────────
  const handleCloseClaimModal = () => {
    setIsClaimModalOpen(false);
    setWaitlistOffer(null);
    // Clear the claim param from the URL
    const params = new URLSearchParams(searchParams);
    params.delete('claim');
    setSearchParams(params, { replace: true });
    // Refresh appointments in case the offer was accepted
    refreshAll();
  };

  // ── Refresh all data (appointments + waitlist) ────────────────────
  const refreshAll = useCallback(async () => {
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
        .order('appointment_date', { ascending: false });

      if (apptError) throw apptError;
      setAppointments(data || []);

      // Refresh waitlist
      try {
        const waitlistResponse = await fetch(`${backendUrl}/api/waitlist/patient/${patientId}`);
        if (waitlistResponse.ok) {
          const waitlistData = await waitlistResponse.json();
          setWaitlistEntries(waitlistData.waitlist || []);
        }
      } catch (waitlistErr) {
        console.warn('Failed to refresh waitlist entries:', waitlistErr);
      }
    } catch (err) {
      setError(`Failed to refresh appointments: ${err.message}`);
    }
  }, [patientId, backendUrl]);

  if (loading || claimLoading) {
    return (
      <LoadingSpinner
        message={claimLoading ? 'Loading your waitlist offer' : 'Loading your appointments'}
      />
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

      {/* Appointment Display Area */}
      <div className="mt-6">
        <AppointmentFilterBar
          onFilterChange={setActiveFilter}
          onAddNew={() => alert('Add New Appointment clicked')}
          appointments={allItems}
        />

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
          <>
            {/* Waitlist entries shown as cards */}
            {activeFilter === 'Waitlist' && (
              <div className="space-y-4 mb-6">
                {filteredAppointments
                  .filter((a) => a.isWaitlist)
                  .map((item) => (
                    <WaitlistStatusCard
                      key={item.id}
                      entry={item.waitlistEntry}
                      onAccept={handleAcceptWaitlist}
                      onDecline={handleDeclineWaitlist}
                      onCancel={handleCancelWaitlist}
                      acceptingId={acceptingId}
                      decliningId={decliningId}
                    />
                  ))}
              </div>
            )}

            {/* Table view displaying appointment information filtered by status */}
            <AppointmentsTable
              appointments={filteredAppointments.filter((a) => !a.isWaitlist)}
              onEdit={handleEdit}
              onCancel={(appt) => setConfirmCancel(appt)}
              onReview={handleReview}
            />
          </>
        )}
      </div>

      {/* Edit Appointment Modal */}
      <BookAppointmentModal
        key={modalKey}
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        editingAppointment={editingAppointment}
        onUpdated={refreshAll}
      />

      {/* Waitlist Offer Claim Modal */}
      <BookAppointmentModal
        key={`claim-${modalKey}`}
        isOpen={isClaimModalOpen}
        onClose={handleCloseClaimModal}
        waitlistOffer={waitlistOffer}
        onUpdated={refreshAll}
      />

      {/* Review Appointment Modal */}
      <AppointmentReviewModal
        isOpen={isReviewModalOpen}
        onClose={handleCloseReviewModal}
        appointment={reviewAppointment}
        patientId={patientId}
        onSubmitted={refreshAll}
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
              </span>{' '}
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
