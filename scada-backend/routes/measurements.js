const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const measurementController = require('../controllers/measurementController');

// ADD THIS MISSING IMPORT
const pool = require('../db');

console.log('📊 Measurements Routes: Loading enhanced SCADA router...');

// ==================== MIDDLEWARE ====================

// All routes are protected by authentication
router.use(authenticateToken);

// Enhanced logging for measurements operations
router.use((req, res, next) => {
    console.log(`📊 Measurements: ${req.method} ${req.path}`);
    if (req.body && Object.keys(req.body).length > 0) {
        console.log('📊 Request body:', JSON.stringify(req.body, null, 2));
    }
    if (req.query && Object.keys(req.query).length > 0) {
        console.log('📊 Query params:', req.query);
    }
    next();
});

// ==================== HEALTH CHECK ROUTES ====================

// API health check
router.get('/health', (req, res) => {
    res.json({
        status: 'Measurements API healthy',
        timestamp: new Date().toISOString(),
        features: [
            'Basic CRUD operations',
            'Real-time current values',
            'Time-series data for trending',
            'Project statistics',
            'Recent activity feeds',
            'Advanced search capabilities',
            'Quality and source filtering',
            'Data aggregation'
        ],
        endpoints: {
            basic: {
                'GET /tag/:tagId': 'Get measurements for specific tag',
                'POST /tag/:tagId': 'Create manual measurement',
                'DELETE /:measurementId': 'Delete measurement'
            },
            scada: {
                'GET /project/:projectId/current': 'Real-time dashboard data',
                'GET /project/:projectId/timeseries': 'Historical trending data',
                'GET /project/:projectId/recent': 'Recent activity feed',
                'GET /project/:projectId/statistics': 'Project statistics',
                'GET /project/:projectId/search': 'Advanced search'
            }
        },
        user: req.user?.username
    });
});

// ==================== BASIC CRUD ROUTES (EXISTING) ====================

// 📋 List measurements for a specific tag
router.get('/tag/:tagId', measurementController.getMeasurementsByTag);

// ➕ Create measurement for a specific tag (manual entry)
router.post('/tag/:tagId', measurementController.createMeasurement);

// 🗑️ Delete a specific measurement
router.delete('/:measurementId', measurementController.deleteMeasurement);

// ==================== ENHANCED SCADA ROUTES (NEW) ====================

// 📊 REAL-TIME DASHBOARD DATA
// Get current values for all tags in a project
router.get('/project/:projectId/current', measurementController.getCurrentValues);

// 📈 TIME-SERIES DATA FOR TRENDING
// Get historical data for multiple tags with optional aggregation
router.get('/project/:projectId/timeseries', measurementController.getTimeSeriesData);

// 🔥 RECENT ACTIVITY FEED
// Get recent measurements across entire project
router.get('/project/:projectId/recent', measurementController.getRecentActivity);

// 📊 PROJECT STATISTICS
// Get comprehensive statistics for project
router.get('/project/:projectId/statistics', measurementController.getProjectStatistics);

// 🔍 ADVANCED SEARCH
// Search measurements with multiple criteria
router.get('/project/:projectId/search', measurementController.searchMeasurements);

// Rest of your routes continue here...

// ==================== SPECIALIZED ROUTES ====================

// 📊 Get measurements by device
router.get('/device/:deviceId', async (req, res) => {
    try {
        const { deviceId } = req.params;
        const { limit = 100, quality, source } = req.query;

        console.log('📊 Getting measurements for device:', deviceId);

        // Get device info and verify access
        const deviceQuery = `
            SELECT d.*, p.user_id, p.project_name
            FROM devices d
            JOIN projects p ON d.project_id = p.id
            WHERE d.device_id = $1
        `;
        const deviceResult = await pool.query(deviceQuery, [deviceId]);

        if (deviceResult.rows.length === 0) {
            return res.status(404).json({ error: 'Device not found' });
        }

        const device = deviceResult.rows[0];

        // Check access
        if (device.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Access denied to this device' });
        }

        // Build query with filters
        let whereClause = 'WHERE m.device_id = $1';
        const params = [deviceId];
        let paramIndex = 2;

        if (quality) {
            whereClause += ` AND m.quality = $${paramIndex}`;
            params.push(quality);
            paramIndex++;
        }

        if (source) {
            whereClause += ` AND m.source = $${paramIndex}`;
            params.push(source);
            paramIndex++;
        }

        const query = `
            SELECT 
                m.measurement_id,
                m.tag_id,
                t.tag_name,
                t.tag_type,
                t.engineering_unit,
                m.value,
                m.timestamp,
                m.quality,
                m.source
            FROM measurements m
            JOIN tags t ON m.tag_id = t.tag_id
            ${whereClause}
            ORDER BY m.timestamp DESC
            LIMIT $${paramIndex}
        `;

        params.push(parseInt(limit));

        const result = await pool.query(query, params);

        res.json({
            device_info: {
                device_id: device.device_id,
                device_name: device.device_name,
                device_type: device.device_type,
                project_name: device.project_name
            },
            measurements: result.rows,
            query_info: {
                count: result.rows.length,
                limit: parseInt(limit),
                filters: { quality, source }
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error getting device measurements:', error);
        res.status(500).json({
            error: 'Could not get device measurements',
            details: error.message
        });
    }
});

// 📊 Get latest measurement for each tag in a project (optimized for status displays)
router.get('/project/:projectId/latest', async (req, res) => {
    try {
        const { projectId } = req.params;
        const { quality, source } = req.query;

        console.log('📊 Getting latest measurements for project:', projectId);

        // Verify project access
        const projectQuery = await pool.query(
            'SELECT * FROM projects WHERE id = $1 AND user_id = $2',
            [projectId, req.user.id]
        );

        if (projectQuery.rows.length === 0) {
            return res.status(404).json({ error: 'Project not found or access denied' });
        }

        // Build filters
        let qualityFilter = '';
        let sourceFilter = '';
        const params = [projectId];

        if (quality) {
            qualityFilter = 'AND m.quality = $2';
            params.push(quality);
        }

        if (source) {
            sourceFilter = params.length > 1 ? 'AND m.source = $3' : 'AND m.source = $2';
            params.push(source);
        }

        const query = `
            SELECT DISTINCT ON (m.tag_id)
                m.measurement_id,
                m.tag_id,
                t.tag_name,
                t.tag_type,
                t.engineering_unit,
                d.device_name,
                m.value,
                m.timestamp,
                m.quality,
                m.source
            FROM measurements m
            JOIN tags t ON m.tag_id = t.tag_id
            JOIN devices d ON t.device_id = d.device_id
            WHERE d.project_id = $1
            ${qualityFilter}
            ${sourceFilter}
            ORDER BY m.tag_id, m.timestamp DESC
        `;

        const result = await pool.query(query, params);

        res.json({
            project_id: parseInt(projectId),
            latest_measurements: result.rows,
            query_info: {
                count: result.rows.length,
                filters: { quality, source }
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error getting latest measurements:', error);
        res.status(500).json({
            error: 'Could not get latest measurements',
            details: error.message
        });
    }
});

// 📊 Bulk create measurements (for testing/import)
router.post('/bulk', async (req, res) => {
    try {
        const { measurements } = req.body;

        if (!Array.isArray(measurements) || measurements.length === 0) {
            return res.status(400).json({ error: 'Measurements array is required' });
        }

        console.log('📊 Bulk creating', measurements.length, 'measurements');

        const results = [];
        const errors = [];

        for (let i = 0; i < measurements.length; i++) {
            const measurement = measurements[i];

            try {
                // Verify tag exists and user has access
                const tagQuery = `
                    SELECT t.*, d.device_id, p.user_id
                    FROM tags t
                    JOIN devices d ON t.device_id = d.device_id
                    JOIN projects p ON d.project_id = p.id
                    WHERE t.tag_id = $1
                `;
                const tagResult = await pool.query(tagQuery, [measurement.tag_id]);

                if (tagResult.rows.length === 0) {
                    errors.push({ index: i, error: 'Tag not found', tag_id: measurement.tag_id });
                    continue;
                }

                const tag = tagResult.rows[0];

                if (tag.user_id !== req.user.id) {
                    errors.push({ index: i, error: 'Access denied', tag_id: measurement.tag_id });
                    continue;
                }

                // Insert measurement
                const insertResult = await pool.query(
                    `INSERT INTO measurements (device_id, tag_id, value, timestamp, quality, source)
                     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
                    [
                        tag.device_id,
                        measurement.tag_id,
                        measurement.value,
                        measurement.timestamp ? new Date(measurement.timestamp) : new Date(),
                        measurement.quality || 'good',
                        measurement.source || 'bulk'
                    ]
                );

                results.push(insertResult.rows[0]);

            } catch (error) {
                errors.push({
                    index: i,
                    error: error.message,
                    tag_id: measurement.tag_id
                });
            }
        }

        console.log(`📊 Bulk create: ${results.length} successful, ${errors.length} errors`);

        res.json({
            success: true,
            created: results,
            errors: errors,
            summary: {
                total_requested: measurements.length,
                successful: results.length,
                failed: errors.length
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error in bulk create:', error);
        res.status(500).json({
            error: 'Could not bulk create measurements',
            details: error.message
        });
    }
});

// 📊 Export measurements as CSV
router.get('/project/:projectId/export', async (req, res) => {
    try {
        const { projectId } = req.params;
        const { format = 'json', startTime, endTime, tagIds } = req.query;

        console.log('📊 Exporting measurements for project:', projectId, 'format:', format);

        // Verify project access
        const projectQuery = await pool.query(
            'SELECT * FROM projects WHERE id = $1 AND user_id = $2',
            [projectId, req.user.id]
        );

        if (projectQuery.rows.length === 0) {
            return res.status(404).json({ error: 'Project not found or access denied' });
        }

        // Build export query
        let whereClause = 'WHERE d.project_id = $1';
        const params = [projectId];
        let paramIndex = 2;

        if (startTime) {
            whereClause += ` AND m.timestamp >= to_timestamp($${paramIndex}/1000)`;
            params.push(startTime);
            paramIndex++;
        }

        if (endTime) {
            whereClause += ` AND m.timestamp <= to_timestamp($${paramIndex}/1000)`;
            params.push(endTime);
            paramIndex++;
        }

        if (tagIds) {
            const tagIdList = tagIds.split(',').map(id => parseInt(id));
            const tagPlaceholders = tagIdList.map((_, index) => `$${paramIndex + index}`).join(',');
            whereClause += ` AND m.tag_id IN (${tagPlaceholders})`;
            params.push(...tagIdList);
        }

        const query = `
            SELECT 
                m.measurement_id,
                t.tag_name,
                d.device_name,
                m.value,
                t.engineering_unit,
                m.timestamp,
                m.quality,
                m.source
            FROM measurements m
            JOIN tags t ON m.tag_id = t.tag_id
            JOIN devices d ON t.device_id = d.device_id
            ${whereClause}
            ORDER BY m.timestamp ASC
        `;

        const result = await pool.query(query, params);

        if (format === 'csv') {
            // Generate CSV
            const csvHeader = 'Measurement ID,Tag Name,Device Name,Value,Unit,Timestamp,Quality,Source\n';
            const csvRows = result.rows.map(row =>
                `${row.measurement_id},"${row.tag_name}","${row.device_name}",${row.value},"${row.engineering_unit || ''}","${row.timestamp}","${row.quality}","${row.source}"`
            ).join('\n');

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="measurements_project_${projectId}_${new Date().toISOString().split('T')[0]}.csv"`);
            res.send(csvHeader + csvRows);
        } else {
            // Return JSON
            res.json({
                project_id: parseInt(projectId),
                export_data: result.rows,
                export_info: {
                    format: format,
                    count: result.rows.length,
                    filters: { startTime, endTime, tagIds }
                },
                timestamp: new Date().toISOString()
            });
        }

    } catch (error) {
        console.error('❌ Error exporting measurements:', error);
        res.status(500).json({
            error: 'Could not export measurements',
            details: error.message
        });
    }
});

// ==================== ERROR HANDLING ====================

// Global error handler for this router
router.use((error, req, res, next) => {
    console.error('❌ Measurements Router Error:', error);

    if (error.code === '23503') { // Foreign key violation
        return res.status(400).json({
            error: 'Referenced tag or device not found',
            code: 'FOREIGN_KEY_VIOLATION'
        });
    }

    if (error.code === '22P02') { // Invalid input syntax
        return res.status(400).json({
            error: 'Invalid data format',
            code: 'INVALID_INPUT'
        });
    }

    res.status(500).json({
        error: 'Internal server error in measurements API',
        code: 'INTERNAL_ERROR'
    });
});

console.log('✅ Measurements Routes: Enhanced SCADA router loaded successfully');

module.exports = router;