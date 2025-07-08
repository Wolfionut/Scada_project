// routes/deviceControl.js - Manual Device Control API
const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const pool = require('../db');

// All routes require authentication
router.use(authenticateToken);

console.log('🎛️ Device Control Routes: Loading...');

// ==================== DEVICE-SPECIFIC CONTROL ====================

// 🚀 Start data collection for a specific device
router.post('/:deviceId/start', async (req, res) => {
    try {
        const { deviceId } = req.params;
        console.log(`🚀 Manual start request for device: ${deviceId}`);

        // Get dataEngine from app locals
        const dataEngine = req.app.locals.dataEngine;
        if (!dataEngine) {
            return res.status(503).json({
                success: false,
                error: 'Data Collection Engine not available',
                message: 'Server may still be initializing'
            });
        }

        // Verify device exists and user has access
        const deviceQuery = `
            SELECT d.*, p.user_id, p.project_name
            FROM devices d
                     JOIN projects p ON d.project_id = p.id
            WHERE d.device_id = $1
        `;
        const deviceResult = await pool.query(deviceQuery, [deviceId]);

        if (deviceResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Device not found'
            });
        }

        const device = deviceResult.rows[0];

        // Check user access
        if (device.user_id !== req.user.id) {
            return res.status(403).json({
                success: false,
                error: 'Access denied to this device'
            });
        }

        // Start the device
        const result = await dataEngine.startDevice(deviceId);

        if (result.success) {
            console.log(`✅ Device started: ${result.device_name}`);

            res.json({
                success: true,
                message: result.message,
                device_id: parseInt(deviceId),
                device_name: result.device_name,
                device_type: result.device_type,
                tags_count: result.tags_count,
                timestamp: new Date().toISOString()
            });
        } else {
            console.error(`❌ Device start failed: ${result.message}`);

            res.status(400).json({
                success: false,
                error: result.message,
                device_id: parseInt(deviceId),
                timestamp: new Date().toISOString()
            });
        }

    } catch (error) {
        console.error('❌ Error starting device:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to start device',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 🛑 Stop data collection for a specific device
router.post('/:deviceId/stop', async (req, res) => {
    try {
        const { deviceId } = req.params;
        console.log(`🛑 Manual stop request for device: ${deviceId}`);

        const dataEngine = req.app.locals.dataEngine;
        if (!dataEngine) {
            return res.status(503).json({
                success: false,
                error: 'Data Collection Engine not available'
            });
        }

        // Verify device access (same as start)
        const deviceQuery = `
            SELECT d.*, p.user_id
            FROM devices d
                     JOIN projects p ON d.project_id = p.id
            WHERE d.device_id = $1
        `;
        const deviceResult = await pool.query(deviceQuery, [deviceId]);

        if (deviceResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Device not found'
            });
        }

        const device = deviceResult.rows[0];
        if (device.user_id !== req.user.id) {
            return res.status(403).json({
                success: false,
                error: 'Access denied to this device'
            });
        }

        // Stop the device
        const result = await dataEngine.stopDevice(deviceId);

        if (result.success) {
            console.log(`✅ Device stopped: ${result.device_name}`);

            res.json({
                success: true,
                message: result.message,
                device_id: parseInt(deviceId),
                device_name: result.device_name,
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.message,
                device_id: parseInt(deviceId),
                timestamp: new Date().toISOString()
            });
        }

    } catch (error) {
        console.error('❌ Error stopping device:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to stop device',
            details: error.message
        });
    }
});

// 📊 Get device status
router.get('/:deviceId/status', async (req, res) => {
    try {
        const { deviceId } = req.params;

        const dataEngine = req.app.locals.dataEngine;
        if (!dataEngine) {
            return res.status(503).json({
                error: 'Data Collection Engine not available'
            });
        }

        // Verify device access
        const deviceQuery = `
            SELECT d.*, p.user_id
            FROM devices d
                     JOIN projects p ON d.project_id = p.id
            WHERE d.device_id = $1
        `;
        const deviceResult = await pool.query(deviceQuery, [deviceId]);

        if (deviceResult.rows.length === 0) {
            return res.status(404).json({ error: 'Device not found' });
        }

        const device = deviceResult.rows[0];
        if (device.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Get device status from data engine
        const status = await dataEngine.getDeviceStatus(deviceId);

        res.json({
            device_id: parseInt(deviceId),
            device_name: device.device_name,
            device_type: device.device_type,
            status: status,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error getting device status:', error);
        res.status(500).json({
            error: 'Failed to get device status',
            details: error.message
        });
    }
});

// 🎯 Get simulation status (for simulation devices)
router.get('/:deviceId/simulation/status', async (req, res) => {
    try {
        const { deviceId } = req.params;

        // Verify device access
        const deviceQuery = `
            SELECT d.*, p.user_id
            FROM devices d
                     JOIN projects p ON d.project_id = p.id
            WHERE d.device_id = $1 AND d.device_type = 'simulation'
        `;
        const deviceResult = await pool.query(deviceQuery, [deviceId]);

        if (deviceResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Simulation device not found'
            });
        }

        const device = deviceResult.rows[0];
        if (device.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Get simulation status from SimulationService
        const SimulationService = require('../services/protocols/SimulationService');
        const status = SimulationService.getSimulationStatus(deviceId);

        // Get tag count
        const tagsQuery = `
            SELECT COUNT(*) as total, COUNT(CASE WHEN simulation = true THEN 1 END) as simulation_count
            FROM tags WHERE device_id = $1
        `;
        const tagsResult = await pool.query(tagsQuery, [deviceId]);
        const tagCounts = tagsResult.rows[0];

        res.json({
            device_id: parseInt(deviceId),
            device_name: device.device_name,
            simulation: {
                ...status,
                total_tags: parseInt(tagCounts.total),
                simulation_tags: parseInt(tagCounts.simulation_count)
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error getting simulation status:', error);
        res.status(500).json({
            error: 'Failed to get simulation status',
            details: error.message
        });
    }
});

// ==================== ENGINE-LEVEL CONTROL ====================

// 📊 Get overall data collection engine status
router.get('/engine/status', async (req, res) => {
    try {
        const dataEngine = req.app.locals.dataEngine;
        const wsManager = req.app.locals.wsManager;

        if (!dataEngine) {
            return res.status(503).json({
                error: 'Data Collection Engine not available',
                services_initialized: false
            });
        }

        const engineStatus = dataEngine.getStatus();
        const wsStatus = wsManager ? wsManager.getStatistics() : { error: 'WebSocket not available' };

        res.json({
            engine_status: engineStatus,
            websocket_status: wsStatus,
            services_initialized: true,
            server_uptime: process.uptime(),
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error getting engine status:', error);
        res.status(500).json({
            error: 'Failed to get engine status',
            details: error.message
        });
    }
});

// 🚀 Start data collection engine
router.post('/engine/start', async (req, res) => {
    try {
        console.log('🚀 Manual start request for data collection engine');

        const dataEngine = req.app.locals.dataEngine;
        if (!dataEngine) {
            return res.status(503).json({
                success: false,
                error: 'Data Collection Engine not available'
            });
        }

        const result = await dataEngine.start();

        res.json({
            success: result.success,
            message: result.message,
            statistics: result.statistics,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error starting engine:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to start data collection engine',
            details: error.message
        });
    }
});

// 🛑 Stop data collection engine
router.post('/engine/stop', async (req, res) => {
    try {
        console.log('🛑 Manual stop request for data collection engine');

        const dataEngine = req.app.locals.dataEngine;
        if (!dataEngine) {
            return res.status(503).json({
                success: false,
                error: 'Data Collection Engine not available'
            });
        }

        const result = await dataEngine.stop();

        res.json({
            success: result.success,
            message: result.message,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error stopping engine:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to stop data collection engine',
            details: error.message
        });
    }
});

// 🔄 Restart specific device (stop then start)
router.post('/:deviceId/restart', async (req, res) => {
    try {
        const { deviceId } = req.params;
        console.log(`🔄 Restart request for device: ${deviceId}`);

        const dataEngine = req.app.locals.dataEngine;
        if (!dataEngine) {
            return res.status(503).json({
                success: false,
                error: 'Data Collection Engine not available'
            });
        }

        // Stop first
        const stopResult = await dataEngine.stopDevice(deviceId);
        console.log('Stop result:', stopResult);

        // Wait a moment
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Start again
        const startResult = await dataEngine.startDevice(deviceId);
        console.log('Start result:', startResult);

        if (startResult.success) {
            res.json({
                success: true,
                message: `Device restarted: ${startResult.device_name}`,
                device_id: parseInt(deviceId),
                device_name: startResult.device_name,
                device_type: startResult.device_type,
                tags_count: startResult.tags_count,
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(400).json({
                success: false,
                error: `Restart failed: ${startResult.message}`,
                stop_result: stopResult,
                start_result: startResult
            });
        }

    } catch (error) {
        console.error('❌ Error restarting device:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to restart device',
            details: error.message
        });
    }
});

// ==================== PROJECT-LEVEL CONTROL ====================

// 🚀 Start all devices in a project
router.post('/project/:projectId/start', async (req, res) => {
    try {
        const { projectId } = req.params;
        console.log(`🚀 Start all devices request for project: ${projectId}`);

        // Verify project access
        const projectQuery = await pool.query(
            'SELECT * FROM projects WHERE id = $1 AND user_id = $2',
            [projectId, req.user.id]
        );

        if (projectQuery.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Project not found or access denied'
            });
        }

        const dataEngine = req.app.locals.dataEngine;
        if (!dataEngine) {
            return res.status(503).json({
                success: false,
                error: 'Data Collection Engine not available'
            });
        }

        // Get all devices in project
        const devicesQuery = `
            SELECT device_id, device_name, device_type
            FROM devices
            WHERE project_id = $1
            ORDER BY device_name
        `;
        const devicesResult = await pool.query(devicesQuery, [projectId]);
        const devices = devicesResult.rows;

        const results = [];
        let successCount = 0;
        let failCount = 0;

        for (const device of devices) {
            try {
                const startResult = await dataEngine.startDevice(device.device_id);
                results.push({
                    device_id: device.device_id,
                    device_name: device.device_name,
                    success: startResult.success,
                    message: startResult.message
                });

                if (startResult.success) {
                    successCount++;
                } else {
                    failCount++;
                }
            } catch (error) {
                results.push({
                    device_id: device.device_id,
                    device_name: device.device_name,
                    success: false,
                    message: error.message
                });
                failCount++;
            }
        }

        res.json({
            success: successCount > 0,
            message: `Started ${successCount} of ${devices.length} devices`,
            project_id: parseInt(projectId),
            results: results,
            summary: {
                total_devices: devices.length,
                successful: successCount,
                failed: failCount
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error starting project devices:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to start project devices',
            details: error.message
        });
    }
});

console.log('✅ Device Control Routes: Loaded successfully');

module.exports = router;