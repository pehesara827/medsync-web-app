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
import userProfileRoutes from './routes/user_profile_routes.js';

// Routes
app.use('/api/users', userRoutes);
app.use('/api/auth', patientRoutes);

app.use('/api/patient/profile', userProfileRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});