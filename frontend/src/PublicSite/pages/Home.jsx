import { Link } from 'react-router-dom';
import PublicFooter from '../components/public-footer';
import heroImage from '../../assets/hero.png';

const serviceItems = [
  {
    title: 'General Medicine',
    description: 'Comprehensive routine checkups, preventive care, and management of chronic conditions.',
  },
  {
    title: 'Pediatrics',
    description: 'Specialized care for infants, children, and adolescents focusing on healthy growth.',
  },
  {
    title: 'Cardiology',
    description: 'Advanced diagnostics and treatment for heart and vascular health.',
  },
];

const specialists = [
  {
    name: 'Dr. James Wilson',
    role: 'Chief of Cardiology',
    description: '15+ years experience specializing in interventional cardiology and preventive care.',
  },
  {
    name: 'Dr. Sarah Chen',
    role: 'Lead Pediatrician',
    description: 'Dedicated to providing compassionate care for children from infancy through adolescence.',
  },
];

const testimonials = [
  {
    quote: 'The doctors at MedSync are truly compassionate. The glass-walled facility is beautiful and the care is top-notch.',
    author: 'Michael H.',
  },
  {
    quote: 'Easy booking and very professional staff. I felt heard and well cared for during my entire visit.',
    author: 'Emily L.',
  },
  {
    quote: 'A modern approach to healthcare. The technology they use is impressive, and the results speak for themselves.',
    author: 'David S.',
  },
];

export default function HomePage() {
  return (
    <div className="bg-[#f8fcfd] text-slate-900">
      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_45%)] px-6 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-12 lg:flex-row lg:items-center lg:gap-24">
          <div className="max-w-2xl space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-white/90 px-4 py-2 text-xs tracking-[0.2em] text-cyan-700 shadow-sm shadow-cyan-100/40">
              Accepting New Patients
            </div>
            <div className="space-y-6">
              <h1 className="text-4xl font-extrabold tracking-[-0.04em] text-slate-900 sm:text-5xl lg:text-6xl">
                Modern Care.
                <span className="block text-cyan-600">Built Around You.</span>
              </h1>
              <p className="max-w-xl text-lg leading-8 text-slate-600 sm:text-xl">
                Experience healthcare that integrates advanced technology with compassionate, personalized medical attention.
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link
                to="/signup"
                className="inline-flex items-center justify-center rounded-full bg-cyan-600 px-8 py-4 text-sm font-semibold text-white shadow-[0_18px_60px_-35px_rgba(0,168,204,0.7)] transition hover:bg-cyan-500"
              >
                Schedule a Doctor
              </Link>
              <Link
                to="/services"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-8 py-4 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
              >
                View Services
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl bg-white/95 px-5 py-6 shadow-xl shadow-slate-200/70">
                <p className="text-3xl font-bold text-slate-900">10+</p>
                <p className="mt-2 text-sm text-slate-500">Years Experience</p>
              </div>
              <div className="rounded-3xl bg-white/95 px-5 py-6 shadow-xl shadow-slate-200/70">
                <p className="text-3xl font-bold text-slate-900">50k+</p>
                <p className="mt-2 text-sm text-slate-500">Patients Treated</p>
              </div>
              <div className="rounded-3xl bg-white/95 px-5 py-6 shadow-xl shadow-slate-200/70">
                <p className="text-3xl font-bold text-slate-900">24/7</p>
                <p className="mt-2 text-sm text-slate-500">Emergency Support</p>
              </div>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl">
            <div className="rounded-[2rem] bg-white/80 p-6 shadow-2xl shadow-slate-300/40 backdrop-blur-xl sm:p-8 lg:p-10">
              <img
                src={heroImage}
                alt="MedSync healthcare facility"
                className="h-[360px] w-full rounded-[1.75rem] object-cover"
              />
              <div className="mt-6 flex items-center justify-between rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div>
                  <p className="text-sm text-slate-500">Top Rated Clinic</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">5.0 Rating</p>
                </div>
                <div className="flex items-center gap-1 text-cyan-600">★★★★★</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-8 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-[2rem] bg-white p-6 shadow-lg shadow-slate-200/50 sm:p-8">
            <div className="grid gap-8 md:grid-cols-3 md:divide-x md:divide-slate-200">
              <div className="flex items-center gap-4 md:pr-8">
                <div className="flex-shrink-0">
                  <svg className="h-8 w-8 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Main Campus</p>
                  <p className="text-base font-semibold text-slate-900">123 Health Ave, Medical District</p>
                </div>
              </div>

              <div className="flex items-center gap-4 md:px-8">
                <div className="flex-shrink-0">
                  <svg className="h-8 w-8 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Clinic Hours</p>
                  <p className="text-base font-semibold text-cyan-600">Mon-Fri: 8am - 8pm</p>
                </div>
              </div>

              <div className="flex items-center gap-4 md:pl-8">
                <div className="flex-shrink-0">
                  <svg className="h-8 w-8 text-red-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-slate-500">24/7 Emergency</p>
                  <p className="text-base font-semibold text-red-600">1-800-MED-SYNC</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-14 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-[2rem] bg-white p-8 shadow-xl shadow-slate-200/70 sm:p-10">
            <div className="space-y-8">
              <div className="text-center">
                <p className="text-sm uppercase tracking-[0.35em] text-cyan-600">Comprehensive Care Specialties</p>
                <h2 className="mt-4 text-3xl font-bold text-slate-900 sm:text-4xl">
                  Advanced medical departments equipped to handle all your health needs.
                </h2>
              </div>

              <div className="grid gap-5 sm:grid-cols-3">
                {serviceItems.map((service, index) => (
                  <article
                    key={service.title}
                    className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-6 text-slate-700 transition hover:-translate-y-1 hover:border-cyan-100 hover:shadow-lg"
                  >
                    <div className="mb-4 h-12 w-12 rounded-2xl bg-cyan-100 text-cyan-700 grid place-items-center">
                      {index === 0 && (
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      )}
                      {index === 1 && (
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      )}
                      {index === 2 && (
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      )}
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900">{service.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{service.description}</p>
                    <Link className="mt-6 inline-flex text-sm font-semibold text-cyan-600 hover:text-cyan-500" to="/services">
                      Learn more →
                    </Link>
                  </article>
                ))}
              </div>

              <div className="text-center">
                <Link
                  to="/services"
                  className="inline-flex items-center justify-center rounded-full bg-cyan-600 px-8 py-3 text-sm font-semibold text-white shadow-[0_18px_60px_-35px_rgba(0,168,204,0.7)] transition hover:bg-cyan-500"
                >
                  View All Services
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 pb-14 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl space-y-12">
          <div className="space-y-3 text-center">
            <p className="text-sm uppercase tracking-[0.35em] text-cyan-600">Meet Our Specialists</p>
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
              Expert medical professionals dedicated to your well-being.
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {specialists.map((specialist) => (
              <article key={specialist.name} className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-lg shadow-slate-200/70">
                <div className="flex items-start gap-4">
                  <div className="h-16 w-16 rounded-3xl bg-cyan-50 text-cyan-700 grid place-items-center text-2xl font-bold">
                    {specialist.name.split(' ').map((part) => part[0]).join('')}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">{specialist.name}</h3>
                    <p className="text-sm text-cyan-600">{specialist.role}</p>
                  </div>
                </div>
                <p className="mt-5 text-sm leading-7 text-slate-600">{specialist.description}</p>
                <button className="mt-6 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
                  Book Consultation
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-100 px-6 py-14 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-[2rem] bg-white p-8 shadow-xl shadow-slate-200/60 sm:p-10">
            <div className="space-y-3 text-center mb-8">
              <p className="text-sm uppercase tracking-[0.35em] text-cyan-600">Testimonials</p>
              <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
                What Our Patients Say
              </h2>
            </div>
            <div className="grid gap-10 lg:grid-cols-3">
              {testimonials.map((item) => (
                <blockquote key={item.author} className="rounded-[1.75rem] border border-slate-200 p-7 text-slate-700 shadow-sm">
                    <p className="text-lg leading-8">“{item.quote}”</p>
                  <footer className="mt-6 text-sm font-semibold text-slate-900">{item.author}</footer>
                </blockquote>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-14 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl rounded-[2rem] bg-gradient-to-r from-cyan-600 via-sky-500 to-cyan-500 px-8 py-14 text-white shadow-2xl shadow-cyan-400/20 sm:px-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm uppercase tracking-[0.35em] text-cyan-200">Trusted by Our Community</p>
              <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
                Your health deserves thoughtful technology and care.
              </h2>
            </div>
            <Link
              to="/contact"
              className="inline-flex w-full items-center justify-center rounded-full bg-white px-8 py-4 text-sm font-semibold text-cyan-700 transition hover:bg-slate-100 lg:w-auto"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
