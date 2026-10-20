import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  Stethoscope,
  Smile,
  HeartPulse,
  MapPin,
  Clock,
  Siren,
  Star,
  Hospital,
  Award,
  ShieldCheck,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import PublicFooter from '../components/public-footer';
import Reveal from '../components/reveal';
import heroImage from '../../assets/image.png';

const heroSlides = [
  { src: heroImage, alt: 'Medical team at MedSync' },
  { src: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=900', alt: 'Modern hospital facility' },
  { src: 'https://images.unsplash.com/photo-1538108149393-fbbd81895907?auto=format&fit=crop&q=80&w=900', alt: 'Patient consultation' },
];

const serviceItems = [
  {
    title: 'General Medicine',
    description: 'Comprehensive routine checkups, preventive care, and management of chronic conditions.',
    icon: Stethoscope,
  },
  {
    title: 'Pediatrics',
    description: 'Specialized, compassionate care for infants, children, and adolescents focusing on healthy growth.',
    icon: Smile,
  },
  {
    title: 'Cardiology',
    description: 'Advanced diagnostics and treatment for heart and vascular health using state-of-the-art technology.',
    icon: HeartPulse,
  },
];

const specialists = [
  {
    name: 'Dr. James Wilson',
    role: 'Chief of Cardiology',
    description: '15+ years experience specializing in interventional cardiology and preventive care.',
    imageUrl: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=300',
  },
  {
    name: 'Dr. Sarah Chen',
    role: 'Lead Pediatrician',
    description: 'Dedicated to providing compassionate care for children from infancy through adolescence.',
    imageUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300',
  },
  {
    name: 'Dr. Michael Roberts',
    role: 'Senior Neurologist',
    description: 'Specialized in treating complex neurological disorders with advanced diagnostic tools.',
    imageUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=300',
  },
  {
    name: 'Dr. Emily Watson',
    role: 'Dermatology Specialist',
    description: 'Expert in clinical dermatology, skin health maintenance, and advanced cosmetic procedures.',
    imageUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300',
  },
];

const patientReviews = [
  {
    quote: 'The doctors and staff are truly compassionate. The great medical facility is a beautiful and clean place to bring family.',
    author: 'Richard K.',
    role: 'Regular Patient',
  },
  {
    quote: 'Their efficiency and very professional staff made my visits and care cared for during my maternity checkup.',
    author: 'Emily L.',
    role: 'Maternity Care',
  },
  {
    quote: 'A modern approach to medicine. The technology they use is first-class, and the staff speaks for itself.',
    author: 'David R.',
    role: 'Cardiology Patient',
  },
];

function useCountUp(endValue, duration = 2000, trigger = true) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!trigger) return;
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      setCount(Math.floor(progress * endValue));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }, [endValue, duration, trigger]);

  return count;
}

export default function HomePage() {
  const [specialistIndex, setSpecialistIndex] = useState(0);
  const [slideIndex, setSlideIndex] = useState(0);
  const visibleSpecialistsCount = 2;

  const satCount = useCountUp(75, 2000);
  const deptCount = useCountUp(25, 2000);
  const expCount = useCountUp(10, 2000);
  const patientCount = useCountUp(50, 2000);

  useEffect(() => {
    const timer = setInterval(() => {
      setSlideIndex((i) => (i + 1) % heroSlides.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const handlePrevSpecialist = () => {
    setSpecialistIndex((prev) => (prev === 0 ? specialists.length - visibleSpecialistsCount : prev - 1));
  };

  const handleNextSpecialist = () => {
    setSpecialistIndex((prev) => (prev >= specialists.length - visibleSpecialistsCount ? 0 : prev + 1));
  };

  return (
    <div className="bg-[#f8fcfd] text-[#0D1C32] font-sans overflow-x-hidden">
      <style>{`
        .card {
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .card:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 30px -12px rgba(13, 28, 50, 0.15);
        }
        .btn {
          transition: transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
        }
        .btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px -6px rgba(13, 28, 50, 0.25);
        }
        .btn:active {
          transform: translateY(0);
        }
        .slide {
          transition: opacity 0.8s ease-in-out;
        }
      `}</style>

      {/* HERO */}
      <section className="px-6 py-14 sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-12 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl space-y-6">
            <div
              className="animate-fade-in-up inline-flex items-center gap-2 rounded-full border border-[#E4E2E4] bg-white px-4 py-1.5 text-xs font-semibold tracking-wide text-[#44474D]"
              style={{ animationDelay: '80ms' }}
            >
              Accepting New Patients
            </div>

            <h1
              className="animate-fade-in-up font-heading text-4xl font-bold tracking-tight text-[#0D1C32] sm:text-5xl lg:text-6xl leading-[1.15]"
              style={{ animationDelay: '180ms' }}
            >
              Modern Care.<br />
              Built Around You.
            </h1>
            <p
              className="animate-fade-in-up text-base text-[#44474D] sm:text-lg max-w-lg leading-relaxed"
              style={{ animationDelay: '280ms' }}
            >
              Experience healthcare that integrates advanced technology with compassionate, personalized medical attention.
            </p>

            <div
              className="animate-fade-in-up flex flex-col gap-4 sm:flex-row sm:items-center pt-2"
              style={{ animationDelay: '380ms' }}
            >
              <Link to="/contact" className="btn inline-flex items-center justify-center rounded-full bg-[#007b8a] px-8 py-4 text-sm font-semibold text-white hover:bg-[#00606c]">
                Book an Appointment
              </Link>
              <Link to="/about" className="btn inline-flex items-center justify-center rounded-full border border-[#E4E2E4] bg-white px-8 py-4 text-sm font-semibold text-[#0D1C32] hover:border-[#0D1C32]">
                Learn More About Us
              </Link>
            </div>

            <div
              className="animate-fade-in-up grid grid-cols-2 gap-6 pt-6"
              style={{ animationDelay: '480ms' }}
            >
              <div className="card bg-white rounded-2xl p-5 border border-[#E4E2E4]">
                <p className="font-heading text-3xl font-bold text-[#0D1C32]">{expCount}+</p>
                <p className="text-xs text-[#44474D] mt-1 font-semibold uppercase tracking-wider">Years Experience</p>
              </div>
              <div className="card bg-white rounded-2xl p-5 border border-[#E4E2E4]">
                <p className="font-heading text-3xl font-bold text-[#0D1C32]">{patientCount}K+</p>
                <p className="text-xs text-[#44474D] mt-1 font-semibold uppercase tracking-wider">Patients Treated</p>
              </div>
            </div>
          </div>

          {/* Hero slideshow */}
          <div
            className="animate-scale-in w-full max-w-lg mx-auto"
            style={{ animationDelay: '300ms' }}
          >
            <div className="relative rounded-3xl overflow-hidden bg-slate-100 border border-[#E4E2E4] shadow-lg">
              {heroSlides.map((slide, i) => (
                <img
                  key={i}
                  src={slide.src}
                  alt={slide.alt}
                  className={`slide h-[380px] w-full object-cover ${i === slideIndex ? 'opacity-100 relative' : 'opacity-0 absolute inset-0'}`}
                />
              ))}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {heroSlides.map((_, i) => (
                  <span key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === slideIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/50'}`} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* INFO STRIP */}
      <section className="px-6 py-6 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <Reveal className="bg-white rounded-2xl p-6 border border-[#E4E2E4] shadow-sm">
            <div className="grid gap-6 md:grid-cols-3 md:divide-x md:divide-[#E4E2E4]">
              <div className="flex items-center gap-4 md:pr-6">
                <div className="h-12 w-12 rounded-xl bg-[#007b8a]/10 text-[#007b8a] grid place-items-center flex-shrink-0">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#44474D] uppercase tracking-wider">Main Campus</p>
                  <p className="text-sm font-semibold text-[#0D1C32] mt-0.5">123 Health Ave, Medical District</p>
                </div>
              </div>
              <div className="flex items-center gap-4 md:px-6">
                <div className="h-12 w-12 rounded-xl bg-[#007b8a]/10 text-[#007b8a] grid place-items-center flex-shrink-0">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#44474D] uppercase tracking-wider">Clinic Hours</p>
                  <p className="text-sm font-semibold text-[#0D1C32] mt-0.5">Mon-Fri: 8am � 8pm</p>
                </div>
              </div>
              <div className="flex items-center gap-4 md:pl-6">
                <div className="h-12 w-12 rounded-xl bg-red-50 text-red-600 grid place-items-center flex-shrink-0">
                  <Siren className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-red-600 uppercase tracking-wider">24/7 Emergency</p>
                  <p className="text-sm font-semibold text-red-600 mt-0.5">1-800-MED-SYNC</p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* SERVICES */}
      <section className="px-6 py-14 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <Reveal className="max-w-2xl space-y-3 mb-10">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#007b8a]">Comprehensive Care Specialties</p>
            <h2 className="font-heading text-3xl font-bold text-[#0D1C32] sm:text-4xl">
              Advanced medical departments equipped to handle all your health needs.
            </h2>
          </Reveal>

          <div className="grid gap-8 sm:grid-cols-3">
            {serviceItems.map((service, index) => (
              <Reveal key={service.title} className="h-full" delay={index * 120}>
                <div className="card h-full bg-white rounded-2xl p-7 border border-[#E4E2E4] flex flex-col justify-between">
                  <div>
                    <div className="h-12 w-12 rounded-xl bg-[#007b8a]/10 text-[#007b8a] grid place-items-center mb-5">
                      <service.icon className="h-6 w-6" />
                    </div>
                    <h3 className="font-heading text-lg font-bold text-[#0D1C32]">{service.title}</h3>
                    <p className="mt-3 text-sm text-[#44474D] leading-relaxed">{service.description}</p>
                  </div>
                  <div className="mt-7 pt-4 border-t border-[#E4E2E4]">
                    <Link to="/about" className="inline-flex items-center gap-2 text-sm font-semibold text-[#007b8a] hover:text-[#00606c]">
                      Learn More <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal className="mt-10">
            <Link to="/about" className="btn inline-flex items-center justify-center rounded-full bg-[#007b8a] px-8 py-3.5 text-sm font-semibold text-white hover:bg-[#00606c]">
              Discover More About Us
            </Link>
          </Reveal>
        </div>
      </section>

      {/* SPECIALISTS */}
      <section className="px-6 py-14 sm:px-8 lg:px-10 bg-white/50">
        <div className="mx-auto max-w-7xl">
          <Reveal className="flex flex-col md:flex-row md:items-end md:justify-between mb-8">
            <div className="space-y-2 max-w-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#007b8a]">Meet Our Specialists</p>
              <h2 className="font-heading text-3xl font-bold text-[#0D1C32] sm:text-4xl">
                Expert medical professionals dedicated to your well-being.
              </h2>
            </div>
            <div className="flex items-center gap-3 mt-4 md:mt-0">
              <button onClick={handlePrevSpecialist} className="btn h-10 w-10 rounded-full border border-[#E4E2E4] bg-white text-[#0D1C32] grid place-items-center hover:border-[#0D1C32]" aria-label="Previous specialist">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={handleNextSpecialist} className="btn h-10 w-10 rounded-full border border-[#E4E2E4] bg-white text-[#0D1C32] grid place-items-center hover:border-[#0D1C32]" aria-label="Next specialist">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </Reveal>

          <div className="grid gap-8 md:grid-cols-2">
            {specialists.slice(specialistIndex, specialistIndex + visibleSpecialistsCount).map((specialist, index) => (
              <Reveal key={specialist.name} className="h-full" delay={index * 140}>
                <div className="card h-full bg-white rounded-2xl p-7 border border-[#E4E2E4] flex flex-col justify-between">
                  <div className="flex items-start gap-5">
                    <div className="h-16 w-16 rounded-xl overflow-hidden flex-shrink-0 border border-[#E4E2E4] bg-slate-100">
                      <img src={specialist.imageUrl} alt={specialist.name} className="h-full w-full object-cover" />
                    </div>
                    <div>
                      <h3 className="font-heading text-lg font-bold text-[#0D1C32]">{specialist.name}</h3>
                      <p className="text-xs font-semibold text-[#44474D] uppercase tracking-wider mt-0.5">{specialist.role}</p>
                      <p className="mt-3 text-sm text-[#44474D] leading-relaxed">{specialist.description}</p>
                    </div>
                  </div>
                  <div className="mt-7 pt-4 border-t border-[#E4E2E4]">
                    <Link to="/contact" className="btn w-full inline-flex items-center justify-center rounded-full bg-[#0D1C32] py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#007b8a]">
                      Book Consultation
                    </Link>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="px-6 py-14 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <Reveal className="max-w-2xl space-y-3 mb-10">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#007b8a]">Trusted by Our Community</p>
            <h2 className="font-heading text-3xl font-bold text-[#0D1C32] sm:text-4xl">
              Our commitment to excellence is reflected in the numbers and certifications we hold.
            </h2>
          </Reveal>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Reveal className="h-full">
              <div className="card h-full bg-white rounded-2xl p-6 border border-[#E4E2E4]">
                <div className="h-10 w-10 rounded-xl bg-[#007b8a]/10 text-[#007b8a] grid place-items-center mb-4">
                  <Star className="h-5 w-5" />
                </div>
                <p className="font-heading text-3xl font-bold text-[#0D1C32]">{satCount}%</p>
                <p className="text-xs font-semibold text-[#44474D] uppercase tracking-wider mt-1">Patient Satisfaction</p>
              </div>
            </Reveal>
            <Reveal className="h-full" delay={120}>
              <div className="card h-full bg-white rounded-2xl p-6 border border-[#E4E2E4]">
                <div className="h-10 w-10 rounded-xl bg-[#007b8a]/10 text-[#007b8a] grid place-items-center mb-4">
                  <Hospital className="h-5 w-5" />
                </div>
                <p className="font-heading text-3xl font-bold text-[#0D1C32]">{deptCount}+</p>
                <p className="text-xs font-semibold text-[#44474D] uppercase tracking-wider mt-1">Specialized Departments</p>
              </div>
            </Reveal>
            <Reveal className="h-full" delay={240}>
              <div className="card h-full bg-white rounded-2xl p-6 border border-[#E4E2E4]">
                <div className="h-10 w-10 rounded-xl bg-[#007b8a]/10 text-[#007b8a] grid place-items-center mb-4">
                  <Award className="h-5 w-5" />
                </div>
                <p className="font-heading text-xl font-bold text-[#00677F]">Award-Winning</p>
                <p className="text-xs font-semibold text-[#44474D] uppercase tracking-wider mt-1">Care Excellence</p>
              </div>
            </Reveal>
            <Reveal className="h-full" delay={360}>
              <div className="card h-full bg-white rounded-2xl p-6 border border-[#E4E2E4]">
                <div className="h-10 w-10 rounded-xl bg-[#007b8a]/10 text-[#007b8a] grid place-items-center mb-4">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <p className="font-heading text-xl font-bold text-[#00677F]">JCI Accredited</p>
                <p className="text-xs font-semibold text-[#44474D] uppercase tracking-wider mt-1">Facility</p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="px-6 py-14 sm:px-8 lg:px-10 bg-white/50">
        <div className="mx-auto max-w-7xl">
          <Reveal className="max-w-2xl space-y-3 mb-10">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#007b8a]">Testimonials</p>
            <h2 className="font-heading text-3xl font-bold text-[#0D1C32] sm:text-4xl">What Our Patients Say</h2>
          </Reveal>

          <div className="grid gap-8 md:grid-cols-3">
            {patientReviews.map((review, index) => (
              <Reveal key={review.author} className="h-full" delay={index * 130}>
                <div className="card h-full bg-white rounded-2xl p-7 border border-[#E4E2E4] flex flex-col justify-between">
                  <div>
                    <div className="flex gap-1 mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-[#d4a853] text-[#d4a853]" />
                      ))}
                    </div>
                    <p className="text-sm text-[#44474D] leading-relaxed">
                      &ldquo;{review.quote}&rdquo;
                    </p>
                  </div>
                  <div className="mt-7 pt-5 border-t border-[#E4E2E4]">
                    <p className="text-sm font-bold text-[#0D1C32]">{review.author}</p>
                    <p className="text-xs text-[#44474D] font-medium mt-0.5">{review.role}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA BAND */}
      <section className="px-6 py-14 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <Reveal className="rounded-3xl bg-[#00677F] px-8 py-12 sm:px-12 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl space-y-3">
              <h2 className="font-heading text-3xl font-bold sm:text-4xl tracking-tight leading-tight text-white">
                Your health deserves thoughtful technology and care.
              </h2>
              <p className="text-sm text-white/80 max-w-lg leading-relaxed">
                Book your appointment today or reach out to our dedicated support team for quick medical inquiries.
              </p>
            </div>
            <div>
              <Link to="/contact" className="btn inline-flex items-center justify-center gap-3 rounded-full bg-white px-8 py-4 text-sm font-semibold text-[#00677F] hover:bg-[#f8fcfd] lg:w-auto w-full">
                <span>Contact Us</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}