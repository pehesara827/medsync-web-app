import { Search, ChevronDown } from 'lucide-react';

const SPECIALTIES = ['All Specialties', 'Cardiology', 'Neurology', 'Orthopedics', 'General', 'Dental'];
const AVAILABILITY = ['Today', 'Tomorrow', 'Next Available', 'Specific Date'];

export default function DoctorSearchFilters({
  query,
  onQueryChange,
  specialty,
  onSpecialtyChange,
  availability,
  onAvailabilityChange,
  selectedDate,
  onDateChange,
}) {
  return (
    <div className="rounded-4xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 lg:grid-cols-[1.6fr_1fr_1fr_0.9fr]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange?.(event.target.value)}
            placeholder="Doctor name or keyword"
            className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-10 py-3 text-sm text-slate-700 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
          />
        </label>

        <label className="relative block">
          <select
            value={specialty}
            onChange={(event) => onSpecialtyChange?.(event.target.value)}
            className="w-full appearance-none rounded-3xl border border-slate-200 bg-white px-3 py-3 pr-10 text-sm text-slate-700 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
          >
            {SPECIALTIES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </label>

        <label className="relative block">
          <select
            value={availability}
            onChange={(event) => onAvailabilityChange?.(event.target.value)}
            className="w-full appearance-none rounded-3xl border border-slate-200 bg-white px-3 py-3 pr-10 text-sm text-slate-700 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
          >
            <option value="" disabled>
              Availability
            </option>
            {AVAILABILITY.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </label>

        <label className={`relative block ${availability !== 'Specific Date' ? 'hidden lg:block' : ''}`}>
          <input
            type="date"
            value={selectedDate || ''}
            onChange={(event) => onDateChange?.(event.target.value)}
            className="w-full rounded-3xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
          />
        </label>
      </div>
      {availability === 'Specific Date' && (
        <div className="mt-3 text-xs text-slate-500">
          Choose a date to see available doctors on that day.
        </div>
      )}
    </div>
  );
}
