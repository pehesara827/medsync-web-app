import { supabase } from '../supabase.js';
import { createAppointment } from './appointmentModel.js';
import { createNotification } from './notificationModel.js';

/**
 * Creates a new waitlist entry for a patient when a schedule slot is at full capacity.
 * Implements FIFO by using created_at ordering.
 *
 * @param {Object} data - Waitlist data
 * @param {string} data.patient_id - UUID of the patient
 * @param {string} data.doctor_id - UUID of the doctor
 * @param {string} data.schedule_id - UUID of the doctor schedule
 * @param {string} data.booking_type - 'SELF' or 'BENEFICIARY'
 * @param {string|null} data.beneficiary_id - UUID of beneficiary
 * @returns {Promise<Object>} Created waitlist entry
 */
export const joinWaitlist = async (data) => {
  try {
    // Validate schedule is at full capacity
    const { data: schedule, error: scheduleError } = await supabase
      .from('doctor_schedules')
      .select('doctor_id, max_patients, current_appointment, is_booked')
      .eq('id', data.schedule_id)
      .single();

    if (scheduleError) throw scheduleError;

    const maxPatients = schedule.max_patients ?? 1;
    const currentCount = schedule.current_appointment ?? 0;
    const isFull = currentCount >= maxPatients || schedule.is_booked;

    if (!isFull) {
      const err = new Error('This slot is still available. You can book it directly.');
      err.code = 'SLOT_AVAILABLE';
      throw err;
    }

    // Check for duplicate active waitlist entry (WAITING or NOTIFIED)
    const { data: existing, error: dupError } = await supabase
      .from('appointment_waitlists')
      .select('id, status')
      .eq('patient_id', data.patient_id)
      .eq('schedule_id', data.schedule_id)
      .in('status', ['WAITING', 'NOTIFIED'])
      .maybeSingle();

    if (dupError) throw dupError;

    if (existing) {
      const err = new Error('You are already on the waitlist for this slot.');
      err.code = 'ALREADY_ON_WAITLIST';
      throw err;
    }

    // Insert waitlist entry (FIFO is determined by created_at ordering)
    const { data: waitlistEntry, error: insertError } = await supabase
      .from('appointment_waitlists')
      .insert([
        {
          patient_id: data.patient_id,
          doctor_id: data.doctor_id || schedule.doctor_id,
          schedule_id: data.schedule_id,
          booking_type: data.booking_type || 'SELF',
          beneficiary_id: data.beneficiary_id || null,
          status: 'WAITING',
        },
      ])
      .select()
      .single();

    if (insertError) throw insertError;

    // Fetch full entry with related data
    return await getWaitlistEntryById(waitlistEntry.id);
  } catch (error) {
    throw error;
  }
};

/**
 * Retrieves a single waitlist entry by ID with related data.
 *
 * @param {string} waitlistId - UUID of the waitlist entry
 * @returns {Promise<Object>} Complete waitlist entry with related data
 */
export const getWaitlistEntryById = async (waitlistId) => {
  const { data, error } = await supabase
    .from('appointment_waitlists')
    .select(
      `
      *,
      patient_profiles (
        id,
        user_id,
        first_name,
        last_name,
        phone_number
      ),
      doctor_profiles (
        id,
        first_name,
        last_name,
        specialization,
        specialties (
          id,
          name
        )
      ),
      doctor_schedules (
        id,
        available_date,
        start_time,
        end_time,
        consultation_fee,
        is_booked,
        max_patients,
        current_appointment
      ),
      beneficiaries (
        id,
        full_name,
        relationship
      )
    `
    )
    .eq('id', waitlistId)
    .single();

  if (error) throw error;
  return data;
};

/**
 * Retrieves all waitlist entries for a specific patient.
 *
 * @param {string} patientId - UUID of the patient profile
 * @returns {Promise<Array>} Array of waitlist entries
 */
export const getWaitlistByPatient = async (patientId) => {
  const { data, error } = await supabase
    .from('appointment_waitlists')
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
        end_time,
        consultation_fee
      )
    `
    )
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

/**
 * Retrieves all waitlist entries for a doctor's schedules.
 *
 * @param {string} doctorId - UUID of the doctor profile
 * @returns {Promise<Array>} Array of waitlist entries
 */
export const getWaitlistByDoctor = async (doctorId) => {
  const { data, error } = await supabase
    .from('appointment_waitlists')
    .select(
      `
      *,
      patient_profiles (
        id,
        first_name,
        last_name,
        phone_number,
        home_address
      ),
      doctor_schedules (
        id,
        available_date,
        start_time,
        end_time,
        consultation_fee
      ),
      beneficiaries (
        id,
        full_name,
        relationship
      )
    `
    )
    .eq('doctor_id', doctorId)
    .order('schedule_id')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
};

/**
 * Finds the next WAITING patient in the FIFO queue for a schedule.
 *
 * @param {string} scheduleId - UUID of the doctor schedule
 * @returns {Promise<Object|null>} The next waitlisted patient or null
 */
export const getNextInQueue = async (scheduleId) => {
  const { data, error } = await supabase
    .from('appointment_waitlists')
    .select(
      `
      *,
      patient_profiles (
        id,
        user_id,
        first_name,
        last_name,
        phone_number
      ),
      doctor_profiles (
        id,
        user_id,
        first_name,
        last_name
      ),
      doctor_schedules (
        id,
        available_date,
        start_time,
        end_time
      )
    `
    )
    .eq('schedule_id', scheduleId)
    .eq('status', 'WAITING')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
};

/**
 * Notifies the next WAITING patient for a schedule.
 * Sets status to NOTIFIED, records notified_at, and sets a 2-hour claim window.
 *
 * @param {string} scheduleId - UUID of the doctor schedule
 * @returns {Promise<Object|null>} The notified waitlist entry or null if queue is empty
 */
export const notifyNextPatient = async (scheduleId) => {
  try {
    // Check if the schedule has capacity (slot is open)
    const { data: schedule, error: scheduleError } = await supabase
      .from('doctor_schedules')
      .select('current_appointment, max_patients, is_booked')
      .eq('id', scheduleId)
      .single();

    if (scheduleError) throw scheduleError;

    // Only notify if there's available capacity
    const maxPatients = schedule.max_patients ?? 1;
    const currentCount = schedule.current_appointment ?? 0;
    if (currentCount >= maxPatients && !schedule.is_booked) {
      return null;
    }

    // Check if there's already a NOTIFIED patient for this schedule
    // (prevents double-notifying while someone still has an active claim window)
    const { data: existingNotified, error: notifiedError } = await supabase
      .from('appointment_waitlists')
      .select('id')
      .eq('schedule_id', scheduleId)
      .eq('status', 'NOTIFIED')
      .maybeSingle();

    if (notifiedError) throw notifiedError;
    if (existingNotified) return null;

    // Find the next WAITING patient (FIFO)
    const nextPatient = await getNextInQueue(scheduleId);
    if (!nextPatient) return null;

    const claimWindowMs = 2 * 60 * 60 * 1000; // 2 hours
    const now = new Date();
    const expiresAt = new Date(now.getTime() + claimWindowMs);

    // Set status to NOTIFIED with claim window
    const { data: updated, error: updateError } = await supabase
      .from('appointment_waitlists')
      .update({
        status: 'NOTIFIED',
        notified_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('id', nextPatient.id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Create an in-app notification for the patient (slot available / waitlist offer)
    try {
      const patientUserId = nextPatient.patient_profiles?.user_id;

      if (patientUserId) {
        await createNotification({
          user_id: patientUserId, // The user ID of the waitlisted patient
          type: 'WAITLIST_OFFER', // Validated enum type
          title: 'A slot has opened up!',
          message: 'A slot in your waitlisted schedule is now available. You have 2 hours to confirm your appointment.',
          action_link: `/patient/appointments?claim=${updated.id}`, // Deep link to open the pre-filled appointment form
          metadata: {
            schedule_id: scheduleId,
            waitlist_id: updated.id,
          },
        });
      }
    } catch (notifError) {
      console.error('[Waitlist] Failed to create slot-available notification:', notifError.message);
    }

    console.log(
      `[Waitlist] Notified patient ${updated.patient_id} for schedule ${scheduleId}. Claim window expires at ${expiresAt.toISOString()}`
    );

    return updated;
  } catch (error) {
    throw error;
  }
};

/**
 * Accepts a waitlist offer by creating an appointment and converting the entry.
 *
 * @param {string} waitlistId - UUID of the waitlist entry
 * @param {Object} paymentData - Payment info (amount, payment_method)
 * @returns {Promise<Object>} The converted waitlist entry and new appointment
 */
export const acceptWaitlistOffer = async (waitlistId, paymentData = {}) => {
  try {
    // Fetch the waitlist entry
    const waitlistEntry = await getWaitlistEntryById(waitlistId);

    if (!waitlistEntry) {
      const err = new Error('Waitlist entry not found.');
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (waitlistEntry.status !== 'NOTIFIED') {
      const err = new Error(
        waitlistEntry.status === 'CONVERTED'
          ? 'This offer has already been accepted.'
          : waitlistEntry.status === 'EXPIRED'
          ? 'This offer has expired. Please rejoin the waitlist.'
          : waitlistEntry.status === 'SKIPPED'
          ? 'This offer has been skipped.'
          : 'This offer is not active. Please wait for a new notification.'
      );
      err.code = 'INVALID_STATUS';
      throw err;
    }

    // Check if claim window has expired
    if (waitlistEntry.expires_at && new Date(waitlistEntry.expires_at) < new Date()) {
      // Mark as EXPIRED and cascade to next
      await declineWaitlistOffer(waitlistId, 'EXPIRED');

      const err = new Error('Your claim window has expired. The offer has been passed to the next patient.');
      err.code = 'OFFER_EXPIRED';
      throw err;
    }

    // Check schedule capacity before converting
    const { data: schedule, error: scheduleError } = await supabase
      .from('doctor_schedules')
      .select('max_patients, current_appointment, is_booked, consultation_fee')
      .eq('id', waitlistEntry.schedule_id)
      .single();

    if (scheduleError) throw scheduleError;

    const maxPatients = schedule.max_patients ?? 1;
    const currentCount = schedule.current_appointment ?? 0;

    if (currentCount >= maxPatients) {
      const err = new Error('This slot is no longer available.');
      err.code = 'SLOT_FULL';
      throw err;
    }

    // Create the appointment
    const appointment = await createAppointment({
      patient_id: waitlistEntry.patient_id,
      booking_type: waitlistEntry.booking_type || 'SELF',
      beneficiary_id: waitlistEntry.beneficiary_id || null,
      doctor_id: waitlistEntry.doctor_id,
      schedule_id: waitlistEntry.schedule_id,
      appointment_date: waitlistEntry.doctor_schedules?.available_date,
      amount: paymentData.amount ?? schedule.consultation_fee ?? 0,
      payment_method: paymentData.payment_method || 'PAY_AT_RECEPTION',
      receipt_slip_url: paymentData.receipt_slip_url || null,
    });

    // Update waitlist entry to CONVERTED
    const { data: converted, error: updateError } = await supabase
      .from('appointment_waitlists')
      .update({
        status: 'CONVERTED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', waitlistId)
      .select()
      .single();

    if (updateError) throw updateError;

    console.log(`[Waitlist] Patient ${waitlistEntry.patient_id} accepted offer, converted to appointment ${appointment.id}`);

    return {
      waitlist: converted,
      appointment,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Declines a waitlist offer (SKIPPED or EXPIRED) and cascades to the next patient.
 *
 * For EXPIRED offers (patient failed to respond within the 2-hour window):
 *   - Sends a WAITLIST_EXPIRED notification to the patient informing them they
 *     missed their chance
 *   - Deletes the waitlist entry from the table
 *
 * For SKIPPED offers (patient explicitly declined):
 *   - Marks the entry as SKIPPED (keeps the record)
 *
 * @param {string} waitlistId - UUID of the waitlist entry
 * @param {string} status - 'SKIPPED' (patient declined) or 'EXPIRED' (timer ran out)
 * @returns {Promise<Object>} The updated or deleted waitlist entry
 */
export const declineWaitlistOffer = async (waitlistId, status = 'SKIPPED') => {
  try {
    // Fetch the waitlist entry with patient user_id (for notification on EXPIRED)
    const { data: waitlistEntry, error: fetchError } = await supabase
      .from('appointment_waitlists')
      .select(`
        id,
        schedule_id,
        status,
        patient_id,
        patient_profiles (
          user_id,
          first_name,
          last_name
        )
      `)
      .eq('id', waitlistId)
      .single();

    if (fetchError) throw fetchError;

    if (waitlistEntry.status !== 'NOTIFIED') {
      const err = new Error('This offer is not currently active.');
      err.code = 'INVALID_STATUS';
      throw err;
    }

    // ── EXPIRED: send "missed your chance" notification + delete from table ──
    if (status === 'EXPIRED') {
      // Send a notification to the patient informing them they missed the offer
      try {
        const patientUserId = waitlistEntry.patient_profiles?.user_id;

        if (patientUserId) {
          await createNotification({
            user_id: patientUserId,
            type: 'WAITLIST_EXPIRED',
            title: 'Missed your chance',
            message: 'You did not respond to the available slot within the 2-hour window. The offer has expired and your waitlist entry has been removed.',
            action_link: '/patient/appointments',
            metadata: {
              schedule_id: waitlistEntry.schedule_id,
              waitlist_id: waitlistId,
            },
          });
        }
      } catch (notifError) {
        console.error('[Waitlist] Failed to send expiry notification:', notifError.message);
      }

      // Delete the waitlist entry from the table (as requested)
      const { error: deleteError } = await supabase
        .from('appointment_waitlists')
        .delete()
        .eq('id', waitlistId);

      if (deleteError) throw deleteError;

      console.log(`[Waitlist] Entry ${waitlistId} expired and removed from table. Sending "missed your chance" notification. Cascading to next patient for schedule ${waitlistEntry.schedule_id}`);

      // Cascade to the next patient in the queue
      await notifyNextPatient(waitlistEntry.schedule_id);

      return {
        id: waitlistId,
        status: 'EXPIRED',
        deleted: true,
        schedule_id: waitlistEntry.schedule_id,
        patient_id: waitlistEntry.patient_id,
      };
    }

    // ── SKIPPED: mark as SKIPPED (keep the record) ──
    const { data: updated, error: updateError } = await supabase
      .from('appointment_waitlists')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', waitlistId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Cascade to the next patient in the queue
    console.log(`[Waitlist] Entry ${waitlistId} ${status}. Cascading to next patient for schedule ${waitlistEntry.schedule_id}`);
    await notifyNextPatient(waitlistEntry.schedule_id);

    return updated;
  } catch (error) {
    throw error;
  }
};

/**
 * Expires all NOTIFIED waitlist entries whose claim window has passed.
 * Sends a "missed your chance" notification to each, deletes the entry,
 * and cascades to the next patient in the FIFO queue.
 *
 * Each entry is processed independently — a failure on one entry is logged
 * but does not abort the batch (graceful degradation).
 *
 * @returns {Promise<number>} Number of expired entries
 */
export const expireExpiredOffers = async () => {
  try {
    const now = new Date();

    const { data: expiredEntries, error } = await supabase
      .from('appointment_waitlists')
      .select('id, schedule_id')
      .eq('status', 'NOTIFIED')
      .lt('expires_at', now.toISOString());

    if (error) throw error;

    let expiredCount = 0;

    for (const entry of expiredEntries || []) {
      try {
        await declineWaitlistOffer(entry.id, 'EXPIRED');
        expiredCount++;
      } catch (err) {
        // One failure shouldn't abort the whole batch — log and continue
        console.error(`[Waitlist] Failed to expire entry ${entry.id}:`, err.message);
      }
    }

    if (expiredCount > 0) {
      console.log(`[Waitlist] Expired ${expiredCount} offer(s) with lapsed claim windows.`);
    }

    return expiredCount;
  } catch (error) {
    throw error;
  }
};

/**
 * Removes a patient from the waitlist (explicit cancellation).
 *
 * @param {string} waitlistId - UUID of the waitlist entry
 * @param {string} patientId - UUID of the patient (for authorization)
 * @returns {Promise<Object>} The cancelled waitlist entry
 */
export const cancelWaitlistEntry = async (waitlistId, patientId) => {
  try {
    const { data: entry, error: fetchError } = await supabase
      .from('appointment_waitlists')
      .select('id, patient_id, status')
      .eq('id', waitlistId)
      .single();

    if (fetchError) throw fetchError;

    if (entry.patient_id !== patientId) {
      const err = new Error('You can only cancel your own waitlist entries.');
      err.code = 'FORBIDDEN';
      throw err;
    }

    if (entry.status === 'CONVERTED' || entry.status === 'EXPIRED' || entry.status === 'SKIPPED') {
      const err = new Error(`Waitlist entry is already ${entry.status.toLowerCase()}.`);
      err.code = 'INVALID_STATUS';
      throw err;
    }

    const { data: cancelled, error: updateError } = await supabase
      .from('appointment_waitlists')
      .update({
        status: 'CANCELLED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', waitlistId)
      .select()
      .single();

    if (updateError) throw updateError;

    // If a NOTIFIED entry was cancelled, cascade to next patient
    if (entry.status === 'NOTIFIED') {
      await notifyNextPatient(entry.schedule_id);
    }

    return cancelled;
  } catch (error) {
    throw error;
  }
};
