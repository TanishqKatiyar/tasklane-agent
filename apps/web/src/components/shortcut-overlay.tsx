"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";

import {
  SHORTCUT_SECTIONS,
  useShortcutOverlayState,
} from "@/hooks/use-global-shortcuts";

const isMac =
  typeof navigator !== "undefined" && /Mac/i.test(navigator.userAgent);

export function ShortcutOverlay() {
  const { open, setOpen } = useShortcutOverlayState();
  const overlayRef = useRef<HTMLDivElement>(null);

  // Trap focus + close on Esc
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Modal */}
          <motion.div
            ref={overlayRef}
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{
              duration: 0.25,
              ease: [0.16, 1, 0.3, 1],
            }}
            role="dialog"
            aria-label="Keyboard shortcuts"
            aria-modal="true"
            className="fixed inset-x-4 top-[10%] z-[101] mx-auto max-h-[80vh] max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl sm:inset-x-auto"
          >
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Keyboard Shortcuts</h2>
              <button
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label="Close shortcuts"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* 2-column grid */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {SHORTCUT_SECTIONS.map((section) => (
                <div key={section.title}>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {section.title}
                  </h3>
                  <div className="space-y-2">
                    {section.shortcuts.map((shortcut, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between py-1"
                      >
                        <span className="text-sm text-muted-foreground">
                          {shortcut.description}
                        </span>
                        <div className="flex items-center gap-1">
                          {shortcut.keys.map((key, ki) => (
                            <kbd
                              key={ki}
                              className="inline-flex h-6 min-w-[24px] items-center justify-center rounded border border-border bg-muted px-1.5 font-mono text-[11px] text-muted-foreground"
                            >
                              {key}
                            </kbd>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="mt-6 border-t border-border pt-4">
              <p className="text-center text-xs text-muted-foreground">
                Some shortcuts are platform-aware.{" "}
                {isMac ? "⌘" : "Ctrl"} on{" "}
                {isMac ? "Mac" : "Windows/Linux"}.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
