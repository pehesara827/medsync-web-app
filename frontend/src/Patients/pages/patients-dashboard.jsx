import BookNewAppointmentButton from '../components/BookNewButton';
import AppointmentsCarousel from '../components/AppointmentsCarousel';
import FavoriteDoctorsCarousel from '../components/FavoriteDoctorsCarousel';
export default function PatientsDashboard() {
  return (
    <div className="flex-1">
      {/*Upcoming Appointments Section */}
      <div className="flex flex-row w-full py-6 gap-6 items-center justify-between">
     <div>
        <h1 className="text-2xl font-bold text-slate-800">Upcoming Appointments</h1>
        <p className="text-[#00b8e6] font-medium mt-2">2 Scheduled</p>
      </div>
      <div className="p-1">
        <BookNewAppointmentButton/>
      </div>
    </div>
    {/* Appointments Carousel */}
    <AppointmentsCarousel/>
    {/* Favorite Doctors Carousel */}
    <FavoriteDoctorsCarousel/>
    </div>
    
    
  );
}