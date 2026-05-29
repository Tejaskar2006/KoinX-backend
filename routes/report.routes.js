'use strict';

const express = require('express');
const {
  getReport,
  getReportSummary,
  getReportUnmatched,
} = require('../controllers/reportController');

const router = express.Router();

router.get('/:runId', getReport);

router.get('/:runId/summary', getReportSummary);

router.get('/:runId/unmatched', getReportUnmatched);

module.exports = router;
