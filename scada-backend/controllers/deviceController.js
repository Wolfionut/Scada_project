// controllers/deviceController.js
const pool = require('../db');
const logger = require('../utils/logger');
const config = require('../config');

// Import protocol services
const modbusService = require('../services/protocols/ModbusService');
const mqttService = require('../services/protocols/MqttService');
const simulationService = require('../services/protocols/SimulationService');

// Configuration constants
const DATA_COLLECTION_INTERVAL = config.dataCollectionInterval || 5000;
const MAX_RECONNECT_ATTEMPTS = config.maxReconnectAttempts || 3;
const DEFAULT_MQTT_QOS = config.mqttQos || 1;

// In-memory storage for connection states and data collection processes
const deviceConnections = new Map();
const dataCollectionProcesses = new Map();

// Protocol handler factory
const protocolFactory = {
    modbus: {
        test: testModbusConnection,
        start: startModbusDataCollection,
        stop: (id) => modbusService.disconnect(id),
        getStatus: (id) => modbusService.getConnectionStatus(id)
    },
    mqtt: {
        test: testMqttConnection,
        start: startMqttDataCollection,
        stop: (id) => mqttService.disconnect(id),
        getStatus: (id) => mqttService.getConnectionStatus(id)
    },
    simulation: {
        test: testSimulationConnection,
        start: startSimulationDataCollection,
        stop: (id) => simulationService.stopSimulation(id),
        getStatus: (id) => simulationService.getSimulationStatus(id)
    }
};

/**
 * Tests Modbus TCP connection
 * @param {string} ip
 * @param {number} port
 * @param {number} [slaveId]
 * @returns {Promise<{connected: boolean, message?: string}>}
 */
async function testModbusConnection(ip, port, slaveId) {
    try {
        if (!ip || !port) {
            throw new Error('IP address and port are required for Modbus connection');
        }
        return await modbusService.testConnection(ip, port, slaveId);
    } catch (error) {
        logger.error('Modbus connection test failed', { error, ip, port });
        return { connected: false, message: error.message, protocol: 'Modbus TCP' };
    }
}

/**
 * Tests MQTT connection
 * @param {string} ip
 * @param {number} port
 * @returns {Promise<{connected: boolean, message?: string}>}
 */
async function testMqttConnection(ip, port) {
    try {
        if (!ip || !port) {
            throw new Error('IP address and port are required for MQTT connection');
        }
        return await mqttService.testConnection(ip, port);
    } catch (error) {
        logger.error('MQTT connection test failed', { error, ip, port });
        return { connected: false, message: error.message, protocol: 'MQTT' };
    }
}

/**
 * Tests simulation connection
 * @param {string} [deviceName]
 * @returns {Promise<{connected: boolean, message?: string}>}
 */
async function testSimulationConnection(deviceName = 'Simulation Device') {
    try {
        return await simulationService.testConnection(deviceName);
    } catch (error) {
        logger.error('Simulation connection test failed', { error, deviceName });
        return { connected: false, message: error.message, protocol: 'Simulation' };
    }
}

/**
 * @typedef {Object} Device
 * @property {number} device_id
 * @property {number} project_id
 * @property {string} device_name
 * @property {'modbus'|'mqtt'|'simulation'} device_type
 * @property {string} [protocol]
 * @property {string} [ip_address]
 * @property {number} [port]
 * @property {number} [slave_id]
 */

/**
 * @typedef {Object} Tag
 * @property {number} tag_id
 * @property {number} device_id
 * @property {string} tag_name
 * @property {string} [address]
 * @property {string} [tag_type]
 */

module.exports = {
    /**
     * Tests device connection
     */
    async testConnection(req, res) {
        try {
            const { device_type, ip_address, port, slave_id, device_name } = req.body;
            const startTime = Date.now();

            logger.info('Testing device connection', {
                device_type,
                ip_address: ip_address ? `${ip_address.slice(0, 3)}...` : null,
                port
            });

            const protocolHandler = protocolFactory[device_type?.toLowerCase()];
            if (!protocolHandler) {
                return res.status(400).json({
                    connected: false,
                    message: `Unsupported device type: ${device_type}`
                });
            }

            const result = await protocolHandler.test(ip_address, port, slave_id);
            const responseTime = Date.now() - startTime;

            logger.info('Connection test completed', {
                device_type,
                connected: result.connected,
                responseTime
            });

            res.json({
                connected: result.connected,
                message: result.message,
                responseTime: result.responseTime || responseTime,
                device_type,
                protocol: result.protocol || device_type,
                features: result.features || [],
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            logger.error('Connection test failed', { error, body: req.body });
            res.status(500).json({
                connected: false,
                message: error.message,
                device_type: req.body.device_type,
                timestamp: new Date().toISOString()
            });
        }
    },

    /**
     * Gets all devices for a project
     */
    async getDevicesByProject(req, res) {
        const { projectId } = req.params;
        const userId = req.user.id;

        try {
            // Verify project exists and belongs to user
            const projCheck = await pool.query(
                'SELECT * FROM projects WHERE id = $1 AND user_id = $2',
                [projectId, userId]
            );

            if (projCheck.rows.length === 0) {
                return res.status(404).json({ error: 'Project not found' });
            }

            // Get all devices for project
            const result = await pool.query(
                'SELECT * FROM devices WHERE project_id = $1 ORDER BY device_id ASC',
                [projectId]
            );

            // Enhance devices with connection status
            const devicesWithStatus = await Promise.all(
                result.rows.map(async (device) => {
                    const deviceId = parseInt(device.device_id);
                    const protocolHandler = protocolFactory[device.device_type?.toLowerCase()];

                    let connectionStatus = 'unknown';
                    let protocolStatus = null;
                    let dataCollectionActive = dataCollectionProcesses.has(deviceId);

                    if (protocolHandler) {
                        try {
                            protocolStatus = await protocolHandler.getStatus(deviceId);
                            connectionStatus = protocolStatus?.connected
                                ? 'connected'
                                : 'disconnected';

                            if (device.device_type?.toLowerCase() === 'simulation') {
                                connectionStatus = protocolStatus?.running ? 'simulating' : 'stopped';
                            }
                        } catch (error) {
                            logger.error('Error getting device status', { error, deviceId });
                        }
                    }

                    return {
                        ...device,
                        connection_status: connectionStatus,
                        protocol_status: protocolStatus,
                        data_collection_active: dataCollectionActive
                    };
                })
            );

            logger.info('Fetched devices for project', {
                projectId,
                count: devicesWithStatus.length
            });

            res.json(devicesWithStatus);
        } catch (error) {
            logger.error('Error fetching devices', { error, projectId });
            res.status(500).json({ error: error.message });
        }
    },

    /**
     * Creates a new device
     */
    async createDevice(req, res) {
        const { projectId } = req.params;
        const userId = req.user.id;
        const {
            device_name,
            device_type,
            protocol,
            ip_address,
            port,
            slave_id
        } = req.body;

        if (!device_name) {
            return res.status(400).json({ error: 'Device name required' });
        }

        try {
            // Verify project exists and belongs to user
            const projCheck = await pool.query(
                'SELECT * FROM projects WHERE id = $1 AND user_id = $2',
                [projectId, userId]
            );

            if (projCheck.rows.length === 0) {
                return res.status(404).json({ error: 'Project not found' });
            }

            logger.info('Creating new device', {
                projectId,
                device_name,
                device_type
            });

            // Insert new device
            const result = await pool.query(
                `INSERT INTO devices (
          project_id, device_name, device_type, protocol, 
          ip_address, port, slave_id, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) 
        RETURNING *`,
                [
                    projectId,
                    device_name,
                    device_type || null,
                    protocol || null,
                    ip_address || null,
                    port ? parseInt(port) : null,
                    slave_id ? parseInt(slave_id) : null
                ]
            );

            const newDevice = result.rows[0];
            logger.info('Device created successfully', { deviceId: newDevice.device_id });

            res.status(201).json(newDevice);
        } catch (error) {
            logger.error('Error creating device', { error, projectId, device_name });

            if (error.code === '23505') {
                res.status(400).json({ error: 'Device name already exists in this project' });
            } else {
                res.status(500).json({ error: error.message });
            }
        }
    },

    /**
     * Updates an existing device
     */
    async updateDevice(req, res) {
        const { projectId, deviceId } = req.params;
        const userId = req.user.id;
        const {
            device_name,
            device_type,
            protocol,
            ip_address,
            port,
            slave_id
        } = req.body;

        try {
            // Verify project exists and belongs to user
            const projCheck = await pool.query(
                'SELECT * FROM projects WHERE id = $1 AND user_id = $2',
                [projectId, userId]
            );

            if (projCheck.rows.length === 0) {
                return res.status(404).json({ error: 'Project not found' });
            }

            logger.info('Updating device', { deviceId, projectId });

            // Stop any active data collection
            await stopDeviceDataCollection(parseInt(deviceId));

            // Update device
            const result = await pool.query(
                `UPDATE devices SET 
          device_name = $1, 
          device_type = $2, 
          protocol = $3,
          ip_address = $4,
          port = $5,
          slave_id = $6,
          updated_at = NOW()
        WHERE device_id = $7 AND project_id = $8 
        RETURNING *`,
                [
                    device_name,
                    device_type,
                    protocol,
                    ip_address,
                    port ? parseInt(port) : null,
                    slave_id ? parseInt(slave_id) : null,
                    deviceId,
                    projectId
                ]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Device not found' });
            }

            // Clear connection state
            deviceConnections.delete(parseInt(deviceId));

            logger.info('Device updated successfully', { deviceId });
            res.json(result.rows[0]);
        } catch (error) {
            logger.error('Error updating device', { error, deviceId });
            res.status(500).json({ error: error.message });
        }
    },

    /**
     * Deletes a device
     */
    async deleteDevice(req, res) {
        const { projectId, deviceId } = req.params;
        const userId = req.user.id;

        try {
            // Verify project exists and belongs to user
            const projCheck = await pool.query(
                'SELECT * FROM projects WHERE id = $1 AND user_id = $2',
                [projectId, userId]
            );

            if (projCheck.rows.length === 0) {
                return res.status(404).json({ error: 'Project not found' });
            }

            logger.info('Deleting device', { deviceId, projectId });

            // Stop any active data collection
            await stopDeviceDataCollection(parseInt(deviceId));

            // Delete device
            const result = await pool.query(
                'DELETE FROM devices WHERE device_id = $1 AND project_id = $2 RETURNING *',
                [deviceId, projectId]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Device not found' });
            }

            // Clear connection state
            deviceConnections.delete(parseInt(deviceId));

            logger.info('Device deleted successfully', { deviceId });
            res.json({ message: 'Device deleted' });
        } catch (error) {
            logger.error('Error deleting device', { error, deviceId });
            res.status(500).json({ error: error.message });
        }
    },

    /**
     * Tests connection for an existing device
     */
    async testExistingDeviceConnection(req, res) {
        const { projectId, deviceId } = req.params;
        const userId = req.user.id;

        try {
            // Verify project exists and belongs to user
            const projCheck = await pool.query(
                'SELECT * FROM projects WHERE id = $1 AND user_id = $2',
                [projectId, userId]
            );

            if (projCheck.rows.length === 0) {
                return res.status(404).json({ error: 'Project not found' });
            }

            // Get device details
            const deviceQuery = await pool.query(
                'SELECT * FROM devices WHERE device_id = $1 AND project_id = $2',
                [deviceId, projectId]
            );

            if (deviceQuery.rows.length === 0) {
                return res.status(404).json({ error: 'Device not found' });
            }

            const device = deviceQuery.rows[0];
            const protocolHandler = protocolFactory[device.device_type?.toLowerCase()];

            if (!protocolHandler) {
                return res.status(400).json({
                    connected: false,
                    message: `Unsupported device type: ${device.device_type}`
                });
            }

            const startTime = Date.now();
            const result = await protocolHandler.test(
                device.ip_address,
                device.port,
                device.slave_id
            );

            const responseTime = Date.now() - startTime;
            deviceConnections.set(parseInt(deviceId), result.connected ? 'connected' : 'failed');

            logger.info('Existing device connection test completed', {
                deviceId,
                connected: result.connected,
                responseTime
            });

            res.json({
                connected: result.connected,
                message: result.message,
                responseTime: result.responseTime || responseTime,
                device_id: deviceId,
                device_name: device.device_name,
                protocol: result.protocol || device.device_type,
                features: result.features || [],
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            logger.error('Error testing existing device connection', { error, deviceId });
            res.status(500).json({
                connected: false,
                message: error.message,
                device_id: deviceId,
                timestamp: new Date().toISOString()
            });
        }
    },

    /**
     * Starts data collection for a device
     */
    async startDataCollection(req, res) {
        const { projectId, deviceId } = req.params;
        const userId = req.user.id;
        const deviceIdInt = parseInt(deviceId);

        try {
            // Verify project exists and belongs to user
            const projCheck = await pool.query(
                'SELECT * FROM projects WHERE id = $1 AND user_id = $2',
                [projectId, userId]
            );

            if (projCheck.rows.length === 0) {
                return res.status(404).json({ error: 'Project not found' });
            }

            logger.info('Starting data collection', { deviceId, projectId });

            // Check if already collecting
            if (dataCollectionProcesses.has(deviceIdInt)) {
                return res.json({
                    message: 'Data collection already active for this device',
                    active: true
                });
            }

            // Get device details
            const deviceQuery = await pool.query(
                'SELECT * FROM devices WHERE device_id = $1 AND project_id = $2',
                [deviceId, projectId]
            );

            if (deviceQuery.rows.length === 0) {
                return res.status(404).json({ error: 'Device not found' });
            }

            const device = deviceQuery.rows[0];
            const protocolHandler = protocolFactory[device.device_type?.toLowerCase()];

            if (!protocolHandler) {
                return res.status(400).json({
                    error: `Unsupported device type for data collection: ${device.device_type}`
                });
            }

            // Get associated tags
            const tagsQuery = await pool.query(
                'SELECT * FROM tags WHERE device_id = $1',
                [deviceId]
            );

            if (tagsQuery.rows.length === 0) {
                return res.status(400).json({
                    error: 'No tags found for this device. Please configure tags first.'
                });
            }

            // Start protocol-specific data collection
            const collectionResult = await protocolHandler.start(device, tagsQuery.rows);

            if (collectionResult.success) {
                dataCollectionProcesses.set(deviceIdInt, {
                    device,
                    tags: tagsQuery.rows,
                    started_at: new Date(),
                    protocol: device.device_type,
                    project_id: projectId
                });

                deviceConnections.set(deviceIdInt, 'collecting');

                logger.info('Data collection started successfully', {
                    deviceId,
                    protocol: device.device_type,
                    tagCount: tagsQuery.rows.length
                });

                res.json({
                    message: `Data collection started for device ${device.device_name}`,
                    active: true,
                    tags_count: tagsQuery.rows.length,
                    protocol: device.device_type,
                    features: collectionResult.features || [],
                    collection_details: collectionResult.details || {}
                });
            } else {
                res.status(500).json({
                    error: collectionResult.message || 'Failed to start data collection'
                });
            }
        } catch (error) {
            logger.error('Error starting data collection', { error, deviceId });
            res.status(500).json({ error: 'Could not start data collection' });
        }
    },

    /**
     * Stops data collection for a device
     */
    async stopDataCollection(req, res) {
        const { projectId, deviceId } = req.params;
        const userId = req.user.id;
        const deviceIdInt = parseInt(deviceId);

        try {
            // Verify project exists and belongs to user
            const projCheck = await pool.query(
                'SELECT * FROM projects WHERE id = $1 AND user_id = $2',
                [projectId, userId]
            );

            if (projCheck.rows.length === 0) {
                return res.status(404).json({ error: 'Project not found' });
            }

            logger.info('Stopping data collection', { deviceId, projectId });

            const stopped = await stopDeviceDataCollection(deviceIdInt);

            if (stopped) {
                logger.info('Data collection stopped successfully', { deviceId });
                res.json({
                    message: 'Data collection stopped',
                    active: false
                });
            } else {
                res.json({
                    message: 'Data collection was not active for this device',
                    active: false
                });
            }
        } catch (error) {
            logger.error('Error stopping data collection', { error, deviceId });
            res.status(500).json({ error: 'Could not stop data collection' });
        }
    }
};

/**
 * Starts Modbus data collection
 * @param {Device} device
 * @param {Tag[]} tags
 * @returns {Promise<{success: boolean, message?: string, features?: string[], details?: object}>}
 */
async function startModbusDataCollection(device, tags) {
    let attempts = 0;
    let interval;

    while (attempts < MAX_RECONNECT_ATTEMPTS) {
        try {
            logger.info(`Starting Modbus data collection for ${device.device_name}`, {
                deviceId: device.device_id,
                attempt: attempts + 1
            });

            const connection = await modbusService.connect(device);

            interval = setInterval(async () => {
                try {
                    const measurements = [];

                    for (const tag of tags) {
                        if (!tag.address) continue;

                        const address = parseInt(tag.address);
                        let value;

                        switch (tag.tag_type?.toLowerCase()) {
                            case 'holding_register':
                                const holdingResult = await modbusService.readHoldingRegister(
                                    device.device_id,
                                    address
                                );
                                value = holdingResult.values[0];
                                break;
                            default:
                                const defaultResult = await modbusService.readHoldingRegister(
                                    device.device_id,
                                    address
                                );
                                value = defaultResult.values[0];
                        }

                        measurements.push({
                            tag_id: tag.tag_id,
                            value: value,
                            project_id: device.project_id
                        });
                    }

                    // Batch save measurements
                    if (measurements.length > 0) {
                        await saveBatchMeasurements(measurements);
                    }

                    deviceConnections.set(device.device_id, 'connected');
                } catch (error) {
                    logger.error(`Modbus data collection error`, {
                        error,
                        deviceId: device.device_id
                    });
                    deviceConnections.set(device.device_id, 'error');
                }
            }, DATA_COLLECTION_INTERVAL);

            // Store interval reference for cleanup
            const process = dataCollectionProcesses.get(device.device_id);
            if (process) {
                process.interval = interval;
            }

            return {
                success: true,
                message: 'Modbus data collection started',
                features: ['Holding Registers', 'Input Registers', 'Coils', 'Discrete Inputs'],
                details: {
                    interval: `${DATA_COLLECTION_INTERVAL}ms`,
                    protocol: 'Modbus TCP'
                }
            };
        } catch (error) {
            attempts++;
            logger.error('Modbus connection failed', {
                error,
                deviceId: device.device_id,
                attempt: attempts
            });

            if (attempts >= MAX_RECONNECT_ATTEMPTS) {
                return {
                    success: false,
                    message: `Modbus connection failed after ${attempts} attempts: ${error.message}`
                };
            }

            // Exponential backoff
            await new Promise(res =>
                setTimeout(res, 1000 * Math.pow(2, attempts))
            );
        }
    }
}

/**
 * Starts MQTT data collection
 * @param {Device} device
 * @param {Tag[]} tags
 * @returns {Promise<{success: boolean, message?: string, features?: string[], details?: object}>}
 */
async function startMqttDataCollection(device, tags) {
    try {
        logger.info(`Starting MQTT data collection for ${device.device_name}`, {
            deviceId: device.device_id
        });

        const connection = await mqttService.connect(device);

        // Subscribe to all tags
        for (const tag of tags) {
            const topic = tag.address || `scada/${device.device_name}/data/${tag.tag_name}`;

            await mqttService.subscribe(
                device.device_id,
                topic,
                DEFAULT_MQTT_QOS,
                async (receivedTopic, message) => {
                    try {
                        const data = JSON.parse(message.toString());
                        const value = typeof data === 'object' ? data.value : parseFloat(data);

                        if (!isNaN(value)) {
                            await saveMeasurement(
                                tag.tag_id,
                                value,
                                device.project_id
                            );
                        }
                    } catch (parseError) {
                        const directValue = parseFloat(message.toString());
                        if (!isNaN(directValue)) {
                            await saveMeasurement(
                                tag.tag_id,
                                directValue,
                                device.project_id
                            );
                        }
                    }
                }
            );
        }

        deviceConnections.set(device.device_id, 'connected');

        return {
            success: true,
            message: 'MQTT data collection started',
            features: ['Real-time MQTT subscriptions', 'JSON message parsing', 'Topic wildcards'],
            details: {
                subscribed_topics: tags.length,
                protocol: 'MQTT',
                qos: DEFAULT_MQTT_QOS
            }
        };
    } catch (error) {
        logger.error('MQTT connection failed', { error, deviceId: device.device_id });
        return {
            success: false,
            message: `MQTT connection failed: ${error.message}`
        };
    }
}

/**
 * Starts simulation data collection
 * @param {Device} device
 * @param {Tag[]} tags
 * @returns {Promise<{success: boolean, message?: string, features?: string[], details?: object}>}
 */
async function startSimulationDataCollection(device, tags) {
    try {
        logger.info(`Starting simulation for ${device.device_name}`, {
            deviceId: device.device_id
        });

        const result = await simulationService.startSimulation(
            device,
            tags,
            async (measurements) => {
                await saveBatchMeasurements(measurements);
            }
        );

        if (result.success) {
            deviceConnections.set(device.device_id, 'simulating');
            return {
                success: true,
                message: 'Simulation data collection started',
                features: result.features || [
                    'Realistic industrial patterns',
                    'Temperature/Pressure/Flow simulation',
                    'Digital I/O states'
                ],
                details: {
                    interval: result.simulation_interval,
                    protocol: 'Simulation',
                    patterns: result.features?.length || 0
                }
            };
        }
        return result;
    } catch (error) {
        logger.error('Simulation failed', { error, deviceId: device.device_id });
        return {
            success: false,
            message: `Simulation failed: ${error.message}`
        };
    }
}

/**
 * Stops device data collection
 * @param {number} deviceId
 * @returns {Promise<boolean>}
 */
async function stopDeviceDataCollection(deviceId) {
    const process = dataCollectionProcesses.get(deviceId);
    if (!process) return false;

    try {
        logger.info('Stopping data collection', { deviceId, protocol: process.protocol });

        const protocolHandler = protocolFactory[process.protocol?.toLowerCase()];
        if (protocolHandler) {
            await protocolHandler.stop(deviceId);
        }

        // Clear any intervals
        if (process.interval) {
            clearInterval(process.interval);
        }

        dataCollectionProcesses.delete(deviceId);
        deviceConnections.set(deviceId, 'stopped');

        logger.info('Data collection stopped', { deviceId });
        return true;
    } catch (error) {
        logger.error('Error stopping data collection', { error, deviceId });
        return false;
    }
}

/**
 * Saves a single measurement
 * @param {number} tagId
 * @param {number} value
 * @param {number} projectId
 * @returns {Promise<void>}
 */
async function saveMeasurement(tagId, value, projectId) {
    try {
        await pool.query(
            'INSERT INTO measurements (tag_id, value, timestamp) VALUES ($1, $2, NOW())',
            [tagId, value]
        );

        // Broadcast via WebSocket if available
        if (global.wsManager) {
            global.wsManager.broadcastMeasurement(projectId, {
                tag_id: tagId,
                value: value,
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        logger.error('Error saving measurement', { error, tagId });
    }
}

/**
 * Saves multiple measurements in a batch
 * @param {Array<{tag_id: number, value: number, project_id: number}>} measurements
 * @returns {Promise<void>}
 */
async function saveBatchMeasurements(measurements) {
    if (measurements.length === 0) return;

    try {
        const values = measurements.map(m =>
            `(${m.tag_id}, ${m.value}, NOW())`
        ).join(',');

        await pool.query(
            `INSERT INTO measurements (tag_id, value, timestamp) 
       VALUES ${values}`
        );

        // Broadcast via WebSocket if available
        if (global.wsManager) {
            for (const m of measurements) {
                global.wsManager.broadcastMeasurement(m.project_id, {
                    tag_id: m.tag_id,
                    value: m.value,
                    timestamp: new Date().toISOString()
                });
            }
        }
    } catch (error) {
        logger.error('Error saving batch measurements', { error });
    }
}