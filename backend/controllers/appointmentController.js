import { supabase } from '../supabase.js';
import * as appointmentModel from '../models/appointmentModel.js';
import {
  generateVerificationCode,
  generateQRPayload,
  generateQRDataUrl,
} from '../utils/qrUtils.js';

/**
 * Maps a payment method from frontend to database enum
 */
const mapPaymentMethod = (method) => {
  switch (method) {
    case 'online':
      return 'ONLINE_GATEWAY';
    case 'reception':
      return 'PAY_AT_RECEPTION';
    case 'bank':
      return 'BANK_TRANSFER';
    default:
      return 'ONLINE_GATEWAY';
  }
};

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
 * POST /api/appointments
 * Creates a new appointment with payment record and QR code.
 * Expects booking data from frontend.
 */
export const createAppointment = async (req, res, next) => {
  try {
    const bookingData = req.body;

    // Validate required fields
    if (!bookingData.patient_id || !bookingData.doctor_id || !bookingData.schedule_id || !bookingData.appointment_date) {
      return res.status(400).json({ 
        message: 'Missing required fields: patient_id, doctor_id, schedule_id, appointment_date' 
      });
    }

    // Use the model to create appointment with all related data
    const appointment = await appointmentModel.createAppointment(bookingData);

    // Build response
    const doctor = appointment.doctor_profiles || {};
    const schedule = appointment.doctor_schedules || {};
    const payment = appointment.payments || {};
    const beneficiary = appointment.beneficiaries || null;

    // Determine patient name
    let patientName = '';
    if (appointment.booking_type === 'BENEFICIARY' && beneficiary) {
      patientName = beneficiary.relationship
        ? `${beneficiary.full_name} (${beneficiary.relationship})`
        : beneficiary.full_name;
    }

    if (!patientName && appointment.patient_profiles) {
      const profile = appointment.patient_profiles;
      patientName = `${profile.first_name} ${profile.last_name}`.trim();
    }

    const verificationCode = generateVerificationCode(appointment.id);
    const qrPayload = generateQRPayload(appointment.id);

    res.status(201).json({
      appointment: {
        appointmentId: appointment.id,
        verificationCode,
        patientName: patientName || '—',
        doctorName: `Dr. ${doctor.first_name || ''} ${doctor.last_name || ''}`.trim() || '—',
        specialization: doctor.specialization || '—',
        appointmentDate: appointment.appointment_date || '',
        timeSlot: formatTime(schedule.start_time),
        paymentStatus: mapPaymentStatus(payment.payment_status),
        qrPayload,
        qrDataUrl: appointment.qr_code_url,
        bookingType: appointment.booking_type,
        amount: payment.amount,
        paymentMethod: payment.payment_method,
      },
    });
  } catch (error) {
    console.error('Error creating appointment:', error);
    next(error);
  }
};

/**
 * GET /api/appointments/:appointmentId/pass
 * Returns the full appointment pass data including a generated QR code.
 */
export const getAppointmentPass = async (req, res, next) => {
  try {
    const { appointmentId } = req.params;

    if (!appointmentId) {
      return res.status(400).json({ message: 'Appointment ID is required.' });
    }

    // 1. Fetch appointment with all related data
    const appointment = await appointmentModel.findById(appointmentId);

    // 2. Build the secure QR payload
    const verificationCode = generateVerificationCode(appointment.id);
    const qrPayload = generateQRPayload(appointment.id);

    // 3. Generate QR Data URL
    const qrDataUrl = await generateQRDataUrl(qrPayload);

    // 4. Resolve patient display name
    let patientName = '';
    if (appointment.booking_type === 'BENEFICIARY' && appointment.beneficiaries) {
      const ben = appointment.beneficiaries;
      patientName = ben.relationship
        ? `${ben.full_name} (${ben.relationship})`
        : ben.full_name;
    }

    if (!patientName) {
      const { data: profile, error: profileError } = await supabase
        .from('patient_profiles')
        .select('first_name, last_name')
        .eq('id', appointment.patient_id)
        .maybeSingle();

      if (!profileError && profile) {
        patientName = `${profile.first_name} ${profile.last_name}`.trim();
      }
    }

    // 5. Build the response
    const doctor = appointment.doctor_profiles || {};
    const schedule = appointment.doctor_schedules || {};
    const payment = appointment.payments || {};

    res.json({
      appointment: {
        appointmentId: appointment.id,
        verificationCode,
        patientName: patientName || '—',
        doctorName: `Dr. ${doctor.first_name || ''} ${doctor.last_name || ''}`.trim() || '—',
        specialization: doctor.specialization || '—',
        appointmentDate: appointment.appointment_date || '',
        timeSlot: formatTime(schedule.start_time),
        paymentStatus: mapPaymentStatus(payment.payment_status),
        qrPayload,
        qrDataUrl,
      },
    });
  } catch (error) {
    if (error.code === 'PGRST116') {
      return res.status(404).json({ message: 'Appointment not found.' });
    }
    next(error);
  }
};