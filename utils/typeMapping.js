'use strict';

const TX_TYPES = {
  BUY: 'BUY',
  SELL: 'SELL',
  DEPOSIT: 'DEPOSIT',
  WITHDRAWAL: 'WITHDRAWAL',
  TRANSFER_IN: 'TRANSFER_IN',
  TRANSFER_OUT: 'TRANSFER_OUT',
  TRADE: 'TRADE',
};

const TYPE_ALIAS_MAP = {
  buy: TX_TYPES.BUY,
  bought: TX_TYPES.BUY,
  purchase: TX_TYPES.BUY,

  sell: TX_TYPES.SELL,
  sold: TX_TYPES.SELL,

  deposit: TX_TYPES.DEPOSIT,
  credit: TX_TYPES.DEPOSIT,
  receive: TX_TYPES.DEPOSIT,
  received: TX_TYPES.DEPOSIT,

  withdrawal: TX_TYPES.WITHDRAWAL,
  withdraw: TX_TYPES.WITHDRAWAL,
  debit: TX_TYPES.WITHDRAWAL,
  send: TX_TYPES.WITHDRAWAL,
  sent: TX_TYPES.WITHDRAWAL,

  transfer_in: TX_TYPES.TRANSFER_IN,
  'transfer in': TX_TYPES.TRANSFER_IN,
  transferin: TX_TYPES.TRANSFER_IN,

  transfer_out: TX_TYPES.TRANSFER_OUT,
  'transfer out': TX_TYPES.TRANSFER_OUT,
  transferout: TX_TYPES.TRANSFER_OUT,

  trade: TX_TYPES.TRADE,
  swap: TX_TYPES.TRADE,
  exchange: TX_TYPES.TRADE,
};

const CROSS_PERSPECTIVE_PAIRS = {
  [TX_TYPES.TRANSFER_IN]: TX_TYPES.TRANSFER_OUT,
  [TX_TYPES.TRANSFER_OUT]: TX_TYPES.TRANSFER_IN,
};

function normaliseType(raw) {
  if (!raw || typeof raw !== 'string') return '';
  const key = raw.trim().toLowerCase();
  return TYPE_ALIAS_MAP[key] || raw.trim().toUpperCase();
}

function typesMatch(typeA, typeB) {
  if (typeA === typeB) return true;
  return CROSS_PERSPECTIVE_PAIRS[typeA] === typeB;
}

module.exports = { TX_TYPES, normaliseType, typesMatch, CROSS_PERSPECTIVE_PAIRS };
