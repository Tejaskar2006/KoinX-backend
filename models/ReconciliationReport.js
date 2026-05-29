'use strict';

const mongoose = require('mongoose');

const reconciliationReportSchema = new mongoose.Schema(
  {
    runId: {
      type: String,
      required: true,
      index: true,
    },

    category: {
      type: String,
      enum: ['MATCHED', 'CONFLICTING', 'UNMATCHED_USER', 'UNMATCHED_EXCHANGE'],
      required: true,
    },

    
    reason: {
      type: String,
      required: true,
    },

    
    userTx: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    
    exchangeTx: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    

    discrepancies: {
      type: [
        {
          field: String,
          userValue: mongoose.Schema.Types.Mixed,
          exchangeValue: mongoose.Schema.Types.Mixed,
        },
      ],
      default: [],
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: false },
  },
);

reconciliationReportSchema.index({ runId: 1, category: 1 });

module.exports = mongoose.model('ReconciliationReport', reconciliationReportSchema);
