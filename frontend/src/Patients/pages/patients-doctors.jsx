// src/Patients/pages/patients-doctors.jsx
import { useMemo, useState, useEffect, useCallback } from 'react';
import BrowseSpecialtySection from '../components/BrowseSpecialtySection';
import DoctorSearchFilters from '../components/DoctorSearchFilters';
import MainDoctorsCard from '../components/MainDoctorsCard';

export default function PatientsDoctors() {
  const [selectedSpecialty, setSelectedSpecialty] = useState('All Specialties');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDoctors = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('http://localhost:5000/api/doctors');

      if (!response.ok) {
        throw new Error('Failed to fetch doctors');
      }

      const data = await response.json();

      // Map backend doctor data to the card's expected shape
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
      await fetchDoctors();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchDoctors]);

  const filteredDoctors = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return doctors.filter((doctor) => {
      const matchesSpecialty =
        selectedSpecialty === 'All Specialties' ||
        doctor.specialty.toLowerCase() === selectedSpecialty.toLowerCase();

      const matchesQuery =
        !normalizedQuery ||
        doctor.name.toLowerCase().includes(normalizedQuery) ||
        doctor.specialty.toLowerCase().includes(normalizedQuery) ||
        doctor.clinic.toLowerCase().includes(normalizedQuery);

      const matchesDate =
        !selectedDate || doctor.availableDate === selectedDate;

      return matchesSpecialty && matchesQuery && matchesDate;
    });
  }, [doctors, selectedSpecialty, searchQuery, selectedDate]);

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
            />
          </div>
        </div>

        {loading ? (
          <div className="grid gap-5 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden animate-pulse">
                <div className="p-3 sm:p-4 flex flex-col gap-3 sm:gap-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-slate-100 sm:h-16 sm:w-16"></div>
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-slate-100 rounded w-3/4"></div>
                      <div className="h-3 bg-slate-100 rounded w-1/2"></div>
                    </div>
                  </div>
                  <div className="h-14 bg-slate-100 dark:bg-slate-700 rounded-3xl"></div>
                  <div className="h-10 bg-slate-100 dark:bg-slate-700 rounded-3xl"></div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-sm text-red-600 dark:text-red-300">Failed to load doctors. Please try again later.</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredDoctors.map((doctor) => (
              <MainDoctorsCard key={doctor.id} doctor={doctor} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}