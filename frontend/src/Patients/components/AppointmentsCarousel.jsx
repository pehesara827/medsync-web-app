import { useRef, useEffect, useState } from 'react';
import AppointmentCard from './AppointmentCard';
import { MOCK_APPOINTMENTS } from '../../MockData/mockAppoinmentData';

export default function AppointmentsCarousel({
  appointments = MOCK_APPOINTMENTS,
  viewMode = 'grid', // 'grid' (horizontal carousel) or 'list' (vertical responsive grid)
  onGetQR,
}) {
  const scrollContainerRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);

  // Sort appointments so upcoming/scheduled ones appear first in the cluster.
  const sortedAppointments = [...appointments].sort((a, b) => {
    const getDisplayStatus = (item) => item.badgeStatus || item.status;
    const priority = (item) => {
      const status = getDisplayStatus(item);
      if (status === 'Upcoming') return 0;
      if (status === 'Scheduled') return 1;
      return 2;
    };
    return priority(a) - priority(b);
  });

  // Auto-scroll logic with smooth loop — only active in grid (carousel) mode
  useEffect(() => {
    if (viewMode === 'list') return; // No auto-scroll in list mode
    if (isHovered) return;
    if (!appointments || appointments.length <= 1) return;

    const interval = setInterval(() => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const cardWidth = container.firstElementChild?.clientWidth || 300;
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
  }, [isHovered, appointments, viewMode]);

  // ── List / Vertical mode ──────────────────────────────────────────────
  // Full-width responsive grid: 2 cards per row on desktop, 1 on mobile.
  // 4 upcoming cards → 2 rows of 2.
  if (viewMode === 'list') {
    return (
      <section className="w-full overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 select-none">
          {sortedAppointments.map((item) => (
            <div key={item.id}>
              <AppointmentCard appointment={item} onGetQR={onGetQR} />
            </div>
          ))}
        </div>
      </section>
    );
  }

  // ── Grid / Horizontal Carousel mode ─────────────────────────────────────
  return (
    <section className="w-full max-w-4xl overflow-hidden px-0 md:px-0">
      {/* Scrollable Container with Inline Tailwind Scrollbar Hiding */}
      <div
        ref={scrollContainerRef}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="flex gap-4 md:gap-6 overflow-x-auto scroll-smooth py-2 px-1 select-none [&::-webkit-scrollbar]:hidden [scrollbar-width:none] [-ms-overflow-style:none]"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {sortedAppointments.map((item) => (
          <div
            key={item.id}
            className="flex-shrink-0 w-full sm:w-96 md:w-[520px] max-w-[90vw] md:max-w-[85vw]"
            style={{ scrollSnapAlign: 'start' }}
          >
            <AppointmentCard appointment={item} onGetQR={onGetQR} />
          </div>
        ))}
      </div>
    </section>
  );
}
