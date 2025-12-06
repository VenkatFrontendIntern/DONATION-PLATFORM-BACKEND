type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private formatMessage(level: LogLevel, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    return `${prefix} ${message}`;
  }

  info(message: string, ...args: any[]): void {
    const formattedMessage = this.formatMessage('info', message);
    console.log(formattedMessage, ...args);
  }

  warn(message: string, ...args: any[]): void {
    const formattedMessage = this.formatMessage('warn', message);
    console.warn(formattedMessage, ...args);
  }

  error(message: string, ...args: any[]): void {
    const formattedMessage = this.formatMessage('error', message);
    console.error(formattedMessage, ...args);
  }

  debug(message: string, ...args: any[]): void {
    const formattedMessage = this.formatMessage('debug', message);
    console.log(formattedMessage, ...args);
  }
}

export const logger = new Logger();

