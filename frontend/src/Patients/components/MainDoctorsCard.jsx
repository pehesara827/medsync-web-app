import { useState } from 'react';
import { Star, Clock } from 'lucide-react';
import BookAppointmentModal from './BookAppointmentModal';
import DoctorProfileModal from './DoctorProfileModal';

export default function MainDoctorsCard({ doctor }) {
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [modalKey, setModalKey] = useState(0);
  const [imgError, setImgError] = useState(false);

  if (!doctor) return null;

  const rating = Number(doctor.rating) || 0;
  const reviewsCount = Number(doctor.reviewsCount) || 0;

  return (
    <>
      <div className="w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-3 sm:p-4 flex flex-col gap-3 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3">
            {imgError || !doctor.image ? (
              <div className="h-12 w-12 rounded-2xl bg-[#e6f7fa] flex items-center justify-center sm:h-16 sm:w-16">
                <svg className="w-6 h-6 text-[#00b0d8]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            ) : (
              <img
                src={doctor.image}
                alt={doctor.name}
                onError={() => setImgError(true)}
                className="h-12 w-12 rounded-2xl object-cover sm:h-16 sm:w-16"
              />
            )}
            <div className="space-y-1 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{doctor.name || 'Doctor'}</h3>
                {rating > 0 && (
                  <span className="rounded-full bg-emerald-100 dark:bg-emerald-900 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                    ⭐ {rating.toFixed(1)}
                  </span>
                )}
              </div>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-300 sm:text-sm">{doctor.specialty}</p>
            </div>
          </div>

          <div className="rounded-3xl bg-slate-50 dark:bg-slate-800 p-2.5 sm:p-3 border border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
              <div>
                <p className="text-[9px] uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">Next available</p>
                <p className="font-semibold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">{doctor.nextAvailable}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
            <Star className="w-3 h-3 sm:w-4 sm:h-4 text-amber-400" />
            <span>{reviewsCount} reviews</span>
          </div>

          <div className="grid gap-2 pt-1 grid-cols-2">
            <button
              onClick={() => { setModalKey((k) => k + 1); setIsBookingModalOpen(true); }}
              className="w-full rounded-3xl bg-[#00b8e6] px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-[#00a3cc] sm:px-4 sm:text-sm"
            >
              Book Now
            </button>
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="w-full rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-100 transition hover:bg-slate-50 dark:hover:bg-slate-700 sm:px-4 sm:text-sm"
            >
              View Profile
            </button>
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      <BookAppointmentModal
        key={modalKey}
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        initialSpecialization={doctor.specialty}
        initialDoctorId={doctor.id}
        initialDate={doctor.availableDate}
      />

      {/* Doctor Profile Modal */}
      <DoctorProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        doctor={doctor}
      />
    </>
  );
}