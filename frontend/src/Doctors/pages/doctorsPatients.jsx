import { Users } from 'lucide-react';

// No mockup was provided for this page yet — this is a placeholder so the
// "Patients" nav item has somewhere to go. Swap in real content (likely a
// filtered view of the same patient data used in Admin's Patient Records)
// once you have a design for it.

export default function DoctorPatients() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
      <Users className="w-8 h-8 text-slate-300 mx-auto mb-3" />
      <p className="text-slate-500 text-sm">Doctor's Patients view — no mockup yet, wire this up once you have the design.</p>
    </div>
  );
}