'use client';

import { Calendar, Sparkles } from 'lucide-react';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { AiSparkleButton } from '@/components/ui/ai-sparkle-button';
import { generateStandup } from '@/lib/ai';

export default function StandupPage() {
  const [standup, setStandup] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    setIsLoading(true);
    setError('');
    try {
      // Using a hardcoded team ID for demo purposes.
      // In a real app we'd fetch the active team context.
      const res = await generateStandup('1');
      setStandup(res);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to generate standup.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-full overflow-y-auto p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--p-ink-soft)]">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--p-accent)]" />
          <span>AI · Standup &amp; reporting</span>
        </div>

        <h1 className="font-display p-display flex items-center gap-3 text-[44px] leading-[1.0] tracking-tight">
          <Sparkles className="h-9 w-9 text-[var(--p-accent)]" />
          The day, in{' '}
          <span className="italic" style={{ color: 'var(--p-accent)' }}>
            one read
          </span>
          .
        </h1>
        <p className="mt-3 max-w-md text-[14px] leading-relaxed text-[var(--p-ink-muted)]">
          An intelligent summary of your team&apos;s progress, blockers, and upcoming tasks based on
          recent activity.
        </p>

        <div className="mt-8 flex flex-col gap-6">
          <div className="flex items-center gap-4 rounded-2xl border border-[var(--p-rule)] bg-[var(--p-paper-deep)] p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--p-ink)] text-[var(--p-paper)]">
              <Calendar className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-display p-display text-[20px] leading-tight">
                Daily standup summary
              </h3>
              <p className="mt-1 text-[13px] text-[var(--p-ink-soft)]">
                Summarizes activity over the last 24 hours.
              </p>
            </div>
            <AiSparkleButton isLoading={isLoading} onClick={handleGenerate} className="px-6 py-5">
              Generate
            </AiSparkleButton>
          </div>

          {error && (
            <div className="rounded-2xl border border-[var(--p-accent)] bg-[rgb(214_52_38_/_0.08)] p-4 text-sm text-[var(--p-accent)]">
              {error}
            </div>
          )}

          {standup && (
            <div className="animate-in fade-in slide-in-from-bottom-4 rounded-2xl border border-[var(--p-rule)] bg-[var(--p-paper-deep)] p-8 duration-500">
              <h2 className="mb-6 border-b border-[var(--p-rule)] pb-4 font-display p-display text-[28px] leading-tight tracking-tight">
                Standup{' '}
                <span className="italic" style={{ color: 'var(--p-accent)' }}>
                  report
                </span>
              </h2>
              <div className="prose prose-stone max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{standup.summary}</ReactMarkdown>
              </div>

              {(standup.blockers?.length > 0 || standup.actionItems?.length > 0) && (
                <div className="mt-8 grid grid-cols-1 gap-6 border-t border-[var(--p-rule)] pt-6 md:grid-cols-2">
                  {standup.blockers?.length > 0 && (
                    <div className="rounded-xl border border-[var(--p-accent)] bg-[rgb(214_52_38_/_0.05)] p-4">
                      <h4 className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--p-accent)]">
                        Identified blockers
                      </h4>
                      <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--p-ink)]">
                        {standup.blockers.map((b: string, i: number) => (
                          <li key={i}>{b}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {standup.actionItems?.length > 0 && (
                    <div className="rounded-xl border border-[var(--p-rule)] bg-[var(--p-paper)] p-4">
                      <h4
                        className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em]"
                        style={{ color: '#1b6b3d' }}
                      >
                        Action items
                      </h4>
                      <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--p-ink)]">
                        {standup.actionItems.map((a: string, i: number) => (
                          <li key={i}>{a}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
