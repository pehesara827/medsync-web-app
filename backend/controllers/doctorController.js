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
          consultationFee: schedule?.consultation_fee ?? 0,
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
