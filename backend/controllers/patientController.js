import * as patientService from '../services/patientService.js';

export const registerPatient = async (req, res, next) => {
  try {
    const result = await patientService.registerPatient(req.body);
    res.status(201).json({
      message: 'Patient registered successfully',
      user: result.user,
      profile: result.profile,
    });
  } catch (error) {
    // Handle duplicate key violations (email, username, phone, national_id)
    if (error.code === '23505') {
      const detail = error.details || error.message || '';
      let field = 'a unique field';
      if (detail.includes('username')) field = 'Username';
      else if (detail.includes('email')) field = 'Email';
      else if (detail.includes('phone_number')) field = 'Phone number';
      else if (detail.includes('national_id_passport')) field = 'National ID / Passport';

      return res.status(409).json({
        message: `${field} already exists. Please use a different value.`,
        field: field.toLowerCase().replace(/\s+/g, '_'),
      });
    }

    next(error);
  }
};