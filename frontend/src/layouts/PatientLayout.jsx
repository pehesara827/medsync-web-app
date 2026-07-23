// src/layouts/PatientLayout.jsx
import { Outlet } from 'react-router-dom';
import PatientSidebar from '../Patients/components/patients-side-bar';

export function PatientLayout() {
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <PatientSidebar />
      <main className="flex-1 overflow-y-auto bg-slate-50">
        <Outlet />
      </main>
    </div>
  );
}