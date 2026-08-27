import { useState, useEffect } from 'react';
import {
  Calendar,
  CreditCard,
  Plus,
  Clock,
  DollarSign,
  QrCode,
} from 'lucide-react';
import AddAppointmentModal from '../components/AddAppointmentModal';
import LoadingSpinner from '../../components/LoadingSpinner';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export default function AdminDashboard() {
  const [stats, setStats] = useState([]);
  const [completedByDay, setCompletedByDay] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [activeSlot, setActiveSlot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showNewAppointment, setShowNewAppointment] = useState(false);

  const refreshDashboard = () => {
    // Re-run dashboard load after a manual appointment is created.
    setLoading(true);
    fetch(`${API_BASE_URL}/admin/dashboard`)
      .then((res) => res.json())
      .then((data) => {
        setStats([
          { id: 'appointments', label: 'Total Appointments Today', value: data.stats?.totalAppointmentsToday ?? 0, icon: Calendar },
          { id: 'schedules', label: 'Active Schedules', value: data.stats?.activeSchedules ?? 0, icon: Clock },
          { id: 'payments-pending', label: 'Pending Payments', value: data.stats?.pendingPayments ?? 0, tag: 'Needs action', icon: CreditCard },
          { id: 'payments-completed', label: 'Completed Payments', value: data.stats?.completedPayments ?? 0, icon: DollarSign },
        ]);
        setCompletedByDay(data.completedByDay || []);
        setTimeSlots(data.timeSlots || []);
        setActiveSlot(data.activeSlot);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/admin/dashboard`);
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.message || `Failed to load dashboard (${response.status})`);
        }
        const data = await response.json();

        setStats([
          { id: 'appointments', label: 'Total Appointments Today', value: data.stats?.totalAppointmentsToday ?? 0, icon: Calendar },
          { id: 'schedules', label: 'Active Schedules', value: data.stats?.activeSchedules ?? 0, icon: Clock },
          { id: 'payments-pending', label: 'Pending Payments', value: data.stats?.pendingPayments ?? 0, tag: 'Needs action', icon: CreditCard },
          { id: 'payments-completed', label: 'Completed Payments', value: data.stats?.completedPayments ?? 0, icon: DollarSign },
        ]);
        setCompletedByDay(data.completedByDay || []);
        setTimeSlots(data.timeSlots || []);
        setActiveSlot(data.activeSlot);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const maxCompleted = Math.max(0, ...completedByDay.map((d) => d.count || 0));
  const chartDenom = maxCompleted || 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Hospital Command Center</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time health operational metrics for {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowNewAppointment(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-[#00a8cc] text-white hover:bg-[#0099bb]"
          >
            <Plus className="w-4 h-4" />
            New Appointment
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner message="Loading dashboard data" fullscreen={false} />
      ) : error ? (
        <div className="rounded-lg border border-rose-300 bg-rose-50 dark:bg-slate-800 p-4 text-sm text-rose-700 dark:text-rose-300">
          Failed to load dashboard data: {error}
        </div>
      ) : (
        <>
          {/* Top stat cards */}
          <div className="grid grid-cols-4 gap-3">
            {stats.map(({ id, label, value, tag, icon: Icon }) => (
              <div key={id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                <div className="flex items-start justify-between">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                    <Icon className="w-4.5 h-4.5 text-slate-600 dark:text-slate-400" />
                  </div>
                  {tag && <span className="text-xs font-medium text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">{tag}</span>}
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-4">{label}</p>
                <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mt-1">{value}</p>
              </div>
            ))}
          </div>

          {/* Completed appointments chart + Today's time slots */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Completed Appointments</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Completed appointments per day this week.</p>
                </div>
              </div>

              {completedByDay.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-5">No completed appointments recorded this week.</p>
              ) : (
                <>
                  <div className="flex items-stretch gap-2 mt-5" style={{ height: '220px' }}>
                    {completedByDay.map(({ day, count }) => (
                      <div key={day} className="flex-1 relative">
                        <span className="absolute top-0 left-1/2 -translate-x-1/2 text-xs font-medium text-slate-600 dark:text-slate-400">
                          {count}
                        </span>
                        <div
                          className="absolute inset-x-4 bottom-0 bg-[#00a8cc] rounded-t-md"
                          style={{ height: `${Math.round((count / chartDenom) * 88)}%` }}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    {completedByDay.map(({ day }) => (
                      <div key={day} className="flex-1 text-center">
                        <span className="text-xs text-slate-500 dark:text-slate-400">{day}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Today's Time Slots</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Doctor appointments, specialities and booked counts.</p>
              </div>

              {timeSlots.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-4">No schedules found for today.</p>
              ) : (
                <div className="flex flex-col gap-3 mt-4 max-h-[300px] overflow-y-auto pr-1">
                  {timeSlots.map(({ time, doctor, specialty, count }) => (
                    <div key={`${time}-${doctor}`} className="flex items-center justify-between gap-3 border border-slate-100 dark:border-slate-700 rounded-lg p-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{doctor}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{specialty}</p>
                      </div>
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-md whitespace-nowrap">
                        {time}
                      </span>
                      <div className="text-center">
                        <p className="text-lg font-semibold text-[#00a8cc]">{count}</p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">appts</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Active Scanning */}
          <div className="bg-[#e0f5f8] dark:bg-slate-800 rounded-xl p-5 flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Active Scanning</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Point device camera at patient QR code for instant check-in verification.
              </p>

              {activeSlot ? (
                <div className="border border-teal-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 p-3 mt-3 inline-block">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{activeSlot.doctor}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {activeSlot.specialty} &middot; {activeSlot.time}
                  </p>
                  <span className="inline-block mt-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    Active now
                  </span>
                </div>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">No doctor on duty right now.</p>
              )}
            </div>
            <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-[#00a8cc] text-white hover:bg-[#0099bb] flex-shrink-0">
              <QrCode className="w-4 h-4" />
              Scan Now
            </button>
          </div>
        </>
      )}

      {/* New Appointment Modal */}
      <AddAppointmentModal
        isOpen={showNewAppointment}
        onClose={() => setShowNewAppointment(false)}
        onCreated={refreshDashboard}
      />
    </div>
  );
}
