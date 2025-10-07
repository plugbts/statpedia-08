import { AnalyticsTest } from '@/components/debug/analytics-test';

export default function AnalyticsDebugPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Analytics Debug</h1>
      <AnalyticsTest />
    </div>
  );
}
