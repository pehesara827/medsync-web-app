// Temporary: simulate the admin QR scan flow end-to-end.
// 1. Generate the exact QR payload a patient's pass encodes (appointment id)
// 2. Parse it like the UI does (parsePayload in adminScanApi / QRScanner)
// 3. Call GET /api/admin/scan/:appointmentId
// 4. Print the resolved details the appointment card would show
import { generateQRPayload } from '../utils/qrUtils.js';

const API = 'http://localhost:5000/api';
const APPOINTMENT_ID = process.argv[2] || '412ba468-fbb3-4a69-b989-a8b20c3aca19';

// ── Step 1: build the exact string encoded in the patient's QR ────────────
const qrPayload = generateQRPayload(APPOINTMENT_ID);
console.log('QR payload (what the scanner decodes):', qrPayload);

// ── Step 2: parse it exactly like the frontend ui tell `parsePayload` ─────
let parsed;
try {
  parsed = JSON.parse(qrPayload);
} catch {
  parsed = null;
}
const extractedId = parsed?.appointment_id || APPOINTMENT_ID;
console.log('Extracted appointment_id:', extractedId);

// ── Step 3: call the endpoint the QRScanner detail card uses ──────────────
const res = await fetch(`${API}/admin/scan/${extractedId}`);
const body = await res.json();
console.log('\nHTTP', res.status);

if (!res.ok) {
  console.error('ERROR:', body.message || 'request failed');
  process.exit(1);
}

console.log('\n===== SCANNED APPOINTMENT DETAILS =====');
const a = body.data.appointment;
console.log('Verification code :', a.verificationCode);
console.log('Display id        :', a.displayId);
console.log('Booking type      :', a.bookingType, a.isBeneficiary ? '(Beneficiary)' : '(Self)');
console.log('Status            :', a.status);
console.log('Queue number      :', a.queueNumber);
console.log('Date              :', a.dateLabel);
console.log('Time              :', a.timeLabel);
console.log('--- Patient ---');
console.log('  Name            :', a.patient.name);
console.log('  Photo url       :', a.patient.profilePictureUrl);
console.log('  Age             :', a.patient.age);
console.log('  Date of birth   :', a.patient.dateOfBirth);
console.log('  Gender          :', a.patient.gender);
console.log('  Relationship    :', a.patient.relationship);
console.log('  Email           :', a.patient.email);
console.log('--- Doctor ---');
console.log('  Doctor          :', a.doctor.name);
console.log('  Specialty       :', a.doctor.specialty);
console.log('--- Payment ---');
console.log('  Status          :', a.payment.status);
console.log('  Method          :', a.payment.method, a.payment.amount ? `($${a.payment.amount})` : '');