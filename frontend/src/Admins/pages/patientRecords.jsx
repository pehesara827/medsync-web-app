import { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Calendar, X, ChevronRight, Heart, Users2, RotateCcw, Phone, MapPin } from 'lucide-react';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
  fetchAdminPatients,
  fetchAdminPatientById,
} from '../../components/api/adminPatientApi';

// Display labels for the status filter dropdown. Backend accepts:
//   pending (incl. confirmed), completed, cancelled
const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const STATUS_STYLES = {
  PENDING: 'bg-amber-50 text-amber-600',
  COMPLETED: 'bg-emerald-50 text-emerald-600',
  CANCELLED: 'bg-rose-50 text-rose-600',
};

function initialsOf(name) {
  return (name || '')
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Display label for the status chip. Patients registered in the system who
// have never booked an appointment arrive with `status: null`.
function statusLabel(status) {
  if (!status) return 'No visits';
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export default function PatientRecords() {
  const [patients, setPatients] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [date, setDate] = useState('');

  const fetchPatients = useCallback(async (statusFilter, dateFilter) => {
    setLoading(true);
    setError('');
    try {
      const { patients: rows, total: totalCount } = await fetchAdminPatients({
        status: statusFilter,
        date: dateFilter,
      });
      setPatients(rows);
      setTotal(totalCount);
    } catch (err) {
      setError(`Failed to load patients: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Deferred one tick so no state is set synchronously inside the effect
    // (react-hooks/set-state-in-effect). Clearing the pending timer on filter
    // changes also skips redundant fetches when filters toggle rapidly.
    const timer = setTimeout(() => fetchPatients(status, date), 0);
    return () => clearTimeout(timer);
  }, [fetchPatients, status, date]);

  const openDetail = async (patient) => {
    setSelected(patient);
    // Best-effort: enrich with the full detail endpoint. Falls back to the
    // list row data if it fails so the panel still works.
    try {
      const detail = await fetchAdminPatientById(patient.id);
      if (detail) {
        const merged = { ...patient, ...detail };
        // The detail endpoint returns the account owner's profile for
        // beneficiary bookings — keep the beneficiary's own identity.
        if (detail.beneficiary) {
          merged.name = detail.beneficiary.full_name || merged.name;
          merged.age = detail.beneficiary.age ?? merged.age;
          merged.gender = detail.beneficiary.gender || merged.gender;
          merged.relationship = detail.beneficiary.relationship || '';
          merged.referenceId = patient.referenceId || merged.referenceId;
        }
        setSelected(merged);
      }
    } catch {
      // Ignore — keep using the lightweight row data.
    }
  };

  const resetFilters = () => {
    setStatus('');
    setDate('');
    setSearch('');
  };

  // Client-side search (name / reference ID) over the currently loaded list.
  const filteredList = patients.filter((p) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      (p.name || '').toLowerCase().includes(q) ||
      (p.referenceId || '').toLowerCase().includes(q) ||
      (p.phone || '').toLowerCase().includes(q)
    );
  });
return (
    <div className="relative">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Patients Management</h1>
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patients by name, ID..."
            className="pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 w-full sm:w-72 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00a8cc] text-slate-900 dark:text-slate-100"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b border-slate-100 dark:border-slate-700">
          <div className="flex flex-wrap items-center gap-2">
            {/* Status filter */}
            <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                aria-label="Filter by status"
                className="bg-transparent text-sm text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Date filter */}
            <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                aria-label="Filter by date"
                className="bg-transparent text-sm text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer dark:[color-scheme:dark]"
              />
            </div>

            {(status || date) && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            )}
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {search ? `Showing ${filteredList.length} of ${total} total patients` : `Showing ${total} total patients`}
          </p>
        </div>
{loading ? (
          <LoadingSpinner message="Loading patients" fullscreen={false} />
        ) : error ? (
          <div className="p-10 text-center">
            <p className="text-sm text-rose-600">{error}</p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-12 text-center">
            <Users2 className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              No patients found{status || date ? ' for the selected filters' : ''}. Try adjusting the filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto"><table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-left text-xs text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-700">
                <th className="px-6 py-3 font-medium">Patient Name</th>
                <th className="px-6 py-3 font-medium">Patient ID</th>
                <th className="px-6 py-3 font-medium">Contact</th>
                <th className="px-6 py-3 font-medium">Last Visit</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {filteredList.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => openDetail(p)}
                  className="border-b border-slate-50 dark:border-slate-700 last:border-0 hover:bg-slate-50/60 dark:hover:bg-slate-700/50 cursor-pointer"
                >
                  <td className="px-6 py-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#e0f5f8] dark:bg-slate-700 text-[#00a8cc] dark:text-cyan-400 text-xs font-semibold flex items-center justify-center">
                      {initialsOf(p.name)}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100">{p.name}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        {p.gender || ''}
                        {p.age != null ? `, ${p.age} years` : ''}
                        {p.relationship ? ` • ${p.relationship}` : ''}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{p.referenceId || `#${p.id}`}</td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{p.phone || p.email || '—'}</td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{formatDate(p.lastVisit)}</td>
                  <td className="px-6 py-4 text-right">
                    <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 ml-auto" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>
{/* Slide-in detail panel */}
      {selected && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setSelected(null)} />
          <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white dark:bg-slate-800 shadow-xl z-50 overflow-y-auto p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
              <button onClick={() => setSelected(null)} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                <X className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              </button>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {selected.referenceId || `#${selected.id}`}
              </p>
            </div>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-[#00a8cc] text-white font-semibold flex items-center justify-center">
                {initialsOf(selected.name)}
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">{selected.name}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {[selected.gender, selected.age != null ? `${selected.age} years` : '', selected.relationship]
                    .filter(Boolean)
                    .join(' • ') || 'Patient'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="rounded-lg bg-slate-50 dark:bg-slate-700 p-3">
                <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1"><Phone className="w-3 h-3" /> Contact</p>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-1">{selected.phone || '—'}</p>
              </div>
              <div className="rounded-lg bg-slate-50 dark:bg-slate-700 p-3">
                <p className="text-xs text-slate-400 dark:text-slate-500">Email</p>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-1 break-words">{selected.email || '—'}</p>
              </div>
              <div className="rounded-lg bg-slate-50 dark:bg-slate-700 p-3">
                <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1"><Heart className="w-3 h-3" /> Blood Group</p>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-1">{selected.bloodGroup || '—'}</p>
              </div>
              <div className="rounded-lg bg-slate-50 dark:bg-slate-700 p-3">
                <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1"><MapPin className="w-3 h-3" /> Address</p>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-1">{selected.address || '—'}</p>
              </div>
            </div>

            {selected.lastVisit && (
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
                Last visit: {formatDate(selected.lastVisit)} • Status:{' '}
                <span className={`font-medium ${(STATUS_STYLES[selected.status] || '').split(' ')[1] || 'text-slate-500'}`}>
                  {statusLabel(selected.status)}
                </span>
              </p>
            )}

            {selected.beneficiaries && selected.beneficiaries.length > 0 && (
              <div className="mb-6">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1">
                  <Users2 className="w-3.5 h-3.5" /> Beneficiaries (Family)
                </p>
                <div className="flex flex-wrap gap-2">
                  {selected.beneficiaries.map((b) => (
                    <span key={b.id} className="flex items-center gap-1.5 text-xs bg-slate-100 dark:bg-slate-700 rounded-full pl-1 pr-3 py-1">
                      <span className="w-5 h-5 rounded-full bg-slate-300 dark:bg-slate-600 text-white text-[10px] flex items-center justify-center">
                        {initialsOf(b.full_name)}
                      </span>
                      {b.full_name}
                      {b.relationship ? ` (${b.relationship})` : ''}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {selected.history && selected.history.length > 0 && (
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Appointment History</p>
                <div className="space-y-2">
                  {selected.history.map((h) => (
                    <div key={h.id} className="rounded-lg p-3 border border-slate-100 dark:border-slate-700">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{h.doctor}</p>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[h.status] || 'bg-slate-100 text-slate-500'}`}>
                          {(h.status || '').charAt(0) + (h.status || '').slice(1).toLowerCase()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                        {formatDate(h.date)} • {h.specialty}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selected.emergencyContact && (
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-6">
                Emergency contact: {selected.emergencyContact} ({selected.emergencyRelation || '—'}) • {selected.emergencyPhone || '—'}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}