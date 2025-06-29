// src/hooks/useWebSocket.js - Enhanced with Complete Alarm Support
import { useEffect, useRef, useState, useCallback } from 'react';

export function useWebSocket(url) {
    const [isConnected, setIsConnected] = useState(false);
    const [lastMessage, setLastMessage] = useState(null);
    const [error, setError] = useState(null);
    const ws = useRef(null);
    const reconnectAttempts = useRef(0);
    const maxReconnectAttempts = 3;

    const connect = useCallback(() => {
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            if (!token) {
                setError('No authentication token found');
                console.log('❌ WebSocket: No token found');
                return;
            }

            const wsUrl = `${url}?token=${token}`;
            console.log('🔌 Connecting to WebSocket:', url);

            ws.current = new WebSocket(wsUrl);

            const connectionTimeout = setTimeout(() => {
                if (ws.current && ws.current.readyState === WebSocket.CONNECTING) {
                    console.log('⏰ WebSocket connection timeout');
                    ws.current.close();
                    setError('Connection timeout');
                }
            }, 5000);

            ws.current.onopen = () => {
                console.log('✅ WebSocket connected');
                clearTimeout(connectionTimeout);
                setIsConnected(true);
                setError(null);
                reconnectAttempts.current = 0;
            };

            ws.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('📨 WebSocket message:', data.type);
                    setLastMessage(data);
                } catch (err) {
                    console.error('Error parsing WebSocket message:', err);
                }
            };

            ws.current.onclose = (event) => {
                clearTimeout(connectionTimeout);
                console.log('📴 WebSocket disconnected:', event.code, event.reason);
                setIsConnected(false);

                if (event.code !== 1008 && reconnectAttempts.current < maxReconnectAttempts) {
                    reconnectAttempts.current++;
                    const delay = Math.pow(2, reconnectAttempts.current) * 1000;
                    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current})`);

                    setTimeout(() => {
                        if (reconnectAttempts.current <= maxReconnectAttempts) {
                            connect();
                        }
                    }, delay);
                } else {
                    if (event.code === 1008) {
                        setError('Authentication failed');
                        console.log('❌ WebSocket: Authentication failed');
                    } else {
                        setError('Connection failed');
                        console.log('❌ WebSocket: Max reconnection attempts reached');
                    }
                }
            };

            ws.current.onerror = (error) => {
                clearTimeout(connectionTimeout);
                console.error('❌ WebSocket error:', error);
            };

        } catch (err) {
            setError('Failed to create WebSocket connection');
            console.error('WebSocket creation error:', err);
        }
    }, [url]);

    const sendMessage = useCallback((message) => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify(message));
            console.log('📤 Sent WebSocket message:', message.type);
        } else {
            console.warn('WebSocket not connected, cannot send message');
        }
    }, []);

    const subscribe = useCallback((subscription) => {
        sendMessage({
            type: 'subscribe_project',
            projectId: subscription.projectId
        });
    }, [sendMessage]);

    const unsubscribe = useCallback((subscription) => {
        sendMessage({
            type: 'unsubscribe_project',
            projectId: subscription.projectId
        });
    }, [sendMessage]);

    // NEW: Alarm-specific methods
    const acknowledgeAlarm = useCallback((projectId, ruleId, message) => {
        sendMessage({
            type: 'acknowledge_alarm',
            projectId,
            ruleId,
            message
        });
    }, [sendMessage]);

    const getActiveAlarms = useCallback((projectId) => {
        sendMessage({
            type: 'get_active_alarms',
            projectId
        });
    }, [sendMessage]);

    useEffect(() => {
        connect();

        return () => {
            if (ws.current) {
                ws.current.close();
            }
        };
    }, [connect]);

    // Send ping every 30 seconds
    useEffect(() => {
        if (isConnected) {
            const pingInterval = setInterval(() => {
                sendMessage({ type: 'ping' });
            }, 30000);

            return () => clearInterval(pingInterval);
        }
    }, [isConnected, sendMessage]);

    return {
        isConnected,
        lastMessage,
        error,
        sendMessage,
        subscribe,
        unsubscribe,
        acknowledgeAlarm,
        getActiveAlarms
    };
}

// Global WebSocket connection
export function useGlobalWebSocket() {
    const wsUrl = process.env.NODE_ENV === 'production'
        ? 'wss://your-production-domain.com'
        : 'ws://localhost:4000';

    return useWebSocket(wsUrl);
}

// Enhanced real-time data hook with comprehensive alarm support
export function useRealTimeData(projectId) {
    const [measurements, setMeasurements] = useState({});
    const [deviceStatuses, setDeviceStatuses] = useState({});

    // ENHANCED: Comprehensive alarm state management
    const [activeAlarms, setActiveAlarms] = useState([]);
    const [alarmSummary, setAlarmSummary] = useState({
        total_active: 0,
        unacknowledged: 0,
        critical: 0,
        warning: 0,
        info: 0,
        latest_trigger: null
    });
    const [alarmEvents, setAlarmEvents] = useState([]);
    const [alarmRuleChanges, setAlarmRuleChanges] = useState(null);

    const {
        isConnected,
        lastMessage,
        error,
        subscribe,
        unsubscribe,
        acknowledgeAlarm: wsAcknowledgeAlarm,
        getActiveAlarms: wsGetActiveAlarms
    } = useGlobalWebSocket();

    useEffect(() => {
        if (isConnected && projectId) {
            console.log(`📡 Subscribing to project ${projectId} for real-time data`);
            subscribe({ projectId });

            // Request current active alarms
            wsGetActiveAlarms(projectId);

            return () => {
                console.log(`📡 Unsubscribing from project ${projectId}`);
                unsubscribe({ projectId });
            };
        }
    }, [isConnected, projectId, subscribe, unsubscribe, wsGetActiveAlarms]);

    useEffect(() => {
        if (lastMessage) {
            switch (lastMessage.type) {
                case 'measurement':
                    if (lastMessage.data && lastMessage.data.tag_id) {
                        setMeasurements(prev => ({
                            ...prev,
                            [lastMessage.data.tag_id]: {
                                value: lastMessage.data.value,
                                timestamp: lastMessage.data.timestamp,
                                tag_name: lastMessage.data.tag_name,
                                device_name: lastMessage.data.device_name,
                                device_id: lastMessage.data.device_id
                            }
                        }));
                        console.log(`📊 New measurement for tag ${lastMessage.data.tag_id}:`, lastMessage.data.value);
                    }
                    break;

                case 'current_data':
                    if (lastMessage.data && Array.isArray(lastMessage.data)) {
                        const newMeasurements = {};
                        lastMessage.data.forEach(item => {
                            if (item.tag_id) {
                                newMeasurements[item.tag_id] = {
                                    value: item.value,
                                    timestamp: item.timestamp,
                                    tag_name: item.tag_name,
                                    device_name: item.device_name,
                                    device_id: item.device_id
                                };
                            }
                        });
                        setMeasurements(newMeasurements);
                        console.log('📊 Updated current data:', Object.keys(newMeasurements).length, 'measurements');
                    }
                    break;

                case 'device_status':
                    if (lastMessage.data && lastMessage.data.device_id) {
                        setDeviceStatuses(prev => ({
                            ...prev,
                            [lastMessage.data.device_id]: {
                                status: lastMessage.data.status,
                                running: lastMessage.data.running,
                                timestamp: lastMessage.data.timestamp,
                                device_name: lastMessage.data.device_name
                            }
                        }));
                        console.log(`🔌 Device status update for ${lastMessage.data.device_id}:`, lastMessage.data.status);
                    }
                    break;

                case 'project_status':
                    if (lastMessage.data) {
                        // Update device statuses from project status
                        if (lastMessage.data.devices && Array.isArray(lastMessage.data.devices)) {
                            const newDeviceStatuses = {};
                            lastMessage.data.devices.forEach(device => {
                                if (device.device_id) {
                                    newDeviceStatuses[device.device_id] = {
                                        status: device.data_collection_active ? 'running' : 'stopped',
                                        running: device.data_collection_active,
                                        timestamp: new Date().toISOString(),
                                        device_name: device.device_name
                                    };
                                }
                            });
                            setDeviceStatuses(prev => ({ ...prev, ...newDeviceStatuses }));
                            console.log('📊 Project status update:', Object.keys(newDeviceStatuses).length, 'devices');
                        }

                        // Update measurements from recent data
                        if (lastMessage.data.recent_measurements && Array.isArray(lastMessage.data.recent_measurements)) {
                            const newMeasurements = {};
                            lastMessage.data.recent_measurements.forEach(measurement => {
                                if (measurement.tag_id) {
                                    newMeasurements[measurement.tag_id] = {
                                        value: measurement.value,
                                        timestamp: measurement.timestamp,
                                        tag_name: measurement.tag_name,
                                        device_name: measurement.device_name
                                    };
                                }
                            });
                            setMeasurements(prev => ({ ...prev, ...newMeasurements }));
                        }
                    }
                    break;

                // ENHANCED: Comprehensive alarm message handling
                case 'alarm_triggered':
                    if (lastMessage.data) {
                        console.log('🚨 ALARM TRIGGERED:', lastMessage.data.rule?.rule_name);

                        // Add to alarm events
                        setAlarmEvents(prev => [{
                            type: 'triggered',
                            timestamp: new Date().toISOString(),
                            rule: lastMessage.data.rule,
                            measurement: lastMessage.data.measurement,
                            condition_message: lastMessage.data.condition_message
                        }, ...prev.slice(0, 99)]);

                        // Show browser notification if supported
                        if ('Notification' in window && Notification.permission === 'granted') {
                            new Notification('🚨 SCADA Alarm Triggered', {
                                body: `${lastMessage.data.rule?.rule_name}: ${lastMessage.data.condition_message}`,
                                icon: '/alarm-icon.png',
                                tag: `alarm-${lastMessage.data.rule?.rule_id}`
                            });
                        }
                    }
                    break;

                case 'alarm_acknowledged':
                    if (lastMessage.data) {
                        console.log('✅ ALARM ACKNOWLEDGED:', lastMessage.data.rule_name);

                        setAlarmEvents(prev => [{
                            type: 'acknowledged',
                            timestamp: new Date().toISOString(),
                            rule_name: lastMessage.data.rule_name,
                            acknowledged_by: lastMessage.data.acknowledged_by,
                            ack_message: lastMessage.data.ack_message
                        }, ...prev.slice(0, 99)]);
                    }
                    break;

                case 'alarm_cleared':
                    if (lastMessage.data) {
                        console.log('🟢 ALARM CLEARED:', lastMessage.data.rule?.rule_name);

                        setAlarmEvents(prev => [{
                            type: 'cleared',
                            timestamp: new Date().toISOString(),
                            rule: lastMessage.data.rule,
                            measurement: lastMessage.data.measurement
                        }, ...prev.slice(0, 99)]);
                    }
                    break;

                case 'active_alarms':
                    if (lastMessage.data && Array.isArray(lastMessage.data)) {
                        console.log('📋 Active alarms update:', lastMessage.data.length, 'alarms');
                        setActiveAlarms(lastMessage.data);
                    }
                    break;

                case 'alarm_summary':
                    if (lastMessage.data) {
                        console.log('📊 Alarm summary update:', lastMessage.data);
                        setAlarmSummary(lastMessage.data);
                    }
                    break;

                case 'alarm_rule_created':
                    if (lastMessage.data) {
                        console.log('➕ Alarm rule created:', lastMessage.data.rule?.rule_name);
                        setAlarmRuleChanges({
                            type: 'created',
                            rule: lastMessage.data.rule,
                            timestamp: new Date().toISOString()
                        });
                    }
                    break;

                case 'alarm_rule_updated':
                    if (lastMessage.data) {
                        console.log('📝 Alarm rule updated:', lastMessage.data.rule?.rule_name);
                        setAlarmRuleChanges({
                            type: 'updated',
                            rule: lastMessage.data.rule,
                            timestamp: new Date().toISOString()
                        });
                    }
                    break;

                case 'alarm_rule_deleted':
                    if (lastMessage.data) {
                        console.log('🗑️ Alarm rule deleted:', lastMessage.data.rule_name);
                        setAlarmRuleChanges({
                            type: 'deleted',
                            rule_name: lastMessage.data.rule_name,
                            rule_id: lastMessage.data.rule_id,
                            timestamp: new Date().toISOString()
                        });
                    }
                    break;

                case 'alarm_ack_response':
                    if (lastMessage.success) {
                        console.log('✅ Alarm acknowledgment successful:', lastMessage.message);
                    } else {
                        console.error('❌ Alarm acknowledgment failed:', lastMessage.error);
                    }
                    break;

                case 'alarm_ack_error':
                    console.error('❌ Alarm acknowledgment error:', lastMessage.error);
                    break;

                // Legacy alarm support
                case 'alarm':
                    if (lastMessage.data) {
                        setActiveAlarms(prev => [lastMessage.data, ...prev.slice(0, 99)]);
                        console.log('🚨 Legacy alarm:', lastMessage.data);
                    }
                    break;

                case 'connected':
                    console.log('✅ Connected to WebSocket:', lastMessage.message);
                    break;

                case 'subscribed':
                    console.log('✅ Subscribed to project:', lastMessage.projectId);
                    break;

                case 'unsubscribed':
                    console.log('📴 Unsubscribed from project:', lastMessage.projectId);
                    break;

                case 'pong':
                    // Ping response - connection is alive
                    break;

                case 'error':
                    console.error('❌ WebSocket error from server:', lastMessage.message);
                    break;

                default:
                    console.log('📨 Unknown WebSocket message type:', lastMessage.type);
            }
        }
    }, [lastMessage, projectId]);

    // Helper functions
    const getTagValue = useCallback((tagId) => {
        return measurements[tagId]?.value;
    }, [measurements]);

    const getTagTimestamp = useCallback((tagId) => {
        return measurements[tagId]?.timestamp;
    }, [measurements]);

    const getDeviceStatus = useCallback((deviceId) => {
        return deviceStatuses[deviceId];
    }, [deviceStatuses]);

    const getRecentMeasurements = useCallback((maxAge = 300000) => {
        const now = Date.now();
        return Object.entries(measurements).filter(([tagId, measurement]) => {
            if (!measurement.timestamp) return false;
            const age = now - new Date(measurement.timestamp).getTime();
            return age <= maxAge;
        });
    }, [measurements]);

    const getActiveDevices = useCallback(() => {
        return Object.entries(deviceStatuses).filter(([deviceId, status]) => {
            return status.running || status.status === 'running';
        });
    }, [deviceStatuses]);

    // ENHANCED: Alarm-specific helper functions
    const acknowledgeAlarm = useCallback((ruleId, message = 'Acknowledged via WebSocket') => {
        if (projectId) {
            wsAcknowledgeAlarm(projectId, ruleId, message);
        }
    }, [projectId, wsAcknowledgeAlarm]);

    const getAlarmsByTag = useCallback((tagId) => {
        return activeAlarms.filter(alarm => alarm.tag_id === tagId);
    }, [activeAlarms]);

    const getAlarmsBySeverity = useCallback((severity) => {
        return activeAlarms.filter(alarm => alarm.severity === severity);
    }, [activeAlarms]);

    const getUnacknowledgedAlarms = useCallback(() => {
        return activeAlarms.filter(alarm => !alarm.acknowledged_at);
    }, [activeAlarms]);

    const hasActiveAlarms = useCallback(() => {
        return activeAlarms.length > 0;
    }, [activeAlarms]);

    const hasCriticalAlarms = useCallback(() => {
        return activeAlarms.some(alarm => alarm.severity === 'critical');
    }, [activeAlarms]);

    // Request browser notification permission
    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().then(permission => {
                console.log('Notification permission:', permission);
            });
        }
    }, []);

    return {
        // Connection status
        isConnected,
        error,

        // Real-time data
        measurements,
        deviceStatuses,

        // ENHANCED: Comprehensive alarm data
        activeAlarms,
        alarmSummary,
        alarmEvents,
        alarmRuleChanges,

        // Helper functions
        getTagValue,
        getTagTimestamp,
        getDeviceStatus,
        getRecentMeasurements,
        getActiveDevices,

        // ENHANCED: Alarm helper functions
        acknowledgeAlarm,
        getAlarmsByTag,
        getAlarmsBySeverity,
        getUnacknowledgedAlarms,
        hasActiveAlarms,
        hasCriticalAlarms,

        // Statistics
        measurementCount: Object.keys(measurements).length,
        deviceCount: Object.keys(deviceStatuses).length,
        alarmCount: activeAlarms.length,
        unacknowledgedAlarmCount: alarmSummary.unacknowledged,
        criticalAlarmCount: alarmSummary.critical,

        // Debug info
        lastMessageType: lastMessage?.type,
        lastMessageTime: lastMessage?.timestamp
    };
}

// Hook for WebSocket connection health monitoring
export function useWebSocketHealth() {
    const { isConnected, error } = useGlobalWebSocket();
    const [connectionHistory, setConnectionHistory] = useState([]);
    const [disconnectionCount, setDisconnectionCount] = useState(0);

    useEffect(() => {
        const timestamp = new Date().toISOString();

        if (isConnected) {
            setConnectionHistory(prev => [...prev.slice(-9), {
                status: 'connected',
                timestamp,
                error: null
            }]);
        } else if (error) {
            setConnectionHistory(prev => [...prev.slice(-9), {
                status: 'disconnected',
                timestamp,
                error
            }]);
            setDisconnectionCount(prev => prev + 1);
        }
    }, [isConnected, error]);

    return {
        isConnected,
        error,
        connectionHistory,
        disconnectionCount,
        isHealthy: isConnected && !error,
        lastConnectionTime: connectionHistory
            .filter(h => h.status === 'connected')
            .slice(-1)[0]?.timestamp
    };
}

// Export individual hooks for specific use cases
export { useWebSocket as useCustomWebSocket };