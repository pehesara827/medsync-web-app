import { ArrowRight } from 'lucide-react';

// ---- Replace with GET /api/doctor/schedule/today ----
const SCHEDULE = [
  {
    id: 1, time: '09:00', period: 'AM', patient: 'Kasun Perera', status: 'ARRIVED', statusTone: 'cyan',
    detail: 'Routine Checkup • 45 yrs • Male', tags: [{ label: 'BP: 120/80', tone: 'slate' }, { label: 'HR: 88 (Elevated)', tone: 'rose' }],
    active: true,
  },
  {
    id: 2, time: '09:30', period: 'AM', patient: 'Ayesha Silva', status: 'WAITING', statusTone: 'slate',
    detail: 'Follow-up: ECG Results • 32 yrs • Female', tags: [],
  },
  {
    id: 3, time: '10:15', period: 'AM', patient: 'David Chen', status: 'SCHEDULED', statusTone: 'slate',
    detail: 'Consultation • 58 yrs • Male', tags: [],
  },
];

const CLINIC_STATUS = { waitTime: '12 min', seen: 4, total: 12, critical: 0 };
const DAILY_VOLUME = [30, 55, 40, 90, 45]; // relative bar heights, replace with real hourly counts
// -----------------------------------------------------------------

const STATUS_STYLE = {
  cyan: 'bg-cyan-50 text-cyan-700',
  slate: 'bg-slate-100 text-slate-500',
};
const TAG_STYLE = {
  slate: 'bg-slate-100 text-slate-600',
  rose: 'bg-rose-50 text-rose-600',
};

export default function DoctorDashboard() {
  const today = new Date();
  const dateLabel = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-slate-900">Today's Schedule</h1>
        <p className="text-sm text-slate-500 mt-1">{dateLabel} • {SCHEDULE.length} Appointments</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        <div className="space-y-4">
          {SCHEDULE.map((a) => (
            <div
              key={a.id}
              className={`bg-white rounded-xl border border-slate-200 p-5 flex items-center justify-between ${
                a.active ? 'border-l-4 border-l-cyan-500' : ''
              }`}
            >
              <div className="flex items-start gap-5">
                <div className="text-cyan-600 font-semibold text-sm w-14">
                  {a.time}<br /><span className="text-xs font-normal text-slate-400">{a.period}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-slate-900">{a.patient}</p>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[a.statusTone]}`}>{a.status}</span>
                  </div>
                  <p className="text-xs text-slate-400 mb-2">{a.detail}</p>
                  {a.tags.length > 0 && (
                    <div className="flex gap-2">
                      {a.tags.map((t, i) => (
                        <span key={i} className={`text-[10px] font-medium px-2 py-0.5 rounded ${TAG_STYLE[t.tone]}`}>{t.label}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <button aria-label="Open appointment" className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 flex-shrink-0">
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-[11px] font-semibold text-cyan-700 tracking-wide flex items-center gap-1.5 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" /> CLINIC STATUS
            </p>
            <div className="flex items-center justify-between text-sm mb-3">
              <span className="text-slate-500">Wait Time (Avg)</span>
              <span className="font-semibold text-cyan-600">{CLINIC_STATUS.waitTime}</span>
            </div>
            <div className="flex items-center justify-between text-sm mb-3">
              <span className="text-slate-500">Patients Seen</span>
              <span className="font-semibold text-slate-900">{CLINIC_STATUS.seen} / {CLINIC_STATUS.total}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Critical Alerts</span>
              <span className="font-semibold text-rose-500">{CLINIC_STATUS.critical}</span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-[11px] font-semibold text-slate-400 tracking-wide mb-4">DAILY VOLUME</p>
            <div className="flex items-end gap-2 h-24">
              {DAILY_VOLUME.map((v, i) => (
                <div
                  key={i}
                  className={`flex-1 rounded-t ${i === 3 ? 'bg-cyan-500' : 'bg-slate-100'}`}
                  style={{ height: `${v}%` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}