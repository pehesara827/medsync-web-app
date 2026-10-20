/**
 * MedSync — Single shared brand logo for the entire system.
 *
 * Canonical mark (taken from the public navbar):
 *  - Gradient tile: from #00b8e6 → #007b8a
 *  - White medical briefcase / first-aid icon
 *  - Bold "MedSync" wordmark + optional subtitle
 *
 * Use everywhere (public navbar + footer, auth pages,
 * admin / doctor / patient sidebars, receipts, passes).
 *
 * @param {Object} props
 * @param {'xs'|'sm'|'md'|'lg'|'xl'} [props.size='md'] - icon tile size
 * @param {boolean} [props.showText=true] - show "MedSync" wordmark
 * @param {string} [props.subtitle] - small caption under the wordmark
 * @param {'light'|'dark'|'auto'} [props.tone='auto'] - wordmark colour.
 *   'light' = white text (for dark backgrounds like footer),
 *   'dark'  = teal text, 'auto' = teal in light mode / white in dark mode.
 * @param {string} [props.className] - extra wrapper classes
 * @param {boolean} [props.iconOnly=false] - render just the tile (favicon-style)
 */
export function LogoMark({ size = 'md', className = '' }) {
  const tileSizes = {
    xs: 'h-7 w-7 rounded-lg [&_svg]:h-4 [&_svg]:w-4',
    sm: 'h-8 w-8 rounded-xl [&_svg]:h-[18px] [&_svg]:w-[18px]',
    md: 'h-9 w-9 rounded-xl [&_svg]:h-5 [&_svg]:w-5',
    lg: 'h-11 w-11 rounded-2xl [&_svg]:h-6 [&_svg]:w-6',
    xl: 'h-12 w-12 rounded-2xl [&_svg]:h-6 [&_svg]:w-6',
  };

  return (
    <div
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center bg-gradient-to-br from-[#00b8e6] to-[#007b8a] text-white shadow-sm ${tileSizes[size] || tileSizes.md} ${className}`}
    >
      {/* First-aid / Medical Briefcase Icon — the canonical MedSync mark */}
      <svg className="fill-current" viewBox="0 0 24 24">
        <path d="M19 7h-3V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zm-9-2h4v2h-4V5zm3 9h-2v2H11v-2H9v-2h2v-2h2v2h2v2z" />
      </svg>
    </div>
  );
}

export default function Logo({
  size = 'md',
  showText = true,
  subtitle,
  tone = 'auto',
  iconOnly = false,
  className = '',
  textClassName = '',
}) {
  const textTones = {
    dark: 'text-[#007b8a]',
    light: 'text-white',
    auto: 'text-[#007b8a] dark:text-slate-100',
  };

  const titleSizes = {
    xs: 'text-base',
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-2xl',
  };

  if (iconOnly) {
    return <LogoMark size={size} className={className} />;
  }

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      {showText && (
        <div className="flex min-w-0 flex-col leading-none">
          <span
            className={`font-bold tracking-tight ${titleSizes[size] || titleSizes.md} ${textTones[tone] || textTones.auto} ${textClassName}`}
          >
            MedSync
          </span>
          {subtitle && (
            <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400 dark:text-slate-400">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
