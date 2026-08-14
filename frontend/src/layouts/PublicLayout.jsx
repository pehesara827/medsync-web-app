// src/layouts/PublicLayout.jsx
import { Outlet } from 'react-router-dom';
import PublicNavbar from '../PublicSite/components/public-navbar';

export function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-[#f8fcfd] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <PublicNavbar />

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}