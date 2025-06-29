// src/pages/LogsPage.js - Modernized with Real-Time Activity Feed
import React, { useEffect, useState } from 'react';
import {
    Grid, Paper, Box, Typography, IconButton, Tooltip, Chip, Card, CardContent,
    InputAdornment, Avatar, Stack, FormControl, InputLabel, Select, MenuItem,
    Button, List, ListItem, ListItemText, ListItemAvatar, Divider, TextField,
    Accordion, AccordionSummary, AccordionDetails, Badge
} from '@mui/material';
import {
    Description as DescriptionIcon,
    Search as SearchIcon,
    FilterList as FilterIcon,
    Circle as CircleIcon,
    Error as ErrorIcon,
    Warning as WarningIcon,
    Info as InfoIcon,
    CheckCircle as CheckCircleIcon,
    Schedule as ScheduleIcon,
    Refresh as RefreshIcon,
    Download as DownloadIcon,
    ExpandMore as ExpandMoreIcon,
    Person as PersonIcon,
    Settings as SettingsIcon,
    Security as SecurityIcon
} from '@mui/icons-material';
import { useParams, useLocation } from 'react-router-dom';
import axios from '../api/axios';
import { motion } from 'framer-motion';
import { useRealTimeData } from '../hooks/useWebSocket';

export default function LogsPage() {
    const { projectId } = useParams();
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const alarmId = searchParams.get('alarm');

    // WebSocket real-time data
    const { isConnected, realtimeLogs } = useRealTimeData(projectId);

    // State
    const [logs, setLogs] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [search, setSearch] = useState('');
    const [levelFilter, setLevelFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [timeRange, setTimeRange] = useState('24h');
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({});

    // Fetch logs
    const fetchLogs = () => {
        if (!projectId) return;
        setLoading(true);

        const endTime = new Date();
        const startTime = new Date();

        // Calculate start time based on range
        switch (timeRange) {
            case '1h':
                startTime.setHours(endTime.getHours() - 1);
                break;
            case '24h':
                startTime.setDate(endTime.getDate() - 1);
                break;
            case '7d':
                startTime.setDate(endTime.getDate() - 7);
                break;
            case '30d':
                startTime.setDate(endTime.getDate() - 30);
                break;
            default:
                startTime.setDate(endTime.getDate() - 1);
        }

        const params = {
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString()
        };

        if (alarmId) {
            params.alarm_id = alarmId;
        }

        axios.get(`/logs/project/${projectId}`, { params })
            .then(res => {
                setLogs(res.data);
                calculateStats(res.data);
                setLoading(false);
            })
            .catch(() => {
                setLoading(false);
                setLogs([]);
            });
    };

    // Calculate log statistics
    const calculateStats = (logData) => {
        const stats = {
            total: logData.length,
            error: logData.filter(l => l.level === 'error').length,
            warning: logData.filter(l => l.level === 'warning').length,
            info: logData.filter(l => l.level === 'info').length,
            success: logData.filter(l => l.level === 'success').length
        };
        setStats(stats);
    };

    useEffect(() => {
        fetchLogs();
    }, [projectId, timeRange, alarmId]);

    // Add real-time logs
    useEffect(() => {
        if (realtimeLogs && realtimeLogs.length > 0) {
            setLogs(prev => [...realtimeLogs, ...prev].slice(0, 1000)); // Keep last 1000 logs
        }
    }, [realtimeLogs]);

    // Filter logs
    useEffect(() => {
        let result = logs;

        if (search) {
            result = result.filter(log =>
                log.message?.toLowerCase().includes(search.toLowerCase()) ||
                log.category?.toLowerCase().includes(search.toLowerCase()) ||
                log.user?.toLowerCase().includes(search.toLowerCase())
            );
        }

        if (levelFilter !== 'all') {
            result = result.filter(log => log.level === levelFilter);
        }

        if (categoryFilter !== 'all') {
            result = result.filter(log => log.category === categoryFilter);
        }

        setFiltered(result);
    }, [logs, search, levelFilter, categoryFilter]);

    const getLevelIcon = (level) => {
        switch (level) {
            case 'error': return ErrorIcon;
            case 'warning': return WarningIcon;
            case 'info': return InfoIcon;
            case 'success': return CheckCircleIcon;
            default: return InfoIcon;
        }
    };

    const getLevelColor = (level) => {
        switch (level) {
            case 'error': return 'error';
            case 'warning': return 'warning';
            case 'info': return 'info';
            case 'success': return 'success';
            default: return 'default';
        }
    };

    const getCategoryIcon = (category) => {
        switch (category) {
            case 'user': return PersonIcon;
            case 'system': return SettingsIcon;
            case 'security': return SecurityIcon;
            case 'alarm': return WarningIcon;
            default: return DescriptionIcon;
        }
    };

    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffHours = diffMs / (1000 * 60 * 60);

        if (diffHours < 1) {
            const diffMinutes = Math.floor(diffMs / (1000 * 60));
            return `${diffMinutes}m ago`;
        } else if (diffHours < 24) {
            return `${Math.floor(diffHours)}h ago`;
        } else {
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        }
    };

    const exportLogs = () => {
        const csvData = filtered.map(log => [
            log.timestamp,
            log.level,
            log.category,
            log.user || '',
            log.message || ''
        ].map(field => `"${field}"`).join(',')).join('\n');

        const blob = new Blob([`timestamp,level,category,user,message\n${csvData}`], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `logs_${projectId}_${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <Box sx={{ p: 4, background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', minHeight: '100vh' }}>
            {/* Header */}
            <Box sx={{ mb: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Avatar
                        sx={{
                            width: 48,
                            height: 48,
                            background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)'
                        }}
                    >
                        <DescriptionIcon />
                    </Avatar>
                    <Box>
                        <Typography
                            variant="h3"
                            sx={{
                                fontWeight: 800,
                                background: 'linear-gradient(135deg, #1e293b 0%, #475569 100%)',
                                backgroundClip: 'text',
                                WebkitBackgroundClip: 'text',
                                color: 'transparent'
                            }}
                        >
                            System Logs
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            {alarmId ? 'Alarm activity logs' : 'Real-time system activity and events'}
                        </Typography>
                    </Box>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Chip
                            icon={<DescriptionIcon />}
                            label={`${filtered.length} Logs`}
                            color="primary"
                            sx={{ fontWeight: 600 }}
                        />
                        <Chip
                            icon={isConnected ? <CircleIcon sx={{ fontSize: 12 }} /> : <CircleIcon sx={{ fontSize: 12 }} />}
                            label={isConnected ? 'Live Feed' : 'Offline'}
                            color={isConnected ? 'success' : 'error'}
                            sx={{ fontWeight: 600 }}
                        />
                    </Stack>

                    <Stack direction="row" spacing={2} alignItems="center">
                        <TextField
                            placeholder="Search logs..."
                            size="small"
                            sx={{ width: 250 }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon />
                                    </InputAdornment>
                                ),
                            }}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />

                        <FormControl size="small" sx={{ minWidth: 120 }}>
                            <InputLabel>Level</InputLabel>
                            <Select
                                value={levelFilter}
                                onChange={e => setLevelFilter(e.target.value)}
                                label="Level"
                            >
                                <MenuItem value="all">All Levels</MenuItem>
                                <MenuItem value="error">Error</MenuItem>
                                <MenuItem value="warning">Warning</MenuItem>
                                <MenuItem value="info">Info</MenuItem>
                                <MenuItem value="success">Success</MenuItem>
                            </Select>
                        </FormControl>

                        <FormControl size="small" sx={{ minWidth: 120 }}>
                            <InputLabel>Time Range</InputLabel>
                            <Select
                                value={timeRange}
                                onChange={e => setTimeRange(e.target.value)}
                                label="Time Range"
                            >
                                <MenuItem value="1h">Last Hour</MenuItem>
                                <MenuItem value="24h">Last 24h</MenuItem>
                                <MenuItem value="7d">Last 7 days</MenuItem>
                                <MenuItem value="30d">Last 30 days</MenuItem>
                            </Select>
                        </FormControl>

                        <Button
                            variant="outlined"
                            startIcon={<RefreshIcon />}
                            onClick={fetchLogs}
                            disabled={loading}
                        >
                            Refresh
                        </Button>

                        <Button
                            variant="outlined"
                            startIcon={<DownloadIcon />}
                            onClick={exportLogs}
                            disabled={filtered.length === 0}
                        >
                            Export
                        </Button>
                    </Stack>
                </Box>
            </Box>

            {/* Statistics Cards */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={6} sm={3}>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <Card sx={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: 'white' }}>
                            <CardContent sx={{ p: 2 }}>
                                <Typography variant="caption" sx={{ opacity: 0.9 }}>
                                    Errors
                                </Typography>
                                <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1 }}>
                                    {stats.error || 0}
                                </Typography>
                            </CardContent>
                        </Card>
                    </motion.div>
                </Grid>

                <Grid item xs={6} sm={3}>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <Card sx={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: 'white' }}>
                            <CardContent sx={{ p: 2 }}>
                                <Typography variant="caption" sx={{ opacity: 0.9 }}>
                                    Warnings
                                </Typography>
                                <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1 }}>
                                    {stats.warning || 0}
                                </Typography>
                            </CardContent>
                        </Card>
                    </motion.div>
                </Grid>

                <Grid item xs={6} sm={3}>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <Card sx={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: 'white' }}>
                            <CardContent sx={{ p: 2 }}>
                                <Typography variant="caption" sx={{ opacity: 0.9 }}>
                                    Info
                                </Typography>
                                <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1 }}>
                                    {stats.info || 0}
                                </Typography>
                            </CardContent>
                        </Card>
                    </motion.div>
                </Grid>

                <Grid item xs={6} sm={3}>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                    >
                        <Card sx={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white' }}>
                            <CardContent sx={{ p: 2 }}>
                                <Typography variant="caption" sx={{ opacity: 0.9 }}>
                                    Success
                                </Typography>
                                <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1 }}>
                                    {stats.success || 0}
                                </Typography>
                            </CardContent>
                        </Card>
                    </motion.div>
                </Grid>
            </Grid>

            {/* Logs List */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
            >
                <Card>
                    <CardContent sx={{ p: 0 }}>
                        {filtered.length > 0 ? (
                            <List sx={{ py: 0 }}>
                                {filtered.map((log, index) => {
                                    const LevelIcon = getLevelIcon(log.level);
                                    const CategoryIcon = getCategoryIcon(log.category);

                                    return (
                                        <React.Fragment key={log.log_id || index}>
                                            <motion.div
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: index * 0.05 }}
                                            >
                                                <ListItem
                                                    sx={{
                                                        py: 2,
                                                        transition: 'background-color 0.2s ease',
                                                        '&:hover': {
                                                            backgroundColor: 'rgba(0, 0, 0, 0.02)'
                                                        }
                                                    }}
                                                >
                                                    <ListItemAvatar>
                                                        <Badge
                                                            overlap="circular"
                                                            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                                            badgeContent={
                                                                <Avatar sx={{
                                                                    width: 16,
                                                                    height: 16,
                                                                    bgcolor: `${getLevelColor(log.level)}.main`
                                                                }}>
                                                                    <LevelIcon sx={{ fontSize: 10 }} />
                                                                </Avatar>
                                                            }
                                                        >
                                                            <Avatar sx={{
                                                                bgcolor: 'primary.100',
                                                                color: 'primary.main'
                                                            }}>
                                                                <CategoryIcon fontSize="small" />
                                                            </Avatar>
                                                        </Badge>
                                                    </ListItemAvatar>
                                                    <ListItemText
                                                        primary={
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                                                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                                                    {log.message}
                                                                </Typography>
                                                                <Chip
                                                                    label={log.level}
                                                                    color={getLevelColor(log.level)}
                                                                    size="small"
                                                                    sx={{
                                                                        height: 20,
                                                                        fontSize: '0.7rem',
                                                                        fontWeight: 600,
                                                                        textTransform: 'uppercase'
                                                                    }}
                                                                />
                                                            </Box>
                                                        }
                                                        secondary={
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                                                                <Chip
                                                                    label={log.category || 'system'}
                                                                    variant="outlined"
                                                                    size="small"
                                                                    sx={{ height: 20, fontSize: '0.7rem' }}
                                                                />
                                                                {log.user && (
                                                                    <Typography variant="caption" color="text.secondary">
                                                                        by {log.user}
                                                                    </Typography>
                                                                )}
                                                                <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                                                                    <ScheduleIcon sx={{ fontSize: 12, mr: 0.5, verticalAlign: 'middle' }} />
                                                                    {formatTimestamp(log.timestamp)}
                                                                </Typography>
                                                            </Box>
                                                        }
                                                    />
                                                </ListItem>
                                            </motion.div>
                                            {index < filtered.length - 1 && <Divider />}
                                        </React.Fragment>
                                    );
                                })}
                            </List>
                        ) : (
                            <Box
                                sx={{
                                    py: 8,
                                    textAlign: 'center',
                                    background: '#f8fafc',
                                    border: '2px dashed #cbd5e1',
                                    borderRadius: 2,
                                    m: 3
                                }}
                            >
                                <DescriptionIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                                <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                                    {loading ? 'Loading logs...' : 'No logs found'}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {search || levelFilter !== 'all'
                                        ? 'Try adjusting your filters or search terms'
                                        : 'System activity will appear here as it happens'
                                    }
                                </Typography>
                            </Box>
                        )}
                    </CardContent>
                </Card>
            </motion.div>
        </Box>
    );
}