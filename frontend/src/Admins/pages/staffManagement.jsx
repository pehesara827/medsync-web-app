import { useState } from 'react';
import { Search, Plus, Users, Briefcase, Key, X, ShieldAlert, GraduationCap, ChevronLeft, ChevronRight, XCircle } from 'lucide-react';

// ---- Replace with GET /api/admin/staff ----
const STATS = [
  { id: 'total', label: 'Total Staff', value: 142, icon: Users, tone: 'cyan' },
  { id: 'onduty', label: 'On Duty', value: 48, icon: Briefcase, tone: 'emerald' },
];

const STAFF = [
  {
    id: 'PH-9902', name: 'Dr. Elena Rodriguez', email: 'elena.r@medsync.io', role: 'Senior Physician',
    roleTone: 'cyan', department: 'Cardiology', shift: 'Day Shift (On Duty)', shiftTone: 'emerald',
    permissions: {
      editRecords: true,
      managePayments: false,
      staffRota: true,
    },
  },
  {
    id: 'RN-4412', name: 'Marcus Chen', email: 'm.chen@medsync.io', role: 'Registered Nurse',
    roleTone: 'slate', department: 'Emergency Room', shift: 'Night Shift (Off Duty)', shiftTone: 'slate',
    permissions: {
      editRecords: false,
      managePayments: false,
      staffRota: false,
    },
  },
];
// -----------------------------------------------

const ROLE_TONE = { cyan: 'bg-[#00a8cc]/20 text-[#00a8cc]', slate: 'bg-slate-100 text-slate-600' };
const SHIFT_TONE = { emerald: 'text-emerald-600', slate: 'text-slate-400' };

function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`w-10 h-5.5 rounded-full flex items-center px-0.5 transition-colors ${checked ? 'bg-[#00a8cc] justify-end' : 'bg-slate-200 justify-start'}`}
    >
      <span className="w-4.5 h-4.5 rounded-full bg-white shadow" />
    </button>
  );
}

export default function StaffManagement() {
  const [staff, setStaff] = useState(STAFF);
  const [editing, setEditing] = useState(null);
  const [draftPerms, setDraftPerms] = useState(null);

  const openEdit = (member) => {
    setEditing(member);
    setDraftPerms({ ...member.permissions });
  };

  const closeEdit = () => {
    setEditing(null);
    setDraftPerms(null);
  };

  const saveEdit = () => {
    // TODO: PATCH /api/admin/staff/:id/permissions with draftPerms
    setStaff((prev) => prev.map((s) => (s.id === editing.id ? { ...s, permissions: draftPerms } : s)));
    closeEdit();
  };

  return (
    <div className="relative">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            placeholder="Search staff members by name, ID or department..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#00a8cc]"
          />
        </div>
        <button className="flex items-center gap-2 ml-4 px-4 py-2 text-sm font-medium rounded-lg bg-[#00a8cc] text-white hover:bg-[#0099bb]">
          <Plus className="w-4 h-4" />
          Add New Staff
        </button>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Staff Management</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Oversee system access, roles, and shift deployments for medical personnel.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {STATS.map(({ id, label, value, icon: Icon, tone }) => (
            <div key={id} className="flex items-center gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${tone === 'cyan' ? 'bg-[#00a8cc]/20' : 'bg-emerald-50'}`}>
                <Icon className={`w-4.5 h-4.5 ${tone === 'cyan' ? 'text-[#00a8cc]' : 'text-emerald-600'}`} />
              </div>
              <div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 uppercase tracking-wide">{label}</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 mb-6 flex flex-wrap items-center gap-3">
        <span className="text-sm text-slate-500 dark:text-slate-400">Filters:</span>
        <select className="text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5">
          <option>All Departments</option>
        </select>
        <select className="text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5">
          <option>All Roles</option>
        </select>
        <select className="text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5">
          <option>Active Status</option>
        </select>
        <button className="ml-auto flex items-center gap-1.5 text-sm text-[#00a8cc] font-medium">
          <XCircle className="w-4 h-4" />
          Clear All
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden mb-6">
        <div className="overflow-x-auto"><table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="text-left text-xs text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-700">
              <th className="px-6 py-3 font-medium">Staff Member</th>
              <th className="px-6 py-3 font-medium">Role &amp; ID</th>
              <th className="px-6 py-3 font-medium">Department</th>
              <th className="px-6 py-3 font-medium">Shift / Status</th>
              <th className="px-6 py-3 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id} className="border-b border-slate-50 dark:border-slate-700 last:border-0 hover:bg-slate-50/60 dark:hover:bg-slate-700/50">
                <td className="px-6 py-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-600" />
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-100">{s.name}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">{s.email}</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${ROLE_TONE[s.roleTone]}`}>
                    {s.role.toUpperCase()}
                  </span>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">ID: {s.id}</p>
                </td>
                <td className="px-6 py-4 text-slate-700 dark:text-slate-300">{s.department}</td>
                <td className="px-6 py-4">
                  <span className={`flex items-center gap-1.5 text-sm ${SHIFT_TONE[s.shiftTone]}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${s.shiftTone === 'emerald' ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-500'}`} />
                    {s.shift}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => openEdit(s)} aria-label="Edit permissions" className="text-[#00a8cc] hover:text-[#0099bb]">
                    <Key className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-700">
          <p className="text-xs text-slate-400 dark:text-slate-500">Showing 1-4 of 142 personnel</p>
          <div className="flex items-center gap-1">
            <button className="w-7 h-7 flex items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button className="w-7 h-7 flex items-center justify-center rounded-md bg-[#00a8cc] text-white text-xs font-semibold">1</button>
            <button className="w-7 h-7 flex items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400">2</button>
            <button className="w-7 h-7 flex items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400">3</button>
            <button className="w-7 h-7 flex items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#e0f5f8] dark:bg-slate-800 rounded-xl p-5 text-slate-900 dark:text-slate-100">
          <p className="text-[11px] uppercase tracking-wide text-[#00a8cc] dark:text-slate-400 flex items-center gap-1.5">
            <GraduationCap className="w-3.5 h-3.5" /> Training Compliance
          </p>
          <p className="text-xl font-semibold mt-1">94% Certified</p>
          <div className="h-1.5 bg-[#00a8cc]/20 dark:bg-slate-700 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-[#00a8cc] rounded-full" style={{ width: '94%' }} />
          </div>
        </div>
        <div className="bg-[#00a8cc]/10 dark:bg-slate-800 rounded-xl p-5">
          <p className="text-[11px] uppercase tracking-wide text-[#00a8cc] dark:text-slate-400">Shift Coverage</p>
          <p className="text-xl font-semibold text-slate-900 dark:text-slate-100 mt-1">Fully Staffed</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">All critical units have assigned personnel for the next 24h.</p>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
          <p className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">Staff Satisfaction</p>
          <p className="text-xl font-semibold text-slate-900 dark:text-slate-100 mt-1">4.8 / 5.0 ↗</p>
          <div className="flex -space-x-2 mt-2">
            {[0, 1, 2].map((i) => <span key={i} className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-600 border-2 border-white" />)}
            <span className="w-6 h-6 rounded-full bg-[#00a8cc] border-2 border-white" />
          </div>
        </div>
      </div>

      {/* Edit Permissions slide-in */}
      {editing && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={closeEdit} />
          <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white dark:bg-slate-800 shadow-xl z-50 overflow-y-auto p-4 sm:p-6 flex flex-col">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-[#00a8cc]/20 flex items-center justify-center">
                  <ShieldAlert className="w-4.5 h-4.5 text-[#00a8cc]" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">Edit Permissions</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Manage module access levels</p>
                </div>
              </div>
              <button onClick={closeEdit} aria-label="Close" className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-700 rounded-lg p-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-600" />
              <div>
                <p className="font-medium text-slate-900 dark:text-slate-100">{editing.name}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">{editing.role} • ID: {editing.id}</p>
              </div>
            </div>

            <p className="text-xs font-semibold text-[#00a8cc] tracking-wide mb-3">SYSTEM ACCESS MODULES</p>

            <div className="space-y-4 mb-6">
              <div className="flex items-start justify-between">
                <div className="pr-4">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Edit Patient Records</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Allow user to modify medical histories, diagnosis, and patient demographics.</p>
                </div>
                <Toggle checked={draftPerms.editRecords} onChange={(v) => setDraftPerms((p) => ({ ...p, editRecords: v }))} />
              </div>
              <div className="flex items-start justify-between">
                <div className="pr-4">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Manage Payments</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Grant access to billing systems, insurance claims, and hospital revenue dashboards.</p>
                </div>
                <Toggle checked={draftPerms.managePayments} onChange={(v) => setDraftPerms((p) => ({ ...p, managePayments: v }))} />
              </div>
              <div className="flex items-start justify-between">
                <div className="pr-4">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Staff Rota Control</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Permission to assign shifts, approve leave requests, and modify staff schedules.</p>
                </div>
                <Toggle checked={draftPerms.staffRota} onChange={(v) => setDraftPerms((p) => ({ ...p, staffRota: v }))} />
              </div>
            </div>

            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 mb-auto">
              <p className="text-xs font-semibold text-rose-600 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" /> Critical Access
              </p>
              <p className="text-xs text-rose-500 mt-1">Elevating these permissions requires dual-factor authorization from the hospital board.</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-6">
              <button onClick={closeEdit} className="flex-1 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-400">
                Cancel
              </button>
              <button onClick={saveEdit} className="flex-1 py-2.5 rounded-lg bg-[#00a8cc] text-white text-sm font-medium">
                Save Changes
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}