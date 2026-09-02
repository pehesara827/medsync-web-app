// src/components/api/adminScanApi.js
// Thin client for the Admin "Scan QR" backend endpoint.
// Uses the same base-URL convention as the other Admin pages.
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

/**
 * GET /api/admin/scan/:appointmentId
 * Resolves a QR-scanned appointment into the full detail card consumed by the
 * Admin "Scan QR" page (patient photo/name/dob/age, self-or-beneficiary,
 * schedule date/time, doctor name+specialty, status and derived queue number).
 * @param {string} appointmentId - The appointment UUID embedded in the QR.
 * @returns {Promise<Object>} The resolved appointment detail object.
 */
export const fetchScannedAppointment = async (appointmentId) => {
  const res = await fetch(`${API_BASE_URL}/admin/scan/${appointmentId}`);
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
 * Confirms the scanned appointment at the reception desk:
 *   - appointments.status         -> 'COMPLETED'
 *   - appointments.payment_status -> 'PAID'
 *   - linked payments row         -> 'PAID' (+ paid_at)
 * @param {string} appointmentId - The appointment UUID embedded in the QR.
 * @returns {Promise<Object>} { id, status, payment_status }
 */
export const confirmScannedAppointment = async (appointmentId) => {
  const res = await fetch(`${API_BASE_URL}/admin/scan/${appointmentId}/confirm`, {
    method: 'POST',
  });
  if (!res.ok) {
    let message = `Failed to confirm appointment (HTTP ${res.status})`;
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