import { useState } from 'react';
import { Bot, Upload, Calendar, Briefcase, CheckCircle2, ArrowRight, Save, Activity } from 'lucide-react';

// ---- Replace with GET /api/admin/medbot/config ----
const KNOWLEDGE_SOURCES = [
  { id: 'schedules', label: 'Clinic Schedules', synced: '2 hours ago', synced_ok: true },
  { id: 'specialties', label: 'Doctor Specialties', synced: 'Yesterday', synced_ok: false },
];

const QUERIES = [
  { snippet: '"How can I prepare for a fast..."', score: '4.9/5', time: '10:45 AM', status: 'RESOLVED' },
  { snippet: '"Is Dr. Aris available today?"', score: '4.7/5', time: '10:32 AM', status: 'RESOLVED' },
  { snippet: '"My heart rate is very high..."', score: 'N/A', time: '10:15 AM', status: 'ESCALATED' },
];
// -----------------------------------------------

const STATUS_STYLE = { RESOLVED: 'bg-emerald-50 text-emerald-600', ESCALATED: 'bg-rose-50 text-rose-600' };

function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`w-10 h-5.5 rounded-full flex items-center px-0.5 transition-colors ${checked ? 'bg-cyan-500 justify-end' : 'bg-slate-200 justify-start'}`}
    >
      <span className="w-4.5 h-4.5 rounded-full bg-white shadow" />
    </button>
  );
}

export default function MedBotConfig() {
  const [persona, setPersona] = useState('clinical');
  const [creativity, setCreativity] = useState(30);
  const [escalation, setEscalation] = useState({ lifeThreat: true, distress: true, unrecognized: true });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // TODO: PUT /api/admin/medbot/config { persona, creativity, escalation }
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
          <Bot className="w-6 h-6 text-cyan-600" /> MedBot AI Configuration Center
        </h1>
        <p className="text-sm text-slate-500 mt-1 max-w-2xl">
          Manage the hospital's virtual assistant. Update its medical knowledge, adjust personality parameters, and define escalation protocols for human intervention.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-6">
          {/* Knowledge base */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-medium text-slate-900">Knowledge Base</p>
                <p className="text-xs text-slate-400">Sync clinic schedules and specialty descriptions</p>
              </div>
              <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-900 text-white">
                <Upload className="w-3.5 h-3.5" /> Upload New Data
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="border border-slate-100 rounded-lg p-4 flex items-start justify-between">
                <div className="flex items-start gap-2">
                  <Calendar className="w-4 h-4 text-cyan-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">Clinic Schedules</p>
                    <p className="text-xs text-slate-400">Last synced: 2 hours ago</p>
                  </div>
                </div>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="border border-slate-100 rounded-lg p-4 flex items-start justify-between">
                <div className="flex items-start gap-2">
                  <Briefcase className="w-4 h-4 text-cyan-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">Doctor Specialties</p>
                    <p className="text-xs text-slate-400">Last synced: Yesterday</p>
                  </div>
                </div>
                <button className="text-xs font-medium text-cyan-600">Sync Now</button>
              </div>
            </div>

            <div className="flex items-start gap-2 bg-cyan-50 rounded-lg p-3">
              <Activity className="w-4 h-4 text-cyan-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-cyan-700">
                Auto-sync is currently active for the main hospital database. Changes to the HIS will reflect in MedBot every 6 hours.
              </p>
            </div>
          </div>

          {/* Recent queries */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="font-medium text-slate-900">Recent Patient Queries</p>
              <button className="flex items-center gap-1 text-xs font-medium text-cyan-600">
                View Detailed Analytics <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                  <th className="py-2 font-medium">Patient Query Snippet</th>
                  <th className="py-2 font-medium">AI Score</th>
                  <th className="py-2 font-medium">Timestamp</th>
                  <th className="py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {QUERIES.map((q, i) => (
                  <tr key={i} className="border-b border-slate-50 last:border-0">
                    <td className="py-3 text-slate-700">{q.snippet}</td>
                    <td className="py-3 text-slate-600">{q.score !== 'N/A' ? `★ ${q.score}` : '☆ N/A'}</td>
                    <td className="py-3 text-slate-400">{q.time}</td>
                    <td className="py-3">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${STATUS_STYLE[q.status]}`}>{q.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="font-medium text-slate-900 mb-3">Response Persona</p>
            <button
              onClick={() => setPersona('clinical')}
              className={`w-full text-left rounded-lg border p-3 mb-2 flex items-start justify-between ${
                persona === 'clinical' ? 'border-cyan-400 bg-cyan-50/50' : 'border-slate-100'
              }`}
            >
              <div>
                <p className="text-sm font-medium text-slate-900">Professional Clinical</p>
                <p className="text-xs text-slate-400">Concise, fact-based, and authoritative medical tone.</p>
              </div>
              <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 ${persona === 'clinical' ? 'border-cyan-500 bg-cyan-500' : 'border-slate-300'}`} />
            </button>
            <button
              onClick={() => setPersona('empathetic')}
              className={`w-full text-left rounded-lg border p-3 flex items-start justify-between ${
                persona === 'empathetic' ? 'border-cyan-400 bg-cyan-50/50' : 'border-slate-100'
              }`}
            >
              <div>
                <p className="text-sm font-medium text-slate-900">Empathetic Care</p>
                <p className="text-xs text-slate-400">Reassuring, patient-centric, and comforting language.</p>
              </div>
              <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 ${persona === 'empathetic' ? 'border-cyan-500 bg-cyan-500' : 'border-slate-300'}`} />
            </button>

            <p className="text-xs text-slate-500 mt-4 mb-1">Creativity Slider</p>
            <input
              type="range"
              min="0"
              max="100"
              value={creativity}
              onChange={(e) => setCreativity(Number(e.target.value))}
              className="w-full accent-cyan-500"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Strict (Medical Accuracy)</span>
              <span>Flexible (Conversational)</span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="font-medium text-slate-900 mb-1">Escalation Logic</p>
            <p className="text-xs text-slate-400 mb-4">Define when MedBot hands over to a human.</p>

            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="pr-3">
                  <p className="text-sm font-medium text-slate-900">Life-Threatening Keywords</p>
                  <p className="text-xs text-slate-400">Immediate transfer for chest pain, difficulty breathing, etc.</p>
                </div>
                <Toggle checked={escalation.lifeThreat} onChange={(v) => setEscalation((e) => ({ ...e, lifeThreat: v }))} />
              </div>
              <div className="flex items-start justify-between">
                <div className="pr-3">
                  <p className="text-sm font-medium text-slate-900">Emotional Distress</p>
                  <p className="text-xs text-slate-400">Detect extreme frustration or urgency in patient tone.</p>
                </div>
                <Toggle checked={escalation.distress} onChange={(v) => setEscalation((e) => ({ ...e, distress: v }))} />
              </div>
              <div className="flex items-start justify-between">
                <div className="pr-3">
                  <p className="text-sm font-medium text-slate-900">Unrecognized Intent</p>
                  <p className="text-xs text-slate-400">After 2 failed attempts to understand a patient query.</p>
                </div>
                <Toggle checked={escalation.unrecognized} onChange={(v) => setEscalation((e) => ({ ...e, unrecognized: v }))} />
              </div>
            </div>

            <button
              onClick={handleSave}
              className="w-full mt-5 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-cyan-700 text-white text-sm font-medium hover:bg-cyan-800"
            >
              <Save className="w-4 h-4" /> {saved ? 'Saved ✓' : 'Save All AI Settings'}
            </button>
          </div>

          <div className="bg-slate-900 rounded-xl p-5 text-white text-center">
            <p className="text-sm text-slate-300">Core Health: 98.4%</p>
            <p className="text-xs text-emerald-400 mt-2 flex items-center justify-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> NEURAL ENGINE ONLINE
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}