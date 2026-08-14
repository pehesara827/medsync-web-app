import { supabase } from '../supabase.js';

export const getFavoritesByPatientId = async (patientId) => {
  const { data, error } = await supabase
    .from('patient_favorite_doctors')
    .select(`
      doctor_id,
      doctor_profiles (
        id,
        first_name,
        last_name,
        specialization,
        experience_years,
        doctor_image,
        rating,
        review_count,
        specialties (
          id,
          name
        )
      )
    `)
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const createFavorite = async (patientId, doctorId) => {
  const { data, error } = await supabase
    .from('patient_favorite_doctors')
    .insert([
      {
        patient_id: patientId,
        doctor_id: doctorId,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteFavorite = async (patientId, doctorId) => {
  const { data, error } = await supabase
    .from('patient_favorite_doctors')
    .delete()
    .eq('patient_id', patientId)
    .eq('doctor_id', doctorId)
    .single();

  if (error) throw error;
  return data;
};
