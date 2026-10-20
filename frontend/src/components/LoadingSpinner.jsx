// src/components/LoadingSpinner.jsx
/**
 * Reusable loading spinner used across every page of the app.
 *
 * Props:
 *  - message:    Text shown next to the animated dots.
 *  - subtext:    Optional supporting line shown underneath.
 *  - fullscreen: When true (default) renders a fixed full-viewport overlay.
 *                When false renders a compact centered block that fits
 *                inside an already-rendered section (tabs, cards, etc.).
 */
export default function LoadingSpinner({
  message = 'Loading',
  subtext,
  fullscreen = true,
}) {
  // Compact variant — used inside sections/tabs that keep their chrome visible.
  if (!fullscreen) {
    return (
      <div className="flex w-full items-center justify-center py-16">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-14 w-14">
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-[#00b8e6]/20 border-t-[#00b8e6]"></div>
            <div className="absolute inset-1.5 animate-spin rounded-full border-4 border-[#00b8e6]/10 border-b-[#00b8e6] [animation-direction:reverse] [animation-duration:1.2s]"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <svg
                className="h-5 w-5 animate-pulse text-[#00b8e6]"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                viewBox="0 0 24 24"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-base font-semibold text-slate-600 dark:text-slate-200">{message}</span>
            <span className="flex gap-1">
              <span className="h-1 w-1 animate-bounce rounded-full bg-[#00b8e6] [animation-delay:0ms]"></span>
              <span className="h-1 w-1 animate-bounce rounded-full bg-[#00b8e6] [animation-delay:150ms]"></span>
              <span className="h-1 w-1 animate-bounce rounded-full bg-[#00b8e6] [animation-delay:300ms]"></span>
            </span>
          </div>

          {subtext && (
            <p className="text-xs font-medium text-slate-400 dark:text-slate-500">{subtext}</p>
          )}
        </div>
      </div>
    );
  }

  // Full-screen overlay variant — used while a whole page is loading.
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-[#f0fbff] via-white to-[#e6f7fa] dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
      <div className="flex flex-col items-center gap-6">
        {/* Animated Spinner Ring */}
        <div className="relative h-20 w-20">
          {/* Outer rotating ring */}
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-[#00b8e6]/20 border-t-[#00b8e6]"></div>
          {/* Inner pulsing ring */}
          <div className="absolute inset-2 animate-spin rounded-full border-4 border-[#00b8e6]/10 border-b-[#00b8e6] [animation-direction:reverse] [animation-duration:1.2s]"></div>
          {/* Center medical cross icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              className="h-8 w-8 animate-pulse text-[#00b8e6]"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              viewBox="0 0 24 24"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </div>
        </div>

        {/* Loading text with animated dots */}
        <div className="flex items-center gap-1.5">
          <span className="text-lg font-semibold text-slate-600 dark:text-slate-200">{message}</span>
          <span className="flex gap-1">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#00b8e6] [animation-delay:0ms]"></span>
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#00b8e6] [animation-delay:150ms]"></span>
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#00b8e6] [animation-delay:300ms]"></span>
          </span>
        </div>

        {/* Subtle subtext */}
        {subtext && (
          <p className="text-sm font-medium text-slate-400 dark:text-slate-500">{subtext}</p>
        )}
      </div>
    </div>
  );
}