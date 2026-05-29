'use strict';

const express = require('express');
const { triggerReconciliation } = require('../controllers/reconcileController');

const router = express.Router();

router.post('/', triggerReconciliation);

module.exports = router;
