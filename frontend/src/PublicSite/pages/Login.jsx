import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function LoginPage() {
  const [language, setLanguage] = useState('en');

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === 'en' ? 'si' : 'en'));
  };

  const content = {
    en: {
      medicalPortal: 'Medical Portal',
      securePatient: 'Secure patient login for appointments',
      welcomeBack: 'Welcome Back',
      signIn: 'Sign in to access your appointment dashboard.',
      identifierLabel: 'National ID, Email, or Mobile',
      identifierPlaceholder: 'e.g. 123456789V or name@example.com',
      passwordLabel: 'Password',
      passwordPlaceholder: 'Enter your password',
      rememberDevice: 'Remember this device',
      forgotPassword: 'Forgot Password?',
      loginButton: 'Log in to portal',
      quickLogin: 'or quick login with',
      mobileOtp: 'Sign in with Mobile OTP / Passkey',
      newPatient: 'New patient?',
      register: 'Register for an account',
      needHelp: 'Need Help?',
      healthConnected: 'Your Health, Connected.',
      headline: 'Manage appointments, track queue status in real time, and consult with top specialists.',
      description: 'Get fast access to your appointments, receive updates instantly, and keep your medical journey organized from a single secure portal.',
      hipaa: 'HIPAA & GDPR compliant with 256-bit encryption.',
      queueUpdates: 'Instant queue updates and appointment controls.',
    },
    si: {
      medicalPortal: 'වෛද්‍ය ද්වාරය',
      securePatient: 'පත්වීම් සඳහා ආරක්ෂිත රෝගී පිවිසුම',
      welcomeBack: 'ඔබව නැවත පිළිගනිමු',
      signIn: 'ඔබගේ පත්වීම් පුවරුවට ප්‍රවේශ වීමට පුරනය වන්න.',
      identifierLabel: 'ජාතික හැඳුනුම්පත, ඊමේල් හෝ ජංගම දුරකථන',
      identifierPlaceholder: 'උදා: 123456789V හෝ name@example.com',
      passwordLabel: 'මුරපදය',
      passwordPlaceholder: 'ඔබගේ මුරපදය ඇතුළත් කරන්න',
      rememberDevice: 'මෙම උපාංගය මතක තබා ගන්න',
      forgotPassword: 'මුරපදය අමතකද?',
      loginButton: 'ද්වාරයට පුරනය වන්න',
      quickLogin: 'හෝ වේගවත් පිවිසුමක්',
      mobileOtp: 'ජංගම OTP / Passkey සමඟ පුරනය වන්න',
      newPatient: 'අලුත් රෝගියෙක්ද?',
      register: 'ගිණුමක් ලියාපදිංචි කරන්න',
      needHelp: 'උදවු අවශ්‍යද?',
      healthConnected: 'ඔබේ සෞඛ්‍යය, සම්බන්ධිතයි.',
      headline: 'පත්වීම් කළමනාකරණය කරන්න, පෝලිම් තත්ත්වය තත්‍ය කාලීනව නිරීක්ෂණය කරන්න, සහ ප්‍රමුඛ විශේෂඥයින් සමඟ උපදේශනය කරන්න.',
      description: 'ඔබගේ පත්වීම් සඳහා ඉක්මන් ප්‍රවේශයක් ලබා ගන්න, ක්ෂණික යාවත්කාලීන ලබා ගන්න, සහ ඔබගේ වෛද්‍ය ගමන එක් ආරක්ෂිත ද්වාරයකින් සංවිධානය කර තබා ගන්න.',
      hipaa: 'HIPAA සහ GDPR අනුකූලතාව 256-bit ගුප්තකේතනය සමඟින්.',
      queueUpdates: 'ක්ෂණික පෝලිම් යාවත්කාලීන කිරීම් සහ පත්වීම් පාලන.',
    },
  };

  const t = content[language];

  return (
    <div className="min-h-screen bg-[#f3f8fb]">
      <div className="max-w-7xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
          <section className="w-full lg:w-1/2 rounded-[28px] bg-white/70 border border-slate-200 shadow-[0_24px_80px_rgba(15,23,42,0.08)] p-8 sm:p-10 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-[#00b8e6]/10 flex items-center justify-center text-[#00a8cc] shadow-sm">
                  <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current">
                    <path d="M19 7h-3V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zm-9-2h4v2h-4V5zm3 9h-2v2H11v-2H9v-2h2v-2h2v2h2v2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm uppercase tracking-[0.35em] text-slate-400">{t.medicalPortal}</p>
                  <p className="text-slate-600 text-sm">{t.securePatient}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <button
                  type="button"
                  onClick={toggleLanguage}
                  className="px-3 py-2 rounded-full bg-slate-100 font-medium text-slate-600 hover:bg-slate-200 transition cursor-pointer"
                >
                  {language === 'en' ? 'English' : 'සිංහල'}
                </button>
                <Link to="/" className="font-semibold text-[#007b8a] hover:text-[#005f71]">
                  {t.needHelp}
                </Link>
              </div>
            </div>

            <div className="mb-10">
              <h1 className="text-3xl font-semibold text-slate-900 sm:text-4xl">{t.welcomeBack}</h1>
              <p className="mt-3 text-slate-600">{t.signIn}</p>
            </div>

            <form className="space-y-5">
              <div>
                <label htmlFor="login-identifier" className="mb-2 block text-sm font-semibold text-slate-700">
                  {t.identifierLabel}
                </label>
                <input
                  id="login-identifier"
                  type="text"
                  placeholder={t.identifierPlaceholder}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm outline-none transition focus:border-[#00a8cc] focus:ring-2 focus:ring-[#00b8e6]/20"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="password" className="text-sm font-semibold text-slate-700">
                    {t.passwordLabel}
                  </label>
                  <button type="button" className="text-sm font-medium text-[#00a8cc] hover:text-[#007b8a]">
                    {t.forgotPassword}
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type="password"
                    placeholder={t.passwordPlaceholder}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm outline-none transition focus:border-[#00a8cc] focus:ring-2 focus:ring-[#00b8e6]/20"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-4">
                <label className="inline-flex items-center gap-2 text-sm text-slate-600">
                  <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-[#00a8cc] focus:ring-[#00b8e6]" />
                  {t.rememberDevice}
                </label>
              </div>

              <button
                type="submit"
                className="w-full rounded-2xl bg-[#00b8e6] px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white shadow-[0_16px_28px_rgba(0,168,230,0.25)] transition hover:opacity-95"
              >
                {t.loginButton}
              </button>
            </form>

            <div className="mt-8 text-center text-sm text-slate-500">{t.quickLogin}</div>
            <button
              type="button"
              className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-[#00a8cc] hover:text-[#007b8a]"
            >
              {t.mobileOtp}
            </button>

            <p className="mt-8 text-center text-sm text-slate-500">
              {t.newPatient}{' '}
              <Link to="/signup" className="font-semibold text-[#00a8cc] hover:text-[#007b8a]">
                {t.register}
              </Link>
            </p>
          </section>

          <section className="w-full lg:w-1/2 rounded-[32px] bg-[#0e5165] p-10 text-white shadow-[0_28px_90px_rgba(14,81,101,0.24)]">
            <div className="max-w-lg">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-200/70">{t.healthConnected}</p>
              <h2 className="mt-6 text-4xl font-semibold leading-tight sm:text-5xl">
                {t.headline}
              </h2>
              <p className="mt-6 text-sm leading-7 text-slate-200/90">
                {t.description}
              </p>

              <ul className="mt-10 space-y-4">
                <li className="flex items-start gap-4">
                  <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-cyan-100">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                    </svg>
                  </span>
                  <span className="text-sm leading-6 text-slate-200">{t.hipaa}</span>
                </li>
                <li className="flex items-start gap-4">
                  <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-cyan-100">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                    </svg>
                  </span>
                  <span className="text-sm leading-6 text-slate-200">{t.queueUpdates}</span>
                </li>
              </ul>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}