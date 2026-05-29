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

// Wrap the Express app to ensure DB connects BEFORE routing
module.exports = async (req, res) => {
  try {
    await connectToDatabase();
  } catch (err) {
    logger.error(`[Serverless] DB Connection Error: ${err.message}`);
    return res.status(500).json({ success: false, message: 'Database connection failed' });
  }
  
  // Pass the request to the Express application
  return app(req, res);
};
