type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private static isProduction = process.env.NODE_ENV === 'production';

  private static formatMessage(level: LogLevel, message: string, ...args: unknown[]): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  }

  static debug(message: string, ...args: unknown[]): void {
    if (!this.isProduction) {
      console.debug(this.formatMessage('debug', message), ...args);
    }
  }

  static info(message: string, ...args: unknown[]): void {
    if (!this.isProduction) {
      console.info(this.formatMessage('info', message), ...args);
    }
  }

  static warn(message: string, ...args: unknown[]): void {
    // Warnings are kept in production but might be sent to an external service later
    console.warn(this.formatMessage('warn', message), ...args);
  }

  static error(message: string, ...args: unknown[]): void {
    // Errors are always logged in production
    console.error(this.formatMessage('error', message), ...args);
  }
}

export default Logger;
