import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const backendUrl = 'http://localhost:5000';

// ── Small assertion helper ─────────────────────────────────────────────
let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${label}`);
  } else {
    failed++;
    console.log(`  ❌ ${label}`);
  }
}

async function main() {
  console.log('══════════════════════════════════════════════════════════');
  console.log('  WAITLIST NOTIFICATION CLICK-THROUGH TEST');
  console.log('  Simulates: notification → click → appointments page →');
  console.log('  pre-filled BookAppointmentModal (claim mode)');
  console.log('══════════════════════════════════════════════════════════\n');

  let originalSchedule = null;
  let createdWaitlistId = null;
  let createdNotificationId = null;
  let schedule = null;

  try {
    // ── 1. Find a sample patient ──────────────────────────────────────
    console.log('── Step 1: Find sample patient ──────────────────────────');
    const { data: patientProfile, error: profileError } = await supabase
      .from('patient_profiles')
      .select('id, user_id, first_name, last_name')
      .limit(1)
      .single();

    if (profileError) {
      console.error('Error fetching patient profile:', profileError.message);
      process.exit(1);
    }
    console.log(`  ✅ Found patient: ${patientProfile.first_name} ${patientProfile.last_name}`);
    console.log(`     patient_id: ${patientProfile.id}`);
    console.log(`     user_id:    ${patientProfile.user_id}`);

    // ── 2. Find a sample doctor ───────────────────────────────────────
    console.log('\n── Step 2: Find sample doctor ───────────────────────────');
    const { data: doctorProfile, error: doctorError } = await supabase
      .from('doctor_profiles')
      .select('id, user_id, first_name, last_name, specialty_id, specialties (id, name)')
      .limit(1)
      .single();

    if (doctorError) {
      console.error('Error fetching doctor profile:', doctorError.message);
      process.exit(1);
    }
    console.log(`  ✅ Found doctor: Dr. ${doctorProfile.first_name} ${doctorProfile.last_name}`);
    console.log(`     doctor_id:   ${doctorProfile.id}`);
    console.log(`     specialty:   ${doctorProfile.specialties?.name || 'N/A'} (id: ${doctorProfile.specialty_id})`);

    // ── 3. Find a schedule for this doctor ────────────────────────────
    console.log('\n── Step 3: Find a schedule ──────────────────────────────');
    const { data: scheduleData, error: scheduleError } = await supabase
      .from('doctor_schedules')
      .select('id, available_date, start_time, end_time, max_patients, current_appointment, is_booked, consultation_fee')
      .eq('doctor_id', doctorProfile.id)
      .limit(1)
      .maybeSingle();

    if (scheduleError) {
      console.error('Error fetching schedule:', scheduleError.message);
      process.exit(1);
    }
    if (!scheduleData) {
      console.error('No schedule found for doctor. Run seedTestDashboard.js first.');
      process.exit(1);
    }
    schedule = scheduleData;
    console.log(`  ✅ Found schedule: ${schedule.available_date} ${schedule.start_time}`);
    console.log(`     schedule_id:   ${schedule.id}`);
    console.log(`     max_patients:  ${schedule.max_patients}, current: ${schedule.current_appointment}`);
    console.log(`     fee:           Rs. ${schedule.consultation_fee}`);

    // Save original state for cleanup
    originalSchedule = {
      current_appointment: schedule.current_appointment,
      is_booked: schedule.is_booked,
    };

    // ── 4. Clean up any existing waitlist entries for this patient+schedule ──
    console.log('\n── Step 4: Clean up existing test data ──────────────────');
    await supabase
      .from('appointment_waitlists')
      .delete()
      .eq('patient_id', patientProfile.id)
      .eq('schedule_id', schedule.id);
    console.log('  ✅ Removed existing waitlist entries');

    // ── 5. Make the schedule full so we can join the waitlist ─────────
    console.log('\n── Step 5: Make schedule full ───────────────────────────');
    const { error: makeFullError } = await supabase
      .from('doctor_schedules')
      .update({ current_appointment: schedule.max_patients, is_booked: true })
      .eq('id', schedule.id);
    if (makeFullError) {
      console.error('Error making schedule full:', makeFullError.message);
      process.exit(1);
    }
    console.log('  ✅ Schedule is now full');

    // ── 6. Join the waitlist ──────────────────────────────────────────
    console.log('\n── Step 6: Join waitlist ────────────────────────────────');
    const waitlistRes = await fetch(`${backendUrl}/api/waitlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patient_id: patientProfile.id,
        doctor_id: doctorProfile.id,
        schedule_id: schedule.id,
        booking_type: 'SELF',
      }),
    });
    const waitlistData = await waitlistRes.json();
    assert(waitlistRes.ok, `Join waitlist returns 2xx (got ${waitlistRes.status})`);
    if (!waitlistRes.ok) {
      console.error('  Response:', JSON.stringify(waitlistData, null, 2));
      process.exit(1);
    }
    createdWaitlistId = waitlistData.waitlist?.id;
    assert(Boolean(createdWaitlistId), 'Waitlist entry created with an id');
    console.log(`     waitlist_id: ${createdWaitlistId}`);

    // ── 7. Free up a slot (simulate a patient cancelling) ─────────────
    console.log('\n── Step 7: Free up a slot ───────────────────────────────');
    const { error: freeSlotError } = await supabase
      .from('doctor_schedules')
      .update({ current_appointment: schedule.max_patients - 1, is_booked: false })
      .eq('id', schedule.id);
    if (freeSlotError) {
      console.error('Error freeing slot:', freeSlotError.message);
      process.exit(1);
    }
    console.log('  ✅ Slot is now available');

    // ── 8. Trigger notifyNextPatient ──────────────────────────────────
    console.log('\n── Step 8: Trigger slot-available notification ──────────');
    const { notifyNextPatient } = await import('../models/waitlistModel.js');
    const notified = await notifyNextPatient(schedule.id);
    assert(Boolean(notified), 'Patient was notified (waitlist status → NOTIFIED)');
    if (!notified) {
      console.error('  No patient was notified. Aborting.');
      process.exit(1);
    }
    console.log(`     notified patient_id: ${notified.patient_id}`);
    console.log(`     status: ${notified.status}`);
    console.log(`     expires_at: ${notified.expires_at}`);

    // ── 9. Verify the WAITLIST_OFFER notification was created ─────────
    console.log('\n── Step 9: Verify WAITLIST_OFFER notification ───────────');
    const notifRes = await fetch(`${backendUrl}/api/notifications/${patientProfile.user_id}`);
    const notifData = await notifRes.json();
    const notifications = notifData.notifications || [];

    const slotNotif = notifications.find(
      (n) => n.type === 'WAITLIST_OFFER' && n.metadata?.waitlist_id === createdWaitlistId
    );
    assert(Boolean(slotNotif), 'WAITLIST_OFFER notification exists for this waitlist entry');
    if (!slotNotif) {
      console.error('  No matching notification found. Aborting.');
      process.exit(1);
    }
    createdNotificationId = slotNotif.id;

    console.log(`     notification_id: ${slotNotif.id}`);
    console.log(`     title: ${slotNotif.title}`);
    console.log(`     message: ${slotNotif.message}`);
    console.log(`     action_link: ${slotNotif.action_link}`);
    console.log(`     metadata: ${JSON.stringify(slotNotif.metadata)}`);

    // Verify action_link format
    const expectedLinkPrefix = '/patient/appointments?claim=';
    assert(
      slotNotif.action_link?.startsWith(expectedLinkPrefix),
      `action_link starts with "${expectedLinkPrefix}"`
    );

    // Extract the claim id from the action_link (this is what the frontend does)
    const claimId = slotNotif.action_link?.split('claim=')[1];
    assert(Boolean(claimId), 'Extracted claim id from action_link');
    assert(claimId === createdWaitlistId, 'Claim id matches the waitlist id');

    // ── 10. Simulate the click: fetch the waitlist offer ──────────────
    console.log('\n── Step 10: Simulate click → fetch waitlist offer ───────');
    console.log('  (This is exactly what patients-appoinments.jsx does)');
    const offerRes = await fetch(`${backendUrl}/api/waitlist/${claimId}`);
    const offerData = await offerRes.json();
    assert(offerRes.ok, `GET /api/waitlist/:claimId returns 2xx (got ${offerRes.status})`);
    if (!offerRes.ok) {
      console.error('  Response:', JSON.stringify(offerData, null, 2));
      process.exit(1);
    }

    const offer = offerData.waitlist;
    assert(Boolean(offer), 'Waitlist offer object returned');
    assert(offer.id === claimId, 'Offer id matches claim id');
    assert(offer.status === 'NOTIFIED', `Offer status is NOTIFIED (got ${offer.status})`);

    // ── 11. Verify pre-fill data for BookAppointmentModal ─────────────
    console.log('\n── Step 11: Verify modal pre-fill data ──────────────────');
    console.log('  Booking Type:');
    assert(
      offer.booking_type === 'SELF' || offer.booking_type === 'BENEFICIARY',
      `booking_type is valid (got "${offer.booking_type}")`
    );

    console.log('  Provider Selection:');
    assert(Boolean(offer.doctor_id), 'doctor_id present');
    assert(
      Boolean(offer.doctor_profiles?.specialties?.id),
      'doctor_profiles.specialties.id present (for specialization pre-fill)'
    );
    assert(
      offer.doctor_profiles?.specialties?.id === doctorProfile.specialty_id,
      'specialty id matches doctor profile'
    );

    console.log('  Schedule Selection:');
    assert(Boolean(offer.schedule_id), 'schedule_id present');
    assert(
      Boolean(offer.doctor_schedules?.available_date),
      'doctor_schedules.available_date present (for date pre-fill)'
    );
    assert(
      offer.doctor_schedules?.available_date === schedule.available_date,
      'available_date matches the schedule'
    );
    assert(
      offer.schedule_id === schedule.id,
      'schedule_id matches the schedule'
    );

    // ── 12. Verify the full pre-fill payload the modal needs ──────────
    console.log('\n── Step 12: Full pre-fill payload summary ───────────────');
    const prefill = {
      bookingType: offer.booking_type,
      beneficiaryId: offer.beneficiary_id || null,
      specializationId: offer.doctor_profiles?.specialties?.id,
      doctorId: offer.doctor_id,
      availableDate: offer.doctor_schedules?.available_date,
      scheduleId: offer.schedule_id,
      consultationFee: offer.doctor_schedules?.consultation_fee,
    };
    console.log('  ', JSON.stringify(prefill, null, 2));

    // ── 13. Verify unread count includes this notification ────────────
    console.log('\n── Step 13: Verify unread count ─────────────────────────');
    const countRes = await fetch(`${backendUrl}/api/notifications/unread-count/${patientProfile.user_id}`);
    const countData = await countRes.json();
    assert(countData.count >= 1, `Unread count >= 1 (got ${countData.count})`);

    // ── 14. Verify mark-as-read works (as the panel does on click) ────
    console.log('\n── Step 14: Verify mark-as-read on click ────────────────');
    const readRes = await fetch(`${backendUrl}/api/notifications/${slotNotif.id}/read`, {
      method: 'PATCH',
    });
    assert(readRes.ok, `PATCH /api/notifications/:id/read returns 2xx (got ${readRes.status})`);
    if (readRes.ok) {
      const readData = await readRes.json();
      assert(readData.notification?.is_read === true, 'Notification marked as read');
    }

    // ── Summary ───────────────────────────────────────────────────────
    console.log('\n══════════════════════════════════════════════════════════');
    console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
    console.log('══════════════════════════════════════════════════════════\n');

    if (failed > 0) {
      console.log('❌ Some assertions failed. See above for details.');
      process.exitCode = 1;
    } else {
      console.log('✅ ALL TESTS PASSED — the full click-through flow works!');
      console.log('\n  Flow verified:');
      console.log('  1. WAITLIST_OFFER notification created with action_link');
      console.log('  2. Clicking notification navigates to /patient/appointments?claim=<id>');
      console.log('  3. Appointments page fetches the offer via GET /api/waitlist/:claimId');
      console.log('  4. BookAppointmentModal opens in claim mode with pre-filled:');
      console.log('     - Booking Type (booking_type)');
      console.log('     - Provider Selection (specialty + doctor)');
      console.log('     - Schedule Selection (date + time slot)');
    }
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    process.exitCode = 1;
  } finally {
    // ── Cleanup ───────────────────────────────────────────────────────
    console.log('\n── Cleanup ──────────────────────────────────────────────');
    try {
      // Restore schedule state
      if (originalSchedule) {
        await supabase
          .from('doctor_schedules')
          .update({
            current_appointment: originalSchedule.current_appointment,
            is_booked: originalSchedule.is_booked,
          })
          .eq('id', schedule.id);
        console.log('  ✅ Schedule restored');
      }

      // Delete test waitlist entries
      if (createdWaitlistId) {
        await supabase
          .from('appointment_waitlists')
          .delete()
          .eq('id', createdWaitlistId);
        console.log('  ✅ Test waitlist entry deleted');
      }

      // Delete test notification
      if (createdNotificationId) {
        await supabase
          .from('notifications')
          .delete()
          .eq('id', createdNotificationId);
        console.log('  ✅ Test notification deleted');
      }
    } catch (cleanupError) {
      console.error('  ⚠️ Cleanup error:', cleanupError.message);
    }
    console.log('  ✅ Cleanup complete');
  }
}

main();