import { useState, useEffect, useRef, useCallback } from 'react';

const POLL_INTERVAL_MS = 5 * 60 * 1000;
const POPUP_GRACE_MS = 1500;

const dismissedKey = (id) => `medsync_review_dismissed_${id}`;
const submittedKey = (id) => `medsync_review_submitted_${id}`;

export const markReviewDismissed = (appointmentId) => {
  try {
    if (appointmentId) localStorage.setItem(dismissedKey(appointmentId), '1');
  } catch { /* storage unavailable */ }
};

export const markReviewSubmitted = (appointmentId) => {
  try {
    if (appointmentId) {
      localStorage.setItem(submittedKey(appointmentId), '1');
      localStorage.removeItem(dismissedKey(appointmentId));
    }
  } catch { /* storage unavailable */ }
};

const isSuppressed = (appointmentId) => {
  try {
    return (
      localStorage.getItem(dismissedKey(appointmentId)) === '1' ||
      localStorage.getItem(submittedKey(appointmentId)) === '1'
    );
  } catch {
    return false;
  }
};

/**
 * usePendingReviews — polls GET /api/reviews/pending/:patientId and auto-opens
 * the review popup after a consultation is COMPLETED.
 */
export default function usePendingReviews({ patientId, enabled = true }) {
  const [reviewAppointment, setReviewAppointment] = useState(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const hasAutoOpenedRef = useRef(false);
  const popupTimerRef = useRef(null);
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  const normalizePending = useCallback(
    (item) => ({
      id: item.id || item.appointment_id,
      doctor_id: item.doctor_id,
      doctorId: item.doctor_id,
      doctorName: item.doctorName || 'your doctor',
      appointment_date: item.appointment_date,
      appointmentDate: item.appointment_date,
      patient_id: item.patient_id || patientId,
    }),
    [patientId]
  );

  const openFor = useCallback((pendingItem) => {
    const pid = pendingItem?.id || pendingItem?.appointment_id;
    if (!pendingItem || !pid || isSuppressed(pid)) return;
    if (popupTimerRef.current) clearTimeout(popupTimerRef.current);
    popupTimerRef.current = setTimeout(() => {
      setReviewAppointment(normalizePending(pendingItem));
      setIsReviewModalOpen(true);
      hasAutoOpenedRef.current = true;
    }, POPUP_GRACE_MS);
  }, [normalizePending]);

  const fetchPending = useCallback(async () => {
    if (!patientId || !enabled) return [];
    try {
      const res = await fetch(`${backendUrl}/api/reviews/pending/${patientId}`);
      if (!res.ok) return [];
      const data = await res.json().catch(() => ({}));
      const pending = Array.isArray(data.pending) ? data.pending : [];
      if (!hasAutoOpenedRef.current && !isReviewModalOpen && pending.length > 0) {
        const params = new URLSearchParams(window.location.search);
        const deepLinkId = params.get('review');
        const deepLinked = deepLinkId
          ? pending.find((p) => (p.id || p.appointment_id) === deepLinkId)
          : null;
        const candidate = deepLinked || pending.find((p) => !isSuppressed(p.id || p.appointment_id));
        if (candidate) openFor(candidate);
      }
      return pending;
    } catch (err) {
      console.warn('Could not fetch pending reviews:', err);
      return [];
    }
  }, [patientId, enabled, backendUrl, isReviewModalOpen, openFor]);

  useEffect(() => {
    if (!patientId || !enabled) return undefined;
    fetchPending();
    const interval = setInterval(fetchPending, POLL_INTERVAL_MS);
    const onFocus = () => fetchPending();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      if (popupTimerRef.current) clearTimeout(popupTimerRef.current);
    };
  }, [patientId, enabled, fetchPending]);

  const closeReviewModal = useCallback(() => {
    if (reviewAppointment?.id) markReviewDismissed(reviewAppointment.id);
    setIsReviewModalOpen(false);
    setReviewAppointment(null);
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.has('review')) {
        params.delete('review');
        const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
        window.history.replaceState(null, '', next);
      }
    } catch { /* ignore */ }
  }, [reviewAppointment]);

  const handleReviewSubmitted = useCallback((submittedAppointment) => {
    const id = submittedAppointment?.id || reviewAppointment?.id;
    if (id) markReviewSubmitted(id);
    setIsReviewModalOpen(false);
    setReviewAppointment(null);
    fetchPending();
  }, [reviewAppointment, fetchPending]);

  return {
    reviewAppointment,
    isReviewModalOpen,
    openFor,
    closeReviewModal,
    handleReviewSubmitted,
    refetchPending: fetchPending,
  };
}
