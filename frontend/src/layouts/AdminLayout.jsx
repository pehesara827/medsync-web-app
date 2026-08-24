import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from '../Admins/components/admin-sidebar';
import AdminTopbar from '../Admins/components/admin-topbar';

// Named export (not default) to match PublicLayout / PatientLayout / DoctorLayout,
// so `import { AdminLayout } from './layouts/AdminLayout'` in App.jsx works correctly.
export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-900">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <AdminTopbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 min-h-0 p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
