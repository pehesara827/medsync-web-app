import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import DoctorSidebar from '../Doctors/components/doctor-sidebar';
import DoctorTopbar from '../Doctors/components/doctor-topbar';

// Named export to match your PublicLayout / PatientLayout / AdminLayout pattern.
export function DoctorLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-900">
      <DoctorSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <DoctorTopbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 min-h-0 p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}