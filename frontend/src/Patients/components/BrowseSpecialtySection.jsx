import { useState, useEffect, useCallback } from 'react';
import { Activity, Brain, ClipboardList, Eye, HeartPulse, Smile, Stethoscope } from 'lucide-react';

// Icon mapping for specialties
const ICON_MAP = {
  'Cardiology': HeartPulse,
  'Neurology': Brain,
  'Orthopedics': Activity,
  'Orthopedic Surgery': Activity,
  'General': ClipboardList,
  'General Medicine': ClipboardList,
  'General Surgery': ClipboardList,
  'Dental': Stethoscope,
  'Dentistry': Stethoscope,
  'Eye Care': Eye,
  'Ophthalmology': Eye,
  'Pediatrics': Smile,
};

export default function BrowseSpecialtySection({ selectedSpecialty, onSelect }) {
  const [specialties, setSpecialties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSpecialties = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('http://localhost:5000/api/specialties/top');
      
      if (!response.ok) {
        throw new Error('Failed to fetch specialties');
      }
      
      const data = await response.json();
      setSpecialties(data.specialties || []);
    } catch (err) {
      console.error('Error fetching specialties:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await fetchSpecialties();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchSpecialties]);

  if (loading) {
    return (
      <div className="rounded-4xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 sm:p-4 shadow-sm">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 sm:text-lg">Browse by Specialty</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">Search across our network of certified specialists.</p>
        </div>
        <div className="mt-3 sm:mt-4 flex gap-2">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-center min-w-[90px] sm:min-w-0 sm:gap-2 sm:px-3 sm:py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-700 sm:h-10 sm:w-10 animate-pulse"></div>
              <div className="h-3 w-16 bg-slate-100 dark:bg-slate-700 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-4xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 sm:p-4 shadow-sm">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 sm:text-lg">Browse by Specialty</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">Search across our network of certified specialists.</p>
        </div>
        <div className="mt-3 sm:mt-4 text-center py-8">
          <p className="text-sm text-red-600">Failed to load specialties. Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-4xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 sm:p-4 shadow-sm">
      <div>
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 sm:text-lg">Browse by Specialty</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">Search across our network of certified specialists.</p>
      </div>

      <div className="mt-3 sm:mt-4 -mx-4 px-4 overflow-x-auto no-scrollbar sm:mx-0 sm:px-0 sm:grid sm:grid-cols-4 xl:grid-cols-7 sm:gap-3 flex gap-2 pb-2 sm:pb-0">
        {specialties.map((specialty) => {
          const Icon = ICON_MAP[specialty.name] || ClipboardList;
          const isActive = selectedSpecialty === specialty.name;

          return (
            <button
              key={specialty.id}
              type="button"
              onClick={() => onSelect?.(specialty.name)}
              className={`flex flex-col items-center gap-1.5 rounded-3xl border px-3 py-2.5 text-center text-[10px] transition min-w-[90px] sm:min-w-0 sm:gap-2 sm:px-3 sm:py-3 sm:text-xs ${
                isActive
                  ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-500/10 text-slate-900 dark:text-slate-100'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-cyan-300 dark:hover:border-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-500/10'
              }`}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-cyan-600 sm:h-10 sm:w-10">
                <Icon className="h-4 w-4 sm:h-4 sm:w-4" />
              </span>
              <span className="font-medium leading-tight whitespace-nowrap sm:whitespace-normal">{specialty.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}