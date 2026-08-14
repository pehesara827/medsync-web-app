import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';

const NAV_LINKS = [
  { label: 'Home', path: '/' },
  { label: 'About', path: '/about' },
  { label: 'Services', path: '/services' },
  { label: 'Contact Us', path: '/contact' },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  const closeMenu = () => setIsOpen(false);

  return (
    <header className="w-full bg-[#f4fbfd] border-b border-slate-100 px-4 sm:px-6 md:px-8 py-4 shadow-sm select-none dark:bg-slate-950 dark:border-slate-700">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        
        {/* Brand / Logo */}
        <Link to="/" className="flex items-center gap-2.5 group flex-shrink-0">
          <div className="text-[#00a8cc]">
            {/* First-aid / Medical Briefcase Icon */}
            <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
              <path d="M19 7h-3V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zm-9-2h4v2h-4V5zm3 9h-2v2H11v-2H9v-2h2v-2h2v2h2v2z" />
            </svg>
          </div>
          <span className="text-[#007b8a] font-bold text-xl tracking-tight">
            MedSync
          </span>
        </Link>

        {/* Center Navigation Links - Desktop */}
        <nav aria-label="Header Navigation" className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.label}
              to={link.path}
              end={link.path === '/'}
              className={({ isActive }) =>
                `relative py-1 text-sm transition-colors duration-150 ${
                  isActive
                    ? 'text-[#007b8a] font-bold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-[#007b8a] font-medium'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span>{link.label}</span>
                  {/* Underline Indicator for Active Page */}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 w-full h-[2.5px] bg-[#007b8a] rounded-full" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Auth Buttons - Desktop */}
        <div className="hidden md:flex items-center gap-4">
          {/* Log In Button */}
          <Link
            to="/login"
            className="px-6 py-2 rounded-full border border-[#00a8cc]/40 text-[#007b8a] hover:bg-[#00a8cc]/10 text-xs font-bold tracking-wider uppercase transition-colors duration-150 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700/80"
          >
            LOG IN
          </Link>

          {/* Sign Up Button (Gradient + Soft Shadow) */}
          <Link
            to="/signup"
            className="px-6 py-2 rounded-full bg-gradient-to-r from-[#00b8e6] to-[#007b8a] text-white text-xs font-bold tracking-wider uppercase shadow-[0_4px_14px_rgba(0,168,204,0.35)] hover:opacity-95 transition-opacity duration-150"
          >
            SIGN UP
          </Link>
        </div>

        {/* Mobile: Hamburger + Compact Auth */}
        <div className="flex md:hidden items-center gap-2">
          <Link
            to="/login"
            className="px-4 py-1.5 rounded-full border border-[#00a8cc]/40 text-[#007b8a] text-[11px] font-bold tracking-wider uppercase dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700/80"
          >
            Log In
          </Link>
          <Link
            to="/signup"
            className="px-4 py-1.5 rounded-full bg-gradient-to-r from-[#00b8e6] to-[#007b8a] text-white text-[11px] font-bold tracking-wider uppercase"
          >
            Sign Up
          </Link>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
            aria-expanded={isOpen}
            className="p-2 rounded-lg text-[#007b8a] hover:bg-[#00a8cc]/10 transition-colors dark:text-slate-100 dark:hover:bg-slate-700/70"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              {isOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {isOpen && (
        <nav aria-label="Mobile Navigation" className="md:hidden mt-4 border-t border-slate-100 pt-3">
          <ul className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <li key={link.label}>
                <NavLink
                  to={link.path}
                  end={link.path === '/'}
                  onClick={closeMenu}
                  className={({ isActive }) =>
                    `block px-4 py-3 rounded-xl text-sm transition-colors duration-150 ${
                      isActive
                        ? 'bg-[#00a8cc]/10 text-[#007b8a] font-bold'
                        : 'text-slate-600 hover:bg-slate-100 font-medium dark:text-slate-300 dark:hover:bg-slate-800'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}