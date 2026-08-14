import { Link } from 'react-router-dom';

export default function PublicFooter() {
  return (
    <footer className="bg-slate-950 text-slate-100 pt-16 pb-10">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-3">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-cyan-400 to-sky-600 flex items-center justify-center text-white text-lg font-bold shadow-lg">
                M
              </div>
              <div>
                <p className="text-xl font-semibold">MedSync</p>
                <p className="text-slate-400 text-sm">Modern care built around you.</p>
              </div>
            </div>
            <p className="text-slate-400 text-sm leading-7">
              MedSync empowers patients with seamless, compassionate healthcare and a modern digital experience.
            </p>
          </div>

          <div>
            <p className="mb-4 text-sm uppercase tracking-[0.24em] text-slate-400">Quick Links</p>
            <ul className="space-y-3 text-slate-300 text-sm">
              <li>
                <Link to="/" className="transition hover:text-white">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/about" className="transition hover:text-white">
                  About
                </Link>
              </li>
              <li>
                <Link to="/services" className="transition hover:text-white">
                  Services
                </Link>
              </li>
              <li>
                <Link to="/contact" className="transition hover:text-white">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="mb-4 text-sm uppercase tracking-[0.24em] text-slate-400">Contact</p>
            <div className="space-y-3 text-sm text-slate-300">
              <p>123 Health Ave, Medical District</p>
              <p>Phone: 1-800-MED-SYNC</p>
              <p>Email: contact@medsync.com</p>
            </div>
            <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
              <p className="text-slate-200 font-semibold">Newsletter</p>
              <p className="text-slate-400 text-sm mt-2">Get updates on new health services and clinic news.</p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <input
                  type="email"
                  placeholder="Email address"
                  className="min-w-0 flex-1 rounded-full border border-slate-800 bg-slate-950/90 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                />
                <button className="rounded-full bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400">
                  Subscribe
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-12 pt-6 text-slate-500 text-sm text-center">
          © 2026 MedSync Healthcare Clinic. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
