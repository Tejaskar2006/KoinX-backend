'use strict';

const Transaction = require('../models/Transaction');
const ReconciliationReport = require('../models/ReconciliationReport');
const { typesMatch } = require('../utils/typeMapping');
const logger = require('../utils/logger');

function toNum(dec128) {
  if (dec128 === null || dec128 === undefined) return null;
  if (typeof dec128 === 'number') return dec128;
  return parseFloat(dec128.toString());
}

function pctDiff(a, b) {
  if (a === null || b === null) return Infinity;
  if (a === 0 && b === 0) return 0;
  if (a === 0 || b === 0) return Infinity;
  return Math.abs((a - b) / b);
}

function tsDiffSec(tsA, tsB) {
  if (!tsA || !tsB) return Infinity;
  return Math.abs((new Date(tsA) - new Date(tsB)) / 1000);
}

function buildDiscrepancies(userTx, exchTx, tolerance) {
  const diffs = [];

  const uQty = toNum(userTx.quantity);
  const eQty = toNum(exchTx.quantity);
  const qPct = pctDiff(uQty, eQty);
  if (qPct > tolerance.quantityTolerancePct) {
    diffs.push({ field: 'quantity', userValue: uQty, exchangeValue: eQty });
  }

  const tsDiff = tsDiffSec(userTx.timestamp, exchTx.timestamp);
  if (tsDiff > tolerance.timestampToleranceSec) {
    diffs.push({
      field: 'timestamp',
      userValue: userTx.timestamp,
      exchangeValue: exchTx.timestamp,
    });
  }

  if (userTx.asset !== exchTx.asset) {
    diffs.push({ field: 'asset', userValue: userTx.asset, exchangeValue: exchTx.asset });
  }

  if (!typesMatch(userTx.type, exchTx.type)) {
    diffs.push({ field: 'type', userValue: userTx.type, exchangeValue: exchTx.type });
  }

  return diffs;
}

function txToPlain(doc) {
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  for (const field of ['quantity', 'price', 'fee']) {
    if (obj[field] && obj[field].constructor && obj[field].constructor.name === 'Decimal128') {
      obj[field] = obj[field].toString();
    }
  }
  return obj;
}

async function phaseOneExactIdMatch(userTxs, exchTxs, tolerance, runId) {
  const reports = [];
  const usedUserIds = new Set();
  const usedExchIds = new Set();

  const exchByTxId = new Map();
  for (const etx of exchTxs) {
    if (etx.txId) {
      if (!exchByTxId.has(etx.txId)) {
        exchByTxId.set(etx.txId, []);
      }
      exchByTxId.get(etx.txId).push(etx);
    }
  }

  for (const utx of userTxs) {
    if (!utx.txId) continue;
    const candidates = exchByTxId.get(utx.txId);
    if (!candidates || candidates.length === 0) continue;

    let best = null;
    let bestQtyDiff = Infinity;

    for (const etx of candidates) {
      if (usedExchIds.has(etx._id.toString())) continue;
      const uQty = toNum(utx.quantity);
      const eQty = toNum(etx.quantity);
      const diff = pctDiff(uQty, eQty);
      if (diff < bestQtyDiff) {
        bestQtyDiff = diff;
        best = etx;
      }
    }

    if (!best) continue;

    usedUserIds.add(utx._id.toString());
    usedExchIds.add(best._id.toString());

    const discrepancies = buildDiscrepancies(utx, best, tolerance);

    if (discrepancies.length === 0) {
      reports.push({
        runId,
        category: 'MATCHED',
        reason: 'Exact transaction_id match with all fields within tolerance.',
        userTx: txToPlain(utx),
        exchangeTx: txToPlain(best),
        discrepancies: [],
      });
    } else {
      reports.push({
        runId,
        category: 'CONFLICTING',
        reason: `Matched by transaction_id but fields differ: ${discrepancies.map((d) => d.field).join(', ')}.`,
        userTx: txToPlain(utx),
        exchangeTx: txToPlain(best),
        discrepancies,
      });
    }
  }

  logger.info(`[Matching] Phase 1 — ${reports.length} pairs found by exact txId.`);
  return { reports, usedUserIds, usedExchIds };
}

async function phaseTwoProximityMatch(userTxs, exchTxs, tolerance, runId, usedUserIds, usedExchIds) {
  const reports = [];

  const remainingUser = userTxs.filter((t) => !usedUserIds.has(t._id.toString()));
  const remainingExch = exchTxs.filter((t) => !usedExchIds.has(t._id.toString()));

  for (const utx of remainingUser) {
    if (!utx.asset || !utx.timestamp || utx.quantity === null) continue;

    const uQty = toNum(utx.quantity);

    const candidates = remainingExch.filter((etx) => {
      if (usedExchIds.has(etx._id.toString())) return false;
      if (!etx.asset || !etx.timestamp || etx.quantity === null) return false;
      if (etx.asset !== utx.asset) return false;
      if (!typesMatch(utx.type, etx.type)) return false;
      const tsDiff = tsDiffSec(utx.timestamp, etx.timestamp);
      return tsDiff <= tolerance.timestampToleranceSec;
    });

    if (candidates.length === 0) continue;

    let best = null;
    let bestQtyDiff = Infinity;

    for (const etx of candidates) {
      const eQty = toNum(etx.quantity);
      const diff = pctDiff(uQty, eQty);
      if (diff < bestQtyDiff) {
        bestQtyDiff = diff;
        best = etx;
      }
    }

    if (bestQtyDiff > tolerance.quantityTolerancePct) continue;

    usedUserIds.add(utx._id.toString());
    usedExchIds.add(best._id.toString());

    const discrepancies = buildDiscrepancies(utx, best, tolerance);

    if (discrepancies.length === 0) {
      reports.push({
        runId,
        category: 'MATCHED',
        reason: 'Proximity match on asset, type, timestamp window, and quantity tolerance.',
        userTx: txToPlain(utx),
        exchangeTx: txToPlain(best),
        discrepancies: [],
      });
    } else {
      reports.push({
        runId,
        category: 'CONFLICTING',
        reason: `Proximity match found but fields differ: ${discrepancies.map((d) => d.field).join(', ')}.`,
        userTx: txToPlain(utx),
        exchangeTx: txToPlain(best),
        discrepancies,
      });
    }
  }

  logger.info(`[Matching] Phase 2 — ${reports.length} additional pairs found by proximity.`);
  return { reports, usedUserIds, usedExchIds };
}

function phaseThreeUnmatched(userTxs, exchTxs, usedUserIds, usedExchIds, runId) {
  const reports = [];

  for (const utx of userTxs) {
    if (usedUserIds.has(utx._id.toString())) continue;
    reports.push({
      runId,
      category: 'UNMATCHED_USER',
      reason: 'No matching exchange transaction found within configured tolerances.',
      userTx: txToPlain(utx),
      exchangeTx: null,
      discrepancies: [],
    });
  }

  for (const etx of exchTxs) {
    if (usedExchIds.has(etx._id.toString())) continue;
    reports.push({
      runId,
      category: 'UNMATCHED_EXCHANGE',
      reason: 'No matching user transaction found within configured tolerances.',
      userTx: null,
      exchangeTx: txToPlain(etx),
      discrepancies: [],
    });
  }

  logger.info(
    `[Matching] Phase 3 — ${reports.filter((r) => r.category === 'UNMATCHED_USER').length} unmatched user, ` +
      `${reports.filter((r) => r.category === 'UNMATCHED_EXCHANGE').length} unmatched exchange.`,
  );

  return reports;
}

async function runMatching(runId, tolerance) {
  logger.info(`[Matching] Starting matching for runId=${runId}`, { tolerance });

  const userTxs = await Transaction.find({ runId, source: 'user', isValid: true }).lean(false);
  const exchTxs = await Transaction.find({ runId, source: 'exchange', isValid: true }).lean(false);

  logger.info(
    `[Matching] Loaded ${userTxs.length} valid user txs, ${exchTxs.length} valid exchange txs.`,
  );

  const phase1 = await phaseOneExactIdMatch(userTxs, exchTxs, tolerance, runId);

  const phase2 = await phaseTwoProximityMatch(
    userTxs,
    exchTxs,
    tolerance,
    runId,
    phase1.usedUserIds,
    phase1.usedExchIds,
  );

  const allUsedUser = new Set([...phase1.usedUserIds, ...phase2.usedUserIds]);
  const allUsedExch = new Set([...phase1.usedExchIds, ...phase2.usedExchIds]);

  const phase3Reports = phaseThreeUnmatched(userTxs, exchTxs, allUsedUser, allUsedExch, runId);

  const allReports = [...phase1.reports, ...phase2.reports, ...phase3Reports];
  if (allReports.length > 0) {
    await ReconciliationReport.insertMany(allReports, { ordered: false });
  }

  const summary = {
    matched: allReports.filter((r) => r.category === 'MATCHED').length,
    conflicting: allReports.filter((r) => r.category === 'CONFLICTING').length,
    unmatchedUser: allReports.filter((r) => r.category === 'UNMATCHED_USER').length,
    unmatchedExchange: allReports.filter((r) => r.category === 'UNMATCHED_EXCHANGE').length,
  };

  logger.info(`[Matching] Complete. Summary:`, summary);
  return summary;
}

module.exports = { runMatching };
