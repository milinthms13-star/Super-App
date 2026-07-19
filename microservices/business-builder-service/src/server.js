require('dotenv').config();
const app = require('./app');
const connectDatabase = require('./config/database');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 3020;

connectDatabase()
  .then(() => {
    app.listen(PORT, () => {
      logger.info(`business-builder-service running on port ${PORT}`);
    });
  })
  .catch((error) => {
    logger.error(`Failed to start: ${error.message}`);
    process.exit(1);
  });

process.on('SIGTERM', () => {
  logger.info('Shutting down gracefully');
  process.exit(0);
});
