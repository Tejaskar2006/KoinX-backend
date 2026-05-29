'use strict';

const ReconciliationReport = require('../models/ReconciliationReport');
const ReconciliationRun = require('../models/ReconciliationRun');
const { stringify } = require('csv-stringify/sync');
const logger = require('../utils/logger');

const DEFAULT_PAGE_SIZE = 50;

async function getFullReport(runId, page = 1, limit = DEFAULT_PAGE_SIZE) {
  const run = await ReconciliationRun.findOne({ runId }).lean();
  if (!run) return null;

  const total = await ReconciliationReport.countDocuments({ runId });
  const rows = await ReconciliationReport.find({ runId })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  return {
    run,
    rows,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

async function getSummary(runId) {
  const run = await ReconciliationRun.findOne({ runId }).lean();
  if (!run) return null;

  return {
    runId: run.runId,
    status: run.status,
    config: run.config,
    summary: run.summary,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
  };
}

async function getUnmatched(runId, page = 1, limit = DEFAULT_PAGE_SIZE) {
  const run = await ReconciliationRun.findOne({ runId }).lean();
  if (!run) return null;

  const query = {
    runId,
    category: { $in: ['UNMATCHED_USER', 'UNMATCHED_EXCHANGE'] },
  };

  const total = await ReconciliationReport.countDocuments(query);
  const rows = await ReconciliationReport.find(query)
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  return {
    runId,
    rows,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

async function exportReportCsv(runId) {
  logger.info(`[Report] Generating CSV export for runId=${runId}`);

  const rows = await ReconciliationReport.find({ runId }).lean();

  if (rows.length === 0) return '';

  const flatRows = rows.map((row) => {
    const flatUser = flattenTx(row.userTx, 'user_');
    const flatExch = flattenTx(row.exchangeTx, 'exchange_');
    const discStr =
      row.discrepancies && row.discrepancies.length > 0
        ? row.discrepancies
            .map((d) => `${d.field}: ${d.userValue} vs ${d.exchangeValue}`)
            .join('; ')
        : '';

    return {
      category: row.category,
      reason: row.reason,
      discrepancies: discStr,
      ...flatUser,
      ...flatExch,
    };
  });

  return stringify(flatRows, { header: true });
}

function flattenTx(tx, prefix) {
  if (!tx) {
    return {
      [`${prefix}tx_id`]: '',
      [`${prefix}timestamp`]: '',
      [`${prefix}type`]: '',
      [`${prefix}asset`]: '',
      [`${prefix}quantity`]: '',
      [`${prefix}price`]: '',
      [`${prefix}fee`]: '',
      [`${prefix}exchange`]: '',
      [`${prefix}quality_flags`]: '',
    };
  }
  return {
    [`${prefix}tx_id`]: tx.txId || '',
    [`${prefix}timestamp`]: tx.timestamp ? new Date(tx.timestamp).toISOString() : '',
    [`${prefix}type`]: tx.type || '',
    [`${prefix}asset`]: tx.asset || '',
    [`${prefix}quantity`]: tx.quantity || '',
    [`${prefix}price`]: tx.price || '',
    [`${prefix}fee`]: tx.fee || '',
    [`${prefix}exchange`]: tx.exchange || '',
    [`${prefix}quality_flags`]: tx.qualityFlags ? tx.qualityFlags.join(', ') : '',
  };
}

module.exports = { getFullReport, getSummary, getUnmatched, exportReportCsv };
