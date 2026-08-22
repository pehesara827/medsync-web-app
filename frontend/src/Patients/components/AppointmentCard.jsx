
// Mock Data List

export default function AppointmentCard({ appointment, onGetQR }) {
  const handleGetQR = () => {
    if (onGetQR) {
      onGetQR(appointment);
    }
  };

  return (
    <div className="relative overflow-hidden w-full bg-white dark:bg-slate-900/90 rounded-2xl md:rounded-3xl p-4 md:p-7 border border-slate-200 dark:border-slate-800 shadow-[0_4px_20px_rgba(0,0,0,0.03),0_12px_32px_rgba(0,0,0,0.04)] select-none">
      
      {/* Top-Right Light Cyan Curved Badge - Responsive */}
      <div className="absolute top-0 right-0 w-32 md:w-44 h-20 md:h-28 bg-slate-100 dark:bg-slate-800/80 rounded-bl-[50px] md:rounded-bl-[100px] pointer-events-none flex flex-col items-end pt-3 md:pt-5 pr-4 md:pr-7">
        <span className="text-lg md:text-2xl font-bold text-slate-800 dark:text-cyan-300 tracking-tight leading-none">
          {appointment.day}
        </span>
        <span className="text-xs text-slate-500 dark:text-cyan-300 font-normal mt-1 md:mt-1.5">
          {appointment.time}
        </span>
      </div>

      {/* Main Content Body */}
      <div className="flex flex-col gap-1 pr-20 md:pr-36">
        
        {/* Status Pill Tag - uses badgeStatus for PENDING/CONFIRMED, raw status for others */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#dcf5fa] text-[#00b0d8] dark:bg-cyan-500/20 dark:text-cyan-300 text-xs font-semibold w-fit">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00b0d8]"></span>
          <span>{appointment.badgeStatus || appointment.status}</span>
        </div>

        {/* Doctor Name & Specialty */}
        <h2 className="text-xl md:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight mt-2 md:mt-2.5">
          {appointment.doctorName}
        </h2>
        <p className="text-[#00b0d8] text-xs md:text-sm font-medium">
          {appointment.specialty}
        </p>
      </div>

      {/* Horizontal Divider Line */}
      <div className="w-full h-[1px] bg-slate-100 dark:bg-slate-800 my-4 md:my-6" />

      {/* Card Footer: Doctor Info & Actions - Responsive Layout */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-0">
        
        {/* Left Side: Avatar & Details */}
        <div className="flex items-start md:items-center gap-3 md:gap-4 w-full md:w-auto">
          
          {/* Doctor Image */}
          <div className="w-12 md:w-14 h-12 md:h-14 rounded-lg md:rounded-xl overflow-hidden flex-shrink-0 border border-slate-200 dark:border-slate-800 shadow-sm bg-slate-50 dark:bg-slate-900/80 flex items-center justify-center">
            {appointment.doctorImage ? (
              <img
                src={appointment.doctorImage}
                alt={appointment.doctorName}
                className="w-full h-full object-cover"
              />
            ) : (
              <svg className="w-6 md:w-7 h-6 md:h-7 text-[#00b0d8] dark:text-cyan-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            )}
          </div>

          {/* Consultation Details */}
          <div className="flex flex-col gap-0.5 md:gap-1 min-w-0">
            
            {/* Sub-info: ID & Patients Ahead - Wraps on mobile */}
            <div className="flex items-center gap-2 md:gap-3.5 text-xs font-semibold flex-wrap">
              
              {/* ID Tag - Structured Display ID */}
              <span className="text-[#00b0d8] font-mono tracking-wider">
                {appointment.displayId || appointment.id}
              </span>

              {/* Patients Ahead Counter — only shown when patientsAhead is a number */}
              {appointment.patientsAhead !== null &&
                appointment.patientsAhead !== undefined && (
                <div className="flex items-center gap-1 md:gap-1.5 text-[#f0a04b]">
                  <svg className="w-3 md:w-4 h-3 md:h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className="text-xs md:text-sm">{appointment.patientsAhead} ahead</span>
                </div>
              )}

            </div>

          </div>
        </div>

        {/* Right Side: Action Button - Full width on mobile */}
        <button
          type="button"
          onClick={handleGetQR}
          className="w-full md:w-auto flex items-center justify-center md:justify-start gap-2 px-4 md:px-5 py-2.5 md:py-3 rounded-lg md:rounded-xl bg-[#00b0d8] hover:bg-[#009bbf] text-white text-xs md:text-sm font-semibold transition-all duration-150 shadow-[0_4px_12px_rgba(0,176,216,0.25)] active:scale-[0.98] flex-shrink-0"
        >
          <span className="hidden md:inline">Get QR</span>
          <span className="inline md:hidden">QR</span>
          
          {/* QR Code Icon */}
          <svg className="w-3 md:w-4 h-3 md:h-4 fill-current flex-shrink-0" viewBox="0 0 24 24">
            <path d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm13-2h3v2h-3v-2zm-3 0h2v3h-2v-3zm3 3h3v5h-2v-3h-1v-2zm-3 2h2v3h-2v-3zm0 3h5v2h-5v-2z" />
          </svg>
        </button>

      </div>
    </div>
  );
}
