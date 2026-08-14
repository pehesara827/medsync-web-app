// src/layouts/DoctorLayout.jsx
import { Outlet } from 'react-router-dom';
import DoctorSidebar from '../Doctors/components/doctor-sidebar';

export function DoctorLayout() {
  return (
    <div className="flex flex-col md:flex-row h-screen w-screen bg-slate-50 dark:bg-slate-900 overflow-hidden">
      <DoctorSidebar />
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden pt-16 md:pt-0">
        <main className="flex-1 overflow-y-auto scroll-smooth [&::-webkit-scrollbar]:hidden [scrollbar-width:none] [-ms-overflow-style:none] px-4 md:px-8 py-6 md:py-8 bg-slate-50 dark:bg-slate-900">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
