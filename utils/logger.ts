type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private formatMessage(level: LogLevel, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    return `${prefix} ${message}`;
  }

  info(message: string, ...args: any[]): void {
  }

  warn(message: string, ...args: any[]): void {
  }

  error(message: string, ...args: any[]): void {
  }

  debug(message: string, ...args: any[]): void {
  }
}

export const logger = new Logger();

