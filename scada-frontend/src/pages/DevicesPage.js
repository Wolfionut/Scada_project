// src/pages/DevicesPage.js - COMPLETE FIXED VERSION
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    Grid, Paper, Box, Typography, IconButton, Tooltip, Chip, Fab, Dialog,
    DialogTitle, DialogContent, DialogActions, TextField, Button, Snackbar, Alert,
    InputAdornment, Avatar, Stack, Card, CardContent, MenuItem, FormControl, InputLabel, Select,
    CircularProgress, LinearProgress, Badge
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Memory as MemoryIcon,
    Search as SearchIcon,
    Router as RouterIcon,
    Cable as CableIcon,
    Label as LabelIcon,
    WifiTethering as TestConnectionIcon,
    CheckCircle as CheckCircleIcon,
    Error as ErrorIcon,
    Refresh as RefreshIcon,
    Computer as SimulationIcon,
    NetworkCheck as NetworkCheckIcon,
    PlayArrow as PlayArrowIcon,
    Stop as StopIcon,
    Timeline as TimelineIcon,
    Settings as SettingsIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import axios from '../api/axios';
import { motion } from 'framer-motion';
import { useRealTimeData } from '../hooks/useWebSocket';

export default function DevicesPage() {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const { isDark } = useTheme();

    // Real-time data from WebSocket
    const { isConnected: wsConnected, deviceStatuses, measurementCount, measurements } = useRealTimeData(projectId);

    // State management
    const [devices, setDevices] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [search, setSearch] = useState('');

    // 🚀 FIXED: Separate loading states to prevent flicker
    const [loading, setLoading] = useState(false); // Only for manual operations

    const [addOpen, setAddOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, msg: '', severity: 'success' });
    const [current, setCurrent] = useState(null);

    // Track devices currently being toggled
    const [togglingDevices, setTogglingDevices] = useState(new Set());
    const [testingConnection, setTestingConnection] = useState({});

    // Device form state
    const [deviceName, setDeviceName] = useState('');
    const [deviceType, setDeviceType] = useState('modbus');
    const [protocol, setProtocol] = useState('');
    const [ipAddress, setIpAddress] = useState('');
    const [port, setPort] = useState('502');
    const [slaveId, setSlaveId] = useState('1');

    // Enhanced device type configurations
    const deviceTypes = [
        {
            value: 'modbus',
            label: 'Modbus TCP/IP',
            description: 'Industrial Modbus TCP protocol for PLCs and HMIs',
            defaultPort: '502',
            requiresNetwork: true,
            icon: RouterIcon,
            color: 'primary'
        },
        {
            value: 'mqtt',
            label: 'MQTT Broker',
            description: 'MQTT message broker for IoT and real-time data',
            defaultPort: '1883',
            requiresNetwork: true,
            icon: CableIcon,
            color: 'secondary'
        },
        {
            value: 'simulation',
            label: 'Simulation Device',
            description: 'Realistic industrial data simulation for testing',
            defaultPort: '0',
            requiresNetwork: false,
            icon: SimulationIcon,
            color: 'success'
        }
    ];

    // ==================== DEVICE STATUS LOGIC ====================

    const getDeviceStatus = useCallback((device) => {
        const deviceId = device.device_id;

        // Check WebSocket for real-time updates first
        const wsStatus = deviceStatuses[deviceId];
        const hasRecentWSData = wsStatus && (Date.now() - new Date(wsStatus.timestamp || 0).getTime()) < 30000; // 30 seconds

        // Priority 1: Fresh WebSocket data (most current)
        if (hasRecentWSData && wsStatus.running === true) {
            return {
                isActive: true,
                status: 'running',
                message: '🔴 Live Data Flow',
                color: 'success',
                source: 'websocket_realtime',
                wsTimestamp: wsStatus.timestamp
            };
        }

        // Priority 2: Backend database status
        if (device.data_collection_active === true) {
            return {
                isActive: true,
                status: 'running',
                message: '✅ Data Collection Active',
                color: 'success',
                source: 'backend_database'
            };
        }

        // Priority 3: WebSocket historical data (older than 30s)
        if (wsStatus && wsStatus.running === false) {
            return {
                isActive: false,
                status: 'stopped',
                message: '⚫ Stopped (WebSocket)',
                color: 'default',
                source: 'websocket_historical',
                wsTimestamp: wsStatus.timestamp
            };
        }

        // Default: Stopped
        return {
            isActive: false,
            status: 'stopped',
            message: '⚫ Data Collection Stopped',
            color: 'default',
            source: 'backend_default'
        };
    }, [deviceStatuses]);

    // ==================== DATA FETCHING ====================

    // 🚀 FIXED: Added showLoading parameter to prevent flicker
    const fetchDevices = useCallback(async (force = false, showLoading = true) => {
        if (!projectId) return;

        // Smart polling: Reduce frequency when WebSocket is active
        if (!force && wsConnected && Object.keys(deviceStatuses).length > 0 && !showLoading) {
            console.log('📡 WebSocket active - skipping routine fetch');
            return;
        }

        // 🚀 FIXED: Only show loading bar when explicitly requested
        if (showLoading) {
            setLoading(true);
        }

        try {
            console.log(`📤 Fetching devices for project: ${projectId}${force ? ' (forced)' : ''}${!showLoading ? ' (silent)' : ''}`);

            const response = await axios.get(`/devices/project/${projectId}`);

            console.log(`📥 Fetched ${response.data.length} devices:`, response.data.map(d => ({
                id: d.device_id,
                name: d.device_name,
                active: d.data_collection_active,
                status: d.connection_status
            })));

            setDevices(response.data);
            setFiltered(response.data);

        } catch (error) {
            console.error('❌ Failed to fetch devices:', error);
            // Only show error messages for visible operations
            if (showLoading) {
                setSnackbar({
                    open: true,
                    msg: `Failed to load devices: ${error.response?.data?.error || error.message}`,
                    severity: 'error'
                });
            }
        } finally {
            if (showLoading) {
                setLoading(false);
            }
        }
    }, [projectId, wsConnected, deviceStatuses]);

    // ==================== DEVICE ACTIVITY ====================

    const getDeviceActivity = useCallback((deviceId) => {
        const deviceMeasurements = Object.entries(measurements).filter(([tagId, measurement]) => {
            return measurement.device_id === deviceId || measurement.device_name;
        });

        if (deviceMeasurements.length === 0) return null;

        // Find most recent measurement
        const recentMeasurement = deviceMeasurements.reduce((latest, [tagId, measurement]) => {
            const measurementTime = new Date(measurement.timestamp).getTime();
            const latestTime = latest ? new Date(latest.timestamp).getTime() : 0;
            return measurementTime > latestTime ? measurement : latest;
        }, null);

        if (!recentMeasurement) return null;

        const ageMs = Date.now() - new Date(recentMeasurement.timestamp).getTime();
        const isRecent = ageMs < 10000; // 10 seconds

        return {
            recentMeasurement,
            ageMs,
            isRecent,
            tagCount: deviceMeasurements.length,
            lastUpdate: recentMeasurement.timestamp
        };
    }, [measurements]);

    // ==================== DEVICE CONTROL ====================

    const toggleDataCollection = useCallback(async (device) => {
        const deviceId = device.device_id;
        const currentStatus = getDeviceStatus(device);
        const isCurrentlyActive = currentStatus.isActive;
        const action = isCurrentlyActive ? 'stop' : 'start';

        console.log('🔄'.repeat(10));
        console.log(`🔄 TOGGLE: ${device.device_name} - ${action.toUpperCase()}`);
        console.log(`🔄 Current: ${isCurrentlyActive} (${currentStatus.source})`);
        console.log(`🔄 WebSocket Connected: ${wsConnected}`);
        console.log('🔄'.repeat(10));

        // Prevent multiple toggles
        if (togglingDevices.has(deviceId)) {
            console.log('❌ Already toggling this device');
            return;
        }

        try {
            // Mark as toggling (for UI feedback)
            setTogglingDevices(prev => new Set([...prev, deviceId]));

            // Show immediate feedback
            setSnackbar({
                open: true,
                msg: `🔄 ${isCurrentlyActive ? 'Stopping' : 'Starting'} ${device.device_name}...`,
                severity: 'info'
            });

            console.log(`📤 API Call: POST /devices/project/${projectId}/${deviceId}/${action}`);

            // Make API call
            const response = await axios.post(`/devices/project/${projectId}/${deviceId}/${action}`);
            console.log(`✅ API Response:`, response.data);

            // WebSocket-aware verification
            if (wsConnected) {
                // For WebSocket users, wait for real-time status update
                console.log('📡 WebSocket connected - waiting for real-time status update...');

                let wsUpdateReceived = false;
                const checkWSUpdate = setInterval(() => {
                    const currentWSStatus = deviceStatuses[deviceId];
                    if (currentWSStatus && currentWSStatus.timestamp) {
                        const updateTime = new Date(currentWSStatus.timestamp).getTime();
                        if (updateTime > Date.now() - 10000) { // Updated in last 10 seconds
                            wsUpdateReceived = true;
                            clearInterval(checkWSUpdate);

                            setSnackbar({
                                open: true,
                                msg: `✅ ${device.device_name} ${action}ed successfully! (Real-time)`,
                                severity: 'success'
                            });
                        }
                    }
                }, 1000);

                // Fallback to API check after 5 seconds
                setTimeout(() => {
                    if (!wsUpdateReceived) {
                        clearInterval(checkWSUpdate);
                        console.log('⚠️ No WebSocket update, falling back to API verification');
                        apiVerification();
                    }
                }, 5000);
            } else {
                // No WebSocket - use API verification
                setTimeout(apiVerification, 2000);
            }

            // API verification function
            async function apiVerification() {
                try {
                    const freshResponse = await axios.get(`/devices/project/${projectId}`);
                    const updatedDevice = freshResponse.data.find(d => d.device_id == deviceId);

                    if (updatedDevice) {
                        const newStatus = getDeviceStatus(updatedDevice);
                        console.log(`✅ API Verification: ${device.device_name} is now ${newStatus.isActive ? 'ACTIVE' : 'STOPPED'}`);

                        // Update local state
                        setDevices(freshResponse.data);

                        // Success message
                        setSnackbar({
                            open: true,
                            msg: `✅ ${device.device_name} ${newStatus.isActive ? 'started' : 'stopped'} successfully!`,
                            severity: 'success'
                        });
                    }
                } catch (verifyError) {
                    console.log('⚠️ Verification failed, forcing refresh');
                    fetchDevices(true, true); // Force refresh with loading
                }
            }

        } catch (error) {
            console.error(`❌ Toggle failed:`, error);

            setSnackbar({
                open: true,
                msg: `❌ Failed to ${action} ${device.device_name}: ${error.response?.data?.error || error.message}`,
                severity: 'error'
            });

            // Refresh on error
            fetchDevices(true, true);

        } finally {
            // Remove from toggling set after a delay
            setTimeout(() => {
                setTogglingDevices(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(deviceId);
                    return newSet;
                });
            }, 5000);
        }
    }, [getDeviceStatus, projectId, fetchDevices, wsConnected, deviceStatuses]);

    // ==================== CONNECTION TESTING ====================

    const testDeviceConnection = useCallback(async (device) => {
        const deviceId = device.device_id;
        setTestingConnection(prev => ({ ...prev, [deviceId]: true }));

        try {
            console.log('🔗 Testing connection to device:', device.device_name);
            const response = await axios.post(`/devices/project/${projectId}/${deviceId}/test-connection`);

            setSnackbar({
                open: true,
                msg: response.data.connected ?
                    `✅ Connected to ${device.device_name} (${response.data.responseTime}ms)` :
                    `❌ Connection failed: ${response.data.message}`,
                severity: response.data.connected ? 'success' : 'error'
            });

        } catch (error) {
            setSnackbar({
                open: true,
                msg: `❌ Connection test failed: ${error.response?.data?.message || error.message}`,
                severity: 'error'
            });
        } finally {
            setTestingConnection(prev => ({ ...prev, [deviceId]: false }));
        }
    }, [projectId]);

    // ==================== DEVICE MANAGEMENT ====================

    const handleAddDevice = async () => {
        if (!deviceName.trim()) {
            setSnackbar({ open: true, msg: 'Device name is required', severity: 'error' });
            return;
        }

        const deviceConfig = getDeviceTypeConfig(deviceType);

        try {
            const deviceData = {
                device_name: deviceName,
                device_type: deviceType,
                protocol: protocol || deviceConfig.label,
                ip_address: deviceConfig.requiresNetwork ? (ipAddress || null) : null,
                port: deviceConfig.requiresNetwork ? (port ? parseInt(port) : null) : null,
                slave_id: deviceType === 'modbus' ? (slaveId ? parseInt(slaveId) : null) : null
            };

            await axios.post(`/devices/project/${projectId}`, deviceData);
            setAddOpen(false);
            resetForm();
            setSnackbar({
                open: true,
                msg: `✅ Device "${deviceName}" added successfully!`,
                severity: 'success'
            });
            fetchDevices(true, true);

        } catch (error) {
            setSnackbar({
                open: true,
                msg: error.response?.data?.error || 'Failed to add device',
                severity: 'error'
            });
        }
    };

    const handleEdit = async () => {
        if (!current || !deviceName.trim()) return;
        try {
            const deviceConfig = getDeviceTypeConfig(deviceType);
            const deviceData = {
                device_name: deviceName,
                device_type: deviceType,
                protocol: protocol || deviceConfig.label,
                ip_address: deviceConfig.requiresNetwork ? (ipAddress || null) : null,
                port: deviceConfig.requiresNetwork ? (port ? parseInt(port) : null) : null,
                slave_id: deviceType === 'modbus' ? (slaveId ? parseInt(slaveId) : null) : null
            };

            await axios.put(`/devices/project/${projectId}/${current.device_id}`, deviceData);
            setEditOpen(false);
            resetForm();
            setSnackbar({ open: true, msg: 'Device updated successfully!', severity: 'success' });
            fetchDevices(true, true);
        } catch (error) {
            setSnackbar({ open: true, msg: error.response?.data?.error || 'Failed to update device', severity: 'error' });
        }
    };

    const handleDelete = async () => {
        if (!current) return;
        try {
            await axios.delete(`/devices/project/${projectId}/${current.device_id}`);
            setDeleteOpen(false);
            setSnackbar({ open: true, msg: 'Device deleted successfully!', severity: 'success' });
            fetchDevices(true, true);
        } catch (error) {
            setSnackbar({ open: true, msg: error.response?.data?.error || 'Failed to delete device', severity: 'error' });
        }
    };

    const resetForm = () => {
        setDeviceName('');
        setDeviceType('modbus');
        setProtocol('');
        setIpAddress('');
        setPort('502');
        setSlaveId('1');
    };

    const openEdit = (device) => {
        setCurrent(device);
        setDeviceName(device.device_name);
        setDeviceType(device.device_type || 'modbus');
        setProtocol(device.protocol || '');
        setIpAddress(device.ip_address || '');
        setPort(device.port?.toString() || '502');
        setSlaveId(device.slave_id?.toString() || '1');
        setEditOpen(true);
    };

    const getDeviceTypeConfig = (type) => {
        return deviceTypes.find(dt => dt.value === type) || deviceTypes[0];
    };

    const handleDeviceTypeChange = (newType) => {
        setDeviceType(newType);
        const config = getDeviceTypeConfig(newType);
        setPort(config.defaultPort);
    };

    // ==================== EFFECTS ====================

    useEffect(() => {
        if (projectId) {
            fetchDevices(true, true); // Initial fetch - show loading
        }

        // 🚀 FIXED: Smart polling with silent refresh
        const refreshInterval = setInterval(() => {
            if (togglingDevices.size === 0) {
                console.log(`🔄 Silent refresh (${wsConnected ? 'WS active' : 'WS inactive'})`);
                fetchDevices(false, false); // 🚀 SILENT REFRESH - NO LOADING BAR!
            }
        }, wsConnected ? 60000 : 15000); // Slower when WebSocket active

        return () => clearInterval(refreshInterval);
    }, [projectId, fetchDevices, togglingDevices.size, wsConnected]);

    // Handle WebSocket updates
    useEffect(() => {
        if (deviceStatuses && Object.keys(deviceStatuses).length > 0) {
            console.log('🔔 WebSocket device status update:', deviceStatuses);

            // Check if we have devices loaded
            if (devices.length > 0) {
                // Update device states based on WebSocket data
                setDevices(prev => prev.map(device => {
                    const wsStatus = deviceStatuses[device.device_id];
                    if (wsStatus && wsStatus.timestamp) {
                        const isRecent = Date.now() - new Date(wsStatus.timestamp).getTime() < 30000;

                        if (isRecent) {
                            console.log(`🔔 Real-time update for ${device.device_name}:`, wsStatus.status);

                            // Update backend fields based on WebSocket status
                            return {
                                ...device,
                                data_collection_active: wsStatus.status === 'running' || wsStatus.running === true,
                                connection_status: wsStatus.status === 'running' ? 'collecting' : device.connection_status,
                                updated_at: wsStatus.timestamp
                            };
                        }
                    }
                    return device;
                }));
            } else {
                // No devices loaded yet, trigger fetch
                fetchDevices(true, false);
            }
        }
    }, [deviceStatuses, devices.length, fetchDevices]);

    // Handle WebSocket measurements for activity indicators
    useEffect(() => {
        if (measurements && Object.keys(measurements).length > 0) {
            console.log(`📊 WebSocket measurements update: ${Object.keys(measurements).length} active tags`);
        }
    }, [measurements]);

    useEffect(() => {
        if (!search) {
            setFiltered(devices);
        } else {
            setFiltered(
                devices.filter(d =>
                    d.device_name.toLowerCase().includes(search.toLowerCase()) ||
                    (d.device_type && d.device_type.toLowerCase().includes(search.toLowerCase())) ||
                    (d.ip_address && d.ip_address.toLowerCase().includes(search.toLowerCase()))
                )
            );
        }
    }, [search, devices]);

    // ==================== RENDER DEVICE CARD ====================

    const renderDeviceCard = (device, index) => {
        const deviceConfig = getDeviceTypeConfig(device.device_type);
        const status = getDeviceStatus(device);
        const DeviceIcon = deviceConfig.icon;
        const isSimulation = device.device_type === 'simulation';
        const isTesting = testingConnection[device.device_id];
        const isToggling = togglingDevices.has(device.device_id);

        return (
            <Grid item xs={12} sm={6} lg={4} key={device.device_id}>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ y: -4 }}
                >
                    <Card sx={{
                        height: '100%',
                        background: isDark
                            ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
                            : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                        border: status.isActive ? '2px solid #10b981' :
                            isSimulation ? '2px solid #3b82f6' :
                                isDark ? '1px solid #475569' : '1px solid #e2e8f0',
                        transition: 'all 0.3s ease-in-out',
                        '&:hover': {
                            borderColor: '#2563eb',
                            boxShadow: isDark
                                ? '0 20px 40px rgba(37, 99, 235, 0.2)'
                                : '0 20px 40px rgba(37, 99, 235, 0.1)',
                            '& .device-actions': {
                                opacity: 1,
                                transform: 'translateY(0)'
                            }
                        }
                    }}>
                        <CardContent sx={{ p: 3 }}>
                            {(isTesting || isToggling) && (
                                <LinearProgress sx={{ mb: 2, borderRadius: 1, height: 4 }} />
                            )}

                            {/* Device Header */}
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
                                <Badge
                                    badgeContent={status.isActive ? '⚡' : ''}
                                    color="success"
                                >
                                    <Avatar sx={{
                                        width: 40,
                                        height: 40,
                                        background: `linear-gradient(135deg, ${
                                            deviceConfig.color === 'primary' ? '#2563eb' :
                                                deviceConfig.color === 'secondary' ? '#7c3aed' :
                                                    deviceConfig.color === 'success' ? '#10b981' : '#6b7280'
                                        } 0%, ${
                                            deviceConfig.color === 'primary' ? '#3b82f6' :
                                                deviceConfig.color === 'secondary' ? '#a78bfa' :
                                                    deviceConfig.color === 'success' ? '#34d399' : '#9ca3af'
                                        } 100%)`
                                    }}>
                                        <DeviceIcon fontSize="small" />
                                    </Avatar>
                                </Badge>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography variant="h6" sx={{
                                        fontWeight: 700,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        mb: 0.5
                                    }}>
                                        {device.device_name}
                                    </Typography>
                                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                        <Chip
                                            label={deviceConfig.label}
                                            color={deviceConfig.color}
                                            size="small"
                                            sx={{ fontWeight: 600 }}
                                        />
                                        <Chip
                                            icon={
                                                status.isActive ? <PlayArrowIcon sx={{ fontSize: 10 }} /> :
                                                    <StopIcon sx={{ fontSize: 10 }} />
                                            }
                                            label={status.isActive ? 'Running' : 'Stopped'}
                                            color={status.isActive ? 'success' : 'default'}
                                            size="small"
                                            sx={{ fontWeight: 600 }}
                                        />
                                    </Stack>
                                </Box>
                            </Box>

                            {/* Enhanced Status Display */}
                            <Box sx={{
                                p: 2,
                                borderRadius: 2,
                                background: status.isActive
                                    ? status.source === 'websocket_realtime'
                                        ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' // Red for live data
                                        : 'linear-gradient(135deg, #10b981 0%, #059669 100%)' // Green for backend active
                                    : '#6b7280',
                                color: 'white',
                                mb: 2
                            }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant="caption" sx={{ opacity: 0.9 }}>
                                        Data Collection Status
                                    </Typography>

                                    {/* WebSocket Connection Indicator */}
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <Box
                                            sx={{
                                                width: 8,
                                                height: 8,
                                                borderRadius: '50%',
                                                bgcolor: wsConnected ? '#10b981' : '#6b7280',
                                                animation: wsConnected ? 'pulse 2s infinite' : 'none'
                                            }}
                                        />
                                        <Typography variant="caption" sx={{ opacity: 0.8, fontSize: '0.6rem' }}>
                                            {wsConnected ? 'Live' : 'Offline'}
                                        </Typography>
                                    </Box>
                                </Box>

                                <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1 }}>
                                    {status.message}
                                </Typography>

                                <Typography variant="caption" sx={{ opacity: 0.8, display: 'block' }}>
                                    Source: {status.source}
                                    {status.wsTimestamp && ` • ${new Date(status.wsTimestamp).toLocaleTimeString()}`}
                                </Typography>

                                {/* Show live measurement activity */}
                                {(() => {
                                    const activity = getDeviceActivity(device.device_id);
                                    if (activity && activity.isRecent) {
                                        return (
                                            <Typography variant="caption" sx={{ opacity: 0.9, display: 'block', mt: 0.5 }}>
                                                📊 Live: {activity.tagCount} tags • Last: {new Date(activity.lastUpdate).toLocaleTimeString()}
                                            </Typography>
                                        );
                                    }
                                    return null;
                                })()}

                                {/* Debug info */}
                                <Typography variant="caption" sx={{ opacity: 0.6, display: 'block', fontSize: '0.6rem', mt: 0.5 }}>
                                    Backend: {device.data_collection_active} | {device.connection_status}
                                    {wsConnected && ` | WS: ${Object.keys(deviceStatuses).length} devices`}
                                </Typography>
                            </Box>

                            {/* Device Details */}
                            <Box sx={{ mb: 2 }}>
                                {!isSimulation && (
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                        <strong>Address:</strong> {device.ip_address || 'Not configured'}
                                        {device.port && `:${device.port}`}
                                    </Typography>
                                )}
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                    <strong>Type:</strong> {deviceConfig.label}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Created: {device.created_at ? new Date(device.created_at).toLocaleString() : 'N/A'}
                                </Typography>
                                {device.tag_count > 0 && (
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                        Tags: {device.tag_count}
                                    </Typography>
                                )}
                            </Box>

                            {/* Action Buttons */}
                            <Box className="device-actions" sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                opacity: 0,
                                transform: 'translateY(10px)',
                                transition: 'all 0.3s ease-in-out'
                            }}>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    {!isSimulation && (
                                        <Tooltip title="Test Connection">
                                            <IconButton
                                                size="small"
                                                onClick={e => { e.stopPropagation(); testDeviceConnection(device); }}
                                                disabled={isTesting || isToggling}
                                                sx={{
                                                    bgcolor: isDark ? 'rgba(34, 197, 94, 0.1)' : 'success.50',
                                                    color: 'success.main',
                                                    '&:hover': { bgcolor: isDark ? 'rgba(34, 197, 94, 0.2)' : 'success.100' }
                                                }}
                                            >
                                                {isTesting ?
                                                    <CircularProgress size={16} color="success" /> :
                                                    <TestConnectionIcon fontSize="small" />
                                                }
                                            </IconButton>
                                        </Tooltip>
                                    )}

                                    <Tooltip title={status.isActive ? 'Stop Data Collection' : 'Start Data Collection'}>
                                        <IconButton
                                            size="small"
                                            onClick={e => { e.stopPropagation(); toggleDataCollection(device); }}
                                            disabled={isToggling || isTesting}
                                            sx={{
                                                bgcolor: status.isActive
                                                    ? isDark ? 'rgba(239, 68, 68, 0.1)' : 'error.50'
                                                    : isDark ? 'rgba(34, 197, 94, 0.1)' : 'success.50',
                                                color: status.isActive ? 'error.main' : 'success.main',
                                                '&:hover': {
                                                    bgcolor: status.isActive
                                                        ? isDark ? 'rgba(239, 68, 68, 0.2)' : 'error.100'
                                                        : isDark ? 'rgba(34, 197, 94, 0.2)' : 'success.100'
                                                }
                                            }}
                                        >
                                            {isToggling ?
                                                <CircularProgress size={16} /> :
                                                status.isActive ? <StopIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />
                                            }
                                        </IconButton>
                                    </Tooltip>

                                    <Tooltip title="Edit Device">
                                        <IconButton
                                            size="small"
                                            onClick={e => { e.stopPropagation(); openEdit(device); }}
                                            disabled={isToggling}
                                            sx={{
                                                bgcolor: isDark ? 'rgba(59, 130, 246, 0.1)' : 'primary.50',
                                                color: 'primary.main',
                                                '&:hover': { bgcolor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'primary.100' }
                                            }}
                                        >
                                            <EditIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>

                                    <Tooltip title="Delete Device">
                                        <IconButton
                                            size="small"
                                            onClick={e => { e.stopPropagation(); setCurrent(device); setDeleteOpen(true); }}
                                            disabled={isToggling}
                                            sx={{
                                                bgcolor: isDark ? 'rgba(239, 68, 68, 0.1)' : 'error.50',
                                                color: 'error.main',
                                                '&:hover': { bgcolor: isDark ? 'rgba(239, 68, 68, 0.2)' : 'error.100' }
                                            }}
                                        >
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                </Box>

                                <Tooltip title="Configure Tags">
                                    <IconButton
                                        size="small"
                                        onClick={e => {
                                            e.stopPropagation();
                                            navigate(`/project/${projectId}/tags?device=${device.device_id}`);
                                        }}
                                        sx={{
                                            bgcolor: isDark ? 'rgba(14, 165, 233, 0.1)' : 'info.50',
                                            color: 'info.main',
                                            '&:hover': { bgcolor: isDark ? 'rgba(14, 165, 233, 0.2)' : 'info.100' }
                                        }}
                                    >
                                        <LabelIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                        </CardContent>
                    </Card>
                </motion.div>
            </Grid>
        );
    };

    return (
        <Box sx={{
            p: 4,
            background: isDark
                ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
                : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
            minHeight: '100vh',
            // Add CSS animations
            '& @keyframes pulse': {
                '0%': { opacity: 1 },
                '50%': { opacity: 0.5 },
                '100%': { opacity: 1 }
            }
        }}>
            {/* Header */}
            <Box sx={{ mb: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Avatar sx={{ width: 48, height: 48, background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)' }}>
                        <MemoryIcon />
                    </Avatar>
                    <Box>
                        <Typography variant="h3" sx={{
                            fontWeight: 800,
                            background: isDark
                                ? 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)'
                                : 'linear-gradient(135deg, #1e293b 0%, #475569 100%)',
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            color: 'transparent'
                        }}>
                            Industrial Devices
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            Professional SCADA device management with real-time monitoring
                        </Typography>
                    </Box>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                    <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                        <Badge badgeContent={filtered.length} color="primary">
                            <Chip icon={<MemoryIcon />} label="Devices" color="primary" sx={{ fontWeight: 600 }} />
                        </Badge>
                        <Badge badgeContent={filtered.filter(d => getDeviceStatus(d).isActive).length} color="success">
                            <Chip icon={<PlayArrowIcon />} label="Active" color="success" sx={{ fontWeight: 600 }} />
                        </Badge>
                        <Badge badgeContent={measurementCount} color="info">
                            <Chip icon={<TimelineIcon />} label="Live Data" color="info" sx={{ fontWeight: 600 }} />
                        </Badge>
                        <Chip
                            icon={<NetworkCheckIcon />}
                            label={wsConnected ?
                                `🔴 Real-time (${Object.keys(deviceStatuses).length} devices)` :
                                '⚫ Offline Mode'
                            }
                            color={wsConnected ? 'success' : 'default'}
                            sx={{
                                fontWeight: 600,
                                animation: wsConnected ? 'pulse 2s infinite' : 'none'
                            }}
                        />
                        {wsConnected && measurementCount > 0 && (
                            <Chip
                                icon={<TimelineIcon />}
                                label={`📊 ${measurementCount} Live Measurements`}
                                color="info"
                                sx={{ fontWeight: 600 }}
                            />
                        )}
                    </Stack>

                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        <Tooltip title="Manual Refresh">
                            <IconButton
                                onClick={() => fetchDevices(true, true)} // 🚀 Manual refresh - show loading
                                disabled={loading}
                                size="small"
                                sx={{
                                    bgcolor: isDark ? 'rgba(99, 102, 241, 0.1)' : 'primary.50',
                                    color: 'primary.main'
                                }}
                            >
                                {loading ? <CircularProgress size={16} /> : <RefreshIcon fontSize="small" />}
                            </IconButton>
                        </Tooltip>

                        <TextField
                            placeholder="Search devices..."
                            variant="outlined"
                            size="small"
                            sx={{
                                width: 300,
                                '& .MuiOutlinedInput-root': {
                                    background: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255,255,255,0.9)',
                                    backdropFilter: 'blur(10px)'
                                }
                            }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon color="primary" />
                                    </InputAdornment>
                                ),
                            }}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </Box>
                </Box>
            </Box>

            {/* Loading state - only shows for manual operations */}
            {loading && (
                <Box sx={{ mb: 2 }}>
                    <LinearProgress />
                </Box>
            )}

            {/* Devices Grid */}
            <Grid container spacing={3}>
                {filtered.length === 0 && !loading && (
                    <Grid item xs={12}>
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                            <Paper sx={{
                                p: 6,
                                textAlign: 'center',
                                background: isDark
                                    ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
                                    : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                                border: isDark ? '2px dashed #475569' : '2px dashed #cbd5e1'
                            }}>
                                <MemoryIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                                <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                                    No Devices Found
                                </Typography>
                                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                                    Add your first industrial device to start collecting data
                                </Typography>
                                <Button
                                    variant="contained"
                                    startIcon={<AddIcon />}
                                    onClick={() => { resetForm(); setAddOpen(true); }}
                                    sx={{ background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)', borderRadius: 2, px: 3 }}
                                >
                                    Add First Device
                                </Button>
                            </Paper>
                        </motion.div>
                    </Grid>
                )}

                {filtered.map((device, index) => renderDeviceCard(device, index))}
            </Grid>

            {/* Add Device FAB */}
            <Fab
                color="primary"
                onClick={() => { resetForm(); setAddOpen(true); }}
                sx={{
                    position: 'fixed',
                    bottom: 32,
                    right: 32,
                    zIndex: 1201,
                    background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                    boxShadow: '0 8px 32px rgba(37, 99, 235, 0.3)',
                    '&:hover': {
                        background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
                        transform: 'scale(1.1)'
                    }
                }}
            >
                <AddIcon />
            </Fab>

            {/* Add Device Dialog */}
            <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Add Industrial Device</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12}>
                            <TextField
                                label="Device Name"
                                value={deviceName}
                                onChange={e => setDeviceName(e.target.value)}
                                fullWidth
                                required
                                autoFocus
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <FormControl fullWidth>
                                <InputLabel>Device Type</InputLabel>
                                <Select
                                    value={deviceType}
                                    onChange={e => handleDeviceTypeChange(e.target.value)}
                                    label="Device Type"
                                >
                                    {deviceTypes.map(type => (
                                        <MenuItem key={type.value} value={type.value}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <type.icon fontSize="small" />
                                                {type.label}
                                            </Box>
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        {getDeviceTypeConfig(deviceType).requiresNetwork && (
                            <>
                                <Grid item xs={8}>
                                    <TextField
                                        label="IP Address"
                                        value={ipAddress}
                                        onChange={e => setIpAddress(e.target.value)}
                                        fullWidth
                                        placeholder="192.168.1.100"
                                    />
                                </Grid>
                                <Grid item xs={4}>
                                    <TextField
                                        label="Port"
                                        value={port}
                                        onChange={e => setPort(e.target.value)}
                                        type="number"
                                        fullWidth
                                    />
                                </Grid>
                                {deviceType === 'modbus' && (
                                    <Grid item xs={12}>
                                        <TextField
                                            label="Slave ID"
                                            value={slaveId}
                                            onChange={e => setSlaveId(e.target.value)}
                                            type="number"
                                            fullWidth
                                        />
                                    </Grid>
                                )}
                            </>
                        )}
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={() => setAddOpen(false)}>Cancel</Button>
                    <Button onClick={handleAddDevice} variant="contained">Add Device</Button>
                </DialogActions>
            </Dialog>

            {/* Edit Device Dialog */}
            <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Edit Device: {current?.device_name}</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12}>
                            <TextField
                                label="Device Name"
                                value={deviceName}
                                onChange={e => setDeviceName(e.target.value)}
                                fullWidth
                                required
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <FormControl fullWidth>
                                <InputLabel>Device Type</InputLabel>
                                <Select value={deviceType} onChange={e => handleDeviceTypeChange(e.target.value)} label="Device Type">
                                    {deviceTypes.map(type => (
                                        <MenuItem key={type.value} value={type.value}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <type.icon fontSize="small" />
                                                {type.label}
                                            </Box>
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        {getDeviceTypeConfig(deviceType).requiresNetwork && (
                            <>
                                <Grid item xs={8}>
                                    <TextField
                                        label="IP Address"
                                        value={ipAddress}
                                        onChange={e => setIpAddress(e.target.value)}
                                        fullWidth
                                    />
                                </Grid>
                                <Grid item xs={4}>
                                    <TextField
                                        label="Port"
                                        value={port}
                                        onChange={e => setPort(e.target.value)}
                                        type="number"
                                        fullWidth
                                    />
                                </Grid>
                                {deviceType === 'modbus' && (
                                    <Grid item xs={12}>
                                        <TextField
                                            label="Slave ID"
                                            value={slaveId}
                                            onChange={e => setSlaveId(e.target.value)}
                                            type="number"
                                            fullWidth
                                        />
                                    </Grid>
                                )}
                            </>
                        )}
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditOpen(false)}>Cancel</Button>
                    <Button onClick={handleEdit} variant="contained">Save Changes</Button>
                </DialogActions>
            </Dialog>

            {/* Delete Device Dialog */}
            <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="sm">
                <DialogTitle>Delete Device</DialogTitle>
                <DialogContent>
                    <Typography>Are you sure you want to delete device <strong>{current?.device_name}</strong>?</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        All associated tags and measurements will be permanently removed.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
                    <Button onClick={handleDelete} color="error" variant="contained">Delete Device</Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    severity={snackbar.severity}
                    sx={{ width: '100%', borderRadius: 3, fontWeight: 600 }}
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                >
                    {snackbar.msg}
                </Alert>
            </Snackbar>
        </Box>
    );
}