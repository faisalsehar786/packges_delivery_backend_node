const { format, createLogger, transports } = require("winston");

const logger = createLogger({
  level: "debug",
  format: format.json(),
  transports: [
    //new transports:
    new transports.File({
      filename: "logs/example.log",
    }),
  ],
});

module.exports = logger;