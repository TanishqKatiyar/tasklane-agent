'use client';

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';

import { AnalyticsSkeleton } from '@/components/ui/skeletons';

// Dynamic import avoids SSR hydration mismatches for Recharts
// and keeps the main bundle lean since this is a chart-heavy page.
const AnalyticsContent = dynamic(() => import('./analytics-content'), {
  ssr: false,
  loading: () => <AnalyticsSkeleton />,
});

export default function TeamAnalyticsPage() {
  const params = useParams();
  const teamId = params.teamId as string;

  return <AnalyticsContent teamId={teamId} />;
}
