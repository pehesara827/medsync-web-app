// src/components/api/adminScheduleApi.js
// Thin client for the Admin Schedule Management backend endpoints.
// Uses the same base-URL convention as the other Admin pages
// (native fetch + VITE_API_BASE_URL).
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

/**
 * GET /api/admin/schedules/all
 * Returns ALL doctor schedules (with capacity ratio & delay status).
 * @returns {Promise<Array>} The schedule list rows.
 */
export const fetchAdminSchedules = async () => {
  const res = await fetch(`${API_BASE_URL}/admin/schedules/all`);
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