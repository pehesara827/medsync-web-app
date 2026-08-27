import { supabase } from '../supabase.js';
import { createNotification } from '../models/notificationModel.js';

/**
 * Validates whether a value is a well-formed UUID (v1-v5 hexadecimal form).
 * @param {*} value
 * @returns {boolean}
 */
const isValidUuid = (value) => {
  if (typeof value !== 'string') return false;
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
};

/**
 * Validates a calendar date string in YYYY-MM-DD form.
 * @param {*} value
 * @returns {boolean}
 */
const isValidDate = (value) => {
  if (typeof value !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return !Number.isNaN(new Date(`${value}T00:00:00`).getTime());
};

/**
 * Validates a time-of-day string in HH:MM or HH:MM:SS (24-hour) form.
 * @param {*} value
 * @returns {boolean}
 */
const isValidTime = (value) => {
  if (typeof value !== 'string') return false;
  return /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/.test(value);
};

/**
 * Formats a TIME column (HH:MM:SS or HH:MM) into a 12-hour label.
 * @param {string} timeStr - e.g. '10:30:00'
 * @returns {string} e.g. '10:30 AM'
 */
const formatTime = (timeStr) => {
  if (!timeStr) return '—';
  const parts = timeStr.split(':').map(Number);
  const hours = parts[0];
  const minutes = parts[1];
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return timeStr;
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${String(minutes).padStart(2, '0')} ${period}`;
};
/**
 * GET /api/schedules
 * Returns doctor schedules, optionally filtered by doctor_id and/or a
 * start_date–end_date range. Sorted by available_date, start_time ascending.
 *
 * Query params:
 *   doctor_id  (UUID)  – only schedules for this doctor
 *   start_date (YYYY-MM-DD) – lower bound on available_date
 *   end_date   (YYYY-MM-DD) – upper bound on available_date
 */
export const getDoctorSchedules = async (req, res, next) => {
  try {
    const { doctor_id, start_date, end_date } = req.query;

    if (doctor_id && !isValidUuid(doctor_id)) {
      return res
        .status(400)
        .json({ success: false, message: 'doctor_id must be a valid UUID.' });
    }
    if (start_date && !isValidDate(start_date)) {
      return res
        .status(400)
        .json({ success: false, message: 'start_date must be a valid date (YYYY-MM-DD).' });
    }
    if (end_date && !isValidDate(end_date)) {
      return res
        .status(400)
        .json({ success: false, message: 'end_date must be a valid date (YYYY-MM-DD).' });
    }
    if (start_date && end_date && start_date > end_date) {
      return res
        .status(400)
        .json({ success: false, message: 'start_date must be on or before end_date.' });
    }

    let query = supabase
      .from('doctor_schedules')
      .select(
        `
        id,
        doctor_id,
        available_date,
        start_time,
        end_time,
        consultation_fee,
        max_patients,
        current_appointment,
        is_booked,
        is_delayed,
        delay_minutes,
        delay_reported_at,
        doctor_profiles (
          id,
          first_name,
          last_name,
          specialization,
          specialties ( id, name )
        )
      `
      )
      .order('available_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (doctor_id) query = query.eq('doctor_id', doctor_id);
    if (start_date) query = query.gte('available_date', start_date);
    if (end_date) query = query.lte('available_date', end_date);

    const { data: schedules, error } = await query;
    if (error) throw error;

    res.json({ success: true, data: { schedules: schedules || [] } });
  } catch (error) {
    console.error('Error in getDoctorSchedules:', error);
    next(error);
  }
};
/**
 * POST /api/schedules
 * Creates a new schedule slot for a doctor.
 *
 * Body: { doctor_id, available_date, start_time, end_time, consultation_fee?, max_patients? }
 *   - consultation_fee defaults to 0 and must be >= 0
 *   - max_patients defaults to 1 and must be a positive integer
 */
export const createSchedule = async (req, res, next) => {
  try {
    const {
      doctor_id,
      available_date,
      start_time,
      end_time,
      consultation_fee,
      max_patients,
    } = req.body || {};

    // ── doctor_id (UUID) ─────────────────────────────────────────────
    if (!doctor_id) {
      return res
        .status(400)
        .json({ success: false, message: 'doctor_id is required.' });
    }
    if (!isValidUuid(doctor_id)) {
      return res
        .status(400)
        .json({ success: false, message: 'doctor_id must be a valid UUID.' });
    }

    // ── available_date (YYYY-MM-DD) ──────────────────────────────────
    if (!available_date) {
      return res
        .status(400)
        .json({ success: false, message: 'available_date is required.' });
    }
    if (!isValidDate(available_date)) {
      return res
        .status(400)
        .json({ success: false, message: 'available_date must be a valid date (YYYY-MM-DD).' });
    }

    // ── start_time / end_time (HH:MM or HH:MM:SS) ────────────────────
    if (!start_time) {
      return res
        .status(400)
        .json({ success: false, message: 'start_time is required.' });
    }
    if (!isValidTime(start_time)) {
      return res
        .status(400)
        .json({ success: false, message: 'start_time must be in HH:MM or HH:MM:SS (24-hour) format.' });
    }
    if (!end_time) {
      return res
        .status(400)
        .json({ success: false, message: 'end_time is required.' });
    }
    if (!isValidTime(end_time)) {
      return res
        .status(400)
        .json({ success: false, message: 'end_time must be in HH:MM or HH:MM:SS (24-hour) format.' });
    }
    if (end_time <= start_time) {
      return res
        .status(400)
        .json({ success: false, message: 'end_time must be later than start_time.' });
    }

    // ── consultation_fee (non-negative number) ───────────────────────
    const rawFee =
      consultation_fee === undefined || consultation_fee === null || consultation_fee === ''
        ? 0
        : consultation_fee;
    const numericFee = Number(rawFee);
    if (Number.isNaN(numericFee) || numericFee < 0) {
      return res
        .status(400)
        .json({ success: false, message: 'consultation_fee must be a non-negative number.' });
    }

    // ── max_patients (positive integer) ──────────────────────────────
    const rawMax = max_patients === undefined || max_patients === null || max_patients === ''
      ? 1
      : max_patients;
    const numericMax = Number(rawMax);
    if (Number.isNaN(numericMax) || !Number.isInteger(numericMax) || numericMax < 1) {
      return res
        .status(400)
        .json({ success: false, message: 'max_patients must be a positive integer.' });
    }

    // Verify the doctor exists (keeps FK alignment with doctor_profiles)
    const { data: doctor, error: doctorError } = await supabase
      .from('doctor_profiles')
      .select('id')
      .eq('id', doctor_id)
      .maybeSingle();

    if (doctorError) throw doctorError;
    if (!doctor) {
      return res
        .status(404)
        .json({ success: false, message: 'Doctor not found.' });
    }

    // Insert the new schedule slot
    const { data: schedule, error } = await supabase
      .from('doctor_schedules')
      .insert([
        {
          doctor_id,
          available_date,
          start_time,
          end_time,
          consultation_fee: numericFee,
          max_patients: numericMax,
          current_appointment: 0,
          is_booked: false,
          is_delayed: false,
          delay_minutes: 0,
          delay_reported_at: null,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, data: schedule });
  } catch (error) {
    console.error('Error in createSchedule:', error);
    next(error);
  }
};
/**
 * POST /api/schedules/:scheduleId/broadcast-delay
 * Records a delay on a schedule slot and broadcasts a SESSION_DELAY
 * notification to every patient with an active (non-cancelled) appointment
 * on that slot.
 *
 * Body: { minutes }  – non-negative integer (0 clears the delay)
 */
export const broadcastSessionDelay = async (req, res, next) => {
  try {
    const { scheduleId } = req.params;
    const { minutes } = req.body || {};

    // ── Validate scheduleId (UUID) ───────────────────────────────────
    if (!isValidUuid(scheduleId)) {
      return res
        .status(400)
        .json({ success: false, message: 'scheduleId must be a valid UUID.' });
    }

    // ── Validate minutes (non-negative integer) ──────────────────────
    if (minutes === undefined || minutes === null) {
      return res
        .status(400)
        .json({ success: false, message: 'minutes is required.' });
    }
    const delayMinutes = Number(minutes);
    if (Number.isNaN(delayMinutes) || !Number.isInteger(delayMinutes) || delayMinutes < 0) {
      return res
        .status(400)
        .json({ success: false, message: 'minutes must be a non-negative integer.' });
    }

    // 1. Update the schedule's delay fields
    const { data: schedule, error: updateError } = await supabase
      .from('doctor_schedules')
      .update({
        delay_minutes: delayMinutes,
        is_delayed: delayMinutes > 0,
        delay_reported_at: delayMinutes > 0 ? new Date().toISOString() : null,
      })
      .eq('id', scheduleId)
      .select(
        'id, doctor_id, available_date, start_time, end_time, delay_minutes, is_delayed, delay_reported_at, consultation_fee'
      )
      .single();

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        return res
          .status(404)
          .json({ success: false, message: 'Schedule not found.' });
      }
      throw updateError;
    }

    // 2. Fetch all active appointments for this schedule, joining the
    //    patient's user_id (for notification delivery).
    const { data: appointments, error: apptsError } = await supabase
      .from('appointments')
      .select(
        `
        id,
        patient_profiles ( user_id )
      `
      )
      .eq('schedule_id', scheduleId)
      .neq('status', 'CANCELLED');

    if (apptsError) throw apptsError;

    // 3. Collect unique patient user_ids
    const userIds = [];
    for (const appt of appointments || []) {
      const uid = appt.patient_profiles?.user_id;
      if (uid && !userIds.includes(uid)) userIds.push(uid);
    }

    // 4. Batch-insert a SESSION_DELAY notification per affected user
    const timeLabel = `${formatTime(schedule.start_time)} – ${formatTime(schedule.end_time)}`;
    const sessionLabel = `${schedule.available_date} (${timeLabel})`;
    const title = delayMinutes > 0
      ? `Session delayed by ${delayMinutes} minute${delayMinutes === 1 ? '' : 's'}`
      : 'Session back on schedule';

    let insertedNotifications = [];
    if (userIds.length > 0) {
      const { data: inserted, error: notifyError } = await supabase
        .from('notifications')
        .insert(
          userIds.map((uid) => ({
            user_id: uid,
            type: 'SESSION_DELAY',
            title,
            message:
              delayMinutes > 0
                ? `The session on ${sessionLabel} is delayed by approximately ${delayMinutes} minute${delayMinutes === 1 ? '' : 's'}. Please plan accordingly.`
                : `The session on ${sessionLabel} is back on schedule. Thank you for your patience.`,
            action_link: '/patient/appointments',
            metadata: {
              schedule_id: schedule.id,
              delay_minutes: delayMinutes,
            },
            is_read: false,
          }))
        )
        .select('id, user_id');

      if (notifyError) throw notifyError;
      insertedNotifications = inserted || [];
    }

    res.json({
      success: true,
      data: {
        schedule: {
          id: schedule.id,
          availableDate: schedule.available_date,
          startTime: schedule.start_time,
          endTime: schedule.end_time,
          delayMinutes: schedule.delay_minutes ?? 0,
          isDelayed: schedule.is_delayed ?? false,
          delayReportedAt: schedule.delay_reported_at,
          consultationFee: schedule.consultation_fee ?? 0,
        },
        notifiedUsers: userIds,
        notifiedCount: insertedNotifications.length,
      },
    });
  } catch (error) {
    console.error('Error in broadcastSessionDelay:', error);
    next(error);
  }
};

/**
 * GET /api/admin/schedules/all
 * Returns ALL doctor schedules (not just today's dashboard slots) together with
 * the doctor's name/specialty and a computed capacity ratio
 * (current_appointment / max_patients) plus delay status fields.
 *
 * Optional query params:
 *   doctor_id  – filter by a specific doctor
 *   date       – filter to a single available_date (YYYY-MM-DD)
 */
export const getAdminScheduleList = async (req, res, next) => {
  try {
    const { doctor_id, date } = req.query;

    let query = supabase
      .from('doctor_schedules')
      .select(
        `id,
        doctor_id,
        available_date,
        start_time,
        end_time,
        consultation_fee,
        max_patients,
        current_appointment,
        is_booked,
        is_delayed,
        delay_minutes,
        delay_reported_at,
        doctor_profiles (
          id,
          first_name,
          last_name,
          specialties ( id, name )
        )`
      )
      .order('available_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (doctor_id) {
      if (!isValidUuid(doctor_id)) {
        return res
          .status(400)
          .json({ success: false, message: 'doctor_id must be a valid UUID.' });
      }
      query = query.eq('doctor_id', doctor_id);
    }

    if (date) {
      if (!isValidDate(date)) {
        return res.status(400).json({
          success: false,
          message: 'date must be a valid date (YYYY-MM-DD).',
        });
      }
      query = query.eq('available_date', date);
    }

    const { data: schedules, error } = await query;

    if (error) throw error;

    const list = (schedules || []).map((s) => {
      const doctor = s.doctor_profiles || {};
      const specialty = doctor.specialties?.name || null;
      const maxPatients = s.max_patients ?? 1;
      const currentAppointment = s.current_appointment ?? 0;
      return {
        id: s.id,
        doctorId: s.doctor_id,
        doctorName:
          [doctor.first_name, doctor.last_name].filter(Boolean).join(' ') ||
          null,
        specialty,
        availableDate: s.available_date,
        startTime: s.start_time,
        endTime: s.end_time,
        consultationFee: Number(s.consultation_fee ?? 0),
        maxPatients,
        currentAppointment,
        capacityRatio:
          maxPatients > 0 ? currentAppointment / maxPatients : 0,
        isBooked: s.is_booked ?? false,
        isDelayed: s.is_delayed ?? false,
        delayMinutes: s.delay_minutes ?? 0,
        delayReportedAt: s.delay_reported_at,
      };
    });

    res.json({ success: true, data: { schedules: list } });
  } catch (error) {
    console.error('Error in getAdminScheduleList:', error);
    next(error);
  }
};

/**
 * DELETE /api/admin/schedules/:scheduleId/emergency-cancel
 * Cancels a schedule slot in an emergency:
 *   - Marks the doctor_schedules row as cancelled (is_booked = false, delay fields reset)
 *   - Marks every linked, non-cancelled appointment as CANCELLED
 *   - Dispatches an APPOINTMENT_CANCELLED notification to each booked patient
 */
export const emergencyCancelSchedule = async (req, res, next) => {
  try {
    const { scheduleId } = req.params;
    if (!isValidUuid(scheduleId)) {
      return res
        .status(400)
        .json({ success: false, message: 'scheduleId must be a valid UUID.' });
    }

    // 1. Fetch the schedule (404 if missing)
    const { data: schedule, error: fetchError } = await supabase
      .from('doctor_schedules')
      .select('id, doctor_id, available_date, start_time, end_time')
      .eq('id', scheduleId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!schedule) {
      return res
        .status(404)
        .json({ success: false, message: 'Schedule not found.' });
    }

    // 2. Mark the schedule as cancelled / cleared
    const { error: schedError } = await supabase
      .from('doctor_schedules')
      .update({
        is_booked: false,
        is_delayed: false,
        delay_minutes: 0,
        delay_reported_at: null,
      })
      .eq('id', scheduleId);

    if (schedError) throw schedError;

    // 3. Find active (non-cancelled) appointments for this schedule.
    //    Join patient_profiles to grab each patient's user_id for notifications.
    const { data: appointments, error: apptsError } = await supabase
      .from('appointments')
      .select(
        `id,
        patient_profiles ( user_id, first_name, last_name )`
      )
      .eq('schedule_id', scheduleId)
      .neq('status', 'CANCELLED');

    if (apptsError) throw apptsError;

    const activeAppointments = appointments || [];

    // 4. Cancel all linked appointments.
    if (activeAppointments.length > 0) {
      const ids = activeAppointments.map((a) => a.id);
      const { error: cancelError } = await supabase
        .from('appointments')
        .update({ status: 'CANCELLED' })
        .in('id', ids);
      if (cancelError) throw cancelError;
    }

    // 5. Notify each booked patient.
    const notifiedUsers = [];
    for (const appt of activeAppointments) {
      const uid = appt.patient_profiles?.user_id;
      if (!uid) continue;
      notifiedUsers.push(uid);
      try {
        await createNotification({
          user_id: uid,
          type: 'APPOINTMENT_CANCELLED',
          title: 'Session cancelled',
          message: `Your appointment on ${schedule.available_date} at ${schedule.start_time} has been cancelled due to an emergency. Please reschedule at your earliest convenience.`,
          action_link: '/patient/appointments',
          metadata: {
            schedule_id: scheduleId,
            appointment_id: appt.id,
          },
        });
      } catch (notifError) {
        console.error(
          '[EmergencyCancel] Notification failed:',
          notifError.message
        );
      }
    }

    res.json({
      success: true,
      data: {
        scheduleId: schedule.id,
        cancelledAppointments: activeAppointments.length,
        notifiedUsers,
      },
    });
  } catch (error) {
    console.error('Error in emergencyCancelSchedule:', error);
    next(error);
  }
};
