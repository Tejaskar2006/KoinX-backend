'use strict';

const { parseCsv } = require('../utils/csvParser');
const { normaliseAsset } = require('../utils/assetAliases');
const { normaliseType } = require('../utils/typeMapping');
const Transaction = require('../models/Transaction');
const logger = require('../utils/logger');

const FLAG = {
  MISSING_TX_ID: 'MISSING_TX_ID',
  INVALID_TIMESTAMP: 'INVALID_TIMESTAMP',
  MISSING_ASSET: 'MISSING_ASSET',
  INVALID_QUANTITY: 'INVALID_QUANTITY',
  NEGATIVE_QUANTITY: 'NEGATIVE_QUANTITY',
  INVALID_PRICE: 'INVALID_PRICE',
  INVALID_FEE: 'INVALID_FEE',
  UNKNOWN_TYPE: 'UNKNOWN_TYPE',
  MISSING_TYPE: 'MISSING_TYPE',
};

const KNOWN_TYPES = new Set([
  'BUY', 'SELL', 'DEPOSIT', 'WITHDRAWAL',
  'TRANSFER_IN', 'TRANSFER_OUT', 'TRADE',
]);

function parseNumeric(raw, fieldFlag) {
  if (raw === undefined || raw === null || raw === '') {
    return { value: null, flag: null };
  }
  const num = parseFloat(String(raw).replace(/,/g, ''));
  if (isNaN(num)) return { value: null, flag: fieldFlag };
  return { value: num, flag: null };
}

function buildTransactionDoc(raw, source, runId) {
  const flags = [];

  const txId = raw.transaction_id || raw.id || raw.txid || raw.tx_id || null;
  if (!txId) flags.push(FLAG.MISSING_TX_ID);

  const rawTs = raw.timestamp || raw.date || raw.time || null;
  let timestamp = null;
  if (!rawTs) {
    flags.push(FLAG.INVALID_TIMESTAMP);
  } else {
    const parsed = new Date(rawTs);
    if (isNaN(parsed.getTime())) {
      flags.push(FLAG.INVALID_TIMESTAMP);
    } else {
      timestamp = parsed;
    }
  }

  const rawType = raw.type || raw.transaction_type || null;
  let type = null;
  if (!rawType) {
    flags.push(FLAG.MISSING_TYPE);
  } else {
    type = normaliseType(rawType);
    if (!KNOWN_TYPES.has(type)) {
      flags.push(FLAG.UNKNOWN_TYPE);
    }
  }

  const rawAsset = raw.asset || raw.currency || raw.coin || null;
  let asset = null;
  if (!rawAsset) {
    flags.push(FLAG.MISSING_ASSET);
  } else {
    asset = normaliseAsset(rawAsset);
  }

  const rawQty = raw.quantity || raw.amount || raw.qty || null;
  const { value: quantity, flag: qtyFlag } = parseNumeric(rawQty, FLAG.INVALID_QUANTITY);
  if (qtyFlag) flags.push(qtyFlag);
  if (quantity !== null && quantity < 0) flags.push(FLAG.NEGATIVE_QUANTITY);

  const rawPrice = raw.price || raw.price_usd || null;
  const { value: price, flag: priceFlag } = parseNumeric(rawPrice, FLAG.INVALID_PRICE);
  if (priceFlag) flags.push(priceFlag);

  const rawFee = raw.fee || raw.fees || null;
  const { value: fee, flag: feeFlag } = parseNumeric(rawFee, FLAG.INVALID_FEE);
  if (feeFlag) flags.push(feeFlag);

  const exchange = raw.exchange || raw.platform || raw.source || null;

  const criticalFlags = [
    FLAG.INVALID_TIMESTAMP,
    FLAG.MISSING_ASSET,
    FLAG.INVALID_QUANTITY,
    FLAG.NEGATIVE_QUANTITY,
    FLAG.MISSING_TYPE,
  ];
  const isValid = !flags.some((f) => criticalFlags.includes(f));

  return {
    runId,
    source,
    rawRow: raw,
    txId,
    timestamp,
    type,
    asset,
    quantity,
    price,
    fee,
    exchange,
    isValid,
    qualityFlags: flags,
  };
}

async function ingestFile(filePath, source, runId) {
  logger.info(`[Ingestion] Starting ingestion for source="${source}" runId=${runId}`);

  const rows = await parseCsv(filePath);
  const docs = rows.map((row) => buildTransactionDoc(row, source, runId));

  const invalid = docs.filter((d) => !d.isValid);
  const valid = docs.filter((d) => d.isValid);

  if (invalid.length > 0) {
    logger.warn(
      `[Ingestion] ${invalid.length} invalid rows in ${source} file. Flags: ${
        invalid.map((d) => `[${d.qualityFlags.join(', ')}]`).join(' | ')
      }`,
    );
  }

  await Transaction.insertMany(docs, { ordered: false });

  logger.info(
    `[Ingestion] source="${source}" — total=${docs.length}, valid=${valid.length}, invalid=${invalid.length}`,
  );

  return { total: docs.length, valid: valid.length, invalid: invalid.length };
}

module.exports = { ingestFile };
