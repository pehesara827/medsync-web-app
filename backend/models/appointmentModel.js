import { supabase } from '../supabase.js';
import QRCode from 'qrcode';
import {
  generateVerificationCode,
  generateQRPayload,
} from '../utils/qrUtils.js';
import { notifyNextPatient } from './waitlistModel.js';
import { createNotification } from './notificationModel.js';

/**
 * Creates a new appointment with associated payment record and QR code.
 * Performs multiple database operations in sequence.
 * 
 * @param {Object} bookingData - The appointment booking data
 * @param {string} bookingData.patient_id - UUID of the patient
 * @param {string} bookingData.booking_type - 'SELF' or 'BENEFICIARY'
 * @param {string|null} bookingData.beneficiary_id - UUID of beneficiary (if booking_type is BENEFICIARY)
 * @param {string} bookingData.doctor_id - UUID of the doctor
 * @param {string} bookingData.schedule_id - UUID of the doctor schedule
 * @param {string} bookingData.appointment_date - Date string (YYYY-MM-DD)
 * @param {string} [bookingData.amount] - Payment amount
 * @param {string} [bookingData.payment_method] - Payment method
 * @returns {Promise<Object>} Complete appointment object with related data
 */
export const createAppointment = async (bookingData) => {
  try {
    // Step 0: Check schedule capacity before booking
    const { data: schedule, error: scheduleFetchError } = await supabase
      .from('doctor_schedules')
      .select('max_patients, current_appointment, is_booked')
      .eq('id', bookingData.schedule_id)
      .single();

    if (scheduleFetchError) throw scheduleFetchError;

    const maxPatients = schedule.max_patients ?? 1;
    const currentCount = schedule.current_appointment ?? 0;

    if (currentCount >= maxPatients) {
      const err = new Error('Time slot is full. Please select a different time slot.');
      err.code = 'SLOT_FULL';
      throw err;
    }

    // Step 1: Insert the appointment record
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .insert([
        {
          patient_id: bookingData.patient_id,
          booking_type: bookingData.booking_type,
          beneficiary_id: bookingData.beneficiary_id || null,
          doctor_id: bookingData.doctor_id,
          schedule_id: bookingData.schedule_id,
          appointment_date: bookingData.appointment_date,
          status: 'PENDING',
        },
      ])
      .select()
      .single();

    if (appointmentError) throw appointmentError;

    // Step 2: Increment current_appointment count and set is_booked if at capacity
    const newCount = currentCount + 1;
    const updateData = {
      current_appointment: newCount,
      is_booked: newCount >= maxPatients,
    };

    const { error: scheduleError } = await supabase
      .from('doctor_schedules')
      .update(updateData)
      .eq('id', bookingData.schedule_id);

    if (scheduleError) throw scheduleError;

    // Step 3: Insert initial payment record
    const initialPaymentStatus =
      bookingData.payment_method === 'BANK_TRANSFER' ? 'PENDING_SLIP_VERIFICATION' : 'UNPAID';

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert([
        {
          appointment_id: appointment.id,
          amount: bookingData.amount || 0,
          payment_method: bookingData.payment_method || 'PAY_AT_RECEPTION',
          payment_status: initialPaymentStatus,
          receipt_slip_url: bookingData.receipt_slip_url || null,
        },
      ])
      .select()
      .single();

    if (paymentError) throw paymentError;

    // Step 4: Generate QR code
    const verificationCode = generateVerificationCode(appointment.id);
    const qrPayload = generateQRPayload(appointment.id);
    const qrDataUrl = await QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 300,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });

    // Step 5: Upload QR code to Supabase Storage
    console.log('Uploading QR code to storage...');
    const qrCodeBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');
    const qrCodeFileName = `${appointment.id}.png`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('qr-codes')
      .upload(qrCodeFileName, qrCodeBuffer, {
        contentType: 'image/png',
        upsert: true,
      });

    if (uploadError) {
      console.error('Failed to upload QR code:', uploadError);
      // Continue with base64 fallback if upload fails
    } else {
      console.log('QR code uploaded successfully:', uploadData.path);
    }

    // Step 6: Get public URL for the QR code
    const { data: { publicUrl } } = supabase.storage
      .from('qr-codes')
      .getPublicUrl(qrCodeFileName);

    // Step 7: Update appointment with QR code URL
    const { data: updatedAppointment, error: updateError } = await supabase
      .from('appointments')
      .update({ qr_code_url: publicUrl })
      .eq('id', appointment.id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Step 8: Fetch complete appointment with all related data
    const fullAppointment = await getAppointmentById(updatedAppointment.id);

    return fullAppointment;
  } catch (error) {
    throw error;
  }
};

/**
 * Retrieves a single appointment by ID with all related data.
 * Performs JOIN queries across multiple tables.
 * 
 * @param {string} appointmentId - UUID of the appointment
 * @returns {Promise<Object>} Complete appointment object with related data
 */
export const getAppointmentById = async (appointmentId) => {
  // Fetch appointment with all related data using Supabase joins
  const { data: appointment, error } = await supabase
    .from('appointments')
    .select(
      `
      *,
      patient_profiles (
        id,
        user_id,
        first_name,
        last_name,
        date_of_birth,
        gender,
        home_address
      ),
      beneficiaries (
        id,
        patient_id,
        full_name,
        age,
        gender,
        relationship,
        created_at
      ),
      doctor_profiles (
        id,
        user_id,
        first_name,
        last_name,
        specialization,
        experience_years,
        is_approved,
        specialties (
          id,
          name
        )
      ),
      doctor_schedules (
        id,
        doctor_id,
        available_date,
        start_time,
        end_time,
        consultation_fee,
        is_booked,
        created_at
      ),
      payments (
        id,
        appointment_id,
        amount,
        payment_method,
        payment_status,
        transaction_id,
        receipt_slip_url,
        paid_at,
        created_at
      )
    `
    )
    .eq('id', appointmentId)
    .single();

  if (error) throw error;
  return appointment;
};

/**
 * Computes the number of patients ahead of a given appointment.
 * Counts PENDING/CONFIRMED appointments for the same doctor on the same date
 * that were created before this appointment.
 *
 * @param {string} appointmentId - UUID of the appointment
 * @param {string} doctorId - UUID of the doctor
 * @param {string} appointmentDate - Date string (YYYY-MM-DD)
 * @param {string} createdAt - ISO timestamp of the appointment creation
 * @returns {Promise<number>} Number of patients ahead
 */
export const getPatientsAhead = async (appointmentId, doctorId, appointmentDate, createdAt) => {
  const { count, error } = await supabase
    .from('appointments')
    .select('id', { count: 'exact', head: true })
    .eq('doctor_id', doctorId)
    .eq('appointment_date', appointmentDate)
    .in('status', ['PENDING', 'CONFIRMED'])
    .neq('id', appointmentId)
    .lt('created_at', createdAt);

  if (error) throw error;
  return count || 0;
};

/**
 * Retrieves all appointments for a specific patient (account owner).
 * Includes both SELF and BENEFICIARY bookings, INCLUDING CANCELLED ones
 * (needed for the "Cancelled" filter tab and the dashboard Recent Activity).
 *
 * @param {string} patientId - UUID of the patient profile
 * @returns {Promise<Array>} Array of appointment objects
 */
export const getAppointmentsByPatient = async (patientId) => {
  const { data: appointments, error } = await supabase
    .from('appointments')
    .select(
      `
      *,
      doctor_profiles (
        id,
        first_name,
        last_name,
        specialization,
        doctor_image,
        specialties (
          id,
          name
        )
      ),
      doctor_schedules (
        id,
        available_date,
        start_time,
        end_time
      ),
      payments (
        id,
        amount,
        payment_method,
        payment_status
      ),
      beneficiaries (
        id,
        full_name,
        relationship
      )
    `
    )
    .eq('patient_id', patientId)
    // NOTE: CANCELLED appointments are intentionally INCLUDED so the
    // dashboard's Recent Activity section can show recently-cancelled
    // bookings with a "Cancelled" badge. Consumers that only want active
    // appointments (carousel, stats) filter them out client-side.
    .order('updated_at', { ascending: false })
    .order('appointment_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return appointments || [];
};

/**
 * Cancels an appointment by setting its status to 'CANCELLED'.
 * Decrements the current_appointment count on the associated doctor schedule
 * and recalculates is_booked.
 *
 * @param {string} appointmentId - UUID of the appointment to cancel
 * @returns {Promise<Object>} The updated appointment object
 */
export const cancelAppointment = async (appointmentId) => {
  // Fetch the appointment to get its schedule_id
  const { data: appointment, error: fetchError } = await supabase
    .from('appointments')
    .select('id, schedule_id, status')
    .eq('id', appointmentId)
    .single();

  if (fetchError) throw fetchError;

  // Prevent cancelling a terminal appointment (already cancelled / completed / missed)
  if (appointment.status === 'CANCELLED') {
    const err = new Error('Appointment is already cancelled.');
    err.code = 'ALREADY_CANCELLED';
    throw err;
  }
  if (appointment.status === 'COMPLETED' || appointment.status === 'MISSED') {
    const err = new Error(`Cannot cancel an appointment that is already ${appointment.status}.`);
    err.code = 'ALREADY_TERMINAL';
    throw err;
  }

  // Update appointment status to CANCELLED.
  // updated_at is set explicitly (the trg_appointments_updated_at trigger
  // also maintains it, but setting it here keeps behaviour correct even
  // if the trigger hasn't been applied in an environment). A fresh
  // updated_at is what makes the row surface in Recent Activity.
  const { data: updatedAppt, error: cancelError } = await supabase
    .from('appointments')
    .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
    .eq('id', appointmentId)
    .select()
    .single();

  if (cancelError) throw cancelError;

  // Decrement current_appointment on the schedule and recalculate is_booked
  if (appointment.schedule_id) {
    const { data: schedule, error: scheduleFetchError } = await supabase
      .from('doctor_schedules')
      .select('current_appointment, max_patients')
      .eq('id', appointment.schedule_id)
      .single();

    if (scheduleFetchError) throw scheduleFetchError;

    const currentCount = Math.max((schedule.current_appointment ?? 0) - 1, 0);
    const maxPatients = schedule.max_patients ?? 1;

    const { error: scheduleUpdateError } = await supabase
      .from('doctor_schedules')
      .update({
        current_appointment: currentCount,
        is_booked: currentCount >= maxPatients,
      })
      .eq('id', appointment.schedule_id);

    if (scheduleUpdateError) throw scheduleUpdateError;

    // ── Waitlist Promotion Flow ─────────────────────────────────────
    // When a slot reopens (cancellation), notify the next waitlisted patient
    // so they get a 2-hour claim window to accept the offer.
    try {
      console.log(`[Waitlist] Slot reopened for schedule ${appointment.schedule_id}. Checking waitlist...`);
      const notified = await notifyNextPatient(appointment.schedule_id);
      if (notified) {
        console.log(`[Waitlist] Next patient (${notified.patient_id}) notified for schedule ${appointment.schedule_id}`);
      } else {
        console.log(`[Waitlist] No waitlisted patients for schedule ${appointment.schedule_id}. Slot is open for general booking.`);
      }
    } catch (waitlistError) {
      // Fail gracefully - the slot is still open for general booking even if
      // the waitlist notification fails
      console.error('[Waitlist] Failed to notify next patient:', waitlistError.message);
    }
  }

  return updatedAppt;
};

/**
 * Updates an existing appointment's details.
 * If the schedule_id changes, adjusts current_appointment counts on both
 * the old and new doctor schedule records.
 *
 * @param {string} appointmentId - UUID of the appointment
 * @param {Object} updateData - Fields to update (doctor_id, schedule_id, appointment_date, booking_type, beneficiary_id)
 * @returns {Promise<Object>} The complete updated appointment with related data
 */
export const updateAppointment = async (appointmentId, updateData) => {
  // Fetch current appointment to compare schedule
  const { data: currentAppt, error: apptFetchError } = await supabase
    .from('appointments')
    .select('id, schedule_id, status')
    .eq('id', appointmentId)
    .single();

  if (apptFetchError) throw apptFetchError;

  // If the schedule is changing, adjust counts on both schedules
  if (updateData.schedule_id && updateData.schedule_id !== currentAppt.schedule_id) {
    // Decrement old schedule if it exists
    if (currentAppt.schedule_id) {
      const { data: oldSchedule, error: oldFetchError } = await supabase
        .from('doctor_schedules')
        .select('current_appointment, max_patients')
        .eq('id', currentAppt.schedule_id)
        .single();

      if (oldFetchError) throw oldFetchError;

      const oldCount = Math.max((oldSchedule.current_appointment ?? 0) - 1, 0);
      const oldMax = oldSchedule.max_patients ?? 1;

      const { error: oldUpdateError } = await supabase
        .from('doctor_schedules')
        .update({
          current_appointment: oldCount,
          is_booked: oldCount >= oldMax,
        })
        .eq('id', currentAppt.schedule_id);

      if (oldUpdateError) throw oldUpdateError;
    }

    // Increment new schedule (also check capacity)
    const { data: newSchedule, error: newFetchError } = await supabase
      .from('doctor_schedules')
      .select('current_appointment, max_patients')
      .eq('id', updateData.schedule_id)
      .single();

    if (newFetchError) throw newFetchError;

    const newCount = (newSchedule.current_appointment ?? 0) + 1;
    const newMax = newSchedule.max_patients ?? 1;

    if (newCount > newMax) {
      throw new Error('Time slot is full. Please select a different time slot.');
    }

    const { error: newUpdateError } = await supabase
      .from('doctor_schedules')
      .update({
        current_appointment: newCount,
        is_booked: newCount >= newMax,
      })
      .eq('id', updateData.schedule_id);

    if (newUpdateError) throw newUpdateError;
  }

  // Build the update object (only include provided fields)
  const updatePayload = {};
  if (updateData.patient_id !== undefined) updatePayload.patient_id = updateData.patient_id;
  if (updateData.booking_type !== undefined) updatePayload.booking_type = updateData.booking_type;
  if (updateData.beneficiary_id !== undefined) updatePayload.beneficiary_id = updateData.beneficiary_id;
  if (updateData.doctor_id !== undefined) updatePayload.doctor_id = updateData.doctor_id;
  if (updateData.schedule_id !== undefined) updatePayload.schedule_id = updateData.schedule_id;
  if (updateData.appointment_date !== undefined) updatePayload.appointment_date = updateData.appointment_date;

  // Update the appointment record
  const { data: updatedAppt, error: updateError } = await supabase
    .from('appointments')
    .update(updatePayload)
    .eq('id', appointmentId)
    .select()
    .single();

  if (updateError) throw updateError;

  // Fetch full appointment with related data
  const fullAppointment = await getAppointmentById(updatedAppt.id);

  return fullAppointment;
};

/**
 * Shared helper: send the "Hi {patient}, thank you for visiting MedSync Clinic
 * today. How was your visit with Dr. {doctor}?" in-app review request.
 *
 * Idempotent — if a REVIEW_REQUEST notification already exists for this
 * appointment it is returned untouched instead of creating a duplicate.
 * Never throws: notification failure must not break appointment completion.
 *
 * @param {string} appointmentId - appointments.id that just became COMPLETED
 * @returns {Promise<Object|null>} the notification (new or existing)
 */
export const sendReviewRequestNotification = async (appointmentId) => {
  if (!appointmentId) return null;
  try {
    const { data: appointment, error } = await supabase
      .from('appointments')
      .select(
        `
        id,
        appointment_date,
        doctor_id,
        patient_id,
        patient_profiles ( user_id, first_name, last_name ),
        doctor_profiles ( first_name, last_name ),
        doctor_schedules ( start_time, end_time )
      `
      )
      .eq('id', appointmentId)
      .maybeSingle();

    if (error) throw error;
    if (!appointment) return null;

    const userId = appointment.patient_profiles?.user_id;
    if (!userId) return null;

    // Idempotency: one REVIEW_REQUEST per appointment.
    const { data: existing, error: existingError } = await supabase
      .from('notifications')
      .select('id')
      .eq('type', 'REVIEW_REQUEST')
      .contains('metadata', { appointment_id: appointmentId })
      .limit(1)
      .maybeSingle();

    if (!existingError && existing) return existing;

    const patientFirstName = appointment.patient_profiles?.first_name || 'there';
    const doctorName =
      `Dr. ${appointment.doctor_profiles?.first_name || ''} ${appointment.doctor_profiles?.last_name || ''}`.trim() ||
      'your doctor';

    return await createNotification({
      user_id: userId,
      type: 'REVIEW_REQUEST',
      title: 'How was your visit?',
      message: `Hi ${patientFirstName}, thank you for visiting MedSync Clinic today. How was your visit with ${doctorName}?`,
      action_link: `/patient/appointments?review=${appointmentId}`,
      metadata: {
        appointment_id: appointmentId,
        doctor_id: appointment.doctor_id,
        appointment_date: appointment.appointment_date,
      },
    });
  } catch (notifError) {
    console.error(
      `[ReviewRequest] Notification failed for appointment ${appointmentId}:`,
      notifError.message
    );
    return null;
  }
};

/**
 * Backfill sweep: notify every recently COMPLETED appointment (last 7 days)
 * that has no review and no REVIEW_REQUEST notification yet.
 * Idempotent — safe to run on an interval.
 *
 * @returns {Promise<number>} Number of review requests sent
 */
export const sendPendingReviewRequests = async () => {
  try {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];

    const { data: completed, error } = await supabase
      .from('appointments')
      .select('id, appointment_date')
      .eq('status', 'COMPLETED')
      .gte('appointment_date', weekAgoStr);

    if (error) throw error;
    if (!completed || completed.length === 0) return 0;

    const ids = completed.map((a) => a.id);

    const { data: reviews, error: reviewError } = await supabase
      .from('doctor_reviews')
      .select('appointment_id')
      .in('appointment_id', ids);
    if (reviewError) throw reviewError;
    const reviewedIds = new Set((reviews || []).map((r) => r.appointment_id));

    const { data: notified, error: notifiedError } = await supabase
      .from('notifications')
      .select('metadata')
      .eq('type', 'REVIEW_REQUEST');
    if (notifiedError) throw notifiedError;
    const notifiedIds = new Set(
      (notified || [])
        .map((n) => n.metadata?.appointment_id)
        .filter(Boolean)
    );

    let sent = 0;
    for (const appt of completed) {
      if (reviewedIds.has(appt.id) || notifiedIds.has(appt.id)) continue;
      const result = await sendReviewRequestNotification(appt.id);
      if (result) {
        sent += 1;
        notifiedIds.add(appt.id);
      }
    }
    if (sent > 0) {
      console.log(`[ReviewRequestSweep] Sent ${sent} review request(s).`);
    }
    return sent;
  } catch (error) {
    console.error('[ReviewRequestSweep] Failed:', error.message);
    return 0;
  }
};

/**
 * Marks past-due appointments as MISSED and notifies each patient.
 *
 * Two rules (both idempotent — only PENDING/CONFIRMED rows ever match):
 *   1. Next-day midnight: appointment_date is before TODAY (catch-all).
 *   2. Slot-end: appointment_date is TODAY and the linked
 *      doctor_schedules.end_time has passed (with MISSED_GRACE_MINUTES buffer
 *      so a slightly overrunning session is not marked prematurely).
 * Never touches CANCELLED/COMPLETED/MISSED — and nothing here ever writes
 * CANCELLED; MISSED is the terminal no-show state.
 *
 * Each pass:
 *   1. Selects those rows (joined with patient user_id + doctor/schedule
 *      labels for the notification message).
 *   2. Batch-updates them to status='MISSED' with a fresh updated_at so
 *      they surface in Recent Activity with a "Missed" badge and in the
 *      admin Queue Management slot queue.
 *   3. Sends one APPOINTMENT_MISSED in-app notification per patient.
 *
 * @returns {Promise<number>} Number of appointments marked MISSED
 */
export const markMissedAppointments = async () => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;

  // Local HH:MM of "now minus grace" — compared as strings against TIME cols.
  const MISSED_GRACE_MINUTES = 15;
  const graceDate = new Date(today.getTime() - MISSED_GRACE_MINUTES * 60 * 1000);
  const graceTimeStr = `${String(graceDate.getHours()).padStart(2, '0')}:${String(
    graceDate.getMinutes()
  ).padStart(2, '0')}`;

  const { data: active, error: fetchError } = await supabase
    .from('appointments')
    .select(
      `
      id,
      appointment_date,
      patient_profiles ( user_id, first_name, last_name ),
      doctor_profiles ( first_name, last_name ),
      doctor_schedules ( start_time, end_time )
    `
    )
    .in('status', ['PENDING', 'CONFIRMED']);

  if (fetchError) throw fetchError;
  if (!active || active.length === 0) return 0;

  // Split into overdue (past dates) + slot-ended (today, end_time + grace passed).
  const overdue = active.filter((a) => {
    if (!a.appointment_date) return false;
    if (a.appointment_date < todayStr) return true;
    if (a.appointment_date > todayStr) return false;
    const endTime = a.doctor_schedules?.end_time;
    if (!endTime) return false; // no slot info — leave for the midnight rule
    return endTime <= graceTimeStr;
  });

  if (overdue.length === 0) return 0;

  const ids = overdue.map((a) => a.id);
  const { error: updateError } = await supabase
    .from('appointments')
    .update({ status: 'MISSED', updated_at: new Date().toISOString() })
    .in('id', ids)
    .in('status', ['PENDING', 'CONFIRMED']);

  if (updateError) throw updateError;

  const formatTimeLabel = (t) => {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return t;
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m).padStart(2, '0')} ${period}`;
  };

  let marked = 0;
  for (const appt of overdue) {
    marked += 1;
    try {
      const userId = appt.patient_profiles?.user_id;
      if (!userId) continue;
      const doctorName =
        `Dr. ${appt.doctor_profiles?.first_name || ''} ${appt.doctor_profiles?.last_name || ''}`.trim() ||
        'your doctor';
      const timeLabel = formatTimeLabel(appt.doctor_schedules?.start_time);
      await createNotification({
        user_id: userId,
        type: 'APPOINTMENT_MISSED',
        title: 'You missed your appointment',
        message: `You missed your appointment with ${doctorName} on ${appt.appointment_date}${timeLabel ? ` at ${timeLabel}` : ''}. Please book a new visit.`,
        action_link: '/patient/appointments',
        metadata: {
          appointment_id: appt.id,
          appointment_date: appt.appointment_date,
        },
      });
    } catch (notifError) {
      console.error(`[MissedSweep] Notification failed for appointment ${appt.id}:`, notifError.message);
    }
  }

  if (marked > 0) {
    console.log(`[MissedSweep] Marked ${marked} appointment(s) as MISSED.`);
  }
  return marked;
};
