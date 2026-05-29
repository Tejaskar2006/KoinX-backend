'use strict';

const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');

const config = require('../config');
const ReconciliationRun = require('../models/ReconciliationRun');
const Transaction = require('../models/Transaction');
const { ingestFile } = require('../services/ingestion.service');
const { runMatching } = require('../services/matching.service');
const logger = require('../utils/logger');

const reconcileSchema = Joi.object({
  timestampToleranceSec: Joi.number().integer().positive().optional(),
  quantityTolerancePct: Joi.number().positive().max(1).optional(),
});

async function triggerReconciliation(req, res) {
  const { error, value } = reconcileSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  const tolerance = {
    timestampToleranceSec:
      value.timestampToleranceSec ?? config.tolerance.timestampSec,
    quantityTolerancePct:
      value.quantityTolerancePct ?? config.tolerance.quantityPct,
  };

  const runId = uuidv4();

  await ReconciliationRun.create({
    runId,
    status: 'running',
    config: tolerance,
    startedAt: new Date(),
  });

  logger.info(`[Reconcile] New run created. runId=${runId}`, { tolerance });

  res.status(202).json({
    success: true,
    runId,
    status: 'running',
    message: `Reconciliation started. Poll GET /report/${runId} for results.`,
    config: tolerance,
  });

  runPipeline(runId, tolerance).catch((err) => {
    logger.error(`[Reconcile] Pipeline crashed for runId=${runId}: ${err.message}`, err);
  });
}

async function runPipeline(runId, tolerance) {
  try {
    const [userStats, exchStats] = await Promise.all([
      ingestFile(config.data.userCsvPath, 'user', runId),
      ingestFile(config.data.exchangeCsvPath, 'exchange', runId),
    ]);

    const matchSummary = await runMatching(runId, tolerance);

    const totalInvalid = userStats.invalid + exchStats.invalid;

    await ReconciliationRun.findOneAndUpdate(
      { runId },
      {
        status: 'completed',
        completedAt: new Date(),
        summary: {
          totalUser: userStats.total,
          totalExchange: exchStats.total,
          matched: matchSummary.matched,
          conflicting: matchSummary.conflicting,
          unmatchedUser: matchSummary.unmatchedUser,
          unmatchedExchange: matchSummary.unmatchedExchange,
          invalidRows: totalInvalid,
        },
      },
    );

    logger.info(`[Reconcile] runId=${runId} completed successfully.`);
  } catch (err) {
    logger.error(`[Reconcile] runId=${runId} failed: ${err.message}`, err);

    await ReconciliationRun.findOneAndUpdate(
      { runId },
      {
        status: 'failed',
        completedAt: new Date(),
        errorMessage: err.message,
      },
    );
  }
}

module.exports = { triggerReconciliation };
