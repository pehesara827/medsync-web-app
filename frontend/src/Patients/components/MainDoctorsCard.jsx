import { Star, MapPin, Clock } from 'lucide-react';

export default function MainDoctorsCard({ doctor }) {
  if (!doctor) return null;

  return (
    <div className="w-full bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-3 sm:p-4 flex flex-col gap-3 sm:gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <img
              src={doctor.image}
              alt={doctor.name}
              className="h-12 w-12 rounded-2xl object-cover sm:h-16 sm:w-16"
            />
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <h3 className="text-sm font-semibold text-slate-900">{doctor.name}</h3>
                <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                  {doctor.rating.toFixed(1)}
                </span>
              </div>
              <p className="text-xs font-medium text-slate-600 sm:text-sm">{doctor.specialty}</p>
              <p className="text-[10px] text-slate-400">{doctor.clinic}</p>
            </div>
          </div>

                    <div className="flex flex-wrap gap-1.5 text-[10px]">
            {doctor.modes.map((mode) => (
              <span
                key={mode}
                className="rounded-full border border-slate-200 bg-slate-50 px-1.5 py-1 font-semibold uppercase tracking-[0.18em] text-slate-600"
              >
                {mode}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-3xl bg-slate-50 p-2.5 sm:p-3 border border-slate-100">
          <div className="flex items-center gap-2 text-slate-600">
            <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
            <div>
              <p className="text-[9px] uppercase tracking-[0.22em] text-slate-400">Next available</p>
              <p className="font-semibold text-slate-900 text-xs sm:text-sm">{doctor.nextAvailable}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-1.5 text-xs text-slate-500 sm:text-sm">
          <div className="flex items-center gap-2">
            <MapPin className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>{doctor.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <Star className="w-3 h-3 sm:w-4 sm:h-4 text-amber-400" />
            <span>{doctor.reviewsCount} reviews</span>
          </div>
        </div>

        <div className="grid gap-2 pt-1 grid-cols-2">
          <button className="w-full rounded-3xl bg-cyan-600 px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-cyan-700 sm:px-4 sm:text-sm">
            Book Now
          </button>
          <button className="w-full rounded-3xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 sm:px-4 sm:text-sm">
            View Profile
          </button>
        </div>
      </div>
    </div>
  );
}
