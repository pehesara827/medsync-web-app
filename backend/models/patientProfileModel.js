import { supabase } from '../supabase.js';

export const create = async (profileData) => {
  const { data, error } = await supabase
    .from('patient_profiles')
    .insert([profileData])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const findByUserId = async (userId) => {
  const { data, error } = await supabase
    .from('patient_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) throw error;
  return data;
};