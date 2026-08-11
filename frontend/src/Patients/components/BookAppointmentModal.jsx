import { useState, useEffect, useCallback, useRef } from 'react';
import { X, User, Calendar, CreditCard, ChevronDown, Loader2, AlertCircle, CheckCircle2, Upload, FileText, Building2, ArrowLeft, ArrowRight, Landmark } from 'lucide-react';
import { supabase } from '../../../supabaseClient';
import AppointmentConfirmationPass from './AppointmentConfirmationPass';

export default function BookAppointmentModal({
  isOpen,
  onClose,
  initialSpecialization = '',
  initialDoctorId = '',
  initialDate = '',
}) {
  // ── Form state ─────────────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState(1);
  const [bookingType, setBookingType] = useState('self');
  const [selectedBeneficiary, setSelectedBeneficiary] = useState('');
  const [showNewBeneficiaryForm, setShowNewBeneficiaryForm] = useState(false);
  const [newBeneficiary, setNewBeneficiary] = useState({
    fullName: '',
    age: '',
    gender: '',
    relationship: ''
  });
  const [specialization, setSpecialization] = useState('');
  const [doctor, setDoctor] = useState('');
  const [appointmentDate, setAppointmentDate] = useState(initialDate);
  const [timeSlot, setTimeSlot] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('online');

  // ── Slip upload state ──────────────────────────────────────────────
  const [slipFile, setSlipFile] = useState(null);
  const [slipPreview, setSlipPreview] = useState('');
  const [uploadingSlip, setUploadingSlip] = useState(false);
  const fileInputRef = useRef(null);

  // ── Data state ─────────────────────────────────────────────────────
  const [currentPatientId, setCurrentPatientId] = useState(null);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [specializations, setSpecializations] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);

  // ── Loading / error state ──────────────────────────────────────────
  const [loadingBeneficiaries, setLoadingBeneficiaries] = useState(false);
  const [loadingSpecializations, setLoadingSpecializations] = useState(false);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirmedAppointment, setConfirmedAppointment] = useState(null);

  // ── Resolve current patient profile id from auth session ───────────
  const resolvePatientId = useCallback(async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      if (!user) {
        setError('You must be logged in to book an appointment.');
        return null;
      }

      const { data: profile, error: profileError } = await supabase
        .from('patient_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profile) {
        setError('No patient profile found for this account.');
        return null;
      }

      setCurrentPatientId(profile.id);
      return profile.id;
    } catch (err) {
      setError(`Failed to load patient profile: ${err.message}`);
      return null;
    }
  }, []);

  // ── Fetch beneficiaries on modal open ──────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    const loadBeneficiaries = async () => {
      setLoadingBeneficiaries(true);
      setError('');
      try {
        const patientId = await resolvePatientId();
        if (!patientId) return;

        const { data, error: benError } = await supabase
          .from('beneficiaries')
          .select('id, full_name, relationship')
          .eq('patient_id', patientId)
          .order('full_name');

        if (benError) throw benError;
        setBeneficiaries(data || []);
      } catch (err) {
        setError(`Failed to load beneficiaries: ${err.message}`);
      } finally {
        setLoadingBeneficiaries(false);
      }
    };

    loadBeneficiaries();
  }, [isOpen, resolvePatientId]);

  // ── Fetch specializations on modal open ────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    const loadSpecializations = async () => {
      setLoadingSpecializations(true);
      setError('');
      try {
        const { data, error: specError } = await supabase
          .from('specialties')
          .select('id, name')
          .order('name');

        if (specError) throw specError;

        const specs = data || [];
        setSpecializations(specs);

        // Auto-select the specialization matching the doctor card
        if (initialSpecialization) {
          const matched = specs.find(
            (spec) => spec.name.toLowerCase() === initialSpecialization.toLowerCase()
          );
          if (matched) {
            setSpecialization(matched.id);
            setDoctor('');
            setTimeSlot('');
          }
        }
      } catch (err) {
        setError(`Failed to load specializations: ${err.message}`);
      } finally {
        setLoadingSpecializations(false);
      }
    };

    loadSpecializations();
  }, [isOpen, initialSpecialization]);

  // ── Fetch doctors when specialization changes ──────────────────────
  useEffect(() => {
    if (!specialization) return;

    const loadDoctors = async () => {
      setLoadingDoctors(true);
      setError('');
      setDoctor('');
      try {
        const { data, error: docError } = await supabase
          .from('doctor_profiles')
          .select('id, first_name, last_name, specialization, specialties (id, name)')
          .eq('specialty_id', specialization)
          .eq('is_approved', true)
          .order('first_name');

        if (docError) throw docError;

        const docs = data || [];
        setDoctors(docs);

        // Auto-select the doctor matching the doctor card
        if (initialDoctorId && docs.some((doc) => doc.id === initialDoctorId)) {
          setDoctor(initialDoctorId);
        }
      } catch (err) {
        setError(`Failed to load doctors: ${err.message}`);
      } finally {
        setLoadingDoctors(false);
      }
    };

    loadDoctors();
  }, [specialization, initialDoctorId]);

  // ── Fetch available time slots when doctor + date change ───────────
  useEffect(() => {
    if (!doctor || !appointmentDate) return;

    const loadTimeSlots = async () => {
      setLoadingSlots(true);
      setError('');
      setTimeSlot('');
      try {
        const { data, error: slotError } = await supabase
          .from('doctor_schedules')
          .select('id, start_time, end_time, consultation_fee, is_booked')
          .eq('doctor_id', doctor)
          .eq('available_date', appointmentDate)
          .eq('is_booked', false)
          .order('start_time');

        if (slotError) throw slotError;
        setTimeSlots(data || []);
      } catch (err) {
        setError(`Failed to load time slots: ${err.message}`);
      } finally {
        setLoadingSlots(false);
      }
    };

    loadTimeSlots();
  }, [doctor, appointmentDate]);

  // ── Helpers ────────────────────────────────────────────────────────
  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 === 0 ? 12 : hours % 12;
    return `${hour12}:${String(minutes).padStart(2, '0')} ${period}`;
  };

  const handleBeneficiaryChange = (value) => {
    setSelectedBeneficiary(value);
    setShowNewBeneficiaryForm(value === 'new');
  };

  const mapPaymentMethod = (method) => {
    switch (method) {
      case 'online': return 'ONLINE_GATEWAY';
      case 'reception': return 'PAY_AT_RECEPTION';
      case 'bank': return 'BANK_TRANSFER';
      default: return 'ONLINE_GATEWAY';
    }
  };

  const getSelectedSchedule = () => {
    return timeSlots.find((s) => s.id === timeSlot);
  };

  const getSelectedDoctor = () => {
    return doctors.find((d) => d.id === doctor);
  };

  // ── Slip file handling ─────────────────────────────────────────────
  const handleSlipFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type (images and PDFs)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please upload a valid slip file (JPG, PNG, WEBP, or PDF).');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Slip file must be less than 5MB.');
      return;
    }

    setError('');
    setSlipFile(file);

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => setSlipPreview(event.target.result);
      reader.readAsDataURL(file);
    } else {
      setSlipPreview('');
    }
  };

  const removeSlipFile = () => {
    setSlipFile(null);
    setSlipPreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uploadSlip = async (file) => {
    if (!file) return null;

    const filePath = `slips/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

    const { error: uploadError } = await supabase.storage
      .from('payment-slips')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Failed to upload payment slip: ${uploadError.message}`);
    }

    const { data: publicUrlData } = supabase.storage
      .from('payment-slips')
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  };

  // ── Step navigation ────────────────────────────────────────────────
  const validateStep1 = () => {
    if (!doctor) return 'Please select a doctor.';
    if (!appointmentDate) return 'Please select an appointment date.';
    if (!timeSlot) return 'Please select a time slot.';

    if (bookingType === 'beneficiary') {
      if (showNewBeneficiaryForm) {
        if (!newBeneficiary.fullName || !newBeneficiary.age || !newBeneficiary.gender || !newBeneficiary.relationship) {
          return 'Please fill in all new beneficiary details.';
        }
      } else if (!selectedBeneficiary) {
        return 'Please select a beneficiary.';
      }
    }

    return null;
  };

  const handleNext = () => {
    const validationError = validateStep1();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setCurrentStep(2);
  };

  const handleBack = () => {
    setError('');
    setCurrentStep(1);
  };

  // ── Submission: full booking transaction flow ──────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      // 1. Resolve patient id (in case it wasn't loaded yet)
      let patientId = currentPatientId;
      if (!patientId) {
        patientId = await resolvePatientId();
      }
      if (!patientId) throw new Error('Unable to resolve patient profile.');

      // 2. Validate required selections
      if (!doctor) throw new Error('Please select a doctor.');
      if (!appointmentDate) throw new Error('Please select an appointment date.');
      if (!timeSlot) throw new Error('Please select a time slot.');

      // 3. Determine booking type & beneficiary_id
      let bookingTypeValue = 'SELF';
      let beneficiaryId = null;

      if (bookingType === 'beneficiary') {
        bookingTypeValue = 'BENEFICIARY';

        if (showNewBeneficiaryForm) {
          // Validate new beneficiary fields
          if (!newBeneficiary.fullName || !newBeneficiary.age || !newBeneficiary.gender || !newBeneficiary.relationship) {
            throw new Error('Please fill in all new beneficiary details.');
          }

          // Insert new beneficiary first
          const { data: newBen, error: benInsertError } = await supabase
            .from('beneficiaries')
            .insert([{
              patient_id: patientId,
              full_name: newBeneficiary.fullName,
              age: parseInt(newBeneficiary.age, 10),
              gender: newBeneficiary.gender,
              relationship: newBeneficiary.relationship,
            }])
            .select('id')
            .single();

          if (benInsertError) throw new Error(`Failed to add beneficiary: ${benInsertError.message}`);
          beneficiaryId = newBen.id;
        } else {
          if (!selectedBeneficiary) throw new Error('Please select a beneficiary.');
          beneficiaryId = selectedBeneficiary;
        }
      }

      // 4. Find the selected schedule object
      const selectedSchedule = timeSlots.find((s) => s.id === timeSlot);
      if (!selectedSchedule) throw new Error('Selected time slot is no longer available.');

      // 5. Upload slip if bank transfer is selected
      let slipUrl = null;
      if (paymentMethod === 'bank') {
        if (!slipFile) throw new Error('Please upload your payment slip.');
        setUploadingSlip(true);
        slipUrl = await uploadSlip(slipFile);
      }

      // 6. Prepare booking data for backend API
      const bookingData = {
        patient_id: patientId,
        booking_type: bookingTypeValue,
        beneficiary_id: beneficiaryId,
        doctor_id: doctor,
        schedule_id: selectedSchedule.id,
        appointment_date: appointmentDate,
        amount: selectedSchedule.consultation_fee,
        payment_method: mapPaymentMethod(paymentMethod),
        receipt_slip_url: slipUrl,
      };

      // 7. Call backend API to create appointment
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      const response = await fetch(`${backendUrl}/api/appointments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to create appointment' }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      const appointmentData = result.appointment;

      // 8. Update payment status if bank transfer
      if (paymentMethod === 'bank' && appointmentData.appointmentId) {
        // Payment status is already set to PENDING_SLIP_VERIFICATION by backend
        console.log('Bank transfer payment pending verification');
      }

      // 9. Set confirmed appointment with server-generated data
      setConfirmedAppointment({
        appointmentId: appointmentData.appointmentId,
        verificationCode: appointmentData.verificationCode,
        patientName: appointmentData.patientName,
        doctorName: appointmentData.doctorName,
        specialization: appointmentData.specialization,
        appointmentDate: appointmentData.appointmentDate,
        timeSlot: appointmentData.timeSlot,
        paymentStatus: appointmentData.paymentStatus,
        qrPayload: appointmentData.qrPayload,
        qrDataUrl: appointmentData.qrDataUrl, // Server-generated QR code
      });

      setSuccess(
        paymentMethod === 'bank'
          ? 'Appointment booked! Your payment slip has been submitted for verification.'
          : 'Appointment booked successfully!'
      );
    } catch (err) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setUploadingSlip(false);
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const selectedSchedule = getSelectedSchedule();
  const selectedDoctor = getSelectedDoctor();
  const isBankTransfer = paymentMethod === 'bank';
  const isOnlineGateway = paymentMethod === 'online';
  const showNextButton = isBankTransfer || isOnlineGateway;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop with blur */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition"
        >
          <X size={20} className="text-slate-600 dark:text-slate-200" />
        </button>

        {/* ── Confirmation Pass View (after successful booking) ─────── */}
        {confirmedAppointment ? (
          <div className="p-6 md:p-8">
            <AppointmentConfirmationPass
              appointment={confirmedAppointment}
              onDone={onClose}
            />
          </div>
        ) : (
        <div className="p-6 md:p-8">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100">
              {currentStep === 1 ? 'Book New Appointment' : isBankTransfer ? 'Upload Payment Slip' : 'Confirm Payment'}
            </h2>
            {currentStep === 2 && (
              <p className="text-sm text-slate-500 dark:text-slate-300 mt-1">
                {isBankTransfer
                  ? 'Please upload your bank transfer receipt to complete the booking.'
                  : 'Review your appointment details and confirm the payment.'}
              </p>
            )}
          </div>

          {/* Step indicator */}
          {showNextButton && (
            <div className="mb-6 flex items-center gap-2">
              <div className={`flex items-center gap-2 ${currentStep === 1 ? 'text-[#00b8e6]' : 'text-emerald-500'}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  currentStep === 1 ? 'bg-[#00b8e6] text-white' : 'bg-emerald-500 text-white'
                }`}>
                  {currentStep > 1 ? <CheckCircle2 size={14} /> : '1'}
                </div>
                <span className="text-xs font-semibold">Booking Details</span>
              </div>
              <div className={`flex-1 h-0.5 rounded ${currentStep > 1 ? 'bg-emerald-400' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
              <div className={`flex items-center gap-2 ${currentStep === 2 ? 'text-[#00b8e6]' : 'text-slate-400 dark:text-slate-300'}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  currentStep === 2 ? 'bg-[#00b8e6] text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300'
                }`}>
                  2
                </div>
                <span className="text-xs font-semibold">{isBankTransfer ? 'Slip Upload' : 'Payment'}</span>
              </div>
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div className="mb-6 rounded-2xl border border-red-200 dark:border-red-600 bg-red-50 dark:bg-red-950 px-5 py-4 text-sm text-red-700 dark:text-red-200 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Success banner */}
          {success && (
            <div className="mb-6 rounded-2xl border border-emerald-200 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-5 py-4 text-sm text-emerald-700 dark:text-emerald-200 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-500" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* ═══════════════════════════════════════════════════════════
                STEP 1: Booking Details
                ═══════════════════════════════════════════════════════════ */}
            {currentStep === 1 && (
              <>
                {/* Booking Type */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-100 mb-3">Booking Type</label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setBookingType('self')}
                      className={`flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition ${
                        bookingType === 'self'
                          ? 'bg-[#00b8e6] text-white shadow-md'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      Self
                    </button>
                    <button
                      type="button"
                      onClick={() => setBookingType('beneficiary')}
                      className={`flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition ${
                        bookingType === 'beneficiary'
                          ? 'bg-[#00b8e6] text-white shadow-md'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      Beneficiary
                    </button>
                  </div>
                </div>

                {/* Beneficiary Selection */}
                {bookingType === 'beneficiary' && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-3">Booking For</label>
                    <div className="relative">
                      <select
                        value={selectedBeneficiary}
                        onChange={(e) => handleBeneficiaryChange(e.target.value)}
                        disabled={loadingBeneficiaries}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#00b8e6]/30 focus:border-[#00b8e6] appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="">{loadingBeneficiaries ? 'Loading beneficiaries...' : 'Select beneficiary'}</option>
                        {beneficiaries.map((ben) => (
                          <option key={ben.id} value={ben.id}>
                            {ben.full_name} ({ben.relationship || 'Family'})
                          </option>
                        ))}
                        <option value="new">+ Add New Beneficiary</option>
                      </select>
                      <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>

                    {/* New Beneficiary Form */}
                    {showNewBeneficiaryForm && (
                      <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-3">
                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-100 mb-3">New Beneficiary Details</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Full Name</label>
                            <input
                              type="text"
                              required
                              value={newBeneficiary.fullName}
                              onChange={(e) => setNewBeneficiary({...newBeneficiary, fullName: e.target.value})}
                              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#00b8e6]/30 focus:border-[#00b8e6]"
                              placeholder="Enter full name"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Age</label>
                            <input
                              type="number"
                              required
                              min="0"
                              value={newBeneficiary.age}
                              onChange={(e) => setNewBeneficiary({...newBeneficiary, age: e.target.value})}
                              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#00b8e6]/30 focus:border-[#00b8e6]"
                              placeholder="Enter age"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Gender</label>
                            <select
                              required
                              value={newBeneficiary.gender}
                              onChange={(e) => setNewBeneficiary({...newBeneficiary, gender: e.target.value})}
                              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#00b8e6]/30 focus:border-[#00b8e6]"
                            >
                              <option value="">Select gender</option>
                              <option value="male">Male</option>
                              <option value="female">Female</option>
                              <option value="other">Other</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Relationship</label>
                            <input
                              type="text"
                              required
                              value={newBeneficiary.relationship}
                              onChange={(e) => setNewBeneficiary({...newBeneficiary, relationship: e.target.value})}
                              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#00b8e6]/30 focus:border-[#00b8e6]"
                              placeholder="e.g., Son, Spouse, Father"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Provider Selection */}
                <div className="space-y-4">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-100">Provider Selection</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-2">Specialization</label>
                      <div className="relative">
                        <select
                          value={specialization}
                          onChange={(e) => {
                            setSpecialization(e.target.value);
                            setDoctor('');
                            setTimeSlot('');
                          }}
                          disabled={loadingSpecializations}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#00b8e6]/30 focus:border-[#00b8e6] appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="">{loadingSpecializations ? 'Loading specializations...' : 'Select specialization'}</option>
                          {specializations.map((spec) => (
                            <option key={spec.id} value={spec.id}>{spec.name}</option>
                          ))}
                        </select>
                        <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-2">Doctor</label>
                      <div className="relative">
                        <select
                          value={doctor}
                          onChange={(e) => {
                            setDoctor(e.target.value);
                            setTimeSlot('');
                          }}
                          disabled={!specialization || loadingDoctors}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#00b8e6]/30 focus:border-[#00b8e6] appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="">
                            {!specialization
                              ? 'Select specialization first'
                              : loadingDoctors
                              ? 'Loading doctors...'
                              : 'Select doctor'}
                          </option>
                          {doctors.map((doc) => (
                            <option key={doc.id} value={doc.id}>
                              Dr. {doc.first_name} {doc.last_name}
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Schedule Selection */}
                <div className="space-y-4">
                  <label className="block text-sm font-semibold text-slate-700">Schedule Selection</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-2">Appointment Date</label>
                      <div className="relative">
                        <input
                          type="date"
                          required
                          value={appointmentDate}
                          min={new Date().toISOString().split('T')[0]}
                          onChange={(e) => {
                            setAppointmentDate(e.target.value);
                            setTimeSlot('');
                          }}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#00b8e6]/30 focus:border-[#00b8e6]"
                        />
                        <Calendar size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-2">Available Time Slots</label>
                      {loadingSlots ? (
                        <div className="flex items-center justify-center py-4 text-slate-400 dark:text-slate-300">
                          <Loader2 className="w-5 h-5 animate-spin mr-2" />
                          <span className="text-xs">Loading slots...</span>
                        </div>
                      ) : timeSlots.length === 0 ? (
                        <div className="py-4 text-center text-xs text-slate-400 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                          {doctor && appointmentDate
                            ? 'No available slots for this date'
                            : 'Select a doctor and date to see slots'}
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-2">
                          {timeSlots.map((slot) => (
                            <button
                              key={slot.id}
                              type="button"
                              onClick={() => setTimeSlot(slot.id)}
                              className={`py-2 px-3 rounded-lg text-xs font-semibold transition ${
                                timeSlot === slot.id
                                  ? 'bg-[#00b8e6] text-white shadow-sm'
                                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600'
                              }`}
                            >
                              {formatTime(slot.start_time)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Payment Details */}
                <div className="space-y-4">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-100">Payment Details</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('online')}
                      className={`p-4 rounded-xl border-2 transition ${
                        paymentMethod === 'online'
                          ? 'border-[#00b8e6] bg-[#00b8e6]/5'
                          : 'border-slate-200 dark:border-slate-700 dark:hover:border-slate-600'
                      }`}
                    >
                      <CreditCard size={24} className={`mx-auto mb-2 ${paymentMethod === 'online' ? 'text-[#00b8e6]' : 'text-slate-400 dark:text-slate-300'}`} />
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-100">Online Gateway</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Credit/Debit Cards</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('reception')}
                      className={`p-4 rounded-xl border-2 transition ${
                        paymentMethod === 'reception'
                          ? 'border-[#00b8e6] bg-[#00b8e6]/5'
                          : 'border-slate-200 dark:border-slate-700 dark:hover:border-slate-600'
                      }`}
                    >
                      <CreditCard size={24} className={`mx-auto mb-2 ${paymentMethod === 'reception' ? 'text-[#00b8e6]' : 'text-slate-400 dark:text-slate-300'}`} />
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-100">Pay at Reception</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Cash or Card on arrival</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('bank')}
                      className={`p-4 rounded-xl border-2 transition ${
                        paymentMethod === 'bank'
                          ? 'border-[#00b8e6] bg-[#00b8e6]/5'
                          : 'border-slate-200 dark:border-slate-700 dark:hover:border-slate-600'
                      }`}
                    >
                      <Landmark size={24} className={`mx-auto mb-2 ${paymentMethod === 'bank' ? 'text-[#00b8e6]' : 'text-slate-400 dark:text-slate-300'}`} />
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-100">Bank Transfer</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Requires slip upload</p>
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* ═══════════════════════════════════════════════════════════
                STEP 2: Payment / Slip Upload
                ═══════════════════════════════════════════════════════════ */}
            {currentStep === 2 && (
              <>
                {/* Booking Summary */}
                <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-5 space-y-3">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <User size={16} className="text-[#00b8e6]" />
                    Appointment Summary
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Doctor</p>
                      <p className="font-semibold text-slate-700 dark:text-slate-100">
                        {selectedDoctor ? `Dr. ${selectedDoctor.first_name} ${selectedDoctor.last_name}` : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Specialization</p>
                      <p className="font-semibold text-slate-700 dark:text-slate-100">
                        {specializations.find((s) => s.id === specialization)?.name || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Date</p>
                      <p className="font-semibold text-slate-700 dark:text-slate-100">{appointmentDate || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Time</p>
                      <p className="font-semibold text-slate-700 dark:text-slate-100">
                        {selectedSchedule ? formatTime(selectedSchedule.start_time) : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Booking Type</p>
                      <p className="font-semibold text-slate-700 dark:text-slate-100">
                        {bookingType === 'self' ? 'Self' : 'Beneficiary'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Consultation Fee</p>
                      <p className="font-semibold text-[#00b8e6]">
                        {selectedSchedule ? `Rs. ${Number(selectedSchedule.consultation_fee).toLocaleString()}` : '—'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bank Transfer: Slip Upload */}
                {isBankTransfer && (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-[#00b8e6]/20 bg-[#00b8e6]/5 p-5">
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-3">
                        <Building2 size={16} className="text-[#00b8e6]" />
                        Bank Transfer Details
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">Bank</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-100">Pehesara Medical Bank</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">Account Name</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-100">MedSync Health Services</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">Account Number</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-100">1234-5678-9012</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">Amount</span>
                          <span className="font-semibold text-[#00b8e6]">
                            {selectedSchedule ? `Rs. ${Number(selectedSchedule.consultation_fee).toLocaleString()}` : '—'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Slip Upload Area */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-100 mb-3">
                        Upload Payment Slip <span className="text-red-500">*</span>
                      </label>

                      {!slipFile ? (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-8 text-center hover:border-[#00b8e6] hover:bg-[#00b8e6]/5 dark:hover:bg-slate-800 transition group"
                        >
                          <Upload size={32} className="mx-auto mb-3 text-slate-400 group-hover:text-[#00b8e6] transition" />
                          <p className="text-sm font-semibold text-slate-600 dark:text-slate-200 group-hover:text-[#00b8e6] transition">
                            Click to upload your payment slip
                          </p>
                          <p className="text-xs text-slate-400 dark:text-slate-400 mt-1">JPG, PNG, WEBP, or PDF (max 5MB)</p>
                        </button>
                      ) : (
                        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-950 p-4">
                          <div className="flex items-center gap-4">
                            {slipPreview ? (
                              <img
                                src={slipPreview}
                                alt="Slip preview"
                                className="w-20 h-20 object-cover rounded-xl border border-emerald-200"
                              />
                            ) : (
                              <div className="w-20 h-20 rounded-xl bg-emerald-100 flex items-center justify-center">
                                <FileText size={32} className="text-emerald-500" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-700 dark:text-slate-100 truncate">{slipFile.name}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                {(slipFile.size / 1024).toFixed(1)} KB
                              </p>
                              <p className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
                                <CheckCircle2 size={12} />
                                File ready to upload
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={removeSlipFile}
                              className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition"
                            >
                              <X size={18} />
                            </button>
                          </div>
                        </div>
                      )}

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        onChange={handleSlipFileChange}
                        className="hidden"
                      />

                      {!slipFile && (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="mt-3 w-full py-2.5 rounded-xl border border-[#00b8e6] text-[#00b8e6] text-sm font-semibold hover:bg-[#00b8e6]/5 transition"
                        >
                          Browse Files
                        </button>
                      )}
                    </div>

                    <p className="text-xs text-slate-400 flex items-start gap-2">
                      <AlertCircle size={14} className="flex-shrink-0 mt-0.5 text-amber-500" />
                      Your slip will be verified by our team. Your appointment will be confirmed once the payment is verified.
                    </p>
                  </div>
                )}

                {/* Online Gateway: Payment Confirmation */}
                {isOnlineGateway && (
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-5">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
                      <CreditCard size={16} className="text-[#00b8e6]" />
                      Online Payment
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-[#00b8e6]/10 flex items-center justify-center">
                            <CreditCard size={20} className="text-[#00b8e6]" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-700">Card Payment</p>
                            <p className="text-xs text-slate-500">Visa, Mastercard, Amex</p>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-[#00b8e6]">
                          {selectedSchedule ? `Rs. ${Number(selectedSchedule.consultation_fee).toLocaleString()}` : '—'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 flex items-start gap-2">
                        <AlertCircle size={14} className="flex-shrink-0 mt-0.5 text-amber-500" />
                        You will be redirected to the secure payment gateway to complete your payment.
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
              {currentStep === 2 && showNextButton ? (
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={submitting}
                  className="px-6 py-3 rounded-xl text-slate-700 font-semibold text-sm hover:bg-slate-100 transition flex items-center gap-2 disabled:opacity-50"
                >
                  <ArrowLeft size={16} />
                  Back
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="px-6 py-3 rounded-xl text-slate-700 dark:text-slate-200 font-semibold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50"
                >
                  Cancel
                </button>
              )}

              {currentStep === 1 && showNextButton ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-6 py-3 rounded-xl bg-[#00b8e6] text-white font-semibold text-sm hover:bg-[#00a3cc] shadow-md hover:shadow-lg transition flex items-center gap-2"
                >
                  Next
                  <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={submitting || uploadingSlip}
                  className="px-6 py-3 rounded-xl bg-[#00b8e6] text-white font-semibold text-sm hover:bg-[#00a3cc] shadow-md hover:shadow-lg transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting || uploadingSlip ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {uploadingSlip ? 'Uploading Slip...' : 'Booking...'}
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {isBankTransfer ? 'Submit & Book' : isOnlineGateway ? 'Proceed to Pay' : 'Confirm'}
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        </div>
        )}
      </div>
    </div>
  );
}


