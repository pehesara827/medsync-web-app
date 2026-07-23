// src/layouts/AdminLayout.jsx
import { Outlet } from 'react-router-dom';
import AdminSidebar from '../Admins/components/admin-sidebar';

export function AdminLayout() {
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto bg-slate-50">
        <Outlet />
      </main>
    </div>
  );
}