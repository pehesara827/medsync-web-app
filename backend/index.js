import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Ensure backend/.env loads regardless of cwd (repo root vs backend/).
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
  : ['http://localhost:5173', 'http://127.0.0.1:5173'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl) and any origin
      // in the CORS_ORIGINS allow-list. Never use a blanket wildcard.
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    optionsSuccessStatus: 204,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

import userRoutes from './routes/userRoutes.js';
import patientRoutes from './routes/patientRoutes.js';
import userProfileRoutes from './routes/user_profile_routes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import specialtyRoutes from './routes/specialtyRoutes.js';
import doctorRoutes from './routes/doctorRoutes.js';
import favoriteRoutes from './routes/favoriteRoutes.js';
import waitlistRoutes from './routes/waitlistRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import scheduleRoutes from './routes/scheduleRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import { expireExpiredOffers } from './models/waitlistModel.js';
import { markMissedAppointments, sendPendingReviewRequests } from './models/appointmentModel.js';

// Routes
app.use('/api/users', userRoutes);
app.use('/api/auth', patientRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/specialties', specialtyRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/waitlist', waitlistRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/schedules', scheduleRoutes);

app.use('/api/patient/profile', userProfileRoutes);

app.use('/api/payments', paymentRoutes);
app.use('/api/chat', chatRoutes);

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

  // Map PostgreSQL data/integrity errors to friendly 4xx responses instead of
  // leaking a raw 500 for bad user input (e.g. invalid dates, NOT NULL,
  // failed CHECK constraints, value too long for type).
  const pgCodeStatus = {
    '22P02': 400, // invalid_text_representation (e.g. bad date/number)
    '22001': 400, // string_data_right_truncation
    '22003': 400, // numeric_value_out_of_range
    '23502': 400, // not_null_violation
    '23503': 400, // foreign_key_violation
    '23514': 400, // check_violation
    '23505': 409, // unique_violation (duplicate)
    '23507': 400, // foreign_key_no_action (e.g. deleting a referenced row)
  };
  if (err && err.code && pgCodeStatus[err.code]) {
    return res.status(pgCodeStatus[err.code]).json({
      message: err.details || err.message || 'Invalid data provided.',
    });
  }

  // Default: return JSON error
  res.status(status).json({ message });
});

// ── Waitlist Offer Expiry Scheduler ─────────────────────────────────────
// Runs every 5 minutes. Any NOTIFIED waitlist offer whose 2-hour claim
// window has lapsed is automatically expired and cascaded to the next
// patient in the FIFO queue.
const WAITLIST_EXPIRY_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

const runWaitlistExpiry = async () => {
  try {
    const expiredCount = await expireExpiredOffers();
    if (expiredCount > 0) {
      console.log(`[Scheduler] Expired ${expiredCount} waitlist offer(s).`);
    }
  } catch (error) {
    console.error('[Scheduler] Error running waitlist expiry:', error.message);
  }
};

// ── Missed-Appointment Sweeper ──────────────────────────────────────────
// Runs every 10 minutes. Any PENDING/CONFIRMED appointment whose
// appointment_date is before today is marked MISSED and its patient
// receives an APPOINTMENT_MISSED in-app notification. Idempotent: only
// active rows match, so overlapping ticks never double-mark/notify.
const MISSED_SWEEP_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

const runMissedSweep = async () => {
  try {
    const missedCount = await markMissedAppointments();
    if (missedCount > 0) {
      console.log(`[Scheduler] Marked ${missedCount} appointment(s) as MISSED.`);
    }
  } catch (error) {
    console.error('[Scheduler] Error running missed-appointment sweep:', error.message);
  }
};

// ── Review-Request Sweeper ──────────────────────────────────────────────
// Runs every 10 minutes. Any COMPLETED appointment from the last 7 days with
// no review and no REVIEW_REQUEST notification gets one review request.
// Idempotent: reviewed / already-notified rows are skipped.
const REVIEW_SWEEP_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

const runReviewSweep = async () => {
  try {
    const sentCount = await sendPendingReviewRequests();
    if (sentCount > 0) {
      console.log(`[Scheduler] Sent ${sentCount} review request(s).`);
    }
  } catch (error) {
    console.error('[Scheduler] Error running review-request sweep:', error.message);
  }
};

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);

  // Run once shortly after startup, then on the interval
  setTimeout(runWaitlistExpiry, 10 * 1000);
  setInterval(runWaitlistExpiry, WAITLIST_EXPIRY_INTERVAL_MS);
  console.log(`[Scheduler] Waitlist expiry job scheduled every ${WAITLIST_EXPIRY_INTERVAL_MS / 60000} minutes.`);

  setTimeout(runMissedSweep, 20 * 1000);
  setInterval(runMissedSweep, MISSED_SWEEP_INTERVAL_MS);
  console.log(`[Scheduler] Missed-appointment sweep scheduled every ${MISSED_SWEEP_INTERVAL_MS / 60000} minutes.`);

  setTimeout(runReviewSweep, 30 * 1000);
  setInterval(runReviewSweep, REVIEW_SWEEP_INTERVAL_MS);
  console.log(`[Scheduler] Review-request sweep scheduled every ${REVIEW_SWEEP_INTERVAL_MS / 60000} minutes.`);
});
