import { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { supabase } from '../../../supabaseClient';
import LoadingSpinner from '../../components/LoadingSpinner';

const STATUS_TONE = {
  cyan: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-950/40 dark:text-cyan-300',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300',
};

function buildMonthGrid(year, month) {
  const first = new Date(year, month, 1);
  const startDay = first.getDay(); // Sun = 0, matches SUN-first mockup
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

// Format a time string (HH:MM:SS) into "HH:MM" for display
const formatTime = (timeStr) => {
  if (!timeStr) return '—';
  const [hours, minutes] = timeStr.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return timeStr;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

// Get AM/PM period from a time string
const getTimePeriod = (timeStr) => {
  if (!timeStr) return '';
  const hours = Number(timeStr.split(':')[0]);
  return hours >= 12 ? 'PM' : 'AM';
};

// Derive UI tone from appointment status
const getTone = (status) => {
  if (status === 'PENDING' || status === 'CONFIRMED') return 'rose';
  return 'slate';
};

// Derive joinable flag from appointment status
const isJoinable = (status) => status === 'CONFIRMED';

export default function DoctorAppointments() {
  const today = new Date();
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selectedDay, setSelectedDay] = useState(today.getDate());

  const [appointments, setAppointments] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const cells = useMemo(() => buildMonthGrid(cursor.year, cursor.month), [cursor]);
  const monthLabel = new Date(cursor.year, cursor.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const changeMonth = (delta) => {
    const d = new Date(cursor.year, cursor.month + delta, 1);
    setCursor({ year: d.getFullYear(), month: d.getMonth() });
  };

  // Build the selected date as YYYY-MM-DD
  const selectedDate = useMemo(() => {
    return `${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
  }, [cursor, selectedDay]);

  // Load data when the selected date changes
  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user;
        if (!user) {
          setError('You must be logged in to view appointments.');
          return;
        }

        setLoading(true);
        setError('');

        const backendUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

        // Get doctor profile to get doctor_id
        const profileResponse = await fetch(`${backendUrl}/doctor/profile/${user.id}`);
        if (!profileResponse.ok) {
          const errData = await profileResponse.json().catch(() => ({}));
          throw new Error(errData.message || `Failed to load doctor profile (${profileResponse.status})`);
        }
        const profileData = await profileResponse.json();

        // Fetch appointments for the selected date
        const apptResponse = await fetch(`${backendUrl}/doctor/appointments/${profileData.doctor.id}?date=${selectedDate}`);
        if (!apptResponse.ok) {
          const errData = await apptResponse.json().catch(() => ({}));
          throw new Error(errData.message || `Failed to load appointments (${apptResponse.status})`);
        }
        const apptData = await apptResponse.json();
        setAppointments(apptData.appointments || []);

        // Fetch recent consultations
        const consultResponse = await fetch(`${backendUrl}/doctor/recent-consultations/${profileData.doctor.id}`);
        if (!consultResponse.ok) {
          const errData = await consultResponse.json().catch(() => ({}));
          throw new Error(errData.message || `Failed to load consultations (${consultResponse.status})`);
        }
        const consultData = await consultResponse.json();
        setConsultations(consultData.consultations || []);
      } catch (err) {
        setError(`Failed to load appointments: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedDate]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Appointment Management</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage records, appointments, and clinical notes.</p>
        </div>
        <div className="relative">
          <input
            placeholder="Search patient ID, name, or MRN..."
            className="pl-3 pr-9 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 w-full sm:w-64 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
          <Filter className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 dark:border-red-600 bg-red-50 dark:bg-red-950 px-5 py-4 text-sm text-red-700 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">Select Date</p>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold text-cyan-600 dark:text-cyan-400">{monthLabel}</p>
            <div className="flex gap-1">
              <button onClick={() => changeMonth(-1)} className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-700">
                <ChevronLeft className="w-3.5 h-3.5 text-slate-500 dark:text-slate-300" />
              </button>
              <button onClick={() => changeMonth(1)} className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-700">
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 dark:text-slate-300" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-y-2 text-center text-[10px] text-slate-400 dark:text-slate-500 mb-1">
            {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d) => <span key={d}>{d}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-y-1 text-center text-sm">
            {cells.map((day, i) => (
              <button
                key={i}
                disabled={!day}
                onClick={() => day && setSelectedDay(day)}
                className={`w-8 h-8 mx-auto flex items-center justify-center rounded-full ${
                  !day ? '' : day === selectedDay ? 'bg-cyan-500 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {day || ''}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Appointments for {monthLabel.split(' ')[0]} {selectedDay}</p>
            <span className="text-xs font-medium bg-cyan-50 text-cyan-600 dark:bg-cyan-950/40 dark:text-cyan-300 px-2.5 py-1 rounded-full">{appointments.length} Scheduled</span>
          </div>

          {loading ? (
            <LoadingSpinner message="Loading appointments" fullscreen={false} />
          ) : appointments.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-slate-400 dark:text-slate-500">No appointments scheduled for this date.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {appointments.map((a) => {
                const tone = getTone(a.status);
                const joinable = isJoinable(a.status);
                return (
                  <div
                    key={a.id}
                    className={`flex items-center justify-between gap-2 flex-wrap rounded-lg p-3 border ${
                      tone === 'rose' ? 'border-cyan-200 bg-cyan-50/40 dark:border-cyan-800 dark:bg-cyan-950/20' : 'border-slate-100 dark:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 w-14">
                        {formatTime(a.startTime)}<br /><span className="font-normal text-slate-400 dark:text-slate-500">{getTimePeriod(a.startTime)}</span>
                      </div>
                      <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-600" />
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{a.patientName}</p>
                        <p className={`text-xs flex items-center gap-1 ${tone === 'rose' ? 'text-rose-500 dark:text-rose-400' : 'text-slate-400 dark:text-slate-500'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${tone === 'rose' ? 'bg-rose-500' : 'bg-slate-300 dark:bg-slate-500'}`} />
                          {a.status}
                        </p>
                      </div>
                    </div>
                    {joinable && (
                      <button className="px-3 py-1.5 text-xs font-medium rounded-lg bg-cyan-500 text-white hover:bg-cyan-600">
                        Join Session
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-4">Recent Consultations</p>
        <div className="overflow-x-auto"><table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr className="text-left text-[11px] text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-700">
              <th className="py-2 font-medium">Date / Time</th>
              <th className="py-2 font-medium">Patient Name</th>
              <th className="py-2 font-medium text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {consultations.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">
                  No completed consultations yet.
                </td>
              </tr>
            ) : (
              consultations.map((r) => (
                <tr key={r.id} className="border-b border-slate-50 dark:border-slate-700/50 last:border-0">
                  <td className="py-3 text-slate-500 dark:text-slate-400">{r.date}</td>
                  <td className="py-3 font-medium text-slate-900 dark:text-slate-100">{r.name}</td>
                  <td className="py-3 text-right">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_TONE[r.tone]}`}>{r.status}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table></div>
      </div>
    </div>
  );
}