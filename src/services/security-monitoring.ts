// Security monitoring and alerting service
import { logSecurityEvent } from '@/utils/security';

interface SecurityEvent {
  id: string;
  type: 'suspicious_activity' | 'rate_limit_exceeded' | 'csrf_violation' | 'xss_attempt' | 'sql_injection' | 'file_upload_abuse' | 'authentication_abuse';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details: any;
  timestamp: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  resolved: boolean;
}

interface SecurityAlert {
  id: string;
  eventId: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  acknowledged: boolean;
  resolved: boolean;
}

class SecurityMonitoringService {
  private events: SecurityEvent[] = [];
  private alerts: SecurityAlert[] = [];
  private alertThresholds = {
    suspicious_activity: 5, // 5 events per hour
    rate_limit_exceeded: 10, // 10 events per hour
    csrf_violation: 3, // 3 events per hour
    xss_attempt: 2, // 2 events per hour
    sql_injection: 1, // 1 event per hour
    file_upload_abuse: 5, // 5 events per hour
    authentication_abuse: 3 // 3 events per hour
  };

  // Log a security event
  logEvent(
    type: SecurityEvent['type'],
    severity: SecurityEvent['severity'],
    message: string,
    details: any,
    userId?: string,
    ipAddress?: string,
    userAgent?: string
  ): void {
    const event: SecurityEvent = {
      id: this.generateId(),
      type,
      severity,
      message,
      details,
      timestamp: new Date().toISOString(),
      userId,
      ipAddress,
      userAgent,
      resolved: false
    };

    this.events.push(event);
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[SECURITY EVENT] ${type.toUpperCase()}: ${message}`, details);
    }

    // Check if we need to create an alert
    this.checkForAlert(event);

    // In production, send to external monitoring service
    if (process.env.NODE_ENV === 'production') {
      this.sendToExternalMonitoring(event);
    }
  }

  // Check if an event should trigger an alert
  private checkForAlert(event: SecurityEvent): void {
    const threshold = this.alertThresholds[event.type];
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const recentEvents = this.events.filter(e => 
      e.type === event.type && 
      e.timestamp > oneHourAgo &&
      !e.resolved
    );

    if (recentEvents.length >= threshold) {
      this.createAlert(event, `Multiple ${event.type} events detected (${recentEvents.length} in the last hour)`);
    }

    // Critical events always create alerts
    if (event.severity === 'critical') {
      this.createAlert(event, `Critical security event: ${event.message}`);
    }
  }

  // Create a security alert
  private createAlert(event: SecurityEvent, message: string): void {
    const alert: SecurityAlert = {
      id: this.generateId(),
      eventId: event.id,
      message,
      severity: event.severity,
      timestamp: new Date().toISOString(),
      acknowledged: false,
      resolved: false
    };

    this.alerts.push(alert);

    // In production, send immediate notification
    if (process.env.NODE_ENV === 'production') {
      this.sendImmediateAlert(alert);
    }
  }

  // Get security events
  getEvents(filters?: {
    type?: SecurityEvent['type'];
    severity?: SecurityEvent['severity'];
    userId?: string;
    resolved?: boolean;
    limit?: number;
  }): SecurityEvent[] {
    let filteredEvents = [...this.events];

    if (filters?.type) {
      filteredEvents = filteredEvents.filter(e => e.type === filters.type);
    }

    if (filters?.severity) {
      filteredEvents = filteredEvents.filter(e => e.severity === filters.severity);
    }

    if (filters?.userId) {
      filteredEvents = filteredEvents.filter(e => e.userId === filters.userId);
    }

    if (filters?.resolved !== undefined) {
      filteredEvents = filteredEvents.filter(e => e.resolved === filters.resolved);
    }

    if (filters?.limit) {
      filteredEvents = filteredEvents.slice(-filters.limit);
    }

    return filteredEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  // Get security alerts
  getAlerts(filters?: {
    severity?: SecurityAlert['severity'];
    acknowledged?: boolean;
    resolved?: boolean;
    limit?: number;
  }): SecurityAlert[] {
    let filteredAlerts = [...this.alerts];

    if (filters?.severity) {
      filteredAlerts = filteredAlerts.filter(a => a.severity === filters.severity);
    }

    if (filters?.acknowledged !== undefined) {
      filteredAlerts = filteredAlerts.filter(a => a.acknowledged === filters.acknowledged);
    }

    if (filters?.resolved !== undefined) {
      filteredAlerts = filteredAlerts.filter(a => a.resolved === filters.resolved);
    }

    if (filters?.limit) {
      filteredAlerts = filteredAlerts.slice(-filters.limit);
    }

    return filteredAlerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  // Acknowledge an alert
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      return true;
    }
    return false;
  }

  // Resolve an alert
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      
      // Also resolve the associated event
      const event = this.events.find(e => e.id === alert.eventId);
      if (event) {
        event.resolved = true;
      }
      
      return true;
    }
    return false;
  }

  // Resolve an event
  resolveEvent(eventId: string): boolean {
    const event = this.events.find(e => e.id === eventId);
    if (event) {
      event.resolved = true;
      
      // Also resolve associated alerts
      this.alerts
        .filter(a => a.eventId === eventId)
        .forEach(alert => {
          alert.resolved = true;
        });
      
      return true;
    }
    return false;
  }

  // Get security statistics
  getSecurityStats(): {
    totalEvents: number;
    unresolvedEvents: number;
    totalAlerts: number;
    unresolvedAlerts: number;
    eventsByType: Record<string, number>;
    eventsBySeverity: Record<string, number>;
    recentActivity: SecurityEvent[];
  } {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const recentEvents = this.events.filter(e => e.timestamp > oneDayAgo);

    const eventsByType = this.events.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const eventsBySeverity = this.events.reduce((acc, event) => {
      acc[event.severity] = (acc[event.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalEvents: this.events.length,
      unresolvedEvents: this.events.filter(e => !e.resolved).length,
      totalAlerts: this.alerts.length,
      unresolvedAlerts: this.alerts.filter(a => !a.resolved).length,
      eventsByType,
      eventsBySeverity,
      recentActivity: recentEvents.slice(-10)
    };
  }

  // Send to external monitoring service (implement based on your monitoring solution)
  private async sendToExternalMonitoring(event: SecurityEvent): Promise<void> {
    try {
      // Example: Send to external API
      // await fetch('https://your-monitoring-service.com/api/security-events', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(event)
      // });
    } catch (error) {
      console.error('Failed to send security event to external monitoring:', error);
    }
  }

  // Send immediate alert (implement based on your notification system)
  private async sendImmediateAlert(alert: SecurityAlert): Promise<void> {
    try {
      // Example: Send email, Slack notification, etc.
      console.error(`[SECURITY ALERT] ${alert.severity.toUpperCase()}: ${alert.message}`);
    } catch (error) {
      console.error('Failed to send immediate alert:', error);
    }
  }

  // Generate unique ID
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2)}`;
  }

  // Clean up old events and alerts
  cleanup(olderThanDays: number = 30): void {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString();
    
    this.events = this.events.filter(e => e.timestamp > cutoffDate);
    this.alerts = this.alerts.filter(a => a.timestamp > cutoffDate);
  }
}

// Create service instance
export const securityMonitoringService = new SecurityMonitoringService();

// Clean up old data every 24 hours
setInterval(() => {
  securityMonitoringService.cleanup(30);
}, 24 * 60 * 60 * 1000);

// Enhanced logging function that uses the monitoring service
export const logSecurityEventWithMonitoring = (
  type: SecurityEvent['type'],
  severity: SecurityEvent['severity'],
  message: string,
  details: any,
  userId?: string,
  ipAddress?: string,
  userAgent?: string
) => {
  // Log to console
  logSecurityEvent(message, details);
  
  // Log to monitoring service
  securityMonitoringService.logEvent(type, severity, message, details, userId, ipAddress, userAgent);
};
