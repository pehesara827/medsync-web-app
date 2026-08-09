const fs = require('fs');
const filePath = 'src/Patients/components/AppointmentConfirmationPass.jsx';
let f = fs.readFileSync(filePath, 'utf8');

// 1. Add verificationCode to destructured props
f = f.replace(
  "appointmentId = 'APP-00000',\n    patientName:",
  "appointmentId = 'APP-00000',\n    verificationCode = '',\n    patientName:"
);

// 2. Add verification code display in header (after booking reference div)
f = f.replace(
  "             </div>\n           </div>\n         </div>\n\n         {/* \u2500\u2500\u2500 QR Code Section \u2500",
  "             </div>\n\n             {/* Verification Code */}\n             {verificationCode && (\n               <div className=\"mt-3 inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-xl px-4 py-1.5\">\n                 <span className=\"text-white/60 text-[10px] font-semibold uppercase tracking-wider\">\n                   Check-in Code\n                 </span>\n                 <span className=\"text-white font-bold text-sm tracking-widest font-mono\">\n                   {verificationCode}\n                 </span>\n               </div>\n             )}\n           </div>\n         </div>\n\n         {/* \u2500\u2500\u2500 QR Code Section \u2500"
);

// 3. Add verification code to share text
f = f.replace(
  "       `Booking Reference: #${appointmentId}`,",
  "       `Booking Reference: #${appointmentId}`,\n       `Check-in Code: ${verificationCode}`,"
);

fs.writeFileSync(filePath, f);
console.log('All 3 changes applied to AppointmentConfirmationPass.jsx');