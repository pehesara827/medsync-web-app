import { useRef, useState, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import {
  CheckCircle2,
  Download,
  Share2,
  LayoutDashboard,
  User,
  Stethoscope,
  CalendarDays,
  Clock,
  CreditCard,
  Check,
  Loader2,
} from 'lucide-react';

/**
 * Maps a payment status to a Tailwind badge style.
 * @param {string} status - 'PAID' | 'UNPAID' | 'PAY_AT_RECEPTION'
 * @returns {string} Tailwind classes
 */
const getPaymentBadgeClasses = (status) => {
  switch (status) {
    case 'PAID':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30';
    case 'UNPAID':
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30';
    case 'PAY_AT_RECEPTION':
      return 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/30';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/30';
  }
};

const getPaymentLabel = (status) => {
  switch (status) {
    case 'PAID':
      return 'PAID';
    case 'UNPAID':
      return 'UNPAID';
    case 'PAY_AT_RECEPTION':
      return 'PAY AT RECEPTION';
    default:
      return status || 'UNPAID';
  }
};

/**
 * Formats an ISO date string (YYYY-MM-DD) into a friendly label.
 * @param {string} dateStr - e.g. '2024-05-20'
 * @returns {string} e.g. 'May 20, 2024'
 */
const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

/**
 * Detail row helper component (declared outside render to avoid
 * re-creation on every render).
 */
const DetailItem = ({ icon: Icon, label, value, valueClass = '' }) => (
  <div className="flex items-start gap-3">
    <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-[#00b8e6]/10 text-[#00b8e6] flex items-center justify-center">
      <Icon size={18} />
    </div>
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        {label}
      </p>
      <p className={`text-sm font-semibold text-slate-800 dark:text-slate-100 mt-0.5 break-words ${valueClass}`}>
        {value}
      </p>
    </div>
  </div>
);

/**
 * Appointment Confirmation & Digital QR Pass
 *
 * A reusable ticket-pass component that renders a success header, a QR code
 * encoding the appointment check-in payload, a booking details summary, and
 * interactive actions (Download PDF, Share, Done).
 *
 * @param {Object} props
 * @param {Object} props.appointment - Booking details
 * @param {string} props.appointment.appointmentId - Booking reference code (e.g. 'APP-84920')
 * @param {string} [props.appointment.verificationCode] - Short check-in code (e.g. 'CHK-3F2A9B1C')
 * @param {string} props.appointment.patientName - Account holder or beneficiary name (e.g. 'Jane Doe (Son)')
 * @param {string} props.appointment.doctorName - Full doctor name (e.g. 'Dr. Sarah Chen')
 * @param {string} props.appointment.specialization - Doctor specialization (e.g. 'Cardiology')
 * @param {string} props.appointment.appointmentDate - ISO date (e.g. '2024-05-20')
 * @param {string} props.appointment.timeSlot - Time slot (e.g. '10:30 AM')
 * @param {string} props.appointment.paymentStatus - 'PAID' | 'UNPAID' | 'PAY_AT_RECEPTION'
 * @param {string} props.appointment.qrPayload - Data encoded in the QR code (appointment_id or check-in payload)
 * @param {Function} props.onDone - Callback for the Dashboard / Done button
 */
export default function AppointmentConfirmationPass({ appointment, onDone }) {
  const cardRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [toast, setToast] = useState(null);

  const {
    appointmentId = 'APP-00000',
    verificationCode = '',
    patientName = '—',
    doctorName = '—',
    specialization = '—',
    appointmentDate = '',
    timeSlot = '—',
    paymentStatus = 'UNPAID',
    qrPayload = '',
    qrDataUrl = '',
  } = appointment || {};

  // ── Toast helper ───────────────────────────────────────────────────
  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3000);
  }, []);

  // ── Download QR Code (PNG) ─────────────────────────────────────────
  const handleDownloadQR = async () => {
    try {
      // Use server-generated QR code (always available from backend)
      if (!qrDataUrl) {
        showToast('No QR code available for download.', 'error');
        return;
      }

      // Download the QR image
      const link = document.createElement('a');
      link.href = qrDataUrl;
      link.download = `QR-Code-${appointmentId}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('QR code downloaded successfully!');
    } catch (err) {
      console.error('QR download failed:', err);
      showToast('Failed to download QR code. Please try again.', 'error');
    }
  };

  // ── Download Pass (PDF) ────────────────────────────────────────────
  const handleDownload = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      // Wait for all images to load
      const images = cardRef.current.querySelectorAll('img');
      await Promise.all(Array.from(images).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });
      }));

      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
        allowTaint: true,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 12;
      const imgWidth = pageWidth - margin * 2;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Center the card vertically on the page
      const yOffset = Math.max(margin, (pageHeight - imgHeight) / 2);

      pdf.setFillColor(240, 247, 250);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');
      pdf.addImage(imgData, 'PNG', margin, yOffset, imgWidth, imgHeight);

      pdf.save(`Appointment-Pass-${appointmentId}.pdf`);
      showToast('Pass downloaded successfully!');
    } catch (err) {
      console.error('PDF download failed:', err);
      showToast('Failed to download pass. Please try again.', 'error');
    } finally {
      setDownloading(false);
    }
  };

  // ── Share Pass ─────────────────────────────────────────────────────
  const buildShareText = () => {
    return [
      `Appointment Confirmed!`,
      `Booking Reference: #${appointmentId}`,
      verificationCode ? `Check-in Code: ${verificationCode}` : '',
      `Patient: ${patientName}`,
      `Doctor: ${doctorName} - ${specialization}`,
      `Schedule: ${formatDate(appointmentDate)} at ${timeSlot}`,
      `Payment: ${getPaymentLabel(paymentStatus)}`,
    ].filter(Boolean).join('\n');
  };

  const handleShare = async () => {
    const shareData = {
      title: `Appointment Pass #${appointmentId}`,
      text: buildShareText(),
      url: window.location.href,
    };

    // Native Web Share API
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        // User cancelled or share failed — fall through to clipboard
        if (err.name === 'AbortError') return;
      }
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
      showToast('Appointment details copied to clipboard!');
    } catch (err) {
      console.error('Clipboard copy failed:', err);
      showToast('Unable to share. Please try again.', 'error');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-5 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-xl shadow-xl text-sm font-semibold text-white flex items-center gap-2 transition-all duration-300 ${
            toast.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'
          }`}
        >
          {toast.type === 'error' ? (
            <CheckCircle2 size={16} className="rotate-45" />
          ) : (
            <Check size={16} />
          )}
          {toast.message}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          TICKET PASS CARD (captured for PDF)
          ═══════════════════════════════════════════════════════════════ */}
      <div
        ref={cardRef}
        className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-[0_8px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.4)] overflow-hidden"
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="relative bg-gradient-to-br from-[#00b8e6] to-[#0090b3] px-6 pt-8 pb-10 text-center">
          {/* Decorative circles */}
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10"></div>
          <div className="absolute -bottom-16 -left-10 w-48 h-48 rounded-full bg-white/5"></div>

          <div className="relative">
            <div className="mx-auto w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4">
              <CheckCircle2 size={36} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Appointment Confirmed!
            </h2>
            <p className="text-white/80 text-sm mt-1 font-medium">
              Your digital pass is ready
            </p>

            {/* Booking Reference */}
            <div className="mt-5 inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/25 rounded-2xl px-5 py-2.5">
              <span className="text-white/70 text-xs font-semibold uppercase tracking-wider">
                Booking Ref
              </span>
              <span className="text-white font-extrabold text-lg tracking-wide">
                #{appointmentId}
              </span>
            </div>

            {/* Verification Code */}
            {verificationCode && (
              <div className="mt-3 inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-xl px-4 py-1.5">
                <span className="text-white/60 text-[10px] font-semibold uppercase tracking-wider">
                  Check-in Code
                </span>
                <span className="text-white font-bold text-sm tracking-widest font-mono">
                  {verificationCode}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── QR Code Section ────────────────────────────────────────── */}
        <div className="px-6 -mt-6">
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg p-6 flex flex-col items-center">
            <div className="p-3 bg-white rounded-xl border border-slate-100 dark:border-slate-600">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="QR Code"
                  className="w-[180px] h-[180px]"
                />
              ) : (
                <QRCodeSVG
                  value={qrPayload || appointmentId}
                  size={180}
                  level="M"
                  marginSize={2}
                  fgColor="#0f172a"
                  bgColor="#ffffff"
                />
              )}
            </div>
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Scan at check-in
            </p>
          </div>
        </div>

        {/* ── Booking Details Summary ────────────────────────────────── */}
        <div className="px-6 py-6 space-y-4">
          {/* Patient */}
          <DetailItem
            icon={User}
            label="Patient"
            value={patientName}
          />

          {/* Doctor */}
          <DetailItem
            icon={Stethoscope}
            label="Doctor"
            value={`${doctorName} - ${specialization}`}
          />

          {/* Schedule */}
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#00b8e6]/10 text-[#00b8e6] text-xs font-bold border border-[#00b8e6]/20">
              <CalendarDays size={13} />
              {formatDate(appointmentDate)}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#00b8e6]/10 text-[#00b8e6] text-xs font-bold border border-[#00b8e6]/20">
              <Clock size={13} />
              {timeSlot}
            </span>
          </div>

          {/* Payment Status */}
          <div className="flex items-center justify-between pt-4 border-t border-dashed border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm font-medium">
              <CreditCard size={16} />
              Payment Status
            </div>
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${getPaymentBadgeClasses(paymentStatus)}`}
            >
              {getPaymentLabel(paymentStatus)}
            </span>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          ACTION BUTTONS
          ═══════════════════════════════════════════════════════════════ */}
      <div className="mt-6 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {/* Download QR Code */}
          <button
            onClick={handleDownloadQR}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#00b8e6] text-white font-semibold text-sm hover:bg-[#00a3cc] shadow-md hover:shadow-lg transition-all duration-200"
          >
            <Download size={16} />
            Download QR
          </button>

          {/* Share Pass */}
          <button
            onClick={handleShare}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-[#00b8e6] text-[#00b8e6] font-semibold text-sm hover:bg-[#00b8e6]/5 transition-all duration-200"
          >
            <Share2 size={16} />
            Share Pass
          </button>
        </div>

        {/* Download Full Pass */}
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {downloading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Preparing...
            </>
          ) : (
            <>
              <Download size={16} />
              Download Full Pass (PDF)
            </>
          )}
        </button>

        {/* Dashboard / Done */}
        <button
          onClick={onDone}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-all duration-200"
        >
          <LayoutDashboard size={16} />
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
