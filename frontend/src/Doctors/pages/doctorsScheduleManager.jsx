import { useState } from 'react';
import { Timer, Hourglass, ArrowRight, Clock, CalendarClock } from 'lucide-react';

const DURATIONS = [
  { id: '15', label: '15 Mins', icon: Timer },
  { id: '30', label: '30 Mins', icon: Timer },
  { id: '45', label: '45 Mins', icon: Timer },
  { id: '60', label: '1 Hour', icon: Hourglass },
];

// ---- Replace with GET /api/doctor/session/current ----
const SESSION = { currentTime: '6:15 PM', scheduledStart: '6:30 PM' };
// -----------------------------------------------------------------

export default function DoctorScheduleManager() {
  const [selected, setSelected] = useState('30');
  const [broadcasting, setBroadcasting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleBroadcast = () => {
    // TODO: POST /api/doctor/session/delay { minutes: selected }
    setBroadcasting(true);
    setTimeout(() => {
      setBroadcasting(false);
      setSent(true);
      setTimeout(() => setSent(false), 2000);
    }, 800);
  };

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 w-full max-w-lg text-center">
        <h1 className="text-xl font-semibold text-slate-900">Report Current Session Delay</h1>

        <div className="flex items-center justify-center gap-4 mt-4 mb-8 text-sm">
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 text-slate-600">
            <Clock className="w-3.5 h-3.5" /> Current Time: <span className="font-semibold text-slate-900">{SESSION.currentTime}</span>
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 text-slate-600">
            <CalendarClock className="w-3.5 h-3.5" /> Scheduled Start: <span className="font-semibold text-slate-900">{SESSION.scheduledStart}</span>
          </span>
        </div>

        <p className="text-[11px] font-semibold text-slate-400 tracking-wide mb-3">SELECT DELAY DURATION</p>

        <div className="grid grid-cols-4 gap-3 mb-8">
          {DURATIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setSelected(id)}
              className={`flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition-colors ${
                selected === id ? 'border-cyan-600 bg-cyan-50/40' : 'border-slate-100 hover:border-slate-200'
              }`}
            >
              <Icon className={`w-5 h-5 ${selected === id ? 'text-cyan-600' : 'text-slate-400'}`} />
              <span className={`text-sm font-medium ${selected === id ? 'text-cyan-700' : 'text-slate-600'}`}>{label}</span>
            </button>
          ))}
        </div>

        <button
          onClick={handleBroadcast}
          disabled={broadcasting}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-cyan-700 text-white font-medium hover:bg-cyan-800 disabled:opacity-60"
        >
          {sent ? 'Delay Broadcast Sent ✓' : broadcasting ? 'Broadcasting…' : 'Broadcast Live Delay'}
          {!broadcasting && !sent && <ArrowRight className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}