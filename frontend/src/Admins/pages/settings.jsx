import { useState } from 'react';
import { Settings2, Building2, ShieldCheck, Languages } from 'lucide-react';

const TABS = [
  { id: 'general', label: 'General', icon: Settings2 },
  { id: 'departments', label: 'Departments & Rooms', icon: Building2 },
  { id: 'staffAccess', label: 'Staff Access', icon: ShieldCheck },
  { id: 'multilingual', label: 'Multilingual', icon: Languages },
];

// ---- Replace with GET /api/admin/settings ----
const INITIAL = {
  hospitalName: 'MedSync Central Clinic',
  registrationId: 'MED-9920-COL',
  primaryLocation: 'No. 12, Highlevel Road, Colombo 03, Sri Lanka',
  autoConfirm: true,
  feedbackLoop: false,
};
// -----------------------------------------------

function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`w-10 h-5.5 rounded-full flex items-center px-0.5 transition-colors ${checked ? 'bg-cyan-600 justify-end' : 'bg-slate-200 justify-start'}`}
    >
      <span className="w-4.5 h-4.5 rounded-full bg-white shadow" />
    </button>
  );
}

export default function Settings() {
  const [tab, setTab] = useState('general');
  const [form, setForm] = useState(INITIAL);
  const [saved, setSaved] = useState(false);

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSave = () => {
    // TODO: PUT /api/admin/settings with `form`
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Hospital Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Configure global hospital parameters, departments, and staff roles.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
        <nav className="space-y-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-left ${
                tab === id ? 'text-cyan-700 font-medium border-b-2 border-cyan-600 bg-cyan-50/40' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>

        <div className="space-y-6">
          {tab === 'general' && (
            <>
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <p className="font-medium text-slate-900 mb-4">Institution Identity</p>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-xs text-slate-500">Hospital Name</label>
                    <input
                      value={form.hospitalName}
                      onChange={(e) => update('hospitalName', e.target.value)}
                      className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Registration ID</label>
                    <input
                      value={form.registrationId}
                      onChange={(e) => update('registrationId', e.target.value)}
                      className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500">Primary Location</label>
                  <input
                    value={form.primaryLocation}
                    onChange={(e) => update('primaryLocation', e.target.value)}
                    className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <p className="font-medium text-slate-900 mb-4">Platform Preferences</p>
                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Auto-Confirm Digital Appointments</p>
                    <p className="text-xs text-slate-400">Automatically accept telemedicine bookings.</p>
                  </div>
                  <Toggle checked={form.autoConfirm} onChange={(v) => update('autoConfirm', v)} />
                </div>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Patient Feedback Loop</p>
                    <p className="text-xs text-slate-400">Send post-consultation surveys via SMS.</p>
                  </div>
                  <Toggle checked={form.feedbackLoop} onChange={(v) => update('feedbackLoop', v)} />
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button onClick={() => setForm(INITIAL)} className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 text-slate-600">
                  Discard Changes
                </button>
                <button onClick={handleSave} className="px-4 py-2 text-sm font-medium rounded-lg bg-cyan-700 text-white hover:bg-cyan-800">
                  {saved ? 'Saved ✓' : 'Save Global Settings'}
                </button>
              </div>
            </>
          )}

          {tab === 'departments' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 text-sm text-slate-500">
              Departments &amp; Rooms configuration goes here — list departments, assign rooms, set capacity.
            </div>
          )}
          {tab === 'staffAccess' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 text-sm text-slate-500">
              Global role templates live here. Per-staff-member overrides are handled on the Staff Management page.
            </div>
          )}
          {tab === 'multilingual' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 text-sm text-slate-500">
              Toggle which languages (English / Sinhala) are enabled site-wide and manage translation strings.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}