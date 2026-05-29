'use strict';

const express = require('express');
const reconcileRoutes = require('./reconcile.routes');
const reportRoutes = require('./report.routes');

const router = express.Router();

router.use('/reconcile', reconcileRoutes);
router.use('/report', reportRoutes);

module.exports = router;
