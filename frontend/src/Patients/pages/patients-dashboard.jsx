import BookNewAppointmentButton from '../components/BookNewButton';
import AppointmentsCarousel from '../components/AppointmentsCarousel';
import FavoriteDoctorsCarousel from '../components/FavoriteDoctorsCarousel';
import QuickStats from '../components/QuickStats';
import RecentActivity from '../components/RecentActivity';

export default function PatientsDashboard() {
  return (
    <div className="flex-1 w-full px-0 md:px-0">
      
      {/* Page Header */}
      <div className="flex flex-row w-full mb-6 gap-4 md:gap-6 items-center justify-between">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl md:text-2xl font-bold text-slate-800">
            Upcoming Appointments
          </h1>
          <p className="text-[#00b8e6] font-medium text-sm md:text-base mt-1 md:mt-2">
            2 Scheduled
          </p>
        </div>
        <div className="flex-shrink-0">
          <BookNewAppointmentButton />
        </div>
      </div>

      {/* Main 2-Column Dashboard Grid Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        
                {/* Left Column (Spans 2 columns on large screens): Carousels */}
        <div className="xl:col-span-2 flex flex-col gap-6 md:gap-8 min-w-0">
          {/* Appointments Carousel */}
          <div>
            <AppointmentsCarousel />
          </div>

          {/* Recent Activity Table */}
          <RecentActivity />
        </div>

        {/* Right Column (Spans 1 column): Quick Stats & Favorite Doctors */}
        <div className="xl:col-span-1 flex flex-col gap-6 min-w-0">
          {/* Top Quick Stats Row */}
          <QuickStats />

          {/* Favorite Doctors Carousel */}
          <FavoriteDoctorsCarousel />
        </div>

      </div>

    </div>
  );
}