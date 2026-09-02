// src/Admins/pages/QueueManagement.jsx
// Admin "Queue Management" page — split screen (live queue stage | today's
// schedules). Wired to the live backend via components/api/adminQueueApi.js
// (GET /api/admin/queue/today, GET /api/admin/queue/:scheduleId and
// PATCH /api/admin/queue/:appointmentId/complete). Data is always fetched
// from the backend — there is no mock fallback.
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarClock,
  Clock,
  ListOrdered,
  Radio,
  Stethoscope,
  UserRound,
} from 'lucide-react';

import {
  fetchTodayQueues,
  fetchQueueSession,
  markAppointmentCompleted,
} from '../../components/api/adminQueueApi';

const MINUTE = 60 * 1000;
const AUTO_ACTIVATE_WITHIN = 5 * MINUTE; // requirement #4

// -----------------------------------------------
// Helpers / style maps
// -----------------------------------------------

const getSessionStatus = (session, now) => {
  if (now < session.start) return 'Upcoming';
  if (now > session.end) return 'Finished';
  return 'Active';
};

const STATUS_STYLES = {
  Active: 'bg-[#00a8cc] text-white',
  Upcoming: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  Finished: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
};

const PAYMENT_STYLES = {
  Paid: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
  Pending: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
  'Walk-in': 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  Insurance: 'bg-[#e0f5f8] text-[#0092b3] dark:bg-cyan-400/10 dark:text-cyan-300',
};

const fmtTime = (date) =>
  date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const fmtDate = (date) =>
  date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
const fmtRange = (start, end) => `${fmtTime(start)} – ${fmtTime(end)}`;

// Human readable offset for "starts soon" labels
const timeUntil = (target, now) => {
  const mins = Math.round((target - now) / MINUTE);
  if (Math.abs(mins) <= 0) return 'now';
  if (mins > 0) {
    return mins < 60 ? `in ${mins} min` : `in ${Math.round(mins / 60)} hr`;
  }
    return `${Math.abs(mins)} min ago`;
};

/**
 * Maps a backend session header (from GET /queue/today) into the shape this
 * page's layout expects. start/end arrive as ISO strings via JSON and are
 * reified back into Date objects so fmtRange/getSessionStatus keep working.
 * `patients: null` signals "not loaded yet" (the full queue is fetched lazily
 * when the session is selected).
 */
const mapHeaderToSession = (header) => ({
  id: header.id,
  tokenPrefix: header.tokenPrefix || 'A',
  doctor: {
    name: header.doctor?.name || null,
    specialty: header.doctor?.specialty || null,
    room: header.doctor?.room || null,
    avatar: header.doctor?.avatar || null,
  },
  start: new Date(header.start),
  end: new Date(header.end),
  startTime: header.startTime,
  endTime: header.endTime,
  capacity: header.capacity ?? 0,
  bookedCount: header.bookedCount,
  seenCount: header.seenCount,
  status: header.status,
  patients: null,
});

// -----------------------------------------------
// Main component
// -----------------------------------------------

export default function QueueManagement() {
  const [schedules, setSchedules] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [now, setNow] = useState(() => new Date());
  const autoHandled = useRef(new Set());
  const [loadingQueues, setLoadingQueues] = useState(true);

  // Mount: load today's schedules from the backend. The page starts empty
  // (no mock data) and only renders real API responses.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const headers = await fetchTodayQueues();
        if (active) setSchedules(headers.map(mapHeaderToSession));
      } catch (err) {
        console.warn("[Queue] Failed to load today's queues.", err.message);
      } finally {
        if (active) setLoadingQueues(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Live clock — refresh every 30s (statuses & countdown stay current).
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30 * 1000);
    return () => clearInterval(id);
  }, []);

  // Auto-activate (requirement #4): when a session's start is within 5 minutes
  // of "now" (just started or about to start) and the stage is empty or
  // showing a finished session, select & display it automatically. Each session
  // is pulled in at most once (handled set), and a live/upcoming session already
  // on stage is never interrupted.
  useEffect(() => {
    const curSel = schedules.find((s) => s.id === selectedId);
    const curStatus = curSel ? getSessionStatus(curSel, now) : 'Finished';
    if (curStatus === 'Active' || curStatus === 'Upcoming') return;

    const eligible = schedules
      .filter(
        (s) =>
          !autoHandled.current.has(s.id) &&
          getSessionStatus(s, now) !== 'Finished' &&
          (getSessionStatus(s, now) === 'Active' ||
            Math.abs(s.start.getTime() - now.getTime()) <= AUTO_ACTIVATE_WITHIN),
      )
      .sort((a, b) => a.start - b.start);
    if (!eligible.length) return;
    const next = eligible[0];
        autoHandled.current.add(next.id);
    setSelectedId(next.id);
  }, [now, schedules, selectedId]);

  // Lazily load the full patient queue for the selected session the first time
  // it becomes active. Subsequent re-renders reuse the cached patients.
  useEffect(() => {
    if (!selectedId) return;
    const cur = schedules.find((s) => s.id === selectedId);
    if (!cur || cur.patients) return; // already loaded

    let cancelled = false;
    (async () => {
      try {
        const full = await fetchQueueSession(selectedId);
        if (cancelled) return;
        setSchedules((prev) =>
          prev.map((s) =>
            s.id === selectedId
              ? {
                  ...full,
                  start: new Date(full.start),
                  end: new Date(full.end),
                  tokenPrefix: s.tokenPrefix,
                }
              : s,
          ),
        );
      } catch (err) {
        console.warn('[Queue] Could not load session queue.', err.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId, schedules]);

  const liveSessions = useMemo(
    () => schedules.map((s) => ({ ...s, status: getSessionStatus(s, now) })),
    [schedules, now],
  );
  const selected = liveSessions.find((s) => s.id === selectedId);

  const handleMarkCompleted = async (patient) => {
    if (!selected || !patient) return;
    // Optimistic local update — mark the row complete immediately.
    setSchedules((prev) =>
      prev.map((s) =>
        s.id === selected.id
          ? {
              ...s,
              // Keep the right-hand list's "seen" counter in sync with the
              // optimistic patient update.
              seenCount:
                typeof s.seenCount === 'number' ? s.seenCount + 1 : s.seenCount,
              patients: s.patients.map((p) =>
                p.id === patient.id ? { ...p, completed: true } : p,
              ),
            }
          : s,
      ),
    );
    // Persist to the backend. Failures are non-fatal (optimistic already
    // applied), but we log so the session can be reconciled if needed.
    try {
      await markAppointmentCompleted(patient.id);
    } catch (err) {
      console.warn('[Queue] Failed to mark appointment completed.', err.message);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Queue Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Live view of today's doctor queues. Click a schedule on the right to
            load it onto the stage.
          </p>
        </div>
        <div className="text-right text-xs text-slate-500 dark:text-slate-400">
          <p className="font-medium text-slate-700 dark:text-slate-300">
            {fmtDate(now)}
          </p>
                    <p>{fmtTime(now)}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-cyan-50 text-cyan-700 dark:bg-cyan-400/10 dark:text-cyan-300">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
          {loadingQueues ? 'Loading data' : 'Live data'}
        </span>
      </div>

      {/* Split screen: Live Queue Stage (left) | Today's Schedules (right) */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5 xl:items-start">
                <div className="xl:col-span-3">
          {selected ? (
            selected.patients ? (
              <ActiveSessionCard
                session={selected}
                now={now}
                onMarkCompleted={handleMarkCompleted}
              />
            ) : (
              <LoadingQueueCard session={selected} />
            )
          ) : (
            <EmptyStageCard />
                    )}
        </div>
        <div className="xl:col-span-2">
          <TodayScheduleList
            sessions={liveSessions}
            selectedId={selectedId}
            onSelect={(id) => {
              autoHandled.current.add(id); // manual click opts out of auto-activate
              setSelectedId(id);
            }}
            now={now}
            loading={loadingQueues}
          />
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------
// Shared — doctor avatar with initials fallback
// (live data may have no doctor_image, or even a name)
// -----------------------------------------------

function DoctorAvatar({ name, src, className }) {
  if (src) {
    return <img src={src} alt={name || 'Doctor'} className={className} />;
  }
  const initials = (name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');
  return (
    <div
      role="img"
      aria-label={name || 'Doctor'}
      className={`${className} flex items-center justify-center bg-gradient-to-br from-[#00a8cc] to-[#00728f] font-semibold text-white select-none`}
    >
      {initials || <Stethoscope className="w-1/2 h-1/2 opacity-80" />}
    </div>
  );
}

// -----------------------------------------------
// Left pane — active session stage
// -----------------------------------------------

function StatusPill({ status, session, now }) {
  if (status === 'Active') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-[#00a8cc] text-white">
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />
        LIVE
      </span>
    );
  }
  if (status === 'Finished') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-slate-400 text-white">
        Finished
      </span>
    );
  }
  const startingSoon = session.start - now <= AUTO_ACTIVATE_WITHIN && session.start - now > 0;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-amber-400 text-white">
      {startingSoon ? 'Starting Soon' : 'Upcoming'}
    </span>
  );
}

function ActiveSessionCard({ session, now, onMarkCompleted }) {
  const { doctor, status } = session;
  const completed = session.patients.filter((p) => p.completed).length;
  const total = session.patients.length;
  const pct = total ? Math.round((completed / total) * 100) : 0;
  const waiting = total - completed;
  const paid = session.patients.filter((p) => p.payment === 'Paid').length;
  // Walk-ins have no payment record — exclude them from the Unpaid tally.
  const pending = session.patients.filter(
    (p) => p.payment !== 'Paid' && p.payment !== 'Walk-in'
  ).length;
  const canEdit = status === 'Active';
  const startingSoon =
    status === 'Upcoming' && session.start - now <= AUTO_ACTIVATE_WITHIN && session.start - now > 0;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      {/* Doctor header */}
      <div className="flex items-center justify-between gap-4 p-5 border-b border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-4 min-w-0">
          <DoctorAvatar
            name={doctor.name}
            src={doctor.avatar}
            className="w-14 h-14 rounded-xl object-cover flex-shrink-0 ring-2 ring-[#e0f5f8] dark:ring-slate-700"
          />
          <div className="min-w-0">
            <h2 className="font-semibold text-slate-900 dark:text-slate-100 text-lg">
              {doctor.name || 'Doctor'}
            </h2>
            {doctor.specialty && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {doctor.specialty}
              </p>
            )}
            {doctor.room && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {doctor.room}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill status={status} session={session} now={now} />
          <Stethoscope className="w-5 h-5 text-[#00a8cc] dark:text-cyan-400" />
        </div>
      </div>

      {/* Time slot */}
      <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2 text-sm">
        <CalendarClock className="w-4 h-4 text-slate-400 dark:text-slate-500" />
        <span className="text-slate-700 dark:text-slate-300 font-medium">
          {fmtRange(session.start, session.end)}
        </span>
        {startingSoon && (
          <>
            <span className="text-slate-400 dark:text-slate-500">·</span>
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
              Starts {timeUntil(session.start, now)}
            </span>
          </>
        )}
      </div>

      {/* Progress bar */}
      <div className="px-5 pt-4 pb-3 border-b border-slate-100 dark:border-slate-700">
        <div className="flex items-baseline justify-between text-sm mb-2">
          <span className="text-slate-600 dark:text-slate-300">
            {completed} / {total} Completed
          </span>
          <span
            className={`font-semibold ${
              pct === 100
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-[#00a8cc] dark:text-cyan-400'
            }`}
          >
            {pct}%
          </span>
        </div>
        <div className="h-3 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              pct === 100 ? 'bg-emerald-500' : 'bg-[#00a8cc]'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex gap-4 mt-2 text-xs text-slate-500 dark:text-slate-400">
          <span>Waiting: {waiting}</span>
          <span>·</span>
          <span>Paid: {paid}</span>
          <span>·</span>
          <span>Unpaid: {pending}</span>
        </div>
        {pct === 100 && status === 'Active' && (
          <p className="mt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            ✓ All appointments seen — session complete.
          </p>
        )}
      </div>

      {/* Queue table */}
      <QueueTable
        session={session}
        now={now}
        canEdit={canEdit}
        onMarkCompleted={onMarkCompleted}
      />
    </div>
  );
}

// -----------------------------------------------
// Left pane — patient queue table
// -----------------------------------------------

function QueueTable({ session, now, canEdit, onMarkCompleted }) {
  const status = getSessionStatus(session, now);

  return (
    <div className="p-3">
      <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 tracking-wide mb-2">
        {status === 'Active'
          ? 'ACTIVE QUEUE'
          : status === 'Finished'
            ? 'QUEUE HISTORY'
            : 'UPCOMING QUEUE'}
      </p>
      <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full text-sm min-w-[540px]">
          <thead className="bg-slate-50 dark:bg-slate-900/70">
            <tr>
              <th className="px-3 py-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase text-left">
                Token #
              </th>
              <th className="px-3 py-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase text-left">
                Patient Name
              </th>
              <th className="px-3 py-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase text-left">
                Payment Status
              </th>
              <th className="px-3 py-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase text-right">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {session.patients.map((p) => {
              const isNext = !p.completed;
              return (
                <tr
                  key={p.id}
                  className={`transition-colors ${
                    isNext && canEdit
                      ? 'bg-[#e0f5f8]/50 dark:bg-slate-700/50'
                      : 'bg-white dark:bg-slate-800'
                  }`}
                >
                  <td className="px-3 py-2.5">
                    <code className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      {p.token}
                    </code>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <UserRound className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
                      <span className="flex items-center gap-1.5">
                        {p.name}
                        {p.isWalkIn && (
                          <span className="text-[9px] font-semibold bg-slate-200 text-slate-600 dark:bg-slate-600 dark:text-slate-200 px-1.5 py-0.5 rounded">
                            WALK-IN
                          </span>
                        )}
                        {isNext && canEdit && (
                          <span className="text-[9px] font-semibold bg-[#00a8cc] text-white px-1.5 py-0.5 rounded">
                            NEXT
                          </span>
                        )}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`inline-flex text-xs font-medium px-2 py-0.5 rounded ${PAYMENT_STYLES[p.payment]}`}
                    >
                      {p.payment}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {p.completed ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                        ✓ Seen
                      </span>
                    ) : canEdit ? (
                                            <button
                        onClick={() => onMarkCompleted(p)}
                        className="text-xs font-medium text-[#00a8cc] hover:text-[#0092b3] dark:text-cyan-400 dark:hover:text-cyan-300"
                      >
                        Mark Completed
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        {status === 'Finished' ? 'Ended' : '—'}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table></div>
      </div>
    </div>
  );
}

// -----------------------------------------------
// Left pane — empty state
// -----------------------------------------------

function EmptyStageCard() {
  return (
    <div className="flex flex-col items-center justify-center h-96 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
      <Radio className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
      <h3 className="text-lg font-medium text-slate-700 dark:text-slate-200">
        No session on stage
      </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
        Select a schedule from the right — or wait: a session starting within 5
        minutes auto-loads onto the stage.
      </p>
    </div>
  );
}

// -----------------------------------------------
// Left pane — loading state (session selected but queue not yet fetched)
// -----------------------------------------------

function LoadingQueueCard({ session }) {
  const { doctor, start, end } = session || {};
  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="flex items-center gap-4 p-5 border-b border-slate-100 dark:border-slate-700">
        <DoctorAvatar
          name={doctor?.name}
          src={doctor?.avatar}
          className="w-14 h-14 rounded-xl object-cover flex-shrink-0 ring-2 ring-[#e0f5f8] dark:ring-slate-700"
        />
        <div className="min-w-0">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 text-lg">
            {doctor?.name || '—'}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {doctor?.specialty || '—'}
          </p>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center gap-3 p-6 text-slate-600 dark:text-slate-300">
        <span className="w-5 h-5 border-2 border-[#00a8cc] border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-medium">Loading queue…</span>
      </div>
      <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-700 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
        <CalendarClock className="w-4 h-4 text-slate-400 dark:text-slate-500" />
        <span>{fmtRange(start, end)}</span>
      </div>
    </div>
  );
}

// -----------------------------------------------
// Right pane — today's schedules list
// -----------------------------------------------

function TodayScheduleList({ sessions, selectedId, onSelect, now, loading }) {
  const ordered = [...sessions].sort((a, b) => {
    if (a.status === b.status) return a.start - b.start;
    const rank = { Active: 0, Upcoming: 1, Finished: 2 };
    return rank[a.status] - rank[b.status];
  });
  const upcomingCount = sessions.filter(
    (s) => s.status === 'Active' || s.status === 'Upcoming',
  ).length;
  const finishedCount = sessions.filter((s) => s.status === 'Finished').length;

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <ListOrdered className="w-5 h-5 text-[#00a8cc] dark:text-cyan-400" />
          Today's Schedules
        </h2>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {upcomingCount} upcoming · {finishedCount} finished
        </span>
      </div>
      <div className="space-y-2 overflow-y-auto">
        {ordered.map((s) => {
                    const { doctor, status } = s;
          const booked = s.bookedCount ?? s.patients?.length ?? 0;
          const seen = s.seenCount ?? s.patients?.filter((p) => p.completed).length ?? 0;
          const fillPct = s.capacity ? Math.round((booked / s.capacity) * 100) : 0;
          const isSelected = selectedId === s.id;
          const startingSoon =
            status !== 'Finished' &&
            s.start - now <= AUTO_ACTIVATE_WITHIN &&
            s.start - now > 0;

          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelect(s.id)}
              className={`w-full text-left flex items-center gap-3 p-3 rounded-xl border transition-all ${
                isSelected
                  ? 'border-[#00a8cc] bg-[#e0f5f8]/60 dark:bg-slate-700/50 ring-2 ring-[#00a8cc]/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-[#00a8cc]/40 bg-white dark:bg-slate-800 hover:bg-[#e0f5f8]/30'
              }`}
            >
              <DoctorAvatar
                name={doctor.name}
                src={doctor.avatar}
                className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {doctor.name || 'Doctor'}
                  </p>
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[status]}`}
                  >
                    {status === 'Active' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                    )}
                    {status === 'Active'
                      ? 'Active now'
                      : status === 'Upcoming'
                        ? 'Upcoming'
                        : 'Finished'}
                  </span>
                </div>
                {(doctor.specialty || doctor.room) && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    {[doctor.specialty, doctor.room].filter(Boolean).join(' · ')}
                  </p>
                )}
                <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span>{fmtRange(s.start, s.end)}</span>
                  {startingSoon && (
                    <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                      · Starts {timeUntil(s.start, now)}
                    </span>
                  )}
                </div>
                <div className="mt-1.5">
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#00a8cc] transition-all"
                      style={{
                        width: `${Math.min(fillPct, 100)}%`,
                        opacity: status === 'Finished' ? 0.7 : 1,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    <span>
                      {booked}/{s.capacity} booked · {seen} seen
                    </span>
                    <span>{fillPct}% capacity</span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
        {loading ? (
          <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
            <span className="w-4 h-4 border-2 border-[#00a8cc] border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Loading today's schedules…</span>
          </div>
        ) : (
          ordered.length === 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No schedules booked for today.
            </p>
          )
        )}
      </div>
    </div>
  );
}
