
import { useState } from 'react';
import { Star, MapPin, Clock, MoreHorizontal } from 'lucide-react';
import BookAppointmentModal from './BookAppointmentModal';

export default function DoctorCard({ doctor }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalKey, setModalKey] = useState(0);
  
  if (!doctor) return null;

  return (
    <>
      <div className="w-full bg-white rounded-xl p-4 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className="relative">
          <img
            src={doctor.image}
            alt={doctor.name}
            className="w-[70px] h-[70px] rounded-full object-cover"
          />
          <div className="absolute bottom-0 right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></div>
        </div>
        <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg">
          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <span className="text-xs font-bold text-slate-700">{doctor.rating.toFixed(1)}</span>
        </div>
      </div>

      <div className="flex flex-col gap-0.5">
        <h3 className="text-base font-bold text-slate-800 leading-tight">
          {doctor.name}
        </h3>
        <p className="text-xs font-medium text-slate-400">
          {doctor.specialty}
        </p>
      </div>

      <div className="flex flex-col gap-2 pt-1">
        <div className="flex items-center gap-2 text-slate-400">
          <MapPin className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">800m away</span>
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <Clock className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">Available: 09:00 AM</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1">
        <button 
          onClick={() => { setModalKey((k) => k + 1); setIsModalOpen(true); }}
          className="flex-1 bg-[#00b8e6] text-white text-xs font-bold py-2.5 rounded-xl hover:bg-[#00a3cc] transition-colors"
        >
          Book Now
        </button>
        <button className="p-2.5 text-slate-400 hover:text-slate-600">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>
    </div>

    {/* Booking Modal */}
    <BookAppointmentModal key={modalKey} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
