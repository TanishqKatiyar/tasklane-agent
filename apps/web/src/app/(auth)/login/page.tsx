'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, ClipboardCheck, Loader2, Terminal } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { useAuthStore } from '@/lib/auth';

const DEMO_EMAIL = 'admin@tasklane.dev';
const DEMO_PASSWORD = 'Admin123!';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginValues = z.infer<typeof loginSchema>;

function useLiveClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('callbackUrl') ?? searchParams.get('redirect') ?? '/dashboard';
  const login = useAuthStore((s) => s.login);
  const [isLoading, setIsLoading] = useState(false);
  const now = useLiveClock();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitted },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const [filled, setFilled] = useState(false);

  const fillDemo = () => {
    setValue('email', DEMO_EMAIL, { shouldValidate: true });
    setValue('password', DEMO_PASSWORD, { shouldValidate: true });
    setFilled(true);
    toast.success('Demo credentials filled — hit Sign in!');
  };

  const onSubmit = async (values: LoginValues) => {
    setIsLoading(true);
    try {
      const user = await login(values.email, values.password);
      toast.success(`Welcome back, ${user.name}`);
      router.replace(redirect);
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Invalid email or password';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const timeLabel = now
    ? now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      })
    : '—';

  return (
    <>
      {/* Section eyebrow */}
      <div className="flex items-center gap-3 p-edge-tag" aria-hidden={false}>
        <span className="p-section-no">/ 01</span>
        <span>Sign in · Returning operator</span>
        <span
          className="ml-auto inline-flex items-center gap-2"
          style={{ color: 'var(--p-ink-soft)' }}
        >
          <span className="live-dot" />
          <span style={{ color: 'var(--p-accent)' }}>{timeLabel}</span>
        </span>
      </div>

      {/* Editorial heading */}
      <div className="space-y-3">
        <h1
          className="p-display text-[clamp(48px,6vw,72px)] leading-[0.95] tracking-tight"
          style={{ color: 'var(--p-ink)' }}
        >
          Welcome
          <br />
          <span
            className="font-display-italic ink-sweep"
            style={{
              color: 'var(--p-accent)',
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
            }}
          >
            back
          </span>
          <span style={{ color: 'var(--p-ink)' }}>.</span>
        </h1>
        <p className="max-w-sm text-[14px] leading-relaxed" style={{ color: 'var(--p-ink-soft)' }}>
          Pick up where you left off. Tasks, drafts, and team — all exactly how you left them.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-7">
        <div className="space-y-1">
          <div className="flex items-end justify-between">
            <label htmlFor="email" className="p-edge-tag" style={{ color: 'var(--p-ink-soft)' }}>
              / 01 · Email
            </label>
            <span className="p-edge-tag opacity-60">required</span>
          </div>
          <input
            id="email"
            type="email"
            placeholder="alice@tasklane.dev"
            autoComplete="email"
            aria-invalid={!!errors.email}
            className="brutal-input"
            style={{
              color: 'var(--p-ink)',
              borderColor: errors.email ? 'var(--p-accent)' : 'var(--p-ink)',
            }}
            {...register('email')}
          />
          {errors.email && (
            <p className="pt-1 text-[12px]" style={{ color: 'var(--p-accent)' }}>
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <div className="flex items-end justify-between">
            <label htmlFor="password" className="p-edge-tag" style={{ color: 'var(--p-ink-soft)' }}>
              / 02 · Password
            </label>
            <Link
              href="/forgot-password"
              className="p-edge-tag underline-offset-4 hover:underline"
              style={{ color: 'var(--p-accent)' }}
            >
              Forgot?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            className="brutal-input"
            style={{
              color: 'var(--p-ink)',
              borderColor: errors.password ? 'var(--p-accent)' : 'var(--p-ink)',
            }}
            {...register('password')}
          />
          {errors.password && (
            <p className="pt-1 text-[12px]" style={{ color: 'var(--p-accent)' }}>
              {errors.password.message}
            </p>
          )}
        </div>

        <div className="pt-3 flex items-center gap-4">
          <button type="submit" disabled={isLoading} className="press-cta magnetic">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <span
                className="inline-flex items-center justify-center"
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 999,
                  background: 'var(--p-accent)',
                  color: 'var(--p-paper)',
                  fontSize: 11,
                }}
              >
                ↵
              </span>
            )}
            <span>{isLoading ? 'Signing in' : 'Sign in'}</span>
            <ArrowRight className="h-4 w-4" />
          </button>

          {isSubmitted && !isLoading && (
            <span className="p-edge-tag" style={{ color: 'var(--p-ink-soft)' }}>
              ⏎ to retry
            </span>
          )}
        </div>
      </form>

      {/* Demo Credentials Card */}
      <div
        style={{
          border: '1px solid var(--p-rule)',
          borderRadius: 2,
          padding: '14px 16px',
          background: 'var(--p-paper)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* top accent line */}
        <span
          aria-hidden
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            background: 'var(--p-accent)',
          }}
        />

        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Terminal className="h-3.5 w-3.5" style={{ color: 'var(--p-accent)' }} />
              <span className="p-edge-tag" style={{ color: 'var(--p-accent)', fontWeight: 600 }}>
                Demo Access
              </span>
            </div>

            <div className="space-y-1">
              <p className="p-edge-tag" style={{ color: 'var(--p-ink-soft)' }}>
                Email
                <span
                  className="ml-2 font-mono"
                  style={{ color: 'var(--p-ink)', letterSpacing: '0.01em' }}
                >
                  {DEMO_EMAIL}
                </span>
              </p>
              <p className="p-edge-tag" style={{ color: 'var(--p-ink-soft)' }}>
                Password
                <span
                  className="ml-2 font-mono"
                  style={{ color: 'var(--p-ink)', letterSpacing: '0.01em' }}
                >
                  {DEMO_PASSWORD}
                </span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={fillDemo}
            title="Auto-fill demo credentials"
            style={{
              flexShrink: 0,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              border: '1px solid var(--p-ink)',
              borderRadius: 2,
              background: filled ? 'var(--p-accent)' : 'transparent',
              color: filled ? 'var(--p-paper)' : 'var(--p-ink)',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            <ClipboardCheck className="h-3.5 w-3.5" />
            {filled ? 'Filled' : 'Use demo'}
          </button>
        </div>
      </div>

      {/* Divider — hairline with center label */}
      <div className="relative pt-2">
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2">
          <span className="block h-px w-full" style={{ background: 'var(--p-rule)' }} />
        </div>
        <div className="relative flex justify-center">
          <span
            className="p-edge-tag px-3"
            style={{
              background: 'var(--p-paper)',
              color: 'var(--p-ink-soft)',
            }}
          >
            or · continue elsewhere
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="space-y-3">
        <p className="text-center text-[14px]" style={{ color: 'var(--p-ink-soft)' }}>
          New here?{' '}
          <Link
            href="/register"
            className="underline-offset-4 hover:underline"
            style={{ color: 'var(--p-ink)', fontWeight: 500 }}
          >
            Create an account →
          </Link>
        </p>
        <div className="flex items-center justify-center gap-2 p-edge-tag opacity-70" aria-hidden>
          <span>End-to-end encrypted</span>
          <span style={{ color: 'var(--p-rule)' }}>·</span>
          <span>SOC 2 · TYPE II</span>
        </div>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--p-ink-soft)' }} />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
