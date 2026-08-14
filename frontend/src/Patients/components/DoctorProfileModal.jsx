import { useState, useEffect, useCallback } from 'react';
import { X, Star, MapPin, Clock, Briefcase, Phone } from 'lucide-react';
import { supabase } from '../../../supabaseClient';
import FavoriteButton from './FavoriteButton';

export default function DoctorProfileModal({ isOpen, onClose, doctor, onFavoriteToggle }) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [isFavorite, setIsFavorite] = useState(Boolean(doctor?.isFavorite));
  const [isUpdatingFavorite, setIsUpdatingFavorite] = useState(false);

  const handleClose = useCallback(() => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
    }, 300);
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      // Small delay to trigger animation
      const timer = setTimeout(() => {
        setIsAnimating(true);
      }, 10);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';

      return () => {
        clearTimeout(timer);
        document.body.style.overflow = 'unset';
      };
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isOpen]);

  if (!isOpen || !doctor) return null;

  const rating = Number(doctor.rating) || 0;
  const reviewsCount = Number(doctor.reviewsCount) || 0;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const toggleFavorite = async () => {
    if (!doctor?.id) return;
    setIsUpdatingFavorite(true);

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      if (!user) throw new Error('You must be logged in to update favorites.');

      const { data: profile, error: profileError } = await supabase
        .from('patient_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError || !profile) {
        throw new Error('Unable to resolve patient profile.');
      }

      const payload = {
        patient_id: profile.id,
        doctor_id: doctor.id,
      };

      // Use toggle endpoint
      const response = await fetch(`${backendUrl}/api/favorites/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.message || 'Unable to update favorite');
      }

      const nextFavoriteState = !isFavorite;
      setIsFavorite(nextFavoriteState);
      onFavoriteToggle?.(doctor.id, nextFavoriteState);
    } catch (err) {
      console.error('Failed to update favorite:', err);
    } finally {
      setIsUpdatingFavorite(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${
        isAnimating ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={handleBackdropClick}
    >
      {/* Backdrop with blur */}
      <div
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-all duration-300 ${
          isAnimating ? 'opacity-100' : 'opacity-0'
        }`}
      ></div>

      {/* Modal Content */}
      <div
        className={`relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto transition-all duration-300 ${
          isAnimating ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition"
        >
          <X size={20} className="text-slate-600 dark:text-slate-200" />
        </button>

        {/* Doctor Image Header */}
        <div className="relative h-32 bg-linear-to-r from-[#00b8e6] to-[#00b0d8] rounded-t-3xl">
          <div className="absolute -bottom-12 left-8">
            <div className="w-24 h-24 rounded-2xl border-4 border-white dark:border-slate-900 overflow-hidden bg-white">
              {doctor.image ? (
                <img
                  src={doctor.image}
                  alt={doctor.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-[#e6f7fa] flex items-center justify-center">
                  <svg className="w-12 h-12 text-[#00b0d8]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Doctor Info */}
        <div className="pt-16 pb-8 px-8">
          {/* Name and Rating */}
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                {doctor.name || 'Doctor'}
              </h2>
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  <Star size={14} className="fill-current" />
                  {rating.toFixed(1)}
                </span>
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {reviewsCount} reviews
                </span>
              </div>
            </div>
            <FavoriteButton
              isFavorite={isFavorite}
              onToggle={toggleFavorite}
              isLoading={isUpdatingFavorite}
            />
          </div>

          {/* Specialty and Next Available */}
          <div className="space-y-3 mb-6">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-[#e6f7fa] dark:bg-slate-800">
                <Briefcase size={20} className="text-[#00b0d8]" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">Specialty</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{doctor.specialty}</p>
              </div>
            </div>

            {doctor.nextAvailable && (
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-[#e6f7fa] dark:bg-slate-800">
                  <Clock size={20} className="text-[#00b0d8]" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">Next Available</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{doctor.nextAvailable}</p>
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-slate-200 dark:border-slate-700 my-6"></div>

          {/* Additional Info */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Experience</p>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {doctor.experience || 0} years
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Consultation Fee</p>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Rs. {doctor.consultationFee?.toLocaleString() || '0'}
              </p>
            </div>
          </div>

          {/* Consultation Modes */}
          {doctor.modes && doctor.modes.length > 0 && (
            <div className="mb-6">
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
                Available Consultation Modes
              </p>
              <div className="flex flex-wrap gap-2">
                {doctor.modes.map((mode, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#e6f7fa] dark:bg-slate-800 text-xs font-semibold text-[#00b0d8]"
                  >
                    {mode === 'Telehealth' && <Phone size={12} />}
                    {mode === 'In-Person' && <MapPin size={12} />}
                    {mode}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-100 transition hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Close
            </button>
            <button
              onClick={onClose}
              className="flex-1 rounded-3xl bg-[#00b8e6] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#00a3cc]"
            >
              Book Appointment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}