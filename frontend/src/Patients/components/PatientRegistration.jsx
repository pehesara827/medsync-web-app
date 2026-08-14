import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../supabaseClient';
import Step1PersonalInfo from './Step1PersonalInfo';
import Step2EmergencyContact from './Step2EmergencyContact';
import Step3Credentials from './Step3Credentials';

const stepLabels = [
  { label: 'Personal Info', key: 'personal' },
  { label: 'Emergency Contact', key: 'emergency' },
  { label: 'Credentials & Terms', key: 'credentials' },
];

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export default function PatientRegistration() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [formData, setFormData] = useState({
    profile_picture: '',
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: '',
    phone_country_code: '+1',
    phone_number: '',
    email: '',
    national_id_passport: '',
    emergency_contact_name: '',
    emergency_contact_rel: '',
    emergency_contact_phone_country_code: '+1',
    emergency_contact_phone: '',
    alt_contact_phone: '',
    home_address: '',
    blood_group: '',
    username: '',
    password_hash: '',
    confirm_password: '',
    terms_accepted: false,
  });

  const handleChange = (event) => {
    const { name, type, value, checked, files } = event.target;
    const fieldValue = type === 'checkbox' ? checked : type === 'file' ? files?.[0] || '' : value;

    setFormData((prev) => ({
      ...prev,
      [name]: fieldValue,
    }));

    // Clear any previous error when user changes a field
    if (submitError) setSubmitError('');
  };

  const handleNext = () => {
    const requiredFieldsByStep = {
      1: ['first_name', 'last_name', 'date_of_birth', 'gender', 'phone_number', 'email', 'national_id_passport'],
      2: ['emergency_contact_name', 'emergency_contact_rel', 'emergency_contact_phone'],
      3: ['username', 'password_hash', 'confirm_password', 'terms_accepted'],
    };

    const missingField = requiredFieldsByStep[currentStep].find((field) => {
      const value = formData[field];
      return value === '' || value === null || value === undefined || (field === 'terms_accepted' && !value);
    });

    if (missingField) {
      window.alert('Please fill in all required fields before continuing.');
      return;
    }

    if (currentStep === 3 && formData.password_hash !== formData.confirm_password) {
      window.alert('Passwords do not match.');
      return;
    }

    setCurrentStep((prev) => Math.min(prev + 1, 3));
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  /**
   * Upload the selected profile picture to Supabase storage bucket "profile-pictures".
   * Returns the public URL of the uploaded image, or null if no file was selected.
   */
  const uploadProfilePicture = async (file) => {
    if (!file) return null;

    const filePath = `avatars/${Date.now()}_${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from('profile-pictures')
      .upload(filePath, file);

    if (uploadError) {
      throw new Error(`Failed to upload profile picture: ${uploadError.message}`);
    }

    // Get the public URL of the uploaded file
    const { data: publicUrlData } = supabase.storage
      .from('profile-pictures')
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError('');

    if (!formData.terms_accepted) {
      window.alert('Please accept the terms before completing registration.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Step A: Upload profile picture to Supabase Storage if a file was selected
      let profilePictureUrl = null;
      if (formData.profile_picture instanceof File) {
        profilePictureUrl = await uploadProfilePicture(formData.profile_picture);
      }

      // Step B: Register via the backend API.
      // The backend uses the Supabase service role to create the auth user with
      // email_confirm=true, so no email confirmation is required.
      const response = await fetch(`${API_BASE_URL}/auth/register/patient`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Credentials
          username: formData.username,
          email: formData.email,
          password: formData.password_hash,
          terms_accepted: formData.terms_accepted,

          // Profile fields
          profile_picture_url: profilePictureUrl,
          first_name: formData.first_name,
          last_name: formData.last_name,
          date_of_birth: formData.date_of_birth,
          gender: formData.gender,
          phone_number: `${formData.phone_country_code}${formData.phone_number}`,
          national_id_passport: formData.national_id_passport,
          emergency_contact_name: formData.emergency_contact_name,
          emergency_contact_rel: formData.emergency_contact_rel,
          emergency_contact_phone: `${formData.emergency_contact_phone_country_code}${formData.emergency_contact_phone}`,
          alt_contact_phone: formData.alt_contact_phone || null,
          home_address: formData.home_address || null,
          blood_group: formData.blood_group || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle duplicate key violations (409) and other backend errors
        throw new Error(result.message || 'Registration failed. Please try again.');
      }

      // Success — redirect to login page
      window.alert('Registration completed successfully! You can now log in.');
      navigate('/login');
    } catch (error) {
      setSubmitError(error.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    if (currentStep === 1) {
      return <Step1PersonalInfo formData={formData} handleChange={handleChange} nextStep={handleNext} />;
    }

    if (currentStep === 2) {
      return <Step2EmergencyContact formData={formData} handleChange={handleChange} nextStep={handleNext} prevStep={handlePrev} />;
    }

    return (
      <Step3Credentials
        formData={formData}
        handleChange={handleChange}
        prevStep={handlePrev}
        isSubmitting={isSubmitting}
      />
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 py-10 px-4 sm:px-6 lg:px-8 dark:bg-slate-950">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-[32px] bg-white p-8 shadow-sm dark:bg-slate-900">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Patient Registration</h1>
            <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Please enter your details to create your medical portal account.
            </p>
          </div>

          <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {stepLabels.map((step, index) => {
              const stepNumber = index + 1;
              const isCompleted = currentStep > stepNumber;
              const isActive = currentStep === stepNumber;

              return (
                <div key={step.key} className="flex flex-1 items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold transition ${
                      isCompleted
                        ? 'border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
                        : isActive
                        ? 'border-cyan-500 bg-cyan-500 text-white'
                        : 'border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {isCompleted ? '✓' : stepNumber}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold uppercase tracking-[0.25em] ${isActive ? 'text-cyan-600' : 'text-slate-400'}`}>
                      {step.label}
                    </p>
                    <div className="h-0.5 w-full rounded-full bg-slate-200 mt-2" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Error banner */}
          {submitError && (
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
              <div className="flex items-start gap-3">
                <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                </svg>
                <span>{submitError}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {renderStep()}

            {currentStep === 3 && (
              <div className="mt-6 text-center text-sm text-slate-500">
                Already have an account?{' '}
                <a href="/login" className="font-semibold text-cyan-600 hover:text-cyan-700">
                  Log In
                </a>
              </div>
            )}
          </form>

          {currentStep !== 3 && (
            <div className="mt-6 text-center text-sm text-slate-500">
              Already have an account?{' '}
              <a href="/login" className="font-semibold text-cyan-600 hover:text-cyan-700">
                Log In
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}