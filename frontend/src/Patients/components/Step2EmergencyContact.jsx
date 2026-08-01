export default function Step2EmergencyContact({ formData, handleChange, nextStep, prevStep }) {
  return (
    <div className="space-y-8">
      <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
          Emergency Contact Information
        </p>

        <div className="mt-6 grid gap-4">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Full Name (Primary Contact)</span>
            <input
              name="emergency_contact_name"
              value={formData.emergency_contact_name || ''}
              onChange={handleChange}
              placeholder="e.g. Jane Doe"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Relationship to Patient</span>
              <select
                name="emergency_contact_rel"
                value={formData.emergency_contact_rel || ''}
                onChange={handleChange}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
              >
                <option value="">Select relationship</option>
                <option value="parent">Parent</option>
                <option value="spouse">Spouse</option>
                <option value="sibling">Sibling</option>
                <option value="friend">Friend</option>
                <option value="other">Other</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Mobile Number</span>
              <div className="flex flex-col gap-3 sm:flex-row">
                <select
                  name="emergency_contact_phone_country_code"
                  value={formData.emergency_contact_phone_country_code || '+1'}
                  onChange={handleChange}
                  className="w-full max-w-[130px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                >
                  <option value="+1">+1</option>
                  <option value="+44">+44</option>
                  <option value="+61">+61</option>
                  <option value="+91">+91</option>
                </select>
                <input
                  name="emergency_contact_phone"
                  value={formData.emergency_contact_phone || ''}
                  onChange={handleChange}
                  placeholder="(555) 000-0000"
                  className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                />
              </div>
            </label>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Alternative Contact Number <span className="text-slate-400">(Optional)</span></span>
            <input
              name="alt_contact_phone"
              value={formData.alt_contact_phone || ''}
              onChange={handleChange}
              placeholder="Secondary phone number"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Home Address <span className="text-slate-400">(Optional)</span></span>
            <textarea
              name="home_address"
              value={formData.home_address || ''}
              onChange={handleChange}
              rows="4"
              placeholder="Enter full address..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 resize-none"
            />
          </label>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={prevStep}
            className="inline-flex items-center justify-center rounded-2xl border border-cyan-500 px-6 py-3 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-50"
          >
            Back
          </button>

          <button
            type="button"
            onClick={nextStep}
            className="inline-flex items-center justify-center rounded-2xl bg-[#00A8CC] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-600"
          >
            Continue to Step 3
          </button>
        </div>
      </div>
    </div>
  );
}
