// src/pages/MeasurementsPage.js - Clean Navigation-Friendly Dashboard
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    Grid, Paper, Box, Typography, IconButton, Tooltip, Chip, Card, CardContent,
    FormControl, InputLabel, Select, MenuItem, Button, Alert, Snackbar,
    Stack, Switch, FormControlLabel
} from '@mui/material';
import {
    Refresh as RefreshIcon,
    GetApp as DownloadIcon,
    TrendingUp as TrendingUpIcon,
    ShowChart as ShowChartIcon,
    Circle as CircleIcon,
    Alarm as AlarmIcon,
    Close as CloseIcon,
    Wifi as WifiIcon,
    Dashboard as DashboardIcon,
    Fullscreen as FullscreenIcon,
    FullscreenExit as FullscreenExitIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import axios from '../api/axios';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
    Legend,
    ReferenceLine
} from 'recharts';
import { useRealTimeData } from '../hooks/useWebSocket';

export default function MeasurementsPage() {
    const { projectId, tagId } = useParams();
    const navigate = useNavigate();
    const { isDark } = useTheme();
    const isMountedRef = useRef(true);

    // WebSocket integration
    const { measurements, isConnected, getTagValue, alarmEvents = [] } = useRealTimeData(projectId);

    // Core State
    const [measurementData, setMeasurementData] = useState([]);
    const [tags, setTags] = useState([]);
    const [selectedTag, setSelectedTag] = useState(tagId || '');
    const [timeRange, setTimeRange] = useState('1h');
    const [chartType, setChartType] = useState('line');
    const [loading, setLoading] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, msg: '', severity: 'info' });
    const [stats, setStats] = useState(null);

    // UI State
    const [fullscreen, setFullscreen] = useState(false);
    const [liveMode, setLiveMode] = useState(true);
    const [realTimeDataPoints, setRealTimeDataPoints] = useState(0);
    const [activeAlarms, setActiveAlarms] = useState([]);
    const [showAlarms, setShowAlarms] = useState(true);
    const [tagsLoading, setTagsLoading] = useState(false);

    // Chart configurations
    const timeRanges = [
        { value: '5m', label: '5 Min', hours: 0.083 },
        { value: '15m', label: '15 Min', hours: 0.25 },
        { value: '1h', label: '1 Hour', hours: 1 },
        { value: '6h', label: '6 Hours', hours: 6 },
        { value: '24h', label: '24 Hours', hours: 24 }
    ];

    const chartTypes = [
        { value: 'line', label: 'Line', icon: ShowChartIcon },
        { value: 'area', label: 'Area', icon: TrendingUpIcon }
    ];

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            isMountedRef.current = false;
            console.log('📊 MeasurementsPage unmounting - cleaning up');
        };
    }, []);

    // Generate mock data based on specific project tag properties
    const generateMockDataForProjectTag = useCallback((tagInfo) => {
        const now = new Date();
        const data = [];
        const range = timeRanges.find(tr => tr.value === timeRange);
        const points = Math.min(50, range.hours * 30);

        // Generate realistic data based on tag type and name
        let baseValue = 50;
        let variation = 20;
        let unit = tagInfo.engineering_unit || 'units';

        // Customize based on tag name and type
        if (tagInfo.tag_name.toLowerCase().includes('temp')) {
            baseValue = 25; // 25°C base temperature
            variation = 15;
            unit = tagInfo.engineering_unit || '°C';
        } else if (tagInfo.tag_name.toLowerCase().includes('press')) {
            baseValue = 101.3; // 1 atm base pressure
            variation = 10;
            unit = tagInfo.engineering_unit || 'bar';
        } else if (tagInfo.tag_name.toLowerCase().includes('level')) {
            baseValue = 75; // 75% base level
            variation = 25;
            unit = tagInfo.engineering_unit || '%';
        } else if (tagInfo.tag_name.toLowerCase().includes('flow')) {
            baseValue = 150; // 150 L/min base flow
            variation = 50;
            unit = tagInfo.engineering_unit || 'L/min';
        } else if (tagInfo.tag_name.toLowerCase().includes('rpm') || tagInfo.tag_name.toLowerCase().includes('speed')) {
            baseValue = 1450; // 1450 RPM base speed
            variation = 100;
            unit = tagInfo.engineering_unit || 'RPM';
        }

        for (let i = points; i >= 0; i--) {
            const timestamp = new Date(now.getTime() - (i * 2 * 60 * 1000));

            let value;
            if (tagInfo.tag_type === 'digital') {
                // Digital tags: random on/off
                value = Math.random() > 0.3 ? 1 : 0;
            } else {
                // Analog tags: realistic patterns
                const timePattern = Math.sin(i * 0.05) * variation * 0.5;
                const noise = (Math.random() - 0.5) * variation * 0.3;
                value = baseValue + timePattern + noise;

                // Ensure reasonable bounds
                if (tagInfo.tag_name.toLowerCase().includes('level')) {
                    value = Math.max(0, Math.min(100, value)); // 0-100% for levels
                } else if (value < 0) {
                    value = Math.abs(value);
                }
            }

            data.push({
                timestamp: timestamp.getTime(),
                time: timestamp.toLocaleTimeString(),
                value: parseFloat(value.toFixed(2)),
                quality: 'good',
                rawTimestamp: timestamp.toISOString(),
                source: 'mock',
                tagId: tagInfo.tag_id.toString(),
                projectId: projectId,
                tagName: tagInfo.tag_name,
                unit: unit
            });
        }

        console.log(`📊 Generated ${data.length} mock data points for project tag: ${tagInfo.tag_name} (${unit})`);
        return data;
    }, [timeRange, projectId]);

    const calculateStats = useCallback((data) => {
        if (!isMountedRef.current || data.length === 0) {
            return;
        }

        const values = data.map(d => d.value).filter(v => !isNaN(v));
        if (values.length === 0) {
            setStats(null);
            return;
        }

        const min = Math.min(...values);
        const max = Math.max(...values);
        const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
        const latest = values[values.length - 1];

        setStats({
            min: min.toFixed(2),
            max: max.toFixed(2),
            avg: avg.toFixed(2),
            latest: latest.toFixed(2),
            count: values.length
        });
    }, []);

    const fetchProjectTags = useCallback(async () => {
        if (!isMountedRef.current) return;

        setTagsLoading(true);

        try {
            console.log('📊 Fetching tags for project:', projectId);

            const response = await axios.get(`/tags/project/${projectId}`);

            if (!isMountedRef.current) return;

            console.log('📊 Raw API response:', response.data);

            let tags = response.data;

            // Ensure we have an array of tags
            if (!Array.isArray(tags)) {
                console.log('📊 Response is not an array, checking for nested data');
                if (tags.tags && Array.isArray(tags.tags)) {
                    tags = tags.tags;
                } else if (tags.data && Array.isArray(tags.data)) {
                    tags = tags.data;
                } else {
                    console.log('📊 Cannot find tags array in response');
                    tags = [];
                }
            }

            console.log('📊 Processed tags array:', tags);
            console.log('📊 Tags count:', tags.length);

            // Update tags state
            setTags(tags);

            // Auto-select first tag if none selected
            if (tags.length > 0) {
                const firstTag = tags[0];
                console.log('📊 First tag found:', firstTag);

                if (!selectedTag) {
                    const firstTagId = firstTag.tag_id.toString();
                    console.log('📊 Auto-selecting first tag ID:', firstTagId);
                    setSelectedTag(firstTagId);

                    setSnackbar({
                        open: true,
                        msg: `✅ Loaded ${tags.length} tags. Selected: ${firstTag.tag_name}`,
                        severity: 'success'
                    });
                } else {
                    // Check if current selection is valid
                    const currentTagExists = tags.find(tag => tag.tag_id.toString() === selectedTag);
                    if (!currentTagExists) {
                        const firstTagId = firstTag.tag_id.toString();
                        console.log('📊 Current selection invalid, switching to:', firstTagId);
                        setSelectedTag(firstTagId);

                        setSnackbar({
                            open: true,
                            msg: `🔄 Switched to available tag: ${firstTag.tag_name}`,
                            severity: 'info'
                        });
                    } else {
                        console.log('📊 Current selection is valid:', currentTagExists.tag_name);
                        setSnackbar({
                            open: true,
                            msg: `✅ Loaded ${tags.length} tags. Current: ${currentTagExists.tag_name}`,
                            severity: 'success'
                        });
                    }
                }
            } else {
                console.log('📊 No tags found for project');
                setSelectedTag('');
                setSnackbar({
                    open: true,
                    msg: `⚠️ No tags found for project ${projectId}. Please create tags first.`,
                    severity: 'warning'
                });
            }

        } catch (error) {
            if (!isMountedRef.current) return;

            console.error('❌ Failed to fetch project tags:', error);
            console.error('❌ Error response:', error.response?.data);
            console.error('❌ Error status:', error.response?.status);

            setSnackbar({
                open: true,
                msg: `❌ Failed to load tags: ${error.response?.status || 'Network Error'}`,
                severity: 'error'
            });

            setTags([]);
            setSelectedTag('');
        } finally {
            if (isMountedRef.current) {
                setTagsLoading(false);
            }
        }
    }, [projectId, selectedTag]);

    const fetchMeasurements = useCallback(async () => {
        if (!selectedTag || !isMountedRef.current) return;

        // Ensure the selected tag belongs to this project
        const tagBelongsToProject = tags.find(tag => tag.tag_id.toString() === selectedTag);
        if (!tagBelongsToProject) {
            console.log('📊 Selected tag does not belong to this project');
            return;
        }

        setLoading(true);
        console.log('📊 Fetching measurements for project tag:', {
            tagId: selectedTag,
            tagName: tagBelongsToProject.tag_name,
            projectId: projectId,
            timeRange: timeRange
        });

        try {
            const range = timeRanges.find(tr => tr.value === timeRange);
            const startTime = Date.now() - (range.hours * 60 * 60 * 1000);
            const endTime = Date.now();

            // Use the project measurements endpoint that matches your backend
            const response = await axios.get(`/measurements/project/${projectId}/timeseries`, {
                params: {
                    tagIds: selectedTag,
                    startTime: startTime,
                    endTime: endTime,
                    maxPoints: 200
                }
            });

            if (!isMountedRef.current) return;

            console.log('📊 Measurements API response:', response.data);

            // Handle your backend's response structure
            let formattedData = [];

            if (response.data.time_series && Array.isArray(response.data.time_series)) {
                const tagData = response.data.time_series.find(ts => ts.tag_id.toString() === selectedTag);

                if (tagData && tagData.data_points && tagData.data_points.length > 0) {
                    formattedData = tagData.data_points.map(point => ({
                        timestamp: new Date(point.timestamp).getTime(),
                        time: new Date(point.timestamp).toLocaleTimeString(),
                        value: parseFloat(point.value) || 0,
                        quality: point.quality || 'good',
                        rawTimestamp: point.timestamp,
                        source: 'historical',
                        tagId: selectedTag,
                        projectId: projectId
                    }));

                    console.log(`📊 Found ${formattedData.length} historical measurements for ${tagBelongsToProject.tag_name}`);
                }
            } else if (Array.isArray(response.data)) {
                // Direct array response
                formattedData = response.data.map(point => ({
                    timestamp: new Date(point.timestamp).getTime(),
                    time: new Date(point.timestamp).toLocaleTimeString(),
                    value: parseFloat(point.value) || 0,
                    quality: point.quality || 'good',
                    rawTimestamp: point.timestamp,
                    source: 'historical',
                    tagId: selectedTag,
                    projectId: projectId
                }));
            }

            if (formattedData.length > 0) {
                setMeasurementData(formattedData);
                calculateStats(formattedData);
                setSnackbar({
                    open: true,
                    msg: `📊 Loaded ${formattedData.length} measurements for ${tagBelongsToProject.tag_name}`,
                    severity: 'success'
                });
            } else {
                console.log('📊 No real measurements found, using demo data for tag:', tagBelongsToProject.tag_name);
                // Create demo data based on the actual project tag
                const mockData = generateMockDataForProjectTag(tagBelongsToProject);
                setMeasurementData(mockData);
                calculateStats(mockData);

                setSnackbar({
                    open: true,
                    msg: `📊 No historical data for ${tagBelongsToProject.tag_name}. Showing demo data.`,
                    severity: 'info'
                });
            }

        } catch (error) {
            if (!isMountedRef.current) return;

            console.error('❌ Failed to fetch measurements:', error);
            console.error('❌ Error details:', {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data
            });

            setSnackbar({
                open: true,
                msg: `❌ Failed to load data for ${tagBelongsToProject.tag_name}. Using demo data.`,
                severity: 'warning'
            });

            // Fallback to mock data for the specific project tag
            const mockData = generateMockDataForProjectTag(tagBelongsToProject);
            setMeasurementData(mockData);
            calculateStats(mockData);
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
        }
    }, [selectedTag, timeRange, projectId, tags, calculateStats, generateMockDataForProjectTag]);
}

setLoading(true);
console.log('📊 Fetching measurements for project tag:', selectedTag, 'from project:', projectId);

try {
    const range = timeRanges.find(tr => tr.value === timeRange);
    const startTime = Date.now() - (range.hours * 60 * 60 * 1000);
    const endTime = Date.now();

    // Fetch measurements specifically for this project's tag
    const response = await axios.get(`/measurements/project/${projectId}/timeseries`, {
        params: {
            tagIds: selectedTag,
            startTime: startTime,
            endTime: endTime,
            maxPoints: 200
        }
    });

    if (!isMountedRef.current) return;

    console.log('📊 Measurements API response:', response.data);

    const tagData = response.data.time_series?.find(ts => ts.tag_id.toString() === selectedTag);

    if (tagData && tagData.data_points && tagData.data_points.length > 0) {
        const formattedData = tagData.data_points.map(point => ({
            timestamp: new Date(point.timestamp).getTime(),
            time: new Date(point.timestamp).toLocaleTimeString(),
            value: parseFloat(point.value) || 0,
            quality: point.quality || 'good',
            rawTimestamp: point.timestamp,
            source: 'historical',
            tagId: selectedTag,
            projectId: projectId
        }));

        console.log(`📊 Found ${formattedData.length} measurements for project tag ${tagBelongsToProject.tag_name}`);
        setMeasurementData(formattedData);
        calculateStats(formattedData);
    } else {
        console.log('📊 No real measurements found for project tag, using mock data for demonstration');
        // Create mock data based on the actual project tag
        const mockData = generateMockDataForProjectTag(tagBelongsToProject);
        setMeasurementData(mockData);
        calculateStats(mockData);

        setSnackbar({
            open: true,
            msg: `📊 No historical data found for ${tagBelongsToProject.tag_name}. Showing mock data.`,
            severity: 'info'
        });
    }

} catch (error) {
    if (!isMountedRef.current) return;

    console.error('❌ Failed to fetch measurements for project tag:', error);
    setSnackbar({
        open: true,
        msg: `❌ Failed to load data for project tag. Using mock data.`,
        severity: 'warning'
    });

    // Fallback to mock data for the specific project tag
    const tagInfo = tags.find(tag => tag.tag_id.toString() === selectedTag);
    if (tagInfo) {
        const mockData = generateMockDataForProjectTag(tagInfo);
        setMeasurementData(mockData);
        calculateStats(mockData);
    }
} finally {
    if (isMountedRef.current) {
        setLoading(false);
    }
}
}, [selectedTag, timeRange, projectId, tags, calculateStats, generateMockDataForProjectTag]);

// ==================== SIMPLIFIED REAL-TIME INTEGRATION ====================

// Real-time data update - only for project tags
useEffect(() => {
    if (!selectedTag || !measurements || !liveMode || !isMountedRef.current) return;

    const selectedTagId = parseInt(selectedTag);

    // Verify this tag belongs to the current project
    const projectTag = tags.find(tag => tag.tag_id === selectedTagId);
    if (!projectTag) {
        console.log('📊 Ignoring real-time data for tag not in current project:', selectedTagId);
        return;
    }

    const tagMeasurement = measurements[selectedTagId];
    if (tagMeasurement && tagMeasurement.value !== undefined) {
        const newDataPoint = {
            timestamp: new Date(tagMeasurement.timestamp).getTime(),
            time: new Date(tagMeasurement.timestamp).toLocaleTimeString(),
            value: parseFloat(tagMeasurement.value) || 0,
            quality: tagMeasurement.quality || 'good',
            rawTimestamp: tagMeasurement.timestamp,
            source: 'realtime',
            tagId: selectedTag,
            projectId: projectId,
            tagName: projectTag.tag_name
        };

        console.log('📊 Real-time update for project tag:', projectTag.tag_name, '=', newDataPoint.value);

        setMeasurementData(prev => {
            if (!isMountedRef.current) return prev;

            // Simple duplicate check
            const isDuplicate = prev.some(point =>
                Math.abs(point.timestamp - newDataPoint.timestamp) < 5000
            );

            if (isDuplicate) return prev;

            const updated = [...prev, newDataPoint]
                .sort((a, b) => a.timestamp - b.timestamp)
                .slice(-200); // Keep only last 200 points

            calculateStats(updated);
            setRealTimeDataPoints(prev => prev + 1);

            // Show notification for project tag updates
            setSnackbar({
                open: true,
                msg: `📊 ${projectTag.tag_name}: ${newDataPoint.value.toFixed(2)} ${projectTag.engineering_unit || ''}`,
                severity: 'success'
            });

            return updated;
        });
    }
}, [measurements, selectedTag, liveMode, calculateStats, tags, projectId]);

// Basic alarms
useEffect(() => {
    if (alarmEvents && alarmEvents.length > 0 && isMountedRef.current) {
        const recentAlarms = alarmEvents
            .filter(alarm => !alarm.acknowledged)
            .slice(0, 2);
        setActiveAlarms(recentAlarms);
    }
}, [alarmEvents]);

// Initial data load - fetch tags first, then measurements
useEffect(() => {
    if (projectId && isMountedRef.current) {
        console.log('📊 Component mounted, loading project tags for project:', projectId);
        fetchProjectTags();
    }
}, [projectId, fetchProjectTags]);

// Load measurements when tag selection changes
useEffect(() => {
    if (selectedTag && tags.length > 0 && isMountedRef.current) {
        console.log('📊 Tag selected, loading measurements for:', selectedTag);
        fetchMeasurements();
    }
}, [selectedTag, timeRange, tags.length, fetchMeasurements]);

// Project-specific simulation for testing (only if no real data)
useEffect(() => {
    if (!liveMode || !selectedTag || isConnected || !isMountedRef.current) return;

    // Verify this tag belongs to the current project
    const projectTag = tags.find(tag => tag.tag_id.toString() === selectedTag);
    if (!projectTag) return;

    console.log('📊 Starting simulation for project tag:', projectTag.tag_name);

    const interval = setInterval(() => {
        if (!isMountedRef.current) {
            clearInterval(interval);
            return;
        }

        const now = new Date();
        let value;

        // Generate realistic values based on tag properties
        if (projectTag.tag_type === 'digital') {
            value = Math.random() > 0.3 ? 1 : 0;
        } else if (projectTag.tag_name.toLowerCase().includes('temp')) {
            value = 25 + Math.sin(Date.now() / 30000) * 10 + (Math.random() - 0.5) * 5;
        } else if (projectTag.tag_name.toLowerCase().includes('press')) {
            value = 101.3 + Math.sin(Date.now() / 20000) * 5 + (Math.random() - 0.5) * 2;
        } else if (projectTag.tag_name.toLowerCase().includes('level')) {
            value = 75 + Math.sin(Date.now() / 40000) * 20 + (Math.random() - 0.5) * 5;
            value = Math.max(0, Math.min(100, value));
        } else {
            value = 50 + Math.sin(Date.now() / 25000) * 30 + (Math.random() - 0.5) * 10;
        }

        const newDataPoint = {
            timestamp: now.getTime(),
            time: now.toLocaleTimeString(),
            value: parseFloat(value.toFixed(2)),
            quality: 'good',
            rawTimestamp: now.toISOString(),
            source: 'simulated',
            tagId: selectedTag,
            projectId: projectId,
            tagName: projectTag.tag_name
        };

        setMeasurementData(prev => {
            if (!isMountedRef.current) return prev;

            const updated = [...prev, newDataPoint]
                .sort((a, b) => a.timestamp - b.timestamp)
                .slice(-200);

            calculateStats(updated);
            setRealTimeDataPoints(prev => prev + 1);
            return updated;
        });
    }, 5000); // Every 5 seconds

    return () => {
        clearInterval(interval);
        console.log('📊 Simulation stopped for project tag:', projectTag.tag_name);
    };
}, [liveMode, selectedTag, isConnected, calculateStats, tags, projectId]);

// ==================== HELPER FUNCTIONS ====================

const selectedTagInfo = tags.find(tag => tag.tag_id.toString() === selectedTag);
const currentValue = getTagValue(parseInt(selectedTag));

const getLiveDataStatus = () => {
    if (!selectedTag) return { status: 'no_tag', message: 'No tag selected', color: 'default' };

    const tagValue = getTagValue(parseInt(selectedTag));
    if (tagValue === undefined) {
        return { status: 'no_data', message: 'No live data', color: 'error' };
    }

    return { status: 'fresh', message: 'Live', color: 'success' };
};

// ==================== EVENT HANDLERS ====================

const handleTagChange = (event) => {
    const newTagId = event.target.value;
    setSelectedTag(newTagId);
    setRealTimeDataPoints(0);
    navigate(`/project/${projectId}/measurements/${newTagId}`, { replace: true });
};

const exportData = () => {
    if (measurementData.length === 0) {
        setSnackbar({ open: true, msg: 'No data to export', severity: 'warning' });
        return;
    }

    const csvContent = [
        ['Timestamp', 'Value', 'Quality', 'Source'],
        ...measurementData.map(row => [
            row.rawTimestamp,
            row.value,
            row.quality,
            row.source || 'unknown'
        ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `measurements_${selectedTag}_${timeRange}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    setSnackbar({ open: true, msg: 'Data exported successfully', severity: 'success' });
};

// ==================== CUSTOM COMPONENTS ====================

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <Paper sx={{
                p: 1.5,
                background: isDark ? '#1e293b' : '#ffffff',
                border: '1px solid #e2e8f0',
                boxShadow: 3,
                borderRadius: 2
            }}>
                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                    {new Date(data.timestamp).toLocaleString()}
                </Typography>
                <Typography variant="body2" color="primary" sx={{ fontSize: '0.8rem' }}>
                    Value: {data.value.toFixed(2)}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                    {data.source} • {data.quality}
                </Typography>
            </Paper>
        );
    }
    return null;
};

return (
    <Box sx={{
        p: 2,
        background: isDark
            ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
            : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
        minHeight: '100vh'
    }}>
        {/* Simplified Header */}
        <Paper sx={{
            p: 2,
            mb: 2,
            background: isDark
                ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
                : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            border: isDark ? '1px solid #475569' : '1px solid #e2e8f0'
        }}>
            <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={4}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <DashboardIcon color="primary" />
                        <Box>
                            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1 }}>
                                Measurements Dashboard
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Chip
                                    icon={<CircleIcon sx={{ fontSize: 10 }} />}
                                    label={getLiveDataStatus().message}
                                    color={getLiveDataStatus().color}
                                    size="small"
                                />
                                <Chip
                                    icon={<WifiIcon sx={{ fontSize: 10 }} />}
                                    label={isConnected ? 'Connected' : 'Offline'}
                                    color={isConnected ? 'success' : 'error'}
                                    size="small"
                                />
                                {liveMode && (
                                    <Chip
                                        label="🔴 LIVE"
                                        color="error"
                                        size="small"
                                        sx={{ fontWeight: 700 }}
                                    />
                                )}
                            </Box>
                        </Box>
                    </Box>
                </Grid>

                <Grid item xs={12} md={5}>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={4}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Tag</InputLabel>
                                <Select
                                    value={selectedTag}
                                    onChange={handleTagChange}
                                    label="Tag"
                                    disabled={tagsLoading || tags.length === 0}
                                >
                                    {tagsLoading ? (
                                        <MenuItem disabled>
                                            <Typography variant="body2" color="text.secondary">
                                                Loading tags...
                                            </Typography>
                                        </MenuItem>
                                    ) : tags.length === 0 ? (
                                        <MenuItem disabled>
                                            <Typography variant="body2" color="text.secondary">
                                                No tags found
                                            </Typography>
                                        </MenuItem>
                                    ) : (
                                        tags.map(tag => {
                                            console.log('📊 Rendering dropdown item for tag:', tag);
                                            return (
                                                <MenuItem key={tag.tag_id} value={tag.tag_id.toString()}>
                                                    <Box>
                                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                            {tag.tag_name}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            ID: {tag.tag_id} • Device: {tag.device_name || 'N/A'}
                                                        </Typography>
                                                    </Box>
                                                </MenuItem>
                                            );
                                        })
                                    )}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={6} sm={4}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Time Range</InputLabel>
                                <Select
                                    value={timeRange}
                                    onChange={e => setTimeRange(e.target.value)}
                                    label="Time Range"
                                >
                                    {timeRanges.map(range => (
                                        <MenuItem key={range.value} value={range.value}>
                                            {range.label}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={6} sm={4}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Chart</InputLabel>
                                <Select
                                    value={chartType}
                                    onChange={e => setChartType(e.target.value)}
                                    label="Chart"
                                >
                                    {chartTypes.map(type => (
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
                    </Grid>
                </Grid>

                <Grid item xs={12} md={3}>
                    <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center" flexWrap="wrap">
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={liveMode}
                                    onChange={e => setLiveMode(e.target.checked)}
                                    size="small"
                                    color="error"
                                />
                            }
                            label="Live"
                        />

                        <Tooltip title="Refresh">
                            <IconButton
                                size="small"
                                onClick={fetchMeasurements}
                                disabled={loading}
                                color="primary"
                            >
                                <RefreshIcon />
                            </IconButton>
                        </Tooltip>

                        <Tooltip title="Export CSV">
                            <IconButton
                                size="small"
                                onClick={exportData}
                                color="primary"
                            >
                                <DownloadIcon />
                            </IconButton>
                        </Tooltip>

                        <Tooltip title="Reload Project Tags">
                            <IconButton
                                size="small"
                                onClick={() => {
                                    console.log('🔄 Manual tags reload requested');
                                    fetchProjectTags();
                                }}
                                disabled={tagsLoading}
                                color="primary"
                            >
                                <RefreshIcon />
                            </IconButton>
                        </Tooltip>

                        <Tooltip title="Test API Endpoints">
                            <IconButton
                                size="small"
                                onClick={async () => {
                                    console.log('🔧 Testing API endpoints for project:', projectId);

                                    const endpoints = [
                                        `/tags/project/${projectId}`,
                                        `/tags/test/project/${projectId}`,
                                        `/tags/health`,
                                        `/tags/info`,
                                        `/devices/project/${projectId}`,
                                        `/measurements/project/${projectId}/current`,
                                        `/measurements/health`
                                    ];

                                    for (const endpoint of endpoints) {
                                        try {
                                            console.log(`🔧 Testing: ${endpoint}`);
                                            const response = await axios.get(endpoint);
                                            console.log(`✅ ${endpoint}:`, response.data);

                                            if (endpoint.includes('/tags/project/') && Array.isArray(response.data)) {
                                                setSnackbar({
                                                    open: true,
                                                    msg: `✅ Found ${response.data.length} tags at ${endpoint}`,
                                                    severity: 'success'
                                                });
                                                break; // Found working tags endpoint
                                            }
                                        } catch (error) {
                                            console.log(`❌ ${endpoint}:`, error.response?.status, error.response?.data || error.message);
                                        }
                                    }
                                }}
                                color="secondary"
                            >
                                🔧
                            </IconButton>
                        </Tooltip>

                        <Tooltip title={fullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
                            <IconButton
                                size="small"
                                onClick={() => setFullscreen(!fullscreen)}
                                color="primary"
                            >
                                {fullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
                            </IconButton>
                        </Tooltip>
                    </Stack>
                </Grid>
            </Grid>
        </Paper>

        {/* Simple Alarms */}
        {activeAlarms.length > 0 && showAlarms && (
            <Paper sx={{
                p: 2,
                mb: 2,
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                color: 'white',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <AlarmIcon />
                    <Typography variant="body1" sx={{ fontWeight: 700 }}>
                        {activeAlarms.length} Active Alarm{activeAlarms.length > 1 ? 's' : ''}
                    </Typography>
                </Box>
                <IconButton
                    size="small"
                    onClick={() => setShowAlarms(false)}
                    sx={{ color: 'white' }}
                >
                    <CloseIcon />
                </IconButton>
            </Paper>
        )}

        {/* Statistics Cards */}
        {stats && (
            <Grid container spacing={2} sx={{ mb: 2 }}>
                {[
                    {
                        label: 'Current Value',
                        value: currentValue !== undefined ? currentValue.toFixed(2) : stats.latest,
                        unit: selectedTagInfo?.engineering_unit,
                        color: 'primary'
                    },
                    {
                        label: 'Average',
                        value: stats.avg,
                        unit: selectedTagInfo?.engineering_unit,
                        color: 'info'
                    },
                    {
                        label: 'Minimum',
                        value: stats.min,
                        unit: selectedTagInfo?.engineering_unit,
                        color: 'success'
                    },
                    {
                        label: 'Maximum',
                        value: stats.max,
                        unit: selectedTagInfo?.engineering_unit,
                        color: 'warning'
                    }
                ].map((stat, index) => (
                    <Grid item xs={6} md={3} key={stat.label}>
                        <Card sx={{
                            background: isDark
                                ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
                                : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                            border: isDark ? '1px solid #475569' : '1px solid #e2e8f0'
                        }}>
                            <CardContent sx={{ textAlign: 'center', py: 2 }}>
                                <Typography
                                    variant="h4"
                                    color={`${stat.color}.main`}
                                    sx={{ fontWeight: 800, lineHeight: 1 }}
                                >
                                    {stat.value}
                                    {stat.unit && (
                                        <Typography component="span" variant="body2" color="text.secondary">
                                            {' '}{stat.unit}
                                        </Typography>
                                    )}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                                    {stat.label}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        )}

        {/* Enhanced Status Info with Debug Information */}
        <Box sx={{ mb: 1 }}>
            <Chip
                label={`📊 Project: ${projectId}`}
                size="small"
                color="primary"
                variant="outlined"
            />
            <Chip
                label={`🏷️ ${tags.length} project tags`}
                size="small"
                color={tags.length > 0 ? 'success' : 'error'}
                sx={{ ml: 1 }}
            />
            <Chip
                label={`📈 ${measurementData.length} data points`}
                size="small"
                color={measurementData.length > 0 ? 'success' : 'default'}
                sx={{ ml: 1 }}
            />
            <Chip
                label={loading ? '⏳ Loading...' : '✅ Ready'}
                size="small"
                color={loading ? 'warning' : 'info'}
                sx={{ ml: 1 }}
            />
            {realTimeDataPoints > 0 && (
                <Chip
                    label={`📡 ${realTimeDataPoints} live updates`}
                    size="small"
                    color="success"
                    sx={{ ml: 1 }}
                />
            )}
            {selectedTagInfo && (
                <Chip
                    label={`🎯 ${selectedTagInfo.tag_name} (${selectedTagInfo.device_name})`}
                    size="small"
                    color="info"
                    sx={{ ml: 1 }}
                />
            )}
        </Box>

        {/* Enhanced Debug Information Panel */}
        {(
            <Paper sx={{
                p: 2,
                mb: 2,
                background: isDark ? 'rgba(30, 41, 59, 0.5)' : 'rgba(248, 250, 252, 0.8)',
                border: isDark ? '1px solid #475569' : '1px solid #e2e8f0',
                fontSize: '0.8rem'
            }}>
                <Typography variant="caption" sx={{ display: 'block', mb: 1, fontWeight: 600 }}>
                    🔍 Debug Information:
                </Typography>
                <Typography variant="caption" sx={{ display: 'block' }}>
                    <strong>Project ID:</strong> {projectId} | <strong>Tags Loading:</strong> {tagsLoading ? '⏳ Yes' : '✅ No'} | <strong>Tags Found:</strong> {tags.length}
                </Typography>
                <Typography variant="caption" sx={{ display: 'block' }}>
                    <strong>Selected Tag:</strong> {selectedTag || 'None'} | <strong>Selected Tag Name:</strong> {selectedTagInfo?.tag_name || 'N/A'}
                </Typography>
                <Typography variant="caption" sx={{ display: 'block' }}>
                    <strong>API Endpoint:</strong> /tags/project/{projectId} | <strong>Backend Status:</strong> {tags.length > 0 ? '✅ Connected' : tagsLoading ? '⏳ Loading' : '❌ No Data'}
                </Typography>
                {tags.length > 0 && (
                    <Typography variant="caption" sx={{ display: 'block' }}>
                        <strong>Available Tags:</strong> {tags.map(t => `${t.tag_name} (ID:${t.tag_id}, Device:${t.device_name || 'N/A'})`).join(', ')}
                    </Typography>
                )}
                <Typography variant="caption" sx={{ display: 'block' }}>
                    <strong>WebSocket:</strong> {isConnected ? '🟢 Connected' : '🔴 Disconnected'} | <strong>Live Mode:</strong> {liveMode ? '🔴 On' : '⚪ Off'} | <strong>Real-time Points:</strong> {realTimeDataPoints}
                </Typography>
                <Typography variant="caption" sx={{ display: 'block' }}>
                    <strong>Expected API:</strong> Your backend has /tags/project/:projectId endpoint. Should return: {`[{tag_id: 2, tag_name: "tagtest", device_id: 36, ...}]`}
                </Typography>
            </Paper>
        )}

        {/* Main Chart */}
        <Paper sx={{
            p: 3,
            background: isDark
                ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
                : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            border: isDark ? '1px solid #475569' : '1px solid #e2e8f0',
            height: fullscreen ? '70vh' : '600px'
        }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {selectedTagInfo?.tag_name || 'Chart'}
                    {liveMode && ' - 🔴 Live Mode'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {measurementData.length} data points
                </Typography>
            </Box>

            <Box sx={{ width: '100%', height: fullscreen ? '60vh' : '520px' }}>
                {tagsLoading ? (
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%'
                    }}>
                        <Typography>Loading project tags...</Typography>
                    </Box>
                ) : loading ? (
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%'
                    }}>
                        <Typography>Loading measurements for {selectedTagInfo?.tag_name || 'selected tag'}...</Typography>
                    </Box>
                ) : tags.length === 0 ? (
                    <Box sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%'
                    }}>
                        <ShowChartIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                        <Typography color="text.secondary" variant="h6">No Project Tags Available</Typography>
                        <Typography color="text.secondary" variant="body2" sx={{ mb: 3, textAlign: 'center', maxWidth: 400 }}>
                            Project {projectId} doesn't have any tags configured yet. Please add tags to the project first to start collecting measurements.
                        </Typography>
                        <Stack direction="row" spacing={2}>
                            <Button
                                variant="outlined"
                                onClick={() => fetchProjectTags()}
                                disabled={tagsLoading}
                                startIcon={<RefreshIcon />}
                            >
                                Reload Tags
                            </Button>
                            <Button
                                variant="contained"
                                onClick={() => navigate(`/project/${projectId}/tags`)}
                                sx={{
                                    background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                                    color: 'white'
                                }}
                            >
                                Configure Project Tags
                            </Button>
                        </Stack>
                    </Box>
                ) : !selectedTag ? (
                    <Box sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%'
                    }}>
                        <ShowChartIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                        <Typography color="text.secondary" variant="h6">No Tag Selected</Typography>
                        <Typography color="text.secondary" variant="body2" sx={{ mb: 3, textAlign: 'center' }}>
                            Found {tags.length} tags in project {projectId}. Please select a tag from the dropdown above.
                        </Typography>
                    </Box>
                ) : measurementData.length === 0 ? (
                    <Box sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%'
                    }}>
                        <ShowChartIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                        <Typography color="text.secondary" variant="h6">No Data Available</Typography>
                        <Typography color="text.secondary" variant="body2" sx={{ mb: 3, textAlign: 'center' }}>
                            No measurements found for: <strong>{selectedTagInfo?.tag_name}</strong> (ID: {selectedTag})
                        </Typography>
                        <Button
                            variant="outlined"
                            onClick={() => {
                                if (selectedTagInfo) {
                                    const mockData = generateMockDataForProjectTag(selectedTagInfo);
                                    setMeasurementData(mockData);
                                    calculateStats(mockData);
                                }
                            }}
                            sx={{ mt: 2 }}
                            disabled={!selectedTagInfo}
                        >
                            Generate Demo Data for {selectedTagInfo?.tag_name}
                        </Button>
                    </Box>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        {chartType === 'area' ? (
                            <AreaChart
                                data={measurementData}
                                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#475569' : '#e2e8f0'} />
                                <XAxis
                                    dataKey="time"
                                    stroke={isDark ? '#94a3b8' : '#64748b'}
                                    fontSize={12}
                                    interval="preserveStartEnd"
                                />
                                <YAxis
                                    stroke={isDark ? '#94a3b8' : '#64748b'}
                                    fontSize={12}
                                />
                                <RechartsTooltip content={<CustomTooltip />} />
                                <Legend />
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke={liveMode ? "#ef4444" : "#2563eb"}
                                    fill="url(#colorGradient)"
                                    strokeWidth={3}
                                    name={selectedTagInfo?.tag_name || 'Value'}
                                />
                                <defs>
                                    <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop
                                            offset="5%"
                                            stopColor={liveMode ? "#ef4444" : "#2563eb"}
                                            stopOpacity={0.8}
                                        />
                                        <stop
                                            offset="95%"
                                            stopColor={liveMode ? "#ef4444" : "#2563eb"}
                                            stopOpacity={0.1}
                                        />
                                    </linearGradient>
                                </defs>
                                {stats && (
                                    <>
                                        <ReferenceLine y={parseFloat(stats.avg)} stroke="#10b981" strokeDasharray="5 5" label="Avg" />
                                        <ReferenceLine y={parseFloat(stats.max)} stroke="#f59e0b" strokeDasharray="5 5" label="Max" />
                                        <ReferenceLine y={parseFloat(stats.min)} stroke="#ec4899" strokeDasharray="5 5" label="Min" />
                                    </>
                                )}
                            </AreaChart>
                        ) : (
                            <LineChart
                                data={measurementData}
                                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#475569' : '#e2e8f0'} />
                                <XAxis
                                    dataKey="time"
                                    stroke={isDark ? '#94a3b8' : '#64748b'}
                                    fontSize={12}
                                    interval="preserveStartEnd"
                                />
                                <YAxis
                                    stroke={isDark ? '#94a3b8' : '#64748b'}
                                    fontSize={12}
                                />
                                <RechartsTooltip content={<CustomTooltip />} />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="value"
                                    stroke={liveMode ? "#ef4444" : "#2563eb"}
                                    strokeWidth={3}
                                    dot={false}
                                    name={selectedTagInfo?.tag_name || 'Value'}
                                />
                                {stats && (
                                    <>
                                        <ReferenceLine y={parseFloat(stats.avg)} stroke="#10b981" strokeDasharray="5 5" label="Avg" />
                                        <ReferenceLine y={parseFloat(stats.max)} stroke="#f59e0b" strokeDasharray="5 5" label="Max" />
                                        <ReferenceLine y={parseFloat(stats.min)} stroke="#ec4899" strokeDasharray="5 5" label="Min" />
                                    </>
                                )}
                            </LineChart>
                        )}
                    </ResponsiveContainer>
                )}
            </Box>
        </Paper>

        {/* Simple Snackbar */}
        <Snackbar
            open={snackbar.open}
            autoHideDuration={3000}
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
            <Alert
                severity={snackbar.severity}
                sx={{
                    width: '100%',
                    borderRadius: 2,
                    fontWeight: 600
                }}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
            >
                {snackbar.msg}
            </Alert>
        </Snackbar>
    </Box>
);
}