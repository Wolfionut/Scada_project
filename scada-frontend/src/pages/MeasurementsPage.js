// src/pages/MeasurementsPage.js - Enhanced with Date Range Selection & More Historical Data
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
    Box, Typography, Paper, Tabs, Tab, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Chip, IconButton, Alert, LinearProgress, Button,
    Stack, Avatar, Badge, FormControlLabel, Switch, Tooltip, Grid, FormControl,
    InputLabel, Select, MenuItem, Card, CardContent, TextField, TablePagination,
    Accordion, AccordionSummary, AccordionDetails, Divider, ButtonGroup
} from '@mui/material';
import {
    Analytics as AnalyticsIcon,
    TableChart as TableIcon,
    ShowChart as ChartIcon,
    Refresh as RefreshIcon,
    Circle as CircleIcon,
    CheckCircle as CheckCircleIcon,
    Memory as MemoryIcon,
    Storage as StorageIcon,
    Timeline as TimelineIcon,
    TrendingUp as TrendingUpIcon,
    DateRange as DateRangeIcon,
    Today as TodayIcon,
    CalendarMonth as CalendarIcon,
    Download as DownloadIcon,
    ExpandMore as ExpandMoreIcon,
    FilterList as FilterIcon
} from '@mui/icons-material';
// Using standard HTML date inputs - no additional dependencies needed
import { useParams } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import axios from '../api/axios';
import { useRealTimeData } from '../hooks/useWebSocket';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
    Legend, ResponsiveContainer, ReferenceLine, Brush
} from 'recharts';

export default function MeasurementsPage() {
    const { projectId } = useParams();
    const { isDark } = useTheme();

    // WebSocket real-time data
    const {
        measurements,
        isConnected,
        measurementCount,
        error: wsError
    } = useRealTimeData(projectId);

    // State
    const [state, setState] = useState({
        // Basic data - always initialize as arrays
        tags: [],
        devices: [],
        latestMeasurements: [],

        // Selected tag data
        selectedTagId: '',
        historicalData: [], // Database measurements for selected period
        realtimeData: [],   // Real-time measurements for selected tag

        // Date range selection
        startDate: new Date(new Date().setHours(0, 0, 0, 0)), // Today start
        endDate: new Date(new Date().setHours(23, 59, 59, 999)), // Today end
        selectedPeriod: 'today', // 'today', 'yesterday', 'week', 'month', 'custom'

        // UI
        loading: false,
        historicalLoading: false,
        error: null,
        currentTab: 0, // 0 = Overview, 1 = Historical Table, 2 = Chart
        autoRefresh: true,

        // 🆕 Database refresh controls
        autoRefreshDb: false, // Toggle for auto-refreshing database on new WebSocket data
        pendingDbUpdates: 0,  // Count of new measurements not yet in database view
        lastDbRefresh: null,  // Timestamp of last database refresh

        // Table pagination
        tablePage: 0,
        tableRowsPerPage: 25,

        // Data statistics
        totalHistoricalPoints: 0,
        dataStatistics: null
    });

    const updateState = useCallback((updates) => {
        setState(prev => ({ ...prev, ...updates }));
    }, []);

    // Time period presets
    const timePeriods = [
        {
            key: 'today',
            label: 'Today',
            icon: TodayIcon,
            getRange: () => ({
                start: new Date(new Date().setHours(0, 0, 0, 0)),
                end: new Date(new Date().setHours(23, 59, 59, 999))
            })
        },
        {
            key: 'yesterday',
            label: 'Yesterday',
            icon: CalendarIcon,
            getRange: () => {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                return {
                    start: new Date(yesterday.setHours(0, 0, 0, 0)),
                    end: new Date(yesterday.setHours(23, 59, 59, 999))
                };
            }
        },
        {
            key: 'week',
            label: 'Last 7 Days',
            icon: DateRangeIcon,
            getRange: () => {
                const end = new Date();
                const start = new Date();
                start.setDate(start.getDate() - 7);
                return { start, end };
            }
        },
        {
            key: 'month',
            label: 'Last 30 Days',
            icon: CalendarIcon,
            getRange: () => {
                const end = new Date();
                const start = new Date();
                start.setDate(start.getDate() - 30);
                return { start, end };
            }
        }
    ];

    // Fetch basic project data
    const fetchProjectData = useCallback(async () => {
        updateState({ loading: true, error: null });

        try {
            console.log('📤 Fetching project data for:', projectId);

            const [tagsResponse, devicesResponse, currentValuesResponse] = await Promise.all([
                axios.get(`tags/project/${projectId}`),
                axios.get(`tags/project/${projectId}/devices`),
                axios.get(`measurements/current/${projectId}`)
            ]);

            const tags = Array.isArray(tagsResponse.data) ? tagsResponse.data : [];
            const devices = Array.isArray(devicesResponse.data) ? devicesResponse.data : [];
            const currentValuesData = currentValuesResponse.data;
            const currentValues = currentValuesData.current_values || [];

            const latestMeasurements = currentValues
                .filter(cv => cv.current_value && cv.current_value.value !== null)
                .map(cv => ({
                    tag_id: cv.tag_id,
                    value: cv.current_value.value,
                    timestamp: cv.current_value.timestamp,
                    quality: cv.current_value.quality,
                    source: cv.current_value.source
                }));

            console.log('✅ Project data loaded:', {
                tags: tags.length,
                devices: devices.length,
                currentValues: currentValues.length,
                latestMeasurements: latestMeasurements.length
            });

            updateState({
                tags,
                devices,
                latestMeasurements,
                loading: false,
                error: null,
                selectedTagId: state.selectedTagId || (tags.length > 0 ? tags[0].tag_id.toString() : '')
            });

        } catch (error) {
            console.error('❌ Project data fetch error:', error);
            updateState({
                tags: [],
                devices: [],
                latestMeasurements: [],
                error: `Failed to load data: ${error.response?.status || error.message}`,
                loading: false
            });
        }
    }, [projectId, state.selectedTagId]);

    // Enhanced fetch historical data with date range
    const fetchHistoricalData = useCallback(async (tagId, startDate, endDate) => {
        if (!tagId || !startDate || !endDate) return;

        updateState({ historicalLoading: true });

        try {
            console.log('📈 Fetching historical data for tag:', tagId);
            console.log('📅 Date range:', {
                start: startDate.toISOString(),
                end: endDate.toISOString(),
                days: Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
            });

            // Enhanced API call with date range parameters
            const response = await axios.get(`measurements/tag/${tagId}`, {
                params: {
                    start_date: startDate.toISOString(),
                    end_date: endDate.toISOString(),
                    include_statistics: true,
                    order_by: 'timestamp',
                    order_direction: 'DESC'
                }
            });

            console.log('🐛 DEBUG: Historical response structure:', {
                response_keys: Object.keys(response.data),
                has_measurements: !!response.data.measurements,
                measurements_length: response.data.measurements?.length || 0,
                has_statistics: !!response.data.statistics,
                has_tag_info: !!response.data.tag_info
            });

            const historicalData = response.data.measurements || [];
            const statistics = response.data.statistics || null;
            const totalPoints = response.data.total_count || historicalData.length;

            console.log('✅ Historical data loaded:', {
                points: historicalData.length,
                total: totalPoints,
                period: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`
            });

            updateState({
                historicalData,
                dataStatistics: statistics,
                totalHistoricalPoints: totalPoints,
                realtimeData: [], // Reset real-time data when changing tags/dates
                historicalLoading: false,
                tablePage: 0 // Reset pagination
            });

        } catch (error) {
            console.error('❌ Historical data fetch error:', error);

            // Fallback: use latest measurement if available
            const latest = state.latestMeasurements.find(m => m.tag_id === parseInt(tagId));
            if (latest &&
                new Date(latest.timestamp) >= startDate &&
                new Date(latest.timestamp) <= endDate) {
                console.log('🔄 Using latest measurement as fallback');
                updateState({
                    historicalData: [latest],
                    dataStatistics: null,
                    totalHistoricalPoints: 1,
                    realtimeData: [],
                    historicalLoading: false
                });
            } else {
                updateState({
                    historicalData: [],
                    realtimeData: [],
                    dataStatistics: null,
                    totalHistoricalPoints: 0,
                    historicalLoading: false
                });
            }
        }
    }, [state.latestMeasurements]);

    // Handle time period selection
    const handlePeriodChange = useCallback((periodKey) => {
        if (periodKey === 'custom') {
            updateState({ selectedPeriod: 'custom' });
            return;
        }

        const period = timePeriods.find(p => p.key === periodKey);
        if (period) {
            const range = period.getRange();
            updateState({
                selectedPeriod: periodKey,
                startDate: range.start,
                endDate: range.end
            });
        }
    }, []);

    // Handle custom date change
    const handleDateChange = useCallback((field, date) => {
        if (!date) return;

        let newDate = date;

        // If it's the end date, set to end of day (23:59:59)
        if (field === 'endDate') {
            newDate = new Date(date);
            newDate.setHours(23, 59, 59, 999);
        } else if (field === 'startDate') {
            // If it's the start date, set to beginning of day (00:00:00)
            newDate = new Date(date);
            newDate.setHours(0, 0, 0, 0);
        }

        updateState({
            [field]: newDate,
            selectedPeriod: 'custom'
        });
    }, []);

    // Export data to CSV
    const exportToCSV = useCallback(() => {
        if (!selectedTag || state.historicalData.length === 0) return;

        const headers = ['Timestamp', 'Value', 'Quality', 'Source'];
        const csvData = [
            headers.join(','),
            ...state.historicalData.map(row => [
                new Date(row.timestamp).toISOString(),
                row.value,
                row.quality || 'good',
                row.source || 'database'
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvData], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedTag.tag_name}_${state.startDate.toISOString().split('T')[0]}_${state.endDate.toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }, [state.historicalData, state.startDate, state.endDate]);

    // Get current tag info
    const selectedTag = useMemo(() => {
        return state.tags.find(tag => tag.tag_id.toString() === state.selectedTagId);
    }, [state.tags, state.selectedTagId]);

    const selectedDevice = useMemo(() => {
        return selectedTag ? state.devices.find(d => d.device_id === selectedTag.device_id) : null;
    }, [selectedTag, state.devices]);

    // Enhanced chart data with proper time handling
    const chartData = useMemo(() => {
        if (!state.selectedTagId) return [];

        const data = [];

        // Add historical database measurements
        state.historicalData.forEach(point => {
            data.push({
                timestamp: new Date(point.timestamp).getTime(),
                time: new Date(point.timestamp).toLocaleTimeString(),
                database_value: point.value,
                quality: point.quality || 'good',
                source: 'database',
                formatted_time: new Date(point.timestamp).toLocaleString(),
                date: new Date(point.timestamp).toLocaleDateString()
            });
        });

        // Add real-time data points (only if within selected date range)
        state.realtimeData.forEach(point => {
            const pointDate = new Date(point.timestamp);
            if (pointDate >= state.startDate && pointDate <= state.endDate) {
                data.push({
                    timestamp: pointDate.getTime(),
                    time: pointDate.toLocaleTimeString(),
                    realtime_value: point.value,
                    quality: 'good',
                    source: 'realtime',
                    formatted_time: pointDate.toLocaleString(),
                    date: pointDate.toLocaleDateString()
                });
            }
        });

        // Add current WebSocket value if within range
        const currentWebSocketValue = measurements[state.selectedTagId];
        if (currentWebSocketValue) {
            const wsDate = new Date(currentWebSocketValue.timestamp);
            if (wsDate >= state.startDate && wsDate <= state.endDate) {
                const wsTimestamp = wsDate.getTime();
                const existingPoint = data.find(p => Math.abs(p.timestamp - wsTimestamp) < 1000);

                if (!existingPoint) {
                    data.push({
                        timestamp: wsTimestamp,
                        time: wsDate.toLocaleTimeString(),
                        realtime_value: currentWebSocketValue.value,
                        quality: 'good',
                        source: 'realtime',
                        formatted_time: wsDate.toLocaleString(),
                        date: wsDate.toLocaleDateString()
                    });
                }
            }
        }

        // Sort by timestamp
        const sortedData = data.sort((a, b) => a.timestamp - b.timestamp);

        console.log('📊 Chart data prepared:', {
            historical: state.historicalData.length,
            realtime: state.realtimeData.length,
            current_websocket: currentWebSocketValue ? 1 : 0,
            combined: sortedData.length,
            date_range: `${state.startDate.toLocaleDateString()} - ${state.endDate.toLocaleDateString()}`
        });

        return sortedData;
    }, [state.selectedTagId, state.historicalData, state.realtimeData, measurements, state.startDate, state.endDate]);

    // Enhanced table data with pagination
    const tableData = useMemo(() => {
        if (!state.selectedTagId) return [];

        const combinedTableData = [];

        // Get database measurements for selected period
        const dbMeasurements = state.historicalData; // All data for selected period

        // Get current WebSocket value
        const currentWS = measurements[state.selectedTagId];

        // Add database measurements
        dbMeasurements.forEach(dbPoint => {
            combinedTableData.push({
                timestamp: new Date(dbPoint.timestamp).getTime(),
                formatted_time: new Date(dbPoint.timestamp).toLocaleString(),
                db_value: dbPoint.value,
                db_quality: dbPoint.quality || 'good',
                ws_value: null,
                ws_quality: null,
                source: 'database',
                id: `db_${dbPoint.timestamp}`
            });
        });

        // Add current WebSocket value if within range
        if (currentWS) {
            const wsDate = new Date(currentWS.timestamp);
            if (wsDate >= state.startDate && wsDate <= state.endDate) {
                const wsTimestamp = wsDate.getTime();
                const matchingDbEntry = combinedTableData.find(entry =>
                    Math.abs(entry.timestamp - wsTimestamp) < 30000
                );

                if (matchingDbEntry) {
                    matchingDbEntry.ws_value = currentWS.value;
                    matchingDbEntry.ws_quality = 'good';
                    matchingDbEntry.source = 'both';
                } else {
                    combinedTableData.push({
                        timestamp: wsTimestamp,
                        formatted_time: wsDate.toLocaleString(),
                        db_value: null,
                        db_quality: null,
                        ws_value: currentWS.value,
                        ws_quality: 'good',
                        source: 'websocket',
                        id: `ws_${currentWS.timestamp}`
                    });
                }
            }
        }

        // Add recent real-time data points within range
        state.realtimeData.forEach(rtPoint => {
            const rtDate = new Date(rtPoint.timestamp);
            if (rtDate >= state.startDate && rtDate <= state.endDate) {
                const rtTimestamp = rtDate.getTime();
                const exists = combinedTableData.find(entry =>
                    Math.abs(entry.timestamp - rtTimestamp) < 1000
                );

                if (!exists) {
                    combinedTableData.push({
                        timestamp: rtTimestamp,
                        formatted_time: rtDate.toLocaleString(),
                        db_value: null,
                        db_quality: null,
                        ws_value: rtPoint.value,
                        ws_quality: 'good',
                        source: 'websocket',
                        id: `rt_${rtPoint.timestamp}`
                    });
                }
            }
        });

        // Sort by timestamp (most recent first)
        return combinedTableData.sort((a, b) => b.timestamp - a.timestamp);
    }, [state.selectedTagId, state.historicalData, state.realtimeData, measurements, state.startDate, state.endDate]);

    // Enhanced real-time measurement handling with user control
    useEffect(() => {
        if (!state.selectedTagId || !measurements[state.selectedTagId]) return;

        const newMeasurement = measurements[state.selectedTagId];
        const timestamp = new Date(newMeasurement.timestamp).getTime();

        const exists = state.realtimeData.some(point =>
            Math.abs(new Date(point.timestamp).getTime() - timestamp) < 1000
        );

        if (!exists) {
            console.log('🔥 NEW real-time measurement for selected tag:', newMeasurement.value);

            const newDataPoint = {
                timestamp: newMeasurement.timestamp,
                value: newMeasurement.value,
                quality: 'good',
                source: 'realtime'
            };

            updateState({
                realtimeData: [...state.realtimeData, newDataPoint].slice(-100),
                pendingDbUpdates: state.pendingDbUpdates + 1 // Track pending updates
            });

            // Only auto-refresh database if user has enabled it
            if (state.autoRefreshDb) {
                const now = Date.now();
                const lastRefresh = state.lastDbRefresh || 0;
                const refreshCooldown = 15000; // 15 seconds between auto-refreshes

                if (now - lastRefresh > refreshCooldown) {
                    console.log('🔄 Auto-refreshing database data');
                    setTimeout(() => {
                        refreshDatabaseData();
                    }, 3000);
                }
            }
        }
    }, [measurements, state.selectedTagId, state.realtimeData, state.autoRefreshDb, state.lastDbRefresh]);

    // Manual database refresh function
    const refreshDatabaseData = useCallback(() => {
        if (!state.selectedTagId) return;

        console.log('🔄 Manually refreshing database data');
        updateState({
            lastDbRefresh: Date.now(),
            pendingDbUpdates: 0 // Reset pending count
        });
        fetchHistoricalData(state.selectedTagId, state.startDate, state.endDate);
    }, [state.selectedTagId, state.startDate, state.endDate, fetchHistoricalData]);

    // Load data on mount
    useEffect(() => {
        console.log('=== ENHANCED MEASUREMENTS PAGE ===');
        fetchProjectData();
    }, [fetchProjectData]);

    // Load historical data when tag or date range changes
    useEffect(() => {
        if (state.selectedTagId && state.startDate && state.endDate) {
            fetchHistoricalData(state.selectedTagId, state.startDate, state.endDate);
        }
    }, [state.selectedTagId, state.startDate, state.endDate, fetchHistoricalData]);

    // Auto-refresh
    useEffect(() => {
        if (state.autoRefresh) {
            const interval = setInterval(fetchProjectData, 30000);
            return () => clearInterval(interval);
        }
    }, [state.autoRefresh, fetchProjectData]);

    // Handle tag selection
    const handleTagChange = (tagId) => {
        console.log('🎯 Selected tag changed to:', tagId);
        updateState({ selectedTagId: tagId });
    };

    // Format helpers
    const formatValue = (value, unit) => {
        if (value === null || value === undefined) return 'N/A';
        return typeof value === 'number' ? `${value.toFixed(2)} ${unit || ''}`.trim() : value.toString();
    };

    const getQualityColor = (quality, source) => {
        if (source === 'realtime' || source === 'websocket') return 'success';
        switch (quality) {
            case 'good': return 'success';
            case 'bad': return 'error';
            case 'uncertain': return 'warning';
            case 'stale': return 'default';
            default: return 'default';
        }
    };

    // Statistics
    const stats = useMemo(() => {
        const total = state.tags.length;
        const realtimeKeys = Object.keys(measurements);
        const realtime = realtimeKeys.length;
        const devices = state.devices.length;
        const selectedTagRealtime = state.selectedTagId && measurements[state.selectedTagId];

        return { total, realtime, devices, selectedTagRealtime };
    }, [state.tags.length, state.devices.length, measurements, state.selectedTagId]);

    // Format date for input (YYYY-MM-DD)
    const formatDateForInput = (date) => {
        return date.toISOString().split('T')[0];
    };

    // Parse date from input
    const parseDateFromInput = (dateString) => {
        const date = new Date(dateString + 'T00:00:00');
        return date;
    };

    // Date Range Controls
    const renderDateRangeControls = () => (
        <Paper sx={{ p: 3, mb: 3, background: isDark ? '#1e293b' : '#ffffff' }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                📅 Time Period Selection
            </Typography>

            <Grid container spacing={3} alignItems="center">
                <Grid item xs={12} md={6}>
                    <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
                        Quick Select:
                    </Typography>
                    <ButtonGroup variant="outlined" sx={{ flexWrap: 'wrap' }}>
                        {timePeriods.map(period => {
                            const IconComponent = period.icon;
                            return (
                                <Button
                                    key={period.key}
                                    onClick={() => handlePeriodChange(period.key)}
                                    variant={state.selectedPeriod === period.key ? 'contained' : 'outlined'}
                                    startIcon={<IconComponent />}
                                    size="small"
                                >
                                    {period.label}
                                </Button>
                            );
                        })}
                    </ButtonGroup>
                </Grid>

                <Grid item xs={12} md={3}>
                    <TextField
                        label="Start Date"
                        type="date"
                        value={formatDateForInput(state.startDate)}
                        onChange={(e) => handleDateChange('startDate', parseDateFromInput(e.target.value))}
                        fullWidth
                        size="small"
                        InputLabelProps={{
                            shrink: true,
                        }}
                        inputProps={{
                            max: formatDateForInput(state.endDate)
                        }}
                    />
                </Grid>

                <Grid item xs={12} md={3}>
                    <TextField
                        label="End Date"
                        type="date"
                        value={formatDateForInput(state.endDate)}
                        onChange={(e) => handleDateChange('endDate', parseDateFromInput(e.target.value))}
                        fullWidth
                        size="small"
                        InputLabelProps={{
                            shrink: true,
                        }}
                        inputProps={{
                            min: formatDateForInput(state.startDate),
                            max: formatDateForInput(new Date())
                        }}
                    />
                </Grid>
            </Grid>

            {state.dataStatistics && (
                <Box sx={{ mt: 3, p: 2, background: isDark ? '#374151' : '#f8fafc', borderRadius: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                        📊 Period Statistics:
                    </Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={6} md={3}>
                            <Typography variant="caption" color="text.secondary">Total Points:</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {state.totalHistoricalPoints.toLocaleString()}
                            </Typography>
                        </Grid>
                        <Grid item xs={6} md={3}>
                            <Typography variant="caption" color="text.secondary">Min Value:</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {state.dataStatistics.min_value?.toFixed(2) || 'N/A'}
                            </Typography>
                        </Grid>
                        <Grid item xs={6} md={3}>
                            <Typography variant="caption" color="text.secondary">Max Value:</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {state.dataStatistics.max_value?.toFixed(2) || 'N/A'}
                            </Typography>
                        </Grid>
                        <Grid item xs={6} md={3}>
                            <Typography variant="caption" color="text.secondary">Average:</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {state.dataStatistics.avg_value?.toFixed(2) || 'N/A'}
                            </Typography>
                        </Grid>
                    </Grid>
                </Box>
            )}
        </Paper>
    );

    // Enhanced Overview Tab
    const renderOverview = () => (
        <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
                <Card sx={{ background: isDark ? '#1e293b' : '#ffffff', height: '100%' }}>
                    <CardContent>
                        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                            Project Summary
                        </Typography>
                        <Stack spacing={2}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography>Total Tags:</Typography>
                                <Chip label={stats.total} color="primary" size="small" />
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography>Live Tags:</Typography>
                                <Chip label={stats.realtime} color="success" size="small" />
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography>Devices:</Typography>
                                <Chip label={stats.devices} color="warning" size="small" />
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography>WebSocket:</Typography>
                                <Chip
                                    label={isConnected ? 'Connected' : 'Offline'}
                                    color={isConnected ? 'success' : 'error'}
                                    size="small"
                                />
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography>Auto DB Sync:</Typography>
                                <Chip
                                    label={state.autoRefreshDb ? 'Enabled' : 'Manual'}
                                    color={state.autoRefreshDb ? 'info' : 'default'}
                                    size="small"
                                />
                            </Box>
                            {state.pendingDbUpdates > 0 && (
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography>Pending DB Updates:</Typography>
                                    <Chip
                                        label={`${state.pendingDbUpdates} new`}
                                        color="warning"
                                        size="small"
                                        sx={{ animation: 'pulse 2s infinite' }}
                                    />
                                </Box>
                            )}
                        </Stack>
                    </CardContent>
                </Card>
            </Grid>

            {selectedTag && (
                <Grid item xs={12} md={6}>
                    <Card sx={{ background: isDark ? '#1e293b' : '#ffffff', height: '100%' }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                                Selected Tag: {selectedTag.tag_name}
                            </Typography>
                            <Stack spacing={2}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography>Device:</Typography>
                                    <Typography sx={{ fontWeight: 600 }}>
                                        {selectedDevice?.device_name || 'Unknown'}
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography>Type:</Typography>
                                    <Chip label={selectedTag.tag_type} size="small" variant="outlined" />
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography>Unit:</Typography>
                                    <Typography>{selectedTag.engineering_unit || 'N/A'}</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography>Period:</Typography>
                                    <Typography variant="body2">
                                        {state.startDate.toLocaleDateString()} - {state.endDate.toLocaleDateString()}
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography>Historical Points:</Typography>
                                    <Chip label={state.totalHistoricalPoints.toLocaleString()} color="primary" size="small" />
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography>Real-time Points:</Typography>
                                    <Chip label={state.realtimeData.length} color="success" size="small" />
                                </Box>
                                {stats.selectedTagRealtime && (
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography>Current Value:</Typography>
                                        <Typography sx={{ fontWeight: 600, color: 'success.main' }}>
                                            {formatValue(stats.selectedTagRealtime.value, selectedTag.engineering_unit)}
                                        </Typography>
                                    </Box>
                                )}
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
            )}
        </Grid>
    );

    // Enhanced Table with pagination
    const renderTable = () => {
        const paginatedData = tableData.slice(
            state.tablePage * state.tableRowsPerPage,
            state.tablePage * state.tableRowsPerPage + state.tableRowsPerPage
        );

        return (
            <Paper sx={{ background: isDark ? '#1e293b' : '#ffffff' }}>
                <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Measurement Data ({tableData.length.toLocaleString()} records)
                    </Typography>
                    <Button
                        startIcon={<DownloadIcon />}
                        onClick={exportToCSV}
                        variant="outlined"
                        size="small"
                        disabled={state.historicalData.length === 0}
                    >
                        Export CSV
                    </Button>
                </Box>

                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ background: isDark ? '#374151' : '#f8fafc' }}>
                                <TableCell sx={{ fontWeight: 600 }}>Timestamp</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Database Value</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>WebSocket Value</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Source</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {paginatedData.map((row) => (
                                <TableRow key={row.id} sx={{
                                    '&:hover': { background: isDark ? '#374151' : '#f8fafc' },
                                    background: row.source === 'websocket' ?
                                        (isDark ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)') :
                                        row.source === 'both' ?
                                            (isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)') :
                                            'inherit'
                                }}>
                                    <TableCell>
                                        <Typography variant="body2">
                                            {row.formatted_time}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" sx={{
                                            fontWeight: 600,
                                            color: row.db_value !== null ? 'primary.main' : 'text.disabled'
                                        }}>
                                            {row.db_value !== null ?
                                                formatValue(row.db_value, selectedTag?.engineering_unit) :
                                                '—'
                                            }
                                        </Typography>
                                        {row.db_quality && (
                                            <Chip
                                                label={row.db_quality}
                                                color={getQualityColor(row.db_quality, 'database')}
                                                size="small"
                                                sx={{ mt: 0.5 }}
                                            />
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" sx={{
                                            fontWeight: 600,
                                            color: row.ws_value !== null ? 'success.main' : 'text.disabled'
                                        }}>
                                            {row.ws_value !== null ?
                                                formatValue(row.ws_value, selectedTag?.engineering_unit) :
                                                '—'
                                            }
                                        </Typography>
                                        {row.ws_quality && (
                                            <Chip
                                                label={row.ws_quality}
                                                color={getQualityColor(row.ws_quality, 'websocket')}
                                                size="small"
                                                sx={{ mt: 0.5 }}
                                            />
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Stack direction="row" spacing={1}>
                                            {row.db_value !== null && (
                                                <Chip
                                                    icon={<StorageIcon />}
                                                    label="DB"
                                                    color="primary"
                                                    size="small"
                                                />
                                            )}
                                            {row.ws_value !== null && (
                                                <Chip
                                                    icon={<CheckCircleIcon />}
                                                    label="Live"
                                                    color="success"
                                                    size="small"
                                                />
                                            )}
                                        </Stack>
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={
                                                row.source === 'both' ? 'Database + Live' :
                                                    row.source === 'websocket' ? 'WebSocket Only' :
                                                        'Database Only'
                                            }
                                            color={
                                                row.source === 'both' ? 'info' :
                                                    row.source === 'websocket' ? 'success' :
                                                        'primary'
                                            }
                                            size="small"
                                            variant="outlined"
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>

                <TablePagination
                    component="div"
                    count={tableData.length}
                    page={state.tablePage}
                    onPageChange={(e, newPage) => updateState({ tablePage: newPage })}
                    rowsPerPage={state.tableRowsPerPage}
                    onRowsPerPageChange={(e) => updateState({
                        tableRowsPerPage: parseInt(e.target.value, 10),
                        tablePage: 0
                    })}
                    rowsPerPageOptions={[10, 25, 50, 100]}
                />

                {tableData.length === 0 && (
                    <Box sx={{ p: 4, textAlign: 'center' }}>
                        <Typography color="text.secondary">
                            No data available for selected tag and time period
                        </Typography>
                    </Box>
                )}
            </Paper>
        );
    };

    // Enhanced Chart with Brush for large datasets
    const renderChart = () => (
        <Paper sx={{ p: 3, background: isDark ? '#1e293b' : '#ffffff' }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                {selectedTag ?
                    `${selectedTag.tag_name} - ${state.startDate.toLocaleDateString()} to ${state.endDate.toLocaleDateString()}` :
                    'Select a tag to view data'
                }
            </Typography>

            {state.historicalLoading && (
                <Box sx={{ mb: 2 }}>
                    <LinearProgress />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Loading historical data...
                    </Typography>
                </Box>
            )}

            {chartData.length > 0 ? (
                <>
                    <ResponsiveContainer width="100%" height={500}>
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e5e7eb'} />
                            <XAxis
                                dataKey="time"
                                stroke={isDark ? '#9ca3af' : '#6b7280'}
                                fontSize={12}
                            />
                            <YAxis
                                stroke={isDark ? '#9ca3af' : '#6b7280'}
                                fontSize={12}
                                label={{
                                    value: selectedTag?.engineering_unit || 'Value',
                                    angle: -90,
                                    position: 'insideLeft'
                                }}
                            />
                            <RechartsTooltip
                                contentStyle={{
                                    backgroundColor: isDark ? '#374151' : '#ffffff',
                                    border: `1px solid ${isDark ? '#4b5563' : '#d1d5db'}`,
                                    borderRadius: 8
                                }}
                                formatter={(value, name) => {
                                    if (name === 'database_value') {
                                        return [formatValue(value, selectedTag?.engineering_unit), 'Database Value'];
                                    } else if (name === 'realtime_value') {
                                        return [formatValue(value, selectedTag?.engineering_unit), 'WebSocket Value'];
                                    }
                                    return [formatValue(value, selectedTag?.engineering_unit), name];
                                }}
                                labelFormatter={(label, payload) => {
                                    if (payload && payload[0]) {
                                        return payload[0].payload.formatted_time;
                                    }
                                    return label;
                                }}
                            />
                            <Legend />

                            <Line
                                type="monotone"
                                dataKey="database_value"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                dot={{ fill: '#3b82f6', strokeWidth: 1, r: 3 }}
                                connectNulls={false}
                                name="Database Values"
                            />

                            <Line
                                type="monotone"
                                dataKey="realtime_value"
                                stroke="#10b981"
                                strokeWidth={3}
                                dot={{ fill: '#10b981', strokeWidth: 2, r: 5 }}
                                connectNulls={false}
                                name="WebSocket Values (Live)"
                            />

                            {/* Add brush for large datasets */}
                            {chartData.length > 100 && (
                                <Brush
                                    dataKey="time"
                                    height={30}
                                    stroke="#8884d8"
                                />
                            )}
                        </LineChart>
                    </ResponsiveContainer>

                    <Box sx={{ mt: 3 }}>
                        <Grid container spacing={2}>
                            <Grid item xs={12} md={4}>
                                <Card sx={{ p: 2, background: isDark ? '#374151' : '#f8fafc' }}>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                        📊 Database Points: {state.historicalData.length.toLocaleString()}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Historical measurements from PostgreSQL
                                    </Typography>
                                </Card>
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <Card sx={{ p: 2, background: isDark ? '#374151' : '#f8fafc' }}>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                        🔥 WebSocket Points: {state.realtimeData.length + (measurements[state.selectedTagId] ? 1 : 0)}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Real-time data via WebSocket
                                    </Typography>
                                </Card>
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <Card sx={{ p: 2, background: isDark ? '#374151' : '#f8fafc' }}>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                        📅 Period: {Math.ceil((state.endDate - state.startDate) / (1000 * 60 * 60 * 24))} days
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {state.selectedPeriod === 'custom' ? 'Custom range' : `${timePeriods.find(p => p.key === state.selectedPeriod)?.label || 'Selected'} period`}
                                    </Typography>
                                </Card>
                            </Grid>
                        </Grid>
                    </Box>
                </>
            ) : (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                    <TrendingUpIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">
                        {selectedTag ? 'No data available for this period' : 'Select a tag to view chart'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {selectedTag && 'Try selecting a different time period or check if data exists for this tag'}
                    </Typography>
                </Box>
            )}
        </Paper>
    );

    return (
        <Box sx={{
            p: 4,
            background: isDark
                ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
                : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
            minHeight: '100vh'
        }}>
            {/* Header */}
            <Box sx={{ mb: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Avatar sx={{ width: 48, height: 48, background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)' }}>
                        <AnalyticsIcon />
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
                            Enhanced Measurements with Date Range
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            Historical database records with flexible time period selection and real-time WebSocket data.
                            💡 Toggle "Auto-sync DB" to automatically refresh database view when new WebSocket data arrives.
                        </Typography>
                    </Box>
                </Box>

                {/* Controls */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <FormControl size="small" sx={{ minWidth: 200 }}>
                            <InputLabel>Select Tag</InputLabel>
                            <Select
                                value={state.selectedTagId}
                                onChange={(e) => handleTagChange(e.target.value)}
                                label="Select Tag"
                            >
                                {state.tags.map(tag => {
                                    const device = state.devices.find(d => d.device_id === tag.device_id);
                                    return (
                                        <MenuItem key={tag.tag_id} value={tag.tag_id.toString()}>
                                            {tag.tag_name} ({device?.device_name || 'Unknown'})
                                        </MenuItem>
                                    );
                                })}
                            </Select>
                        </FormControl>

                        <Badge badgeContent={stats.total} color="primary">
                            <Chip icon={<StorageIcon />} label="Total" color="primary" />
                        </Badge>
                        <Badge badgeContent={stats.realtime} color="success">
                            <Chip icon={<MemoryIcon />} label="Live" color="success" />
                        </Badge>
                        <Badge badgeContent={state.totalHistoricalPoints} color="info">
                            <Chip icon={<DateRangeIcon />} label="Period" color="info" />
                        </Badge>
                    </Stack>

                    <Stack direction="row" spacing={2} alignItems="center">
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={state.autoRefresh}
                                    onChange={(e) => updateState({ autoRefresh: e.target.checked })}
                                    color="success"
                                />
                            }
                            label="Auto-refresh"
                        />
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={state.autoRefreshDb}
                                    onChange={(e) => updateState({ autoRefreshDb: e.target.checked })}
                                    color="info"
                                />
                            }
                            label="Auto-sync DB"
                        />
                        <Button
                            variant="outlined"
                            startIcon={<RefreshIcon />}
                            onClick={fetchProjectData}
                            disabled={state.loading}
                            size="small"
                        >
                            Refresh All
                        </Button>
                        {state.pendingDbUpdates > 0 && (
                            <Tooltip title={`${state.pendingDbUpdates} new measurements may not be in database view yet`}>
                                <Button
                                    variant="contained"
                                    startIcon={<StorageIcon />}
                                    onClick={refreshDatabaseData}
                                    disabled={state.historicalLoading}
                                    size="small"
                                    color="warning"
                                    sx={{
                                        position: 'relative',
                                        '&::after': {
                                            content: '""',
                                            position: 'absolute',
                                            top: -2,
                                            right: -2,
                                            width: 8,
                                            height: 8,
                                            borderRadius: '50%',
                                            backgroundColor: 'error.main',
                                            animation: 'pulse 2s infinite'
                                        }
                                    }}
                                >
                                    Sync DB ({state.pendingDbUpdates})
                                </Button>
                            </Tooltip>
                        )}
                    </Stack>
                </Box>
            </Box>

            {/* Error Display */}
            {state.error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {state.error}
                </Alert>
            )}

            {wsError && (
                <Alert severity="warning" sx={{ mb: 3 }}>
                    WebSocket: {wsError}
                </Alert>
            )}

            {/* Loading */}
            {state.loading && <LinearProgress sx={{ mb: 3 }} />}

            {/* Date Range Controls */}
            {renderDateRangeControls()}

            {/* Tabs */}
            <Paper sx={{ mb: 3, background: isDark ? '#1e293b' : '#ffffff' }}>
                <Tabs
                    value={state.currentTab}
                    onChange={(e, newValue) => updateState({ currentTab: newValue })}
                    sx={{ borderBottom: 1, borderColor: 'divider' }}
                >
                    <Tab
                        icon={<StorageIcon />}
                        label="Overview"
                        iconPosition="start"
                        sx={{ fontWeight: 600 }}
                    />
                    <Tab
                        icon={<TableIcon />}
                        label={`Data Table (${tableData.length.toLocaleString()})`}
                        iconPosition="start"
                        sx={{ fontWeight: 600 }}
                        disabled={!state.selectedTagId}
                    />
                    <Tab
                        icon={<ChartIcon />}
                        label={`Period Chart (${chartData.length.toLocaleString()} points)`}
                        iconPosition="start"
                        sx={{ fontWeight: 600 }}
                        disabled={!state.selectedTagId}
                    />
                </Tabs>
            </Paper>

            {/* Content */}
            {state.loading && state.tags.length === 0 ? (
                <Paper sx={{ p: 6, textAlign: 'center', background: isDark ? '#1e293b' : '#ffffff' }}>
                    <LinearProgress sx={{ mb: 2 }} />
                    <Typography>Loading project data...</Typography>
                </Paper>
            ) : state.tags.length === 0 ? (
                <Paper sx={{ p: 6, textAlign: 'center', background: isDark ? '#1e293b' : '#ffffff' }}>
                    <AnalyticsIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="h6" gutterBottom>No Tags Available</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        No tags found for this project. Configure tags first to see measurement data.
                    </Typography>
                    <Button variant="contained" onClick={fetchProjectData}>
                        Retry
                    </Button>
                </Paper>
            ) : (
                <>
                    {state.currentTab === 0 && renderOverview()}
                    {state.currentTab === 1 && renderTable()}
                    {state.currentTab === 2 && renderChart()}
                </>
            )}
        </Box>
    );
}