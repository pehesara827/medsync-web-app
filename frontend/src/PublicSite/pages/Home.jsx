import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import PublicFooter from '../components/public-footer';
import heroImage from '../../assets/image.png';



const serviceItems = [
  {
    title: 'General Medicine',
    description: 'Comprehensive routine checkups, preventive care, and management of chronic conditions.',
    icon: '🩺',
  },
  {
    title: 'Pediatrics',
    description: 'Specialized, compassionate care for infants, children, and adolescents focusing on healthy growth.',
    icon: '🧸',
  },
  {
    title: 'Cardiology',
    description: 'Advanced diagnostics and treatment for heart and vascular health using state-of-the-art technology.',
    icon: '❤️',
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
    quote: "The doctors and staff are truly compassionate. The great medical facility is a beautiful and clean place to bring family.",
    author: "Richard K.",
    role: "Regular Patient"
  },
  {
    quote: "Their efficiency and very professional staff made my visits and care cared for during my maternity checkup.",
    author: "Emily L.",
    role: "Maternity Care"
  },
  {
    quote: "A modern approach to medicine. The technology they use is first-class, and the staff speaks for itself.",
    author: "David R.",
    role: "Cardiology Patient"
  }
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
  const visibleSpecialistsCount = 2;

  const satCount = useCountUp(75, 2000);
  const deptCount = useCountUp(25, 2000);
  const expCount = useCountUp(10, 2000);
  const patientCount = useCountUp(50, 2000);

  const handlePrevSpecialist = () => {
    setSpecialistIndex((prev) => (prev === 0 ? specialists.length - visibleSpecialistsCount : prev - 1));
  };

  const handleNextSpecialist = () => {
    setSpecialistIndex((prev) => (prev >= specialists.length - visibleSpecialistsCount ? 0 : prev + 1));
  };

  return (
    <div className="bg-[#f8fcfd] text-[#0D1C32] font-sans selection:bg-[#00CCF9] selection:text-white overflow-x-hidden">
      
      {/* Custom Styles for Advanced Microinteractions, Glow Borders, Mesh Gradients & Smooth Transitions */}
      <style>{`
        @keyframes floatSlow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 25px rgba(0, 204, 249, 0.35), inset 0 0 15px rgba(0, 204, 249, 0.15); }
          50% { box-shadow: 0 0 45px rgba(0, 204, 249, 0.7), inset 0 0 25px rgba(0, 204, 249, 0.3); }
        }
        @keyframes meshMove {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes iconBounce {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-5px) rotate(3deg); }
        }
        .animate-float {
          animation: floatSlow 4s ease-in-out infinite;
        }
        .animate-mesh {
          animation: meshMove 8s ease-in-out infinite;
        }
        .glow-box-shining {
          animation: pulseGlow 3s infinite ease-in-out;
          border: 2px solid rgba(0, 204, 249, 0.6);
        }
        .service-card-reveal {
          animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .wow-card {
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.3s ease;
        }
        .wow-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 25px 50px -12px rgba(0, 204, 249, 0.25);
          border-color: rgba(0, 204, 249, 0.6);
        }
        .wow-card:hover .service-icon {
          animation: iconBounce 1s ease-in-out infinite;
        }
        .interactive-btn {
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s ease, background-color 0.25s ease;
        }
        .interactive-btn:hover {
          transform: translateY(-3px) scale(1.02);
          box-shadow: 0 12px 25px -5px rgba(0, 204, 249, 0.5);
        }
        .interactive-btn:active {
          transform: translateY(0);
        }
      `}</style>

      
      <section className="px-6 py-12 sm:px-8 lg:px-10 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] bg-[#00CCF9]/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="mx-auto flex max-w-7xl flex-col gap-12 lg:flex-row lg:items-center lg:justify-between relative z-10">
          <div className="max-w-2xl space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#00CCF9]/40 bg-[#00CCF9]/15 px-4 py-1.5 text-xs font-bold tracking-wider text-[#00677F] shadow-sm">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[#00CCF9] animate-ping"></span>
              Accepting New Patients
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight text-[#0D1C32] sm:text-5xl lg:text-6xl leading-[1.15]">
              Modern Care.<br />
              <span className="text-[#00CCF9] drop-shadow-sm">Built Around You.</span>
            </h1>
            <p className="text-base text-[#44474D] sm:text-lg max-w-lg leading-relaxed">
              Experience healthcare that integrates advanced technology with compassionate, personalized medical attention.
            </p>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center pt-2">
              <Link
                to="/contact"
                className="interactive-btn inline-flex items-center justify-center rounded-full bg-[#00CCF9] px-8 py-4 text-sm font-bold text-white shadow-lg hover:bg-[#00677F]"
              >
                Schedule a Doctor +
              </Link>
              <Link
                to="/services"
                className="interactive-btn inline-flex items-center justify-center rounded-full border-2 border-[#E4E2E4] bg-white px-8 py-4 text-sm font-bold text-[#0D1C32] hover:bg-[#E4E2E4]/30 hover:border-[#00CCF9]"
              >
                View Services
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-6 pt-6">
              <div className="wow-card bg-white rounded-[2rem] p-5 border border-[#E4E2E4] shadow-sm">
                <p className="text-3xl font-extrabold text-[#0D1C32]">{expCount}+</p>
                <p className="text-xs text-[#44474D] mt-1 font-semibold uppercase tracking-wider">Years Experience</p>
              </div>
              <div className="wow-card bg-white rounded-[2rem] p-5 border border-[#E4E2E4] shadow-sm">
                <p className="text-3xl font-extrabold text-[#0D1C32]">{patientCount}K+</p>
                <p className="text-xs text-[#44474D] mt-1 font-semibold uppercase tracking-wider">Patients Treated</p>
              </div>
            </div>
          </div>

          <div className="w-full max-w-lg mx-auto">
            <div className="wow-card bg-white rounded-[2.5rem] p-6 border-2 border-[#00CCF9]/30 shadow-2xl animate-float">
              <img
                src={heroImage}
                alt="Medical staff"
                className="h-[340px] w-full rounded-[2rem] object-cover"
              />
              <div className="mt-4 flex items-center justify-between rounded-2xl bg-[#00CCF9]/10 p-4 border border-[#00CCF9]/30">
                <div>
                  <p className="text-xs font-bold text-[#00677F] uppercase tracking-wider">Top Rated Clinic</p>
                  <p className="text-base font-extrabold text-[#0D1C32]">5.0 Rating</p>
                </div>
                <div className="flex text-[#00CCF9] text-base drop-shadow">★★★★★</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      
      <section className="px-6 py-8 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="glow-box-shining bg-white rounded-[2.5rem] p-8 shadow-2xl transition-all duration-500">
            <div className="grid gap-8 md:grid-cols-3 md:divide-x-2 md:divide-[#00CCF9]/20">
              
              <div className="flex items-center gap-5 md:pr-6 group">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-[#00CCF9] to-[#00677F] text-white grid place-items-center text-xl flex-shrink-0 shadow-md transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
                  📍
                </div>
                <div>
                  <p className="text-xs font-bold text-[#00677F] uppercase tracking-wider">Main Campus</p>
                  <p className="text-base font-black text-[#0D1C32] mt-0.5">123 Health Ave, Medical District</p>
                </div>
              </div>

              <div className="flex items-center gap-5 md:px-6 group">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-[#00CCF9] to-[#00677F] text-white grid place-items-center text-xl flex-shrink-0 shadow-md transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
                  🕒
                </div>
                <div>
                  <p className="text-xs font-bold text-[#00677F] uppercase tracking-wider">Clinic Hours</p>
                  <p className="text-base font-black text-[#0D1C32] mt-0.5">Mon-Fri: 8am - 8pm</p>
                </div>
              </div>

              <div className="flex items-center gap-5 md:pl-6 group">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-red-500 to-red-600 text-white grid place-items-center text-xl flex-shrink-0 shadow-md transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
                  ➕
                </div>
                <div>
                  <p className="text-xs font-bold text-red-600 uppercase tracking-wider">24/7 Emergency</p>
                  <p className="text-base font-black text-red-600 mt-0.5">1-800-MED-SYNC</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

    
      <section className="px-6 py-12 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="text-center max-w-2xl mx-auto space-y-3 service-card-reveal">
            <p className="text-xs font-extrabold uppercase tracking-[0.3em] text-[#00677F]">Comprehensive Care Specialties</p>
            <h2 className="text-3xl font-extrabold text-[#0D1C32] sm:text-4xl">
              Advanced medical departments equipped to handle all your health needs.
            </h2>
          </div>

          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            {serviceItems.map((service, idx) => (
              <div 
                key={service.title} 
                className="wow-card service-card-reveal bg-white rounded-[2.2rem] p-8 border-2 border-[#E4E2E4] shadow-lg flex flex-col justify-between group relative overflow-hidden"
                style={{ animationDelay: `${idx * 0.15}s` }}
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#00CCF9] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                <div>
                  <div className="service-icon h-16 w-16 rounded-2xl bg-gradient-to-tr from-[#00CCF9] to-[#00677F] text-white grid place-items-center text-2xl shadow-md mb-6 transition-all duration-300">
                    {service.icon}
                  </div>
                  <h3 className="text-xl font-bold text-[#0D1C32] group-hover:text-[#00CCF9] transition-colors">{service.title}</h3>
                  <p className="mt-3 text-sm text-[#44474D] leading-relaxed">{service.description}</p>
                </div>

                <div className="mt-8 pt-4 border-t border-[#E4E2E4]/80">
                  <Link to="/services" className="inline-flex items-center gap-2 text-sm font-bold text-[#00CCF9] hover:text-[#00677F] transition-colors">
                    LEARN MORE <span className="transition-transform duration-300 group-hover:translate-x-2">→</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link
              to="/services"
              className="interactive-btn inline-flex items-center justify-center rounded-full bg-[#00CCF9] px-9 py-4 text-sm font-bold text-white shadow-xl hover:bg-[#00677F]"
            >
              View All Services
            </Link>
          </div>
        </div>
      </section>

      
      <section className="px-6 py-12 sm:px-8 lg:px-10 bg-white/40">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-10">
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#00677F]">Meet Our Specialists</p>
              <h2 className="text-3xl font-extrabold text-[#0D1C32] sm:text-4xl">
                Expert medical professionals dedicated to your well-being.
              </h2>
            </div>
            <div className="flex items-center gap-3 mt-4 md:mt-0">
              <button
                onClick={handlePrevSpecialist}
                className="interactive-btn h-10 w-10 rounded-full border border-[#E4E2E4] bg-white text-[#0D1C32] grid place-items-center hover:bg-[#00CCF9] hover:text-white hover:border-[#00CCF9] shadow-sm"
                aria-label="Previous specialist"
              >
                &lt;
              </button>
              <button
                onClick={handleNextSpecialist}
                className="interactive-btn h-10 w-10 rounded-full border border-[#E4E2E4] bg-white text-[#0D1C32] grid place-items-center hover:bg-[#00CCF9] hover:text-white hover:border-[#00CCF9] shadow-sm"
                aria-label="Next specialist"
              >
                &gt;
              </button>
            </div>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            {specialists.slice(specialistIndex, specialistIndex + visibleSpecialistsCount).map((specialist) => (
              <div key={specialist.name} className="wow-card bg-white rounded-[2rem] p-8 border border-[#E4E2E4] shadow-sm flex flex-col justify-between group">
                <div className="flex items-start gap-6">
                  <div className="h-20 w-20 rounded-2xl overflow-hidden flex-shrink-0 shadow-md border border-[#E4E2E4] bg-slate-100">
                    <img
                      src={specialist.imageUrl}
                      alt={specialist.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[#0D1C32] group-hover:text-[#00CCF9] transition-colors">{specialist.name}</h3>
                    <p className="text-xs font-bold text-[#00677F] uppercase tracking-wider mt-0.5">{specialist.role}</p>
                    <p className="mt-3 text-sm text-[#44474D] leading-relaxed">{specialist.description}</p>
                  </div>
                </div>
                <div className="mt-8 pt-4 border-t border-[#E4E2E4]">
                  <Link to="/contact" className="interactive-btn w-full inline-flex items-center justify-center rounded-full bg-[#0D1C32] py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#00CCF9]">
                    Book Consultation
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

    
      <section className="px-6 py-12 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl text-center space-y-12">
          <div className="max-w-2xl mx-auto space-y-3">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#00677F]">Trusted by Our Community</p>
            <h2 className="text-3xl font-extrabold text-[#0D1C32] sm:text-4xl">
              Our commitment to excellence is reflected in the numbers and certifications we hold.
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            
            <div className="wow-card bg-white rounded-[2rem] p-6 border border-[#E4E2E4] text-center shadow-sm group">
              <div className="h-12 w-12 rounded-2xl bg-[#00CCF9]/10 text-[#00CCF9] grid place-items-center mx-auto mb-4 text-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
                ⭐
              </div>
              <p className="text-3xl font-black text-[#0D1C32]">{satCount}%</p>
              <p className="text-xs font-semibold text-[#44474D] uppercase tracking-wider mt-1">Patient Satisfaction</p>
            </div>

            <div className="wow-card bg-white rounded-[2rem] p-6 border border-[#E4E2E4] text-center shadow-sm group">
              <div className="h-12 w-12 rounded-2xl bg-[#00CCF9]/10 text-[#00CCF9] grid place-items-center mx-auto mb-4 text-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
                🏥
              </div>
              <p className="text-3xl font-black text-[#0D1C32]">{deptCount}+</p>
              <p className="text-xs font-semibold text-[#44474D] uppercase tracking-wider mt-1">Specialized Departments</p>
            </div>

            <div className="wow-card bg-white rounded-[2rem] p-6 border border-[#E4E2E4] text-center shadow-sm group">
              <div className="h-12 w-12 rounded-2xl bg-[#00CCF9]/10 text-[#00CCF9] grid place-items-center mx-auto mb-4 text-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
                🏆
              </div>
              <p className="text-xl font-black text-[#00677F] mt-1">Award-Winning</p>
              <p className="text-xs font-semibold text-[#44474D] uppercase tracking-wider mt-1">Care Excellence</p>
            </div>

            <div className="wow-card bg-white rounded-[2rem] p-6 border border-[#E4E2E4] text-center shadow-sm group">
              <div className="h-12 w-12 rounded-2xl bg-[#00CCF9]/10 text-[#00CCF9] grid place-items-center mx-auto mb-4 text-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
                🛡️
              </div>
              <p className="text-xl font-black text-[#00677F] mt-1">JCI Accredited</p>
              <p className="text-xs font-semibold text-[#44474D] uppercase tracking-wider mt-1">Facility</p>
            </div>

          </div>
        </div>
      </section>

     
      <section className="px-6 py-16 sm:px-8 lg:px-10 bg-gradient-to-b from-transparent via-[#00CCF9]/5 to-transparent relative">
        <div className="mx-auto max-w-7xl space-y-12">
          
          <div className="text-center space-y-3">
            <span className="inline-block px-4 py-1.5 rounded-full bg-[#00CCF9]/10 text-[#00677F] text-xs font-extrabold uppercase tracking-[0.25em] border border-[#00CCF9]/30">
              Testimonials
            </span>
            <h2 className="text-3xl font-extrabold text-[#0D1C32] sm:text-4xl">What Our Patients Say</h2>
            <p className="text-sm text-[#44474D] max-w-md mx-auto">Real stories and heartfelt reviews from families who trust our medical care.</p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {patientReviews.map((review, idx) => (
              <div 
                key={review.author} 
                className="wow-card bg-white/80 backdrop-blur-md rounded-[2.5rem] p-8 border border-[#00CCF9]/30 shadow-xl flex flex-col justify-between relative overflow-hidden group"
                style={{ animationDelay: `${idx * 0.15}s` }}
              >
               
                <div className="absolute -right-12 -top-12 w-32 h-32 bg-[#00CCF9]/10 rounded-full blur-2xl group-hover:bg-[#00CCF9]/20 transition-all duration-500"></div>

                <div>
                  
                  <div className="absolute top-6 right-8 text-5xl font-serif text-[#00CCF9]/20 group-hover:text-[#00CCF9]/40 transition-colors pointer-events-none">
                    “
                  </div>

                  <div className="flex text-[#00CCF9] mb-4 text-base space-x-1 drop-shadow-sm">
                    <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
                  </div>
                  
                  <p className="text-sm text-[#44474D] italic leading-relaxed relative z-10">
                    &ldquo;{review.quote}&rdquo;
                  </p>
                </div>

                <div className="mt-8 pt-4 border-t border-[#00CCF9]/20 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-[#0D1C32] group-hover:text-[#00677F] transition-colors">{review.author}</p>
                    <p className="text-xs text-[#00677F] font-semibold mt-0.5">{review.role}</p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-[#00CCF9]/10 text-[#00CCF9] grid place-items-center text-xs font-bold group-hover:scale-110 transition-transform">
                    ✓
                  </div>
                </div>

              </div>
            ))}
          </div>

        </div>
      </section>

    
      <section className="px-6 py-14 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-[2.5rem] bg-gradient-to-r from-[#00677F] via-[#00CCF9] to-[#004d61] bg-[length:200%_200%] animate-mesh px-8 py-14 text-white shadow-2xl sm:px-12 relative overflow-hidden border border-[#00CCF9]/50">
            
            {/* Background glowing design elements */}
            <div className="absolute -right-10 -bottom-10 w-56 h-56 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
            <div className="absolute -left-10 -top-10 w-56 h-56 bg-black/10 rounded-full blur-2xl pointer-events-none"></div>

            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between relative z-10">
              
              <div className="max-w-2xl space-y-4">
                <span className="inline-block px-3.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold uppercase tracking-[0.25em]">
                  Trusted by Our Community
                </span>
                <h2 className="text-3xl font-extrabold sm:text-4xl tracking-tight leading-tight text-white drop-shadow-sm">
                  Your health deserves thoughtful technology and care.
                </h2>
                <p className="text-sm text-white/90 max-w-lg leading-relaxed">
                  Book your appointment today or reach out to our dedicated support team for quick medical inquiries.
                </p>
              </div>

              <div>
                <Link
                  to="/contact"
                  className="interactive-btn inline-flex w-full items-center justify-center gap-3 rounded-full bg-white px-9 py-4 text-sm font-extrabold text-[#00677F] shadow-xl hover:bg-[#f8fcfd] lg:w-auto group"
                >
                  <span>Contact Us</span>
                  <span className="transition-transform duration-300 group-hover:translate-x-1.5">→</span>
                </Link>
              </div>

            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}