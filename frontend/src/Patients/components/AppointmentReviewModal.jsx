import { useState, useEffect } from 'react';
import { Star, X } from 'lucide-react';

/**
 * Modal for submitting a review for a completed appointment.
 *
 * Props:
 *   isOpen         - boolean controlling modal visibility
 *   onClose        - callback fired when the modal is closed
 *   appointment    - the appointment object being reviewed
 *   patientId      - the current patient's profile id
 *   patientName    - the current patient's first name (for personalized greeting)
 *   onSubmitted    - callback fired after a successful review submission
 */
export default function AppointmentReviewModal({
  isOpen,
  onClose,
  appointment,
  patientId,
  patientName = '',
  onSubmitted,
}) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showAnimated, setShowAnimated] = useState(false);

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  // Reset form state whenever a new appointment opens.
  useEffect(() => {
    if (isOpen && appointment) {
      setRating(0);
      setHoverRating(0);
      setComment('');
      setIsAnonymous(false);
      setError('');
    }
  }, [isOpen, appointment]);

  // Animate modal in when it opens.
  useEffect(() => {
    if (isOpen && appointment) {
      const t = setTimeout(() => setShowAnimated(true), 50);
      return () => clearTimeout(t);
    }
    setShowAnimated(false);
    return undefined;
  }, [isOpen, appointment]);

  if (!isOpen || !appointment) return null;

  const doctorName = appointment.doctorName || appointment.doctor_name || 'your doctor';
  const greetingName = (patientName || '').trim();
  const modalDoctorId = appointment.doctorId || appointment.doctor_id || null;
  const displayedRating = hoverRating || rating;

  const handleSubmit = async () => {
    if (rating === 0) {
      setError('Please select a rating before submitting.');
      return;
    }
    if (!modalDoctorId) {
      setError('Could not determine the doctor for this appointment.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch(`${backendUrl}/api/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointment_id: appointment.id,
          doctor_id: modalDoctorId,
          patient_id: patientId,
          rating,
          review_comment: comment || null,
          is_anonymous: isAnonymous,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || `Failed to submit review (${response.status})`);
      }

      setRating(0);
      setHoverRating(0);
      setComment('');
      setIsAnonymous(false);

      if (onSubmitted) onSubmitted(appointment);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setRating(0);
    setHoverRating(0);
    setComment('');
    setIsAnonymous(false);
    setError('');
    setShowAnimated(false);
    onClose();
  };

  const formatAppointmentDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${showAnimated ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
      />

      <div
        className={`relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md p-6 transition-all duration-300 ${showAnimated ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'}`}
      >
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          aria-label="Close review dialog"
        >
          <X size={20} />
        </button>

        <div className="text-center mb-6">
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            How was your visit?
          </h3>
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-300 mb-1">
          Hi {greetingName || 'there'},
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-1">
          Thank you for visiting{' '}
          <span className="font-semibold text-slate-700 dark:text-slate-100">
            MedSync Clinic
          </span>{' '}
          today.
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">
          How was your visit with{' '}
          <span className="font-semibold text-slate-700 dark:text-slate-100">
            {doctorName}
          </span>
          ?
        </p>

        {(appointment.appointment_date || appointment.appointmentDate) && (
          <div className="mb-4 px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium">Appointment Date:</span>{' '}
            {formatAppointmentDate(appointment.appointment_date || appointment.appointmentDate)}
          </div>
        )}

        <div className="mb-6">
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-3 text-center">
            Please rate your experience
          </label>
          <div className="flex items-center justify-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="focus:outline-none transition-transform hover:scale-110 active:scale-95"
                aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
              >
                <Star
                  size={32}
                  className={
                    star <= displayedRating
                      ? 'fill-amber-400 text-amber-400'
                      : 'fill-slate-200 text-slate-200 dark:fill-slate-700 dark:text-slate-700'
                  }
                />
              </button>
            ))}
          </div>
          {displayedRating > 0 && (
            <p className="text-center text-xs mt-2 text-slate-500 dark:text-slate-400">
              {displayedRating} star{displayedRating > 1 ? 's' : ''} - {getRatingText(displayedRating)}
            </p>
          )}
        </div>

        <div className="mb-4">
          <label
            htmlFor="review-comment"
            className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2"
          >
            Your comment (optional)
          </label>
          <textarea
            id="review-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={`Share your experience with ${doctorName}...`}
            rows={4}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#00b8e6] transition"
          />
        </div>

        <div className="flex items-center gap-3 mb-6">
          <input
            id="review-anonymous"
            type="checkbox"
            checked={isAnonymous}
            onChange={(e) => setIsAnonymous(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-[#00b8e6] focus:ring-[#00b8e6] dark:bg-slate-800 dark:border-slate-600"
          />
          <label
            htmlFor="review-anonymous"
            className="text-sm text-slate-600 dark:text-slate-300"
          >
            Submit anonymously
          </label>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 dark:border-red-600 bg-red-50 dark:bg-red-950 px-4 py-3 text-sm text-red-700 dark:text-red-200">
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full px-5 py-3 rounded-xl bg-[#00b8e6] text-white font-semibold text-sm hover:bg-[#00a3cc] transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              Submitting...
            </>
          ) : (
            'Submit Review'
          )}
        </button>

        <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-4">
          Your feedback helps us improve our services
        </p>
      </div>
    </div>
  );
}

function getRatingText(rating) {
  switch (rating) {
    case 1:
      return 'Poor';
    case 2:
      return 'Fair';
    case 3:
      return 'Good';
    case 4:
      return 'Very Good';
    case 5:
      return 'Excellent';
    default:
      return '';
  }
}
