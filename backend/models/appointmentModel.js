import { supabase } from '../supabase.js';
import QRCode from 'qrcode';
import {
  generateVerificationCode,
  generateQRPayload,
} from '../utils/qrUtils.js';
import { notifyNextPatient } from './waitlistModel.js';

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
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert([
        {
          appointment_id: appointment.id,
          amount: bookingData.amount || 0,
          payment_method: bookingData.payment_method || 'PAY_AT_RECEPTION',
          payment_status: 'UNPAID',
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
 * Includes both SELF and BENEFICIARY bookings.
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
    .neq('status', 'CANCELLED')
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

  // Prevent cancelling an already-cancelled appointment
  if (appointment.status === 'CANCELLED') {
    const err = new Error('Appointment is already cancelled.');
    err.code = 'ALREADY_CANCELLED';
    throw err;
  }

  // Update appointment status to CANCELLED
  const { data: updatedAppt, error: cancelError } = await supabase
    .from('appointments')
    .update({ status: 'CANCELLED' })
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
