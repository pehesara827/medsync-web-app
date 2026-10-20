// src/components/api/adminScheduleApi.js
// Thin client for the Admin Schedule Management backend endpoints.
// Uses the same base-URL convention as the other Admin pages
// (native fetch + VITE_API_BASE_URL).
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

/**
 * GET /api/admin/schedules/all
 * Returns today + upcoming doctor schedules (past days excluded by default;
 * pass ?include_past=true to fetch everything).
 * @param {Object} [options] - e.g. { includePast: true }
 * @returns {Promise<Array>} The schedule list rows.
 */
export const fetchAdminSchedules = async (options = {}) => {
  const params = new URLSearchParams();
  if (options.includePast) params.set('include_past', 'true');
  if (options.doctorId) params.set('doctor_id', options.doctorId);
  if (options.date) params.set('date', options.date);
  const qs = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${API_BASE_URL}/admin/schedules/all${qs}`);
  if (!res.ok) {
    throw new Error(`Failed to load schedules (HTTP ${res.status})`);
  }
  const json = await res.json();
  return json.data.schedules;
};

/**
 * POST /api/admin/schedules
 * Creates a new schedule slot for a doctor.
 * @param {Object} payload { doctor_id, available_date, start_time, end_time, consultation_fee, max_patients }
 * @returns {Promise<{success: boolean, message?: string, data?: Object}>}
 */
export const createSchedule = async (payload) => {
  const res = await fetch(`${API_BASE_URL}/admin/schedules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.message || `Failed to create schedule (HTTP ${res.status})`);
  }
  return json;
};

/**
 * GET /api/admin/doctors
 * Returns approved doctors for the "Add Schedule" dropdown.
 * @returns {Promise<Array>} Array of { id, name, specialty }.
 */
export const fetchAdminDoctors = async () => {
  const res = await fetch(`${API_BASE_URL}/admin/doctors`);
  if (!res.ok) {
    throw new Error(`Failed to load doctors (HTTP ${res.status})`);
  }
  const json = await res.json();
  return json.doctors;
};

/**
 * DELETE /api/admin/schedules/:scheduleId
 * Permanently deletes a schedule slot (cascades linked appointments /
 * payments / waitlists).
 * @param {string} scheduleId
 * @returns {Promise<{success: boolean, message?: string, data?: Object}>}
 */
export const deleteSchedule = async (scheduleId) => {
  const res = await fetch(`${API_BASE_URL}/admin/schedules/${scheduleId}`, {
    method: 'DELETE',
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.message || `Failed to delete schedule (HTTP ${res.status})`);
  }
  return json;
};

/**
 * POST /api/admin/schedules/:scheduleId/broadcast-delay
 * Persists the delay on doctor_schedules and notifies booked patients + doctor.
 * @param {string} scheduleId
 * @param {number} minutes - non-negative integer (0 clears the delay)
 * @returns {Promise<{success: boolean, data: { schedule, notifiedUsers, notifiedCount, notifiedDoctor }}>}
 */
export const broadcastSessionDelay = async (scheduleId, minutes) => {
  const res = await fetch(`${API_BASE_URL}/admin/schedules/${scheduleId}/broadcast-delay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ minutes }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.message || `Failed to broadcast delay (HTTP ${res.status})`);
  }
  return json;
};