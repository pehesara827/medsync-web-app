import { useRef } from 'react';
import { Star, ChevronRight, Heart, CalendarClock } from 'lucide-react';

export default function FavoriteDoctorsCarousel({ doctors = [], onDoctorClick }) {
  const scrollContainerRef = useRef(null);

  const handleKeyOpen = (e, doctor) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onDoctorClick?.(doctor);
    }
  };

  return (
    <section className="w-full flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 tracking-tight">
          Favorite Doctors
        </h2>
        {doctors.length > 0 && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#dcf5fa] text-[#00b0d8] dark:bg-cyan-500/15 dark:text-cyan-300 text-[11px] font-bold">
            <Heart size={11} className="fill-current" />
            {doctors.length}
          </span>
        )}
      </div>

      {doctors.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#dcf5fa] text-[#00b0d8] dark:bg-cyan-500/15 dark:text-cyan-300">
            <Heart size={20} />
          </div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            No favorite doctors yet
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Tap the heart on any doctor to pin them here.
          </p>
        </div>
      ) : (
        <div
          ref={scrollContainerRef}
          className="h-[320px] flex flex-col gap-3 overflow-y-auto pr-1 [&::-webkit-scrollbar]:hidden [scrollbar-width:none] [-ms-overflow-style:none]"
        >
          {doctors.map((doctor) => (
            <button
              key={doctor.id}
              type="button"
              onClick={() => onDoctorClick?.(doctor)}
              onKeyDown={(e) => handleKeyOpen(e, doctor)}
              className="group relative w-full overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-700/60 bg-white dark:bg-slate-900 p-3 text-left shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#00b8e6]/50 hover:shadow-[0_12px_28px_rgba(0,184,230,0.18)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00b8e6]"
            >
              <span className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#00b8e6] via-[#38d6f5] to-[#7dd3fc] opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

              <div className="flex items-center gap-3">
                <div className="relative flex-shrink-0">
                  <div className="rounded-2xl bg-gradient-to-br from-[#00b8e6] via-[#38d6f5] to-[#a5e8f8] p-[2px]">
                    <div className="h-14 w-14 overflow-hidden rounded-[14px] bg-white">
                      {doctor.image ? (
                        <img
                          src={doctor.image}
                          alt={doctor.name}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-[#e6f7fa] dark:bg-slate-800">
                          <svg className="w-7 h-7 text-[#00b0d8]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-slate-900 bg-emerald-500" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                      {doctor.name || 'Doctor'}
                    </h3>
                    {doctor.rating > 0 && (
                      <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-300">
                        <Star size={10} className="fill-current" />
                        {doctor.rating.toFixed(1)}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#00b0d8] dark:text-cyan-300 mt-0.5 truncate">
                    {doctor.specialty}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    {doctor.nextAvailable ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-500/15 px-2 py-0.5 text-emerald-600 dark:text-emerald-300">
                        <CalendarClock size={11} />
                        {doctor.nextAvailable}
                      </span>
                    ) : (
                      <span className="truncate">
                        {doctor.reviewsCount > 0
                          ? `${doctor.reviewsCount} review${doctor.reviewsCount === 1 ? '' : 's'}`
                          : 'Tap to view profile'}
                      </span>
                    )}
                  </div>
                </div>

                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 transition-all duration-200 group-hover:bg-[#00b8e6] group-hover:text-white">
                  <ChevronRight size={16} />
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}