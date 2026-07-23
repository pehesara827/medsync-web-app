// src/layouts/DoctorLayout.jsx
import { Outlet } from 'react-router-dom';
import DoctorSidebar from '../Doctors/components/doctor-sidebar';

export function DoctorLayout() {
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <DoctorSidebar />
      <main className="flex-1 overflow-y-auto bg-slate-50">
        <Outlet />
      </main>
    </div>
  );
}