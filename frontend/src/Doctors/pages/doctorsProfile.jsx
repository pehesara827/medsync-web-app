import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mail,
  Pencil,
  BadgeCheck,
  GraduationCap,
  Stethoscope,
  Save,
  Camera,
  Loader2,
  KeyRound,
  User,
} from 'lucide-react';
import { supabase, getAuthHeaders } from '../../../supabaseClient';
import LoadingSpinner from '../../components/LoadingSpinner';
import { AVATAR_BUCKET, MAX_IMAGE_BYTES, MAX_IMAGE_LABEL, ALLOWED_AVATAR_TYPES } from '../../utils/uploadLimits';

// ── Profile picture upload (5 MB max — same bucket / limits as the patient side) ──────

const initialsOf = (name) =>
  (name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

export default function DoctorProfile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const fileInputRef = useRef(null);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    specialization: '',
    experienceYears: '',
    description: '',
    education: '',
    consultationFee: '',
  });

  // ── Reset password lives on its own page (/doctor/reset-password) ──────────
  // The edit-mode button below just navigates there — no popup here.


  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user;
        if (!user) {
          setError('You must be logged in to view your profile.');
          return;
        }

        const backendUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
        const response = await fetch(`${backendUrl}/doctor/profile/${user.id}`, {
          headers: await getAuthHeaders(),
        });
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.message || `Failed to load profile (${response.status})`);
        }
        const data = await response.json();
        setProfile(data.doctor);
      } catch (err) {
        setError(`Failed to load profile: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const startEditing = () => {
    if (!profile) return;
    setForm({
      firstName: profile.firstName || '',
      lastName: profile.lastName || '',
      specialization: profile.specialization || '',
      experienceYears: profile.experienceYears ?? '',
      description: (profile.bio || []).join('\n'),
      education: (profile.education || []).join('\n'),
      consultationFee: profile.consultationFee ?? '',
    });
    setError('');
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setError('');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');

      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      if (!user) {
        setError('You must be logged in to save your profile.');
        return;
      }

      const backendUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
      const payload = {
        first_name: form.firstName,
        last_name: form.lastName,
        specialization: form.specialization,
        experience_years: form.experienceYears ? Number(form.experienceYears) : undefined,
        description: form.description,
        education: form.education
          .split('\n')
          .map((e) => e.trim())
          .filter(Boolean),
        consultation_fee: form.consultationFee ? Number(form.consultationFee) : undefined,
      };

      const response = await fetch(`${backendUrl}/doctor/profile/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(await getAuthHeaders()),
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || `Failed to save profile (${response.status})`);
      }

      const data = await response.json();
      setProfile(data.doctor);
      setIsEditing(false);
    } catch (err) {
      setError(`Failed to save profile: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  /**
   * Profile photo change via the camera icon (mirrors the patient flow).
   * Uploads to the `profile-pictures` bucket, then asks the backend to store
   * the new URL and delete the replaced file. Rolls the upload back on error.
   */
  const handleAvatarSelect = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow picking the same file again later
    if (!file) return;

    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      setError('Please choose a PNG, JPG or WEBP image.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError(`Profile pictures must be ${MAX_IMAGE_LABEL} or smaller.`);
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    if (!user) {
      setError('You must be logged in to change your profile picture.');
      return;
    }

    setAvatarBusy(true);
    setError('');

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `avatars/${user.id}_${Date.now()}_${safeName}`;
    let uploadedPath = null;

    try {
      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(filePath, file, { cacheControl: '3600', upsert: false });
      if (uploadError) throw new Error(`Failed to upload image: ${uploadError.message}`);
      uploadedPath = filePath;

      const { data: publicUrlData } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(filePath);
      const backendUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
      const response = await fetch(`${backendUrl}/doctor/profile/${user.id}/photo`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(await getAuthHeaders()),
        },
        body: JSON.stringify({ profilePictureUrl: publicUrlData.publicUrl }),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || `Failed to save photo (${response.status})`);
      }
      const data = await response.json();
      const newUrl = data?.doctor?.doctorImage || publicUrlData.publicUrl;
      setProfile((prev) => (prev ? { ...prev, doctorImage: newUrl } : prev));
      uploadedPath = null; // backend owns the file from here on
    } catch (err) {
      if (uploadedPath) {
        await supabase.storage.from(AVATAR_BUCKET).remove([uploadedPath]);
      }
      setError(`Failed to update profile picture: ${err.message}`);
    } finally {
      setAvatarBusy(false);
    }
  };

  // ── Reset password lives on /doctor/reset-password (no popup here) ─────────

  if (loading) {
    return <LoadingSpinner message="Loading your profile" />;
  }

  if (error && !profile) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-800 px-5 py-4 text-sm text-slate-500">
        No profile data available.
      </div>
    );
  }

  const stats = [
    { label: 'Yrs Experience', value: `${profile.experienceYears ?? 0}+` },
    { label: 'Reviews', value: `${profile.rating?.toFixed(1) ?? '0.0'} ★` },
    { label: 'Patients Treated', value: `${profile.patientsTreated ?? 0}+` },
  ];

  const bio = Array.isArray(profile.bio) && profile.bio.length > 0
    ? profile.bio
    : ['No professional bio available yet.'];

  const expertise = Array.isArray(profile.expertise) && profile.expertise.length > 0
    ? profile.expertise
    : ['General Practice'];

  const education = Array.isArray(profile.education) && profile.education.length > 0
    ? profile.education
    : ['Education details not provided.'];

  const inputClass = "w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500";
  const labelClass = "block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {error && (
        <div className="md:col-span-2 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-start gap-4">
          {/* Profile photo — click the camera icon to change it */}
          <div className="relative flex-shrink-0">
            <div className="w-16 h-16 rounded-full bg-cyan-100 dark:bg-slate-600 overflow-hidden flex items-center justify-center">
              {profile.doctorImage ? (
                <img src={profile.doctorImage} alt={profile.fullName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-lg font-bold text-cyan-700 dark:text-cyan-200">
                  {initialsOf(profile.fullName) || <User className="w-6 h-6" />}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarBusy}
              aria-label="Change profile photo"
              title="Change profile photo"
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-cyan-500 hover:bg-cyan-600 text-white flex items-center justify-center shadow-md border-2 border-white dark:border-slate-800 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {avatarBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="hidden"
              onChange={handleAvatarSelect}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{profile.fullName}</h1>
              {profile.verified && (
                <span className="flex items-center gap-1 text-[10px] font-medium bg-cyan-50 text-cyan-600 dark:bg-cyan-950/40 dark:text-cyan-300 px-2 py-0.5 rounded-full">
                  <BadgeCheck className="w-3 h-3" /> Verified
                </span>
              )}
            </div>
            <p className="text-sm text-cyan-600 dark:text-cyan-400 mt-0.5">{profile.specialtyName || profile.specialization}</p>
            {profile.username && (
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">@{profile.username}</p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-5 pt-5 border-t border-slate-100 dark:border-slate-700 text-center">
          {stats.map((s, i) => (
            <div key={i}>
              <p className="text-base font-semibold text-slate-900 dark:text-slate-100">{s.value}</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <p className="font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-4">
          <Stethoscope className="w-4 h-4 text-cyan-600 dark:text-cyan-400" /> Contact Info
        </p>
        <div className="space-y-3 mb-5 text-sm">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            <p className="text-slate-700 dark:text-slate-300">{profile.email || '—'}</p>
          </div>
          {profile.username && (
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              <p className="text-slate-700 dark:text-slate-300">@{profile.username}</p>
            </div>
          )}
        </div>
        <div className="space-y-2.5">
          <button
            onClick={startEditing}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-cyan-500 text-white text-sm font-medium hover:bg-cyan-600"
          >
            <Pencil className="w-4 h-4" /> Edit Profile
          </button>
        </div>
      </div>

      {isEditing ? (
        <div className="md:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-5">Edit Profile</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>First Name</label>
              <input
                name="firstName"
                value={form.firstName}
                onChange={handleChange}
                className={inputClass}
                placeholder="First name"
              />
            </div>
            <div>
              <label className={labelClass}>Last Name</label>
              <input
                name="lastName"
                value={form.lastName}
                onChange={handleChange}
                className={inputClass}
                placeholder="Last name"
              />
            </div>
            <div>
              <label className={labelClass}>Specialization</label>
              <input
                name="specialization"
                value={form.specialization}
                onChange={handleChange}
                className={inputClass}
                placeholder="e.g. Cardiology"
              />
            </div>
            <div>
              <label className={labelClass}>Years of Experience</label>
              <input
                name="experienceYears"
                type="number"
                min="0"
                value={form.experienceYears}
                onChange={handleChange}
                className={inputClass}
                placeholder="e.g. 15"
              />
            </div>
            <div>
              <label className={labelClass}>Consultation Fee (Rs.)</label>
              <input
                name="consultationFee"
                type="number"
                min="0"
                value={form.consultationFee}
                onChange={handleChange}
                className={inputClass}
                placeholder="e.g. 5000"
              />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Professional Bio</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows="4"
                className={inputClass}
                placeholder="Write a short professional bio..."
              />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Education (one per line)</label>
              <textarea
                name="education"
                value={form.education}
                onChange={handleChange}
                rows="3"
                className={inputClass}
                placeholder={'MD, Johns Hopkins University\nFellowship in Cardiovascular Disease'}
              />
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 mt-6">
            <button
              type="button"
              onClick={() => navigate('/doctor/reset-password')}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-cyan-500/40 text-cyan-700 dark:text-cyan-300 text-sm font-medium hover:bg-cyan-50 dark:hover:bg-cyan-950/30 transition"
            >
              <KeyRound className="w-4 h-4" /> Reset Password
            </button>
            <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-3">
              <button
                onClick={cancelEditing}
                className="px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-cyan-500 text-white text-sm font-medium hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <p className="font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-4">
              Professional Bio
            </p>
            <div className="space-y-3 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              {bio.map((p, i) => <p key={i}>{p}</p>)}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
              <p className="font-medium text-slate-900 dark:text-slate-100 mb-3">Clinical Expertise</p>
              <div className="flex flex-wrap gap-2">
                {expertise.map((e, i) => (
                  <span key={i} className="text-xs font-medium bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300 px-3 py-1.5 rounded-full">{e}</span>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
              <p className="font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-3">
                <GraduationCap className="w-4 h-4 text-cyan-600 dark:text-cyan-400" /> Education & Board
              </p>
              <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                {education.map((e, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-1.5 flex-shrink-0" />
                    {e}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
}