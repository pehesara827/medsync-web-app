import { useState, useEffect } from 'react';
import { supabase, getAuthHeaders } from '../../../supabaseClient';
import BookNewAppointmentButton from '../components/BookNewButton';
import AppointmentsCarousel from '../components/AppointmentsCarousel';
import FavoriteDoctorsCarousel from '../components/FavoriteDoctorsCarousel';
import QuickStats from '../components/QuickStats';
import RecentActivity from '../components/RecentActivity';
import BookAppointmentModal from '../components/BookAppointmentModal';
import DoctorProfileModal from '../components/DoctorProfileModal';
import QRCodeModal from '../components/QRCodeModal';
import AppointmentReviewModal from '../components/AppointmentReviewModal';
import usePendingReviews from '../hooks/usePendingReviews';
import LoadingSpinner from '../../components/LoadingSpinner';

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
  const [patientId, setPatientId] = useState(null);
  const [patientName, setPatientName] = useState('');

  const {
    reviewAppointment,
    isReviewModalOpen,
    closeReviewModal,
    handleReviewSubmitted,
  } = usePendingReviews({ patientId });

  const handleFavoriteToggle = (doctorId, isFav) => {
    setFavoriteDoctors((prev) => {
      if (isFav) {
        return prev.map((d) => (d.id === doctorId ? { ...d, isFavorite: true } : d));
      }
      return prev.filter((d) => d.id !== doctorId);
    });
    setSelectedDoctor((prev) =>
      prev && prev.id === doctorId ? { ...prev, isFavorite: isFav } : prev
    );
  };

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
          .select('id, first_name')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profileError) throw profileError;
        if (!profile) {
          setError('No patient profile found for this account.');
          return;
        }

        setPatientName(profile.first_name || '');
        setPatientId(profile.id);

        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
        const headers = {
          'Content-Type': 'application/json',
          ...(await getAuthHeaders()),
        };
        const response = await fetch(`${backendUrl}/api/appointments/patient/${profile.id}`, {
          headers,
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.message || `Failed to load appointments (${response.status})`);
        }

        const data = await response.json();
        setAppointments(data.appointments || []);
        
        const appts = data.appointments || [];
        
        const completedVisits = appts.filter(
          (a) => (a.badgeStatus || a.status || '').toUpperCase() === 'COMPLETED'
        ).length;
        
        setStats({
          totalScheduled: appts.filter(
            (a) => {
              const status = (a.badgeStatus || a.status || '').toUpperCase();
              return status !== 'COMPLETED' && status !== 'CANCELLED' && status !== 'MISSED';
            }
          ).length,
          completedVisits,
          waitlist: 0,
        });

        try {
          const waitlistResponse = await fetch(`${backendUrl}/api/waitlist/patient/${profile.id}`);
          if (waitlistResponse.ok) {
            const waitlistData = await waitlistResponse.json();
            const entries = waitlistData.waitlist || [];
            const waitlistCount = entries.filter(
              (e) => e.status === 'WAITING' || e.status === 'NOTIFIED'
            ).length;
            setStats((prev) => ({ ...prev, waitlist: waitlistCount }));
          }
        } catch (waitlistErr) {
          console.warn('Could not fetch waitlist:', waitlistErr);
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
    return <LoadingSpinner message="Loading your dashboard" />;
  }

  const activeAppointments = appointments.filter((a) => {
    const status = (a.badgeStatus || a.status || '').toUpperCase();
    return status !== 'COMPLETED' && status !== 'CANCELLED' && status !== 'MISSED';
  });

  return (
    <div className='flex-1 w-full px-0 md:px-0 animate-fade-in'>
      <div className='flex flex-row w-full mb-6 gap-4 md:gap-6 items-center justify-between'>
        <div className='flex-1 min-w-0'>
          <h1 className='text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100'>
            Upcoming Appointments
          </h1>
          <p className="text-[#00b8e6] font-medium text-sm md:text-base mt-1 md:mt-2">
            {`${activeAppointments.length} Scheduled`}
          </p>
        </div>
        <div className='flex-shrink-0'>
          <BookNewAppointmentButton onClick={() => { setModalKey((k) => k + 1); setIsModalOpen(true); }} />
        </div>
      </div>

      <BookAppointmentModal key={modalKey} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      <div className='grid grid-cols-1 xl:grid-cols-3 gap-6 items-stretch'>
        <div className='xl:col-span-2 flex flex-col gap-6 md:gap-8 min-w-0'>
          <div>
            {error ? (
              <div className='flex items-center justify-center py-12'>
                <div className='text-center p-6 bg-red-50 rounded-2xl border border-red-200 max-w-md'>
                  <p className='text-red-700'>{error}</p>
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

        <div className='xl:col-span-1 flex flex-col gap-6 min-w-0'>
          <QuickStats
            totalScheduled={stats.totalScheduled}
            completedVisits={stats.completedVisits}
            waitlist={stats.waitlist}
          />

          <FavoriteDoctorsCarousel 
            doctors={favoriteDoctors} 
            onDoctorClick={(doctor) => {
              setSelectedDoctor({ ...doctor, isFavorite: true });
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
          onFavoriteToggle={handleFavoriteToggle}
        />

        <QRCodeModal
          isOpen={isQRModalOpen}
          onClose={() => {
            setIsQRModalOpen(false);
            setSelectedAppointment(null);
          }}
          appointment={selectedAppointment}
        />

        <AppointmentReviewModal
          isOpen={isReviewModalOpen}
          onClose={closeReviewModal}
          appointment={reviewAppointment}
          patientId={patientId || reviewAppointment?.patient_id || ''}
          patientName={patientName}
          onSubmitted={handleReviewSubmitted}
        />
      </div>
    </div>
  );
}
