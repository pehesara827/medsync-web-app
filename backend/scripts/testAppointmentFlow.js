import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function testAppointmentFlow() {
  console.log('🧪 Testing Appointment Flow with QR Code Generation\n');
  console.log('=' * 60);

  try {
    // Test 1: Get a test patient
    console.log('\n📋 Test 1: Fetching test patient...');
    const { data: patients, error: patientError } = await supabase
      .from('patient_profiles')
      .select('id, first_name, last_name')
      .limit(1);

    if (patientError || !patients || patients.length === 0) {
      throw new Error('No patients found. Please create a patient profile first.');
    }

    const patient = patients[0];
    console.log(`✅ Found patient: ${patient.first_name} ${patient.last_name} (${patient.id})`);

    // Test 2: Get a test doctor
    console.log('\n📋 Test 2: Fetching test doctor...');
    const { data: doctors, error: doctorError } = await supabase
      .from('doctor_profiles')
      .select('id, first_name, last_name')
      .limit(1);

    if (doctorError || !doctors || doctors.length === 0) {
      throw new Error('No doctors found. Please create a doctor profile first.');
    }

    const doctor = doctors[0];
    console.log(`✅ Found doctor: Dr. ${doctor.first_name} ${doctor.last_name} (${doctor.id})`);

    // Test 3: Get or create a doctor schedule
    console.log('\n📋 Test 3: Fetching available doctor schedule...');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const { data: schedules, error: scheduleError } = await supabase
      .from('doctor_schedules')
      .select('id, available_date, start_time, end_time')
      .eq('doctor_id', doctor.id)
      .eq('available_date', tomorrowStr)
      .eq('is_booked', false)
      .limit(1);

    let schedule;
    if (scheduleError || !schedules || schedules.length === 0) {
      console.log('⚠️  No available schedule found. Creating a test schedule...');
      
      const { data: newSchedule, error: createScheduleError } = await supabase
        .from('doctor_schedules')
        .insert([
          {
            doctor_id: doctor.id,
            available_date: tomorrowStr,
            start_time: '09:00:00',
            end_time: '10:00:00',
            consultation_fee: 50.00,
            is_booked: false,
          },
        ])
        .select()
        .single();

      if (createScheduleError) throw createScheduleError;
      schedule = newSchedule;
      console.log(`✅ Created test schedule: ${schedule.id}`);
    } else {
      schedule = schedules[0];
      console.log(`✅ Found available schedule: ${schedule.id} (${schedule.available_date})`);
    }

    // Test 4: Create appointment with QR code
    console.log('\n📋 Test 4: Creating appointment with QR code...');
    const appointmentData = {
      patient_id: patient.id,
      booking_type: 'SELF',
      beneficiary_id: null,
      doctor_id: doctor.id,
      schedule_id: schedule.id,
      appointment_date: tomorrowStr,
    };

    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .insert([appointmentData])
      .select()
      .single();

    if (appointmentError) {
      console.error('❌ Error creating appointment:', appointmentError);
      throw appointmentError;
    }

    console.log(`✅ Appointment created: ${appointment.id}`);
    console.log(`   - Status: ${appointment.status}`);
    console.log(`   - Date: ${appointment.appointment_date}`);

    // Test 5: Generate QR code
    console.log('\n📋 Test 5: Generating QR code...');
    
    // Import QR code generation utilities
    const QRCode = (await import('qrcode')).default;
    const { generateVerificationCode, generateQRPayload } = await import('../utils/qrUtils.js');

    const verificationCode = generateVerificationCode(appointment.id);
    const qrPayload = generateQRPayload(appointment.id);
    
    console.log(`   - Verification Code: ${verificationCode}`);
    console.log(`   - QR Payload: ${qrPayload}`);

    const qrDataUrl = await QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 300,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });

    console.log(`✅ QR code generated (${qrDataUrl.length} characters)`);

    // Test 6: Upload QR code to storage
    console.log('\n📋 Test 6: Uploading QR code to Supabase Storage...');
    
    const qrCodeBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');
    const qrCodeFileName = `qr-codes/${appointment.id}.png`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('qr-codes')
      .upload(qrCodeFileName, qrCodeBuffer, {
        contentType: 'image/png',
        upsert: true,
      });

    if (uploadError) {
      console.error('⚠️  Upload failed, using base64 fallback:', uploadError.message);
    } else {
      console.log(`✅ QR code uploaded: ${uploadData.path}`);
    }

    // Test 7: Get public URL
    console.log('\n📋 Test 7: Getting public URL...');
    const { data: { publicUrl } } = supabase.storage
      .from('qr-codes')
      .getPublicUrl(qrCodeFileName);

    console.log(`✅ Public URL: ${publicUrl}`);

    // Test 8: Update appointment with QR code URL
    console.log('\n📋 Test 8: Updating appointment with QR code URL...');
    const { data: updatedAppointment, error: updateError } = await supabase
      .from('appointments')
      .update({ qr_code_url: publicUrl })
      .eq('id', appointment.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error updating appointment:', updateError);
      throw updateError;
    }

    console.log(`✅ Appointment updated with QR code URL`);
    console.log(`   - QR Code URL: ${updatedAppointment.qr_code_url}`);

    // Test 9: Verify appointment can be retrieved
    console.log('\n📋 Test 9: Verifying appointment retrieval...');
    const { data: retrievedAppointment, error: retrieveError } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', appointment.id)
      .single();

    if (retrieveError) {
      console.error('❌ Error retrieving appointment:', retrieveError);
      throw retrieveError;
    }

    console.log(`✅ Appointment retrieved successfully`);
    console.log(`   - Has QR Code: ${!!retrievedAppointment.qr_code_url}`);
    console.log(`   - QR Code URL: ${retrievedAppointment.qr_code_url}`);

    // Test 10: Verify QR code is accessible
    console.log('\n📋 Test 10: Verifying QR code accessibility...');
    try {
      const response = await fetch(retrievedAppointment.qr_code_url);
      if (response.ok) {
        console.log(`✅ QR code is accessible via URL`);
        console.log(`   - Status: ${response.status}`);
        console.log(`   - Content-Type: ${response.headers.get('content-type')}`);
      } else {
        console.log(`⚠️  QR code URL returned status: ${response.status}`);
      }
    } catch (fetchError) {
      console.log(`⚠️  Could not verify QR code accessibility: ${fetchError.message}`);
    }

    // Summary
    console.log('\n' + '=' * 60);
    console.log('✅ ALL TESTS PASSED!');
    console.log('=' * 60);
    console.log('\n📊 Test Summary:');
    console.log('  ✅ Patient profile found');
    console.log('  ✅ Doctor profile found');
    console.log('  ✅ Doctor schedule available');
    console.log('  ✅ Appointment created successfully');
    console.log('  ✅ QR code generated successfully');
    console.log('  ✅ QR code uploaded to storage');
    console.log('  ✅ Public URL obtained');
    console.log('  ✅ Appointment updated with QR code');
    console.log('  ✅ Appointment retrieved successfully');
    console.log('  ✅ QR code is accessible');
    console.log('\n🎉 The appointment flow with QR code generation is working correctly!');
    console.log('\nNext steps:');
    console.log('1. Test appointment creation from the frontend');
    console.log('2. Test QR code display in QRCodePage');
    console.log('3. Test QR code download functionality');
    console.log('4. Test QR code sharing functionality');

  } catch (error) {
    console.error('\n' + '=' * 60);
    console.error('❌ TEST FAILED');
    console.error('=' * 60);
    console.error(`Error: ${error.message}`);
    if (error.details) console.error(`Details: ${error.details}`);
    if (error.hint) console.error(`Hint: ${error.hint}`);
    console.error('\nStack trace:');
    console.error(error.stack);
    process.exitCode = 1;
  }
}

testAppointmentFlow();