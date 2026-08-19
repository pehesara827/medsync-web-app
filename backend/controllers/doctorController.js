import { supabase } from '../supabase.js';

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
        doctorImage: profile.doctor_image || '',
        rating: profile.rating ?? 0,
        reviewCount: profile.review_count ?? 0,
        consultationFee: profile.consultation_fee ?? 0,
      },
    });
  } catch (error) {
    console.error('Error in getDoctorProfile:', error);
    next(error);
  }
};

/**
 * GET /api/doctor/appointments/:doctorId
 * Returns all appointments for a doctor, with patient and schedule details.
 */
export const getDoctorAppointments = async (req, res, next) => {
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
      .neq('status', 'CANCELLED')
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