import { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
  QrCode,
  Calendar,
  User,
  Stethoscope,
  Download,
  Search,
  Filter,
  ChevronDown,
} from 'lucide-react';

/**
 * QR Codes Management Page
 * Displays all appointments with their QR codes for easy access and download
 */
export default function QRCodePage() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [patientId, setPatientId] = useState(null);

  // Resolve patient ID on mount
  useEffect(() => {
    const resolvePatientId = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user;
        if (!user) {
          setError('You must be logged in to view QR codes.');
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

        setPatientId(profile.id);
      } catch (err) {
        setError(`Failed to load patient profile: ${err.message}`);
      }
    };

    resolvePatientId();
  }, []);

  // Fetch appointments when patient ID is available
  useEffect(() => {
    if (!patientId) return;

    const fetchAppointments = async () => {
      setLoading(true);
      setError('');
      try {
        const { data, error: apptError } = await supabase
          .from('appointments')
          .select(`
            id,
            appointment_date,
            status,
            booking_type,
            qr_code_url,
            doctor_profiles (
              first_name,
              last_name,
              specialization,
              specialties (
                name
              )
            ),
            doctor_schedules (
              start_time,
              end_time
            ),
            payments (
              payment_status
            ),
            beneficiaries (
              full_name,
              relationship
            )
          `)
          .eq('patient_id', patientId)
          .order('appointment_date', { ascending: false });

        if (apptError) throw apptError;
        setAppointments(data || []);
      } catch (err) {
        setError(`Failed to load appointments: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [patientId]);

  // Generate a structured display ID from a UUID
  // Format: MED-<first 8 chars of UUID uppercased, no dashes>
  const generateDisplayId = (uuid) => {
    if (!uuid) return 'MED-UNKNOWN';
    const shortId = uuid.replace(/-/g, '').slice(0, 8).toUpperCase();
    return `MED-${shortId}`;
  };

  // Format time from HH:MM:SS to 12-hour format
  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 === 0 ? 12 : hours % 12;
    return `${hour12}:${String(minutes).padStart(2, '0')} ${period}`;
  };

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const date = new Date(`${dateStr}T00:00:00`);
    if (Number.isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Get patient name
  const getPatientName = (appointment) => {
    if (appointment.booking_type === 'BENEFICIARY' && appointment.beneficiaries) {
      const ben = appointment.beneficiaries;
      return ben.relationship
        ? `${ben.full_name} (${ben.relationship})`
        : ben.full_name;
    }
    return 'Self';
  };

  // Get status badge color
  const getStatusBadge = (status) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'PENDING':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'COMPLETED':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'CANCELLED':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  // Download QR code
  const handleDownloadQR = (appointment) => {
    if (!appointment.qr_code_url) {
      alert('No QR code available for this appointment.');
      return;
    }

    const link = document.createElement('a');
    link.href = appointment.qr_code_url;
    link.download = `QR-Code-${appointment.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter appointments
  const filteredAppointments = appointments.filter((appt) => {
    const matchesSearch = 
      appt.doctor_profiles?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appt.doctor_profiles?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      generateDisplayId(appt.id).toLowerCase().includes(searchTerm.toLowerCase()) ||
      appt.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appt.doctor_profiles?.specialties?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appt.doctor_profiles?.specialization?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = 
      filterStatus === 'all' || 
      appt.status === filterStatus.toUpperCase();

    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return <LoadingSpinner message="Loading your QR codes" />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-8 bg-red-50 rounded-2xl border border-red-200 max-w-md">
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-[#00b8e6] rounded-xl">
              <QrCode size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-800">QR Codes</h1>
              <p className="text-slate-600">View and download QR codes for your appointments</p>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Search by doctor name, appointment ID, or specialization..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#00b8e6]/30 focus:border-[#00b8e6]"
              />
            </div>

            {/* Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#00b8e6]/30 focus:border-[#00b8e6] appearance-none"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
            </div>
          </div>
        </div>

        {/* Appointments Grid */}
        {filteredAppointments.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
            <QrCode size={64} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-xl font-semibold text-slate-700 mb-2">No QR Codes Found</h3>
            <p className="text-slate-500">
              {searchTerm || filterStatus !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'You don\'t have any appointments yet. Book an appointment to generate QR codes.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAppointments.map((appointment) => {
              const doctor = appointment.doctor_profiles || {};
              const schedule = appointment.doctor_schedules || {};
              const payment = appointment.payments || {};

              return (
                <div
                  key={appointment.id}
                  className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow duration-200"
                >
                  {/* Card Header */}
                  <div className="bg-gradient-to-br from-[#00b8e6] to-[#0090b3] px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-1">
                          Booking Ref
                        </p>
                        <p className="text-white font-bold text-lg font-mono tracking-wider">
                          {generateDisplayId(appointment.id)}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusBadge(appointment.status)}`}>
                        {appointment.status}
                      </span>
                    </div>
                  </div>

                  {/* QR Code */}
                  <div className="p-6 flex flex-col items-center">
                    {appointment.qr_code_url ? (
                      <img
                        src={appointment.qr_code_url}
                        alt="QR Code"
                        className="w-48 h-48 border-2 border-slate-200 rounded-xl"
                      />
                    ) : (
                      <div className="w-48 h-48 bg-slate-100 rounded-xl flex items-center justify-center">
                        <p className="text-slate-400 text-sm">No QR Code</p>
                      </div>
                    )}
                  </div>

                  {/* Appointment Details */}
                  <div className="px-6 pb-6 space-y-3">
                    {/* Doctor */}
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#00b8e6]/10 text-[#00b8e6] flex items-center justify-center">
                        <Stethoscope size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-slate-500">Doctor</p>
                        <p className="text-sm font-semibold text-slate-800 truncate">
                          Dr. {doctor.first_name} {doctor.last_name}
                        </p>
                        <p className="text-xs text-slate-600">{doctor.specialties?.name || doctor.specialization}</p>
                      </div>
                    </div>

                    {/* Date & Time */}
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#00b8e6]/10 text-[#00b8e6] flex items-center justify-center">
                        <Calendar size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-slate-500">Schedule</p>
                        <p className="text-sm font-semibold text-slate-800">
                          {formatDate(appointment.appointment_date)}
                        </p>
                        <p className="text-xs text-slate-600">
                          {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                        </p>
                      </div>
                    </div>

                    {/* Patient */}
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#00b8e6]/10 text-[#00b8e6] flex items-center justify-center">
                        <User size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-slate-500">Patient</p>
                        <p className="text-sm font-semibold text-slate-800">
                          {getPatientName(appointment)}
                        </p>
                      </div>
                    </div>

                    {/* Payment Status */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                      <span className="text-xs text-slate-500">Payment</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-bold border ${getStatusBadge(payment.payment_status)}`}>
                        {payment.payment_status || 'UNPAID'}
                      </span>
                    </div>

                    {/* Download Button */}
                    <button
                      onClick={() => handleDownloadQR(appointment)}
                      disabled={!appointment.qr_code_url}
                      className="w-full mt-4 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#00b8e6] text-white font-semibold text-sm hover:bg-[#00a3cc] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Download size={16} />
                      Download QR Code
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}