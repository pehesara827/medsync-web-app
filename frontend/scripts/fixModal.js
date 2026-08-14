const fs = require('fs');
const filePath = 'src/Patients/components/BookAppointmentModal.jsx';
let f = fs.readFileSync(filePath, 'utf8');

// Fix the literal \n in the verificationCode line
f = f.replace(
  "appointmentId: appointment.id,\\n        verificationCode: generateVerificationCode(appointment.id),\\n        patientName:",
  "appointmentId: appointment.id,\n        verificationCode: generateVerificationCode(appointment.id),\n        patientName:"
);

fs.writeFileSync(filePath, f);
console.log('Fixed literal newlines in BookAppointmentModal.jsx');
</arg_value></tool_call>