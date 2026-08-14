import { useRef } from 'react';

export default function FavoriteDoctorsCarousel({ doctors = [], onDoctorClick }) {
  const scrollContainerRef = useRef(null);

  return (
    <section className="w-full flex flex-col gap-3">
      <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 tracking-tight">
        Favorite Doctors
      </h2>

      {doctors.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            No favorite doctors yet
          </p>
        </div>
      ) : (
        <div
          ref={scrollContainerRef}
          className="h-[300px] flex flex-col gap-2.5 overflow-y-auto pr-1 [&::-webkit-scrollbar]:hidden [scrollbar-width:none] [-ms-overflow-style:none]"
        >
          {doctors.map((doctor) => (
            <div
              key={doctor.id}
              className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onDoctorClick?.(doctor)}
            >
              <div className="flex-shrink-0">
                {doctor.image ? (
                  <img
                    src={doctor.image}
                    alt={doctor.name}
                    className="w-12 h-12 rounded-xl object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-[#e6f7fa] dark:bg-slate-700 flex items-center justify-center">
                    <svg className="w-6 h-6 text-[#00b0d8]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {doctor.name || 'Doctor'}
                  </h3>
                  {doctor.rating > 0 && (
                    <span className="flex items-center gap-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                      ⭐ {doctor.rating.toFixed(1)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  {doctor.specialty}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}