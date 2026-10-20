import { useState, useEffect } from 'react';
import { Clock, CheckCircle2, XCircle, AlertCircle, Calendar, User } from 'lucide-react';

const STATUS_CONFIG = {
  WAITING: { label: 'Waiting', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-800', icon: Clock },
  NOTIFIED: { label: 'Offer Sent!', color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-50 dark:bg-cyan-950/30', border: 'border-cyan-200 dark:border-cyan-800', icon: AlertCircle },
  CONVERTED: { label: 'Converted', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-800', icon: CheckCircle2 },
  EXPIRED: { label: 'Expired', color: 'text-slate-500 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-slate-800', border: 'border-slate-200 dark:border-slate-700', icon: XCircle },
  SKIPPED: { label: 'Skipped', color: 'text-slate-500 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-slate-800', border: 'border-slate-200 dark:border-slate-700', icon: XCircle },
  CANCELLED: { label: 'Cancelled', color: 'text-slate-500 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-slate-800', border: 'border-slate-200 dark:border-slate-700', icon: XCircle },
};

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

export default function WaitlistStatusCard({ entry, onAccept, onDecline, onCancel, acceptingId, decliningId }) {
  const config = STATUS_CONFIG[entry.status] || STATUS_CONFIG.WAITING;
  const Icon = config.icon;

  const [timeLeft, setTimeLeft] = useState('');
  useEffect(() => {
    if (entry.status !== 'NOTIFIED' || !entry.expires_at) return;
    const updateTimer = () => {
      const now = new Date();
      const expiry = new Date(entry.expires_at);
      const diff = Math.max(0, Math.floor((expiry - now) / 1000));
      if (diff <= 0) {
        setTimeLeft('Expired');
      } else {
        const mins = Math.floor(diff / 60);
        const secs = diff % 60;
        setTimeLeft(`${mins}:${String(secs).padStart(2, '0')}`);
      }
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [entry.status, entry.expires_at]);

  const doctor = entry.doctor_profiles || {};
  const schedule = entry.doctor_schedules || {};

  return (
    <div className={`rounded-2xl border p-5 ${config.bg} ${config.border} transition`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4 flex-1">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${config.bg}`}>
            <Icon size={20} className={config.color} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h3 className="font-bold text-slate-800 dark:text-slate-100">
                Dr. {doctor.first_name || ''} {doctor.last_name || ''}
              </h3>
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${config.color} ${config.bg}`}>
                {config.label}
              </span>
              {entry.status === 'WAITING' && (
                <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                  In Queue
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mt-2">
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-slate-400 dark:text-slate-500" />
                <span className="text-slate-600 dark:text-slate-300">{formatDate(schedule.available_date)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-slate-400 dark:text-slate-500" />
                <span className="text-slate-600 dark:text-slate-300">
                  {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                </span>
              </div>
              {doctor.specialties?.name && (
                <div className="flex items-center gap-2">
                  <User size={14} className="text-slate-400 dark:text-slate-500" />
                  <span className="text-slate-600 dark:text-slate-300">{doctor.specialties.name}</span>
                </div>
              )}
              {schedule.consultation_fee && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 dark:text-slate-500">Fee:</span>
                  <span className="font-semibold text-[#00b8e6]">Rs. {Number(schedule.consultation_fee).toLocaleString()}</span>
                </div>
              )}
            </div>

            {entry.status === 'NOTIFIED' && timeLeft && (
              <div className="mt-3 p-3 rounded-xl bg-cyan-100 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-cyan-600 dark:text-cyan-400 animate-pulse" />
                  <span className="text-sm font-semibold text-cyan-700 dark:text-cyan-300">
                    Claim this slot within: {timeLeft}
                  </span>
                </div>
                <p className="text-xs text-cyan-600 dark:text-cyan-400 mt-1">
                  A slot has opened up. Confirm now to secure your appointment.
                </p>
              </div>
            )}
          </div>
        </div>

        {entry.status === 'NOTIFIED' && (
          <div className="flex flex-col gap-2 ml-4 flex-shrink-0">
            <button
              onClick={() => onAccept && onAccept(entry.id)}
              disabled={acceptingId === entry.id || timeLeft === 'Expired'}
              className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 transition flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {acceptingId === entry.id ? (
                <>
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Confirming...
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} />
                  Accept
                </>
              )}
            </button>
            <button
              onClick={() => onDecline && onDecline(entry.id)}
              disabled={decliningId === entry.id}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-red-50 dark:hover:bg-red-950/30 border border-slate-200 dark:border-slate-700 transition flex items-center gap-1 disabled:opacity-50"
            >
              {decliningId === entry.id ? (
                <>
                  <div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                  Declining...
                </>
              ) : (
                <>
                  <XCircle size={14} />
                  Decline
                </>
              )}
            </button>
          </div>
        )}

        {entry.status === 'WAITING' && (
          <button
            onClick={() => onCancel && onCancel(entry.id)}
            className="ml-4 text-xs text-slate-400 hover:text-red-500 transition flex-shrink-0"
            title="Remove from waitlist"
          >
            <XCircle size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
