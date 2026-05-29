'use strict';

const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    runId: {
      type: String,
      required: true,
      index: true,
    },

    source: {
      type: String,
      enum: ['user', 'exchange'],
      required: true,
    },

    
    rawRow: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    
    txId: {
      type: String,
      default: null,
    },

    timestamp: {
      type: Date,
      default: null,
    },

    type: {
      type: String,
      default: null,
    },

    asset: {
      type: String,
      default: null,
    },

    quantity: {
      type: mongoose.Schema.Types.Decimal128,
      default: null,
    },

    price: {
      type: mongoose.Schema.Types.Decimal128,
      default: null,
    },

    fee: {
      type: mongoose.Schema.Types.Decimal128,
      default: null,
    },

    exchange: {
      type: String,
      default: null,
    },

    
    isValid: {
      type: Boolean,
      default: true,
    },

    qualityFlags: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: false },
  },
);

transactionSchema.index({ runId: 1, source: 1, isValid: 1 });

transactionSchema.index({ runId: 1, txId: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
