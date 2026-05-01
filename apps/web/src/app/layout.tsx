import './globals.css';

import type { Metadata } from 'next';
import { Instrument_Serif, Inter, JetBrains_Mono, Space_Grotesk } from 'next/font/google';

import { Providers } from '@/components/providers';
import { cn } from '@/lib/utils';

// Geist isn't shipped via next/font/google in Next 14; alias the geist
// CSS variables to Inter + JetBrains Mono so the paper theme still works.
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-grotesk',
  display: 'swap',
});

const interGeistAlias = Inter({
  subsets: ['latin'],
  variable: '--font-geist-sans',
  display: 'swap',
});

const monoGeistAlias = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Tasklane — Collaborative Task Manager',
    template: '%s | Tasklane',
  },
  description:
    'Real-time collaborative team task manager. Organize projects, track progress, and ship faster together.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        inter.variable,
        jetbrainsMono.variable,
        instrumentSerif.variable,
        spaceGrotesk.variable,
        interGeistAlias.variable,
        monoGeistAlias.variable,
      )}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
