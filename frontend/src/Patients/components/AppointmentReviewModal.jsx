import { useState } from 'react';
import { Star, X } from 'lucide-react';

/**
 * Modal for submitting a review for a completed appointment.
 *
 * Props:
 *   isOpen         — boolean controlling modal visibility
 *   onClose        — callback fired when the modal is closed
 *   appointment    — the appointment object being reviewed
 *   patientId      — the current patient's profile id
 *   onSubmitted    — callback fired after a successful review submission
 */
export default function AppointmentReviewModal({
  isOpen,
  onClose,
  appointment,
  patientId,
  onSubmitted,
}) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  if (!isOpen || !appointment) return null;

  const handleSubmit = async () => {
    if (rating === 0) {
      setError('Please select a rating before submitting.');
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
          doctor_id: appointment.doctorId,
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

      // Reset form
      setRating(0);
      setHoverRating(0);
      setComment('');
      setIsAnonymous(false);

      // Notify parent
      if (onSubmitted) onSubmitted();
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
    onClose();
  };

  const displayedRating = hoverRating || rating;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md p-6">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200 transition"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1">
          Review Your Appointment
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-300 mb-6">
          How was your appointment with{' '}
          <span className="font-semibold text-slate-700 dark:text-slate-100">
            {appointment.doctorName}
          </span>
          ?
        </p>

        {/* Star Rating */}
        <div className="flex items-center justify-center gap-1 mb-6">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="focus:outline-none transition-transform hover:scale-110"
              aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
            >
              <Star
                size={28}
                className={`${
                  star <= displayedRating
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-slate-300 dark:text-slate-600'
                }`}
              />
            </button>
          ))}
        </div>

        {/* Comment textarea */}
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
            placeholder="Share your experience..."
            rows={4}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#00b8e6] transition"
          />
        </div>

        {/* Anonymous toggle */}
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

        {/* Error message */}
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 dark:border-red-600 bg-red-50 dark:bg-red-950 px-4 py-3 text-sm text-red-700 dark:text-red-200">
            {error}
          </div>
        )}

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full px-5 py-2.5 rounded-xl bg-[#00b8e6] text-white font-semibold text-sm hover:bg-[#00a3cc] transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
      </div>
    </div>
  );
}
