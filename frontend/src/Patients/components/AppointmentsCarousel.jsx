import { useRef, useEffect, useState } from 'react';
import AppointmentCard from './AppointmentCard';
import { MOCK_APPOINTMENTS } from '../../MockData/mockAppoinmentData';

export default function AppointmentsCarousel() {
  const scrollContainerRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);

  // Auto-scroll logic with smooth loop
  useEffect(() => {
    if (isHovered) return;

    const interval = setInterval(() => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const cardWidth = container.firstElementChild?.clientWidth || 500;
      const gap = 24; // gap-6 in Tailwind
      const scrollAmount = cardWidth + gap;

      // Loop back to start if at the end
      if (container.scrollLeft + container.clientWidth >= container.scrollWidth - 10) {
        container.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
    }, 4000); // Transitions every 4 seconds

    return () => clearInterval(interval);
  }, [isHovered]);

  return (
    <section className="w-full overflow-hidden">
      {/* Scrollable Container with Inline Tailwind Scrollbar Hiding */}
      <div
        ref={scrollContainerRef}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="flex gap-6 overflow-x-auto scroll-smooth py-2 px-1 select-none [&::-webkit-scrollbar]:hidden [scrollbar-width:none] [-ms-overflow-style:none]"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {MOCK_APPOINTMENTS.map((item) => (
          <div
            key={item.id}
            className="flex-shrink-0 w-[520px] max-w-[85vw]"
            style={{ scrollSnapAlign: 'start' }}
          >
            <AppointmentCard appointment={item} />
          </div>
        ))}
      </div>
    </section>
  );
}