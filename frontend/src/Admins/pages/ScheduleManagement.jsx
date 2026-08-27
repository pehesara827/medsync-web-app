import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus,
  CalendarClock,
  Megaphone,
  Users,
  Timer,
  UserRound,
  Search,
  X,
  Ban,
  CheckCircle2,
  Clock,
} from 'lucide-react';

// ── Mock data (UI-only; replace with real API calls later) ────────────────
const mockSchedules = [
  {
    id: 'SCH-1001',
    doctorName: 'Dr. Sarah Jenkins',
    doctorSpecialty: 'Neurology',
    doctorAvatar: 'SJ',
    availableDate: '2026-08-28',
    startTime: '09:00 AM',
    endTime: '12:00 PM',
    consultationFee: 5000,
    maxPatients: 10,
    currentAppointments: 8,
    isDelayed: false,
    delayMinutes: 0,
    isBooked: true,
  },
  {
    id: 'SCH-1002',
    doctorName: 'Dr. Michael Chen',
    doctorSpecialty: 'Pediatrics',
    doctorAvatar: 'MC',
    availableDate: '2026-08-28',
    startTime: '10:00 AM',
    endTime: '01:00 PM',
    consultationFee: 4500,
    maxPatients: 12,
    currentAppointments: 12,
    isDelayed: true,
    delayMinutes: 30,
    isBooked: true,
  },
  {
    id: 'SCH-1003',
    doctorName: 'Dr. Rachel Vance',
    doctorSpecialty: 'Orthopedics',
    doctorAvatar: 'RV',
    availableDate: '2026-08-28',
    startTime: '08:00 AM',
    endTime: '11:30 AM',
    consultationFee: 5500,
    maxPatients: 8,
    currentAppointments: 5,
    isDelayed: false,
    delayMinutes: 0,
    isBooked: false,
  },
  {
    id: 'SCH-1004',
    doctorName: 'Dr. Priya Fernando',
    doctorSpecialty: 'Cardiology',
    doctorAvatar: 'PF',
    availableDate: '2026-08-29',
    startTime: '09:30 AM',
    endTime: '12:30 PM',
    consultationFee: 6500,
    maxPatients: 10,
    currentAppointments: 3,
    isDelayed: false,
    delayMinutes: 0,
    isBooked: false,
  },
  {
    id: 'SCH-1005',
    doctorName: 'Dr. Nimal Perera',
    doctorSpecialty: 'Dermatology',
    doctorAvatar: 'NP',
    availableDate: '2026-08-29',
    startTime: '02:00 PM',
    endTime: '05:00 PM',
    consultationFee: 4000,
    maxPatients: 10,
    currentAppointments: 10,
    isDelayed: true,
    delayMinutes: 45,
    isBooked: true,
  },
];

// Doctor list for the "Add Schedule" modal dropdown
const MOCK_DOCTORS = [
  { id: 'd1', name: 'Dr. Sarah Jenkins', specialty: 'Neurology' },
  { id: 'd2', name: 'Dr. Michael Chen', specialty: 'Pediatrics' },
  { id: 'd3', name: 'Dr. Rachel Vance', specialty: 'Orthopedics' },
  { id: 'd4', name: 'Dr. Priya Fernando', specialty: 'Cardiology' },
  { id: 'd5', name: 'Dr. Toael Perera', specialty: 'Dermatology' },
  { id: 'd6', name: 'Dr. Anika Silva', specialty: 'General Medicine' },
];

const DELAY_DURATIONS = [
  { label: '15 Mins', minutes: 15 },
  { label: '30 Mins', minutes: 30 },
  { label: '45 Mins', minutes: 45 },
  { label: '1 Hour', minutes: 60 },
];

const DEFAULT_DATE = '2026-08-28';

const inputClass =
  'w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00a8cc]/20 focus:border-[#00a8cc]/50 transition';
const labelClass =
  'block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide';

const STATUS_STYLES = {
  'On Time': 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
  Delayed: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
  Full: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  Available: 'bg-cyan-50 text-[#0092b3] dark:bg-cyan-500/10 dark:text-cyan-400',
};

const DOCTOR_AVATAR_COLORS = [
  'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
];

const formatCurrency = (value) =>
  `LKR ${new Intl.NumberFormat('en-US').format(value)}`;

const formatDate = (dateStr) => {
  const [y, m, d] = dateStr.split('-');
  const date = new Date(`${y}-${m}-${d}T00:00:00`);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};
export default function ScheduleManagement() {
  const [schedules, setSchedules] = useState(mockSchedules);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState(DEFAULT_DATE); // DEFAULT_DATE = Today
  const [statusFilter, setStatusFilter] = useState('all');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedScheduleForDelay, setSelectedScheduleForDelay] = useState(null);

  // ── Derived metrics for KPI cards ──────────────────────────────────
  const todaySessions = schedules.filter((s) => s.availableDate === DEFAULT_DATE).length;
  const avgFill =
    schedules.length === 0
      ? 0
      : Math.round(
          (schedules.reduce(
            (sum, s) => sum + (s.currentAppointments / s.maxPatients) * 100,
            0
          ) /
            schedules.length) *
            100
        );
  const activeDelays = schedules.filter((s) => s.isDelayed).length;
  const totalWaitlisted = schedules.reduce(
    (sum, s) => sum + Math.max(0, s.maxPatients - s.currentAppointments),
    0
  );

  // ── Filtering ──────────────────────────────────────────────────────
  const filteredSchedules = useMemo(() => {
    return schedules.filter((s) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        s.doctorName.toLowerCase().includes(q) ||
        s.doctorSpecialty.toLowerCase().includes(q);

      const matchesDate =
        dateFilter === 'all' || s.availableDate === dateFilter;

      let matchesStatus = true;
      if (statusFilter === 'delayed') matchesStatus = s.isDelayed;
      else if (statusFilter === 'on-time') matchesStatus = !s.isDelayed;
      else if (statusFilter === 'booked') matchesStatus = s.isBooked;

      return matchesSearch && matchesDate && matchesStatus;
    });
  }, [schedules, searchQuery, dateFilter, statusFilter]);

  const handleCreateSchedule = (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    const newSchedule = {
      id: `SCH-${Math.floor(1000 + Math.random() * 9000)}`,
      doctorName: form.get('doctor'),
      doctorSpecialty: '',
      doctorAvatar: '',
      availableDate: form.get('date') || DEFAULT_DATE,
      startTime: form.get('startTime') || '09:00 AM',
      endTime: form.get('endTime') || '12:00 PM',
      consultationFee: Number(form.get('fee')) || 0,
      maxPatients: Number(form.get('maxPatients')) || 1,
      currentAppointments: 0,
      isDelayed: false,
      delayMinutes: 0,
      isBooked: false,
    };

    const doctor = MOCK_DOCTORS.find((d) => d.name === newSchedule.doctorName);
    if (doctor) {
      newSchedule.doctorSpecialty = doctor.specialty;
      newSchedule.doctorAvatar = doctor.name
        .replace('Dr. ', '')
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase();
    }

    setSchedules((prev) => [...prev, newSchedule]);
    setIsAddModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* ── A. Header ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Schedule Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage doctor time slots, capacity, and live session delays.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-[#00a8cc] text-white hover:bg-[#0092b3] transition"
        >
          <Plus className="w-4 h-4" />
          Add New Schedule
        </button>
      </div>
{/* ── A. KPI Summary Cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Sessions */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-400">Today's Sessions</p>
            <div className="w-8 h-8 rounded-lg bg-[#e0f5f8] dark:bg-cyan-500/10 flex items-center justify-center">
              <CalendarClock className="w-4 h-4 text-[#00a8cc] dark:text-cyan-400" />
            </div>
          </div>
          <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mt-1">{todaySessions}</p>
          <p className="text-xs font-medium text-emerald-600 mt-1">Active</p>
        </div>

        {/* Avg. Capacity Fill Rate */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-400">Avg. Capacity Fill</p>
            <div className="w-8 h-8 rounded-lg bg-[#e0f5f8] dark:bg-cyan-500/10 flex items-center justify-center">
              <Users className="w-4 h-4 text-[#00a8cc] dark:text-cyan-400" />
            </div>
          </div>
          <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mt-1">{avgFill}%</p>
          <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#00a8cc] dark:bg-cyan-400"
              style={{ width: `${avgFill}%` }}
            />
          </div>
        </div>

        {/* Active Session Delays */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-400">Active Delays</p>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
              <Timer className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            </div>
          </div>
          <p className="text-2xl font-semibold text-amber-600 dark:text-amber-400 mt-1">{activeDelays}</p>
          <p className="text-xs font-medium text-amber-600 dark:text-amber-400/80">Sessions</p>
        </div>

        {/* Total Waitlisted Patients */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-400">Waitlisted Patients</p>
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
              <UserRound className="w-4 h-4 text-slate-500 dark:text-slate-300" />
            </div>
          </div>
          <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mt-1">{totalWaitlisted}</p>
          <p className="text-xs font-medium text-slate-400 dark:text-slate-500">Waiting</p>
        </div>
      </div>

      {/* ── B. Search & Filter Bar ───────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by doctor name or specialty..."
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/60 pl-9 pr-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00a8cc]/20 focus:border-[#00a8cc]/70 transition"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/60 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#00a8cc]/20 focus:border-[#00a8cc]/70 transition"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/60 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#00a8cc]/20 focus:border-[#00a8cc]/70 transition"
          >
            <option value="all">All Statuses</option>
            <option value="on-time">On-Time</option>
            <option value="delayed">Delayed</option>
            <option value="booked">Fully Booked</option>
          </select>
        </div>
      </div>
{/* ── C. Main Schedules Table ──────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-700/40 text-left">
                <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Doctor</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Date &amp; Time Slot</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Capacity &amp; Fill</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Fee</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Status &amp; Delay</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
{filteredSchedules.map((s, idx) => {
                const fillPct = Math.min(
                  100,
                  Math.round((s.currentAppointments / s.maxPatients) * 100)
                );
                const avatarColor =
                  DOCTOR_AVATAR_COLORS[idx % DOCTOR_AVATAR_COLORS.length];
                return (
                  <tr key={s.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold ${avatarColor}`}>
                          {s.doctorAvatar}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-slate-100">{s.doctorName}</p>
                          <span className="text-[11px] font-medium bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full mt-0.5 inline-block">
                            {s.doctorSpecialty}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-700 dark:text-slate-200">{formatDate(s.availableDate)}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{s.startTime} - {s.endTime}</p>
                    </td>
                    <td className="px-6 py-4 w-56">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                          {s.currentAppointments}/{s.maxPatients} booked
                        </p>
                        <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">{fillPct}%</p>
                      </div>
                      <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${s.isBooked ? 'bg-emerald-500' : 'bg-[#00a8cc] dark:bg-cyan-400'}`}
                          style={{ width: `${fillPct}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">
                      {formatCurrency(s.consultationFee)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5">
                        <span className={`inline-flex items-center gap-1.5 w-max text-xs font-medium px-2.5 py-1 rounded-full ${s.isDelayed ? STATUS_STYLES.Delayed : STATUS_STYLES['On Time']}`}>
                          {s.isDelayed ? `Delayed (+${s.delayMinutes}m)` : 'On Time'}
                        </span>
                        <span className={`inline-flex items-center w-max text-xs font-medium px-2.5 py-1 rounded-full ${s.isBooked ? STATUS_STYLES.Full : STATUS_STYLES.Available}`}>
                          {s.isBooked ? 'Full' : 'Available'}
                        </span>
                      </div>
                    </td>
<td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedScheduleForDelay(s)}
                          title="Broadcast Delay"
                          aria-label="Broadcast Delay"
                          className="p-2 rounded-lg text-slate-400 dark:text-slate-500 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition"
                        >
                          <Megaphone className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          title="View Waitlist"
                          aria-label="View Waitlist"
                          className="p-2 rounded-lg text-slate-400 dark:text-slate-500 hover:text-[#00a8cc] hover:bg-[#e0f5f8] dark:hover:bg-cyan-500/10 transition"
                        >
                          <Users className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          title="Emergency Cancel"
                          aria-label="Emergency Cancel"
                          className="p-2 rounded-lg text-slate-400 dark:text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredSchedules.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <p className="text-sm text-slate-400 dark:text-slate-500">No schedules match your filters.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
{/* ── D. Modal: Create New Schedule ────────────────────────────── */}
      {isAddModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setIsAddModalOpen(false)}
            />
            <div className="relative w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl">
              <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-700">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Create New Schedule</h2>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Add a new doctor time slot.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  aria-label="Close"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateSchedule} className="px-6 py-5 space-y-4">
                <div>
                  <label className={labelClass}>Doctor</label>
                  <select name="doctor" required className={inputClass} defaultValue="">
                    <option value="" disabled>Select a doctor...</option>
                    {MOCK_DOCTORS.map((d) => (
                      <option key={d.id} value={d.name}>
                        {d.name} · {d.specialty}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Date</label>
                  <input name="date" type="date" required className={inputClass} defaultValue={DEFAULT_DATE} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Start Time</label>
                    <input name="startTime" type="time" required className={inputClass} defaultValue="09:00" />
                  </div>
                  <div>
                    <label className={labelClass}>End Time</label>
                    <input name="endTime" type="time" required className={inputClass} defaultValue="12:00" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Max Patients</label>
                    <input name="maxPatients" type="number" min="1" required className={inputClass} defaultValue={10} />
                  </div>
                  <div>
                    <label className={labelClass}>Consultation Fee (LKR)</label>
                    <input name="fee" type="number" min="0" required className={inputClass} defaultValue={5000} />
                  </div>
                </div>
<div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-5 py-2.5 text-sm font-medium rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg bg-[#00a8cc] text-white hover:bg-[#0092b3] transition"
                  >
                    <Plus className="w-4 h-4" />
                    Create Schedule
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
)}
{/* ── E. Slide-Over: Session Delay Broadcaster ─────────────────── */}
      {selectedScheduleForDelay && (
        <SessionDelayDrawer
          schedule={selectedScheduleForDelay}
          onClose={() => setSelectedScheduleForDelay(null)}
        />
      )}
    </div>
  );
}

// ── E. Delay Broadcaster Slide-Over Panel ────────────────────────────────
function SessionDelayDrawer({ schedule, onClose }) {
  const [duration, setDuration] = useState(DELAY_DURATIONS[1].minutes); // default 30 Mins
  const [sent, setSent] = useState(false);

  const isDelayed = schedule.isDelayed;

  return createPortal(
    <div className="fixed inset-0 z-[120]">
      {/* Dark backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => !sent && onClose()}
      />
      {/* Slide-over panel */}
      <div className="absolute inset-y-0 right-0 w-full max-w-md bg-white dark:bg-slate-800 shadow-2xl border-l border-slate-200 dark:border-slate-700 flex flex-col">
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-700">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Broadcast Session Delay
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              {schedule.doctorName} · {schedule.startTime} - {schedule.endTime}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* Current delay status */}
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40 p-4">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isDelayed ? 'bg-amber-50 dark:bg-amber-500/10' : 'bg-emerald-50 dark:bg-emerald-500/10'}`}>
              <Clock className={`w-4 h-4 ${isDelayed ? 'text-amber-500 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`} />
            </div>
            <div>
              <p className="text-xs text-slate-400 dark:text-slate-500">Current Delay Status</p>
              {isDelayed ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-600 dark:text-amber-400">
                  Delayed by {schedule.delayMinutes} minutes
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  On Time
                </span>
              )}
            </div>
          </div>

          {/* Delay duration selector */}
          <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 tracking-wide uppercase mt-6 mb-3">
            Select Delay Duration
          </p>
          <div className="grid grid-cols-4 gap-2.5">
            {DELAY_DURATIONS.map((d) => (
              <button
                key={d.minutes}
                type="button"
                onClick={() => { setDuration(d.minutes); setSent(false); }}
                className={`px-2 py-2.5 rounded-lg text-sm font-semibold border transition ${
                  duration === d.minutes
                    ? 'bg-[#00a8cc] text-white border-[#00a8cc]'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-[#00a8cc] hover:text-[#0092b3]'
                }`}
              >
                {d.minutes >= 60 ? '1 Hour' : `${d.minutes} Mins`}
              </button>
            ))}
          </div>

          {/* Broadcast summary notice */}
          <div className="mt-6 flex gap-3 rounded-xl bg-[#e0f5f8] dark:bg-cyan-500/10 border border-[#00a8cc]/20 p-4">
            <Megaphone className="w-5 h-5 text-[#00a8cc] dark:text-cyan-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              This will automatically update patient queues and dispatch in-app
              notifications to patients waiting for this session.
            </p>
          </div>
        </div>

        <div className="px-6 py-5 border-t border-slate-100 dark:border-slate-700">
          <button
            type="button"
            disabled={sent}
            onClick={() => setSent(true)}
            className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#00a8cc] text-white font-medium hover:bg-[#0092b3] disabled:opacity-70 transition"
          >
            {sent ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Delay Broadcast Sent ✓
              </>
            ) : (
              <>
                <Megaphone className="w-4 h-4" />
                Broadcast Live Delay
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}