import { useState, useEffect } from 'react';
import { X, User, Phone, Mail, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../../../supabaseClient';

export default function WaitlistModal({ isOpen, onClose, doctor, schedule, patientId, onJoined }) {
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [waitlistEntry, setWaitlistEntry] = useState(null);

  useEffect(() => {
    if (!isOpen || !patientId) return;
    const loadContact = async () => {
      try {
        const { data: profile } = await supabase
          .from('patient_profiles')
          .select('phone_number')
          .eq('id', patientId)
          .maybeSingle();
        if (profile) setContactPhone(profile.phone_number || '');
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user;
        if (user?.email) setContactEmail(user.email);
      } catch (err) {
        console.error('Failed to load contact details:', err);
      }
    };
    loadContact();
  }, [isOpen, patientId]);

  const formatTime = (t) => {
    if (!t) return '—';
    const [h, m] = t.split(':').map(Number);
    const p = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${p}`;
  };
  const formatDate = (d) => {
    if (!d) return '—';
    const date = new Date(`${d}T00:00:00`);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    try {
      if (!contactPhone) throw new Error('Please provide a contact phone number.');
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      const response = await fetch(`${backendUrl}/api/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: patientId,
          doctor_id: doctor?.id,
          schedule_id: schedule?.id,
          booking_type: 'SELF',
          contact_phone: contactPhone,
          contact_email: contactEmail,
        }),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({ message: 'Failed to join waitlist' }));
        throw new Error(errData.message || `HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      setWaitlistEntry(result.waitlist);
      setSuccess('You have been added to the waitlist!');
      if (onJoined) onJoined(result.waitlist);
    } catch (err) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 z-10 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition">
          <X size={20} className="text-slate-600 dark:text-slate-200" />
        </button>
        <div className="p-6 md:p-8">
          <div className="mb-6">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100">
              {success ? 'Waitlist Confirmation' : 'Join Waitlist'}
            </h2>
            {success && <p className="text-sm text-slate-500 dark:text-slate-300 mt-1">You'll be notified when a slot becomes available.</p>}
          </div>

          {error && (
            <div className="mb-6 rounded-2xl border border-red-200 dark:border-red-600 bg-red-50 dark:bg-red-950 px-5 py-4 text-sm text-red-700 dark:text-red-200 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {success && waitlistEntry ? (
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">You're on the Waitlist!</h3>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-6 mb-6 text-left space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500 dark:text-slate-400">Your Position</span>
                  <span className="font-bold text-2xl text-amber-600 dark:text-amber-400">Waiting</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500 dark:text-slate-400">Doctor</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-100">Dr. {doctor?.first_name} {doctor?.last_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500 dark:text-slate-400">Date & Time</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-100">{formatDate(schedule?.available_date)} • {formatTime(schedule?.start_time)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500 dark:text-slate-400">Status</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">Waiting</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">You'll receive a notification when a slot opens up. You'll have 2 hours to confirm.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-5 space-y-3">
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <User size={16} className="text-[#00b8e6]" />
                  Slot Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div><p className="text-xs text-slate-500 dark:text-slate-400">Doctor</p><p className="font-semibold text-slate-700 dark:text-slate-100">Dr. {doctor?.first_name || ''} {doctor?.last_name || ''}</p></div>
                  <div><p className="text-xs text-slate-500 dark:text-slate-400">Specialization</p><p className="font-semibold text-slate-700 dark:text-slate-100">{doctor?.specialties?.name || doctor?.specialization || '—'}</p></div>
                  <div><p className="text-xs text-slate-500 dark:text-slate-400">Date</p><p className="font-semibold text-slate-700 dark:text-slate-100">{formatDate(schedule?.available_date)}</p></div>
                  <div><p className="text-xs text-slate-500 dark:text-slate-400">Time</p><p className="font-semibold text-slate-700 dark:text-slate-100">{formatTime(schedule?.start_time)} - {formatTime(schedule?.end_time)}</p></div>
                  <div><p className="text-xs text-slate-500 dark:text-slate-400">Consultation Fee</p><p className="font-semibold text-[#00b8e6]">{schedule?.consultation_fee ? `Rs. ${Number(schedule.consultation_fee).toLocaleString()}` : '—'}</p></div>
                  <div><p className="text-xs text-slate-500 dark:text-slate-400">Current Status</p><p className="font-semibold text-red-600 dark:text-red-400">Full — Join Waitlist</p></div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Phone size={16} className="text-[#00b8e6]" />
                  Contact Details
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">We'll use these details to notify you when a slot opens.</p>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Phone Number <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input type="tel" required value={contactPhone} onChange={(e) => setContactPhone(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#00b8e6]/30 focus:border-[#00b8e6]"
                      placeholder="Enter your phone number" />
                    <Phone size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Email Address</label>
                  <div className="relative">
                    <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#00b8e6]/30 focus:border-[#00b8e6]"
                      placeholder="Enter your email address" />
                    <Mail size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button type="button" onClick={onClose} disabled={loading}
                  className="px-6 py-3 rounded-xl text-slate-700 dark:text-slate-200 font-semibold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50">Cancel</button>
                <button type="submit" disabled={loading}
                  className="px-6 py-3 rounded-xl bg-[#00b8e6] text-white font-semibold text-sm hover:bg-[#00a3cc] shadow-md hover:shadow-lg transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                  {loading ? (<>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Joining...
                  </>) : 'Join Waitlist'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
