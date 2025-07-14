// src/hooks/useWebSocket.js - FIXED VERSION with Message Queue to Prevent Race Conditions
import { useEffect, useRef, useState, useCallback } from 'react';

// 🔧 Improved Token Manager
class WebSocketTokenManager {
    constructor() {
        this.currentToken = null;
    }

    async getValidToken() {
        try {
            // Get token from localStorage or sessionStorage
            const authToken = localStorage.getItem('token') || sessionStorage.getItem('token');
            if (!authToken) {
                console.error('❌ No authentication token found');
                return null;
            }

            // Simple token validation (check if it's not expired)
            try {
                const payload = JSON.parse(atob(authToken.split('.')[1]));
                if (payload.exp && payload.exp * 1000 < Date.now()) {
                    console.error('❌ Token has expired');
                    return null;
                }
            } catch (e) {
                console.error('❌ Invalid token format');
                return null;
            }

            this.currentToken = authToken;
            return this.currentToken;

        } catch (error) {
            console.error('❌ Failed to get WebSocket token:', error);
            return null;
        }
    }

    invalidateToken() {
        this.currentToken = null;
    }
}

// 🔧 Core WebSocket Hook - FIXED WITH MESSAGE QUEUE
export function useWebSocket(projectId) {
    const [isConnected, setIsConnected] = useState(false);
    const [lastMessage, setLastMessage] = useState(null);
    const [error, setError] = useState(null);
    const [connectionAttempts, setConnectionAttempts] = useState(0);

    // 🚀 NEW: Message Queue System to prevent race conditions
    const messageQueue = useRef([]);
    const [messageCount, setMessageCount] = useState(0);

    const ws = useRef(null);
    const reconnectAttempts = useRef(0);
    const maxReconnectAttempts = 5;
    const reconnectTimeoutRef = useRef(null);
    const heartbeatIntervalRef = useRef(null);
    const tokenManager = useRef(new WebSocketTokenManager());
    const isIntentionalClose = useRef(false);
    const lastConnectionAttempt = useRef(0);
    const minReconnectDelay = 1000; // Minimum 1 second between attempts

    // 🔧 Get WebSocket URL with improved logic
    const getWebSocketUrl = useCallback(() => {
        if (process.env.NODE_ENV === 'production') {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            return `${protocol}//${window.location.host}`;
        } else {
            // Development - try to connect to the server
            return 'ws://localhost:4000';
        }
    }, []);

    // 🔧 Improved WebSocket Creation
    const createWebSocket = useCallback(async (url, token) => {
        console.log('🔌 Creating WebSocket connection to:', url);

        // Construct WebSocket URL with token
        const wsUrl = `${url}/ws?token=${encodeURIComponent(token)}`;
        console.log('🔗 WebSocket URL:', wsUrl.replace(token, '***TOKEN***'));

        const websocket = new WebSocket(wsUrl);

        // Set binary type for better performance
        websocket.binaryType = 'arraybuffer';

        return websocket;
    }, []);

    // 🔧 Enhanced Connection Function
    const connect = useCallback(async () => {
        // Prevent too frequent connection attempts
        const now = Date.now();
        if (now - lastConnectionAttempt.current < minReconnectDelay) {
            console.log('⏳ Preventing too frequent connection attempts');
            return false;
        }
        lastConnectionAttempt.current = now;

        try {
            // Get authentication token
            const token = await tokenManager.current.getValidToken();
            if (!token) {
                setError('Authentication token not available - please log in again');
                console.error('❌ WebSocket: No valid authentication token');
                return false;
            }

            console.log('🔌 Attempting WebSocket connection...');
            setConnectionAttempts(prev => prev + 1);
            setError(null);

            // Get WebSocket URL
            const wsUrl = getWebSocketUrl();

            // Create WebSocket connection
            ws.current = await createWebSocket(wsUrl, token);

            // 🔧 Connection Event Handlers
            ws.current.onopen = (event) => {
                console.log('✅ WebSocket connected successfully');
                console.log('🔗 Connection details:', {
                    url: event.target.url.replace(/token=[^&]+/, 'token=***'),
                    readyState: event.target.readyState,
                    protocol: event.target.protocol
                });

                setIsConnected(true);
                setError(null);
                reconnectAttempts.current = 0;
                setConnectionAttempts(0);

                // Start heartbeat
                startHeartbeat();

                // Subscribe to project if provided
                if (projectId) {
                    setTimeout(() => {
                        subscribeToProject(projectId);
                    }, 1000);
                }
            };

            // 🚀 FIXED: Message handler with queue system
            ws.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    // Handle heartbeat responses
                    if (data.type === 'pong') {
                        console.log('💓 Heartbeat response received', messageQueue.current.length);
                        return;
                    }

                    console.log('📨 WebSocket message received:', {
                        type: data.type,
                        projectId: data.projectId,
                        dataLength: data.data ? (Array.isArray(data.data) ? data.data.length : 'object') : 'none'
                    });

                    // 🚀 CRITICAL FIX: Add to message queue instead of overwriting lastMessage
                    const messageWithId = {
                        ...data,
                        receivedAt: new Date().toISOString(),
                        messageId: Date.now() + Math.random() // Unique ID
                    };

                    messageQueue.current.push(messageWithId);
                    setMessageCount(prev => prev + 1); // Trigger processing

                    // Also keep lastMessage for backward compatibility
                    setLastMessage(messageWithId);

                } catch (err) {
                    console.error('❌ Error parsing WebSocket message:', err);
                    console.error('❌ Raw message:', event.data);
                }
            };

            ws.current.onclose = (event) => {
                clearInterval(heartbeatIntervalRef.current);

                const closeReasons = {
                    1000: 'Normal closure',
                    1001: 'Going away',
                    1002: 'Protocol error',
                    1003: 'Unsupported data',
                    1006: 'Connection lost',
                    1008: 'Policy violation (likely auth failed)',
                    1011: 'Server error',
                    1015: 'TLS handshake failed'
                };

                console.log('📴 WebSocket disconnected:', {
                    code: event.code,
                    reason: event.reason || closeReasons[event.code] || 'Unknown',
                    wasClean: event.wasClean,
                    intentional: isIntentionalClose.current
                });

                setIsConnected(false);

                // Handle different close codes
                if (event.code === 1008) {
                    console.error('❌ WebSocket: Authentication failed');
                    setError('Authentication failed - please log in again');
                    tokenManager.current.invalidateToken();
                    return;
                } else if (event.code === 1006) {
                    console.warn('⚠️ WebSocket: Network connection lost');
                    setError('Network connection lost');
                } else if (event.code === 1002) {
                    console.error('❌ WebSocket: Protocol error');
                    setError('WebSocket protocol error');
                } else if (event.code === 1011) {
                    console.error('❌ WebSocket: Server error');
                    setError('Server error occurred');
                }

                // Attempt reconnection if not intentional
                if (!isIntentionalClose.current && reconnectAttempts.current < maxReconnectAttempts) {
                    scheduleReconnect();
                } else if (reconnectAttempts.current >= maxReconnectAttempts) {
                    setError('Connection failed after multiple attempts - please refresh the page');
                    console.error('❌ WebSocket: Max reconnection attempts reached');
                }
            };

            ws.current.onerror = (error) => {
                console.error('❌ WebSocket error:', error);

                // Try to provide more specific error information
                if (!navigator.onLine) {
                    setError('No internet connection');
                } else {
                    setError('WebSocket connection failed - server may be down');
                }
            };

            return true;

        } catch (err) {
            console.error('❌ Failed to create WebSocket connection:', err);
            setError(`Connection failed: ${err.message}`);

            // Try fallback for development
            if (process.env.NODE_ENV === 'development' && !err.message.includes('4001')) {
                console.log('🔄 Trying fallback WebSocket port 4001...');
                try {
                    const fallbackUrl = 'ws://localhost:4001';
                    const token = await tokenManager.current.getValidToken();
                    if (token) {
                        ws.current = await createWebSocket(fallbackUrl, token);
                        return true;
                    }
                } catch (fallbackErr) {
                    console.error('❌ Fallback connection also failed:', fallbackErr);
                }
            }

            scheduleReconnect();
            return false;
        }
    }, [projectId, getWebSocketUrl, createWebSocket]);

    // 🔧 Improved Reconnection Logic
    const scheduleReconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }

        reconnectAttempts.current++;

        // Exponential backoff with jitter
        const baseDelay = Math.min(1000 * Math.pow(2, reconnectAttempts.current - 1), 10000);
        const jitter = Math.random() * 1000; // Add up to 1 second of jitter
        const delay = baseDelay + jitter;

        console.log(`🔄 Scheduling reconnection attempt ${reconnectAttempts.current}/${maxReconnectAttempts} in ${Math.round(delay)}ms`);

        reconnectTimeoutRef.current = setTimeout(() => {
            if (reconnectAttempts.current <= maxReconnectAttempts && !isIntentionalClose.current) {
                connect();
            }
        }, delay);
    }, [connect]);

    // 🔧 Improved Heartbeat System
    const startHeartbeat = useCallback(() => {
        if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current);
        }

        heartbeatIntervalRef.current = setInterval(() => {
            if (ws.current && ws.current.readyState === WebSocket.OPEN) {
                try {
                    ws.current.send(JSON.stringify({
                        type: 'ping',
                        timestamp: Date.now(),
                        projectId: projectId ? parseInt(projectId) : null
                    }));
                } catch (err) {
                    console.error('❌ Failed to send heartbeat:', err);
                }
            }
        }, 30000); // 30 seconds
    }, [projectId]);

    // 🔧 Enhanced Send Message Function
    const sendMessage = useCallback((message) => {
        if (!ws.current) {
            console.warn('⚠️ WebSocket not initialized');
            return false;
        }

        if (ws.current.readyState !== WebSocket.OPEN) {
            console.warn('⚠️ WebSocket not connected, readyState:', ws.current.readyState);
            setError('WebSocket not connected');
            return false;
        }

        try {
            const messageWithTimestamp = {
                ...message,
                timestamp: Date.now()
            };

            ws.current.send(JSON.stringify(messageWithTimestamp));
            console.log('📤 Sent WebSocket message:', message.type);
            return true;

        } catch (err) {
            console.error('❌ Failed to send WebSocket message:', err);
            setError('Failed to send message');
            return false;
        }
    }, []);

    // 🔧 Project Subscription Functions
    const subscribeToProject = useCallback((projectId) => {
        const success = sendMessage({
            type: 'subscribe_project',
            projectId: parseInt(projectId)
        });

        if (success) {
            console.log(`📡 Subscribed to project ${projectId}`);
        } else {
            console.error(`❌ Failed to subscribe to project ${projectId}`);
        }

        return success;
    }, [sendMessage]);

    const unsubscribeFromProject = useCallback((projectId) => {
        const success = sendMessage({
            type: 'unsubscribe_project',
            projectId: parseInt(projectId)
        });

        if (success) {
            console.log(`📡 Unsubscribed from project ${projectId}`);
        }

        return success;
    }, [sendMessage]);

    // 🔧 Alarm Functions
    const acknowledgeAlarm = useCallback((projectId, ruleId, message = 'Acknowledged via WebSocket') => {
        return sendMessage({
            type: 'acknowledge_alarm',
            projectId: parseInt(projectId),
            ruleId: parseInt(ruleId),
            message: message
        });
    }, [sendMessage]);

    const getActiveAlarms = useCallback((projectId) => {
        return sendMessage({
            type: 'get_active_alarms',
            projectId: parseInt(projectId)
        });
    }, [sendMessage]);

    // 🔧 Connection Management
    const forceReconnect = useCallback(() => {
        console.log('🔄 Force reconnecting WebSocket...');
        isIntentionalClose.current = false;
        reconnectAttempts.current = 0;
        setError(null);

        if (ws.current) {
            isIntentionalClose.current = true;
            ws.current.close(1000, 'Force reconnect');
        }

        setTimeout(() => {
            isIntentionalClose.current = false;
            connect();
        }, 1000);
    }, [connect]);

    const disconnect = useCallback(() => {
        console.log('🔌 Disconnecting WebSocket...');
        isIntentionalClose.current = true;

        // Clear all timeouts and intervals
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }
        if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current);
        }

        if (ws.current) {
            ws.current.close(1000, 'Intentional disconnect');
        }

        setIsConnected(false);
        setError(null);
    }, []);

    // 🔧 Initialize Connection
    useEffect(() => {
        isIntentionalClose.current = false;
        connect();

        return () => {
            console.log('🧹 Cleaning up WebSocket connection...');
            isIntentionalClose.current = true;

            // Clean up all timeouts and intervals
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (heartbeatIntervalRef.current) {
                clearInterval(heartbeatIntervalRef.current);
            }

            if (ws.current) {
                ws.current.close(1000, 'Component unmounted');
            }
        };
    }, [connect]);

    return {
        isConnected,
        lastMessage,
        error,
        connectionAttempts,
        sendMessage,
        subscribeToProject,
        unsubscribeFromProject,
        acknowledgeAlarm,
        getActiveAlarms,
        forceReconnect,
        disconnect,
        reconnectAttempts: reconnectAttempts.current,
        maxReconnectAttempts,
        // 🚀 NEW: Expose message queue for advanced usage
        messageQueue: messageQueue.current,
        messageCount,
        // Additional debugging info
        wsReadyState: ws.current?.readyState,
        wsUrl: ws.current?.url
    };
}

// 🔧 Enhanced Real-Time Data Hook - FIXED WITH MESSAGE QUEUE PROCESSING
export function useRealTimeData(projectId) {
    // Real-time data state
    const [measurements, setMeasurements] = useState({});
    const [deviceStatuses, setDeviceStatuses] = useState({});
    const [activeAlarms, setActiveAlarms] = useState([]);
    const [alarmSummary, setAlarmSummary] = useState({
        total_active: 0,
        unacknowledged: 0,
        acknowledged: 0,
        critical: 0,
        warning: 0,
        info: 0,
        latest_trigger: null,
        has_active_alarms: false,
        has_unacknowledged: false
    });
    const [alarmEvents, setAlarmEvents] = useState([]);

    // WebSocket connection with message queue
    const {
        isConnected,
        lastMessage,
        error,
        connectionAttempts,
        subscribeToProject,
        unsubscribeFromProject,
        acknowledgeAlarm: wsAcknowledgeAlarm,
        getActiveAlarms: wsGetActiveAlarms,
        forceReconnect,
        sendMessage,
        messageQueue,
        messageCount
    } = useWebSocket(projectId);

    // 🚀 FIXED: Process all queued messages to prevent race conditions
    useEffect(() => {
        if (messageQueue.length === 0) return;

        // Process all queued messages
        const messagesToProcess = [...messageQueue];
        messageQueue.length = 0;  // Clear queue

        messagesToProcess.forEach(message => {
            const { type, data, projectId: msgProjectId } = message;

            // Only process messages for our project
            if (msgProjectId && parseInt(msgProjectId) !== parseInt(projectId)) {
                return;
            }

            console.log(`🔧 Processing real-time message: ${type}`, {
                dataType: typeof data,
                dataLength: Array.isArray(data) ? data.length : 'not array',
                projectId: msgProjectId
            });

            switch (type) {
                case 'measurement':
                    if (data && data.tag_id !== undefined) {
                        setMeasurements(prev => ({
                            ...prev,
                            [data.tag_id]: {
                                value: data.value,
                                timestamp: data.timestamp,
                                tag_name: data.tag_name,
                                device_name: data.device_name,
                                device_id: data.device_id,
                                quality: data.quality || 'good',
                                engineering_unit: data.engineering_unit
                            }
                        }));
                    }
                    break;

                case 'current_data':
                    if (data && Array.isArray(data)) {
                        console.log(`📊 Processing ${data.length} current measurements`);
                        const newMeasurements = {};
                        data.forEach(item => {
                            if (item.tag_id !== undefined) {
                                newMeasurements[item.tag_id] = {
                                    value: item.value,
                                    timestamp: item.timestamp,
                                    tag_name: item.tag_name,
                                    device_name: item.device_name,
                                    device_id: item.device_id,
                                    quality: item.quality || 'good',
                                    engineering_unit: item.engineering_unit
                                };
                            }
                        });
                        setMeasurements(prev => ({ ...prev, ...newMeasurements }));
                    }
                    break;

                case 'device_status':
                    if (data && data.device_id !== undefined) {
                        setDeviceStatuses(prev => ({
                            ...prev,
                            [data.device_id]: {
                                status: data.status,
                                running: data.status === 'running',
                                timestamp: data.timestamp,
                                device_name: data.device_name
                            }
                        }));
                    }
                    break;

                case 'alarm_triggered':
                    if (data) {
                        console.log('🚨 Alarm triggered:', data);
                        const newAlarm = {
                            id: data.rule_id || data.id,
                            rule_id: data.rule_id || data.id,
                            rule_name: data.rule_name,
                            tag_id: data.tag_id,
                            tag_name: data.tag_name,
                            device_id: data.device_id,
                            device_name: data.device_name,
                            severity: data.severity || 'warning',
                            threshold: data.threshold,
                            trigger_value: data.value || data.trigger_value,
                            condition_type: data.condition_type,
                            message: data.message,
                            state: 'triggered',
                            triggered_at: data.triggered_at || new Date().toISOString(),
                            acknowledged_at: null,
                            acknowledged_by: null
                        };

                        setActiveAlarms(prev => {
                            const filtered = prev.filter(a => a.rule_id !== newAlarm.rule_id);
                            return [newAlarm, ...filtered];
                        });
                    }
                    break;

                case 'alarm_acknowledged':
                    if (data) {
                        console.log('✅ Alarm acknowledged:', data);
                        const ruleId = data.rule_id || data.id;
                        setActiveAlarms(prev => prev.filter(alarm => alarm.rule_id !== ruleId));
                    }
                    break;

                case 'alarm_cleared':
                    if (data) {
                        console.log('🟢 Alarm cleared:', data);
                        const ruleId = data.rule_id || data.id;
                        setActiveAlarms(prev => prev.filter(alarm => alarm.rule_id !== ruleId));
                    }
                    break;

                case 'active_alarms':
                    console.log(`📥 Received ${Array.isArray(data) ? data.length : 'invalid'} active alarms`);
                    if (Array.isArray(data)) {
                        const processedAlarms = data.map(alarm => ({
                            id: alarm.rule_id || alarm.id,
                            rule_id: alarm.rule_id || alarm.id,
                            rule_name: alarm.rule_name,
                            tag_id: alarm.tag_id,
                            tag_name: alarm.tag_name,
                            device_id: alarm.device_id,
                            device_name: alarm.device_name,
                            severity: alarm.severity || 'warning',
                            threshold: alarm.threshold,
                            trigger_value: alarm.trigger_value || alarm.value,
                            condition_type: alarm.condition_type,
                            message: alarm.message,
                            state: alarm.state || 'triggered',
                            triggered_at: alarm.triggered_at,
                            acknowledged_at: alarm.acknowledged_at,
                            acknowledged_by: alarm.acknowledged_by
                        }));

                        setActiveAlarms(processedAlarms);
                    }
                    break;

                case 'alarm_summary':
                    if (data) {
                        console.log('📊 Processing alarm summary:', data);
                        const parsedSummary = {
                            total_active: parseInt(data.total_active) || 0,
                            unacknowledged: parseInt(data.unacknowledged) || 0,
                            acknowledged: parseInt(data.acknowledged) || 0,
                            critical: parseInt(data.critical) || 0,
                            warning: parseInt(data.warning) || 0,
                            info: parseInt(data.info) || 0,
                            latest_trigger: data.latest_trigger,
                            has_active_alarms: (parseInt(data.total_active) || 0) > 0,
                            has_unacknowledged: (parseInt(data.unacknowledged) || 0) > 0
                        };

                        setAlarmSummary(parsedSummary);
                        console.log('✅ Alarm summary updated:', parsedSummary);
                    }
                    break;

                case 'connected':
                    console.log('✅ WebSocket server confirmed connection');
                    break;

                case 'subscribed':
                    console.log('✅ Successfully subscribed to project:', msgProjectId);
                    // Request active alarms after subscription
                    setTimeout(() => {
                        wsGetActiveAlarms(projectId);
                    }, 500);
                    break;

                case 'error':
                    console.error('❌ Server error:', message.message);
                    break;

                default:
                    console.log('📨 Unknown message type:', type, data);
            }
        });
    }, [messageCount, projectId, wsGetActiveAlarms]); // 🚀 CRITICAL: Trigger on messageCount change

    // 🔧 Helper Functions
    const getTagValue = useCallback((tagId) => {
        return measurements[tagId]?.value;
    }, [measurements]);

    const getTagTimestamp = useCallback((tagId) => {
        return measurements[tagId]?.timestamp;
    }, [measurements]);

    const getTagDataByName = useCallback((tagName) => {
        return Object.values(measurements).find(m => m.tag_name === tagName);
    }, [measurements]);

    const getDeviceStatus = useCallback((deviceId) => {
        return deviceStatuses[deviceId];
    }, [deviceStatuses]);

    const acknowledgeAlarm = useCallback((ruleId, message = 'Acknowledged via SCADA Interface') => {
        if (projectId) {
            return wsAcknowledgeAlarm(projectId, ruleId, message);
        }
        return false;
    }, [projectId, wsAcknowledgeAlarm]);

    return {
        // Connection status
        isConnected,
        error,
        connectionAttempts,

        // Real-time data
        measurements,
        deviceStatuses,
        activeAlarms,
        alarmSummary,
        alarmEvents,

        // Helper functions
        getTagValue,
        getTagTimestamp,
        getTagDataByName,
        getDeviceStatus,
        acknowledgeAlarm,

        // Statistics
        measurementCount: Object.keys(measurements).length,
        deviceCount: Object.keys(deviceStatuses).length,
        alarmCount: activeAlarms.length,

        // Connection management
        forceReconnect
    };
}

// 🔧 Global WebSocket Hook (for backward compatibility with ProjectsPage)
export function useGlobalWebSocket() {
    const [isConnected, setIsConnected] = useState(false);
    const [lastMessage, setLastMessage] = useState(null);
    const [error, setError] = useState(null);
    const [connectionAttempts, setConnectionAttempts] = useState(0);

    const ws = useRef(null);
    const reconnectAttempts = useRef(0);
    const maxReconnectAttempts = 5;
    const reconnectTimeoutRef = useRef(null);
    const heartbeatIntervalRef = useRef(null);
    const tokenManager = useRef(new WebSocketTokenManager());
    const isIntentionalClose = useRef(false);

    // 🔧 Get WebSocket URL based on environment
    const getWebSocketUrl = useCallback(() => {
        if (process.env.NODE_ENV === 'production') {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            return `${protocol}//${window.location.host}`;
        } else {
            return 'ws://localhost:4000';
        }
    }, []);

    // 🔧 Create WebSocket Connection
    const createWebSocket = useCallback(async (url, token) => {
        console.log('🔌 Creating Global WebSocket connection to:', url);
        const wsUrl = `${url}/ws?token=${encodeURIComponent(token)}`;
        return new WebSocket(wsUrl);
    }, []);

    // 🔧 Connection Function
    const connect = useCallback(async () => {
        try {
            const token = await tokenManager.current.getValidToken();
            if (!token) {
                setError('Authentication token not available');
                return false;
            }

            setConnectionAttempts(prev => prev + 1);
            let wsUrl = getWebSocketUrl();
            ws.current = await createWebSocket(wsUrl, token);

            ws.current.onopen = () => {
                console.log('✅ Global WebSocket connected');
                setIsConnected(true);
                setError(null);
                reconnectAttempts.current = 0;
                setConnectionAttempts(0);
                startHeartbeat();
            };

            ws.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type !== 'pong') {
                        setLastMessage({ ...data, receivedAt: new Date().toISOString() });
                    }
                } catch (err) {
                    console.error('❌ Error parsing message:', err);
                }
            };

            ws.current.onclose = (event) => {
                clearInterval(heartbeatIntervalRef.current);
                setIsConnected(false);

                if (event.code === 1008) {
                    setError('Authentication failed');
                    tokenManager.current.invalidateToken();
                    return;
                }

                if (!isIntentionalClose.current && reconnectAttempts.current < maxReconnectAttempts) {
                    scheduleReconnect();
                }
            };

            ws.current.onerror = (error) => {
                console.error('❌ Global WebSocket error:', error);
                setError('WebSocket connection error');
            };

            return true;
        } catch (err) {
            console.error('❌ Failed to create Global WebSocket:', err);
            setError(`Connection failed: ${err.message}`);

            if (process.env.NODE_ENV !== 'production') {
                try {
                    const fallbackUrl = 'ws://localhost:4001';
                    ws.current = await createWebSocket(fallbackUrl, await tokenManager.current.getValidToken());
                    return true;
                } catch (fallbackErr) {
                    console.error('❌ Fallback connection failed:', fallbackErr);
                }
            }

            scheduleReconnect();
            return false;
        }
    }, [getWebSocketUrl, createWebSocket]);

    // 🔧 Reconnection Logic
    const scheduleReconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }

        reconnectAttempts.current++;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);

        reconnectTimeoutRef.current = setTimeout(() => {
            if (reconnectAttempts.current <= maxReconnectAttempts) {
                connect();
            }
        }, delay);
    }, [connect]);

    // 🔧 Heartbeat System
    const startHeartbeat = useCallback(() => {
        if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current);
        }

        heartbeatIntervalRef.current = setInterval(() => {
            if (ws.current && ws.current.readyState === WebSocket.OPEN) {
                try {
                    ws.current.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
                } catch (err) {
                    console.error('❌ Failed to send heartbeat:', err);
                }
            }
        }, 30000);
    }, []);

    // 🔧 Send Message Function
    const sendMessage = useCallback((message) => {
        if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
            console.warn('⚠️ Global WebSocket not connected');
            return false;
        }

        try {
            ws.current.send(JSON.stringify({ ...message, timestamp: Date.now() }));
            return true;
        } catch (err) {
            console.error('❌ Failed to send message:', err);
            return false;
        }
    }, []);

    // 🔧 Project Subscription Functions
    const subscribe = useCallback((subscription) => {
        return sendMessage({
            type: 'subscribe_project',
            projectId: subscription.projectId
        });
    }, [sendMessage]);

    const unsubscribe = useCallback((subscription) => {
        return sendMessage({
            type: 'unsubscribe_project',
            projectId: subscription.projectId
        });
    }, [sendMessage]);

    // 🔧 Alarm Functions
    const acknowledgeAlarm = useCallback((projectId, ruleId, message = 'Acknowledged') => {
        return sendMessage({
            type: 'acknowledge_alarm',
            projectId: parseInt(projectId),
            ruleId: parseInt(ruleId),
            message
        });
    }, [sendMessage]);

    const getActiveAlarms = useCallback((projectId) => {
        return sendMessage({
            type: 'get_active_alarms',
            projectId: parseInt(projectId)
        });
    }, [sendMessage]);

    // 🔧 Connection Management
    const forceReconnect = useCallback(() => {
        isIntentionalClose.current = false;
        reconnectAttempts.current = 0;

        if (ws.current) {
            isIntentionalClose.current = true;
            ws.current.close();
        }

        setTimeout(() => {
            isIntentionalClose.current = false;
            connect();
        }, 1000);
    }, [connect]);

    const disconnect = useCallback(() => {
        isIntentionalClose.current = true;

        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }
        if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current);
        }

        if (ws.current) {
            ws.current.close(1000, 'Intentional disconnect');
        }
    }, []);

    // 🔧 Initialize Connection
    useEffect(() => {
        isIntentionalClose.current = false;
        connect();

        return () => {
            isIntentionalClose.current = true;
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (heartbeatIntervalRef.current) {
                clearInterval(heartbeatIntervalRef.current);
            }
            if (ws.current) {
                ws.current.close(1000, 'Component unmounted');
            }
        };
    }, [connect]);

    return {
        isConnected,
        lastMessage,
        error,
        connectionAttempts,
        sendMessage,
        subscribe,
        unsubscribe,
        acknowledgeAlarm,
        getActiveAlarms,
        forceReconnect,
        disconnect,
        reconnectAttempts: reconnectAttempts.current,
        maxReconnectAttempts
    };
}

// Export all hooks
export { useWebSocket as useCustomWebSocket };