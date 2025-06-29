// routes/devices.js - Complete Device Router with Data Collection Control
const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const ModbusService = require('../services/protocols/ModbusService');
const MqttService = require('../services/protocols/MqttService');
const SimulationService = require('../services/protocols/SimulationService');

// Global reference to DataCollectionEngine (set from app.js)
let dataCollectionEngine = null;

// Function to set the engine reference (called from app.js)
const setDataCollectionEngine = (engine) => {
    dataCollectionEngine = engine;
    console.log('📊 DataCollectionEngine reference set in device routes');
};

// ==================== DEVICE CRUD OPERATIONS ====================

// Get all devices for a project
router.get('/project/:projectId', auth, async (req, res) => {
    try {
        const { projectId } = req.params;

        console.log(`📤 Fetching devices for project: ${projectId}`);

        const query = `
            SELECT
                d.*,
                COUNT(t.tag_id) as tag_count
            FROM devices d
                     LEFT JOIN tags t ON d.device_id = t.device_id
            WHERE d.project_id = $1
            GROUP BY d.device_id
            ORDER BY d.device_name
        `;

        const result = await pool.query(query, [projectId]);

        console.log(`📥 Found ${result.rows.length} devices in database`);

        // Enhance with real-time status from DataCollectionEngine
        const devices = result.rows.map(device => {
            let enhancedDevice = { ...device };

            if (dataCollectionEngine) {
                const engineStatus = dataCollectionEngine.getDeviceStatus(device.device_id);

                // CRITICAL: Update status fields based on engine
                enhancedDevice = {
                    ...device,
                    data_collection_active: engineStatus.running || device.data_collection_active,
                    connection_status: engineStatus.running ?
                        (device.device_type === 'simulation' ? 'simulating' : 'collecting') :
                        device.connection_status,
                    protocol_status: {
                        ...device.protocol_status,
                        running: engineStatus.running,
                        engine_status: engineStatus
                    }
                };

                console.log(`🔍 Device ${device.device_name}: DB=${device.data_collection_active}, Engine=${engineStatus.running}, Final=${enhancedDevice.data_collection_active}`);
            }

            return enhancedDevice;
        });

        res.json(devices);
    } catch (error) {
        console.error('❌ Error fetching devices:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get single device
router.get('/project/:projectId/:deviceId', auth, async (req, res) => {
    try {
        const { projectId, deviceId } = req.params;

        const query = `
            SELECT d.*, COUNT(t.tag_id) as tag_count
            FROM devices d
                     LEFT JOIN tags t ON d.device_id = t.device_id
            WHERE d.device_id = $1 AND d.project_id = $2
            GROUP BY d.device_id
        `;

        const result = await pool.query(query, [deviceId, projectId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Device not found' });
        }

        let device = result.rows[0];

        // Enhance with engine status
        if (dataCollectionEngine) {
            const engineStatus = dataCollectionEngine.getDeviceStatus(deviceId);
            device = {
                ...device,
                data_collection_active: engineStatus.running || device.data_collection_active,
                connection_status: engineStatus.running ? 'collecting' : device.connection_status,
                protocol_status: {
                    ...device.protocol_status,
                    running: engineStatus.running,
                    engine_status: engineStatus
                }
            };
        }

        res.json(device);
    } catch (error) {
        console.error('❌ Error fetching device:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create device
router.post('/project/:projectId', auth, async (req, res) => {
    try {
        const { projectId } = req.params;
        const { device_name, device_type, protocol, ip_address, port, slave_id } = req.body;

        if (!device_name) {
            return res.status(400).json({ error: 'Device name is required' });
        }

        console.log(`📝 Creating device: ${device_name} (${device_type})`);

        const query = `
            INSERT INTO devices (
                project_id, device_name, device_type, protocol,
                ip_address, port, slave_id, data_collection_active, connection_status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING *
        `;

        const values = [
            projectId, device_name, device_type, protocol,
            ip_address, port, slave_id, false, 'stopped'
        ];

        const result = await pool.query(query, values);

        console.log(`✅ Device created: ${device_name} with ID ${result.rows[0].device_id}`);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('❌ Error creating device:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update device
router.put('/project/:projectId/:deviceId', auth, async (req, res) => {
    try {
        const { deviceId } = req.params;
        const { device_name, device_type, protocol, ip_address, port, slave_id } = req.body;

        const query = `
            UPDATE devices
            SET device_name = $1, device_type = $2, protocol = $3,
                ip_address = $4, port = $5, slave_id = $6, updated_at = CURRENT_TIMESTAMP
            WHERE device_id = $7
                RETURNING *
        `;

        const values = [device_name, device_type, protocol, ip_address, port, slave_id, deviceId];
        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Device not found' });
        }

        console.log(`✅ Device updated: ${device_name}`);
        res.json(result.rows[0]);
    } catch (error) {
        console.error('❌ Error updating device:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete device
router.delete('/project/:projectId/:deviceId', auth, async (req, res) => {
    try {
        const { deviceId } = req.params;

        console.log(`🗑️ Deleting device: ${deviceId}`);

        // CRITICAL: Stop data collection before deleting
        if (dataCollectionEngine) {
            console.log(`🛑 Stopping data collection for device ${deviceId} before deletion`);
            await dataCollectionEngine.stopDevice(deviceId);
        }

        const query = 'DELETE FROM devices WHERE device_id = $1 RETURNING *';
        const result = await pool.query(query, [deviceId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Device not found' });
        }

        console.log(`✅ Device deleted: ${result.rows[0].device_name}`);
        res.json({ message: 'Device deleted successfully' });
    } catch (error) {
        console.error('❌ Error deleting device:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== 🚀 CRITICAL: DATA COLLECTION CONTROL ====================

// START data collection for a device
router.post('/project/:projectId/:deviceId/start', auth, async (req, res) => {
    try {
        const { projectId, deviceId } = req.params;

        console.log('🚀'.repeat(20));
        console.log(`🚀 START COMMAND RECEIVED for device ${deviceId}`);
        console.log('🚀'.repeat(20));

        if (!dataCollectionEngine) {
            console.error('❌ DataCollectionEngine not available!');
            return res.status(500).json({
                error: 'Data collection engine not available',
                details: 'DataCollectionEngine is not initialized. Check server startup logs.'
            });
        }

        // Get device info
        const deviceQuery = await pool.query(
            'SELECT * FROM devices WHERE device_id = $1 AND project_id = $2',
            [deviceId, projectId]
        );

        if (deviceQuery.rows.length === 0) {
            return res.status(404).json({ error: 'Device not found' });
        }

        const device = deviceQuery.rows[0];
        console.log(`📋 Device found: ${device.device_name} (${device.device_type})`);

        // Check if already running in engine
        const currentStatus = dataCollectionEngine.getDeviceStatus(deviceId);
        if (currentStatus.running) {
            console.log(`⚠️ Device ${device.device_name} is already running`);
            return res.status(400).json({
                error: 'Device is already running',
                current_status: currentStatus,
                device_name: device.device_name
            });
        }

        // 🔥 START THE DEVICE USING DATACOLLECTIONENGINE
        console.log(`⚡ Starting device ${device.device_name} via DataCollectionEngine...`);
        const result = await dataCollectionEngine.startDevice(deviceId);

        if (result.success) {
            // 🔥 UPDATE DATABASE STATUS TO MATCH ENGINE
            const newConnectionStatus = device.device_type === 'simulation' ? 'simulating' : 'collecting';

            await pool.query(`
                UPDATE devices
                SET
                    data_collection_active = true,
                    connection_status = $1,
                    protocol_status = $2,
                    updated_at = CURRENT_TIMESTAMP
                WHERE device_id = $3
            `, [
                newConnectionStatus,
                JSON.stringify({
                    running: true,
                    started_at: new Date(),
                    engine_result: result
                }),
                deviceId
            ]);

            console.log(`✅ SUCCESS: Device ${device.device_name} started and database updated`);
            console.log(`📊 Engine result:`, result);

            res.json({
                success: true,
                message: result.message,
                device_name: result.device_name,
                device_type: result.device_type,
                tags_count: result.tags_count,
                status: 'started',
                connection_status: newConnectionStatus,
                timestamp: new Date().toISOString()
            });
        } else {
            console.log(`❌ FAILED to start device ${device.device_name}: ${result.message}`);
            res.status(400).json({
                success: false,
                error: result.message,
                device_name: device.device_name
            });
        }

    } catch (error) {
        console.error(`❌ CRITICAL ERROR starting device ${deviceId}:`, error);
        res.status(500).json({
            error: 'Failed to start data collection',
            details: error.message,
            stack: error.stack
        });
    }
});

// STOP data collection for a device
router.post('/project/:projectId/:deviceId/stop', auth, async (req, res) => {
    try {
        const { projectId, deviceId } = req.params;

        console.log('🛑'.repeat(20));
        console.log(`🛑 STOP COMMAND RECEIVED for device ${deviceId}`);
        console.log('🛑'.repeat(20));

        if (!dataCollectionEngine) {
            console.error('❌ DataCollectionEngine not available!');
            return res.status(500).json({
                error: 'Data collection engine not available',
                details: 'DataCollectionEngine is not initialized. Check server startup logs.'
            });
        }

        // Get device info
        const deviceQuery = await pool.query(
            'SELECT * FROM devices WHERE device_id = $1 AND project_id = $2',
            [deviceId, projectId]
        );

        if (deviceQuery.rows.length === 0) {
            return res.status(404).json({ error: 'Device not found' });
        }

        const device = deviceQuery.rows[0];
        console.log(`📋 Device found: ${device.device_name} (${device.device_type})`);

        // 🔥 STOP THE DEVICE USING DATACOLLECTIONENGINE
        console.log(`⚡ Stopping device ${device.device_name} via DataCollectionEngine...`);
        const result = await dataCollectionEngine.stopDevice(deviceId);

        if (result.success) {
            // 🔥 UPDATE DATABASE STATUS TO MATCH ENGINE
            await pool.query(`
                UPDATE devices
                SET
                    data_collection_active = false,
                    connection_status = 'stopped',
                    protocol_status = $1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE device_id = $2
            `, [
                JSON.stringify({
                    running: false,
                    stopped_at: new Date(),
                    engine_result: result
                }),
                deviceId
            ]);

            console.log(`✅ SUCCESS: Device ${device.device_name} stopped and database updated`);
            console.log(`📊 Engine result:`, result);

            res.json({
                success: true,
                message: result.message,
                device_name: result.device_name,
                status: 'stopped',
                connection_status: 'stopped',
                timestamp: new Date().toISOString()
            });
        } else {
            console.log(`❌ FAILED to stop device ${device.device_name}: ${result.message}`);
            res.status(400).json({
                success: false,
                error: result.message,
                device_name: device.device_name
            });
        }

    } catch (error) {
        console.error(`❌ CRITICAL ERROR stopping device ${deviceId}:`, error);
        res.status(500).json({
            error: 'Failed to stop data collection',
            details: error.message,
            stack: error.stack
        });
    }
});

// Get detailed device status
router.get('/project/:projectId/:deviceId/status', auth, async (req, res) => {
    try {
        const { deviceId } = req.params;

        // Get database status
        const deviceQuery = await pool.query(
            'SELECT device_name, device_type, data_collection_active, connection_status, protocol_status FROM devices WHERE device_id = $1',
            [deviceId]
        );

        if (deviceQuery.rows.length === 0) {
            return res.status(404).json({ error: 'Device not found' });
        }

        const dbStatus = deviceQuery.rows[0];

        // Get engine status
        let engineStatus = { running: false, message: 'Engine not available' };
        if (dataCollectionEngine) {
            engineStatus = dataCollectionEngine.getDeviceStatus(deviceId);
        }

        // Determine final status (engine takes precedence)
        const finalStatus = engineStatus.running || dbStatus.data_collection_active;

        console.log(`📊 Status check for ${dbStatus.device_name}: DB=${dbStatus.data_collection_active}, Engine=${engineStatus.running}, Final=${finalStatus}`);

        res.json({
            device_name: dbStatus.device_name,
            device_type: dbStatus.device_type,
            running: finalStatus,
            database_status: {
                data_collection_active: dbStatus.data_collection_active,
                connection_status: dbStatus.connection_status,
                protocol_status: dbStatus.protocol_status
            },
            engine_status: engineStatus,
            status_source: engineStatus.running ? 'engine' : 'database',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error(`❌ Error getting device status for ${deviceId}:`, error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== CONNECTION TESTING ====================

// Test connection to device
router.post('/project/:projectId/:deviceId/test-connection', auth, async (req, res) => {
    try {
        const { deviceId } = req.params;

        const deviceQuery = await pool.query(
            'SELECT * FROM devices WHERE device_id = $1',
            [deviceId]
        );

        if (deviceQuery.rows.length === 0) {
            return res.status(404).json({ error: 'Device not found' });
        }

        const device = deviceQuery.rows[0];
        console.log(`🔗 Testing connection to ${device.device_name} (${device.device_type})`);

        let result;

        switch (device.device_type?.toLowerCase()) {
            case 'modbus':
                result = await ModbusService.testConnection(
                    device.ip_address,
                    device.port,
                    device.slave_id
                );
                break;

            case 'mqtt':
                result = await MqttService.testConnection(
                    device.ip_address,
                    device.port
                );
                break;

            case 'simulation':
                result = await SimulationService.testConnection(device.device_name);
                break;

            default:
                return res.status(400).json({
                    error: `Unsupported device type: ${device.device_type}`
                });
        }

        // Update last connection test time
        await pool.query(
            'UPDATE devices SET last_connection_test = CURRENT_TIMESTAMP WHERE device_id = $1',
            [deviceId]
        );

        console.log(`🔗 Connection test result for ${device.device_name}: ${result.connected ? 'SUCCESS' : 'FAILED'}`);
        res.json(result);

    } catch (error) {
        console.error('❌ Connection test error:', error);
        res.status(500).json({
            connected: false,
            message: error.message,
            error_code: 'INTERNAL_ERROR'
        });
    }
});

// ==================== DEVICE STATISTICS ====================

// Get device statistics
router.get('/project/:projectId/statistics', auth, async (req, res) => {
    try {
        const { projectId } = req.params;

        const statsQuery = `
            SELECT
                COUNT(*) as total_devices,
                COUNT(CASE WHEN data_collection_active = true THEN 1 END) as active_devices,
                COUNT(CASE WHEN device_type = 'simulation' THEN 1 END) as simulation_devices,
                COUNT(CASE WHEN device_type = 'modbus' THEN 1 END) as modbus_devices,
                COUNT(CASE WHEN device_type = 'mqtt' THEN 1 END) as mqtt_devices
            FROM devices
            WHERE project_id = $1
        `;

        const result = await pool.query(statsQuery, [projectId]);
        const stats = result.rows[0];

        // Get engine statistics if available
        let engineStats = { message: 'Engine not available' };
        if (dataCollectionEngine) {
            engineStats = dataCollectionEngine.getStatistics();
        }

        res.json({
            project_id: parseInt(projectId),
            device_statistics: stats,
            engine_statistics: engineStats,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error getting device statistics:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== ENGINE DEBUGGING ENDPOINTS ====================

// Get all device statuses from engine
router.get('/project/:projectId/engine-status', auth, async (req, res) => {
    try {
        if (!dataCollectionEngine) {
            return res.status(503).json({
                error: 'DataCollectionEngine not available',
                available: false
            });
        }

        const engineStatus = dataCollectionEngine.getStatus();
        res.json(engineStatus);

    } catch (error) {
        console.error('❌ Error getting engine status:', error);
        res.status(500).json({ error: error.message });
    }
});

// Force refresh devices in engine
router.post('/project/:projectId/refresh-engine', auth, async (req, res) => {
    try {
        if (!dataCollectionEngine) {
            return res.status(503).json({
                error: 'DataCollectionEngine not available'
            });
        }

        console.log(`🔄 Manual engine refresh requested for project ${req.params.projectId}`);
        await dataCollectionEngine.scanAndStartCollectors();

        res.json({
            success: true,
            message: 'Engine refreshed successfully',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error refreshing engine:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== ADVANCED ENGINE OPERATIONS ====================

// Get detailed engine statistics
router.get('/project/:projectId/engine-detailed-status', auth, async (req, res) => {
    try {
        if (!dataCollectionEngine) {
            return res.status(503).json({
                error: 'DataCollectionEngine not available',
                available: false
            });
        }

        const { projectId } = req.params;

        // Get all devices for this project
        const devicesQuery = await pool.query(
            'SELECT device_id, device_name, device_type FROM devices WHERE project_id = $1',
            [projectId]
        );

        const deviceDetails = devicesQuery.rows.map(device => {
            const engineStatus = dataCollectionEngine.getDeviceStatus(device.device_id);
            return {
                device_id: device.device_id,
                device_name: device.device_name,
                device_type: device.device_type,
                engine_status: engineStatus,
                running: engineStatus.running
            };
        });

        const overallStats = dataCollectionEngine.getStatistics();

        res.json({
            project_id: parseInt(projectId),
            overall_engine_stats: overallStats,
            device_details: deviceDetails,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error getting detailed engine status:', error);
        res.status(500).json({ error: error.message });
    }
});

// Stop all devices in a project
router.post('/project/:projectId/stop-all', auth, async (req, res) => {
    try {
        const { projectId } = req.params;

        if (!dataCollectionEngine) {
            return res.status(503).json({
                error: 'DataCollectionEngine not available'
            });
        }

        console.log(`🛑 STOP ALL devices requested for project ${projectId}`);

        // Get all devices for this project
        const devicesQuery = await pool.query(
            'SELECT device_id, device_name FROM devices WHERE project_id = $1',
            [projectId]
        );

        const results = [];

        for (const device of devicesQuery.rows) {
            try {
                const result = await dataCollectionEngine.stopDevice(device.device_id);

                if (result.success) {
                    // Update database
                    await pool.query(`
                        UPDATE devices 
                        SET 
                            data_collection_active = false,
                            connection_status = 'stopped',
                            updated_at = CURRENT_TIMESTAMP
                        WHERE device_id = $1
                    `, [device.device_id]);
                }

                results.push({
                    device_id: device.device_id,
                    device_name: device.device_name,
                    success: result.success,
                    message: result.message
                });

            } catch (error) {
                results.push({
                    device_id: device.device_id,
                    device_name: device.device_name,
                    success: false,
                    error: error.message
                });
            }
        }

        const successCount = results.filter(r => r.success).length;
        const totalCount = results.length;

        console.log(`✅ STOP ALL completed: ${successCount}/${totalCount} devices stopped`);

        res.json({
            success: true,
            message: `Stopped ${successCount} of ${totalCount} devices`,
            results: results,
            summary: {
                total_devices: totalCount,
                stopped_successfully: successCount,
                failed: totalCount - successCount
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error stopping all devices:', error);
        res.status(500).json({ error: error.message });
    }
});

// Start all devices in a project
router.post('/project/:projectId/start-all', auth, async (req, res) => {
    try {
        const { projectId } = req.params;

        if (!dataCollectionEngine) {
            return res.status(503).json({
                error: 'DataCollectionEngine not available'
            });
        }

        console.log(`🚀 START ALL devices requested for project ${projectId}`);

        // Get all devices for this project
        const devicesQuery = await pool.query(
            'SELECT device_id, device_name, device_type FROM devices WHERE project_id = $1',
            [projectId]
        );

        const results = [];

        for (const device of devicesQuery.rows) {
            try {
                const result = await dataCollectionEngine.startDevice(device.device_id);

                if (result.success) {
                    // Update database
                    const newConnectionStatus = device.device_type === 'simulation' ? 'simulating' : 'collecting';

                    await pool.query(`
                        UPDATE devices 
                        SET 
                            data_collection_active = true,
                            connection_status = $1,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE device_id = $2
                    `, [newConnectionStatus, device.device_id]);
                }

                results.push({
                    device_id: device.device_id,
                    device_name: device.device_name,
                    device_type: device.device_type,
                    success: result.success,
                    message: result.message,
                    tags_count: result.tags_count
                });

            } catch (error) {
                results.push({
                    device_id: device.device_id,
                    device_name: device.device_name,
                    success: false,
                    error: error.message
                });
            }
        }

        const successCount = results.filter(r => r.success).length;
        const totalCount = results.length;

        console.log(`✅ START ALL completed: ${successCount}/${totalCount} devices started`);

        res.json({
            success: true,
            message: `Started ${successCount} of ${totalCount} devices`,
            results: results,
            summary: {
                total_devices: totalCount,
                started_successfully: successCount,
                failed: totalCount - successCount
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error starting all devices:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = { router, setDataCollectionEngine };