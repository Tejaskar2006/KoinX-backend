'use strict';

const mongoose = require('mongoose');

const reconciliationRunSchema = new mongoose.Schema(
  {
    runId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    status: {
      type: String,
      enum: ['pending', 'running', 'completed', 'failed'],
      default: 'pending',
    },

    
    config: {
      timestampToleranceSec: {
        type: Number,
        required: true,
      },
      quantityTolerancePct: {
        type: Number,
        required: true,
      },
    },

    
    summary: {
      totalUser: { type: Number, default: 0 },
      totalExchange: { type: Number, default: 0 },
      matched: { type: Number, default: 0 },
      conflicting: { type: Number, default: 0 },
      unmatchedUser: { type: Number, default: 0 },
      unmatchedExchange: { type: Number, default: 0 },
      invalidRows: { type: Number, default: 0 },
    },

    startedAt: {
      type: Date,
      default: null,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    errorMessage: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  },
);

module.exports = mongoose.model('ReconciliationRun', reconciliationRunSchema);
