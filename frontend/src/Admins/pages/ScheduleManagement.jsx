import { useEffect, useMemo, useRef, useState } from 'react';
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
  CheckCircle2,
  Clock,
  Loader2,
  AlertCircle,
  Trash2,
} from 'lucide-react';

import {
  fetchAdminSchedules,
  createSchedule,
  fetchAdminDoctors,
  deleteSchedule,
  broadcastSessionDelay,
} from '../../components/api/adminScheduleApi';

// ── Today helpers (local YYYY-MM-DD) ──────────────────────────────────
// All date comparisons use plain YYYY-MM-DD strings so `>=` correctly
// means "today or a future day" without timezone-shift bugs.
const toDateStr = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;

const getTodayStr = () => toDateStr(new Date());

// NOTE: This page intentionally has NO mock/offline fallback data. Every row
// rendered here comes from the backend (`doctor_schedules`), so a failed fetch
// surfaces as an empty state + error toast instead of fake records that look
// like real database rows.

// Doctor list for the "Add Schedule" modal dropdown is loaded from
// GET /api/admin/doctors — no mock fallback (see note above).

const DELAY_DURATIONS = [
  { label: '15 Mins', minutes: 15 },
  { label: '30 Mins', minutes: 30 },
  { label: '45 Mins', minutes: 45 },
  { label: '1 Hour', minutes: 60 },
];

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

// Converts a TIME value (HH:MM:SS or HH:MM, 24-hour) into a 12-hour label.
// e.g. '10:30:00' -> '10:30 AM'
const formatTime = (timeStr) => {
  if (!timeStr) return '—';
  const parts = String(timeStr).split(':').map(Number);
  const hours = parts[0];
  const minutes = parts[1];
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return timeStr;
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${String(minutes).padStart(2, '0')} ${period}`;
};
export default function ScheduleManagement() {
  // Real local today — the single source of truth for all date comparisons.
  const [todayStr] = useState(() => getTodayStr());
  const [schedules, setSchedules] = useState([]);
  const [loadingSchedules, setLoadingSchedules] = useState(true);
  const [doctors, setDoctors] = useState([]); // loaded from GET /api/admin/doctors
  const [searchQuery, setSearchQuery] = useState('');
  // View toggle: 'all' (default) = today + future, 'today' = today only.
  const [viewMode, setViewMode] = useState('all');
  // Specific-date narrowing. '' = no specific date picked.
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedScheduleForDelay, setSelectedScheduleForDelay] = useState(null);

  // ── Delete confirmation target ────────────────────────────────────────
  const [scheduleToDelete, setScheduleToDelete] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Guard against double-submits on the create button (fires before the async
  // work starts, so rapid/multiple clicks can only ever send one request).
  const [submittingCreate, setSubmittingCreate] = useState(false);
  const submittingRef = useRef(false);

  // ── Toast notification (popup for create schedule success / error) ────
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  // Clear any pending auto-close timer on unmount
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // Shows a top-of-screen popup that auto-closes after ~2.8s.
  const showToast = (message, type = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 2800);
  };

  // ── Load schedules + approved doctors from the backend ───────────────
  // Reused on mount and after a create so the table always reflects the
  // server's computed values (walkIns, capacity, isBooked) — never a
  // locally-guessed row.
  const loadSchedules = async () => {
    try {
      const [scheduleData, doctorData] = await Promise.all([
        fetchAdminSchedules(),
        fetchAdminDoctors(),
      ]);

      const mapped = (scheduleData || []).map((s) => ({
        id: s.id,
        doctorName: s.doctorName || 'Unknown Doctor',
        doctorSpecialty: s.specialty || '',
        doctorAvatar: (s.doctorName || '')
          .replace('Dr. ', '')
          .split(' ')
          .map((w) => w && w[0])
          .join('')
          .toUpperCase(),
        availableDate: s.availableDate,
        startTime: formatTime(s.startTime),
        endTime: formatTime(s.endTime),
        consultationFee: Number(s.consultationFee ?? 0),
        maxPatients: Number(s.maxPatients ?? 1),
        currentAppointments: Number(s.currentAppointment ?? 0),
        walkIns: Number(s.walkIns ?? 0),
        isDelayed: Boolean(s.isDelayed),
        delayMinutes: Number(s.delayMinutes ?? 0),
        isBooked: Boolean(s.isBooked),
      }));

      setSchedules(mapped);
      setDoctors(Array.isArray(doctorData) ? doctorData : []);
      return true;
    } catch {
      // No mock fallback: clear the table so the empty state shows and the
      // admin knows the data could not be read (nothing is silently faked).
      setSchedules([]);
      showToast('Could not load schedules from the server. Please retry.', 'error');
      return false;
    } finally {
      setLoadingSchedules(false);
    }
  };

  useEffect(() => {
    // Async IIFE keeps setState out of the synchronous effect body
    // (react-hooks/set-state-in-effect).
    (async () => {
      await loadSchedules();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // ── Today + upcoming only ──────────────────────────────────────────
  // Past schedules (availableDate < today) are never shown or counted.
  // String comparison works because dates are YYYY-MM-DD.
  const upcomingSchedules = useMemo(
    () => schedules.filter((s) => s.availableDate >= todayStr),
    [schedules, todayStr]
  );

  const todaySessions = upcomingSchedules.filter(
    (s) => s.availableDate === todayStr
  ).length;
  const avgFill =
    upcomingSchedules.length === 0
      ? 0
      : Math.round(
          upcomingSchedules.reduce(
            (sum, s) => sum + (s.currentAppointments / s.maxPatients) * 100,
            0
          ) / upcomingSchedules.length
        );
  const activeDelays = upcomingSchedules.filter((s) => s.isDelayed).length;
  const totalWaitlisted = upcomingSchedules.reduce(
    (sum, s) => sum + Math.max(0, s.maxPatients - s.currentAppointments),
    0
  );

  // ── Filtering ──────────────────────────────────────────────────────
  const filteredSchedules = useMemo(() => {
    return upcomingSchedules.filter((s) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        s.doctorName.toLowerCase().includes(q) ||
        s.doctorSpecialty.toLowerCase().includes(q);

      // Priority: specific picked date > Today toggle > All upcoming.
      const matchesDate = dateFilter
        ? s.availableDate === dateFilter
        : viewMode === 'today'
          ? s.availableDate === todayStr
          : s.availableDate >= todayStr;

      let matchesStatus = true;
      if (statusFilter === 'delayed') matchesStatus = s.isDelayed;
      else if (statusFilter === 'on-time') matchesStatus = !s.isDelayed;
      else if (statusFilter === 'booked') matchesStatus = s.isBooked;

      return matchesSearch && matchesDate && matchesStatus;
    });
  }, [upcomingSchedules, searchQuery, dateFilter, viewMode, todayStr, statusFilter]);

  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);

    // The dropdown now submits the doctor's UUID (option value={d.id}) so the
    // backend can resolve doctor_profiles directly — no name matching, which
    // broke for duplicate doctor names.
    const doctorId = form.get('doctor');
    const doctor = doctors.find((d) => d.id === doctorId);

    const payload = {
      doctor_id: doctorId || null,
      available_date: form.get('date') || todayStr,
      start_time: form.get('startTime') || '09:00',
      end_time: form.get('endTime') || '12:00',
      consultation_fee: Number(form.get('fee')) || 0,
      max_patients: Number(form.get('maxPatients')) || 1,
    };

    if (!doctorId || !doctor) {
      showToast('Please select a valid doctor.', 'error');
      return;
    }

    // Past dates are not allowed — only today and future days.
    if (payload.available_date < todayStr) {
      showToast('Cannot create a schedule in the past. Please pick today or a future date.', 'error');
      return;
    }

    // Double-click / rapid-click guard: only ever send ONE request.
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmittingCreate(true);

    try {
      await createSchedule(payload);

      // Re-read from the server so the row carries the authoritative values
      // (walkIns, currentAppointment, isBooked, delay state) instead of a
      // locally-guessed copy.
      await loadSchedules();
      setIsAddModalOpen(false);
      showToast(
        `Schedule created successfully for ${doctor.name} on ${formatDate(
          payload.available_date
        )}.`
      );
    } catch (err) {
      showToast(err.message || 'Failed to create schedule.', 'error');
    } finally {
      submittingRef.current = false;
      setSubmittingCreate(false);
    }
  };

  // ── Delete an existing schedule (hard delete; cascades appointments) ──
  const handleDeleteSchedule = async (schedule) => {
    setDeletingId(schedule.id);
    try {
      await deleteSchedule(schedule.id);
      setSchedules((prev) => prev.filter((s) => s.id !== schedule.id));
      setScheduleToDelete(null);
      showToast(`Schedule for ${schedule.doctorName} deleted successfully.`);
    } catch (err) {
      showToast(err.message || 'Failed to delete schedule.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  // ── Reset the form when the "Add Schedule" modal is (re)opened ───────
  const openAddModal = () => {
    setIsAddModalOpen(true);
    setSubmittingCreate(false);
    submittingRef.current = false;
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
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-[#00a8cc] text-white hover:bg-[#0092b3] active:scale-95 transition"
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
          {/* All Upcoming / Today toggle — default is All Upcoming */}
          <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/60 p-1">
            <button
              type="button"
              onClick={() => {
                setViewMode('all');
                setDateFilter('');
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                viewMode === 'all' && !dateFilter
                  ? 'bg-[#00a8cc] text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              All Upcoming
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode('today');
                setDateFilter('');
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                viewMode === 'today' && !dateFilter
                  ? 'bg-[#00a8cc] text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              Today
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFilter}
              min={todayStr}
              onChange={(e) => setDateFilter(e.target.value)}
              title="Jump to a specific upcoming day (today or later)"
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/60 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#00a8cc]/20 focus:border-[#00a8cc]/70 transition"
            />
            {dateFilter && (
              <button
                type="button"
                onClick={() => setDateFilter('')}
                title="Clear date and show all upcoming"
                className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
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
          <table className="w-full text-sm min-w-[880px]">
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
                          {s.walkIns > 0 && (
                            <span className="ml-1.5 text-[10px] font-semibold text-[#0092b3] dark:text-cyan-300">
                              ({s.walkIns} walk-in{s.walkIns > 1 ? 's' : ''})
                            </span>
                          )}
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
                          title="Delete Schedule"
                          aria-label="Delete Schedule"
                          onClick={() => setScheduleToDelete(s)}
                          className="p-2 rounded-lg text-slate-400 dark:text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 active:scale-90 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {loadingSchedules && filteredSchedules.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="w-6 h-6 text-[#00a8cc] animate-spin" />
                      <p className="text-sm text-slate-400 dark:text-slate-500">
                        Loading schedules...
                      </p>
                    </div>
                  </td>
                </tr>
              )}
              {!loadingSchedules && filteredSchedules.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <p className="text-sm text-slate-400 dark:text-slate-500">
                      {schedules.length === 0
                        ? 'No schedules found. Use "Add New Schedule" to create the first slot.'
                        : 'No schedules match your filters.'}
                    </p>
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
                  <select
                    name="doctor"
                    required
                    className={inputClass}
                    defaultValue=""
                    disabled={doctors.length === 0}
                  >
                    <option value="" disabled>
                      {doctors.length === 0 ? 'No approved doctors available' : 'Select a doctor...'}
                    </option>
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} · {d.specialty}
                      </option>
                    ))}
                  </select>
                  {doctors.length === 0 && (
                    <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      No approved doctors available — approve a doctor first, then add a schedule.
                    </p>
                  )}
                </div>

                <div>
                  <label className={labelClass}>Date</label>
                  <input name="date" type="date" required className={inputClass} defaultValue={todayStr} min={todayStr} />
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
                    disabled={submittingCreate || doctors.length === 0}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg bg-[#00a8cc] text-white hover:bg-[#0092b3] active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed disabled:pointer-events-none transition"
                  >
                    {submittingCreate ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Create Schedule
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
)}
{/* ── D2. Delete Confirmation Modal ──────────────────────────────── */}
      {scheduleToDelete &&
        createPortal(
          <div className="fixed inset-0 z-[125] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => !deletingId && setScheduleToDelete(null)}
            />
            <div className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl">
              <div className="px-6 pt-6 pb-4">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center flex-shrink-0">
                    <Trash2 className="w-5 h-5 text-rose-500 dark:text-rose-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      Delete Schedule?
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Delete the <span className="font-medium text-slate-700 dark:text-slate-200">{scheduleToDelete.doctorName}</span> slot on{" "}
                      <span className="text-slate-700 dark:text-slate-200">
                        {formatDate(scheduleToDelete.availableDate)} · {scheduleToDelete.startTime} - {scheduleToDelete.endTime}
                      </span>
                      ? This will permanently remove the schedule along with any
                      booked appointments and waitlists.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 px-6 py-5 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setScheduleToDelete(null)}
                  disabled={deletingId === scheduleToDelete.id}
                  className="px-5 py-2.5 text-sm font-medium rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-60 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteSchedule(scheduleToDelete)}
                  disabled={deletingId === scheduleToDelete.id}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg bg-rose-600 text-white hover:bg-rose-700 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed disabled:pointer-events-none transition"
                >
                  {deletingId === scheduleToDelete.id ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete Schedule
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
{/* ── E. Slide-Over: Session Delay Broadcaster ─────────────────── */}
      {selectedScheduleForDelay && (
        <SessionDelayDrawer
          schedule={selectedScheduleForDelay}
          onClose={() => setSelectedScheduleForDelay(null)}
          onBroadcasted={(updatedSchedule, count) => {
            if (updatedSchedule) {
              const delayMinutes = Number(updatedSchedule.delayMinutes ?? 0);
              const isDelayed = Boolean(updatedSchedule.isDelayed ?? delayMinutes > 0);
              setSchedules((prev) =>
                prev.map((s) =>
                  s.id === selectedScheduleForDelay.id ? { ...s, isDelayed, delayMinutes } : s
                )
              );
              setSelectedScheduleForDelay((prev) => (prev ? { ...prev, isDelayed, delayMinutes } : prev));
            }
            showToast(`Delay broadcast sent — ${count} patient${count === 1 ? '' : 's'} + doctor notified.`, 'success');
          }}
        />
      )}

      {/* ── F. Toast Notification (create schedule success / error) ─── */}
      {toast &&
        createPortal(
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[130] pointer-events-none">
            <div
              className={`flex items-center gap-2.5 px-5 py-3.5 rounded-xl text-white shadow-2xl border text-sm font-semibold animate-toast-in ${
                toast.type === 'error'
                  ? 'bg-rose-600 border-rose-500'
                  : 'bg-emerald-600 border-emerald-500'
              }`}
            >
              {toast.type === 'error' ? (
                <AlertCircle className="w-4 h-4" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              {toast.message}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

// ── E. Delay Broadcaster Slide-Over Panel ────────────────────────────────
// Persists the delay on doctor_schedules and notifies booked patients +
// doctor via POST /api/admin/schedules/:id/broadcast-delay.
function SessionDelayDrawer({ schedule, onClose, onBroadcasted }) {
  const [duration, setDuration] = useState(DELAY_DURATIONS[1].minutes); // default 30 Mins
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [notifiedCount, setNotifiedCount] = useState(0);

  const isDelayed = schedule.isDelayed;

  const handleBroadcast = async () => {
    setSending(true);
    setSendError('');
    try {
      const result = await broadcastSessionDelay(schedule.id, duration);
      const count = result?.data?.notifiedCount ?? 0;
      setNotifiedCount(count);
      setSent(true);
      if (onBroadcasted) onBroadcasted(result?.data?.schedule || null, count);
    } catch (err) {
      setSendError(err.message || 'Failed to broadcast delay.');
    } finally {
      setSending(false);
    }
  };

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
              This will save the delay on the schedule and dispatch in-app
              notifications to booked patients for this session, plus the doctor.
            </p>
          </div>

          {sendError && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-500/10 px-4 py-3 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {sendError}
            </div>
          )}

          {sent && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-200 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3 text-xs text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              Delay broadcast sent — {notifiedCount} patient{notifiedCount === 1 ? '' : 's'} + doctor notified.
            </div>
          )}
        </div>

        <div className="px-6 py-5 border-t border-slate-100 dark:border-slate-700">
          <button
            type="button"
            disabled={sending || sent}
            onClick={handleBroadcast}
            className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#00a8cc] text-white font-medium hover:bg-[#0092b3] disabled:opacity-70 transition"
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Broadcasting...
              </>
            ) : sent ? (
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