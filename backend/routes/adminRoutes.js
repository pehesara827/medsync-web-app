import { Router } from 'express';
import {
  getAdminDashboard,
  getAdminDoctors,
  getAdminSchedules,
  createManualAppointment,
  getManualAppointments,
  getAdminDoctorsManagement,
  getAdminDoctorStats,
  deleteAdminDoctor,
  updateAdminDoctor,
  updateAdminDoctorStatus,
  createAdminDoctor,
  getAdminPatients,
  getAdminPatientById,
} from '../controllers/adminController.js';
import {
  getAdminDoctorsAll,
  approveDoctor,
  updateAdminDoctorInfo,
} from '../controllers/doctorController.js';
import {
  getAdminPayments,
  verifyPaymentSlip,
  collectReceptionPayment,
} from '../controllers/paymentController.js';
import {
  getAdminScheduleList,
  createSchedule,
  broadcastSessionDelay,
  emergencyCancelSchedule,
} from '../controllers/scheduleController.js';
import {
  getAdminWaitlistsBySchedule,
  manualNotify,
} from '../controllers/waitlistController.js';

const router = Router();

// GET /api/admin/dashboard - Admin dashboard aggregate metrics
router.get('/dashboard', getAdminDashboard);

// GET /api/admin/patients - List patients with optional status/date filters
router.get('/patients', getAdminPatients);

// GET /api/admin/patients/:id - Full patient detail for the slide-in panel
router.get('/patients/:id', getAdminPatientById);

// GET /api/admin/doctors - Approved doctors for the booking dropdown
router.get('/doctors', getAdminDoctors);

// POST /api/admin/doctors - Add a new doctor (auto-approved) from the admin form
router.post('/doctors', createAdminDoctor);

// GET /api/admin/doctors-management - All doctors (approved + pending) for management
router.get('/doctors-management', getAdminDoctorsManagement);

// GET /api/admin/doctors-management/stats - KPI metrics for the management page
router.get('/doctors-management/stats', getAdminDoctorStats);

// DELETE /api/admin/doctors/:doctorId - Permanently delete a doctor account
router.delete('/doctors/:doctorId', deleteAdminDoctor);

// PUT /api/admin/doctors/:doctorId - Update a doctor's profile details
router.put('/doctors/:doctorId', updateAdminDoctor);

// PATCH /api/admin/doctors/:doctorId/status - Approve / reject a doctor
router.patch('/doctors/:doctorId/status', updateAdminDoctorStatus);

// GET /api/admin/schedules - Doctor time slots for a given date
router.get('/schedules', getAdminSchedules);

// GET /api/admin/manual-appointments - List manually-added appointments
router.get('/manual-appointments', getManualAppointments);

// POST /api/admin/manual-appointments - Create a manually-added appointment
router.post('/manual-appointments', createManualAppointment);

// ─────────────────────────────────────────────────────────────────────────────
// Payments & Bank Slip Verification
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/payments - List payments with pagination & status filter
router.get('/payments', getAdminPayments);

// PATCH /api/admin/payments/:id/verify-slip - Approve / reject a bank slip
router.patch('/payments/:id/verify-slip', verifyPaymentSlip);

// PATCH /api/admin/payments/:id/collect-reception - Collect cash at reception
router.patch('/payments/:id/collect-reception', collectReceptionPayment);

// ─────────────────────────────────────────────────────────────────────────────
// Schedules & Capacity Management
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/schedules/all - All schedules with capacity ratio & delay status
router.get('/schedules/all', getAdminScheduleList);

// POST /api/admin/schedules - Create a new schedule slot
router.post('/schedules', createSchedule);

// POST /api/admin/schedules/:scheduleId/broadcast-delay - Broadcast a session delay
router.post('/schedules/:scheduleId/broadcast-delay', broadcastSessionDelay);

// DELETE /api/admin/schedules/:scheduleId/emergency-cancel - Emergency cancel
router.delete('/schedules/:scheduleId/emergency-cancel', emergencyCancelSchedule);

// ─────────────────────────────────────────────────────────────────────────────
// Doctor Administration
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/doctors/all - All doctors (approved + pending) with is_verified
router.get('/doctors/all', getAdminDoctorsAll);

// PATCH /api/admin/doctors/:doctorId/approve - Toggle is_approved + notify doctor
router.patch('/doctors/:doctorId/approve', approveDoctor);

// PUT /api/admin/doctors/:doctorId/info - Update editable profile details
router.put('/doctors/:doctorId/info', updateAdminDoctorInfo);

// ─────────────────────────────────────────────────────────────────────────────
// Waitlist Handling
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/waitlists/:scheduleId - FIFO waitlist queue for a schedule
router.get('/waitlists/:scheduleId', getAdminWaitlistsBySchedule);

// POST /api/admin/waitlists/:id/manual-notify - Notify the next waitlisted patient
router.post('/waitlists/:id/manual-notify', manualNotify);

export default router;