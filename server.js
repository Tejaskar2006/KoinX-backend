'use strict';

require('dotenv').config();

const mongoose = require('mongoose');
const app = require('./app');
const config = require('./config');
const logger = require('./utils/logger');

const PORT = config.port;

async function start() {
  try {
    logger.info(`[Server] Connecting to MongoDB at ${config.db.uri} …`);
    await mongoose.connect(config.db.uri);
    logger.info('[Server] MongoDB connected.');

    app.listen(PORT, () => {
      logger.info(`[Server] KoinX Reconciliation Engine running on http://localhost:${PORT}`);
      logger.info(`[Server] Health check: GET http://localhost:${PORT}/health`);
    });
  } catch (err) {
    logger.error(`[Server] Failed to start: ${err.message}`, err);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  logger.info('[Server] Shutting down gracefully…');
  await mongoose.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('[Server] SIGTERM received. Shutting down…');
  await mongoose.disconnect();
  process.exit(0);
});

start();
