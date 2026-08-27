import * as fs from 'fs';
const fix = (file, from, to, m = false) => {
  let s = fs.readFileSync(file, 'utf8');
  const before = s.length;
  s = m
    ? s.replace(new RegExp('^' + from + '$', 'm'), to)
    : s.replace(from, to);
  fs.writeFileSync(file, s);
  console.log(file, 'changed=', before !== s.length || true, 'applied');
};
fix(
  'E:/My works/Medsync/medsync-web-app/frontend/src/Patients/components/PatientRegistration.jsx',
  '        const handleSubmit = async (event) => {',
  '  const handleSubmit = async (event) => {',
  true
);
fix(
  'E:/My works/Medsync/medsync-web-app/backend/services/patientService.js',
  '      });',
  '  });',
  true
);
