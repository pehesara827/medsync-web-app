import { useState, useEffect } from 'react';
import { Timer, Hourglass, ArrowRight, Clock, CalendarClock, Users, Save, RefreshCw, AlertCircle } from 'lucide-react';
import { supabase } from '../../../supabaseClient';
import LoadingSpinner from '../../components/LoadingSpinner';

const DURATIONS = [
  { id: '15', label: '15 Mins', icon: Timer },
  { id: '30', label: '30 Mins', icon: Timer },
  { id: '45', label: '45 Mins', icon: Timer },
  { id: '60', label: '1 Hour', icon: Hourglass },
];

const formatTime = (timeStr) => {
  if (!timeStr) return '—';
  const [hours, minutes] = timeStr.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return timeStr;
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${String(minutes).padStart(2, '0')} ${period}`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export default function DoctorScheduleManager() {
  const [activeTab, setActiveTab] = useState('delay');
  const [selected, setSelected] = useState('30');
  const [broadcasting, setBroadcasting] = useState(false);
  const [sent, setSent] = useState(false);

  // Session delay state
  const [session, setSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(false);
  const [sessionError, setSessionError] = useState('');

  // Schedule capacity management state
  const [schedules, setSchedules] = useState([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ── Resolve the logged-in doctor's profile id ────────────────────
  const getDoctorId = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    if (!user) throw new Error('You must be logged in.');

    const { data: profile, error: profileError } = await supabase
      .from('doctor_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile) throw new Error('No doctor profile found for this account.');
    return profile.id;
  };

  // ── Fetch the doctor's current active session ────────────────────
  const loadCurrentSession = async () => {
    setLoadingSession(true);
    setSessionError('');
    try {
      const doctorId = await getDoctorId();
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      const response = await fetch(`${backendUrl}/api/doctor/session/current/${doctorId}`);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || `Failed to load session (${response.status})`);
      }

      const data = await response.json();
      setSession(data.session || null);
    } catch (err) {
      setSessionError(err.message);
      setSession(null);
    } finally {
      setLoadingSession(false);
    }
  };

  // Load the current session when switching to the delay tab
  useEffect(() => {
    if (activeTab === 'delay') {
      (async () => { await loadCurrentSession(); })();
    }
  }, [activeTab]);

  // ── Broadcast a live delay for the current session ───────────────
  const handleBroadcast = async () => {
    setBroadcasting(true);
    setSessionError('');
    try {
      const doctorId = await getDoctorId();
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      const response = await fetch(`${backendUrl}/api/doctor/session/delay/${doctorId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minutes: parseInt(selected, 10) }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || `Failed to broadcast delay (${response.status})`);
      }

      const data = await response.json();
      setSession(data.session || null);
      setSent(true);
      setTimeout(() => setSent(false), 2000);
    } catch (err) {
      setSessionError(err.message);
    } finally {
      setBroadcasting(false);
    }
  };

  // ── Fetch doctor's schedule for capacity management ──────────────
  const loadSchedules = async () => {
    setLoadingSchedules(true);
    setError('');
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      if (!user) {
        setError('You must be logged in to view schedules.');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('doctor_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profile) {
        setError('No doctor profile found for this account.');
        return;
      }

      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      const response = await fetch(`${backendUrl}/api/doctor/schedule/${profile.id}`);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || `Failed to load schedules (${response.status})`);
      }

      const data = await response.json();
      setSchedules(data.schedules || []);
    } catch (err) {
      setError(`Failed to load schedules: ${err.message}`);
    } finally {
      setLoadingSchedules(false);
    }
  };

  // Load schedules when switching to the capacity tab
  useEffect(() => {
    if (activeTab === 'capacity') {
      (async () => { await loadSchedules(); })();
    }
  }, [activeTab]);

  // ── Update max_patients for a schedule slot ──────────────────────
  const handleUpdateCapacity = async (scheduleId, newMax) => {
    setSavingId(scheduleId);
    setError('');
    setSuccess('');
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      const response = await fetch(`${backendUrl}/api/doctor/schedules/${scheduleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ max_patients: newMax }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || `Failed to update capacity (${response.status})`);
      }

      const result = await response.json();
      const updated = result.schedule;

      // Update the local schedule list
      setSchedules((prev) =>
        prev.map((s) =>
          s.id === scheduleId
            ? {
                ...s,
                max_patients: updated.maxPatients,
                current_appointment: updated.currentAppointment,
                is_booked: updated.isBooked,
              }
            : s
        )
      );

      setSuccess(`Capacity updated to ${newMax} patients for this slot.`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="min-h-[70vh]">
      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('delay')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
            activeTab === 'delay'
              ? 'bg-cyan-500 text-white'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
          }`}
        >
          Session Delay
        </button>
        <button
          onClick={() => setActiveTab('capacity')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
            activeTab === 'capacity'
              ? 'bg-cyan-500 text-white'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
          }`}
        >
          Schedule Capacity
        </button>
      </div>

      {/* ── Session Delay Tab ─────────────────────────────────────── */}
      {activeTab === 'delay' && (
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 sm:p-10 w-full max-w-lg text-center">
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Report Current Session Delay</h1>

            {loadingSession ? (
              <LoadingSpinner message="Loading current session" fullscreen={false} />
            ) : sessionError ? (
              <div className="rounded-2xl border border-red-200 dark:border-red-600 bg-red-50 dark:bg-red-950 px-5 py-4 text-sm text-red-700 dark:text-red-200 flex items-start gap-3 text-left mt-6">
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
                <span>{sessionError}</span>
              </div>
            ) : session ? (
              <>
                <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 mt-4 mb-8 text-sm">
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300">
                    <Clock className="w-3.5 h-3.5" /> Current Time: <span className="font-semibold text-slate-900 dark:text-slate-100">{formatTime(session.currentTime)}</span>
                  </span>
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300">
                    <CalendarClock className="w-3.5 h-3.5" /> Scheduled Start: <span className="font-semibold text-slate-900 dark:text-slate-100">{formatTime(session.scheduledStart)}</span>
                  </span>
                </div>

                {session.isDelayed && (
                  <div className="mb-6 rounded-xl border border-amber-200 dark:border-amber-600 bg-amber-50 dark:bg-amber-950 px-4 py-3 text-sm text-amber-700 dark:text-amber-200">
                    Currently reporting a <span className="font-semibold">{session.delayMinutes} min</span> delay.
                  </div>
                )}

                <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 tracking-wide mb-3">SELECT DELAY DURATION</p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
                  {DURATIONS.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => setSelected(id)}
                      className={`flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition-colors ${
                        selected === id ? 'border-cyan-600 bg-cyan-50/40 dark:bg-cyan-950/30' : 'border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${selected === id ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-400 dark:text-slate-500'}`} />
                      <span className={`text-sm font-medium ${selected === id ? 'text-cyan-700 dark:text-cyan-400' : 'text-slate-600 dark:text-slate-300'}`}>{label}</span>
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleBroadcast}
                  disabled={broadcasting}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-cyan-700 text-white font-medium hover:bg-cyan-800 dark:hover:bg-cyan-600 disabled:opacity-60"
                >
                  {sent ? 'Delay Broadcast Sent ✓' : broadcasting ? 'Broadcasting…' : 'Broadcast Live Delay'}
                  {!broadcasting && !sent && <ArrowRight className="w-4 h-4" />}
                </button>
              </>
            ) : (
              <p className="text-slate-500 dark:text-slate-300 mt-6">No active session right now.</p>
            )}
          </div>
        </div>
      )}

      {/* ── Schedule Capacity Tab ─────────────────────────────────── */}
      {activeTab === 'capacity' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Schedule Capacity Management</h1>
            <button
              onClick={loadSchedules}
              disabled={loadingSchedules}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 text-sm font-medium transition"
            >
              <RefreshCw className={`w-4 h-4 ${loadingSchedules ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          <p className="text-sm text-slate-500 dark:text-slate-400">
            Set the maximum number of patients allowed per time slot. When a slot reaches its max, it will automatically disappear from the booking form.
          </p>

          {error && (
            <div className="rounded-2xl border border-red-200 dark:border-red-600 bg-red-50 dark:bg-red-950 px-5 py-4 text-sm text-red-700 dark:text-red-200 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="rounded-2xl border border-emerald-200 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-5 py-4 text-sm text-emerald-700 dark:text-emerald-200 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-emerald-500" />
              <span>{success}</span>
            </div>
          )}

          {loadingSchedules ? (
            <LoadingSpinner message="Loading schedules" fullscreen={false} />
          ) : schedules.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-center">
              <div>
                <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500 dark:text-slate-300">No schedule slots found.</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                    <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">Date</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">Time Slot</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-200">Max Patients</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-200">Booked</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-200">Status</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-200">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {schedules.map((s) => {
                    const isFull = (s.current_appointment ?? 0) >= (s.max_patients ?? 1);
                    return (
                      <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{formatDate(s.available_date)}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          {formatTime(s.start_time)} - {formatTime(s.end_time)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="number"
                            min="1"
                            defaultValue={s.max_patients ?? 1}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const val = parseInt(e.target.value, 10);
                                if (val >= 1) handleUpdateCapacity(s.id, val);
                              }
                            }}
                            className="w-16 px-2 py-1 text-center rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                          />
                        </td>
                        <td className="px-4 py-3 text-center font-medium">
                          <span className={isFull ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}>
                            {s.current_appointment ?? 0}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                            isFull
                              ? 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400'
                              : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400'
                          }`}>
                            {isFull ? 'Full' : 'Available'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => {
                              const input = window.prompt('Enter max patients for this slot:', s.max_patients ?? 1);
                              if (input) {
                                const val = parseInt(input, 10);
                                if (val >= 1) handleUpdateCapacity(s.id, val);
                              }
                            }}
                            disabled={savingId === s.id}
                            className="px-3 py-1.5 rounded-lg bg-cyan-500 text-white text-xs font-semibold hover:bg-cyan-600 transition disabled:opacity-50 flex items-center gap-1 mx-auto"
                          >
                            {savingId === s.id ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <Save className="w-3 h-3" />
                            )}
                            {savingId === s.id ? 'Saving...' : 'Update'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
