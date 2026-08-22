import * as waitlistModel from '../models/waitlistModel.js';
import { generateVerificationCode, generateQRPayload } from '../utils/qrUtils.js';

// ─────────────────────────────
// Helpers
// ─────────────────────────────

/**
 * Generates a human-readable display ID from a UUID.
 * Format: MED-<first 8 chars of UUID uppercased, no dashes>
 */
const generateDisplayId = (uuid) => {
  if (!uuid) return 'MED-UNKNOWN';
  const shortId = uuid.replace(/-/g, '').slice(0, 8).toUpperCase();
  return `MED-${shortId}`;
};

/**
 * Formats a TIME column (HH:MM:SS) into a 12-hour label.
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
 */
const mapPaymentStatus = (status) => {
  if (status === 'PAID') return 'PAID';
  if (status === 'PAY_AT_RECEPTION') return 'PAY_AT_RECEPTION';
  return 'UNPAID';
};

// ─────────────────────────────
// Controllers
// ─────────────────────────────

/**
 * POST /api/waitlist
 * Joins the waitlist for a doctor's schedule slot that is at full capacity.
 * Expects: { patient_id, doctor_id, schedule_id, booking_type, beneficiary_id }
 */
export const joinWaitlist = async (req, res, next) => {
  try {
    const data = req.body;

    // Validate required fields
    if (!data.patient_id || !data.schedule_id) {
      return res.status(400).json({
        message: 'Missing required fields: patient_id, schedule_id',
      });
    }

    const waitlistEntry = await waitlistModel.joinWaitlist(data);

    res.status(201).json({
      message: 'You have been added to the waitlist.',
      waitlist: waitlistEntry,
    });
  } catch (error) {
    console.error('Error joining waitlist:', error);

    if (error.code === 'SLOT_AVAILABLE') {
      return res.status(409).json({ message: error.message });
    }
    if (error.code === 'ALREADY_ON_WAITLIST') {
      return res.status(409).json({ message: error.message });
    }
    if (error.code === 'PGRST116') {
      return res.status(404).json({ message: 'Schedule not found.' });
    }
    next(error);
  }
};

/**
 * GET /api/waitlist/:waitlistId
 * Returns a single waitlist entry by ID with full related data.
 */
export const getWaitlistEntry = async (req, res, next) => {
  try {
    const { waitlistId } = req.params;

    if (!waitlistId) {
      return res.status(400).json({ message: 'Waitlist ID is required.' });
    }

    let waitlistEntry;
    try {
      waitlistEntry = await waitlistModel.getWaitlistEntryById(waitlistId);
    } catch (err) {
      if (err.code === 'PGRST116') {
        return res.status(404).json({ message: 'Waitlist entry not found.' });
      }
      throw err;
    }

    res.json({ waitlist: waitlistEntry });
  } catch (error) {
    console.error('Error fetching waitlist entry:', error);
    next(error);
  }
};

/**
 * GET /api/waitlist/patient/:patientId
 * Returns all waitlist entries for a patient.
 */
export const getPatientWaitlist = async (req, res, next) => {
  try {
    const { patientId } = req.params;

    if (!patientId) {
      return res.status(400).json({ message: 'Patient ID is required.' });
    }

    const waitlist = await waitlistModel.getWaitlistByPatient(patientId);

    res.json({ waitlist });
  } catch (error) {
    console.error('Error fetching patient waitlist:', error);
    next(error);
  }
};

/**
 * GET /api/waitlist/doctor/:doctorId
 * Returns all waitlist entries for a doctor's schedules.
 */
export const getDoctorWaitlist = async (req, res, next) => {
  try {
    const { doctorId } = req.params;

    if (!doctorId) {
      return res.status(400).json({ message: 'Doctor ID is required.' });
    }

    const waitlist = await waitlistModel.getWaitlistByDoctor(doctorId);

    res.json({ waitlist });
  } catch (error) {
    console.error('Error fetching doctor waitlist:', error);
    next(error);
  }
};

/**
 * POST /api/waitlist/:waitlistId/accept
 * Accepts a waitlist offer (patient confirms) and converts to an appointment.
 * Expects body: { amount?, payment_method? }
 */
export const acceptOffer = async (req, res, next) => {
  try {
    const { waitlistId } = req.params;
    const { amount, payment_method } = req.body;

    if (!waitlistId) {
      return res.status(400).json({ message: 'Waitlist ID is required.' });
    }

    const result = await waitlistModel.acceptWaitlistOffer(waitlistId, {
      amount,
      payment_method,
    });

    // Format the appointment response to match the createAppointment controller shape
    const appointment = result.appointment;
    const doctor = appointment.doctor_profiles || {};
    const schedule = appointment.doctor_schedules || {};
    const payment = appointment.payments || {};
    const beneficiary = appointment.beneficiaries || null;
    const specialtyName = doctor.specialties?.name || doctor.specialization || '—';

    // Determine patient display name
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

    res.json({
      message: 'Appointment confirmed! Your waitlist offer has been accepted.',
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
      waitlist: result.waitlist,
    });
  } catch (error) {
    console.error('Error accepting waitlist offer:', error);

    if (error.code === 'NOT_FOUND') {
      return res.status(404).json({ message: error.message });
    }
    if (error.code === 'INVALID_STATUS') {
      return res.status(409).json({ message: error.message });
    }
    if (error.code === 'OFFER_EXPIRED') {
      return res.status(410).json({ message: error.message });
    }
    if (error.code === 'SLOT_FULL') {
      return res.status(409).json({ message: error.message });
    }
    next(error);
  }
};

/**
 * POST /api/waitlist/:waitlistId/decline
 * Declines a waitlist offer. The system automatically cascades to the next patient.
 */
export const declineOffer = async (req, res, next) => {
  try {
    const { waitlistId } = req.params;

    if (!waitlistId) {
      return res.status(400).json({ message: 'Waitlist ID is required.' });
    }

    const updated = await waitlistModel.declineWaitlistOffer(waitlistId, 'SKIPPED');

    res.json({
      message: 'Offer declined. The next patient in line has been notified.',
      waitlist: updated,
    });
  } catch (error) {
    console.error('Error declining waitlist offer:', error);

    if (error.code === 'INVALID_STATUS') {
      return res.status(409).json({ message: error.message });
    }
    if (error.code === 'PGRST116') {
      return res.status(404).json({ message: 'Waitlist entry not found.' });
    }
    next(error);
  }
};

/**
 * DELETE /api/waitlist/:waitlistId
 * Cancels a patient's own waitlist entry.
 */
export const cancelEntry = async (req, res, next) => {
  try {
    const { waitlistId } = req.params;
    const { patient_id } = req.body;

    if (!waitlistId || !patient_id) {
      return res.status(400).json({ message: 'Waitlist ID and patient_id are required.' });
    }

    const cancelled = await waitlistModel.cancelWaitlistEntry(waitlistId, patient_id);

    res.json({
      message: 'Removed from waitlist successfully.',
      waitlist: cancelled,
    });
  } catch (error) {
    console.error('Error cancelling waitlist entry:', error);

    if (error.code === 'FORBIDDEN') {
      return res.status(403).json({ message: error.message });
    }
    if (error.code === 'INVALID_STATUS') {
      return res.status(409).json({ message: error.message });
    }
    if (error.code === 'PGRST116') {
      return res.status(404).json({ message: 'Waitlist entry not found.' });
    }
    next(error);
  }
};

/**
 * POST /api/waitlist/expire-offers
 * Manually triggers expiry check for NOTIFIED entries with lapsed claim windows.
 * Can be called by a cron job or on-demand.
 */
export const expireOffers = async (req, res, next) => {
  try {
    const expiredCount = await waitlistModel.expireExpiredOffers();

    res.json({
      message: expiredCount > 0
        ? `Expired ${expiredCount} offer(s) and cascaded to next patients.`
        : 'No expired offers found.',
      expiredCount,
    });
  } catch (error) {
    console.error('Error expiring waitlist offers:', error);
    next(error);
  }
};
