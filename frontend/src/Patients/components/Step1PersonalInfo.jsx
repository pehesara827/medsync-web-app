export default function Step1PersonalInfo({ formData, handleChange, nextStep }) {
  return (
    <div className="space-y-8">
      <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-28 w-28 items-center justify-center rounded-full border-2 border-dashed border-cyan-300 bg-slate-50 text-cyan-600">
            <span className="text-4xl font-bold">+</span>
          </div>
          <label className="inline-flex items-center gap-2 rounded-full border border-cyan-500 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-700 hover:bg-cyan-100 cursor-pointer">
            Upload Profile Picture
            <input
              type="file"
              name="profile_picture"
              accept="image/*"
              className="hidden"
              onChange={handleChange}
            />
          </label>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">First Name</span>
            <input
              name="first_name"
              value={formData.first_name || ''}
              onChange={handleChange}
              placeholder="e.g. Jane"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Last Name</span>
            <input
              name="last_name"
              value={formData.last_name || ''}
              onChange={handleChange}
              placeholder="e.g. Doe"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Date of Birth</span>
            <input
              name="date_of_birth"
              type="date"
              value={formData.date_of_birth || ''}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Gender Identity</span>
            <select
              name="gender"
              value={formData.gender || ''}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            >
              <option value="">Select gender...</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="non-binary">Non-binary</option>
              <option value="prefer-not-to-say">Prefer not to say</option>
            </select>
          </label>

          <label className="block sm:col-span-2">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Mobile Number</span>
            <div className="flex flex-col gap-3 sm:flex-row">
              <select
                name="phone_country_code"
                value={formData.phone_country_code || '+1'}
                onChange={handleChange}
                className="w-full max-w-[130px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
              >
                <option value="+1">+1</option>
                <option value="+44">+44</option>
                <option value="+61">+61</option>
                <option value="+91">+91</option>
              </select>
              <input
                name="phone_number"
                value={formData.phone_number || ''}
                onChange={handleChange}
                placeholder="(555) 000-0000"
                className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
              />
            </div>
          </label>

          <label className="block sm:col-span-2">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Email Address</span>
            <input
              name="email"
              type="email"
              value={formData.email || ''}
              onChange={handleChange}
              placeholder="name@example.com"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">National ID / Passport Number</span>
            <input
              name="national_id_passport"
              value={formData.national_id_passport || ''}
              onChange={handleChange}
              placeholder="Enter ID number"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            />
          </label>
        </div>

        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={nextStep}
            className="inline-flex items-center justify-center rounded-full bg-[#00A8CC] px-8 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-600"
          >
            Continue to Next Step
          </button>
        </div>
      </div>
    </div>
  );
}
