import React from 'react';
import { MonitoringDashboard } from '@/components/admin/monitoring-dashboard';

export const Admin: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <MonitoringDashboard />
    </div>
  );
};