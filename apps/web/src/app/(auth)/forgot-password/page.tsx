'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Loader2, Mail } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/lib/api';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (values: ForgotPasswordValues) => {
    setIsLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: values.email });
      setIsSubmitted(true);
      toast.success('Check your email for a reset link');
    } catch (error: any) {
      setIsSubmitted(true);
      toast.success("If that email is registered, you'll receive a reset link");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <>
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-mono">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[rgb(var(--signature))]" />
          <span>Check your inbox</span>
        </div>

        <div className="space-y-3">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-card ring-inner-hl">
            <Mail className="h-5 w-5 text-[rgb(var(--signature))]" />
          </div>
          <h1 className="font-display text-[44px] leading-[1.0] tracking-tight text-foreground">
            Check your{' '}
            <span className="font-display-italic text-[rgb(var(--signature))]">email</span>.
          </h1>
          <p className="max-w-sm text-[14px] leading-relaxed text-muted-foreground">
            If an account with that email exists, we&apos;ve sent a reset link. It may take a minute
            to arrive — check spam, just in case.
          </p>
        </div>

        <Link href="/login">
          <Button variant="ghost" className="gap-2 -ml-3">
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Button>
        </Link>
      </>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-mono">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-[rgb(var(--signature))]" />
        <span>Reset password</span>
      </div>

      <div className="space-y-3">
        <h1 className="font-display text-[44px] leading-[1.0] tracking-tight text-foreground">
          Forgot your{' '}
          <span className="font-display-italic text-[rgb(var(--signature))]">password</span>?
        </h1>
        <p className="max-w-sm text-[14px] leading-relaxed text-muted-foreground">
          Happens to the best of us. Enter the email tied to your account and we&apos;ll send a
          fresh reset link.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-1.5">
          <Label
            htmlFor="email"
            className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground"
          >
            Email
          </Label>
          <div className="group relative">
            <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70 transition-colors group-focus-within:text-[rgb(var(--signature))]" />
            <Input
              id="email"
              type="email"
              placeholder="alice@tasklane.dev"
              className="h-12 pl-11 text-[15px] bg-card/60 ring-inner-hl"
              autoComplete="email"
              {...register('email')}
            />
          </div>
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>

        <Button
          type="submit"
          className="h-12 w-full text-[14px] font-medium tracking-tight ring-inner-hl"
          disabled={isLoading}
          size="lg"
        >
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Send reset link
        </Button>
      </form>

      <Link href="/login">
        <Button variant="ghost" className="gap-2 -ml-3 text-muted-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Button>
      </Link>
    </>
  );
}
