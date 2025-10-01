/**
 * Beautiful Console Logger
 * Provides color-coded, structured console logging for debugging
 */

export enum LogLevel {
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
  DEBUG = 'debug',
  API = 'api',
  STATE = 'state',
  FILTER = 'filter'
}

export interface LogEntry {
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
  timestamp: string;
}

class ConsoleLogger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private isOwner = false;

  constructor() {
    this.checkOwnerStatus();
  }

  private checkOwnerStatus() {
    // Check if user is owner
    const ownerEmails = ['jackie@statpedia.com', 'admin@statpedia.com'];
    const currentUser = localStorage.getItem('userEmail') || '';
    this.isOwner = ownerEmails.includes(currentUser) || currentUser.includes('jackie');
  }

  private getTimestamp(): string {
    return new Date().toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  }

  private getEmoji(level: LogLevel): string {
    const emojis = {
      [LogLevel.INFO]: 'ℹ️',
      [LogLevel.SUCCESS]: '✅',
      [LogLevel.WARNING]: '⚠️',
      [LogLevel.ERROR]: '❌',
      [LogLevel.DEBUG]: '🔍',
      [LogLevel.API]: '📡',
      [LogLevel.STATE]: '🔄',
      [LogLevel.FILTER]: '🎯'
    };
    return emojis[level] || '📝';
  }

  private getColor(level: LogLevel): string {
    const colors = {
      [LogLevel.INFO]: '#3B82F6',      // Blue
      [LogLevel.SUCCESS]: '#10B981',   // Green
      [LogLevel.WARNING]: '#F59E0B',   // Orange
      [LogLevel.ERROR]: '#EF4444',     // Red
      [LogLevel.DEBUG]: '#8B5CF6',     // Purple
      [LogLevel.API]: '#06B6D4',       // Cyan
      [LogLevel.STATE]: '#84CC16',     // Lime
      [LogLevel.FILTER]: '#F97316'     // Orange
    };
    return colors[level] || '#6B7280';
  }

  private formatMessage(entry: LogEntry): string {
    const emoji = this.getEmoji(entry.level);
    const timestamp = entry.timestamp;
    const category = entry.category;
    const message = entry.message;
    
    return `${emoji} [${timestamp}] [${category}] ${message}`;
  }

  private logToConsole(entry: LogEntry) {
    if (!this.isOwner) return;

    const color = this.getColor(entry.level);
    const message = this.formatMessage(entry);
    
    // Create styled console log
    const style = `
      color: ${color};
      font-weight: bold;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 12px;
    `;
    
    if (entry.data) {
      console.log(`%c${message}`, style, entry.data);
    } else {
      console.log(`%c${message}`, style);
    }
  }

  private addLog(level: LogLevel, category: string, message: string, data?: any) {
    const entry: LogEntry = {
      level,
      category,
      message,
      data,
      timestamp: this.getTimestamp()
    };

    this.logs.push(entry);
    
    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    this.logToConsole(entry);
  }

  // Public logging methods
  info(category: string, message: string, data?: any) {
    this.addLog(LogLevel.INFO, category, message, data);
  }

  success(category: string, message: string, data?: any) {
    this.addLog(LogLevel.SUCCESS, category, message, data);
  }

  warning(category: string, message: string, data?: any) {
    this.addLog(LogLevel.WARNING, category, message, data);
  }

  error(category: string, message: string, data?: any) {
    this.addLog(LogLevel.ERROR, category, message, data);
  }

  debug(category: string, message: string, data?: any) {
    this.addLog(LogLevel.DEBUG, category, message, data);
  }

  api(category: string, message: string, data?: any) {
    this.addLog(LogLevel.API, category, message, data);
  }

  state(category: string, message: string, data?: any) {
    this.addLog(LogLevel.STATE, category, message, data);
  }

  filter(category: string, message: string, data?: any) {
    this.addLog(LogLevel.FILTER, category, message, data);
  }

  // Get all logs for dev console
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  // Clear logs
  clearLogs() {
    this.logs = [];
    console.clear();
    this.success('ConsoleLogger', 'Logs cleared');
  }

  // Export logs as JSON
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

// Create singleton instance
export const logger = new ConsoleLogger();

// Convenience functions for common use cases
export const logAPI = (category: string, message: string, data?: any) => logger.api(category, message, data);
export const logState = (category: string, message: string, data?: any) => logger.state(category, message, data);
export const logFilter = (category: string, message: string, data?: any) => logger.filter(category, message, data);
export const logSuccess = (category: string, message: string, data?: any) => logger.success(category, message, data);
export const logError = (category: string, message: string, data?: any) => logger.error(category, message, data);
export const logWarning = (category: string, message: string, data?: any) => logger.warning(category, message, data);
export const logInfo = (category: string, message: string, data?: any) => logger.info(category, message, data);
export const logDebug = (category: string, message: string, data?: any) => logger.debug(category, message, data);
