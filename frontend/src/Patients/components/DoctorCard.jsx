
import { useState } from 'react';
import { Star, Clock, MoreHorizontal, Award, Stethoscope } from 'lucide-react';
import BookAppointmentModal from './BookAppointmentModal';
import DoctorProfileModal from './DoctorProfileModal';

export default function DoctorCard({ doctor, onFavoriteToggle, onDoctorClick }) {
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [modalKey, setModalKey] = useState(0);
  const [imgError, setImgError] = useState(false);
  
  if (!doctor) return null;

  const formatTime = (timeString) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const formatFee = (fee) => {
    if (!fee) return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 0,
    }).format(fee);
  };

  return (
    <>
      <div 
        className="w-full bg-slate-50 dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800/80 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col gap-3 cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => onDoctorClick?.(doctor)}
      >
      <div className="flex items-start justify-between">
        <div className="relative">
            {imgError ? (
            <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
              <svg className="w-6 h-6 text-[#00b0d8] dark:text-cyan-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          ) : (
            <img
              src={doctor.image}
              alt={doctor.name}
              onError={() => setImgError(true)}
              className="w-12 h-12 object-cover rounded-full"
            />
          )}
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
        </div>
        <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-lg">
          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{doctor.rating?.toFixed(1) || '0.0'}</span>
        </div>
      </div>

      <div className="flex flex-col gap-0.5">
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 leading-tight">
          {doctor.name || 'Doctor'}
        </h3>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {doctor.specialty}
        </p>
      </div>

      <div className="flex flex-col gap-2 pt-1">
        {doctor.experience > 0 && (
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <Award className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">{doctor.experience} years experience</span>
          </div>
        )}
        {doctor.nextAvailable && (
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">
              {formatTime(doctor.nextAvailable.split(' at ')[1])}
            </span>
          </div>
        )}
        {doctor.consultationFee > 0 && (
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <Stethoscope className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">{formatFee(doctor.consultationFee)}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-1">
        <button
          onClick={(e) => { e.stopPropagation(); setModalKey((k) => k + 1); setIsBookingModalOpen(true); }}
          className="flex-1 bg-[#00b8e6] text-white text-xs font-bold py-2.5 rounded-xl hover:bg-[#00a3cc] transition-colors"
        >
          Book Now
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setIsProfileModalOpen(true); }}
          className="p-2.5 text-slate-400 hover:text-slate-600 dark:text-slate-300 dark:hover:text-slate-100"
        >
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>
    </div>

    {/* Booking Modal */}
    <BookAppointmentModal key={modalKey} isOpen={isBookingModalOpen} onClose={() => setIsBookingModalOpen(false)} />

    {/* Doctor Profile Modal */}
    <DoctorProfileModal
      isOpen={isProfileModalOpen}
      onClose={() => setIsProfileModalOpen(false)}
      doctor={doctor}
      onFavoriteToggle={onFavoriteToggle}
    />
    </>
  );
}
