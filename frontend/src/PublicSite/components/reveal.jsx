// src/PublicSite/components/reveal.jsx
import { useEffect, useRef, useState } from 'react';

const VARIANT_CLASSES = {
  up: '',
  down: 'reveal-down',
  left: 'reveal-left',
  right: 'reveal-right',
  scale: 'reveal-scale',
};

/**
 * Wraps its children and animates them into view the first time the wrapper
 * scrolls into the viewport. Uses the `.reveal` helper classes from
 * src/index.css so the motion stays consistent across the public pages.
 *
 * @param {object}  props
 * @param {number}  [props.delay=0]      Stagger delay in milliseconds.
 * @param {string}  [props.variant='up']  'up' | 'left' | 'right' | 'scale'.
 * @param {string}  [props.className='']  Extra classes for the wrapper (e.g. grid column spans).
 */
export default function Reveal({ children, className = '', delay = 0, variant = 'up' }) {
  const ref = useRef(null);
  // Browsers without IntersectionObserver render the content straight away.
  const [inView, setInView] = useState(() => typeof IntersectionObserver === 'undefined');

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.unobserve(node);
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const variantClass = VARIANT_CLASSES[variant] ?? '';
  const classes = ['reveal', variantClass, inView ? 'reveal-in' : '', className]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={ref}
      className={classes}
      style={{ transitionDelay: inView ? `${delay}ms` : '0ms' }}
    >
      {children}
    </div>
  );
}