// backend/controllers/queueController.js
// Live queue-management logic for the Admin Queue Management page.
// Exposes today's schedules, a full session queue, and the "mark completed"
// mutation used by the left-hand "Live Queue Stage".
import { supabase } from '../supabase.js';
import { sendReviewRequestNotification } from '../models/appointmentModel.js';

/**
 * Validates a value as a UUID v4 (case-insensitive).
 */
const isValidUuid = (value) => {
  if (typeof value !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
};

/**
 * Formats a TIME column (HH:MM:SS) into a 12-hour label.
 */
const formatTime = (timeStr) => {
  if (!timeStr) return '—';
  const [hours, minutes] = timeStr.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return timeStr;
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${String(minutes).padStart(2, '0')} ${period}`;
};

/**
 * Maps a payment_status value to the UI display label.
 * PAID -> Paid; everything else -> Pending (covers UNPAID / PENDING_SLIP_VERIFICATION).
 */
const mapPaymentStatus = (status) => (status === 'PAID' ? 'Paid' : 'Pending');

/**
 * Combines a schedule's available_date + time-of-day into a local Date.
 */
const parseDateTime = (dateStr, timeStr) =>
  new Date(`${dateStr}T${timeStr || '00:00:00'}`);

const formatWallClockDateTime = (dateStr, timeStr) =>
  `${dateStr}T${timeStr || '00:00:00'}`;

/**
 * Derives the live status of a schedule from "now".
 */
const deriveStatus = (schedule, now) => {
  const start = parseDateTime(schedule.available_date, schedule.start_time);
  const end = parseDateTime(schedule.available_date, schedule.end_time);
  if (now < start) return 'Upcoming';
  if (now > end) return 'Finished';
  return 'Active';
};

/**
 * Builds the doctor sub-object shared by every session payload.
 */
const mapDoctor = (doctor) => ({
  name:
    `${doctor?.first_name || ''} ${doctor?.last_name || ''}`.trim() || null,
  specialty: doctor?.specialties?.name || doctor?.specialization || null,
  // Room is not modeled on doctor_profiles; exposed for the UI layout.
  room: null,
  avatar: doctor?.doctor_image || null,
});

/**
 * GET /api/admin/queue/today
 * Today's schedules (the right-hand "Today's Schedules" list) with doctor
 * details, capacity, booked/seen/missed counts and a derived status.
 *
 * CANCELLED rows are hidden everywhere in Queue Management. MISSED rows are
 * shown (per-slot "missed" tally here, "Missed" rows in the session queue)
 * but excluded from bookedCount — they did not attend.
 *
 * Response shape per session:
 *   { id, tokenPrefix, doctor{ name, specialty, room, avatar },
 *     start, end, startTime, endTime, capacity, bookedCount, seenCount,
 *     missedCount, status }  <- start/end are local wall-clock datetimes
 *     without a timezone suffix; status is a hint.
 */
export const getTodayQueue = async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();

    const { data: schedules, error } = await supabase
      .from('doctor_schedules')
      .select(
        `
        id,
        doctor_id,
        available_date,
        start_time,
        end_time,
        max_patients,
        current_appointment,
        doctor_profiles (
          id,
          first_name,
          last_name,
          specialization,
          doctor_image,
          specialties ( id, name )
        )
      `,
      )
      .eq('available_date', today)
      .order('start_time', { ascending: true });

    if (error) throw error;

    const todayIds = (schedules || []).map((s) => s.id);

    // Single extra query to count booked/seen/missed appointments per schedule.
    // CANCELLED is excluded everywhere; MISSED is tallied separately and does
    // NOT count as booked (the patient did not attend).
    const countsBySchedule = {};
    if (todayIds.length > 0) {
      const { data: appts, error: apptErr } = await supabase
        .from('appointments')
        .select('schedule_id, status')
        .in('schedule_id', todayIds)
        .neq('status', 'CANCELLED');
      if (apptErr) {
        console.error('[Queue] appointment count query failed:', apptErr.message);
      } else {
        (appts || []).forEach((a) => {
          const b = (countsBySchedule[a.schedule_id] =
            countsBySchedule[a.schedule_id] || { booked: 0, seen: 0, missed: 0 });
          if (a.status === 'MISSED') {
            b.missed += 1;
          } else {
            b.booked += 1;
            if (a.status === 'COMPLETED') b.seen += 1;
          }
        });
      }
    }

    // Manual walk-ins fold into the matching session (doctor + start_time)
    // so booked/seen/missed counts include admin-added appointments too.
    const { data: walkIns, error: walkInErr } = await supabase
      .from('manual_appointments')
      .select('doctor_id, start_time, status')
      .eq('appointment_date', today)
      .neq('status', 'CANCELLED');

    if (walkInErr) {
      console.error('[Queue] manual appointment count query failed:', walkInErr.message);
    } else {
      for (const w of walkIns || []) {
        if (!w.start_time) continue; // unscheduled walk-ins belong to no session
        const schedule = (schedules || []).find(
          (s) => s.doctor_id === w.doctor_id && s.start_time === w.start_time
        );
        if (!schedule) continue;
        const b = (countsBySchedule[schedule.id] =
          countsBySchedule[schedule.id] || { booked: 0, seen: 0, missed: 0 });
        if (w.status === 'MISSED') {
          b.missed += 1;
        } else {
          b.booked += 1;
          if (w.status === 'COMPLETED') b.seen += 1;
        }
      }
    }

    const sessions = (schedules || []).map((s, idx) => {
      const counts = countsBySchedule[s.id] || {
        booked: s.current_appointment ?? 0,
        seen: 0,
        missed: 0,
      };
      return {
        id: s.id,
        tokenPrefix: String.fromCharCode(65 + idx), // A, B, C ...
        doctor: mapDoctor(s.doctor_profiles),
        start: formatWallClockDateTime(s.available_date, s.start_time),
        end: formatWallClockDateTime(s.available_date, s.end_time),
        startTime: s.start_time,
        endTime: s.end_time,
        capacity: s.max_patients ?? 0,
        bookedCount: counts.booked,
        seenCount: counts.seen,
        missedCount: counts.missed || 0,
        status: deriveStatus(s, now),
        patients: null, // signal: load full queue on selection
      };
    });

    res.json({ success: true, data: { sessions, now: now.toISOString() } });
  } catch (error) {
    console.error('Error in getTodayQueue:', error);
    next(error);
  }
};

/**
 * GET /api/admin/queue/:scheduleId
 * Full queue for a single schedule — the data backing the left "Live Queue Stage".
 *
 * CANCELLED appointments are hidden (never enter the queue). MISSED
 * appointments ARE shown per time slot with missed:true so admins can see
 * no-shows inline instead of wondering where the patient went.
 *
 * Response shape:
 *   { session: { id, tokenPrefix, doctor{ name, specialty, room, avatar },
 *     start, end, startTime, endTime, capacity, status,
 *     patients: [ { id, token, name, payment, completed, missed, status } ] } }
 */
export const getQueueSession = async (req, res, next) => {
  try {
    const { scheduleId } = req.params;
    if (!isValidUuid(scheduleId)) {
      return res
        .status(400)
        .json({ success: false, message: 'scheduleId must be a valid UUID.' });
    }
    const now = new Date();

    const { data: schedule, error: schedErr } = await supabase
      .from('doctor_schedules')
      .select(
        `
        id,
        available_date,
        start_time,
        end_time,
        max_patients,
        current_appointment,
        doctor_profiles (
          id,
          first_name,
          last_name,
          specialization,
          doctor_image,
          specialties ( id, name )
        )
      `,
      )
      .eq('id', scheduleId)
      .maybeSingle();

    if (schedErr) throw schedErr;
    if (!schedule) {
      return res
        .status(404)
        .json({ success: false, message: 'Schedule not found.' });
    }

    const { data: appts, error: apptErr } = await supabase
      .from('appointments')
      .select(
        `
        id,
        booking_type,
        status,
        created_at,
        patient_profiles ( first_name, last_name ),
        beneficiaries ( full_name, relationship ),
        payments ( payment_status, amount, payment_method )
      `,
      )
      .eq('schedule_id', scheduleId)
      .neq('status', 'CANCELLED')
      .order('created_at', { ascending: true });

    if (apptErr) throw apptErr;

            const patients = (appts || []).map((a, i) => {
      let name = '—';
      if (a.booking_type === 'BENEFICIARY' && a.beneficiaries?.full_name) {
        name = a.beneficiaries.full_name;
      } else if (a.patient_profiles) {
        name =
          `${a.patient_profiles.first_name || ''} ${
            a.patient_profiles.last_name || ''
          }`.trim() || '—';
      }
      const isMissed = a.status === 'MISSED';
      return {
        id: a.id,
        token: `A-${String(i + 1).padStart(2, '0')}`,
        name,
        payment: mapPaymentStatus(a.payments?.payment_status),
        completed: a.status === 'COMPLETED',
        missed: isMissed,
        status: a.status,
      };
    });

    // Manual walk-ins booked into this slot (doctor + date + start_time) are
    // appended after the regular patients so the live queue shows both.
    const { data: walkIns, error: walkInErr } = await supabase
      .from('manual_appointments')
      .select('id, patient_first_name, patient_last_name, status, created_at')
      .eq('doctor_id', schedule.doctor_profiles.id)
      .eq('appointment_date', schedule.available_date)
      .eq('start_time', schedule.start_time)
      .neq('status', 'CANCELLED')
      .order('created_at', { ascending: true });

    if (walkInErr) throw walkInErr;

    for (const w of walkIns || []) {
      const isMissed = w.status === 'MISSED';
      patients.push({
        id: w.id,
        token: `A-${String(patients.length + 1).padStart(2, '0')}`,
        name:
          `${w.patient_first_name || ''} ${w.patient_last_name || ''}`.trim() || '—',
        payment: 'Walk-in',
        completed: w.status === 'COMPLETED',
        missed: isMissed,
        status: w.status,
        isWalkIn: true,
      });
    }

    res.json({
      success: true,
      data: {
        session: {
          id: schedule.id,
          tokenPrefix: 'A',
          doctor: mapDoctor(schedule.doctor_profiles),
          start: formatWallClockDateTime(
            schedule.available_date,
            schedule.start_time
          ),
          end: formatWallClockDateTime(
            schedule.available_date,
            schedule.end_time
          ),
          startTime: schedule.start_time,
          endTime: schedule.end_time,
          capacity: schedule.max_patients ?? 0,
          status: deriveStatus(schedule, now),
          patients,
        },
        now: now.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error in getQueueSession:', error);
    next(error);
  }
};

/**
 * PATCH /api/admin/queue/:appointmentId/complete
 * Marks a single appointment (a queue entry) as COMPLETED, which advances the
 * live progress bar on the Queue Management page. MISSED rows are refused —
 * a no-show can only be rebooked, never silently marked seen.
 */
export const completeAppointment = async (req, res, next) => {
  try {
    const { appointmentId } = req.params;
    if (!isValidUuid(appointmentId)) {
      return res
        .status(400)
        .json({ success: false, message: 'appointmentId must be a valid UUID.' });
    }

    const { data, error } = await supabase
      .from('appointments')
      .update({ status: 'COMPLETED' })
      .eq('id', appointmentId)
      .in('status', ['PENDING', 'CONFIRMED'])
      .select('id, status')
      .maybeSingle();

    if (error) throw error;

    let completedId = data?.id;
    let completedStatus = data?.status;

    // Not a public appointment — fall back to manual walk-ins so admins can
    // advance walk-in queue entries too. Terminal rows (incl. MISSED) stay put.
    if (!completedId) {
      const { data: manual, error: manualErr } = await supabase
        .from('manual_appointments')
        .update({ status: 'COMPLETED' })
        .eq('id', appointmentId)
        .in('status', ['PENDING', 'CONFIRMED'])
        .select('id, status')
        .maybeSingle();

      if (manualErr) throw manualErr;
      completedId = manual?.id;
      completedStatus = manual?.status;
    }

    if (!completedId) {
      return res
        .status(409)
        .json({ success: false, message: 'Only pending/confirmed queue entries can be marked completed (missed or cancelled visits cannot).' });
    }

    // Fire-and-forget review request for public appointments (walk-ins have
    // no patient account to notify). Idempotent + never throws.
    if (data?.id) sendReviewRequestNotification(completedId);

    res.json({
      success: true,
      data: { appointmentId: completedId, status: completedStatus },
    });
  } catch (error) {
    console.error('Error in completeAppointment:', error);
    next(error);
  }
};
