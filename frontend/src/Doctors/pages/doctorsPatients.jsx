import { useState, useEffect } from 'react';
import { Users, Phone, Droplet, MapPin } from 'lucide-react';
import { supabase } from '../../../supabaseClient';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function DoctorPatients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadPatients = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user;
        if (!user) {
          setError('You must be logged in to view patients.');
          return;
        }

        const backendUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

        // Get doctor profile to get doctor_id
        const profileResponse = await fetch(`${backendUrl}/doctor/profile/${user.id}`);
        if (!profileResponse.ok) {
          const errData = await profileResponse.json().catch(() => ({}));
          throw new Error(errData.message || `Failed to load doctor profile (${profileResponse.status})`);
        }
        const profileData = await profileResponse.json();

        // Fetch patients for this doctor
        const patientsResponse = await fetch(`${backendUrl}/doctor/patients/${profileData.doctor.id}`);
        if (!patientsResponse.ok) {
          const errData = await patientsResponse.json().catch(() => ({}));
          throw new Error(errData.message || `Failed to load patients (${patientsResponse.status})`);
        }
        const patientsData = await patientsResponse.json();
        setPatients(patientsData.patients || []);
      } catch (err) {
        setError(`Failed to load patients: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    loadPatients();
  }, []);

  if (loading) {
    return <LoadingSpinner message="Loading your patients" />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center p-6 bg-red-50 rounded-2xl border border-red-200 max-w-md">
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">My Patients</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {patients.length} unique patient{patients.length !== 1 ? 's' : ''} seen
          </p>
        </div>
      </div>

      {patients.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-10 text-center">
          <Users className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400 text-sm">No patients yet. Patients will appear here once they book appointments with you.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {patients.map((patient) => (
            <div
              key={patient.id}
              className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-cyan-50 dark:bg-cyan-950/40 flex items-center justify-center text-cyan-600 dark:text-cyan-400 font-bold text-sm flex-shrink-0">
                  {patient.name?.charAt(0) || '?'}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">{patient.name}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {patient.bookingType === 'BENEFICIARY' ? `Beneficiary • ${patient.relationship || ''}` : 'Patient'}
                    {patient.age ? ` • ${patient.age} yrs` : ''}
                    {patient.gender ? ` • ${patient.gender}` : ''}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                {patient.phone && (
                  <p className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                    {patient.phone}
                  </p>
                )}
                {patient.bloodGroup && (
                  <p className="flex items-center gap-2">
                    <Droplet className="w-3.5 h-3.5 text-rose-400" />
                    Blood: {patient.bloodGroup}
                  </p>
                )}
                {patient.address && (
                  <p className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                    <span className="truncate">{patient.address}</span>
                  </p>
                )}
              </div>

              {patient.lastVisit && (
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    Last visit: {new Date(`${patient.lastVisit}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}