'use client';

import { AnimatePresence, motion } from 'framer-motion';
import React, { useCallback, useEffect, useState } from 'react';

import { useAuthStore } from '@/lib/auth';
import { socket } from '@/lib/socket';
import { usePresenceStore } from '@/stores/presence-store';

interface PresenceLayerProps {
  projectId: string;
  view: string;
  children: React.ReactNode;
}

export function PresenceLayer({ projectId, view, children }: PresenceLayerProps) {
  const { user } = useAuthStore();
  const cursors = usePresenceStore((state) => state.cursors);
  const cleanupStaleCursors = usePresenceStore((state) => state.cleanupStaleCursors);

  const [containerRect, setContainerRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    // Cleanup interval for stale cursors
    const interval = setInterval(() => {
      cleanupStaleCursors(5000); // Remove after 5 seconds of inactivity
    }, 1000);
    return () => clearInterval(interval);
  }, [cleanupStaleCursors]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!user || !containerRect || !socket.connected) return;

      // Throttle to roughly 30fps could be done with a ref timestamp, but React synthetic events are already somewhat batched.
      // Let's add a simple throttle manually to avoid spamming the socket.
      const now = Date.now();
      // @ts-expect-error attaching a private throttle marker to the native event
      if (e.nativeEvent._lastEmit && now - e.nativeEvent._lastEmit < 30) return;
      // @ts-expect-error attaching a private throttle marker to the native event
      e.nativeEvent._lastEmit = now;

      const x = Math.max(0, Math.min(1, (e.clientX - containerRect.left) / containerRect.width));
      const y = Math.max(0, Math.min(1, (e.clientY - containerRect.top) / containerRect.height));

      socket.emit('cursor:move', {
        projectId,
        view,
        x,
        y,
      });
    },
    [user, containerRect, projectId, view],
  );

  // ── Stable ref callback — avoids infinite loop caused by calling setState
  // directly inside an inline ref (which fires on every render).
  const containerRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    // Set initial rect
    setContainerRect(node.getBoundingClientRect());
    // Keep in sync when the container resizes
    const ro = new ResizeObserver(() => {
      setContainerRect(node.getBoundingClientRect());
    });
    ro.observe(node);
    // ResizeObserver is self-cleaning when the node is removed
  }, []); // empty deps — only run on mount/unmount

  return (
    <div className="relative w-full h-full" onMouseMove={handleMouseMove} ref={containerRef}>
      {children}

      {/* Render Cursors */}
      {containerRect && (
        <AnimatePresence>
          {Array.from(cursors.values()).map((cursor) => {
            // Only show cursors in the same view
            if (cursor.view !== view || cursor.projectId !== projectId) return null;

            const px = cursor.x * containerRect.width;
            const py = cursor.y * containerRect.height;

            return (
              <motion.div
                key={cursor.userId}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, x: px, y: py }}
                exit={{ opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25, mass: 0.5 }}
                className="absolute top-0 left-0 pointer-events-none z-50 flex items-center justify-center"
                style={{ originX: 0, originY: 0 }}
              >
                <svg
                  width="24"
                  height="36"
                  viewBox="0 0 24 36"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="drop-shadow-md"
                >
                  <path
                    d="M5.65376 2.00038C4.5492 1.3411 3.125 2.13783 3.125 3.42416V29.5766C3.125 30.8629 4.5492 31.6597 5.65376 31.0004L27.4241 17.9242C28.4891 17.284 28.4891 15.7168 27.4241 15.0766L5.65376 2.00038Z"
                    fill="var(--primary)"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full ml-1 whitespace-nowrap drop-shadow-md shadow-black/20">
                  {/* Ideally we look up the user's name from a store, for now we just show ID or "Teammate" */}
                  User {cursor.userId.slice(0, 4)}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      )}
    </div>
  );
}
