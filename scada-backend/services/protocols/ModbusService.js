// services/protocols/ModbusService.js - Real Modbus Implementation
const ModbusRTU = require('modbus-serial');

class ModbusService {
    constructor() {
        this.connections = new Map();
    }

    // Test Modbus TCP connection
    async testConnection(ip, port, slaveId, timeout = 5000) {
        const client = new ModbusRTU();
        const startTime = Date.now();

        try {
            client.setTimeout(timeout);
            await client.connectTCP(ip, { port: parseInt(port) });
            client.setID(parseInt(slaveId));
            await client.readHoldingRegisters(0, 1);

            const responseTime = Date.now() - startTime;
            client.close();

            return {
                connected: true,
                message: `Successfully connected to Modbus device at ${ip}:${port} (Slave ID: ${slaveId})`,
                responseTime,
                protocol: 'Modbus TCP'
            };

        } catch (error) {
            try {
                client.close();
            } catch (closeError) {
                // Ignore close errors
            }

            const responseTime = Date.now() - startTime;
            let errorMessage = error.message;

            if (error.message.includes('ECONNREFUSED')) {
                errorMessage = `Connection refused. Device may be offline or port ${port} is not open.`;
            } else if (error.message.includes('ETIMEDOUT')) {
                errorMessage = `Connection timeout. Device at ${ip}:${port} is not responding.`;
            } else if (error.message.includes('ENOTFOUND')) {
                errorMessage = `Host not found. Please check the IP address ${ip}.`;
            } else if (error.message.includes('Illegal Function')) {
                errorMessage = `Device connected but doesn't support the test function. Connection appears valid.`;
                return {
                    connected: true,
                    message: `Connected to ${ip}:${port} but device has limited function support`,
                    responseTime,
                    protocol: 'Modbus TCP',
                    warning: 'Limited function support detected'
                };
            }

            return {
                connected: false,
                message: errorMessage,
                responseTime,
                protocol: 'Modbus TCP',
                error_code: error.errno || 'UNKNOWN'
            };
        }
    }

    // Connect for data collection
    async connect(deviceConfig) {
        const { device_id, ip_address, port, slave_id } = deviceConfig;
        const connectionKey = `${device_id}`;

        if (this.connections.has(connectionKey)) {
            return this.connections.get(connectionKey);
        }

        const client = new ModbusRTU();

        try {
            await client.connectTCP(ip_address, { port: parseInt(port) });
            client.setID(parseInt(slave_id));

            const connection = {
                client,
                device_id,
                connected_at: new Date(),
                last_activity: new Date()
            };

            this.connections.set(connectionKey, connection);

            client.on('error', (error) => {
                console.error(`Modbus connection error for device ${device_id}:`, error);
                this.disconnect(device_id);
            });

            return connection;
        } catch (error) {
            throw new Error(`Failed to establish Modbus connection: ${error.message}`);
        }
    }

    // Read holding register
    async readHoldingRegister(deviceId, address, quantity = 1) {
        const connectionKey = `${deviceId}`;
        const connection = this.connections.get(connectionKey);

        if (!connection) {
            throw new Error(`No active connection for device ${deviceId}`);
        }

        try {
            const result = await connection.client.readHoldingRegisters(address, quantity);
            connection.last_activity = new Date();

            return {
                success: true,
                values: result.data,
                timestamp: new Date()
            };
        } catch (error) {
            throw new Error(`Failed to read holding register ${address}: ${error.message}`);
        }
    }

    // Disconnect
    async disconnect(deviceId) {
        const connectionKey = `${deviceId}`;
        const connection = this.connections.get(connectionKey);

        if (connection) {
            try {
                connection.client.close();
            } catch (error) {
                console.error(`Error closing Modbus connection for device ${deviceId}:`, error);
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
            connected: true,
            status: 'connected',
            connected_at: connection.connected_at,
            last_activity: connection.last_activity
        };
    }

    // Cleanup all connections
    disconnectAll() {
        for (const [deviceId] of this.connections) {
            this.disconnect(deviceId);
        }
    }
}

module.exports = new ModbusService();