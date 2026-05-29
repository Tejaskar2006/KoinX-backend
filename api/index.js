'use strict';

const mongoose = require('mongoose');
const app = require('../app');
const config = require('../config');
const logger = require('../utils/logger');

// Global cached database connection for Vercel Serverless
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) return cachedDb;
  
  logger.info(`[Serverless] Connecting to MongoDB...`);
  const db = await mongoose.connect(config.db.uri);
  cachedDb = db;
  return db;
}

// Connect to DB before handling any request
app.use(async (req, res, next) => {
  try {
    await connectToDatabase();
    next();
  } catch (err) {
    logger.error(`[Serverless] DB Connection Error: ${err.message}`);
    res.status(500).json({ success: false, message: 'Database connection failed' });
  }
});

module.exports = app;
