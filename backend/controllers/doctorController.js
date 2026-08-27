import { supabase } from '../supabase.js';
import { createNotification } from '../models/notificationModel.js';

/**
 * Fetches the next available schedule row for a doctor.
 * @param {string} doctorId - The doctor UUID
 * @returns {Promise<Object|null>} The next available schedule row or null if none found
 */
const getNextAvailableSchedule = async (doctorId) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('doctor_schedules')
      .select('available_date, start_time, consultation_fee')
      .eq('doctor_id', doctorId)
      .eq('is_booked', false)
      .gte('available_date', today)
      .order('available_date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error fetching next available schedule:', error);
    return null;
  }
};

/**
 * GET /api/doctors
 * Returns all approved doctors with their ratings, review counts, specialties,
 * and schedule-derived consultation fee and experience.
 */
export const getDoctors = async (req, res, next) => {
  try {
    const { data: doctors, error } = await supabase
      .from('doctor_profiles')
      .select(
        `
        id,
        user_id,
        first_name,
        last_name,
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
        )
      `
      )
      .eq('is_approved', true)
      .order('rating', { ascending: false })
      .order('review_count', { ascending: false });

    if (error) {
      console.error('Error fetching doctors:', error);
      return res.status(500).json({ message: 'Failed to fetch doctors' });
    }

    const doctorsWithDetails = await Promise.all(
      doctors.map(async (doctor) => {
        const schedule = await getNextAvailableSchedule(doctor.id);

        return {
          ...doctor,
          experience: doctor.experience_years ?? 0,
          consultationFee: schedule?.consultation_fee ?? doctor.consultation_fee ?? 0,
          nextAvailable: schedule
            ? `${schedule.available_date} at ${schedule.start_time}`
            : 'Today, 2:30 PM',
          availableDate: schedule?.available_date ?? new Date().toISOString().split('T')[0],
        };
      })
    );

    res.json({ doctors: doctorsWithDetails });
  } catch (error) {
    console.error('Error in getDoctors:', error);
    next(error);
  }
};

/**
 * GET /api/doctor/profile/:userId
 * Returns the doctor profile for a given user_id (the logged-in doctor).
 */
export const getDoctorProfile = async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required.' });
    }

    const { data: profile, error } = await supabase
      .from('doctor_profiles')
      .select(
        `
        id,
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
        )
      `
      )
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching doctor profile:', error);
      return res.status(500).json({ message: 'Failed to fetch doctor profile' });
    }

    if (!profile) {
      return res.status(404).json({ message: 'Doctor profile not found' });
    }

    // Count distinct patients treated (excluding cancelled appointments)
    let patientsTreated = 0;
    const { data: appointments, error: apptError } = await supabase
      .from('appointments')
      .select('patient_id')
      .eq('doctor_id', profile.id)
      .neq('status', 'CANCELLED');

    if (!apptError && appointments) {
      patientsTreated = new Set(appointments.map((a) => a.patient_id)).size;
    }

    // Parse education: stored as a comma-separated string or JSON array
    let education = [];
    if (Array.isArray(profile.education)) {
      education = profile.education;
    } else if (typeof profile.education === 'string' && profile.education.trim()) {
      education = profile.education
        .split(',')
        .map((e) => e.trim())
        .filter(Boolean);
    }

    // Parse bio: split description into paragraphs on newlines
    const bio = (profile.description || '')
      .split(/\n+/)
      .map((p) => p.trim())
      .filter(Boolean);

    res.json({
      doctor: {
        id: profile.id,
        userId: profile.user_id,
        firstName: profile.first_name,
        lastName: profile.last_name,
        fullName: `Dr. ${profile.first_name} ${profile.last_name}`.trim(),
        email: profile.users?.email || '',
        username: profile.users?.username || '',
        medicalLicenseNo: profile.medical_license_no,
        specialization: profile.specialization,
        specialtyName: profile.specialties?.name || profile.specialization || '',
        experienceYears: profile.experience_years ?? 0,
        isApproved: profile.is_approved,
        verified: Boolean(profile.is_approved),
        doctorImage: profile.doctor_image || '',
        rating: profile.rating ?? 0,
        reviewCount: profile.review_count ?? 0,
        consultationFee: profile.consultation_fee ?? 0,
        patientsTreated,
        bio,
        expertise: profile.specialties?.name
          ? [profile.specialties.name]
          : profile.specialization
          ? [profile.specialization]
          : [],
        education,
      },
    });
  } catch (error) {
    console.error('Error in getDoctorProfile:', error);
    next(error);
  }
};

/**
 * PUT /api/doctor/profile/:userId
 * Updates the doctor profile for a given user_id (the logged-in doctor).
 */
export const updateDoctorProfile = async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required.' });
    }

    const {
      first_name,
      last_name,
      specialization,
      experience_years,
      doctor_image,
      description,
      education,
      consultation_fee,
    } = req.body;

    // Build the update object with only provided fields
    const updates = {};
    if (first_name !== undefined) updates.first_name = first_name;
    if (last_name !== undefined) updates.last_name = last_name;
    if (specialization !== undefined) updates.specialization = specialization;
    if (experience_years !== undefined) updates.experience_years = experience_years;
    if (doctor_image !== undefined) updates.doctor_image = doctor_image;
    if (description !== undefined) updates.description = description;
    if (education !== undefined) {
      // Normalize education: array -> comma-separated string for storage
      updates.education = Array.isArray(education)
        ? education.map((e) => e.trim()).filter(Boolean).join(', ')
        : education;
    }
    if (consultation_fee !== undefined) updates.consultation_fee = consultation_fee;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No fields provided to update.' });
    }

    const { data: updatedProfile, error: updateError } = await supabase
      .from('doctor_profiles')
      .update(updates)
      .eq('user_id', userId)
      .select(
        `
        id,
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
        )
      `
      )
      .maybeSingle();

    if (updateError) {
      console.error('Error updating doctor profile:', updateError);
      return res.status(500).json({ message: 'Failed to update doctor profile' });
    }

    if (!updatedProfile) {
      return res.status(404).json({ message: 'Doctor profile not found' });
    }

    // Parse education for the response
    let educationList = [];
    if (Array.isArray(updatedProfile.education)) {
      educationList = updatedProfile.education;
    } else if (typeof updatedProfile.education === 'string' && updatedProfile.education.trim()) {
      educationList = updatedProfile.education
        .split(',')
        .map((e) => e.trim())
        .filter(Boolean);
    }

    // Parse bio for the response
    const bio = (updatedProfile.description || '')
      .split(/\n+/)
      .map((p) => p.trim())
      .filter(Boolean);

    res.json({
      doctor: {
        id: updatedProfile.id,
        userId: updatedProfile.user_id,
        firstName: updatedProfile.first_name,
        lastName: updatedProfile.last_name,
        fullName: `Dr. ${updatedProfile.first_name} ${updatedProfile.last_name}`.trim(),
        email: updatedProfile.users?.email || '',
        username: updatedProfile.users?.username || '',
        medicalLicenseNo: updatedProfile.medical_license_no,
        specialization: updatedProfile.specialization,
        specialtyName: updatedProfile.specialties?.name || updatedProfile.specialization || '',
        experienceYears: updatedProfile.experience_years ?? 0,
        isApproved: updatedProfile.is_approved,
        verified: Boolean(updatedProfile.is_approved),
        doctorImage: updatedProfile.doctor_image || '',
        rating: updatedProfile.rating ?? 0,
        reviewCount: updatedProfile.review_count ?? 0,
        consultationFee: updatedProfile.consultation_fee ?? 0,
        bio,
        expertise: updatedProfile.specialties?.name
          ? [updatedProfile.specialties.name]
          : updatedProfile.specialization
          ? [updatedProfile.specialization]
          : [],
        education: educationList,
      },
    });
  } catch (error) {
    console.error('Error in updateDoctorProfile:', error);
    next(error);
  }
};

/**
 * GET /api/doctor/appointments/:doctorId?date=YYYY-MM-DD
 * Returns all appointments for a doctor, with patient and schedule details.
 * Optionally filters by a specific date via the `date` query parameter.
 */
export const getDoctorAppointments = async (req, res, next) => {
  try {
    const { doctorId } = req.params;
    const { date } = req.query;

    if (!doctorId) {
      return res.status(400).json({ message: 'Doctor ID is required.' });
    }

    let query = supabase
      .from('appointments')
      .select(
        `
        id,
        patient_id,
        booking_type,
        beneficiary_id,
        doctor_id,
        schedule_id,
        appointment_date,
        status,
        qr_code_url,
        created_at,
        updated_at,
        patient_profiles (
          id,
          first_name,
          last_name,
          date_of_birth,
          gender,
          phone_number
        ),
        beneficiaries (
          id,
          full_name,
          age,
          gender,
          relationship
        ),
        doctor_schedules (
          id,
          available_date,
          start_time,
          end_time,
          consultation_fee,
          is_booked,
          max_patients,
          current_appointment
        ),
        payments (
          id,
          amount,
          payment_method,
          payment_status
        )
      `
      )
      .eq('doctor_id', doctorId)
      .neq('status', 'CANCELLED');

    // Optional date filter (YYYY-MM-DD)
    if (date) {
      query = query.eq('appointment_date', date);
    }

    const { data: appointments, error } = await query
      .order('appointment_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching doctor appointments:', error);
      return res.status(500).json({ message: 'Failed to fetch appointments' });
    }

    // Generate a structured display ID from a UUID (same format as patient side)
    // Format: MED-<first 8 chars of UUID uppercased, no dashes>
    const generateDisplayId = (uuid) => {
      if (!uuid) return 'MED-UNKNOWN';
      const shortId = uuid.replace(/-/g, '').slice(0, 8).toUpperCase();
      return `MED-${shortId}`;
    };

    // Format each appointment
    const formatted = (appointments || []).map((appt) => {
      const patient = appt.patient_profiles || {};
      const beneficiary = appt.beneficiaries || null;
      const schedule = appt.doctor_schedules || {};
      const payment = appt.payments || {};

      // Determine patient display name
      let patientName = '';
      if (appt.booking_type === 'BENEFICIARY' && beneficiary) {
        patientName = beneficiary.relationship
          ? `${beneficiary.full_name} (${beneficiary.relationship})`
          : beneficiary.full_name;
      }
      if (!patientName) {
        patientName = `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || '—';
      }

      // Format time to 12-hour
      const formatTime = (timeStr) => {
        if (!timeStr) return '—';
        const [hours, minutes] = timeStr.split(':').map(Number);
        if (Number.isNaN(hours) || Number.isNaN(minutes)) return timeStr;
        const period = hours >= 12 ? 'PM' : 'AM';
        const hour12 = hours % 12 === 0 ? 12 : hours % 12;
        return `${hour12}:${String(minutes).padStart(2, '0')} ${period}`;
      };

      return {
        id: appt.id,
        displayId: generateDisplayId(appt.id),
        patientId: appt.patient_id,
        patientName,
        patientFirstName: patient.first_name || '',
        patientLastName: patient.last_name || '',
        patientGender: patient.gender || '',
        patientDob: patient.date_of_birth || '',
        patientPhone: patient.phone_number || '',
        bookingType: appt.booking_type,
        beneficiaryId: appt.beneficiary_id,
        beneficiaryName: beneficiary?.full_name || null,
        beneficiaryRelationship: beneficiary?.relationship || null,
        appointmentDate: appt.appointment_date,
        status: appt.status,
        startTime: schedule.start_time || '',
        endTime: schedule.end_time || '',
        timeLabel: formatTime(schedule.start_time),
        consultationFee: schedule.consultation_fee ?? 0,
        maxPatients: schedule.max_patients ?? 1,
        currentAppointment: schedule.current_appointment ?? 0,
        paymentStatus: payment.payment_status || 'UNPAID',
        paymentMethod: payment.payment_method || '',
        amount: payment.amount ?? 0,
        qrCodeUrl: appt.qr_code_url,
        createdAt: appt.created_at,
        updatedAt: appt.updated_at,
      };
    });

    res.json({ appointments: formatted });
  } catch (error) {
    console.error('Error in getDoctorAppointments:', error);
    next(error);
  }
};

/**
 * GET /api/doctor/recent-consultations/:doctorId
 * Returns COMPLETED appointments for a doctor, formatted for the
 * "Recent Consultations" table on the appointments page.
 */
export const getRecentConsultations = async (req, res, next) => {
  try {
    const { doctorId } = req.params;

    if (!doctorId) {
      return res.status(400).json({ message: 'Doctor ID is required.' });
    }

    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(
        `
        id,
        booking_type,
        beneficiary_id,
        appointment_date,
        status,
        created_at,
        patient_profiles (
          id,
          first_name,
          last_name
        ),
        beneficiaries (
          id,
          full_name,
          relationship
        ),
        doctor_schedules (
          id,
          start_time
        )
      `
      )
      .eq('doctor_id', doctorId)
      .eq('status', 'COMPLETED')
      .order('appointment_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching recent consultations:', error);
      return res.status(500).json({ message: 'Failed to fetch recent consultations' });
    }

    // Format a date + time into "Oct 5, 14:00" style label
    const formatDateTime = (dateStr, timeStr) => {
      if (!dateStr) return '—';
      const date = new Date(`${dateStr}T00:00:00`);
      if (Number.isNaN(date.getTime())) return dateStr;

      const dateLabel = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });

      if (!timeStr) return dateLabel;

      const [hours, minutes] = timeStr.split(':').map(Number);
      if (Number.isNaN(hours) || Number.isNaN(minutes)) return `${dateLabel}, ${timeStr}`;
      return `${dateLabel}, ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    };

    // Map appointment status to a display status + tone
    const mapStatus = (status) => {
      switch (status) {
        case 'COMPLETED':
          return { status: 'Completed', tone: 'cyan' };
        case 'PENDING':
          return { status: 'Awaiting Labs', tone: 'amber' };
        case 'CONFIRMED':
          return { status: 'Awaiting Labs', tone: 'amber' };
        default:
          return { status: status || '—', tone: 'cyan' };
      }
    };

    const formatted = (appointments || []).map((appt) => {
      const patient = appt.patient_profiles || {};
      const beneficiary = appt.beneficiaries || null;
      const schedule = appt.doctor_schedules || {};

      // Determine patient display name
      let patientName = '';
      if (appt.booking_type === 'BENEFICIARY' && beneficiary) {
        patientName = beneficiary.relationship
          ? `${beneficiary.full_name} (${beneficiary.relationship})`
          : beneficiary.full_name;
      }
      if (!patientName) {
        patientName = `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || '—';
      }

      const { status, tone } = mapStatus(appt.status);

      return {
        id: appt.id,
        date: formatDateTime(appt.appointment_date, schedule.start_time),
        name: patientName,
        status,
        tone,
      };
    });

    res.json({ consultations: formatted });
  } catch (error) {
    console.error('Error in getRecentConsultations:', error);
    next(error);
  }
};

/**
 * PUT /api/doctor/schedules/:scheduleId
 * Updates the max_patients capacity for a specific schedule slot.
 * Recalculates is_booked based on current_appointment vs max_patients.
 */
export const updateScheduleCapacity = async (req, res, next) => {
  try {
    const { scheduleId } = req.params;
    const { max_patients } = req.body;

    if (!scheduleId) {
      return res.status(400).json({ message: 'Schedule ID is required.' });
    }

    if (max_patients === undefined || max_patients === null) {
      return res.status(400).json({ message: 'max_patients is required.' });
    }

    const maxPatients = parseInt(max_patients, 10);
    if (Number.isNaN(maxPatients) || maxPatients < 1) {
      return res.status(400).json({ message: 'max_patients must be a positive integer.' });
    }

    // Fetch current schedule to get current_appointment count
    const { data: currentSchedule, error: fetchError } = await supabase
      .from('doctor_schedules')
      .select('current_appointment')
      .eq('id', scheduleId)
      .single();

    if (fetchError) {
      console.error('Error fetching schedule:', fetchError);
      return res.status(404).json({ message: 'Schedule not found.' });
    }

    const currentCount = currentSchedule.current_appointment ?? 0;

    // Update max_patients and recalculate is_booked
    const { data: updatedSchedule, error: updateError } = await supabase
      .from('doctor_schedules')
      .update({
        max_patients: maxPatients,
        is_booked: currentCount >= maxPatients,
      })
      .eq('id', scheduleId)
      .select('id, max_patients, current_appointment, is_booked')
      .single();

    if (updateError) {
      console.error('Error updating schedule capacity:', updateError);
      return res.status(500).json({ message: 'Failed to update schedule capacity.' });
    }

    res.json({
      schedule: {
        id: updatedSchedule.id,
        maxPatients: updatedSchedule.max_patients,
        currentAppointment: updatedSchedule.current_appointment,
        isBooked: updatedSchedule.is_booked,
      },
    });
  } catch (error) {
    console.error('Error in updateScheduleCapacity:', error);
    next(error);
  }
};

/**
 * GET /api/doctor/session/current/:doctorId
 * Returns the doctor's current active session (today's schedule slot that
 * is currently in progress), along with any reported delay info.
 */
export const getCurrentSession = async (req, res, next) => {
  try {
    const { doctorId } = req.params;

    if (!doctorId) {
      return res.status(400).json({ message: 'Doctor ID is required.' });
    }

    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const nowTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    // Find today's schedule slot that is currently in progress
    const { data: schedule, error } = await supabase
      .from('doctor_schedules')
      .select('*')
      .eq('doctor_id', doctorId)
      .eq('available_date', today)
      .lte('start_time', nowTime)
      .gte('end_time', nowTime)
      .order('start_time', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching current session:', error);
      return res.status(500).json({ message: 'Failed to fetch current session' });
    }

    if (!schedule) {
      return res.status(404).json({ message: 'No active session right now.' });
    }

    res.json({
      session: {
        id: schedule.id,
        currentTime: nowTime,
        scheduledStart: schedule.start_time,
        scheduledEnd: schedule.end_time,
        delayMinutes: schedule.delay_minutes ?? 0,
        isDelayed: schedule.is_delayed ?? false,
        delayReportedAt: schedule.delay_reported_at,
        consultationFee: schedule.consultation_fee ?? 0,
        maxPatients: schedule.max_patients ?? 1,
        currentAppointment: schedule.current_appointment ?? 0,
      },
    });
  } catch (error) {
    console.error('Error in getCurrentSession:', error);
    next(error);
  }
};

/**
 * POST /api/doctor/session/delay/:doctorId
 * Reports a delay for the doctor's current active session.
 * Body: { minutes }
 */
export const reportSessionDelay = async (req, res, next) => {
  try {
    const { doctorId } = req.params;
    const { minutes } = req.body;

    if (!doctorId) {
      return res.status(400).json({ message: 'Doctor ID is required.' });
    }

    if (minutes === undefined || minutes === null) {
      return res.status(400).json({ message: 'minutes is required.' });
    }

    const delayMinutes = parseInt(minutes, 10);
    if (Number.isNaN(delayMinutes) || delayMinutes < 0) {
      return res.status(400).json({ message: 'minutes must be a non-negative integer.' });
    }

    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const nowTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    // Find today's active session
    const { data: schedule, error: fetchError } = await supabase
      .from('doctor_schedules')
      .select('id')
      .eq('doctor_id', doctorId)
      .eq('available_date', today)
      .lte('start_time', nowTime)
      .gte('end_time', nowTime)
      .order('start_time', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching current session:', fetchError);
      return res.status(500).json({ message: 'Failed to fetch current session' });
    }

    if (!schedule) {
      return res.status(404).json({ message: 'No active session right now.' });
    }

    // Update the delay fields on the active session
    const { data: updatedSchedule, error: updateError } = await supabase
      .from('doctor_schedules')
      .update({
        delay_minutes: delayMinutes,
        is_delayed: delayMinutes > 0,
        delay_reported_at: delayMinutes > 0 ? new Date().toISOString() : null,
      })
      .eq('id', schedule.id)
      .select('id, delay_minutes, is_delayed, delay_reported_at, start_time, end_time')
      .single();

    if (updateError) {
      console.error('Error reporting session delay:', updateError);
      return res.status(500).json({ message: 'Failed to report session delay.' });
    }

    res.json({
      session: {
        id: updatedSchedule.id,
        currentTime: nowTime,
        scheduledStart: updatedSchedule.start_time,
        scheduledEnd: updatedSchedule.end_time,
        delayMinutes: updatedSchedule.delay_minutes ?? 0,
        isDelayed: updatedSchedule.is_delayed ?? false,
        delayReportedAt: updatedSchedule.delay_reported_at,
      },
    });
  } catch (error) {
    console.error('Error in reportSessionDelay:', error);
    next(error);
  }
};

/**
 * GET /api/doctor/schedule/:doctorId
 * Returns the doctor's schedule from doctor_schedules.
 */
export const getDoctorSchedule = async (req, res, next) => {
  try {
    const { doctorId } = req.params;

    if (!doctorId) {
      return res.status(400).json({ message: 'Doctor ID is required.' });
    }

    const { data: schedules, error } = await supabase
      .from('doctor_schedules')
      .select('*')
      .eq('doctor_id', doctorId)
      .order('available_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Error fetching doctor schedule:', error);
      return res.status(500).json({ message: 'Failed to fetch schedule' });
    }

    res.json({ schedules: schedules || [] });
  } catch (error) {
    console.error('Error in getDoctorSchedule:', error);
    next(error);
  }
};

/**
 * GET /api/doctor/patients/:doctorId
 * Returns unique patients who have appointments with this doctor.
 */
export const getDoctorPatients = async (req, res, next) => {
  try {
    const { doctorId } = req.params;

    if (!doctorId) {
      return res.status(400).json({ message: 'Doctor ID is required.' });
    }

    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(
        `
        id,
        patient_id,
        booking_type,
        beneficiary_id,
        appointment_date,
        status,
        patient_profiles (
          id,
          first_name,
          last_name,
          date_of_birth,
          gender,
          phone_number,
          blood_group,
          home_address
        ),
        beneficiaries (
          id,
          full_name,
          age,
          gender,
          relationship
        )
      `
      )
      .eq('doctor_id', doctorId)
      .order('appointment_date', { ascending: false });

    if (error) {
      console.error('Error fetching doctor patients:', error);
      return res.status(500).json({ message: 'Failed to fetch patients' });
    }

    // Deduplicate by patient_id (or beneficiary_id for beneficiary bookings)
    const patientMap = new Map();

    (appointments || []).forEach((appt) => {
      const patient = appt.patient_profiles || {};
      const beneficiary = appt.beneficiaries || null;

      let key;
      let patientData;

      if (appt.booking_type === 'BENEFICIARY' && beneficiary) {
        key = `ben_${beneficiary.id}`;
        patientData = {
          id: beneficiary.id,
          name: beneficiary.full_name,
          age: beneficiary.age,
          gender: beneficiary.gender,
          relationship: beneficiary.relationship,
          bookingType: 'BENEFICIARY',
          lastVisit: appt.appointment_date,
          status: appt.status,
        };
      } else {
        key = `pat_${patient.id}`;
        patientData = {
          id: patient.id,
          name: `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || '—',
          age: patient.date_of_birth
            ? Math.floor((new Date() - new Date(patient.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000))
            : null,
          gender: patient.gender || '',
          phone: patient.phone_number || '',
          bloodGroup: patient.blood_group || '',
          address: patient.home_address || '',
          bookingType: 'SELF',
          lastVisit: appt.appointment_date,
          status: appt.status,
        };
      }

      if (!patientMap.has(key)) {
        patientMap.set(key, patientData);
      }
    });

    const patients = Array.from(patientMap.values());

    res.json({ patients });
  } catch (error) {
    console.error('Error in getDoctorPatients:', error);
    next(error);
  }
};

/**
 * GET /api/doctor/weekly-stats/:doctorId
 * Returns per-day patient counts for the current week (Monday-Sunday)
 * for a given doctor, suitable for a 7-column bar graph.
 */
export const getDoctorWeeklyStats = async (req, res, next) => {
  try {
    const { doctorId } = req.params;

    if (!doctorId) {
      return res.status(400).json({ message: 'Doctor ID is required.' });
    }

    // Compute the current week's Monday-Sunday date range
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + diffToMonday);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const startDateStr = weekStart.toISOString().split('T')[0];
    const endDateStr = weekEnd.toISOString().split('T')[0];
    const todayStr = now.toISOString().split('T')[0];

    // Fetch only the appointment dates for this doctor within the current week
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('appointment_date')
      .eq('doctor_id', doctorId)
      .neq('status', 'CANCELLED')
      .gte('appointment_date', startDateStr)
      .lte('appointment_date', endDateStr);

    if (error) {
      console.error('Error fetching weekly appointments:', error);
      return res.status(500).json({ message: 'Failed to fetch weekly stats' });
    }

    // Count appointments per date
    const countByDate = {};
    (appointments || []).forEach((appt) => {
      const date = appt.appointment_date;
      countByDate[date] = (countByDate[date] || 0) + 1;
    });

    // Build the 7-day array (Monday-Sunday)
    const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const weekly = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      return {
        date: dateStr,
        label: dayLabels[i],
        count: countByDate[dateStr] || 0,
        isToday: dateStr === todayStr,
      };
    });

    const total = weekly.reduce((sum, d) => sum + d.count, 0);
    const peakDay = weekly.reduce((max, d) => (d.count > max.count ? d : max), weekly[0]);

    res.json({
      weekStart: startDateStr,
      weekEnd: endDateStr,
      total,
      peakDay: {
        date: peakDay.date,
        label: peakDay.label,
        count: peakDay.count,
      },
      weekly,
    });
  } catch (error) {
    console.error('Error in getDoctorWeeklyStats:', error);
    next(error);
  }
};

/**
 * GET /api/admin/doctors/all
 * Returns ALL doctor profiles (approved + pending) joined with the auth
 * users(email, is_verified) and specialties(name) so the admin management
 * table can render email, verification status, and specialty.
 */
export const getAdminDoctorsAll = async (req, res, next) => {
  try {
    const { data: doctors, error } = await supabase
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
        specialty_id,
        specialties ( id, name ),
        users ( email, is_verified )`
      )
      .order('first_name', { ascending: true });

    if (error) throw error;

    const list = (doctors || []).map((d) => ({
      id: d.id,
      userId: d.user_id,
      firstName: d.first_name,
      lastName: d.last_name,
      fullName:
        [d.first_name, d.last_name].filter(Boolean).join(' ') || null,
      email: d.users?.email || null,
      isVerified: Boolean(d.users?.is_verified),
      medicalLicenseNo: d.medical_license_no,
      specialization: d.specialization,
      specialtyId: d.specialty_id,
      specialty: d.specialties?.name || null,
      experienceYears: d.experience_years ?? 0,
      isApproved: d.is_approved ?? false,
      doctorImage: d.doctor_image,
      rating: Number(d.rating ?? 0),
      reviewCount: d.review_count ?? 0,
      consultationFee: Number(d.consultation_fee ?? 0),
      description: d.description,
      education: d.education,
    }));

    res.json({ success: true, data: { doctors: list } });
  } catch (error) {
    console.error('Error in getAdminDoctorsAll:', error);
    next(error);
  }
};

/**
 * PATCH /api/admin/doctors/:doctorId/approve
 * Toggles a doctor's is_approved flag and dispatches a notification to the
 * doctor's user_id.
 *
 * Body: { isApproved: boolean }
 */
export const approveDoctor = async (req, res, next) => {
  try {
    const { doctorId } = req.params;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(doctorId)) {
      return res
        .status(400)
        .json({ success: false, message: 'doctorId must be a valid UUID.' });
    }

    const isApproved = Boolean(req.body?.isApproved);

    const { data: doctor, error } = await supabase
      .from('doctor_profiles')
      .update({ is_approved: isApproved })
      .eq('id', doctorId)
      .select('id, user_id, first_name, last_name, is_approved')
      .maybeSingle();

    if (error) throw error;
    if (!doctor) {
      return res
        .status(404)
        .json({ success: false, message: 'Doctor not found.' });
    }

    if (doctor.user_id) {
      try {
        await createNotification({
          user_id: doctor.user_id,
          type: 'GENERAL',
          title: isApproved ? 'Account approved' : 'Account pending',
          message: isApproved
            ? 'Congratulations! Your doctor account has been approved. You can now start accepting appointments.'
            : 'Your doctor account has been moved to pending. Please contact the admin for more details.',
          action_link: '/doctor/profile',
          metadata: { doctor_id: doctor.id },
        });
      } catch (notifError) {
        console.error('[ApproveDoctor] Notification failed:', notifError.message);
      }
    }

    res.json({
      success: true,
      data: {
        doctor: {
          id: doctor.id,
          isApproved: doctor.is_approved,
        },
      },
    });
  } catch (error) {
    console.error('Error in approveDoctor:', error);
    next(error);
  }
};


/**
 * PUT /api/admin/doctors/:doctorId/info
 * Updates editable profile details of a doctor. Only the provided fields are
 * updated; omitted fields are left unchanged.
 *
 * Body (any subset): specialty_id, consultation_fee, experience_years,
 *                    description, education
 */
export const updateAdminDoctorInfo = async (req, res, next) => {
  try {
    const { doctorId } = req.params;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(doctorId)) {
      return res
        .status(400)
        .json({ success: false, message: 'doctorId must be a valid UUID.' });
    }

    const {
      specialty_id,
      consultation_fee,
      experience_years,
      description,
      education,
    } = req.body || {};

    const updates = {};

    if (specialty_id !== undefined && specialty_id !== null) {
      updates.specialty_id = String(specialty_id).trim();
    }
    if (consultation_fee !== undefined && consultation_fee !== null) {
      const fee = Number(consultation_fee);
      if (Number.isNaN(fee) || fee < 0) {
        return res.status(400).json({
          success: false,
          message: 'consultation_fee must be a non-negative number.',
        });
      }
      updates.consultation_fee = fee;
    }
    if (experience_years !== undefined && experience_years !== null) {
      const years = Number(experience_years);
      if (Number.isNaN(years) || years < 0) {
        return res.status(400).json({
          success: false,
          message: 'experience_years must be a non-negative number.',
        });
      }
      updates.experience_years = years;
    }
    if (description !== undefined) {
      updates.description =
        typeof description === 'string'
          ? String(description).trim()
          : description;
    }
    if (education !== undefined) {
      updates.education =
        typeof education === 'string'
          ? String(education).trim()
          : education;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields provided to update.',
      });
    }

    const { data: doctor, error } = await supabase
      .from('doctor_profiles')
      .update(updates)
      .eq('id', doctorId)
      .select(
        `id,
        specialty_id,
        consultation_fee,
        experience_years,
        description,
        education,
        specialties ( id, name )`
      )
      .maybeSingle();

    if (error) throw error;
    if (!doctor) {
      return res
        .status(404)
        .json({ success: false, message: 'Doctor not found.' });
    }

    res.json({
      success: true,
      data: {
        doctor: {
          id: doctor.id,
          specialtyId: doctor.specialty_id,
          specialty: doctor.specialties?.name || null,
          consultationFee: Number(doctor.consultation_fee ?? 0),
          experienceYears: doctor.experience_years ?? 0,
          description: doctor.description,
          education: doctor.education,
        },
      },
    });
  } catch (error) {
    console.error('Error in updateAdminDoctorInfo:', error);
    next(error);
  }
};

