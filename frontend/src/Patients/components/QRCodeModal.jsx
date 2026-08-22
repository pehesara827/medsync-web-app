import { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';
import AppointmentConfirmationPass from './AppointmentConfirmationPass';

/**
 * QR Code Modal
 * Displays the appointment's digital QR pass in a popup when the user
 * clicks the "Get QR" button on an appointment card.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is visible
 * @param {Function} props.onClose - Callback to close the modal
 * @param {Object} props.appointment - The card-shaped appointment data (has id, displayId, etc.)
 */
export default function QRCodeModal({ isOpen, onClose, appointment }) {
  const [passData, setPassData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch the full pass data whenever the modal opens with a new appointment
  useEffect(() => {
    if (!isOpen || !appointment?.id) return;

    let cancelled = false;
    const fetchPass = async () => {
      setLoading(true);
      setError('');
      setPassData(null);
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
        const response = await fetch(`${backendUrl}/api/appointments/${appointment.id}/pass`);

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.message || `Failed to load QR code (${response.status})`);
        }

        const data = await response.json();
        if (!cancelled) {
          setPassData(data.appointment);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchPass();

    return () => {
      cancelled = true;
    };
  }, [isOpen, appointment?.id]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop with blur */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* Modal Panel */}
      <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          aria-label="Close QR code"
        >
          <X size={20} />
        </button>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 size={40} className="text-[#00b8e6] animate-spin mb-4" />
            <p className="text-slate-500 dark:text-slate-300 text-sm font-medium">
              Loading QR code...
            </p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-14 h-14 rounded-full bg-red-50 dark:bg-red-950 flex items-center justify-center mb-4">
              <AlertCircle size={28} className="text-red-500" />
            </div>
            <p className="text-red-600 dark:text-red-400 font-semibold mb-1">
              Unable to load QR code
            </p>
            <p className="text-slate-500 dark:text-slate-300 text-sm">{error}</p>
          </div>
        )}

        {/* Pass Content */}
        {!loading && !error && passData && (
          <div className="p-4 md:p-6">
            <AppointmentConfirmationPass
              appointment={passData}
              onDone={onClose}
            />
          </div>
        )}
      </div>
    </div>
  );
}