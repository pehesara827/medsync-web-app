// src/components/api/adminScanApi.js
// Thin client for the Admin "Scan QR" backend endpoint.
// Uses the same base-URL convention as the other Admin pages.
import { getAuthHeaders } from '../../../supabaseClient';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

/**
 * GET /api/admin/scan/:appointmentId
 * Resolves a QR-scanned appointment into the full detail card consumed by the
 * Admin "Scan QR" page (patient photo/name/dob/age, self-or-beneficiary,
 * schedule date/time, doctor name+specialty, status and derived queue number).
 * @param {string} appointmentId - The appointment UUID embedded in the QR.
 * @returns {Promise<Object>} The resolved appointment detail object. Note that
 *   `payment.status` is read from the `payments` table (the single source of
 *   truth), so it can also be 'PENDING_SLIP_VERIFICATION'.
 */
export const fetchScannedAppointment = async (appointmentId) => {
  const res = await fetch(`${API_BASE_URL}/admin/scan/${appointmentId}`, {
    headers: await getAuthHeaders(),
  });
  if (!res.ok) {
    let message = `Failed to load appointment (HTTP ${res.status})`;
    try {
      const json = await res.json();
      if (json?.message) message = json.message;
    } catch {
      /* ignore non-JSON error bodies */
    }
    throw new Error(message);
  }
  const json = await res.json();
  return json.data.appointment;
};

/**
 * POST /api/admin/scan/:appointmentId/confirm
 * Confirms the scanned appointment at the reception desk. The linked `payments`
 * row is the single source of truth, so it is updated first and its status is
 * what the response reports:
 *   - payments.payment_status     -> 'PAID' (+ paid_at)
 *   - appointments.status         -> 'COMPLETED'
 *   - appointments.payment_status -> 'PAID'  (legacy mirror, kept in sync)
 * @param {string} appointmentId - The appointment UUID embedded in the QR.
 * @param {Object} [options]
 * @param {boolean} [options.verifiedSlip=false] - Must be `true` when the linked
 *   bank slip is still PENDING_SLIP_VERIFICATION, otherwise the API rejects the
 *   request with `code: 'SLIP_NOT_VERIFIED'`.
 * @returns {Promise<Object>} { id, status, payment_status, payment_method,
 *   payment_amount, alreadyCompleted }
 */
export const confirmScannedAppointment = async (
  appointmentId,
  { verifiedSlip = false } = {}
) => {
  const res = await fetch(`${API_BASE_URL}/admin/scan/${appointmentId}/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(await getAuthHeaders()),
    },
    body: JSON.stringify({ verifiedSlip }),
  });
  if (!res.ok) {
    let message = `Failed to confirm appointment (HTTP ${res.status})`;
    let code = null;
    try {
      const json = await res.json();
      if (json?.message) message = json.message;
      if (json?.code) code = json.code;
    } catch {
      /* ignore non-JSON error bodies */
    }
    const error = new Error(message);
    if (code) error.code = code;
    throw error;
  }
  const json = await res.json();
  return json.data.appointment;
};