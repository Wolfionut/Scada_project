const express = require('express');
const router = express.Router();
const measurementController = require('../controllers/measurementController');
const auth = require('../middleware/auth');

// ===== PROJECT-LEVEL ENDPOINTS (Used by MeasurementsPage) =====

// Get current values for all tags in project (PRIMARY ENDPOINT)
router.get('/current/:projectId', auth, measurementController.getCurrentValues);

// Get time series data for project tags (CHARTS ENDPOINT)
router.get('/timeseries/:projectId', auth, measurementController.getTimeSeriesData);

// Get recent activity across project (ACTIVITY FEED)
router.get('/activity/:projectId', auth, measurementController.getRecentActivity);

// Get project measurement statistics (STATISTICS)
router.get('/statistics/:projectId', auth, measurementController.getProjectStatistics);

// Search measurements across project
router.get('/search/:projectId', auth, measurementController.searchMeasurements);

// ===== TAG-SPECIFIC ENDPOINTS =====

// Get measurements for specific tag (with time filtering)
router.get('/tag/:tagId', auth, measurementController.getMeasurementsByTag);

// Create measurement for tag (manual entry)
router.post('/tag/:tagId', auth, measurementController.createMeasurement);

// Delete specific measurement
router.delete('/:measurementId', auth, measurementController.deleteMeasurement);

module.exports = router;