'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { useAuthStore } from '@/lib/auth';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

type RegisterValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const registerUser = useAuthStore((s) => s.register);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const onSubmit = async (values: RegisterValues) => {
    setIsLoading(true);
    try {
      const user = await registerUser(values.email, values.password, values.name);
      toast.success(`Welcome, ${user.name}`);
      router.push('/dashboard');
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Registration failed. Please try again.';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Eyebrow */}
      <div className="flex items-center gap-3 p-edge-tag">
        <span className="p-section-no">/ 02</span>
        <span>Create account · New operator</span>
      </div>

      {/* Editorial heading */}
      <div className="space-y-3">
        <h1
          className="p-display text-[clamp(48px,6vw,72px)] leading-[0.95] tracking-tight"
          style={{ color: 'var(--p-ink)' }}
        >
          Start something{' '}
          <span
            className="font-display-italic ink-sweep"
            style={{
              color: 'var(--p-accent)',
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
            }}
          >
            real
          </span>
          .
        </h1>
        <p className="max-w-sm text-[14px] leading-relaxed" style={{ color: 'var(--p-ink-soft)' }}>
          Two minutes to set up. Five minutes to feel at home. The rest is up to you and the team.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-7">
        <div className="space-y-1">
          <div className="flex items-end justify-between">
            <label htmlFor="name" className="p-edge-tag" style={{ color: 'var(--p-ink-soft)' }}>
              / 01 · Full name
            </label>
            <span className="p-edge-tag opacity-60">required</span>
          </div>
          <input
            id="name"
            type="text"
            placeholder="Alice Johnson"
            autoComplete="name"
            aria-invalid={!!errors.name}
            className="brutal-input"
            style={{
              color: 'var(--p-ink)',
              borderColor: errors.name ? 'var(--p-accent)' : 'var(--p-ink)',
            }}
            {...register('name')}
          />
          {errors.name && (
            <p className="pt-1 text-[12px]" style={{ color: 'var(--p-accent)' }}>
              {errors.name.message}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <div className="flex items-end justify-between">
            <label htmlFor="email" className="p-edge-tag" style={{ color: 'var(--p-ink-soft)' }}>
              / 02 · Email
            </label>
            <span className="p-edge-tag opacity-60">required</span>
          </div>
          <input
            id="email"
            type="email"
            placeholder="alice@company.com"
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
              / 03 · Password
            </label>
            <span className="p-edge-tag opacity-60">8+ chars · mixed</span>
          </div>
          <input
            id="password"
            type="password"
            placeholder="At least 8 characters"
            autoComplete="new-password"
            aria-invalid={!!errors.password}
            className="brutal-input"
            style={{
              color: 'var(--p-ink)',
              borderColor: errors.password ? 'var(--p-accent)' : 'var(--p-ink)',
            }}
            {...register('password')}
          />
          {errors.password ? (
            <p className="pt-1 text-[12px]" style={{ color: 'var(--p-accent)' }}>
              {errors.password.message}
            </p>
          ) : (
            <p className="pt-1 text-[11px]" style={{ color: 'var(--p-ink-softer)' }}>
              Must contain at least one letter and one number.
            </p>
          )}
        </div>

        <div className="pt-3">
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
                ✦
              </span>
            )}
            <span>{isLoading ? 'Creating' : 'Create account'}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </form>

      <p className="text-center text-[14px]" style={{ color: 'var(--p-ink-soft)' }}>
        Already a member?{' '}
        <Link
          href="/login"
          className="underline-offset-4 hover:underline"
          style={{ color: 'var(--p-ink)', fontWeight: 500 }}
        >
          Sign in →
        </Link>
      </p>
    </>
  );
}
