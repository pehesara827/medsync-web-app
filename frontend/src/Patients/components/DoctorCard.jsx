
export default function DoctorCard({ doctor }) {
  if (!doctor) return null;

  return (
    <div className="w-[280px] bg-white rounded-2xl p-3.5 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03),0_12px_32px_rgba(0,0,0,0.04)] hover:shadow-lg transition-shadow duration-200 select-none flex flex-col gap-3">
      
      {/* Doctor Image Header */}
      <div className="w-full h-44 rounded-xl overflow-hidden bg-slate-100">
        <img
          src={doctor.image}
          alt={doctor.name}
          className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-300"
        />
      </div>

      {/* Doctor Details */}
      <div className="flex flex-col gap-1 px-1 pb-1">
        <h3 className="text-lg font-bold text-slate-800 tracking-tight leading-snug">
          {doctor.name}
        </h3>
        
        <p className="text-[#00b0d8] text-sm font-medium">
          {doctor.specialty}
        </p>

        {/* Rating and Reviews */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mt-1">
          {/* Orange Star Icon */}
          <svg className="w-4 h-4 text-[#f0a04b] fill-current" viewBox="0 0 24 24">
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
          </svg>
          
          <span>{doctor.rating.toFixed(1)}</span>
          <span>({doctor.reviewsCount} reviews)</span>
        </div>
      </div>

    </div>
  );
}