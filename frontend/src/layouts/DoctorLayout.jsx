import { Outlet } from 'react-router-dom';
import DoctorSidebar from '../Doctors/components/doctor-sidebar';
import DoctorTopbar from '../Doctors/components/doctor-topbar';

// Named export to match your PublicLayout / PatientLayout / AdminLayout pattern.
export function DoctorLayout() {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <DoctorSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <DoctorTopbar />
        <main className="flex-1 p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}