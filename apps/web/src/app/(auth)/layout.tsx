import type { Metadata } from 'next';

import { CursorTracker } from '@/components/cinematic/cursor-tracker';
import { GooDefs } from '@/components/cinematic/goo-defs';

export const metadata: Metadata = {
  title: 'Authentication',
};

const TICKER_ITEMS = [
  'Built for teams that ship',
  '12,400 tasks closed this week',
  'Zero-config realtime',
  'Trusted by 240+ studios',
  'Keyboard-first, by design',
  'p95 latency · 84ms',
  'Plays nicely with your stack',
  'Editorial calm · operator speed',
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="paper p-grain relative min-h-screen overflow-hidden bg-background text-foreground">
      <GooDefs />

      {/* ── Cinematic backdrop layers ── */}
      <CursorTracker />

      <div className="cursor-halo cursor-halo--soft" aria-hidden />

      {/* Goo blob field — soft warm shapes */}
      <div className="paper-blobs" aria-hidden>
        <span
          className="paper-blobs__node paper-blobs__node--a"
          style={{
            top: '-6%',
            left: '-4%',
            width: '46vw',
            height: '46vw',
            background:
              'radial-gradient(circle at 30% 30%, rgb(214 52 38 / 0.30), rgb(214 52 38 / 0))',
          }}
        />
        <span
          className="paper-blobs__node paper-blobs__node--b"
          style={{
            bottom: '-12%',
            right: '-8%',
            width: '52vw',
            height: '52vw',
            background:
              'radial-gradient(circle at 50% 50%, rgb(232 184 64 / 0.32), rgb(232 184 64 / 0))',
          }}
        />
        <span
          className="paper-blobs__node paper-blobs__node--c"
          style={{
            top: '30%',
            left: '40%',
            width: '30vw',
            height: '30vw',
            background:
              'radial-gradient(circle at 50% 50%, rgb(107 155 201 / 0.20), rgb(107 155 201 / 0))',
          }}
        />
      </div>

      {/* Faint dotted blueprint */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.55]"
        style={{
          backgroundImage: 'radial-gradient(rgb(28 15 9 / 0.08) 1px, transparent 1px)',
          backgroundSize: '26px 26px',
        }}
      />

      {/* ── Editorial frame ── */}
      <div className="relative z-10 grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
        {/* ── Left hero ── */}
        <div className="relative hidden flex-col justify-between overflow-hidden px-10 py-10 lg:flex xl:px-14">
          {/* Top brand */}
          <div className="relative z-10 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-2xl"
                style={{
                  background: 'transparent',
                  color: 'var(--p-accent)',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <text
                    x="50%"
                    y="50%"
                    dy=".35em"
                    textAnchor="middle"
                    fontFamily="monospace"
                    fontSize="20"
                    fontWeight="bold"
                  >
                    ;)
                  </text>
                </svg>
              </div>
              <div className="flex flex-col leading-none">
                <span
                  className="p-display text-[22px] tracking-tight"
                  style={{ color: 'var(--p-ink)' }}
                >
                  Tasklane
                </span>
                <span className="mt-1 p-edge-tag">Studio · Edition 04</span>
              </div>
            </div>

            <div className="text-right p-edge-tag">
              <div className="flex items-center justify-end gap-2">
                <span className="live-dot" />
                <span style={{ color: 'var(--p-accent)' }}>Live</span>
              </div>
              <div className="mt-1 opacity-70">#TLN-2026 · 47.49°N / 19.04°E</div>
            </div>
          </div>

          {/* Centerpiece */}
          <div className="relative z-10 max-w-[640px]">
            <div className="mb-7 flex items-center gap-3 p-edge-tag animate-rise">
              <span className="p-section-no">/ 00</span>
              <span>The Workshop</span>
              <span className="h-px w-16 bg-[var(--p-rule)]" />
              <span className="opacity-70">Vol. 04 · Issue 07</span>
            </div>

            <h1
              className="p-display text-[clamp(60px,8.4vw,124px)] leading-[0.92] tracking-tight"
              style={{ color: 'var(--p-ink)' }}
            >
              Built for the
              <br />
              work that{' '}
              <span className="ink-sweep italic" style={{ color: 'var(--p-accent)' }}>
                actually
              </span>
              <br />
              matters.
            </h1>

            <p
              className="mt-7 max-w-[480px] text-[15px] leading-relaxed animate-rise-3"
              style={{ color: 'var(--p-ink-muted)' }}
            >
              Tasklane is a calm, opinionated workspace for teams who treat shipping as a craft. No
              bloat, no AI-generated noise — just the tools that disappear into the rhythm of your
              day.
            </p>

            {/* Pull quote */}
            <figure className="relative mt-10 max-w-[500px] animate-rise-4">
              <span className="sigil">&ldquo;</span>
              <blockquote
                className="font-display-italic inline align-middle text-[22px] leading-[1.35]"
                style={{ color: 'var(--p-ink)' }}
              >
                We replaced four tools with Tasklane and somehow our weeks got quieter. That&apos;s
                the part nobody markets.
              </blockquote>
              <figcaption
                className="mt-4 flex items-center gap-3 text-[12px]"
                style={{ color: 'var(--p-ink-soft)' }}
              >
                <span className="font-medium" style={{ color: 'var(--p-ink)' }}>
                  Alice Johnson
                </span>
                <span className="h-px w-6" style={{ background: 'var(--p-rule)' }} />
                <span>Product Lead, Acme Studio</span>
              </figcaption>
            </figure>
          </div>

          {/* Bottom marquees + meta */}
          <div className="relative z-10 mt-10 space-y-5">
            <div className="flex items-end justify-between p-edge-tag">
              <span>№ 0042 · A field guide to focused work</span>
              <span className="opacity-60">Press ⌘K to begin</span>
            </div>

            <div
              className="ticker-mask overflow-hidden border-y py-3"
              style={{ borderColor: 'var(--p-rule)' }}
            >
              <div
                className="ticker-track p-mono"
                style={{
                  fontSize: 11,
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: 'var(--p-ink-soft)',
                }}
              >
                {[...TICKER_ITEMS, ...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
                  <span key={i} className="inline-flex items-center gap-3">
                    <span
                      className="inline-block h-1 w-1 rounded-full"
                      style={{ background: 'var(--p-accent)' }}
                    />
                    {item}
                    <span
                      style={{
                        color: 'var(--p-ink-softer)',
                        margin: '0 0.4rem',
                      }}
                    >
                      ◆
                    </span>
                  </span>
                ))}
              </div>
            </div>

            <div className="ticker-mask overflow-hidden" style={{ borderColor: 'var(--p-rule)' }}>
              <div
                className="ticker-track ticker-track--rev p-mono"
                style={{
                  fontSize: 10,
                  letterSpacing: '0.32em',
                  textTransform: 'uppercase',
                  color: 'var(--p-ink-softer)',
                }}
              >
                {Array.from({ length: 8 }).map((_, i) => (
                  <span key={i} className="inline-flex items-center gap-3">
                    01010100 01000001 01010011 01001011 01001100 · #TLN-2026
                    <span style={{ color: 'var(--p-accent)' }}>◆</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Form side ── */}
        <div className="relative flex items-center justify-center px-6 py-12 lg:px-14">
          {/* Sheet background — paper card with brutalist trim */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-12 right-6 hidden lg:block"
            style={{ left: '-2%' }}
          >
            <div
              className="absolute inset-0 rounded-[28px]"
              style={{
                background: 'var(--p-paper)',
                boxShadow: '0 60px 140px -50px rgb(28 15 9 / 0.45), inset 0 0 0 1px var(--p-rule)',
              }}
            />
            <div
              className="absolute -left-3 top-10 h-[1px] w-12"
              style={{ background: 'var(--p-accent)' }}
            />
            <div
              className="absolute -right-3 bottom-12 h-[1px] w-12"
              style={{ background: 'var(--p-ink)' }}
            />
          </div>

          {/* Top-right meta */}
          <div className="absolute right-8 top-8 hidden items-center gap-3 p-edge-tag lg:flex">
            <span className="opacity-60">Secure session</span>
            <span style={{ color: 'var(--p-rule)' }}>/</span>
            <span style={{ color: 'var(--p-accent)' }}>TLS 1.3</span>
          </div>

          {/* Mobile brand */}
          <div className="absolute left-6 top-6 flex items-center gap-3 lg:hidden">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{
                background: 'transparent',
                color: 'var(--p-accent)',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <text
                  x="50%"
                  y="50%"
                  dy=".35em"
                  textAnchor="middle"
                  fontFamily="monospace"
                  fontSize="20"
                  fontWeight="bold"
                >
                  ;)
                </text>
              </svg>
            </div>
            <span className="p-display text-[20px] tracking-tight">Tasklane</span>
          </div>

          <div className="relative z-10 mx-auto w-full max-w-[440px] space-y-9 animate-rise-2">
            {children}
          </div>

          {/* Bottom-left footer mark */}
          <div className="absolute bottom-8 left-8 hidden items-center gap-2 p-edge-tag lg:flex">
            <span className="h-px w-6" style={{ background: 'var(--p-rule)' }} />
            <span>© 2026 Tasklane · The Workshop</span>
          </div>

          {/* Bottom-right helper */}
          <div className="absolute bottom-8 right-8 hidden items-center gap-3 p-edge-tag lg:flex">
            <span className="opacity-60">Need help?</span>
            <a
              href="mailto:hello@tasklane.dev"
              className="underline-offset-4 hover:underline"
              style={{ color: 'var(--p-accent)' }}
            >
              hello@tasklane.dev
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
