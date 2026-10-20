import { supabase } from '../supabase.js';

/**
 * GET /api/specialties
 * Returns all specialties from the database
 */
export const getSpecialties = async (req, res, next) => {
  try {
    const { data: specialties, error } = await supabase
      .from('specialties')
      .select('id, name, description')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching specialties:', error);
      return res.status(500).json({ message: 'Failed to fetch specialties' });
    }

    res.json({ specialties });
  } catch (error) {
    console.error('Error in getSpecialties:', error);
    next(error);
  }
};

/**
 * GET /api/specialties/top
 * Returns the top 7 most important specialties for the browse section
 */
export const getTopSpecialties = async (req, res, next) => {
  try {
    const { data: specialties, error } = await supabase
      .from('specialties')
      .select('id, name, description')
      .order('name', { ascending: true })
      .limit(7);

    if (error) {
      console.error('Error fetching top specialties:', error);
      return res.status(500).json({ message: 'Failed to fetch specialties' });
    }

    res.json({ specialties });
  } catch (error) {
    console.error('Error in getTopSpecialties:', error);
    next(error);
  }
};