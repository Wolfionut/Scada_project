// src/components/RealTimeDataDisplay.js - Live SCADA Data Component
import React, { useState, useEffect } from 'react';
import {
    Card, CardContent, Typography, Box, Grid, Chip, Avatar, Stack,
    LinearProgress, IconButton, Tooltip, Alert, Paper, Divider, Button
} from '@mui/material';
import {
    Speed as SpeedIcon,
    Thermostat as ThermostatIcon,
    Water as WaterIcon,
    Electric as ElectricIcon,
    Memory as MemoryIcon,
    Wifi as WifiIcon,
    WifiOff as WifiOffIcon,
    Warning as WarningIcon,
    CheckCircle as CheckCircleIcon,
    Refresh as RefreshIcon,
    TrendingUp as TrendingUpIcon,
    Timeline as TimelineIcon,
    Router as RouterIcon,
    Cable as CableIcon,
    Computer as SimulationIcon,
    Circle as CircleIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useRealTimeData } from '../hooks/useWebSocket';

// Individual measurement card component with enhanced animations
function EnhancedMeasurementCard({ measurement, deviceStatus, deviceType }) {
    const [prevValue, setPrevValue] = useState(measurement.value);
    const [trend, setTrend] = useState('stable');
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        if (prevValue !== null && measurement.value !== prevValue) {
            setIsUpdating(true);

            if (measurement.value > prevValue) {
                setTrend('up');
            } else if (measurement.value < prevValue) {
                setTrend('down');
            } else {
                setTrend('stable');
            }

            setPrevValue(measurement.value);

            // Reset updating animation after 1 second
            setTimeout(() => setIsUpdating(false), 1000);
        }
    }, [measurement.value, prevValue]);

    const getIcon = (tagName) => {
        const name = tagName.toLowerCase();
        if (name.includes('temp')) return ThermostatIcon;
        if (name.includes('flow') || name.includes('level')) return WaterIcon;
        if (name.includes('volt') || name.includes('current') || name.includes('power')) return ElectricIcon;
        if (name.includes('speed') || name.includes('rpm')) return SpeedIcon;
        return MemoryIcon;
    };

    const getColor = (value, tagName) => {
        const name = tagName.toLowerCase();
        if (name.includes('temp')) {
            if (value > 80) return 'error';
            if (value > 60) return 'warning';
            return 'success';
        }
        if (name.includes('pressure')) {
            if (value > 10) return 'error';
            if (value > 7) return 'warning';
            return 'success';
        }
        return 'primary';
    };

    const formatValue = (value, tagName) => {
        const name = tagName.toLowerCase();
        if (name.includes('temp')) return `${value.toFixed(1)}°C`;
        if (name.includes('pressure')) return `${value.toFixed(2)} bar`;
        if (name.includes('flow')) return `${value.toFixed(1)} L/min`;
        if (name.includes('level')) return `${value.toFixed(1)}%`;
        if (name.includes('rpm')) return `${Math.round(value)} RPM`;
        if (name.includes('volt')) return `${value.toFixed(1)} V`;
        if (name.includes('current')) return `${value.toFixed(2)} A`;
        if (name.includes('power')) return `${Math.round(value)} W`;
        return value.toFixed(2);
    };

    const getDeviceIcon = (type) => {
        switch (type?.toLowerCase()) {
            case 'modbus': return RouterIcon;
            case 'mqtt': return CableIcon;
            case 'simulation': return SimulationIcon;
            default: return MemoryIcon;
        }
    };

    const Icon = getIcon(measurement.tag_name);
    const DeviceIcon = getDeviceIcon(deviceType);
    const color = getColor(measurement.value, measurement.tag_name);
    const formattedValue = formatValue(measurement.value, measurement.tag_name);
    const isOnline = deviceStatus === 'connected' || deviceStatus === 'simulating';

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            whileHover={{ scale: 1.02 }}
            layout
        >
            <Card
                sx={{
                    height: '100%',
                    border: `2px solid ${isOnline ? 'transparent' : '#f44336'}`,
                    background: isOnline
                        ? 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)'
                        : 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)',
                    position: 'relative',
                    overflow: 'visible',
                    boxShadow: isUpdating ? '0 0 20px rgba(37, 99, 235, 0.5)' : undefined,
                    transition: 'all 0.3s ease-in-out'
                }}
            >
                {/* Update animation overlay */}
                {isUpdating && (
                    <Box sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: 4,
                        background: 'linear-gradient(90deg, #2563eb, #10b981)',
                        borderRadius: '4px 4px 0 0',
                        zIndex: 2
                    }} />
                )}

                {/* Protocol indicator */}
                <Box sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    zIndex: 1
                }}>
                    <Stack direction="row" spacing={0.5}>
                        <Tooltip title={`Device: ${measurement.device_name} (${deviceType})`}>
                            <Avatar sx={{
                                width: 20,
                                height: 20,
                                bgcolor: isOnline ? 'primary.main' : 'error.main'
                            }}>
                                <DeviceIcon sx={{ fontSize: 12 }} />
                            </Avatar>
                        </Tooltip>
                        <Tooltip title={isOnline ? 'Device Online' : 'Device Offline'}>
                            <Avatar sx={{
                                width: 20,
                                height: 20,
                                bgcolor: isOnline ? 'success.main' : 'error.main'
                            }}>
                                {isOnline ? <WifiIcon sx={{ fontSize: 12 }} /> : <WifiOffIcon sx={{ fontSize: 12 }} />}
                            </Avatar>
                        </Tooltip>
                    </Stack>
                </Box>

                <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <Avatar sx={{
                            bgcolor: `${color}.main`,
                            width: 48,
                            height: 48
                        }}>
                            <Icon />
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography
                                variant="h6"
                                sx={{
                                    fontWeight: 700,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                {measurement.tag_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {measurement.device_name}
                            </Typography>
                        </Box>
                    </Box>

                    {/* Value display with animation */}
                    <Box sx={{ textAlign: 'center', mb: 2 }}>
                        <motion.div
                            key={measurement.value}
                            initial={{ scale: 1.1, opacity: 0.8 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.2 }}
                        >
                            <Typography
                                variant="h3"
                                sx={{
                                    fontWeight: 800,
                                    color: `${color}.main`,
                                    lineHeight: 1
                                }}
                            >
                                {formattedValue}
                            </Typography>
                        </motion.div>
                    </Box>

                    {/* Trend indicator */}
                    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                        <Chip
                            icon={
                                trend === 'up' ? <TrendingUpIcon sx={{ transform: 'rotate(0deg)' }} /> :
                                    trend === 'down' ? <TrendingUpIcon sx={{ transform: 'rotate(180deg)' }} /> :
                                        <TimelineIcon />
                            }
                            label={trend.toUpperCase()}
                            color={
                                trend === 'up' ? 'success' :
                                    trend === 'down' ? 'error' :
                                        'default'
                            }
                            size="small"
                            sx={{
                                fontWeight: 600,
                                animation: isUpdating ? 'pulse 1s' : 'none'
                            }}
                        />
                    </Box>

                    {/* Timestamp with relative time */}
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'block', textAlign: 'center' }}
                    >
                        {new Date(measurement.timestamp).toLocaleTimeString()}
                        <Chip
                            label="LIVE"
                            size="small"
                            color="success"
                            sx={{
                                ml: 1,
                                fontSize: '0.6rem',
                                height: 16,
                                animation: 'pulse 2s infinite'
                            }}
                        />
                    </Typography>
                </CardContent>
            </Card>
        </motion.div>
    );
}

// Enhanced connection status summary component
function EnhancedConnectionSummary({ isConnected, deviceStatuses, measurementCount, devices }) {
    const connectedDevices = Object.values(deviceStatuses).filter(s =>
        s.status === 'connected' || s.status === 'simulating'
    ).length;
    const totalDevices = Object.keys(deviceStatuses).length;

    const getProtocolCounts = () => {
        const counts = { modbus: 0, mqtt: 0, simulation: 0 };
        devices.forEach(device => {
            if (counts.hasOwnProperty(device.device_type)) {
                counts[device.device_type]++;
            }
        });
        return counts;
    };

    const protocolCounts = getProtocolCounts();

    return (
        <Paper sx={{ p: 3, mb: 3, borderRadius: 3, position: 'relative', overflow: 'hidden' }}>
            {/* Animated background */}
            <Box sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: isConnected
                    ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(37, 99, 235, 0.05) 100%)'
                    : 'linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(245, 158, 11, 0.05) 100%)',
                zIndex: 0
            }} />

            <Box sx={{ position: 'relative', zIndex: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
                    Real-time SCADA Status
                    <Chip
                        icon={<CircleIcon sx={{ fontSize: 12, animation: isConnected ? 'pulse 2s infinite' : 'none' }} />}
                        label={isConnected ? 'LIVE' : 'OFFLINE'}
                        color={isConnected ? 'success' : 'error'}
                        size="small"
                        sx={{ ml: 2, fontWeight: 600 }}
                    />
                </Typography>

                <Grid container spacing={3}>
                    <Grid item xs={12} sm={6} md={3}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar sx={{
                                bgcolor: isConnected ? 'success.main' : 'error.main',
                                width: 40,
                                height: 40
                            }}>
                                {isConnected ? <WifiIcon /> : <WifiOffIcon />}
                            </Avatar>
                            <Box>
                                <Typography variant="body2" color="text.secondary">
                                    WebSocket Connection
                                </Typography>
                                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                    {isConnected ? 'Connected' : 'Disconnected'}
                                </Typography>
                            </Box>
                        </Box>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar sx={{
                                bgcolor: connectedDevices > 0 ? 'success.main' : 'warning.main',
                                width: 40,
                                height: 40
                            }}>
                                <MemoryIcon />
                            </Avatar>
                            <Box>
                                <Typography variant="body2" color="text.secondary">
                                    Devices Online
                                </Typography>
                                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                    {connectedDevices} / {totalDevices}
                                </Typography>
                                <LinearProgress
                                    variant="determinate"
                                    value={totalDevices > 0 ? (connectedDevices / totalDevices) * 100 : 0}
                                    sx={{ mt: 0.5, height: 4, borderRadius: 2 }}
                                    color={connectedDevices === totalDevices ? 'success' : 'warning'}
                                />
                            </Box>
                        </Box>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar sx={{
                                bgcolor: measurementCount > 0 ? 'primary.main' : 'grey.500',
                                width: 40,
                                height: 40
                            }}>
                                <TimelineIcon />
                            </Avatar>
                            <Box>
                                <Typography variant="body2" color="text.secondary">
                                    Live Data Points
                                </Typography>
                                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                    {measurementCount}
                                </Typography>
                            </Box>
                        </Box>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                        <Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                Protocol Distribution
                            </Typography>
                            <Stack direction="row" spacing={1}>
                                <Tooltip title={`${protocolCounts.modbus} Modbus devices`}>
                                    <Chip
                                        icon={<RouterIcon />}
                                        label={protocolCounts.modbus}
                                        size="small"
                                        color="primary"
                                    />
                                </Tooltip>
                                <Tooltip title={`${protocolCounts.mqtt} MQTT devices`}>
                                    <Chip
                                        icon={<CableIcon />}
                                        label={protocolCounts.mqtt}
                                        size="small"
                                        color="secondary"
                                    />
                                </Tooltip>
                                <Tooltip title={`${protocolCounts.simulation} Simulation devices`}>
                                    <Chip
                                        icon={<SimulationIcon />}
                                        label={protocolCounts.simulation}
                                        size="small"
                                        color="success"
                                    />
                                </Tooltip>
                            </Stack>
                        </Box>
                    </Grid>
                </Grid>
            </Box>
        </Paper>
    );
}

// Main real-time data display component
export default function RealTimeDataDisplay({ projectId }) {
    const {
        isConnected,
        measurements,
        deviceStatuses,
        activeAlarms,
        measurementCount
    } = useRealTimeData(projectId);

    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch device information
    useEffect(() => {
        const fetchDevices = async () => {
            try {
                setLoading(true);
                const response = await fetch(`/api/devices/project/${projectId}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token') || sessionStorage.getItem('token')}`
                    }
                });

                if (response.ok) {
                    const devicesData = await response.json();
                    setDevices(devicesData);
                }
            } catch (error) {
                console.error('Error fetching devices:', error);
            } finally {
                setLoading(false);
            }
        };

        if (projectId) {
            fetchDevices();
        }
    }, [projectId]);

    // Convert measurements object to array for display
    const latestMeasurements = Object.entries(measurements).map(([tagId, data]) => ({
        tag_id: tagId,
        ...data
    })).slice(0, 20); // Show latest 20 measurements

    if (!projectId) {
        return (
            <Alert severity="info" sx={{ borderRadius: 3 }}>
                Select a project to view real-time data
            </Alert>
        );
    }

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box>
            {/* Enhanced Connection Summary */}
            <EnhancedConnectionSummary
                isConnected={isConnected}
                deviceStatuses={deviceStatuses}
                measurementCount={measurementCount}
                devices={devices}
            />

            {/* Active Alarms */}
            {activeAlarms.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <Alert
                        severity="warning"
                        sx={{ mb: 3, borderRadius: 3 }}
                        icon={<WarningIcon />}
                    >
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                            {activeAlarms.length} Active Alarm{activeAlarms.length > 1 ? 's' : ''}
                        </Typography>
                        <Typography variant="body2">
                            Latest: {activeAlarms[0]?.message || 'Check alarms page for details'}
                        </Typography>
                    </Alert>
                </motion.div>
            )}

            {/* Controls */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    Live Measurements
                </Typography>
                <Stack direction="row" spacing={2} alignItems="center">
                    <Chip
                        label={`${latestMeasurements.length} Active Tags`}
                        color="primary"
                        sx={{ fontWeight: 600 }}
                    />
                    <Tooltip title="Refresh Data">
                        <IconButton
                            onClick={() => window.location.reload()}
                            color="primary"
                        >
                            <RefreshIcon />
                        </IconButton>
                    </Tooltip>
                </Stack>
            </Box>

            {/* No Data Message */}
            {latestMeasurements.length === 0 && (
                <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3 }}>
                    <TimelineIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                        No Real-time Data Available
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        {!isConnected
                            ? 'WebSocket connection is offline'
                            : 'Start data collection on your devices to see live measurements'
                        }
                    </Typography>
                    {!isConnected && (
                        <Alert severity="warning" sx={{ mt: 2 }}>
                            Check your WebSocket connection and ensure the backend server is running
                        </Alert>
                    )}
                    <Button
                        variant="contained"
                        onClick={() => window.location.reload()}
                        sx={{ mt: 2 }}
                    >
                        Retry Connection
                    </Button>
                </Paper>
            )}

            {/* Enhanced Measurement Cards Grid */}
            <AnimatePresence>
                <Grid container spacing={3}>
                    {latestMeasurements.map((measurement) => {
                        const device = devices.find(d => d.device_name === measurement.device_name);
                        const deviceStatus = deviceStatuses[device?.device_id]?.status || 'unknown';

                        return (
                            <Grid item xs={12} sm={6} md={4} lg={3} key={measurement.tag_id}>
                                <EnhancedMeasurementCard
                                    measurement={measurement}
                                    deviceStatus={deviceStatus}
                                    deviceType={device?.device_type}
                                />
                            </Grid>
                        );
                    })}
                </Grid>
            </AnimatePresence>

            {/* Real-time Updates Indicator */}
            {isConnected && measurementCount > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        position: 'fixed',
                        bottom: 20,
                        left: 20,
                        zIndex: 1000
                    }}
                >
                    <Chip
                        icon={<CheckCircleIcon />}
                        label={`Live Data Active • ${devices.length} devices`}
                        color="success"
                        sx={{
                            fontWeight: 600,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            animation: 'pulse 2s infinite',
                            backdropFilter: 'blur(10px)'
                        }}
                    />
                </motion.div>
            )}

            <style jsx>{`
                @keyframes pulse {
                    0% { opacity: 1; }
                    50% { opacity: 0.7; }
                    100% { opacity: 1; }
                }
            `}</style>
        </Box>
    );
}