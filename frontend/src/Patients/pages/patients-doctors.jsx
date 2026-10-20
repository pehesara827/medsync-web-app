// src/Patients/pages/patients-doctors.jsx
import { useMemo, useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../supabaseClient';
import BrowseSpecialtySection from '../components/BrowseSpecialtySection';
import DoctorSearchFilters from '../components/DoctorSearchFilters';
import MainDoctorsCard from '../components/MainDoctorsCard';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function PatientsDoctors() {
  const [selectedSpecialty, setSelectedSpecialty] = useState('All Specialties');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDoctors = useCallback(async (dateValue = '', specialtyValue = 'All Specialties') => {
    try {
      setLoading(true);
      setError(null);
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      const params = new URLSearchParams();
      if (dateValue) params.set('date', dateValue);
      if (specialtyValue && specialtyValue !== 'All Specialties') params.set('specialty', specialtyValue);
      const qs = params.toString() ? `?${params.toString()}` : '';
      const response = await fetch(`${backendUrl}/api/doctors${qs}`);

      if (!response.ok) {
        throw new Error('Failed to fetch doctors');
      }

      const data = await response.json();

      // Merge favorite flags so the profile modal heart renders red for
      // already-favorited doctors. GET /api/doctors has no patient context,
      // so resolve the patient's favorite ids separately (best effort).
      let favoriteIds = new Set();
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user;
        if (user) {
          const { data: profile } = await supabase
            .from('patient_profiles')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();
          if (profile?.id) {
            const favRes = await fetch(`${backendUrl}/api/favorites/patient/${profile.id}`);
            if (favRes.ok) {
              const favData = await favRes.json();
              const ids = favData.favoriteDoctorIds || (favData.favorites || []).map((f) => f.id);
              favoriteIds = new Set(ids);
            }
          }
        }
      } catch (favErr) {
        console.warn('Failed to load favorite flags:', favErr);
      }

      // Map backend doctor data to the card's expected shape.
      // NOTE: the selected date NEVER hides doctors — it only annotates
      // each card (hasSlotOnDate / slotsOnDate / firstSlotTime).
      const mappedDoctors = (data.doctors || []).map((doc) => ({
        id: doc.id,
        name: `Dr. ${doc.first_name} ${doc.last_name}`,
        specialty: Array.isArray(doc.specialties) ? doc.specialties[0]?.name : doc.specialties?.name || doc.specialization || '',
        clinic: doc.specialization || '',
        location: doc.specialization || '',
        rating: doc.rating ?? 5.0,
        reviewsCount: doc.review_count ?? 0,
        nextAvailable: doc.nextAvailable || 'Today, 2:30 PM',
        availableDate: doc.availableDate || new Date().toISOString().split('T')[0],
        image: doc.doctor_image || '',
        modes: ['Telehealth', 'In-Person'],
        consultationFee: doc.consultationFee ?? 0,
        experience: doc.experience ?? doc.experience_years ?? 0,
        description: doc.description || '',
        education: doc.education || '',
        isFavorite: doc.isFavorite ?? favoriteIds.has(doc.id),
        // Date soft-filter annotation from GET /api/doctors?date=
        slotsDate: doc.slotsDate ?? null,
        hasSlotOnDate: doc.hasSlotOnDate ?? null,
        slotsOnDate: doc.slotsOnDate ?? 0,
        firstSlotTime: doc.firstSlotTime ?? null,
      }));

      setDoctors(mappedDoctors);
    } catch (err) {
      console.error('Error fetching doctors:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await fetchDoctors(selectedDate, selectedSpecialty);
    })();
  }, [fetchDoctors, selectedDate, selectedSpecialty]);

  const filteredDoctors = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    // Specialty + search hide non-matches. Date NEVER hides — it only
    // annotates/sorts (available doctors first).
    const filtered = doctors.filter((doctor) => {
      const matchesSpecialty =
        selectedSpecialty === 'All Specialties' ||
        doctor.specialty.toLowerCase() === selectedSpecialty.toLowerCase();

      const matchesQuery =
        !normalizedQuery ||
        doctor.name.toLowerCase().includes(normalizedQuery) ||
        doctor.specialty.toLowerCase().includes(normalizedQuery) ||
        doctor.clinic.toLowerCase().includes(normalizedQuery);

      return matchesSpecialty && matchesQuery;
    });

    if (selectedDate) {
      return [...filtered].sort((a, b) => {
        const aAvail = a.hasSlotOnDate ? 1 : 0;
        const bAvail = b.hasSlotOnDate ? 1 : 0;
        if (aAvail !== bAvail) return bAvail - aAvail; // available first
        return (Number(b.rating) || 0) - (Number(a.rating) || 0);
      });
    }

    return filtered;
  }, [doctors, selectedSpecialty, searchQuery, selectedDate]);

  const availableOnDateCount = useMemo(
    () => (selectedDate ? filteredDoctors.filter((d) => d.hasSlotOnDate).length : 0),
    [filteredDoctors, selectedDate]
  );

  const handleFavoriteToggle = useCallback((doctorId, isFav) => {
    setDoctors((prev) =>
      prev.map((d) => (d.id === doctorId ? { ...d, isFavorite: isFav } : d))
    );
  }, []);

  return (
    <div className="flex-1 w-full px-4 py-4 md:px-6 lg:px-8">
      <div className="space-y-5 sm:space-y-6">
        <div>
          <div className="mb-5 max-w-2xl">
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 sm:text-3xl">
              Find & Book Doctors
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 sm:text-base">
              Search our network of certified specialists and book telehealth or in-person consultations.
            </p>
          </div>

          <BrowseSpecialtySection
            selectedSpecialty={selectedSpecialty}
            onSelect={setSelectedSpecialty}
          />

          <div className="mt-5">
            <DoctorSearchFilters
              query={searchQuery}
              onQueryChange={setSearchQuery}
              specialty={selectedSpecialty}
              onSpecialtyChange={setSelectedSpecialty}
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              onSearch={() => fetchDoctors(selectedDate, selectedSpecialty)}
            />
          </div>
        </div>

        {loading ? (
          <LoadingSpinner message="Loading doctors" fullscreen={false} />
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-sm text-red-600 dark:text-red-300">Failed to load doctors. Please try again later.</p>
          </div>
        ) : filteredDoctors.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              No doctors match your specialty or search. Try a different specialty or clear your search.
            </p>
            <button
              type="button"
              onClick={() => { setSelectedSpecialty('All Specialties'); setSearchQuery(''); }}
              className="mt-3 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <>
            {selectedDate && (
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 sm:text-sm">
                {availableOnDateCount} of {filteredDoctors.length} available on{' '}
                {new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                {' '}— all doctors shown, available first.
              </p>
            )}
            <div className="grid gap-5 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
              {filteredDoctors.map((doctor) => (
                <MainDoctorsCard
                  key={doctor.id}
                  doctor={doctor}
                  selectedDate={selectedDate}
                  onFavoriteToggle={handleFavoriteToggle}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}