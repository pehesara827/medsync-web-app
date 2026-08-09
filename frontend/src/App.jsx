// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Import Layouts
import { PublicLayout } from './layouts/PublicLayout';
import { PatientLayout } from './layouts/PatientLayout';
import { DoctorLayout } from './layouts/DoctorLayout';
import { AdminLayout } from './layouts/AdminLayout';

// Import Route Guard
import ProtectedRoute from './components/ProtectedRoute';

import PatientDashboard from './Patients/pages/patients-dashboard';
import PatientsAppointments from './Patients/pages/patients-appoinments';
import AppointmentConfirmationPage from './Patients/pages/AppointmentConfirmationPage';
import QRCodePage from './Patients/pages/QRCodePage';

import PatientProfile from './Patients/pages/patientProfile';

import PatientsDoctors from './Patients/pages/patients-doctors';


import AdminDashboard from './Admins/pages/adminDashboard';
import QueueManagement from './Admins/pages/queueManagement';


import DoctorDashboard from './Doctors/pages/doctorsDashboard';

import HomePage from './PublicSite/pages/Home';
import SignupPage from './PublicSite/pages/Signup';
import LoginPage from './PublicSite/pages/Login';

function NotFound() {
  return <div className="p-8 text-center text-2xl font-bold">404 - Page Not Found</div>;
}

export default function App() {
  return (
    <Router>
      <Routes>

        {/* 1. PUBLIC ROUTES (Main Navbar) */}
        <Route path="/" element={<PublicLayout />}>
          <Route index element={<HomePage />} />
          <Route path="signup" element={<SignupPage />} />
        </Route>

        {/* Standalone login page (no navbar) */}
        <Route path="/login" element={<LoginPage />} />

        {/* 2. PATIENT ROUTES (Patient Sidebar) - Protected */}
        <Route element={<ProtectedRoute allowedRoles={['PATIENT']} />}>
          <Route path="/patient" element={<PatientLayout />}>
            <Route index element={<PatientDashboard />} />
            <Route path="appointments" element={<PatientsAppointments />} />
            <Route path="appointments/:appointmentId" element={<AppointmentConfirmationPage />} />
            <Route path="qr-codes" element={<QRCodePage />} />
            <Route path="profile" element={<PatientProfile />} />
            <Route path="doctors" element={<PatientsDoctors />} />
          </Route>
        </Route>

        {/* 3. DOCTOR ROUTES (Doctor Sidebar) - Protected */}
        <Route element={<ProtectedRoute allowedRoles={['DOCTOR']} />}>
          <Route path="/doctor" element={<DoctorLayout />}>
            <Route index element={<DoctorDashboard />} />
          </Route>
        </Route>

        {/* 4. ADMIN ROUTES (Admin Sidebar) - Protected */}
        <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="queue-management" element={<QueueManagement />} />
          </Route>
        </Route>

        {/* Catch-all route for unknown URLs */}
        <Route path="*" element={<NotFound />} />

      </Routes>
    </Router>
  );
}