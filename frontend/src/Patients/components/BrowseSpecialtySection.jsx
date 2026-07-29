import { Activity, Brain, ClipboardList, Eye, HeartPulse, Smile, Stethoscope, ChevronRight } from 'lucide-react';

const SPECIALTIES = [
  { title: 'Cardiology', icon: HeartPulse },
  { title: 'Neurology', icon: Brain },
  { title: 'Orthopedics', icon: Activity },
  { title: 'General', icon: ClipboardList },
  { title: 'Dental', icon: Stethoscope },
  { title: 'Eye Care', icon: Eye },
  { title: 'Pediatrics', icon: Smile },
];

export default function BrowseSpecialtySection({ selectedSpecialty, onSelect }) {
  return (
    <div className="rounded-4xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900 sm:text-lg">Browse by Specialty</h2>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">Search across our network of certified specialists.</p>
        </div>

        <button
          type="button"
          onClick={() => onSelect?.('All Specialties')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-cyan-600 hover:text-cyan-700 sm:text-sm"
        >
          View All
          <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
        </button>
      </div>

            <div className="mt-3 sm:mt-4 -mx-4 px-4 overflow-x-auto no-scrollbar sm:mx-0 sm:px-0 sm:grid sm:grid-cols-4 xl:grid-cols-7 sm:gap-3 flex gap-2 pb-2 sm:pb-0">
        {SPECIALTIES.map((item) => {
          const Icon = item.icon;
          const isActive = selectedSpecialty === item.title;

          return (
            <button
              key={item.title}
              type="button"
              onClick={() => onSelect?.(item.title)}
              className={`flex flex-col items-center gap-1.5 rounded-3xl border px-3 py-2.5 text-center text-[10px] transition min-w-[90px] sm:min-w-0 sm:gap-2 sm:px-3 sm:py-3 sm:text-xs ${
                isActive
                  ? 'border-cyan-500 bg-cyan-50 text-slate-900'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-cyan-300 hover:bg-cyan-50'
              }`}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 text-cyan-600 sm:h-10 sm:w-10">
                <Icon className="h-4 w-4 sm:h-4 sm:w-4" />
              </span>
              <span className="font-medium leading-tight whitespace-nowrap sm:whitespace-normal">{item.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
