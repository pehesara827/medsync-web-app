// src/components/api/adminPatientApi.js
// Thin client for the Admin "Patients Management" backend endpoints.
// Uses the same base-URL convention as the other Admin pages
// (native fetch + VITE_API_BASE_URL).
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

/**
 * GET /api/admin/patients?status=&date=
 * Lists ALL patients registered in the system (account owners + family
 * beneficiaries), each enriched with their most recent matching appointment
 * (lastVisit + status). Patients who never booked are included under
 * "All statuses" with no date filter.
 * @param {Object} [filters]
 * @param {string} [filters.status] - '' | PENDING | COMPLETED | CANCELLED.
 * @param {string} [filters.date] - Exact appointment date (YYYY-MM-DD).
 * @returns {Promise<{patients: Array<Object>, total: number}>}
 */
export const fetchAdminPatients = async ({ status, date } = {}) => {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (date) params.set('date', date);

  const res = await fetch(
    `${API_BASE_URL}/admin/patients?${params.toString()}`,
  );
  if (!res.ok) {
    let message = `Failed to load patients (HTTP ${res.status})`;
    try {
      const json = await res.json();
      if (json?.message) message = json.message;
    } catch {
      /* ignore non-JSON error bodies */
    }
    throw new Error(message);
  }
  const json = await res.json();
  return { patients: json.patients || [], total: json.total ?? 0 };
};

/**
 * GET /api/admin/patients/:id
 * Full detail for a single patient (profile, beneficiaries, appointment
 * history) for the slide-in panel. `id` may be either a patient_profiles UUID
 * or a beneficiaries UUID.
 * @param {string} id
 * @returns {Promise<Object|null>} The patient detail, or null when not found.
 */
export const fetchAdminPatientById = async (id) => {
  const res = await fetch(`${API_BASE_URL}/admin/patients/${id}`);
  if (!res.ok) {
    let message = `Failed to load patient detail (HTTP ${res.status})`;
    try {
      const json = await res.json();
      if (json?.message) message = json.message;
    } catch {
      /* ignore non-JSON error bodies */
    }
    throw new Error(message);
  }
  const json = await res.json();
  return json.patient || null;
};