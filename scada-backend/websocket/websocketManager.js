// websocket/websocketManager.js - Enhanced with Alarm Support
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const pool = require('../db');

class WebSocketManager {
    constructor(server) {
        // 🚀 FIXED: Better error handling and validation
        if (!server) {
            console.error('❌ WebSocket: No HTTP server provided to WebSocketManager');
            throw new Error('HTTP server is required for WebSocket initialization');
        }

        console.log('🌐 Initializing WebSocket server...');

        try {
            this.wss = new WebSocket.Server({
                server, // Make sure this is the HTTP server instance
                verifyClient: this.verifyClient.bind(this)
            });

            console.log('✅ WebSocket server created successfully');
        } catch (error) {
            console.error('❌ Failed to create WebSocket server:', error);

            // 🚀 FALLBACK: Create standalone WebSocket server
            console.log('🔄 Attempting fallback WebSocket server on port 4001...');
            try {
                this.wss = new WebSocket.Server({
                    port: 4001,
                    verifyClient: this.verifyClient.bind(this)
                });
                console.log('✅ Fallback WebSocket server created on port 4001');
                this.fallbackPort = 4001;
            } catch (fallbackError) {
                console.error('❌ Fallback WebSocket server also failed:', fallbackError);
                throw fallbackError;
            }
        }

        this.clients = new Map();
        this.projectSubscriptions = new Map();

        this.wss.on('connection', this.handleConnection.bind(this));
        console.log('🌐 WebSocket server initialized and ready');
    }

    // Verify client authentication
    verifyClient(info) {
        try {
            const url = new URL(info.req.url, 'ws://localhost');
            const token = url.searchParams.get('token');

            if (!token) {
                console.log('❌ WebSocket: No token provided');
                return false;
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
            info.req.user = decoded;
            console.log('✅ WebSocket: Token verified for user', decoded.id);
            return true;
        } catch (error) {
            console.log('❌ WebSocket: Invalid token', error.message);
            return false;
        }
    }

    // Handle new WebSocket connection
    handleConnection(ws, req) {
        const user = req.user;
        const clientId = this.generateClientId();

        this.clients.set(clientId, {
            ws,
            user,
            subscriptions: new Set(),
            connected_at: new Date(),
            last_ping: new Date()
        });

        console.log(`🔌 WebSocket client connected: ${user.username} (${clientId})`);

        this.sendToClient(clientId, {
            type: 'connected',
            message: 'Real-time SCADA data connection established',
            server_time: new Date().toISOString(),
            client_id: clientId
        });

        ws.on('message', (data) => {
            this.handleMessage(clientId, data);
        });

        ws.on('close', () => {
            this.handleDisconnection(clientId);
        });

        ws.on('error', (error) => {
            console.error(`❌ WebSocket error for client ${clientId}:`, error);
        });

        ws.on('pong', () => {
            const client = this.clients.get(clientId);
            if (client) {
                client.last_ping = new Date();
            }
        });
    }

    // Handle incoming messages from clients
    handleMessage(clientId, data) {
        try {
            const message = JSON.parse(data);
            const client = this.clients.get(clientId);

            if (!client) return;

            console.log(`📨 WebSocket message from ${clientId}:`, message.type);

            switch (message.type) {
                case 'ping':
                    this.sendToClient(clientId, { type: 'pong', timestamp: new Date().toISOString() });
                    break;

                case 'subscribe_project':
                    this.subscribeToProject(clientId, message.projectId);
                    break;

                case 'unsubscribe_project':
                    this.unsubscribeFromProject(clientId, message.projectId);
                    break;

                case 'get_current_data':
                    this.sendCurrentData(clientId, message.projectId);
                    break;

                // NEW: Alarm-specific message types
                case 'get_active_alarms':
                    this.sendActiveAlarms(clientId, message.projectId);
                    break;

                case 'acknowledge_alarm':
                    this.handleAlarmAck(clientId, message.projectId, message.ruleId, message.message);
                    break;

                default:
                    console.log(`⚠️ Unknown WebSocket message type: ${message.type}`);
            }
        } catch (error) {
            console.error('Error handling WebSocket message:', error);
            this.sendToClient(clientId, {
                type: 'error',
                message: 'Invalid message format'
            });
        }
    }

    // Subscribe client to project updates
    async subscribeToProject(clientId, projectId) {
        const client = this.clients.get(clientId);
        if (!client) return;

        try {
            // 🚀 CRITICAL FIX: Ensure projectId is an integer
            const normalizedProjectId = parseInt(projectId);

            console.log(`🐛 DEBUG: Subscribe - Raw projectId: ${projectId} (${typeof projectId}), Normalized: ${normalizedProjectId} (${typeof normalizedProjectId})`);

            const projectQuery = await pool.query(
                'SELECT * FROM projects WHERE id = $1 AND user_id = $2',
                [normalizedProjectId, client.user.id]
            );

            if (projectQuery.rows.length === 0) {
                this.sendToClient(clientId, {
                    type: 'error',
                    message: 'Access denied to project'
                });
                return;
            }

            client.subscriptions.add(normalizedProjectId);  // Store as integer

            if (!this.projectSubscriptions.has(normalizedProjectId)) {
                this.projectSubscriptions.set(normalizedProjectId, new Set());
            }
            this.projectSubscriptions.get(normalizedProjectId).add(clientId);

            console.log(`📡 Client ${clientId} subscribed to project ${normalizedProjectId} (integer)`);
            console.log(`🐛 DEBUG: Current projectSubscriptions keys:`, Array.from(this.projectSubscriptions.keys()));

            this.sendToClient(clientId, {
                type: 'subscribed',
                projectId: normalizedProjectId,
                message: `Subscribed to real-time updates for project ${normalizedProjectId}`
            });

            this.sendProjectStatus(clientId, normalizedProjectId);
            this.sendActiveAlarms(clientId, normalizedProjectId);

        } catch (error) {
            console.error('Error subscribing to project:', error);
            this.sendToClient(clientId, {
                type: 'error',
                message: 'Failed to subscribe to project'
            });
        }
    }


    // Send current project status
    async sendProjectStatus(clientId, projectId) {
        try {
            const devicesQuery = await pool.query(
                'SELECT * FROM devices WHERE project_id = $1',
                [projectId]
            );

            const measurementsQuery = await pool.query(`
                SELECT m.*, t.tag_name, t.tag_type, d.device_name
                FROM measurements m
                         JOIN tags t ON m.tag_id = t.tag_id
                         JOIN devices d ON t.device_id = d.device_id
                WHERE d.project_id = $1
                  AND m.timestamp > NOW() - INTERVAL '1 hour'
                ORDER BY m.timestamp DESC
                    LIMIT 100
            `, [projectId]);

            this.sendToClient(clientId, {
                type: 'project_status',
                projectId,
                data: {
                    devices: devicesQuery.rows,
                    recent_measurements: measurementsQuery.rows,
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error) {
            console.error('Error sending project status:', error);
        }
    }

    // Send current data for a project
    async sendCurrentData(clientId, projectId) {
        try {
            const query = `
                SELECT DISTINCT ON (t.tag_id)
                    m.*, t.tag_name, t.tag_type, d.device_name, d.device_id
                FROM measurements m
                    JOIN tags t ON m.tag_id = t.tag_id
                    JOIN devices d ON t.device_id = d.device_id
                WHERE d.project_id = $1
                ORDER BY t.tag_id, m.timestamp DESC
            `;

            const result = await pool.query(query, [projectId]);

            this.sendToClient(clientId, {
                type: 'current_data',
                projectId,
                data: result.rows,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error sending current data:', error);
        }
    }

    // NEW: Send active alarms for a project
    async sendActiveAlarms(clientId, projectId) {
        try {
            const query = `
                SELECT 
                    s.*,
                    r.rule_name,
                    r.severity,
                    r.threshold,
                    r.condition_type,
                    r.message as rule_message,
                    t.tag_name,
                    t.engineering_unit,
                    d.device_name,
                    d.device_type,
                    u_ack.username as acknowledged_by_username
                FROM alarm_states s
                JOIN alarm_rules r ON s.rule_id = r.id
                JOIN tags t ON s.tag_id = t.tag_id
                JOIN devices d ON s.device_id = d.device_id
                LEFT JOIN users u_ack ON s.acknowledged_by = u_ack.id
                WHERE s.project_id = $1
                ORDER BY s.triggered_at DESC
            `;

            const result = await pool.query(query, [projectId]);

            this.sendToClient(clientId, {
                type: 'active_alarms',
                projectId,
                data: result.rows,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error sending active alarms:', error);
        }
    }

    // NEW: Handle alarm acknowledgment via WebSocket
    async handleAlarmAck(clientId, projectId, ruleId, ackMessage) {
        const client = this.clients.get(clientId);
        if (!client) return;

        try {
            // Import alarm controller here to avoid circular dependency
            const alarmController = require('../controllers/alarmController');

            // Create a mock request/response for the controller
            const mockReq = {
                params: { projectId, ruleId },
                body: { message: ackMessage },
                user: client.user
            };

            const mockRes = {
                json: (data) => {
                    this.sendToClient(clientId, {
                        type: 'alarm_ack_response',
                        success: data.success,
                        message: data.message,
                        ruleId,
                        projectId
                    });
                },
                status: (code) => ({
                    json: (data) => {
                        this.sendToClient(clientId, {
                            type: 'alarm_ack_error',
                            error: data.error,
                            details: data.details,
                            ruleId,
                            projectId
                        });
                    }
                })
            };

            await alarmController.acknowledgeAlarm(mockReq, mockRes);

        } catch (error) {
            console.error('Error handling alarm acknowledgment:', error);
            this.sendToClient(clientId, {
                type: 'error',
                message: 'Failed to acknowledge alarm'
            });
        }
    }

    // Handle client disconnection
    handleDisconnection(clientId) {
        const client = this.clients.get(clientId);
        if (!client) return;

        console.log(`📴 WebSocket client disconnected: ${clientId}`);

        for (const projectId of client.subscriptions) {
            if (this.projectSubscriptions.has(projectId)) {
                this.projectSubscriptions.get(projectId).delete(clientId);

                if (this.projectSubscriptions.get(projectId).size === 0) {
                    this.projectSubscriptions.delete(projectId);
                }
            }
        }

        this.clients.delete(clientId);
    }

    // Send message to specific client
    sendToClient(clientId, message) {
        const client = this.clients.get(clientId);
        if (!client || client.ws.readyState !== WebSocket.OPEN) {
            return false;
        }

        try {
            client.ws.send(JSON.stringify(message));
            return true;
        } catch (error) {
            console.error(`Error sending message to client ${clientId}:`, error);
            return false;
        }
    }

    // Broadcast to all clients subscribed to a project
    broadcastToProject(projectId, message) {
        // 🚀 CRITICAL FIX: Ensure projectId is an integer
        const normalizedProjectId = parseInt(projectId);

        console.log('🐛 DEBUG broadcastToProject:', {
            raw_projectId: projectId,
            raw_type: typeof projectId,
            normalized_projectId: normalizedProjectId,
            normalized_type: typeof normalizedProjectId,
            message_type: message.type,
            total_project_subscriptions: this.projectSubscriptions.size,
            subscription_keys: Array.from(this.projectSubscriptions.keys()),
            has_subscribers_for_project: this.projectSubscriptions.has(normalizedProjectId)
        });

        const subscribers = this.projectSubscriptions.get(normalizedProjectId);
        if (!subscribers) {
            console.log(`🐛 DEBUG: No subscribers for project ${normalizedProjectId} (integer)`);
            return 0;
        }

        console.log(`🐛 DEBUG: Found ${subscribers.size} subscribers for project ${normalizedProjectId}`);

        let sentCount = 0;
        for (const clientId of subscribers) {
            const sent = this.sendToClient(clientId, message);
            if (sent) {
                sentCount++;
                console.log(`🐛 DEBUG: Successfully sent to client ${clientId}`);
            } else {
                console.log(`🐛 DEBUG: Failed to send to client ${clientId}`);
            }
        }

        return sentCount;
    }

    // Broadcast new measurement data WITH ALARM EVALUATION
    async broadcastMeasurement(projectId, measurementData) {
        const message = {
            type: 'measurement',
            projectId,
            data: measurementData,
            timestamp: new Date().toISOString()
        };

        const sentCount = this.broadcastToProject(projectId, message);

        if (sentCount > 0) {
            console.log(`📤 Broadcasted measurement to ${sentCount} clients for project ${projectId}`);
        }

        // NEW: Trigger alarm evaluation for new measurements
        try {
            await this.evaluateAlarmsForMeasurement(measurementData);
        } catch (error) {
            console.error('❌ Error evaluating alarms for measurement:', error);
        }

        return sentCount;
    }

    // NEW: Evaluate alarms when new measurements arrive
    async evaluateAlarmsForMeasurement(measurementData) {
        try {
            // Import alarm controller here to avoid circular dependency
            const alarmController = require('../controllers/alarmController');

            // Format measurement data for alarm evaluation
            const measurements = {};

            if (Array.isArray(measurementData)) {
                // Multiple measurements
                measurementData.forEach(m => {
                    measurements[m.tag_id] = {
                        value: m.value,
                        timestamp: m.timestamp,
                        tag_id: m.tag_id
                    };
                });
            } else {
                // Single measurement
                measurements[measurementData.tag_id] = {
                    value: measurementData.value,
                    timestamp: measurementData.timestamp,
                    tag_id: measurementData.tag_id
                };
            }

            // Evaluate alarms
            const alarmEvents = await alarmController.evaluateAlarmConditions(measurements);

            if (alarmEvents && alarmEvents.length > 0) {
                console.log(`🚨 Generated ${alarmEvents.length} alarm events from measurement`);
            }

        } catch (error) {
            console.error('❌ Error in alarm evaluation:', error);
        }
    }

    // Broadcast device status updates
    broadcastDeviceStatus(projectId, deviceData) {
        const message = {
            type: 'device_status',
            projectId,
            data: {
                device_id: deviceData.device_id,
                device_name: deviceData.device_name,
                status: deviceData.status,
                running: deviceData.running,
                timestamp: new Date().toISOString()
            }
        };

        const sentCount = this.broadcastToProject(projectId, message);

        if (sentCount > 0) {
            console.log(`📤 Broadcasted device status to ${sentCount} clients for project ${projectId}`);
        }

        return sentCount;
    }

    // NEW: Broadcast alarm events
    broadcastAlarmEvent(projectId, eventType, alarmData) {
        const message = {
            type: `alarm_${eventType}`,
            projectId,
            data: alarmData,
            timestamp: new Date().toISOString()
        };

        const sentCount = this.broadcastToProject(projectId, message);

        if (sentCount > 0) {
            console.log(`🚨 Broadcasted alarm ${eventType} to ${sentCount} clients for project ${projectId}`);
        }

        return sentCount;
    }

    // NEW: Broadcast alarm summary updates
    async broadcastAlarmSummary(projectId) {
        try {
            const summaryQuery = `
                SELECT 
                    COUNT(*) as total_active,
                    COUNT(CASE WHEN acknowledged_at IS NULL THEN 1 END) as unacknowledged,
                    COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical,
                    COUNT(CASE WHEN severity = 'warning' THEN 1 END) as warning,
                    COUNT(CASE WHEN severity = 'info' THEN 1 END) as info,
                    MAX(triggered_at) as latest_trigger
                FROM alarm_states s
                JOIN alarm_rules r ON s.rule_id = r.id
                WHERE s.project_id = $1
            `;

            const result = await pool.query(summaryQuery, [projectId]);

            const message = {
                type: 'alarm_summary',
                projectId,
                data: result.rows[0],
                timestamp: new Date().toISOString()
            };

            return this.broadcastToProject(projectId, message);

        } catch (error) {
            console.error('Error broadcasting alarm summary:', error);
            return 0;
        }
    }

    // Generate unique client ID
    generateClientId() {
        return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Unsubscribe from project
    unsubscribeFromProject(clientId, projectId) {
        const client = this.clients.get(clientId);
        if (!client) return;

        // 🚀 CRITICAL FIX: Ensure projectId is an integer
        const normalizedProjectId = parseInt(projectId);

        client.subscriptions.delete(normalizedProjectId);

        if (this.projectSubscriptions.has(normalizedProjectId)) {
            this.projectSubscriptions.get(normalizedProjectId).delete(clientId);

            if (this.projectSubscriptions.get(normalizedProjectId).size === 0) {
                this.projectSubscriptions.delete(normalizedProjectId);
            }
        }

        this.sendToClient(clientId, {
            type: 'unsubscribed',
            projectId: normalizedProjectId,
            message: `Unsubscribed from project ${normalizedProjectId}`
        });
    }

    // Get WebSocket server statistics
    getStatistics() {
        return {
            total_connections: this.clients.size,
            active_projects: this.projectSubscriptions.size,
            fallback_port: this.fallbackPort || null,
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        };
    }

    // Check if WebSocket is healthy
    isHealthy() {
        try {
            return {
                healthy: true,
                connections: this.clients.size,
                projects: this.projectSubscriptions.size,
                websocket_state: this.wss.readyState === WebSocket.OPEN ? 'OPEN' : 'CLOSED',
                fallback_port: this.fallbackPort || null
            };
        } catch (error) {
            return {
                healthy: false,
                error: error.message
            };
        }
    }

    // Graceful shutdown
    async shutdown() {
        console.log('🛑 Shutting down WebSocket manager...');

        // Notify all clients
        for (const [clientId, client] of this.clients) {
            this.sendToClient(clientId, {
                type: 'server_shutdown',
                message: 'Server is shutting down'
            });
            client.ws.close();
        }

        // Close WebSocket server
        if (this.wss) {
            this.wss.close(() => {
                console.log('✅ WebSocket server closed');
            });
        }

        this.clients.clear();
        this.projectSubscriptions.clear();
    }
}

module.exports = WebSocketManager;