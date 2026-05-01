'use client';

import { useEffect } from 'react';

/**
 * Lightweight hook that tracks the visitor's pointer and writes
 * --cursor-x / --cursor-y CSS custom properties on the document root.
 *
 * Used by `.cursor-halo` and `.spotlight-row` CSS rules to
 * create a soft radial glow that follows the cursor.
 *
 * Mount once per page (idempotent — multiple mounts are harmless).
 */
export function useCursorPosition() {
  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      const xPct = (e.clientX / window.innerWidth) * 100;
      const yPct = (e.clientY / window.innerHeight) * 100;
      document.documentElement.style.setProperty('--cursor-x', `${xPct}%`);
      document.documentElement.style.setProperty('--cursor-y', `${yPct}%`);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
    };
  }, []);
}

/**
 * Invisible component wrapper — mount this where you used to mount
 * <CursorVfx /> to keep --cursor-x/y updates without the particle canvas.
 */
export function CursorTracker() {
  useCursorPosition();
  return null;
}
