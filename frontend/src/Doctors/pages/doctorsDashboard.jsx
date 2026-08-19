import { useState, useEffect } from 'react';
import { Users, Star, MessageSquare, Clock, BarChart3 } from 'lucide-react';
import { supabase } from '../../../supabaseClient';

// Static fallback data (kept for fields not in the database)
const DAILY_VOLUME = [30, 55, 40, 90, 45, 60, 35];
const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// Static recent reviews (placeholder — consistent with existing static data pattern)
const RECENT_REVIEWS = [
  { id: 1, patient: 'Sarah Johnson', rating: 5, comment: 'Excellent care, very thorough examination.', time: '2 hours ago' },
  { id: 2, patient: 'Michael Chen', rating: 4, comment: 'Great doctor, very knowledgeable and patient.', time: 'Yesterday' },
  { id: 3, patient: 'Emily Davis', rating: 5, comment: 'Very professional. Highly recommend!', time: '2 days ago' },
  { id: 4, patient: 'Robert Wilson', rating: 4, comment: 'Good experience overall. Wait time was reasonable.', time: '3 days ago' },
  { id: 5, patient: 'Lisa Thompson', rating: 5, comment: 'Took time to explain everything clearly.', time: '5 days ago' },
];

const formatTime = (timeStr) => {
  if (!timeStr) return '—';
  const [hours, minutes] = timeStr.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return timeStr;
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${String(minutes).padStart(2, '0')}`;
};

const getTimePeriod = (timeStr) => {
  if (!timeStr) return '';
  const hours = Number(timeStr.split(':')[0]);
  return hours >= 12 ? 'PM' : 'AM';
};

export default function DoctorDashboard() {
  const today = new Date();
  const dateLabel = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const [doctor, setDoctor] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user;
        if (!user) {
          setError('You must be logged in to view the dashboard.');
          return;
        }

        const backendUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
        const profileResponse = await fetch(`${backendUrl}/doctor/profile/${user.id}`);
        if (!profileResponse.ok) {
          const errData = await profileResponse.json().catch(() => ({}));
          throw new Error(errData.message || `Failed to load doctor profile (${profileResponse.status})`);
        }
        const profileData = await profileResponse.json();
        setDoctor(profileData.doctor);

        const todayStr = new Date().toISOString().split('T')[0];
        const apptResponse = await fetch(`${backendUrl}/doctor/appointments/${profileData.doctor.id}`);
        if (!apptResponse.ok) {
          const errData = await apptResponse.json().catch(() => ({}));
          throw new Error(errData.message || `Failed to load appointments (${apptResponse.status})`);
        }
        const apptData = await apptResponse.json();
        const allAppts = apptData.appointments || [];

        const todaysAppts = allAppts
          .filter((a) => a.appointmentDate === todayStr)
          .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
        setAppointments(todaysAppts);
      } catch (err) {
        setError(`Failed to load dashboard: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const completedCount = appointments.filter((a) => a.status === 'COMPLETED').length;
  const totalCount = appointments.length;
  const pendingCount = appointments.filter((a) => a.status === 'PENDING').length;
  const progressPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // Rating distribution derived from the doctor's rating
  const rating = doctor?.rating ?? 0;
  const reviewCount = doctor?.reviewCount ?? 0;
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.25 && rating - fullStars < 0.75;

  const renderStars = (count, max = 5) => {
    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: max }, (_, i) => (
          <Star
            key={i}
            className={`w-3.5 h-3.5 ${i < count ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 dark:fill-slate-700 text-slate-200 dark:text-slate-700'}`}
            strokeWidth={1.5}
          />
        ))}
      </div>
    );
  };

  // Star distribution for the review panel
  const starDistribution = [5, 4, 3, 2, 1].map((star) => {
    const pct = star === 5 ? 60 : star === 4 ? 25 : star === 3 ? 10 : star === 2 ? 3 : 2;
    return { star, pct };
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <svg className="h-10 w-10 animate-spin text-[#00a8cc]" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm font-medium text-slate-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="shrink-0 mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Today's Schedule</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {dateLabel} • {totalCount} Appointments
            {doctor && <span className="ml-2 text-cyan-600 dark:text-cyan-400">• {doctor.fullName}</span>}
          </p>
        </div>
      </div>

      {error && (
        <div className="shrink-0 mb-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Stats Row */}
      <div className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {/* Today's Patients */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center">
              <Users className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 tracking-wide">TODAY</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalCount}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">{completedCount} seen</span>
            {pendingCount > 0 && <span className="ml-2 text-amber-600 dark:text-amber-400 font-medium">{pendingCount} pending</span>}
          </p>
          <div className="mt-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5">
            <div className="bg-indigo-500 rounded-full h-1.5 transition-all duration-500" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        {/* Rating */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center">
              <Star className="w-4.5 h-4.5 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 tracking-wide">RATING</span>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{rating.toFixed(1)}</p>
            {renderStars(fullStars)}
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Overall patient satisfaction</p>
        </div>

        {/* Reviews */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 flex items-center justify-center">
              <MessageSquare className="w-4.5 h-4.5 text-cyan-600 dark:text-cyan-400" />
            </div>
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 tracking-wide">REVIEWS</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{reviewCount}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            <span className="text-cyan-600 dark:text-cyan-400 font-medium">Total reviews</span> received
          </p>
        </div>

        {/* Daily Volume */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 flex items-center justify-center">
              <BarChart3 className="w-4.5 h-4.5 text-cyan-600 dark:text-cyan-400" />
            </div>
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 tracking-wide">WEEKLY</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{DAILY_VOLUME[3]}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            <span className="text-cyan-600 dark:text-cyan-400 font-medium">Week's peak</span> • {DAILY_VOLUME.reduce((a, b) => a + b, 0)} total
          </p>
          <div className="flex items-end gap-1 h-12 mt-3">
            {DAILY_VOLUME.map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                <div
                  className={`w-full rounded-t ${i === 3 ? 'bg-[#00b8e6]' : 'bg-slate-100 dark:bg-slate-800'}`}
                  style={{ height: `${v}%` }}
                />
                <span className={`text-[9px] font-medium ${i === 3 ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-400 dark:text-slate-500'}`}>
                  {DAY_LABELS[i]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Grid — fills remaining height, no overflow */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[0.85fr_1.3fr] gap-4 overflow-hidden">
        {/* Left: Today's Appointments */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col min-h-0 overflow-hidden">
          <div className="shrink-0 px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Today's Appointments</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-400 dark:text-slate-500">{completedCount}/{totalCount} done</span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
              <span className="text-xs font-medium text-cyan-600 dark:text-cyan-400">{totalCount} total</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {appointments.length === 0 && !error ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-slate-400 dark:text-slate-500 text-sm">You haven't any appointments today.</p>
              </div>
            ) : (
              appointments.map((a, idx) => (
                <div
                  key={a.id}
                  className={`rounded-xl p-3.5 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-sm transition-all duration-200 ${
                    idx === 0 ? 'border-l-4 border-l-[#00b8e6] shadow-[0_0_20px_rgba(0,184,230,0.06)]' : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {/* Time block */}
                    <div className="flex-shrink-0">
                      <div className="bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2 w-16 text-center">
                        <p className="text-base font-bold text-slate-800 dark:text-slate-100 leading-none">{formatTime(a.startTime)}</p>
                        <p className="text-[10px] font-normal text-slate-400 dark:text-slate-500 mt-0.5">{getTimePeriod(a.startTime)}</p>
                      </div>
                    </div>

                    {/* Patient */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-white text-sm truncate">{a.patientName}</p>
                      <p className="text-[10px] font-mono tracking-wider text-cyan-600 dark:text-cyan-400 mt-0.5">
                        {a.displayId}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="min-h-0 overflow-hidden">
          {/* Review Panel */}
          <div className="h-full min-h-0 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden">
            <div className="shrink-0 px-4 py-3.5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Review Panel</h3>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star
                      key={i}
                      className={`w-3 h-3 ${i < fullStars ? 'fill-amber-400 text-amber-400' : hasHalf && i === fullStars ? 'fill-amber-400/50 text-amber-400' : 'fill-slate-200 dark:fill-slate-700 text-slate-200 dark:text-slate-700'}`}
                      strokeWidth={1.5}
                    />
                  ))}
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{rating.toFixed(1)}</span>
                <span className="text-xs text-slate-400 dark:text-slate-500">({reviewCount} reviews)</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {/* Star distribution bars */}
              <div className="space-y-1.5 mb-3">
                {starDistribution.map(({ star, pct }) => (
                  <div key={star} className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 w-3">{star}</span>
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" strokeWidth={1.5} />
                    <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-slate-400 dark:text-slate-500 w-6 text-right">{pct}%</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-3" />

              {/* Recent reviews */}
              <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 tracking-wide uppercase">Recent Reviews</p>
              {RECENT_REVIEWS.map((rv) => (
                <div key={rv.id} className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{rv.patient}</p>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">{rv.time}</span>
                  </div>
                  <div className="flex items-center gap-1 mb-1.5">
                    {Array.from({ length: rv.rating }, (_, i) => (
                      <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" strokeWidth={1.5} />
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{rv.comment}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}