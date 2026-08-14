 import { useEffect, useState } from 'react';
import { Search, Calendar, ChevronDown } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const FALLBACK_SPECIALTIES = [
  'Cardiology',
  'Neurology',
  'Pediatrics',
  'Dermatology',
  'Orthopedic Surgery',
  'Obstetrics & Gynecology',
  'Psychiatry',
  'Gastroenterology',
  'Ophthalmology',
  'Otolaryngology (ENT)',
  'Pulmonology',
  'Endocrinology',
  'Oncology',
  'General Surgery',
  'Family Medicine',
];

export default function DoctorSearchFilters({
  query,
  onQueryChange,
  specialty,
  onSpecialtyChange,
  selectedDate,
  onDateChange,
}) {
  const [specialties, setSpecialties] = useState(FALLBACK_SPECIALTIES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const response = await fetch('http://localhost:5000/api/specialties');
        if (!response.ok) {
          throw new Error('Failed to fetch specialties');
        }
        const data = await response.json();
        const names = (data.specialties || []).map((s) => s.name);
        if (isMounted && names.length > 0) {
          setSpecialties(names);
        }
      } catch (err) {
        console.error('Error fetching specialties:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const options = ['All Specialties', ...specialties];

  return (
    <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
      <label className="relative block flex-1">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange?.(event.target.value)}
          placeholder="Doctor name or keyword"
          className="w-full h-11 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-10 py-2.5 text-sm text-slate-700 dark:text-slate-200 outline-none transition hover:border-gray-300 dark:hover:border-slate-600 focus:border-[#00b8e6] focus:ring-1 focus:ring-[#00b8e6]"
        />
      </label>

      <label className="relative block flex-1">
        <select
          value={specialty}
          onChange={(event) => onSpecialtyChange?.(event.target.value)}
          disabled={loading}
          className="w-full h-11 appearance-none rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 pr-10 text-sm text-slate-700 dark:text-slate-200 outline-none transition hover:border-gray-300 dark:hover:border-slate-600 focus:border-[#00b8e6] focus:ring-1 focus:ring-[#00b8e6] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </label>

      <label className="relative block flex-1">
        <DatePicker
          selected={selectedDate ? new Date(selectedDate) : null}
          onChange={(date) => onDateChange?.(date ? date.toISOString().split('T')[0] : '')}
          placeholderText="Select date"
          dateFormat="MMM dd, yyyy"
          minDate={new Date()}
          calendarClassName="!rounded-xl !border-gray-200 !shadow-lg"
          dayClassName={(date) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const isToday = date.getTime() === today.getTime();
            return isToday ? '!bg-cyan-100 !text-cyan-900' : '';
          }}
          formatWeekDay={(dayOfWeek) => dayOfWeek.slice(0, 3)}
          showPopperArrow={false}
          customInput={
            <div className="relative">
              <input
                readOnly
                value={selectedDate ? new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                placeholder="Select date"
                className="w-full h-11 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 pr-10 text-sm text-slate-700 dark:text-slate-200 outline-none transition hover:border-gray-300 dark:hover:border-slate-600 focus:border-[#00b8e6] focus:ring-1 focus:ring-[#00b8e6] cursor-pointer"
              />
              <Calendar className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          }
        />
      </label>

      <button
        type="button"
        className="bg-[#00b8e6] hover:bg-[#0099c2] text-white px-6 py-2.5 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 h-11 flex-shrink-0"
      >
        <Search className="h-4 w-4" />
        <span>Search</span>
      </button>
    </div>
  );
}
