// websocketManager.js - COMPLETE FIXED VERSION WITH WORKING ALARM SYSTEM
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const EventEmitter = require('events');

class WebSocketManager extends EventEmitter {
    constructor(server) {
        super();
        this.wss = null;
        this.clients = new Map();
        this.projectSubscriptions = new Map();
        this.heartbeatInterval = null;
        this.isInitialized = false;

        console.log('🔧 WebSocketManager: Initializing...');

        // ✅ FIXED: Initialize immediately with server
        if (server) {
            this.initialize(server);
        }
    }

    // Initialize WebSocket server
    initialize(server) {
        try {
            console.log('🔧 WebSocketManager: Creating WebSocket server...');

            // Create WebSocket server
            this.wss = new WebSocket.Server({
                server: server,
                path: '/ws',
                verifyClient: this.verifyClient.bind(this)
            });

            // Set up event handlers
            this.wss.on('connection', this.handleConnection.bind(this));
            this.wss.on('error', this.handleServerError.bind(this));

            // Start heartbeat
            this.startHeartbeat();

            this.isInitialized = true;
            console.log('✅ WebSocketManager: Successfully initialized');
            console.log('💓 WebSocket: Heartbeat started');

            return true;
        } catch (error) {
            console.error('❌ WebSocketManager: Initialization failed:', error);
            return false;
        }
    }

    // Verify client connection with JWT
    verifyClient(info) {
        try {
            const url = new URL(info.req.url, `http://${info.req.headers.host}`);
            const token = url.searchParams.get('token');

            if (!token) {
                console.log('❌ WebSocket: No token provided');
                return false;
            }

            // Verify JWT token
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

            // Store user info for later use
            info.req.user = decoded;

            console.log('✅ WebSocket: Client verified:', decoded.username);
            return true;

        } catch (error) {
            console.error('❌ WebSocket: Token verification failed:', error.message);
            return false;
        }
    }

    // Handle new WebSocket connection
    handleConnection(ws, req) {
        try {
            const clientId = this.generateClientId();
            const user = req.user;

            console.log(`🔌 WebSocket: New client connected - ${user.username} (${clientId})`);

            // Store client info
            const clientInfo = {
                id: clientId,
                ws: ws,
                user: user,
                subscriptions: new Set(),
                isAlive: true,
                connectedAt: new Date().toISOString()
            };

            this.clients.set(clientId, clientInfo);

            // Set up client event handlers
            ws.on('message', (message) => this.handleMessage(clientId, message));
            ws.on('close', () => this.handleDisconnection(clientId));
            ws.on('error', (error) => this.handleClientError(clientId, error));
            ws.on('pong', () => this.handlePong(clientId));

            // Send connection confirmation
            this.sendToClient(clientId, {
                type: 'connected',
                clientId: clientId,
                timestamp: new Date().toISOString()
            });

            console.log(`✅ WebSocket: Client ${clientId} setup complete`);

        } catch (error) {
            console.error('❌ WebSocket: Connection setup failed:', error);
            ws.close(1011, 'Setup failed');
        }
    }

    // Handle incoming messages
    handleMessage(clientId, message) {
        try {
            const client = this.clients.get(clientId);
            if (!client) return;

            const data = JSON.parse(message.toString());
            console.log(`📨 WebSocket: Message from ${clientId}:`, data.type);

            switch (data.type) {
                case 'ping':
                    this.sendToClient(clientId, { type: 'pong', timestamp: Date.now() });
                    break;

                case 'subscribe_project':
                    this.subscribeClientToProject(clientId, data.projectId);
                    break;

                case 'unsubscribe_project':
                    this.unsubscribeClientFromProject(clientId, data.projectId);
                    break;

                case 'acknowledge_alarm':
                    this.handleAlarmAcknowledgment(clientId, data);
                    break;

                case 'get_active_alarms':
                    this.handleGetActiveAlarms(clientId, data.projectId);
                    break;

                case 'get_diagram_realtime':
                    this.handleGetDiagramRealtime(clientId, data.projectId);
                    break;

                default:
                    console.log(`⚠️ WebSocket: Unknown message type: ${data.type}`);
            }

        } catch (error) {
            console.error(`❌ WebSocket: Message handling error for ${clientId}:`, error);
        }
    }

    // Subscribe client to project updates
    subscribeClientToProject(clientId, projectId) {
        try {
            const client = this.clients.get(clientId);
            if (!client) return;

            // Add to client subscriptions
            client.subscriptions.add(projectId);

            // Add to project subscriptions map
            if (!this.projectSubscriptions.has(projectId)) {
                this.projectSubscriptions.set(projectId, new Set());
            }
            this.projectSubscriptions.get(projectId).add(clientId);

            console.log(`📡 WebSocket: Client ${clientId} subscribed to project ${projectId}`);

            // Send subscription confirmation
            this.sendToClient(clientId, {
                type: 'subscribed',
                projectId: projectId,
                timestamp: new Date().toISOString()
            });

            // Emit event for other systems to handle
            this.emit('client_subscribed', { clientId, projectId, user: client.user });

        } catch (error) {
            console.error(`❌ WebSocket: Subscription error:`, error);
        }
    }

    // Unsubscribe client from project
    unsubscribeClientFromProject(clientId, projectId) {
        try {
            const client = this.clients.get(clientId);
            if (!client) return;

            // Remove from client subscriptions
            client.subscriptions.delete(projectId);

            // Remove from project subscriptions map
            const projectClients = this.projectSubscriptions.get(projectId);
            if (projectClients) {
                projectClients.delete(clientId);
                if (projectClients.size === 0) {
                    this.projectSubscriptions.delete(projectId);
                }
            }

            console.log(`📡 WebSocket: Client ${clientId} unsubscribed from project ${projectId}`);

            // Send unsubscription confirmation
            this.sendToClient(clientId, {
                type: 'unsubscribed',
                projectId: projectId,
                timestamp: new Date().toISOString()
            });

            this.emit('client_unsubscribed', { clientId, projectId, user: client.user });

        } catch (error) {
            console.error(`❌ WebSocket: Unsubscription error:`, error);
        }
    }

    // Handle alarm acknowledgment
    handleAlarmAcknowledgment(clientId, data) {
        try {
            const client = this.clients.get(clientId);
            if (!client) return;

            console.log(`🚨 WebSocket: Alarm acknowledgment from ${clientId}:`, {
                projectId: data.projectId,
                ruleId: data.ruleId,
                message: data.message
            });

            // Emit event for alarm system to handle
            this.emit('alarm_acknowledge', {
                projectId: data.projectId,
                ruleId: data.ruleId,
                message: data.message || 'Acknowledged via WebSocket',
                acknowledgedBy: client.user.username,
                acknowledgedAt: new Date().toISOString()
            });

            // Send acknowledgment response
            this.sendToClient(clientId, {
                type: 'alarm_ack_response',
                success: true,
                ruleId: data.ruleId,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error(`❌ WebSocket: Alarm acknowledgment error:`, error);
            this.sendToClient(clientId, {
                type: 'alarm_ack_response',
                success: false,
                error: error.message,
                ruleId: data.ruleId
            });
        }
    }

    // Handle get active alarms request
    handleGetActiveAlarms(clientId, projectId) {
        try {
            console.log(`🚨 WebSocket: Active alarms requested by ${clientId} for project ${projectId}`);

            // Emit event for alarm system to handle
            this.emit('get_active_alarms', {
                clientId,
                projectId,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error(`❌ WebSocket: Get active alarms error:`, error);
        }
    }

    // Handle get diagram realtime data
    handleGetDiagramRealtime(clientId, projectId) {
        try {
            console.log(`📊 WebSocket: Diagram realtime data requested by ${clientId} for project ${projectId}`);

            // Emit event for data collection engine to handle
            this.emit('get_diagram_realtime', {
                clientId,
                projectId,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error(`❌ WebSocket: Get diagram realtime error:`, error);
        }
    }

    // Handle client disconnection
    handleDisconnection(clientId) {
        try {
            const client = this.clients.get(clientId);
            if (!client) return;

            console.log(`📴 WebSocket: Client ${clientId} disconnected`);

            // Remove from all project subscriptions
            client.subscriptions.forEach(projectId => {
                const projectClients = this.projectSubscriptions.get(projectId);
                if (projectClients) {
                    projectClients.delete(clientId);
                    if (projectClients.size === 0) {
                        this.projectSubscriptions.delete(projectId);
                    }
                }
            });

            // Remove client
            this.clients.delete(clientId);

            this.emit('client_disconnected', { clientId, user: client.user });

        } catch (error) {
            console.error(`❌ WebSocket: Disconnection handling error:`, error);
        }
    }

    // Handle client errors
    handleClientError(clientId, error) {
        console.error(`❌ WebSocket: Client ${clientId} error:`, error.message);
    }

    // Handle server errors
    handleServerError(error) {
        console.error(`❌ WebSocket: Server error:`, error);
    }

    // Handle pong response
    handlePong(clientId) {
        const client = this.clients.get(clientId);
        if (client) {
            client.isAlive = true;
        }
    }

    // Send message to specific client
    sendToClient(clientId, message) {
        try {
            const client = this.clients.get(clientId);
            if (!client || client.ws.readyState !== WebSocket.OPEN) {
                return false;
            }

            client.ws.send(JSON.stringify(message));
            return true;

        } catch (error) {
            console.error(`❌ WebSocket: Send to client ${clientId} failed:`, error);
            return false;
        }
    }

    // Broadcast to all clients subscribed to a project
    broadcastToProject(projectId, message) {
        try {
            const projectClients = this.projectSubscriptions.get(projectId);
            if (!projectClients || projectClients.size === 0) {
                console.log(`📡 WebSocket: No clients subscribed to project ${projectId}`);
                return 0;
            }

            let sentCount = 0;
            projectClients.forEach(clientId => {
                if (this.sendToClient(clientId, { ...message, projectId })) {
                    sentCount++;
                }
            });

            console.log(`📡 WebSocket: Broadcast to project ${projectId} - ${sentCount}/${projectClients.size} clients`);
            return sentCount;

        } catch (error) {
            console.error(`❌ WebSocket: Broadcast to project ${projectId} failed:`, error);
            return 0;
        }
    }

    // Broadcast to all connected clients
    broadcastToAll(message) {
        try {
            let sentCount = 0;
            this.clients.forEach((client, clientId) => {
                if (this.sendToClient(clientId, message)) {
                    sentCount++;
                }
            });

            console.log(`📡 WebSocket: Broadcast to all - ${sentCount}/${this.clients.size} clients`);
            return sentCount;

        } catch (error) {
            console.error(`❌ WebSocket: Broadcast to all failed:`, error);
            return 0;
        }
    }

    // ⭐ CRITICAL FIX: Broadcast alarm events with correct signature
    broadcastAlarmEvent(projectId, eventType, alarmData) {
        try {
            console.log(`🚨 Broadcasting alarm event to project ${projectId}:`, eventType);

            const message = {
                type: eventType === 'triggered' ? 'alarm_triggered' :
                    eventType === 'cleared' ? 'alarm_cleared' :
                        eventType === 'acknowledged' ? 'alarm_acknowledged' : 'alarm_event',
                data: alarmData,
                projectId: projectId,
                timestamp: new Date().toISOString()
            };

            return this.broadcastToProject(projectId, message);

        } catch (error) {
            console.error(`❌ WebSocket: Broadcast alarm event failed:`, error);
            return 0;
        }
    }

    // ⭐ REQUIRED METHOD: Broadcast measurement data
    broadcastMeasurement(projectId, measurementData) {
        try {
            const message = {
                type: 'measurement',
                data: measurementData,
                projectId: projectId,
                timestamp: new Date().toISOString()
            };

            return this.broadcastToProject(projectId, message);

        } catch (error) {
            console.error(`❌ WebSocket: Broadcast measurement failed:`, error);
            return 0;
        }
    }

    // ⭐ REQUIRED METHOD: Broadcast device status
    broadcastDeviceStatus(projectId, deviceData) {
        try {
            const message = {
                type: 'device_status',
                data: deviceData,
                projectId: projectId,
                timestamp: new Date().toISOString()
            };

            return this.broadcastToProject(projectId, message);

        } catch (error) {
            console.error(`❌ WebSocket: Broadcast device status failed:`, error);
            return 0;
        }
    }

    // ⭐ CRITICAL FIX: Broadcast alarm summary (THIS WAS THE MAIN ISSUE!)
    async broadcastAlarmSummary(projectId) {
        try {
            console.log(`📊 Generating and broadcasting alarm summary for project ${projectId}...`);

            // 🔧 FIXED: Actually fetch alarm summary data from database
            const pool = require('../db');

            const summaryQuery = `
                SELECT 
                    COUNT(*) as total_active,
                    COUNT(CASE WHEN r.severity = 'critical' THEN 1 END) as critical,
                    COUNT(CASE WHEN r.severity = 'warning' THEN 1 END) as warning,
                    COUNT(CASE WHEN r.severity = 'info' THEN 1 END) as info,
                    COUNT(CASE WHEN s.acknowledged_at IS NULL THEN 1 END) as unacknowledged,
                    COUNT(CASE WHEN s.acknowledged_at IS NOT NULL THEN 1 END) as acknowledged
                FROM alarm_states s
                JOIN alarm_rules r ON s.rule_id = r.id
                WHERE s.project_id = $1 AND s.state = 'triggered'
            `;

            const summaryResult = await pool.query(summaryQuery, [projectId]);
            const summary = summaryResult.rows[0];

            // 🔧 FIXED: Create properly formatted summary data
            const summaryData = {
                total_active: parseInt(summary.total_active) || 0,
                critical: parseInt(summary.critical) || 0,
                warning: parseInt(summary.warning) || 0,
                info: parseInt(summary.info) || 0,
                unacknowledged: parseInt(summary.unacknowledged) || 0,
                acknowledged: parseInt(summary.acknowledged) || 0,
                has_active_alarms: parseInt(summary.total_active) > 0,
                has_unacknowledged: parseInt(summary.unacknowledged) > 0,
                timestamp: new Date().toISOString()
            };

            console.log(`📊 Generated alarm summary:`, summaryData);

            const message = {
                type: 'alarm_summary',
                data: summaryData,
                projectId: projectId,
                timestamp: new Date().toISOString()
            };

            return this.broadcastToProject(projectId, message);

        } catch (error) {
            console.error(`❌ WebSocket: Broadcast alarm summary failed:`, error);
            console.error(`❌ Error details:`, error.message);
            return 0;
        }
    }

    // ⭐ REQUIRED METHOD: Send active alarms to specific client
    sendActiveAlarmsToClient(clientId, projectId, alarms) {
        try {
            const message = {
                type: 'active_alarms',
                data: alarms || [],
                projectId: projectId,
                timestamp: new Date().toISOString()
            };

            return this.sendToClient(clientId, message);

        } catch (error) {
            console.error(`❌ WebSocket: Send active alarms failed:`, error);
            return false;
        }
    }

    // Start heartbeat to check client connections
    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            this.clients.forEach((client, clientId) => {
                if (!client.isAlive) {
                    console.log(`💔 WebSocket: Terminating dead client ${clientId}`);
                    client.ws.terminate();
                    this.handleDisconnection(clientId);
                    return;
                }

                client.isAlive = false;
                if (client.ws.readyState === WebSocket.OPEN) {
                    client.ws.ping();
                }
            });
        }, 30000); // 30 seconds

        console.log('💓 WebSocket: Heartbeat started');
    }

    // Stop heartbeat
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
            console.log('💔 WebSocket: Heartbeat stopped');
        }
    }

    // Generate unique client ID
    generateClientId() {
        return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // ⭐ REQUIRED METHOD: Check if healthy
    isHealthy() {
        return this.isInitialized && this.wss && this.wss.readyState !== WebSocket.CLOSED;
    }

    // Get connection statistics
    getStats() {
        const stats = {
            totalClients: this.clients.size,
            totalProjects: this.projectSubscriptions.size,
            isInitialized: this.isInitialized,
            clients: [],
            projects: []
        };

        // Add client details
        this.clients.forEach((client, clientId) => {
            stats.clients.push({
                id: clientId,
                username: client.user.username,
                subscriptions: Array.from(client.subscriptions),
                connectedAt: client.connectedAt,
                isAlive: client.isAlive
            });
        });

        // Add project subscription details
        this.projectSubscriptions.forEach((clients, projectId) => {
            stats.projects.push({
                projectId: projectId,
                subscriberCount: clients.size,
                subscribers: Array.from(clients)
            });
        });

        return stats;
    }

    // Shutdown WebSocket server
    shutdown() {
        try {
            console.log('🔌 WebSocket: Shutting down...');

            this.stopHeartbeat();

            // Close all client connections
            this.clients.forEach((client, clientId) => {
                client.ws.close(1001, 'Server shutdown');
            });

            // Close WebSocket server
            if (this.wss) {
                this.wss.close(() => {
                    console.log('✅ WebSocket: Server closed successfully');
                });
            }

            // Clear data structures
            this.clients.clear();
            this.projectSubscriptions.clear();
            this.isInitialized = false;

        } catch (error) {
            console.error('❌ WebSocket: Shutdown error:', error);
        }
    }

    // Check if WebSocket manager is ready
    isReady() {
        return this.isInitialized && this.wss && this.wss.readyState !== WebSocket.CLOSED;
    }
}

module.exports = WebSocketManager;