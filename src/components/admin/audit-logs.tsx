import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  Search, 
  Filter, 
  Download, 
  RefreshCw, 
  Eye, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Clock,
  User,
  Activity,
  Database,
  Lock,
  Unlock,
  Edit,
  Trash2,
  Plus,
  Minus,
  TrendingUp,
  TrendingDown,
  Calendar,
  BarChart3
} from 'lucide-react';
import { useUser } from '@/contexts/user-context';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface AuditLog {
  id: string;
  timestamp: string;
  event_type: string;
  user_id: string;
  user_email: string;
  user_role: string;
  action: string;
  resource: string;
  details: any;
  ip_address?: string;
  user_agent?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'success' | 'failed' | 'pending';
}

interface AuditStats {
  totalEvents: number;
  eventsToday: number;
  criticalEvents: number;
  failedEvents: number;
  uniqueUsers: number;
  topEvents: { event: string; count: number }[];
}

export function AuditLogs() {
  const { userRole, validateUserAccess, getMaskedEmail, logSecurityEvent } = useUser();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditStats>({
    totalEvents: 0,
    eventsToday: 0,
    criticalEvents: 0,
    failedEvents: 0,
    uniqueUsers: 0,
    topEvents: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showLogDetails, setShowLogDetails] = useState(false);
  const { toast } = useToast();

  // Check if user has admin access
  if (!validateUserAccess('admin')) {
    return (
      <Alert className="border-destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          You don't have permission to access audit logs.
        </AlertDescription>
      </Alert>
    );
  }

  useEffect(() => {
    loadAuditLogs();
  }, []);

  useEffect(() => {
    filterLogs();
  }, [logs, searchQuery, eventTypeFilter, severityFilter, statusFilter]);

  const loadAuditLogs = async () => {
    try {
      setIsLoading(true);
      
      // For now, we'll create mock audit logs since we don't have a dedicated audit table
      // In production, this would query a real audit_logs table
      const mockLogs: AuditLog[] = [
        {
          id: '1',
          timestamp: new Date().toISOString(),
          event_type: 'USER_LOGIN',
          user_id: 'user1',
          user_email: 'user@example.com',
          user_role: 'user',
          action: 'login',
          resource: 'auth',
          details: { method: 'email', success: true },
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0...',
          severity: 'low',
          status: 'success'
        },
        {
          id: '2',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          event_type: 'ADMIN_USER_DATA_LOADED',
          user_id: 'admin1',
          user_email: 'admin@statpedia.com',
          user_role: 'admin',
          action: 'view_users',
          resource: 'admin_panel',
          details: { userCount: 150, adminRole: 'admin' },
          ip_address: '192.168.1.2',
          user_agent: 'Mozilla/5.0...',
          severity: 'medium',
          status: 'success'
        },
        {
          id: '3',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          event_type: 'USER_ROLE_CHANGED',
          user_id: 'admin1',
          user_email: 'admin@statpedia.com',
          user_role: 'admin',
          action: 'change_role',
          resource: 'user_management',
          details: { targetUserId: 'user2', newRole: 'mod', adminRole: 'admin' },
          ip_address: '192.168.1.2',
          user_agent: 'Mozilla/5.0...',
          severity: 'high',
          status: 'success'
        },
        {
          id: '4',
          timestamp: new Date(Date.now() - 10800000).toISOString(),
          event_type: 'RATE_LIMIT_EXCEEDED',
          user_id: 'user3',
          user_email: 'user3@example.com',
          user_role: 'user',
          action: 'api_request',
          resource: 'api',
          details: { requestCount: 15, endpoint: '/api/users' },
          ip_address: '192.168.1.3',
          user_agent: 'Mozilla/5.0...',
          severity: 'medium',
          status: 'failed'
        },
        {
          id: '5',
          timestamp: new Date(Date.now() - 14400000).toISOString(),
          event_type: 'UNAUTHORIZED_ROLE_UPDATE_ATTEMPT',
          user_id: 'user4',
          user_email: 'user4@example.com',
          user_role: 'user',
          action: 'unauthorized_access',
          resource: 'user_management',
          details: { attemptedRole: 'admin', currentRole: 'user' },
          ip_address: '192.168.1.4',
          user_agent: 'Mozilla/5.0...',
          severity: 'critical',
          status: 'failed'
        }
      ];

      setLogs(mockLogs);
      calculateStats(mockLogs);
      
      logSecurityEvent('AUDIT_LOGS_ACCESSED', { 
        adminRole: userRole,
        logCount: mockLogs.length 
      });
    } catch (error) {
      console.error('Failed to load audit logs:', error);
      toast({
        title: "Error",
        description: "Failed to load audit logs",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (logsData: AuditLog[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const eventsToday = logsData.filter(log => 
      new Date(log.timestamp) >= today
    ).length;
    
    const criticalEvents = logsData.filter(log => 
      log.severity === 'critical'
    ).length;
    
    const failedEvents = logsData.filter(log => 
      log.status === 'failed'
    ).length;
    
    const uniqueUsers = new Set(logsData.map(log => log.user_id)).size;
    
    // Top events
    const eventCounts: { [key: string]: number } = {};
    logsData.forEach(log => {
      eventCounts[log.event_type] = (eventCounts[log.event_type] || 0) + 1;
    });
    
    const topEvents = Object.entries(eventCounts)
      .map(([event, count]) => ({ event, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    setStats({
      totalEvents: logsData.length,
      eventsToday,
      criticalEvents,
      failedEvents,
      uniqueUsers,
      topEvents
    });
  };

  const filterLogs = () => {
    let filtered = logs;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(log => 
        log.event_type.toLowerCase().includes(query) ||
        log.action.toLowerCase().includes(query) ||
        log.resource.toLowerCase().includes(query) ||
        log.user_email.toLowerCase().includes(query)
      );
    }

    // Event type filter
    if (eventTypeFilter !== 'all') {
      filtered = filtered.filter(log => log.event_type === eventTypeFilter);
    }

    // Severity filter
    if (severityFilter !== 'all') {
      filtered = filtered.filter(log => log.severity === severityFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(log => log.status === statusFilter);
    }

    setFilteredLogs(filtered);
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'high': return <XCircle className="w-4 h-4 text-orange-500" />;
      case 'medium': return <Info className="w-4 h-4 text-yellow-500" />;
      case 'low': return <CheckCircle className="w-4 h-4 text-green-500" />;
      default: return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    const variants = {
      critical: 'destructive',
      high: 'destructive',
      medium: 'secondary',
      low: 'outline'
    } as const;

    return (
      <Badge variant={variants[severity as keyof typeof variants] || 'outline'}>
        {getSeverityIcon(severity)}
        <span className="ml-1 capitalize">{severity}</span>
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      success: 'default',
      failed: 'destructive',
      pending: 'secondary'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status === 'success' && <CheckCircle className="w-3 h-3 mr-1" />}
        {status === 'failed' && <XCircle className="w-3 h-3 mr-1" />}
        {status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
        <span className="capitalize">{status}</span>
      </Badge>
    );
  };

  const getEventTypeIcon = (eventType: string) => {
    if (eventType.includes('LOGIN')) return <User className="w-4 h-4" />;
    if (eventType.includes('ROLE')) return <Shield className="w-4 h-4" />;
    if (eventType.includes('RATE_LIMIT')) return <Activity className="w-4 h-4" />;
    if (eventType.includes('UNAUTHORIZED')) return <Lock className="w-4 h-4" />;
    if (eventType.includes('DATA')) return <Database className="w-4 h-4" />;
    return <Activity className="w-4 h-4" />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Audit Logs</h2>
          <p className="text-muted-foreground">
            Monitor system activity, security events, and user actions
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadAuditLogs} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{stats.totalEvents}</div>
                <p className="text-xs text-muted-foreground">Total Events</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{stats.eventsToday}</div>
                <p className="text-xs text-muted-foreground">Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <div>
                <div className="text-2xl font-bold">{stats.criticalEvents}</div>
                <p className="text-xs text-muted-foreground">Critical</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-orange-500" />
              <div>
                <div className="text-2xl font-bold">{stats.failedEvents}</div>
                <p className="text-xs text-muted-foreground">Failed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-purple-500" />
              <div>
                <div className="text-2xl font-bold">{stats.uniqueUsers}</div>
                <p className="text-xs text-muted-foreground">Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Search Events</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  id="search"
                  placeholder="Search by event type, action, or user..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="event-filter">Event Type</Label>
              <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  <SelectItem value="USER_LOGIN">User Login</SelectItem>
                  <SelectItem value="ADMIN_USER_DATA_LOADED">Admin Data Access</SelectItem>
                  <SelectItem value="USER_ROLE_CHANGED">Role Changes</SelectItem>
                  <SelectItem value="RATE_LIMIT_EXCEEDED">Rate Limiting</SelectItem>
                  <SelectItem value="UNAUTHORIZED_ROLE_UPDATE_ATTEMPT">Unauthorized Access</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="severity-filter">Severity</Label>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status-filter">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Events */}
      <Card>
        <CardHeader>
          <CardTitle>Top Events</CardTitle>
          <CardDescription>Most frequent event types</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stats.topEvents.map((event, index) => (
              <div key={event.event} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">#{index + 1}</span>
                  <span className="text-sm">{event.event}</span>
                </div>
                <Badge variant="outline">{event.count}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Logs ({filteredLogs.length})</CardTitle>
          <CardDescription>
            System activity and security events
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    {getEventTypeIcon(log.event_type)}
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{log.event_type}</h3>
                        {getSeverityBadge(log.severity)}
                        {getStatusBadge(log.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {log.action} • {log.resource}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {getMaskedEmail(log.user_email)} • {log.user_role} • {new Date(log.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedLog(log);
                      setShowLogDetails(true);
                    }}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Log Details Modal */}
      {showLogDetails && selectedLog && (
        <Card className="fixed inset-4 z-50 overflow-auto">
          <CardHeader>
            <CardTitle>Event Details</CardTitle>
            <CardDescription>
              {selectedLog.event_type} - {selectedLog.action}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Event Type</Label>
                <p className="text-sm font-medium">{selectedLog.event_type}</p>
              </div>
              <div>
                <Label>Action</Label>
                <p className="text-sm font-medium">{selectedLog.action}</p>
              </div>
              <div>
                <Label>Resource</Label>
                <p className="text-sm font-medium">{selectedLog.resource}</p>
              </div>
              <div>
                <Label>Severity</Label>
                <div className="flex items-center gap-2">
                  {getSeverityIcon(selectedLog.severity)}
                  <span className="text-sm font-medium capitalize">{selectedLog.severity}</span>
                </div>
              </div>
              <div>
                <Label>Status</Label>
                <div className="flex items-center gap-2">
                  {getStatusBadge(selectedLog.status)}
                </div>
              </div>
              <div>
                <Label>User</Label>
                <p className="text-sm font-medium">{getMaskedEmail(selectedLog.user_email)}</p>
              </div>
              <div>
                <Label>User Role</Label>
                <p className="text-sm font-medium capitalize">{selectedLog.user_role}</p>
              </div>
              <div>
                <Label>Timestamp</Label>
                <p className="text-sm font-medium">
                  {new Date(selectedLog.timestamp).toLocaleString()}
                </p>
              </div>
              <div>
                <Label>IP Address</Label>
                <p className="text-sm font-medium">{selectedLog.ip_address || 'N/A'}</p>
              </div>
              <div>
                <Label>User Agent</Label>
                <p className="text-sm font-medium truncate">
                  {selectedLog.user_agent || 'N/A'}
                </p>
              </div>
            </div>
            <div>
              <Label>Details</Label>
              <div className="text-sm whitespace-pre-wrap bg-muted p-4 rounded-md">
                {JSON.stringify(selectedLog.details, null, 2)}
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => setShowLogDetails(false)}
              >
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
