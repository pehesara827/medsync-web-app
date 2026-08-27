import { useState, useEffect } from 'react';
import {
  X,
  User,
  Calendar,
  Stethoscope,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Plus,
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const GENDERS = ['Male', 'Female', 'Other'];

function formatTime(timeStr) {
  if (!timeStr) return '—';
  const [hours, minutes] = String(timeStr).split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return timeStr;
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${String(minutes).padStart(2, '0')} ${period}`;
}

export default function AddAppointmentModal({ isOpen, onClose, onCreated }) {
  // ── Patient fields (manual entry) ─────────────────────────────────────
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [remarks, setRemarks] = useState('');

  // ── Doctor + scheduling ───────────────────────────────────────────────
  const [doctors, setDoctors] = useState([]);
  const [doctorId, setDoctorId] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);

  // ── UI state ──────────────────────────────────────────────────────────
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  // Load approved doctors when the modal opens
  useEffect(() => {
    if (!isOpen) return;
    setResult(null);
    setError('');
    setLoadingDoctors(true);
    fetch(`${API_BASE_URL}/admin/doctors`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load doctors');
        return res.json();
      })
      .then((data) => setDoctors(data.doctors || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoadingDoctors(false));
  }, [isOpen]);

  // Load available slots whenever doctor or date changes
  useEffect(() => {
    setSelectedSlot(null);
    setSlots([]);
    if (!doctorId || !appointmentDate) return;
    setLoadingSlots(true);
    fetch(
      `${API_BASE_URL}/admin/schedules?doctor_id=${encodeURIComponent(
        doctorId
      )}&date=${encodeURIComponent(appointmentDate)}`
    )
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load time slots');
        return res.json();
      })
      .then((data) => setSlots((data.slots || []).filter((s) => !s.isFull)))
      .catch((err) => setError(err.message))
      .finally(() => setLoadingSlots(false));
  }, [doctorId, appointmentDate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // A time slot must be chosen from the available options
    if (!selectedSlot) {
      setError('Please select an available time slot.');
      return;
    }

    setSubmitting(true);

    const payload = {
      patient_first_name: firstName,
      patient_last_name: lastName,
      patient_phone: phone || null,
      patient_gender: gender || null,
      patient_date_of_birth: dateOfBirth || null,
      doctor_id: doctorId,
      appointment_date: appointmentDate,
      start_time: selectedSlot.start_time,
      remarks: remarks || null,
    };

    try {
      const res = await fetch(`${API_BASE_URL}/admin/manual-appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || `Failed to add appointment (${res.status})`);
      }
      setResult(data.appointment || data);
      if (onCreated) onCreated(data.appointment || data);
    } catch (err) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDone = () => {
    setResult(null);
    onClose();
  };

// Don't render anything unless the modal is open
  if (!isOpen) return null;

  // ── Success view ──────────────────────────────────────────────────────
  if (result) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleDone} />
        <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-8">
          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Appointment Added
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Walk-in appointment recorded successfully.
            </p>

            <div className="w-full mt-6 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Patient</span>
                <span className="font-medium text-slate-800 dark:text-slate-100">
                  {result.patient_first_name} {result.patient_last_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Doctor</span>
                <span className="font-medium text-slate-800 dark:text-slate-100">
                  {result.doctor_name || '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Date</span>
                <span className="font-medium text-slate-800 dark:text-slate-100">
                  {result.appointment_date}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Time</span>
                <span className="font-medium text-slate-800 dark:text-slate-100">
                  {formatTime(result.start_time)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Status</span>
                <span className="font-medium text-[#00a8cc]">{result.status}</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleDone}
            className="mt-6 w-full px-4 py-2.5 text-sm font-medium rounded-lg bg-[#00a8cc] text-white hover:bg-[#0099bb]"
          >
            Done
          </button>
        </div>
      </div>
    );
  }
// ── Form view ─────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-slate-900 px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              New Appointment
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Manually add a walk-in appointment.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-rose-300 bg-rose-50 dark:bg-slate-800 p-3 text-sm text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Patient details */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3 flex items-center gap-1.5">
              <User className="w-4 h-4" /> Patient Details
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                  First Name <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00a8cc]"
                  placeholder="Patient first name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                  Last Name <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00a8cc]"
                  placeholder="Patient last name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                  Phone
                </label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00a8cc]"
                  placeholder="Contact number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                  Gender
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00a8cc]"
                >
                  <option value="">Select gender</option>
                  {GENDERS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00a8cc]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                  Remarks
                </label>
                <input
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00a8cc]"
                  placeholder="Optional notes"
                />
              </div>
            </div>
          </div>
{/* Doctor & schedule */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3 flex items-center gap-1.5">
              <Stethoscope className="w-4 h-4" /> Doctor & Schedule
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                  Doctor <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={doctorId}
                  onChange={(e) => setDoctorId(e.target.value)}
                  disabled={loadingDoctors}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00a8cc] disabled:opacity-60"
                >
                  <option value="">
                    {loadingDoctors ? 'Loading doctors…' : 'Select a doctor'}
                  </option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} — {d.specialty}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                  Appointment Date <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  type="date"
                  value={appointmentDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00a8cc]"
                />
              </div>
            </div>

            {/* Available time slots */}
            {doctorId && appointmentDate && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" /> Time Slot <span className="text-rose-500">*</span>
                </label>
                {loadingSlots ? (
                  <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading slots…
                  </div>
                ) : slots.length === 0 ? (
                  <p className="text-sm text-slate-400 dark:text-slate-500">
                    No available time slots for this doctor and date.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {slots.map((slot) => (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                          selectedSlot?.id === slot.id
                            ? 'bg-[#00a8cc] text-white shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600'
                        }`}
                      >
                        {formatTime(slot.start_time)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
{/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-5 py-2.5 text-sm font-medium rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg bg-[#00a8cc] text-white hover:bg-[#0099bb] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving…
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" /> Add Appointment
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}