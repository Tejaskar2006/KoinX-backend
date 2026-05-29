'use strict';

const ALIAS_MAP = {
  bitcoin: 'BTC',
  'bitcoin (btc)': 'BTC',
  xbt: 'BTC',
  ethereum: 'ETH',
  'ethereum (eth)': 'ETH',
  ether: 'ETH',
  tether: 'USDT',
  'tether (usdt)': 'USDT',
  'usd coin': 'USDC',
  usdc: 'USDC',
  'binance coin': 'BNB',
  bnb: 'BNB',
  solana: 'SOL',
  'solana (sol)': 'SOL',
  ripple: 'XRP',
  xrp: 'XRP',
  cardano: 'ADA',
  ada: 'ADA',
  dogecoin: 'DOGE',
  doge: 'DOGE',
  polkadot: 'DOT',
  dot: 'DOT',
  litecoin: 'LTC',
  ltc: 'LTC',
  avalanche: 'AVAX',
  avax: 'AVAX',
  chainlink: 'LINK',
  link: 'LINK',
  polygon: 'MATIC',
  matic: 'MATIC',
  'shiba inu': 'SHIB',
  shib: 'SHIB',
};

function normaliseAsset(raw) {
  if (!raw || typeof raw !== 'string') return '';
  const trimmed = raw.trim().toLowerCase();
  return ALIAS_MAP[trimmed] || raw.trim().toUpperCase();
}

module.exports = { normaliseAsset, ALIAS_MAP };
