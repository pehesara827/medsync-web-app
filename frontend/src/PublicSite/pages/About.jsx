import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import PublicFooter from '../components/public-footer';
import heroImage from '../../assets/hospital.png';

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

export default function AboutPage() {
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
        @keyframes floatY {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes floatYSlow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes pulseRing {
          0% { box-shadow: 0 0 0 0 rgba(8, 145, 178, 0.35); }
          70% { box-shadow: 0 0 0 10px rgba(8, 145, 178, 0); }
          100% { box-shadow: 0 0 0 0 rgba(8, 145, 178, 0); }
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

        .fade-in-up { animation: fadeInUp 0.8s ease-out both; }
        .fade-in { animation: fadeIn 1s ease-out 0.2s both; }
        .slide-in-left { animation: slideInLeft 0.8s ease-out both; }
        .slide-in-right { animation: slideInRight 0.8s ease-out both; }
        .scale-in { animation: scaleIn 0.7s ease-out both; }

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

        .vision-card, .mission-card, .leader-card {
          transition: transform 0.35s ease, box-shadow 0.35s ease, border-color 0.35s ease;
          position: relative;
          overflow: hidden;
        }
        .vision-card::before, .mission-card::before, .leader-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.3),
            transparent
          );
          transition: left 0.6s ease;
          pointer-events: none;
        }
        .vision-card:hover::before, .mission-card:hover::before, .leader-card:hover::before {
          left: 100%;
        }
        .vision-card:hover, .mission-card:hover, .leader-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 20px 40px rgba(8, 145, 178, 0.15);
          border-color: rgba(8, 145, 178, 0.3);
        }

        .icon-badge {
          transition: transform 0.4s ease;
        }
        .vision-card:hover .icon-badge, .mission-card:hover .icon-badge {
          transform: rotate(-8deg) scale(1.08);
        }

        .cta-btn {
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }
        .cta-btn:hover {
          transform: translateY(-2px) scale(1.03);
          box-shadow: 0 12px 40px rgba(8, 145, 178, 0.4);
        }

        .avatar-img {
          transition: transform 0.4s ease;
        }
        .leader-card:hover .avatar-img {
          transform: scale(1.05);
        }

        .cta-band {
          background-size: 200% 200%;
          animation: shimmer 8s ease-in-out infinite, gradientShift 15s ease infinite;
        }

        .parallax-bg {
          will-change: transform;
        }

        @media (prefers-reduced-motion: reduce) {
          .fade-in-up, .fade-in, .slide-in-left, .slide-in-right, .scale-in,
          .floating-element, .floating-element-delayed, .reveal, .cta-band {
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
        <div className="mx-auto max-w-7xl">
          <Reveal className="rounded-[2rem] bg-white p-8 shadow-xl shadow-slate-200/70 sm:p-12 lg:p-16">
            <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 items-center">
              <div className="max-w-3xl slide-in-left">
                <h1 className="text-4xl font-extrabold tracking-[-0.04em] text-slate-900 sm:text-5xl lg:text-6xl">
                  About Us – Our Commitment to Your Health
                </h1>
                <p className="mt-6 text-lg leading-8 text-slate-600 sm:text-xl">
                  At MedSync, we blend advanced clinical intelligence with compassionate care.
                  Our transparent, patient-first approach ensures you are always informed and
                  comfortable throughout your healthcare journey.
                </p>
              </div>
              <div className="relative mx-auto w-full max-w-lg lg:max-w-none slide-in-right">
                <div className="rounded-[2rem] overflow-hidden shadow-2xl shadow-slate-300/40 relative">
                  <img
                    src={heroImage}
                    alt="MedSync healthcare facility"
                    className="h-[400px] w-full object-cover"
                  />
                  <div className="floating-element absolute -top-4 -right-4 w-16 h-16 bg-cyan-500/20 rounded-full blur-xl"></div>
                  <div className="floating-element-delayed absolute -bottom-4 -left-4 w-20 h-20 bg-sky-500/15 rounded-full blur-xl"></div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Vision and Mission Section */}
      <section className="px-6 py-8 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Our Vision */}
            <Reveal delay={100}>
              <div className="vision-card rounded-[1.75rem] border border-slate-200 bg-white p-8 shadow-lg shadow-slate-200/50">
                <div className="icon-badge mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-700">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Our Vision</h2>
                <p className="mt-4 text-sm leading-7 text-slate-600"> To pioneer a new standard of healthcare where technological sophistication seamlessly meets human empathy, creating an interconnected, transparent, and empowering healing environment for every patient. We envision a future where advanced medical ecosystems break down traditional barriers between patients and providers, leveraging real-time data sync, intelligent diagnostics, and intuitive digital touchpoints to make world-class health management universally accessible, proactive, and deeply reassuring.
                </p>
              </div>
            </Reveal>

            {/* Our Mission */}
            <Reveal delay={250}>
              <div className="mission-card rounded-[1.75rem] border border-slate-200 bg-white p-8 shadow-lg shadow-slate-200/50">
                <div className="icon-badge mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-700">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Our Mission</h2>
                <p className="mt-4 text-sm leading-7 text-slate-600">  To deliver precision medical care defined by uncompromising clinical excellence, total clarity, and heartfelt compassion. We are dedicated to redefining the patient journey by eliminating uncertainty through structured, transparent communication, cutting-edge digital infrastructure, and high-performance clinical practices. By bridging the gap between innovative health technology and personalized human attention, we strive to reduce medical anxiety, optimize recovery outcomes, and empower individuals to take confident control of their lifelong well-being.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="px-6 py-14 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <Reveal className="space-y-3 text-center mb-12">
            <p className="text-sm uppercase tracking-[0.35em] text-cyan-600">Our Core Values</p>
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
              What drives us forward every day.
            </h2>
          </Reveal>

          <div className="grid gap-6 sm:grid-cols-3">
            <Reveal delay={100}>
              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 text-center shadow-lg shadow-slate-200/50 transition hover:-translate-y-1 hover:border-cyan-100 hover:shadow-xl">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-700">
                  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-900">Compassion</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Every patient is treated with empathy, dignity, and respect.
                </p>
              </div>
            </Reveal>

            <Reveal delay={200}>
              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 text-center shadow-lg shadow-slate-200/50 transition hover:-translate-y-1 hover:border-cyan-100 hover:shadow-xl">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-700">
                  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-900">Integrity</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Transparent communication and ethical practices in everything we do.
                </p>
              </div>
            </Reveal>

            <Reveal delay={300}>
              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 text-center shadow-lg shadow-slate-200/50 transition hover:-translate-y-1 hover:border-cyan-100 hover:shadow-xl">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-700">
                  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-900">Innovation</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Continuously advancing with cutting-edge medical technology.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Leadership Team Section */}
      <section className="px-6 py-14 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <Reveal className="space-y-3 text-center mb-12">
            <p className="text-sm uppercase tracking-[0.35em] text-cyan-600">Leadership Team</p>
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
              Guided by experts dedicated to clinical excellence and innovation.
            </h2>
          </Reveal>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {/* Dr. Robert Chen */}
            <Reveal delay={150}>
              <div className="leader-card rounded-[1.75rem] border border-slate-200 bg-white p-8 shadow-lg shadow-slate-200/50">
                <div className="flex items-start gap-6">
                  <div className="avatar-img h-24 w-24 flex-shrink-0 overflow-hidden rounded-full shadow-lg">
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
            </Reveal>

            {/* Dr. Sarah Jenkins */}
            <Reveal delay={300}>
              <div className="leader-card rounded-[1.75rem] border border-slate-200 bg-white p-8 shadow-lg shadow-slate-200/50">
                <div className="flex items-start gap-6">
                  <div className="avatar-img h-24 w-24 flex-shrink-0 overflow-hidden rounded-full shadow-lg">
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
            </Reveal>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="px-6 py-14 sm:px-8 lg:px-10">
        <Reveal className="mx-auto max-w-7xl">
          <div className="rounded-[2rem] bg-gradient-to-r from-cyan-600 via-sky-500 to-cyan-500 px-8 py-14 text-white shadow-2xl shadow-cyan-400/20 sm:px-10">
            <div className="grid gap-8 sm:grid-cols-3 text-center">
              <div>
                <p className="text-4xl font-bold">20+</p>
                <p className="mt-2 text-sm text-cyan-100">Years of Excellence</p>
              </div>
              <div>
                <p className="text-4xl font-bold">50k+</p>
                <p className="mt-2 text-sm text-cyan-100">Happy Patients</p>
              </div>
              <div>
                <p className="text-4xl font-bold">100+</p>
                <p className="mt-2 text-sm text-cyan-100">Expert Staff</p>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-14 sm:px-8 lg:px-10">
        <Reveal className="mx-auto max-w-7xl">
          <div className="cta-band rounded-[2rem] bg-slate-100 px-8 py-14 text-center shadow-xl shadow-slate-200/60">
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">Ready to Meet Us?</h2>
            <p className="mt-4 text-base text-slate-600">
              Experience healthcare designed around transparency and precision. Schedule your consultation today.
            </p>
            <Link
              to="/contact"
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