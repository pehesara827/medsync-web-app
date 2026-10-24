import * as patientService from '../services/patientService.js';
import * as doctorService from '../services/doctorService.js';

export const registerPatient = async (req, res, next) => {
  try {
    const result = await patientService.registerPatient(req.body);
    res.status(201).json({
      message: 'Patient registered successfully',
      user: result.user,
      profile: result.profile,
    });
  } catch (error) {
    // Handle Supabase AuthApiError (e.g. duplicate email from createAuthUser).
    // These errors are not Postgres error codes, so they wouldn't match the
    // 23505 check below. Map them to a proper HTTP status instead of 500.
    if (error.name === 'AuthApiError' || error.name === 'AuthRetryableFetchError') {
      const status = error.status || 400;
      return res.status(status).json({
        message: error.message || 'Registration failed. Please try again.',
      });
    }

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

export const registerDoctor = async (req, res, next) => {
  try {
    const result = await doctorService.registerDoctor(req.body);
    res.status(201).json({
      message: 'Doctor registered successfully',
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
