import React from 'react';

export const Admin: React.FC = () => {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-card p-6 rounded-lg border">
            <h2 className="text-xl font-semibold mb-4">System Status</h2>
            <p className="text-muted-foreground">All systems operational</p>
          </div>
          <div className="bg-card p-6 rounded-lg border">
            <h2 className="text-xl font-semibold mb-4">API Health</h2>
            <p className="text-muted-foreground">Player props API is running</p>
          </div>
          <div className="bg-card p-6 rounded-lg border">
            <h2 className="text-xl font-semibold mb-4">Cache Status</h2>
            <p className="text-muted-foreground">Edge caching active</p>
          </div>
        </div>
      </div>
    </div>
  );
};