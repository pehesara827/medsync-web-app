import PublicFooter from '../components/public-footer';
import heroImage from '../../assets/hero.png';

export default function AboutPage() {
  return (
    <div className="bg-[#f8fcfd] text-slate-900">

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_45%)] px-6 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-[2rem] bg-white p-8 shadow-xl shadow-slate-200/70 sm:p-12 lg:p-16">
            <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 items-center">
              <div className="max-w-3xl">
                <h1 className="text-4xl font-extrabold tracking-[-0.04em] text-slate-900 sm:text-5xl lg:text-6xl">
                  About Us – Our Commitment to Your Health
                </h1>
                <p className="mt-6 text-lg leading-8 text-slate-600 sm:text-xl">
                  At MedSync, we blend advanced clinical intelligence with compassionate care.
                  Our transparent, patient-first approach ensures you are always informed and
                  comfortable throughout your healthcare journey.
                </p>
              </div>
              <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
                <div className="rounded-[2rem] overflow-hidden shadow-2xl shadow-slate-300/40">
                  <img
                    src={heroImage}
                    alt="MedSync healthcare facility"
                    className="h-[400px] w-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Vision and Mission Section */}
      <section className="px-6 py-8 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Our Vision */}
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-8 shadow-lg shadow-slate-200/50 transition hover:-translate-y-1 hover:border-cyan-100 hover:shadow-xl">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-700">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Our Vision</h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                To pioneer a new standard of healthcare where technological sophistication meets human empathy, creating a seamless and transparent healing environment for every patient.
              </p>
            </div>

            {/* Our Mission */}
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-8 shadow-lg shadow-slate-200/50 transition hover:-translate-y-1 hover:border-cyan-100 hover:shadow-xl">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-700">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Our Mission</h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                To deliver precision medical care with clarity and compassion. We strive to reduce patient anxiety through structured communication and high-performance clinical practices.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Leadership Team Section */}
      <section className="px-6 py-14 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="space-y-3 text-center">
            <p className="text-sm uppercase tracking-[0.35em] text-cyan-600">Leadership Team</p>
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
              Guided by experts dedicated to clinical excellence and innovation.
            </h2>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {/* Dr. Robert Chen */}
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-8 shadow-lg shadow-slate-200/50 transition hover:-translate-y-1 hover:border-cyan-100 hover:shadow-xl">
              <div className="flex items-start gap-6">
                <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-full">
                  <img
                    src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=200&h=200&q=80"
                    alt="Dr. Robert Chen"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">Dr. Robert Chen</h3>
                  <p className="text-sm font-semibold text-cyan-600">CHIEF MEDICAL OFFICER</p>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    With over 20 years in specialized care, Dr. Chen leads our medical board with a focus on patient safety and advanced diagnostic protocols.
                  </p>
                </div>
              </div>
            </div>

            {/* Dr. Sarah Jenkins */}
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-8 shadow-lg shadow-slate-200/50 transition hover:-translate-y-1 hover:border-cyan-100 hover:shadow-xl">
              <div className="flex items-start gap-6">
                <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-full">
                  <img
                    src="https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&w=200&h=200&q=80"
                    alt="Dr. Sarah Jenkins"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">Dr. Sarah Jenkins</h3>
                  <p className="text-sm font-semibold text-cyan-600">HEAD OF INNOVATION</p>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    Dr. Jenkins integrates cutting-edge health technology into daily practices, ensuring our facilities remain at the forefront of modern medicine.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-14 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-[2rem] bg-slate-100 px-8 py-14 text-center">
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">Ready to Meet Us?</h2>
            <p className="mt-4 text-base text-slate-600">
              Experience healthcare designed around transparency and precision. Schedule your consultation today.
            </p>
            <button className="mt-8 inline-flex items-center justify-center rounded-full bg-cyan-600 px-8 py-4 text-sm font-bold text-white shadow-[0_18px_60px_-35px_rgba(0,168,204,0.7)] transition hover:bg-cyan-500">
              BOOK AN APPOINTMENT
            </button>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}