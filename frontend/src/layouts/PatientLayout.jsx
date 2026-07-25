// src/layouts/PatientLayout.jsx
import { Outlet } from 'react-router-dom';
import PatientSidebar from '../Patients/components/patients-side-bar';
import Header from '../Patients/components/Header';

export function PatientLayout() {
  return (
    <div className="flex flex-col md:flex-row h-screen w-screen bg-slate-50 overflow-hidden">
      {/* Sidebar - Fixed width */}
      <PatientSidebar />

      {/* Main Content Area - Responsive flex */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden pt-16 md:pt-0">
        {/* Top Header */}
        <Header />

        {/* Dynamic Page Content */}
       <main className="flex-1 overflow-y-auto scroll-smooth [&::-webkit-scrollbar]:hidden [scrollbar-width:none] [-ms-overflow-style:none] px-4 md:px-8 py-6 md:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
      