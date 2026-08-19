import { MapPin, Mail, Pencil, BadgeCheck, GraduationCap, Stethoscope } from 'lucide-react';

// ---- Replace with GET /api/doctor/profile ----
const PROFILE = {
  name: 'Dr. Julian Vance',
  title: 'Senior Cardiologist',
  verified: true,
  stats: [
    { label: 'Yrs Experience', value: '15+' },
    { label: 'Reviews', value: '4.9 ★' },
    { label: 'Patients Treated', value: '500+' },
  ],
  contact: {
    clinic: 'MedSync Central Clinic',
    address: 'Block B, 4th Floor, Metropolis Medical Campus',
    email: 'j.vance@medsync.edu',
  },
  bio: [
    "Dr. Julian Vance is a board-certified Senior Cardiologist with over 15 years of dedicated experience in diagnosing and treating complex cardiovascular diseases. He specializes in interventional procedures and has been a pioneering voice in advanced heart failure management protocols within the MedSync network.",
    "He completed his fellowship at the prestigious National Heart Institute and continues to lead clinical research trials focusing on minimally invasive valve replacements. Dr. Vance is committed to patient-centered care, integrating the latest telemetry tech to monitor patient vitals in real-time.",
  ],
  expertise: ['Interventional Cardiology', 'Heart Failure Management', 'Clinical Research', 'Echocardiography', 'Preventive Care'],
  education: [
    'MD, Johns Hopkins University School of Medicine',
    'Fellowship in Cardiovascular Disease, National Heart Institute',
    'Board Certified, American Board of Internal Medicine (Cardiovascular Disease)',
  ],
};
// -----------------------------------------------------------------

export default function DoctorProfile() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-600 flex-shrink-0" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{PROFILE.name}</h1>
              {PROFILE.verified && (
                <span className="flex items-center gap-1 text-[10px] font-medium bg-cyan-50 text-cyan-600 dark:bg-cyan-950/40 dark:text-cyan-300 px-2 py-0.5 rounded-full">
                  <BadgeCheck className="w-3 h-3" /> Verified
                </span>
              )}
            </div>
            <p className="text-sm text-cyan-600 dark:text-cyan-400 mt-0.5">{PROFILE.title}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-5 pt-5 border-t border-slate-100 dark:border-slate-700 text-center">
          {PROFILE.stats.map((s, i) => (
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
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-slate-400 dark:text-slate-500 mt-0.5" />
            <div>
              <p className="text-slate-900 dark:text-slate-100">{PROFILE.contact.clinic}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">{PROFILE.contact.address}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            <p className="text-slate-700 dark:text-slate-300">{PROFILE.contact.email}</p>
          </div>
        </div>
        <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-cyan-500 text-white text-sm font-medium hover:bg-cyan-600">
          <Pencil className="w-4 h-4" /> Edit Profile
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <p className="font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-4">
          Professional Bio
        </p>
        <div className="space-y-3 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          {PROFILE.bio.map((p, i) => <p key={i}>{p}</p>)}
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <p className="font-medium text-slate-900 dark:text-slate-100 mb-3">Clinical Expertise</p>
          <div className="flex flex-wrap gap-2">
            {PROFILE.expertise.map((e, i) => (
              <span key={i} className="text-xs font-medium bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300 px-3 py-1.5 rounded-full">{e}</span>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <p className="font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-3">
            <GraduationCap className="w-4 h-4 text-cyan-600 dark:text-cyan-400" /> Education & Board
          </p>
          <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
            {PROFILE.education.map((e, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-1.5 flex-shrink-0" />
                {e}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}