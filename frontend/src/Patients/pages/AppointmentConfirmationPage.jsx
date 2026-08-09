import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { supabase } from '../../../supabaseClient';
import { generateQRPayload, generateVerificationCode } from '../../utils/qrUtils';
import AppointmentConfirmationPass from '../components/AppointmentConfirmationPass';

/**
 * Formats a TIME column (HH:MM:SS) into a 12-hour label.
 * @param {string} timeStr - e.g. '10:30:00'
 * @returns {string} e.g. '10:30 AM'
 */
const formatTime = (timeStr) => {
  if (!timeStr) return '—';
  const [hours, minutes] = timeStr.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return timeStr;
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${String(minutes).padStart(2, '0')} ${period}`;
};

/**
 * Maps a payment_status to the pass badge value.
 * PENDING_SLIP_VERIFICATION is treated as UNPAID for display purposes.
 */
const mapPaymentStatus = (status) => {
  if (status === 'PAID') return 'PAID';
  if (status === 'PAY_AT_RECEPTION') return 'PAY_AT_RECEPTION';
  return 'UNPAID';
};

/**
 * Appointment Confirmation Page
 *
 * Loads a single appointment (by :appointmentId) from Supabase and renders
 * the reusable AppointmentConfirmationPass. Accessible from the
 * "My Appointments" portal.
 */
export default function AppointmentConfirmationPage() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [passData, setPassData] = useState(null);

  // ── Resolve current patient profile id ─────────────────────────────
  const resolvePatientId = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    if (!user) return null;

    const { data: profile, error: profileError } = await supabase
      .from('patient_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profileError || !profile) return null;
    return profile.id;
  }, []);

  // ── Load appointment details ────────────────────────────────────────
  useEffect(() => {
    const loadAppointment = async () => {
      setLoading(true);
      setError('');
      try {
        const patientId = await resolvePatientId();
        if (!patientId) {
          setError('You must be logged in to view this appointment.');
          return;
        }

        // 1. Fetch appointment + doctor + schedule + payment in one query
        const { data: appointment, error: apptError } = await supabase
          .from('appointments')
          .select(`
            id,
            booking_type,
            beneficiary_id,
            appointment_date,
            status,
            doctor_profiles (
              first_name,
              last_name,
              specialization
            ),
            doctor_schedules (
              start_time
            ),
            payments (
              payment_status
            )
          `)
          .eq('id', appointmentId)
          .eq('patient_id', patientId)
          .single();

        if (apptError) throw apptError;

        // 2. Resolve patient display name (account holder or beneficiary)
        let patientName = '';
        if (appointment.booking_type === 'BENEFICIARY' && appointment.beneficiary_id) {
          const { data: beneficiary, error: benError } = await supabase
            .from('beneficiaries')
            .select('full_name, relationship')
            .eq('id', appointment.beneficiary_id)
            .maybeSingle();

          if (benError) throw benError;
          if (beneficiary) {
            patientName = beneficiary.relationship
              ? `${beneficiary.full_name} (${beneficiary.relationship})`
              : beneficiary.full_name;
          }
        }

        if (!patientName) {
          const { data: profile, error: profileError } = await supabase
            .from('patient_profiles')
            .select('first_name, last_name')
            .eq('id', patientId)
            .maybeSingle();

          if (profileError) throw profileError;
          if (profile) {
            patientName = `${profile.first_name} ${profile.last_name}`.trim();
          }
        }

        // 3. Build pass data
        const doctor = appointment.doctor_profiles || {};
        const schedule = appointment.doctor_schedules || {};
        const payment = appointment.payments || {};

        setPassData({
          appointmentId: appointment.id,
          verificationCode: generateVerificationCode(appointment.id),
          patientName: patientName || '—',
          doctorName: `Dr. ${doctor.first_name || ''} ${doctor.last_name || ''}`.trim() || '—',
          specialization: doctor.specialization || '—',
          appointmentDate: appointment.appointment_date || '',
          timeSlot: formatTime(schedule.start_time),
          paymentStatus: mapPaymentStatus(payment.payment_status),
          qrPayload: generateQRPayload(appointment.id),
          qrDataUrl: appointment.qr_code_url || '',
        });
      } catch (err) {
        console.error('Failed to load appointment:', err);
        setError(err.message || 'Failed to load appointment details.');
      } finally {
        setLoading(false);
      }
    };

    loadAppointment();
  }, [appointmentId, resolvePatientId]);

  // ── Render states ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex-1 w-full flex flex-col items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-[#00b8e6]" />
        <p className="mt-3 text-sm font-medium text-slate-500">Loading your appointment pass...</p>
      </div>
    );
  }

  if (error || !passData) {
    return (
      <div className="flex-1 w-full flex flex-col items-center justify-center py-24 px-4">
        <div className="w-full max-w-md rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800">Unable to load pass</h3>
          <p className="text-sm text-slate-600 mt-1">{error || 'Appointment not found.'}</p>
          <button
            onClick={() => navigate('/patient/appointments')}
            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00b8e6] text-white font-semibold text-sm hover:bg-[#00a3cc] transition"
          >
            <ArrowLeft size={16} />
            Back to Appointments
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full px-4 md:px-6 lg:px-8 py-6">
      {/* Page Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800">Appointment Pass</h1>
          <p className="text-[#00b8e6] font-medium text-sm mt-1">
            Your digital check-in pass
          </p>
        </div>
        <button
          onClick={() => navigate('/patient/appointments')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition"
        >
          <ArrowLeft size={16} />
          Back
        </button>
      </div>

      {/* Reusable Pass Component */}
      <AppointmentConfirmationPass
        appointment={passData}
        onDone={() => navigate('/patient/appointments')}
      />
    </div>
  );
}