// src/pages/AlarmsPage.js - COMPLETE FIXED VERSION WITH SOUND INTEGRATION
import React, { useEffect, useState } from 'react';
import {
    Grid, Paper, Box, Typography, IconButton, Tooltip, Chip, Fab, Dialog,
    DialogTitle, DialogContent, DialogActions, TextField, Button, Snackbar, Alert,
    InputAdornment, Avatar, Stack, Card, CardContent, MenuItem, FormControl, InputLabel, Select,
    List, ListItem, ListItemText, Divider, Badge, Switch, FormControlLabel, Tabs, Tab,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Warning as WarningIcon,
    Search as SearchIcon,
    Error as ErrorIcon,
    Info as InfoIcon,
    CheckCircle as CheckCircleIcon,
    Circle as CircleIcon,
    NotificationsActive as NotificationsActiveIcon,
    Notifications as NotificationsIcon,
    Schedule as ScheduleIcon,
    Router as RouterIcon,
    Cable as CableIcon,
    Computer as SimulationIcon,
    Memory as MemoryIcon,
    Wifi as WifiIcon,
    WifiOff as WifiOffIcon,
    Check as CheckIcon,
    Assessment as AssessmentIcon,
    History as HistoryIcon,
    Settings as SettingsIcon,
    Refresh as RefreshIcon,
    PlayArrow as PlayArrowIcon,
    Stop as StopIcon,
    VolumeUp as VolumeUpIcon,
    VolumeOff as VolumeOffIcon,
    VolumeDown as VolumeDownIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import axios from '../api/axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useRealTimeData } from '../hooks/useWebSocket';

// FIXED ALARM SOUND IMPORTS:
import { useAlarmSound } from '../context/AlarmSoundContext';
import { AlarmSoundControls } from '../components/AlarmSoundControls';
import { useAlarmSoundEffects } from '../hooks/useAlarmSoundEffects';

function TabPanel({ children, value, index, ...other }) {
    return (
        <div role="tabpanel" hidden={value !== index} {...other}>
            {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
        </div>
    );
}

export default function AlarmsPage() {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const { isDark } = useTheme();

    // Enhanced WebSocket real-time data with alarm support
    const {
        isConnected,
        measurements,
        deviceStatuses,
        measurementCount,
        // Real-time alarm data from WebSocket
        activeAlarms: wsActiveAlarms = [],
        alarmSummary: wsAlarmSummary = {},
        alarmEvents: wsAlarmEvents = [],
        alarmRuleChanges,
        // Alarm helper functions
        acknowledgeAlarm: wsAcknowledgeAlarm,
        hasActiveAlarms,
        hasCriticalAlarms,
        unacknowledgedAlarmCount = 0,
        criticalAlarmCount = 0
    } = useRealTimeData(projectId);

    // Tab state
    const [currentTab, setCurrentTab] = useState(0);

    // State for FUXA/Ignition style alarm system
    const [alarmRules, setAlarmRules] = useState([]);
    const [activeAlarms, setActiveAlarms] = useState([]);
    const [alarmEvents, setAlarmEvents] = useState([]);
    const [alarmStats, setAlarmStats] = useState(null);

    const [filtered, setFiltered] = useState([]);
    const [search, setSearch] = useState('');
    const [addOpen, setAddOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [ackOpen, setAckOpen] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, msg: '', severity: 'success' });
    const [current, setCurrent] = useState(null);
    const [tags, setTags] = useState([]);
    const [devices, setDevices] = useState([]);
    const [showEnabledOnly, setShowEnabledOnly] = useState(false);

    // Enhanced alarm rule form state
    const [ruleName, setRuleName] = useState('');
    const [conditionType, setConditionType] = useState('high');
    const [tagId, setTagId] = useState('');
    const [deviceId, setDeviceId] = useState('');
    const [threshold, setThreshold] = useState('');
    const [severity, setSeverity] = useState('warning');
    const [deadband, setDeadband] = useState('');
    const [delaySeconds, setDelaySeconds] = useState('');
    const [message, setMessage] = useState('');
    const [enabled, setEnabled] = useState(true);
    const [ackMessage, setAckMessage] = useState('');

    // Pagination for events
    const [eventsPage, setEventsPage] = useState(0);
    const [eventsRowsPerPage, setEventsRowsPerPage] = useState(25);

    // 🔧 FIXED: Moved BEFORE sound integration to avoid lexical declaration error
    // Use WebSocket real-time alarm data when available, fallback to API data
    const displayActiveAlarms = wsActiveAlarms?.length > 0 ? wsActiveAlarms : activeAlarms;
    const displayAlarmSummary = Object.keys(wsAlarmSummary).length > 0 ? wsAlarmSummary : alarmStats;

    // 🔧 FIXED: Better filtering for active alarms - MOVED UP
    const getFilteredActiveAlarms = () => {
        // Use WebSocket data if available, otherwise use API data
        let alarms = wsActiveAlarms?.length > 0 ? wsActiveAlarms : activeAlarms;

        console.log('🔧 Filtering active alarms:', {
            source: wsActiveAlarms?.length > 0 ? 'WebSocket' : 'API',
            total_alarms: alarms?.length || 0,
            alarms_data: alarms
        });

        // 🔧 FIXED: Only show truly unacknowledged alarms
        const filteredAlarms = (alarms || []).filter(alarm => {
            if (!alarm) return false;

            // 🔧 CRITICAL FIX: Handle different data structures from backend
            const isTriggered = (
                alarm.state === 'triggered' ||                           // Backend alarm_states.state
                (alarm.current_state === 'triggered') ||                 // From JOIN with alarm_rules
                (!alarm.acknowledged_at && !alarm.acknowledged_by) ||    // Not acknowledged
                (alarm.state === undefined && !alarm.acknowledged_at)    // Legacy format
            );

            console.log(`🔧 Alarm ${alarm.rule_name || alarm.id}: state=${alarm.state}, current_state=${alarm.current_state}, ack_at=${alarm.acknowledged_at}, result=${isTriggered}`);

            return isTriggered;
        });

        console.log('🔧 Filtered result:', {
            original_count: alarms?.length || 0,
            active_count: filteredAlarms.length,
            filtered_alarms: filteredAlarms.map(a => ({ id: a.id, rule_name: a.rule_name, state: a.state }))
        });

        return filteredAlarms;
    };

    // Get the currently filtered active alarms for display - MOVED UP
    const currentActiveAlarms = getFilteredActiveAlarms();

    // ADD ALARM SOUND INTEGRATION - NOW SAFE TO USE currentActiveAlarms
    const {
        playAlarmSequence,
        stopAlarm,
        isEnabled: soundEnabled,
        playTestSound,
        currentAlarm,
        soundStatus
    } = useAlarmSound();

    // Enable automatic sound triggering - NOW currentActiveAlarms exists
    useAlarmSoundEffects(currentActiveAlarms, wsAlarmEvents);

    // 🔧 FIXED: Fetch alarm rules (configuration)
    const fetchAlarmRules = () => {
        if (!projectId) return;
        console.log('📤 Fetching alarm rules...');

        axios.get(`/alarms/project/${projectId}/rules`)
            .then(res => {
                console.log('✅ Alarm rules fetched:', res.data);
                // 🔧 FIX: Handle both array and object responses
                const rules = Array.isArray(res.data) ? res.data : (res.data.rules || []);
                setAlarmRules(rules);
                setFiltered(rules);
            })
            .catch(err => {
                console.error('❌ Failed to fetch alarm rules:', err);
                setSnackbar({ open: true, msg: 'Failed to load alarm rules', severity: 'error' });
            });
    };

    // 🔧 FIXED: Fetch active alarms with proper data handling
    const fetchActiveAlarms = () => {
        if (!projectId) return;
        console.log('📤 Fetching active alarms (triggered only)...');

        // 🔧 FIX: Request only triggered alarms
        axios.get(`/alarms/project/${projectId}/active?state=triggered`)
            .then(res => {
                console.log('✅ Active alarms fetched:', res.data);
                // 🔧 FIX: Handle both array and object responses
                const alarms = Array.isArray(res.data) ? res.data : (res.data.alarms || []);
                console.log('🔧 Processed active alarms:', alarms.length);
                setActiveAlarms(alarms);
            })
            .catch(err => {
                console.error('❌ Failed to fetch active alarms:', err);
                setSnackbar({ open: true, msg: 'Failed to load active alarms', severity: 'error' });
            });
    };

    // 🔧 FIXED: Fetch alarm events (history) with proper data handling
    const fetchAlarmEvents = () => {
        if (!projectId) return;
        console.log('📤 Fetching alarm events...');

        axios.get(`/alarms/project/${projectId}/events?limit=100&days=7`)
            .then(res => {
                console.log('✅ Alarm events fetched:', res.data);
                // 🔧 FIX: Handle both array and object responses
                const events = Array.isArray(res.data) ? res.data : (res.data.events || []);
                setAlarmEvents(events);
            })
            .catch(err => {
                console.error('❌ Failed to fetch alarm events:', err);
                setSnackbar({ open: true, msg: 'Failed to load alarm events', severity: 'error' });
            });
    };

    // 🔧 FIXED: Fetch alarm statistics with proper data handling
    const fetchAlarmStats = () => {
        if (!projectId) return;
        console.log('📤 Fetching alarm stats...');

        axios.get(`/alarms/project/${projectId}/stats`)
            .then(res => {
                console.log('✅ Alarm stats fetched:', res.data);
                setAlarmStats(res.data);
            })
            .catch(err => {
                console.error('❌ Failed to fetch alarm stats:', err);
                // Don't show error for stats as it's not critical
            });
    };

    // 🔧 FIXED: Fetch tags and devices with better error handling
    const fetchTagsAndDevices = () => {
        if (!projectId) return;
        console.log('📤 Fetching tags and devices...');

        // Fetch devices
        axios.get(`/devices/project/${projectId}`)
            .then(res => {
                console.log('✅ Devices fetched:', res.data);
                const devicesData = Array.isArray(res.data) ? res.data : (res.data.devices || []);
                setDevices(devicesData);

                // Fetch tags for all devices
                const tagPromises = devicesData.map(device =>
                    axios.get(`/tags/device/${device.device_id}`)
                        .then(response => {
                            const tagsData = Array.isArray(response.data) ? response.data : (response.data.tags || []);
                            return tagsData.map(tag => ({
                                ...tag,
                                device_name: device.device_name,
                                device_type: device.device_type
                            }));
                        })
                        .catch(err => {
                            console.error(`❌ Failed to fetch tags for device ${device.device_id}:`, err);
                            return [];
                        })
                );

                return Promise.all(tagPromises);
            })
            .then(tagResults => {
                const allTags = tagResults.flat();
                console.log('✅ Tags fetched:', allTags);
                setTags(allTags);
            })
            .catch(err => {
                console.error('❌ Failed to fetch tags and devices:', err);
                setSnackbar({ open: true, msg: 'Failed to load tags and devices', severity: 'error' });
            });
    };

    // Real-time alarm rule change notifications
    useEffect(() => {
        if (alarmRuleChanges) {
            const { type, rule, rule_name } = alarmRuleChanges;
            let message = '';
            let severity = 'info';

            switch (type) {
                case 'created':
                    message = `New alarm rule created: ${rule?.rule_name}`;
                    severity = 'success';
                    fetchAlarmRules();
                    break;
                case 'updated':
                    message = `Alarm rule updated: ${rule?.rule_name}`;
                    severity = 'info';
                    fetchAlarmRules();
                    break;
                case 'deleted':
                    message = `Alarm rule deleted: ${rule_name}`;
                    severity = 'warning';
                    fetchAlarmRules();
                    break;
            }

            if (message) {
                setSnackbar({ open: true, msg: message, severity });
            }
        }
    }, [alarmRuleChanges]);

    // 🔧 FIXED: Real-time alarm event notifications
    useEffect(() => {
        if (wsAlarmEvents?.length > 0) {
            const latestEvent = wsAlarmEvents[0];
            if (latestEvent.type === 'triggered') {
                setSnackbar({
                    open: true,
                    msg: `🚨 ALARM: ${latestEvent.rule_name}`,
                    severity: 'error'
                });
                // Auto-switch to active alarms tab
                if (currentTab === 0) {
                    setCurrentTab(1);
                }
                // Refresh active alarms
                fetchActiveAlarms();
            }
        }
    }, [wsAlarmEvents, currentTab]);

    // 🔧 FIXED: Listen for real-time alarm summary updates
    useEffect(() => {
        if (Object.keys(wsAlarmSummary).length > 0) {
            console.log('🔧 WebSocket alarm summary updated:', wsAlarmSummary);
            // Refresh active alarms when summary changes
            fetchActiveAlarms();
        }
    }, [wsAlarmSummary]);

    // Initial data loading
    useEffect(() => {
        fetchAlarmRules();
        fetchActiveAlarms();
        fetchAlarmEvents();
        fetchAlarmStats();
        fetchTagsAndDevices();
    }, [projectId]);

    // Filter alarm rules
    useEffect(() => {
        let filteredRules = alarmRules;

        // Filter by search term
        if (search) {
            filteredRules = filteredRules.filter(rule =>
                rule.rule_name?.toLowerCase().includes(search.toLowerCase()) ||
                (rule.tag_name && rule.tag_name.toLowerCase().includes(search.toLowerCase())) ||
                (rule.device_name && rule.device_name.toLowerCase().includes(search.toLowerCase())) ||
                (rule.severity && rule.severity.toLowerCase().includes(search.toLowerCase()))
            );
        }

        // Filter by enabled status
        if (showEnabledOnly) {
            filteredRules = filteredRules.filter(rule => rule.enabled);
        }

        setFiltered(filteredRules);
    }, [search, alarmRules, showEnabledOnly]);

    // 🔧 FIXED: Check if alarm rule has active alarm
    const isRuleActive = (ruleId) => {
        const isActive = currentActiveAlarms?.some(alarm =>
            alarm.rule_id === ruleId || alarm.id === ruleId
        ) || false;

        console.log(`🔧 Rule ${ruleId} active check:`, isActive);
        return isActive;
    };

    // Get real-time alarm condition status
    const checkAlarmCondition = (rule) => {
        const currentValue = measurements[rule.tag_id]?.value;
        if (currentValue === null || currentValue === undefined) {
            return { status: 'no_data', message: 'No real-time data available' };
        }

        const threshold = parseFloat(rule.threshold);
        let conditionMet = false;

        switch (rule.condition_type?.toLowerCase()) {
            case 'high':
                conditionMet = currentValue > threshold;
                break;
            case 'low':
                conditionMet = currentValue < threshold;
                break;
            case 'change':
                conditionMet = Math.abs(currentValue - threshold) > (parseFloat(rule.deadband) || 0.1);
                break;
            default:
                conditionMet = false;
        }

        return {
            status: conditionMet ? 'condition_met' : 'normal',
            message: conditionMet
                ? `Condition met: ${currentValue.toFixed(2)} ${rule.condition_type} ${threshold}`
                : `Normal: ${currentValue.toFixed(2)}`,
            currentValue
        };
    };

    // Create alarm rule
    const handleAdd = () => {
        if (!ruleName || !tagId || !deviceId || !threshold) {
            setSnackbar({ open: true, msg: 'Please fill all required fields', severity: 'error' });
            return;
        }

        console.log('📤 Creating alarm rule...');

        axios.post(`/alarms/project/${projectId}/rules`, {
            rule_name: ruleName,
            tag_id: parseInt(tagId),
            device_id: parseInt(deviceId),
            threshold: parseFloat(threshold),
            condition_type: conditionType,
            severity,
            deadband: deadband ? parseFloat(deadband) : 0,
            delay_seconds: delaySeconds ? parseInt(delaySeconds) : 0,
            message: message || null,
            enabled
        })
            .then(() => {
                console.log('✅ Alarm rule created successfully');
                setAddOpen(false);
                resetForm();
                setSnackbar({ open: true, msg: 'Alarm rule created successfully!', severity: 'success' });
                fetchAlarmRules();
                fetchAlarmStats();
            })
            .catch(err => {
                console.error('❌ Failed to create alarm rule:', err);
                setSnackbar({
                    open: true,
                    msg: err.response?.data?.error || 'Failed to create alarm rule',
                    severity: 'error'
                });
            });
    };

    // Update alarm rule
    const handleEdit = () => {
        if (!current || !ruleName || !tagId || !threshold) {
            setSnackbar({ open: true, msg: 'Please fill all required fields', severity: 'error' });
            return;
        }

        console.log('📤 Updating alarm rule...');

        // 🔧 FIX: Use correct rule ID field
        const ruleId = current.rule_id || current.id;

        axios.put(`/alarms/project/${projectId}/rules/${ruleId}`, {
            rule_name: ruleName,
            threshold: parseFloat(threshold),
            condition_type: conditionType,
            severity,
            deadband: deadband ? parseFloat(deadband) : 0,
            delay_seconds: delaySeconds ? parseInt(delaySeconds) : 0,
            message: message || null,
            enabled
        })
            .then(() => {
                console.log('✅ Alarm rule updated successfully');
                setEditOpen(false);
                resetForm();
                setSnackbar({ open: true, msg: 'Alarm rule updated successfully!', severity: 'success' });
                fetchAlarmRules();
                fetchAlarmStats();
            })
            .catch(err => {
                console.error('❌ Failed to update alarm rule:', err);
                setSnackbar({
                    open: true,
                    msg: err.response?.data?.error || 'Failed to update alarm rule',
                    severity: 'error'
                });
            });
    };

    // Delete alarm rule
    const handleDelete = () => {
        if (!current) return;

        console.log('📤 Deleting alarm rule...');

        // 🔧 FIX: Use correct rule ID field
        const ruleId = current.rule_id || current.id;

        axios.delete(`/alarms/project/${projectId}/rules/${ruleId}`)
            .then(() => {
                console.log('✅ Alarm rule deleted successfully');
                setDeleteOpen(false);
                setSnackbar({ open: true, msg: 'Alarm rule deleted successfully!', severity: 'success' });
                fetchAlarmRules();
                fetchActiveAlarms();
                fetchAlarmStats();
            })
            .catch(err => {
                console.error('❌ Failed to delete alarm rule:', err);
                setSnackbar({
                    open: true,
                    msg: err.response?.data?.error || 'Failed to delete alarm rule',
                    severity: 'error'
                });
            });
    };

    // 🔧 FIXED: Enhanced acknowledge alarm with proper rule ID handling
    const handleAcknowledge = () => {
        if (!current) return;

        // 🔧 FIX: Use correct rule ID field
        const ruleId = current.rule_id || current.id;
        console.log('📤 Acknowledging alarm:', current.rule_name, 'Rule ID:', ruleId);

        const ackPayload = {
            message: ackMessage || 'Acknowledged by operator'
        };

        // 🔧 FIX: Use the exact URL pattern that matches your routes
        axios.put(`/alarms/project/${projectId}/active/${ruleId}/ack`, ackPayload)
            .then((response) => {
                console.log('✅ Alarm acknowledged successfully:', response.data);

                // 🔧 IMMEDIATE FIX: Remove the acknowledged alarm from active alarms immediately
                setActiveAlarms(prevAlarms => {
                    const updatedAlarms = prevAlarms.filter(alarm => {
                        const alarmRuleId = alarm.rule_id || alarm.id;
                        return alarmRuleId !== ruleId;
                    });
                    console.log('🔧 Removed alarm from local state. Remaining alarms:', updatedAlarms.length);
                    return updatedAlarms;
                });

                // Close dialog
                setAckOpen(false);
                setAckMessage('');

                setSnackbar({
                    open: true,
                    msg: `✅ Alarm "${current.rule_name}" acknowledged successfully!`,
                    severity: 'success'
                });

                // Refresh data after delay to sync with backend
                setTimeout(() => {
                    fetchActiveAlarms();
                    fetchAlarmEvents();
                    fetchAlarmStats();
                    fetchAlarmRules();
                }, 1000);

                // 🔧 FIX: Try WebSocket acknowledgment as well if connected
                if (isConnected && wsAcknowledgeAlarm) {
                    console.log('🔗 Also sending WebSocket acknowledgment');
                    try {
                        wsAcknowledgeAlarm(ruleId, ackMessage || 'Acknowledged by operator');
                    } catch (wsError) {
                        console.log('⚠️ WebSocket acknowledgment failed:', wsError);
                    }
                }

            })
            .catch(err => {
                console.error('❌ Failed to acknowledge alarm:', err);
                console.error('❌ Error response:', err.response?.data);
                console.error('❌ Error status:', err.response?.status);

                setSnackbar({
                    open: true,
                    msg: `❌ Failed to acknowledge alarm: ${err.response?.data?.details || err.response?.data?.error || err.message}`,
                    severity: 'error'
                });
            });
    };

    const resetForm = () => {
        setRuleName(''); setConditionType('high'); setTagId(''); setDeviceId('');
        setThreshold(''); setSeverity('warning'); setDeadband(''); setDelaySeconds('');
        setMessage(''); setEnabled(true);
    };

    const openEdit = (rule) => {
        setCurrent(rule);
        setRuleName(rule.rule_name);
        setConditionType(rule.condition_type || 'high');
        setTagId(rule.tag_id?.toString() || '');
        setDeviceId(rule.device_id?.toString() || '');
        setThreshold(rule.threshold?.toString() || '');
        setSeverity(rule.severity || 'warning');
        setDeadband(rule.deadband?.toString() || '');
        setDelaySeconds(rule.delay_seconds?.toString() || '');
        setMessage(rule.message || '');
        setEnabled(rule.enabled !== false);
        setEditOpen(true);
    };

    const openAcknowledge = (alarm) => {
        setCurrent(alarm);
        setAckMessage('');
        setAckOpen(true);
    };

    const getSeverityColor = (severity) => {
        switch (severity?.toLowerCase()) {
            case 'critical': return 'error';
            case 'warning': return 'warning';
            case 'info': return 'info';
            default: return 'default';
        }
    };

    const getSeverityIcon = (severity) => {
        switch (severity?.toLowerCase()) {
            case 'critical': return ErrorIcon;
            case 'warning': return WarningIcon;
            case 'info': return InfoIcon;
            default: return NotificationsIcon;
        }
    };

    const getConditionTypeColor = (type) => {
        switch (type?.toLowerCase()) {
            case 'high': return 'error';
            case 'low': return 'warning';
            case 'change': return 'info';
            default: return 'default';
        }
    };

    const getDeviceIcon = (deviceType) => {
        switch (deviceType?.toLowerCase()) {
            case 'modbus': return RouterIcon;
            case 'mqtt': return CableIcon;
            case 'simulation': return SimulationIcon;
            default: return MemoryIcon;
        }
    };

    const formatEventType = (eventType) => {
        switch (eventType?.toLowerCase()) {
            case 'triggered': return { label: 'TRIGGERED', color: 'error', icon: WarningIcon };
            case 'acknowledged': return { label: 'ACKNOWLEDGED', color: 'warning', icon: CheckIcon };
            case 'cleared': return { label: 'CLEARED', color: 'success', icon: CheckCircleIcon };
            case 'disabled': return { label: 'DISABLED', color: 'default', icon: StopIcon };
            default: return { label: eventType?.toUpperCase() || 'UNKNOWN', color: 'default', icon: InfoIcon };
        }
    };

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
                    <Avatar sx={{
                        width: 48,
                        height: 48,
                        background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)'
                    }}>
                        <WarningIcon />
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
                            Alarms
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            Professional SCADA alarm management system
                        </Typography>
                    </Box>
                </Box>

                {/* Status Cards */}
                <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{
                            background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                            color: 'white'
                        }}>
                            <CardContent sx={{ p: 2 }}>
                                <Typography variant="h4" sx={{ fontWeight: 800 }}>
                                    {displayAlarmSummary?.rules?.total_rules || alarmRules.length}
                                </Typography>
                                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                    Alarm Rules
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{
                            background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
                            color: 'white'
                        }}>
                            <CardContent sx={{ p: 2 }}>
                                <Typography variant="h4" sx={{ fontWeight: 800 }}>
                                    {displayAlarmSummary?.active_alarms?.total_active || currentActiveAlarms.length}
                                </Typography>
                                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                    Active Alarms
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{
                            background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                            color: 'white'
                        }}>
                            <CardContent sx={{ p: 2 }}>
                                <Typography variant="h4" sx={{ fontWeight: 800 }}>
                                    {unacknowledgedAlarmCount || displayAlarmSummary?.active_alarms?.unacknowledged || currentActiveAlarms.length}
                                </Typography>
                                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                    Unacknowledged
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{
                            background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
                            color: 'white'
                        }}>
                            <CardContent sx={{ p: 2 }}>
                                <Typography variant="h4" sx={{ fontWeight: 800 }}>
                                    {measurementCount}
                                </Typography>
                                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                    Live Tags
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>

                {/* UPDATED Controls with Sound Integration */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                        <Chip
                            icon={isConnected ? <WifiIcon /> : <WifiOffIcon />}
                            label={isConnected ? 'Real-time Connected' : 'Offline Mode'}
                            color={isConnected ? 'success' : 'error'}
                            sx={{ fontWeight: 600 }}
                        />

                        {/* Real-time alarm indicator */}
                        {isConnected && currentActiveAlarms.length > 0 && (
                            <Chip
                                icon={<NotificationsActiveIcon />}
                                label={`${currentActiveAlarms.length} Live Alarms`}
                                color="error"
                                sx={{ fontWeight: 600, animation: hasCriticalAlarms ? 'pulse 2s infinite' : 'none' }}
                            />
                        )}

                        {/* ALARM SOUND STATUS INDICATOR */}
                        <Chip
                            icon={soundEnabled ? <VolumeUpIcon /> : <VolumeOffIcon />}
                            label={soundEnabled ? 'Sounds On' : 'Sounds Off'}
                            color={soundEnabled ? 'success' : 'default'}
                            sx={{
                                fontWeight: 600,
                                cursor: 'pointer',
                                '&:hover': {
                                    background: soundEnabled ? 'rgba(16, 185, 129, 0.1)' : 'rgba(156, 163, 175, 0.1)'
                                }
                            }}
                            onClick={() => {
                                // Quick test sound
                                if (soundEnabled) {
                                    playTestSound('warning');
                                }
                            }}
                        />

                        {/* Show current playing alarm */}
                        {currentAlarm && soundStatus === 'playing' && (
                            <Chip
                                icon={<VolumeUpIcon />}
                                label={`🔊 ${currentAlarm.rule_name || 'Alarm Playing'}`}
                                color="error"
                                size="small"
                                sx={{
                                    fontWeight: 600,
                                    animation: 'pulse 2s infinite'
                                }}
                                onDelete={stopAlarm}
                                deleteIcon={<StopIcon />}
                            />
                        )}

                        {/* WebSocket data indicator */}
                        {wsActiveAlarms?.length > 0 && (
                            <Chip
                                label="Real-time Alarm Data"
                                color="success"
                                size="small"
                                sx={{ fontWeight: 600 }}
                            />
                        )}

                        <FormControlLabel
                            control={
                                <Switch
                                    checked={showEnabledOnly}
                                    onChange={(e) => setShowEnabledOnly(e.target.checked)}
                                    size="small"
                                />
                            }
                            label="Enabled only"
                        />
                    </Stack>

                    <Stack direction="row" spacing={2} alignItems="center">
                        {/* ALARM SOUND CONTROLS */}
                        <AlarmSoundControls variant="compact" />

                        <IconButton onClick={() => {
                            fetchAlarmRules();
                            fetchActiveAlarms();
                            fetchAlarmEvents();
                            fetchAlarmStats();
                        }}>
                            <RefreshIcon />
                        </IconButton>
                        <TextField
                            placeholder="Search alarms..."
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
                    </Stack>
                </Box>
            </Box>

            {/* Active Alarms Alert - Enhanced with real-time data */}
            {currentActiveAlarms?.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <Alert
                        severity={hasCriticalAlarms ? "error" : "warning"}
                        sx={{
                            mb: 3,
                            borderRadius: 3,
                            '& .MuiAlert-message': { fontWeight: 600 }
                        }}
                        icon={<NotificationsActiveIcon />}
                        action={
                            <Button
                                color="inherit"
                                size="small"
                                onClick={() => setCurrentTab(1)}
                            >
                                VIEW ALL
                            </Button>
                        }
                    >
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                            {currentActiveAlarms.length} Active Alarm{currentActiveAlarms.length > 1 ? 's' : ''} -
                            {hasCriticalAlarms ? ' CRITICAL ATTENTION REQUIRED' : ' Immediate Attention Required'}
                        </Typography>
                        <List dense>
                            {currentActiveAlarms.slice(0, 3).map((alarm, index) => (
                                <ListItem key={index} sx={{ py: 0 }}>
                                    <Typography variant="body2">
                                        • {alarm.rule_name} - {alarm.severity?.toUpperCase()} - {alarm.tag_name}
                                        {alarm.severity === 'critical' && ' 🔴'}
                                    </Typography>
                                </ListItem>
                            ))}
                            {currentActiveAlarms.length > 3 && (
                                <ListItem sx={{ py: 0 }}>
                                    <Typography variant="body2" color="text.secondary">
                                        ... and {currentActiveAlarms.length - 3} more alarms
                                    </Typography>
                                </ListItem>
                            )}
                        </List>
                    </Alert>
                </motion.div>
            )}

            {/* Tabs for different views */}
            <Paper sx={{
                mb: 3,
                background: isDark
                    ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
                    : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)'
            }}>
                <Tabs
                    value={currentTab}
                    onChange={(e, newValue) => setCurrentTab(newValue)}
                    indicatorColor="primary"
                    textColor="primary"
                >
                    <Tab label={`Alarm Rules (${alarmRules.length})`} icon={<SettingsIcon />} />
                    <Tab
                        label={
                            <Badge badgeContent={currentActiveAlarms.length} color="error">
                                Active Alarms
                            </Badge>
                        }
                        icon={<NotificationsActiveIcon />}
                    />
                    <Tab label={`Event History (${alarmEvents.length})`} icon={<HistoryIcon />} />
                    <Tab label="Statistics" icon={<AssessmentIcon />} />
                </Tabs>
            </Paper>

            {/* Tab Panel 0: Alarm Rules */}
            <TabPanel value={currentTab} index={0}>
                <Grid container spacing={3}>
                    {filtered.length === 0 && (
                        <Grid item xs={12}>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <Paper sx={{
                                    p: 6,
                                    textAlign: 'center',
                                    background: isDark
                                        ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
                                        : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                                    border: isDark ? '2px dashed #475569' : '2px dashed #cbd5e1'
                                }}>
                                    <SettingsIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                                    <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                                        {showEnabledOnly ? 'No Enabled Alarm Rules' : 'No Alarm Rules Configured'}
                                    </Typography>
                                    <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                                        {showEnabledOnly
                                            ? 'Enable some alarm rules to monitor your system'
                                            : 'Create your first alarm rule to monitor critical conditions'
                                        }
                                    </Typography>
                                    {!showEnabledOnly && (
                                        <Button
                                            variant="contained"
                                            startIcon={<AddIcon />}
                                            onClick={() => {
                                                resetForm();
                                                setAddOpen(true);
                                            }}
                                            sx={{ background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)' }}
                                        >
                                            Create First Alarm Rule
                                        </Button>
                                    )}
                                </Paper>
                            </motion.div>
                        </Grid>
                    )}

                    <AnimatePresence>
                        {filtered.map((rule, index) => {
                            const SeverityIcon = getSeverityIcon(rule.severity);
                            const ruleId = rule.rule_id || rule.id;
                            const isActive = isRuleActive(ruleId);
                            const DeviceIcon = getDeviceIcon(rule.device_type);
                            const alarmCondition = checkAlarmCondition(rule);

                            return (
                                <Grid item xs={12} sm={6} lg={4} key={ruleId}>
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        transition={{ delay: index * 0.1 }}
                                        whileHover={{ y: -4 }}
                                        layout
                                    >
                                        <Card sx={{
                                            height: '100%',
                                            background: isActive
                                                ? isDark
                                                    ? 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)'
                                                    : 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)'
                                                : !rule.enabled
                                                    ? isDark
                                                        ? 'linear-gradient(135deg, #374151 0%, #4b5563 100%)'
                                                        : 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)'
                                                    : isDark
                                                        ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
                                                        : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                                            border: isActive
                                                ? '2px solid #dc2626'
                                                : !rule.enabled
                                                    ? isDark ? '1px solid #6b7280' : '1px solid #d1d5db'
                                                    : isDark ? '1px solid #475569' : '1px solid #e2e8f0',
                                            cursor: 'pointer',
                                            transition: 'all 0.3s ease-in-out',
                                            position: 'relative',
                                            opacity: rule.enabled ? 1 : 0.7,
                                            '&:hover': {
                                                borderColor: '#2563eb',
                                                boxShadow: isDark
                                                    ? '0 20px 40px rgba(37, 99, 235, 0.2)'
                                                    : '0 20px 40px rgba(37, 99, 235, 0.1)',
                                                '& .alarm-actions': {
                                                    opacity: 1,
                                                    transform: 'translateY(0)'
                                                }
                                            }
                                        }}>
                                            {/* Active alarm animation */}
                                            {isActive && (
                                                <Box sx={{
                                                    position: 'absolute',
                                                    top: 0,
                                                    left: 0,
                                                    right: 0,
                                                    height: 4,
                                                    background: 'linear-gradient(90deg, #dc2626, #ef4444)',
                                                    animation: 'pulse 2s infinite'
                                                }} />
                                            )}

                                            <CardContent sx={{ p: 3 }}>
                                                {/* Rule Header */}
                                                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
                                                    <Avatar sx={{
                                                        width: 40,
                                                        height: 40,
                                                        background: isActive
                                                            ? 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)'
                                                            : `linear-gradient(135deg, ${getSeverityColor(rule.severity) === 'error' ? '#dc2626' : getSeverityColor(rule.severity) === 'warning' ? '#d97706' : '#2563eb'} 0%, ${getSeverityColor(rule.severity) === 'error' ? '#ef4444' : getSeverityColor(rule.severity) === 'warning' ? '#f59e0b' : '#3b82f6'} 100%)`,
                                                        animation: isActive ? 'pulse 2s infinite' : 'none'
                                                    }}>
                                                        <SeverityIcon fontSize="small" />
                                                    </Avatar>
                                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                                        <Typography variant="h6" sx={{
                                                            fontWeight: 700,
                                                            color: 'text.primary',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap',
                                                            mb: 0.5
                                                        }}>
                                                            {rule.rule_name}
                                                        </Typography>
                                                        <Stack direction="row" spacing={1} flexWrap="wrap">
                                                            <Chip
                                                                label={rule.severity || 'warning'}
                                                                color={getSeverityColor(rule.severity)}
                                                                size="small"
                                                                sx={{ fontWeight: 600, textTransform: 'uppercase' }}
                                                            />
                                                            <Chip
                                                                label={rule.condition_type || 'high'}
                                                                color={getConditionTypeColor(rule.condition_type)}
                                                                size="small"
                                                                sx={{ fontWeight: 600 }}
                                                            />
                                                            {!rule.enabled && (
                                                                <Chip
                                                                    label="DISABLED"
                                                                    color="default"
                                                                    size="small"
                                                                    sx={{ fontWeight: 600 }}
                                                                />
                                                            )}
                                                        </Stack>
                                                    </Box>
                                                </Box>

                                                {/* Rule Status */}
                                                {isActive ? (
                                                    <Box sx={{
                                                        p: 2,
                                                        borderRadius: 2,
                                                        background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
                                                        color: 'white',
                                                        mb: 2
                                                    }}>
                                                        <Typography variant="caption" sx={{ opacity: 0.9 }}>
                                                            🚨 ALARM ACTIVE
                                                        </Typography>
                                                        <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1 }}>
                                                            Condition Met
                                                        </Typography>
                                                        <Typography variant="caption" sx={{ opacity: 0.8 }}>
                                                            {alarmCondition.message}
                                                        </Typography>
                                                    </Box>
                                                ) : alarmCondition.status === 'normal' && rule.enabled ? (
                                                    <Box sx={{
                                                        p: 2,
                                                        borderRadius: 2,
                                                        background: isDark ? 'rgba(34, 197, 94, 0.1)' : '#f0fdf4',
                                                        border: isDark ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid #bbf7d0',
                                                        mb: 2,
                                                        textAlign: 'center'
                                                    }}>
                                                        <CheckCircleIcon sx={{ color: 'success.main', mb: 1 }} />
                                                        <Typography variant="body2" color="text.secondary">
                                                            Normal - {alarmCondition.message}
                                                        </Typography>
                                                    </Box>
                                                ) : (
                                                    <Box sx={{
                                                        p: 2,
                                                        borderRadius: 2,
                                                        background: isDark ? 'rgba(156, 163, 175, 0.1)' : '#f9fafb',
                                                        border: isDark ? '1px solid rgba(156, 163, 175, 0.3)' : '1px solid #d1d5db',
                                                        mb: 2,
                                                        textAlign: 'center'
                                                    }}>
                                                        <InfoIcon sx={{ color: 'text.secondary', mb: 1 }} />
                                                        <Typography variant="body2" color="text.secondary">
                                                            {!rule.enabled ? 'Rule disabled' : alarmCondition.message}
                                                        </Typography>
                                                    </Box>
                                                )}

                                                {/* Rule Details */}
                                                <Box sx={{ mb: 2 }}>
                                                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                                                        <Typography variant="body2" color="text.secondary">
                                                            <strong>Tag:</strong> {rule.tag_name}
                                                        </Typography>
                                                        <Chip
                                                            icon={<DeviceIcon fontSize="small" />}
                                                            label={rule.device_name}
                                                            size="small"
                                                            variant="outlined"
                                                            sx={{ fontSize: '0.7rem' }}
                                                        />
                                                    </Stack>
                                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                                        <strong>Threshold:</strong> {rule.threshold} ({rule.condition_type})
                                                    </Typography>
                                                    {rule.deadband > 0 && (
                                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                                            <strong>Deadband:</strong> ±{rule.deadband}
                                                        </Typography>
                                                    )}
                                                    {rule.delay_seconds > 0 && (
                                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                                            <strong>Delay:</strong> {rule.delay_seconds}s
                                                        </Typography>
                                                    )}
                                                    {rule.message && (
                                                        <Typography variant="body2" color="text.secondary">
                                                            <strong>Message:</strong> {rule.message}
                                                        </Typography>
                                                    )}
                                                    {measurements[rule.tag_id] && (
                                                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                                            <strong>Current Value:</strong> {measurements[rule.tag_id].value.toFixed(2)}
                                                            <Chip
                                                                label="LIVE"
                                                                size="small"
                                                                color="success"
                                                                sx={{ ml: 1, fontSize: '0.6rem', height: 16 }}
                                                            />
                                                        </Typography>
                                                    )}
                                                </Box>

                                                {/* Action Buttons */}
                                                <Box className="alarm-actions" sx={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    opacity: 0,
                                                    transform: 'translateY(10px)',
                                                    transition: 'all 0.3s ease-in-out'
                                                }}>
                                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                                        <Tooltip title="Edit Rule">
                                                            <IconButton
                                                                size="small"
                                                                onClick={e => {
                                                                    e.stopPropagation();
                                                                    openEdit(rule);
                                                                }}
                                                                sx={{
                                                                    bgcolor: isDark ? 'rgba(59, 130, 246, 0.1)' : 'primary.50',
                                                                    color: 'primary.main',
                                                                    '&:hover': { bgcolor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'primary.100' }
                                                                }}
                                                            >
                                                                <EditIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="Delete Rule">
                                                            <IconButton
                                                                size="small"
                                                                onClick={e => {
                                                                    e.stopPropagation();
                                                                    setCurrent(rule);
                                                                    setDeleteOpen(true);
                                                                }}
                                                                sx={{
                                                                    bgcolor: isDark ? 'rgba(239, 68, 68, 0.1)' : 'error.50',
                                                                    color: 'error.main',
                                                                    '&:hover': { bgcolor: isDark ? 'rgba(239, 68, 68, 0.2)' : 'error.100' }
                                                                }}
                                                            >
                                                                <DeleteIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>

                                                        {/* TEST ALARM SOUND BUTTON */}
                                                        <Tooltip title="Test Alarm Sound">
                                                            <IconButton
                                                                size="small"
                                                                onClick={e => {
                                                                    e.stopPropagation();
                                                                    playTestSound(rule.severity || 'warning');
                                                                }}
                                                                sx={{
                                                                    bgcolor: isDark ? 'rgba(14, 165, 233, 0.1)' : 'info.50',
                                                                    color: 'info.main',
                                                                    '&:hover': { bgcolor: isDark ? 'rgba(14, 165, 233, 0.2)' : 'info.100' }
                                                                }}
                                                                disabled={!soundEnabled}
                                                            >
                                                                <VolumeUpIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </Box>

                                                    {isActive && (
                                                        <Tooltip title="Acknowledge Alarm">
                                                            <IconButton
                                                                size="small"
                                                                onClick={e => {
                                                                    e.stopPropagation();
                                                                    openAcknowledge(rule);
                                                                }}
                                                                sx={{
                                                                    bgcolor: isDark ? 'rgba(245, 158, 11, 0.1)' : 'warning.50',
                                                                    color: 'warning.main',
                                                                    '&:hover': { bgcolor: isDark ? 'rgba(245, 158, 11, 0.2)' : 'warning.100' }
                                                                }}
                                                            >
                                                                <CheckIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    )}
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                </Grid>
                            );
                        })}
                    </AnimatePresence>
                </Grid>
            </TabPanel>

            {/* Tab Panel 1: Active Alarms */}
            <TabPanel value={currentTab} index={1}>
                {currentActiveAlarms.length === 0 ? (
                    <Paper sx={{
                        p: 6,
                        textAlign: 'center',
                        background: isDark
                            ? 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)'
                            : 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                        border: isDark ? '2px solid #059669' : '2px solid #bbf7d0'
                    }}>
                        <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
                        <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: 'success.main' }}>
                            All Systems Normal
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            No active alarms at this time. All monitored conditions are within normal ranges.
                        </Typography>
                    </Paper>
                ) : (
                    <Grid container spacing={3}>
                        {currentActiveAlarms.map((alarm, index) => {
                            const alarmRuleId = alarm.rule_id || alarm.id;
                            return (
                                <Grid item xs={12} key={`${alarmRuleId}-${index}`}>
                                    <motion.div
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                    >
                                        <Card sx={{
                                            background: isDark
                                                ? 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)'
                                                : 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                                            border: '2px solid #dc2626',
                                            animation: alarm.state === 'triggered' ? 'pulse 2s infinite' : 'none'
                                        }}>
                                            <CardContent sx={{ p: 3 }}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <Box sx={{ flex: 1 }}>
                                                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: 'error.main' }}>
                                                            🚨 {alarm.rule_name}
                                                        </Typography>
                                                        <Typography variant="body1" sx={{ mb: 2 }}>
                                                            {alarm.tag_name} on {alarm.device_name}
                                                        </Typography>
                                                        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                                                            <Chip
                                                                label={alarm.severity?.toUpperCase()}
                                                                color={getSeverityColor(alarm.severity)}
                                                                sx={{ fontWeight: 600 }}
                                                            />
                                                            <Chip
                                                                label={alarm.state?.toUpperCase() || 'TRIGGERED'}
                                                                color={alarm.state === 'triggered' ? 'error' : 'warning'}
                                                                sx={{ fontWeight: 600 }}
                                                            />
                                                            <Chip
                                                                label={`Triggered: ${new Date(alarm.triggered_at).toLocaleString()}`}
                                                                variant="outlined"
                                                            />
                                                        </Stack>
                                                        <Typography variant="body2" color="text.secondary">
                                                            Threshold: {alarm.threshold} | Current: {alarm.trigger_value}
                                                        </Typography>
                                                    </Box>
                                                    <Box>
                                                        {/* MANUAL SOUND TRIGGER BUTTON */}
                                                        <Button
                                                            variant="outlined"
                                                            size="small"
                                                            startIcon={<VolumeUpIcon />}
                                                            onClick={() => {
                                                                playAlarmSequence(alarm.severity || 'warning', {
                                                                    rule_name: alarm.rule_name,
                                                                    tag_name: alarm.tag_name,
                                                                    device_name: alarm.device_name,
                                                                    trigger_value: alarm.trigger_value
                                                                });
                                                            }}
                                                            sx={{ mr: 1 }}
                                                            disabled={!soundEnabled}
                                                        >
                                                            Play Sound
                                                        </Button>

                                                        {(alarm.state === 'triggered' || !alarm.acknowledged_at) && (
                                                            <Button
                                                                variant="contained"
                                                                color="warning"
                                                                startIcon={<CheckIcon />}
                                                                onClick={() => openAcknowledge(alarm)}
                                                                sx={{ mr: 1 }}
                                                            >
                                                                Acknowledge
                                                            </Button>
                                                        )}
                                                        <Button
                                                            variant="outlined"
                                                            startIcon={<HistoryIcon />}
                                                            onClick={() => setCurrentTab(2)}
                                                        >
                                                            View History
                                                        </Button>
                                                    </Box>
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                </Grid>
                            );
                        })}
                    </Grid>
                )}
            </TabPanel>

            {/* Tab Panel 2: Event History */}
            <TabPanel value={currentTab} index={2}>
                <TableContainer component={Paper} sx={{
                    background: isDark
                        ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
                        : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)'
                }}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Timestamp</TableCell>
                                <TableCell>Rule Name</TableCell>
                                <TableCell>Tag</TableCell>
                                <TableCell>Event Type</TableCell>
                                <TableCell>Severity</TableCell>
                                <TableCell>Value</TableCell>
                                <TableCell>Message</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {alarmEvents
                                .slice(eventsPage * eventsRowsPerPage, eventsPage * eventsRowsPerPage + eventsRowsPerPage)
                                .map((event, index) => {
                                    const eventInfo = formatEventType(event.event_type);
                                    const EventIcon = eventInfo.icon;

                                    return (
                                        <TableRow key={index}>
                                            <TableCell>
                                                {new Date(event.created_at).toLocaleString()}
                                            </TableCell>
                                            <TableCell>{event.rule_name}</TableCell>
                                            <TableCell>{event.tag_name}</TableCell>
                                            <TableCell>
                                                <Chip
                                                    icon={<EventIcon fontSize="small" />}
                                                    label={eventInfo.label}
                                                    color={eventInfo.color}
                                                    size="small"
                                                    sx={{ fontWeight: 600 }}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={event.severity?.toUpperCase()}
                                                    color={getSeverityColor(event.severity)}
                                                    size="small"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                {event.trigger_value !== null && event.trigger_value !== undefined ? event.trigger_value.toFixed(2) : '-'}
                                            </TableCell>
                                            <TableCell>{event.message}</TableCell>
                                        </TableRow>
                                    );
                                })}
                        </TableBody>
                    </Table>
                    <TablePagination
                        component="div"
                        count={alarmEvents.length}
                        page={eventsPage}
                        onPageChange={(e, newPage) => setEventsPage(newPage)}
                        rowsPerPage={eventsRowsPerPage}
                        onRowsPerPageChange={(e) => {
                            setEventsRowsPerPage(parseInt(e.target.value, 10));
                            setEventsPage(0);
                        }}
                    />
                </TableContainer>
            </TabPanel>

            {/* Tab Panel 3: Statistics */}
            <TabPanel value={currentTab} index={3}>
                {alarmStats ? (
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <Card sx={{
                                background: isDark
                                    ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
                                    : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)'
                            }}>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        Alarm Rules Summary
                                    </Typography>
                                    <List>
                                        <ListItem>
                                            <ListItemText
                                                primary={`Total Rules: ${alarmStats.rules?.total_rules || 0}`}
                                                secondary={`Enabled: ${alarmStats.rules?.enabled_rules || 0} | Disabled: ${alarmStats.rules?.disabled_rules || 0}`}
                                            />
                                        </ListItem>
                                        <ListItem>
                                            <ListItemText
                                                primary="By Severity"
                                                secondary={`Critical: ${alarmStats.rules?.critical_rules || 0} | Warning: ${alarmStats.rules?.warning_rules || 0} | Info: ${alarmStats.rules?.info_rules || 0}`}
                                            />
                                        </ListItem>
                                    </List>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Card sx={{
                                background: isDark
                                    ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
                                    : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)'
                            }}>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        Active Alarms Summary
                                    </Typography>
                                    <List>
                                        <ListItem>
                                            <ListItemText
                                                primary={`Total Active: ${alarmStats.active_alarms?.total_active || 0}`}
                                                secondary={`Unacknowledged: ${alarmStats.active_alarms?.unacknowledged || 0} | Acknowledged: ${alarmStats.active_alarms?.acknowledged || 0}`}
                                            />
                                        </ListItem>
                                    </List>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12}>
                            <Card sx={{
                                background: isDark
                                    ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
                                    : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)'
                            }}>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        24-Hour Activity
                                    </Typography>
                                    <List>
                                        <ListItem>
                                            <ListItemText
                                                primary={`Total Events: ${alarmStats.events_24h?.total_events_24h || 0}`}
                                                secondary={`Triggered: ${alarmStats.events_24h?.triggered_24h || 0} | Acknowledged: ${alarmStats.events_24h?.acknowledged_24h || 0} | Cleared: ${alarmStats.events_24h?.cleared_24h || 0}`}
                                            />
                                        </ListItem>
                                    </List>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                ) : (
                    <Paper sx={{
                        p: 3,
                        textAlign: 'center',
                        background: isDark
                            ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
                            : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)'
                    }}>
                        <Typography variant="body1" color="text.secondary">
                            Loading alarm statistics...
                        </Typography>
                    </Paper>
                )}
            </TabPanel>

            {/* Add Alarm Rule FAB */}
            <Fab
                color="primary"
                aria-label="add alarm rule"
                onClick={() => {
                    resetForm();
                    setAddOpen(true);
                }}
                sx={{
                    position: 'fixed',
                    bottom: 32,
                    right: 32,
                    zIndex: 1201,
                    background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
                    boxShadow: '0 8px 32px rgba(220, 38, 38, 0.3)',
                    '&:hover': {
                        background: 'linear-gradient(135deg, #b91c1c 0%, #dc2626 100%)',
                        transform: 'scale(1.1)'
                    }
                }}
            >
                <AddIcon />
            </Fab>

            {/* Enhanced Add Alarm Rule Dialog */}
            <Dialog
                open={addOpen}
                onClose={() => setAddOpen(false)}
                maxWidth="md"
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
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                            Create Alarm Rule
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Professional SCADA alarm configuration
                        </Typography>
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ pt: 1 }}>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <TextField
                                label="Rule Name"
                                value={ruleName}
                                onChange={e => setRuleName(e.target.value)}
                                fullWidth
                                required
                                autoFocus
                                sx={{ mt: 2 }}
                                helperText="Descriptive name for this alarm rule"
                            />
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth>
                                <InputLabel>Device</InputLabel>
                                <Select
                                    value={deviceId}
                                    onChange={e => {
                                        setDeviceId(e.target.value);
                                        setTagId(''); // Reset tag when device changes
                                    }}
                                    label="Device"
                                    required
                                >
                                    {devices.map(device => {
                                        const DeviceIcon = getDeviceIcon(device.device_type);
                                        return (
                                            <MenuItem key={device.device_id} value={device.device_id}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <DeviceIcon fontSize="small" />
                                                    <Box>
                                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                            {device.device_name}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {device.device_type}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            </MenuItem>
                                        );
                                    })}
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth>
                                <InputLabel>Tag to Monitor</InputLabel>
                                <Select
                                    value={tagId}
                                    onChange={e => setTagId(e.target.value)}
                                    label="Tag to Monitor"
                                    required
                                    disabled={!deviceId}
                                >
                                    {tags.filter(tag => tag.device_id === parseInt(deviceId)).map(tag => {
                                        const hasRealTimeData = measurements[tag.tag_id]?.value !== null && measurements[tag.tag_id]?.value !== undefined;
                                        return (
                                            <MenuItem key={tag.tag_id} value={tag.tag_id}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                                                    <Box sx={{ flex: 1 }}>
                                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                            {tag.tag_name}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {tag.tag_type} • {tag.engineering_unit || 'units'}
                                                        </Typography>
                                                    </Box>
                                                    {hasRealTimeData && (
                                                        <Chip
                                                            label={`${measurements[tag.tag_id].value.toFixed(2)} LIVE`}
                                                            size="small"
                                                            color="success"
                                                            sx={{ fontSize: '0.7rem' }}
                                                        />
                                                    )}
                                                </Box>
                                            </MenuItem>
                                        );
                                    })}
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12} md={4}>
                            <FormControl fullWidth>
                                <InputLabel>Condition Type</InputLabel>
                                <Select
                                    value={conditionType}
                                    onChange={e => setConditionType(e.target.value)}
                                    label="Condition Type"
                                >
                                    <MenuItem value="high">High Limit</MenuItem>
                                    <MenuItem value="low">Low Limit</MenuItem>
                                    <MenuItem value="change">Change Detection</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12} md={4}>
                            <TextField
                                label="Threshold"
                                value={threshold}
                                onChange={e => setThreshold(e.target.value)}
                                type="number"
                                fullWidth
                                required
                                helperText="Trigger value"
                            />
                        </Grid>

                        <Grid item xs={12} md={4}>
                            <FormControl fullWidth>
                                <InputLabel>Severity</InputLabel>
                                <Select
                                    value={severity}
                                    onChange={e => setSeverity(e.target.value)}
                                    label="Severity"
                                >
                                    <MenuItem value="info">Info</MenuItem>
                                    <MenuItem value="warning">Warning</MenuItem>
                                    <MenuItem value="critical">Critical</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <TextField
                                label="Deadband"
                                value={deadband}
                                onChange={e => setDeadband(e.target.value)}
                                type="number"
                                fullWidth
                                helperText="Prevents alarm chattering"
                                placeholder="0.0"
                            />
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <TextField
                                label="Delay (seconds)"
                                value={delaySeconds}
                                onChange={e => setDelaySeconds(e.target.value)}
                                type="number"
                                fullWidth
                                helperText="Delay before triggering"
                                placeholder="0"
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <TextField
                                label="Custom Message"
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                                fullWidth
                                multiline
                                rows={2}
                                placeholder="Custom alarm message..."
                                helperText="Optional custom alarm message"
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={enabled}
                                        onChange={e => setEnabled(e.target.checked)}
                                        color="primary"
                                    />
                                }
                                label="Enable this alarm rule immediately"
                            />
                        </Grid>

                        {tagId && measurements[tagId] && (
                            <Grid item xs={12}>
                                <Alert severity="info" sx={{ mt: 1 }}>
                                    <Typography variant="body2">
                                        Current live value for this tag: <strong>{measurements[tagId].value.toFixed(2)}</strong>
                                        {threshold && (
                                            <span>
                                                {' | '}Condition would be: <strong>
                                                {(() => {
                                                    const currentVal = measurements[tagId].value;
                                                    const thresholdVal = parseFloat(threshold);
                                                    switch (conditionType) {
                                                        case 'high': return currentVal > thresholdVal ? 'TRIGGERED' : 'NORMAL';
                                                        case 'low': return currentVal < thresholdVal ? 'TRIGGERED' : 'NORMAL';
                                                        case 'change': return Math.abs(currentVal - thresholdVal) > (parseFloat(deadband) || 0.1) ? 'TRIGGERED' : 'NORMAL';
                                                        default: return 'UNKNOWN';
                                                    }
                                                })()}
                                                </strong>
                                            </span>
                                        )}
                                    </Typography>
                                </Alert>
                            </Grid>
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
                        disabled={!ruleName.trim() || !tagId || !deviceId || !threshold}
                        sx={{
                            borderRadius: 2,
                            px: 3,
                            background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)'
                        }}
                    >
                        Create Alarm Rule
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Edit Alarm Rule Dialog */}
            <Dialog
                open={editOpen}
                onClose={() => setEditOpen(false)}
                maxWidth="md"
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
                        Edit Alarm Rule: {current?.rule_name}
                    </Typography>
                </DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12}>
                            <TextField
                                label="Rule Name"
                                value={ruleName}
                                onChange={e => setRuleName(e.target.value)}
                                fullWidth
                                required
                            />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <FormControl fullWidth>
                                <InputLabel>Condition Type</InputLabel>
                                <Select
                                    value={conditionType}
                                    onChange={e => setConditionType(e.target.value)}
                                    label="Condition Type"
                                >
                                    <MenuItem value="high">High Limit</MenuItem>
                                    <MenuItem value="low">Low Limit</MenuItem>
                                    <MenuItem value="change">Change Detection</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <TextField
                                label="Threshold"
                                value={threshold}
                                onChange={e => setThreshold(e.target.value)}
                                type="number"
                                fullWidth
                                required
                            />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <FormControl fullWidth>
                                <InputLabel>Severity</InputLabel>
                                <Select
                                    value={severity}
                                    onChange={e => setSeverity(e.target.value)}
                                    label="Severity"
                                >
                                    <MenuItem value="info">Info</MenuItem>
                                    <MenuItem value="warning">Warning</MenuItem>
                                    <MenuItem value="critical">Critical</MenuItem>
                                </Select>
                            </FormControl>
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
                        <Grid item xs={12} md={6}>
                            <TextField
                                label="Delay (seconds)"
                                value={delaySeconds}
                                onChange={e => setDelaySeconds(e.target.value)}
                                type="number"
                                fullWidth
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                label="Custom Message"
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                                fullWidth
                                multiline
                                rows={2}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={enabled}
                                        onChange={e => setEnabled(e.target.checked)}
                                        color="primary"
                                    />
                                }
                                label="Enable this alarm rule"
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={() => setEditOpen(false)}>Cancel</Button>
                    <Button onClick={handleEdit} variant="contained">Save Changes</Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation Dialog */}
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
                        Delete Alarm Rule
                    </Typography>
                </DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to delete the alarm rule <strong>{current?.rule_name}</strong>?
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        This will also clear any active alarms and remove all associated event history.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
                    <Button onClick={handleDelete} color="error" variant="contained">Delete Rule</Button>
                </DialogActions>
            </Dialog>

            {/* Acknowledge Alarm Dialog */}
            <Dialog open={ackOpen} onClose={() => setAckOpen(false)} maxWidth="sm" PaperProps={{
                sx: {
                    borderRadius: 4,
                    background: isDark
                        ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
                        : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)'
                }
            }}>
                <DialogTitle>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: 'warning.main' }}>
                        Acknowledge Alarm
                    </Typography>
                </DialogTitle>
                <DialogContent>
                    <Typography sx={{ mb: 2 }}>
                        Acknowledge alarm: <strong>{current?.rule_name}</strong>
                    </Typography>
                    <TextField
                        label="Acknowledgment Message"
                        value={ackMessage}
                        onChange={e => setAckMessage(e.target.value)}
                        fullWidth
                        multiline
                        rows={3}
                        placeholder="Optional: Reason for acknowledgment or corrective action taken..."
                        sx={{ mt: 2 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAckOpen(false)}>Cancel</Button>
                    <Button onClick={handleAcknowledge} color="warning" variant="contained">
                        Acknowledge Alarm
                    </Button>
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

            {/* CSS animations */}
            <style>{`
                @keyframes pulse {
                    0% { opacity: 1; }
                    50% { opacity: 0.5; }
                    100% { opacity: 1; }
                }
            `}</style>
        </Box>
    );
}