import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Filter } from 'lucide-react';

// ---- Replace with GET /api/doctor/appointments?date= ----
const APPOINTMENTS = [
  { id: 1, time: '08:00', period: 'AM', name: 'Arthur Pendelton', note: 'Routine Follow-up', tone: 'slate', joinable: false },
  { id: 2, time: '09:30', period: 'AM', name: 'Sarah Jenkins', note: 'Acute Consultation', tone: 'rose', joinable: true },
];

const RECENT = [
  { date: 'Oct 5, 14:00', name: 'Marcus Thorne', diagnosis: 'Hypertension Review', status: 'Completed', tone: 'cyan' },
  { date: 'Oct 5, 11:15', name: 'Elena Rodriguez', diagnosis: 'Thyroid Panel Follow-up', status: 'Awaiting Labs', tone: 'amber' },
];
// -----------------------------------------------------------------

const STATUS_TONE = {
  cyan: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-950/40 dark:text-cyan-300',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300',
};

function buildMonthGrid(year, month) {
  const first = new Date(year, month, 1);
  const startDay = first.getDay(); // Sun = 0, matches SUN-first mockup
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

export default function DoctorAppointments() {
  const today = new Date();
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selectedDay, setSelectedDay] = useState(today.getDate());

  const cells = useMemo(() => buildMonthGrid(cursor.year, cursor.month), [cursor]);
  const monthLabel = new Date(cursor.year, cursor.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const changeMonth = (delta) => {
    const d = new Date(cursor.year, cursor.month + delta, 1);
    setCursor({ year: d.getFullYear(), month: d.getMonth() });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Appointment Management</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage records, appointments, and clinical notes.</p>
        </div>
        <div className="relative">
          <input
            placeholder="Search patient ID, name, or MRN..."
            className="pl-3 pr-9 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 w-64 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
          <Filter className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">Select Date</p>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold text-cyan-600 dark:text-cyan-400">{monthLabel}</p>
            <div className="flex gap-1">
              <button onClick={() => changeMonth(-1)} className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-700">
                <ChevronLeft className="w-3.5 h-3.5 text-slate-500 dark:text-slate-300" />
              </button>
              <button onClick={() => changeMonth(1)} className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-700">
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 dark:text-slate-300" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-y-2 text-center text-[10px] text-slate-400 dark:text-slate-500 mb-1">
            {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d) => <span key={d}>{d}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-y-1 text-center text-sm">
            {cells.map((day, i) => (
              <button
                key={i}
                disabled={!day}
                onClick={() => day && setSelectedDay(day)}
                className={`w-8 h-8 mx-auto flex items-center justify-center rounded-full ${
                  !day ? '' : day === selectedDay ? 'bg-cyan-500 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {day || ''}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Appointments for {monthLabel.split(' ')[0]} {selectedDay}</p>
            <span className="text-xs font-medium bg-cyan-50 text-cyan-600 dark:bg-cyan-950/40 dark:text-cyan-300 px-2.5 py-1 rounded-full">{APPOINTMENTS.length} Scheduled</span>
          </div>

          <div className="space-y-3">
            {APPOINTMENTS.map((a) => (
              <div
                key={a.id}
                className={`flex items-center justify-between rounded-lg p-3 border ${
                  a.tone === 'rose' ? 'border-cyan-200 bg-cyan-50/40 dark:border-cyan-800 dark:bg-cyan-950/20' : 'border-slate-100 dark:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 w-14">
                    {a.time}<br /><span className="font-normal text-slate-400 dark:text-slate-500">{a.period}</span>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-600" />
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{a.name}</p>
                    <p className={`text-xs flex items-center gap-1 ${a.tone === 'rose' ? 'text-rose-500 dark:text-rose-400' : 'text-slate-400 dark:text-slate-500'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${a.tone === 'rose' ? 'bg-rose-500' : 'bg-slate-300 dark:bg-slate-500'}`} />
                      {a.note}
                    </p>
                  </div>
                </div>
                {a.joinable && (
                  <button className="px-3 py-1.5 text-xs font-medium rounded-lg bg-cyan-500 text-white hover:bg-cyan-600">
                    Join Session
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Recent Consultations</p>
          <button className="text-xs font-medium text-cyan-600 dark:text-cyan-400">View All →</button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-700">
              <th className="py-2 font-medium">Date / Time</th>
              <th className="py-2 font-medium">Patient Name</th>
              <th className="py-2 font-medium">Diagnosis / Topic</th>
              <th className="py-2 font-medium text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {RECENT.map((r, i) => (
              <tr key={i} className="border-b border-slate-50 dark:border-slate-700/50 last:border-0">
                <td className="py-3 text-slate-500 dark:text-slate-400">{r.date}</td>
                <td className="py-3 font-medium text-slate-900 dark:text-slate-100">{r.name}</td>
                <td className="py-3 text-slate-600 dark:text-slate-400">{r.diagnosis}</td>
                <td className="py-3 text-right">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_TONE[r.tone]}`}>{r.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}