// services/DataCollectionEngine.js - COMPLETE FIXED VERSION with Proper Alarm Integration
const pool = require('../db');
const SimulationService = require('./protocols/SimulationService');
const ModbusService = require('./protocols/ModbusService');
const MqttService = require('./protocols/MqttService');

class DataCollectionEngine {
    constructor(wsManager = null) {
        this.wsManager = wsManager;
        this.isRunning = false;
        this.scanInterval = null;
        this.deviceCollectors = new Map();
        this.tagLastValues = new Map();
        this.statistics = {
            totalReadings: 0,
            successfulReadings: 0,
            failedReadings: 0,
            startTime: null,
            lastScan: null,
            activeDevices: 0,
            activeTags: 0
        };

        console.log('🏭 SCADA Data Collection Engine initialized - FIXED VERSION WITH WORKING ALARM INTEGRATION');
    }

    // ==================== MAIN ENGINE CONTROL ====================

    async start() {
        if (this.isRunning) {
            console.log('⚠️ Data collection engine already running');
            return { success: false, message: 'Engine already running' };
        }

        console.log('🚀 Starting SCADA Data Collection Engine...');
        this.isRunning = true;
        this.statistics.startTime = new Date();

        try {
            await this.scanAndStartCollectors();

            this.scanInterval = setInterval(() => {
                this.scanAndStartCollectors();
            }, 30000);

            console.log('✅ 🏭 Data Collection Engine started successfully!');
            console.log(`📊 Monitoring ${this.statistics.activeDevices} devices with ${this.statistics.activeTags} tags`);
            return {
                success: true,
                message: 'Data collection engine started',
                statistics: this.getStatistics()
            };

        } catch (error) {
            console.error('❌ Failed to start data collection engine:', error);
            this.isRunning = false;
            return { success: false, message: error.message };
        }
    }

    async stop() {
        if (!this.isRunning) {
            return { success: false, message: 'Engine not running' };
        }

        console.log('🛑 Stopping SCADA Data Collection Engine...');
        this.isRunning = false;

        if (this.scanInterval) {
            clearInterval(this.scanInterval);
            this.scanInterval = null;
        }

        for (const [deviceId] of this.deviceCollectors) {
            await this.stopDeviceCollector(deviceId);
        }

        this.deviceCollectors.clear();
        this.tagLastValues.clear();

        console.log('✅ SCADA Data Collection Engine stopped');
        return { success: true, message: 'Data collection engine stopped' };
    }

    // ==================== DEVICE-LEVEL CONTROL ====================

    async startDevice(deviceId) {
        try {
            console.log(`🚀 Starting individual device: ${deviceId}`);

            const deviceQuery = await pool.query(
                'SELECT * FROM devices WHERE device_id = $1',
                [deviceId]
            );

            if (deviceQuery.rows.length === 0) {
                return { success: false, message: 'Device not found' };
            }

            const device = deviceQuery.rows[0];

            const tagsQuery = await pool.query(
                'SELECT * FROM tags WHERE device_id = $1 ORDER BY tag_name',
                [deviceId]
            );

            if (tagsQuery.rows.length === 0) {
                return { success: false, message: 'No tags configured for this device' };
            }

            await this.setupDeviceCollector(device);

            return {
                success: true,
                message: `Device ${device.device_name} started successfully`,
                device_name: device.device_name,
                tags_count: tagsQuery.rows.length,
                device_type: device.device_type
            };

        } catch (error) {
            console.error(`❌ Error starting device ${deviceId}:`, error);
            return { success: false, message: error.message };
        }
    }

    async stopDevice(deviceId) {
        try {
            console.log(`🛑 Stopping individual device: ${deviceId}`);

            const collectorKey = `${deviceId}`;
            const collector = this.deviceCollectors.get(collectorKey);

            if (!collector) {
                return { success: false, message: 'Device is not running' };
            }

            await this.stopDeviceCollector(deviceId);

            return {
                success: true,
                message: `Device ${collector.device_name} stopped successfully`,
                device_name: collector.device_name
            };

        } catch (error) {
            console.error(`❌ Error stopping device ${deviceId}:`, error);
            return { success: false, message: error.message };
        }
    }

    async getDeviceStatus(deviceId) {
        const collectorKey = `${deviceId}`;
        const collector = this.deviceCollectors.get(collectorKey);

        if (!collector) {
            return { running: false, message: 'Device not active' };
        }

        return {
            running: true,
            device_name: collector.device_name,
            device_type: collector.type,
            started_at: collector.started_at,
            last_activity: collector.last_activity,
            tags_count: collector.tags?.length || 0,
            collector_details: collector.details || {}
        };
    }

    // ==================== DEVICE SCANNING ====================

    async scanAndStartCollectors() {
        try {
            console.log('🔍 Scanning for active devices...');
            this.statistics.lastScan = new Date();

            const devicesQuery = `
                SELECT
                    d.device_id, d.device_name, d.device_type, d.protocol,
                    d.ip_address, d.port, d.slave_id, d.project_id,
                    COUNT(t.tag_id) as tag_count
                FROM devices d
                         LEFT JOIN tags t ON d.device_id = t.device_id
                WHERE d.device_type IS NOT NULL
                GROUP BY d.device_id, d.device_name, d.device_type, d.protocol,
                         d.ip_address, d.port, d.slave_id, d.project_id
                HAVING COUNT(t.tag_id) > 0
                ORDER BY d.device_name
            `;

            const devicesResult = await pool.query(devicesQuery);
            const devices = devicesResult.rows;

            console.log(`📊 Found ${devices.length} devices with tags`);

            for (const device of devices) {
                await this.setupDeviceCollector(device);
            }

            this.statistics.activeDevices = this.deviceCollectors.size;

            const tagsQuery = `SELECT COUNT(*) as total FROM tags t JOIN devices d ON t.device_id = d.device_id`;
            const tagsResult = await pool.query(tagsQuery);
            this.statistics.activeTags = parseInt(tagsResult.rows[0].total);

            console.log(`✅ Scan complete - ${this.statistics.activeDevices} active devices, ${this.statistics.activeTags} tags`);

        } catch (error) {
            console.error('❌ Error during device scan:', error);
        }
    }

    async setupDeviceCollector(device) {
        const { device_id, device_type } = device;
        const collectorKey = `${device_id}`;

        try {
            const tagsQuery = `SELECT * FROM tags WHERE device_id = $1 ORDER BY tag_name`;
            const tagsResult = await pool.query(tagsQuery, [device_id]);
            const tags = tagsResult.rows;

            if (tags.length === 0) {
                console.log(`⚠️ No tags found for device ${device.device_name}`);
                return;
            }

            if (this.deviceCollectors.has(collectorKey)) {
                await this.stopDeviceCollector(device_id);
            }

            let collector;
            switch (device_type.toLowerCase()) {
                case 'simulation':
                    collector = await this.startSimulationCollector(device, tags);
                    break;
                case 'modbus':
                    collector = await this.startModbusCollector(device, tags);
                    break;
                case 'mqtt':
                    collector = await this.startMqttCollector(device, tags);
                    break;
                default:
                    console.log(`⚠️ Unsupported device type: ${device_type}`);
                    return;
            }

            if (collector) {
                this.deviceCollectors.set(collectorKey, collector);
                console.log(`✅ Started collector for ${device.device_name} (${device_type})`);
            }

        } catch (error) {
            console.error(`❌ Error setting up collector for device ${device.device_name}:`, error);
        }
    }

    // ==================== 🚀 SIMULATION COLLECTOR ====================

    async startSimulationCollector(device, tags) {
        try {
            console.log(`🎯 Starting simulation collector for ${device.device_name}`);

            const collector = {
                type: 'simulation',
                device_id: device.device_id,
                device_name: device.device_name,
                tags: tags,
                started_at: new Date(),
                last_activity: new Date(),
                details: {
                    using_simulation_service: true,
                    individual_tag_intervals: true
                }
            };

            // Use SimulationService instead of duplicate logic
            const result = await SimulationService.startSimulation(
                device,
                tags,
                async (measurements) => {
                    // Handle measurements from SimulationService
                    for (const measurement of measurements) {
                        await this.processMeasurement(device.project_id, measurement);
                        collector.last_activity = new Date();
                    }
                }
            );

            if (!result.success) {
                console.error(`❌ Failed to start simulation for ${device.device_name}: ${result.message}`);
                return null;
            }

            console.log(`✅ Simulation started via SimulationService for ${device.device_name}`);
            console.log(`📊 Result:`, result);

            // Send device status via WebSocket
            if (this.wsManager) {
                this.wsManager.broadcastToProject(device.project_id, {
                    type: 'device_status',
                    data: {
                        device_id: device.device_id,
                        device_name: device.device_name,
                        status: 'running',
                        tags_count: result.tags_count,
                        individual_intervals: true,
                        simulation_details: result,
                        timestamp: new Date().toISOString()
                    }
                });
            }

            return collector;

        } catch (error) {
            console.error(`❌ Failed to start simulation collector for ${device.device_name}:`, error);
            return null;
        }
    }

    // ==================== MODBUS COLLECTOR ====================

    async startModbusCollector(device, tags) {
        try {
            const collector = {
                type: 'modbus',
                device_id: device.device_id,
                device_name: device.device_name,
                tags: tags,
                connection: null,
                interval: null,
                started_at: new Date(),
                last_activity: new Date()
            };

            const connection = await ModbusService.connect(device);
            collector.connection = connection;

            collector.interval = setInterval(async () => {
                await this.readModbusTags(device, tags);
                collector.last_activity = new Date();
            }, 5000);

            console.log(`🔌 Modbus collector started for ${device.device_name}`);
            return collector;

        } catch (error) {
            console.error(`❌ Failed to start Modbus collector for ${device.device_name}:`, error);
            return null;
        }
    }

    async readModbusTags(device, tags) {
        try {
            for (const tag of tags) {
                if (!tag.address) continue;

                try {
                    const address = parseInt(tag.address);
                    const result = await ModbusService.readHoldingRegister(device.device_id, address, 1);

                    if (result.success && result.values && result.values.length > 0) {
                        let value = result.values[0];
                        value = this.applyScaling(tag, value);

                        const measurement = {
                            tag_id: tag.tag_id,
                            tag_name: tag.tag_name,
                            value: value,
                            quality: 'good',
                            timestamp: new Date(),
                            device_id: device.device_id,
                            device_name: device.device_name,
                            source: 'modbus'
                        };

                        await this.processMeasurement(device.project_id, measurement);
                        this.statistics.successfulReadings++;
                    } else {
                        this.statistics.failedReadings++;
                    }

                } catch (error) {
                    console.error(`❌ Error reading Modbus tag ${tag.tag_name}:`, error);
                    this.statistics.failedReadings++;
                }
            }
        } catch (error) {
            console.error(`❌ Error in Modbus reading cycle for ${device.device_name}:`, error);
        }
    }

    // ==================== MQTT COLLECTOR ====================

    async startMqttCollector(device, tags) {
        try {
            const collector = {
                type: 'mqtt',
                device_id: device.device_id,
                device_name: device.device_name,
                tags: tags,
                connection: null,
                started_at: new Date(),
                last_activity: new Date()
            };

            const connection = await MqttService.connect(device);
            collector.connection = connection;

            for (const tag of tags) {
                if (tag.address) {
                    await MqttService.subscribe(
                        device.device_id,
                        tag.address,
                        1,
                        (topic, message) => this.handleMqttMessage(device, tag, topic, message)
                    );
                }
            }

            console.log(`📡 MQTT collector started for ${device.device_name}`);
            return collector;

        } catch (error) {
            console.error(`❌ Failed to start MQTT collector for ${device.device_name}:`, error);
            return null;
        }
    }

    async handleMqttMessage(device, tag, topic, message) {
        try {
            let value = message.toString();

            if (!isNaN(value)) {
                value = parseFloat(value);
            }

            if (typeof value === 'number') {
                value = this.applyScaling(tag, value);
            }

            const measurement = {
                tag_id: tag.tag_id,
                tag_name: tag.tag_name,
                value: value,
                quality: 'good',
                timestamp: new Date(),
                device_id: device.device_id,
                device_name: device.device_name,
                source: 'mqtt'
            };

            await this.processMeasurement(device.project_id, measurement);
            this.statistics.successfulReadings++;

        } catch (error) {
            console.error(`❌ Error handling MQTT message for tag ${tag.tag_name}:`, error);
            this.statistics.failedReadings++;
        }
    }

    // ==================== 🔧 FIXED DATA PROCESSING WITH ALARM INTEGRATION ====================

    async processMeasurement(projectId, measurement) {
        try {
            const tagQuery = `SELECT * FROM tags WHERE tag_id = $1`;
            const tagResult = await pool.query(tagQuery, [measurement.tag_id]);

            if (tagResult.rows.length === 0) {
                console.error(`❌ Tag ${measurement.tag_id} not found`);
                return;
            }

            const tag = tagResult.rows[0];

            if (!this.shouldStoreValue(tag, measurement.value)) {
                console.log(`⚠️ DEBUG: Skipping storage due to deadband - Tag: ${measurement.tag_name}, Value: ${measurement.value}`);
                return;
            }

            const insertQuery = `
                INSERT INTO measurements (device_id, tag_id, value, timestamp, quality, source)
                VALUES ($1, $2, $3, $4, $5, $6)
                    RETURNING *
            `;

            const values = [
                measurement.device_id,
                measurement.tag_id,
                measurement.value,
                measurement.timestamp,
                measurement.quality || 'good',
                measurement.source || 'simulation'
            ];

            // 🐛 DEBUG: Log before database insert
            console.log('🐛 DEBUG: About to insert measurement:', {
                device_id: measurement.device_id,
                tag_id: measurement.tag_id,
                tag_name: measurement.tag_name,
                value: measurement.value,
                quality: measurement.quality || 'good',
                quality_type: typeof (measurement.quality || 'good')
            });

            const result = await pool.query(insertQuery, values);
            const storedMeasurement = result.rows[0];

            console.log('✅ SUCCESS: Measurement stored with ID:', storedMeasurement.measurement_id);

            this.tagLastValues.set(measurement.tag_id, measurement.value);

            // 🐛 DEBUG: Check WebSocket manager status
            console.log('🐛 DEBUG WebSocket Status:', {
                projectId: projectId,
                tag_name: measurement.tag_name,
                value: measurement.value,
                wsManager_exists: !!this.wsManager,
                wsManager_clients: this.wsManager ? this.wsManager.clients.size : 0,
                wsManager_subscriptions: this.wsManager ? this.wsManager.projectSubscriptions.size : 0,
                project_has_subscribers: this.wsManager ? this.wsManager.projectSubscriptions.has(projectId) : false
            });

            // 🚀 Enhanced WebSocket broadcasting
            if (this.wsManager) {
                const broadcastData = {
                    type: 'measurement',
                    data: {
                        measurement_id: storedMeasurement.measurement_id,
                        tag_id: measurement.tag_id,
                        tag_name: measurement.tag_name,
                        device_name: measurement.device_name,
                        device_id: measurement.device_id,
                        value: measurement.value,
                        timestamp: measurement.timestamp.toISOString(),
                        quality: measurement.quality || 'good',
                        source: measurement.source || 'simulation'
                    },
                    projectId: parseInt(projectId),
                    timestamp: new Date().toISOString()
                };

                // 🐛 DEBUG: Log broadcast data
                console.log('🐛 DEBUG: Broadcasting data:', {
                    type: broadcastData.type,
                    projectId: broadcastData.projectId,
                    tag_name: broadcastData.data.tag_name,
                    value: broadcastData.data.value
                });

                const sentCount = this.wsManager.broadcastToProject(projectId, broadcastData);

                if (sentCount > 0) {
                    console.log(`📡 WebSocket broadcast: ${measurement.tag_name} = ${measurement.value}`);
                    console.log(`📤 Broadcasted measurement to ${sentCount} clients for project ${projectId}`);
                } else {
                    console.log(`⚠️ WebSocket broadcast sent to 0 clients - No subscribers for project ${projectId}`);
                }
            } else {
                console.log('❌ DEBUG: No WebSocket manager available for broadcasting!');
                console.log('❌ This means wsManager was not passed to DataCollectionEngine constructor');
            }

            // 🚨 CRITICAL: Check alarms AFTER storing measurement
            await this.checkAlarms(projectId, tag, measurement.value);

            this.statistics.totalReadings++;
            this.statistics.successfulReadings++;

        } catch (error) {
            console.error('❌ Error processing measurement:', error);
            console.error('❌ Error details:', {
                message: error.message,
                code: error.code,
                detail: error.detail
            });
            this.statistics.failedReadings++;
        }
    }

    // ==================== 🔧 FIXED ALARM SYSTEM ====================

    async checkAlarms(projectId, tag, value) {
        try {
            console.log(`🔍 Checking alarms for tag ${tag.tag_name} = ${value}`);

            const alarmRulesQuery = `
                SELECT r.*,
                       COALESCE(t.tag_name, 'Unknown') as tag_name,
                       COALESCE(d.device_name, 'Unknown') as device_name
                FROM alarm_rules r
                         LEFT JOIN tags t ON r.tag_id = t.tag_id
                         LEFT JOIN devices d ON r.device_id = d.device_id
                WHERE r.tag_id = $1 AND r.enabled = true
            `;
            const rulesResult = await pool.query(alarmRulesQuery, [tag.tag_id]);

            console.log(`🔍 Found ${rulesResult.rows.length} alarm rules for tag ${tag.tag_name}`);

            for (const rule of rulesResult.rows) {
                const isAlarmCondition = this.evaluateAlarmCondition(rule, value);

                console.log(`🔍 Rule "${rule.rule_name}": ${value} ${rule.condition_type} ${rule.threshold} = ${isAlarmCondition ? 'ALARM' : 'NORMAL'}`);

                // Check current alarm state
                const stateQuery = `SELECT * FROM alarm_states WHERE rule_id = $1`;
                const stateResult = await pool.query(stateQuery, [rule.id]);
                const currentState = stateResult.rows[0];

                const isCurrentlyTriggered = currentState && currentState.state === 'triggered';
                const isCurrentlyAcknowledged = currentState && currentState.state === 'acknowledged';

                if (isAlarmCondition && !isCurrentlyTriggered && !isCurrentlyAcknowledged) {
                    // NEW ALARM - Trigger it
                    console.log(`🚨 NEW ALARM CONDITION: ${rule.rule_name}`);
                    await this.triggerAlarm(projectId, rule, { ...tag, device_name: rule.device_name }, value);

                } else if (!isAlarmCondition && (isCurrentlyTriggered || isCurrentlyAcknowledged)) {
                    // CONDITION CLEARED - Clear the alarm
                    console.log(`✅ ALARM CONDITION CLEARED: ${rule.rule_name}`);
                    await this.clearAlarm(projectId, rule, { ...tag, device_name: rule.device_name }, value);

                } else if (isAlarmCondition && isCurrentlyAcknowledged) {
                    // ACKNOWLEDGED ALARM STILL IN ALARM STATE - Keep acknowledged but update value
                    console.log(`⚠️ Acknowledged alarm still in alarm condition: ${rule.rule_name}`);
                    await pool.query(`
                        UPDATE alarm_states
                        SET trigger_value = $1, triggered_at = NOW()
                        WHERE rule_id = $2
                    `, [value, rule.id]);

                } else {
                    // NORMAL CONDITION OR ALREADY TRIGGERED - No action needed
                    console.log(`ℹ️ No alarm action needed for ${rule.rule_name}: condition=${isAlarmCondition}, triggered=${isCurrentlyTriggered}, acked=${isCurrentlyAcknowledged}`);
                }
            }

        } catch (error) {
            console.error('❌ Error checking alarms:', error);
        }
    }

    // 🔧 FIXED: Enhanced alarm condition evaluation
    evaluateAlarmCondition(rule, value) {
        const threshold = parseFloat(rule.threshold);
        const deadband = parseFloat(rule.deadband) || 0;

        switch (rule.condition_type?.toLowerCase()) {
            case 'high':
                return value > (threshold + deadband);
            case 'low':
                return value < (threshold - deadband);
            case 'high_high':
                return value > (threshold * 1.1 + deadband);
            case 'low_low':
                return value < (threshold * 0.9 - deadband);
            case 'change':
                // For change detection, compare against threshold with deadband
                return Math.abs(value - threshold) > deadband;
            default:
                console.log(`⚠️ Unknown condition type: ${rule.condition_type}`);
                return false;
        }
    }

    // 🔧 CRITICAL FIX: Trigger alarm with proper state management and WebSocket calls
    async triggerAlarm(projectId, rule, tag, value) {
        try {
            console.log(`🚨 TRIGGERING ALARM: ${rule.rule_name} - ${tag.tag_name} = ${value}`);

            // 🔧 CRITICAL FIX: Create alarm state first (this is what shows in Active Alarms)
            const stateQuery = `
                INSERT INTO alarm_states (
                    rule_id, tag_id, device_id, project_id,
                    state, trigger_value, triggered_at
                ) VALUES ($1, $2, $3, $4, 'triggered', $5, NOW())
                    ON CONFLICT (rule_id) 
                DO UPDATE SET
                    state = 'triggered',
                                           trigger_value = $5,
                                           triggered_at = NOW(),
                                           acknowledged_at = NULL,
                                           acknowledged_by = NULL,
                                           ack_message = NULL
                                           RETURNING *
            `;

            const stateResult = await pool.query(stateQuery, [
                rule.id, rule.tag_id, rule.device_id, projectId, value
            ]);

            console.log('✅ Alarm state created:', stateResult.rows[0]);

            // 🔧 CRITICAL FIX: Create alarm event (this goes in history)
            const eventQuery = `
                INSERT INTO alarm_events (
                    rule_id, tag_id, device_id, project_id, user_id,
                    event_type, trigger_value, threshold_value, condition_type,
                    severity, message, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
                    RETURNING *
            `;

            const eventValues = [
                rule.id, rule.tag_id, rule.device_id, projectId, rule.user_id,
                'triggered', value, rule.threshold, rule.condition_type,
                rule.severity, rule.message || `${rule.rule_name}: ${value} ${rule.condition_type} ${rule.threshold}`
            ];

            const eventResult = await pool.query(eventQuery, eventValues);
            console.log('✅ Alarm event created:', eventResult.rows[0]);

            // 🔧 CRITICAL FIX: Enhanced WebSocket notification for alarms
            if (this.wsManager) {
                // 🔧 FIXED: Use correct method signature
                this.wsManager.broadcastAlarmEvent(projectId, 'triggered', {
                    rule_id: rule.id,
                    id: rule.id, // Add id for compatibility
                    rule_name: rule.rule_name,
                    tag_id: tag.tag_id,
                    tag_name: tag.tag_name,
                    device_id: tag.device_id,
                    device_name: tag.device_name || 'Unknown Device',
                    trigger_value: value,
                    value: value, // Add value for compatibility
                    threshold: rule.threshold,
                    condition_type: rule.condition_type,
                    severity: rule.severity || 'warning',
                    message: rule.message || `${rule.rule_name}: ${value} ${rule.condition_type} ${rule.threshold}`,
                    triggered_at: new Date().toISOString(),
                    state: 'triggered',
                    current_state: 'triggered',
                    acknowledged_at: null,
                    acknowledged_by: null
                });

                // 🔧 FIXED: Also broadcast updated alarm summary (this now works properly)
                await this.wsManager.broadcastAlarmSummary(projectId);
            }

            console.log(`🚨 ALARM TRIGGERED: ${rule.rule_name} - ${tag.tag_name} = ${value} (${rule.condition_type} ${rule.threshold})`);

        } catch (error) {
            console.error('❌ Error triggering alarm:', error);
            console.error('❌ Error details:', error.message);
        }
    }

    // 🔧 CRITICAL FIX: Clear alarm with proper state management and WebSocket calls
    async clearAlarm(projectId, rule, tag, value) {
        try {
            console.log(`✅ CLEARING ALARM: ${rule.rule_name} - ${tag.tag_name} = ${value}`);

            // 🔧 CRITICAL FIX: Remove from alarm_states (clears from Active Alarms)
            const deleteStateQuery = `DELETE FROM alarm_states WHERE rule_id = $1 RETURNING *`;
            const deleteResult = await pool.query(deleteStateQuery, [rule.id]);

            if (deleteResult.rows.length > 0) {
                console.log('✅ Alarm state cleared:', deleteResult.rows[0]);
            }

            // Create cleared event for history
            const eventQuery = `
                INSERT INTO alarm_events (
                    rule_id, tag_id, device_id, project_id, user_id,
                    event_type, trigger_value, threshold_value, condition_type,
                    severity, message, cleared_at, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
                    RETURNING *
            `;

            const eventValues = [
                rule.id, rule.tag_id, rule.device_id, projectId, rule.user_id,
                'cleared', value, rule.threshold, rule.condition_type,
                rule.severity, `${rule.rule_name}: CLEARED - ${value} (condition no longer met)`
            ];

            const eventResult = await pool.query(eventQuery, eventValues);
            console.log('✅ Alarm cleared event created:', eventResult.rows[0]);

            // 🔧 CRITICAL FIX: Enhanced WebSocket notification
            if (this.wsManager) {
                // 🔧 FIXED: Use correct method signature
                this.wsManager.broadcastAlarmEvent(projectId, 'cleared', {
                    rule_id: rule.id,
                    id: rule.id, // Add id for compatibility
                    rule_name: rule.rule_name,
                    tag_id: tag.tag_id,
                    tag_name: tag.tag_name,
                    device_id: tag.device_id,
                    device_name: tag.device_name || 'Unknown Device',
                    trigger_value: value,
                    value: value, // Add value for compatibility
                    threshold: rule.threshold,
                    cleared_at: new Date().toISOString(),
                    state: 'cleared',
                    current_state: 'cleared'
                });

                // 🔧 FIXED: Also broadcast updated alarm summary (this now works properly)
                await this.wsManager.broadcastAlarmSummary(projectId);
            }

            console.log(`✅ ALARM CLEARED: ${rule.rule_name} - ${tag.tag_name} = ${value}`);

        } catch (error) {
            console.error('❌ Error clearing alarm:', error);
        }
    }

    // ==================== UTILITY METHODS ====================

    applyScaling(tag, rawValue) {
        if (tag.raw_min !== null && tag.raw_max !== null &&
            tag.scaled_min !== null && tag.scaled_max !== null) {

            const scaledValue = (rawValue - tag.raw_min) / (tag.raw_max - tag.raw_min) *
                (tag.scaled_max - tag.scaled_min) + tag.scaled_min;

            return Math.round(scaledValue * 100) / 100;
        }
        return rawValue;
    }

    shouldStoreValue(tag, newValue) {
        if (!tag.deadband || tag.deadband <= 0) {
            return true;
        }

        const lastValue = this.tagLastValues.get(tag.tag_id);
        if (lastValue === undefined) {
            return true;
        }

        const difference = Math.abs(newValue - lastValue);
        return difference >= tag.deadband;
    }

    // ==================== STOP DEVICE COLLECTOR ====================

    async stopDeviceCollector(deviceId) {
        const collectorKey = `${deviceId}`;
        const collector = this.deviceCollectors.get(collectorKey);

        if (!collector) return;

        try {
            switch (collector.type) {
                case 'simulation':
                    // Use SimulationService to stop
                    console.log(`🛑 Stopping simulation via SimulationService for device ${deviceId}`);
                    const stopResult = await SimulationService.stopSimulation(deviceId);
                    console.log(`🛑 Stop result:`, stopResult);
                    break;
                case 'modbus':
                    if (collector.interval) {
                        clearInterval(collector.interval);
                    }
                    await ModbusService.disconnect(deviceId);
                    break;
                case 'mqtt':
                    if (collector.interval) {
                        clearInterval(collector.interval);
                    }
                    await MqttService.disconnect(deviceId);
                    break;
            }

            // Send device stopped status via WebSocket
            if (this.wsManager && collector.device_id) {
                const deviceQuery = await pool.query(
                    'SELECT project_id FROM devices WHERE device_id = $1',
                    [collector.device_id]
                );

                if (deviceQuery.rows.length > 0) {
                    this.wsManager.broadcastToProject(deviceQuery.rows[0].project_id, {
                        type: 'device_status',
                        data: {
                            device_id: collector.device_id,
                            device_name: collector.device_name,
                            status: 'stopped',
                            timestamp: new Date().toISOString()
                        }
                    });
                }
            }

            console.log(`🛑 Stopped collector for device ${collector.device_name}`);

        } catch (error) {
            console.error(`❌ Error stopping collector for device ${deviceId}:`, error);
        }

        this.deviceCollectors.delete(collectorKey);
    }

    // ==================== 🧪 TESTING AND DEBUG METHODS ====================

    // Add this method to test alarm creation manually
    async testAlarmCreation(projectId, ruleId, testValue) {
        try {
            console.log(`🧪 TESTING ALARM CREATION: Rule ${ruleId}, Value ${testValue}`);

            // Get the rule and associated tag
            const ruleQuery = `
                SELECT r.*, t.tag_name, d.device_name
                FROM alarm_rules r
                JOIN tags t ON r.tag_id = t.tag_id
                JOIN devices d ON r.device_id = d.device_id
                WHERE r.id = $1 AND r.project_id = $2
            `;

            const ruleResult = await pool.query(ruleQuery, [ruleId, projectId]);

            if (ruleResult.rows.length === 0) {
                throw new Error(`Alarm rule ${ruleId} not found for project ${projectId}`);
            }

            const rule = ruleResult.rows[0];
            const tag = { tag_id: rule.tag_id, tag_name: rule.tag_name, device_name: rule.device_name };

            // Force trigger the alarm
            await this.triggerAlarm(projectId, rule, tag, testValue);

            return {
                success: true,
                message: `Test alarm created for rule ${rule.rule_name}`,
                rule_name: rule.rule_name,
                test_value: testValue
            };

        } catch (error) {
            console.error('❌ Test alarm creation failed:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    // Add this method to debug alarm states
    async debugAlarmStates(projectId) {
        try {
            const query = `
                SELECT 
                    s.*,
                    r.rule_name,
                    t.tag_name,
                    d.device_name
                FROM alarm_states s
                JOIN alarm_rules r ON s.rule_id = r.id
                JOIN tags t ON s.tag_id = t.tag_id
                JOIN devices d ON s.device_id = d.device_id
                WHERE s.project_id = $1
                ORDER BY s.triggered_at DESC
            `;

            const result = await pool.query(query, [projectId]);

            console.log(`🔍 DEBUG: Found ${result.rows.length} alarm states for project ${projectId}`);
            result.rows.forEach(state => {
                console.log(`   - ${state.rule_name}: ${state.state} (value: ${state.trigger_value})`);
            });

            return result.rows;

        } catch (error) {
            console.error('❌ Error debugging alarm states:', error);
            return [];
        }
    }

    // ==================== STATUS AND STATISTICS ====================

    getStatistics() {
        const uptime = this.statistics.startTime ?
            Date.now() - this.statistics.startTime.getTime() : 0;

        return {
            running: this.isRunning,
            uptime_ms: uptime,
            uptime_formatted: this.formatUptime(uptime),
            total_readings: this.statistics.totalReadings,
            successful_readings: this.statistics.successfulReadings,
            failed_readings: this.statistics.failedReadings,
            success_rate: this.statistics.totalReadings > 0 ?
                (this.statistics.successfulReadings / this.statistics.totalReadings * 100).toFixed(2) + '%' : '0%',
            active_devices: this.statistics.activeDevices,
            active_tags: this.statistics.activeTags,
            last_scan: this.statistics.lastScan,
            start_time: this.statistics.startTime
        };
    }

    formatUptime(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }

    getDeviceStatus() {
        const devices = [];

        for (const [deviceId, collector] of this.deviceCollectors) {
            devices.push({
                device_id: deviceId,
                device_name: collector.device_name,
                type: collector.type,
                status: 'running',
                started_at: collector.started_at,
                last_activity: collector.last_activity,
                tag_count: collector.tags.length
            });
        }

        return devices;
    }

    getStatus() {
        return {
            engine: this.getStatistics(),
            devices: this.getDeviceStatus(),
            available: true,
            version: '1.0.0-alarm-integrated-fixed',
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = DataCollectionEngine;