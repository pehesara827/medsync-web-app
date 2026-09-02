import { supabase } from '../supabase.js';
import * as doctorService from '../services/doctorService.js';

/**
 * Formats a TIME column (HH:MM:SS) into a 12-hour label.
 * @param {string} timeStr - e.g. '10:30:00'
 * @returns {string} e.g. '10:00 AM'
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
 * Returns the weekday abbreviation (Mon–Sun) for a date shifted `offset` days
 * before today. Used to label the "completed appointments per day" bar chart.
 */
const weekDayLabel = (offset) => {
  const date = new Date();
  date.setDate(date.getDate() - offset);
  return date.toLocaleDateString('en-US', { weekday: 'short' });
};

/**
 * GET /api/admin/dashboard
 * Aggregates real-time operational metrics for the Admin dashboard:
 *  - total appointments today
 *  - active schedules today
 *  - pending / completed payment counts
 *  - completed appointments per day (last 7 days) for the bar chart
 *  - today's time slots (doctor + specialty + booked count)
 *  - the currently active schedule slot (doctor + specialty + time)
 */
export const getAdminDashboard = async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const now = new Date();
    const nowTime = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    // ── 1. Total appointments today (excluding cancelled) ─────────────
    // Public/self-service bookings (`appointments`) + admin-added walk-ins
    // (`manual_appointments`) are tallied together.
    const { count: publicApptsToday, error: apptTodayError } = await supabase
      .from('appointments')
      .select('id', { count: 'exact' })
      .eq('appointment_date', today)
      .neq('status', 'CANCELLED');

    if (apptTodayError) throw apptTodayError;

    const { count: walkInsToday, error: walkInsTodayError } = await supabase
      .from('manual_appointments')
      .select('id', { count: 'exact' })
      .eq('appointment_date', today)
      .neq('status', 'CANCELLED');

    if (walkInsTodayError) throw walkInsTodayError;

    const totalAppointmentsToday = (publicApptsToday ?? 0) + (walkInsToday ?? 0);

    // ── 2. Active schedules today ─────────────────────────────────────
    const { count: activeSchedules, error: schedulesError } = await supabase
      .from('doctor_schedules')
      .select('id', { count: 'exact' })
      .eq('available_date', today);

    if (schedulesError) throw schedulesError;

    // ── 3. Pending payments (UNPAID + PENDING_SLIP_VERIFICATION) ──────
    const { data: pendingRows, error: pendingErr } = await supabase
      .from('payments')
      .select('payment_status')
      .neq('payment_status', 'PAID');

    if (pendingErr) throw pendingErr;

    // ── 4. Completed payments (PAID) ──────────────────────────────────
    const { data: paidRows, error: paidErr } = await supabase
      .from('payments')
      .select('payment_status')
      .eq('payment_status', 'PAID');

    if (paidErr) throw paidErr;

    // ── 5. Completed appointments per day (last 7 days) ───────────────
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 6); // 7 days including today
    const startDateStr = startDate.toISOString().split('T')[0];

    const { data: completedRows, error: completedErr } = await supabase
      .from('appointments')
      .select('appointment_date')
      .eq('status', 'COMPLETED')
      .gte('appointment_date', startDateStr)
      .lte('appointment_date', today);

    if (completedErr) throw completedErr;

    // Completed walk-ins count towards the same chart.
    const { data: completedWalkInRows, error: completedWalkInErr } = await supabase
      .from('manual_appointments')
      .select('appointment_date')
      .eq('status', 'COMPLETED')
      .gte('appointment_date', startDateStr)
      .lte('appointment_date', today);

    if (completedWalkInErr) throw completedWalkInErr;

    const completedByDayMap = {};
    for (let i = 6; i >= 0; i--) {
      const label = weekDayLabel(i);
      completedByDayMap[label] = 0;
    }
    const tallyCompleted = (rows) => {
      for (const row of rows || []) {
        const date = new Date(`${row.appointment_date}T00:00:00`);
        if (Number.isNaN(date.getTime())) continue;
        const label = date.toLocaleDateString('en-US', { weekday: 'short' });
        if (label in completedByDayMap) completedByDayMap[label] += 1;
      }
    };
    tallyCompleted(completedRows);
    tallyCompleted(completedWalkInRows);

    // Convert the per-day tally map into an ordered array for the bar chart
    const completedByDay = Object.entries(completedByDayMap).map(([day, count]) => ({
      day,
      count,
    }));

    // ── 6. Today's time slots with doctor + specialty ─────────────────
    const { data: scheduleRows, error: slotsErr } = await supabase
      .from('doctor_schedules')
      .select(
        `id,
        doctor_id,
        start_time,
        doctor_profiles (
          first_name,
          last_name,
          specialization
        )`
      )
      .eq('available_date', today)
      .order('start_time', { ascending: true });

    if (slotsErr) throw slotsErr;

    const scheduleIds = (scheduleRows || []).map((s) => s.id);

    // Tally non-cancelled appointments per schedule slot
    const countBySchedule = new Map();
    if (scheduleIds.length > 0) {
      const { data: slotAppts, error: slotApptsErr } = await supabase
        .from('appointments')
        .select('schedule_id')
        .in('schedule_id', scheduleIds)
        .neq('status', 'CANCELLED');

      if (slotApptsErr) throw slotApptsErr;

      for (const appt of slotAppts || []) {
        countBySchedule.set(appt.schedule_id, (countBySchedule.get(appt.schedule_id) || 0) + 1);
      }
    }

    // Manual walk-ins fold into their matching slot (doctor + start_time);
    // ones with no matching schedule get their own row so they stay visible.
    const { data: walkInRows, error: walkInErr } = await supabase
      .from('manual_appointments')
      .select(
        `doctor_id,
        start_time,
        doctor_profiles (
          first_name,
          last_name,
          specialization,
          specialties ( name )
        )`
      )
      .eq('appointment_date', today)
      .neq('status', 'CANCELLED');

    if (walkInErr) throw walkInErr;

    const unmatchedWalkIns = new Map(); // `${doctor_id}|${time}` -> entry
    for (const w of walkInRows || []) {
      const slot = (scheduleRows || []).find(
        (s) => s.doctor_id === w.doctor_id && s.start_time === (w.start_time || null)
      );
      if (slot) {
        countBySchedule.set(slot.id, (countBySchedule.get(slot.id) || 0) + 1);
        continue;
      }
      const key = `${w.doctor_id}|${w.start_time || ''}`;
      const entry = unmatchedWalkIns.get(key) || {
        time: w.start_time,
        doctor:
          `Dr. ${w.doctor_profiles?.first_name || ''} ${w.doctor_profiles?.last_name || ''}`.trim() ||
          '—',
        specialty:
          w.doctor_profiles?.specialties?.name || w.doctor_profiles?.specialization || '—',
        count: 0,
      };
      entry.count += 1;
      unmatchedWalkIns.set(key, entry);
    }

    const timeSlots = (scheduleRows || []).map((slot) => {
      const doctor = slot.doctor_profiles || {};
      const doctorName = `Dr. ${doctor.first_name || ''} ${doctor.last_name || ''}`.trim();
      return {
        time: formatTime(slot.start_time),
        doctor: doctorName || '—',
        specialty: doctor.specialization || '—',
        count: countBySchedule.get(slot.id) || 0,
      };
    });

    for (const entry of unmatchedWalkIns.values()) {
      timeSlots.push({
        time: entry.time ? formatTime(entry.time) : '—',
        doctor: entry.doctor,
        specialty: entry.specialty,
        count: entry.count,
        isWalkIn: true,
      });
    }

    // ── 7. Currently active schedule slot (today, start <= now <= end) ─
    const { data: currentSlot, error: activeErr } = await supabase
      .from('doctor_schedules')
      .select(
        `start_time,
        end_time,
        doctor_id,
        doctor_profiles (
          first_name,
          last_name,
          specialization
        )`
      )
      .eq('available_date', today)
      .lte('start_time', nowTime)
      .gte('end_time', nowTime)
      .order('start_time', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (activeErr) throw activeErr;

    const activeDoctor = currentSlot?.doctor_profiles || {};
    const activeSlot = currentSlot
      ? {
          time: formatTime(currentSlot.start_time),
          doctor:
            `Dr. ${activeDoctor.first_name || ''} ${activeDoctor.last_name || ''}`.trim() || '—',
          specialty: activeDoctor.specialization || '—',
        }
      : null;

    // ── Build response ────────────────────────────────────────────────
    res.json({
      stats: {
        totalAppointmentsToday: totalAppointmentsToday ?? 0,
        activeSchedules: activeSchedules ?? 0,
        pendingPayments: (pendingRows || []).length,
        completedPayments: (paidRows || []).length,
      },
      completedByDay,
      timeSlots,
      activeSlot,
    });
  } catch (error) {
    console.error('Error in getAdminDashboard:', error);
    next(error);
  }
};

/**
 * GET /api/admin/doctors
 * Returns approved doctors for the "New Appointment" dropdown.
 * Shape: { id, name, specialty }
 */
export const getAdminDoctors = async (req, res, next) => {
  try {
    const { data: doctors, error } = await supabase
      .from('doctor_profiles')
      .select('id, first_name, last_name, specialization')
      .eq('is_approved', true)
      .order('first_name', { ascending: true });

    if (error) throw error;

    const list = (doctors || []).map((d) => ({
      id: d.id,
      name: `Dr. ${d.first_name || ''} ${d.last_name || ''}`.trim() || '—',
      specialty: d.specialization || '—',
    }));

    res.json({ doctors: list });
  } catch (error) {
    console.error('Error in getAdminDoctors:', error);
    next(error);
  }
};

/**
 * POST /api/admin/doctors
 * Creates a new doctor account (auth user + doctor_profiles row) from the
 * admin "Add New Doctor" form. The doctor is created as APPROVED immediately.
 * Reuses doctorService.registerDoctor with isApproved forced to true so the
 * client can never control approval status.
 */
export const createAdminDoctor = async (req, res, next) => {
  try {
    const {
      username,
      email,
      password,
      first_name,
      last_name,
      medical_license_no,
    } = req.body || {};

    // ── Server-side validation (admin flow) ────────────────────────────
    const requiredFields = [
      { value: username, label: 'Username' },
      { value: email, label: 'Email' },
      { value: first_name, label: 'First name' },
      { value: last_name, label: 'Last name' },
      { value: medical_license_no, label: 'Medical license number' },
    ];

    for (const field of requiredFields) {
      if (!field.value || !String(field.value).trim()) {
        return res
          .status(400)
          .json({ message: `${field.label} is required.`, field: field.label.toLowerCase().replace(/\s+/g, '_') });
      }
    }

    if (!password || String(password).length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long.', field: 'password' });
    }

    // ── Normalize the payload ──────────────────────────────────────────
    // `education` and `description` (bio) are OPTIONAL — any blank or
    // whitespace-only value is coerced to null so we never store empty strings.
    const trimOptional = (value) => {
      if (value === undefined || value === null) return null;
      const trimmed = String(value).trim();
      return trimmed === '' ? null : trimmed;
    };

    const payload = {
      ...req.body,
      username: String(username).trim(),
      email: String(email).trim(),
      password: String(password),
      terms_accepted: true,
      first_name: String(first_name).trim(),
      last_name: String(last_name).trim(),
      medical_license_no: String(medical_license_no).trim(),
      education: trimOptional(req.body.education),
      description: trimOptional(req.body.description),
    };

    const result = await doctorService.registerDoctor(payload, { isApproved: true });

    res.status(201).json({
      message: 'Doctor added successfully.',
      user: result.user,
      profile: result.profile,
    });
  } catch (error) {
    // Handle duplicate key violations (email, username, medical_license_no)
    if (error.code === '23505') {
      const detail = error.details || error.message || '';
      let field = 'a unique field';
      if (detail.includes('username')) field = 'Username';
      else if (detail.includes('email')) field = 'Email';
      else if (detail.includes('medical_license_no')) field = 'Medical license number';

      return res.status(409).json({
        message: `${field} already exists. Please use a different value.`,
        field: field.toLowerCase().replace(/\s+/g, '_'),
      });
    }

    next(error);
  }
};

/**
 * GET /api/admin/schedules?doctor_id=&date=
 * Returns a doctor's time slots for a given date so the admin can pick a time.
 * Shape: { id, start_time, end_time, maxPatients, currentAppointment, isFull, consultationFee }
 */
export const getAdminSchedules = async (req, res, next) => {
  try {
    const { doctor_id, date } = req.query;

    if (!doctor_id || !date) {
      return res
        .status(400)
        .json({ message: 'doctor_id and date are required.' });
    }

    const { data: schedules, error } = await supabase
      .from('doctor_schedules')
      .select(
        'id, start_time, end_time, max_patients, current_appointment, consultation_fee'
      )
      .eq('doctor_id', doctor_id)
      .eq('available_date', date)
      .order('start_time', { ascending: true });

    if (error) throw error;

    // Slot capacity must reflect bookings from BOTH tables: public
    // `appointments` (tracked via current_appointment) and admin-added
    // `manual_appointments` (matched by doctor + date + start_time).
    const { data: manualRows, error: manualErr } = await supabase
      .from('manual_appointments')
      .select('start_time')
      .eq('doctor_id', doctor_id)
      .eq('appointment_date', date)
      .neq('status', 'CANCELLED');

    if (manualErr) throw manualErr;

    const manualCountByTime = new Map();
    for (const row of manualRows || []) {
      if (!row.start_time) continue; // unscheduled walk-ins consume no slot
      manualCountByTime.set(
        row.start_time,
        (manualCountByTime.get(row.start_time) || 0) + 1
      );
    }

    const slots = (schedules || []).map((s) => {
      const booked =
        (s.current_appointment ?? 0) + (manualCountByTime.get(s.start_time) || 0);
      return {
        id: s.id,
        start_time: s.start_time,
        end_time: s.end_time,
        maxPatients: s.max_patients ?? 1,
        currentAppointment: booked,
        isFull: booked >= (s.max_patients ?? 1),
        consultationFee: s.consultation_fee ?? 0,
      };
    });

    res.json({ slots });
  } catch (error) {
    console.error('Error in getAdminSchedules:', error);
    next(error);
  }
};

/**
 * POST /api/admin/manual-appointments
 * Creates a standalone manually-added appointment (walk-in/admin).
 * Patient details are stored on the row; no patient_profiles FK is created.
 */
export const createManualAppointment = async (req, res, next) => {
  try {
    const {
      patient_first_name,
      patient_last_name,
      patient_phone,
      patient_gender,
      patient_date_of_birth,
      doctor_id,
      appointment_date,
      start_time,
      status: statusOverride,
      remarks,
    } = req.body;

    if (
      !patient_first_name ||
      !patient_last_name ||
      !doctor_id ||
      !appointment_date
    ) {
      return res.status(400).json({
        message:
          'patient_first_name, patient_last_name, doctor_id and appointment_date are required.',
      });
    }

    // Snapshot the doctor's display name at booking time
    let doctorName = '';
    if (doctor_id) {
      const { data: doctor, error: doctorError } = await supabase
        .from('doctor_profiles')
        .select('first_name, last_name')
        .eq('id', doctor_id)
        .single();

      if (doctorError) throw doctorError;
      doctorName = `Dr. ${doctor.first_name || ''} ${doctor.last_name || ''}`.trim();
    }

    // Capacity guard: refuse bookings beyond the slot's max_patients. The
    // tally covers BOTH tables — public `appointments` (current_appointment)
    // and previously added walk-ins. A walk-in with no matching schedule row
    // (or no start_time) is allowed through — admin override.
    if (start_time) {
      const { data: slot, error: slotError } = await supabase
        .from('doctor_schedules')
        .select('id, max_patients, current_appointment')
        .eq('doctor_id', doctor_id)
        .eq('available_date', appointment_date)
        .eq('start_time', start_time)
        .maybeSingle();

      if (slotError) throw slotError;

      if (slot) {
        const { count: manualCount, error: manualCountError } = await supabase
          .from('manual_appointments')
          .select('id', { count: 'exact' })
          .eq('doctor_id', doctor_id)
          .eq('appointment_date', appointment_date)
          .eq('start_time', start_time)
          .neq('status', 'CANCELLED');

        if (manualCountError) throw manualCountError;

        const booked = (slot.current_appointment ?? 0) + (manualCount ?? 0);
        if (booked >= (slot.max_patients ?? 1)) {
          return res.status(409).json({
            message:
              'The selected time slot is already full. Please choose a different slot.',
          });
        }
      }
    }

    const { data: appointment, error } = await supabase
      .from('manual_appointments')
      .insert([
        {
          patient_first_name: patient_first_name.trim(),
          patient_last_name: patient_last_name.trim(),
          patient_phone: patient_phone || null,
          patient_gender: patient_gender || null,
          patient_date_of_birth: patient_date_of_birth || null,
          doctor_id,
          doctor_name: doctorName || null,
          appointment_date,
          start_time: start_time || null,
          remarks: remarks || null,
          status: statusOverride || 'PENDING',
        },
      ])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      message: 'Appointment added successfully.',
      appointment,
    });
  } catch (error) {
    console.error('Error in createManualAppointment:', error);
    next(error);
  }
};

/**
 * GET /api/admin/manual-appointments
 * Lists all manually-added appointments (newest first).
 */
export const getManualAppointments = async (req, res, next) => {
  try {
    const { date } = req.query;

    let query = supabase
      .from('manual_appointments')
      .select('*')
      .order('created_at', { ascending: false });

    // Optional date filter (YYYY-MM-DD) for views that only need one day.
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
      query = query.eq('appointment_date', String(date));
    }

    const { data: appointments, error } = await query;

    if (error) throw error;

    res.json({ appointments: appointments || [] });
  } catch (error) {
    console.error('Error in getManualAppointments:', error);
    next(error);
  }
};

/**
 * Normalizes a doctor_profiles + users + specialties row into the
 * shape the Admin "Doctor Management" table expects.
 */
const mapDoctorForManagement = (d) => {
  const user = d.users || {};
  const specialty = d.specialties?.name || d.specialization || null;

  // Education may arrive as a comma-separated string or an array — normalize
  let education = d.education || '';
  if (Array.isArray(education)) education = education.join(', ');
  education = String(education).trim();

  let bio = d.description || '';
  if (Array.isArray(bio)) bio = bio.join(' ');
  bio = String(bio).trim();

  return {
    id: d.id,
    name: `Dr. ${d.first_name || ''} ${d.last_name || ''}`.trim() || '—',
    firstName: d.first_name || '',
    lastName: d.last_name || '',
    email: user.email || '',
    avatar: d.doctor_image || '',
    licenseNo: d.medical_license_no || '',
    specialty: specialty || '—',
    experience: d.experience_years ?? 0,
    consultationFee: Number(d.consultation_fee ?? 0),
    rating: Number(d.rating ?? 0),
    reviewCount: d.review_count ?? 0,
    status: d.is_approved ? 'APPROVED' : 'PENDING',
    isApproved: Boolean(d.is_approved),
    education,
    bio,
  };
};

/**
 * GET /api/admin/doctors-management
 * Returns ALL doctor profiles (approved + pending) with full details for the
 * Admin "Doctor Management" table and detail modal.
 *
 * Supports server-side:
 *  - `search`   : free-text across first_name, last_name, medical_license_no
 *  - `specialty`: exact specialty NAME (matches the `specialties` relation)
 *  - `date`     : YYYY-MM-DD — only doctors who have a schedule that day
 *  - `page`     : 1-based page number (default 1)
 *  - `pageSize` : rows per page (default 10, clamped 1..50)
 *
 * Response: { doctors, total, page, pageSize, totalPages }
 */
export const getAdminDoctorsManagement = async (req, res, next) => {
  try {
    const { search = '', specialty = 'All', date = '' } = req.query;

    const rawPage = Number.parseInt(String(req.query.page ?? '1'), 10);
    const rawPageSize = Number.parseInt(String(req.query.pageSize ?? '10'), 10);
    const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
    const pageSize =
      Number.isFinite(rawPageSize) && rawPageSize > 0
        ? Math.min(rawPageSize, 50)
        : 10;

    let query = supabase
      .from('doctor_profiles')
      .select(
        `id,
        user_id,
        first_name,
        last_name,
        medical_license_no,
        specialization,
        experience_years,
        is_approved,
        doctor_image,
        rating,
        review_count,
        consultation_fee,
        description,
        education,
        specialties (
          id,
          name
        ),
        users (
          email,
          username
        )`,
        { count: 'exact' }
      );

    // Full-text search across name (first/last) and license number.
    // Tokens are joined with AND; within each token we OR across columns,
    // so "Sarah Jenkins" matches a doctor whose first AND last name match.
    const tokens = String(search)
      .split(/\s+/)
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => t.replace(/%/g, ''));

    for (const token of tokens) {
      const term = `%${token}%`;
      query = query.or(
        `first_name.ilike.${term},last_name.ilike.${term},medical_license_no.ilike.${term}`
      );
    }

    if (specialty && specialty !== 'All') {
      // Filter on the top-level `specialization` column (NOT NULL, always
      // populated) rather than the nullable `specialty_id` relation. This
      // keeps the filter reliable for every doctor row.
      query = query.ilike('specialization', String(specialty));
    }

    // Date filter: only doctors who have at least one schedule on the given
    // day. We look up matching doctor_ids from `doctor_schedules` first (via
    // the doctor_id -> doctor_profiles.id FK) and then filter with `in`.
    // This keeps the count and pagination correct and avoids relying on an
    // embedded-relation filter.
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
      const { data: scheduledDocs, error: schedErr } = await supabase
        .from('doctor_schedules')
        .select('doctor_id')
        .eq('available_date', String(date));

      if (schedErr) throw schedErr;

      const ids = [...new Set((scheduledDocs || []).map((s) => s.doctor_id))];

      if (ids.length === 0) {
        return res.json({ doctors: [], total: 0, page, pageSize, totalPages: 1 });
      }

      query = query.in('id', ids);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data: doctors, count, error } = await query
      .order('first_name', { ascending: true })
      .range(from, to);

    if (error) throw error;

    const list = (doctors || []).map(mapDoctorForManagement);
    const total = count ?? list.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    res.json({ doctors: list, total, page, pageSize, totalPages });
  } catch (error) {
    console.error('Error in getAdminDoctorsManagement:', error);
    next(error);
  }
};

/**
 * GET /api/admin/doctors-management/stats
 * Aggregates the KPI cards for the Admin "Doctor Management" page.
 */
export const getAdminDoctorStats = async (req, res, next) => {
  try {
    // 1. Total registered doctors
    const { count: totalDoctors, error: totalErr } = await supabase
      .from('doctor_profiles')
      .select('id', { count: 'exact' });

    if (totalErr) throw totalErr;

    const today = new Date().toISOString().split('T')[0];

    // Week window: Monday of the current week through the following Sunday
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setHours(0, 0, 0, 0);
    const weekDay = weekStart.getDay(); // 0 = Sunday
    const diffToMonday = weekDay === 0 ? -6 : 1 - weekDay;
    weekStart.setDate(weekStart.getDate() + diffToMonday);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const weekStartDateStr = weekStart.toISOString().split('T')[0];
    const weekEndDateStr = weekEnd.toISOString().split('T')[0];

    // 2. Distinct doctors with at least one schedule this week
    const { data: weekSchedules, error: weekErr } = await supabase
      .from('doctor_schedules')
      .select('doctor_id')
      .gte('available_date', weekStartDateStr)
      .lte('available_date', weekEndDateStr);

    if (weekErr) throw weekErr;

    const scheduledThisWeek = new Set((weekSchedules || []).map((s) => s.doctor_id)).size;

    // 3. Distinct doctors with a schedule today
    const { data: todaySchedules, error: todayErr } = await supabase
      .from('doctor_schedules')
      .select('doctor_id')
      .eq('available_date', today);

    if (todayErr) throw todayErr;

    const scheduledToday = new Set((todaySchedules || []).map((s) => s.doctor_id)).size;

    res.json({
      stats: {
        totalDoctors: totalDoctors ?? 0,
        scheduledThisWeek,
        scheduledToday,
      },
    });
  } catch (error) {
    console.error('Error in getAdminDoctorStats:', error);
    next(error);
  }
};

/**
 * DELETE /api/admin/doctors/:doctorId
 * Permanently removes a doctor account. Because doctor_profiles is referenced
 * by several child tables, dependent rows are deleted first (reviews, waitlists,
 * favorites, payments → appointments, schedules), then the profile, then the
 * linked auth/users record.
 */
export const deleteAdminDoctor = async (req, res, next) => {
  try {
    const { doctorId } = req.params;

    if (!doctorId) {
      return res.status(400).json({ message: 'Doctor ID is required.' });
    }

    // Fetch the profile so we can clean up the linked user account afterwards
    const { data: doctor, error: fetchErr } = await supabase
      .from('doctor_profiles')
      .select('id, user_id')
      .eq('id', doctorId)
      .maybeSingle();

    if (fetchErr) throw fetchErr;

    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found.' });
    }

    // 1. Dependent records that reference doctor_profiles directly
    const childTables = [
      'doctor_reviews',
      'appointment_waitlists',
      'patient_favorite_doctors',
      'doctor_schedules',
    ];
    for (const table of childTables) {
      const { error } = await supabase.from(table).delete().eq('doctor_id', doctorId);
      if (error) throw error;
    }

    // 2. Appointments (must remove their payments first)
    const { data: appointments, error: apptsErr } = await supabase
      .from('appointments')
      .select('id')
      .eq('doctor_id', doctorId);
    if (apptsErr) throw apptsErr;

    const appointmentIds = (appointments || []).map((a) => a.id);
    if (appointmentIds.length > 0) {
      const { error: payErr } = await supabase
        .from('payments')
        .delete()
        .in('appointment_id', appointmentIds);
      if (payErr) throw payErr;

      const { error: apptDelErr } = await supabase
        .from('appointments')
        .delete()
        .in('id', appointmentIds);
      if (apptDelErr) throw apptDelErr;
    }

    // 3. The doctor profile itself
    const { error: profileErr } = await supabase
      .from('doctor_profiles')
      .delete()
      .eq('id', doctorId);
    if (profileErr) throw profileErr;

    // 4. The linked public.users row and auth.users record (best effort)
    if (doctor.user_id) {
      const { error: usersErr } = await supabase
        .from('users')
        .delete()
        .eq('id', doctor.user_id);
      if (usersErr) throw usersErr;

      try {
        const { deleteAuthUser } = await import('../models/authUserModel.js');
        await deleteAuthUser(doctor.user_id);
      } catch (authErr) {
        // The auth user may already be gone from a trigger cascade; not fatal.
        console.warn('Could not delete auth user:', authErr.message);
      }
    }

    res.json({ message: 'Doctor deleted successfully.' });
  } catch (error) {
    console.error('Error in deleteAdminDoctor:', error);
    next(error);
  }
};

/**
 * PATCH /api/admin/doctors/:doctorId/status
 * Approves ('APPROVED') or rejects/pends ('PENDING') a doctor by toggling is_approved.
 */
export const updateAdminDoctorStatus = async (req, res, next) => {
  try {
    const { doctorId } = req.params;
    const { status } = req.body;

    if (!doctorId) {
      return res.status(400).json({ message: 'Doctor ID is required.' });
    }

    const isApproved = String(status).toUpperCase() === 'APPROVED';
    const { data: doctor, error } = await supabase
      .from('doctor_profiles')
      .update({ is_approved: isApproved })
      .eq('id', doctorId)
      .select(
        `id,
        first_name,
        last_name,
        medical_license_no,
        specialization,
        experience_years,
        is_approved,
        doctor_image,
        rating,
        review_count,
        consultation_fee,
        description,
        education,
        specialties ( name ),
        users ( email )`
      )
      .maybeSingle();

    if (error) throw error;

    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found.' });
    }

    res.json({
      message: `Doctor ${isApproved ? 'approved' : 'moved to pending'} successfully.`,
      doctor: mapDoctorForManagement(doctor),
    });
  } catch (error) {
    console.error('Error in updateAdminDoctorStatus:', error);
    next(error);
  }
};

/**
 * PUT /api/admin/doctors/:doctorId
 * Updates a doctor's profile details by doctor_profiles.id. Only the provided
 * fields are updated; any omitted fields are left unchanged. Returns the updated
 * doctor in the shape the Admin "Doctor Management" table expects.
 */
export const updateAdminDoctor = async (req, res, next) => {
  try {
    const { doctorId } = req.params;

    if (!doctorId) {
      return res.status(400).json({ message: 'Doctor ID is required.' });
    }

    const {
      first_name,
      last_name,
      medical_license_no,
      specialization,
      experience_years,
      consultation_fee,
      doctor_image,
      education,
      description,
    } = req.body || {};

    // Build the update object with only provided fields.
    const updates = {};
    if (first_name !== undefined) updates.first_name = String(first_name).trim();
    if (last_name !== undefined) updates.last_name = String(last_name).trim();
    if (medical_license_no !== undefined) {
      updates.medical_license_no = String(medical_license_no).trim();
    }
    if (specialization !== undefined) {
      updates.specialization = String(specialization).trim();
    }
    if (experience_years !== undefined) {
      updates.experience_years = Number(experience_years);
    }
    if (consultation_fee !== undefined) {
      updates.consultation_fee = Number(consultation_fee);
    }
    if (doctor_image !== undefined) updates.doctor_image = String(doctor_image).trim();
    if (education !== undefined) {
      updates.education =
        typeof education === 'string' ? String(education).trim() : education;
    }
    if (description !== undefined) {
      updates.description =
        typeof description === 'string' ? String(description).trim() : description;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No fields provided to update.' });
    }

    const { data: doctor, error } = await supabase
      .from('doctor_profiles')
      .update(updates)
      .eq('id', doctorId)
      .select(
        `id,
        user_id,
        first_name,
        last_name,
        medical_license_no,
        specialization,
        experience_years,
        is_approved,
        doctor_image,
        rating,
        review_count,
        consultation_fee,
        description,
        education,
        specialties (
          id,
          name
        ),
        users (
          email,
          username
        )`
      )
      .maybeSingle();

    if (error) throw error;

    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found.' });
    }

    res.json({
      message: 'Doctor updated successfully.',
      doctor: mapDoctorForManagement(doctor),
    });
  } catch (error) {
    console.error('Error in updateAdminDoctor:', error);
    next(error);
  }
};

/**
 * Validates the `status` query param used by getAdminPatients.
 *
 * The patient table has no native status column — a patient's status is
 * derived from their latest appointment. `PENDING` and `CONFIRMED` are treated
 * as the same bucket ("Pending") per product decision, so a single status
 * value maps to a list of appointment status values for the DB query.
 *
 * @param {string} raw - Raw `status` query value (may be undefined/empty).
 * @returns {{ statuses: string[] | null, error?: { message: string } }}
 */
const resolvePatientStatusFilter = (raw) => {
  const value = String(raw || '').trim().toUpperCase();

  if (!value) return { statuses: null };

  const buckets = {
    PENDING: ['PENDING', 'CONFIRMED'],
    COMPLETED: ['COMPLETED'],
    CANCELLED: ['CANCELLED'],
  };

  if (!buckets[value]) {
    return {
      error: {
        message: 'Invalid status filter. Expected one of: pending, completed, cancelled.',
      },
    };
  }

  return { statuses: buckets[value] };
};

/**
 * Validates a `YYYY-MM-DD` date string used as an exact-match filter.
 * @param {string} value - Raw date query value.
 * @returns {{ date?: string, error?: { message: string } }}
 */
const validatePatientDateFilter = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return {};

  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return { error: { message: 'Invalid date. Expected YYYY-MM-DD.' } };
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const date = new Date(`${raw}T00:00:00`);
  if (m < 1 || m > 12 || d < 1 || d > 31 || Number.isNaN(date.getTime())) {
    return { error: { message: 'Invalid date. Please provide a real date.' } };
  }

  return { date: raw };
};

/**
 * Builds a short, human-friendly patient reference (e.g. `MS-EXAMPLE`)
 * from a UUID so the list/detail UI can show a stable, readable ID instead
 * of the full UUID.
 */
const shortPatientId = (id) => {
  if (!id) return '';
  const suffix = String(id).replace(/-/g, '').slice(0, 4).toUpperCase();
  return `MS-${suffix}`;
};

/**
 * Computes a patient's age from their date of birth.
 */
const ageFromDob = (dateOfBirth) => {
  if (!dateOfBirth) return null;
  const dob = new Date(`${dateOfBirth}T00:00:00`);
  if (Number.isNaN(dob.getTime())) return null;
  return Math.floor((new Date() - dob) / (365.25 * 24 * 60 * 60 * 1000));
};

/**
 * Maps an appointments row (joined with patient_profiles + beneficiaries +
 * users) into the display shape consumed by the Patients Management table
 * and detail slide-in.
 */
const mapPatientAppointment = (appt) => {
  const patient = appt.patient_profiles || {};
  const beneficiary = appt.beneficiaries || null;

  // Derive display status: CONFIRMED is shown under the PENDING bucket.
  const displayStatus = appt.status === 'CONFIRMED' ? 'PENDING' : appt.status;

  const base = {
    patientProfileId: patient.id || null,
    bookingType: appt.booking_type,
    phone: patient.phone_number || '',
    bloodGroup: patient.blood_group || '',
    address: patient.home_address || '',
    lastVisit: appt.appointment_date,
    status: displayStatus,
    rawStatus: appt.status,
  };

  if (appt.booking_type === 'BENEFICIARY' && beneficiary) {
    return {
      ...base,
      id: beneficiary.id,
      referenceId: shortPatientId(beneficiary.id),
      name: beneficiary.full_name || '—',
      age: beneficiary.age ?? null,
      gender: beneficiary.gender || '',
      relationship: beneficiary.relationship || '',
      email: patient.users?.[0]?.email || '',
    };
  }

  return {
    ...base,
    id: patient.id,
    referenceId: shortPatientId(patient.id),
    firstName: patient.first_name || '',
    lastName: patient.last_name || '',
    name: `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || '—',
    meta: `${patient.gender || ''}${patient.date_of_birth ? `, ${ageFromDob(patient.date_of_birth)} years` : ''}`,
    age: ageFromDob(patient.date_of_birth),
    gender: patient.gender || '',
    email: patient.users?.[0]?.email || '',
  };
};

/**
 * GET /api/admin/patients?status=&date=
 * Lists ALL patients registered in the system — every account owner from
 * `patient_profiles` plus every `beneficiaries` record (family members) —
 * with optional filters:
 *   - `status` : PENDING (includes CONFIRMED) | COMPLETED | CANCELLED
 *   - `date`   : exact date (YYYY-MM-DD) matched on appointment_date
 *
 * Each row is enriched with the patient's most recent matching appointment
 * (`lastVisit` + `status`). Patients who never booked are still listed under
 * "All statuses" with no date filter; when a status/date filter IS active the
 * list only contains patients with a matching appointment (the filters are
 * appointment-based), preserving the previous behaviour.
 */
export const getAdminPatients = async (req, res, next) => {
  try {
    const { status, date } = req.query || {};

    const statusResult = resolvePatientStatusFilter(status);
    if (statusResult.error) {
      return res.status(400).json({ message: statusResult.error.message });
    }

    const dateResult = validatePatientDateFilter(date);
    if (dateResult.error) {
      return res.status(400).json({ message: dateResult.error.message });
    }

    const hasFilters = Boolean(statusResult.statuses || dateResult.date);

    // 1. Every registered patient (account owner).
    const { data: owners, error: ownersError } = await supabase
      .from('patient_profiles')
      .select(
        `id,
        first_name,
        last_name,
        date_of_birth,
        gender,
        phone_number,
        blood_group,
        home_address,
        users (
          email
        )`
      );
    if (ownersError) throw ownersError;

    // 2. Every beneficiary (family member linked to an owner account).
    const { data: beneficiaryRows, error: benError } = await supabase
      .from('beneficiaries')
      .select('id, patient_id, full_name, age, gender, relationship');
    if (benError) throw benError;

    // 3. Appointments (respecting the status/date filters) so every patient
    //    can be enriched with their most recent matching visit. Ordered most
    //    recent first, so the first row seen per patient wins.
    let apptQuery = supabase
      .from('appointments')
      .select(
        `id,
        patient_id,
        booking_type,
        beneficiary_id,
        appointment_date,
        status,
        created_at,
        patient_profiles (
          id,
          first_name,
          last_name,
          date_of_birth,
          gender,
          phone_number,
          blood_group,
          home_address,
          users (
            email
          )
        ),
        beneficiaries (
          id,
          full_name,
          age,
          gender,
          relationship
        )`
      )
      .order('appointment_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (statusResult.statuses) {
      apptQuery = apptQuery.in('status', statusResult.statuses);
    }

    if (dateResult.date) {
      apptQuery = apptQuery.eq('appointment_date', dateResult.date);
    }

    const { data: appointments, error: apptError } = await apptQuery;
    if (apptError) throw apptError;

    // Most recent (matching) appointment per patient — account owners and
    // beneficiaries are keyed separately.
    const apptMap = new Map();
    (appointments || []).forEach((appt) => {
      const key =
        appt.booking_type === 'BENEFICIARY' && appt.beneficiaries
          ? `ben_${appt.beneficiaries.id}`
          : `pat_${appt.patient_profiles?.id}`;
      if (!key || /^pat_undefined$/.test(key)) return;

      if (!apptMap.has(key)) {
        apptMap.set(key, mapPatientAppointment(appt));
      }
    });

    const ownerById = new Map((owners || []).map((o) => [o.id, o]));
    const patients = [];

    // 4. One row per account owner; owners without any (matching) appointment
    //    fall back to their plain profile data.
    (owners || []).forEach((owner) => {
      const mapped = apptMap.get(`pat_${owner.id}`);
      if (mapped) {
        patients.push(mapped);
        return;
      }
      patients.push({
        id: owner.id,
        referenceId: shortPatientId(owner.id),
        firstName: owner.first_name || '',
        lastName: owner.last_name || '',
        name: `${owner.first_name || ''} ${owner.last_name || ''}`.trim() || '—',
        age: ageFromDob(owner.date_of_birth),
        gender: owner.gender || '',
        phone: owner.phone_number || '',
        email: owner.users?.[0]?.email || '',
        bloodGroup: owner.blood_group || '',
        address: owner.home_address || '',
        lastVisit: null,
        status: null,
        rawStatus: null,
      });
    });

    // 5. One row per beneficiary. Beneficiaries have no contact details of
    //    their own, so the linked account owner's info is used.
    (beneficiaryRows || []).forEach((ben) => {
      const owner = ownerById.get(ben.patient_id);
      const mapped = apptMap.get(`ben_${ben.id}`);
      if (mapped) {
        patients.push(mapped);
        return;
      }
      patients.push({
        id: ben.id,
        referenceId: shortPatientId(ben.id),
        name: ben.full_name || '—',
        age: ben.age ?? null,
        gender: ben.gender || '',
        relationship: ben.relationship || '',
        phone: owner?.phone_number || '',
        email: owner?.users?.[0]?.email || '',
        bloodGroup: owner?.blood_group || '',
        address: owner?.home_address || '',
        lastVisit: null,
        status: null,
        rawStatus: null,
      });
    });

    // 6. Status/date filters are appointment-based: with either filter active,
    //    only patients having a matching appointment are listed.
    const visible = hasFilters
      ? patients.filter((p) => p.lastVisit && p.status)
      : patients;

    // Most recent visit first; patients without visits last, alphabetical.
    visible.sort((a, b) => {
      if (a.lastVisit && b.lastVisit && a.lastVisit !== b.lastVisit) {
        return String(b.lastVisit).localeCompare(String(a.lastVisit));
      }
      if (Boolean(a.lastVisit) !== Boolean(b.lastVisit)) {
        return a.lastVisit ? -1 : 1;
      }
      return String(a.name || '').localeCompare(String(b.name || ''));
    });

    res.json({
      patients: visible,
      total: visible.length,
    });
  } catch (error) {
    console.error('Error in getAdminPatients:', error);
    next(error);
  }
};
/**
 * GET /api/admin/patients/:id
 * Returns full detail for a single patient (their profile, beneficiaries, and
 * appointment history) for the detail slide-in panel.
 *
 * `id` may be either a patient_profiles UUID or a beneficiaries UUID.
 */
export const getAdminPatientById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: 'Patient ID is required.' });
    }

    // 1. Try to fetch the patient profile (account owner) by id or user_id.
    const { data: profile, error: profileError } = await supabase
      .from('patient_profiles')
      .select(
        `id,
        user_id,
        first_name,
        last_name,
        date_of_birth,
        gender,
        phone_number,
        blood_group,
        home_address,
        emergency_contact_name,
        emergency_contact_rel,
        emergency_contact_phone,
        alt_contact_phone,
        profile_picture_url,
        users (
          email,
          username
        )`
      )
      .or(`id.eq.${id},user_id.eq.${id}`)
      .maybeSingle();

    if (profileError && !/^22P02/.test(profileError.code || '')) {
      throw profileError;
    }

    let patient;
    let beneficiaryInfo = null;

    if (profile) {
      patient = profile;
    } else {
      // 2. Fallback: `id` is a beneficiaries UUID. Look up that record and its
      //    account owner's profile so the panel can still render full contact
      //    details.
      const { data: beneficiary, error: benError } = await supabase
        .from('beneficiaries')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (benError) throw benError;

      if (!beneficiary) {
        return res.status(404).json({ message: 'Patient not found.' });
      }

      beneficiaryInfo = {
        id: beneficiary.id,
        full_name: beneficiary.full_name,
        age: beneficiary.age,
        gender: beneficiary.gender,
        relationship: beneficiary.relationship,
      };

      const { data: ownerProfile, error: ownerError } = await supabase
        .from('patient_profiles')
        .select(
          `id,
          user_id,
          first_name,
          last_name,
          date_of_birth,
          gender,
          phone_number,
          blood_group,
          home_address,
          emergency_contact_name,
          emergency_contact_rel,
          emergency_contact_phone,
          alt_contact_phone,
          profile_picture_url,
          users (
            email,
            username
          )`
        )
        .eq('id', beneficiary.patient_id)
        .maybeSingle();

      if (ownerError) throw ownerError;
      patient = ownerProfile;
    }

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found.' });
    }

    // 3. Beneficiaries linked to this patient account (owner view).
    let beneficiaries = [];
    if (!beneficiaryInfo) {
      const { data: bens, error: bensErr } = await supabase
        .from('beneficiaries')
        .select('id, full_name, age, gender, relationship')
        .eq('patient_id', patient.id);
      if (bensErr) throw bensErr;
      beneficiaries = bens || [];
    }

    // 4. Appointment history for this patient (account owner).
    const { data: appts, error: apptsErr } = await supabase
      .from('appointments')
      .select(
        `id,
        appointment_date,
        status,
        booking_type,
        doctor_profiles (
          first_name,
          last_name,
          specialization
        )`
      )
      .eq('patient_id', patient.id)
      .order('appointment_date', { ascending: false })
      .limit(20);

    if (apptsErr) throw apptsErr;
    const history = (appts || []).map((a) => ({
      id: a.id,
      date: a.appointment_date,
      status: a.status === 'CONFIRMED' ? 'PENDING' : a.status,
      bookingType: a.booking_type,
      doctor: `Dr. ${a.doctor_profiles?.first_name || ''} ${a.doctor_profiles?.last_name || ''}`.trim() || '—',
      specialty: a.doctor_profiles?.specialization || '—',
    }));

    const user = patient.users?.[0] || patient.users || {};

    const detail = {
      id: patient.id,
      referenceId: shortPatientId(patient.id),
      firstName: patient.first_name || '',
      lastName: patient.last_name || '',
      name: `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || '—',
      age: ageFromDob(patient.date_of_birth),
      gender: patient.gender || '',
      phone: patient.phone_number || '',
      email: user.email || '',
      username: user.username || '',
      bloodGroup: patient.blood_group || '',
      address: patient.home_address || '',
      emergencyContact: patient.emergency_contact_name || '',
      emergencyRelation: patient.emergency_contact_rel || '',
      emergencyPhone: patient.emergency_contact_phone || '',
      dateOfBirth: patient.date_of_birth || null,
      beneficiary: beneficiaryInfo,
      beneficiaries: beneficiaryInfo ? [] : beneficiaries,
      history,
    };

    res.json({ patient: detail });
  } catch (error) {
    console.error('Error in getAdminPatientById:', error);
    next(error);
  }
};

/**
 * Formats a TIME column (HH:MM:SS) into a 12-hour label.
 */
const formatScanTime = (timeStr) => {
  if (!timeStr) return '—';
  const [hours, minutes] = timeStr.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return timeStr;
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${String(minutes).padStart(2, '0')} ${period}`;
};

/**
 * Formats a `YYYY-MM-DD` date into a friendly label (e.g. "Wed, Aug 28, 2026").
 */
const formatScanDate = (dateStr) => {
  if (!dateStr) return '—';
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

/**
 * Validates a scanned appointment id (UUID v4, case-insensitive).
 */
/**
 * Validates a scanned appointment id (UUID v4, case-insensitive).
 */
const isValidAppointmentUuid = (value) => {
  if (typeof value !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
};

/**
 * GET /api/admin/scan/:appointmentId
 * Resolves a QR-scanned appointment into the full detail card used by the
 * Admin "Scan QR" page.
 *
 * The QR payload embeds `{ appointment_id, verification_code }`; the admin
 * scanner passes the appointment id here and we join everything needed:
 *   - Patient profile (photo, name, date_of_birth, gender) + auth email
 *   - Beneficiary (for BENEFICIARY bookings) — name + relationship on top of
 *     the account holder's profile photo
 *   - Doctor schedule (date + time window) and doctor profile (name + specialty)
 *   - Payments (method + status)
 *
 * Queue number is NOT a stored column — it is derived positionally from the
 * appointment's created_at order within its schedule, matching the existing
 * queue token format (A-01, A-02, …).
 */
export const getScannedAppointment = async (req, res, next) => {
  try {
    const { appointmentId } = req.params;
    if (!isValidAppointmentUuid(appointmentId)) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid appointment ID in QR payload.' });
    }

    // 1. Resolve the appointment with all related data.
    const { data: appointment, error } = await supabase
      .from('appointments')
      .select(
        `id,
        patient_id,
        booking_type,
        beneficiary_id,
        doctor_id,
        schedule_id,
        appointment_date,
        status,
        payment_status,
        created_at,
        patient_profiles (
          id,
          first_name,
          last_name,
          date_of_birth,
          gender,
          phone_number,
          profile_picture_url,
          users ( email )
        ),
        beneficiaries (
          id,
          full_name,
          age,
          gender,
          relationship
        ),
        doctor_profiles (
          id,
          first_name,
          last_name,
          specialization,
          doctor_image,
          specialties ( id, name )
        ),
        doctor_schedules (
          id,
          available_date,
          start_time,
          end_time,
          max_patients
        ),
        payments (
          id,
          amount,
          payment_method,
          payment_status
        )`,
      )
      .eq('id', appointmentId)
      .maybeSingle();

    if (error) throw error;
    if (!appointment) {
      return res
        .status(404)
        .json({ success: false, message: 'Appointment not found for the scanned QR code.' });
    }

    // 2. Derive the queue position.
    let queuePosition = null;
    if (appointment.schedule_id) {
      const { data: queueAppts, error: queueError } = await supabase
        .from('appointments')
        .select('id, created_at')
        .eq('schedule_id', appointment.schedule_id)
        .neq('status', 'CANCELLED')
        .order('created_at', { ascending: true });

      if (queueError) throw queueError;
      const index = (queueAppts || []).findIndex((a) => a.id === appointment.id);
      if (index !== -1) queuePosition = index + 1;
    }

    // 3. Resolve the displayed patient (beneficiary takes precedence by name,
    //    but the profile picture/Dob come from the account holder profile).
    const profile = appointment.patient_profiles || {};
    const beneficiary = appointment.beneficiaries || null;
    const isBeneficiary = appointment.booking_type === 'BENEFICIARY';

    const patientName = isBeneficiary && beneficiary
      ? beneficiary.full_name || '—'
      : `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || '—';

    const patientDob = profile.date_of_birth || '';
    const patientAge = isBeneficiary && beneficiary
      ? (beneficiary.age ?? ageFromDob(patientDob))
      : ageFromDob(patientDob);

    const schedule = appointment.doctor_schedules || {};
    const doctor = appointment.doctor_profiles || {};

    res.json({
      success: true,
      data: {
        appointment: {
          id: appointment.id,
          displayId: shortPatientId(appointment.id),
          verificationCode: `CHK-${String(appointment.id).replace(/-/g, '').slice(0, 8).toUpperCase()}`,
          bookingType: appointment.booking_type,
          isBeneficiary,
          status: appointment.status,
          appointmentDate: schedule.available_date || appointment.appointment_date,
          dateLabel: formatScanDate(schedule.available_date || appointment.appointment_date),
          timeLabel: schedule.start_time ? `${formatScanTime(schedule.start_time)} – ${formatScanTime(schedule.end_time)}` : '—',
          queueNumber: queuePosition ? `A-${String(queuePosition).padStart(2, '0')}` : '—',
          createdAt: appointment.created_at,
          patient: {
            profileId: profile.id || null,
            name: patientName,
            age: patientAge ?? null,
            dateOfBirth: patientDob || '',
            gender: profile.gender || (beneficiary?.gender || ''),
            phone: profile.phone_number || '',
            email: profile.users?.[0]?.email || '',
            profilePictureUrl: profile.profile_picture_url || null,
            relationship: isBeneficiary ? beneficiary?.relationship || 'Beneficiary' : 'Self',
          },
          doctor: {
            name: `${doctor.first_name || ''} ${doctor.last_name || ''}`.trim() || '—',
            specialty: doctor.specialties?.name || doctor.specialization || '—',
            image: doctor.doctor_image || null,
          },
          payment: {
            method: appointment.payments?.payment_method || '',
            status: appointment.payment_status || appointment.payments?.payment_status || 'UNPAID',
            amount: appointment.payments?.amount ?? null,
          },
        },
      },
    });
  } catch (error) {
    console.error('Error in getScannedAppointment:', error);
    next(error);
  }
};

/**
 * POST /api/admin/scan/:appointmentId/confirm
 * Confirms a verified, on-desk appointment from the "Scan QR" page:
 *   - appointments.status         -> 'COMPLETED'
 *   - appointments.payment_status -> 'PAID'  (new column, added by migration)
 *   - linked payments.payment_status -> 'PAID' + paid_at (keeps the rest of the
 *     app consistent for the same appointment)
 *
 * Only PENDING/CONFIRMED appointments can be confirmed (avoids re-triggering
 * the change for already-completed or cancelled bookings).
 */
export const confirmScannedAppointment = async (req, res, next) => {
  try {
    const { appointmentId } = req.params;
    if (!isValidAppointmentUuid(appointmentId)) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid appointment ID.' });
    }

    // 1. Fetch the appointment to inspect its current status.
    const { data: appointment, error } = await supabase
      .from('appointments')
      .select('id, status')
      .eq('id', appointmentId)
      .maybeSingle();

    if (error) throw error;
    if (!appointment) {
      return res
        .status(404)
        .json({ success: false, message: 'Appointment not found for the scanned QR code.' });
    }

    if (appointment.status === 'COMPLETED') {
      return res
        .status(409)
        .json({ success: false, message: 'Appointment is already completed.' });
    }
    if (appointment.status === 'CANCELLED') {
      return res
        .status(409)
        .json({ success: false, message: 'Cannot confirm a cancelled appointment.' });
    }

    // 2. Mark the appointment COMPLETED + its payment PAID.
    const { data: updated, error: updateError } = await supabase
      .from('appointments')
      .update({ status: 'COMPLETED', payment_status: 'PAID' })
      .eq('id', appointmentId)
      .select('id, status, payment_status')
      .maybeSingle();

    if (updateError) throw updateError;

    // 3. Keep the linked payments row in sync (best effort).
    const { error: payErr } = await supabase
      .from('payments')
      .update({ payment_status: 'PAID', paid_at: new Date().toISOString() })
      .eq('appointment_id', appointmentId);
    if (payErr) {
      console.warn('Could not update linked payment row:', payErr.message);
    }

    res.json({
      success: true,
      data: { appointment: updated },
    });
  } catch (error) {
    console.error('Error in confirmScannedAppointment:', error);
    next(error);
  }
};