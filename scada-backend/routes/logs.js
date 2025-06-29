const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const logController = require('../controllers/logController');

// All routes are protected
router.use(authenticateToken);

// List logs for current user
router.get('/', logController.getLogs);

// Create a new log
router.post('/', logController.createLog);

// Delete a log by ID
router.delete('/:logId', logController.deleteLog);

module.exports = router;
