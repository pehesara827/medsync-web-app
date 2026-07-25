// src/Patients/pages/patients-doctors.jsx
import { useMemo, useState } from 'react';
import BrowseSpecialtySection from '../components/BrowseSpecialtySection';
import DoctorSearchFilters from '../components/DoctorSearchFilters';
import MainDoctorsCard from '../components/MainDoctorsCard';
import { DOCTORS_PAGE_DOCTORS } from '../../MockData/doctorsPageData';

export default function PatientsDoctors() {
  const [selectedSpecialty, setSelectedSpecialty] = useState('All Specialties');
  const [searchQuery, setSearchQuery] = useState('');
  const [availability, setAvailability] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  const filteredDoctors = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const isSpecificDate = availability === 'Specific Date' && selectedDate;

    return DOCTORS_PAGE_DOCTORS.filter((doctor) => {
      const matchesSpecialty =
        selectedSpecialty === 'All Specialties' ||
        doctor.specialty.toLowerCase().includes(selectedSpecialty.toLowerCase());

      const matchesQuery =
        !normalizedQuery ||
        doctor.name.toLowerCase().includes(normalizedQuery) ||
        doctor.specialty.toLowerCase().includes(normalizedQuery) ||
        doctor.clinic.toLowerCase().includes(normalizedQuery);

      const matchesAvailability =
        !availability ||
        (!isSpecificDate && doctor.nextAvailable.toLowerCase().includes(availability.toLowerCase())) ||
        (isSpecificDate && doctor.availableDate === selectedDate);

      return matchesSpecialty && matchesQuery && matchesAvailability;
    });
  }, [selectedSpecialty, searchQuery, availability, selectedDate]);

  return (
    <div className="flex-1 w-full px-4 py-4 md:px-6 lg:px-8">
      <div className="space-y-5 sm:space-y-6">
        <div>
          <div className="mb-5 max-w-2xl">
            <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
              Find & Book Doctors
            </h1>
            <p className="mt-2 text-sm text-slate-500 sm:text-base">
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
              availability={availability}
              onAvailabilityChange={setAvailability}
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
            />
          </div>
        </div>

        <div className="grid gap-5 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredDoctors.map((doctor) => (
            <MainDoctorsCard key={doctor.id} doctor={doctor} />
          ))}
        </div>
      </div>
    </div>
  );
}
