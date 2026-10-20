// src/components/api/adminQueueApi.js
// Thin client for the Admin Queue Management backend endpoints.
// Uses the same base-URL convention as the other Admin pages
// (native fetch + VITE_API_BASE_URL).
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

/**
 * GET /api/admin/queue/today
 * @returns {Promise<Array>} Today's schedule session headers.
 */
export const fetchTodayQueues = async () => {
  const res = await fetch(`${API_BASE_URL}/admin/queue/today`);
  if (!res.ok) {
    throw new Error(`Failed to load today's queues (HTTP ${res.status})`);
  }
  const json = await res.json();
  return json.data.sessions;
};

/**
 * GET /api/admin/queue/:scheduleId
 * @param {string} scheduleId
 * @returns {Promise<Object>} The full session payload (doctor, slot, queue).
 */
export const fetchQueueSession = async (scheduleId) => {
  const res = await fetch(`${API_BASE_URL}/admin/queue/${scheduleId}`);
  if (!res.ok) {
    throw new Error(`Failed to load session (HTTP ${res.status})`);
  }
  const json = await res.json();
  return json.data.session;
};

/**
 * PATCH /api/admin/queue/:appointmentId/complete
 * Marks a queue entry as COMPLETED.
 * @param {string} appointmentId
 * @returns {Promise<{appointmentId: string, status: string}>}
 */
export const markAppointmentCompleted = async (appointmentId) => {
  const res = await fetch(
    `${API_BASE_URL}/admin/queue/${appointmentId}/complete`,
    { method: 'PATCH', headers: { 'Content-Type': 'application/json' } },
  );
  if (!res.ok) {
    throw new Error(`Failed to mark completed (HTTP ${res.status})`);
  }
  const json = await res.json();
  return json.data;
};
