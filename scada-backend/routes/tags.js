// routes/tags.js - Fixed Enhanced Independent Tags Approach Routes
const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const tagController = require('../controllers/tagController');

console.log('🏷️ Loading enhanced independent tags routes...');

// All routes are protected
router.use(authenticateToken);

// ==============================================================================
// PRIMARY INDEPENDENT APPROACH ROUTES (Project-level)
// ==============================================================================

// Project-wide tag operations (PRIMARY INTERFACE)
router.get('/project/:projectId', tagController.getTagsByProject);
router.post('/project/:projectId', tagController.createTagForProject);
router.put('/project/:projectId/:tagId', tagController.updateTagForProject);
router.delete('/project/:projectId/:tagId', tagController.deleteTagForProject);

// Project helper endpoints
router.get('/project/:projectId/devices', tagController.getDevicesForProject);
router.get('/project/:projectId/stats', tagController.getProjectTagStats);

// ==============================================================================
// ENHANCED PROJECT ROUTES (Using Database Improvements)
// ==============================================================================

// Project-wide tag statistics (uses tag_statistics view)
router.get('/project/:projectId/statistics', tagController.getTagStatistics);

// Latest measurements for all project tags (uses latest_measurements view)
router.get('/project/:projectId/latest', tagController.getLatestMeasurements);

// Individual tag health status (uses get_tag_health function)
router.get('/project/:projectId/:tagId/health', tagController.getTagHealth);

// Tag historical data for charts (uses optimized indexes)
router.get('/project/:projectId/:tagId/history', tagController.getTagHistory);

// Device tags with statistics (enhanced device endpoint)
router.get('/project/:projectId/device/:deviceId/stats', tagController.getDeviceTagsWithStats);

// ==============================================================================
// LEGACY DEVICE-CENTRIC ROUTES (Backward Compatibility)
// ==============================================================================

// Legacy device-specific operations (for backward compatibility)
router.get('/device/:deviceId', tagController.getTagsByDevice);
router.post('/device/:deviceId', tagController.createTag);
router.put('/device/:deviceId/:tagId', tagController.updateTag);
router.delete('/device/:deviceId/:tagId', tagController.deleteTag);
router.get('/device/:deviceId/stats', tagController.getTagStats);

// ==============================================================================
// ENHANCED LEGACY ROUTES (Backward Compatibility with Database Features)
// ==============================================================================

// Legacy device routes that use enhanced functions
router.get('/device/:deviceId/statistics', async (req, res) => {
    // Redirect to project-level statistics
    const { deviceId } = req.params;
    const pool = require('../db');

    try {
        // Get project ID from device
        const deviceQuery = `
            SELECT d.project_id 
            FROM devices d 
            JOIN projects p ON d.project_id = p.id 
            WHERE d.device_id = $1 AND p.user_id = $2
        `;
        const result = await pool.query(deviceQuery, [deviceId, req.user.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Device not found or access denied' });
        }

        // Call enhanced device stats function
        req.params.projectId = result.rows[0].project_id;
        return tagController.getDeviceTagsWithStats(req, res);

    } catch (error) {
        res.status(500).json({ error: 'Failed to get device statistics', details: error.message });
    }
});

// Legacy tag health route
router.get('/device/:deviceId/:tagId/health', async (req, res) => {
    const { deviceId, tagId } = req.params;
    const pool = require('../db');

    try {
        // Get project ID from device
        const deviceQuery = `
            SELECT d.project_id 
            FROM devices d 
            JOIN projects p ON d.project_id = p.id 
            WHERE d.device_id = $1 AND p.user_id = $2
        `;
        const result = await pool.query(deviceQuery, [deviceId, req.user.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Device not found or access denied' });
        }

        // Call project-level health function
        req.params.projectId = result.rows[0].project_id;
        return tagController.getTagHealth(req, res);

    } catch (error) {
        res.status(500).json({ error: 'Failed to get tag health', details: error.message });
    }
});

// Legacy tag history route
router.get('/device/:deviceId/:tagId/history', async (req, res) => {
    const { deviceId, tagId } = req.params;
    const pool = require('../db');

    try {
        // Get project ID from device
        const deviceQuery = `
            SELECT d.project_id 
            FROM devices d 
            JOIN projects p ON d.project_id = p.id 
            WHERE d.device_id = $1 AND p.user_id = $2
        `;
        const result = await pool.query(deviceQuery, [deviceId, req.user.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Device not found or access denied' });
        }

        // Call project-level history function
        req.params.projectId = result.rows[0].project_id;
        return tagController.getTagHistory(req, res);

    } catch (error) {
        res.status(500).json({ error: 'Failed to get tag history', details: error.message });
    }
});

// ==============================================================================
// BULK OPERATIONS (Future Implementation)
// ==============================================================================

// Project-level bulk operations
router.post('/project/:projectId/bulk-create', tagController.bulkCreateTags);
router.get('/project/:projectId/export', tagController.exportTags);
router.post('/project/:projectId/import', tagController.importTags);

// Legacy device-level bulk operations
router.post('/device/:deviceId/bulk-create', tagController.bulkCreateTags);
router.get('/device/:deviceId/export', tagController.exportTags);
router.post('/device/:deviceId/import', tagController.importTags);

// ==============================================================================
// UTILITY AND DEBUG ENDPOINTS
// ==============================================================================

// Test endpoint for debugging project routes
router.get('/test/project/:projectId', async (req, res) => {
    console.log('🔧 Project tag route test endpoint hit');
    console.log('Project ID:', req.params.projectId);
    console.log('User:', req.user.id);

    res.json({
        status: 'success',
        message: 'Enhanced project tag routes are working',
        approach: 'project-level-with-database-optimizations',
        projectId: req.params.projectId,
        userId: req.user.id,
        timestamp: new Date().toISOString()
    });
});

// Test endpoint for debugging device routes (legacy)
router.get('/test/device/:deviceId', async (req, res) => {
    console.log('🔧 Device tag route test endpoint hit (legacy)');
    console.log('Device ID:', req.params.deviceId);
    console.log('User:', req.user.id);

    res.json({
        status: 'success',
        message: 'Legacy device tag routes are working',
        approach: 'device-level (legacy)',
        deviceId: req.params.deviceId,
        userId: req.user.id,
        timestamp: new Date().toISOString()
    });
});

// Enhanced health check endpoint
router.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'tags-api-enhanced',
        approach: 'independent-project-level-with-database-optimizations',
        timestamp: new Date().toISOString(),
        primary_endpoints: {
            'GET /tags/project/:projectId': 'List all project tags (ENHANCED)',
            'POST /tags/project/:projectId': 'Create tag for project (ENHANCED)',
            'PUT /tags/project/:projectId/:tagId': 'Update project tag (ENHANCED)',
            'DELETE /tags/project/:projectId/:tagId': 'Delete project tag (ENHANCED)',
            'GET /tags/project/:projectId/devices': 'Get devices for tag creation modal',
            'GET /tags/project/:projectId/stats': 'Project tag statistics'
        },
        enhanced_endpoints: {
            'GET /tags/project/:projectId/statistics': 'Enhanced tag statistics (uses database view)',
            'GET /tags/project/:projectId/latest': 'Latest measurements for all tags (uses database view)',
            'GET /tags/project/:projectId/:tagId/health': 'Tag health status (uses database function)',
            'GET /tags/project/:projectId/:tagId/history': 'Tag historical data (optimized queries)',
            'GET /tags/project/:projectId/device/:deviceId/stats': 'Device tags with statistics'
        },
        legacy_endpoints: {
            'GET /tags/device/:deviceId': 'List device tags (LEGACY)',
            'POST /tags/device/:deviceId': 'Create device tag (LEGACY)',
            'PUT /tags/device/:deviceId/:tagId': 'Update device tag (LEGACY)',
            'DELETE /tags/device/:deviceId/:tagId': 'Delete device tag (LEGACY)',
            'GET /tags/device/:deviceId/statistics': 'Device statistics (LEGACY - redirects to enhanced)',
            'GET /tags/device/:deviceId/:tagId/health': 'Tag health (LEGACY - redirects to enhanced)',
            'GET /tags/device/:deviceId/:tagId/history': 'Tag history (LEGACY - redirects to enhanced)'
        },
        database_optimizations: {
            'tag_statistics_view': 'Used for fast tag statistics queries',
            'latest_measurements_view': 'Used for real-time value displays',
            'get_tag_health_function': 'Used for health status assessment',
            'optimized_indexes': 'Improved performance for time-series queries'
        },
        query_parameters: {
            'history_endpoint': {
                'hours': 'Number of hours to look back (default: 24)',
                'limit': 'Maximum data points to return (default: 1000)',
                'quality': 'Filter by quality: good, bad, uncertain, error, all (default: all)',
                'source': 'Filter by source: simulation, manual, modbus, mqtt, all (default: all)'
            }
        },
        notes: [
            'Enhanced endpoints use database views and functions for better performance',
            'Legacy routes redirect to enhanced functions for backward compatibility',
            'Frontend should use /project/* endpoints for best performance',
            'Database optimizations provide significant speed improvements for large datasets'
        ]
    });
});

// Updated info endpoint
router.get('/info', (req, res) => {
    res.json({
        approach: 'independent-project-level-with-database-optimizations',
        description: 'Enhanced tags API with database views, functions, and optimized queries',
        performance_improvements: [
            'tag_statistics view for instant statistics',
            'latest_measurements view for real-time displays',
            'get_tag_health function for health assessment',
            'Optimized indexes for time-series queries'
        ],
        usage: {
            'view_all_tags': 'GET /tags/project/:projectId',
            'create_tag': 'POST /tags/project/:projectId (with device_id in body)',
            'update_tag': 'PUT /tags/project/:projectId/:tagId',
            'delete_tag': 'DELETE /tags/project/:projectId/:tagId',
            'get_devices_for_modal': 'GET /tags/project/:projectId/devices',
            'get_statistics': 'GET /tags/project/:projectId/statistics (ENHANCED)',
            'get_latest_values': 'GET /tags/project/:projectId/latest (ENHANCED)',
            'get_tag_health': 'GET /tags/project/:projectId/:tagId/health (ENHANCED)',
            'get_tag_history': 'GET /tags/project/:projectId/:tagId/history (ENHANCED)',
            'get_device_stats': 'GET /tags/project/:projectId/device/:deviceId/stats (ENHANCED)'
        },
        frontend_integration: [
            'Use enhanced endpoints for better performance',
            'Statistics endpoint provides pre-calculated metrics',
            'Latest endpoint gives real-time values without complex queries',
            'Health endpoint provides professional SCADA health assessment',
            'History endpoint supports filtering and pagination'
        ],
        database_features: [
            'Views eliminate complex JOIN queries in application code',
            'Functions provide consistent health calculations',
            'Indexes ensure fast queries even with millions of measurements',
            'Constraints prevent data integrity issues'
        ]
    });
});

// ==============================================================================
// COMPLETE ROUTE LISTING FOR REFERENCE
// ==============================================================================

// Debug endpoint showing all available routes
router.get('/routes', (req, res) => {
    res.json({
        project_routes: {
            basic: [
                'GET /tags/project/:projectId - List all project tags',
                'POST /tags/project/:projectId - Create tag',
                'PUT /tags/project/:projectId/:tagId - Update tag',
                'DELETE /tags/project/:projectId/:tagId - Delete tag',
                'GET /tags/project/:projectId/devices - Get devices for modal',
                'GET /tags/project/:projectId/stats - Project statistics'
            ],
            enhanced: [
                'GET /tags/project/:projectId/statistics - Enhanced tag statistics',
                'GET /tags/project/:projectId/latest - Latest measurements',
                'GET /tags/project/:projectId/:tagId/health - Tag health status',
                'GET /tags/project/:projectId/:tagId/history - Tag historical data',
                'GET /tags/project/:projectId/device/:deviceId/stats - Device statistics'
            ]
        },
        legacy_routes: {
            basic: [
                'GET /tags/device/:deviceId - List device tags',
                'POST /tags/device/:deviceId - Create tag',
                'PUT /tags/device/:deviceId/:tagId - Update tag',
                'DELETE /tags/device/:deviceId/:tagId - Delete tag'
            ],
            enhanced: [
                'GET /tags/device/:deviceId/statistics - Device statistics (redirects)',
                'GET /tags/device/:deviceId/:tagId/health - Tag health (redirects)',
                'GET /tags/device/:deviceId/:tagId/history - Tag history (redirects)'
            ]
        },
        utility_routes: [
            'GET /tags/health - API health check',
            'GET /tags/info - API information',
            'GET /tags/routes - This endpoint',
            'GET /tags/test/project/:projectId - Test project routes',
            'GET /tags/test/device/:deviceId - Test device routes'
        ],
        recommendation: 'Use project-level enhanced endpoints for best performance'
    });
});

console.log('✅ Enhanced independent tags routes loaded successfully');

module.exports = router;