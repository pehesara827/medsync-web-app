import { useRef } from 'react';
import DoctorCard from './DoctorCard';
import { MOCK_FAVORITE_DOCTORS } from '../../MockData/favoriteDoctorsData';

export default function FavoriteDoctorsCarousel({
  doctors = MOCK_FAVORITE_DOCTORS,
  onViewAll,
}) {
  const scrollContainerRef = useRef(null);

  return (
    <section className="w-full flex flex-col gap-4 py-4">
      {/* Section Header */}
      <div className="flex items-center justify-between px-1">
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
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

      {/* Scrollable Cards Track (Scrollbar Hidden Inline) */}
      <div
        ref={scrollContainerRef}
        className="flex items-stretch gap-6 overflow-x-auto scroll-smooth py-2 px-1 select-none [&::-webkit-scrollbar]:hidden [scrollbar-width:none] [-ms-overflow-style:none]"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {/* Doctor Cards */}
        {doctors.map((doctor) => (
          <div
            key={doctor.id}
            className="flex-shrink-0"
            style={{ scrollSnapAlign: 'start' }}
          >
            <DoctorCard doctor={doctor} />
          </div>
        ))}
      </div>
    </section>
  );
}