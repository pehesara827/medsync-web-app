import { supabase } from '../supabase.js';
import QRCode from 'qrcode';
import {
  generateVerificationCode,
  generateQRPayload,
} from '../utils/qrUtils.js';

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

    // Step 2: Mark the doctor schedule slot as booked
    const { error: scheduleError } = await supabase
      .from('doctor_schedules')
      .update({ is_booked: true })
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
    .order('updated_at', { ascending: false })
    .order('appointment_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return appointments || [];
};