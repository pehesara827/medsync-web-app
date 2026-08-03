import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

import userRoutes from './routes/userRoutes.js';
import patientRoutes from './routes/patientRoutes.js';

// Routes
app.use('/api/users', userRoutes);
app.use('/api/auth', patientRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// JSON error-handling middleware (must be after all routes)
app.use((err, req, res, next) => {
  // Determine status code: use err.status if set, otherwise 500
  const status = err.status || 500;

  // Extract a meaningful message
  let message = err.message || 'Internal server error';

  // Handle Supabase AuthApiError (e.g., "A user with this email address has already been registered")
  if (err.name === 'AuthApiError' || err.name === 'AuthRetryableFetchError') {
    // If the error has a status, use it (e.g., 422 for duplicate email)
    const authStatus = err.status || status;
    return res.status(authStatus).json({ message });
  }

  // Handle duplicate key violations (Postgres error code 23505)
  if (err.code === '23505') {
    const detail = err.details || err.message || '';
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

  // Handle body-parser JSON parse errors
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Invalid JSON in request body.' });
  }

  // Default: return JSON error
  res.status(status).json({ message });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
