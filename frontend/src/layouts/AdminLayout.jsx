import { Outlet } from 'react-router-dom';
import AdminSidebar from '../Admins/components/admin-sidebar';
import AdminTopbar from '../Admins/components/admin-topbar';

// Named export (not default) to match PublicLayout / PatientLayout / DoctorLayout,
// so `import { AdminLayout } from './layouts/AdminLayout'` in App.jsx works correctly.
export function AdminLayout() {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <AdminTopbar />
        <main className="flex-1 p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
