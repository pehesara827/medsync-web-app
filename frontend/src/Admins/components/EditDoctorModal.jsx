import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  User,
  Mail,
  Stethoscope,
  BadgeCheck,
  GraduationCap,
  Banknote,
  Image,
  Loader2,
  AlertCircle,
  CheckCircle2,
  UserCog,
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

/**
 * Admin "Edit Doctor Profile" modal.
 *
 * Opens populated with an existing doctor (from the Doctor Management table)
 * and submits an update via PUT /api/admin/doctors/:id. Mirrors the visual and
 * behavioural conventions of AddNewDoctorModal (portal, overlay, success toast
 * that auto-closes, specialties loaded from the API).
 *
 * Props:
 *  - isOpen   : boolean        whether the modal is visible
 *  - doctor   : the doctor row being edited (see mapDoctorForManagement shape)
 *  - onClose  : () => void  closes the modal
 *  - onUpdated: () => void  called after a successful save (refresh list)
 */
export default function EditDoctorModal({ isOpen, doctor, onClose, onUpdated }) {
  // ── Form fields (lazy-initialised from the doctor prop) ─────────────────
  // Remounting the modal via a `key` (see DoctorManagement.jsx) recreates this
  // state fresh on every open, so initialising from `doctor` here is sufficient.
  const [firstName, setFirstName] = useState(doctor?.firstName || '');
  const [lastName, setLastName] = useState(doctor?.lastName || '');
  const [email, setEmail] = useState(doctor?.email || '');
  const [licenseNo, setLicenseNo] = useState(doctor?.licenseNo || '');
  const [specialties, setSpecialties] = useState([]);
  const [specialtyName, setSpecialtyName] = useState(
    doctor?.specialty && doctor.specialty !== '—' ? doctor.specialty : ''
  );
  const [experience, setExperience] = useState(
    doctor?.experience != null ? String(doctor.experience) : ''
  );
  const [fee, setFee] = useState(
    doctor?.consultationFee != null ? String(doctor.consultationFee) : ''
  );
  const [avatar, setAvatar] = useState(doctor?.avatar || '');
  const [education, setEducation] = useState(doctor?.education || '');
  const [bio, setBio] = useState(doctor?.bio || '');

  // ── UI state ────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loadingSpecialties, setLoadingSpecialties] = useState(true);
  const [formError, setFormError] = useState('');

  // ── Toast notification (shown after a successful save) ───────────────
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  // Clear any pending auto-close timer on unmount
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // Shows a top-of-screen success popup, then auto-closes the form.
  const showSuccessToast = (message) => {
    setToast(message || 'Doctor updated successfully.');
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
      onClose();
    }, 1800);
  };

  // Load specialties when the modal opens.
  useEffect(() => {
    if (!isOpen) return;
    fetch(`${API_BASE_URL}/specialties`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load specialties');
        return res.json();
      })
      .then((data) => {
        setSpecialties(Array.isArray(data.specialties) ? data.specialties : []);
        setLoadingSpecialties(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load specialties.');
        setLoadingSpecialties(false);
      });
  }, [isOpen]);

  const handleSpecialtyChange = (e) => {
    setSpecialtyName(e.target.value);
  };

  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setFormError('');

    // ── Validation ────────────────────────────────────────────────────
    if (!firstName.trim() || !lastName.trim()) {
      setFormError('First name and last name are required.');
      return;
    }
    if (!isValidEmail(email)) {
      setFormError('Please enter a valid email address.');
      return;
    }
    if (!licenseNo.trim()) {
      setFormError('Medical license number is required.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        medical_license_no: licenseNo.trim(),
        specialization: specialtyName.trim() || 'General Practice',
        experience_years: experience !== '' ? Number(experience) : 0,
        consultation_fee: fee !== '' ? Number(fee) : 5000,
        doctor_image: avatar.trim() || null,
        education: education.trim() || null,
        description: bio.trim() || null,
      };

      const res = await fetch(`${API_BASE_URL}/admin/doctors/${doctor.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.message || 'Failed to update doctor.');
        return;
      }

      setSuccess(data.message || 'Doctor updated successfully.');
      onUpdated && onUpdated(data.doctor || null);
      showSuccessToast(data.message || 'Doctor updated successfully.');
    } catch (err) {
      setError(err.message || 'Failed to update doctor.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !doctor) return null;
const inputClass =
    'w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#00a8cc]';
  const inputNoIconClass =
    'w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#00a8cc]';
  const labelClass = 'block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1';

  return createPortal(
    <div className="fixed inset-0 z-[110]">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => !submitting && onClose()}
        aria-hidden="true"
      />
      <div className="relative h-full w-full flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto flex flex-col">
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#e0f5f8] dark:bg-slate-800 flex items-center justify-center">
                <UserCog className="w-5 h-5 text-[#00a8cc]" />
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-200 text-lg leading-tight">
                  Edit Doctor Profile
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  Update details for {doctor.name || 'this doctor'}
                </p>
              </div>
            </div>
            <button
              onClick={() => !submitting && onClose()}
              aria-label="Close"
              className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5">
            {/* Feedback banners */}
            {formError && (
              <div className="flex items-start gap-2 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 text-sm rounded-lg px-4 py-3">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}
            {error && (
              <div className="flex items-start gap-2 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 text-sm rounded-lg px-4 py-3">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="flex items-start gap-2 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-sm rounded-lg px-4 py-3">
                <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{success}</span>
              </div>
            )}

            {loadingSpecialties && specialties.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading specialties...
              </div>
            ) : null}

            {/* Personal info */}
            <section>
              <p className="text-xs font-semibold text-[#00a8cc] dark:text-cyan-400 tracking-wide mb-3 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> PERSONAL INFO
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>First Name *</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      className={inputClass}
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="John"
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Last Name *</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      className={inputClass}
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Doe"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <label className={labelClass}>Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    className={inputClass}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john.doe@medsync.io"
                  />
                </div>
              </div>
            </section>
{/* Professional info */}
            <section>
              <p className="text-xs font-semibold text-[#00a8cc] dark:text-cyan-400 tracking-wide mb-3 flex items-center gap-1.5">
                <Stethoscope className="w-3.5 h-3.5" /> PROFESSIONAL INFO
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Medical License No. *</label>
                  <div className="relative">
                    <BadgeCheck className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      className={inputClass}
                      value={licenseNo}
                      onChange={(e) => setLicenseNo(e.target.value)}
                      placeholder="SLMC-45872"
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Specialty</label>
                  <select
                    className={inputNoIconClass}
                    value={specialtyName}
                    onChange={handleSpecialtyChange}
                  >
                    {loadingSpecialties ? (
                      <option value={specialtyName}>{specialtyName || 'Loading...'}</option>
                    ) : null}
                    {!loadingSpecialties && specialtyName && !specialties.some((s) => s.name === specialtyName) ? (
                      <option value={specialtyName}>{specialtyName}</option>
                    ) : null}
                    <option value="">General Practice</option>
                    {specialties.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className={labelClass}>Experience (years)</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      className={inputClass}
                      type="number"
                      min="0"
                      value={experience}
                      onChange={(e) => setExperience(e.target.value)}
                      placeholder="8"
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Consultation Fee (LKR)</label>
                  <div className="relative">
                    <Banknote className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      className={inputClass}
                      type="number"
                      min="0"
                      value={fee}
                      onChange={(e) => setFee(e.target.value)}
                      placeholder="5000"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <label className={labelClass}>Profile Photo URL</label>
                <div className="relative">
                  <Image className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    className={inputClass}
                    value={avatar}
                    onChange={(e) => setAvatar(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                  />
                </div>
              </div>
            </section>
{/* Education & Bio */}
            <section>
              <p className="text-xs font-semibold text-[#00a8cc] dark:text-cyan-400 tracking-wide mb-3 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5" /> EDUCATION &amp; BIO
              </p>
              <div>
                <label className={labelClass}>Education</label>
                <input
                  className={inputNoIconClass}
                  value={education}
                  onChange={(e) => setEducation(e.target.value)}
                  placeholder="MBBS, University of Colombo · MD (Cardiology)"
                />
              </div>
              <div className="mt-4">
                <label className={labelClass}>Bio / Description</label>
                <textarea
                  className={`${inputNoIconClass} min-h-[80px] resize-y`}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Short professional bio..."
                />
              </div>
            </section>

            {/* Actions */}
            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
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
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Success toast popup (auto-closes the form after a short delay) */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[130] pointer-events-none animate-toast-in">
          <div className="flex items-center gap-2.5 px-5 py-3.5 rounded-xl bg-emerald-600 text-white shadow-2xl border border-emerald-500 text-sm font-semibold">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>{toast}</span>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}