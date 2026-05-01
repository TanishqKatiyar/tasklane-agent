"use client";

import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
};

type Trail = { x: number; y: number; life: number };

type CursorVfxProps = {
  /** Override colors for the lines/particles. Provide rgb triplets like "28 15 9". */
  inkRgb?: string;
  accentRgb?: string;
  /** Ambient particle density multiplier. 1 = default. */
  density?: number;
  /** Optional className for sizing/positioning. */
  className?: string;
};

/**
 * Full-bleed canvas painting an ambient particle web that responds
 * to the visitor's pointer. Lightweight — pure 2D canvas, no WebGL.
 *
 * Mounts behind the UI, ignores pointer events itself, and syncs
 * --cursor-x / --cursor-y CSS variables on the root for use by halos.
 */
export function CursorVfx({
  inkRgb = "28 15 9",
  accentRgb = "214 52 38",
  density = 1,
  className,
}: CursorVfxProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const pointer = { x: -9999, y: -9999, active: false };
    const particles: Particle[] = [];
    const trail: Trail[] = [];

    const config = {
      maxDist: 130,
      trailFade: prefersReduced ? 0.16 : 0.07,
    };

    const setVars = (clientX: number, clientY: number) => {
      // Convert to viewport % so layouts can reference --cursor-x/y broadly.
      const xPct = (clientX / window.innerWidth) * 100;
      const yPct = (clientY / window.innerHeight) * 100;
      document.documentElement.style.setProperty("--cursor-x", `${xPct}%`);
      document.documentElement.style.setProperty("--cursor-y", `${yPct}%`);
    };

    const reseed = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      particles.length = 0;
      const area = w * h;
      const baseCount = prefersReduced ? 35 : 90;
      const count = Math.max(
        24,
        Math.min(Math.floor(baseCount * density), Math.floor(area / 14000)),
      );
      for (let i = 0; i < count; i += 1) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.45,
          vy: (Math.random() - 0.5) * 0.45,
          r: Math.random() * 1.6 + 0.5,
        });
      }
    };

    let frame = 0;
    const step = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;

      // Soft fade for trail persistence
      ctx.fillStyle = `rgb(244 235 217 / 0.18)`;
      ctx.fillRect(0, 0, w, h);

      // Move particles
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x <= 0 || p.x >= w) p.vx *= -1;
        if (p.y <= 0 || p.y >= h) p.vy *= -1;
      }

      // Connect close particles
      for (let i = 0; i < particles.length; i += 1) {
        const a = particles[i];
        if (!a) continue;
        for (let j = i + 1; j < particles.length; j += 1) {
          const b = particles[j];
          if (!b) continue;
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          if (dist < config.maxDist) {
            const alpha = 0.16 - dist / 1100;
            ctx.strokeStyle = `rgb(${inkRgb} / ${Math.max(0, alpha)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // Threads to cursor
      if (pointer.active) {
        for (const p of particles) {
          const dx = p.x - pointer.x;
          const dy = p.y - pointer.y;
          const dist = Math.hypot(dx, dy);
          if (dist < config.maxDist + 80) {
            const alpha = 0.32 - dist / 600;
            ctx.strokeStyle = `rgb(${accentRgb} / ${Math.max(0, alpha)})`;
            ctx.lineWidth = 1.1;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(pointer.x, pointer.y);
            ctx.stroke();
          }
        }

        trail.push({ x: pointer.x, y: pointer.y, life: 1 });
      }

      // Decay trail
      for (let i = trail.length - 1; i >= 0; i -= 1) {
        const t = trail[i];
        if (!t) continue;
        t.life -= config.trailFade;
        if (t.life <= 0) trail.splice(i, 1);
      }

      // Draw trail polyline
      if (trail.length > 1) {
        const head = trail[0];
        if (head) {
          ctx.beginPath();
          ctx.moveTo(head.x, head.y);
          for (let i = 1; i < trail.length; i += 1) {
            const t = trail[i];
            if (t) ctx.lineTo(t.x, t.y);
          }
          ctx.strokeStyle = `rgb(${accentRgb} / 0.4)`;
          ctx.lineWidth = 1.6;
          ctx.stroke();
        }
      }

      // Particle dots
      for (const p of particles) {
        ctx.fillStyle = `rgb(${inkRgb} / 0.55)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      frame = requestAnimationFrame(step);
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.active = true;
      setVars(e.clientX, e.clientY);
    };

    const onPointerLeave = () => {
      pointer.active = false;
    };

    const onResize = () => reseed();

    reseed();
    frame = requestAnimationFrame(step);

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerleave", onPointerLeave);
    window.addEventListener("blur", onPointerLeave);
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("blur", onPointerLeave);
      window.removeEventListener("resize", onResize);
    };
  }, [inkRgb, accentRgb, density]);

  return (
    <canvas
      ref={canvasRef}
      className={className ?? "cinematic-canvas"}
      aria-hidden="true"
    />
  );
}
