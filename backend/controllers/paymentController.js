// backend/controllers/paymentController.js
//
// Admin endpoints for viewing and reconciling payments, including bank slip
// verification and pay-at-reception collection.
//
// Response standard:
//   success -> { success: true, data: ... }
//   error   -> { success: false, message: '...' } with a 400 / 404 / 500 code
import { supabase } from '../config/supabaseClient.js';
import { createNotification } from '../models/notificationModel.js';

const VALID_VERIFY_STATUSES = ['APPROVED', 'REJECTED'];

/**
 * Validates whether a value is a well-formed UUID.
 */
const isValidUuid = (value) => {
  if (typeof value !== 'string') return false;
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
};

/**
 * GET /api/admin/payments
 * Returns payments with pagination and status filtering. Joins the linked
 * appointment, the patient's name/phone, the doctor's name, and the schedule
 * date/time so the admin table can render a full row without extra requests.
 *
 * Query params:
 *   page      (default 1)
 *   pageSize  (default 10, max 50)
 *   status    ALL | PENDING_SLIP_VERIFICATION | PAID | UNPAID (default ALL)
 */
export const getAdminPayments = async (req, res, next) => {
  try {
    const rawPage = Number.parseInt(String(req.query.page ?? '1'), 10);
    const rawPageSize = Number.parseInt(String(req.query.pageSize ?? '10'), 10);
    const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
    const pageSize =
      Number.isFinite(rawPageSize) && rawPageSize > 0
        ? Math.min(rawPageSize, 50)
        : 10;

    const status = String(req.query.status ?? 'ALL').toUpperCase();

    if (status !== 'ALL') {
      const allowed = ['PENDING_SLIP_VERIFICATION', 'PAID', 'UNPAID'];
      if (!allowed.includes(status)) {
        return res.status(400).json({
          success: false,
          message:
            'status must be one of ALL, PENDING_SLIP_VERIFICATION, PAID, UNPAID.',
        });
      }
    }

    let query = supabase
      .from('payments')
      .select(
        `id,
        appointment_id,
        amount,
        payment_method,
        payment_status,
        transaction_id,
        receipt_slip_url,
        paid_at,
        created_at,
        appointments (
          id,
          booking_type,
          status,
          appointment_date,
          patient_profiles (
            first_name,
            last_name,
            phone_number
          ),
          doctor_profiles (
            first_name,
            last_name
          ),
          doctor_schedules (
            available_date,
            start_time
          )
        )`,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false });

    if (status !== 'ALL') {
      query = query.eq('payment_status', status);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, count, error } = await query.range(from, to);

    if (error) throw error;

    const payments = (data || []).map((p) => {
      const appt = p.appointments || {};
      const patient = appt.patient_profiles || {};
      const doctor = appt.doctor_profiles || {};
      const schedule = appt.doctor_schedules || {};
      return {
        id: p.id,
        appointmentId: p.appointment_id,
        amount: Number(p.amount ?? 0),
        paymentMethod: p.payment_method,
        paymentStatus: p.payment_status,
        transactionId: p.transaction_id,
        receiptSlipUrl: p.receipt_slip_url,
        paidAt: p.paid_at,
        createdAt: p.created_at,
        patientName:
          [patient.first_name, patient.last_name].filter(Boolean).join(' ') ||
          null,
        patientPhone: patient.phone_number || null,
        doctorName:
          [doctor.first_name, doctor.last_name].filter(Boolean).join(' ') ||
          null,
        appointmentDate: appt.appointment_date || schedule.available_date || null,
        appointmentTime: schedule.start_time || null,
      };
    });

    const total = count ?? payments.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    res.json({
      success: true,
      data: { payments, total, page, pageSize, totalPages },
    });
  } catch (error) {
    console.error('Error in getAdminPayments:', error);
    next(error);
  }
};

const fetchPaymentWithAppointment = async (paymentId) => {
  const { data, error } = await supabase
    .from('payments')
    .select(
      `id,
      appointment_id,
      amount,
      payment_method,
      payment_status,
      transaction_id,
      receipt_slip_url,
      appointments (
        id,
        patient_id,
        status,
        patient_profiles ( user_id, first_name, last_name )
      )`
    )
    .eq('id', paymentId)
    .maybeSingle();

  if (error) throw error;
  return data;
};

/**
 * PATCH /api/admin/payments/:id/verify-slip
 * Approves or rejects a pending bank-transfer slip.
 *
 * Body: { status: 'APPROVED' | 'REJECTED', transactionId?, rejectionReason? }
 *
 *   APPROVED:
 *     - payments.payment_status -> 'PAID'
 *     - payments.transaction_id -> transactionId (if provided)
 *     - payments.paid_at        -> NOW()
 *     - appointments.payment_status -> 'PAID' (status stays PENDING)
 *     - notification 'PAYMENT_RECEIVED' to the patient
 *
 *   REJECTED:
 *     - payments.payment_status -> 'UNPAID'
 *     - notification 'GENERAL' to the patient (rejection + re-upload request)
 */
export const verifyPaymentSlip = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      return res
        .status(400)
        .json({ success: false, message: 'id must be a valid UUID.' });
    }

    const { status, transactionId, rejectionReason } = req.body || {};

    if (!VALID_VERIFY_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "status must be either 'APPROVED' or 'REJECTED'.",
      });
    }

    const payment = await fetchPaymentWithAppointment(id);

    if (!payment) {
      return res
        .status(404)
        .json({ success: false, message: 'Payment not found.' });
    }

    const appointment = payment.appointments || {};
    const patient = appointment.patient_profiles || {};

    if (status === 'APPROVED') {
      // Mark the payment as paid and record when + (optional) transaction ref.
      const updatePayload = {
        payment_status: 'PAID',
        paid_at: new Date().toISOString(),
      };
      if (transactionId !== undefined && transactionId !== null) {
        updatePayload.transaction_id = String(transactionId).trim();
      }

      const { data: updated, error: updateError } = await supabase
        .from('payments')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Sync the appointment's payment status column. Appointment status stays
      // PENDING — it only advances when the desk checks the patient in.
      if (appointment.id) {
        const { error: apptError } = await supabase
          .from('appointments')
          .update({ payment_status: 'PAID' })
          .eq('id', appointment.id);
        if (apptError) throw apptError;
      }

      // Notify the patient that payment was approved.
      if (patient.user_id) {
        await createNotification({
          user_id: patient.user_id,
          type: 'PAYMENT_RECEIVED',
          title: 'Payment approved',
          message: `Your payment of LKR ${Number(
            payment.amount ?? 0
          ).toLocaleString('en-US')} has been verified and approved. Your appointment is confirmed.`,
          action_link: '/patient/appointments',
          metadata: {
            payment_id: payment.id,
            appointment_id: appointment.id,
          },
        });
      }

      return res.json({
        success: true,
        data: { payment: updated },
      });
    }

    // ── REJECTED ──────────────────────────────────────────────────────
    const { data: updated, error: updateError } = await supabase
      .from('payments')
      .update({ payment_status: 'UNPAID' })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    if (patient.user_id) {
      const reason = rejectionReason
        ? String(rejectionReason).trim()
        : 'The bank slip could not be verified.';
      await createNotification({
        user_id: patient.user_id,
        type: 'GENERAL',
        title: 'Payment slip rejected',
        message: `${reason} Please upload a valid receipt through your appointments, or complete payment at the reception.`,
        action_link: '/patient/appointments',
        metadata: {
          payment_id: payment.id,
          appointment_id: appointment.id,
        },
      });
    }

    return res.json({
      success: true,
      data: { payment: updated },
    });
  } catch (error) {
    console.error('Error in verifyPaymentSlip:', error);
    next(error);
  }
};

/**
 * PATCH /api/admin/payments/:id/collect-reception
 * Marks a pay-at-reception payment as collected at the front desk:
 *   - payments.payment_status -> 'PAID', paid_at -> NOW()
 *   - appointments.payment_status -> 'PAID' (status stays PENDING)
 */
export const collectReceptionPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      return res
        .status(400)
        .json({ success: false, message: 'id must be a valid UUID.' });
    }

    const payment = await fetchPaymentWithAppointment(id);

    if (!payment) {
      return res
        .status(404)
        .json({ success: false, message: 'Payment not found.' });
    }

    const appointment = payment.appointments || {};

    const { data: updated, error: updateError } = await supabase
      .from('payments')
      .update({ payment_status: 'PAID', paid_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    if (appointment.id) {
      const { error: apptError } = await supabase
        .from('appointments')
        .update({ payment_status: 'PAID' })
        .eq('id', appointment.id);
      if (apptError) throw apptError;
    }

    res.json({ success: true, data: { payment: updated } });
  } catch (error) {
    console.error('Error in collectReceptionPayment:', error);
    next(error);
  }
};

/**
 * POST /api/payments/simulate
 * Sandbox / simulated online payment gateway confirmation.
 * Marks a linked payment as PAID and syncs the appointment's payment column.
 *
 * Body: { appointmentId, transactionId?, amount? }
 *   - payments.payment_status  -> 'PAID'
 *   - payments.transaction_id  -> transactionId (or a generated TXN-... id)
 *   - payments.paid_at         -> NOW()
 *   - appointments.payment_status -> 'PAID' (status stays PENDING)
 *
 * If the payment is already PAID the request is idempotent and returns the
 * existing record with `alreadyPaid: true`.
 */
export const simulateOnlinePayment = async (req, res, next) => {
  try {
    const { appointmentId, transactionId } = req.body || {};

    if (!isValidUuid(appointmentId)) {
      return res.status(400).json({
        success: false,
        message: 'appointmentId must be a valid UUID.',
      });
    }

    // Fetch the payment linked to the appointment
    const { data: payment, error: fetchError } = await supabase
      .from('payments')
      .select('id, appointment_id, amount, payment_status, transaction_id')
      .eq('appointment_id', appointmentId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'No payment record found for this appointment.',
      });
    }

    if (payment.payment_status === 'PAID') {
      return res.json({ success: true, data: { payment, alreadyPaid: true } });
    }

    // Generate a transaction id if the gateway didn't provide one
    const finalTransactionId =
      transactionId && String(transactionId).trim()
        ? String(transactionId).trim()
        : `TXN-${Date.now().toString(36).toUpperCase()}${Math.random()
            .toString(36)
            .slice(2, 6)
            .toUpperCase()}`;

    const { data: updated, error: updateError } = await supabase
      .from('payments')
      .update({
        payment_status: 'PAID',
        transaction_id: finalTransactionId,
        paid_at: new Date().toISOString(),
      })
      .eq('id', payment.id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Sync the appointment's payment status column (appointment.status stays
    // PENDING — it only advances when the desk checks the patient in).
    const { error: apptError } = await supabase
      .from('appointments')
      .update({ payment_status: 'PAID' })
      .eq('id', appointmentId);

    if (apptError) throw apptError;

    return res.json({ success: true, data: { payment: updated } });
  } catch (error) {
    console.error('Error in simulateOnlinePayment:', error);
    next(error);
  }
};

