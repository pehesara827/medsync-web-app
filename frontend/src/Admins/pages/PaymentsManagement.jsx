import { useState, useEffect } from 'react';
import {
  Search,
  Download,
  TrendingUp,
  Wallet,
  Banknote,
  ChevronDown,
  Calendar,
  X,
  CheckCircle2,
  FileText,
  Eye,
  UploadCloud,
  ExternalLink,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import LoadingSpinner from '../../components/LoadingSpinner';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const PAGE_SIZE = 50;
const METHOD_META = {
  ONLINE_GATEWAY: {
    label: 'Online Gateway',
    badge: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300',
    dot: 'bg-blue-500',
  },
  BANK_TRANSFER: {
    label: 'Bank Transfer',
    badge: 'bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-300',
    dot: 'bg-purple-500',
  },
  PAY_AT_RECEPTION: {
    label: 'Pay at Reception',
    badge: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
    dot: 'bg-slate-400',
  },
};

const STATUS_META = {
  PAID: {
    label: 'Paid',
    badge: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300',
    dot: 'bg-emerald-500',
  },
  PENDING_SLIP_VERIFICATION: {
    label: 'Pending Slip Verification',
    badge: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300',
    dot: 'bg-amber-500',
  },
  UNPAID: {
    label: 'Unpaid (Reception)',
    badge: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
    dot: 'bg-slate-400',
  },
};

const METHOD_FILTERS = [
  { value: 'ALL', label: 'All Methods' },
  { value: 'ONLINE_GATEWAY', label: 'Online Gateway' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'PAY_AT_RECEPTION', label: 'Pay at Reception' },
];

function formatCurrency(amount) {
  return `LKR ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDateShort(value) {
  if (!value) return '—';
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const TABS = [
  { id: 'ALL', label: 'All Transactions' },
  { id: 'PENDING', label: 'Pending Slips' },
  { id: 'PAID', label: 'Paid' },
  { id: 'UNPAID', label: 'Unpaid (Reception)' },
];

// Map UI tab -> backend status filter
function tabToStatus(tab) {
  if (tab === 'PENDING') return 'PENDING_SLIP_VERIFICATION';
  if (tab === 'PAID') return 'PAID';
  if (tab === 'UNPAID') return 'UNPAID';
  return 'ALL';
}

// Format an ISO timestamp (e.g. created_at) into a compact readable label.
function formatTimestamp(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
export default function PaymentsManagement() {
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const dateRange = 'Current period';
  const [selectedSlipPayment, setSelectedSlipPayment] = useState(null);
  const [bankReference, setBankReference] = useState('');
  const [rejectionNote, setRejectionNote] = useState('');
  const [showRejection, setShowRejection] = useState(false);
  const [invoicePreview, setInvoicePreview] = useState(null);
  const [toast, setToast] = useState('');

  // Server-sourced data
  const [payments, setPayments] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Bumped to force a refetch (Retry button / after a successful mutation).
  const [reloadToken, setReloadToken] = useState(0);
  // Revision key ("STATUS#token") describing which fetch the stored rows belong
  // to — lets the UI show a spinner on tab change via render-time derivation.
  const [loadedRev, setLoadedRev] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    const statusKey = tabToStatus(activeTab);
    const revKey = `${statusKey}#${reloadToken}`;
    const params = new URLSearchParams({ page: '1', pageSize: String(PAGE_SIZE) });
    if (statusKey !== 'ALL') params.set('status', statusKey);

    // All state updates happen in async continuations of the fetch promise so
    // nothing is set synchronously while the effect body runs.
    fetch(`${API_BASE_URL}/admin/payments?${params.toString()}`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || `Failed to load payments (${res.status})`);
        }
        return res.json();
      })
      .then((data) => {
        setPayments(data.data?.payments || []);
        setTotal(data.data?.total ?? (data.data?.payments || []).length);
        setError('');
        setLoading(false);
        setLoadedRev(revKey);
      })
      .catch((err) => {
        if (controller.signal.aborted || err.name === 'AbortError') return;
        setPayments([]);
        setTotal(0);
        setError(`Failed to load payments: ${err.message}`);
        setLoading(false);
        setLoadedRev(revKey);
      });

    return () => controller.abort();
  }, [activeTab, reloadToken]);

  // True while the requested view (tab + revision) hasn't finished loading yet.
  const isPending =
    loading || loadedRev !== `${tabToStatus(activeTab)}#${reloadToken}`;

  // Client-side search + method filter over the loaded payments.
  const filtered = payments.filter((p) => {
    const q = searchQuery.trim().toLowerCase();
    const name = p.patientName || '';
    const phone = p.patientPhone || '';
    const id = p.id || '';
    const matchesSearch =
      !q ||
      name.toLowerCase().includes(q) ||
      phone.replace(/\s/g, '').toLowerCase().includes(q) ||
      id.toLowerCase().includes(q);
    const matchesMethod = methodFilter === 'ALL' || p.paymentMethod === methodFilter;
    return matchesSearch && matchesMethod;
  });

  // KPI aggregates derived from the loaded payments.
  const totalRevenue = payments
    .filter((p) => p.paymentStatus === 'PAID')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const pendingSlips = payments.filter(
    (p) => p.paymentStatus === 'PENDING_SLIP_VERIFICATION'
  ).length;
  const receptionDue = payments
    .filter((p) => p.paymentStatus === 'UNPAID')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const today = new Date().toISOString().split('T')[0];
  const todayCollections = payments
    .filter((p) => p.paymentStatus === 'PAID' && (p.paidAt || '').startsWith(today))
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const kpiCards = [
    {
      label: 'Total Revenue',
      value: formatCurrency(totalRevenue),
      icon: Wallet,
      iconBg: 'bg-[#e0f5f8] dark:bg-cyan-500/10',
      iconColor: 'text-[#00a8cc]',
      trend: `${total} transaction${total === 1 ? '' : 's'}`,
      trendColor: 'text-slate-400 dark:text-slate-500',
      positive: true,
    },
    {
      label: 'Pending Slip Reviews',
      value: `${pendingSlips} Slip${pendingSlips === 1 ? '' : 's'}`,
      icon: FileText,
      iconBg: 'bg-amber-50 dark:bg-amber-500/10',
      iconColor: 'text-amber-500',
      badge: pendingSlips > 0,
    },
    {
      label: 'Pay at Reception Due',
      value: formatCurrency(receptionDue),
      icon: Banknote,
      iconBg: 'bg-slate-100 dark:bg-slate-700',
      iconColor: 'text-slate-500 dark:text-slate-300',
    },
    {
      label: "Today's Collections",
      value: formatCurrency(todayCollections),
      icon: Wallet,
      iconBg: 'bg-emerald-50 dark:bg-emerald-500/10',
      iconColor: 'text-emerald-500',
      trend: 'paid transactions today',
      trendColor: 'text-slate-400 dark:text-slate-500',
    },
  ];

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const doVerify = async (body, successMsg) => {
    if (!selectedSlipPayment?.id || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/admin/payments/${selectedSlipPayment.id}/verify-slip`,
        {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || `Request failed (${res.status})`);
      }
      setSelectedSlipPayment(null);
      setBankReference('');
      setRejectionNote('');
      setShowRejection(false);
      showToast(successMsg);
      setReloadToken((t) => t + 1);
    } catch (err) {
      showToast(err.message || 'Request failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = () => {
    if (!bankReference.trim()) {
      showToast('Please enter the bank transaction reference before approving.');
      return;
    }
    doVerify(
      { status: 'APPROVED', transactionId: bankReference.trim() },
      'Payment approved'
    );
  };

  const handleReject = () => {
    doVerify(
      {
        status: 'REJECTED',
        rejectionReason: rejectionNote.trim() || undefined,
      },
      'Payment rejected'
    );
  };

  const handleCollectCash = async (payment) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/admin/payments/${payment.id}/collect-reception`,
        {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({}),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || `Request failed (${res.status})`);
      }
      showToast(`Payment ${payment.id} collected`);
      setReloadToken((t) => t + 1);
    } catch (err) {
      showToast(err.message || 'Request failed');
    } finally {
      setSubmitting(false);
    }
  };

  const closeDrawer = () => {
    setSelectedSlipPayment(null);
    setBankReference('');
    setRejectionNote('');
    setShowRejection(false);
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-[60] bg-[#00a8cc] text-white text-sm font-medium px-4 py-3 rounded-lg shadow-lg animate-pulse">
          {toast}
        </div>
      )}

      {/* A. Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Payments &amp; Invoices
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track, verify and reconcile all financial transactions across the hospital.
          </p>
        </div>
        <button
          onClick={() => showToast('Invoice export triggered (mock)')}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-[#e0f5f8] text-[#0092b3] hover:bg-[#00a8cc] hover:text-white dark:bg-cyan-500/10 dark:text-cyan-300 dark:hover:bg-[#00a8cc] dark:hover:text-white transition-colors"
        >
          <Download className="w-4 h-4" />
          Export Report
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${card.iconBg} ${card.iconColor}`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                {card.badge && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300 px-2 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    Attention Needed
                  </span>
                )}
                {card.positive && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <TrendingUp className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{card.label}</p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{card.value}</p>
              {card.trend && (
                <p className={`mt-1 text-xs font-medium ${card.trendColor}`}>{card.trend}</p>
              )}
            </div>
          );
        })}
      </div>
{/* B. Tabs & Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-4 border-b border-slate-100 dark:border-slate-800">
          {/* Tabs */}
          <div className="flex flex-wrap gap-1.5">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-[#00a8cc] text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Summary chip */}
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {filtered.length} transaction{filtered.length === 1 ? '' : 's'} shown
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_220px_220px] gap-3 p-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by patient name, phone, or TXN ID..."
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 pl-9 pr-3 py-2.5 rounded-lg focus:outline-none focus:border-[#00a8cc]/60 focus:ring-2 focus:ring-[#00a8cc]/10"
            />
          </div>

          <div className="relative">
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="w-full appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200 pl-3 pr-9 py-2.5 rounded-lg focus:outline-none focus:border-[#00a8cc]/60 focus:ring-2 focus:ring-[#00a8cc]/10 cursor-pointer"
            >
              {METHOD_FILTERS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <button
            onClick={() => showToast('Date range picker (mock)')}
            className="inline-flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200 px-3 py-2.5 rounded-lg hover:border-[#00a8cc]/60"
          >
            <span className="inline-flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              {dateRange}
            </span>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>
{/* C. Main Payments Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[860px]">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
                <th className="px-5 py-3.5 font-semibold">Transaction</th>
                <th className="px-5 py-3.5 font-semibold">Patient</th>
                <th className="px-5 py-3.5 font-semibold">Doctor &amp; Slot</th>
                <th className="px-5 py-3.5 font-semibold">Amount</th>
                <th className="px-5 py-3.5 font-semibold">Method</th>
                <th className="px-5 py-3.5 font-semibold">Status</th>
                <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((p) => {
                const method = METHOD_META[p.paymentMethod] || METHOD_META.PAY_AT_RECEPTION;
                const status = STATUS_META[p.paymentStatus] || STATUS_META.UNPAID;
                return (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    {/* Transaction Reference */}
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{p.id.slice(0, 8)}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                        {formatTimestamp(p.createdAt)}
                      </p>
                    </td>
                    {/* Patient */}
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-800 dark:text-slate-200">{p.patientName}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{p.patientPhone}</p>
                    </td>
                    {/* Doctor & Slot */}
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-800 dark:text-slate-200">{p.doctorName || '—'}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                        {formatDateShort(p.appointmentDate)}
                      </p>
                    </td>
                    {/* Amount */}
                    <td className="px-5 py-4 font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      {formatCurrency(p.amount)}
                    </td>
                    {/* Method */}
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${method.badge}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${method.dot}`} />
                        {method.label}
                      </span>
                    </td>
                    {/* Status */}
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${status.badge}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                        {status.label}
                      </span>
                    </td>
{/* Actions */}
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {p.paymentStatus === 'PENDING_SLIP_VERIFICATION' && (
                          <button
                            onClick={() => setSelectedSlipPayment(p)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#00a8cc] text-white hover:bg-[#0092b3] transition-colors"
                          >
                            <UploadCloud className="w-3.5 h-3.5" />
                            Verify Slip
                          </button>
                        )}
                        {p.paymentStatus === 'UNPAID' && (
                          <button
                            onClick={() => handleCollectCash(p)}
                            title="Collect Cash"
                            className="w-8 h-8 inline-flex items-center justify-center rounded-lg bg-[#e0f5f8] text-[#0092b3] hover:bg-[#00a8cc] hover:text-white dark:bg-cyan-500/10 dark:text-cyan-300 dark:hover:bg-[#00a8cc] dark:hover:text-white transition-colors"
                          >
                            <Banknote className="w-4 h-4" />
                          </button>
                        )}
                        {p.paymentStatus === 'PAID' && (
                          <button
                            onClick={() => setInvoicePreview(p)}
                            title="View Invoice"
                            className="w-8 h-8 inline-flex items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-[#e0f5f8] hover:text-[#0092b3] dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {isPending ? (
          <LoadingSpinner message="Loading payments" fullscreen={false} />
        ) : error ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-500/10 flex items-center justify-center mb-3">
              <X className="w-5 h-5 text-rose-500" />
            </div>
            <p className="text-sm font-medium text-rose-600 dark:text-rose-400">{error}</p>
            <button
              onClick={() => setReloadToken((t) => t + 1)}
              className="mt-3 inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-[#e0f5f8] text-[#0092b3] hover:bg-[#00a8cc] hover:text-white dark:bg-cyan-500/10 dark:text-cyan-300 dark:hover:bg-[#00a8cc] dark:hover:text-white transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
              <Search className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {payments.length === 0 ? 'No transactions found' : 'No matching transactions'}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              {payments.length === 0
                ? 'There are no payments to display yet.'
                : 'Try adjusting your search or filters.'}
            </p>
          </div>
        ) : null}
      </div>
{/* D. Slide-Over Panel: Bank Slip Verification Drawer */}
      {selectedSlipPayment && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={closeDrawer}
            aria-label="Close drawer"
          />
          <aside className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-white dark:bg-slate-900 p-6 shadow-2xl z-50 overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Verify Bank Transfer Slip
                </h2>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  {selectedSlipPayment.id.slice(0, 8)} • {selectedSlipPayment.patientName}
                </p>
              </div>
              <button
                onClick={closeDrawer}
                aria-label="Close"
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Patient & Consultation Details */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3">
                <p className="text-xs text-slate-400 dark:text-slate-500">Patient</p>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-1">
                  {selectedSlipPayment.patientName}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">{selectedSlipPayment.patientPhone}</p>
              </div>
              <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3">
                <p className="text-xs text-slate-400 dark:text-slate-500">Doctor</p>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-1">
                  {selectedSlipPayment.doctorName}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">{selectedSlipPayment.appointmentDate}</p>
              </div>
              <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3">
                <p className="text-xs text-slate-400 dark:text-slate-500">Fee Amount</p>
                <p className="text-sm font-semibold text-[#0092b3] mt-1">
                  {formatCurrency(selectedSlipPayment.amount)}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3">
                <p className="text-xs text-slate-400 dark:text-slate-500">Uploaded At</p>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-1">
                  {formatTimestamp(selectedSlipPayment.createdAt)}
                </p>
              </div>
            </div>

            {/* Zoomable Image Box */}
            <div className="mb-6">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                Receipt Preview
              </p>
                {selectedSlipPayment.receiptSlipUrl ? (
                  <>
                    <div className="relative rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <img
                        src={selectedSlipPayment.receiptSlipUrl}
                        alt="Bank transfer receipt slip"
                        className="w-full h-64 object-cover object-top"
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="inline-flex items-center gap-1.5 bg-black/55 text-white text-xs font-medium px-3 py-1.5 rounded-full">
                          <Eye className="w-3.5 h-3.5" />
                          Zoomable preview
                        </span>
                      </div>
                    </div>
                    <a
                      href={selectedSlipPayment.receiptSlipUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#0092b3] hover:text-[#00a8cc] dark:text-cyan-300"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      View Full Image
                    </a>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500">
                    <FileText className="w-8 h-8 mb-2" />
                    <p className="text-xs font-medium">No receipt slip uploaded</p>
                  </div>
                )}
            </div>
{/* Bank Reference Input */}
            <div className="mb-5">
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                Bank Transaction Reference *
              </label>
              <input
                type="text"
                value={bankReference}
                onChange={(e) => setBankReference(e.target.value)}
                placeholder="e.g. TRF-2026-88412"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 px-3 py-2.5 rounded-lg focus:outline-none focus:border-[#00a8cc]/60 focus:ring-2 focus:ring-[#00a8cc]/10"
              />
            </div>

            {/* Rejection Note (collapsible) */}
            <div className="mb-6">
              <button
                onClick={() => setShowRejection((v) => !v)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-600 dark:text-red-400"
              >
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${showRejection ? 'rotate-180' : ''}`}
                />
                Reject payment — add note
              </button>
              {showRejection && (
                <div className="mt-2">
                  <textarea
                    value={rejectionNote}
                    onChange={(e) => setRejectionNote(e.target.value)}
                    rows={4}
                    placeholder="Reason for rejection (e.g. mismatched amount, unreadable slip)..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 px-3 py-2.5 rounded-lg focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 dark:focus:ring-red-500/20 resize-none"
                  />
                </div>
              )}
            </div>

            {/* Action Footer */}
            <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={handleReject}
                disabled={submitting}
                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg border border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                Reject Slip
              </button>
              <button
                onClick={handleApprove}
                disabled={submitting}
                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg bg-[#00a8cc] text-white hover:bg-[#0092b3] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Approve Payment
              </button>
            </div>
          </aside>
        </>
      )}
{/* Invoice preview modal (mock) */}
      {invoicePreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setInvoicePreview(null)}
            aria-label="Close preview"
          />
          <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md p-6">
            <button
              onClick={() => setInvoicePreview(null)}
              aria-label="Close"
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
              <FileText className="w-4 h-4 text-[#00a8cc]" />
              Invoice
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">{invoicePreview.id.slice(0, 8)}</p>
            <div className="space-y-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 p-4">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Patient</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {invoicePreview.patientName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Doctor</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {invoicePreview.doctorName}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-2">
                <span className="text-slate-500 dark:text-slate-400">Date</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {formatDateShort(invoicePreview.appointmentDate)}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-2">
                <span className="font-medium text-slate-900 dark:text-slate-100">Total</span>
                <span className="font-bold text-[#00a8cc]">{formatCurrency(invoicePreview.amount)}</span>
              </div>
            </div>
            <button
              onClick={() => {
                setInvoicePreview(null);
                showToast('Invoice downloaded (mock)');
              }}
              className="mt-4 w-full inline-flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg bg-[#00a8cc] text-white hover:bg-[#0092b3] transition-colors"
            >
              <Download className="w-4 h-4" />
              Download Invoice
            </button>
          </div>
        </div>
      )}
    </div>
  );
}