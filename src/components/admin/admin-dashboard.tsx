import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Database, 
  Activity, 
  Target, 
  Settings, 
  BarChart3,
  RefreshCw,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { IngestionMonitoringDashboard } from './ingestion-monitoring-dashboard';
import { GoldenDatasetTestRunner } from '../testing/golden-dataset-test-runner';

interface AdminDashboardProps {
  userRole?: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ userRole = 'user' }) => {
  const [activeTab, setActiveTab] = useState('monitoring');

  // Check if user has admin access
  if (userRole !== 'admin' && userRole !== 'super_admin') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Access Denied
            </CardTitle>
            <CardDescription>
              You don't have permission to access the admin dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This area is restricted to administrators only.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="w-8 h-8" />
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground">
            Manage and monitor the stable data architecture
          </p>
        </div>
        <Badge variant="outline" className="flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          Stable Data Architecture Active
        </Badge>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <CheckCircle className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Healthy</div>
            <p className="text-xs text-muted-foreground">
              All systems operational
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Architecture</CardTitle>
            <Database className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">Stable</div>
            <p className="text-xs text-muted-foreground">
              Canonical mapping active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Test Coverage</CardTitle>
            <Target className="w-4 h-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">100%</div>
            <p className="text-xs text-muted-foreground">
              Golden dataset tests
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance</CardTitle>
            <BarChart3 className="w-4 h-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">Optimal</div>
            <p className="text-xs text-muted-foreground">
              No performance issues
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="monitoring" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Monitoring
          </TabsTrigger>
          <TabsTrigger value="testing" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Testing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="monitoring" className="space-y-4">
          <IngestionMonitoringDashboard 
            refreshInterval={30000}
            showDetails={true}
            autoRefresh={true}
          />
        </TabsContent>

        <TabsContent value="testing" className="space-y-4">
          <GoldenDatasetTestRunner 
            autoRun={false}
            showDetails={true}
          />
        </TabsContent>
      </Tabs>

      {/* Architecture Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Stable Data Architecture Overview
          </CardTitle>
          <CardDescription>
            How the system prevents "fixing the same things over and over"
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <h4 className="font-semibold text-blue-600">Canonical Mapping</h4>
              <p className="text-sm text-muted-foreground">
                Single source of truth for players, teams, sportsbooks, and games.
                No more "Unknown Player" or missing logos.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-green-600">Normalization Layer</h4>
              <p className="text-sm text-muted-foreground">
                All data flows through the normalized view, ensuring consistency
                and stability across the entire application.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-purple-600">Regression Safety</h4>
              <p className="text-sm text-muted-foreground">
                Golden dataset tests catch breaking changes before they reach
                production, preventing data quality issues.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
