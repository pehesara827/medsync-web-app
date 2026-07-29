import { useRef } from 'react';
import DoctorCard from './DoctorCard';
import { MOCK_FAVORITE_DOCTORS } from '../../MockData/favoriteDoctorsData';

export default function FavoriteDoctorsCarousel({
  doctors = MOCK_FAVORITE_DOCTORS,
  onViewAll,
}) {
  const scrollContainerRef = useRef(null);

  return (
    <section className="w-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800 tracking-tight">
          Favorite Doctors
        </h2>

        <button
          type="button"
          onClick={onViewAll}
          className="flex items-center gap-1 text-sm font-semibold text-[#00b0d8] hover:text-[#009bbf] transition-colors"
        >
          <span>View All</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>
      </div>

      <div
        ref={scrollContainerRef}
        className="grid grid-cols-1 gap-4 select-none"
      >
        {doctors.slice(0, 3).map((doctor) => (
          <DoctorCard key={doctor.id} doctor={doctor} />
        ))}
      </div>
    </section>
  );
}