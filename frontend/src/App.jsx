// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Import Layouts
import { PublicLayout } from './layouts/PublicLayout';
import { PatientLayout } from './layouts/PatientLayout';
import { DoctorLayout } from './layouts/DoctorLayout';
import { AdminLayout } from './layouts/AdminLayout';

// Import Dark Mode Provider
import { DarkModeProvider } from './context/DarkModeContext';

// Import Route Guard
import ProtectedRoute from './components/ProtectedRoute';

import PatientDashboard from './Patients/pages/patients-dashboard';
import PatientsAppointments from './Patients/pages/patients-appoinments';
import AppointmentConfirmationPage from './Patients/pages/AppointmentConfirmationPage';
import QRCodePage from './Patients/pages/QRCodePage';

import PatientProfile from './Patients/pages/patientProfile';
import ContactUs from './Patients/pages/ContactUs';
import PatientsDoctors from './Patients/pages/patients-doctors';

import AdminDashboard from './Admins/pages/adminDashboard';
import QueueManagement from './Admins/pages/queueManagement';
import PatientRecords from './Admins/pages/patientRecords';
import ScheduleDelays from './Admins/pages/scheduleDelays';
import StaffManagement from './Admins/pages/staffManagement';
import Payments from './Admins/pages/payments';
import Settings from './Admins/pages/settings';
import MedBotConfig from './Admins/pages/medBotConfig';

import DoctorDashboard from './Doctors/pages/doctorsDashboard';
import DoctorPatients from './Doctors/pages/doctorsPatients';
import DoctorAppointments from './Doctors/pages/doctorsAppointments';
import DoctorScheduleManager from './Doctors/pages/doctorsScheduleManager';
import DoctorProfile from './Doctors/pages/doctorsProfile';

import HomePage from './PublicSite/pages/Home';
import AboutPage from './PublicSite/pages/About';
import SignupPage from './PublicSite/pages/Signup';
import LoginPage from './PublicSite/pages/Login';

function NotFound() {
  return <div className="p-8 text-center text-2xl font-bold">404 - Page Not Found</div>;
}

export default function App() {
  return (
    <DarkModeProvider>
      <Router>
        <Routes>

        {/* 1. PUBLIC ROUTES (Main Navbar) */}
        <Route path="/" element={<PublicLayout />}>
          <Route index element={<HomePage />} />
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
            <Route path="/patient" element={<PatientLayout />}>
            <Route path="doctors" element={<PatientsDoctors />} />
          </Route>
        </Route>

        {/* 3. DOCTOR ROUTES (Doctor Sidebar) */}
        <Route path="/doctor" element={<DoctorLayout />}>
          <Route index element={<DoctorDashboard />} />
          <Route path="patients" element={<DoctorPatients />} />
          <Route path="appointments" element={<DoctorAppointments />} />
          <Route path="schedule-manager" element={<DoctorScheduleManager />} />
          <Route path="profile" element={<DoctorProfile />} />
        </Route>

        {/* 4. ADMIN ROUTES (Admin Sidebar) */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="queue-management" element={<QueueManagement />} />
          <Route path="patient-records" element={<PatientRecords />} />
          <Route path="schedule-delays" element={<ScheduleDelays />} />
          <Route path="staff-management" element={<StaffManagement />} />
          <Route path="payments" element={<Payments />} />
          <Route path="settings" element={<Settings />} />
          <Route path="settings/medbot" element={<MedBotConfig />} />
        </Route>

        {/* Catch-all route for unknown URLs */}
        <Route path="*" element={<NotFound />} />

      </Routes>
    </Router>
    </DarkModeProvider>
  );
}
