import * as favoriteModel from '../models/favoriteModel.js';
import { supabase } from '../supabase.js';

const mapFavoriteDoctor = (favoriteRow, scheduleData = null) => {
  const doctor = favoriteRow.doctor_profiles || {};
  const specialty = doctor.specialties?.[0]?.name || doctor.specialization || '';

  const nextAvailable = scheduleData 
    ? `${scheduleData.available_date} at ${scheduleData.start_time}`
    : 'Today, 2:30 PM';
  
  const availableDate = scheduleData 
    ? scheduleData.available_date 
    : new Date().toISOString().split('T')[0];

  return {
    id: doctor.id,
    name: `Dr. ${doctor.first_name || ''} ${doctor.last_name || ''}`.trim(),
    specialty,
    clinic: doctor.specialization || '',
    rating: doctor.rating ?? 0,
    reviewsCount: doctor.review_count ?? 0,
    experience: doctor.experience_years ?? 0,
    nextAvailable,
    availableDate,
    image: doctor.doctor_image || '',
    modes: ['Telehealth', 'In-Person'],
    consultationFee: scheduleData?.consultation_fee ?? 0,
    isFavorite: true,
  };
};

// Helper function to get next available schedule for a doctor
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
    console.error('Error fetching schedule:', error);
    return null;
  }
};

export const getPatientFavorites = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    if (!patientId) {
      return res.status(400).json({ message: 'Patient ID is required.' });
    }

    const favorites = await favoriteModel.getFavoritesByPatientId(patientId);
    const favoriteDoctorIds = favorites.map((row) => row.doctor_id);
    
    // Fetch schedule data for each favorite doctor
    const favoriteDoctors = await Promise.all(
      favorites.map(async (favoriteRow) => {
        const doctor = favoriteRow.doctor_profiles || {};
        const scheduleData = await getNextAvailableSchedule(doctor.id);
        return mapFavoriteDoctor(favoriteRow, scheduleData);
      })
    );

    res.json({ favoriteDoctorIds, favorites: favoriteDoctors });
  } catch (error) {
    next(error);
  }
};

export const createFavorite = async (req, res, next) => {
  try {
    const { patient_id: patientId, doctor_id: doctorId } = req.body;
    if (!patientId || !doctorId) {
      return res.status(400).json({ message: 'patient_id and doctor_id are required.' });
    }

    const favorite = await favoriteModel.createFavorite(patientId, doctorId);
    res.status(201).json({ favorite });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ message: 'Doctor is already in favorites.' });
    }
    next(error);
  }
};

export const deleteFavorite = async (req, res, next) => {
  try {
    const patientId = req.query.patient_id || req.body.patient_id;
    const doctorId = req.query.doctor_id || req.body.doctor_id;

    if (!patientId || !doctorId) {
      return res.status(400).json({ message: 'patient_id and doctor_id are required.' });
    }

    const deleted = await favoriteModel.deleteFavorite(patientId, doctorId);
    if (!deleted) {
      return res.status(404).json({ message: 'Favorite not found.' });
      }

    res.json({ message: 'Favorite removed successfully.' });
  } catch (error) {
    next(error);
  }
};

export const toggleFavorite = async (req, res, next) => {
  try {
    const { patient_id: patientId, doctor_id: doctorId } = req.body;

    if (!patientId || !doctorId) {
      return res.status(400).json({ message: 'patient_id and doctor_id are required.' });
    }

    // Check if already favorited
    const favorites = await favoriteModel.getFavoritesByPatientId(patientId);
    const isFavorited = favorites.some(fav => fav.doctor_id === doctorId);

    if (isFavorited) {
      // Remove favorite
      await favoriteModel.deleteFavorite(patientId, doctorId);
      res.json({ isFavorite: false, message: 'Favorite removed successfully.' });
    } else {
      // Add favorite
      const favorite = await favoriteModel.createFavorite(patientId, doctorId);
      res.status(201).json({ isFavorite: true, favorite });
    }
  } catch (error) {
    next(error);
  }
};
