export default function LoadingSpinner({ message = 'Loading your dashboard' }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-[#f0fbff] via-white to-[#e6f7fa]">
      <div className="flex flex-col items-center gap-6">
        {/* Animated Spinner Ring */}
        <div className="relative w-20 h-20">
          {/* Outer rotating ring */}
          <div className="absolute inset-0 rounded-full border-4 border-[#00b8e6]/20 border-t-[#00b8e6] animate-spin"></div>
          {/* Inner pulsing ring */}
          <div className="absolute inset-2 rounded-full border-4 border-[#00b8e6]/10 border-b-[#00b8e6] animate-spin [animation-direction:reverse] [animation-duration:1.2s]"></div>
          {/* Center medical cross icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-[#00b8e6] animate-pulse"
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
          <span className="text-slate-600 font-semibold text-lg">{message}</span>
          <span className="flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00b8e6] animate-bounce [animation-delay:0ms]"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#00b8e6] animate-bounce [animation-delay:150ms]"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#00b8e6] animate-bounce [animation-delay:300ms]"></span>
          </span>
        </div>

        {/* Subtle subtext */}
        <p className="text-sm text-slate-400 font-medium">
          Fetching your latest appointments...
        </p>
      </div>
    </div>
  );
}