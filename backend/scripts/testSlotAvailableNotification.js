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

async function main() {
  try {
    // 1. Find a patient user and their profile
    const { data: patientProfile, error: profileError } = await supabase
      .from('patient_profiles')
      .select('id, user_id, first_name, last_name')
      .limit(1)
      .single();

    if (profileError) {
      console.error('Error fetching patient profile:', profileError.message);
      process.exit(1);
    }

    console.log(`✅ Found patient: ${patientProfile.first_name} ${patientProfile.last_name} (user_id: ${patientProfile.user_id})`);

    // 2. Find a doctor and a schedule
    const { data: doctorProfile, error: doctorError } = await supabase
      .from('doctor_profiles')
      .select('id, user_id, first_name, last_name')
      .limit(1)
      .single();

    if (doctorError) {
      console.error('Error fetching doctor profile:', doctorError.message);
      process.exit(1);
    }

    console.log(`✅ Found doctor: ${doctorProfile.first_name} ${doctorProfile.last_name}`);

    // 3. Find a schedule for this doctor
    const { data: schedule, error: scheduleError } = await supabase
      .from('doctor_schedules')
      .select('id, available_date, start_time, end_time, max_patients, current_appointment, is_booked')
      .eq('doctor_id', doctorProfile.id)
      .limit(1)
      .maybeSingle();

    if (scheduleError) {
      console.error('Error fetching schedule:', scheduleError.message);
      process.exit(1);
    }

    if (!schedule) {
      console.error('No schedule found for doctor. Run seedTestDashboard.js first.');
      process.exit(1);
    }

    console.log(`✅ Found schedule: ${schedule.available_date} ${schedule.start_time} (max: ${schedule.max_patients}, current: ${schedule.current_appointment})`);

    // 4. Clean up any existing waitlist entries for this patient+schedule
    await supabase
      .from('appointment_waitlists')
      .delete()
      .eq('patient_id', patientProfile.id)
      .eq('schedule_id', schedule.id);

    // 5. Make the schedule full so we can join the waitlist
    console.log('\n--- Making schedule full ---');
    const { error: makeFullError } = await supabase
      .from('doctor_schedules')
      .update({ current_appointment: schedule.max_patients, is_booked: true })
      .eq('id', schedule.id);

    if (makeFullError) {
      console.error('Error making schedule full:', makeFullError.message);
      process.exit(1);
    }
    console.log('✅ Schedule is now full');

    // 6. Join the waitlist
    console.log('\n--- Joining waitlist ---');
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
    console.log(`Status: ${waitlistRes.status}`);
    console.log('Response:', JSON.stringify(waitlistData, null, 2));

    if (!waitlistRes.ok) {
      console.error('❌ Failed to join waitlist');
      process.exit(1);
    }

    // 7. Free up a slot (simulate a patient cancelling)
    console.log('\n--- Freeing up a slot ---');
    const { error: freeSlotError } = await supabase
      .from('doctor_schedules')
      .update({ current_appointment: schedule.max_patients - 1, is_booked: false })
      .eq('id', schedule.id);

    if (freeSlotError) {
      console.error('Error freeing slot:', freeSlotError.message);
      process.exit(1);
    }
    console.log('✅ Slot is now available');

    // 8. Trigger notifyNextPatient
    console.log('\n--- Triggering slot-available notification ---');
    const { notifyNextPatient } = await import('../models/waitlistModel.js');
    const notified = await notifyNextPatient(schedule.id);

    if (notified) {
      console.log(`✅ Patient notified: ${notified.patient_id}`);
      console.log(`   Status: ${notified.status}`);
      console.log(`   Expires at: ${notified.expires_at}`);
    } else {
      console.log('ℹ️ No patient was notified (queue empty or already notified).');
    }

    // 9. Check if a notification was created for this user
    console.log('\n--- Checking notifications for patient ---');
    const notifRes = await fetch(`${backendUrl}/api/notifications/${patientProfile.user_id}`);
    const notifData = await notifRes.json();
    const notifications = notifData.notifications || [];

    console.log(`Total notifications: ${notifications.length}`);

    const slotNotif = notifications.find((n) => n.type === 'WAITLIST_OFFER');
    if (slotNotif) {
      console.log('✅ Slot-available notification found!');
      console.log('   Title:', slotNotif.title);
      console.log('   Message:', slotNotif.message);
      console.log('   Action link:', slotNotif.action_link);
      console.log('   Metadata:', JSON.stringify(slotNotif.metadata));
    } else {
      console.log('❌ No WAITLIST_OFFER notification found.');
    }

    // 10. Check unread count
    const countRes = await fetch(`${backendUrl}/api/notifications/unread-count/${patientProfile.user_id}`);
    const countData = await countRes.json();
    console.log(`\nUnread count for patient: ${countData.count}`);

    // 11. Cleanup - restore schedule state
    console.log('\n--- Cleaning up ---');
    await supabase
      .from('doctor_schedules')
      .update({ current_appointment: schedule.current_appointment, is_booked: schedule.is_booked })
      .eq('id', schedule.id);
    console.log('✅ Schedule restored');

    console.log('\n✅ Slot-available notification test complete!');
  } catch (error) {
    console.error('Test failed:', error.message);
    process.exit(1);
  }
}

main();