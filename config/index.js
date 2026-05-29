'use strict';

require('dotenv').config();

const config = {
  port: parseInt(process.env.PORT, 10) || 3000,

  db: {
    uri: process.env.MONGO_URI || 'mongodb://localhost:27017/koinx',
  },

  tolerance: {
    timestampSec: parseInt(process.env.TIMESTAMP_TOLERANCE_SECONDS, 10) || 300,
    quantityPct: parseFloat(process.env.QUANTITY_TOLERANCE_PCT) || 0.01,
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },

  data: {
    userCsvPath: process.env.USER_CSV_PATH || './data/user_transactions.csv',
    exchangeCsvPath:
      process.env.EXCHANGE_CSV_PATH || './data/exchange_transactions.csv',
  },
};

module.exports = config;
