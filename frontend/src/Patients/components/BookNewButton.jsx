// src/components/BookNewAppointmentButton.jsx

export default function BookNewAppointmentButton({
  children = 'Book New Appointment',
  onClick,
  type = 'button',
  disabled = false,
  loading = false,
  className = '',
  ...props
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-2.5
        px-6 py-3.5 rounded-2xl
        bg-[#00b8e6] hover:bg-[#00a3cc] active:scale-[0.98]
        text-white font-semibold text-sm tracking-wide
        shadow-[0_8px_20px_rgba(0,184,230,0.35)]
        transition-all duration-200 ease-in-out
        disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-[#00b8e6] disabled:active:scale-100
        select-none
        ${className}
      `}
      {...props}
    >
      {loading ? (
        /* Loading Spinner */
        <svg
          className="animate-spin -ml-1 mr-1 h-5 w-5 text-white"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        /* Plus Icon */
        <svg
          className="w-5 h-5 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 4.5v15m7.5-7.5h-15"
          />
        </svg>
      )}

      <span>{children}</span>
    </button>
  );
}