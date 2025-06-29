// services/protocols/MqttService.js - Complete MQTT Implementation
const mqtt = require('mqtt');

class MqttService {
    constructor() {
        this.connections = new Map();
        this.subscriptions = new Map();
    }

    // Test MQTT broker connection
    async testConnection(brokerUrl, port, options = {}) {
        const startTime = Date.now();
        const clientId = `scada_test_${Math.random().toString(16).substr(2, 8)}`;

        const connectionString = `mqtt://${brokerUrl}:${port}`;

        try {
            const client = mqtt.connect(connectionString, {
                clientId,
                connectTimeout: 5000,
                reconnectPeriod: 0,
                ...options
            });

            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    client.end();
                    reject(new Error('Connection timeout'));
                }, 5000);

                client.on('connect', () => {
                    clearTimeout(timeout);
                    const responseTime = Date.now() - startTime;
                    client.end();

                    resolve({
                        connected: true,
                        message: `Successfully connected to MQTT broker at ${brokerUrl}:${port}`,
                        responseTime,
                        protocol: 'MQTT',
                        clientId
                    });
                });

                client.on('error', (error) => {
                    clearTimeout(timeout);
                    client.end();

                    let errorMessage = error.message;
                    if (error.code === 'ECONNREFUSED') {
                        errorMessage = `Connection refused. MQTT broker may be offline or port ${port} is not open.`;
                    } else if (error.code === 'ENOTFOUND') {
                        errorMessage = `Host not found. Please check the broker address ${brokerUrl}.`;
                    } else if (error.code === 'ETIMEDOUT') {
                        errorMessage = `Connection timeout. Broker at ${brokerUrl}:${port} is not responding.`;
                    }

                    reject(new Error(errorMessage));
                });
            });

        } catch (error) {
            const responseTime = Date.now() - startTime;
            return {
                connected: false,
                message: error.message,
                responseTime,
                protocol: 'MQTT',
                error_code: error.code || 'UNKNOWN'
            };
        }
    }

    // Connect for data collection
    async connect(deviceConfig) {
        const { device_id, ip_address, port, device_name } = deviceConfig;
        const connectionKey = `${device_id}`;

        if (this.connections.has(connectionKey)) {
            return this.connections.get(connectionKey);
        }

        const clientId = `scada_device_${device_id}_${Math.random().toString(16).substr(2, 8)}`;
        const connectionString = `mqtt://${ip_address}:${port}`;

        try {
            const client = mqtt.connect(connectionString, {
                clientId,
                connectTimeout: 10000,
                reconnectPeriod: 5000,
                keepalive: 60,
                clean: true
            });

            const connection = {
                client,
                device_id,
                device_name,
                connected_at: new Date(),
                last_activity: new Date(),
                subscriptions: new Set(),
                messageHandlers: new Map()
            };

            client.on('connect', () => {
                console.log(`✅ MQTT connected: ${device_name} (${clientId})`);
                connection.connected_at = new Date();
                connection.last_activity = new Date();
            });

            client.on('message', (topic, message, packet) => {
                console.log(`📨 MQTT message from ${device_name}: ${topic} = ${message.toString()}`);
                connection.last_activity = new Date();

                const handlers = connection.messageHandlers.get(topic) || [];
                handlers.forEach(handler => {
                    try {
                        handler(topic, message, packet);
                    } catch (error) {
                        console.error(`Error in MQTT message handler for ${topic}:`, error);
                    }
                });
            });

            client.on('error', (error) => {
                console.error(`❌ MQTT error for device ${device_name}:`, error);
            });

            this.connections.set(connectionKey, connection);
            return connection;

        } catch (error) {
            throw new Error(`Failed to establish MQTT connection: ${error.message}`);
        }
    }

    // Subscribe to a topic
    async subscribe(deviceId, topic, qos = 0, messageHandler = null) {
        const connectionKey = `${deviceId}`;
        const connection = this.connections.get(connectionKey);

        if (!connection) {
            throw new Error(`No active MQTT connection for device ${deviceId}`);
        }

        return new Promise((resolve, reject) => {
            connection.client.subscribe(topic, { qos }, (error, granted) => {
                if (error) {
                    reject(new Error(`Failed to subscribe to topic ${topic}: ${error.message}`));
                    return;
                }

                connection.subscriptions.add(topic);

                if (messageHandler) {
                    if (!connection.messageHandlers.has(topic)) {
                        connection.messageHandlers.set(topic, []);
                    }
                    connection.messageHandlers.get(topic).push(messageHandler);
                }

                console.log(`✅ MQTT subscribed to ${topic} with QoS ${qos}`);
                resolve({
                    success: true,
                    topic,
                    qos: granted[0].qos,
                    timestamp: new Date()
                });
            });
        });
    }

    // Disconnect
    async disconnect(deviceId) {
        const connectionKey = `${deviceId}`;
        const connection = this.connections.get(connectionKey);

        if (connection) {
            try {
                for (const topic of connection.subscriptions) {
                    connection.client.unsubscribe(topic);
                }
                connection.client.end();
                console.log(`📴 MQTT disconnected: ${connection.device_name}`);
            } catch (error) {
                console.error(`Error closing MQTT connection for device ${deviceId}:`, error);
            }
            this.connections.delete(connectionKey);
        }
    }

    // Get connection status
    getConnectionStatus(deviceId) {
        const connectionKey = `${deviceId}`;
        const connection = this.connections.get(connectionKey);

        if (!connection) {
            return { connected: false, status: 'disconnected' };
        }

        return {
            connected: connection.client.connected,
            status: connection.client.connected ? 'connected' : 'disconnected',
            connected_at: connection.connected_at,
            last_activity: connection.last_activity,
            subscriptions: Array.from(connection.subscriptions),
            client_id: connection.client.options.clientId
        };
    }

    // Subscribe to common SCADA topics
    async subscribeToScadaTopics(deviceId, deviceName, tagNames = []) {
        const commonTopics = [
            `scada/${deviceName}/status`,
            `scada/${deviceName}/alarms`,
            `scada/${deviceName}/data/+`,
            ...tagNames.map(tag => `scada/${deviceName}/data/${tag}`)
        ];

        const subscriptions = [];
        for (const topic of commonTopics) {
            try {
                const result = await this.subscribe(deviceId, topic, 1);
                subscriptions.push(result);
            } catch (error) {
                console.error(`Failed to subscribe to ${topic}:`, error);
            }
        }

        return subscriptions;
    }

    // Cleanup all connections
    disconnectAll() {
        for (const [deviceId] of this.connections) {
            this.disconnect(deviceId);
        }
    }
}

module.exports = new MqttService();