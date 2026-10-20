import { useState, useEffect, useRef } from 'react';
import {
  X,
  Lock,
  ShieldCheck,
  CreditCard,
  Eye,
  EyeOff,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Wifi,
  BadgeCheck,
  Check,
} from 'lucide-react';

/**
 * Detects the card network from the first digits.
 * @param {string} number - Raw card number (may include spaces)
 * @returns {{ name: string, color: string } | null}
 */
const detectCardNetwork = (number) => {
  const digits = number.replace(/\s+/g, '');
  if (/^4/.test(digits)) return { name: 'Visa', color: 'bg-blue-600' };
  if (/^5[1-5]/.test(digits)) return { name: 'Mastercard', color: 'bg-orange-500' };
  if (/^3[47]/.test(digits)) return { name: 'Amex', color: 'bg-sky-600' };
  return null;
};

const formatCardNumber = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
};

const formatExpiry = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
};

/**
 * PaymentGatewayModal
 *
 * A sandbox / simulated secure checkout for the "Online Gateway" payment
 * option. Renders a realistic card-payment form, simulates bank processing,
 * and returns a generated transaction id via `onSuccess`.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {number} props.amount - Consultation fee in LKR
 * @param {string} [props.doctorName] - Doctor display name for the summary
 * @param {Function} props.onSuccess - Called with the generated transaction id
 */
export default function PaymentGatewayModal({
  isOpen,
  onClose,
  amount = 0,
  doctorName = '',
  onSuccess,
}) {
  const [step, setStep] = useState('form'); // form | processing | success
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [showCvv, setShowCvv] = useState(false);
  const [error, setError] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const processingTimerRef = useRef(null);

  // Reset the form each time the modal is opened (the parent remounts this
  // component via a `key` so all state below starts fresh on every open).
  useEffect(() => {
    if (processingTimerRef.current) clearTimeout(processingTimerRef.current);
    return () => {
      if (processingTimerRef.current) clearTimeout(processingTimerRef.current);
    };
  }, []);

  if (!isOpen) return null;

  const network = detectCardNetwork(cardNumber);
  const formattedAmount = `Rs. ${Number(amount || 0).toLocaleString()}`;

  const validate = () => {
    const digits = cardNumber.replace(/\s+/g, '');
    if (!cardName.trim()) return 'Please enter the cardholder name.';
    if (digits.length < 15) return 'Please enter a valid card number.';
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry)) {
      return 'Please enter a valid expiry date (MM/YY).';
    }
    const [mm, yy] = expiry.split('/').map(Number);
    const now = new Date();
    const expYear = 2000 + yy;
    if (expYear < now.getFullYear() || (expYear === now.getFullYear() && mm < now.getMonth() + 1)) {
      return 'This card has expired.';
    }
    if (!/^\d{3,4}$/.test(cvv)) return 'Please enter a valid CVV.';
    return null;
  };

  const handlePay = (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setStep('processing');
    processingTimerRef.current = setTimeout(() => {
      const tx = `TXN-${Date.now().toString(36).toUpperCase()}-${Math.random()
        .toString(36)
        .slice(2, 6)
        .toUpperCase()}`;
      setTransactionId(tx);
      setStep('success');
    }, 1800);
  };

  const handleDone = () => {
    if (onSuccess && transactionId) {
      onSuccess(transactionId);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      {/* Backdrop with blur */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={step === 'processing' ? undefined : onClose}
      ></div>

      {/* Modal Content */}
      <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          disabled={step === 'processing'}
          className="absolute top-4 right-4 z-10 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition disabled:opacity-40"
        >
          <X size={20} className="text-slate-600 dark:text-slate-200" />
        </button>

        <div className="p-6 md:p-7">
          {/* Header */}
          <div className="flex items-center gap-3 mb-1">
            <div className="w-11 h-11 rounded-xl bg-[#00b8e6]/10 text-[#00b8e6] flex items-center justify-center">
              <Lock size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Secure Checkout</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">MedSync Secure Pay · Sandbox</p>
            </div>
          </div>

          {/* Amount summary */}
          <div className="mt-4 flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Amount Due</p>
              <p className="text-lg font-bold text-[#00b8e6]">{formattedAmount}</p>
              {doctorName && <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{doctorName}</p>}
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px] font-bold border border-amber-200 dark:border-amber-500/30">
              Test Mode
            </span>
          </div>

          {step === 'success' ? (
            /* ── Success state ─────────────────────────────────────── */
            <div className="mt-6 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center mb-4">
                <CheckCircle2 size={36} className="text-emerald-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Payment Successful</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                This is a sandbox payment — no real money was charged.
              </p>
              <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-left space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">Amount</span>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-100">{formattedAmount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">Status</span>
                  <span className="text-sm font-bold text-emerald-600">PAID</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">Transaction ID</span>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-100 flex items-center gap-1.5">
                    <BadgeCheck size={14} className="text-emerald-500" />
                    {transactionId}
                  </span>
                </div>
              </div>
              <button
                onClick={handleDone}
                className="mt-6 w-full py-3 rounded-xl bg-[#00b8e6] text-white font-semibold text-sm hover:bg-[#00a3cc] shadow-md hover:shadow-lg transition flex items-center justify-center gap-2"
              >
                <Check size={16} />
                Continue
              </button>
            </div>
          ) : step === 'processing' ? (
            /* ── Processing state ──────────────────────────────────── */
            <div className="mt-8 text-center py-6">
              <Loader2 size={40} className="animate-spin text-[#00b8e6] mx-auto mb-4" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-100">Contacting your bank...</p>
              <p className="text-xs text-slate-400 mt-1">Please don't close this window.</p>
            </div>
          ) : (
            /* ── Card form state ───────────────────────────────────── */
            <form onSubmit={handlePay} className="mt-6 space-y-4">
              {error && (
                <div className="rounded-xl border border-red-200 dark:border-red-600 bg-red-50 dark:bg-red-950 px-4 py-3 text-sm text-red-700 dark:text-red-200 flex items-start gap-2">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5 text-red-500" />
                  {error}
                </div>
              )}

              {/* Cardholder name */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                  Cardholder Name
                </label>
                <input
                  type="text"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  placeholder="Name on card"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#00b8e6]/30 focus:border-[#00b8e6]"
                />
              </div>

              {/* Card number */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                  Card Number
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    placeholder="0000 0000 0000 0000"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#00b8e6]/30 focus:border-[#00b8e6]"
                  />
                  {network ? (
                    <span
                      className={`absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-md text-white text-[10px] font-bold ${network.color}`}
                    >
                      {network.name}
                    </span>
                  ) : (
                    <CreditCard
                      size={18}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Expiry */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                    Expiry (MM/YY)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={expiry}
                    onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                    placeholder="MM/YY"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#00b8e6]/30 focus:border-[#00b8e6]"
                  />
                </div>

                {/* CVV */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">CVV</label>
                  <div className="relative">
                    <input
                      type={showCvv ? 'text' : 'password'}
                      inputMode="numeric"
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="•••"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#00b8e6]/30 focus:border-[#00b8e6]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCvv(!showCvv)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                      tabIndex={-1}
                      title={showCvv ? 'Hide CVV' : 'Show CVV'}
                    >
                      {showCvv ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Test card hint */}
              <div className="rounded-xl border border-amber-200 dark:border-amber-600 bg-amber-50 dark:bg-amber-950 px-3 py-2.5 flex items-start gap-2">
                <AlertCircle size={15} className="flex-shrink-0 mt-0.5 text-amber-500" />
                <p className="text-[11px] text-amber-700 dark:text-amber-400">
                  Sandbox mode: use test card{' '}
                  <span className="font-bold">4242 4242 4242 4242</span>, any future expiry and any CVV.
                </p>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-[#00b8e6] text-white font-semibold text-sm hover:bg-[#00a3cc] shadow-md hover:shadow-lg transition flex items-center justify-center gap-2"
              >
                <Lock size={15} />
                Pay {formattedAmount}
              </button>

              {/* Trust badges */}
              <div className="flex items-center justify-center gap-4 text-[11px] text-slate-400">
                <span className="inline-flex items-center gap-1">
                  <Lock size={12} className="text-emerald-500" />
                  256-bit SSL
                </span>
                <span className="inline-flex items-center gap-1">
                  <ShieldCheck size={12} className="text-emerald-500" />
                  Protected
                </span>
                <span className="inline-flex items-center gap-1">
                  <Wifi size={12} className="text-emerald-500" />
                  Instant Receipt
                </span>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}