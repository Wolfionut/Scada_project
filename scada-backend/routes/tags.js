// routes/tagRoutes.js - Fixed Routes for Working MeasurementsPage
const express = require('express');
const router = express.Router();
const tagController = require('../controllers/tagController');
const auth = require('../middleware/auth');

// ===== PROJECT-LEVEL ROUTES (Main Routes) =====
// These are the routes your MeasurementsPage expects

console.log('🔍 Debug: Available tagController functions:', Object.keys(tagController));

// Get all tags for a project (used by MeasurementsPage)
router.get('/project/:projectId', auth, tagController.getTagsByProject);

// Get all devices for a project (used by MeasurementsPage)
router.get('/project/:projectId/devices', auth, tagController.getDevicesForProject);

// Create tag for project
router.post('/project/:projectId', auth, tagController.createTagForProject);

// Update tag in project
router.put('/project/:projectId/:tagId', auth, tagController.updateTagForProject);

// Delete tag from project
router.delete('/project/:projectId/:tagId', auth, tagController.deleteTagForProject);

// Get project tag statistics
router.get('/project/:projectId/statistics', auth, tagController.getProjectTagStats);

// ===== ENHANCED ENDPOINTS =====
// Enhanced statistics and health endpoints
router.get('/project/:projectId/stats', auth, tagController.getTagStatistics);
router.get('/project/:projectId/latest', auth, tagController.getLatestMeasurements);
router.get('/project/:projectId/:tagId/health', auth, tagController.getTagHealth);
router.get('/project/:projectId/:tagId/history', auth, tagController.getTagHistory);

// Device-specific enhanced endpoint
router.get('/project/:projectId/device/:deviceId/stats', auth, tagController.getDeviceTagsWithStats);

// ===== LEGACY DEVICE-CENTRIC ROUTES (for backward compatibility) =====
// Keep these for any existing code that uses device-specific routes

// Create tag for device (legacy)
router.post('/device/:deviceId', auth, tagController.createTag);

// Get tags by device (legacy)
router.get('/device/:deviceId', auth, tagController.getTagsByDevice);

// Update tag (legacy)
router.put('/device/:deviceId/:tagId', auth, tagController.updateTag);

// Delete tag (legacy)
router.delete('/device/:deviceId/:tagId', auth, tagController.deleteTag);

// Replace the existing route with this debug version:
router.get('/project/:projectId', auth, (req, res) => {
    console.log('🏷️ Route hit: GET /project/' + req.params.projectId);
    console.log('🏷️ User:', req.user?.id);
    console.log('🏷️ Controller has getTagsByProject:', !!tagController.getTagsByProject);

    if (!tagController.getTagsByProject) {
        return res.status(500).json({
            error: 'getTagsByProject function not found',
            available: Object.keys(tagController)
        });
    }

    tagController.getTagsByProject(req, res);
});

// Test route WITHOUT auth middleware
router.get('/project/:projectId/noauth', (req, res) => {
    console.log('🔓 No-auth test for project:', req.params.projectId);
    res.json({
        message: 'Route found without auth',
        projectId: req.params.projectId
    });
});

console.log('🔍 Available tagController functions:', Object.keys(tagController));
// 1. Simple test route (no auth)
router.get('/test', (req, res) => {
    res.json({
        message: 'Tags routes working!',
        timestamp: new Date().toISOString(),
        availableFunctions: Object.keys(tagController)
    });
});

// 2. Debug route to test auth
router.get('/project/:projectId/debug', auth, (req, res) => {
    console.log('🔐 Auth debug route hit for project:', req.params.projectId);
    console.log('🔐 User from token:', req.user);
    res.json({
        message: 'Authentication working!',
        projectId: req.params.projectId,
        user: req.user,
        timestamp: new Date().toISOString()
    });
});

// 3. Enhanced debug version of your main route
router.get('/project/:projectId/enhanced-debug', auth, (req, res) => {
    console.log('🏷️ Enhanced debug route hit: GET /project/' + req.params.projectId);
    console.log('🏷️ User:', req.user?.id);
    console.log('🏷️ Controller has getTagsByProject:', !!tagController.getTagsByProject);

    if (!tagController.getTagsByProject) {
        return res.status(500).json({
            error: 'getTagsByProject function not found',
            available: Object.keys(tagController)
        });
    }

    // Call the actual function
    tagController.getTagsByProject(req, res);
});
module.exports = router;

// ================================================================================================

// routes/measurementRoutes.js - Fixed Routes for MeasurementsPage


// ================================================================================================

// app.js or server.js - Make sure routes are properly mounted
/*
Add these lines to your main app file:

const tagRoutes = require('./routes/tagRoutes');
const measurementRoutes = require('./routes/measurementRoutes');

// Mount routes with /api prefix
app.use('/api/tags', tagRoutes);
app.use('/api/measurements', measurementRoutes);
*/

// ================================================================================================

// ENDPOINT REFERENCE FOR FRONTEND
/*

✅ WORKING ENDPOINTS for MeasurementsPage.js:

PROJECT DATA:
- GET /api/tags/project/:projectId              → Get all project tags
- GET /api/tags/project/:projectId/devices     → Get all project devices

CURRENT VALUES:
- GET /api/measurements/current/:projectId      → Real-time dashboard data

CHARTS & ANALYTICS:
- GET /api/measurements/timeseries/:projectId   → Time series for charts
- GET /api/measurements/statistics/:projectId   → Project statistics
- GET /api/measurements/activity/:projectId     → Recent activity feed

TAG MANAGEMENT:
- POST /api/tags/project/:projectId             → Create new tag
- PUT /api/tags/project/:projectId/:tagId       → Update tag
- DELETE /api/tags/project/:projectId/:tagId    → Delete tag

ENHANCED FEATURES:
- GET /api/tags/project/:projectId/stats        → Enhanced tag statistics
- GET /api/tags/project/:projectId/latest       → Latest measurements
- GET /api/tags/project/:projectId/:tagId/health → Tag health status
- GET /api/tags/project/:projectId/:tagId/history → Tag history

*/