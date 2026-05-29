'use strict';

require('dotenv').config();
require('express-async-errors');

const express = require('express');
const routes = require('./routes');
const logger = require('./utils/logger');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

app.use('/', routes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

app.use((err, _req, res, _next) => {
  logger.error(`Unhandled error: ${err.message}`, { stack: err.stack });
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

module.exports = app;
