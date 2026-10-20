// src/Admins/pages/QRScanner.jsx
// Admin "Scan QR" page — lets an admin scan a patient's appointment QR code at
// the queue/reception desk. On a successful scan it resolves the full
// appointment detail (patient profile picture, full name, age, birthday,
// self-or-beneficiary, schedule time + date, doctor name + specialty,
// appointment status and the derived queue number) and displays it in a
// detail card.
//
// Scanner is powered by `html5-qrcode` (rear camera + optional file upload).
// File scans run through a normalise-and-retry pipeline (see decodeQrFromImageFile)
// because html5-qrcode's bundled ZXing reader runs with the TRY_HARDER hint
// disabled and otherwise throws "No MultiFormat Readers were able to detect the
// code." on un-processed photos/screenshots.
// Detail data comes from GET /api/admin/scan/:appointmentId (adminScanApi.js).
// The payment status shown in the detail card is read from the `payments` table
// (the single source of truth). Confirming collects the payment there first and
// completes the visit afterwards; a bank slip still in
// PENDING_SLIP_VERIFICATION has to be explicitly released with the
// "I verified the bank slip" tick.
import { useRef, useState, useEffect, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import {
  ScanLine,
  UserRound,
  Calendar,
  Clock,
  Stethoscope,
  Hash,
  BadgeCheck,
  Users2,
  RotateCcw,
  Camera,
  ImageUp,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Wallet,
} from 'lucide-react';

import {
  fetchScannedAppointment,
  confirmScannedAppointment,
} from '../../components/api/adminScanApi';

const SCANNER_ID = 'admin-qr-scanner';

// -----------------------------------------------
// Helpers / style maps
// -----------------------------------------------

const STATUS_STYLES = {
  PENDING: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
  CONFIRMED: 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400',
  COMPLETED: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
  CANCELLED: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400',
  MISSED: 'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400',
};

const STATUS_LABELS = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  MISSED: 'Missed',
};

// Payment-status highlight styles (card) and badge styles.
const PAYMENT_CARD_STYLES = {
  PAID: 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10',
  UNPAID: 'border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10',
  PENDING_SLIP_VERIFICATION:
    'border-sky-200 bg-sky-50 dark:border-sky-500/30 dark:bg-sky-500/10',
};

const PAYMENT_BADGE_STYLES = {
  PAID: 'bg-emerald-600 text-white',
  UNPAID: 'bg-amber-500 text-white',
  PENDING_SLIP_VERIFICATION: 'bg-sky-600 text-white',
};

// Matches the Admin Payments page currency formatting.
const formatCurrency = (amount) =>
  amount == null
    ? ''
    : `LKR ${Number(amount).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

const paymentMethodLabel = (method) =>
  (method || 'PAY_AT_RECEPTION')
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');

function initialsOf(name) {
  return (name || '')
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 1)
    .join('')
    .toUpperCase();
}

/**
 * Parses the QR string. MedSync QR payloads are JSON of the shape
 * `{ "appointment_id": "<uuid>", "verification_code": "CHK-..." }`.
 * We also accept a bare UUID for robustness.
 */
function parsePayload(text) {
  const trimmed = (text || '').trim();
  if (!trimmed) return null;
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed?.appointment_id) return parsed.appointment_id;
  } catch {
    /* not JSON */
  }
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
    return trimmed;
  }
  return null;
}

// -----------------------------------------------
// File-scan pipeline
//
// `html5-qrcode`'s `scanFile()` feeds the picked image straight to ZXing's
// `MultiFormatReader`, which is built with the `TRY_HARDER` hint hard-coded to
// `false` (see node_modules/html5-qrcode/src/zxing-html5-qrcode-decoder.ts).
// A single un-processed camera-roll photo or full-screen screenshot therefore
// fails with "No MultiFormat Readers were able to detect the code.".
//
// We compensate by normalising the image off-screen (downscale / grayscale /
// contrast boost / upscale) and retrying every variant until one decodes.
// -----------------------------------------------

// Long-edge caps for the retry variants: big photos are downscaled so ZXing's
// global binarizer can resolve the modules again, tiny ones are upscaled.
const SCAN_VARIANT_MAX_LONG_EDGE = 1600;
const SCAN_RETRY_MAX_LONG_EDGE = 1000;
const SCAN_UPSCALE_MAX_LONG_EDGE = 600;

// QR-only decoding: skipping the other 16 ZXing readers keeps scans fast.
const QR_ONLY_FORMATS = [Html5QrcodeSupportedFormats.QR_CODE];

const CAMERA_SCAN_OPTIONS = {
  verbose: false,
  formatsToSupport: QR_ONLY_FORMATS,
  useBarCodeDetectorIfSupported: true,
};

const FILE_SCAN_OPTIONS = {
  verbose: false,
  formatsToSupport: QR_ONLY_FORMATS,
};

const scaleToFit = (width, height, maxLongEdge) => {
  const longest = Math.max(width, height);
  return longest > 0 ? Math.min(1, maxLongEdge / longest) : 1;
};

/** Decodes a picked image File into a drawable source plus its natural size. */
async function loadImageFile(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => {
          if (bitmap.close) bitmap.close();
        },
      };
    } catch {
      /* fall back to the <img> based loader below */
    }
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('Could not decode that image file.'));
      element.src = objectUrl;
    });
    return {
      source: image,
      width: image.naturalWidth || image.width,
      height: image.naturalHeight || image.height,
      release: () => URL.revokeObjectURL(objectUrl),
    };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

/** Rasterises the decoded image into a PNG File that `scanFile()` can consume. */
async function rasterizeToPngFile(image, scale, filter) {
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  // A white quiet zone helps the binarizer locate the finder patterns.
  const padding = Math.max(8, Math.round(Math.min(width, height) * 0.04));

  const canvas = document.createElement('canvas');
  canvas.width = width + padding * 2;
  canvas.height = height + padding * 2;

  const context = canvas.getContext('2d');
  if (!context) throw new Error('Unable to get 2d context from canvas.');

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  if (filter) context.filter = filter;
  context.drawImage(image.source, padding, padding, width, height);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Could not rasterize that image file.');

  return new File([blob], 'medsync-scan-variant.png', { type: 'image/png' });
}

/** Builds the ordered list of image variants we will attempt to decode. */
async function buildFileScanCandidates(file) {
  const image = await loadImageFile(file);
  try {
    const { width, height } = image;

    const variants = [
      {
        label: `fit ${SCAN_VARIANT_MAX_LONG_EDGE}px`,
        scale: scaleToFit(width, height, SCAN_VARIANT_MAX_LONG_EDGE),
        filter: null,
      },
      {
        label: `fit ${SCAN_RETRY_MAX_LONG_EDGE}px`,
        scale: scaleToFit(width, height, SCAN_RETRY_MAX_LONG_EDGE),
        filter: null,
      },
      {
        label: `fit ${SCAN_RETRY_MAX_LONG_EDGE}px grayscale`,
        scale: scaleToFit(width, height, SCAN_RETRY_MAX_LONG_EDGE),
        filter: 'grayscale(1) contrast(1.6)',
      },
      {
        label: `fit ${SCAN_RETRY_MAX_LONG_EDGE}px binarized`,
        scale: scaleToFit(width, height, SCAN_RETRY_MAX_LONG_EDGE),
        filter: 'grayscale(1) contrast(3) brightness(1.05)',
      },
    ];

    // Pass screenshots are often only a few hundred pixels wide; upscaling
    // gives ZXing more pixels to sample per module.
    if (Math.max(width, height) < SCAN_UPSCALE_MAX_LONG_EDGE) {
      variants.push({
        label: 'upscaled 2x',
        scale: 2,
        filter: 'grayscale(1) contrast(1.4)',
      });
    }

    // The untouched file is tried first so behaviour that already worked cannot
    // regress; `seen` de-duplicates variants that rasterise to the same image.
    const candidates = [{ label: 'original', file }];
    const seen = new Set(['1|']);
    for (const variant of variants) {
      const key = `${variant.scale}|${variant.filter || ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      candidates.push({
        label: variant.label,
        file: await rasterizeToPngFile(image, variant.scale, variant.filter),
      });
    }
    return candidates;
  } finally {
    image.release();
  }
}

/** Decodes one candidate with the native BarcodeDetector, when available. */
async function decodeWithNativeDetector(file) {
  if (
    typeof createImageBitmap !== 'function' ||
    typeof window === 'undefined' ||
    !('BarcodeDetector' in window)
  ) {
    return null;
  }

  const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
  const bitmap = await createImageBitmap(file);
  try {
    const results = await detector.detect(bitmap);
    const first = results && results[0];
    return first && first.rawValue ? first.rawValue : null;
  } finally {
    if (bitmap.close) bitmap.close();
  }
}

/** Decodes one candidate with html5-qrcode (ZXing under the hood). */
async function decodeWithHtml5Qrcode(file) {
  const scanner = new Html5Qrcode(SCANNER_ID, FILE_SCAN_OPTIONS);
  try {
    return await scanner.scanFile(file, false);
  } finally {
    try {
      scanner.clear();
    } catch {
      /* the shared scanner element was already reset */
    }
  }
}

/**
 * Decodes a QR code from a picked image file, trying every normalised variant
 * before giving up. Resolves with the decoded text or rejects when no variant
 * contained a readable QR code.
 */
async function decodeQrFromImageFile(file) {
  const candidates = await buildFileScanCandidates(file);
  const failures = [];

  for (const candidate of candidates) {
    try {
      const nativeText = await decodeWithNativeDetector(candidate.file);
      if (nativeText) return nativeText;
    } catch (error) {
      failures.push(error);
    }

    try {
      const text = await decodeWithHtml5Qrcode(candidate.file);
      if (text) return text;
    } catch (error) {
      failures.push(error);
    }
  }

  console.warn(
    'Admin QR file scan failed on every variant:',
    candidates.map((candidate) => candidate.label),
    failures
  );
  const lastFailure = failures[failures.length - 1];
  throw lastFailure instanceof Error
    ? lastFailure
    : new Error('Could not read a QR code from that image.');
}


// -----------------------------------------------
// Small presentational pieces
// -----------------------------------------------

function DetailRow({ icon: Icon, label, value, accent }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3">
      <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${accent}`}>
        <Icon className="w-4.5 h-4.5" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</p>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-snug break-words">
          {value || '—'}
        </p>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
        <UserRound className="w-8 h-8 text-slate-300 dark:text-slate-600" />
      </div>
      <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">
        No appointment scanned yet
      </h3>
      <p className="text-sm text-slate-400 dark:text-slate-500 mt-1 max-w-xs">
        Point the scanner at the patient's appointment QR code to instantly pull
        up their details.
      </p>
    </div>
  );
}
// -----------------------------------------------
// Main component
// -----------------------------------------------

export default function QRScanner() {
  // Scan pipeline state
  const scannerRef = useRef(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success'|'error', text }

  // Resolved appointment detail
  const [detail, setDetail] = useState(null);

  // Confirm (complete) action
  const [isConfirming, setIsConfirming] = useState(false);

  // "I verified the bank slip" tick — only rendered (and required) while the
  // linked payment row is still PENDING_SLIP_VERIFICATION.
  const [slipVerified, setSlipVerified] = useState(false);

  // Manual paste fallback
  const [manualInput, setManualInput] = useState('');

  // Lifecycle: make sure the camera is released when leaving the page.
  useEffect(() => {
    return () => {
      const scanner = scannerRef.current;
      if (scanner) {
        scanner
          .stop()
          .then(() => scanner.clear())
          .catch(() => {});
      }
    };
  }, []);

  const flash = useCallback((type, text) => {
    setFeedback({ type, text });
    window.setTimeout(() => setFeedback(null), 4000);
  }, []);

  const resolveAppointment = useCallback(
    async (appointmentId) => {
      setIsResolving(true);
      setCameraError('');
      // A fresh scan must never inherit the previous appointment's slip tick.
      setSlipVerified(false);
      try {
        const appt = await fetchScannedAppointment(appointmentId);
        setDetail(appt);
        flash('success', 'Appointment verified successfully.');
      } catch (err) {
        flash('error', err.message || 'Failed to load appointment details.');
      } finally {
        setIsResolving(false);
      }
    },
    [flash]
  );

  const handleScannedText = useCallback(
    async (text) => {
      if (isResolving) return;
      const appointmentId = parsePayload(text);
      if (!appointmentId) {
        flash('error', 'This QR code is not a valid MedSync appointment code.');
        return;
      }
      await resolveAppointment(appointmentId);
    },
    [isResolving, resolveAppointment, flash]
  );

  const startCamera = useCallback(async () => {
    setCameraError('');
    setIsScanning(true);
    try {
      const html5QrCode = new Html5Qrcode(SCANNER_ID, CAMERA_SCAN_OPTIONS);
      scannerRef.current = html5QrCode;
      await html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText) => {
          // Success callback — release the camera so the scan "freezes".
          html5QrCode
            .stop()
            .then(() => html5QrCode.clear())
            .catch(() => {});
          setIsScanning(false);
          handleScannedText(decodedText);
        },
        // Quietly ignore per-frame decode misses.
        () => {}
      );
    } catch (err) {
      setIsScanning(false);
      setCameraError(
        err?.message ||
          'Could not access the camera. Please allow camera permission or use file scan.'
      );
    }
  }, [handleScannedText]);

  const stopCamera = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (scanner) {
      try {
        await scanner.stop();
        await scanner.clear();
      } catch {
        /* already stopped */
      }
    }
    setIsScanning(false);
  }, []);

  const resetScan = useCallback(() => {
    stopCamera();
    setDetail(null);
    setFeedback(null);
    setCameraError('');
    setManualInput('');
    setSlipVerified(false);
  }, [stopCamera]);

  const handleFileScan = useCallback(
    async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      setCameraError('');
      setIsResolving(true);
      // `scanFile()` resets the scanner element it is given, so a live camera
      // scan has to be released first (otherwise the <video> is torn down while
      // the capture stream keeps running).
      if (isScanning) await stopCamera();
      try {
        const decodedText = await decodeQrFromImageFile(file);
        await handleScannedText(decodedText);
      } catch (error) {
        // Log the decoder's raw exception ("No MultiFormat Readers were able to
        // detect the code.") but show the admin something actionable instead.
        console.error('Admin QR file scan failed:', error);
        flash(
          'error',
          "We couldn't find a QR code in that image. Use a sharp, well-lit " +
            'photo where the QR code fills most of the frame, or scan with the ' +
            'camera instead.'
        );
      } finally {
        setIsResolving(false);
        event.target.value = '';
      }
    },
    [handleScannedText, flash, isScanning, stopCamera]
  );

  const handleManualSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!manualInput.trim()) return;
      await handleScannedText(manualInput);
    },
    [manualInput, handleScannedText]
  );

  // Confirms the scanned appointment: the linked payments row is marked PAID and
  // the visit is completed. `verifiedSlip` is only meaningful for a payment that
  // is still PENDING_SLIP_VERIFICATION, where the backend requires it.
  const handleConfirm = useCallback(async () => {
    if (!detail?.id || isConfirming) return;
    setIsConfirming(true);
    try {
      const updated = await confirmScannedAppointment(detail.id, {
        verifiedSlip: slipVerified,
      });
      const wasCompleted = detail.status === 'COMPLETED';
      const paymentWasPaid = detail.payment.status === 'PAID';
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              status: updated.status || 'COMPLETED',
              // Trust the values reported back from the payments row.
              payment: {
                ...prev.payment,
                status: updated.payment_status || prev.payment.status,
                amount: updated.payment_amount ?? prev.payment.amount,
                method: updated.payment_method || prev.payment.method,
              },
            }
          : prev
      );
      flash(
        'success',
        wasCompleted
          ? 'Payment collected — the appointment is completed and marked as Paid.'
          : paymentWasPaid
            ? 'Visit marked as Completed — the payment was already recorded as Paid.'
            : 'Appointment confirmed — status is now Completed and the payment is marked as Paid.'
      );
    } catch (err) {
      flash('error', err.message || 'Failed to confirm the appointment.');
    } finally {
      setIsConfirming(false);
    }
  }, [detail, isConfirming, slipVerified, flash]);

  const statusClass = detail ? STATUS_STYLES[detail.status] || STATUS_STYLES.PENDING : '';
  const statusLabel = detail ? STATUS_LABELS[detail.status] || detail.status : '';

  return (
<div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#00a8cc] rounded-xl">
            <ScanLine className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
              Scan QR Code
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Verify a patient's appointment by scanning their QR pass at the
              queue.
            </p>
          </div>
        </div>
        {(detail || isScanning) && (
          <button
            type="button"
            onClick={resetScan}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            New Scan
          </button>
        )}
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`flex items-start gap-3 rounded-xl px-4 py-3 text-sm font-medium ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
              : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* ── LEFT: Scanner ─────────────────────────────── */}
        <div className="xl:col-span-2 space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Camera className="w-4 h-4 text-[#00a8cc]" />
                  Scanner
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  Point at the QR code on the patient's pass
                </p>
              </div>
              {isScanning && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </span>
              )}
            </div>

            <div className="p-6">
              {/* Camera viewport */}
              <div
                className={`relative rounded-xl overflow-hidden bg-slate-900 border ${
                  isScanning ? 'border-[#00a8cc]' : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                <div id={SCANNER_ID} className="w-full [&_video]:w-full [&_video]:block" />
                {!isScanning && !isResolving && (
                  <div className="flex flex-col items-center justify-center px-6 py-14 text-center text-slate-400">
                    <ScanLine className="w-10 h-10 mb-3 opacity-50" />
                    <p className="text-sm">
                      Camera is <span className="font-medium text-slate-200">off</span>
                    </p>
                    <p className="text-xs mt-1 max-w-[220px]">
                      Start the scanner to begin reading QR codes.
                    </p>
                  </div>
                )}
                {isResolving && (
                  <div className="absolute inset-0 bg-slate-900/70 flex flex-col items-center justify-center gap-2 px-4 text-center text-white text-sm">
                    <Loader2 className="w-6 h-6 animate-spin text-[#00a8cc]" />
                    Verifying appointment…
                  </div>
                )}
              </div>
{/* Camera error */}
              {cameraError && (
                <div className="mt-3 flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 rounded-lg px-3 py-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{cameraError}</span>
                </div>
              )}

              {/* Controls */}
              <div className="mt-4 flex flex-col gap-2">
                {!isScanning ? (
                  <button
                    type="button"
                    onClick={startCamera}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#00a8cc] text-white font-semibold text-sm hover:bg-[#0092b3] transition-colors disabled:opacity-50"
                    disabled={isResolving}
                  >
                    <Camera className="w-4 h-4" />
                    Start Camera
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 font-semibold text-sm hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                  >
                    Stop Camera
                  </button>
                )}

                <label className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                  <ImageUp className="w-4 h-4" />
                  Scan from Image
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileScan}
                    disabled={isResolving}
                  />
                </label>
              </div>

              {/* Manual paste fallback */}
              <form
                onSubmit={handleManualSubmit}
                className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700"
              >
                <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mb-2">
                  Or paste the scanned payload / appointment ID:
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    placeholder="Paste QR payload here…"
                    className="flex-1 min-w-0 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00a8cc]/20 focus:border-[#00a8cc]/50"
                  />
                  <button
                    type="submit"
                    className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    disabled={!manualInput.trim() || isResolving}
                  >
                    Verify
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Info hint card */}
          <div className="bg-[#e0f5f8] dark:bg-slate-800 rounded-2xl border border-[#00a8cc]/20 dark:border-slate-700 px-5 py-4">
            <p className="text-xs font-semibold text-[#0092b3] dark:text-cyan-400 mb-1">How it works</p>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              MedSync appointment QR codes encode a secure verification payload.
              Scanning at the reception verifies the booking instantly and shows
              the assigned queue number without exposing sensitive records.
            </p>
          </div>
        </div>
{/* ── RIGHT: Appointment details ───────────────── */}
        <div className="xl:col-span-3">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden h-full">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <BadgeCheck className="w-4 h-4 text-[#00a8cc]" />
                Appointment Details
              </h3>
              {detail && (
                <span
                  className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${statusClass}`}
                >
                  {statusLabel}
                </span>
              )}
            </div>

            {!detail ? (
              <div className="px-6">
                <EmptyState />
              </div>
            ) : (
              <div className="p-6 space-y-5">
                {/* Patient identity header */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-700 ring-2 ring-[#00a8cc]/20">
                      {detail.patient.profilePictureUrl ? (
                        <img
                          src={detail.patient.profilePictureUrl}
                          alt={detail.patient.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <UserRound className="w-9 h-9" />
                        </div>
                      )}
                    </div>
                    <span
                      className={`absolute -bottom-1 -right-1 h-7 min-w-7 px-1 rounded-full text-[10px] font-bold flex items-center justify-center ${
                        detail.queueNumber && detail.queueNumber !== '—'
                          ? 'bg-[#00a8cc] text-white ring-2 ring-white dark:ring-slate-800'
                          : 'bg-slate-300 text-white ring-2 ring-white dark:ring-slate-800'
                      }`}
                    >
                      {detail.queueNumber === '—'
                        ? initialsOf(detail.patient.name)
                        : detail.queueNumber.slice(1)}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-tight">
                        {detail.patient.name}
                      </h4>
                      {detail.isBeneficiary && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300">
                          <Users2 className="w-3 h-3" />
                          Beneficiary
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {detail.patient.gender || '—'} · {detail.patient.email || '—'}
                    </p>
                    <p className="text-xs font-mono text-slate-400 dark:text-slate-500 mt-1">
                      {detail.verificationCode} · {detail.displayId}
                    </p>
                  </div>
                </div>
{/* Queue + booking type quick highlights */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-[#00a8cc]/20 bg-[#e0f5f8] dark:bg-slate-800/80 px-4 py-3 flex items-center gap-3">
                    <Hash className="w-5 h-5 text-[#00a8cc]" />
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-[#0092b3] dark:text-cyan-400">
                        Queue No.
                      </p>
                      <p className="text-xl font-bold text-slate-800 dark:text-slate-100">
                        {detail.queueNumber}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center gap-3">
                    <Users2 className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                        Booking
                      </p>
                      <p className="text-lg font-bold text-slate-800 dark:text-slate-100 capitalize">
                        {detail.isBeneficiary ? 'Beneficiary' : 'Self'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Schedule + Doctor + Age detail grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <DetailRow
                    icon={Calendar}
                    label="Appointment Date"
                    value={detail.dateLabel}
                    accent="bg-[#e0f5f8] text-[#00a8cc]"
                  />
                  <DetailRow
                    icon={Clock}
                    label="Schedule Time"
                    value={detail.timeLabel}
                    accent="bg-[#e0f5f8] text-[#00a8cc]"
                  />
                  <DetailRow
                    icon={Stethoscope}
                    label="Doctor"
                    value={detail.doctor.name}
                    accent="bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-400"
                  />
                  <DetailRow
                    icon={BadgeCheck}
                    label="Specialty"
                    value={detail.doctor.specialty}
                    accent="bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-400"
                  />
                  <DetailRow
                    icon={UserRound}
                    label="Age"
                    value={detail.patient.age != null ? `${detail.patient.age} years` : '—'}
                    accent="bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300"
                  />
                  <DetailRow
                    icon={Calendar}
                    label="Birthday"
                    value={detail.patient.dateOfBirth || '—'}
                    accent="bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300"
                  />
                </div>

                {/* Payment status — highlighted */}
                <div
                  className={`rounded-xl border px-4 py-3 flex items-center justify-between gap-3 ${
                    PAYMENT_CARD_STYLES[detail.payment.status] || PAYMENT_CARD_STYLES.UNPAID
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-white/70 dark:bg-slate-900/40 flex items-center justify-center">
                      <Wallet className="w-4.5 h-4.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                        Payment Status
                      </p>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                        {formatCurrency(detail.payment.amount) || '—'}
                        {detail.payment.method
                          ? ` · ${paymentMethodLabel(detail.payment.method)}`
                          : ''}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-extrabold tracking-wide ${
                      PAYMENT_BADGE_STYLES[detail.payment.status] || PAYMENT_BADGE_STYLES.UNPAID
                    }`}
                  >
                    {detail.payment.status === 'PENDING_SLIP_VERIFICATION'
                      ? 'SLIP PENDING'
                      : detail.payment.status || 'UNPAID'}
                  </span>
                </div>

                {/* Booking relationship footnote */}
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-400 dark:text-slate-500 pt-1">
                  <span>
                    Booking:{' '}
                    <span className="font-medium text-slate-600 dark:text-slate-300 capitalize">
                      {detail.patient.relationship}
                    </span>
                  </span>
                </div>

                {/* Confirm action */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-700">
                  {detail.status === 'CANCELLED' ? (
                    <div className="flex items-center justify-center gap-2 rounded-xl bg-rose-50 dark:bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-700 dark:text-rose-400">
                      <AlertTriangle className="w-5 h-5" />
                      Appointment cancelled — confirmation unavailable
                    </div>
                  ) : detail.status === 'MISSED' ? (
                    <div className="flex items-center justify-center gap-2 rounded-xl bg-orange-50 dark:bg-orange-500/10 px-4 py-3 text-sm font-semibold text-orange-700 dark:text-orange-400">
                      <AlertTriangle className="w-5 h-5" />
                      Visit marked as Missed — please book a new visit
                    </div>
                  ) : detail.status === 'COMPLETED' && detail.payment.status === 'PAID' ? (
                    <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="w-5 h-5" />
                      Visit completed &amp; payment received
                    </div>
                  ) : (
                    <>
                      {detail.payment.status === 'PENDING_SLIP_VERIFICATION' && (
                        <label className="mb-3 flex items-start gap-2.5 rounded-xl bg-sky-50 dark:bg-sky-500/10 px-3 py-2.5 text-xs text-sky-800 dark:text-sky-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={slipVerified}
                            onChange={(e) => setSlipVerified(e.target.checked)}
                            className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-slate-300 text-[#00a8cc] focus:ring-[#00a8cc]/30"
                          />
                          <span>
                            <span className="font-semibold">I verified the bank slip</span> — this
                            booking's slip is still pending verification, so it is only released as
                            Paid once this is ticked.
                          </span>
                        </label>
                      )}
                      <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={
                          isConfirming ||
                          (detail.payment.status === 'PENDING_SLIP_VERIFICATION' && !slipVerified)
                        }
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isConfirming ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4" />
                        )}
                        {isConfirming
                          ? 'Confirming…'
                          : detail.payment.status === 'PAID'
                            ? 'Mark Visit as Completed'
                            : detail.status === 'COMPLETED'
                              ? 'Collect Payment (Mark as Paid)'
                              : 'Confirm Appointment'}
                      </button>
                      <p className="mt-2 text-center text-xs text-slate-400 dark:text-slate-500">
                        {detail.payment.status === 'PAID' ? (
                          <>
                            The payment is already recorded as{' '}
                            <span className="font-medium text-slate-500 dark:text-slate-400">Paid</span>
                            {' — this marks the visit as '}
                            <span className="font-medium text-slate-500 dark:text-slate-400">
                              Completed
                            </span>
                            .
                          </>
                        ) : detail.status === 'COMPLETED' ? (
                          <>
                            The visit is already{' '}
                            <span className="font-medium text-slate-500 dark:text-slate-400">
                              Completed
                            </span>
                            {' — recording the payment as '}
                            <span className="font-medium text-slate-500 dark:text-slate-400">
                              Paid
                            </span>
                            .
                          </>
                        ) : (
                          <>
                            Confirming marks this appointment as{' '}
                            <span className="font-medium text-slate-500 dark:text-slate-400">
                              Completed
                            </span>{' '}
                            and its payment as{' '}
                            <span className="font-medium text-slate-500 dark:text-slate-400">
                              Paid
                            </span>
                            .
                          </>
                        )}
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}