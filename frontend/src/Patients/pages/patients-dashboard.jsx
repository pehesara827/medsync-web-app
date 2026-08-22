import { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import BookNewAppointmentButton from '../components/BookNewButton';
import AppointmentsCarousel from '../components/AppointmentsCarousel';
import FavoriteDoctorsCarousel from '../components/FavoriteDoctorsCarousel';
import QuickStats from '../components/QuickStats';
import RecentActivity from '../components/RecentActivity';
import BookAppointmentModal from '../components/BookAppointmentModal';
import DoctorProfileModal from '../components/DoctorProfileModal';
import QRCodeModal from '../components/QRCodeModal';
import LoadingSpinner from '../components/LoadingSpinner';

export default function PatientsDashboard() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalKey, setModalKey] = useState(0);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    totalScheduled: 0,
    completedVisits: 0,
    waitlist: 0,
  });
  const [favoriteDoctors, setFavoriteDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);

  useEffect(() => {
    const loadAppointments = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user;
        if (!user) {
          setError('You must be logged in to view appointments.');
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('patient_profiles')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profileError) throw profileError;
        if (!profile) {
          setError('No patient profile found for this account.');
          return;
        }

        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
        const response = await fetch(`${backendUrl}/api/appointments/patient/${profile.id}`);

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.message || `Failed to load appointments (${response.status})`);
        }

        const data = await response.json();
        setAppointments(data.appointments || []);
        const appts = data.appointments || [];
        // Fetch the patient's waitlist entries to compute the active waitlist count
        let waitlistCount = 0;
        try {
          const waitlistResponse = await fetch(`${backendUrl}/api/waitlist/patient/${profile.id}`);
          if (waitlistResponse.ok) {
            const waitlistData = await waitlistResponse.json();
            const entries = waitlistData.waitlist || [];
            waitlistCount = entries.filter(
              (e) => e.status === 'WAITING' || e.status === 'NOTIFIED'
            ).length;
          }
        } catch (waitlistErr) {
          console.warn('Failed to load waitlist count:', waitlistErr);
        }

        setStats({
          totalScheduled: appts.filter(
            (a) => a.status === 'PENDING' || a.status === 'CONFIRMED'
          ).length,
          completedVisits: appts.filter((a) => a.status === 'COMPLETED').length,
          waitlist: waitlistCount,
        });

        const favoritesResponse = await fetch(`${backendUrl}/api/favorites/patient/${profile.id}`);
        if (favoritesResponse.ok) {
          const favoritesData = await favoritesResponse.json();
          setFavoriteDoctors(favoritesData.favorites || []);
        } else {
          const favoriteError = await favoritesResponse.json().catch(() => ({}));
          console.warn('Failed to load favorite doctors:', favoriteError.message || favoritesResponse.status);
        }
      } catch (err) {
        setError(`Failed to load appointments: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    loadAppointments();
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="flex-1 w-full px-0 md:px-0 animate-fade-in">
      <div className="flex flex-row w-full mb-6 gap-4 md:gap-6 items-center justify-between">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100">
            Upcoming Appointments
          </h1>
          <p className="text-[#00b8e6] font-medium text-sm md:text-base mt-1 md:mt-2">
            {`${appointments.length} Scheduled`}
          </p>
        </div>
        <div className="flex-shrink-0">
          <BookNewAppointmentButton onClick={() => { setModalKey((k) => k + 1); setIsModalOpen(true); }} />
        </div>
      </div>

      <BookAppointmentModal key={modalKey} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-stretch">
        <div className="xl:col-span-2 flex flex-col gap-6 md:gap-8 min-w-0">
          <div>
            {error ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center p-6 bg-red-50 rounded-2xl border border-red-200 max-w-md">
                  <p className="text-red-700">{error}</p>
                </div>
              </div>
            ) : (
              <AppointmentsCarousel
                appointments={appointments}
                onGetQR={(appointment) => {
                  setSelectedAppointment(appointment);
                  setIsQRModalOpen(true);
                }}
              />
            )}
          </div>

          <RecentActivity appointments={appointments} />
        </div>

        <div className="xl:col-span-1 flex flex-col gap-6 min-w-0">
          <QuickStats
            totalScheduled={stats.totalScheduled}
            completedVisits={stats.completedVisits}
            waitlist={stats.waitlist}
          />

          <FavoriteDoctorsCarousel 
            doctors={favoriteDoctors} 
            onDoctorClick={(doctor) => {
              setSelectedDoctor(doctor);
              setIsProfileModalOpen(true);
            }}
          />
        </div>

        <DoctorProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => {
            setIsProfileModalOpen(false);
            setSelectedDoctor(null);
          }}
          doctor={selectedDoctor}
        />

        <QRCodeModal
          isOpen={isQRModalOpen}
          onClose={() => {
            setIsQRModalOpen(false);
            setSelectedAppointment(null);
          }}
          appointment={selectedAppointment}
        />
      </div>
    </div>
  );
}
