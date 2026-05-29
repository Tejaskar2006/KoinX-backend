'use strict';

const { getFullReport, getSummary, getUnmatched, exportReportCsv } = require('../services/report.service');
const logger = require('../utils/logger');

function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(query.limit, 10) || 50));
  return { page, limit };
}

async function getReport(req, res) {
  const { runId } = req.params;
  const { page, limit } = parsePagination(req.query);

  
  if (req.query.format === 'csv') {
    const csv = await exportReportCsv(runId);
    if (csv === null) {
      return res.status(404).json({ success: false, message: `Run not found: ${runId}` });
    }
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="report_${runId}.csv"`);
    return res.send(csv);
  }

  const result = await getFullReport(runId, page, limit);
  if (!result) {
    return res.status(404).json({ success: false, message: `Run not found: ${runId}` });
  }

  return res.json({
    success: true,
    runId,
    status: result.run.status,
    config: result.run.config,
    summary: result.run.summary,
    pagination: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
    },
    report: result.rows,
  });
}

async function getReportSummary(req, res) {
  const { runId } = req.params;

  const result = await getSummary(runId);
  if (!result) {
    return res.status(404).json({ success: false, message: `Run not found: ${runId}` });
  }

  return res.json({ success: true, ...result });
}

async function getReportUnmatched(req, res) {
  const { runId } = req.params;
  const { page, limit } = parsePagination(req.query);

  const result = await getUnmatched(runId, page, limit);
  if (!result) {
    return res.status(404).json({ success: false, message: `Run not found: ${runId}` });
  }

  return res.json({
    success: true,
    runId,
    pagination: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
    },
    unmatched: result.rows,
  });
}

module.exports = { getReport, getReportSummary, getReportUnmatched };
