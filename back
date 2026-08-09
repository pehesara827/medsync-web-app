import {
  generateVerificationCode,
  generateQRPayload,
  generateQRDataUrl,
} from '../utils/qrUtils.js';

/**
 * Test script for QR code generation utilities.
 * Run with: node scripts/testQRGeneration.js
 */
const runTests = async () => {
  console.log('=== QR GENERATION TESTS ===\n');

  // Test 1: Verification code generation
  console.log('--- Test 1: generateVerificationCode ---');
  const sampleUuid = '3f2a9b1c-4d5e-6f78-9abc-def012345678';
  const verificationCode = generateVerificationCode(sampleUuid);
  console.log(`UUID: ${sampleUuid}`);
  console.log(`Verification Code: ${verificationCode}`);
  console.log(`Expected format: CHK-${sampleUuid.replace(/-/g, '').slice(0, 8).toUpperCase()}`);
  if (verificationCode === `CHK-${sampleUuid.replace(/-/g, '').slice(0, 8).toUpperCase()}`) {
    console.log('✅ PASSED');
  } else {
    console.log('❌ FAILED');
    process.exitCode = 1;
  }
  console.log('');

  // Test 2: Empty/undefined appointment ID
  console.log('--- Test 2: generateVerificationCode (empty) ---');
  const emptyCode = generateVerificationCode('');
  console.log(`Empty ID code: ${emptyCode}`);
  if (emptyCode === 'CHK-UNKNOWN') {
    console.log('✅ PASSED');
  } else {
    console.log('❌ FAILED');
    process.exitCode = 1;
  }
  console.log('');

  // Test 3: QR payload generation
  console.log('--- Test 3: generateQRPayload ---');
  const payload = generateQRPayload(sampleUuid);
  console.log(`Payload: ${payload}`);
  const parsed = JSON.parse(payload);
  if (
    parsed.appointment_id === sampleUuid &&
    parsed.verification_code === verificationCode
  ) {
    console.log('✅ PASSED - payload contains appointment_id and verification_code');
  } else {
    console.log('❌ FAILED - payload structure incorrect');
    process.exitCode = 1;
  }
  console.log('');

  // Test 4: QR Data URL generation
  console.log('--- Test 4: generateQRDataUrl ---');
  const dataUrl = await generateQRDataUrl(payload);
  console.log(`Data URL length: ${dataUrl.length} chars`);
  console.log(`Starts with: ${dataUrl.slice(0, 30)}...`);
  if (dataUrl.startsWith('data:image/png;base64,')) {
    console.log('✅ PASSED - valid PNG data URL');
  } else {
    console.log('❌ FAILED - not a valid PNG data URL');
    process.exitCode = 1;
  }
  console.log('');

  // Test 5: Custom options
  console.log('--- Test 5: generateQRDataUrl (custom options) ---');
  const customDataUrl = await generateQRDataUrl(payload, {
    width: 200,
    errorCorrectionLevel: 'H',
  });
  console.log(`Custom Data URL length: ${customDataUrl.length} chars`);
  if (customDataUrl.startsWith('data:image/png;base64,')) {
    console.log('✅ PASSED - custom options applied');
  } else {
    console.log('❌ FAILED');
    process.exitCode = 1;
  }
  console.log('');

  console.log('=== ALL TESTS COMPLETE ===');
};

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exitCode = 1;
});