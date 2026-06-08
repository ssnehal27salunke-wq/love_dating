const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'lovemarriage-api' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...rest }) => {
          const extra = Object.keys(rest).length > 1 ? ` ${JSON.stringify(rest)}` : '';
          return `${timestamp} ${level}: ${message}${extra}`;
        })
      ),
    }),
  ],
});

// Stream for morgan HTTP logging
logger.stream = { write: (msg) => logger.http(msg.trim()) };

module.exports = logger;
