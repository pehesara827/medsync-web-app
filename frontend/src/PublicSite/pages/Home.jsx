import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import PublicFooter from '../components/public-footer';
import heroImage from '../../assets/hero.png';

function Reveal({ children, delay = 0, className = '' }) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.unobserve(node);
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${inView ? 'reveal-in' : ''} ${className}`}
      style={{ transitionDelay: inView ? `${delay}ms` : '0ms' }}
    >
      {children}
    </div>
  );
}

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
    image: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=200&h=200&q=80',
  },
  {
    name: 'Dr. Sarah Chen',
    role: 'Lead Pediatrician',
    description: 'Dedicated to providing compassionate care for children from infancy through adolescence.',
    image: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&w=200&h=200&q=80',
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
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="bg-[#f8fcfd] text-slate-900 overflow-x-hidden">
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(28px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes floatYSlow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes shimmer {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-40px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(40px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }

        .slide-in-left { animation: slideInLeft 0.8s ease-out both; }
        .slide-in-right { animation: slideInRight 0.8s ease-out both; }

        .floating-element {
          animation: floatYSlow 4s ease-in-out infinite;
        }
        .floating-element-delayed {
          animation: floatYSlow 5s ease-in-out infinite;
          animation-delay: 1s;
        }

        .reveal {
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.7s ease-out, transform 0.7s ease-out;
        }
        .reveal-in {
          opacity: 1;
          transform: translateY(0);
        }

        /* Enhanced Shining Border Cards */
        .shine-card {
          transition: transform 0.35s ease, box-shadow 0.35s ease, border-color 0.35s ease;
          position: relative;
          overflow: hidden;
          border-width: 2px;
          border-color: rgba(226, 232, 240, 0.8);
        }
        .shine-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(6, 182, 212, 0.35),
            transparent
          );
          transition: left 0.6s ease;
          pointer-events: none;
        }
        .shine-card:hover::before {
          left: 100%;
        }
        .shine-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 20px 40px rgba(8, 145, 178, 0.18);
          border-color: rgba(6, 182, 212, 0.6);
        }

        .cta-btn {
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }
        .cta-btn:hover {
          transform: translateY(-2px) scale(1.03);
          box-shadow: 0 12px 40px rgba(8, 145, 178, 0.4);
        }

        .cta-band {
          background-size: 200% 200%;
          animation: shimmer 8s ease-in-out infinite, gradientShift 15s ease infinite;
        }

        .parallax-bg {
          will-change: transform;
        }

        @media (prefers-reduced-motion: reduce) {
          .slide-in-left, .slide-in-right, .floating-element, .floating-element-delayed, .reveal, .cta-band {
            animation: none !important;
            transition: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>

      {/* Parallax Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="parallax-bg absolute top-20 left-10 w-32 h-32 bg-cyan-200/20 rounded-full blur-3xl"></div>
        <div className="parallax-bg absolute top-40 right-20 w-40 h-40 bg-sky-200/20 rounded-full blur-3xl" style={{ transform: `translateY(${scrollY * 0.2}px)` }}></div>
        <div className="parallax-bg absolute bottom-40 left-1/4 w-48 h-48 bg-cyan-100/15 rounded-full blur-3xl" style={{ transform: `translateY(${scrollY * 0.25}px)` }}></div>
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_45%)] px-6 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-12 lg:flex-row lg:items-center lg:gap-24">
          <div className="max-w-2xl space-y-8 slide-in-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-white/90 px-4 py-2 text-xs tracking-[0.2em] text-cyan-700 shadow-sm shadow-cyan-100/40">
              ✨ Accepting New Patients
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
                className="cta-btn inline-flex items-center justify-center rounded-full bg-cyan-600 px-8 py-4 text-sm font-semibold text-white shadow-[0_18px_60px_-35px_rgba(0,168,204,0.7)] transition hover:bg-cyan-500"
              >
                Schedule a Doctor
              </Link>
              <Link
                to="/services"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-8 py-4 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 hover:border-cyan-300"
              >
                View Services
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="shine-card rounded-3xl bg-white/95 px-5 py-6 shadow-xl shadow-slate-200/70">
                <p className="text-3xl font-bold text-slate-900">10+</p>
                <p className="mt-2 text-sm text-slate-500">Years Experience</p>
              </div>
              <div className="shine-card rounded-3xl bg-white/95 px-5 py-6 shadow-xl shadow-slate-200/70">
                <p className="text-3xl font-bold text-slate-900">50k+</p>
                <p className="mt-2 text-sm text-slate-500">Patients Treated</p>
              </div>
              <div className="shine-card rounded-3xl bg-white/95 px-5 py-6 shadow-xl shadow-slate-200/70">
                <p className="text-3xl font-bold text-slate-900">24/7</p>
                <p className="mt-2 text-sm text-slate-500">Emergency Support</p>
              </div>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl slide-in-right">
            <div className="rounded-[2rem] bg-white/80 p-6 shadow-2xl shadow-slate-300/40 backdrop-blur-xl sm:p-8 lg:p-10 relative">
              <img
                src={heroImage}
                alt="MedSync healthcare facility"
                className="h-[360px] w-full rounded-[1.75rem] object-cover"
              />
              <div className="floating-element absolute -top-4 -right-4 w-16 h-16 bg-cyan-500/20 rounded-full blur-xl pointer-events-none"></div>
              <div className="floating-element-delayed absolute -bottom-4 -left-4 w-20 h-20 bg-sky-500/15 rounded-full blur-xl pointer-events-none"></div>
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

      {/* Info Bar Section */}
      <section className="px-6 py-8 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <Reveal className="shine-card rounded-[2rem] bg-white p-6 shadow-lg shadow-slate-200/50 sm:p-8">
            <div className="grid gap-8 md:grid-cols-3 md:divide-x md:divide-slate-200">
              <div className="flex items-center gap-4 md:pr-8">
                <div className="flex-shrink-0 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-700">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
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
                <div className="flex-shrink-0 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-700">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Clinic Hours</p>
                  <p className="text-base font-semibold text-cyan-600">Mon-Fri: 8am - 8pm</p>
                </div>
              </div>

              <div className="flex items-center gap-4 md:pl-8">
                <div className="flex-shrink-0 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600">
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-slate-500">24/7 Emergency</p>
                  <p className="text-base font-semibold text-red-600">1-800-MED-SYNC</p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Services Section */}
      <section className="px-6 py-14 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <Reveal className="shine-card rounded-[2rem] bg-white p-8 shadow-xl shadow-slate-200/70 sm:p-10">
            <div className="space-y-8">
              <div className="text-center">
                <p className="text-sm uppercase tracking-[0.35em] text-cyan-600 font-semibold">Comprehensive Care Specialties</p>
                <h2 className="mt-4 text-3xl font-bold text-slate-900 sm:text-4xl">
                  Advanced medical departments equipped to handle all your health needs.
                </h2>
              </div>

              <div className="grid gap-6 sm:grid-cols-3">
                {serviceItems.map((service, index) => (
                  <Reveal key={service.title} delay={index * 150}>
                    <article className="shine-card rounded-[1.75rem] bg-slate-50 p-6 text-slate-700 h-full flex flex-col justify-between">
                      <div>
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
                      </div>
                      <Link className="mt-6 inline-flex text-sm font-semibold text-cyan-600 hover:text-cyan-500 items-center gap-1" to="/services">
                        Learn more <span>→</span>
                      </Link>
                    </article>
                  </Reveal>
                ))}
              </div>

              <div className="text-center pt-4">
                <Link
                  to="/services"
                  className="cta-btn inline-flex items-center justify-center rounded-full bg-cyan-600 px-8 py-3 text-sm font-semibold text-white shadow-[0_18px_60px_-35px_rgba(0,168,204,0.7)] transition hover:bg-cyan-500"
                >
                  View All Services
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Specialists Section */}
      <section className="px-6 pb-14 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl space-y-12">
          <Reveal className="space-y-3 text-center">
            <p className="text-sm uppercase tracking-[0.35em] text-cyan-600 font-semibold">Meet Our Specialists</p>
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
              Expert medical professionals dedicated to your well-being.
            </h2>
          </Reveal>

          <div className="grid gap-6 md:grid-cols-2">
            {specialists.map((specialist, idx) => (
              <Reveal key={specialist.name} delay={idx * 150}>
                <article className="shine-card rounded-[2rem] bg-white p-8 shadow-lg shadow-slate-200/70 h-full flex items-start gap-6">
                  <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-full shadow-lg border-2 border-cyan-100">
                    <img
                      src={specialist.image}
                      alt={specialist.name}
                      className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                    />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">{specialist.name}</h3>
                    <p className="text-xs font-bold tracking-wider text-cyan-600 mt-1">{specialist.role}</p>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{specialist.description}</p>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="px-6 py-14 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl space-y-12">
          <Reveal className="space-y-3 text-center">
            <p className="text-sm uppercase tracking-[0.35em] text-cyan-600 font-semibold">Patient Testimonials</p>
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
              What our patients say about their experience.
            </h2>
          </Reveal>

          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((t, idx) => (
              <Reveal key={t.author} delay={idx * 150}>
                <article className="shine-card rounded-[1.75rem] bg-white p-6 shadow-lg shadow-slate-200/50 h-full flex flex-col justify-between">
                  <p className="text-sm leading-7 text-slate-600 italic">"{t.quote}"</p>
                  <p className="mt-6 text-sm font-semibold text-cyan-700">— {t.author}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-14 sm:px-8 lg:px-10">
        <Reveal className="mx-auto max-w-7xl">
          <div className="cta-band rounded-[2rem] bg-slate-100 px-8 py-14 text-center shadow-xl shadow-slate-200/60 border border-cyan-100">
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">Ready to Take Control of Your Health?</h2>
            <p className="mt-4 text-base text-slate-600 max-w-xl mx-auto">
              Schedule your consultation with our world-class medical specialists today and experience seamless, patient-first care.
            </p>
            <Link
              to="/signup"
              className="cta-btn mt-8 inline-flex items-center justify-center rounded-full bg-cyan-600 px-8 py-4 text-sm font-bold text-white shadow-[0_18px_60px_-35px_rgba(0,168,204,0.7)] transition hover:bg-cyan-500"
            >
              BOOK AN APPOINTMENT
            </Link>
          </div>
        </Reveal>
      </section>

      <PublicFooter />
    </div>
  );
}