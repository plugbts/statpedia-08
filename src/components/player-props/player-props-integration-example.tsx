import React from 'react';
import { OptimizedPlayerPropsTab } from './optimized-player-props-tab';
import { AnalyticsDashboard } from '../analytics/AnalyticsDashboard';

// Example of how to integrate the new analytics system with your existing player props
export function PlayerPropsIntegrationExample() {
  return (
    <div className="space-y-6">
      {/* Use the optimized, less crowded version */}
      <OptimizedPlayerPropsTab />
      
      {/* Or use the full analytics dashboard */}
      <AnalyticsDashboard />
    </div>
  );
}

// Example of how to replace your existing player props tab
export function PlayerPropsTabWithAnalytics() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Your existing header/navigation */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">StatPedia Player Props</h1>
          <p className="text-gray-600">AI-powered prop analysis with matchup grades</p>
        </div>
      </div>

      {/* The optimized player props tab - much less crowded! */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <OptimizedPlayerPropsTab />
      </div>
    </div>
  );
}
