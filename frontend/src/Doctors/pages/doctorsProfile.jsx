import { useState, useEffect } from 'react';
import { Mail, Pencil, BadgeCheck, GraduationCap, Stethoscope, Save } from 'lucide-react';
import { supabase } from '../../../supabaseClient';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function DoctorProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    specialization: '',
    experienceYears: '',
    doctorImage: '',
    description: '',
    education: '',
    consultationFee: '',
  });

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
        const response = await fetch(`${backendUrl}/doctor/profile/${user.id}`);
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
      doctorImage: profile.doctorImage || '',
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
        doctor_image: form.doctorImage,
        description: form.description,
        education: form.education
          .split('\n')
          .map((e) => e.trim())
          .filter(Boolean),
        consultation_fee: form.consultationFee ? Number(form.consultationFee) : undefined,
      };

      const response = await fetch(`${backendUrl}/doctor/profile/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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
          <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-600 flex-shrink-0 overflow-hidden">
            {profile.doctorImage && (
              <img src={profile.doctorImage} alt={profile.fullName} className="w-full h-full object-cover" />
            )}
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
        </div>
        <button
          onClick={startEditing}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-cyan-500 text-white text-sm font-medium hover:bg-cyan-600"
        >
          <Pencil className="w-4 h-4" /> Edit Profile
        </button>
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
            <div>
              <label className={labelClass}>Profile Image URL</label>
              <input
                name="doctorImage"
                value={form.doctorImage}
                onChange={handleChange}
                className={inputClass}
                placeholder="https://..."
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

          <div className="flex items-center justify-end gap-3 mt-6">
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