// src/layouts/PatientLayout.jsx
import { Outlet } from 'react-router-dom';
import PatientSidebar from '../Patients/components/patients-side-bar';
import Header from '../Patients/components/Header';

export function PatientLayout() {
  return (
    <div className="flex h-screen w-screen bg-slate-50 overflow-hidden">
      {/* Sidebar - Fixed width */}
      <PatientSidebar />

      {/* Main Content Area - Needs min-w-0 so flexbox shrinks it properly */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden pt-16 md:pt-0">
        {/* Top Header */}
        <Header />

        {/* Dynamic Page Content */}
       <main className="flex-1 overflow-y-auto scroll-smooth [&::-webkit-scrollbar]:hidden [scrollbar-width:none] [-ms-overflow-style:none] p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
      