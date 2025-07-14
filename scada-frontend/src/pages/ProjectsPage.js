import React, { useEffect, useState } from 'react';
import {
    Container, Box, Typography, Grid, Card, CardContent, IconButton, Button, Dialog,
    DialogTitle, DialogContent, DialogActions, TextField, Tooltip, Snackbar, Alert,
    Chip, Avatar, Stack, Badge, LinearProgress
} from '@mui/material';
import {
    Edit as EditIcon,
    Delete as DeleteIcon,
    Add as AddIcon,
    ArrowForward as ArrowForwardIcon,
    Folder as FolderIcon,
    AccessTime as AccessTimeIcon,
    Devices as DevicesIcon,
    WifiOff as WifiOffIcon,
    Wifi as WifiIcon,
    Warning as WarningIcon,
    CheckCircle as CheckCircleIcon,
    Label as LabelIcon,
    Analytics as AnalyticsIcon
} from '@mui/icons-material';
import axios from '../api/axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useGlobalWebSocket } from '../hooks/useWebSocket';
import { motion } from 'framer-motion';

export default function EnhancedProjectsPage() {
    const { user } = useAuth();
    const navigate = useNavigate();

    // Enhanced WebSocket with project-specific data
    const {
        isConnected,
        error,
        lastMessage,
        connectionAttempts,
        forceReconnect
    } = useGlobalWebSocket();

    const [projects, setProjects] = useState([]);
    const [projectStats, setProjectStats] = useState({}); // Real-time project statistics
    const [addOpen, setAddOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [current, setCurrent] = useState(null);
    const [projectName, setProjectName] = useState('');
    const [snackbar, setSnackbar] = useState({ open: false, msg: '', severity: 'success' });
    const [loading, setLoading] = useState(true);

    // Fetch projects and their statistics
    const fetchProjects = async () => {
        try {
            setLoading(true);
            const res = await axios.get('/projects');
            setProjects(res.data);

            // Fetch stats for each project
            const statsPromises = res.data.map(async (project) => {
                try {
                    const [devicesRes, tagsRes, alarmsRes] = await Promise.all([
                        axios.get(`/devices/project/${project.id}`),
                        axios.get(`/tags/project/${project.id}`),
                        axios.get(`/alarms/project/${project.id}/summary`)
                    ]);

                    return {
                        projectId: project.id,
                        devices: devicesRes.data.length,
                        tags: tagsRes.data.length,
                        activeAlarms: alarmsRes.data.active_alarms || 0,
                        lastActivity: alarmsRes.data.last_measurement || null
                    };
                } catch (error) {
                    console.error(`Error fetching stats for project ${project.id}:`, error);
                    return {
                        projectId: project.id,
                        devices: 0,
                        tags: 0,
                        activeAlarms: 0,
                        lastActivity: null
                    };
                }
            });

            const stats = await Promise.all(statsPromises);
            const statsMap = stats.reduce((acc, stat) => {
                acc[stat.projectId] = stat;
                return acc;
            }, {});

            setProjectStats(statsMap);
        } catch (error) {
            console.error('Error fetching projects:', error);
            setSnackbar({ open: true, msg: 'Failed to load projects', severity: 'error' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProjects();
    }, []);

    // Enhanced WebSocket message handling for real-time updates
    useEffect(() => {
        if (!lastMessage) return;

        const { type, data, projectId } = lastMessage;

        switch (type) {
            case 'measurement':
                // Update last activity for the project
                if (projectId && projectStats[projectId]) {
                    setProjectStats(prev => ({
                        ...prev,
                        [projectId]: {
                            ...prev[projectId],
                            lastActivity: new Date().toISOString()
                        }
                    }));
                }
                break;

            case 'alarm_triggered':
                // Increment active alarms count
                if (projectId && projectStats[projectId]) {
                    setProjectStats(prev => ({
                        ...prev,
                        [projectId]: {
                            ...prev[projectId],
                            activeAlarms: prev[projectId].activeAlarms + 1
                        }
                    }));
                }
                break;

            case 'alarm_acknowledged':
            case 'alarm_cleared':
                // Decrement active alarms count
                if (projectId && projectStats[projectId]) {
                    setProjectStats(prev => ({
                        ...prev,
                        [projectId]: {
                            ...prev[projectId],
                            activeAlarms: Math.max(0, prev[projectId].activeAlarms - 1)
                        }
                    }));
                }
                break;

            case 'device_status':
                // Could update device online/offline counts here
                console.log('Device status update for project', projectId, data);
                break;

            default:
                break;
        }
    }, [lastMessage, projectStats]);

    const handleAdd = async () => {
        try {
            await axios.post('/projects', { project_name: projectName });
            setAddOpen(false);
            setProjectName('');
            setSnackbar({ open: true, msg: 'Project created successfully!', severity: 'success' });
            fetchProjects();
        } catch {
            setSnackbar({ open: true, msg: 'Failed to create project', severity: 'error' });
        }
    };

    const handleEdit = async () => {
        try {
            await axios.put(`/projects/${current.id}`, { project_name: projectName });
            setEditOpen(false);
            setProjectName('');
            setSnackbar({ open: true, msg: 'Project updated successfully!', severity: 'success' });
            fetchProjects();
        } catch {
            setSnackbar({ open: true, msg: 'Failed to update project', severity: 'error' });
        }
    };

    const handleDelete = async () => {
        try {
            await axios.delete(`/projects/${current.id}`);
            setDeleteOpen(false);
            setSnackbar({ open: true, msg: 'Project deleted successfully!', severity: 'success' });
            fetchProjects();
        } catch {
            setSnackbar({ open: true, msg: 'Failed to delete project', severity: 'error' });
        }
    };

    const handleOpenProject = (projectId) => {
        navigate(`/project/${projectId}/devices`);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatLastActivity = (lastActivity) => {
        if (!lastActivity) return 'No activity';

        const now = new Date();
        const then = new Date(lastActivity);
        const diffMs = now - then;
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
        return `${Math.floor(diffMins / 1440)}d ago`;
    };

    // Calculate overall statistics
    const totalDevices = Object.values(projectStats).reduce((sum, stats) => sum + stats.devices, 0);
    const totalTags = Object.values(projectStats).reduce((sum, stats) => sum + stats.tags, 0);
    const totalActiveAlarms = Object.values(projectStats).reduce((sum, stats) => sum + stats.activeAlarms, 0);

    return (
        <Box
            sx={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                py: 6
            }}
        >
            <Container maxWidth="xl">
                {/* Enhanced Header with Real-time Stats */}
                <Box sx={{ mb: 6 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <Avatar
                            sx={{
                                width: 48,
                                height: 48,
                                background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)'
                            }}
                        >
                            <FolderIcon />
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
                                SCADA Projects
                            </Typography>
                            <Typography variant="body1" color="text.secondary">
                                Manage your industrial automation projects with real-time monitoring
                            </Typography>
                        </Box>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 4 }}>
                        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                            {/* Enhanced Project Stats */}
                            <Badge badgeContent={projects.length} color="primary">
                                <Chip
                                    icon={<FolderIcon />}
                                    label="Projects"
                                    color="primary"
                                    sx={{ fontWeight: 600 }}
                                />
                            </Badge>

                            <Badge badgeContent={totalDevices} color="info">
                                <Chip
                                    icon={<DevicesIcon />}
                                    label="Devices"
                                    color="info"
                                    sx={{ fontWeight: 600 }}
                                />
                            </Badge>

                            <Badge badgeContent={totalTags} color="success">
                                <Chip
                                    icon={<LabelIcon />}
                                    label="Tags"
                                    color="success"
                                    sx={{ fontWeight: 600 }}
                                />
                            </Badge>

                            {totalActiveAlarms > 0 && (
                                <Badge badgeContent={totalActiveAlarms} color="error">
                                    <Chip
                                        icon={<WarningIcon />}
                                        label="Active Alarms"
                                        color="error"
                                        sx={{ fontWeight: 600 }}
                                    />
                                </Badge>
                            )}

                            <Typography variant="body2" color="text.secondary">
                                Welcome back, {user?.full_name || user?.username}
                            </Typography>
                        </Stack>

                        <Stack direction="row" spacing={2} alignItems="center">
                            {/* Enhanced WebSocket Status */}
                            <Chip
                                icon={isConnected ? <WifiIcon /> : <WifiOffIcon />}
                                label={
                                    isConnected
                                        ? 'Real-time Connected'
                                        : connectionAttempts > 0
                                            ? `Reconnecting... (${connectionAttempts})`
                                            : 'Disconnected'
                                }
                                color={isConnected ? 'success' : 'error'}
                                sx={{ fontWeight: 600 }}
                            />

                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={() => { setProjectName(''); setAddOpen(true); }}
                                sx={{
                                    borderRadius: 3,
                                    px: 3,
                                    py: 1.5,
                                    background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                                    boxShadow: '0 4px 12px rgb(37 99 235 / 0.3)',
                                    '&:hover': {
                                        background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
                                        boxShadow: '0 8px 24px rgb(37 99 235 / 0.4)',
                                        transform: 'translateY(-2px)'
                                    }
                                }}
                            >
                                New Project
                            </Button>
                        </Stack>
                    </Box>

                    {/* Enhanced WebSocket Error Alert */}
                    {error && (
                        <Alert
                            severity="warning"
                            sx={{ mt: 2, borderRadius: 2 }}
                            action={
                                <Stack direction="row" spacing={1}>
                                    <Button
                                        color="inherit"
                                        size="small"
                                        onClick={forceReconnect}
                                    >
                                        Reconnect
                                    </Button>
                                    <Button
                                        color="inherit"
                                        size="small"
                                        onClick={() => window.location.reload()}
                                    >
                                        Reload Page
                                    </Button>
                                </Stack>
                            }
                        >
                            Real-time connection issue: {error}
                        </Alert>
                    )}

                    {/* Loading Progress */}
                    {loading && (
                        <Box sx={{ mt: 2 }}>
                            <LinearProgress sx={{ borderRadius: 1 }} />
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                Loading projects and real-time statistics...
                            </Typography>
                        </Box>
                    )}
                </Box>

                {/* Enhanced Projects Grid */}
                {projects.length === 0 && !loading ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <Card
                            sx={{
                                p: 6,
                                textAlign: 'center',
                                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                                border: '2px dashed #cbd5e1'
                            }}
                        >
                            <FolderIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                                No Projects Yet
                            </Typography>
                            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                                Create your first SCADA project to start monitoring industrial processes
                            </Typography>
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={() => { setProjectName(''); setAddOpen(true); }}
                                sx={{
                                    background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                                    borderRadius: 2,
                                    px: 3
                                }}
                            >
                                Create First Project
                            </Button>
                        </Card>
                    </motion.div>
                ) : (
                    <Grid container spacing={3}>
                        {projects.map((project, index) => {
                            const stats = projectStats[project.id] || { devices: 0, tags: 0, activeAlarms: 0, lastActivity: null };
                            const hasAlarms = stats.activeAlarms > 0;
                            const isActive = isConnected && stats.lastActivity;

                            return (
                                <Grid item xs={12} sm={6} lg={4} key={project.id}>
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        whileHover={{ y: -4 }}
                                    >
                                        <Card
                                            sx={{
                                                height: '100%',
                                                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                                                border: hasAlarms ? '2px solid' : '1px solid',
                                                borderColor: hasAlarms ? 'error.main' : '#e2e8f0',
                                                cursor: 'pointer',
                                                transition: 'all 0.3s ease-in-out',
                                                position: 'relative',
                                                '&:hover': {
                                                    borderColor: hasAlarms ? 'error.dark' : '#2563eb',
                                                    boxShadow: hasAlarms
                                                        ? '0 20px 40px rgb(239 68 68 / 0.2)'
                                                        : '0 20px 40px rgb(37 99 235 / 0.1)',
                                                    '& .project-actions': {
                                                        opacity: 1,
                                                        transform: 'translateY(0)'
                                                    }
                                                }
                                            }}
                                            onClick={() => handleOpenProject(project.id)}
                                        >
                                            {/* Alarm Banner */}
                                            {hasAlarms && (
                                                <Box
                                                    sx={{
                                                        position: 'absolute',
                                                        top: 0,
                                                        left: 0,
                                                        right: 0,
                                                        bgcolor: 'error.main',
                                                        color: 'white',
                                                        py: 0.5,
                                                        px: 2,
                                                        fontSize: '0.75rem',
                                                        fontWeight: 600,
                                                        textAlign: 'center',
                                                        zIndex: 1
                                                    }}
                                                >
                                                    🚨 {stats.activeAlarms} Active Alarm{stats.activeAlarms !== 1 ? 's' : ''}
                                                </Box>
                                            )}

                                            <CardContent sx={{ p: 3, pt: hasAlarms ? 5 : 3 }}>
                                                {/* Enhanced Project Header */}
                                                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 3 }}>
                                                    <Badge
                                                        badgeContent={isActive ? '●' : ''}
                                                        color={isActive ? 'success' : 'default'}
                                                        overlap="circular"
                                                        anchorOrigin={{
                                                            vertical: 'bottom',
                                                            horizontal: 'right',
                                                        }}
                                                    >
                                                        <Avatar
                                                            sx={{
                                                                width: 40,
                                                                height: 40,
                                                                background: hasAlarms
                                                                    ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                                                                    : 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                                                                fontSize: '1.1rem',
                                                                fontWeight: 700
                                                            }}
                                                        >
                                                            {project.project_name[0]?.toUpperCase()}
                                                        </Avatar>
                                                    </Badge>
                                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                                        <Typography
                                                            variant="h6"
                                                            sx={{
                                                                fontWeight: 700,
                                                                color: hasAlarms ? 'error.main' : 'text.primary',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap',
                                                                mb: 0.5
                                                            }}
                                                        >
                                                            {project.project_name}
                                                        </Typography>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <AccessTimeIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                                                            <Typography variant="caption" color="text.secondary">
                                                                Created {formatDate(project.created_at)}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                </Box>

                                                {/* Enhanced Real-time Stats */}
                                                <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
                                                    <Chip
                                                        icon={<DevicesIcon />}
                                                        label={`${stats.devices} Device${stats.devices !== 1 ? 's' : ''}`}
                                                        size="small"
                                                        sx={{
                                                            bgcolor: 'primary.50',
                                                            color: 'primary.main',
                                                            fontWeight: 600,
                                                            fontSize: '0.7rem'
                                                        }}
                                                    />
                                                    <Chip
                                                        icon={<LabelIcon />}
                                                        label={`${stats.tags} Tag${stats.tags !== 1 ? 's' : ''}`}
                                                        size="small"
                                                        sx={{
                                                            bgcolor: 'success.50',
                                                            color: 'success.main',
                                                            fontWeight: 600,
                                                            fontSize: '0.7rem'
                                                        }}
                                                    />
                                                    <Chip
                                                        icon={isConnected ? <CheckCircleIcon /> : <WifiOffIcon />}
                                                        label={isConnected ? "Live" : "Offline"}
                                                        size="small"
                                                        sx={{
                                                            bgcolor: isConnected ? 'success.50' : 'error.50',
                                                            color: isConnected ? 'success.main' : 'error.main',
                                                            fontWeight: 600,
                                                            fontSize: '0.7rem'
                                                        }}
                                                    />
                                                </Box>

                                                {/* Last Activity */}
                                                <Box sx={{ mb: 3 }}>
                                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                                        <strong>Last Activity:</strong> {formatLastActivity(stats.lastActivity)}
                                                    </Typography>
                                                    <Typography
                                                        variant="body2"
                                                        color="text.secondary"
                                                        sx={{
                                                            lineHeight: 1.6,
                                                            height: '2.4em',
                                                            overflow: 'hidden',
                                                            display: '-webkit-box',
                                                            WebkitLineClamp: 2,
                                                            WebkitBoxOrient: 'vertical'
                                                        }}
                                                    >
                                                        Industrial automation project with real-time monitoring,
                                                        {stats.devices > 0 && ` ${stats.devices} connected devices,`}
                                                        {stats.tags > 0 && ` ${stats.tags} data points,`}
                                                        and professional SCADA capabilities.
                                                    </Typography>
                                                </Box>

                                                {/* Enhanced Action Buttons */}
                                                <Box
                                                    className="project-actions"
                                                    sx={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        opacity: 0,
                                                        transform: 'translateY(10px)',
                                                        transition: 'all 0.3s ease-in-out'
                                                    }}
                                                >
                                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                                        <Tooltip title="Edit Project">
                                                            <IconButton
                                                                size="small"
                                                                onClick={e => {
                                                                    e.stopPropagation();
                                                                    setCurrent(project);
                                                                    setProjectName(project.project_name);
                                                                    setEditOpen(true);
                                                                }}
                                                                sx={{
                                                                    bgcolor: 'primary.50',
                                                                    color: 'primary.main',
                                                                    '&:hover': { bgcolor: 'primary.100' }
                                                                }}
                                                            >
                                                                <EditIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="Delete Project">
                                                            <IconButton
                                                                size="small"
                                                                onClick={e => {
                                                                    e.stopPropagation();
                                                                    setCurrent(project);
                                                                    setDeleteOpen(true);
                                                                }}
                                                                sx={{
                                                                    bgcolor: 'error.50',
                                                                    color: 'error.main',
                                                                    '&:hover': { bgcolor: 'error.100' }
                                                                }}
                                                            >
                                                                <DeleteIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </Box>

                                                    <Button
                                                        endIcon={<ArrowForwardIcon />}
                                                        variant="contained"
                                                        size="small"
                                                        onClick={e => {
                                                            e.stopPropagation();
                                                            handleOpenProject(project.id);
                                                        }}
                                                        sx={{
                                                            borderRadius: 2,
                                                            px: 2,
                                                            py: 0.5,
                                                            fontSize: '0.75rem',
                                                            background: hasAlarms
                                                                ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                                                                : 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)'
                                                        }}
                                                    >
                                                        {hasAlarms ? 'Check Alarms' : 'Open Project'}
                                                    </Button>
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                </Grid>
                            );
                        })}
                    </Grid>
                )}

                {/* Existing dialogs remain the same */}
                {/* Add Project Dialog */}
                <Dialog
                    open={addOpen}
                    onClose={() => setAddOpen(false)}
                    maxWidth="sm"
                    fullWidth
                    PaperProps={{
                        sx: {
                            borderRadius: 4,
                            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)'
                        }
                    }}
                >
                    <DialogTitle sx={{ pb: 2 }}>
                        <Typography variant="h5" sx={{ fontWeight: 700 }}>
                            Create New SCADA Project
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Start a new industrial automation project with real-time monitoring
                        </Typography>
                    </DialogTitle>
                    <DialogContent sx={{ pt: 1 }}>
                        <TextField
                            label="Project Name"
                            value={projectName}
                            onChange={e => setProjectName(e.target.value)}
                            fullWidth
                            required
                            autoFocus
                            placeholder="Enter a descriptive project name"
                            sx={{ mt: 2 }}
                        />
                    </DialogContent>
                    <DialogActions sx={{ p: 3, pt: 2 }}>
                        <Button
                            onClick={() => setAddOpen(false)}
                            sx={{ borderRadius: 2 }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAdd}
                            variant="contained"
                            disabled={!projectName.trim()}
                            sx={{
                                borderRadius: 2,
                                px: 3,
                                background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)'
                            }}
                        >
                            Create Project
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Edit & Delete dialogs remain the same as your original */}
                {/* ... (keeping the same edit and delete dialogs) ... */}

                {/* Enhanced Snackbar */}
                <Snackbar
                    open={snackbar.open}
                    autoHideDuration={4000}
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                >
                    <Alert
                        severity={snackbar.severity}
                        sx={{
                            width: '100%',
                            borderRadius: 3,
                            fontWeight: 600
                        }}
                        onClose={() => setSnackbar({ ...snackbar, open: false })}
                    >
                        {snackbar.msg}
                    </Alert>
                </Snackbar>
            </Container>
        </Box>
    );
}