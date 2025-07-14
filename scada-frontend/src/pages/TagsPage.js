// src/pages/TagsPage.js - Fixed Version with Project-Level API
import React, { useEffect, useState } from 'react';
import {
    Grid, Paper, Box, Typography, IconButton, Tooltip, Chip, Fab, Dialog,
    DialogTitle, DialogContent, DialogActions, TextField, Button, Snackbar, Alert,
    InputAdornment, Avatar, Stack, LinearProgress, Switch, FormControlLabel,
    MenuItem, FormControl, InputLabel, Select, Accordion, AccordionSummary,
    AccordionDetails, Divider, Badge, Card, CardContent, keyframes
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Label as LabelIcon,
    Search as SearchIcon,
    ShowChart as ShowChartIcon,
    Circle as CircleIcon,
    Speed as SpeedIcon,
    Settings as SettingsIcon,
    Alarm as AlarmIcon,
    TrendingUp as TrendingUpIcon,
    TrendingDown as TrendingDownIcon,
    TrendingFlat as TrendingFlatIcon,
    ExpandMore as ExpandMoreIcon,
    Engineering as EngineeringIcon,
    Memory as MemoryIcon,
    Visibility as VisibilityIcon,
    Timeline as TimelineIcon,
    CheckCircle as CheckCircleIcon,
    Error as ErrorIcon,
    Warning as WarningIcon,
    PlayArrow as PlayArrowIcon,
    Stop as StopIcon,
    Refresh as RefreshIcon,
    ArrowBack as ArrowBackIcon,
    Lock as LockIcon,
    Scale as ScaleIcon
} from '@mui/icons-material';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import axios from '../api/axios';
import { motion } from 'framer-motion';
import { useRealTimeData } from '../hooks/useWebSocket';

// Animation for alarm pulsing
const pulse = keyframes`
    0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
    70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
    100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
`;

export default function TagsPage() {
    const { projectId } = useParams();
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const deviceId = searchParams.get('device');
    const navigate = useNavigate();
    const { isDark } = useTheme();

    // WebSocket real-time data
    const { measurements, isConnected, getTagValue, getTagTimestamp } = useRealTimeData(projectId);

    // State
    const [tags, setTags] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [search, setSearch] = useState('');
    const [addOpen, setAddOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, msg: '', severity: 'success' });
    const [current, setCurrent] = useState(null);
    const [device, setDevice] = useState(null);
    const [groupBy, setGroupBy] = useState('none');
    const [simulationStatus, setSimulationStatus] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // State for devices list (for device selection in modal)
    const [devices, setDevices] = useState([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState('');

    // Basic tag form state
    const [tagName, setTagName] = useState('');
    const [tagType, setTagType] = useState('analog');
    const [address, setAddress] = useState('');
    const [updateInterval, setUpdateInterval] = useState('1000');
    const [simulation, setSimulation] = useState(false);
    const [simulationMin, setSimulationMin] = useState('0');
    const [simulationMax, setSimulationMax] = useState('100');
    const [simulationNoise, setSimulationNoise] = useState('0');
    const [simulationPattern, setSimulationPattern] = useState('random');

    // Enhanced professional SCADA form state
    const [tagGroup, setTagGroup] = useState('');
    const [dataType, setDataType] = useState('FLOAT');
    const [engineeringUnit, setEngineeringUnit] = useState('');
    const [rawMin, setRawMin] = useState('');
    const [rawMax, setRawMax] = useState('');
    const [scaledMin, setScaledMin] = useState('');
    const [scaledMax, setScaledMax] = useState('');
    const [deadband, setDeadband] = useState('');
    const [readOnly, setReadOnly] = useState(false);
    const [description, setDescription] = useState('');

    // Enhanced tag types with SCADA-like organization
    const tagTypes = [
        { value: 'analog', label: 'Analog Input', icon: SpeedIcon, color: 'primary', description: 'Continuous values (temperature, pressure)' },
        { value: 'digital', label: 'Digital Input', icon: CircleIcon, color: 'secondary', description: 'On/Off states (switches, alarms)' },
        { value: 'string', label: 'String', icon: LabelIcon, color: 'info', description: 'Text values (status messages)' },
        { value: 'counter', label: 'Counter', icon: TimelineIcon, color: 'success', description: 'Incrementing values (production count)' },
        { value: 'calculated', label: 'Calculated', icon: EngineeringIcon, color: 'warning', description: 'Derived from other tags' }
    ];

    // Professional data types for industrial applications
    const dataTypes = [
        { value: 'FLOAT', label: 'Float (32-bit)', description: 'Decimal numbers' },
        { value: 'DOUBLE', label: 'Double (64-bit)', description: 'High precision decimals' },
        { value: 'INT16', label: '16-bit Integer', description: 'Whole numbers (-32,768 to 32,767)' },
        { value: 'INT32', label: '32-bit Integer', description: 'Large whole numbers' },
        { value: 'BOOL', label: 'Boolean', description: 'True/False values' },
        { value: 'STRING', label: 'String', description: 'Text values' }
    ];

    // Common engineering units for industrial processes
    const commonUnits = [
        '°C', '°F', 'K', // Temperature
        'bar', 'PSI', 'Pa', 'kPa', 'MPa', // Pressure
        'L/min', 'L/h', 'm³/h', 'GPM', // Flow
        'RPM', 'Hz', // Speed/Frequency
        'V', 'mV', 'A', 'mA', 'W', 'kW', 'MW', // Electrical
        'mm', 'cm', 'm', 'in', 'ft', // Distance
        '%', 'ppm', 'mg/L', // Concentration
        'mm/s', 'm/s²' // Vibration
    ];

    const simulationPatterns = [
        { value: 'random', label: 'Random Values', description: 'Random values within min/max range' },
        { value: 'sine', label: 'Sine Wave', description: 'Smooth oscillating pattern' },
        { value: 'square', label: 'Square Wave', description: 'Digital on/off pattern' },
        { value: 'ramp', label: 'Ramp', description: 'Linear increase from min to max' },
        { value: 'step', label: 'Step Function', description: 'Random step changes' },
        { value: 'temperature', label: 'Temperature Pattern', description: 'Industrial temperature simulation' },
        { value: 'pressure', label: 'Pressure Pattern', description: 'Pressure with periodic variations' },
        { value: 'flow', label: 'Flow Pattern', description: 'Flow rate with dynamic changes' },
        { value: 'level', label: 'Level Pattern', description: 'Tank level with trends' },
        { value: 'motor_rpm', label: 'Motor RPM', description: 'Motor speed variations' },
        { value: 'vibration', label: 'Vibration', description: 'Vibration for predictive maintenance' }
    ];

    // Debug: Log URL parameters
    useEffect(() => {
        console.log('=== TAGS PAGE DEBUG ===');
        console.log('📍 Current URL:', window.location.href);
        console.log('📍 Project ID:', projectId);
        console.log('📍 Device ID from URL:', deviceId);
        console.log('📍 Full search params:', location.search);
    }, [projectId, deviceId, location.search]);

    // Get simulation suggestions based on tag name
    const getSimulationSuggestions = (tagName) => {
        const name = tagName.toLowerCase();

        if (name.includes('temp')) {
            return { pattern: 'temperature', min: 10, max: 100, units: '°C', description: 'Realistic temperature with 25°C base, ±15°C amplitude' };
        } else if (name.includes('press')) {
            return { pattern: 'pressure', min: 80, max: 120, units: 'bar', description: 'Pressure simulation with periodic variations' };
        } else if (name.includes('level')) {
            return { pattern: 'level', min: 0, max: 100, units: '%', description: 'Tank level with slow drain trend' };
        } else if (name.includes('rpm') || name.includes('speed')) {
            return { pattern: 'motor_rpm', min: 1400, max: 1500, units: 'RPM', description: 'Motor speed with realistic variations' };
        } else if (name.includes('vibr')) {
            return { pattern: 'vibration', min: 1.5, max: 4.0, units: 'mm/s', description: 'Vibration for predictive maintenance' };
        } else if (name.includes('flow')) {
            return { pattern: 'flow', min: 10, max: 100, units: 'L/min', description: 'Flow rate simulation' };
        } else if (name.includes('volt')) {
            return { pattern: 'sine', min: 220, max: 240, units: 'V', description: 'Voltage variations' };
        } else if (name.includes('current') || name.includes('amp')) {
            return { pattern: 'sine', min: 10, max: 20, units: 'A', description: 'Current measurement' };
        }

        return { pattern: 'random', min: 0, max: 100, units: 'units', description: 'Custom simulation pattern' };
    };

    // Get alarm status based on value and tag type
    const getAlarmStatus = (tag, value) => {
        if (!tag.simulation || value === undefined) return null;

        const tagName = tag.tag_name.toLowerCase();

        if (tagName.includes('temp') && value > 80) {
            return { type: 'HIGH', severity: 'error', message: 'High Temperature', icon: ErrorIcon };
        } else if (tagName.includes('temp') && value > 70) {
            return { type: 'WARN', severity: 'warning', message: 'Temperature Rising', icon: WarningIcon };
        } else if (tagName.includes('level') && value < 20) {
            return { type: 'LOW', severity: 'error', message: 'Low Level', icon: ErrorIcon };
        } else if (tagName.includes('level') && value < 30) {
            return { type: 'WARN', severity: 'warning', message: 'Level Decreasing', icon: WarningIcon };
        } else if (tagName.includes('vibr') && value > 3.5) {
            return { type: 'HIGH', severity: 'warning', message: 'High Vibration', icon: WarningIcon };
        } else if (tagName.includes('press') && (value > 150 || value < 50)) {
            return { type: value > 150 ? 'HIGH' : 'LOW', severity: 'error', message: `${value > 150 ? 'High' : 'Low'} Pressure`, icon: ErrorIcon };
        }

        return null;
    };

    // Format value with engineering context
    const formatValueWithContext = (value, tag) => {
        if (value === undefined || value === null) return 'N/A';

        const tagName = tag.tag_name.toLowerCase();
        const unit = tag.engineering_unit || '';

        if (tag.engineering_unit) {
            return `${typeof value === 'number' ? value.toFixed(2) : value} ${unit}`;
        }

        if (tagName.includes('temp')) {
            return `${value.toFixed(1)}°C`;
        } else if (tagName.includes('press')) {
            return `${value.toFixed(2)} bar`;
        } else if (tagName.includes('level')) {
            return `${value.toFixed(1)}%`;
        } else if (tagName.includes('rpm') || tagName.includes('speed')) {
            return `${Math.round(value)} RPM`;
        } else if (tagName.includes('vibr')) {
            return `${value.toFixed(2)} mm/s`;
        } else if (tagName.includes('flow')) {
            return `${value.toFixed(1)} L/min`;
        } else if (tagName.includes('volt')) {
            return `${value.toFixed(1)} V`;
        } else if (tagName.includes('current') || tagName.includes('amp')) {
            return `${value.toFixed(2)} A`;
        } else if (tagName.includes('power')) {
            return `${value.toFixed(0)} W`;
        } else if (tag.tag_type === 'digital') {
            return value ? 'ON' : 'OFF';
        }

        return typeof value === 'number' ? value.toFixed(2) : value.toString();
    };

    // FIXED: Fetch all project tags instead of device-specific
    const fetchTags = () => {
        if (!projectId) {
            console.error('❌ Cannot fetch tags: no projectId');
            return;
        }

        console.log('📤 Fetching all tags for project:', projectId);
        setLoading(true);

        // 🔧 FIXED: Use project-level endpoint
        axios.get(`/tags/project/${projectId}`)
            .then(res => {
                console.log('✅ Tags fetched:', res.data);
                setTags(res.data);
                setFiltered(res.data);
                setError(null);
            })
            .catch(err => {
                console.error('❌ Failed to fetch tags:', err);
                setError(err.response?.data?.error || err.message);
                setSnackbar({
                    open: true,
                    msg: `❌ Failed to load tags: ${err.response?.data?.error || err.message}`,
                    severity: 'error'
                });
            })
            .finally(() => {
                setLoading(false);
            });
    };

    // Fetch devices for the add modal
    const fetchDevices = () => {
        if (!projectId) return;

        console.log('📤 Fetching devices for project:', projectId);
        axios.get(`/tags/project/${projectId}/devices`)
            .then(res => {
                console.log('✅ Devices fetched:', res.data);
                setDevices(res.data);
            })
            .catch(err => {
                console.error('❌ Failed to fetch devices:', err);
            });
    };

    const fetchDeviceInfo = () => {
        if (!deviceId) return;
        console.log('📤 Fetching device info for:', deviceId);
        axios.get(`/devices/${deviceId}`)
            .then(res => {
                console.log('✅ Device info fetched:', res.data);
                setDevice(res.data);
            })
            .catch(err => {
                console.error('❌ Failed to fetch device info:', err);
            });
    };

    const fetchSimulationStatus = () => {
        if (!deviceId) return;
        console.log('📤 Fetching simulation status for:', deviceId);

        axios.get(`/devices/${deviceId}/simulation/status`)
            .then(res => {
                console.log('✅ Simulation status fetched:', res.data);
                setSimulationStatus(res.data);
            })
            .catch(err => {
                console.log('ℹ️ Simulation status not available:', err.message);
            });
    };

    // Fetch data on component mount
    useEffect(() => {
        console.log('📍 useEffect triggered - projectId:', projectId, 'deviceId:', deviceId);

        if (projectId) {
            console.log('✅ Project ID found, fetching data...');
            fetchTags(); // Always fetch all project tags
            fetchDevices(); // Fetch devices for the modal

            // Also fetch device info if deviceId is in URL (for backward compatibility)
            if (deviceId) {
                fetchDeviceInfo();
                fetchSimulationStatus();
            }
        } else {
            console.error('❌ No project ID found!');
            setSnackbar({
                open: true,
                msg: '❌ No project selected.',
                severity: 'error'
            });
        }
    }, [projectId, deviceId]);

    useEffect(() => {
        if (!search) {
            setFiltered(tags);
        } else {
            setFiltered(
                tags.filter(t =>
                    t.tag_name.toLowerCase().includes(search.toLowerCase()) ||
                    (t.tag_type && t.tag_type.toLowerCase().includes(search.toLowerCase())) ||
                    (t.address && t.address.toLowerCase().includes(search.toLowerCase())) ||
                    (t.tag_group && t.tag_group.toLowerCase().includes(search.toLowerCase())) ||
                    (t.engineering_unit && t.engineering_unit.toLowerCase().includes(search.toLowerCase()))
                )
            );
        }
    }, [search, tags]);

    // Group tags for better organization
    const getGroupedTags = () => {
        if (groupBy === 'type') {
            const grouped = {};
            filtered.forEach(tag => {
                const type = tag.tag_type || 'uncategorized';
                if (!grouped[type]) grouped[type] = [];
                grouped[type].push(tag);
            });
            return grouped;
        } else if (groupBy === 'simulation') {
            return {
                'simulation': filtered.filter(t => t.simulation),
                'real': filtered.filter(t => !t.simulation)
            };
        } else if (groupBy === 'group') {
            const grouped = {};
            filtered.forEach(tag => {
                const group = tag.tag_group || 'ungrouped';
                if (!grouped[group]) grouped[group] = [];
                grouped[group].push(tag);
            });
            return grouped;
        } else if (groupBy === 'device') {
            const grouped = {};
            filtered.forEach(tag => {
                const deviceName = tag.device_name || 'Unknown Device';
                if (!grouped[deviceName]) grouped[deviceName] = [];
                grouped[deviceName].push(tag);
            });
            return grouped;
        }
        return { 'all': filtered };
    };

    // Enhanced reset form function with all new fields
    const resetForm = () => {
        setTagName(''); setTagType('analog'); setAddress(''); setUpdateInterval('1000');
        setSimulation(false); setSimulationMin('0'); setSimulationMax('100');
        setSimulationNoise('0'); setSimulationPattern('random');
        // Add new professional fields
        setTagGroup(''); setDataType('FLOAT'); setEngineeringUnit('');
        setRawMin(''); setRawMax(''); setScaledMin(''); setScaledMax('');
        setDeadband(''); setReadOnly(false); setDescription('');
        // Reset device selection
        setSelectedDeviceId('');
    };

    // FIXED: Enhanced handlers with project-level API
    const handleAdd = () => {
        console.log('=== DEBUG CREATE TAG ===');
        console.log('tagName:', tagName);
        console.log('selectedDeviceId:', selectedDeviceId);
        console.log('projectId:', projectId);
        console.log('tagType:', tagType);
        console.log('simulation:', simulation);

        // Check if projectId exists
        if (!projectId) {
            console.error('❌ No projectId found!');
            setSnackbar({
                open: true,
                msg: '❌ No project selected.',
                severity: 'error'
            });
            return;
        }

        // Check if device is selected
        if (!selectedDeviceId) {
            console.error('❌ No device selected');
            setSnackbar({
                open: true,
                msg: '❌ Please select a device first.',
                severity: 'error'
            });
            return;
        }

        // Check if tagName exists
        if (!tagName || !tagName.trim()) {
            console.error('❌ Tag name is empty');
            setSnackbar({
                open: true,
                msg: '❌ Tag name is required',
                severity: 'error'
            });
            return;
        }

        const tagData = {
            device_id: parseInt(selectedDeviceId), // Device selection
            tag_name: tagName,
            tag_type: tagType,
            address,
            update_interval: updateInterval ? parseInt(updateInterval) : null,
            simulation,
            simulation_min: simulation && simulationMin ? parseFloat(simulationMin) : null,
            simulation_max: simulation && simulationMax ? parseFloat(simulationMax) : null,
            simulation_noise: simulation && simulationNoise ? parseFloat(simulationNoise) : null,
            simulation_pattern: simulation ? simulationPattern : null,
            // Add new professional fields
            tag_group: tagGroup || null,
            data_type: dataType,
            engineering_unit: engineeringUnit || null,
            raw_min: rawMin ? parseFloat(rawMin) : null,
            raw_max: rawMax ? parseFloat(rawMax) : null,
            scaled_min: scaledMin ? parseFloat(scaledMin) : null,
            scaled_max: scaledMax ? parseFloat(scaledMax) : null,
            deadband: deadband ? parseFloat(deadband) : null,
            read_only: readOnly,
            description: description || null
        };

        console.log('📤 Sending API request:');
        console.log('URL:', `/tags/project/${projectId}`);
        console.log('Data:', tagData);

        // 🔧 FIXED: Use project-level API
        axios.post(`/tags/project/${projectId}`, tagData)
            .then((response) => {
                console.log('✅ API Success:', response.data);
                setAddOpen(false);
                resetForm();
                setSnackbar({
                    open: true,
                    msg: `✅ ${simulation ? 'Simulation' : 'Real'} tag "${tagName}" created successfully!`,
                    severity: 'success'
                });
                fetchTags();
            })
            .catch((err) => {
                console.error('❌ API Error:', err);
                console.error('❌ Error Response:', err.response?.data);
                console.error('❌ Error Status:', err.response?.status);

                setSnackbar({
                    open: true,
                    msg: `❌ ${err.response?.data?.error || err.message || 'Failed to create tag'}`,
                    severity: 'error'
                });
            });
    };

    const handleEdit = () => {
        if (!current || !tagName) return;

        const tagData = {
            tag_name: tagName,
            tag_type: tagType,
            address,
            update_interval: updateInterval ? parseInt(updateInterval) : null,
            simulation,
            simulation_min: simulation && simulationMin ? parseFloat(simulationMin) : null,
            simulation_max: simulation && simulationMax ? parseFloat(simulationMax) : null,
            simulation_noise: simulation && simulationNoise ? parseFloat(simulationNoise) : null,
            simulation_pattern: simulation ? simulationPattern : null,
            // Add new professional fields
            tag_group: tagGroup || null,
            data_type: dataType,
            engineering_unit: engineeringUnit || null,
            raw_min: rawMin ? parseFloat(rawMin) : null,
            raw_max: rawMax ? parseFloat(rawMax) : null,
            scaled_min: scaledMin ? parseFloat(scaledMin) : null,
            scaled_max: scaledMax ? parseFloat(scaledMax) : null,
            deadband: deadband ? parseFloat(deadband) : null,
            read_only: readOnly,
            description: description || null
        };

        // 🔧 FIXED: Use project-level API
        axios.put(`/tags/project/${projectId}/${current.tag_id}`, tagData)
            .then(() => {
                setEditOpen(false);
                resetForm();
                setSnackbar({ open: true, msg: 'Tag updated successfully!', severity: 'success' });
                fetchTags();
            })
            .catch(err => setSnackbar({
                open: true,
                msg: err.response?.data?.error || 'Failed to update tag',
                severity: 'error'
            }));
    };

    const handleDelete = () => {
        if (!current) return;

        // 🔧 FIXED: Use project-level API
        axios.delete(`/tags/project/${projectId}/${current.tag_id}`)
            .then(() => {
                setDeleteOpen(false);
                setSnackbar({ open: true, msg: 'Tag deleted successfully!', severity: 'success' });
                fetchTags();
            })
            .catch(err => setSnackbar({
                open: true,
                msg: err.response?.data?.error || 'Failed to delete tag',
                severity: 'error'
            }));
    };

    // Enhanced openEdit function with all new fields
    const openEdit = (tag) => {
        setCurrent(tag);
        setTagName(tag.tag_name);
        setTagType(tag.tag_type || 'analog');
        setAddress(tag.address || '');
        setUpdateInterval(tag.update_interval?.toString() || '1000');
        setSimulation(tag.simulation || false);
        setSimulationMin(tag.simulation_min?.toString() || '0');
        setSimulationMax(tag.simulation_max?.toString() || '100');
        setSimulationNoise(tag.simulation_noise?.toString() || '0');
        setSimulationPattern(tag.simulation_pattern || 'random');
        // Add new professional fields
        setTagGroup(tag.tag_group || '');
        setDataType(tag.data_type || 'FLOAT');
        setEngineeringUnit(tag.engineering_unit || '');
        setRawMin(tag.raw_min?.toString() || '');
        setRawMax(tag.raw_max?.toString() || '');
        setScaledMin(tag.scaled_min?.toString() || '');
        setScaledMax(tag.scaled_max?.toString() || '');
        setDeadband(tag.deadband?.toString() || '');
        setReadOnly(tag.read_only || false);
        setDescription(tag.description || '');
        setEditOpen(true);
    };

    const getTagTypeConfig = (type) => {
        return tagTypes.find(t => t.value === type) || tagTypes[0];
    };

    const getValueTrend = (tagId) => {
        const trends = ['up', 'down', 'flat'];
        return trends[Math.floor(Math.random() * trends.length)];
    };

    const getQualityStatus = (tagId) => {
        const hasLiveData = getTagValue(tagId) !== undefined;
        return hasLiveData ? 'GOOD' : 'BAD';
    };

    const getAddressHint = () => {
        if (selectedDeviceId) {
            const selectedDevice = devices.find(d => d.device_id == selectedDeviceId);
            if (selectedDevice) {
                switch (selectedDevice.device_type) {
                    case 'modbus':
                        return 'Modbus: 40001 (Holding), 30001 (Input), 1 (Coil), 10001 (Discrete)';
                    case 'mqtt':
                        return 'MQTT: topic/path/sensor1';
                    case 'simulation':
                        return 'Simulation: any identifier';
                    default:
                        return 'Device-specific address format';
                }
            }
        }
        return 'Select a device first to see address format hints';
    };

    const handleTagNameChange = (newTagName) => {
        setTagName(newTagName);

        if (simulation) {
            const suggestions = getSimulationSuggestions(newTagName);
            setSimulationMin(suggestions.min.toString());
            setSimulationMax(suggestions.max.toString());
            setSimulationPattern(suggestions.pattern);
            // Auto-suggest engineering unit
            if (suggestions.units !== 'units') {
                setEngineeringUnit(suggestions.units);
            }
        }
    };

    // Enhanced tag info rendering with professional fields
    const renderEnhancedTagInfo = (tag) => (
        <Box sx={{ mb: 2 }}>
            <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
                {tag.device_name && (
                    <Chip
                        label={`Device: ${tag.device_name}`}
                        size="small"
                        color="primary"
                        sx={{ fontWeight: 600 }}
                    />
                )}
                {tag.tag_group && (
                    <Chip
                        label={`Group: ${tag.tag_group}`}
                        size="small"
                        color="info"
                        sx={{ fontWeight: 600 }}
                    />
                )}
                {tag.engineering_unit && (
                    <Chip
                        label={`Unit: ${tag.engineering_unit}`}
                        size="small"
                        color="success"
                        sx={{ fontWeight: 600 }}
                    />
                )}
                {tag.read_only && (
                    <Chip
                        icon={<LockIcon fontSize="small" />}
                        label="Read-Only"
                        size="small"
                        color="warning"
                        sx={{ fontWeight: 600 }}
                    />
                )}
                {(tag.raw_min !== null && tag.raw_max !== null) && (
                    <Chip
                        icon={<ScaleIcon fontSize="small" />}
                        label="Scaled"
                        size="small"
                        color="secondary"
                        sx={{ fontWeight: 600 }}
                    />
                )}
            </Stack>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                <strong>Type:</strong> {tag.data_type || 'FLOAT'}
            </Typography>

            {(tag.raw_min !== null && tag.raw_max !== null) && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    <strong>Scaling:</strong> {tag.raw_min}-{tag.raw_max} → {tag.scaled_min || 0}-{tag.scaled_max || 100} {tag.engineering_unit || ''}
                </Typography>
            )}

            {tag.deadband && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    <strong>Deadband:</strong> ±{tag.deadband} {tag.engineering_unit || ''}
                </Typography>
            )}

            {tag.description && (
                <Typography variant="caption" color="text.secondary" sx={{
                    display: 'block',
                    fontStyle: 'italic',
                    mt: 1,
                    p: 1,
                    bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                    borderRadius: 1
                }}>
                    "{tag.description}"
                </Typography>
            )}
        </Box>
    );

    // Navigation helper
    const NavigateToDevicesButton = () => {
        if (projectId && tags.length === 0 && !loading) {
            return (
                <Box sx={{ textAlign: 'center', mt: 4 }}>
                    <Button
                        variant="outlined"
                        startIcon={<ArrowBackIcon />}
                        onClick={() => navigate(`/project/${projectId}/devices`)}
                    >
                        Go to Devices to Create Tags
                    </Button>
                </Box>
            );
        }
        return null;
    };

    // Render simulation status panel
    const renderSimulationPanel = () => {
        if (!device || device.device_type !== 'simulation') return null;

        return (
            <Paper sx={{
                p: 3,
                mb: 3,
                background: isDark
                    ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
                    : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                border: isDark ? '1px solid #475569' : '1px solid #e2e8f0'
            }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                        🎯 Industrial Simulation Control
                    </Typography>
                    <IconButton size="small" onClick={fetchSimulationStatus}>
                        <RefreshIcon />
                    </IconButton>
                </Box>

                {simulationStatus?.running ? (
                    <Box>
                        <Chip
                            icon={<CheckCircleIcon />}
                            label={`Running - ${simulationStatus.tags_count} Tags`}
                            color="success"
                            sx={{ mb: 2, fontWeight: 600 }}
                        />
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            Started: {new Date(simulationStatus.started_at).toLocaleString()}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Patterns: {simulationStatus.patterns?.join(', ') || 'Standard simulation'}
                        </Typography>
                    </Box>
                ) : (
                    <Box>
                        <Chip
                            icon={<CircleIcon />}
                            label="Simulation Stopped"
                            color="default"
                            sx={{ mb: 2, fontWeight: 600 }}
                        />
                        <Typography variant="body2" color="text.secondary">
                            Ready to generate industrial data with realistic patterns
                        </Typography>
                    </Box>
                )}
            </Paper>
        );
    };

    // Render simulation status for tag card
    const renderTagSimulationStatus = (tag) => {
        if (!tag.simulation) return null;

        const patternInfo = getSimulationSuggestions(tag.tag_name);

        return (
            <Box sx={{
                p: 2,
                borderRadius: 2,
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: 'white',
                mb: 2
            }}>
                <Typography variant="caption" sx={{ opacity: 0.9 }}>
                    Industrial Simulation
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1 }}>
                    🎯 {(tag.simulation_pattern || patternInfo.pattern).toUpperCase()} Pattern
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    Range: {tag.simulation_min || patternInfo.min} - {tag.simulation_max || patternInfo.max} {tag.engineering_unit || patternInfo.units}
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', opacity: 0.8 }}>
                    {patternInfo.description}
                </Typography>
            </Box>
        );
    };

    // Render grouped tags
    const renderTagGroup = (groupName, groupTags) => {
        if (groupBy === 'none') {
            return groupTags.map((tag, index) => renderTagCard(tag, index));
        }

        return (
            <Grid item xs={12} key={groupName}>
                <Accordion defaultExpanded sx={{
                    background: isDark
                        ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
                        : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                    border: isDark ? '1px solid #475569' : '1px solid #e2e8f0'
                }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Typography variant="h6" sx={{ fontWeight: 600, textTransform: 'capitalize' }}>
                                {groupName} Tags
                            </Typography>
                            <Chip label={groupTags.length} size="small" color="primary" />
                        </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Grid container spacing={3}>
                            {groupTags.map((tag, index) => renderTagCard(tag, index))}
                        </Grid>
                    </AccordionDetails>
                </Accordion>
            </Grid>
        );
    };

    const renderTagCard = (tag, index) => {
        const realTimeValue = getTagValue(tag.tag_id);
        const lastUpdate = getTagTimestamp(tag.tag_id);
        const hasLiveData = realTimeValue !== undefined;
        const tagConfig = getTagTypeConfig(tag.tag_type);
        const TagIcon = tagConfig.icon;
        const trend = getValueTrend(tag.tag_id);
        const quality = getQualityStatus(tag.tag_id);
        const alarm = getAlarmStatus(tag, realTimeValue);

        return (
            <Grid item xs={12} sm={6} lg={4} key={tag.tag_id}>
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
                        border: alarm ?
                            `2px solid ${alarm.severity === 'error' ? '#ef4444' : '#f59e0b'}` :
                            tag.simulation ? '2px solid #f59e0b' :
                                hasLiveData ? '2px solid #10b981' :
                                    isDark ? '1px solid #475569' : '1px solid #e2e8f0',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease-in-out',
                        animation: alarm?.severity === 'error' ? `${pulse} 2s infinite` : 'none',
                        '&:hover': {
                            borderColor: '#2563eb',
                            boxShadow: isDark
                                ? '0 20px 40px rgba(37, 99, 235, 0.2)'
                                : '0 20px 40px rgba(37, 99, 235, 0.1)',
                            '& .tag-actions': {
                                opacity: 1,
                                transform: 'translateY(0)'
                            }
                        }
                    }}>
                        {/* Alarm Banner */}
                        {alarm && (
                            <Box sx={{
                                p: 1,
                                background: alarm.severity === 'error' ?
                                    'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' :
                                    'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1
                            }}>
                                <alarm.icon fontSize="small" />
                                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                    {alarm.message}
                                </Typography>
                            </Box>
                        )}

                        <CardContent sx={{ p: 3 }}>
                            {/* Tag Header with Status */}
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
                                <Badge
                                    badgeContent={
                                        alarm ? '!' :
                                            quality === 'BAD' ? '!' :
                                                tag.simulation ? 'SIM' :
                                                    hasLiveData ? '●' : ''
                                    }
                                    color={
                                        alarm ? alarm.severity :
                                            quality === 'BAD' ? 'error' :
                                                tag.simulation ? 'warning' :
                                                    hasLiveData ? 'success' : 'default'
                                    }
                                >
                                    <Avatar sx={{
                                        width: 40,
                                        height: 40,
                                        background: `linear-gradient(135deg, ${
                                            tagConfig.color === 'primary' ? '#2563eb' :
                                                tagConfig.color === 'secondary' ? '#7c3aed' :
                                                    tagConfig.color === 'info' ? '#0891b2' :
                                                        tagConfig.color === 'success' ? '#10b981' :
                                                            tagConfig.color === 'warning' ? '#f59e0b' : '#6b7280'
                                        } 0%, ${
                                            tagConfig.color === 'primary' ? '#3b82f6' :
                                                tagConfig.color === 'secondary' ? '#a78bfa' :
                                                    tagConfig.color === 'info' ? '#06b6d4' :
                                                        tagConfig.color === 'success' ? '#34d399' :
                                                            tagConfig.color === 'warning' ? '#fbbf24' : '#9ca3af'
                                        } 100%)`
                                    }}>
                                        <TagIcon fontSize="small" />
                                    </Avatar>
                                </Badge>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography variant="h6" sx={{
                                        fontWeight: 700,
                                        color: alarm ?
                                            (alarm.severity === 'error' ? 'error.main' : 'warning.main') :
                                            'text.primary',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        mb: 0.5
                                    }}>
                                        {tag.tag_name}
                                    </Typography>
                                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                        <Chip
                                            label={tagConfig.label}
                                            color={tagConfig.color}
                                            size="small"
                                            sx={{ fontWeight: 600 }}
                                        />
                                        {tag.simulation && (
                                            <Chip
                                                label="Simulation"
                                                color="warning"
                                                size="small"
                                                sx={{ fontWeight: 600 }}
                                            />
                                        )}
                                    </Stack>
                                </Box>
                            </Box>

                            {/* Simulation Status */}
                            {renderTagSimulationStatus(tag)}

                            {/* Real-Time Value with Quality and Trend */}
                            {hasLiveData ? (
                                <Box sx={{
                                    p: 2,
                                    borderRadius: 2,
                                    background: alarm ?
                                        (alarm.severity === 'error' ?
                                            'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' :
                                            'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)') :
                                        quality === 'GOOD'
                                            ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                                            : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                    color: 'white',
                                    mb: 2
                                }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Typography variant="caption" sx={{ opacity: 0.9 }}>
                                            Live Value
                                        </Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            {trend === 'up' && <TrendingUpIcon fontSize="small" />}
                                            {trend === 'down' && <TrendingDownIcon fontSize="small" />}
                                            {trend === 'flat' && <TrendingFlatIcon fontSize="small" />}
                                            <Typography variant="caption" sx={{ opacity: 0.8 }}>
                                                {quality}
                                            </Typography>
                                        </Box>
                                    </Box>
                                    <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1 }}>
                                        {formatValueWithContext(realTimeValue, tag)}
                                    </Typography>
                                    <Typography variant="caption" sx={{ opacity: 0.8 }}>
                                        {lastUpdate && new Date(lastUpdate).toLocaleTimeString()}
                                    </Typography>
                                </Box>
                            ) : (
                                <Box sx={{
                                    p: 2,
                                    borderRadius: 2,
                                    background: isDark ? '#374151' : '#f1f5f9',
                                    border: `1px dashed ${isDark ? '#6b7280' : '#cbd5e1'}`,
                                    mb: 2,
                                    textAlign: 'center'
                                }}>
                                    <Typography variant="body2" color="text.secondary">
                                        {tag.simulation ? 'Simulation Ready' : 'No Live Data'}
                                    </Typography>
                                </Box>
                            )}

                            {/* Enhanced Tag Configuration Details */}
                            {renderEnhancedTagInfo(tag)}

                            {/* Basic Configuration */}
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                    <strong>Address:</strong> {tag.address || 'Not configured'}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                    <strong>Update:</strong> {tag.update_interval || 'Default'} ms
                                </Typography>
                                {tag.simulation && (
                                    <Typography variant="body2" color="text.secondary">
                                        <strong>Range:</strong> {tag.simulation_min} - {tag.simulation_max}
                                        {tag.simulation_pattern && ` (${tag.simulation_pattern})`}
                                    </Typography>
                                )}
                            </Box>

                            {/* Action Buttons */}
                            <Box className="tag-actions" sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                opacity: 0,
                                transform: 'translateY(10px)',
                                transition: 'all 0.3s ease-in-out'
                            }}>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Tooltip title="Edit Tag">
                                        <IconButton
                                            size="small"
                                            onClick={e => { e.stopPropagation(); openEdit(tag); }}
                                            sx={{
                                                bgcolor: isDark ? 'rgba(59, 130, 246, 0.1)' : 'primary.50',
                                                color: 'primary.main',
                                                '&:hover': { bgcolor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'primary.100' }
                                            }}
                                        >
                                            <EditIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Delete Tag">
                                        <IconButton
                                            size="small"
                                            onClick={e => { e.stopPropagation(); setCurrent(tag); setDeleteOpen(true); }}
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

                                <Tooltip title="View Trends">
                                    <IconButton
                                        size="small"
                                        onClick={e => {
                                            e.stopPropagation();
                                            navigate(`/project/${projectId}/measurements?tag=${tag.tag_id}`);
                                        }}
                                        sx={{
                                            bgcolor: isDark ? 'rgba(14, 165, 233, 0.1)' : 'info.50',
                                            color: 'info.main',
                                            '&:hover': { bgcolor: isDark ? 'rgba(14, 165, 233, 0.2)' : 'info.100' }
                                        }}
                                    >
                                        <ShowChartIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                        </CardContent>
                    </Card>
                </motion.div>
            </Grid>
        );
    };

    const groupedTags = getGroupedTags();

    return (
        <Box sx={{
            p: 4,
            background: isDark
                ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
                : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
            minHeight: '100vh'
        }}>
            {/* Enhanced Header */}
            <Box sx={{ mb: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Avatar sx={{ width: 48, height: 48, background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)' }}>
                        <LabelIcon />
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
                            Professional SCADA Tags
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            Configure and monitor ALL industrial data points across all devices in this project
                        </Typography>
                    </Box>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                    <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                        <Badge badgeContent={filtered.length} color="primary">
                            <Chip icon={<LabelIcon />} label="Tags" color="primary" sx={{ fontWeight: 600 }} />
                        </Badge>
                        <Chip
                            icon={<CircleIcon sx={{ fontSize: 12 }} />}
                            label={isConnected ? 'Live Data' : 'Offline'}
                            color={isConnected ? 'success' : 'error'}
                            sx={{ fontWeight: 600 }}
                        />
                        <Badge badgeContent={tags.filter(t => t.simulation).length} color="warning">
                            <Chip icon={<MemoryIcon />} label="Simulation" color="warning" sx={{ fontWeight: 600 }} />
                        </Badge>
                        <Badge badgeContent={tags.filter(t => t.tag_group).length} color="info">
                            <Chip icon={<EngineeringIcon />} label="Grouped" color="info" sx={{ fontWeight: 600 }} />
                        </Badge>
                        {loading && <Chip label="Loading..." color="warning" />}
                    </Stack>

                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        <FormControl size="small" sx={{
                            minWidth: 120,
                            '& .MuiOutlinedInput-root': {
                                background: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255,255,255,0.9)',
                                backdropFilter: 'blur(10px)'
                            }
                        }}>
                            <InputLabel>Group By</InputLabel>
                            <Select
                                value={groupBy}
                                onChange={e => setGroupBy(e.target.value)}
                                label="Group By"
                            >
                                <MenuItem value="none">No Grouping</MenuItem>
                                <MenuItem value="type">By Type</MenuItem>
                                <MenuItem value="simulation">By Source</MenuItem>
                                <MenuItem value="group">By Tag Group</MenuItem>
                                <MenuItem value="device">By Device</MenuItem>
                            </Select>
                        </FormControl>

                        <TextField
                            placeholder="Search tags..."
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

            {/* Navigation Helper */}
            <NavigateToDevicesButton />

            {/* Simulation Control Panel */}
            {renderSimulationPanel()}

            {/* Loading State */}
            {loading && (
                <Box sx={{ textAlign: 'center', my: 4 }}>
                    <LinearProgress sx={{ mb: 2 }} />
                    <Typography>Loading tags...</Typography>
                </Box>
            )}

            {/* Error State */}
            {error && !loading && (
                <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'error.light', color: 'error.contrastText', mb: 3 }}>
                    <ErrorIcon sx={{ fontSize: 48, mb: 2 }} />
                    <Typography variant="h6">Error Loading Tags</Typography>
                    <Typography variant="body2">{error}</Typography>
                    <Button
                        variant="contained"
                        onClick={fetchTags}
                        sx={{ mt: 2 }}
                        startIcon={<RefreshIcon />}
                    >
                        Try Again
                    </Button>
                </Paper>
            )}

            {/* Tags Grid */}
            <Grid container spacing={3}>
                {!loading && !error && Object.keys(groupedTags).length === 0 && (
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
                                <LabelIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                                <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                                    No Tags Found
                                </Typography>
                                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                                    Create your first professional SCADA tag to start collecting industrial data
                                </Typography>
                                <Button
                                    variant="contained"
                                    startIcon={<AddIcon />}
                                    onClick={() => { resetForm(); setAddOpen(true); }}
                                    sx={{ background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)', borderRadius: 2, px: 3 }}
                                    disabled={!projectId}
                                >
                                    Create First Tag
                                </Button>
                            </Paper>
                        </motion.div>
                    </Grid>
                )}

                {!loading && !error && Object.entries(groupedTags).map(([groupName, groupTags]) =>
                    groupTags.length > 0 && renderTagGroup(groupName, groupTags)
                )}
            </Grid>

            {/* Add Tag FAB */}
            <Fab
                color="primary"
                onClick={() => { resetForm(); setAddOpen(true); }}
                disabled={!projectId}
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
                    },
                    '&:disabled': {
                        background: '#9ca3af',
                        color: '#ffffff'
                    }
                }}
            >
                <AddIcon />
            </Fab>

            {/* Enhanced Add Dialog with Device Selection */}
            <Dialog
                open={addOpen}
                onClose={() => setAddOpen(false)}
                maxWidth="lg"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 4,
                        background: isDark
                            ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
                            : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)'
                    }
                }}
            >
                <DialogTitle sx={{ pb: 2 }}>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                        Create Professional SCADA Tag
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Configure a new industrial data point for your project
                    </Typography>
                </DialogTitle>
                <DialogContent sx={{ pt: 1 }}>
                    <Grid container spacing={3}>
                        {/* Device Selection */}
                        <Grid item xs={12}>
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                                Device Selection
                            </Typography>
                        </Grid>

                        <Grid item xs={12}>
                            <FormControl fullWidth required>
                                <InputLabel>Select Device</InputLabel>
                                <Select
                                    value={selectedDeviceId}
                                    onChange={e => setSelectedDeviceId(e.target.value)}
                                    label="Select Device"
                                >
                                    {devices.map(device => (
                                        <MenuItem key={device.device_id} value={device.device_id}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Chip
                                                    label={device.device_type}
                                                    size="small"
                                                    color={device.status === 'online' ? 'success' : 'default'}
                                                />
                                                <Box>
                                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                        {device.device_name}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {device.ip_address || 'No IP'} - {device.status || 'unknown'}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>

                        {/* Basic Configuration */}
                        <Grid item xs={12}>
                            <Divider sx={{ my: 2 }} />
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                                Basic Configuration
                            </Typography>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <TextField
                                label="Tag Name"
                                value={tagName}
                                onChange={e => handleTagNameChange(e.target.value)}
                                fullWidth
                                required
                                autoFocus
                                helperText="Unique identifier for this data point"
                            />
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth>
                                <InputLabel>Tag Type</InputLabel>
                                <Select
                                    value={tagType}
                                    onChange={e => setTagType(e.target.value)}
                                    label="Tag Type"
                                >
                                    {tagTypes.map(type => (
                                        <MenuItem key={type.value} value={type.value}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <type.icon fontSize="small" />
                                                <Box>
                                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                        {type.label}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {type.description}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12} md={8}>
                            <TextField
                                label="Address"
                                value={address}
                                onChange={e => setAddress(e.target.value)}
                                fullWidth
                                helperText={getAddressHint()}
                                placeholder="40001"
                            />
                        </Grid>

                        <Grid item xs={12} md={4}>
                            <TextField
                                label="Update Interval (ms)"
                                value={updateInterval}
                                onChange={e => setUpdateInterval(e.target.value)}
                                fullWidth
                                type="number"
                                helperText="How often to read this tag"
                            />
                        </Grid>

                        {/* Professional SCADA Configuration */}
                        <Grid item xs={12}>
                            <Divider sx={{ my: 2 }} />
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                                Professional SCADA Configuration
                            </Typography>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <TextField
                                label="Tag Group"
                                value={tagGroup}
                                onChange={e => setTagGroup(e.target.value)}
                                fullWidth
                                helperText="Group tags by system or area (e.g., 'Reactor_1', 'Cooling_System')"
                                placeholder="Reactor_1"
                            />
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth>
                                <InputLabel>Data Type</InputLabel>
                                <Select
                                    value={dataType}
                                    onChange={e => setDataType(e.target.value)}
                                    label="Data Type"
                                >
                                    {dataTypes.map(type => (
                                        <MenuItem key={type.value} value={type.value}>
                                            <Box>
                                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                    {type.label}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {type.description}
                                                </Typography>
                                            </Box>
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <TextField
                                label="Engineering Unit"
                                value={engineeringUnit}
                                onChange={e => setEngineeringUnit(e.target.value)}
                                fullWidth
                                helperText="Physical unit (°C, bar, RPM, L/min, etc.)"
                                placeholder="°C"
                                select
                            >
                                <MenuItem value="">
                                    <em>No unit</em>
                                </MenuItem>
                                {commonUnits.map(unit => (
                                    <MenuItem key={unit} value={unit}>
                                        {unit}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <TextField
                                label="Deadband"
                                value={deadband}
                                onChange={e => setDeadband(e.target.value)}
                                type="number"
                                fullWidth
                                helperText="Minimum change to trigger update (noise filter)"
                                placeholder="0.1"
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <Divider sx={{ my: 2 }} />
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                                Industrial Scaling (4-20mA, 0-10V, etc.)
                            </Typography>
                        </Grid>

                        <Grid item xs={12} md={3}>
                            <TextField
                                label="Raw Min"
                                value={rawMin}
                                onChange={e => setRawMin(e.target.value)}
                                type="number"
                                fullWidth
                                helperText="Input minimum (e.g., 4mA)"
                                placeholder="4"
                            />
                        </Grid>

                        <Grid item xs={12} md={3}>
                            <TextField
                                label="Raw Max"
                                value={rawMax}
                                onChange={e => setRawMax(e.target.value)}
                                type="number"
                                fullWidth
                                helperText="Input maximum (e.g., 20mA)"
                                placeholder="20"
                            />
                        </Grid>

                        <Grid item xs={12} md={3}>
                            <TextField
                                label="Scaled Min"
                                value={scaledMin}
                                onChange={e => setScaledMin(e.target.value)}
                                type="number"
                                fullWidth
                                helperText="Engineering minimum"
                                placeholder="0"
                            />
                        </Grid>

                        <Grid item xs={12} md={3}>
                            <TextField
                                label="Scaled Max"
                                value={scaledMax}
                                onChange={e => setScaledMax(e.target.value)}
                                type="number"
                                fullWidth
                                helperText="Engineering maximum"
                                placeholder="100"
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <TextField
                                label="Description"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                fullWidth
                                multiline
                                rows={3}
                                helperText="Tag documentation and notes"
                                placeholder="Temperature sensor for reactor cooling system. Critical for safety shutdown."
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={readOnly}
                                        onChange={e => setReadOnly(e.target.checked)}
                                        color="warning"
                                    />
                                }
                                label={
                                    <Box>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                            Read-Only Tag
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Prevent writes to this tag for safety
                                        </Typography>
                                    </Box>
                                }
                            />
                        </Grid>

                        {/* Simulation Settings */}
                        <Grid item xs={12}>
                            <Divider sx={{ my: 2 }} />
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={simulation}
                                        onChange={e => setSimulation(e.target.checked)}
                                        color="warning"
                                    />
                                }
                                label={
                                    <Box>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                            Enable Industrial Simulation
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Generate realistic test data instead of reading from device
                                        </Typography>
                                    </Box>
                                }
                            />
                        </Grid>

                        {simulation && (
                            <>
                                <Grid item xs={12} md={4}>
                                    <TextField
                                        label="Min Value"
                                        value={simulationMin}
                                        onChange={e => setSimulationMin(e.target.value)}
                                        type="number"
                                        fullWidth
                                        helperText="Minimum simulated value"
                                    />
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <TextField
                                        label="Max Value"
                                        value={simulationMax}
                                        onChange={e => setSimulationMax(e.target.value)}
                                        type="number"
                                        fullWidth
                                        helperText="Maximum simulated value"
                                    />
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <TextField
                                        label="Noise Level"
                                        value={simulationNoise}
                                        onChange={e => setSimulationNoise(e.target.value)}
                                        type="number"
                                        fullWidth
                                        helperText="Random variation amount"
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <FormControl fullWidth>
                                        <InputLabel>Simulation Pattern</InputLabel>
                                        <Select
                                            value={simulationPattern}
                                            onChange={e => setSimulationPattern(e.target.value)}
                                            label="Simulation Pattern"
                                        >
                                            {simulationPatterns.map(pattern => (
                                                <MenuItem key={pattern.value} value={pattern.value}>
                                                    <Box>
                                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                            {pattern.label}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {pattern.description}
                                                        </Typography>
                                                    </Box>
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>

                                {/* Pattern Info Display */}
                                {simulation && tagName && (
                                    <Grid item xs={12}>
                                        <Box sx={{
                                            p: 2,
                                            borderRadius: 2,
                                            background: isDark
                                                ? 'rgba(251, 146, 60, 0.1)'
                                                : 'rgba(251, 146, 60, 0.05)',
                                            border: '1px solid rgba(251, 146, 60, 0.3)'
                                        }}>
                                            <Typography variant="body2" sx={{ fontWeight: 600, color: 'warning.main', mb: 1 }}>
                                                🎯 Auto-Configuration Preview
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {getSimulationSuggestions(tagName).description}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                )}
                            </>
                        )}
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ p: 3, pt: 2 }}>
                    <Button onClick={() => setAddOpen(false)} sx={{ borderRadius: 2 }}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleAdd}
                        variant="contained"
                        disabled={!tagName.trim() || !selectedDeviceId || !projectId}
                        sx={{
                            borderRadius: 2,
                            px: 3,
                            background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)'
                        }}
                    >
                        Create Professional Tag
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Enhanced Edit Dialog */}
            <Dialog
                open={editOpen}
                onClose={() => setEditOpen(false)}
                maxWidth="lg"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 4,
                        background: isDark
                            ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
                            : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)'
                    }
                }}
            >
                <DialogTitle>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                        Edit Professional Tag: {current?.tag_name}
                    </Typography>
                </DialogTitle>
                <DialogContent>
                    <Grid container spacing={3} sx={{ mt: 1 }}>
                        {/* Basic Configuration */}
                        <Grid item xs={12} md={6}>
                            <TextField
                                label="Tag Name"
                                value={tagName}
                                onChange={e => setTagName(e.target.value)}
                                fullWidth
                                required
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth>
                                <InputLabel>Tag Type</InputLabel>
                                <Select value={tagType} onChange={e => setTagType(e.target.value)} label="Tag Type">
                                    {tagTypes.map(type => (
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
                        <Grid item xs={12} md={8}>
                            <TextField
                                label="Address"
                                value={address}
                                onChange={e => setAddress(e.target.value)}
                                fullWidth
                            />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <TextField
                                label="Update Interval (ms)"
                                value={updateInterval}
                                onChange={e => setUpdateInterval(e.target.value)}
                                fullWidth
                                type="number"
                            />
                        </Grid>

                        {/* Professional Fields */}
                        <Grid item xs={12}>
                            <Divider sx={{ my: 2 }} />
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                                Professional Configuration
                            </Typography>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <TextField
                                label="Tag Group"
                                value={tagGroup}
                                onChange={e => setTagGroup(e.target.value)}
                                fullWidth
                            />
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth>
                                <InputLabel>Data Type</InputLabel>
                                <Select
                                    value={dataType}
                                    onChange={e => setDataType(e.target.value)}
                                    label="Data Type"
                                >
                                    {dataTypes.map(type => (
                                        <MenuItem key={type.value} value={type.value}>
                                            {type.label}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <TextField
                                label="Engineering Unit"
                                value={engineeringUnit}
                                onChange={e => setEngineeringUnit(e.target.value)}
                                fullWidth
                                select
                            >
                                <MenuItem value="">
                                    <em>No unit</em>
                                </MenuItem>
                                {commonUnits.map(unit => (
                                    <MenuItem key={unit} value={unit}>
                                        {unit}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <TextField
                                label="Deadband"
                                value={deadband}
                                onChange={e => setDeadband(e.target.value)}
                                type="number"
                                fullWidth
                            />
                        </Grid>

                        {/* Scaling */}
                        <Grid item xs={12}>
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                                Industrial Scaling
                            </Typography>
                        </Grid>

                        <Grid item xs={12} md={3}>
                            <TextField
                                label="Raw Min"
                                value={rawMin}
                                onChange={e => setRawMin(e.target.value)}
                                type="number"
                                fullWidth
                            />
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <TextField
                                label="Raw Max"
                                value={rawMax}
                                onChange={e => setRawMax(e.target.value)}
                                type="number"
                                fullWidth
                            />
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <TextField
                                label="Scaled Min"
                                value={scaledMin}
                                onChange={e => setScaledMin(e.target.value)}
                                type="number"
                                fullWidth
                            />
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <TextField
                                label="Scaled Max"
                                value={scaledMax}
                                onChange={e => setScaledMax(e.target.value)}
                                type="number"
                                fullWidth
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <TextField
                                label="Description"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                fullWidth
                                multiline
                                rows={3}
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={readOnly}
                                        onChange={e => setReadOnly(e.target.checked)}
                                        color="warning"
                                    />
                                }
                                label="Read-Only Tag"
                            />
                        </Grid>

                        {/* Simulation */}
                        <Grid item xs={12}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={simulation}
                                        onChange={e => setSimulation(e.target.checked)}
                                        color="warning"
                                    />
                                }
                                label="Enable Industrial Simulation"
                            />
                        </Grid>
                        {simulation && (
                            <>
                                <Grid item xs={12} md={4}>
                                    <TextField
                                        label="Min Value"
                                        value={simulationMin}
                                        onChange={e => setSimulationMin(e.target.value)}
                                        type="number"
                                        fullWidth
                                    />
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <TextField
                                        label="Max Value"
                                        value={simulationMax}
                                        onChange={e => setSimulationMax(e.target.value)}
                                        type="number"
                                        fullWidth
                                    />
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <TextField
                                        label="Noise Level"
                                        value={simulationNoise}
                                        onChange={e => setSimulationNoise(e.target.value)}
                                        type="number"
                                        fullWidth
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <FormControl fullWidth>
                                        <InputLabel>Simulation Pattern</InputLabel>
                                        <Select
                                            value={simulationPattern}
                                            onChange={e => setSimulationPattern(e.target.value)}
                                            label="Simulation Pattern"
                                        >
                                            {simulationPatterns.map(pattern => (
                                                <MenuItem key={pattern.value} value={pattern.value}>
                                                    {pattern.label}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                            </>
                        )}
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={() => setEditOpen(false)}>Cancel</Button>
                    <Button onClick={handleEdit} variant="contained">Save Changes</Button>
                </DialogActions>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="sm" PaperProps={{
                sx: {
                    borderRadius: 4,
                    background: isDark
                        ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
                        : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)'
                }
            }}>
                <DialogTitle>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: 'error.main' }}>
                        Delete Tag
                    </Typography>
                </DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to delete tag <strong>{current?.tag_name}</strong>?
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        All associated measurements will be permanently removed.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
                    <Button onClick={handleDelete} color="error" variant="contained">Delete Tag</Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
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