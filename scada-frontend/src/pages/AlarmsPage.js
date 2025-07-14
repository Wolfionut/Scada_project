// src/pages/AlarmsPage.js - COMPLETE FIXED SIMPLIFIED PROFESSIONAL SCADA ALARMS PAGE
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
    Grid, Paper, Box, Typography, IconButton, Tooltip, Chip, Fab, Dialog,
    DialogTitle, DialogContent, DialogActions, TextField, Button, Snackbar, Alert,
    InputAdornment, Avatar, Stack, Card, CardContent, MenuItem, FormControl, InputLabel, Select,
    List, ListItem, ListItemText, Divider, Badge, Switch, FormControlLabel, Tabs, Tab,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination,
    LinearProgress, Collapse, Accordion, AccordionSummary, AccordionDetails
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
    VolumeDown as VolumeDownIcon,
    ExpandMore as ExpandMoreIcon,
    Close as CloseIcon,
    Pause as PauseIcon,
    AutoMode as AutoModeIcon,
    ManualMode as ManualModeIcon,
    Speed as SpeedIcon,
    TrendingUp as TrendingUpIcon,
    TrendingDown as TrendingDownIcon,
    TrendingFlat as TrendingFlatIcon,
    Announcement as AnnouncementIcon,
    CloudOff as CloudOffIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import axios from '../api/axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useRealTimeData } from '../hooks/useWebSocket';
import { useAlarmSound } from '../context/AlarmSoundContext';

// 🚀 SIMPLIFIED DATA NORMALIZATION
const normalizeAlarmData = (alarm) => {
    return {
        rule_id: alarm.rule_id || alarm.id || alarm.alarm_id,
        rule_name: alarm.rule_name || alarm.name || alarm.alarm_name || 'Unknown Alarm',
        state: alarm.state || alarm.current_state || alarm.status || 'triggered',
        severity: alarm.severity || alarm.level || 'warning',
        trigger_value: alarm.trigger_value || alarm.current_value || alarm.value,
        threshold: alarm.threshold || alarm.limit || alarm.setpoint,
        condition_type: alarm.condition_type || alarm.condition || alarm.type || 'high',
        triggered_at: alarm.triggered_at || alarm.trigger_time || alarm.created_at || alarm.timestamp,
        acknowledged_at: alarm.acknowledged_at || alarm.ack_time,
        acknowledged_by: alarm.acknowledged_by || alarm.ack_by,
        tag_id: alarm.tag_id,
        tag_name: alarm.tag_name || 'Unknown Tag',
        device_id: alarm.device_id,
        device_name: alarm.device_name || 'Unknown Device',
        enabled: alarm.enabled !== false,
        message: alarm.message || alarm.description || alarm.alarm_message,
        ack_message: alarm.ack_message,
        deadband: alarm.deadband || 0,
        delay_seconds: alarm.delay_seconds || 0
    };
};

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

    // WebSocket real-time data
    const {
        isConnected,
        measurements,
        deviceStatuses,
        measurementCount,
        activeAlarms: wsActiveAlarms = [],
        alarmSummary: wsAlarmSummary = {},
        alarmEvents: wsAlarmEvents = [],
        alarmRuleChanges,
        acknowledgeAlarm: wsAcknowledgeAlarm,
        hasActiveAlarms,
        hasCriticalAlarms,
        unacknowledgedAlarmCount = 0,
        criticalAlarmCount = 0,
        getUnacknowledgedAlarms,
        getAlarmsBySeverity,
        forceReconnect
    } = useRealTimeData(projectId);

    // Tab state
    const [currentTab, setCurrentTab] = useState(0);

    // State for alarm system
    const [alarmRules, setAlarmRules] = useState([]);
    const [activeAlarms, setActiveAlarms] = useState([]);
    const [acknowledgedAlarms, setAcknowledgedAlarms] = useState(new Set()); // Track locally acknowledged alarms
    const [alarmEventsState, setAlarmEventsState] = useState([]);
    const [alarmStats, setAlarmStats] = useState(null);
    const [statsError, setStatsError] = useState(false);

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
    const [loading, setLoading] = useState(false);

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

    // Alarm sound integration
    const {
        playAlarmSequence,
        stopAlarm,
        isEnabled: soundEnabled,
        setEnabled: setSoundEnabled,
        playTestSound,
        currentAlarm,
        soundStatus,
        volume,
        setVolume
    } = useAlarmSound();

    // Enhanced alarm data management
    const displayActiveAlarms = wsActiveAlarms?.length > 0 ? wsActiveAlarms : activeAlarms;
    const displayAlarmSummary = Object.keys(wsAlarmSummary).length > 0 ? wsAlarmSummary : alarmStats;
    const displayAlarmEvents = wsAlarmEvents?.length > 0 ? wsAlarmEvents : alarmEventsState;

    // 🚀 FIXED SIMPLIFIED ALARM DETECTION LOGIC

    const currentActiveAlarms = useMemo(() => {
        console.log('🔧 [SIMPLIFIED] Starting alarm detection...');

        // Step 1: Get all potential alarms from both sources
        const wsAlarms = Array.isArray(wsActiveAlarms) ? wsActiveAlarms : [];
        const apiAlarms = Array.isArray(activeAlarms) ? activeAlarms : [];

        console.log('🔧 [SIMPLIFIED] Raw data:', {
            ws_alarms: wsAlarms.length,
            api_alarms: apiAlarms.length,
            ws_summary_active: wsAlarmSummary?.total_active || 0,
            measurements_count: Object.keys(measurements).length,
            rules_count: alarmRules.length,
            acknowledged_locally: acknowledgedAlarms.size
        });

        // Step 2: **PRIORITY TO WEBSOCKET DATA** - If WebSocket provides data, use it exclusively
        if (wsAlarms.length > 0 || wsAlarmSummary?.total_active === 0 || wsAlarmSummary?.total_active === "0") {
            console.log('🎯 [SIMPLIFIED] Using WebSocket data exclusively');

            const wsResult = wsAlarms
                .map(alarm => normalizeAlarmData(alarm))
                .filter(alarm => {
                    if (!alarm.enabled) return false;

                    const ruleIdToCheck = alarm.rule_id || alarm.id || alarm.alarm_id;
                    if (acknowledgedAlarms.has(ruleIdToCheck)) {
                        console.log(`✅ [SIMPLIFIED] Skipping locally acknowledged: ${alarm.rule_name}`);
                        return false;
                    }

                    const hasBackendAck = !!(
                        alarm.acknowledged_at ||
                        alarm.acknowledged_by ||
                        alarm.ack_time ||
                        alarm.ack_message ||
                        (alarm.state && alarm.state.toLowerCase() === 'acknowledged')
                    );

                    if (hasBackendAck) {
                        console.log(`✅ [SIMPLIFIED] Skipping backend acknowledged: ${alarm.rule_name}`);
                        return false;
                    }

                    const activeStates = ['triggered', 'active', 'alarmed', 'firing'];
                    const isStateActive = activeStates.includes(alarm.state?.toLowerCase());

                    console.log(`🎯 [SIMPLIFIED] WS Alarm ${alarm.rule_name}: state=${alarm.state}, active=${isStateActive}`);
                    return isStateActive;
                });

            console.log('🔧 [SIMPLIFIED] WebSocket result:', {
                total_active: wsResult.length,
                critical: wsResult.filter(a => a.severity === 'critical').length,
                warning: wsResult.filter(a => a.severity === 'warning').length,
                info: wsResult.filter(a => a.severity === 'info').length
            });

            return wsResult;
        }

        // Step 3: Fallback to API data only if WebSocket has no data AND no clear indication of zero alarms
        console.log('🔄 [SIMPLIFIED] Falling back to API data');

        const apiResult = apiAlarms
            .map(alarm => normalizeAlarmData(alarm))
            .filter(alarm => {
                if (!alarm.enabled) return false;

                const ruleIdToCheck = alarm.rule_id || alarm.id || alarm.alarm_id;
                if (acknowledgedAlarms.has(ruleIdToCheck)) return false;

                const hasBackendAck = !!(
                    alarm.acknowledged_at ||
                    alarm.acknowledged_by ||
                    (alarm.state && alarm.state.toLowerCase() === 'acknowledged')
                );

                if (hasBackendAck) return false;

                const activeStates = ['triggered', 'active', 'alarmed', 'firing'];
                return activeStates.includes(alarm.state?.toLowerCase());
            });

        console.log('🔧 [SIMPLIFIED] Final result:', {
            total_active: apiResult.length,
            critical: apiResult.filter(a => a.severity === 'critical').length,
            warning: apiResult.filter(a => a.severity === 'warning').length,
            info: apiResult.filter(a => a.severity === 'info').length,
            alarms: apiResult.map(a => ({
                id: a.rule_id,
                name: a.rule_name,
                value: a.trigger_value,
                state: a.state
            }))
        });

        return apiResult;
    }, [wsActiveAlarms, activeAlarms, wsAlarmSummary, measurements, alarmRules, acknowledgedAlarms]);




    // Critical alarms calculation
    const currentCriticalAlarms = useMemo(() => {
        return currentActiveAlarms.filter(a => a.severity === 'critical');
    }, [currentActiveAlarms]);

    // 🧮 CALCULATE LOCAL STATS
    const calculateLocalStats = useCallback(() => {
        const enabledRules = alarmRules.filter(r => r.enabled);
        const criticalRules = alarmRules.filter(r => r.severity === 'critical');
        const warningRules = alarmRules.filter(r => r.severity === 'warning');
        const infoRules = alarmRules.filter(r => r.severity === 'info');

        const events24h = displayAlarmEvents.filter(event => {
            const eventTime = new Date(event.created_at || event.timestamp);
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            return eventTime > oneDayAgo;
        });

        return {
            rules: {
                total_rules: alarmRules.length,
                enabled_rules: enabledRules.length,
                disabled_rules: alarmRules.length - enabledRules.length,
                critical_rules: criticalRules.length,
                warning_rules: warningRules.length,
                info_rules: infoRules.length
            },
            total_active: currentActiveAlarms.length,
            unacknowledged: currentActiveAlarms.length,
            events_24h: {
                total_events_24h: events24h.length,
                triggered_24h: events24h.filter(e => (e.event_type || e.type) === 'triggered').length,
                acknowledged_24h: events24h.filter(e => (e.event_type || e.type) === 'acknowledged').length,
                cleared_24h: events24h.filter(e => (e.event_type || e.type) === 'cleared').length
            }
        };
    }, [alarmRules, displayAlarmEvents, currentActiveAlarms]);

    // 📡 DATA FETCHING FUNCTIONS
    const fetchAlarmRules = useCallback(() => {
        if (!projectId) return;
        setLoading(true);
        console.log('📤 [AlarmsPage] Fetching alarm rules...');

        axios.get(`/alarms/project/${projectId}/rules`)
            .then(res => {
                console.log('✅ [AlarmsPage] Alarm rules fetched:', res.data);
                const rules = Array.isArray(res.data) ? res.data : (res.data.rules || []);
                setAlarmRules(rules);
                setFiltered(rules);
            })
            .catch(err => {
                console.error('❌ [AlarmsPage] Failed to fetch alarm rules:', err);
                if (err.response?.status === 500) {
                    console.log('⚠️ [AlarmsPage] Alarm rules endpoint not available - using WebSocket data only');
                    setSnackbar({ open: true, msg: 'Alarm rules endpoint unavailable - using real-time data', severity: 'warning' });
                } else {
                    setSnackbar({ open: true, msg: 'Failed to load alarm rules', severity: 'error' });
                }
            })
            .finally(() => setLoading(false));
    }, [projectId]);

    const fetchActiveAlarms = useCallback(() => {
        if (!projectId) return;
        console.log('📤 [AlarmsPage] Fetching active alarms...');

        axios.get(`/alarms/project/${projectId}/active?state=triggered`)
            .then(res => {
                console.log('✅ [AlarmsPage] Active alarms fetched:', res.data);
                const alarms = Array.isArray(res.data) ? res.data : (res.data.alarms || []);
                setActiveAlarms(alarms);
            })
            .catch(err => {
                console.error('❌ [AlarmsPage] Failed to fetch active alarms:', err);
                if (err.response?.status === 500) {
                    console.log('⚠️ [AlarmsPage] Active alarms endpoint not available - using WebSocket data only');
                } else {
                    setSnackbar({ open: true, msg: 'Failed to load active alarms', severity: 'error' });
                }
            });
    }, [projectId]);

    const fetchAlarmEvents = useCallback(() => {
        if (!projectId) return;
        console.log('📤 [AlarmsPage] Fetching alarm events...');

        axios.get(`/alarms/project/${projectId}/events?limit=100&days=7`)
            .then(res => {
                console.log('✅ [AlarmsPage] Alarm events fetched:', res.data);
                const events = Array.isArray(res.data) ? res.data : (res.data.events || []);
                setAlarmEventsState(events);
            })
            .catch(err => {
                console.error('❌ [AlarmsPage] Failed to fetch alarm events:', err);
                if (err.response?.status === 500) {
                    console.log('⚠️ [AlarmsPage] Alarm events endpoint not available - using WebSocket data only');
                } else {
                    setSnackbar({ open: true, msg: 'Failed to load alarm events', severity: 'error' });
                }
            });
    }, [projectId]);

    const fetchAlarmStats = useCallback(() => {
        if (!projectId || statsError) return;
        console.log('📤 [AlarmsPage] Fetching alarm stats...');

        axios.get(`/alarms/project/${projectId}/stats`)
            .then(res => {
                console.log('✅ [AlarmsPage] Alarm stats fetched:', res.data);
                setAlarmStats(res.data);
                setStatsError(false);
            })
            .catch(err => {
                console.warn('⚠️ [AlarmsPage] Alarm stats endpoint not available:', err.response?.status);

                if (err.response?.status === 500 || err.response?.status === 404) {
                    setStatsError(true);
                    console.log('📊 [AlarmsPage] Using local stats calculation instead');
                } else {
                    console.error('❌ [AlarmsPage] Unexpected error fetching alarm stats:', err);
                }
            });
    }, [projectId, statsError]);

    const fetchTagsAndDevices = useCallback(() => {
        if (!projectId) return;
        console.log('📤 [AlarmsPage] Fetching tags and devices...');

        axios.get(`/devices/project/${projectId}`)
            .then(res => {
                console.log('✅ [AlarmsPage] Devices fetched:', res.data);
                const devicesData = Array.isArray(res.data) ? res.data : (res.data.devices || []);
                setDevices(devicesData);

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
                            console.error(`❌ [AlarmsPage] Failed to fetch tags for device ${device.device_id}:`, err);
                            return [];
                        })
                );

                return Promise.all(tagPromises);
            })
            .then(tagResults => {
                const allTags = tagResults.flat();
                console.log('✅ [AlarmsPage] Tags fetched:', allTags.length);
                setTags(allTags);
            })
            .catch(err => {
                console.error('❌ [AlarmsPage] Failed to fetch tags and devices:', err);
                setSnackbar({ open: true, msg: 'Failed to load tags and devices', severity: 'error' });
            });
    }, [projectId]);

    // Refresh all data
    const refreshAllData = useCallback(() => {
        console.log('🔄 [AlarmsPage] Refreshing all alarm data...');
        // Clear local acknowledgment tracking on refresh
        setAcknowledgedAlarms(new Set());
        fetchAlarmRules();
        fetchActiveAlarms();
        fetchAlarmEvents();
        fetchAlarmStats();
        fetchTagsAndDevices();
    }, [fetchAlarmRules, fetchActiveAlarms, fetchAlarmEvents, fetchAlarmStats, fetchTagsAndDevices]);

    // Add this new function for lighter refreshes
    const lightRefreshData = useCallback(() => {
        console.log('🔄 [AlarmsPage] Light refresh without clearing local state...');

        // Don't clear acknowledged alarms - keep local tracking intact
        fetchActiveAlarms();
        fetchAlarmEvents();

        // WebSocket automatically provides real-time updates
        console.log('📡 WebSocket will provide real-time alarm updates automatically');
    }, [fetchActiveAlarms, fetchAlarmEvents]);


    // Real-time alarm rule changes
    useEffect(() => {
        if (alarmRuleChanges) {
            const { type, rule, rule_name } = alarmRuleChanges;
            let message = '';
            let severity = 'info';

            switch (type) {
                case 'created':
                    message = `✅ New alarm rule created: ${rule?.rule_name}`;
                    severity = 'success';
                    fetchAlarmRules();
                    break;
                case 'updated':
                    message = `ℹ️ Alarm rule updated: ${rule?.rule_name}`;
                    severity = 'info';
                    fetchAlarmRules();
                    break;
                case 'deleted':
                    message = `⚠️ Alarm rule deleted: ${rule_name}`;
                    severity = 'warning';
                    fetchAlarmRules();
                    break;
            }

            if (message) {
                setSnackbar({ open: true, msg: message, severity });
            }
        }
    }, [alarmRuleChanges, fetchAlarmRules]);

    // 🚀 SIMPLIFIED WEBSOCKET ALARM EVENT HANDLER
    // 🚀 SIMPLIFIED WEBSOCKET ALARM EVENT HANDLER

    useEffect(() => {
        if (wsAlarmEvents?.length > 0) {
            const latestEvent = wsAlarmEvents[0];
            console.log('🚨 [SIMPLIFIED] New alarm event:', {
                event_type: latestEvent.event_type || latestEvent.type,
                rule_name: latestEvent.rule_name,
                rule_id: latestEvent.rule_id,
                trigger_value: latestEvent.trigger_value
            });

            const eventType = latestEvent.event_type || latestEvent.type;

            if (eventType === 'triggered') {
                setSnackbar({
                    open: true,
                    msg: `🚨 ALARM TRIGGERED: ${latestEvent.rule_name} (${latestEvent.trigger_value?.toFixed(2) || 'N/A'})`,
                    severity: 'error'
                });

                // Auto-switch to Active Alarms tab
                if (currentTab === 0) {
                    setCurrentTab(1);
                }

                // Refresh after a short delay
                setTimeout(refreshAllData, 1000);

            } else if (eventType === 'acknowledged') {
                const ruleId = latestEvent.rule_id || latestEvent.id || latestEvent.alarm_id;

                // Remove from local acknowledgment tracking when confirmed by WebSocket
                setAcknowledgedAlarms(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(ruleId);
                    console.log('🔄 [AlarmsPage] Removed from acknowledged set via WebSocket:', ruleId);
                    return newSet;
                });

                // Remove from WebSocket active alarms
                setActiveAlarms(prev => prev.filter(alarm => {
                    const alarmRuleId = alarm.rule_id || alarm.id || alarm.alarm_id;
                    return alarmRuleId !== ruleId;
                }));

                setSnackbar({
                    open: true,
                    msg: `✅ ALARM ACKNOWLEDGED: ${latestEvent.rule_name}`,
                    severity: 'success'
                });

                setTimeout(refreshAllData, 500);

            } else if (eventType === 'cleared') {
                const ruleId = latestEvent.rule_id || latestEvent.id || latestEvent.alarm_id;

                console.log('🟢 [AlarmsPage] ALARM CLEARED EVENT:', latestEvent.rule_name);

                // IMMEDIATELY remove from all alarm states
                setActiveAlarms(prev => {
                    const filtered = prev.filter(alarm => {
                        const alarmRuleId = alarm.rule_id || alarm.id || alarm.alarm_id;
                        return alarmRuleId !== ruleId;
                    });
                    console.log(`🟢 [AlarmsPage] Removed cleared alarm ${ruleId}: ${prev.length} → ${filtered.length}`);
                    return filtered;
                });

                // Clear from acknowledged tracking to ensure fresh state
                setAcknowledgedAlarms(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(ruleId);
                    console.log('🟢 [AlarmsPage] Cleared acknowledged tracking for:', ruleId);
                    return newSet;
                });

                setSnackbar({
                    open: true,
                    msg: `🟢 ALARM CLEARED: ${latestEvent.rule_name}`,
                    severity: 'success'
                });

                // Shorter refresh delay for clearing
                setTimeout(refreshAllData, 300);
            }
        }
    }, [wsAlarmEvents, currentTab, refreshAllData]);




    // Initial data loading
    useEffect(() => {
        console.log('🎬 [AlarmsPage] Initial data loading...');
        refreshAllData();
    }, [refreshAllData]);

    // Filter alarm rules
    useEffect(() => {
        let filteredRules = alarmRules;

        if (search) {
            filteredRules = filteredRules.filter(rule =>
                rule.rule_name?.toLowerCase().includes(search.toLowerCase()) ||
                (rule.tag_name && rule.tag_name.toLowerCase().includes(search.toLowerCase())) ||
                (rule.device_name && rule.device_name.toLowerCase().includes(search.toLowerCase())) ||
                (rule.severity && rule.severity.toLowerCase().includes(search.toLowerCase()))
            );
        }

        if (showEnabledOnly) {
            filteredRules = filteredRules.filter(rule => rule.enabled);
        }

        setFiltered(filteredRules);
    }, [search, alarmRules, showEnabledOnly]);

    // Alarm rule status helpers
    const isRuleActive = (ruleId) => {
        return currentActiveAlarms?.some(alarm => alarm.rule_id === ruleId) || false;
    };

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

    // Acknowledgment success handler
    const handleAckSuccess = useCallback((ruleId) => {
        console.log('🎉 [AlarmsPage] Acknowledgment successful for rule:', ruleId);

        // Add to locally acknowledged alarms for immediate UI update
        setAcknowledgedAlarms(prev => {
            const newSet = new Set(prev);
            newSet.add(ruleId);
            console.log('🔄 [AlarmsPage] Added to acknowledged set:', ruleId);
            return newSet;
        });

        // Immediately remove from all local alarm states
        setActiveAlarms(prevAlarms => {
            const updated = prevAlarms.filter(alarm => {
                const alarmRuleId = alarm.rule_id || alarm.id;
                return alarmRuleId !== ruleId;
            });
            return updated;
        });

        setAckOpen(false);
        setAckMessage('');

        setSnackbar({
            open: true,
            msg: `✅ Alarm "${current?.rule_name}" acknowledged successfully!`,
            severity: 'success'
        });

        // Optional: Light refresh after 5 seconds (uncomment if needed)
        setTimeout(() => {
            lightRefreshData();
        }, 5000);

        // Keep the local acknowledgment for a long time
        setTimeout(() => {
            setAcknowledgedAlarms(prev => {
                const newSet = new Set(prev);
                newSet.delete(ruleId);
                console.log('🔄 [AlarmsPage] Removed from acknowledged set after extended delay:', ruleId);
                return newSet;
            });
        }, 30000); // Keep for 30 seconds

    }, [current, lightRefreshData]); // Add lightRefreshData to dependencies if you use it

    // Enhanced acknowledge alarm function
    const handleAcknowledge = async () => {
        if (!current) {
            console.error('❌ [AlarmsPage] No current alarm selected for acknowledgment');
            return;
        }

        const ruleId = current.rule_id || current.id;
        console.log('📤 [AlarmsPage] Acknowledging alarm:', {
            rule_name: current.rule_name,
            rule_id: ruleId,
            project_id: projectId,
            ack_message: ackMessage
        });

        setLoading(true);

        try {
            // First, try the WebSocket acknowledgment if available
            if (wsAcknowledgeAlarm && typeof wsAcknowledgeAlarm === 'function') {
                console.log('🔄 [AlarmsPage] Trying WebSocket acknowledgment first...');

                const wsSuccess = await wsAcknowledgeAlarm(
                    ruleId,
                    ackMessage || 'Acknowledged by operator via AlarmsPage'
                );

                if (wsSuccess) {
                    console.log('✅ [AlarmsPage] WebSocket acknowledgment successful');
                    handleAckSuccess(ruleId);
                    return;
                } else {
                    console.log('⚠️ [AlarmsPage] WebSocket acknowledgment failed, trying API...');
                }
            }

            // Fallback to API acknowledgment
            const ackPayload = {
                message: ackMessage || 'Acknowledged by operator via AlarmsPage',
                acknowledged_by: 'operator'
            };

            console.log('📤 [AlarmsPage] Trying API acknowledgment with payload:', ackPayload);

            try {
                const response = await axios.put(
                    `/alarms/project/${projectId}/rules/${ruleId}/acknowledge`,
                    ackPayload
                );

                console.log('✅ [AlarmsPage] Primary API acknowledgment successful:', response.data);
                handleAckSuccess(ruleId);
                return;

            } catch (primaryError) {
                console.log('⚠️ [AlarmsPage] Primary endpoint failed, trying alternative...', primaryError.response?.status);

                try {
                    const response = await axios.put(
                        `/alarms/project/${projectId}/active/${ruleId}/ack`,
                        ackPayload
                    );

                    console.log('✅ [AlarmsPage] Alternative API acknowledgment successful:', response.data);
                    handleAckSuccess(ruleId);
                    return;

                } catch (alternativeError) {
                    console.error('❌ [AlarmsPage] Both API endpoints failed:', {
                        primary: primaryError.response?.status,
                        alternative: alternativeError.response?.status
                    });

                    throw new Error(
                        `Acknowledgment failed: ${primaryError.response?.data?.error || primaryError.message}`
                    );
                }
            }

        } catch (error) {
            console.error('❌ [AlarmsPage] Complete acknowledgment failure:', error);
            setSnackbar({
                open: true,
                msg: `❌ Failed to acknowledge alarm: ${error.message}`,
                severity: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    // Use local stats when backend stats aren't available
    const effectiveStats = displayAlarmSummary || calculateLocalStats();

    // CRUD operations
    const handleAdd = () => {
        if (!ruleName || !tagId || !deviceId || !threshold) {
            setSnackbar({ open: true, msg: 'Please fill all required fields', severity: 'error' });
            return;
        }

        console.log('📤 [AlarmsPage] Creating alarm rule...');
        setLoading(true);

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
                console.log('✅ [AlarmsPage] Alarm rule created successfully');
                setAddOpen(false);
                resetForm();
                setSnackbar({ open: true, msg: '✅ Alarm rule created successfully!', severity: 'success' });
                refreshAllData();
            })
            .catch(err => {
                console.error('❌ [AlarmsPage] Failed to create alarm rule:', err);
                setSnackbar({
                    open: true,
                    msg: err.response?.data?.error || 'Failed to create alarm rule',
                    severity: 'error'
                });
            })
            .finally(() => setLoading(false));
    };

    const handleEdit = () => {
        if (!current || !ruleName || !tagId || !threshold) {
            setSnackbar({ open: true, msg: 'Please fill all required fields', severity: 'error' });
            return;
        }

        console.log('📤 [AlarmsPage] Updating alarm rule...');
        setLoading(true);

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
                console.log('✅ [AlarmsPage] Alarm rule updated successfully');
                setEditOpen(false);
                resetForm();
                setSnackbar({ open: true, msg: '✅ Alarm rule updated successfully!', severity: 'success' });
                refreshAllData();
            })
            .catch(err => {
                console.error('❌ [AlarmsPage] Failed to update alarm rule:', err);
                setSnackbar({
                    open: true,
                    msg: err.response?.data?.error || 'Failed to update alarm rule',
                    severity: 'error'
                });
            })
            .finally(() => setLoading(false));
    };

    const handleDelete = () => {
        if (!current) return;

        console.log('📤 [AlarmsPage] Deleting alarm rule...');
        setLoading(true);

        const ruleId = current.rule_id || current.id;

        axios.delete(`/alarms/project/${projectId}/rules/${ruleId}`)
            .then(() => {
                console.log('✅ [AlarmsPage] Alarm rule deleted successfully');
                setDeleteOpen(false);
                setSnackbar({ open: true, msg: '✅ Alarm rule deleted successfully!', severity: 'success' });
                refreshAllData();
            })
            .catch(err => {
                console.error('❌ [AlarmsPage] Failed to delete alarm rule:', err);
                setSnackbar({
                    open: true,
                    msg: err.response?.data?.error || 'Failed to delete alarm rule',
                    severity: 'error'
                });
            })
            .finally(() => setLoading(false));
    };

    // Helper functions
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
        console.log('🎯 [AlarmsPage] Opening acknowledgment dialog for:', alarm.rule_name);
        setCurrent(alarm);
        setAckMessage('');
        setAckOpen(true);
    };

    // UI helper functions
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

    // 🔍 Debug Component
    const AlarmDebugInfo = () => {
        if (process.env.NODE_ENV !== 'development') return null;

        return (
            <Alert severity="info" sx={{ mb: 3, background: isDark ? 'rgba(99, 102, 241, 0.1)' : 'rgba(99, 102, 241, 0.05)' }}>
                <Typography variant="body2">
                    🔧 <strong>SIMPLIFIED Debug:</strong>
                    WS Active: {wsActiveAlarms?.length || 0},
                    API Active: {activeAlarms?.length || 0},
                    Displayed: {currentActiveAlarms?.length || 0},
                    WS Summary: {wsAlarmSummary?.total_active || 0},
                    Acknowledged: {acknowledgedAlarms.size},
                    Measurements: {Object.keys(measurements).length},
                    Rules: {alarmRules.length}
                </Typography>
                {currentActiveAlarms.length > 0 && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                        🚨 <strong>Active Alarms:</strong> {
                        currentActiveAlarms.map(a => `${a.rule_name}(${a.trigger_value?.toFixed(2) || 'N/A'})`).join(', ')
                    }
                    </Typography>
                )}
                {acknowledgedAlarms.size > 0 && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                        ✅ <strong>Locally Acknowledged:</strong> {Array.from(acknowledgedAlarms).join(', ')}
                    </Typography>
                )}
            </Alert>
        );
    };

    return (
        <Box sx={{
            p: 4,
            background: isDark
                ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
                : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
            minHeight: '100vh'
        }}>
            {/* Loading indicator */}
            {loading && (
                <LinearProgress sx={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 9999
                }} />
            )}

            {/* Enhanced Header */}
            <Box sx={{ mb: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Avatar sx={{
                        width: 48,
                        height: 48,
                        background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
                        animation: currentActiveAlarms.length > 0 ? 'pulse 2s infinite' : 'none'
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
                            🚨 SIMPLIFIED SCADA Alarms
                        </Typography>
                        <Box>
                            <Typography variant="body1" color="text.secondary" component="span">
                                Simplified alarm detection with improved reliability
                            </Typography>
                            {statsError && (
                                <Chip
                                    icon={<CloudOffIcon />}
                                    label="Local Stats Mode"
                                    size="small"
                                    color="warning"
                                    sx={{ ml: 1, fontSize: '0.7rem' }}
                                />
                            )}
                        </Box>
                    </Box>
                </Box>

                {/* Enhanced Status Cards */}
                <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{
                            background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                            color: 'white'
                        }}>
                            <CardContent sx={{ p: 2 }}>
                                <Typography variant="h4" sx={{ fontWeight: 800 }}>
                                    {effectiveStats?.rules?.total_rules || alarmRules.length}
                                </Typography>
                                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                    Alarm Rules
                                </Typography>
                                <Typography variant="caption" sx={{ opacity: 0.7 }}>
                                    {effectiveStats?.rules?.enabled_rules || alarmRules.filter(r => r.enabled).length} enabled
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{
                            background: currentActiveAlarms.length > 0
                                ? 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)'
                                : 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
                            color: 'white',
                            animation: currentActiveAlarms.length > 0 ? 'pulse 2s infinite' : 'none'
                        }}>
                            <CardContent sx={{ p: 2 }}>
                                <Typography variant="h4" sx={{ fontWeight: 800 }}>
                                    {currentActiveAlarms.length}
                                </Typography>
                                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                    Active Alarms
                                </Typography>
                                <Typography variant="caption" sx={{ opacity: 0.7 }}>
                                    {currentCriticalAlarms.length} critical
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
                                    {currentActiveAlarms.length}
                                </Typography>
                                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                    Unacknowledged
                                </Typography>
                                <Typography variant="caption" sx={{ opacity: 0.7 }}>
                                    Need attention
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{
                            background: isConnected
                                ? 'linear-gradient(135deg, #10b981 0%, #34d399 100%)'
                                : 'linear-gradient(135deg, #6b7280 0%, #9ca3af 100%)',
                            color: 'white'
                        }}>
                            <CardContent sx={{ p: 2 }}>
                                <Typography variant="h4" sx={{ fontWeight: 800 }}>
                                    {measurementCount}
                                </Typography>
                                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                    Live Tags
                                </Typography>
                                <Typography variant="caption" sx={{ opacity: 0.7 }}>
                                    {isConnected ? 'Real-time' : 'Offline'}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>

                {/* Enhanced Controls */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
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
                                sx={{
                                    fontWeight: 600,
                                    animation: currentCriticalAlarms.length > 0 ? 'pulse 2s infinite' : 'none',
                                    cursor: 'pointer'
                                }}
                                onClick={() => setCurrentTab(1)}
                            />
                        )}

                        {/* Detection status indicator */}
                        <Chip
                            icon={<CheckCircleIcon />}
                            label="Simplified Detection"
                            color="success"
                            sx={{ fontWeight: 600 }}
                        />

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
                        <IconButton onClick={() => {
                            setAcknowledgedAlarms(new Set()); // Clear local tracking on manual refresh
                            refreshAllData();
                        }} disabled={loading} title="Refresh All Data">
                            <RefreshIcon />
                        </IconButton>
                        <IconButton onClick={forceReconnect} disabled={loading} title="Force WebSocket Reconnect">
                            <WifiIcon />
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

            {/* 🔍 Debug Information */}
            <AlarmDebugInfo />

            {/* Enhanced Tabs */}
            <Paper sx={{
                background: isDark
                    ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
                    : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                border: isDark ? '1px solid #475569' : '1px solid #e2e8f0',
                borderRadius: 3
            }}>
                <Tabs
                    value={currentTab}
                    onChange={(e, newValue) => setCurrentTab(newValue)}
                    sx={{
                        borderBottom: isDark ? '1px solid #475569' : '1px solid #e2e8f0',
                        px: 3,
                        '& .MuiTab-root': {
                            textTransform: 'none',
                            fontWeight: 600,
                            fontSize: '1rem',
                            minHeight: 60
                        }
                    }}
                >
                    <Tab
                        icon={<SettingsIcon />}
                        label={`Alarm Rules (${filtered.length})`}
                        iconPosition="start"
                    />
                    <Tab
                        icon={<NotificationsActiveIcon />}
                        label={`Active Alarms (${currentActiveAlarms.length})`}
                        iconPosition="start"
                        sx={{
                            color: currentActiveAlarms.length > 0 ? 'error.main' : 'inherit',
                            animation: currentCriticalAlarms.length > 0 ? 'pulse 2s infinite' : 'none'
                        }}
                    />
                    <Tab
                        icon={<HistoryIcon />}
                        label={`Event History (${displayAlarmEvents.length})`}
                        iconPosition="start"
                    />
                    <Tab
                        icon={<AssessmentIcon />}
                        label="Statistics"
                        iconPosition="start"
                    />
                </Tabs>

                {/* Tab Panels */}
                <TabPanel value={currentTab} index={0}>
                    {/* Alarm Rules Tab */}
                    <Grid container spacing={3}>
                        {filtered.length === 0 && !loading ? (
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
                                        <WarningIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                                        <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                                            No Alarm Rules Found
                                        </Typography>
                                        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                                            Create your first alarm rule to start monitoring parameters
                                        </Typography>
                                        <Button
                                            variant="contained"
                                            startIcon={<AddIcon />}
                                            onClick={() => { resetForm(); setAddOpen(true); }}
                                            sx={{ background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)', borderRadius: 2, px: 3 }}
                                        >
                                            Create First Alarm Rule
                                        </Button>
                                    </Paper>
                                </motion.div>
                            </Grid>
                        ) : (
                            filtered.map((rule, index) => {
                                const condition = checkAlarmCondition(rule);
                                const isActive = isRuleActive(rule.rule_id || rule.id);
                                const SeverityIcon = getSeverityIcon(rule.severity);
                                const DeviceIcon = getDeviceIcon(rule.device_type);

                                return (
                                    <Grid item xs={12} sm={6} lg={4} key={rule.rule_id || rule.id}>
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
                                                border: isActive ?
                                                    `2px solid ${rule.severity === 'critical' ? '#ef4444' : '#f59e0b'}` :
                                                    isDark ? '1px solid #475569' : '1px solid #e2e8f0',
                                                cursor: 'pointer',
                                                transition: 'all 0.3s ease-in-out',
                                                animation: isActive && rule.severity === 'critical' ? 'pulse 2s infinite' : 'none',
                                                '&:hover': {
                                                    borderColor: '#2563eb',
                                                    boxShadow: isDark
                                                        ? '0 20px 40px rgba(37, 99, 235, 0.2)'
                                                        : '0 20px 40px rgba(37, 99, 235, 0.1)',
                                                    '& .rule-actions': {
                                                        opacity: 1,
                                                        transform: 'translateY(0)'
                                                    }
                                                }
                                            }}>
                                                {/* Active Alarm Banner */}
                                                {isActive && (
                                                    <Box sx={{
                                                        p: 1,
                                                        background: rule.severity === 'critical' ?
                                                            'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' :
                                                            'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                                        color: 'white',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 1
                                                    }}>
                                                        <SeverityIcon fontSize="small" />
                                                        <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                                            ALARM TRIGGERED
                                                        </Typography>
                                                    </Box>
                                                )}

                                                <CardContent sx={{ p: 3 }}>
                                                    {/* Rule Header */}
                                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
                                                        <Badge
                                                            badgeContent={
                                                                isActive ? '!' :
                                                                    !rule.enabled ? '!' :
                                                                        condition.status === 'condition_met' ? '●' :
                                                                            condition.status === 'no_data' ? '?' : ''
                                                            }
                                                            color={
                                                                isActive ? 'error' :
                                                                    !rule.enabled ? 'default' :
                                                                        condition.status === 'condition_met' ? 'warning' :
                                                                            condition.status === 'no_data' ? 'info' : 'success'
                                                            }
                                                        >
                                                            <Avatar sx={{
                                                                width: 40,
                                                                height: 40,
                                                                background: `linear-gradient(135deg, ${
                                                                    rule.severity === 'critical' ? '#ef4444' :
                                                                        rule.severity === 'warning' ? '#f59e0b' :
                                                                            rule.severity === 'info' ? '#0891b2' : '#6b7280'
                                                                } 0%, ${
                                                                    rule.severity === 'critical' ? '#dc2626' :
                                                                        rule.severity === 'warning' ? '#d97706' :
                                                                            rule.severity === 'info' ? '#06b6d4' : '#9ca3af'
                                                                } 100%)`
                                                            }}>
                                                                <SeverityIcon fontSize="small" />
                                                            </Avatar>
                                                        </Badge>
                                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                                            <Typography variant="h6" sx={{
                                                                fontWeight: 700,
                                                                color: isActive ?
                                                                    (rule.severity === 'critical' ? 'error.main' : 'warning.main') :
                                                                    'text.primary',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap',
                                                                mb: 0.5
                                                            }}>
                                                                {rule.rule_name}
                                                            </Typography>
                                                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                                                <Chip
                                                                    label={rule.severity?.toUpperCase()}
                                                                    color={getSeverityColor(rule.severity)}
                                                                    size="small"
                                                                    sx={{ fontWeight: 600 }}
                                                                />
                                                                <Chip
                                                                    label={rule.condition_type?.toUpperCase()}
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

                                                    {/* Current Status */}
                                                    <Box sx={{
                                                        p: 2,
                                                        borderRadius: 2,
                                                        background: condition.status === 'condition_met' ?
                                                            'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' :
                                                            condition.status === 'no_data' ?
                                                                'linear-gradient(135deg, #6b7280 0%, #9ca3af 100%)' :
                                                                'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                                        color: 'white',
                                                        mb: 2
                                                    }}>
                                                        <Typography variant="caption" sx={{ opacity: 0.9 }}>
                                                            Current Status
                                                        </Typography>
                                                        <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1 }}>
                                                            {condition.message}
                                                        </Typography>
                                                    </Box>

                                                    {/* Rule Details */}
                                                    <Box sx={{ mb: 2 }}>
                                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                                            <strong>Tag:</strong> {rule.tag_name || 'Unknown'}
                                                        </Typography>
                                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                                            <strong>Device:</strong> {rule.device_name || 'Unknown'}
                                                        </Typography>
                                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                                            <strong>Threshold:</strong> {rule.threshold}
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
                                                            <Typography variant="caption" color="text.secondary" sx={{
                                                                display: 'block',
                                                                fontStyle: 'italic',
                                                                mt: 1,
                                                                p: 1,
                                                                bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                                                                borderRadius: 1
                                                            }}>
                                                                "{rule.message}"
                                                            </Typography>
                                                        )}
                                                    </Box>

                                                    {/* Action Buttons */}
                                                    <Box className="rule-actions" sx={{
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
                                                                    onClick={e => { e.stopPropagation(); openEdit(rule); }}
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
                                                                    onClick={e => { e.stopPropagation(); setCurrent(rule); setDeleteOpen(true); }}
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

                                                        <Tooltip title="View Tag Trends">
                                                            <IconButton
                                                                size="small"
                                                                onClick={e => {
                                                                    e.stopPropagation();
                                                                    navigate(`/project/${projectId}/measurements?tag=${rule.tag_id}`);
                                                                }}
                                                                sx={{
                                                                    bgcolor: isDark ? 'rgba(14, 165, 233, 0.1)' : 'info.50',
                                                                    color: 'info.main',
                                                                    '&:hover': { bgcolor: isDark ? 'rgba(14, 165, 233, 0.2)' : 'info.100' }
                                                                }}
                                                            >
                                                                <AssessmentIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </Box>
                                                </CardContent>
                                            </Card>
                                        </motion.div>
                                    </Grid>
                                );
                            })
                        )}
                    </Grid>
                </TabPanel>

                <TabPanel value={currentTab} index={1}>
                    {/* Active Alarms Tab */}
                    <Grid container spacing={3}>
                        {currentActiveAlarms.length === 0 ? (
                            <Grid item xs={12}>
                                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                                    <Paper sx={{
                                        p: 6,
                                        textAlign: 'center',
                                        background: isDark
                                            ? 'linear-gradient(135deg, #10b981 0%, #34d399 100%)'
                                            : 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                                        border: '2px solid #10b981',
                                        color: isDark ? 'white' : '#065f46'
                                    }}>
                                        <CheckCircleIcon sx={{ fontSize: 64, mb: 2 }} />
                                        <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                                            🎉 All Clear!
                                        </Typography>
                                        <Typography variant="body1" sx={{ mb: 3 }}>
                                            No active alarms detected. All systems operating normally.
                                        </Typography>
                                        <Button
                                            variant="outlined"
                                            onClick={() => setCurrentTab(0)}
                                            sx={{ borderColor: 'currentColor', color: 'inherit' }}
                                        >
                                            View Alarm Rules
                                        </Button>
                                    </Paper>
                                </motion.div>
                            </Grid>
                        ) : (
                            currentActiveAlarms.map((alarm, index) => {
                                const SeverityIcon = getSeverityIcon(alarm.severity);

                                return (
                                    <Grid item xs={12} sm={6} lg={4} key={alarm.rule_id || alarm.id}>
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
                                                border: `2px solid ${alarm.severity === 'critical' ? '#ef4444' : '#f59e0b'}`,
                                                animation: alarm.severity === 'critical' ? 'pulse 2s infinite' : 'none',
                                                '&:hover': {
                                                    '& .alarm-actions': {
                                                        opacity: 1,
                                                        transform: 'translateY(0)'
                                                    }
                                                }
                                            }}>
                                                {/* Alarm Header */}
                                                <Box sx={{
                                                    p: 2,
                                                    background: alarm.severity === 'critical' ?
                                                        'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' :
                                                        'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                                    color: 'white'
                                                }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                                        <SeverityIcon fontSize="small" />
                                                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                                            {alarm.rule_name}
                                                        </Typography>
                                                        {alarm.source && (
                                                            <Chip
                                                                label={alarm.source.toUpperCase()}
                                                                size="small"
                                                                sx={{
                                                                    bgcolor: 'rgba(255,255,255,0.2)',
                                                                    color: 'white',
                                                                    fontSize: '0.6rem'
                                                                }}
                                                            />
                                                        )}
                                                    </Box>
                                                    <Typography variant="caption" sx={{ opacity: 0.9 }}>
                                                        {alarm.severity?.toUpperCase()} ALARM • {alarm.condition_type?.toUpperCase()}
                                                    </Typography>
                                                </Box>

                                                <CardContent sx={{ p: 3 }}>
                                                    {/* Alarm Details */}
                                                    <Box sx={{ mb: 3 }}>
                                                        <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
                                                            Current Value: {alarm.trigger_value !== null && alarm.trigger_value !== undefined ?
                                                            alarm.trigger_value.toFixed(2) : 'N/A'}
                                                        </Typography>
                                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                                            <strong>Threshold:</strong> {alarm.threshold}
                                                        </Typography>
                                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                                            <strong>Tag:</strong> {alarm.tag_name || 'Unknown'}
                                                        </Typography>
                                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                                            <strong>Device:</strong> {alarm.device_name || 'Unknown'}
                                                        </Typography>
                                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                                            <strong>Triggered:</strong> {alarm.triggered_at ?
                                                            new Date(alarm.triggered_at).toLocaleString() :
                                                            'Unknown'
                                                        }
                                                        </Typography>
                                                        {alarm.message && (
                                                            <Typography variant="caption" color="text.secondary" sx={{
                                                                display: 'block',
                                                                fontStyle: 'italic',
                                                                mt: 1,
                                                                p: 1,
                                                                bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                                                                borderRadius: 1
                                                            }}>
                                                                "{alarm.message}"
                                                            </Typography>
                                                        )}
                                                    </Box>

                                                    {/* Acknowledge Button */}
                                                    <Box className="alarm-actions" sx={{
                                                        opacity: 0,
                                                        transform: 'translateY(10px)',
                                                        transition: 'all 0.3s ease-in-out'
                                                    }}>
                                                        <Button
                                                            variant="contained"
                                                            fullWidth
                                                            startIcon={<CheckIcon />}
                                                            onClick={() => openAcknowledge(alarm)}
                                                            sx={{
                                                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                                                fontWeight: 600,
                                                                py: 1.5,
                                                                '&:hover': {
                                                                    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)'
                                                                }
                                                            }}
                                                        >
                                                            Acknowledge Alarm
                                                        </Button>
                                                    </Box>
                                                </CardContent>
                                            </Card>
                                        </motion.div>
                                    </Grid>
                                );
                            })
                        )}
                    </Grid>
                </TabPanel>

                <TabPanel value={currentTab} index={2}>
                    {/* Event History Tab */}
                    <TableContainer component={Paper} sx={{
                        background: isDark
                            ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
                            : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                        border: isDark ? '1px solid #475569' : '1px solid #e2e8f0'
                    }}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 600 }}>Event Type</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Rule Name</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Value</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Timestamp</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Message</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {displayAlarmEvents
                                    .slice(eventsPage * eventsRowsPerPage, eventsPage * eventsRowsPerPage + eventsRowsPerPage)
                                    .map((event, index) => {
                                        const eventTypeInfo = formatEventType(event.event_type || event.type);
                                        const EventIcon = eventTypeInfo.icon;

                                        return (
                                            <TableRow key={index} sx={{
                                                '&:nth-of-type(odd)': {
                                                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)'
                                                }
                                            }}>
                                                <TableCell>
                                                    <Chip
                                                        icon={<EventIcon fontSize="small" />}
                                                        label={eventTypeInfo.label}
                                                        color={eventTypeInfo.color}
                                                        size="small"
                                                        sx={{ fontWeight: 600 }}
                                                    />
                                                </TableCell>
                                                <TableCell sx={{ fontWeight: 600 }}>
                                                    {event.rule_name}
                                                </TableCell>
                                                <TableCell>
                                                    {event.trigger_value !== null && event.trigger_value !== undefined
                                                        ? event.trigger_value.toFixed(2)
                                                        : 'N/A'
                                                    }
                                                </TableCell>
                                                <TableCell>
                                                    {new Date(event.timestamp || event.created_at).toLocaleString()}
                                                </TableCell>
                                                <TableCell>
                                                    {event.message || event.ack_message || '-'}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                            </TableBody>
                        </Table>
                        <TablePagination
                            rowsPerPageOptions={[10, 25, 50, 100]}
                            component="div"
                            count={displayAlarmEvents.length}
                            rowsPerPage={eventsRowsPerPage}
                            page={eventsPage}
                            onPageChange={(e, newPage) => setEventsPage(newPage)}
                            onRowsPerPageChange={(e) => {
                                setEventsRowsPerPage(parseInt(e.target.value, 10));
                                setEventsPage(0);
                            }}
                        />
                    </TableContainer>
                </TabPanel>

                <TabPanel value={currentTab} index={3}>
                    {/* Statistics Tab */}
                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
                                📊 Simplified Alarm System Statistics
                            </Typography>
                        </Grid>

                        {/* Rules Statistics */}
                        <Grid item xs={12} md={6}>
                            <Card sx={{
                                background: isDark
                                    ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
                                    : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                                border: isDark ? '1px solid #475569' : '1px solid #e2e8f0'
                            }}>
                                <CardContent>
                                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                                        Alarm Rules
                                    </Typography>
                                    <Stack spacing={2}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Typography>Total Rules:</Typography>
                                            <Typography sx={{ fontWeight: 600 }}>
                                                {effectiveStats?.rules?.total_rules || 0}
                                            </Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Typography>Enabled Rules:</Typography>
                                            <Typography sx={{ fontWeight: 600, color: 'success.main' }}>
                                                {effectiveStats?.rules?.enabled_rules || 0}
                                            </Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Typography>Critical Rules:</Typography>
                                            <Typography sx={{ fontWeight: 600, color: 'error.main' }}>
                                                {effectiveStats?.rules?.critical_rules || 0}
                                            </Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Typography>Warning Rules:</Typography>
                                            <Typography sx={{ fontWeight: 600, color: 'warning.main' }}>
                                                {effectiveStats?.rules?.warning_rules || 0}
                                            </Typography>
                                        </Box>
                                    </Stack>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Detection Statistics */}
                        <Grid item xs={12} md={6}>
                            <Card sx={{
                                background: isDark
                                    ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
                                    : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                                border: isDark ? '1px solid #475569' : '1px solid #e2e8f0'
                            }}>
                                <CardContent>
                                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                                        Detection Status
                                    </Typography>
                                    <Stack spacing={2}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Typography>Active Alarms:</Typography>
                                            <Typography sx={{ fontWeight: 600, color: currentActiveAlarms.length > 0 ? 'error.main' : 'success.main' }}>
                                                {currentActiveAlarms.length}
                                            </Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Typography>WebSocket Alarms:</Typography>
                                            <Typography sx={{ fontWeight: 600 }}>
                                                {wsActiveAlarms?.length || 0}
                                            </Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Typography>API Alarms:</Typography>
                                            <Typography sx={{ fontWeight: 600 }}>
                                                {activeAlarms?.length || 0}
                                            </Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Typography>Detection Mode:</Typography>
                                            <Typography sx={{ fontWeight: 600, color: 'success.main' }}>
                                                SIMPLIFIED
                                            </Typography>
                                        </Box>
                                    </Stack>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                </TabPanel>
            </Paper>

            {/* Add Alarm FAB */}
            <Fab
                color="primary"
                onClick={() => { resetForm(); setAddOpen(true); }}
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

            {/* Add Dialog */}
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
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        Create Alarm Rule
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Configure monitoring parameters for critical processes
                    </Typography>
                </DialogTitle>
                <DialogContent sx={{ pt: 1 }}>
                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <TextField
                                label="Alarm Rule Name"
                                value={ruleName}
                                onChange={e => setRuleName(e.target.value)}
                                fullWidth
                                required
                                autoFocus
                                helperText="Descriptive name for this alarm rule"
                            />
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth required>
                                <InputLabel>Device</InputLabel>
                                <Select
                                    value={deviceId}
                                    onChange={e => {
                                        setDeviceId(e.target.value);
                                        setTagId('');
                                    }}
                                    label="Device"
                                >
                                    {devices.map(device => (
                                        <MenuItem key={device.device_id} value={device.device_id}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                {React.createElement(getDeviceIcon(device.device_type), { fontSize: 'small' })}
                                                <Box>
                                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                        {device.device_name}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {device.device_type?.toUpperCase()}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth required>
                                <InputLabel>Tag</InputLabel>
                                <Select
                                    value={tagId}
                                    onChange={e => setTagId(e.target.value)}
                                    label="Tag"
                                    disabled={!deviceId}
                                >
                                    {tags
                                        .filter(tag => tag.device_id === parseInt(deviceId))
                                        .map(tag => (
                                            <MenuItem key={tag.tag_id} value={tag.tag_id}>
                                                <Box>
                                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                        {tag.tag_name}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {tag.tag_type?.toUpperCase()} • {tag.engineering_unit || 'units'}
                                                    </Typography>
                                                </Box>
                                            </MenuItem>
                                        ))}
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth>
                                <InputLabel>Condition Type</InputLabel>
                                <Select
                                    value={conditionType}
                                    onChange={e => setConditionType(e.target.value)}
                                    label="Condition Type"
                                >
                                    <MenuItem value="high">High Alarm (Value &gt; Threshold)</MenuItem>
                                    <MenuItem value="low">Low Alarm (Value &lt; Threshold)</MenuItem>
                                    <MenuItem value="change">Change Alarm (Deviation)</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <TextField
                                label="Threshold Value"
                                value={threshold}
                                onChange={e => setThreshold(e.target.value)}
                                fullWidth
                                required
                                type="number"
                                helperText="Critical value that triggers the alarm"
                            />
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth>
                                <InputLabel>Severity Level</InputLabel>
                                <Select
                                    value={severity}
                                    onChange={e => setSeverity(e.target.value)}
                                    label="Severity Level"
                                >
                                    <MenuItem value="critical">
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <ErrorIcon fontSize="small" color="error" />
                                            <Typography>Critical</Typography>
                                        </Box>
                                    </MenuItem>
                                    <MenuItem value="warning">
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <WarningIcon fontSize="small" color="warning" />
                                            <Typography>Warning</Typography>
                                        </Box>
                                    </MenuItem>
                                    <MenuItem value="info">
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <InfoIcon fontSize="small" color="info" />
                                            <Typography>Info</Typography>
                                        </Box>
                                    </MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <TextField
                                label="Deadband"
                                value={deadband}
                                onChange={e => setDeadband(e.target.value)}
                                fullWidth
                                type="number"
                                helperText="Hysteresis value to prevent chattering"
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
                                helperText="Optional custom message for alarm notifications"
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
                                label="Enable Alarm Rule"
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ p: 3, pt: 2 }}>
                    <Button onClick={() => setAddOpen(false)} sx={{ borderRadius: 2 }}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleAdd}
                        variant="contained"
                        disabled={!ruleName.trim() || !tagId || !deviceId || !threshold || loading}
                        sx={{
                            borderRadius: 2,
                            px: 3,
                            background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)'
                        }}
                    >
                        {loading ? 'Creating...' : 'Create Alarm Rule'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Edit Dialog */}
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
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        Edit Alarm Rule: {current?.rule_name}
                    </Typography>
                </DialogTitle>
                <DialogContent>
                    <Grid container spacing={3} sx={{ mt: 1 }}>
                        <Grid item xs={12}>
                            <TextField
                                label="Alarm Rule Name"
                                value={ruleName}
                                onChange={e => setRuleName(e.target.value)}
                                fullWidth
                                required
                            />
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth required>
                                <InputLabel>Device</InputLabel>
                                <Select
                                    value={deviceId}
                                    onChange={e => {
                                        setDeviceId(e.target.value);
                                        setTagId('');
                                    }}
                                    label="Device"
                                >
                                    {devices.map(device => (
                                        <MenuItem key={device.device_id} value={device.device_id}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                {React.createElement(getDeviceIcon(device.device_type), { fontSize: 'small' })}
                                                <Box>
                                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                        {device.device_name}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {device.device_type?.toUpperCase()}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth required>
                                <InputLabel>Tag</InputLabel>
                                <Select
                                    value={tagId}
                                    onChange={e => setTagId(e.target.value)}
                                    label="Tag"
                                    disabled={!deviceId}
                                >
                                    {tags
                                        .filter(tag => tag.device_id === parseInt(deviceId))
                                        .map(tag => (
                                            <MenuItem key={tag.tag_id} value={tag.tag_id}>
                                                <Box>
                                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                        {tag.tag_name}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {tag.tag_type?.toUpperCase()} • {tag.engineering_unit || 'units'}
                                                    </Typography>
                                                </Box>
                                            </MenuItem>
                                        ))}
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth>
                                <InputLabel>Condition Type</InputLabel>
                                <Select
                                    value={conditionType}
                                    onChange={e => setConditionType(e.target.value)}
                                    label="Condition Type"
                                >
                                    <MenuItem value="high">High Alarm (Value &gt; Threshold)</MenuItem>
                                    <MenuItem value="low">Low Alarm (Value &lt; Threshold)</MenuItem>
                                    <MenuItem value="change">Change Alarm (Deviation)</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <TextField
                                label="Threshold Value"
                                value={threshold}
                                onChange={e => setThreshold(e.target.value)}
                                fullWidth
                                required
                                type="number"
                                helperText="Critical value that triggers the alarm"
                            />
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth>
                                <InputLabel>Severity Level</InputLabel>
                                <Select
                                    value={severity}
                                    onChange={e => setSeverity(e.target.value)}
                                    label="Severity Level"
                                >
                                    <MenuItem value="critical">
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <ErrorIcon fontSize="small" color="error" />
                                            <Typography>Critical</Typography>
                                        </Box>
                                    </MenuItem>
                                    <MenuItem value="warning">
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <WarningIcon fontSize="small" color="warning" />
                                            <Typography>Warning</Typography>
                                        </Box>
                                    </MenuItem>
                                    <MenuItem value="info">
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <InfoIcon fontSize="small" color="info" />
                                            <Typography>Info</Typography>
                                        </Box>
                                    </MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <TextField
                                label="Deadband"
                                value={deadband}
                                onChange={e => setDeadband(e.target.value)}
                                fullWidth
                                type="number"
                                helperText="Hysteresis value to prevent chattering"
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
                                helperText="Optional custom message for alarm notifications"
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
                                label="Enable Alarm Rule"
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ p: 3, pt: 2 }}>
                    <Button onClick={() => setAddOpen(false)} sx={{ borderRadius: 2 }}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleAdd}
                        variant="contained"
                        disabled={!ruleName.trim() || !tagId || !deviceId || !threshold || loading}
                        sx={{
                            borderRadius: 2,
                            px: 3,
                            background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)'
                        }}
                    >
                        {loading ? 'Creating...' : 'Create Alarm Rule'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Edit Dialog */}
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
                    <Grid container spacing={3} sx={{ mt: 1 }}>
                        <Grid item xs={12}>
                            <TextField
                                label="Alarm Rule Name"
                                value={ruleName}
                                onChange={e => setRuleName(e.target.value)}
                                fullWidth
                                required
                            />
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth>
                                <InputLabel>Condition Type</InputLabel>
                                <Select
                                    value={conditionType}
                                    onChange={e => setConditionType(e.target.value)}
                                    label="Condition Type"
                                >
                                    <MenuItem value="high">High Alarm (Value > Threshold)</MenuItem>
                                    <MenuItem value="low">Low Alarm (Value &lt; Threshold)</MenuItem>
                                    <MenuItem value="change">Change Alarm (Deviation)</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <TextField
                                label="Threshold Value"
                                value={threshold}
                                onChange={e => setThreshold(e.target.value)}
                                fullWidth
                                required
                                type="number"
                            />
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth>
                                <InputLabel>Severity Level</InputLabel>
                                <Select
                                    value={severity}
                                    onChange={e => setSeverity(e.target.value)}
                                    label="Severity Level"
                                >
                                    <MenuItem value="critical">
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <ErrorIcon fontSize="small" color="error" />
                                            <Typography>Critical</Typography>
                                        </Box>
                                    </MenuItem>
                                    <MenuItem value="warning">
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <WarningIcon fontSize="small" color="warning" />
                                            <Typography>Warning</Typography>
                                        </Box>
                                    </MenuItem>
                                    <MenuItem value="info">
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <InfoIcon fontSize="small" color="info" />
                                            <Typography>Info</Typography>
                                        </Box>
                                    </MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <TextField
                                label="Deadband"
                                value={deadband}
                                onChange={e => setDeadband(e.target.value)}
                                fullWidth
                                type="number"
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
                                label="Enable Alarm Rule"
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={() => setEditOpen(false)}>Cancel</Button>
                    <Button onClick={handleEdit} variant="contained" disabled={loading}>
                        {loading ? 'Updating...' : 'Save Changes'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog
                open={deleteOpen}
                onClose={() => setDeleteOpen(false)}
                maxWidth="sm"
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
                    <Typography variant="h5" sx={{ fontWeight: 700, color: 'error.main' }}>
                        Delete Alarm Rule
                    </Typography>
                </DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to delete the alarm rule <strong>{current?.rule_name}</strong>?
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        This action cannot be undone. All associated alarm events will be permanently removed.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
                    <Button onClick={handleDelete} color="error" variant="contained" disabled={loading}>
                        {loading ? 'Deleting...' : 'Delete Rule'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Acknowledge Dialog */}
            <Dialog
                open={ackOpen}
                onClose={() => setAckOpen(false)}
                maxWidth="sm"
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
                    <Typography variant="h5" sx={{ fontWeight: 700, color: 'warning.main' }}>
                        Acknowledge Alarm
                    </Typography>
                </DialogTitle>
                <DialogContent>
                    <Typography sx={{ mb: 2 }}>
                        You are about to acknowledge the alarm: <strong>{current?.rule_name}</strong>
                    </Typography>
                    <TextField
                        label="Acknowledgment Message"
                        value={ackMessage}
                        onChange={e => setAckMessage(e.target.value)}
                        fullWidth
                        multiline
                        rows={3}
                        placeholder="Enter acknowledgment message (optional)"
                        helperText="Provide details about the acknowledgment for audit trail"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAckOpen(false)}>Cancel</Button>
                    <Button
                        onClick={handleAcknowledge}
                        variant="contained"
                        disabled={loading}
                        sx={{
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            '&:hover': {
                                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)'
                            }
                        }}
                    >
                        {loading ? 'Acknowledging...' : 'Acknowledge Alarm'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Enhanced Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    severity={snackbar.severity}
                    sx={{
                        width: '100%',
                        borderRadius: 3,
                        fontWeight: 600,
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
                    }}
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                >
                    {snackbar.msg}
                </Alert>
            </Snackbar>

            {/* CSS animations */}
            <style>{`
    @keyframes pulse {
        0% { 
            opacity: 1; 
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.7);
        }
        50% { 
            opacity: 0.8; 
            transform: scale(1.02);
            box-shadow: 0 0 0 10px rgba(220, 38, 38, 0);
        }
        100% { 
            opacity: 1; 
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(220, 38, 38, 0);
        }
    }
    
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }
    
    .alarm-card-enter {
        animation: fadeIn 0.3s ease-out;
    }
`}</style>
        </Box>
    );
}