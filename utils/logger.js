// src/utils/logger.js

import { createLogger, format, transports } from 'winston';
import path from 'path';

// Configure log file paths
const logDir = process.env.LOG_DIR || path.resolve('logs');
const errorLog = path.join(logDir, 'error.log');
const combinedLog = path.join(logDir, 'combined.log');

// Create Winston logger instance
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  defaultMeta: { service: 'eternitys-descent-service' },
  transports: [
    // Write all logs to combined.log
    new transports.File({ filename: combinedLog }),
    // Write errors to error.log
    new transports.File({ filename: errorLog, level: 'error' })
  ]
});

// If we're in development, also log to the console with colorized output
if (process.env.NODE_ENV !== 'production') {
  logger.add(new transports.Console({
    format: format.combine(
      format.colorize(),
      format.printf(({ level, message, timestamp, stack }) => {
        return stack
          ? `[${timestamp}] ${level}: ${message}\n${stack}`
          : `[${timestamp}] ${level}: ${message}`;
      })
    )
  }));
}

export default logger;