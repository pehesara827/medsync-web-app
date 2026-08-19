import { supabase } from '../supabase.js';
import * as appointmentModel from '../models/appointmentModel.js';
import {
  generateVerificationCode,
  generateQRPayload,
  generateQRDataUrl,
} from '../utils/qrUtils.js';

/**
 * Generates a human-readable display ID from a UUID.
 * Format: MED-<first 8 chars of UUID uppercased, no dashes>
 * @param {string} uuid - The appointment UUID
 * @returns {string} e.g. 'MED-3F2A9B1C'
 */
const generateDisplayId = (uuid) => {
  if (!uuid) return 'MED-UNKNOWN';
  const shortId = uuid.replace(/-/g, '').slice(0, 8).toUpperCase();
  return `MED-${shortId}`;
};

/**
 * Formats a DATE column (YYYY-MM-DD) into a friendly day label.
 * @param {string} dateStr - e.g. '2026-08-09'
 * @returns {string} e.g. 'Today', 'Tomorrow', or 'Aug 9'
 */
const formatDay = (dateStr) => {
  if (!dateStr) return '—';
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateStr;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.getTime() === today.getTime()) return 'Today';
  if (date.getTime() === tomorrow.getTime()) return 'Tomorrow';

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

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
    const specialtyName = doctor.specialties?.name || doctor.specialization || '—';

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
        displayId: generateDisplayId(appointment.id),
        verificationCode,
        patientName: patientName || '—',
        doctorName: `Dr. ${doctor.first_name || ''} ${doctor.last_name || ''}`.trim() || '—',
        specialization: specialtyName,
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
    const appointment = await appointmentModel.getAppointmentById(appointmentId);

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
    const specialtyName = doctor.specialties?.name || doctor.specialization || '—';

    res.json({
      appointment: {
        appointmentId: appointment.id,
        verificationCode,
        patientName: patientName || '—',
        doctorName: `Dr. ${doctor.first_name || ''} ${doctor.last_name || ''}`.trim() || '—',
        specialization: specialtyName,
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

/**
 * GET /api/appointments/patient/:patientId
 * Returns all appointments for a patient, formatted for the AppointmentCard.
 */
export const getPatientAppointments = async (req, res, next) => {
  try {
    const { patientId } = req.params;

    if (!patientId) {
      return res.status(400).json({ message: 'Patient ID is required.' });
    }

    // Fetch all appointments for the patient
    const appointments = await appointmentModel.getAppointmentsByPatient(patientId);

    // Map each appointment into the card shape
    const cards = await Promise.all(
      appointments.map(async (appt) => {
        const doctor = appt.doctor_profiles || {};
        const schedule = appt.doctor_schedules || {};
        const specialtyName = doctor.specialties?.name || doctor.specialization || '—';

        // Compute patients ahead for active (PENDING/CONFIRMED) appointments
        let patientsAhead = null;
        if (appt.status === 'PENDING' || appt.status === 'CONFIRMED') {
          try {
            patientsAhead = await appointmentModel.getPatientsAhead(
              appt.id,
              appt.doctor_id,
              appt.appointment_date,
              appt.created_at
            );
          } catch (err) {
            console.error(`Failed to compute patients ahead for ${appt.id}:`, err);
            patientsAhead = null;
          }
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
          status: appt.status,
          badgeStatus,
          day: formatDay(appt.appointment_date),
          time: formatTime(schedule.start_time),
          doctorName: `Dr. ${doctor.first_name || ''} ${doctor.last_name || ''}`.trim() || '—',
          specialty: specialtyName,
          patientsAhead,
          doctorImage: doctor.doctor_image || null,
          hasBadge: appt.status === 'PENDING' || appt.status === 'CONFIRMED',
          createdAt: appt.created_at,
          updatedAt: appt.updated_at,
        };
      })
    );

    res.json({ appointments: cards });
  } catch (error) {
    console.error('Error fetching patient appointments:', error);
    next(error);
  }
};

/**
 * PATCH /api/appointments/:appointmentId/cancel
 * Cancels an appointment and decrements the doctor schedule count.
 */
export const cancelAppointment = async (req, res, next) => {
  try {
    const { appointmentId } = req.params;

    if (!appointmentId) {
      return res.status(400).json({ message: 'Appointment ID is required.' });
    }

    const appointment = await appointmentModel.cancelAppointment(appointmentId);

    res.json({
      message: 'Appointment cancelled successfully.',
      appointment: {
        id: appointment.id,
        status: appointment.status,
      },
    });
  } catch (error) {
    if (error.code === 'PGRST116') {
      return res.status(404).json({ message: 'Appointment not found.' });
    }
    if (error.code === 'ALREADY_CANCELLED') {
      return res.status(400).json({ message: error.message });
    }
    console.error('Error cancelling appointment:', error);
    next(error);
  }
};

/**
 * PUT /api/appointments/:appointmentId
 * Updates an existing appointment's details.
 */
export const updateAppointment = async (req, res, next) => {
  try {
    const { appointmentId } = req.params;
    const updateData = req.body;

    if (!appointmentId) {
      return res.status(400).json({ message: 'Appointment ID is required.' });
    }

    // Validate required fields for update
    if (!updateData.schedule_id || !updateData.appointment_date) {
      return res.status(400).json({ message: 'schedule_id and appointment_date are required.' });
    }

    const appointment = await appointmentModel.updateAppointment(appointmentId, updateData);

    // Build response
    const doctor = appointment.doctor_profiles || {};
    const schedule = appointment.doctor_schedules || {};
    const payment = appointment.payments || {};
    const beneficiary = appointment.beneficiaries || null;
    const specialtyName = doctor.specialties?.name || doctor.specialization || '—';

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

    res.json({
      message: 'Appointment updated successfully.',
      appointment: {
        appointmentId: appointment.id,
        displayId: generateDisplayId(appointment.id),
        patientName: patientName || '—',
        doctorName: `Dr. ${doctor.first_name || ''} ${doctor.last_name || ''}`.trim() || '—',
        specialization: specialtyName,
        appointmentDate: appointment.appointment_date || '',
        timeSlot: formatTime(schedule.start_time),
        paymentStatus: mapPaymentStatus(payment.payment_status),
        bookingType: appointment.booking_type,
        amount: payment.amount,
        paymentMethod: payment.payment_method,
      },
    });
  } catch (error) {
    if (error.code === 'PGRST116') {
      return res.status(404).json({ message: 'Appointment not found.' });
    }
    console.error('Error updating appointment:', error);
    next(error);
  }
};
