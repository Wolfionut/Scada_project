// src/pages/OperatorView.js - Professional SCADA Operator Interface
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box, Grid, Paper, Typography, Card, CardContent, Button, Chip,
    Alert, AlertTitle, Stack, Avatar, Badge, IconButton, Divider,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    LinearProgress, CircularProgress, Dialog, DialogTitle, DialogContent,
    DialogActions, TextField, FormControlLabel, Switch, Tooltip, AppBar,
    Toolbar, List, ListItem, ListItemIcon, ListItemText, ListItemSecondaryAction,
    Tabs, Tab, Select, MenuItem, FormControl, InputLabel, Accordion,
    AccordionSummary, AccordionDetails, Fab, Drawer
} from '@mui/material';
import {
    Dashboard as DashboardIcon,
    Warning as WarningIcon,
    CheckCircle as CheckCircleIcon,
    Error as ErrorIcon,
    TrendingUp as TrendingUpIcon,
    Visibility as VisibilityIcon,
    Refresh as RefreshIcon,
    Alarm as AlarmIcon,
    Check as CheckIcon,
    Speed as SpeedIcon,
    Thermostat as ThermostatIcon,
    Water as WaterIcon,
    ElectricBolt as ElectricBoltIcon,
    Settings as SettingsIcon,
    Wifi as WifiIcon,
    WifiOff as WifiOffIcon,
    PlayArrow as PlayArrowIcon,
    Stop as StopIcon,
    Memory as MemoryIcon,
    Timeline as TimelineIcon,
    ArrowBack as ArrowBackIcon,
    Assessment as AssessmentIcon,
    NotificationsActive as NotificationsActiveIcon,
    VolumeUp as VolumeUpIcon,
    VolumeOff as VolumeOffIcon,
    ExpandMore as ExpandMoreIcon,
    ViewModule as ViewModuleIcon,
    Notes as NotesIcon,
    Print as PrintIcon,
    Download as DownloadIcon,
    Search as SearchIcon,
    FilterList as FilterListIcon,
    History as HistoryIcon,
    TableChart as TableChartIcon
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { Stage, Layer, Line as KonvaLine } from 'react-konva';
import { useRealTimeData } from '../hooks/useWebSocket';
import { useTheme } from '../context/ThemeContext';
import symbolList from '../symbols/symbolList';
import axios from '../api/axios';

// Read-only Diagram Viewer Component
const ReadOnlyDiagramViewer = ({ elements, measurements, getTagDataByName }) => {
    const { isDark } = useTheme();
    const CANVAS_WIDTH = 800;
    const CANVAS_HEIGHT = 600;

    // Get device data for symbols
    const getDeviceData = useCallback((element) => {
        if (!element.linkedTag) return { connected: false, status: 'offline' };

        const measurementData = getTagDataByName(element.linkedTag);
        const tagValue = measurementData?.value;

        const baseData = {
            connected: !!measurementData,
            status: measurementData ? 'online' : 'offline'
        };

        switch (element.key) {
            case 'tank':
                return { ...baseData, fillLevel: tagValue !== undefined ? tagValue : 75 };
            case 'pump':
                return { ...baseData, speed: tagValue !== undefined ? tagValue : 1450 };
            case 'valve':
                return { ...baseData, position: tagValue !== undefined ? tagValue : 100 };
            case 'motor':
                return { ...baseData, rpm: tagValue !== undefined ? tagValue : 1450 };
            case 'sensor':
                return {
                    ...baseData,
                    value: tagValue,
                    unit: measurementData?.engineering_unit || '',
                    sensorType: element.sensorType || 'temperature'
                };
            default:
                return baseData;
        }
    }, [getTagDataByName]);

    const renderedElements = useMemo(() => {
        return elements.map(el => {
            if (el.visible === false) return null;

            if (el.type === 'symbol') {
                const sym = symbolList.find(s => s.key === el.key);
                if (!sym) return null;

                const Component = sym.icon;
                const deviceData = getDeviceData(el);

                return (
                    <Component
                        key={el.id}
                        id={el.id}
                        x={el.x}
                        y={el.y}
                        width={el.width}
                        height={el.height}
                        draggable={false} // READ-ONLY
                        selected={false}
                        onClick={() => {}} // No click handling
                        active={deviceData.connected}
                        status={deviceData.status}
                        fillLevel={deviceData.fillLevel}
                        speed={deviceData.speed}
                        position={deviceData.position}
                        rpm={deviceData.rpm}
                        sensorType={el.sensorType}
                        value={deviceData.value}
                        unit={deviceData.unit}
                        color={el.color}
                        displayName={el.displayName}
                        showValue={true} // Always show values for operators
                        showAlarmStatus={true}
                    />
                );
            }

            if (el.type === 'connection' && Array.isArray(el.points) && el.points.length === 2) {
                return (
                    <KonvaLine
                        key={el.id}
                        points={[
                            el.points[0].x, el.points[0].y,
                            el.points[1].x, el.points[1].y,
                        ]}
                        stroke={el.color || "#2563eb"}
                        strokeWidth={6}
                        lineCap="round"
                        lineJoin="round"
                    />
                );
            }
            return null;
        });
    }, [elements, getDeviceData]);

    return (
        <Paper sx={{
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
            borderRadius: 2,
            overflow: 'hidden',
            border: '2px solid #e2e8f0',
            background: '#ffffff'
        }}>
            <Stage width={CANVAS_WIDTH} height={CANVAS_HEIGHT}>
                <Layer>
                    {renderedElements}
                </Layer>
            </Stage>
        </Paper>
    );
};

// Real-time Tag Log Component
const RealTimeTagLog = ({ measurements, maxEntries = 100 }) => {
    const [logEntries, setLogEntries] = useState([]);
    const [filter, setFilter] = useState('');
    const logEndRef = useRef(null);

    useEffect(() => {
        // Add new measurements to log
        Object.values(measurements).forEach(measurement => {
            if (measurement.timestamp) {
                const entry = {
                    id: `${measurement.tag_name}_${measurement.timestamp}`,
                    timestamp: measurement.timestamp,
                    tagName: measurement.tag_name,
                    value: measurement.value,
                    unit: measurement.engineering_unit || '',
                    device: measurement.device_name,
                    quality: measurement.quality
                };

                setLogEntries(prev => {
                    // Avoid duplicates
                    if (prev.some(e => e.id === entry.id)) return prev;

                    const newEntries = [entry, ...prev].slice(0, maxEntries);
                    return newEntries;
                });
            }
        });
    }, [measurements, maxEntries]);

    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logEntries]);

    const filteredEntries = useMemo(() => {
        if (!filter) return logEntries;
        return logEntries.filter(entry =>
            entry.tagName.toLowerCase().includes(filter.toLowerCase()) ||
            entry.device.toLowerCase().includes(filter.toLowerCase())
        );
    }, [logEntries, filter]);

    return (
        <Card sx={{ height: 400 }}>
            <CardContent>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                    <HistoryIcon color="primary" />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Real-time Tag Log
                    </Typography>
                    <Box sx={{ flex: 1 }} />
                    <TextField
                        size="small"
                        placeholder="Filter tags..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        InputProps={{
                            startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                        }}
                    />
                </Stack>

                <Box sx={{ height: 300, overflow: 'auto' }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Time</TableCell>
                                <TableCell>Tag</TableCell>
                                <TableCell>Value</TableCell>
                                <TableCell>Device</TableCell>
                                <TableCell>Status</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredEntries.map((entry) => (
                                <TableRow key={entry.id}>
                                    <TableCell>
                                        <Typography variant="caption">
                                            {new Date(entry.timestamp).toLocaleTimeString()}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                            {entry.tagName}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">
                                            {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value} {entry.unit}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="caption" color="text.secondary">
                                            {entry.device}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={entry.quality || 'good'}
                                            color={entry.quality === 'good' ? 'success' : 'warning'}
                                            size="small"
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    <div ref={logEndRef} />
                </Box>
            </CardContent>
        </Card>
    );
};

// Trend Chart Component with configurable time period
const TrendChart = ({ measurements, timeRange = 5 }) => {
    const [selectedTags, setSelectedTags] = useState([]);
    const [chartData, setChartData] = useState([]);
    const [timeRangeMinutes, setTimeRangeMinutes] = useState(timeRange);

    const availableTags = useMemo(() => {
        return Object.values(measurements)
            .filter(m => m.tag_name && typeof m.value === 'number')
            .slice(0, 10); // Limit to 10 tags for performance
    }, [measurements]);

    useEffect(() => {
        if (selectedTags.length === 0 && availableTags.length > 0) {
            setSelectedTags([availableTags[0].tag_name]);
        }
    }, [availableTags, selectedTags.length]);

    useEffect(() => {
        // Generate trend data (in real implementation, this would come from your measurement history)
        const generateTrendData = () => {
            const now = new Date();
            const data = [];

            for (let i = timeRangeMinutes * 60; i >= 0; i -= 30) { // Every 30 seconds
                const timestamp = new Date(now.getTime() - i * 1000);
                const entry = {
                    time: timestamp.toLocaleTimeString(),
                    timestamp: timestamp.getTime()
                };

                selectedTags.forEach(tagName => {
                    const measurement = measurements[Object.keys(measurements).find(
                        key => measurements[key].tag_name === tagName
                    )];

                    if (measurement) {
                        // Simulate historical data with some variance
                        const baseValue = measurement.value;
                        const variance = (Math.random() - 0.5) * (baseValue * 0.1);
                        entry[tagName] = baseValue + variance;
                    }
                });

                data.push(entry);
            }

            return data.sort((a, b) => a.timestamp - b.timestamp);
        };

        setChartData(generateTrendData());
    }, [selectedTags, measurements, timeRangeMinutes]);

    const colors = ['#2563eb', '#dc2626', '#16a34a', '#ca8a04', '#9333ea'];

    return (
        <Card sx={{ height: 400 }}>
            <CardContent>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                    <TrendingUpIcon color="primary" />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Recent Trends
                    </Typography>
                    <Box sx={{ flex: 1 }} />
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel>Time Range</InputLabel>
                        <Select
                            value={timeRangeMinutes}
                            onChange={(e) => setTimeRangeMinutes(e.target.value)}
                            label="Time Range"
                        >
                            <MenuItem value={1}>1 minute</MenuItem>
                            <MenuItem value={2}>2 minutes</MenuItem>
                            <MenuItem value={5}>5 minutes</MenuItem>
                            <MenuItem value={10}>10 minutes</MenuItem>
                            <MenuItem value={15}>15 minutes</MenuItem>
                        </Select>
                    </FormControl>
                </Stack>

                <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Select tags to display:
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                        {availableTags.slice(0, 5).map((tag, index) => (
                            <Chip
                                key={tag.tag_name}
                                label={tag.tag_name}
                                variant={selectedTags.includes(tag.tag_name) ? 'filled' : 'outlined'}
                                color="primary"
                                size="small"
                                onClick={() => {
                                    setSelectedTags(prev =>
                                        prev.includes(tag.tag_name)
                                            ? prev.filter(t => t !== tag.tag_name)
                                            : [...prev, tag.tag_name].slice(0, 3) // Max 3 tags
                                    );
                                }}
                                sx={{
                                    backgroundColor: selectedTags.includes(tag.tag_name)
                                        ? colors[index % colors.length]
                                        : undefined
                                }}
                            />
                        ))}
                    </Stack>
                </Box>

                <Box sx={{ height: 250 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey="time"
                                tick={{ fontSize: 12 }}
                                interval="preserveStartEnd"
                            />
                            <YAxis tick={{ fontSize: 12 }} />
                            <RechartsTooltip />
                            {selectedTags.map((tagName, index) => (
                                <Line
                                    key={tagName}
                                    type="monotone"
                                    dataKey={tagName}
                                    stroke={colors[index % colors.length]}
                                    strokeWidth={2}
                                    dot={false}
                                    name={tagName}
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </Box>
            </CardContent>
        </Card>
    );
};

// Alarm Management Panel
const AlarmManagementPanel = ({ activeAlarms, acknowledgeAlarm, getUnacknowledgedAlarms }) => {
    const [ackDialogOpen, setAckDialogOpen] = useState(false);
    const [selectedAlarm, setSelectedAlarm] = useState(null);
    const [ackMessage, setAckMessage] = useState('');

    const unacknowledgedAlarms = getUnacknowledgedAlarms();

    const handleAcknowledgeAlarm = async () => {
        if (!selectedAlarm) return;

        try {
            const message = ackMessage || `Acknowledged by operator at ${new Date().toLocaleString()}`;
            await acknowledgeAlarm(selectedAlarm.rule_id, message);
            setAckDialogOpen(false);
            setSelectedAlarm(null);
            setAckMessage('');
        } catch (error) {
            console.error('Error acknowledging alarm:', error);
        }
    };

    const getAlarmColor = (severity) => {
        switch (severity) {
            case 'critical': return 'error';
            case 'warning': return 'warning';
            case 'info': return 'info';
            default: return 'default';
        }
    };

    return (
        <Card sx={{ height: 400 }}>
            <CardContent>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                    <AlarmIcon color="error" />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Alarm Management
                    </Typography>
                    <Badge badgeContent={unacknowledgedAlarms.length} color="error">
                        <Chip
                            label={`${activeAlarms.length} Active`}
                            color={activeAlarms.length > 0 ? 'error' : 'success'}
                            size="small"
                        />
                    </Badge>
                </Stack>

                <Box sx={{ height: 300, overflow: 'auto' }}>
                    {activeAlarms.length === 0 ? (
                        <Box sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '100%',
                            flexDirection: 'column'
                        }}>
                            <CheckCircleIcon sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
                            <Typography variant="h6" color="success.main">
                                No Active Alarms
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                All systems operating normally
                            </Typography>
                        </Box>
                    ) : (
                        <Stack spacing={1}>
                            {activeAlarms.map((alarm) => (
                                <motion.div
                                    key={alarm.rule_id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    layout
                                >
                                    <Paper sx={{
                                        p: 2,
                                        border: `1px solid ${
                                            alarm.severity === 'critical' ? '#ef4444' :
                                                alarm.severity === 'warning' ? '#f59e0b' : '#6b7280'
                                        }`,
                                        backgroundColor: alarm.severity === 'critical' ? 'rgba(239, 68, 68, 0.05)' :
                                            alarm.severity === 'warning' ? 'rgba(245, 158, 11, 0.05)' :
                                                'rgba(107, 114, 128, 0.05)'
                                    }}>
                                        <Stack direction="row" alignItems="center" spacing={2}>
                                            <Chip
                                                label={alarm.severity.toUpperCase()}
                                                color={getAlarmColor(alarm.severity)}
                                                size="small"
                                                sx={{ fontWeight: 600 }}
                                            />
                                            <Box sx={{ flex: 1 }}>
                                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                                    {alarm.rule_name}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    {alarm.tag_name} • {alarm.device_name}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    Value: {alarm.trigger_value} • Threshold: {alarm.threshold}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {new Date(alarm.triggered_at).toLocaleString()}
                                                </Typography>
                                            </Box>
                                            {!alarm.acknowledged_at && (
                                                <Button
                                                    variant="contained"
                                                    color="warning"
                                                    size="small"
                                                    startIcon={<CheckIcon />}
                                                    onClick={() => {
                                                        setSelectedAlarm(alarm);
                                                        setAckDialogOpen(true);
                                                    }}
                                                >
                                                    Acknowledge
                                                </Button>
                                            )}
                                        </Stack>
                                    </Paper>
                                </motion.div>
                            ))}
                        </Stack>
                    )}
                </Box>
            </CardContent>

            {/* Acknowledge Dialog */}
            <Dialog open={ackDialogOpen} onClose={() => setAckDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    Acknowledge Alarm: {selectedAlarm?.rule_name}
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Please provide an acknowledgment message for this alarm.
                    </Typography>
                    <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label="Acknowledgment Message"
                        value={ackMessage}
                        onChange={(e) => setAckMessage(e.target.value)}
                        placeholder="Enter reason for acknowledgment or any relevant notes..."
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAckDialogOpen(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleAcknowledgeAlarm} variant="contained" color="warning">
                        Acknowledge Alarm
                    </Button>
                </DialogActions>
            </Dialog>
        </Card>
    );
};

// Main Operator View Component
export default function OperatorView() {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const { isDark } = useTheme();

    // Real-time data
    const {
        measurements,
        deviceStatuses,
        activeAlarms,
        alarmSummary,
        isConnected,
        acknowledgeAlarm,
        getUnacknowledgedAlarms,
        measurementCount,
        deviceCount,
        alarmCount,
        getTagDataByName
    } = useRealTimeData(projectId);

    // Local state
    const [project, setProject] = useState(null);
    const [devices, setDevices] = useState([]);
    const [tags, setTags] = useState([]);
    const [diagramElements, setDiagramElements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(0);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [drawerOpen, setDrawerOpen] = useState(false);

    // Load project data
    useEffect(() => {
        if (!projectId) return;

        const loadData = async () => {
            try {
                setLoading(true);

                // Load project info
                const projectRes = await axios.get(`/projects/${projectId}`);
                setProject(projectRes.data);

                // Load devices
                const devicesRes = await axios.get(`/devices/project/${projectId}`);
                setDevices(devicesRes.data);

                // Load all tags
                const tagPromises = devicesRes.data.map(device =>
                    axios.get(`/tags/device/${device.device_id}`)
                );
                const tagResponses = await Promise.all(tagPromises);
                const allTags = tagResponses.flatMap(response => response.data);
                setTags(allTags);

                // Load diagram
                try {
                    const diagramRes = await axios.get(`/diagrams/project/${projectId}`);
                    let diagramData = [];
                    if (diagramRes.data.diagram_json) {
                        if (typeof diagramRes.data.diagram_json === 'string') {
                            diagramData = JSON.parse(diagramRes.data.diagram_json);
                        } else if (Array.isArray(diagramRes.data.diagram_json)) {
                            diagramData = diagramRes.data.diagram_json;
                        }
                    }
                    setDiagramElements(diagramData);
                } catch (diagramError) {
                    console.log('No diagram found for this project');
                }

            } catch (error) {
                console.error('Error loading operator data:', error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [projectId]);

    // Get device summary
    const deviceSummary = useMemo(() => {
        const running = Object.values(deviceStatuses).filter(d => d.status === 'running').length;
        const total = devices.length;
        const offline = total - running;

        return { running, offline, total };
    }, [deviceStatuses, devices.length]);

    if (loading) {
        return (
            <Box sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                background: isDark ? '#0f172a' : '#f8fafc'
            }}>
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                    <DashboardIcon sx={{ fontSize: 64, color: 'primary.main' }} />
                </motion.div>
                <Typography variant="h6" sx={{ ml: 2 }}>
                    Loading Operator View...
                </Typography>
            </Box>
        );
    }

    return (
        <Box sx={{
            minHeight: '100vh',
            background: isDark
                ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
                : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)'
        }}>
            {/* Header */}
            <AppBar
                position="static"
                elevation={0}
                sx={{
                    background: isDark
                        ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
                        : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                    color: 'text.primary',
                    borderBottom: `1px solid ${isDark ? '#475569' : '#e2e8f0'}`
                }}
            >
                <Toolbar>
                    <IconButton
                        onClick={() => navigate(`/project/${projectId}`)}
                        sx={{ mr: 2 }}
                    >
                        <ArrowBackIcon />
                    </IconButton>

                    <Avatar sx={{
                        width: 40,
                        height: 40,
                        mr: 2,
                        background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)'
                    }}>
                        <DashboardIcon />
                    </Avatar>

                    <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h5" sx={{ fontWeight: 700 }}>
                            Operator View - {project?.project_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Process Monitoring & Control Interface
                        </Typography>
                    </Box>

                    {/* Status Indicators */}
                    <Stack direction="row" spacing={2} sx={{ mr: 3 }}>
                        <Chip
                            icon={isConnected ? <WifiIcon /> : <WifiOffIcon />}
                            label={isConnected ? 'Connected' : 'Offline'}
                            color={isConnected ? 'success' : 'error'}
                            sx={{ fontWeight: 600 }}
                        />

                        {alarmCount > 0 && (
                            <Badge badgeContent={alarmCount} color="error">
                                <Chip
                                    icon={<AlarmIcon />}
                                    label="Active Alarms"
                                    color="error"
                                    sx={{ fontWeight: 600 }}
                                />
                            </Badge>
                        )}
                    </Stack>

                    {/* Controls */}
                    <IconButton
                        onClick={() => setSoundEnabled(!soundEnabled)}
                        color={soundEnabled ? 'primary' : 'default'}
                    >
                        {soundEnabled ? <VolumeUpIcon /> : <VolumeOffIcon />}
                    </IconButton>

                    <FormControlLabel
                        control={
                            <Switch
                                checked={autoRefresh}
                                onChange={(e) => setAutoRefresh(e.target.checked)}
                                size="small"
                            />
                        }
                        label="Auto Refresh"
                        sx={{ ml: 2 }}
                    />
                </Toolbar>
            </AppBar>

            {/* Main Content */}
            <Box sx={{ p: 3 }}>
                {/* Quick Stats Row */}
                <Grid container spacing={3} sx={{ mb: 3 }}>
                    <Grid item xs={12} md={3}>
                        <Card sx={{
                            background: isDark
                                ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
                                : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                            border: `2px solid ${isConnected ? '#10b981' : '#ef4444'}`
                        }}>
                            <CardContent>
                                <Stack direction="row" alignItems="center" spacing={2}>
                                    <Avatar sx={{ bgcolor: isConnected ? 'success.main' : 'error.main' }}>
                                        {isConnected ? <CheckCircleIcon /> : <ErrorIcon />}
                                    </Avatar>
                                    <Box>
                                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                            System Status
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {isConnected ? 'Online' : 'Offline'}
                                        </Typography>
                                    </Box>
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} md={3}>
                        <Card sx={{
                            background: isDark
                                ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
                                : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                            border: alarmCount > 0 ? '2px solid #ef4444' : '2px solid #10b981'
                        }}>
                            <CardContent>
                                <Stack direction="row" alignItems="center" spacing={2}>
                                    <Avatar sx={{ bgcolor: alarmCount > 0 ? 'error.main' : 'success.main' }}>
                                        <AlarmIcon />
                                    </Avatar>
                                    <Box>
                                        <Typography variant="h4" sx={{ fontWeight: 800 }}>
                                            {alarmCount}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Active Alarms
                                        </Typography>
                                    </Box>
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} md={3}>
                        <Card sx={{
                            background: isDark
                                ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
                                : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                            border: '2px solid #3b82f6'
                        }}>
                            <CardContent>
                                <Stack direction="row" alignItems="center" spacing={2}>
                                    <Avatar sx={{ bgcolor: 'info.main' }}>
                                        <MemoryIcon />
                                    </Avatar>
                                    <Box>
                                        <Typography variant="h4" sx={{ fontWeight: 800 }}>
                                            {deviceSummary.running}/{deviceSummary.total}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Devices Running
                                        </Typography>
                                    </Box>
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} md={3}>
                        <Card sx={{
                            background: isDark
                                ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
                                : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                            border: '2px solid #f59e0b'
                        }}>
                            <CardContent>
                                <Stack direction="row" alignItems="center" spacing={2}>
                                    <Avatar sx={{ bgcolor: 'warning.main' }}>
                                        <TimelineIcon />
                                    </Avatar>
                                    <Box>
                                        <Typography variant="h4" sx={{ fontWeight: 800 }}>
                                            {measurementCount}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Live Data Points
                                        </Typography>
                                    </Box>
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>

                {/* Main Content Tabs */}
                <Paper sx={{ mb: 3 }}>
                    <Tabs
                        value={activeTab}
                        onChange={(e, newValue) => setActiveTab(newValue)}
                        sx={{ borderBottom: 1, borderColor: 'divider' }}
                    >
                        <Tab icon={<ViewModuleIcon />} label="Process Diagram" />
                        <Tab icon={<TrendingUpIcon />} label="Trends" />
                        <Tab icon={<AlarmIcon />} label="Alarms" />
                        <Tab icon={<HistoryIcon />} label="Data Log" />
                    </Tabs>
                </Paper>

                {/* Tab Content */}
                <AnimatePresence mode="wait">
                    {activeTab === 0 && (
                        <motion.div
                            key="diagram"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <Grid container spacing={3}>
                                <Grid item xs={12} lg={8}>
                                    <Card>
                                        <CardContent>
                                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                                                Process Diagram - Read Only
                                            </Typography>
                                            {diagramElements.length > 0 ? (
                                                <ReadOnlyDiagramViewer
                                                    elements={diagramElements}
                                                    measurements={measurements}
                                                    getTagDataByName={getTagDataByName}
                                                />
                                            ) : (
                                                <Box sx={{
                                                    height: 400,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    border: '2px dashed #e2e8f0',
                                                    borderRadius: 2
                                                }}>
                                                    <Stack alignItems="center" spacing={2}>
                                                        <ViewModuleIcon sx={{ fontSize: 64, color: 'text.disabled' }} />
                                                        <Typography variant="h6" color="text.secondary">
                                                            No Process Diagram Available
                                                        </Typography>
                                                        <Typography variant="body2" color="text.secondary">
                                                            Create a diagram in the editor to view it here
                                                        </Typography>
                                                    </Stack>
                                                </Box>
                                            )}
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={12} lg={4}>
                                    <AlarmManagementPanel
                                        activeAlarms={activeAlarms}
                                        acknowledgeAlarm={acknowledgeAlarm}
                                        getUnacknowledgedAlarms={getUnacknowledgedAlarms}
                                    />
                                </Grid>
                            </Grid>
                        </motion.div>
                    )}

                    {activeTab === 1 && (
                        <motion.div
                            key="trends"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <TrendChart measurements={measurements} />
                        </motion.div>
                    )}

                    {activeTab === 2 && (
                        <motion.div
                            key="alarms"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <AlarmManagementPanel
                                activeAlarms={activeAlarms}
                                acknowledgeAlarm={acknowledgeAlarm}
                                getUnacknowledgedAlarms={getUnacknowledgedAlarms}
                            />
                        </motion.div>
                    )}

                    {activeTab === 3 && (
                        <motion.div
                            key="log"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <RealTimeTagLog measurements={measurements} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </Box>
        </Box>
    );
}