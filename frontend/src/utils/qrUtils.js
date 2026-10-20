/**
 * Generates a short verification code from an appointment UUID.
 * Format: CHK-<first 8 chars of UUID uppercased>
 * @param {string} appointmentId - The appointment UUID
 * @returns {string} e.g. 'CHK-3F2A9B1C'
 */
export const generateVerificationCode = (appointmentId) => {
  if (!appointmentId) return 'CHK-UNKNOWN';
  const shortId = appointmentId.replace(/-/g, '').slice(0, 8).toUpperCase();
  return `CHK-${shortId}`;
};

/**
 * Builds the secure QR payload for an appointment.
 * @param {string} appointmentId - The appointment UUID
 * @returns {string} JSON string payload
 */
export const generateQRPayload = (appointmentId) => {
  const verificationCode = generateVerificationCode(appointmentId);
  return JSON.stringify({
    appointment_id: appointmentId,
    verification_code: verificationCode,
  });
};