'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Animated count-up hook. Counts from 0 to `end` on first mount only.
 * @param end   Target number
 * @param duration  Animation duration in ms (default 600)
 */
export function useCountUp(end: number, duration = 600): number {
  const [value, setValue] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current || end === 0) {
      setValue(end);
      return;
    }
    hasAnimated.current = true;

    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * end));

      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    }

    requestAnimationFrame(tick);
  }, [end, duration]);

  return value;
}
