/**
 * Development console utility for better debugging visibility
 */

interface DevConsoleOptions {
  prefix?: string;
  color?: string;
  showTimestamp?: boolean;
}

class DevConsole {
  private isDev = process.env.NODE_ENV === 'development';

  private formatMessage(message: string, options: DevConsoleOptions = {}): string {
    const { prefix = '🔍', color = '#00ff00', showTimestamp = true } = options;
    const timestamp = showTimestamp ? `[${new Date().toLocaleTimeString()}]` : '';
    return `${prefix} ${timestamp} ${message}`;
  }

  log(message: string, data?: any, options?: DevConsoleOptions) {
    if (!this.isDev) return;
    
    const formattedMessage = this.formatMessage(message, options);
    console.log(`%c${formattedMessage}`, `color: ${options?.color || '#00ff00'}; font-weight: bold;`, data || '');
  }

  info(message: string, data?: any) {
    this.log(message, data, { prefix: 'ℹ️', color: '#00bfff' });
  }

  success(message: string, data?: any) {
    this.log(message, data, { prefix: '✅', color: '#00ff00' });
  }

  warning(message: string, data?: any) {
    this.log(message, data, { prefix: '⚠️', color: '#ffa500' });
  }

  error(message: string, data?: any) {
    this.log(message, data, { prefix: '❌', color: '#ff0000' });
  }

  debug(message: string, data?: any) {
    this.log(message, data, { prefix: '🐛', color: '#ff69b4' });
  }

  api(message: string, data?: any) {
    this.log(message, data, { prefix: '🌐', color: '#9370db' });
  }

  insights(message: string, data?: any) {
    this.log(message, data, { prefix: '🧠', color: '#32cd32' });
  }

  service(message: string, data?: any) {
    this.log(message, data, { prefix: '⚙️', color: '#ffd700' });
  }
}

export const devConsole = new DevConsole();
