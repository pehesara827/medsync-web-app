import { useState } from 'react';

export default function Step3Credentials({ formData, handleChange, prevStep, isSubmitting }) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-8">
      <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">CREATE YOUR ACCOUNT CREDENTIALS</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-1">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Username / Portal Login ID</span>
              <input
                name="username"
                value={formData.username || ''}
                onChange={handleChange}
                placeholder="Enter desired username"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>

            <label className="block relative">
              <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Create Password</span>
              <input
                name="password_hash"
                type={showPassword ? 'text' : 'password'}
                value={formData.password_hash || ''}
                onChange={handleChange}
                placeholder="Minimum 8 characters"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-3 top-[52px] inline-flex items-center justify-center rounded-full p-1 text-slate-500 transition hover:text-slate-700"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.06 10.06 0 0 1 12 20c-5.52 0-10-4.48-10-10 0-1.56.34-3.04.94-4.36" />
                    <path d="M1 1l22 22" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Confirm Password</span>
              <input
                name="confirm_password"
                type={showPassword ? 'text' : 'password'}
                value={formData.confirm_password || ''}
                onChange={handleChange}
                placeholder="Re-enter password"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-4 text-sm font-semibold uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">
              TERMS OF SERVICE & DATA CONSENT
            </div>
            <div className="max-h-40 overflow-y-auto rounded-3xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <p>
                By registering for the Medical Portal, you consent to the secure storage and processing of your personal health information in accordance with HIPAA regulations. We employ 256-bit encryption to safeguard your data.
              </p>
              <p className="mt-3">
                Your information will only be shared with authorized healthcare providers involved in your care. You have the right to request access to or deletion of your data at any time.
              </p>
              <p className="mt-3">
                Please review the Terms of Service and Privacy Policy before completing registration.
              </p>
            </div>

            <label className="mt-5 inline-flex items-start gap-3 text-sm text-slate-700 dark:text-slate-200">
              <input
                type="checkbox"
                name="terms_accepted"
                checked={!!formData.terms_accepted}
                onChange={handleChange}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
              />
              <span className="leading-tight">
                I agree to the Medical Portal&apos;s Terms of Service and Privacy Policy.
              </span>
            </label>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={prevStep}
              className="inline-flex items-center justify-center rounded-2xl border border-cyan-500 px-6 py-3 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-50"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-2xl bg-[#00A8CC] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Submitting...
                </>
              ) : (
                'Complete Registration'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
